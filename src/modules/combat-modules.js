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
    this._cooldownTicks = 0;
  }
  onInit() {
    const t = this.settings.addGroup("Targeting");
    t.double("range", "Attack range (blocks)", 3.2, { min: 2, max: 6 });
    t.int("cps", "Attacks per second", 8, { min: 1, max: 20 });
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
  onTick() {
    if (!this._allowedHere()) return;
    if (this._cooldownTicks > 0) {
      this._cooldownTicks--;
      return;
    }
    const targets = this._targets();
    if (targets.length === 0) return;
    const cps = this.settings.get("cps").value;
    const interval = Math.max(1, Math.round(20 / cps));
    const multi = this.settings.get("multi").value;
    const attackList = multi ? targets : [targets[0]];
    for (const t of attackList) {
      if (this.settings.get("rotate").value) this._face(t.entity);
      this.game.attack(t.entity);
    }
    this._cooldownTicks = interval;
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
    if (!p) return [];
    const range = this.settings.get("range").value;
    const out = [];
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf || e.dead) continue;
      if (e.isPlayer && !this.settings.get("players").value) continue;
      if (!e.isPlayer && e.hostile && !this.settings.get("hostile").value) continue;
      if (!e.isPlayer && !e.hostile && !this.settings.get("passive").value) continue;
      if (this.settings.get("visible-only").value && e.visible === false) continue;
      if (this.manager.client?.isFriend?.(e.name)) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (dist > range) continue;
      out.push({ entity: e, dist, health: e.health ?? 20 });
    }
    const priority = this.settings.get("priority").value;
    out.sort((a, b) => {
      if (priority === "lowest-health") return a.health - b.health;
      if (priority === "highest-health") return b.health - a.health;
      return a.dist - b.dist;
    });
    return out;
  }
  _face(entity) {
    const p = this.game.getPlayer?.();
    if (!p) return;
    const dx = entity.x - p.x;
    const dy = (entity.y + (entity.height ?? 1.8) * 0.85) - (p.y + 1.5);
    const dz = entity.z - p.z;
    const yaw = (Math.atan2(-dx, dz) * 180) / Math.PI;
    const pitch = (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    this.game.setRotation?.(yaw, pitch, this.settings.get("rotate-speed").value);
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
    if (this.settings.get("only-attacking").value && !this.game.isAttacking?.()) return;
    const p = this.game.getPlayer?.();
    if (!p) return;
    const range = this.settings.get("range").value;
    const fov = this.settings.get("fov").value;
    let best = null;
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf) continue;
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
  onTick() {
    const target = this.game.getCrosshairTargetEntity?.();
    if (!target) return;
    if (target.isPlayer && !this.settings.get("players").value) return;
    if (!target.isPlayer && !this.settings.get("mobs").value) return;
    if (this.settings.get("weapon-only").value && !this.game.heldItemIsWeapon?.()) return;
    if (this._delay > 0) {
      this._delay--;
      return;
    }
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
    g.double("cps", "Clicks per second", 8, { min: 1, max: 25 });
    g.bool("left", "Auto left-click", true);
    g.bool("right", "Auto right-click", false);
    g.bool("hold", "Only while the activation key is held", false);
    g.keybind("activation-key", "Hold to activate", null);
  }
  onTick() {
    const cps = this.settings.get("cps").value;
    if (this.settings.get("hold").value) {
      const kb = this.settings.get("activation-key").value;
      const held = this.manager.client?.keybinds?.heldKeys;
      if (!kb || !held || !(held.has(kb.key) || held.has(`Mouse${kb.mouse}`))) return;
    }
    // 20 ticks per second in the game loop.
    const perTick = cps / 20;
    if (this.settings.get("left").value) {
      this._leftAccum += perTick;
      while (this._leftAccum >= 1) {
        this._leftAccum -= 1;
        this.game.attack?.(this.game.getCrosshairTargetEntity?.() ?? null);
      }
    }
    if (this.settings.get("right").value) {
      this._rightAccum += perTick;
      while (this._rightAccum >= 1) {
        this._rightAccum -= 1;
        this.game.useItem?.();
      }
    }
  }
}

export class AutoCrit extends CombatModule {
  constructor() {
    super({ id: "auto-crit", name: "Criticals", description: `Jumps before attacking to force critical hits (version-dependent). ${LOCAL_NOTE}`, requiredCapabilities: ["movement"] });
  }
  onInit() {
    const g = this.settings.addGroup("Criticals");
    g.enum("mode", "Mode", "packet", ["packet", "jump"]);
  }
  onTick() {
    const p = this.game.getPlayer?.();
    if (!p) return;
    if (this.game.getCrosshairTargetEntity?.() && this.game.isOnGround?.()) {
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
    if (best && best !== this.game.getSelectedSlot?.()) this.game.selectSlot?.(best);
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
    if (cross) return cross;
    const p = this.game.getPlayer?.();
    if (!p) return null;
    let best = null;
    for (const e of this.game.getEntities?.() ?? []) {
      if (!e || e.isSelf) continue;
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
    const y = this.settings.get("hud-y").value + 46;
    const w = 100;
    const frac = Math.max(0, Math.min(1, t.health / (t.maxHealth ?? 20)));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = frac > 0.5 ? "#5bbf7a" : frac > 0.25 ? "#e0a458" : "#d64545";
    ctx.fillRect(x, y, w * frac, 6);
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
