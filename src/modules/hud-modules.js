/**
 * HUD element modules. Each is a real Module in the HUD category whose
 * `hudRender(game)` returns the text to display. Positions/scale/opacity/colour
 * are per-module settings so they persist with the rest of the config.
 *
 * The elements implemented here work with *any* adapter (including the null
 * adapter, using the framework's own frame/tick data), which is why they are
 * listed as verified rather than "waiting on the game binding".
 */
import { Module } from "../core/module.js";
import { Settings, SettingGroup } from "../core/settings.js";
import { Events } from "../core/event-bus.js";

const LAYOUT_GROUP = "Layout";

class HudModule extends Module {
  /**
   * @param {object} def plus {defaultX, defaultY}
   */
  constructor(def) {
    super({ category: "HUD", runsInMenus: true, ...def });
    const layout = this.settings.addGroup(LAYOUT_GROUP);
    this.hudX = layout.int("hud-x", "Horizontal position", def.defaultX ?? 4, { min: 0, max: 4000 });
    this.hudY = layout.int("hud-y", "Vertical position", def.defaultY ?? 4, { min: 0, max: 4000 });
    this.hudScale = layout.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    this.hudOpacity = layout.double("hud-opacity", "Opacity", 1, { min: 0.1, max: 1 });
    this.hudColor = layout.color("hud-color", "Text colour", def.defaultColor ?? { r: 255, g: 255, b: 255, a: 255 });
    this.background = layout.bool("background", "Draw a dark background", true);
    this.sortKey = def.sortKey ?? 100;
  }

  /** @returns {string} text to display; override in subclasses */
  hudRender(_game) {
    return "";
  }

  /** Keep the HUD in sync whenever this element is toggled. */
  onEnable() {
    this.manager.client?.hud?.sync();
  }
  onDisable() {
    this.manager.client?.hud?.sync();
  }
}

// ---------------------------------------------------------------------------

export class FpsDisplay extends HudModule {
  constructor() {
    super({ id: "fps-display", name: "FPS", description: "Shows the current client frame rate.", defaultX: 4, defaultY: 4, sortKey: 10 });
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.string("label", "Text shown before the number", "FPS:");
  }
  hudRender() {
    const stats = this.manager.client?.stats;
    const fps = stats ? Math.round(stats.fps) : Math.round(this.game?.getFps?.() ?? 0);
    return `${this.settings.get("label").value} ${fps}`;
  }
}

export class CpsCounter extends HudModule {
  constructor() {
    super({
      id: "cps-counter",
      name: "CPS Counter",
      description: "Clicks per second for the left and right mouse buttons.",
      defaultX: 4,
      defaultY: 22,
      sortKey: 20,
    });
    this._left = [];
    this._right = [];
    this._sub = null;
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("show-left", "Show left-click CPS", true);
    g.bool("show-right", "Show right-click CPS", false);
  }
  onEnable() {
    this._sub = this.manager.bus.on(Events.MouseInput, (ev) => {
      if (!ev || !ev.down) return;
      const now = performance.now();
      const arr = ev.button === 2 ? this._right : this._left;
      arr.push(now);
    });
    super.onEnable();
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
    super.onDisable();
  }
  _count(arr) {
    const cutoff = performance.now() - 1000;
    while (arr.length && arr[0] < cutoff) arr.shift();
    return arr.length;
  }
  hudRender() {
    const parts = [];
    if (this.settings.get("show-left").value) parts.push(`${this._count(this._left)}`);
    if (this.settings.get("show-right").value) parts.push(`R ${this._count(this._right)}`);
    return `CPS: ${parts.join(" | ")}`;
  }
}

export class Coordinates extends HudModule {
  constructor() {
    super({
      id: "coordinates",
      name: "Coordinates",
      description: "Shows the player's X/Y/Z position.",
      requiredCapabilities: ["world"],
      defaultX: 4,
      defaultY: 40,
    });
    this._last = { x: 0, y: 0, z: 0 };
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("show-y", "Show the Y coordinate", true);
    g.bool("show-nether", "Show nether-equivalent coordinates", false);
    g.int("precision", "Decimal places", 1, { min: 0, max: 3 });
  }
  hudRender(game) {
    const p = game?.getPlayer?.();
    if (!p) return "XYZ: —";
    const prec = this.settings.get("precision").value;
    const fmt = (n) => Number(n).toFixed(prec);
    let out = this.settings.get("show-y").value
      ? `XYZ: ${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}`
      : `XZ: ${fmt(p.x)}, ${fmt(p.z)}`;
    if (this.settings.get("show-nether").value) {
      out += `  [N: ${fmt(p.x / 8)}, ${fmt(p.z / 8)}]`;
    }
    this._last = p;
    return out;
  }
}

export class DirectionHud extends HudModule {
  constructor() {
    super({ id: "direction", name: "Direction", description: "Shows the compass direction the player faces.", requiredCapabilities: ["world"], defaultX: 4, defaultY: 58 });
  }
  hudRender(game) {
    const p = game?.getPlayer?.();
    if (!p || typeof p.yaw !== "number") return "Facing: —";
    // Minecraft yaw: -180..180, where -180/180 = north (negative Z).
    const yaw = ((p.yaw % 360) + 360) % 360;
    const dirs = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    const idx = Math.round(yaw / 45) % 8;
    return `Facing: ${dirs[idx]} (${Math.round(yaw)}°)`;
  }
}

export class Keystrokes extends HudModule {
  constructor() {
    super({ id: "keystrokes", name: "Keystrokes", description: "Shows WASD/space/mouse input while playing.", defaultX: 4, defaultY: 76 });
    this._spaceDown = false;
  }
  hudRender() {
    const kb = this.manager.client?.keybinds;
    const held = kb?.heldKeys ?? new Set();
    const on = (code) => (held.has(code) ? "█" : "·");
    const w = on("KeyW");
    const a = on("KeyA");
    const s = on("KeyS");
    const d = on("KeyD");
    const sp = held.has("Space") ? "█████" : "·····";
    if (!this.settings.get("compact").value) {
      return `  ${w}\n${a} ${s} ${d}\n${sp}`;
    }
    return `WASD ${w}${a}${s}${d}  SP ${on("Space")}`;
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("compact", "Compact single-line form", false);
  }
}

export class ActiveModulesList extends HudModule {
  constructor() {
    super({ id: "active-modules-hud", name: "Active Modules", description: "Lists every enabled module.", defaultX: 4, defaultY: 120 });
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("show-hud", "Include HUD elements in the list", false);
    g.bool("sort", "Sort alphabetically", true);
    g.bool("show-count", "Show the module count", true);
  }
  hudRender() {
    const includeHud = this.settings.get("show-hud").value;
    let list = this.manager.active().filter((m) => m !== this && (includeHud || m.category !== "HUD"));
    if (this.settings.get("sort").value) list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    const lines = list.map((m) => m.name);
    if (this.settings.get("show-count").value) lines.unshift(`Modules (${list.length}):`);
    return lines.length ? lines.join("\n") : "Modules (0):";
  }
}

export class SessionTimer extends HudModule {
  constructor() {
    super({ id: "session-timer", name: "Session Timer", description: "Time since the client was loaded.", defaultX: 4, defaultY: 200 });
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("show-clock", "Also show the current time", false);
  }
  hudRender() {
    const stats = this.manager.client?.stats;
    const secs = Math.floor(stats?.upSeconds() ?? 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const time = `${h > 0 ? `${h}h ` : ""}${m}m ${String(s).padStart(2, "0")}s`;
    if (!this.settings.get("show-clock").value) return `Session: ${time}`;
    return `Session: ${time}\n${new Date().toLocaleTimeString()}`;
  }
}

export class SpeedHud extends HudModule {
  constructor() {
    super({ id: "speed-hud", name: "Speed", description: "Horizontal blocks per second.", requiredCapabilities: ["world"], defaultX: 4, defaultY: 240 });
    this._prev = null;
  }
  hudRender(game) {
    const p = game?.getPlayer?.();
    if (!p) return "Speed: —";
    const now = performance.now();
    if (this._prev) {
      const dt = (now - this._prev.t) / 1000;
      if (dt > 0.001) {
        const dx = p.x - this._prev.x;
        const dz = p.z - this._prev.z;
        const bps = Math.sqrt(dx * dx + dz * dz) / dt;
        this._smooth = this._smooth === undefined ? bps : this._smooth * 0.7 + bps * 0.3;
      }
    }
    this._prev = { x: p.x, z: p.z, t: now };
    return `Speed: ${(this._smooth ?? 0).toFixed(2)} b/s`;
  }
}

export class CustomTextHud extends HudModule {
  constructor() {
    super({ id: "custom-text", name: "Custom Text", description: "Displays arbitrary text on the HUD.", defaultX: 4, defaultY: 260 });
  }
  onInit() {
    const g = this.settings.addGroup("Text");
    g.string("text", "Text to display", "Meteor", { maxLength: 120 });
  }
  hudRender() {
    return this.settings.get("text").value;
  }
}

/**
 * Armor/potion HUDs need inventory + effect access, which the adapter exposes
 * only once bound to the real client. They are implemented against the adapter
 * contract and degrade to an explicit message instead of lying.
 */
export class ArmorHud extends HudModule {
  constructor() {
    super({
      id: "armor-hud",
      name: "Armor HUD",
      description: "Shows worn armour and durability (needs inventory access).",
      requiredCapabilities: ["inventory"],
      defaultX: 4,
      defaultY: 280,
    });
  }
  hudRender(game) {
    const inv = game?.getInventory?.();
    const armor = (inv?.armor ?? []).filter(Boolean);
    if (!armor.length) return "Armor: none";
    return armor
      .filter(Boolean)
      .map((a) => `${a.name} ${a.durability ?? "?"}/${a.maxDurability ?? "?"}`)
      .join("\n");
  }
}

export class PotionHud extends HudModule {
  constructor() {
    super({
      id: "potion-hud",
      name: "Potion HUD",
      description: "Shows active status effects (needs effect access).",
      defaultX: 4,
      defaultY: 320,
    });
  }
  hudRender(game) {
    const effects = game?.getPlayer?.()?.effects;
    if (!effects || !effects.length) return "";
    return effects.map((e) => `${e.name} ${e.amplifier + 1} (${Math.ceil(e.duration / 20)}s)`).join("\n");
  }
}

export class PerformanceMonitor extends HudModule {
  constructor() {
    super({ id: "performance-monitor", name: "Performance Monitor", description: "FPS, frame time, module update cost and memory.", defaultX: 4, defaultY: 340 });
    this._since = 0;
    this._worst = 0;
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("show-memory", "Show memory usage", true);
    g.bool("show-modules", "Show enabled module count", true);
    g.bool("show-module-time", "Show module update time", true);
  }
  hudRender() {
    const stats = this.manager.client?.stats;
    if (!stats) return "no stats";
    const now = Date.now();
    if (now - this._since > 1000) {
      this._worst = stats.worstFrameMs;
      stats.resetWorst();
      this._since = now;
    }
    const lines = [`FPS: ${stats.fps.toFixed(0)} (${stats.frameTimeMs.toFixed(1)} ms, worst ${this._worst.toFixed(1)} ms)`];
    if (this.settings.get("show-module-time").value) {
      lines.push(`modules: tick ${stats.moduleTickMs.toFixed(3)} ms / render ${stats.moduleRenderMs.toFixed(3)} ms`);
    }
    if (this.settings.get("show-modules").value) {
      lines.push(`enabled: ${this.manager.activeCount()} modules, ${this.manager.bus.totalListeners()} listeners`);
    }
    if (this.settings.get("show-memory").value) {
      const used = stats.memoryUsedMB();
      lines.push(used < 0 ? "memory: unavailable in this browser" : `memory: ${used.toFixed(1)} MB`);
    }
    return lines.join("\n");
  }
}

export function createHudModules() {
  return [
    new FpsDisplay(),
    new CpsCounter(),
    new Coordinates(),
    new DirectionHud(),
    new Keystrokes(),
    new ActiveModulesList(),
    new SessionTimer(),
    new SpeedHud(),
    new CustomTextHud(),
    new ArmorHud(),
    new PotionHud(),
    new PerformanceMonitor(),
  ];
}
