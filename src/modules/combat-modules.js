/**
 * Combat modules.
 *
 * Safety: every module that automates attacking/movement is tagged
 * `localTestOnly` and the bootstrap refuses to arm them while the adapter
 * reports a remote multiplayer connection unless the user explicitly opts in
 * through the global "allow on multiplayer" switch (default off). This is the
 * "do not silently activate intrusive features on public servers" rule.
 */
import { Module } from "../core/module.js";
import { Events } from "../core/event-bus.js";

const LOCAL_NOTE = "Single-player / authorised testing only.";

class CombatModule extends Module {
  constructor(def) {
    super({ category: "Combat", localTestOnly: true, ...def });
  }
}

export class KillAura extends CombatModule {
  constructor() {
    super({
      id: "kill-aura",
      name: "KillAura",
      description: `Attacks nearby valid targets automatically. ${LOCAL_NOTE}`,
      requiredCapabilities: ["world", "entities", "movement"],
    });
    this._resetCombat();
  }
  onInit() {
    const t = this.settings.addGroup("Targeting");
    t.double("range", "Attack range (blocks)", 3.2, { min: 2, max: 6 });
    t.double("cps", "Attack attempts per second (not native charge)", 2, { min: 0.5, max: 20 });
    t.double("cps-variation", "Random CPS variation (+/-)", 0, { min: 0, max: 5 });
    t.int("switch-delay", "Target switch delay (ms)", 150, { min: 0, max: 1000 });
    t.enum("attack-mode", "Attack timing", "interval", ["interval", "prefer-falling"]);
    t.int("critical-wait", "Maximum wait for falling (ms; no critical guarantee)", 250, { min: 0, max: 500 });
    t.enum("priority", "Target priority", "closest", ["closest", "lowest-health", "highest-health", "angle"]);
    t.bool("players", "Target players", true);
    t.bool("hostile", "Target hostile mobs", true);
    t.bool("passive", "Target passive mobs", false);
    t.bool("multi", "Attack every target in range (multi-target)", false);
    t.bool("visible-only", "Only attack targets in line of sight", true);
    const r = this.settings.addGroup("Rotation");
    r.bool("rotate", "Face the target before attacking", true);
    r.double("rotate-speed", "Rotation speed", 0.6, { min: 0.05, max: 1 });
  }
  _resetCombat() {
    this._nextAttack = 0;
    this._targetId = null;
    this._switchReady = 0;
    this._criticalDeadline = null;
    this._lastRotation = null;
  }
  onEnable() { this._resetCombat(); }
  onDisable() { this._resetCombat(); this.game.cancelAttacks?.(); }
  _interval() {
    const cps = this.settings.get("cps").value;
    const variation = this.settings.get("cps-variation").value;
    return 1000 / Math.max(0.5, Math.min(20, cps + (Math.random() * 2 - 1) * variation));
  }
  onTick() {
    const now = performance.now();
    const p = this.game.getPlayer?.();
    if (!this._allowedHere()) return;
    if (this.game._gameplayInputAllowed?.() === false || !p || p.dead || p.usingItem) {
      this._resetCombat();
      this._nextAttack = now + this._interval();
      this.game.cancelAttacks?.();
      return;
    }
    const targets = this._targets();
    if (!targets.length) {
      this._targetId = null;
      this._criticalDeadline = null;
      this._lastRotation = null;
      return;
    }
    const primary = targets[0].entity;
    const id = primary.id ?? primary;
    if (id !== this._targetId) {
      // First acquisition may attack immediately; subsequent switches wait.
      this._switchReady = this._targetId === null ? now : now + this.settings.get("switch-delay").value;
      this._targetId = id;
      this._criticalDeadline = null;
    }
    if (this.settings.get("rotate").value) {
      const elapsed = this._lastRotation === null ? 50 : Math.max(0, Math.min(100, now - this._lastRotation));
      this._face(primary, 1 - Math.pow(1 - this.settings.get("rotate-speed").value, elapsed / 50));
      this._lastRotation = now;
    }
    if (now < this._nextAttack || now < this._switchReady) return;
    if (this.settings.get("attack-mode").value === "prefer-falling") {
      this._criticalDeadline ??= now + this.settings.get("critical-wait").value;
      if (!fallingOpportunity(p) && now < this._criticalDeadline) return;
    }
    const attackList = this.settings.get("multi").value ? targets.slice(0, 16) : [targets[0]];
    let delivered = false;
    for (const t of attackList) if (this.game.attack(t.entity) !== false) delivered = true;
    if (delivered) {
      const interval = this._interval();
      // Preserve fractional deadlines under normal jitter, discard missed slots
      // after a stall. Never emit catch-up bursts in one callback.
      this._nextAttack = this._criticalDeadline === null && this._nextAttack > 0 && now - this._nextAttack < interval
        ? this._nextAttack + interval : now + interval;
      this._criticalDeadline = null;
    }
  }
  statusLines() {
    return [...super.statusLines(),
      { label: "Timing", value: "Native attack charge is unavailable. CPS schedules attempts; weapon recovery still applies." },
      { label: "Criticals", value: "Falling is a hint; water, climbing and passenger state are unavailable. No critical guarantee." }];
  }
  _allowedHere() {
    // multiplayer guard (see class comment)
    const client = this.manager.client;
    if (client?.isRemoteSession?.() && !client?.allowMultiplayerCombat) {
      this.manager.notify("KillAura blocked: remote server detected (enable 'allow on multiplayer' in Config)", "warn");
      this.disable();
      return false;
    }
    return true;
  }
  _targets() {
    const p = this.game.getPlayer?.();
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) return [];
    const range = this.settings.get("range").value;
    const out = [];
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf || e.dead || ![e.x, e.y, e.z].every(Number.isFinite) || (typeof e.health === "number" && (!Number.isFinite(e.health) || e.health <= 0))) continue;
      if (e.isPlayer && !this.settings.get("players").value) continue;
      if (!e.isPlayer && e.hostile && !this.settings.get("hostile").value) continue;
      if (!e.isPlayer && !e.hostile && !this.settings.get("passive").value) continue;
      if (this.settings.get("visible-only").value && e.visible === false) continue;
      if (this.manager.client?.isFriend?.(e.name)) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (dist > range) continue;
      out.push({ entity: e, dist, health: e.health ?? 20, angle: Math.abs(angleDelta((Math.atan2(p.x-e.x,e.z-p.z)*180)/Math.PI,p.yaw??0)) });
    }
    const priority = this.settings.get("priority").value;
    out.sort((a, b) => {
      if (priority === "angle") return a.angle-b.angle;
      if (priority === "lowest-health") return a.health - b.health;
      if (priority === "highest-health") return b.health - a.health;
      return a.dist - b.dist;
    });
    return out;
  }
  _face(entity, strength = this.settings.get("rotate-speed").value) {
    const p = this.game.getPlayer?.();
    if (!p) return;
    const dx = entity.x - p.x;
    const dy = (entity.y + (entity.height ?? 1.8) * 0.85) - (p.y + 1.5);
    const dz = entity.z - p.z;
    const yaw = (Math.atan2(-dx, dz) * 180) / Math.PI;
    const pitch = (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    this.game.setRotation?.(yaw, pitch, strength);
  }
}

export class AimAssist extends CombatModule {
  constructor() {
    super({
      id: "aim-assist",
      name: "Aim Assist",
      description: `Smoothly moves the aim toward a target. ${LOCAL_NOTE}`,
      requiredCapabilities: ["world", "entities", "movement"],
    });
  }
  onInit() {
    const g = this.settings.addGroup("Aim");
    g.double("strength", "Aim strength", 0.4, { min: 0.05, max: 1 });
    g.double("range", "Target range", 5, { min: 2, max: 10 });
    g.double("fov", "Maximum angle to a target (degrees)", 45, { min: 5, max: 180 });
    g.bool("only-attacking", "Only while attacking", false);
    g.bool("players", "Aim at players", true);
    g.bool("mobs", "Aim at mobs", true);
  }
  onTick() {
    if (this.game._gameplayInputAllowed?.() === false) return;
    const aura = this.manager.get("kill-aura");
    if (aura?.active && aura.settings.get("rotate").value && aura._targets().length) return;
    if (this.settings.get("only-attacking").value && !this.game.isAttacking?.()) return;
    const p = this.game.getPlayer?.();
    if (!p) return;
    const range = this.settings.get("range").value;
    const fov = this.settings.get("fov").value;
    let best = null;
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf || e.dead || (typeof e.health === "number" && e.health <= 0) || e.visible === false) continue;
      if (this.manager.client?.isFriend?.(e.name)) continue;
      if (e.isPlayer && !this.settings.get("players").value) continue;
      if (!e.isPlayer && !this.settings.get("mobs").value) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (dist > range) continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const targetYaw = (Math.atan2(-dx, dz) * 180) / Math.PI;
      const delta = Math.abs(angleDelta(targetYaw, p.yaw ?? 0));
      if (delta > fov / 2) continue;
      if (!best || delta < best.delta) best = { entity: e, delta, targetYaw };
    }
    if (best) {
      this.game.setRotation?.(best.targetYaw, p.pitch ?? 0, this.settings.get("strength").value);
    }
  }
}

// A scheduling hint only: water/climbing/passenger and attack charge are not
// published by this bridge, so this cannot certify native critical eligibility.
export function fallingOpportunity(player) {
  return player?.onGround === false && player.fallDistance > 0 &&
    Number.isFinite(player.velocity?.y) && player.velocity.y < 0 &&
    !player.sprinting && !player.usingItem && !player.dead &&
    !player.effects?.some(e => /blindness/.test(e.name));
}

function angleDelta(a, b) {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  return d;
}

export class TriggerBot extends CombatModule {
  constructor() {
    super({
      id: "trigger-bot",
      name: "TriggerBot",
      description: `Attacks when the crosshair is on a valid target. ${LOCAL_NOTE}`,
      requiredCapabilities: ["world", "entities", "movement"],
    });
    this._delay = 0;
  }
  onInit() {
    const g = this.settings.addGroup("Trigger");
    g.int("delay", "Attack delay (ticks)", 2, { min: 0, max: 40 });
    g.bool("players", "Trigger on players", true);
    g.bool("mobs", "Trigger on mobs", true);
    g.bool("weapon-only", "Only when holding a weapon", true);
  }
  onEnable() { this._delay = 0; }
  onDisable() { this._delay = 0; if (!this.manager.get("kill-aura")?.active) this.game.cancelAttacks?.(); }
  onTick(dt = 1) {
    if (this.game._gameplayInputAllowed?.() === false || this.manager.get("kill-aura")?.active) { this._delay = 0; return; }
    this._delay = Math.max(0, this._delay - dt);
    const target = this.game.getCrosshairTargetEntity?.();
    if (!target || target.isSelf || target.dead || (typeof target.health === "number" && target.health <= 0) || target.visible === false) return;
    if (this.manager.client?.isFriend?.(target.name)) return;
    if (target.isPlayer && !this.settings.get("players").value) return;
    if (!target.isPlayer && !this.settings.get("mobs").value) return;
    if (this.settings.get("weapon-only").value && !this.game.heldItemIsWeapon?.()) return;
    if (this._delay > 0) return;
    this.game.attack(target);
    this._delay = this.settings.get("delay").value;
  }
}

export class AutoClicker extends CombatModule {
  constructor() {
    super({
      id: "auto-clicker",
      name: "AutoClicker",
      description: `Clicks at a fixed rate. ${LOCAL_NOTE}`,
      requiredCapabilities: ["movement"],
    });
    this._leftAccum = 0;
    this._rightAccum = 0;
  }
  onInit() {
    const g = this.settings.addGroup("Clicker");
    g.double("cps", "Clicks per second", 8, { min: 1, max: 20 });
    g.bool("left", "Auto left-click", true);
    g.bool("right", "Auto right-click", false);
    g.bool("hold", "Only while the activation key is held", false);
    g.keybind("activation-key", "Hold to activate", null);
  }
  onEnable() { this._leftAccum = 0; this._rightAccum = 0; }
  onDisable() { this.onEnable(); if (!this.manager.get("kill-aura")?.active && !this.manager.get("trigger-bot")?.active) this.game.cancelAttacks?.(); }
  onTick(dt = 1) {
    if (this.game._gameplayInputAllowed?.() === false) { this.onEnable(); return; }
    const cps = this.settings.get("cps").value;
    if (this.settings.get("hold").value) {
      const kb = this.settings.get("activation-key").value;
      const held = this.manager.client?.keybinds?.heldKeys;
      const modifiers = { ctrl: ["ControlLeft", "ControlRight"], alt: ["AltLeft", "AltRight"], shift: ["ShiftLeft", "ShiftRight"] };
      const matches = kb && held && (held.has(kb.key) || held.has(`Mouse${kb.mouse}`)) &&
        Object.entries(modifiers).every(([name, codes]) => !!kb.modifiers?.[name] === codes.some(code => held.has(code)));
      if (!matches) { this.onEnable(); return; }
    }
    // 20 ticks per second in the game loop.
    const perTick = cps / 20 * Math.min(1, Math.max(0, dt));
    if (this.settings.get("left").value && !this.manager.get("kill-aura")?.active && !this.manager.get("trigger-bot")?.active) {
      this._leftAccum += perTick;
      if (this._leftAccum >= 1) {
        this._leftAccum -= 1;
        this.game.attack?.(this.game.getCrosshairTargetEntity?.() ?? null);
      }
    }
    if (this.settings.get("right").value) {
      this._rightAccum += perTick;
      if (this._rightAccum >= 1) {
        this._rightAccum -= 1;
        this.game.useItem?.();
      }
    }
  }
}

export class AutoCrit extends CombatModule {
  constructor() {
    super({ id: "auto-crit", name: "Criticals", description: `Jumps near a valid target; does not guarantee critical damage. ${LOCAL_NOTE}`, requiredCapabilities: ["movement"] });
  }
  onInit() {
    const g = this.settings.addGroup("Criticals");
    g.enum("mode", "Mode", "jump", ["packet", "jump"]);
  }
  ineligibilityReason() {
    return super.ineligibilityReason() || (this.settings.get("mode")?.value === "packet" ? "packet criticals require a packet hook; select jump mode" : null);
  }
  onTick() {
    const p = this.game.getPlayer?.();
    if (!p) return;
    const aura = this.manager.get("kill-aura");
    const target = aura?.active ? aura._targets()[0]?.entity : this.game.getCrosshairTargetEntity?.();
    if (target && !target.isSelf && !target.dead && target.health > 0 && target.visible !== false && !this.manager.client?.isFriend?.(target.name) && this.game._gameplayInputAllowed?.() !== false && this.game.isOnGround?.()) {
      this.game.jump?.();
    }
  }
}

export class ReachDisplay extends Module {
  constructor() {
    super({ id: "reach-display", name: "Reach Display", description: "Shows the distance of the last attack.", category: "Combat", runsInMenus: true });
    this._lastReach = 0;
    this._sub = null;
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 300, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 4, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
  }
  onEnable() {
    this._sub = this.manager.bus.on(Events.EntityDamage, (ev) => {
      if (ev?.attackerIsSelf && typeof ev.distance === "number") this._lastReach = ev.distance;
    });
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  hudRender() {
    return `Reach: ${this._lastReach.toFixed(2)}`;
  }
}

export class Velocity extends CombatModule {
  constructor() {
    super({
      id: "velocity",
      name: "Velocity",
      description: `Reduces knockback. ${LOCAL_NOTE}`,
      requiredCapabilities: ["movement"],
    });
  }
  onInit() {
    const g = this.settings.addGroup("Velocity");
    g.double("horizontal", "Horizontal knockback multiplier", 0.0, { min: 0, max: 1 });
    g.double("vertical", "Vertical knockback multiplier", 0.0, { min: 0, max: 1 });
  }
  onEnable() {
    if (typeof this.game.setVelocityMultiplier !== "function") throw new Error("runtime does not expose knockback adjustment");
    this.game.setVelocityMultiplier(this.settings.get("horizontal").value, this.settings.get("vertical").value);
  }
  onDisable() {
    this.game.setVelocityMultiplier?.(1, 1);
  }
}

export class AutoWeapon extends CombatModule {
  constructor() {
    super({ id: "auto-weapon", name: "AutoWeapon", description: "Selects the best weapon for the current target.", requiredCapabilities: ["inventory"] });
  }
  onInit() {
    const g = this.settings.addGroup("Weapon");
    g.bool("only-when-attacking", "Only swap when a target is present", true);
    g.bool("prefer-sword", "Prefer swords over axes", true);
  }
  onTick() {
    const target = this.game.getCrosshairTargetEntity?.();
    if (this.settings.get("only-when-attacking").value && !target) return;
    const best = this.game.findBestWeapon?.(target);
    if (Number.isInteger(best) && best >= 0 && best !== this.game.getSelectedSlot?.()) this.game.selectSlot?.(best);
  }
}

export class AutoArmor extends Module {
  constructor() {
    super({ id: "auto-armor", name: "AutoArmor", description: "Equips stronger armour from the inventory.", category: "Player", requiredCapabilities: ["inventory"] });
  }
  onInit() {
    const g = this.settings.addGroup("Armor");
    g.bool("durability-check", "Avoid swapping damaged armour unnecessarily", true);
    g.int("delay", "Delay between swaps (ticks)", 4, { min: 1, max: 40 });
  }
  onTick() {
    this.game.equipBestArmor?.();
  }
}

export class TargetHUD extends Module {
  constructor() {
    super({ id: "target-hud", name: "Target HUD", description: "Details about the current combat target.", category: "HUD", requiredCapabilities: ["world", "entities", "hud"], runsInMenus: false });
    this._sub = null;
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 300, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 120, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    const d = this.settings.addGroup("Display");
    d.bool("health", "Show health", true);
    d.bool("distance", "Show distance", true);
    d.bool("armor", "Show armour", true);
    d.bool("health-bar", "Draw a health bar", true);
  }
  hudRender() {
    const t = this._target();
    if (!t) return "";
    const p = this.game.getPlayer?.();
    const lines = [t.name ?? t.type ?? "target"];
    if (this.settings.get("health").value && typeof t.health === "number") lines.push(`HP: ${t.health.toFixed(1)}/${t.maxHealth ?? 20}`);
    if (this.settings.get("distance").value && p) lines.push(`Dist: ${Math.hypot(t.x - p.x, t.y - p.y, t.z - p.z).toFixed(1)}`);
    if (this.settings.get("armor").value && typeof t.armor === "number") lines.push(`Armor: ${t.armor}`);
    return lines.join("\n");
  }
  _target() {
    const cross = this.game.getCrosshairTargetEntity?.();
    if (cross && !cross.dead && cross.health > 0) return cross;
    const p = this.game.getPlayer?.();
    if (!p) return null;
    let best = null;
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf || e.dead || !Number.isFinite(e.health) || e.health <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (d <= 6 && (!best || d < best.d)) best = { e, d };
    }
    return best?.e ?? null;
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderHud, (ev) => this._drawBar(ev));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  _drawBar({ ctx }) {
    if (!ctx || !this.settings.get("health-bar").value) return;
    const t = this._target();
    if (!t || typeof t.health !== "number") return;
    const x = this.settings.get("hud-x").value;
    const scale = this.settings.get("hud-scale").value;
    const lines = this.hudRender().split("\n").length;
    const y = this.settings.get("hud-y").value + (lines * 14 + 4) * scale;
    const w = 100 * scale;
    const frac = Math.max(0, Math.min(1, t.health / (t.maxHealth ?? 20)));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, w, 6 * scale);
    ctx.fillStyle = frac > 0.5 ? "#5bbf7a" : frac > 0.25 ? "#e0a458" : "#d64545";
    ctx.fillRect(x, y, w * frac, 6 * scale);
  }
}

export class AutoTotem extends Module {
  constructor() {
    super({
      id: "auto-totem",
      name: "AutoTotem",
      description: "Offhand totem management. Requires totems and an offhand slot.",
      category: "Combat",
      unsupported: true,
      unsupportedReason: "offhand slot + totem mechanics are not confirmed available in this runtime",
    });
  }
}

export class Hitboxes extends Module {
  constructor() {
    super({
      id: "hitboxes",
      name: "Hitboxes",
      description: "Draws entity hitboxes.",
      category: "Render",
      requiredCapabilities: ["world", "entities", "render"],
    });
    this._sub = null;
  }
  onInit() {
    const g = this.settings.addGroup("Hitboxes");
    g.color("color", "Colour", { r: 255, g: 255, b: 255, a: 160 });
    g.double("expand", "Expand boxes by (blocks)", 0, { min: 0, max: 1 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderWorld, ({ ctx, projection }) => this._draw(ctx, projection));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  _draw(ctx, projection) {
    const p = this.game.getPlayer?.();
    if (!p) return;
    const expand = this.settings.get("expand").value;
    const c = this.settings.get("color");
    ctx.save();
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
    for (const e of this.game.getEntities?.() ?? []) {
      if (e.isSelf) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (d > 8) continue;
      const w = (e.width ?? 0.6) / 2 + expand;
      const h = (e.height ?? 1.8) + expand * 2;
      const corners = [
        [e.x - w, e.y, e.z - w],
        [e.x + w, e.y, e.z + w],
        [e.x - w, e.y + h, e.z - w],
        [e.x + w, e.y + h, e.z + w],
      ]
        .map(([x, y, z]) => projection?.worldToScreen?.(x, y, z))
        .filter((s) => s && s.visible);
      if (corners.length < 2) continue;
      const xs = corners.map((s) => s.x);
      const ys = corners.map((s) => s.y);
      ctx.strokeRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }
    ctx.restore();
  }
}

export function createCombatModules() {
  return [
    new KillAura(),
    new AimAssist(),
    new TriggerBot(),
    new AutoClicker(),
    new AutoCrit(),
    new ReachDisplay(),
    new Velocity(),
    new AutoWeapon(),
    new AutoArmor(),
    new TargetHUD(),
    new AutoTotem(),
    new Hitboxes(),
  ];
}
