/**
 * Miscellaneous modules — client-side utilities, plus the two small persistent
 * stores (friends, macros) that other modules consume.
 */
import { Module } from "../core/module.js";
import { Events } from "../core/event-bus.js";
import { captureGameCanvas } from "../core/screenshot.js";

export class Notifications extends Module {
  constructor() {
    super({ id: "notifications", name: "Notifications", description: "Shows toast notifications for module toggles and warnings.", category: "Misc", runsInMenus: true });
    this.log = [];
  }
  onInit() {
    const g = this.settings.addGroup("Notifications");
    g.bool("module-toggles", "Notify on module toggles", true);
    g.bool("warnings", "Notify on warnings", true);
    g.bool("errors", "Notify on errors", true);
    g.int("history", "Keep this many entries", 50, { min: 5, max: 200 });
  }
  handle(text, level = "info") {
    const want =
      (level === "info" && this.settings.get("module-toggles").value) ||
      (level === "warn" && this.settings.get("warnings").value) ||
      (level === "error" && this.settings.get("errors").value);
    if (!want) return;
    this.log.push({ at: Date.now(), text, level });
    const max = this.settings.get("history").value;
    while (this.log.length > max) this.log.shift();
    this.manager.client?.toasts?.push(text, level);
  }
  onEnable() {
    this._sub = this.manager.bus.on(Events.Notification, (ev) => {
      // Avoid feeding the notification that caused this subscription.
      if (ev.__handledBy) return;
      ev.__handledBy = true;
      this.handle(ev.text, ev.level);
    });
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
}

export class FriendManager extends Module {
  constructor() {
    super({ id: "friend-manager", name: "Friend Manager", description: "Manages a friend list excluded from combat modules.", category: "Misc", runsInMenus: true });
    /** @type {Set<string>} */
    this.friends = new Set();
  }
  onInit() {
    const g = this.settings.addGroup("Friends");
    const addSetting = g.string("add", "Name to add", "", { placeholder: "player name" });
    const removeSetting = g.string("remove", "Name to remove", "", { placeholder: "player name" });
    addSetting.onChanged((v) => {
      if (!v) return;
      this.add(v);
      addSetting.set("");
    });
    removeSetting.onChanged((v) => {
      if (!v) return;
      this.remove(v);
      removeSetting.set("");
    });
  }
  isFriend(name) {
    return !!name && this.friends.has(String(name));
  }
  add(name) {
    const clean = String(name).trim();
    if (!clean) return false;
    this.friends.add(clean);
    this.manager.notify(`added friend '${clean}'`, "info");
    this.manager.client?.config?.save?.(true);
    return true;
  }
  remove(name) {
    const clean = String(name).trim();
    const ok = this.friends.delete(clean);
    if (ok) this.manager.client?.config?.save?.(true);
    return ok;
  }
  list() {
    return [...this.friends];
  }
}

/**
 * Macro system: named, keybound, multi-step sequences. Persisted through the
 * config system. Steps are intentionally limited to client-side actions and
 * chat so a macro can never perform hidden remote control.
 */
export class Macros extends Module {
  constructor() {
    super({ id: "macros", name: "Macros", description: "Keybound multi-step action sequences.", category: "Misc", runsInMenus: true });
    /** @type {Array<{name:string,bind:object|null,steps:Array<object>}>} */
    this.macros = [{ name: "example", bind: null, steps: [{ action: "toggle", module: "sprint" }] }];
    this._running = null;
    this._stepIndex = 0;
    this._waitUntil = 0;
  }
  onDisable() { this._running=null;this._stepIndex=0;this._waitUntil=0; }
  runByName(name) {
    const macro = this.macros.find((m) => m.name === name);
    if (!macro) return false;
    this._running = macro;
    this._stepIndex = 0;
    this._waitUntil = 0;
    return true;
  }
  /** Called by the bootstrap's keybind router. */
  onBindPressed(keybind) {
    const macro = this.macros.find((m) => m.bind && m.bind.key === keybind.key && m.bind.mouse === keybind.mouse);
    if (!macro) return false;
    // Never run while the player is typing or the GUI owns input.
    const kb = this.manager.client?.keybinds;
    if (kb?.typing || kb?.guiOpen) return true;
    this.runByName(macro.name);
    return true;
  }
  onTick() {
    if (!this._running) return;
    if (performance.now() < this._waitUntil) return;
    const step = this._running.steps[this._stepIndex];
    if (!step) {
      this._running = null;
      return;
    }
    try {
      this._execute(step);
    } catch (err) {
      this.manager.notify(`macro '${this._running.name}' step failed: ${err.message}`, "error");
      this._running = null;
      return;
    }
    this._stepIndex++;
    this._waitUntil = performance.now() + (step.delay ?? (step.action === "wait" ? 250 : 0));
  }
  _execute(step) {
    switch (step.action) {
      case "toggle": {
        const m = this.manager.get(step.module);
        if (!m) throw new Error(`no module '${step.module}'`);
        m.toggle();
        break;
      }
      case "enable": {
        const m = this.manager.get(step.module);
        if (!m) throw new Error(`no module '${step.module}'`);
        m.enable();
        break;
      }
      case "disable": {
        const m = this.manager.get(step.module);
        if (!m) throw new Error(`no module '${step.module}'`);
        m.disable();
        break;
      }
      case "chat":
        if (this.game.sendChat?.(String(step.message ?? "")) !== true) throw new Error("runtime chat sending is unavailable");
        break;
      case "wait":
        this._waitUntil = performance.now() + (step.delay ?? 250);
        break;
      case "bind":
        this.manager.notify(`macro bind step (${step.key}) is not supported without game key injection`, "warn");
        break;
      default:
        throw new Error(`unknown action '${step.action}'`);
    }
  }
  addMacro(name, bind, steps) {
    if (!name || this.macros.some((m) => m.name === name)) return false;
    this.macros.push({ name, bind: bind ?? null, steps: Array.isArray(steps) ? steps : [] });
    this.manager.client?.config?.save?.(true);
    return true;
  }
  removeMacro(name) {
    const before = this.macros.length;
    this.macros = this.macros.filter((m) => m.name !== name);
    const ok = this.macros.length !== before;
    if (ok) this.manager.client?.config?.save?.(true);
    return ok;
  }
  serialise() {
    return this.macros;
  }
  load(data) {
    if (!Array.isArray(data)) return false;
    this.macros = data
      .filter((m) => m && typeof m.name === "string" && Array.isArray(m.steps))
      .map((m) => ({ name: m.name.slice(0, 48), bind: m.bind ?? null, steps: m.steps.slice(0, 32) }));
    return true;
  }
  reset() {
    this.macros = [];
  }
}

export class ModuleSearch extends Module {
  constructor() {
    super({ id: "module-search", name: "Module Search", description: "Opens the ClickGUI focused on the search box.", category: "Misc", runsInMenus: true });
    this.bind.set({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
  }
  onEnable() {
    this.manager.client?.clickgui?.show();
    this.disable();
  }
}

export class KeybindManagerPanel extends Module {
  constructor() {
    super({ id: "keybind-manager", name: "Keybind Manager", description: "Opens the ClickGUI where binds are edited.", category: "Misc", runsInMenus: true });
  }
  onEnable() {
    this.manager.client?.clickgui?.show();
    this.manager.notify(`${this.manager.bindList().length} module binds configured`, "info");
    this.disable();
  }
}

export class SessionStats extends Module {
  constructor() {
    super({ id: "session-stats", name: "Session Statistics", description: "Tracks session time, distance travelled and deaths.", category: "Misc", runsInMenus: true });
    this.stats = { deaths: 0, distance: 0, startedAt: Date.now(), _last: null, kills: 0 };
    this._eventSubs = [];
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 420, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    const d = this.settings.addGroup("Display");
    d.bool("distance", "Show distance travelled", true);
    d.bool("deaths", "Show death count", true);
    d.bool("time", "Show session time", true);
  }
  onEnable() {
    this._eventSubs.push(
      this.subscribe(Events.PlayerDeath, () => {
        this.stats.deaths++;
      }),
      this.subscribe(Events.PlayerMove, (ev) => {
        if (typeof ev.distance === "number") this.stats.distance += ev.distance;
      }),
      this.subscribe(Events.EntityDamage, (ev) => {
        if (ev?.killed && ev.attackerIsSelf) this.stats.kills++;
      }),
    );
  }
  onDisable() {
    for (const s of this._eventSubs) s.dispose();
    this._eventSubs = [];
  }
  hudRender() {
    const parts = [];
    if (this.settings.get("time").value) {
      const secs = Math.floor((Date.now() - this.stats.startedAt) / 1000);
      parts.push(`${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, "0")}s`);
    }
    if (this.settings.get("distance").value) parts.push(`${this.stats.distance.toFixed(0)}m`);
    if (this.settings.get("deaths").value) parts.push(`${this.stats.deaths} deaths`);
    return `Session: ${parts.join(" · ")}`;
  }
  serialise() {
    return { ...this.stats, _last: undefined };
  }
  load(data) {
    if (!data || typeof data !== "object") return false;
    this.stats = { kills: 0, deaths: 0, distance: 0, startedAt: Date.now(), ...data, _last: null };
    return true;
  }
  reset() {
    this.stats = { deaths: 0, distance: 0, startedAt: Date.now(), _last: null, kills: 0 };
  }
}

export class PingDisplay extends Module {
  constructor() {
    super({ id: "ping-display", name: "Ping Display", description: "Shows the connection latency.", category: "HUD", requiredCapabilities: ["network"], runsInMenus: false });
  }
  onInit() {
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 440, { min: 0, max: 4000 });
    l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
  }
  hudRender() {
    const ping = this.game.getPing?.();
    if (ping === undefined || ping === null || ping < 0) return "Ping: n/a";
    return `Ping: ${Math.round(ping)}ms`;
  }
}

export class ScreenshotUtil extends Module {
  constructor() {
    super({ id: "screenshot-util", name: "Screenshot Utilities", description: "Saves a PNG of the game canvas.", category: "Misc", requiredCapabilities: ["hud"], runsInMenus: true });
    this.bind.set({ key: "F2", mouse: null, modifiers: {} });
  }
  onEnable() {
    const canvas = this.game.getGameCanvas?.() ?? this.game.getCanvas?.();
    if (!canvas) {
      this.manager.notify("no canvas available for screenshots", "warn");
      this.disable();
      return;
    }
    const capture = this._capture = captureGameCanvas(canvas);
    capture.result.then(url => {
      if (!this.active || this._capture !== capture) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = `meteor-${Date.now()}.png`;
      a.click();
      this.manager.notify("screenshot saved", "info");
    }).catch(err => {
      if (this.active && this._capture === capture) this.manager.notify(`screenshot failed: ${err.message}`, "error");
    }).finally(() => {
      if (this._capture === capture) { this._capture = null; this.disable(); }
    });
  }
  onDisable() {
    const capture = this._capture; this._capture = null;
    capture?.cancel();
  }
}

export class AutoGG extends Module {
  constructor() {
    super({ id: "auto-gg", name: "AutoGG", description: "Sends a configurable message when a game ends.", category: "Misc", requiredCapabilities: ["chat"], runsInMenus: true });
    this._sub = null;
    this._timers = new Set();
  }
  onInit() {
    const g = this.settings.addGroup("AutoGG");
    g.string("message", "Message to send", "gg", { maxLength: 100 });
    g.int("delay", "Delay (ticks)", 20, { min: 0, max: 200 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.PlayerDeath, () => {
      const timer = setTimeout(() => {
        this._timers.delete(timer);
        if (this.active) this.game.sendChat?.(this.settings.get("message").value);
      }, this.settings.get("delay").value * 50);
      this._timers.add(timer);
    });
    this.subscribe(Events.WorldUnload, () => this._cancelPending());
  }
  _cancelPending() { for (const timer of this._timers) clearTimeout(timer); this._timers.clear(); }
  onDisable() {
    this._cancelPending();
    this._sub?.dispose();
    this._sub = null;
  }
}

export class ChatTimestamps extends Module {
  constructor() {
    super({
      id: "chat-timestamps",
      name: "Chat Timestamps",
      description: "Prefixes chat messages with a timestamp; requires a chat-render hook the runtime does not expose.",
      category: "Misc",
      unsupported: true,
      unsupportedReason: "no chat message render/format hook available",
    });
  }
}

export class DebugConsole extends Module {
  constructor() {
    super({ id: "debug-console", name: "Debug Console", description: "Logs client events to the browser console.", category: "Misc", runsInMenus: true });
    this.lines = [];
    this._eventSubs = [];
  }
  onInit() {
    const g = this.settings.addGroup("Debug");
    g.bool("events", "Log bus events", true);
    g.bool("modules", "Log module toggles", true);
    g.bool("errors", "Log module errors", true);
    g.int("max-lines", "Keep this many lines", 200, { min: 20, max: 1000 });
  }
  onEnable() {
    this._eventSubs.push(this.subscribe(Events.ModuleToggled, ev => {
      if (this.settings.get("modules").value) this.log(`module ${ev.module.id} -> ${ev.active}`);
    }));
    this._eventSubs.push(this.subscribe(Events.Notification, ev => {
      if (ev.level === 'error' && this.settings.get("errors").value) this.log(`error ${ev.text}`);
    }));
    for (const type of Object.values(Events)) {
      this._eventSubs.push(this.subscribe(type, ev => {
        if (this.settings.get("events").value) this.log(`event ${ev?.type ?? type}`);
      }));
    }
  }
  onDisable() {
    for (const s of this._eventSubs) s.dispose();
    this._eventSubs = [];
  }
  log(line) {
    const entry = `${new Date().toLocaleTimeString()}  ${line}`;
    this.lines.push(entry);
    const max = this.settings.get("max-lines").value;
    while (this.lines.length > max) this.lines.shift();
    // eslint-disable-next-line no-console
    console.debug(`[meteor] ${line}`);
  }
}

export class ServerInfo extends Module {
  constructor() {
    super({ id: "server-info", name: "Server Information", description: "Shows the current server address and player count.", category: "Misc", requiredCapabilities: ["network"], runsInMenus: true });
  }
  onInit() {
    const g = this.settings.addGroup("Display");
    g.bool("address", "Show the server address", true);
    g.bool("players", "Show the player count", true);
  }
  hudRender() {
    const info = this.game.getServerInfo?.();
    if (!info) return "";
    const parts = [];
    if (this.settings.get("address").value) parts.push(info.address ?? "unknown");
    if (this.settings.get("players").value && info.players !== undefined) parts.push(`${info.players} players`);
    return parts.join(" · ");
  }
}

export function createMiscModules() {
  return [
    new Notifications(),
    new FriendManager(),
    new Macros(),
    new ModuleSearch(),
    new KeybindManagerPanel(),
    new SessionStats(),
    new PingDisplay(),
    new ScreenshotUtil(),
    new AutoGG(),
    new ChatTimestamps(),
    new DebugConsole(),
    new ServerInfo(),
  ];
}
