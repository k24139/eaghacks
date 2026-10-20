/**
 * Player + World modules. Player modules operate on the player/inventory;
 * World modules read blocks and persist world data (waypoints).
 */
import { Module } from "../core/module.js";
import { Events } from "../core/event-bus.js";

const LOCAL_NOTE = "Single-player / authorised testing only.";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export class AutoTool extends Module {
  constructor() {
    super({ id: "auto-tool", name: "AutoTool", description: "Selects the best tool for the block being mined.", category: "Player", requiredCapabilities: ["inventory", "blocks"] });
    this._lastSlot = -1;
  }
  onInit() {
    const g = this.settings.addGroup("Tool");
    g.bool("only-while-mining", "Only switch while mining", true);
    g.int("delay", "Delay between switches (ticks)", 2, { min: 1, max: 20 });
    g.bool("restore", "Return to the previous slot afterwards", false);
  }
  onTick() {
    if (this.settings.get("only-while-mining").value && !this.game.isMining?.()) return;
    const target = this.game.getCrosshairTargetBlock?.();
    if (!target) return;
    if (this._lastSlot === -1) this._lastSlot = this.game.getSelectedSlot?.() ?? 0;
    const best = this.game.findBestTool?.(target);
    if (best !== undefined && best !== null) this.game.selectSlot?.(best);
  }
  onDisable() {
    if (this.settings.get("restore").value && this._lastSlot >= 0) this.game.selectSlot?.(this._lastSlot);
    this._lastSlot = -1;
  }
}

export class AutoEat extends Module {
  constructor() {
    super({ id: "auto-eat", name: "AutoEat", description: "Eats when hunger is low.", category: "Player", requiredCapabilities: ["inventory"] });
    this._eatenSlot = null;
  }
  onInit() {
    const g = this.settings.addGroup("Eating");
    g.int("threshold", "Eat below this hunger value", 16, { min: 1, max: 20 });
    g.enum("food", "Preferred food", "auto", ["auto", "golden_apple", "bread", "cooked_beef", "any"]);
    g.bool("restore-slot", "Restore the previous hotbar slot", true);
  }
  _finish() {
    this.game.stopUsingItem?.();
    if (this.settings.get("restore-slot").value && this._eatenSlot !== null) (this.game.restoreSelectedSlot ?? this.game.selectSlot)?.call(this.game,this._eatenSlot);
    this._eatenSlot = null;
  }
  onTick() {
    const p=this.game.getPlayer?.(); if(!p || typeof p.hunger!=="number")return;
    if(p.hunger>=this.settings.get("threshold").value){this._finish();return;}
    if(p.usingItem)return;
    const food=this.game.findFoodInHotbar?.(this.settings.get("food").value);
    if(!Number.isInteger(food)||food<0){this._finish();return;}
    if(this._eatenSlot===null)this._eatenSlot=this.game.getSelectedSlot?.()??0;
    this.game.selectSlot?.(food);
    if(this.game.getSelectedSlot?.()!==food)return;
    if(this.game.startUsingItem)this.game.startUsingItem();else this.game.useItem?.();
  }
  onDisable() { this._finish(); }
}

export class FastPlace extends Module {
  constructor() {
    super({ id: "fast-place", name: "FastPlace", description: `Removes the item-use cooldown. ${LOCAL_NOTE}`, category: "Player", requiredCapabilities: ["inventory"] });
  }
  onInit() {
    this.settings.addGroup("Place").int("delay", "Place delay (ticks)", 0, { min: 0, max: 4 });
  }
  onEnable() {
    if (this.settings.get("delay").value > 0) throw new Error("delay must be 0 for FastPlace");
    if (this.game.setPlaceDelay?.(0) === false) throw new Error("runtime does not expose item-use delay");
  }
  onDisable() {
    this.game.setPlaceDelay?.(4);
  }
}

export class AutoRespawn extends Module {
  constructor() {
    super({ id: "auto-respawn", name: "AutoRespawn", description: "Respawns automatically after death.", category: "Player", runsInMenus: true });
    this._sub = null;
    this._pending = null;
  }
  onInit() {
    this.settings.addGroup("Respawn").int("delay", "Delay before respawning (ticks)", 10, { min: 0, max: 100 });
  }
  onEnable() {
    this._sub = this.manager.bus.on(Events.PlayerDeath, () => {
      const p = this.game.getPlayer?.();
      this._pending = { duration: this.settings.get("delay").value, x: p?.x, y: p?.y, z: p?.z };
    });
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
    this._pending = null;
  }
  onTick(ticks = 1) {
    if (!this._pending) return;
    this._pending.duration -= ticks;
    if (this._pending.duration > 0) return;
    this.game.respawn?.();
    this._pending = null;
  }
}

export class AntiAFK extends Module {
  constructor() {
    super({ id: "anti-afk", name: "AntiAFK", description: "Performs small random movements so the player is not idle.", category: "Player", requiredCapabilities: ["movement"] });
    this._timer = 0;
  }
  onInit() {
    const g = this.settings.addGroup("AntiAFK");
    g.int("interval", "Action interval (ticks)", 60, { min: 10, max: 600 });
    g.bool("jump", "Jump occasionally", true);
    g.bool("rotate", "Rotate the view randomly", true);
    g.bool("swing", "Swing the hand", true);
  }
  onTick() {
    if (--this._timer > 0) return;
    this._timer = this.settings.get("interval").value;
    if (this.settings.get("jump").value) this.game.jump?.();
    if (this.settings.get("swing").value) this.game.swingHand?.();
    if (this.settings.get("rotate").value) {
      const p = this.game.getPlayer?.();
      this.game.setRotation?.((p?.yaw ?? 0) + (Math.random() * 60 - 30), p?.pitch ?? 0, 1);
    }
  }
}

export class DurabilityWarnings extends Module {
  constructor() {
    super({ id: "durability-warnings", name: "Durability Warnings", description: "Warns when a held item is nearly broken.", category: "Player", requiredCapabilities: ["inventory"], runsInMenus: true });
  }
  onInit() {
    this.settings.addGroup("Warnings").int("threshold", "Warn below this durability", 20, { min: 1, max: 300 });
  }
  onTick() {
    const held = this.game.getHeldItem?.();
    if (!held || typeof held.durability !== "number" || typeof held.maxDurability !== "number") return;
    if (held.maxDurability <= 0 || held.durability < 0) return;
    if (held.durability > this.settings.get("threshold").value) return;
    const now = Date.now();
    if (this._lastWarn && now - this._lastWarn < 5000) return;
    this._lastWarn = now;
    this.manager.notify(`${held.name} is nearly broken (${held.durability} left)`, "warn");
  }
}

export class InventoryManager extends Module {
  constructor() {
    super({ id: "inventory-manager", name: "Inventory Manager", description: "Sorts and de-duplicates inventory contents.", category: "Player", requiredCapabilities: ["inventory"] });
  }
  onInit() {
    const g = this.settings.addGroup("Inventory");
    g.bool("sort", "Sort the inventory", true);
    g.bool("drop-duplicates", "Drop duplicate tools/armour", false);
    g.int("interval", "Run every N ticks", 40, { min: 10, max: 200 });
  }
  onTick() {
    if (--this._timer > 0) return;
    this._timer = this.settings.get("interval").value;
    if (this.settings.get("sort").value) this.game.sortInventory?.();
    if (this.settings.get("drop-duplicates").value) this.game.dropDuplicateTools?.();
  }
}

export class AutoReconnect extends Module {
  constructor() {
    super({ id: "auto-reconnect", name: "AutoReconnect", description: "Reconnects automatically after being disconnected.", category: "Misc", requiredCapabilities: ["network"], runsInMenus: true });
    this._sub = null;
  }
  onInit() {
    this.settings.addGroup("Reconnect").int("delay", "Delay (seconds)", 3, { min: 1, max: 60 });
  }
  onEnable() {
    this._sub = this.manager.bus.on(Events.Disconnect, () => {
      if (this._timerHandle) return;
      this._timerHandle = setTimeout(() => {
        this._timerHandle = null;
        this.game.reconnect?.();
      }, this.settings.get("delay").value * 1000);
    });
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
    if (this._timerHandle) {
      clearTimeout(this._timerHandle);
      this._timerHandle = null;
    }
  }
}

export class ChestOrganizer extends Module {
  constructor() {
    super({
      id: "chest-organizer",
      name: "Chest Organizer",
      description: "Sorts items into nearby containers.",
      category: "Player",
      unsupported: true,
      unsupportedReason: "requires container screen automation not exposed by the runtime",
    });
  }
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export class WorldTime extends Module {
  constructor() {
    super({ id: "world-time", name: "World Time", description: "Shows the in-game time of day.", category: "HUD", requiredCapabilities: ["world"], runsInMenus: false });
    this._sub = null;
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 380, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    l.bool("show-day", "Show the day number", true);
  }
  hudRender() {
    const w = this.game.getWorld?.();
    if (!w || typeof w.time !== "number") return "Time: —";
    // Minecraft ticks: 0 = 06:00, 24000 per day.
    const total = ((w.time % 24000) + 24000) % 24000;
    const hours = Math.floor(total / 1000 + 6) % 24;
    const minutes = Math.floor(((total % 1000) / 1000) * 60);
    const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return this.settings.get("show-day").value ? `Time: ${clock} (day ${w.day ?? "?"})` : `Time: ${clock}`;
  }
}

export class BlockSearch extends Module {
  constructor() {
    super({ id: "block-search", name: "Block Search", description: "Highlights blocks matching a list.", category: "World", requiredCapabilities: ["world", "blocks", "render"] });
    this._sub = null;
    this._cache = null;
    this._cacheAt = 0;
  }
  onInit() {
    const g = this.settings.addGroup("Search");
    g.string("blocks", "Block ids (comma separated)", "diamond_ore,emerald_ore,ancient_debris", { maxLength: 400 });
    g.int("radius", "Search radius", 32, { min: 4, max: 96 });
    g.int("refresh", "Rescan every N ticks", 40, { min: 10, max: 400 });
    g.color("color", "Highlight colour", { r: 90, g: 220, b: 130, a: 180 });
    g.double("alpha", "Opacity", 0.8, { min: 0.1, max: 1 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderWorld, ({ ctx, projection }) => this._draw(ctx, projection));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
    this._cache = null;
  }
  onTick() {
    const now = Date.now();
    if (this._cache && now - this._cacheAt < this.settings.get("refresh").value * 50) return;
    const names = this.settings
      .get("blocks")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!this.game.findBlocks) return;
    // Scans are expensive; they are rate-limited and radius-capped (the
    // "avoid freezing the game" requirement).
    this._cache = this.game.findBlocks(names, this.settings.get("radius").value) ?? [];
    this._cacheAt = now;
  }
  _draw(ctx, projection) {
    if (!this._cache) return;
    const c = this.settings.get("color");
    const a = this.settings.get("alpha").value;
    ctx.save();
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.25})`;
    for (const b of this._cache) {
      const p = projection?.worldToScreen?.(b.x, b.y, b.z);
      if (!p || p.behind) continue;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.restore();
  }
}

/**
 * Waypoints — a Module plus its own persistent store. Waypoints are saved per
 * world/server key so a multiplayer server and a single-player save do not mix.
 */
export class Waypoints extends Module {
  constructor() {
    super({ id: "waypoints", name: "Waypoints", description: "Save and render named positions.", category: "World", requiredCapabilities: ["world", "render"] });
    /** @type {Map<string, Array<{name,x,y,z,color,dim}>>} */
    this.store = new Map();
    this._sub = null;
    this._sub2 = null;
  }
  onInit() {
    const g = this.settings.addGroup("Waypoints");
    g.bool("show-labels", "Show a label at each waypoint", true);
    g.bool("show-distance", "Show distance to each waypoint", true);
    g.int("max-distance", "Hide beyond this distance (0 = always)", 0, { min: 0, max: 4096 });
    g.color("default-color", "Default colour", { r: 255, g: 200, b: 60, a: 220 });
    g.double("scale", "Label scale", 1, { min: 0.5, max: 2 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderWorld, (ev) => this._draw(ev));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  _key() {
    return this.game.getWorldKey?.() ?? "unknown";
  }
  list() {
    return this.store.get(this._key()) ?? [];
  }
  add(name, x, y, z, color) {
    const list = this.list();
    list.push({ name, x, y, z, color: color ?? this.settings.get("default-color").value, dim: this.game.getWorld?.()?.dimension ?? "overworld" });
    this.store.set(this._key(), list);
    this.manager.notify(`waypoint '${name}' added`, "info");
    this.manager.client?.config?.save?.(true);
    return list;
  }
  addHere(name) {
    const p = this.game.getPlayer?.();
    if (!p) return false;
    this.add(name || "waypoint", Math.round(p.x), Math.round(p.y), Math.round(p.z));
    return true;
  }
  remove(name) {
    const list = this.list().filter((w) => w.name !== name);
    this.store.set(this._key(), list);
    this.manager.client?.config?.save?.(true);
    return true;
  }
  rename(oldName, newName) {
    const wp = this.list().find((w) => w.name === oldName);
    if (!wp) return false;
    wp.name = newName;
    this.manager.client?.config?.save?.(true);
    return true;
  }
  _draw({ ctx, projection }) {
    const p = this.game.getPlayer?.();
    if (!p) return;
    const maxDist = this.settings.get("max-distance").value;
    const scale = this.settings.get("scale").value;
    ctx.save();
    ctx.font = `${11 * scale}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    for (const wp of this.list()) {
      const dist = Math.hypot(wp.x - p.x, wp.y - p.y, wp.z - p.z);
      if (maxDist > 0 && dist > maxDist) continue;
      const s = projection?.worldToScreen?.(wp.x + 0.5, wp.y + 1, wp.z + 0.5);
      if (!s || s.behind) continue;
      const c = wp.color ?? { r: 255, g: 200, b: 60, a: 220 };
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${(c.a ?? 220) / 255})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      if (this.settings.get("show-labels").value) {
        const label = this.settings.get("show-distance").value ? `${wp.name} ${dist.toFixed(0)}m` : wp.name;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(s.x - ctx.measureText(label).width / 2 - 2, s.y - 14 * scale, ctx.measureText(label).width + 4, 13 * scale);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},1)`;
        ctx.fillText(label, s.x, s.y - 4 * scale);
      }
    }
    ctx.restore();
  }
  /** Persistence hooks used by ConfigManager.registerSystem. */
  serialise() {
    return Object.fromEntries(this.store);
  }
  load(data) {
    if (!data || typeof data !== "object") return false;
    this.store = new Map();
    for (const [key, list] of Object.entries(data)) {
      if (!Array.isArray(list)) continue;
      this.store.set(
        key,
        list
          .filter((w) => w && typeof w.name === "string" && Number.isFinite(w.x) && Number.isFinite(w.y) && Number.isFinite(w.z))
          .map((w) => ({ name: String(w.name).slice(0, 48), x: +w.x, y: +w.y, z: +w.z, color: w.color ?? null, dim: w.dim ?? "overworld" })),
      );
    }
    return true;
  }
  reset() {
    this.store.clear();
  }
}

export class ChunkBorders extends Module {
  constructor() {
    super({ id: "chunk-borders", name: "Chunk Borders", description: "Draws 16x16 chunk boundaries.", category: "Render", requiredCapabilities: ["world", "render"] });
    this._sub = null;
  }
  onInit() {
    this.settings.addGroup("Visual").color("color", "Line colour", { r: 120, g: 180, b: 255, a: 90 });
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
    if (!p || !projection?.worldToScreen) return;
    const c = this.settings.get("color");
    ctx.save();
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
    const baseX = Math.floor(p.x / 16) * 16;
    const baseZ = Math.floor(p.z / 16) * 16;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const x = baseX + dx * 16;
        const z = baseZ + dz * 16;
        const a = projection.worldToScreen(x, p.y, z);
        const b = projection.worldToScreen(x + 16, p.y, z);
        const c = projection.worldToScreen(x, p.y, z + 16);
        if (a?.visible && c?.visible) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
        if (a?.visible && b?.visible) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}

export class BiomeInfo extends Module {
  constructor() {
    super({ id: "biome-info", name: "Biome Info", description: "Shows the current biome.", category: "HUD", requiredCapabilities: ["world"], runsInMenus: false });
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 396, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
  }
  hudRender() {
    const w = this.game.getWorld?.();
    if (!w || !w.biome) return "";
    return `Biome: ${w.biome}`;
  }
}

export class LightLevelOverlay extends Module {
  constructor() {
    super({
      id: "light-level",
      name: "Light Level Overlay",
      description: "Light-level numbers on blocks; needs a block-light accessor the runtime does not expose.",
      category: "World",
      unsupported: true,
      unsupportedReason: "no per-block light lookup available",
    });
  }
}

export function createWorldModules() {
  return [
    new AutoTool(),
    new AutoEat(),
    new FastPlace(),
    new AutoRespawn(),
    new AntiAFK(),
    new DurabilityWarnings(),
    new InventoryManager(),
    new AutoReconnect(),
    new ChestOrganizer(),
    new WorldTime(),
    new BlockSearch(),
    new Waypoints(),
    new ChunkBorders(),
    new BiomeInfo(),
    new LightLevelOverlay(),
  ];
}
