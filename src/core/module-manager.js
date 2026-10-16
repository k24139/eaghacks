/**
 * Module registry + lifecycle manager, modelled on Meteor Client's
 * `systems/modules/Modules`.
 *
 * Responsibilities:
 *  - own the category ordering and the module registry
 *  - dispatch client tick / render to enabled modules
 *  - route keybinds (module binds + macro binds) captured by the keybind
 *    manager
 *  - isolate failures: runGuarded() disables a module that throws instead of
 *    letting the exception escape into the game loop
 *  - expose search + favourites for the ClickGUI
 */
import { EventBus, Events } from "./event-bus.js";
import { describeKeybind } from "./settings.js";

/** Canonical category order, matching Meteor's left-to-right window layout. */
export const CATEGORIES = Object.freeze([
  { id: "Combat", label: "Combat", color: "#d64545" },
  { id: "Movement", label: "Movement", color: "#4f9dde" },
  { id: "Render", label: "Render", color: "#c77dff" },
  { id: "Player", label: "Player", color: "#5bbf7a" },
  { id: "World", label: "World", color: "#e0a458" },
  { id: "Misc", label: "Misc", color: "#9aa0a6" },
  { id: "HUD", label: "HUD", color: "#42b8b0" },
  { id: "Config", label: "Config", color: "#8d8d8d" },
]);

export class ModuleManager {
  /**
   * @param {object} deps
   * @param {EventBus} deps.bus
   * @param {import('./adapter.js').GameAdapter} deps.game
   */
  constructor({ bus, game, onNotify } = {}) {
    this.bus = bus ?? new EventBus();
    this.game = game ?? null;
    /** @type {Map<string, import('./module.js').Module>} */
    this._byId = new Map();
    /** @type {Map<string, import('./module.js').Module[]>} */
    this._byCategory = new Map();
    this._active = new Set();
    this._favourites = new Set();
    this._notify = onNotify ?? null;
    this._errorLog = [];
    this._maxErrorLog = 100;
    /** Set while the manager is applying a batch of loaded config. */
    this._suspendCallbacks = false;
    /** Disabled wholesale when the game reports a fatal/incompatible state. */
    this.panicMode = false;
  }

  // -- registry -------------------------------------------------------------

  register(module) {
    if (this._byId.has(module.id)) {
      throw new Error(`duplicate module id '${module.id}'`);
    }
    module.attach(this);
    this._byId.set(module.id, module);
    const list = this._byCategory.get(module.category) ?? [];
    list.push(module);
    this._byCategory.set(module.category, list);
    try {
      module.init();
    } catch (err) {
      // A module that fails to initialise is disabled and recorded, but does
      // not abort the rest of the registry.
      module._recordError(err);
      module.unsupported = true;
      module.unsupportedReason = `init failed: ${err.message}`;
    }
    return module;
  }

  registerAll(modules) {
    for (const m of modules) this.register(m);
    return this;
  }

  get(id) {
    return this._byId.get(id);
  }

  all() {
    return [...this._byId.values()];
  }

  active() {
    return [...this._active];
  }

  activeCount() {
    return this._active.size;
  }

  byCategory(categoryId) {
    return (this._byCategory.get(categoryId) ?? []).slice();
  }

  /** Category ids that actually contain at least one module. */
  populatedCategories() {
    return CATEGORIES.filter((c) => (this._byCategory.get(c.id) ?? []).length > 0);
  }

  /** @returns {import('./module.js').Module[]} */
  search(query, { includeUnsupported = true } = {}) {
    const q = String(query ?? "").trim().toLowerCase();
    const pool = includeUnsupported ? this.all() : this.all().filter((m) => !m.unsupported);
    if (!q) return pool;
    // Rank: name prefix > name contains > description/id contains.
    const scored = [];
    for (const m of pool) {
      const name = m.name.toLowerCase();
      const id = m.id.toLowerCase();
      const desc = m.description.toLowerCase();
      let score = -1;
      if (name.startsWith(q) || id.startsWith(q)) score = 3;
      else if (name.includes(q)) score = 2;
      else if (id.includes(q)) score = 2;
      else if (desc.includes(q)) score = 1;
      if (score >= 0) scored.push({ m, score });
    }
    scored.sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));
    return scored.map((s) => s.m);
  }

  // -- favourites -----------------------------------------------------------

  isFavourite(module) {
    return this._favourites.has(module.id);
  }
  setFavourite(module, on) {
    if (on) this._favourites.add(module.id);
    else this._favourites.delete(module.id);
    return on;
  }
  toggleFavourite(module) {
    return this.setFavourite(module, !this.isFavourite(module));
  }
  favourites() {
    return this.all().filter((m) => this._favourites.has(m.id));
  }
  favouriteIds() {
    return [...this._favourites];
  }

  // -- toggling / dispatch --------------------------------------------------

  toggle(module) {
    return module.toggle();
  }

  /** @internal invoked by Module.setActive */
  onModuleToggled(module, active) {
    if (active) {
      this._active.add(module);
      if (!this._suspendCallbacks) this.notify(`${module.name} enabled`, "info");
    } else {
      this._active.delete(module);
      if (!this._suspendCallbacks) this.notify(`${module.name} disabled`, "info");
    }
    this.bus.emit(Events.ModuleToggled, { module, active });
  }

  /** Force-disable everything whose capability requirements vanished. */
  revalidateAll({ silent = true } = {}) {
    const changed = [];
    for (const m of [...this._active]) {
      if (!m.canEnable()) {
        const was = this._suspendCallbacks;
        this._suspendCallbacks = silent;
        m.disable();
        this._suspendCallbacks = was;
        changed.push(m);
      }
    }
    return changed;
  }

  enableAll(categoryId) {
    for (const m of categoryId ? this.byCategory(categoryId) : this.all()) {
      if (m.canEnable()) m.enable();
    }
  }

  disableAll({ silent = false } = {}) {
    const was = this._suspendCallbacks;
    this._suspendCallbacks = silent;
    try {
      for (const m of [...this._active]) m.disable();
    } finally {
      this._suspendCallbacks = was;
    }
  }

  /**
   * Dispatch a tick to all enabled modules. Never throws.
   * @param {number} dt ticks elapsed (usually 1 or the game's tick delta)
   */
  tick(dt = 1) {
    for (const m of this._active) {
      if (m.unsupported) continue;
      this.runGuarded(m, "onTick", () => m.onTick(dt));
    }
  }

  /**
   * Dispatch a render pass. `ctx` is a 2D context, `frame` carries timing.
   */
  renderHud(ctx, frame) {
    for (const m of this._active) {
      if (m.unsupported || typeof m.onRender !== "function") continue;
      this.runGuarded(m, "onRender", () => m.onRender(ctx, frame));
    }
  }

  /**
   * Run a module callback with error isolation.
   * On failure the module is disabled so it stops consuming frame time.
   */
  runGuarded(module, label, fn) {
    try {
      fn();
    } catch (err) {
      module._recordError(err);
      if (module.active) {
        // Break the recursion: setActive(false) must not re-enter runGuarded.
        module._active = false;
        this._active.delete(module);
        try {
          module.onDisable();
        } catch {
          /* already reporting one error */
        }
        module._subs.dispose();
        this.bus.emit(Events.ModuleToggled, { module, active: false });
      }
      this.notify(`${module.name} crashed in ${label}(); disabled`, "error");
      return false;
    }
    return true;
  }

  // -- keybinds -------------------------------------------------------------

  /**
   * Find the first enabled-or-not module whose bind matches this event.
   * Modifier-bearing binds take precedence, mirroring Meteor.
   */
  matchBind(keybind) {
    if (!keybind) return null;
    let plain = null;
    for (const m of this._byId.values()) {
      const b = m.bind.value;
      if (!b) continue;
      if (b.key !== keybind.key || b.mouse !== keybind.mouse) continue;
      const bm = b.modifiers ?? {};
      const km = keybind.modifiers ?? {};
      if (!!bm.ctrl === !!km.ctrl && !!bm.alt === !!km.alt && !!bm.shift === !!km.shift) {
        const hasMod = bm.ctrl || bm.alt || bm.shift;
        if (hasMod) return m;
        if (!plain) plain = m;
      }
    }
    return plain;
  }

  /** Handle a keybind press. @returns {boolean} handled */
  onKeybindPressed(keybind) {
    const m = this.matchBind(keybind);
    if (!m) return false;
    if (!m.canEnable() && !m.active) {
      this.notify(`${m.name}: ${m.ineligibilityReason()}`, "warn");
      return true;
    }
    m.toggle();
    return true;
  }

  /** Human-readable bind list for the keybind manager panel. */
  bindList() {
    return this.all()
      .filter((m) => m.bind.value)
      .map((m) => ({ module: m, bind: describeKeybind(m.bind.value), active: m.active }));
  }

  // -- errors / notifications ----------------------------------------------

  reportError(module, err) {
    this._errorLog.push({ at: Date.now(), module: module.id, message: String(err?.message ?? err), stack: err?.stack });
    if (this._errorLog.length > this._maxErrorLog) this._errorLog.shift();
    // eslint-disable-next-line no-console
    console.error(`[meteor] module '${module.id}' threw:`, err);
  }

  errors() {
    return this._errorLog.slice();
  }

  notify(text, level = "info") {
    if (this._notify) this._notify(text, level);
    this.bus.emit(Events.Notification, { text, level });
  }
}
