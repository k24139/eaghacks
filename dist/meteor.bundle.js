/* Meteor-inspired client framework for Eaglercraft 26.2-u1 — generated bundle. */
var MeteorFramework = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    BoolSetting: () => BoolSetting,
    CAPABILITIES: () => CAPABILITIES,
    CATEGORIES: () => CATEGORIES,
    CONFIG_VERSION: () => CONFIG_VERSION,
    CancellableEvent: () => CancellableEvent,
    ClickGUI: () => ClickGUI,
    ColorSetting: () => ColorSetting,
    ConfigManager: () => ConfigManager,
    DEFAULT_THEME: () => DEFAULT_THEME,
    DoubleSetting: () => DoubleSetting,
    EnumSetting: () => EnumSetting,
    EventBus: () => EventBus,
    Events: () => Events,
    GameAdapter: () => GameAdapter,
    HUDManager: () => HUDManager,
    IntSetting: () => IntSetting,
    KeybindManager: () => KeybindManager,
    KeybindSetting: () => KeybindSetting,
    MeteorClient: () => MeteorClient,
    MockAdapter: () => MockAdapter,
    Module: () => Module,
    ModuleManager: () => ModuleManager,
    NullAdapter: () => NullAdapter,
    Setting: () => Setting,
    SettingGroup: () => SettingGroup,
    Settings: () => Settings,
    Stats: () => Stats,
    StringSetting: () => StringSetting,
    Subscription: () => Subscription,
    SubscriptionBag: () => SubscriptionBag,
    Theme: () => Theme,
    Ticker: () => Ticker,
    Toasts: () => Toasts,
    Tooltips: () => Tooltips,
    bootMeteor: () => bootMeteor,
    createAllModules: () => createAllModules,
    createGroupWidget: () => createGroupWidget,
    createSettingWidget: () => createSettingWidget,
    getMeteor: () => getMeteor,
    shutdownMeteor: () => shutdownMeteor
  });

  // src/core/event-bus.js
  var errorSink = (event, err) => {
    console.error("[meteor] listener threw", event?.type ?? "(unknown)", err);
  };
  function setErrorSink(fn) {
    if (typeof fn === "function") errorSink = fn;
  }
  var CancellableEvent = class {
    constructor(type) {
      this.type = type;
      this.cancelled = false;
    }
    cancel() {
      this.cancelled = true;
    }
  };
  var Subscription = class {
    constructor(bus, type, listener) {
      this._bus = bus;
      this._type = type;
      this._listener = listener;
      this._disposed = false;
    }
    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      this._bus._remove(this._type, this._listener);
    }
    get disposed() {
      return this._disposed;
    }
  };
  var SubscriptionBag = class {
    constructor() {
      this._subs = /* @__PURE__ */ new Set();
    }
    add(sub) {
      if (sub) this._subs.add(sub);
      return sub;
    }
    /** Subscribe-and-track helper. */
    track(sub) {
      return this.add(sub);
    }
    dispose() {
      for (const s of this._subs) s.dispose();
      this._subs.clear();
    }
    get size() {
      return this._subs.size;
    }
  };
  var EventBus = class {
    constructor() {
      this._listeners = /* @__PURE__ */ new Map();
      this._emitting = 0;
    }
    /**
     * @param {string} type
     * @param {(event:any)=>void} listener
     * @param {{priority?:number}} [opts] higher priority runs first
     * @returns {Subscription}
     */
    on(type, listener, opts = {}) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      const priority = opts.priority ?? 0;
      let list = this._listeners.get(type);
      if (!list) {
        list = [];
        this._listeners.set(type, list);
      }
      const entry = { listener, priority };
      let i = list.length;
      while (i > 0 && list[i - 1].priority < priority) i--;
      list.splice(i, 0, entry);
      return new Subscription(this, type, listener);
    }
    /** Convenience for one-shot listeners (still returns a Subscription). */
    once(type, listener, opts = {}) {
      const sub = this.on(
        type,
        (ev) => {
          sub.dispose();
          listener(ev);
        },
        opts
      );
      return sub;
    }
    _remove(type, listener) {
      const list = this._listeners.get(type);
      if (!list) return;
      const i = list.findIndex((e) => e.listener === listener);
      if (i !== -1) list.splice(i, 1);
      if (list.length === 0) this._listeners.delete(type);
    }
    /**
     * Dispatch an event. Listener exceptions are isolated.
     * @param {string} type
     * @param {any} [event] defaults to a plain event object
     * @returns {any} the event
     */
    emit(type, event = { type }) {
      if (!event.type) event.type = type;
      const list = this._listeners.get(type);
      if (!list || list.length === 0) return event;
      this._emitting++;
      try {
        const snapshot = list.slice();
        for (const entry of snapshot) {
          try {
            entry.listener(event);
          } catch (err) {
            errorSink(event, err);
          }
        }
      } finally {
        this._emitting--;
      }
      return event;
    }
    /**
     * Dispatch a cancellable event. Returns true if any listener cancelled it.
     * Mutation happens in place so listeners can share state.
     */
    emitCancellable(type, event = { type }) {
      if (typeof event.cancel !== "function") {
        Object.setPrototypeOf(event, CancellableEvent.prototype);
        event.type = type;
        event.cancelled = false;
      }
      this.emit(type, event);
      return !!event.cancelled;
    }
    listenerCount(type) {
      return this._listeners.get(type)?.length ?? 0;
    }
    /** Diagnostic: total listeners across all event types. */
    totalListeners() {
      let n = 0;
      for (const list of this._listeners.values()) n += list.length;
      return n;
    }
    clear() {
      this._listeners.clear();
    }
  };
  var Events = Object.freeze({
    // client / framework
    ClientTick: "client-tick",
    ModuleToggled: "module-toggled",
    ConfigSaved: "config-saved",
    ConfigLoaded: "config-loaded",
    Notification: "notification",
    // player
    PlayerTick: "player-tick",
    PlayerMove: "player-move",
    PlayerDeath: "player-death",
    PlayerRespawn: "player-respawn",
    // input
    KeyInput: "key-input",
    MouseInput: "mouse-input",
    MouseScroll: "mouse-scroll",
    // world
    WorldLoad: "world-load",
    WorldUnload: "world-unload",
    EntityUpdate: "entity-update",
    EntityDamage: "entity-damage",
    InventoryUpdate: "inventory-update",
    // render
    RenderWorld: "render-world",
    RenderHud: "render-hud",
    Render2D: "render-2d",
    // network
    Connect: "connect",
    Disconnect: "disconnect",
    PacketReceive: "packet-receive",
    PacketSend: "packet-send"
  });

  // src/core/settings.js
  var idCounter = 0;
  var Setting = class {
    constructor(name, description, defaultValue) {
      if (!name) throw new Error("Setting requires a stable name");
      this.name = name;
      this.description = description ?? "";
      this.defaultValue = defaultValue;
      this._value = defaultValue;
      this.visibility = null;
      this._listeners = [];
      this.lastParseError = null;
      this.id = `${name}#${idCounter++}`;
    }
    get value() {
      return this._value;
    }
    set value(v) {
      this.set(v);
    }
    /** @returns {boolean} whether the value actually changed */
    set(v) {
      const coerced = this.parse(v);
      if (coerced === void 0) {
        this.lastParseError = new Error(`invalid value for setting '${this.name}'`);
        return false;
      }
      if (Object.is(coerced, this._value)) return false;
      const prev = this._value;
      this._value = coerced;
      for (const fn of this._listeners) {
        try {
          fn(coerced, this, prev);
        } catch (err) {
          console.error(`[meteor] onChanged for '${this.name}' threw`, err);
        }
      }
      return true;
    }
    /** @returns {void} */
    reset() {
      this.set(this.defaultValue);
    }
    onChanged(fn) {
      if (typeof fn === "function") this._listeners.push(fn);
      return this;
    }
    offChanged(fn) {
      const index = this._listeners.indexOf(fn);
      if (index >= 0) this._listeners.splice(index, 1);
      return this;
    }
    /** Conditional display, e.g. only show `range` when `players-only` is on. */
    visibleWhen(fn) {
      this.visibility = fn;
      return this;
    }
    isVisible() {
      if (!this.visibility) return true;
      try {
        return !!this.visibility();
      } catch {
        return true;
      }
    }
    get isDefault() {
      return Object.is(this._value, this.defaultValue);
    }
    /** Convert arbitrary input into a valid value, or undefined if impossible. */
    parse(v) {
      return v;
    }
    /** Serialise the current value. Returns undefined when it equals default. */
    serialise() {
      if (this.isDefault) return void 0;
      return this._value;
    }
    /**
     * Apply a previously serialised value without throwing.
     * @returns {boolean} success
     */
    deserialise(raw) {
      if (raw === void 0 || raw === null) {
        this._value = this.defaultValue;
        return true;
      }
      const parsed = this.parse(raw);
      if (parsed === void 0) {
        this.lastParseError = new Error(`could not deserialise '${this.name}' from ${JSON.stringify(raw)}`);
        this._value = this.defaultValue;
        return false;
      }
      this._value = parsed;
      return true;
    }
  };
  var BoolSetting = class extends Setting {
    constructor(name, description, defaultValue = false) {
      super(name, description, !!defaultValue);
    }
    parse(v) {
      if (typeof v === "boolean") return v;
      if (v === "true" || v === 1 || v === "1") return true;
      if (v === "false" || v === 0 || v === "0") return false;
      return void 0;
    }
  };
  var IntSetting = class extends Setting {
    constructor(name, description, defaultValue, { min = -Infinity, max = Infinity, step = 1, slider = true } = {}) {
      const d = clampInt(defaultValue, min, max);
      super(name, description, d);
      this.min = min;
      this.max = max;
      this.step = step;
      this.slider = slider;
      this._value = d;
    }
    parse(v) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return void 0;
      return clampInt(Math.round(n), this.min, this.max);
    }
  };
  var DoubleSetting = class extends Setting {
    constructor(name, description, defaultValue, { min = -Infinity, max = Infinity, slider = true, precision = 3 } = {}) {
      const d = clampDouble(defaultValue, min, max);
      super(name, description, d);
      this.min = min;
      this.max = max;
      this.slider = slider;
      this.precision = precision;
      this._value = d;
    }
    parse(v) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return void 0;
      const rounded = Number(n.toFixed(this.precision));
      return clampDouble(rounded, this.min, this.max);
    }
  };
  var StringSetting = class extends Setting {
    constructor(name, description, defaultValue = "", { maxLength = 256, placeholder = "" } = {}) {
      super(name, description, String(defaultValue ?? ""));
      this.maxLength = maxLength;
      this.placeholder = placeholder;
    }
    parse(v) {
      if (v === null || v === void 0) return void 0;
      const s = String(v);
      return s.length > this.maxLength ? s.slice(0, this.maxLength) : s;
    }
  };
  var EnumSetting = class extends Setting {
    /** @param {string[]} options */
    constructor(name, description, defaultValue, options) {
      const opts = options.slice();
      const d = opts.includes(defaultValue) ? defaultValue : opts[0];
      super(name, description, d);
      this.options = opts;
      this._value = d;
    }
    parse(v) {
      if (typeof v !== "string") return void 0;
      const exact = this.options.find((o) => o === v);
      if (exact) return exact;
      return this.options.find((o) => o.toLowerCase() === v.toLowerCase());
    }
  };
  var ColorSetting = class extends Setting {
    constructor(name, description, defaultValue = { r: 255, g: 255, b: 255, a: 255 }, { rainbow = false } = {}) {
      const d = normaliseColor(defaultValue);
      super(name, description, d);
      this.rainbowDefault = rainbow;
      this.rainbow = rainbow;
      this._value = { ...d };
    }
    parse(v) {
      return normaliseColor(v);
    }
    set(v) {
      const coerced = this.parse(v);
      if (coerced === void 0) {
        this.lastParseError = new Error(`invalid colour for '${this.name}'`);
        return false;
      }
      const prev = this._value;
      if (sameColor(prev, coerced)) return false;
      this._value = coerced;
      for (const fn of this._listeners) {
        try {
          fn(coerced, this, prev);
        } catch (err) {
          console.error(`[meteor] onChanged for '${this.name}' threw`, err);
        }
      }
      return true;
    }
    serialise() {
      const base = { ...this._value };
      if (this.rainbow) base.rainbow = true;
      if (this.isDefault && !this.rainbow) return void 0;
      return base;
    }
    deserialise(raw) {
      if (!raw) {
        this._value = { ...this.defaultValue };
        this.rainbow = this.rainbowDefault;
        return true;
      }
      const parsed = this.parse(raw);
      if (!parsed) return false;
      this._value = parsed;
      this.rainbow = !!raw.rainbow;
      return true;
    }
    get isDefault() {
      return sameColor(this._value, this.defaultValue) && this.rainbow === this.rainbowDefault;
    }
    toHex(alpha = true) {
      const c = this._value;
      const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
      return `#${h(c.r)}${h(c.g)}${h(c.b)}${alpha ? h(c.a) : ""}`;
    }
  };
  var KeybindSetting = class extends Setting {
    constructor(name, description, defaultValue = null) {
      const d = normaliseKeybind(defaultValue);
      super(name, description, d);
      this._value = d ? { ...d } : null;
    }
    parse(v) {
      return normaliseKeybind(v);
    }
    set(v) {
      const coerced = this.parse(v);
      if (coerced === void 0) return false;
      const prev = this._value;
      if (sameKeybind(prev, coerced)) return false;
      this._value = coerced;
      for (const fn of this._listeners) {
        try {
          fn(coerced, this, prev);
        } catch (err) {
          console.error(`[meteor] onChanged for '${this.name}' threw`, err);
        }
      }
      return true;
    }
    serialise() {
      if (this.isDefault) return void 0;
      return this._value;
    }
    deserialise(raw) {
      this._value = normaliseKeybind(raw) ?? null;
      return true;
    }
    describe() {
      return describeKeybind(this._value);
    }
  };
  var SettingGroup = class {
    /**
     * @param {string} name
     * @param {{expanded?:boolean}} [opts]
     * @param {Settings} [owner] back-reference so group-added settings are indexed
     */
    constructor(name, { expanded = true } = {}, owner = null) {
      this.name = name;
      this.expanded = expanded;
      this.owner = owner;
      this.settings = [];
    }
    add(setting) {
      if (this.owner) return this.owner._registerInGroup(this, setting);
      this.settings.push(setting);
      return setting;
    }
    bool(name, desc, def) {
      return this.add(new BoolSetting(name, desc, def));
    }
    int(name, desc, def, opts) {
      return this.add(new IntSetting(name, desc, def, opts));
    }
    double(name, desc, def, opts) {
      return this.add(new DoubleSetting(name, desc, def, opts));
    }
    string(name, desc, def, opts) {
      return this.add(new StringSetting(name, desc, def, opts));
    }
    enum(name, desc, def, options) {
      return this.add(new EnumSetting(name, desc, def, options));
    }
    color(name, desc, def, opts) {
      return this.add(new ColorSetting(name, desc, def, opts));
    }
    keybind(name, desc, def) {
      return this.add(new KeybindSetting(name, desc, def));
    }
    reset() {
      for (const s of this.settings) s.reset();
    }
  };
  var Settings = class {
    constructor() {
      this.groups = [];
      this._index = /* @__PURE__ */ new Map();
      this.defaultGroup = this.addGroup("");
    }
    addGroup(name, opts) {
      const g = new SettingGroup(name, opts, this);
      this.groups.push(g);
      return g;
    }
    /**
     * Register a setting into a specific group. Duplicate names would make
     * persistence ambiguous, so they fail loudly at construction time rather than
     * silently overwriting at runtime.
     */
    _registerInGroup(group, s) {
      if (this._index.has(s.name)) throw new Error(`duplicate setting name '${s.name}'`);
      group.settings.push(s);
      this._index.set(s.name, s);
      return s;
    }
    /** Register a setting into the default (unnamed) group. */
    _register(s) {
      return this._registerInGroup(this.defaultGroup, s);
    }
    bool(name, desc, def) {
      return this._register(new BoolSetting(name, desc, def));
    }
    int(name, desc, def, opts) {
      return this._register(new IntSetting(name, desc, def, opts));
    }
    double(name, desc, def, opts) {
      return this._register(new DoubleSetting(name, desc, def, opts));
    }
    string(name, desc, def, opts) {
      return this._register(new StringSetting(name, desc, def, opts));
    }
    enum(name, desc, def, options) {
      return this._register(new EnumSetting(name, desc, def, options));
    }
    color(name, desc, def, opts) {
      return this._register(new ColorSetting(name, desc, def, opts));
    }
    keybind(name, desc, def) {
      return this._register(new KeybindSetting(name, desc, def));
    }
    get(name) {
      return this._index.get(name);
    }
    /** @returns {Setting[]} */
    all() {
      const out = [];
      for (const g of this.groups) out.push(...g.settings);
      return out;
    }
    reset() {
      for (const s of this.all()) s.reset();
    }
  };
  function clampInt(n, min, max) {
    const r = Math.round(Number(n));
    if (!Number.isFinite(r)) return min === -Infinity ? 0 : min;
    return Math.max(min, Math.min(max, r));
  }
  function clampDouble(n, min, max) {
    const r = Number(n);
    if (!Number.isFinite(r)) return min === -Infinity ? 0 : min;
    return Math.max(min, Math.min(max, r));
  }
  function sameColor(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }
  function normaliseColor(v) {
    if (v === null || v === void 0) return void 0;
    if (Array.isArray(v)) {
      const [r, g, b, a = 255] = v;
      return packColor(r, g, b, a);
    }
    if (typeof v === "number") {
      if (v <= 16777215) return { r: v >> 16 & 255, g: v >> 8 & 255, b: v & 255, a: 255 };
      return { r: v >>> 24 & 255, g: v >>> 16 & 255, b: v >>> 8 & 255, a: v & 255 };
    }
    if (typeof v === "string") {
      const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v.trim());
      if (!m) return void 0;
      const int = parseInt(m[1], 16);
      const a = m[2] ? parseInt(m[2], 16) : 255;
      return { r: int >> 16 & 255, g: int >> 8 & 255, b: int & 255, a };
    }
    if (typeof v === "object") {
      return packColor(v.r, v.g, v.b, v.a ?? 255);
    }
    return void 0;
  }
  function packColor(r, g, b, a) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
    return { r: c(r), g: c(g), b: c(b), a: c(a) };
  }
  function normaliseKeybind(v) {
    if (v === null || v === void 0) return null;
    if (typeof v === "string") return { key: v, mouse: null, modifiers: {} };
    if (typeof v === "number") return { key: null, mouse: v, modifiers: {} };
    if (typeof v === "object") {
      return {
        key: typeof v.key === "string" ? v.key : null,
        mouse: typeof v.mouse === "number" ? v.mouse : null,
        modifiers: v.modifiers && typeof v.modifiers === "object" ? v.modifiers : {}
      };
    }
    return void 0;
  }
  function sameKeybind(a, b) {
    if (a === null && b === null) return true;
    if (!a || !b) return false;
    const ma = a.modifiers ?? {};
    const mb = b.modifiers ?? {};
    return a.key === b.key && a.mouse === b.mouse && !!ma.ctrl === !!mb.ctrl && !!ma.alt === !!mb.alt && !!ma.shift === !!mb.shift;
  }
  function describeKeybind(kb) {
    if (!kb) return "none";
    const parts = [];
    const m = kb.modifiers ?? {};
    if (m.ctrl) parts.push("Ctrl");
    if (m.alt) parts.push("Alt");
    if (m.shift) parts.push("Shift");
    if (kb.mouse !== null && kb.mouse !== void 0) parts.push(`Mouse${kb.mouse}`);
    if (kb.key) parts.push(prettyKey(kb.key));
    return parts.length ? parts.join(" + ") : "none";
  }
  function prettyKey(code) {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code === "ShiftRight") return "RShift";
    if (code === "ShiftLeft") return "LShift";
    if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
    return code;
  }
  function keybindFromKeyboardEvent(e) {
    if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return null;
    return {
      key: e.code || e.key,
      mouse: null,
      modifiers: { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey && e.code !== "ShiftLeft" && e.code !== "ShiftRight" }
    };
  }
  function keybindFromMouseEvent(e, button) {
    return {
      key: null,
      mouse: button,
      modifiers: { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
    };
  }

  // src/core/module-manager.js
  var CATEGORIES = Object.freeze([
    { id: "Combat", label: "Combat", color: "#d64545" },
    { id: "Movement", label: "Movement", color: "#4f9dde" },
    { id: "Render", label: "Render", color: "#c77dff" },
    { id: "Player", label: "Player", color: "#5bbf7a" },
    { id: "World", label: "World", color: "#e0a458" },
    { id: "Misc", label: "Misc", color: "#9aa0a6" },
    { id: "HUD", label: "HUD", color: "#42b8b0" },
    { id: "Config", label: "Config", color: "#8d8d8d" }
  ]);
  var ModuleManager = class {
    /**
     * @param {object} deps
     * @param {EventBus} deps.bus
     * @param {import('./adapter.js').GameAdapter} deps.game
     */
    constructor({ bus, game, onNotify } = {}) {
      this.bus = bus ?? new EventBus();
      this.game = game ?? null;
      this._byId = /* @__PURE__ */ new Map();
      this._byCategory = /* @__PURE__ */ new Map();
      this._active = /* @__PURE__ */ new Set();
      this._favourites = /* @__PURE__ */ new Set();
      this._notify = onNotify ?? null;
      this._errorLog = [];
      this._maxErrorLog = 100;
      this._suspendCallbacks = false;
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
      for (const m of this._byId.values()) {
        if (m.active && !m.canEnable()) {
          const was = this._suspendCallbacks;
          this._suspendCallbacks = silent;
          m.disable();
          m._restoreOnWorld = !m.unsupported;
          this._suspendCallbacks = was;
          changed.push(m);
        } else if (!m.active && m._restoreOnWorld && m.canEnable()) {
          const was = this._suspendCallbacks;
          this._suspendCallbacks = silent;
          m.enable();
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
        for (const m of this._byId.values()) if (m.active || m._restoreOnWorld) m.disable();
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
          module._active = false;
          module._restoreOnWorld = false;
          this._active.delete(module);
          try {
            module.onDisable();
          } catch {
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
      return this.all().filter((m) => m.bind.value).map((m) => ({ module: m, bind: describeKeybind(m.bind.value), active: m.active }));
    }
    // -- errors / notifications ----------------------------------------------
    reportError(module, err) {
      this._errorLog.push({ at: Date.now(), module: module.id, message: String(err?.message ?? err), stack: err?.stack });
      if (this._errorLog.length > this._maxErrorLog) this._errorLog.shift();
      console.error(`[meteor] module '${module.id}' threw:`, err);
    }
    errors() {
      return this._errorLog.slice();
    }
    notify(text, level = "info") {
      if (this._notify?.(text, level) === true) return;
      this.bus.emit(Events.Notification, { text, level });
    }
  };

  // src/core/keybind-manager.js
  var KeybindManager = class {
    /**
     * @param {object} deps
     * @param {import('./event-bus.js').EventBus} deps.bus
     * @param {import('./module-manager.js').ModuleManager} [deps.modules]
     */
    constructor({ bus, modules } = {}) {
      this.bus = bus;
      this.modules = modules ?? null;
      this.guiBinds = [
        { key: "ShiftRight", mouse: null, modifiers: {} },
        { key: null, mouse: 2, modifiers: {} }
        // middle click, a common Meteor alternative
      ];
      this.closeBinds = [{ key: "Escape", mouse: null, modifiers: {} }];
      this._captureCallback = null;
      this._target = null;
      this._attached = false;
      this._disposed = false;
      this.guiOpen = false;
      this.typing = false;
      this._awaitingRelease = null;
      this.heldKeys = /* @__PURE__ */ new Set();
      this.onToggleRequest = null;
      this.onMouseButton = null;
    }
    /** @param {Window|HTMLElement} target */
    attach(target) {
      if (this._attached || this._disposed) return this;
      this._target = target;
      this._onKeyDown = this._handleKeyDown.bind(this);
      this._onKeyUp = this._handleKeyUp.bind(this);
      this._onMouseDown = this._handleMouseDown.bind(this);
      this._onMouseUp = this._handleMouseUp.bind(this);
      this._onWheel = this._handleWheel.bind(this);
      this._onBlur = this._handleBlur.bind(this);
      target.addEventListener("keydown", this._onKeyDown, true);
      target.addEventListener("keyup", this._onKeyUp, true);
      target.addEventListener("mousedown", this._onMouseDown, true);
      target.addEventListener("mouseup", this._onMouseUp, true);
      target.addEventListener("wheel", this._onWheel, { capture: true, passive: false });
      target.addEventListener("blur", this._onBlur);
      this._attached = true;
      return this;
    }
    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      this._handleBlur();
      if (!this._attached || !this._target) return;
      const t = this._target;
      t.removeEventListener("keydown", this._onKeyDown, true);
      t.removeEventListener("keyup", this._onKeyUp, true);
      t.removeEventListener("mousedown", this._onMouseDown, true);
      t.removeEventListener("mouseup", this._onMouseUp, true);
      t.removeEventListener("wheel", this._onWheel, { capture: true });
      t.removeEventListener("blur", this._onBlur);
      this._attached = false;
    }
    /**
     * Begin capturing the next key/button. Escape cancels (returns null).
     * @param {(kb:object|null)=>void} cb
     */
    capture(cb) {
      this._captureCallback = cb;
      return this;
    }
    cancelCapture() {
      const cb = this._captureCallback;
      this._captureCallback = null;
      if (cb) cb(null);
    }
    get capturing() {
      return this._captureCallback !== null;
    }
    // -- internal -------------------------------------------------------------
    _handleKeyDown(e) {
      if (this._captureCallback) {
        e.preventDefault();
        e.stopPropagation();
        const cb = this._captureCallback;
        this._captureCallback = null;
        if (e.key === "Escape") {
          cb(null);
          return;
        }
        const kb2 = keybindFromKeyboardEvent(e);
        cb(kb2);
        return;
      }
      const isGuiKey = this._matchesAny(e, this.guiBinds);
      const isCloseKey = this.guiOpen && this._matchesAny(e, this.closeBinds);
      this.heldKeys.add(e.code || e.key);
      if (isGuiKey || isCloseKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        this.onToggleRequest?.();
        return;
      }
      if (this.guiOpen) {
        if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
          e.stopPropagation();
          return;
        }
        if (this._isGameplayKey(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        return;
      }
      if (this.typing || e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const kb = keybindFromKeyboardEvent(e);
      if (!kb) return;
      if (e.repeat) return;
      this.bus?.emit("key-input", { event: e, keybind: kb, handled: false });
      const handled = this.modules?.onKeybindPressed(kb);
      if (!handled && !this.guiOpen) {
      }
    }
    _handleKeyUp(e) {
      this.heldKeys.delete(e.code || e.key);
      this.bus?.emit("key-up", { event: e, code: e.code || e.key });
    }
    _handleMouseDown(e) {
      if (this._captureCallback) {
        e.preventDefault();
        e.stopPropagation();
        const cb = this._captureCallback;
        this._captureCallback = null;
        cb(keybindFromMouseEvent(e, e.button));
        return;
      }
      this.onMouseButton?.(e.button, true, e);
      if (this.guiOpen) {
        return;
      }
      if (this.typing) return;
      const kb = keybindFromMouseEvent(e, e.button);
      this.bus?.emit("mouse-input", { event: e, keybind: kb, button: e.button, down: true });
      this.modules?.onKeybindPressed(kb);
    }
    _handleMouseUp(e) {
      this.onMouseButton?.(e.button, false, e);
      if (this.guiOpen) return;
      this.bus?.emit("mouse-input", { event: e, button: e.button, down: false });
    }
    _handleWheel(e) {
      if (this.guiOpen) {
        e.stopPropagation();
        return;
      }
      this.bus?.emit("mouse-scroll", { event: e, deltaY: e.deltaY, deltaX: e.deltaX });
    }
    _handleBlur() {
      this.heldKeys.clear();
      if (this._captureCallback) this.cancelCapture();
    }
    _matchesAny(e, binds) {
      for (const b of binds) {
        if (b.key && (e.code === b.key || e.key === b.key)) return true;
      }
      return false;
    }
    _isGameplayKey(e) {
      const gameplay = /* @__PURE__ */ new Set([
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "Space",
        "ShiftLeft",
        "ControlLeft",
        "Digit1",
        "Digit2",
        "Digit3",
        "Digit4",
        "Digit5",
        "Digit6",
        "Digit7",
        "Digit8",
        "Digit9",
        "KeyE",
        "KeyQ",
        "KeyT",
        "KeyF"
      ]);
      return gameplay.has(e.code);
    }
  };

  // src/core/config-manager.js
  var CONFIG_VERSION = 1;
  var MemoryStorage = class {
    constructor() {
      this._m = /* @__PURE__ */ new Map();
    }
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    }
    setItem(k, v) {
      this._m.set(k, String(v));
    }
    removeItem(k) {
      this._m.delete(k);
    }
    key(i) {
      return [...this._m.keys()][i] ?? null;
    }
    get length() {
      return this._m.size;
    }
  };
  function safeStorage(candidate, log) {
    if (!candidate) return new MemoryStorage();
    try {
      const probe = "__meteor_probe__";
      candidate.setItem(probe, "1");
      candidate.removeItem(probe);
      return candidate;
    } catch (err) {
      log?.(`storage unavailable (${err.name}); falling back to memory`, "warn");
      return new MemoryStorage();
    }
  }
  var ConfigManager = class {
    /**
     * @param {object} deps
     * @param {import('./module-manager.js').ModuleManager} deps.modules
     * @param {(text:string, level?:string)=>void} [deps.notify]
     * @param {StorageLike} [deps.storage]
     */
    constructor({ modules, notify, storage, prefix = "meteor.eagler" } = {}) {
      this.modules = modules;
      this.prefix = prefix;
      this._notify = notify ?? (() => {
      });
      this._storage = safeStorage(storage ?? globalThis.localStorage, this._notify);
      this._systems = /* @__PURE__ */ new Map();
      this._sanitisers = /* @__PURE__ */ new Map();
      this._activeProfile = "default";
      this._dirty = false;
      this._timer = null;
      this._debounceMs = 1500;
      this.lastLoadDiagnostics = { recovered: false, errors: [], loadedSettings: 0 };
    }
    // -- system registration --------------------------------------------------
    /**
     * Register an auxiliary persistent system (HUD layout, theme, macros).
     * @param {string} name
     * @param {{save:()=>any, load:(data:any)=>void}} system
     * @param {(data:any)=>any} [sanitise]
     */
    registerSystem(name, system, sanitise) {
      this._systems.set(name, system);
      if (sanitise) this._sanitisers.set(name, sanitise);
    }
    get activeProfile() {
      return this._activeProfile;
    }
    // -- keys -----------------------------------------------------------------
    _key(profile, suffix) {
      return `${this.prefix}.${profile}.${suffix}`;
    }
    _profilesKey() {
      return `${this.prefix}.profiles`;
    }
    // -- serialisation --------------------------------------------------------
    serialiseModules() {
      const out = [];
      for (const m of this.modules.all()) {
        const settings = {};
        let any = false;
        for (const s of m.settings.all()) {
          const v = s.serialise();
          if (v !== void 0) {
            settings[s.name] = v;
            any = true;
          }
        }
        const entry = { id: m.id };
        if (any) entry.settings = settings;
        if (m.active || m._restoreOnWorld) entry.active = true;
        if (this.modules.isFavourite(m)) entry.favourite = true;
        if (any || entry.active || entry.favourite) out.push(entry);
      }
      return out;
    }
    deserialiseModules(list) {
      const diag = { recovered: false, errors: [], loadedSettings: 0 };
      if (!Array.isArray(list)) {
        diag.recovered = true;
        diag.errors.push("modules payload was not an array");
        return diag;
      }
      this.modules._suspendCallbacks = true;
      try {
        for (const entry of list) {
          if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
            diag.recovered = true;
            diag.errors.push("skipped malformed module entry");
            continue;
          }
          const m = this.modules.get(entry.id);
          if (!m) {
            diag.errors.push(`unknown module '${entry.id}' ignored`);
            continue;
          }
          if (entry.settings && typeof entry.settings === "object") {
            for (const [name, value] of Object.entries(entry.settings)) {
              const s = m.settings.get(name);
              if (!s) {
                diag.errors.push(`unknown setting '${m.id}.${name}' ignored`);
                continue;
              }
              const ok = s.deserialise(value);
              if (!ok) {
                diag.recovered = true;
                diag.errors.push(`bad value for '${m.id}.${name}', reset to default`);
              }
              diag.loadedSettings++;
            }
          }
          if (entry.favourite) this.modules.setFavourite(m, true);
          if (entry.active) {
            if (m.canEnable()) {
              m._active = true;
              this.modules._active.add(m);
              this.modules.runGuarded(m, "onEnable", () => m.onEnable());
            } else {
              if (!m.unsupported) m._restoreOnWorld = true;
              diag.errors.push(`could not enable '${m.id}': ${m.ineligibilityReason()}`);
            }
          }
        }
      } finally {
        this.modules._suspendCallbacks = false;
      }
      return diag;
    }
    serialiseAll() {
      const systems = {};
      for (const [name, sys] of this._systems) {
        try {
          systems[name] = sys.save();
        } catch (err) {
          systems[name] = null;
          this._notify(`failed to save '${name}': ${err.message}`, "error");
        }
      }
      return {
        version: CONFIG_VERSION,
        savedAt: (/* @__PURE__ */ new Date()).toISOString(),
        profile: this._activeProfile,
        modules: this.serialiseModules(),
        systems
      };
    }
    deserialiseAll(data) {
      const diag = { recovered: false, errors: [], loadedSettings: 0 };
      if (!data || typeof data !== "object") {
        diag.recovered = true;
        diag.errors.push("config root was not an object");
        return diag;
      }
      if (typeof data.version === "number" && data.version > CONFIG_VERSION) {
        diag.errors.push(`config version ${data.version} is newer than ${CONFIG_VERSION}; loading best-effort`);
      }
      const modDiag = this.deserialiseModules(data.modules);
      diag.recovered || (diag.recovered = modDiag.recovered);
      diag.errors.push(...modDiag.errors);
      diag.loadedSettings += modDiag.loadedSettings;
      if (data.systems && typeof data.systems === "object") {
        for (const [name, sys] of this._systems) {
          const raw = data.systems[name];
          if (raw === void 0 || raw === null) continue;
          try {
            const sanitiser = this._sanitisers.get(name);
            const clean = sanitiser ? sanitiser(raw) : raw;
            if (clean === void 0 || clean === null) {
              diag.recovered = true;
              diag.errors.push(`'${name}' data failed validation, using defaults`);
              continue;
            }
            sys.load(clean);
          } catch (err) {
            diag.recovered = true;
            diag.errors.push(`'${name}' failed to load: ${err.message}`);
          }
        }
      }
      return diag;
    }
    // -- persistence ----------------------------------------------------------
    /** @param {boolean} [immediate] skip the debounce (used on unload) */
    save(immediate = false) {
      if (this._timer !== null) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      if (!immediate) {
        this._dirty = true;
        this._timer = setTimeout(() => {
          this._timer = null;
          this._flush();
        }, this._debounceMs);
        return false;
      }
      return this._flush();
    }
    _flush() {
      const payload = this.serialiseAll();
      try {
        this._storage.setItem(this._key(this._activeProfile, "config"), JSON.stringify(payload));
        this._dirty = false;
        return true;
      } catch (err) {
        this._notify(`could not save config: ${err.message}`, "error");
        return false;
      }
    }
    /** Load the active profile. Never throws. */
    load() {
      let raw = null;
      try {
        raw = this._storage.getItem(this._key(this._activeProfile, "config"));
      } catch (err) {
        this._notify(`could not read config: ${err.message}`, "error");
      }
      if (!raw) {
        this._resetToDefaults();
        this.lastLoadDiagnostics = { recovered: false, errors: [], loadedSettings: 0 };
        return this.lastLoadDiagnostics;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        this._quarantine(raw);
        const diag2 = { recovered: true, errors: [`config was not valid JSON (${err.message}); quarantined`], loadedSettings: 0 };
        this.lastLoadDiagnostics = diag2;
        this._notify("config file was corrupt and has been quarantined", "warn");
        return diag2;
      }
      const diag = this.deserialiseAll(parsed);
      if (diag.recovered) this._quarantine(raw);
      this.lastLoadDiagnostics = diag;
      return diag;
    }
    _quarantine(raw) {
      try {
        this._storage.setItem(this._key(this._activeProfile, "config.corrupt"), raw);
      } catch {
      }
    }
    resetAll() {
      this._resetToDefaults();
      this.save(true);
      this._notify("configuration reset to defaults", "info");
    }
    /** Clear in-memory state back to factory defaults (no persistence). */
    _resetToDefaults() {
      this.modules.disableAll({ silent: true });
      this.modules._favourites.clear();
      for (const m of this.modules.all()) m.settings.reset();
      for (const sys of this._systems.values()) {
        try {
          sys.reset?.();
        } catch {
        }
      }
    }
    // -- profiles -------------------------------------------------------------
    listProfiles() {
      try {
        const raw = this._storage.getItem(this._profilesKey());
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === "string");
      } catch {
      }
      return ["default"];
    }
    _writeProfiles(list) {
      try {
        this._storage.setItem(this._profilesKey(), JSON.stringify([...new Set(list)]));
      } catch (err) {
        this._notify(`could not update profile list: ${err.message}`, "error");
      }
    }
    createProfile(name) {
      const clean = String(name ?? "").trim();
      if (!clean) return false;
      if (!/^[A-Za-z0-9 _-]{1,32}$/.test(clean)) {
        this._notify("profile names may only contain letters, numbers, spaces, - and _", "warn");
        return false;
      }
      const list = this.listProfiles();
      if (list.includes(clean)) return false;
      list.push(clean);
      this._writeProfiles(list);
      return true;
    }
    deleteProfile(name) {
      if (name === "default") return false;
      const list = this.listProfiles().filter((p) => p !== name);
      this._writeProfiles(list);
      try {
        this._storage.removeItem(this._key(name, "config"));
      } catch {
      }
      if (this._activeProfile === name) this.switchProfile("default");
      return true;
    }
    switchProfile(name, { saveCurrent = true } = {}) {
      if (saveCurrent && !this.listProfiles().includes(name)) this.createProfile(name);
      if (saveCurrent) this.save(true);
      this.modules.disableAll({ silent: true });
      this._activeProfile = name;
      const diag = this.load();
      this._notify(`switched to profile '${name}'`, "info");
      return diag;
    }
    // -- export / import ------------------------------------------------------
    /** Base64 of the JSON payload, safe to paste into chat/discord. */
    exportProfile({ base64 = true } = {}) {
      const json = JSON.stringify(this.serialiseAll());
      if (!base64) return json;
      return base64Encode(json);
    }
    /** @returns {{ok:boolean, errors:string[]}} */
    importProfile(text, { base64 = true } = {}) {
      if (typeof text !== "string" || !text.trim()) return { ok: false, errors: ["empty input"] };
      let json = text.trim();
      if (base64) {
        try {
          json = base64Decode(json);
        } catch {
        }
      }
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (err) {
        return { ok: false, errors: [`not valid config data (${err.message})`] };
      }
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.modules)) {
        return { ok: false, errors: ["config data has no module list"] };
      }
      this.modules.disableAll({ silent: true });
      for (const m of this.modules.all()) m.settings.reset();
      const diag = this.deserialiseAll(parsed);
      this.save(true);
      this._notify(`imported profile (${diag.loadedSettings} settings)`, "info");
      return { ok: true, errors: diag.errors };
    }
    /** Diagnostics panel payload for the Config category. */
    diagnostics() {
      return {
        profile: this._activeProfile,
        profiles: this.listProfiles(),
        storage: this._storage.constructor?.name ?? "unknown",
        dirty: this._dirty,
        lastLoad: this.lastLoadDiagnostics,
        moduleErrors: this.modules.errors().length
      };
    }
  };
  function base64Encode(str) {
    const bytes = new TextEncoder().encode(str);
    if (typeof btoa === "function") {
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    }
    return Buffer.from(bytes).toString("base64");
  }
  function base64Decode(b64) {
    if (typeof atob === "function") {
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(b64, "base64").toString("utf-8");
  }

  // src/core/stats.js
  var Stats = class {
    constructor({ windowSize = 120 } = {}) {
      this.windowSize = windowSize;
      this._frameTimes = new Float64Array(windowSize);
      this._frameIndex = 0;
      this._frameCount = 0;
      this._lastFrameAt = 0;
      this.fps = 0;
      this.frameTimeMs = 0;
      this.worstFrameMs = 0;
      this.moduleTickMs = 0;
      this.moduleRenderMs = 0;
      this._moduleTickAccum = 0;
      this._moduleRenderAccum = 0;
      this._samples = 0;
      this.startTime = Date.now();
    }
    /** Call once per animation frame. */
    frame(now = performance.now()) {
      if (this._lastFrameAt) {
        const dt = now - this._lastFrameAt;
        this._frameTimes[this._frameIndex] = dt;
        this._frameIndex = (this._frameIndex + 1) % this.windowSize;
        if (this._frameCount < this.windowSize) this._frameCount++;
        this.frameTimeMs = dt;
        if (dt > this.worstFrameMs) this.worstFrameMs = dt;
        let sum = 0;
        for (let i = 0; i < this._frameCount; i++) sum += this._frameTimes[i];
        const mean = sum / this._frameCount;
        this.fps = mean > 0 ? 1e3 / mean : 0;
      }
      this._lastFrameAt = now;
    }
    /** Measure a module tick pass. */
    measureTick(ms) {
      this._moduleTickAccum += ms;
      this._samples++;
      this.moduleTickMs = this._moduleTickAccum / Math.max(1, this._samples);
    }
    measureRender(ms) {
      this._moduleRenderAccum += ms;
      this.moduleRenderMs = this.moduleRenderMs * 0.9 + ms * 0.1;
    }
    /** @returns {number} seconds since client start */
    upSeconds() {
      return (Date.now() - this.startTime) / 1e3;
    }
    /** Memory info when the browser exposes it; -1 otherwise. */
    memoryUsedMB() {
      const m = globalThis.performance?.memory;
      if (!m || typeof m.usedJSHeapSize !== "number") return -1;
      return m.usedJSHeapSize / (1024 * 1024);
    }
    memoryLimitMB() {
      const m = globalThis.performance?.memory;
      if (!m || typeof m.jsHeapSizeLimit !== "number") return -1;
      return m.jsHeapSizeLimit / (1024 * 1024);
    }
    /** Reset the worst-frame watermark (the monitor calls this per second). */
    resetWorst() {
      this.worstFrameMs = 0;
    }
    snapshot() {
      return {
        fps: this.fps,
        frameTimeMs: this.frameTimeMs,
        worstFrameMs: this.worstFrameMs,
        moduleTickMs: this.moduleTickMs,
        moduleRenderMs: this.moduleRenderMs,
        memoryUsedMB: this.memoryUsedMB(),
        memoryLimitMB: this.memoryLimitMB(),
        upSeconds: this.upSeconds()
      };
    }
  };
  var Ticker = class {
    constructor({ hz = 20, onTick, onFrame } = {}) {
      this.hz = hz;
      this.intervalMs = 1e3 / hz;
      this.onTick = onTick;
      this.onFrame = onFrame;
      this._raf = null;
      this._lastTick = 0;
      this._running = false;
      this._rafFn = null;
    }
    start() {
      if (this._running) return;
      this._running = true;
      this._lastTick = performance.now();
      const loop = (now) => {
        if (!this._running) return;
        this.onFrame?.(now);
        const elapsed = now - this._lastTick;
        if (elapsed >= this.intervalMs) {
          const ticks = Math.min(5, Math.floor(elapsed / this.intervalMs));
          this._lastTick += ticks * this.intervalMs;
          try {
            this.onTick?.(ticks);
          } catch (err) {
            console.error("[meteor] ticker callback threw", err);
          }
        }
        this._raf = requestAnimationFrame(loop);
      };
      this._rafFn = loop;
      this._raf = requestAnimationFrame(loop);
    }
    stop() {
      this._running = false;
      if (this._raf !== null && this._raf !== void 0) cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    get running() {
      return this._running;
    }
  };

  // src/core/adapter.js
  var CAPABILITIES = Object.freeze([
    "world",
    "entities",
    "blocks",
    "inventory",
    "movement",
    "flight",
    "render",
    "hud",
    "input",
    "network",
    "chat",
    "timing"
  ]);
  var GameAdapter = class {
    constructor() {
      this.capabilities = /* @__PURE__ */ new Set();
      this.runtimeName = "unknown";
    }
    hasCapability(name) {
      return this.capabilities.has(name);
    }
    /** @returns {boolean} true when a playable world is loaded */
    inWorld() {
      return false;
    }
    /** Called by the host on every client tick. */
    update() {
    }
    // -- accessors (return null/[] when unavailable, never throw) -------------
    getPlayer() {
      return null;
    }
    getWorld() {
      return null;
    }
    getEntities() {
      return [];
    }
    getCrosshairTargetEntity() {
      return null;
    }
    getCrosshairTargetBlock() {
      return null;
    }
    getInventory() {
      return null;
    }
    getSelectedSlot() {
      return -1;
    }
    getFps() {
      return 0;
    }
    getFrameTimeMs() {
      return 0;
    }
    getPing() {
      return -1;
    }
    getSessionSeconds() {
      return 0;
    }
    getCanvas() {
      return null;
    }
    // -- actions (no-ops unless the capability exists) ------------------------
    attack(_entity) {
      return false;
    }
    useItem(_hand) {
      return false;
    }
    selectSlot(_index) {
      return false;
    }
    setSprinting(_on) {
      return false;
    }
    setSneaking(_on) {
      return false;
    }
    setFlying(_on) {
      return false;
    }
    setStepHeight(_blocks) {
      return false;
    }
    setJumpHeight(_blocks) {
      return false;
    }
    setSafeWalk(_on) {
      return false;
    }
    setNoFall(_on) {
      return false;
    }
    setClimbSpeed(_multiplier) {
      return false;
    }
    setForward(_on) {
      return false;
    }
    jump() {
      return false;
    }
    isOnGround() {
      return false;
    }
    getPlayerVelocity() {
      return null;
    }
    setPlayerVelocity(_vx, _vy, _vz) {
      return false;
    }
    getBrightness() {
      return null;
    }
    getFov() {
      return null;
    }
    setHurtCam(_on) {
      return false;
    }
    /** @returns {Array<{x:number,y:number,z:number}>|null} */
    findBlocks(_names, _radius) {
      return null;
    }
    setFov(_degrees) {
      return false;
    }
    setBrightness(_value) {
      return false;
    }
    sendChat(_message) {
      return false;
    }
    /** Local tick-rate multiplier for the Timer module. Returns applied value. */
    setTickRate(_multiplier) {
      return false;
    }
    /** Release/acquire pointer lock through the game's own mechanism. */
    setPointerLock(_locked) {
      return false;
    }
  };
  var NullAdapter = class extends GameAdapter {
    constructor(reason = "no game runtime bound") {
      super();
      this.runtimeName = "null";
      this.reason = reason;
    }
  };
  var MockAdapter = class extends GameAdapter {
    constructor() {
      super();
      this.runtimeName = "mock";
      this.capabilities = new Set(CAPABILITIES);
      this._inWorld = false;
      this.player = { x: 0, y: 64, z: 0, yaw: 0, pitch: 0, health: 20, maxHealth: 20, hunger: 20, name: "TestPlayer" };
      this.world = { time: 6e3, dimension: "overworld", biome: "plains" };
      this.entities = [];
      this.calls = [];
      this.actionLog = [];
      this._fps = 60;
    }
    inWorld() {
      return this._inWorld;
    }
    setWorldLoaded(v) {
      this._inWorld = v;
    }
    getPlayer() {
      return this._inWorld ? this.player : null;
    }
    getWorld() {
      return this._inWorld ? this.world : null;
    }
    getEntities() {
      return this._inWorld ? this.entities : [];
    }
    getFps() {
      return this._fps;
    }
    setCanvas(c) {
      this._canvas = c;
    }
    getCanvas() {
      return this._canvas ?? null;
    }
    getInventory() {
      return { hotbar: [], armor: [] };
    }
    getPing() {
      return 20;
    }
    getSessionSeconds() {
      return 0;
    }
    isRemote() {
      return !!this._remote;
    }
    setRemote(v) {
      this._remote = !!v;
    }
    isOnGround() {
      return true;
    }
    _log(action, extra = {}) {
      this.actionLog.push({ action, ...extra });
      return true;
    }
    attack(e) {
      return this._log("attack", { target: e?.name ?? null });
    }
    useItem() {
      return this._log("use-item");
    }
    selectSlot(i) {
      this._selectedSlot = i;
      return this._log("select-slot", { slot: i });
    }
    getSelectedSlot() {
      return this._selectedSlot ?? 0;
    }
    setSprinting(on) {
      this.player.sprinting = on;
      return this._log("sprint", { value: on });
    }
    setSneaking(on) {
      return this._log("sneak", { value: on });
    }
    setFlying(on) {
      this.player.flying = on;
      return this._log("flying", { value: on });
    }
    setStepHeight(v) {
      this.stepHeight = v;
      return this._log("step-height", { value: v });
    }
    getStepHeight() {
      return this.stepHeight ?? 0.6;
    }
    setJumpHeight(v) {
      this.jumpHeight = v;
      return this._log("jump-height", { value: v });
    }
    getJumpHeight() {
      return this.jumpHeight ?? 1;
    }
    setSafeWalk(on) {
      return this._log("safe-walk", { value: on });
    }
    setNoFall(on) {
      return this._log("no-fall", { value: on });
    }
    setForward(on) {
      return this._log("forward", { value: on });
    }
    jump() {
      return this._log("jump");
    }
    getPlayerVelocity() {
      return { x: 0.1, y: 0, z: 0.1 };
    }
    setPlayerVelocity(vx, vy, vz) {
      this.velocity = { vx, vy, vz };
      return this._log("velocity", { vx, vy, vz });
    }
    getFov() {
      return this.fov ?? 70;
    }
    setFov(v) {
      this.fov = v;
      return this._log("fov", { value: v });
    }
    getBrightness() {
      return this.brightness ?? 0;
    }
    setBrightness(v) {
      this.brightness = v;
      return this._log("brightness", { value: v });
    }
    setHurtCam(on) {
      return this._log("hurt-cam", { value: on });
    }
    setTickRate(v) {
      this.tickRate = v;
      return this._log("tick-rate", { value: v });
    }
    sendChat(msg) {
      return this._log("chat", { message: msg });
    }
    findBlocks(names, radius) {
      return names.map((name, i) => ({ name, x: i + 1, y: 64, z: i + 1, radius }));
    }
    getWorldKey() {
      return this.worldKey ?? "mock-world";
    }
    setPointerLock(v) {
      this.pointerLock = v;
      return true;
    }
    setRotation(yaw, pitch) {
      this.player.yaw = yaw;
      this.player.pitch = pitch;
      return this._log("rotation", { yaw, pitch });
    }
    worldToScreen(x, y, z) {
      return { x: 400 + x * 10, y: 300 - y * 10, visible: z >= 0, behind: z < 0 };
    }
    getViewport() {
      return { width: 800, height: 600 };
    }
  };

  // src/gui/theme.js
  var DEFAULT_THEME = {
    // Meteor-ish dark palette.
    bg: "#15161a",
    panel: "#1c1e23",
    panelAlt: "#23262d",
    header: "#26292f",
    border: "#33373f",
    text: "#e6e7ea",
    textDim: "#9aa0a6",
    textMuted: "#6b7280",
    accent: "#4f8ef7",
    accentText: "#ffffff",
    enabled: "#4f8ef7",
    disabled: "#3a3d45",
    danger: "#d64545",
    warn: "#e0a458",
    ok: "#5bbf7a",
    radius: 6,
    rowHeight: 18,
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    scale: 1,
    backgroundOpacity: 0.96,
    animations: true
  };
  var Theme = class {
    constructor(initial = {}) {
      this.values = { ...DEFAULT_THEME, ...initial };
      this._listeners = /* @__PURE__ */ new Set();
    }
    get(key) {
      return this.values[key];
    }
    set(key, value) {
      if (this.values[key] === value) return;
      this.values[key] = value;
      this._applyCssVars();
      for (const fn of this._listeners) fn(this);
    }
    get accent() {
      return this.values.accent;
    }
    set accent(v) {
      this.set("accent", v);
    }
    get scale() {
      return this.values.scale;
    }
    set scale(v) {
      this.set("scale", clampScale(v));
    }
    onChange(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    }
    /** Push the theme into CSS custom properties on the given root element. */
    _applyCssVars(root = globalThis.document?.documentElement) {
      if (!root || !root.style) return;
      const v = this.values;
      const map = {
        "--mt-bg": v.bg,
        "--mt-panel": v.panel,
        "--mt-panel-alt": v.panelAlt,
        "--mt-header": v.header,
        "--mt-border": v.border,
        "--mt-text": v.text,
        "--mt-text-dim": v.textDim,
        "--mt-text-muted": v.textMuted,
        "--mt-accent": v.accent,
        "--mt-accent-text": v.accentText,
        "--mt-disabled": v.disabled,
        "--mt-danger": v.danger,
        "--mt-warn": v.warn,
        "--mt-ok": v.ok,
        "--mt-radius": `${v.radius}px`,
        "--mt-font": v.fontFamily,
        "--mt-font-size": `${v.fontSize}px`,
        "--mt-scale": String(v.scale)
      };
      for (const [k, val] of Object.entries(map)) root.style.setProperty(k, val);
    }
    serialise() {
      return { ...this.values };
    }
    load(data) {
      if (!data || typeof data !== "object") return false;
      let changed = false;
      for (const [k, raw] of Object.entries(data)) {
        if (!(k in DEFAULT_THEME)) continue;
        const expected = typeof DEFAULT_THEME[k];
        if (typeof raw !== expected) continue;
        const value = k === "scale" ? clampScale(raw) : raw;
        if (this.values[k] !== value) {
          this.values[k] = value;
          changed = true;
        }
      }
      if (changed) this._applyCssVars();
      return changed;
    }
    reset() {
      this.values = { ...DEFAULT_THEME };
      this._applyCssVars();
    }
  };
  function clampScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(0.5, Math.min(2.5, n));
  }
  function ensureStyles(doc = globalThis.document) {
    if (!doc || doc.getElementById("meteor-gui-styles")) return;
    const style = doc.createElement("style");
    style.id = "meteor-gui-styles";
    style.textContent = CSS_TEXT;
    doc.head.appendChild(style);
  }
  var CSS_TEXT = `
.mt-root, .mt-root * { box-sizing: border-box; }
.mt-root {
  position: fixed; inset: 0; display: none; z-index: 2147483000;
  font-family: var(--mt-font); font-size: var(--mt-font-size); color: var(--mt-text);
  user-select: none; -webkit-user-select: none;
  pointer-events: none;
}
.mt-root.mt-open { display: block; }
.mt-root.mt-open .mt-window { pointer-events: auto; }
.mt-backdrop { position: absolute; inset: 0; background: transparent; }
.mt-window {
  position: absolute; background: var(--mt-panel); border: 1px solid var(--mt-border);
  border-radius: var(--mt-radius); overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.5);
  display: flex; flex-direction: column;
}
.mt-window.mt-dragging { opacity: .92; }
.mt-header {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  background: var(--mt-header); cursor: grab; border-bottom: 1px solid var(--mt-border);
  font-weight: 600; letter-spacing: .3px;
}
.mt-header:active { cursor: grabbing; }
.mt-header .mt-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.mt-header .mt-title { flex: 1; }
.mt-header .mt-count { color: var(--mt-text-muted); font-weight: 400; }
.mt-header .mt-collapse { cursor: pointer; color: var(--mt-text-dim); padding: 0 2px; }
.mt-body { overflow-y: auto; overflow-x: hidden; max-height: 60vh; }
.mt-body::-webkit-scrollbar { width: 8px; }
.mt-body::-webkit-scrollbar-thumb { background: var(--mt-border); border-radius: 4px; }
.mt-module { border-bottom: 1px solid rgba(255,255,255,.03); }
.mt-row {
  display: flex; align-items: center; gap: 6px; padding: 3px 8px; cursor: pointer;
  min-height: var(--mt-row-height, 18px);
}
.mt-row:hover { background: var(--mt-panel-alt); }
.mt-row .mt-name { flex: 1; }
.mt-row.mt-on .mt-name { color: var(--mt-accent); font-weight: 600; }
.mt-row.mt-unsupported { opacity: .45; cursor: not-allowed; }
.mt-row .mt-bind { color: var(--mt-text-muted); font-size: .92em; }
.mt-row .mt-fav { color: var(--mt-warn); }
.mt-expand { padding: 4px 8px 8px; background: rgba(0,0,0,.18); }
.mt-group-title {
  color: var(--mt-text-dim); text-transform: uppercase; font-size: .85em; letter-spacing: .6px;
  margin: 6px 0 3px; cursor: pointer;
}
.mt-setting { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.mt-setting > label { flex: 1; color: var(--mt-text-dim); }
.mt-setting input[type="text"], .mt-setting select {
  background: var(--mt-bg); color: var(--mt-text); border: 1px solid var(--mt-border);
  border-radius: 4px; padding: 2px 4px; font: inherit; max-width: 130px;
}
.mt-setting input[type="range"] { flex: 1; max-width: 120px; accent-color: var(--mt-accent); }
.mt-num { color: var(--mt-text); min-width: 40px; text-align: right; }
.mt-check { width: 13px; height: 13px; border-radius: 3px; border: 1px solid var(--mt-border); display: inline-block; }
.mt-check.mt-checked { background: var(--mt-accent); border-color: var(--mt-accent); }
.mt-swatch { width: 34px; height: 14px; border-radius: 3px; border: 1px solid var(--mt-border); cursor: pointer; }
.mt-bindbtn {
  background: var(--mt-bg); border: 1px solid var(--mt-border); color: var(--mt-text);
  border-radius: 4px; padding: 1px 6px; font: inherit; cursor: pointer; min-width: 70px;
}
.mt-bindbtn.mt-capturing { border-color: var(--mt-accent); color: var(--mt-accent); }
.mt-search {
  width: 100%; background: var(--mt-bg); color: var(--mt-text); border: 1px solid var(--mt-border);
  border-radius: 4px; padding: 5px 7px; font: inherit;
}
.mt-btn {
  background: var(--mt-panel-alt); border: 1px solid var(--mt-border); color: var(--mt-text);
  border-radius: 4px; padding: 3px 8px; font: inherit; cursor: pointer;
}
.mt-btn:hover { border-color: var(--mt-accent); }
.mt-btn.mt-primary { background: var(--mt-accent); color: var(--mt-accent-text); border-color: var(--mt-accent); }
.mt-tooltip {
  position: fixed; z-index: 2147483100; max-width: 280px; padding: 6px 8px;
  background: rgba(10,11,13,.97); border: 1px solid var(--mt-border); border-radius: 4px;
  color: var(--mt-text-dim); pointer-events: none; line-height: 1.35;
}
.mt-tooltip .mt-tt-title { color: var(--mt-text); font-weight: 600; margin-bottom: 2px; }
.mt-hud-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147482000; display: none; }
.mt-hud-root.mt-hud-on { display: block; }
.mt-hud-el { position: absolute; }
.mt-hud-editor .mt-hud-el { pointer-events: auto; outline: 1px dashed rgba(255,255,255,.35); cursor: move; }
.mt-hud-editor .mt-hud-el:hover { outline-color: var(--mt-accent); }
.mt-toast-wrap { position: fixed; right: 8px; bottom: 8px; z-index: 2147483200; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }
.mt-toast { background: rgba(10,11,13,.94); border-left: 3px solid var(--mt-accent); border-radius: 4px; padding: 5px 9px; color: var(--mt-text); }
.mt-toast.mt-warn { border-left-color: var(--mt-warn); }
.mt-toast.mt-error { border-left-color: var(--mt-danger); }
.mt-hidden { display: none !important; }
`;
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== void 0 && v !== null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c === null || c === void 0) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  // src/gui/widgets.js
  function createSettingWidget(setting, ctx) {
    if (setting instanceof BoolSetting) return boolWidget(setting, ctx);
    if (setting instanceof IntSetting) return numberWidget(setting, ctx, true);
    if (setting instanceof DoubleSetting) return numberWidget(setting, ctx, false);
    if (setting instanceof StringSetting) return stringWidget(setting, ctx);
    if (setting instanceof EnumSetting) return enumWidget(setting, ctx);
    if (setting instanceof ColorSetting) return colorWidget(setting, ctx);
    if (setting instanceof KeybindSetting) return keybindWidget(setting, ctx);
    return null;
  }
  function observe(setting, ctx, listener) {
    setting.onChanged(listener);
    ctx?.onDispose?.(() => setting.offChanged(listener));
  }
  function row(label, control, setting, ctx) {
    const r = el("div", { class: "mt-setting" }, [el("label", { text: label, title: setting.description || label }), control]);
    attachTooltip(r, setting, ctx);
    return r;
  }
  function attachTooltip(node, setting, ctx) {
    if (!ctx?.tooltips) return;
    node.addEventListener(
      "mouseenter",
      (e) => ctx.tooltips.show(e.currentTarget, {
        title: setting.name,
        body: setting.description || "(no description)"
      })
    );
    node.addEventListener("mouseleave", () => ctx.tooltips.hide());
  }
  function boolWidget(setting, ctx) {
    const box = el("span", { class: `mt-check${setting.value ? " mt-checked" : ""}` });
    const control = el("div", { class: "mt-bool", style: { display: "flex", alignItems: "center" } }, [box]);
    const update = () => {
      box.classList.toggle("mt-checked", !!setting.value);
    };
    observe(setting, ctx, update);
    const toggle = () => {
      setting.set(!setting.value);
      update();
      ctx?.onChange?.(setting);
    };
    control.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    return row(displayName(setting), control, setting, ctx);
  }
  function numberWidget(setting, ctx, isInt) {
    const isSlider = setting.slider && Number.isFinite(setting.min) && Number.isFinite(setting.max);
    const num = el("span", { class: "mt-num", text: formatNumber(setting.value, isInt) });
    const children = [];
    if (isSlider) {
      const input = el("input", {
        type: "range",
        min: String(setting.min),
        max: String(setting.max),
        step: String(isInt ? setting.step ?? 1 : Math.max(1e-3, (setting.max - setting.min) / 1e3)),
        value: String(setting.value)
      });
      input.addEventListener("input", () => {
        setting.set(Number(input.value));
        num.textContent = formatNumber(setting.value, isInt);
        ctx?.onChange?.(setting);
      });
      input.addEventListener("mousedown", (e) => e.stopPropagation());
      input.addEventListener("click", (e) => e.stopPropagation());
      children.push(input);
    } else {
      const input = el("input", { type: "text", value: String(setting.value), style: { maxWidth: "70px" } });
      input.addEventListener("change", () => {
        setting.set(input.value);
        input.value = String(setting.value);
        num.textContent = formatNumber(setting.value, isInt);
        ctx?.onChange?.(setting);
      });
      children.push(input);
    }
    children.push(num);
    const control = el("div", { style: { display: "flex", alignItems: "center", gap: "6px", flex: 1 } }, children);
    observe(setting, ctx, (v) => {
      num.textContent = formatNumber(v, isInt);
      const input = control.querySelector("input");
      if (input && input.type === "range" && Number(input.value) !== v) input.value = String(v);
      if (input && input.type === "text") input.value = String(v);
    });
    return row(displayName(setting), control, setting, ctx);
  }
  function stringWidget(setting, ctx) {
    const input = el("input", {
      type: "text",
      value: setting.value ?? "",
      placeholder: setting.placeholder ?? "",
      style: { flex: "1" }
    });
    input.addEventListener("input", () => {
      setting.set(input.value);
      ctx?.onChange?.(setting);
    });
    input.addEventListener("keydown", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    observe(setting, ctx, (v) => {
      if (input !== document.activeElement) input.value = v ?? "";
    });
    return row(displayName(setting), input, setting, ctx);
  }
  function enumWidget(setting, ctx) {
    const select = el("select", { style: { maxWidth: "130px" } });
    for (const opt of setting.options) {
      const o = el("option", { value: opt, text: opt });
      if (opt === setting.value) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener("change", () => {
      setting.set(select.value);
      ctx?.onChange?.(setting);
    });
    select.addEventListener("mousedown", (e) => e.stopPropagation());
    select.addEventListener("click", (e) => e.stopPropagation());
    observe(setting, ctx, (v) => {
      if (select.value !== v) select.value = v;
    });
    return row(displayName(setting), select, setting, ctx);
  }
  function colorWidget(setting, ctx) {
    const swatch = el("span", { class: "mt-swatch" });
    const paint = () => {
      swatch.style.background = setting.toHex(true);
    };
    paint();
    observe(setting, ctx, paint);
    swatch.addEventListener("click", (e) => {
      e.stopPropagation();
      openColorEditor(swatch, setting, ctx, paint);
    });
    const holder = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } }, [swatch]);
    if (setting.rainbowDefault !== void 0) {
      const rb = el("span", { class: `mt-check${setting.rainbow ? " mt-checked" : ""}`, title: "rainbow" });
      rb.addEventListener("click", (e) => {
        e.stopPropagation();
        setting.rainbow = !setting.rainbow;
        rb.classList.toggle("mt-checked", setting.rainbow);
        ctx?.onChange?.(setting);
      });
      holder.appendChild(el("label", { text: "rainbow", style: { color: "var(--mt-text-muted)" } }));
      holder.appendChild(rb);
    }
    return row(displayName(setting), holder, setting, ctx);
  }
  function openColorEditor(anchor, setting, ctx, repaint) {
    document.querySelectorAll(".mt-color-editor").forEach((n) => n.remove());
    const pop = el("div", {
      class: "mt-color-editor",
      style: {
        position: "fixed",
        background: "var(--mt-panel)",
        border: "1px solid var(--mt-border)",
        borderRadius: "6px",
        padding: "8px",
        zIndex: "2147483300",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }
    });
    const rect = anchor.getBoundingClientRect();
    pop.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;
    pop.style.top = `${rect.bottom + 4}px`;
    const channels = [
      ["r", "R"],
      ["g", "G"],
      ["b", "B"],
      ["a", "A"]
    ];
    const sliders = {};
    for (const [key, label] of channels) {
      const s = el("input", { type: "range", min: "0", max: "255", value: String(setting.value[key]) });
      s.addEventListener("input", () => {
        setting.set({ ...setting.value, [key]: Number(s.value) });
        hex.value = setting.toHex(false);
        repaint();
        ctx?.onChange?.(setting);
      });
      const wrap = el("div", { style: { display: "flex", alignItems: "center", gap: "6px" } }, [
        el("span", { text: label, style: { width: "12px", color: "var(--mt-text-dim)" } }),
        s
      ]);
      sliders[key] = s;
      pop.appendChild(wrap);
    }
    const hex = el("input", { type: "text", value: setting.toHex(false), style: { width: "90px" } });
    hex.addEventListener("change", () => {
      setting.set(hex.value);
      repaint();
      for (const [key] of channels) sliders[key].value = String(setting.value[key]);
      ctx?.onChange?.(setting);
    });
    pop.appendChild(el("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" } }, [el("span", { text: "hex", style: { color: "var(--mt-text-dim)" } }), hex]));
    pop.addEventListener("click", (e) => e.stopPropagation());
    pop.addEventListener("mousedown", (e) => e.stopPropagation());
    document.body.appendChild(pop);
    const close = (ev) => {
      if (pop.contains(ev.target)) return;
      pop.remove();
      document.removeEventListener("mousedown", close, true);
    };
    setTimeout(() => document.addEventListener("mousedown", close, true), 0);
  }
  function keybindWidget(setting, ctx) {
    const btn = el("button", { class: "mt-bindbtn", text: describeKeybind(setting.value) });
    const paint = () => {
      btn.textContent = ctx?.keybinds?.capturing && btn.classList.contains("mt-capturing") ? "press\u2026" : describeKeybind(setting.value);
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!ctx?.keybinds) return;
      btn.classList.add("mt-capturing");
      btn.textContent = "press\u2026";
      ctx.keybinds.capture((kb) => {
        btn.classList.remove("mt-capturing");
        if (kb !== null) setting.set(kb);
        paint();
        ctx?.onChange?.(setting);
      });
    });
    observe(setting, ctx, paint);
    const clear = el("span", { class: "mt-fav", text: "\u2A2F", title: "clear bind", style: { cursor: "pointer", color: "var(--mt-text-muted)" } });
    clear.addEventListener("click", (e) => {
      e.stopPropagation();
      setting.set(null);
      paint();
      ctx?.onChange?.(setting);
    });
    const holder = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } }, [btn, clear]);
    return row(displayName(setting), holder, setting, ctx);
  }
  function createGroupWidget(group, ctx) {
    const wrap = el("div", { class: "mt-group" });
    const title = el("div", { class: "mt-group-title", text: `${group.expanded ? "\u25BE" : "\u25B8"} ${group.name || "settings"}` });
    const body = el("div", {}, []);
    body.style.display = group.expanded ? "block" : "none";
    title.addEventListener("click", (e) => {
      e.stopPropagation();
      group.expanded = !group.expanded;
      title.textContent = `${group.expanded ? "\u25BE" : "\u25B8"} ${group.name || "settings"}`;
      body.style.display = group.expanded ? "block" : "none";
      ctx?.onChange?.(group);
    });
    wrap.appendChild(title);
    for (const s of group.settings) {
      if (!s.isVisible()) continue;
      const w = createSettingWidget(s, ctx);
      if (w) body.appendChild(w);
    }
    wrap.appendChild(body);
    return wrap;
  }
  function displayName(setting) {
    return setting.displayName || setting.name.replace(/[-_]/g, " ");
  }
  function formatNumber(v, isInt) {
    if (isInt) return String(Math.round(v));
    return String(Number(v).toFixed(2));
  }

  // src/gui/clickgui.js
  var ClickGUI = class {
    /**
     * @param {object} deps
     * @param {import('../core/module-manager.js').ModuleManager} deps.modules
     * @param {import('./theme.js').Theme} deps.theme
     * @param {import('../core/keybind-manager.js').KeybindManager} deps.keybinds
     * @param {{show:Function,hide:Function}} deps.tooltips
     * @param {object} [deps.hudEditor] optional to open the HUD editor from Config
     */
    constructor({ modules, theme, keybinds, tooltips, hudEditor, config, notify }) {
      this.modules = modules;
      this.theme = theme;
      this.keybinds = keybinds;
      this.tooltips = tooltips;
      this.hudEditor = hudEditor;
      this.config = config;
      this.notify = notify ?? (() => {
      });
      this.root = null;
      this.windows = /* @__PURE__ */ new Map();
      this.searchQuery = "";
      this._open = false;
      this._layoutLoaded = false;
      this.layout = /* @__PURE__ */ new Map();
      this._dragState = null;
    }
    get open() {
      return this._open;
    }
    // -- lifecycle ------------------------------------------------------------
    mount(parent = document.body) {
      if (this.root) return this.root;
      ensureStyles();
      this.theme._applyCssVars();
      this.root = el("div", { class: "mt-root", id: "meteor-clickgui" }, [el("div", { class: "mt-backdrop" })]);
      this.tooltipEl = el("div", { class: "mt-tooltip mt-hidden" });
      this.toastWrap = el("div", { class: "mt-toast-wrap" });
      parent.appendChild(this.root);
      parent.appendChild(this.tooltipEl);
      parent.appendChild(this.toastWrap);
      this._buildWindows();
      this._installGlobalHandlers();
      this._tileWindows();
      this._applyLayout();
      this._open = false;
      return this.root;
    }
    toggle() {
      return this._open ? this.close() : this.show();
    }
    show() {
      if (!this.root) this.mount();
      this._open = true;
      this.root.classList.add("mt-open");
      this._applyLayout();
      this._open_ = true;
      this.keybinds.guiOpen = true;
      this.modules.game?.setPointerLock?.(false);
      document.exitPointerLock?.();
      this._searchInput?.focus?.();
      return true;
    }
    close() {
      if (!this.root) return false;
      this._open = false;
      this.root.classList.remove("mt-open");
      this.tooltips?.hide?.();
      this.keybinds.guiOpen = false;
      this.keybinds.cancelCapture();
      this._persistLayout();
      this.modules.game?.onGuiClosed?.();
      return false;
    }
    // -- construction ---------------------------------------------------------
    _buildWindows() {
      const cats = this.modules.populatedCategories();
      let x = 12;
      let y = 12;
      for (const cat of cats) {
        const win = this._createCategoryWindow(cat);
        this.windows.set(cat.id, win);
        win.x = x;
        win.y = y;
        y += 34;
        if (y > 260) {
          y = 12;
          x += 190;
        }
      }
      this._createSearchWindow();
      this._createConfigWindow();
    }
    /**
     * First-run layout: flow the windows into columns using their measured sizes
     * so nothing overlaps before the user drags anything. Saved layouts override
     * this in `_applyLayout()`.
     */
    _tileWindows() {
      const GAP = 8;
      const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
      const maxHeight = Math.max(200, viewportHeight * 0.82);
      let x = GAP;
      let y = GAP;
      let columnWidth = 0;
      for (const state of this.windows.values()) {
        const w = state.el.offsetWidth || 150;
        const h = state.el.offsetHeight || 120;
        if (y > GAP && y + h > maxHeight) {
          x += columnWidth + GAP;
          y = GAP;
          columnWidth = 0;
        }
        state.x = x;
        state.y = y;
        y += h + GAP;
        columnWidth = Math.max(columnWidth, w);
      }
    }
    _createCategoryWindow(cat) {
      const header = el("div", { class: "mt-header" });
      const dot = el("span", { class: "mt-cat-dot", style: { background: cat.color } });
      const title = el("span", { class: "mt-title", text: cat.label });
      const count = el("span", { class: "mt-count", text: "0" });
      const collapse = el("span", { class: "mt-collapse", text: "\u25BE" });
      header.append(dot, title, count, collapse);
      const body = el("div", { class: "mt-body" });
      const win = el("div", { class: "mt-window", "data-category": cat.id }, [header, body]);
      const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: body, headerEl: header, countEl: count };
      this._renderCategory(cat, state);
      collapse.addEventListener("click", (e) => {
        e.stopPropagation();
        state.expanded = !state.expanded;
        body.style.display = state.expanded ? "block" : "none";
        collapse.textContent = state.expanded ? "\u25BE" : "\u25B8";
        this._persistLayout();
      });
      header.addEventListener("mousedown", (e) => this._beginDrag(e, state));
      body.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
      win.addEventListener("contextmenu", (e) => e.preventDefault());
      this.root.appendChild(win);
      return state;
    }
    _renderCategory(cat, state) {
      const body = state.bodyEl;
      this._disposeSettings(body);
      body.textContent = "";
      const list = this.modules.byCategory(cat.id);
      state.countEl.textContent = String(list.length);
      const sorted = [...list].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
      for (const mod of sorted) {
        body.appendChild(this._createModuleRow(mod));
      }
    }
    _createModuleRow(mod) {
      const rowEl = el("div", { class: "mt-row" });
      const name = el("span", { class: "mt-name", text: mod.name });
      const fav = el("span", { class: "mt-fav", text: "\u2605", title: "favourite" });
      fav.style.visibility = this.modules.isFavourite(mod) ? "visible" : "hidden";
      const bind = el("span", { class: "mt-bind", text: mod.bind.value ? `[${mod.bindDescription}]` : "" });
      rowEl.append(fav, name, bind);
      const settingsWrap = el("div", { class: "mt-expand mt-hidden" });
      const container = el("div", { class: "mt-module" }, [rowEl, settingsWrap]);
      const refresh = () => {
        rowEl.classList.toggle("mt-on", mod.active);
        rowEl.classList.toggle("mt-unsupported", !mod.canEnable() && !mod.active);
        bind.textContent = mod.bind.value ? `[${mod.bindDescription}]` : "";
        fav.style.visibility = this.modules.isFavourite(mod) ? "visible" : "hidden";
        const reason = mod.ineligibilityReason();
        rowEl.title = reason ? `${mod.description}
\u26A0 ${reason}` : mod.description;
      };
      refresh();
      rowEl.addEventListener(
        "mouseenter",
        (e) => this.tooltips?.show?.(e.currentTarget, {
          title: `${mod.name}  \xB7  ${mod.category}`,
          body: `${mod.description}${mod.unsupported ? `

UNSUPPORTED: ${mod.unsupportedReason}` : ""}${mod.ineligibilityReason() ? `

currently unavailable: ${mod.ineligibilityReason()}` : ""}`
        })
      );
      rowEl.addEventListener("mouseleave", () => this.tooltips?.hide?.());
      rowEl.addEventListener("click", (e) => {
        if (e.target === fav) return;
        e.stopPropagation();
        if (mod.unsupported) {
          this.notify(`${mod.name} is not supported on this runtime`, "warn");
          return;
        }
        mod.toggle();
        refresh();
      });
      rowEl.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          this.modules.toggleFavourite(mod);
          refresh();
        }
      });
      rowEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const showExpand = settingsWrap.classList.toggle("mt-hidden");
        if (!showExpand) settingsWrap.classList.remove("mt-hidden");
        if (settingsWrap.dataset.built !== "1") {
          this._buildSettings(mod, settingsWrap, refresh);
          settingsWrap.dataset.built = "1";
        }
      });
      return container;
    }
    _disposeSettings(root) {
      if (!root) return;
      for (const node of [root, ...root.querySelectorAll("*")]) {
        for (const dispose of node._settingDisposers ?? []) dispose();
        delete node._settingDisposers;
      }
    }
    _buildSettings(mod, wrap, refresh) {
      this._disposeSettings(wrap);
      wrap._settingDisposers = [];
      const ctx = {
        onDispose: (dispose) => wrap._settingDisposers.push(dispose),
        theme: this.theme,
        keybinds: this.keybinds,
        tooltips: this.tooltips,
        onChange: (s) => {
          refresh();
          this.config?.save?.(false);
        }
      };
      wrap.appendChild(createGroupWidget(mod.settings.defaultGroup, ctx));
      for (const group of mod.settings.groups) {
        if (group === mod.settings.defaultGroup) continue;
        if (group.settings.length === 0) continue;
        wrap.appendChild(createGroupWidget(group, ctx));
      }
      for (const line of mod.statusLines()) {
        wrap.appendChild(
          el("div", { class: "mt-setting" }, [
            el("label", { text: line.label }),
            el("span", { text: line.value, style: { color: "var(--mt-warn)" } })
          ])
        );
      }
      const actions = el("div", { style: { display: "flex", gap: "6px", marginTop: "6px" } });
      const resetBtn = el("button", { class: "mt-btn", text: "Reset settings" });
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        mod.settings.reset();
        wrap.textContent = "";
        this._buildSettings(mod, wrap, refresh);
        this.config?.save?.(true);
        refresh();
      });
      actions.appendChild(resetBtn);
      if (mod.unsupported) {
        actions.appendChild(el("span", { text: mod.unsupportedReason, style: { color: "var(--mt-warn)", alignSelf: "center" } }));
      }
      wrap.appendChild(actions);
    }
    _createSearchWindow() {
      const header = el("div", { class: "mt-header" }, [
        el("span", { class: "mt-cat-dot", style: { background: "var(--mt-accent)" } }),
        el("span", { class: "mt-title", text: "Search" }),
        el("span", { class: "mt-count", text: "" })
      ]);
      this._searchInput = el("input", {
        class: "mt-search",
        type: "text",
        placeholder: "search modules (name or description)\u2026",
        "aria-label": "Search modules"
      });
      const results = el("div", { class: "mt-body" });
      const body = el("div", { style: { padding: "6px" } }, [this._searchInput, results]);
      const win = el("div", { class: "mt-window mt-search-win" }, [header, body]);
      const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: results, headerEl: header, isSearch: true };
      header.addEventListener("mousedown", (e) => this._beginDrag(e, state));
      const run = () => {
        const q = this._searchInput.value;
        this.searchQuery = q;
        this._disposeSettings(results);
        results.textContent = "";
        if (!q.trim()) {
          results.appendChild(el("div", { style: { color: "var(--mt-text-muted)", padding: "4px" } }, ["type to filter\u2026"]));
          return;
        }
        const found = this.modules.search(q);
        if (found.length === 0) {
          results.appendChild(el("div", { style: { color: "var(--mt-text-muted)", padding: "4px" } }, ["no matches"]));
          return;
        }
        for (const mod of found) {
          const r = el("div", { class: `mt-row${mod.active ? " mt-on" : ""}` }, [
            el("span", { class: "mt-name", text: `${mod.name}` }),
            el("span", { class: "mt-bind", text: mod.category })
          ]);
          r.addEventListener("click", (e) => {
            e.stopPropagation();
            mod.toggle();
            run();
          });
          results.appendChild(r);
        }
      };
      this._searchInput.addEventListener("input", run);
      this._searchInput.addEventListener("keydown", (e) => e.stopPropagation());
      run();
      this.root.appendChild(win);
      this.searchState = state;
      this.windows.set("__search__", state);
    }
    _createConfigWindow() {
      const header = el("div", { class: "mt-header" }, [
        el("span", { class: "mt-cat-dot", style: { background: "#8d8d8d" } }),
        el("span", { class: "mt-title", text: "Config" }),
        el("span", { class: "mt-count", text: "" })
      ]);
      const body = el("div", { style: { padding: "8px", display: "flex", flexDirection: "column", gap: "6px" } });
      const win = el("div", { class: "mt-window mt-config-win" }, [header, body]);
      const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: body, headerEl: header, isConfig: true };
      header.addEventListener("mousedown", (e) => this._beginDrag(e, state));
      const btn = (label, fn, primary) => {
        const b = el("button", { class: `mt-btn${primary ? " mt-primary" : ""}`, text: label });
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          fn();
        });
        return b;
      };
      body.appendChild(
        el("div", { style: { color: "var(--mt-text-dim)" } }, [`profile: ${this.config?.activeProfile ?? "default"}`])
      );
      body.appendChild(btn("Save configuration", () => this.config?.save(true), true));
      body.appendChild(btn("Reset everything", () => this.config?.resetAll?.()));
      body.appendChild(btn("Export (copy)", () => this._exportToClipboard()));
      const importField = el("textarea", {
        class: "mt-search",
        rows: "2",
        placeholder: "paste exported config here to import"
      });
      importField.addEventListener("keydown", (e) => e.stopPropagation());
      body.appendChild(importField);
      body.appendChild(
        btn("Import from box", () => {
          const res = this.config?.importProfile?.(importField.value);
          this.notify(res?.ok ? "imported" : `import failed: ${res?.errors?.join(", ")}`, res?.ok ? "info" : "error");
          if (res?.ok) {
            this.refreshAll();
            importField.value = "";
          }
        })
      );
      if (this.hudEditor) {
        body.appendChild(btn("Edit HUD layout", () => this.hudEditor.setEditing(true)));
      }
      const profiles = this.config?.listProfiles?.() ?? ["default"];
      const select = el("select", {});
      for (const p of profiles) {
        const o = el("option", { value: p, text: p });
        if (p === this.config?.activeProfile) o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener("change", () => {
        this.config?.switchProfile?.(select.value, { saveCurrent: true });
        this.refreshAll();
      });
      body.appendChild(el("div", { style: { color: "var(--mt-text-dim)" } }, ["profile"]));
      body.appendChild(select);
      const nameField = el("input", { type: "text", class: "mt-search", placeholder: "new profile name" });
      nameField.addEventListener("keydown", (e) => e.stopPropagation());
      body.appendChild(nameField);
      body.appendChild(
        btn("Create + switch", () => {
          const name = nameField.value;
          if (this.config?.createProfile?.(name)) {
            this.config.switchProfile(name, { saveCurrent: true });
            this.notify(`created profile '${name}'`, "info");
            this.refreshAll();
          } else {
            this.notify("invalid or duplicate profile name", "warn");
          }
        })
      );
      body.appendChild(
        btn("Delete current profile", () => {
          const cur = this.config?.activeProfile;
          if (cur && cur !== "default" && this.config.deleteProfile(cur)) {
            this.notify(`deleted profile '${cur}'`, "info");
            this.refreshAll();
          } else {
            this.notify("cannot delete the default profile", "warn");
          }
        })
      );
      this.root.appendChild(win);
      this.configState = state;
      this.windows.set("__config__", state);
    }
    _exportToClipboard() {
      const text = this.config?.exportProfile?.() ?? "";
      const done = () => this.notify("config copied to clipboard", "info");
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done, () => this.notify("clipboard unavailable \u2014 see Config window export", "warn"));
      } else {
        this.notify("clipboard unavailable in this browser", "warn");
      }
    }
    // -- layout / drag --------------------------------------------------------
    _installGlobalHandlers() {
      this._onMove = (e) => {
        if (!this._dragState) return;
        const dx = (e.clientX - this._dragState.startX) / this.theme.scale;
        const dy = (e.clientY - this._dragState.startY) / this.theme.scale;
        this._dragState.state.x = Math.max(0, this._dragState.origX + dx);
        this._dragState.state.y = Math.max(0, this._dragState.origY + dy);
        this._positionWindow(this._dragState.state);
      };
      this._onUp = () => {
        if (!this._dragState) return;
        this._dragState.state.el.classList.remove("mt-dragging");
        this._dragState = null;
        this._persistLayout();
      };
      window.addEventListener("mousemove", this._onMove);
      window.addEventListener("mouseup", this._onUp);
      this._onResize = () => this._clampWindows();
      window.addEventListener("resize", this._onResize);
    }
    _beginDrag(e, state) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      state.el.classList.add("mt-dragging");
      state.el.style.zIndex = String(++_zCounter);
      this._dragState = { state, startX: e.clientX, startY: e.clientY, origX: state.x, origY: state.y };
    }
    _positionWindow(state) {
      state.el.style.left = `${state.x}px`;
      state.el.style.top = `${state.y}px`;
      state.el.style.transform = this.theme.scale === 1 ? "" : `scale(${this.theme.scale})`;
      state.el.style.transformOrigin = "top left";
    }
    _applyLayout() {
      this._loadLayoutOnce();
      for (const [id, state] of this.windows) {
        const saved = this.layout.get(id);
        if (saved) {
          state.x = saved.x;
          state.y = saved.y;
          if (state.expanded !== saved.expanded) {
            state.expanded = saved.expanded;
            state.bodyEl.style.display = saved.expanded ? "block" : "none";
            const col = state.headerEl.querySelector(".mt-collapse");
            if (col) col.textContent = saved.expanded ? "\u25BE" : "\u25B8";
          }
        }
        this._positionWindow(state);
      }
      this._clampWindows();
    }
    _clampWindows() {
      const maxX = window.innerWidth / this.theme.scale - 60;
      const maxY = window.innerHeight / this.theme.scale - 30;
      for (const state of this.windows.values()) {
        let changed = false;
        if (state.x > maxX) {
          state.x = Math.max(0, maxX);
          changed = true;
        }
        if (state.y > maxY) {
          state.y = Math.max(0, maxY);
          changed = true;
        }
        if (changed) this._positionWindow(state);
      }
    }
    _loadLayoutOnce() {
      if (this._layoutLoaded) return;
      this._layoutLoaded = true;
    }
    /** Called by the config system with saved layout. */
    loadLayout(map) {
      if (!map || typeof map !== "object") return;
      this.layout = new Map(Object.entries(map));
      for (const [id, state] of this.windows) {
        const saved = this.layout.get(id);
        if (!saved) continue;
        state.x = Number(saved.x) || 0;
        state.y = Number(saved.y) || 0;
        if (typeof saved.expanded === "boolean") state.expanded = saved.expanded;
      }
      this._layoutLoaded = true;
    }
    serialiseLayout() {
      const out = {};
      for (const [id, state] of this.windows) {
        out[id] = { x: Math.round(state.x), y: Math.round(state.y), expanded: state.expanded };
      }
      return out;
    }
    _persistLayout() {
      this.layout = new Map(Object.entries(this.serialiseLayout()));
      this.config?.save?.(false);
    }
    /** Rebuild every window (after an import or profile switch). */
    refreshAll() {
      if (!this.root) return;
      for (const cat of this.modules.populatedCategories()) {
        const state = this.windows.get(cat.id);
        if (state) this._renderCategory(cat, state);
      }
      if (this._searchInput) {
        this._searchInput.value = "";
        this._searchInput.dispatchEvent(new Event("input"));
      }
    }
    dispose() {
      this._disposeSettings(this.root);
      window.removeEventListener("mousemove", this._onMove);
      window.removeEventListener("mouseup", this._onUp);
      window.removeEventListener("resize", this._onResize);
      this.root?.remove();
      this.tooltipEl?.remove();
      this.toastWrap?.remove();
      this.root = null;
    }
  };
  var _zCounter = 100;
  var Tooltips = class {
    constructor(getEl) {
      this.getEl = getEl;
    }
    show(anchor, { title, body } = {}) {
      const node = this.getEl();
      if (!node) return;
      node.textContent = "";
      if (title) node.appendChild(el("div", { class: "mt-tt-title", text: title }));
      if (body) node.appendChild(el("div", { text: body }));
      node.classList.remove("mt-hidden");
      const rect = anchor.getBoundingClientRect();
      const nw = node.offsetWidth || 200;
      let x = rect.right + 8;
      if (x + nw > window.innerWidth) x = Math.max(4, rect.left - nw - 8);
      node.style.left = `${x}px`;
      node.style.top = `${Math.min(rect.top, window.innerHeight - 80)}px`;
    }
    hide() {
      this.getEl()?.classList.add("mt-hidden");
    }
  };
  var Toasts = class {
    constructor(getWrap, max = 5) {
      this.getWrap = getWrap;
      this.max = max;
    }
    push(text, level = "info") {
      const wrap = this.getWrap();
      if (!wrap) return;
      const t = el("div", { class: `mt-toast${level !== "info" ? ` mt-${level}` : ""}`, text });
      wrap.appendChild(t);
      while (wrap.children.length > this.max) wrap.removeChild(wrap.firstChild);
      setTimeout(() => t.remove(), 3200);
    }
  };

  // src/gui/hud.js
  function hudTransform(scale) {
    const s = Number(scale) || 1;
    return s === 1 ? "" : `scale(${s})`;
  }
  var HUDManager = class {
    /**
     * @param {object} deps
     * @param {import('../core/module-manager.js').ModuleManager} deps.modules
     * @param {import('./theme.js').Theme} deps.theme
     */
    constructor({ modules, theme, game }) {
      this.modules = modules;
      this.theme = theme;
      this.game = game;
      this.root = null;
      this.nodes = /* @__PURE__ */ new Map();
      this.editing = false;
      this._drag = null;
      this._raf = null;
      this._lastRefresh = 0;
      this._refreshIntervalMs = 100;
      this._snapDistance = 6;
    }
    /** Whether elements should be drawn into the game canvas instead of DOM. */
    get useCanvas() {
      return !!(this.game?.hasCapability("hud") && this.game?.getCanvas?.());
    }
    mount(parent = document.body) {
      if (this.root) return this.root;
      ensureStyles();
      this.root = el("div", { class: "mt-hud-root mt-hud-on" });
      parent.appendChild(this.root);
      this._installHandlers();
      return this.root;
    }
    setVisible(v) {
      if (!this.root) this.mount();
      this.root.classList.toggle("mt-hud-on", !!v);
    }
    setEditing(on) {
      if (!this.root) this.mount();
      this.editing = !!on;
      this.root.classList.toggle("mt-hud-editor", this.editing);
      if (this.editing) this.setVisible(true);
      this.modules.notify?.(this.editing ? "HUD editor on \u2014 drag elements, Esc/Right Shift when done" : "HUD editor off", "info");
    }
    toggleEditing() {
      this.setEditing(!this.editing);
    }
    register(module) {
      this.nodes.set(module.id, null);
      return module;
    }
    /** Rebuild nodes for all active HUD modules. Cheap; called on toggle. */
    sync() {
      if (!this.root) return;
      const activeHud = this.modules.active().filter((m) => typeof m.hudRender === "function");
      const wanted = new Set(activeHud.map((m) => m.id));
      for (const [id, node] of this.nodes) {
        if (node && !wanted.has(id)) {
          node.remove();
          this.nodes.set(id, null);
        }
      }
      for (const m of activeHud) {
        let node = this.nodes.get(m.id);
        if (!node) {
          node = el("div", { class: "mt-hud-el", "data-module": m.id });
          this._applyVisuals(node, m);
          this.root.appendChild(node);
          this._attachDrag(node, m);
          this.nodes.set(m.id, node);
        }
        this._applyVisuals(node, m);
      }
      this.refresh(true);
    }
    _applyVisuals(node, m) {
      const x = m.settings.get("hud-x")?.value ?? 4;
      const y = m.settings.get("hud-y")?.value ?? 4;
      const scale = m.settings.get("hud-scale")?.value ?? 1;
      const opacity = m.settings.get("hud-opacity")?.value ?? 1;
      const color = m.settings.get("hud-color");
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.transform = hudTransform(scale);
      node.style.transformOrigin = "top left";
      node.style.opacity = String(opacity);
      node.style.color = color ? color.toHex(false) : "var(--mt-text)";
      node.style.textShadow = "1px 1px 0 rgba(0,0,0,.85)";
      node.style.whiteSpace = "pre";
      node.style.lineHeight = "1.25";
    }
    _attachDrag(node, m) {
      node.addEventListener("mousedown", (e) => {
        if (!this.editing || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const xs = m.settings.get("hud-x");
        const ys = m.settings.get("hud-y");
        this._drag = {
          m,
          node,
          startX: e.clientX,
          startY: e.clientY,
          origX: xs.value,
          origY: ys.value,
          xs,
          ys
        };
        node.style.zIndex = "999";
      });
    }
    _installHandlers() {
      this._onMove = (e) => {
        if (!this._drag) return;
        const { m, node, startX, startY, origX, origY, xs, ys } = this._drag;
        const scale = m.settings.get("hud-scale")?.value ?? 1;
        let nx = Math.max(0, origX + (e.clientX - startX) / scale);
        let ny = Math.max(0, origY + (e.clientY - startY) / scale);
        const rect = node.getBoundingClientRect();
        const w = rect.width / scale;
        const h = rect.height / scale;
        if (Math.abs(nx) < this._snapDistance) nx = 0;
        if (Math.abs(window.innerWidth - (nx + w)) < this._snapDistance) nx = window.innerWidth - w;
        if (Math.abs(ny) < this._snapDistance) ny = 0;
        if (Math.abs(window.innerHeight - (ny + h)) < this._snapDistance) ny = window.innerHeight - h;
        xs.set(Math.round(nx));
        ys.set(Math.round(ny));
        node.style.left = `${Math.round(nx)}px`;
        node.style.top = `${Math.round(ny)}px`;
      };
      this._onUp = () => {
        if (!this._drag) return;
        this._drag.node.style.zIndex = "";
        this._drag = null;
        this.modules.notify?.("HUD layout saved", "info");
      };
      window.addEventListener("mousemove", this._onMove);
      window.addEventListener("mouseup", this._onUp);
    }
    /**
     * Refresh text content. Rate-limited: HUD text does not need a per-frame
     * update, and calling into the game adapter 60x/s for every element is the
     * classic way to lose frames.
     */
    refresh(force = false) {
      const now = performance.now();
      if (!force && now - this._lastRefresh < this._refreshIntervalMs) return;
      this._lastRefresh = now;
      if (!this.root) return;
      for (const m of this.modules.active()) {
        if (typeof m.hudRender !== "function") continue;
        const node = this.nodes.get(m.id);
        if (!node) continue;
        try {
          const text = m.hudRender(this.game);
          if (text !== node.__lastText) {
            node.textContent = text;
            node.__lastText = text;
          }
        } catch (err) {
          this.modules.reportError(m, err);
          node.textContent = `${m.name}: error`;
        }
      }
    }
    /** Reset all HUD element positions to their defaults. */
    resetLayout() {
      for (const m of this.modules.all()) {
        if (m.category !== "HUD") continue;
        m.settings.get("hud-x")?.reset();
        m.settings.get("hud-y")?.reset();
      }
      this.sync();
    }
    /** Snapshot layout for config export. */
    serialise() {
      const out = {};
      for (const m of this.modules.all()) {
        if (m.category !== "HUD") continue;
        out[m.id] = {
          x: m.settings.get("hud-x")?.value,
          y: m.settings.get("hud-y")?.value,
          scale: m.settings.get("hud-scale")?.value,
          opacity: m.settings.get("hud-opacity")?.value,
          visible: m.active
        };
      }
      return out;
    }
    load(data) {
      if (!data || typeof data !== "object") return false;
      for (const [id, v] of Object.entries(data)) {
        const m = this.modules.get(id);
        if (!m || m.category !== "HUD" || !v) continue;
        m.settings.get("hud-x")?.set(v.x ?? 4);
        m.settings.get("hud-y")?.set(v.y ?? 4);
        if (typeof v.scale === "number") m.settings.get("hud-scale")?.set(v.scale);
        if (typeof v.opacity === "number") m.settings.get("hud-opacity")?.set(v.opacity);
      }
      this.sync();
      return true;
    }
    serialiseVisibility() {
      return this.modules.all().filter((m) => m.category === "HUD").map((m) => ({ id: m.id, visible: m.active }));
    }
    restoreVisibility(list) {
      if (!Array.isArray(list)) return;
      for (const entry of list) {
        const m = this.modules.get(entry?.id);
        if (!m || m.category !== "HUD") continue;
        if (entry.visible) m.enable();
        else m.disable();
      }
    }
    dispose() {
      window.removeEventListener("mousemove", this._onMove);
      window.removeEventListener("mouseup", this._onUp);
      this.root?.remove();
      this.root = null;
      this.nodes.clear();
    }
  };

  // src/core/module.js
  var moduleCounter = 0;
  var Module = class {
    /**
     * @param {object} def
     * @param {string} def.id            stable identifier, also the config key
     * @param {string} def.name          display name
     * @param {string} def.description
     * @param {string} def.category
     * @param {string[]} [def.requiredCapabilities] GameAdapter capability keys
     * @param {boolean} [def.runsInMenus] whether the module may run outside a world
     * @param {boolean} [def.localTestOnly] block on remote sessions unless the client explicitly opts in
     * @param {boolean} [def.unsupported] explicit "cannot work on this runtime"
     * @param {string} [def.unsupportedReason]
     */
    constructor(def) {
      if (!def || !def.id) throw new Error("Module requires an id");
      this.id = def.id;
      this.name = def.name ?? def.id;
      this.description = def.description ?? "";
      this.category = def.category ?? "Misc";
      this.requiredCapabilities = def.requiredCapabilities ?? [];
      this.runsInMenus = !!def.runsInMenus;
      this.localTestOnly = !!def.localTestOnly;
      this.unsupported = !!def.unsupported;
      this.unsupportedReason = def.unsupportedReason ?? "";
      this.settings = new Settings();
      this.bind = this.settings.keybind("bind", "Keybind that toggles this module", def.defaultBind ?? null);
      this.bind.runsInMenus = true;
      this._manager = null;
      this._active = false;
      this._restoreOnWorld = false;
      this._initialised = false;
      this._subs = new SubscriptionBag();
      this._errorCount = 0;
      this._lastError = null;
      this._uid = moduleCounter++;
    }
    // -- wiring ---------------------------------------------------------------
    /** @internal called by the manager */
    attach(manager) {
      this._manager = manager;
      return this;
    }
    /** @internal run once after construction */
    init() {
      if (this._initialised) return;
      this._initialised = true;
      this.onInit();
    }
    get manager() {
      return this._manager;
    }
    /** Access the active game adapter (may be a NullAdapter with no world). */
    get game() {
      return this._manager?.game ?? null;
    }
    /**
     * Subscribe a game event, tracked for automatic cleanup on disable.
     *
     * The listener is routed through the manager's guard so that a module which
     * throws inside an event handler is disabled (and its error recorded) rather
     * than merely having the exception swallowed by the bus. Without this, a
     * crashing render/event module would stay enabled and keep throwing every
     * frame.
     */
    subscribe(type, listener, opts) {
      const bus = this._manager?.bus;
      if (!bus) return null;
      const guarded = (ev) => {
        if (!this._active) return;
        this._manager.runGuarded(this, `event:${type}`, () => listener(ev));
      };
      return this._subs.track(bus.on(type, guarded, opts));
    }
    // -- state ----------------------------------------------------------------
    get active() {
      return this._active;
    }
    /** Why this module cannot currently be enabled, or null if it can. */
    ineligibilityReason() {
      if (this.unsupported) return this.unsupportedReason || "not supported by this runtime";
      const game = this.game;
      if (!game) return "no game adapter";
      const missing = this.requiredCapabilities.filter((c) => !game.hasCapability(c));
      if (missing.length) return `runtime is missing: ${missing.join(", ")}`;
      if (!this.runsInMenus && !game.inWorld()) return "requires a loaded world";
      if (this.localTestOnly && game.isRemote?.() && !this._manager?.client?.allowMultiplayerCombat) {
        return "blocked on remote sessions; explicitly enable multiplayer combat to override";
      }
      return null;
    }
    canEnable() {
      return this.ineligibilityReason() === null;
    }
    get bindDescription() {
      return describeKeybind(this.bind.value);
    }
    /** @returns {boolean} new active state */
    toggle() {
      return this.setActive(this._restoreOnWorld ? false : !this._active);
    }
    enable() {
      return this.setActive(true);
    }
    disable() {
      return this.setActive(false);
    }
    /**
     * @param {boolean} want
     * @returns {boolean} resulting active state
     */
    setActive(want) {
      want = !!want;
      this._restoreOnWorld = false;
      if (want === this._active) return this._active;
      if (want) {
        const reason = this.ineligibilityReason();
        if (reason) {
          this._manager?.notify(`${this.name}: ${reason}`, "warn");
          return false;
        }
      }
      this._active = want;
      if (want) {
        this._manager?.runGuarded(this, "onEnable", () => this.onEnable());
      } else {
        this._manager?.runGuarded(this, "onDisable", () => this.onDisable());
        this._subs.dispose();
        this._subs = new SubscriptionBag();
      }
      this._manager?.onModuleToggled(this, this._active);
      return this._active;
    }
    /** Called by the manager when the module threw during a callback. */
    _recordError(err) {
      this._errorCount++;
      this._lastError = err;
      this._manager?.reportError(this, err);
    }
    get errorCount() {
      return this._errorCount;
    }
    get lastError() {
      return this._lastError;
    }
    // -- overridable hooks ----------------------------------------------------
    onInit() {
    }
    onEnable() {
    }
    onDisable() {
    }
    /** @param {number} dtDeltaTicks */
    onTick(_dtDeltaTicks) {
    }
    /** @param {CanvasRenderingContext2D} ctx @param {object} frame */
    onRender(_ctx, _frame) {
    }
    /** Extra diagnostic rows surfaced in the GUI. */
    statusLines() {
      const out = [];
      if (this.unsupported) out.push({ label: "status", value: "unsupported" });
      if (this._lastError) out.push({ label: "last error", value: String(this._lastError.message ?? this._lastError) });
      return out;
    }
  };

  // src/modules/combat-modules.js
  var LOCAL_NOTE = "Single-player / authorised testing only.";
  var CombatModule = class extends Module {
    constructor(def) {
      super({ category: "Combat", localTestOnly: true, ...def });
    }
  };
  var KillAura = class extends CombatModule {
    constructor() {
      super({
        id: "kill-aura",
        name: "KillAura",
        description: `Attacks nearby valid targets automatically. ${LOCAL_NOTE}`,
        requiredCapabilities: ["world", "entities", "movement"]
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
    onEnable() {
      this._cooldownTicks = 0;
    }
    onDisable() {
      this._cooldownTicks = 0;
      this.game.cancelAttacks?.();
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
        if (!e || e.isSelf || e.dead || typeof e.health === "number" && e.health <= 0) continue;
        if (e.isPlayer && !this.settings.get("players").value) continue;
        if (!e.isPlayer && e.hostile && !this.settings.get("hostile").value) continue;
        if (!e.isPlayer && !e.hostile && !this.settings.get("passive").value) continue;
        if (this.settings.get("visible-only").value && e.visible === false) continue;
        if (this.manager.client?.isFriend?.(e.name)) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
        if (dist > range) continue;
        out.push({ entity: e, dist, health: e.health ?? 20, angle: Math.abs(angleDelta(Math.atan2(p.x - e.x, e.z - p.z) * 180 / Math.PI, p.yaw ?? 0)) });
      }
      const priority = this.settings.get("priority").value;
      out.sort((a, b) => {
        if (priority === "angle") return a.angle - b.angle;
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
      const dy = entity.y + (entity.height ?? 1.8) * 0.85 - (p.y + 1.5);
      const dz = entity.z - p.z;
      const yaw = Math.atan2(-dx, dz) * 180 / Math.PI;
      const pitch = -Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
      this.game.setRotation?.(yaw, pitch, this.settings.get("rotate-speed").value);
    }
  };
  var AimAssist = class extends CombatModule {
    constructor() {
      super({
        id: "aim-assist",
        name: "Aim Assist",
        description: `Smoothly moves the aim toward a target. ${LOCAL_NOTE}`,
        requiredCapabilities: ["world", "entities", "movement"]
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
      const aura = this.manager.get("kill-aura");
      if (aura?.active && aura.settings.get("rotate").value && aura._targets().length) return;
      if (this.settings.get("only-attacking").value && !this.game.isAttacking?.()) return;
      const p = this.game.getPlayer?.();
      if (!p) return;
      const range = this.settings.get("range").value;
      const fov = this.settings.get("fov").value;
      let best = null;
      for (const e of this.game.getEntities?.() ?? []) {
        if (!e || e.isSelf || e.dead || typeof e.health === "number" && e.health <= 0 || e.visible === false) continue;
        if (this.manager.client?.isFriend?.(e.name)) continue;
        if (e.isPlayer && !this.settings.get("players").value) continue;
        if (!e.isPlayer && !this.settings.get("mobs").value) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
        if (dist > range) continue;
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const targetYaw = Math.atan2(-dx, dz) * 180 / Math.PI;
        const delta = Math.abs(angleDelta(targetYaw, p.yaw ?? 0));
        if (delta > fov / 2) continue;
        if (!best || delta < best.delta) best = { entity: e, delta, targetYaw };
      }
      if (best) {
        this.game.setRotation?.(best.targetYaw, p.pitch ?? 0, this.settings.get("strength").value);
      }
    }
  };
  function angleDelta(a, b) {
    let d = ((a - b) % 360 + 540) % 360 - 180;
    return d;
  }
  var TriggerBot = class extends CombatModule {
    constructor() {
      super({
        id: "trigger-bot",
        name: "TriggerBot",
        description: `Attacks when the crosshair is on a valid target. ${LOCAL_NOTE}`,
        requiredCapabilities: ["world", "entities", "movement"]
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
      if (!target || target.isSelf || target.dead || typeof target.health === "number" && target.health <= 0 || target.visible === false) return;
      if (this.manager.client?.isFriend?.(target.name)) return;
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
  };
  var AutoClicker = class extends CombatModule {
    constructor() {
      super({
        id: "auto-clicker",
        name: "AutoClicker",
        description: `Clicks at a fixed rate. ${LOCAL_NOTE}`,
        requiredCapabilities: ["movement"]
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
  };
  var AutoCrit = class extends CombatModule {
    constructor() {
      super({ id: "auto-crit", name: "Criticals", description: `Jumps before attacking to force critical hits (version-dependent). ${LOCAL_NOTE}`, requiredCapabilities: ["movement"] });
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
      if (this.game.getCrosshairTargetEntity?.() && this.game.isOnGround?.()) {
        this.game.jump?.();
      }
    }
  };
  var ReachDisplay = class extends Module {
    constructor() {
      super({ id: "reach-display", name: "Reach Display", description: "Shows the distance of the last attack.", category: "Combat", runsInMenus: true });
      this._lastReach = 0;
      this._sub = null;
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 300, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 4, { min: 0, max: 4e3 });
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
  };
  var Velocity = class extends CombatModule {
    constructor() {
      super({
        id: "velocity",
        name: "Velocity",
        description: `Reduces knockback. ${LOCAL_NOTE}`,
        requiredCapabilities: ["movement"]
      });
    }
    onInit() {
      const g = this.settings.addGroup("Velocity");
      g.double("horizontal", "Horizontal knockback multiplier", 0, { min: 0, max: 1 });
      g.double("vertical", "Vertical knockback multiplier", 0, { min: 0, max: 1 });
    }
    onEnable() {
      if (typeof this.game.setVelocityMultiplier !== "function") throw new Error("runtime does not expose knockback adjustment");
      this.game.setVelocityMultiplier(this.settings.get("horizontal").value, this.settings.get("vertical").value);
    }
    onDisable() {
      this.game.setVelocityMultiplier?.(1, 1);
    }
  };
  var AutoWeapon = class extends CombatModule {
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
  };
  var AutoArmor = class extends Module {
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
  };
  var TargetHUD = class extends Module {
    constructor() {
      super({ id: "target-hud", name: "Target HUD", description: "Details about the current combat target.", category: "HUD", requiredCapabilities: ["world", "entities", "hud"], runsInMenus: false });
      this._sub = null;
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 300, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 120, { min: 0, max: 4e3 });
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
  };
  var AutoTotem = class extends Module {
    constructor() {
      super({
        id: "auto-totem",
        name: "AutoTotem",
        description: "Offhand totem management. Requires totems and an offhand slot.",
        category: "Combat",
        unsupported: true,
        unsupportedReason: "offhand slot + totem mechanics are not confirmed available in this runtime"
      });
    }
  };
  var Hitboxes = class extends Module {
    constructor() {
      super({
        id: "hitboxes",
        name: "Hitboxes",
        description: "Draws entity hitboxes.",
        category: "Render",
        requiredCapabilities: ["world", "entities", "render"]
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
          [e.x + w, e.y + h, e.z + w]
        ].map(([x, y, z]) => projection?.worldToScreen?.(x, y, z)).filter((s) => s && s.visible);
        if (corners.length < 2) continue;
        const xs = corners.map((s) => s.x);
        const ys = corners.map((s) => s.y);
        ctx.strokeRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      }
      ctx.restore();
    }
  };
  function createCombatModules() {
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
      new Hitboxes()
    ];
  }

  // src/modules/movement-modules.js
  var LOCAL_NOTE2 = "For single-player or authorised test environments only.";
  function requireAdapter(game, method, ...args) {
    if (typeof game?.[method] !== "function" || game[method](...args) === false) {
      throw new Error(`runtime does not support ${method}()`);
    }
  }
  var Sprint = class extends Module {
    constructor() {
      super({ id: "sprint", name: "Sprint", description: "Keeps the player sprinting when moving forward.", category: "Movement", requiredCapabilities: ["movement"] });
      this._original = null;
    }
    onInit() {
      const g = this.settings.addGroup("Sprint");
      g.bool("only-forward", "Only sprint while holding forward", true);
      g.int("min-hunger", "Minimum hunger to sprint", 6, { min: 0, max: 20 });
      g.bool("restore", "Restore the previous sprint state on disable", true);
    }
    onTick() {
      const p = this.game.getPlayer?.();
      if (!p) return;
      if (this.settings.get("only-forward").value && p.moveForward !== void 0 && p.moveForward <= 0) return;
      if (typeof p.hunger === "number" && p.hunger < this.settings.get("min-hunger").value) return;
      this.game.setSprinting?.(true);
    }
    onDisable() {
      if (this.settings.get("restore").value) this.game.setSprinting?.(false);
    }
  };
  var Flight = class extends Module {
    constructor() {
      super({ id: "flight", name: "Flight", description: `Fly with configurable speed. ${LOCAL_NOTE2}`, category: "Movement", requiredCapabilities: ["movement", "flight"] });
      this._wasFlying = false;
    }
    onInit() {
      const g = this.settings.addGroup("Flight");
      g.enum("mode", "Flight mode", "vanilla", ["vanilla", "creative", "velocity", "glide"]);
      g.double("speed", "Horizontal speed", 1, { min: 0.1, max: 10 });
      g.double("vertical-speed", "Vertical speed", 0.8, { min: 0.1, max: 10 });
      g.bool("anti-kick", "Limit speed to reduce detection on servers you are allowed to test on", true);
    }
    onEnable() {
      const p = this.game.getPlayer?.();
      this._wasFlying = !!p?.flying;
      requireAdapter(this.game, "setFlying", true);
    }
    onDisable() {
      this.game.setFlying?.(this._wasFlying);
    }
  };
  var Speed = class extends Module {
    constructor() {
      super({ id: "speed", name: "Speed", description: `Increases movement speed. ${LOCAL_NOTE2}`, category: "Movement", requiredCapabilities: ["movement"] });
    }
    onInit() {
      const g = this.settings.addGroup("Speed");
      g.enum("mode", "Mode", "multiply", ["multiply", "add", "strafe"]);
      g.double("multiplier", "Speed multiplier", 1.35, { min: 1, max: 5 });
      g.bool("only-ground", "Only apply while on the ground", true);
      g.bool("only-sprinting", "Only apply while sprinting", true);
    }
    onTick() {
      const p = this.game.getPlayer?.();
      const v = this.game.getPlayerVelocity?.();
      if (!p || !v) return;
      if (this.settings.get("only-ground").value && !this.game.isOnGround?.()) return;
      if (this.settings.get("only-sprinting").value && !p.sprinting) return;
      const mult = this.settings.get("multiplier").value;
      const mode = this.settings.get("mode").value;
      let vx = v.x;
      let vz = v.z;
      if (mode === "multiply") {
        vx *= mult;
        vz *= mult;
      } else if (mode === "add") {
        const len = Math.hypot(vx, vz) || 1;
        vx += vx / len * (mult - 1) * 0.1;
        vz += vz / len * (mult - 1) * 0.1;
      } else if (mode === "strafe") {
        const forward = p.moveForward ?? 0, strafe = p.moveStrafe ?? 0, length = Math.hypot(forward, strafe);
        if (!length) return;
        const yaw = (p.yaw ?? 0) * Math.PI / 180, speed = Math.hypot(vx, vz) * mult;
        vx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length * speed;
        vz = (Math.cos(yaw) * forward + Math.sin(yaw) * strafe) / length * speed;
      }
      this.game.setPlayerVelocity?.(vx, v.y, vz);
    }
  };
  var Step = class extends Module {
    constructor() {
      super({ id: "step", name: "Step", description: "Increases step height so the player walks up full blocks.", category: "Movement", requiredCapabilities: ["movement"] });
      this._original = 0.6;
    }
    onInit() {
      this.settings.addGroup("Step").double("height", "Step height in blocks", 1, { min: 0.6, max: 8 });
    }
    onEnable() {
      this._original = this.game.getStepHeight?.() ?? 0.6;
      requireAdapter(this.game, "setStepHeight", this.settings.get("height").value);
    }
    onTick() {
      this.game.setStepHeight?.(this.settings.get("height").value);
    }
    onDisable() {
      this.game.setStepHeight?.(this._original);
    }
  };
  var HighJump = class extends Module {
    constructor() {
      super({ id: "high-jump", name: "HighJump", description: "Increases jump height.", category: "Movement", requiredCapabilities: ["movement"] });
      this._original = 1;
      this._jumpBind = null;
    }
    onInit() {
      const g = this.settings.addGroup("Jump");
      g.double("height", "Jump height multiplier", 1.6, { min: 1, max: 8 });
      g.bool("all-jumps", "Apply to every jump", true);
      g.keybind("jump-bind", "Only apply while this key is held", null);
    }
    onEnable() {
      this._original = this.game.getJumpHeight?.() ?? 1;
      requireAdapter(this.game, "setJumpHeight", this.settings.get("height").value);
    }
    onTick() {
      const bind = this.settings.get("jump-bind").value;
      if (bind && this.settings.get("all-jumps").value === false) {
        const held = this.manager.client?.keybinds?.heldKeys;
        if (held && !held.has(bind.key)) {
          this.game.setJumpHeight?.(this._original);
          return;
        }
      }
      this.game.setJumpHeight?.(this.settings.get("height").value);
    }
    onDisable() {
      this.game.setJumpHeight?.(this._original);
    }
  };
  var SafeWalk = class extends Module {
    constructor() {
      super({ id: "safe-walk", name: "SafeWalk", description: "Stops movement at block edges (sneak-like behaviour).", category: "Movement", requiredCapabilities: ["movement"] });
    }
    onEnable() {
      requireAdapter(this.game, "setSafeWalk", true);
    }
    onTick() {
      this.game.setSafeWalk?.(true);
    }
    onDisable() {
      this.game.setSafeWalk?.(false);
    }
  };
  var NoFall = class extends Module {
    constructor() {
      super({ id: "no-fall", name: "NoFall", description: "Prevents fall damage.", category: "Movement", requiredCapabilities: ["movement"] });
    }
    onEnable() {
      requireAdapter(this.game, "setNoFall", true);
    }
    onTick() {
      this.game.setNoFall?.(true);
    }
    onDisable() {
      this.game.setNoFall?.(false);
    }
  };
  var AutoJump = class extends Module {
    constructor() {
      super({ id: "auto-jump", name: "AutoJump", description: "Jumps automatically when a block is in the way.", category: "Movement", requiredCapabilities: ["world", "movement"] });
      this._cooldown = 0;
    }
    onInit() {
      const g = this.settings.addGroup("AutoJump");
      g.bool("only-forward", "Only while moving forward", true);
      g.int("delay", "Minimum delay between jumps (ticks)", 4, { min: 1, max: 40 });
    }
    onTick() {
      if (this._cooldown > 0) {
        this._cooldown--;
        return;
      }
      const p = this.game.getPlayer?.();
      if (!p || !this.game.isOnGround?.()) return;
      if (this.settings.get("only-forward").value && p.moveForward <= 0) return;
      if (this.game.isBlockAhead?.({ distance: 0.6, height: 1 })) {
        this.game.jump?.();
        this._cooldown = this.settings.get("delay").value;
      }
    }
  };
  var AutoWalk = class extends Module {
    constructor() {
      super({ id: "auto-walk", name: "AutoWalk", description: "Walks forward automatically.", category: "Movement", requiredCapabilities: ["movement"] });
    }
    onEnable() {
      requireAdapter(this.game, "setForward", true);
    }
    onTick() {
      this.game.setForward?.(true);
    }
    onDisable() {
      this.game.setForward?.(false);
    }
  };
  var NoSlow = class extends Module {
    constructor() {
      super({
        id: "no-slow",
        name: "NoSlow",
        description: "Would remove item-use slowdown; needs a movement-input hook the runtime does not expose.",
        category: "Movement",
        unsupported: true,
        unsupportedReason: "requires intercepting the item-use movement modifier, which is compiled into the WASM runtime"
      });
    }
  };
  var Timer = class extends Module {
    constructor() {
      super({ id: "timer", name: "Timer", description: "Scales the local game tick rate. Affects simulation, not just visuals \u2014 for local testing only.", category: "Movement", requiredCapabilities: ["timing"] });
      this._original = 1;
    }
    onInit() {
      this.settings.addGroup("Timer").double("speed", "Tick rate multiplier", 1.2, { min: 0.1, max: 10 });
    }
    onEnable() {
      this._original = this.game.getTickRateMultiplier?.() ?? 1;
      requireAdapter(this.game, "setTickRate", this.settings.get("speed").value);
    }
    onDisable() {
      this.game.setTickRate?.(this._original);
    }
  };
  var Freecam = class extends Module {
    constructor() {
      super({ id: "freecam", name: "Freecam", description: "Detaches the camera from the player.", category: "Render", requiredCapabilities: ["render"] });
      this._saved = null;
    }
    onInit() {
      const g = this.settings.addGroup("Camera");
      g.double("speed", "Camera move speed", 1, { min: 0.2, max: 8 });
      g.bool("freeze-player", "Keep the player still while detached", true);
    }
    onEnable() {
      if (typeof this.game.enterFreecam !== "function") throw new Error("runtime does not expose a camera detachment hook");
      this._saved = this.game.getCamera?.() ?? null;
      this.game.enterFreecam({ speed: this.settings.get("speed").value, freeze: this.settings.get("freeze-player").value });
    }
    onTick() {
      this.game.updateFreecam?.({ speed: this.settings.get("speed").value });
    }
    onDisable() {
      this.game.exitFreecam?.(this._saved);
    }
  };
  var Parkour = class extends Module {
    constructor() {
      super({ id: "parkour", name: "Parkour", description: "Jumps automatically at the edge of a block.", category: "Movement", requiredCapabilities: ["world", "movement"] });
    }
    onInit() {
      const g = this.settings.addGroup("Parkour");
      g.bool("only-forward", "Only while moving forward", true);
      g.bool("sneak-edges", "Also sneak at very short drops", false);
    }
    onTick() {
      const p = this.game.getPlayer?.();
      if (!p || !this.game.isOnGround?.()) return;
      if (this.settings.get("only-forward").value && p.moveForward <= 0) return;
      if (this.game.isBlockAhead?.({ distance: 0.4, height: 1, requireGapAfter: 1 })) {
        this.game.jump?.();
      }
    }
  };
  var BunnyHop = class extends Module {
    constructor() {
      super({ id: "bunny-hop", name: "BunnyHop", description: "Automatically jumps while sprinting to maintain momentum.", category: "Movement", requiredCapabilities: ["movement"] });
    }
    onInit() {
      const g = this.settings.addGroup("BunnyHop");
      g.int("delay", "Jump delay (ticks)", 1, { min: 1, max: 10 });
      g.bool("only-sprinting", "Only while sprinting", true);
    }
    onEnable() {
      this._jumpCooldown = 0;
    }
    onDisable() {
      this._jumpCooldown = 0;
    }
    onTick() {
      if (this._jumpCooldown > 0) {
        this._jumpCooldown--;
        return;
      }
      const p = this.game.getPlayer?.();
      if (!p) return;
      if (this.settings.get("only-sprinting").value && !p.sprinting) return;
      if (this.game.isOnGround?.()) {
        this.game.jump?.();
        this._jumpCooldown = this.settings.get("delay").value;
      }
    }
  };
  var Jesus = class extends Module {
    constructor() {
      super({
        id: "jesus",
        name: "Jesus",
        description: "Would let the player walk on water; requires a fluid-collision hook the runtime does not expose.",
        category: "Movement",
        unsupported: true,
        unsupportedReason: "no fluid collision/velocity hook available in the compiled runtime"
      });
    }
  };
  var Spider = class extends Module {
    constructor() {
      super({
        id: "spider",
        name: "Spider",
        description: "Would allow wall climbing; requires colliding-block hooks the runtime does not expose.",
        category: "Movement",
        unsupported: true,
        unsupportedReason: "no horizontal collision hook available in the compiled runtime"
      });
    }
  };
  function createMovementModules() {
    return [
      new Sprint(),
      new Flight(),
      new Speed(),
      new Step(),
      new HighJump(),
      new SafeWalk(),
      new NoFall(),
      new AutoJump(),
      new AutoWalk(),
      new NoSlow(),
      new Timer(),
      new Freecam(),
      new Parkour(),
      new BunnyHop(),
      new Jesus(),
      new Spider()
    ];
  }

  // src/modules/render-modules.js
  function rgba(color, alphaOverride) {
    const a = alphaOverride ?? color.a / 255;
    return `rgba(${color.r},${color.g},${color.b},${a})`;
  }
  function entityLabel(e, { showDistance, showHealth, playerDist }) {
    let label = e.name ?? e.type ?? "entity";
    const parts = [];
    if (showHealth && typeof e.health === "number") parts.push(`${e.health.toFixed(0)}hp`);
    if (showDistance && playerDist !== void 0) parts.push(`${playerDist.toFixed(1)}m`);
    if (parts.length) label += ` (${parts.join(", ")})`;
    return label;
  }
  var Fullbright = class extends Module {
    constructor() {
      super({
        id: "fullbright",
        name: "Fullbright",
        description: "Raises world brightness. Restores the original value on disable.",
        category: "Render",
        requiredCapabilities: ["world"]
      });
      this._original = null;
    }
    onInit() {
      const g = this.settings.addGroup("Brightness");
      g.double("level", "Brightness value", 1, { min: 0, max: 1 });
      g.bool("night-vision", "Also apply a night-vision style effect when supported", false);
    }
    onEnable() {
      const game = this.game;
      this._original = game.getBrightness?.() ?? null;
      const applied = game.setBrightness?.(this.settings.get("level").value);
      if (applied === false) throw new Error("adapter rejected setBrightness");
    }
    onDisable() {
      if (this._original !== null) this.game.setBrightness?.(this._original);
      else this.game.setBrightness?.(0);
    }
    onTick() {
      this.game.setBrightness?.(this.settings.get("level").value);
    }
  };
  var Zoom = class extends Module {
    constructor() {
      super({
        id: "zoom",
        name: "Zoom",
        description: "Hold the bind to zoom in. Restores the original FOV on release.",
        category: "Render",
        requiredCapabilities: ["world"]
      });
      this._originalFov = null;
      this._zoomed = false;
    }
    onInit() {
      const g = this.settings.addGroup("Zoom");
      g.double("factor", "Zoom factor (higher = closer)", 4, { min: 1.2, max: 12 });
      g.bool("smooth", "Smoothly interpolate the zoom", true);
      this.bind.set({ key: "KeyC", mouse: null, modifiers: {} });
    }
    onEnable() {
      this._originalFov = this.game.getFov?.() ?? null;
      this._apply(true);
    }
    onDisable() {
      if (this._originalFov !== null) this.game.setFov?.(this._originalFov);
      this._zoomed = false;
    }
    onTick() {
      this._apply(false);
    }
    _apply(instant) {
      const base = this._originalFov ?? 70;
      const target = base / this.settings.get("factor").value;
      const smooth = this.settings.get("smooth").value;
      const current = this.game.getFov?.() ?? base;
      const next = instant || !smooth ? target : current + (target - current) * 0.35;
      this.game.setFov?.(next);
      this._zoomed = true;
    }
  };
  var CustomCrosshair = class extends Module {
    constructor() {
      super({
        id: "custom-crosshair",
        name: "Custom Crosshair",
        description: "Draws a configurable crosshair over the game.",
        category: "Render",
        requiredCapabilities: ["hud"],
        runsInMenus: false
      });
      this._sub = null;
    }
    onInit() {
      const g = this.settings.addGroup("Appearance");
      g.enum("shape", "Crosshair shape", "cross", ["cross", "dot", "square", "circle", "t-shape"]);
      g.double("size", "Size in pixels", 10, { min: 2, max: 60 });
      g.double("thickness", "Line thickness", 1.5, { min: 0.5, max: 6 });
      g.color("color", "Colour", { r: 255, g: 255, b: 255, a: 210 });
      g.bool("hide-vanilla", "Hide the game's own crosshair", true);
      g.double("gap", "Centre gap (cross/t-shape)", 2, { min: 0, max: 20 });
    }
    onEnable() {
      this._originalCrosshairVisible = this.game.getVanillaCrosshairVisible?.() ?? true;
      this.onTick();
      this._sub = this.subscribe(Events.RenderHud, (ev) => this.draw(ev));
    }
    onTick() {
      this.game.setVanillaCrosshairVisible?.(this.settings.get("hide-vanilla").value ? false : this._originalCrosshairVisible);
    }
    onDisable() {
      this.game.setVanillaCrosshairVisible?.(this._originalCrosshairVisible);
      this._sub?.dispose();
      this._sub = null;
    }
    draw({ ctx, viewport }) {
      if (!ctx || !viewport) return;
      const cx = viewport.width / 2;
      const cy = viewport.height / 2;
      const size = this.settings.get("size").value;
      const gap = this.settings.get("gap").value;
      const th = this.settings.get("thickness").value;
      const color = this.settings.get("color");
      ctx.save();
      ctx.strokeStyle = rgba(color);
      ctx.fillStyle = rgba(color);
      ctx.lineWidth = th;
      const shape = this.settings.get("shape").value;
      if (shape === "dot") {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, th), 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === "square") {
        ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      } else if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape === "t-shape") {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - gap - size, cy);
        ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + size, cy);
        ctx.moveTo(cx, cy - gap - size);
        ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + gap + size);
        ctx.stroke();
      }
      ctx.restore();
    }
  };
  var WorldRenderModule = class extends Module {
    constructor(def) {
      super({ category: "Render", requiredCapabilities: ["world", "entities", "render", "hud"], ...def });
      this._sub = null;
    }
    onInit() {
      this._buildSettings();
    }
    /** subclasses define filter + visual settings */
    _buildSettings() {
      const f = this.settings.addGroup("Filter");
      f.int("range", "Maximum distance (blocks)", this.defaultRange ?? 64, { min: 4, max: 256 });
      f.bool("players", "Target players", true);
      f.bool("hostile", "Target hostile mobs", true);
      f.bool("passive", "Target passive mobs", false);
      f.bool("invisible", "Include invisible entities", false);
      const v = this.settings.addGroup("Visual");
      v.color("color", "Primary colour", this.defaultColor ?? { r: 255, g: 80, b: 80, a: 200 });
      v.color("player-color", "Player colour", { r: 80, g: 200, b: 255, a: 200 });
      v.double("alpha", "Opacity", 0.8, { min: 0.05, max: 1 });
    }
    /** @returns {Array} filtered entities within range with distance attached */
    candidates(game) {
      const player = game.getPlayer();
      if (!player) return [];
      const range = this.settings.get("range").value;
      const wantPlayers = this.settings.get("players").value;
      const wantHostile = this.settings.get("hostile").value;
      const wantPassive = this.settings.get("passive").value;
      const wantInvisible = this.settings.get("invisible").value;
      const out = [];
      for (const e of game.getEntities()) {
        if (!e || e.isSelf) continue;
        const kind = e.kind ?? (e.isPlayer ? "player" : e.hostile ? "hostile" : "passive");
        if (kind === "player" && !wantPlayers) continue;
        if (kind === "hostile" && !wantHostile) continue;
        if (kind === "passive" && !wantPassive) continue;
        if (e.invisible && !wantInvisible) continue;
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dz = e.z - player.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!Number.isFinite(dist) || dist > range) continue;
        out.push({ entity: e, dist, kind });
      }
      out.sort((a, b) => a.dist - b.dist);
      return out;
    }
    onEnable() {
      this._sub = this.subscribe(Events.RenderWorld, (ev) => this.renderWorld(ev));
    }
    onDisable() {
      this._sub?.dispose();
      this._sub = null;
    }
    renderWorld(_ev) {
    }
  };
  var EntityESP = class extends WorldRenderModule {
    constructor() {
      super({
        id: "entity-esp",
        name: "Entity ESP",
        description: "Draws boxes around selected entities.",
        defaultRange: 64,
        defaultColor: { r: 255, g: 80, b: 80, a: 200 }
      });
    }
    _buildSettings() {
      super._buildSettings();
      const v = this.settings.groups.find((g) => g.name === "Visual");
      v.bool("boxes", "Draw bounding boxes", true);
      v.bool("filled", "Fill the box", false);
      v.double("line-width", "Outline thickness", 1.5, { min: 0.5, max: 5 });
      v.bool("health-bar", "Draw a health bar beside the box", false);
    }
    renderWorld({ ctx, projection, frame }) {
      const game = this.game;
      const alpha = this.settings.get("alpha").value;
      const lineWidth = this.settings.get("line-width").value;
      const boxes = this.settings.get("boxes").value;
      const filled = this.settings.get("filled").value;
      const healthBar = this.settings.get("health-bar").value;
      const playerColor = this.settings.get("player-color");
      const baseColor = this.settings.get("color");
      for (const { entity, dist, kind } of this.candidates(game)) {
        const color = kind === "player" ? playerColor : baseColor;
        const bounds = projection?.projectEntity?.(entity) ?? this._boundsFromCorners(entity, projection);
        if (!bounds || bounds.behind) continue;
        if (boxes) {
          ctx.save();
          ctx.strokeStyle = rgba(color, alpha);
          ctx.lineWidth = lineWidth;
          if (filled) {
            ctx.fillStyle = rgba(color, alpha * 0.25);
            ctx.fillRect(bounds.x1, bounds.y1, bounds.x2 - bounds.x1, bounds.y2 - bounds.y1);
          }
          ctx.strokeRect(bounds.x1, bounds.y1, bounds.x2 - bounds.x1, bounds.y2 - bounds.y1);
          ctx.restore();
        }
        if (healthBar && typeof entity.health === "number" && typeof entity.maxHealth === "number") {
          const h = bounds.y2 - bounds.y1;
          const frac = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(bounds.x2 + 3, bounds.y1, 3, h);
          ctx.fillStyle = frac > 0.5 ? "#5bbf7a" : frac > 0.25 ? "#e0a458" : "#d64545";
          ctx.fillRect(bounds.x2 + 3, bounds.y1 + h * (1 - frac), 3, h * frac);
          ctx.restore();
        }
      }
    }
    /** Fallback box when the projection only offers worldToScreen. */
    _boundsFromCorners(entity, projection) {
      if (!projection?.worldToScreen) return null;
      const w = entity.width ?? 0.6;
      const h = entity.height ?? 1.8;
      const pts = [
        [entity.x - w / 2, entity.y, entity.z - w / 2],
        [entity.x + w / 2, entity.y, entity.z + w / 2],
        [entity.x - w / 2, entity.y + h, entity.z - w / 2],
        [entity.x + w / 2, entity.y + h, entity.z + w / 2]
      ].map(([x, y, z]) => projection.worldToScreen(x, y, z));
      const visible = pts.filter((p) => p && p.visible);
      if (visible.length === 0) return null;
      const xs = visible.map((p) => p.x);
      const ys = visible.map((p) => p.y);
      return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys), behind: false };
    }
  };
  var Tracers = class extends WorldRenderModule {
    constructor() {
      super({ id: "tracers", name: "Tracers", description: "Draws lines pointing at selected entities.", defaultRange: 96, defaultColor: { r: 120, g: 200, b: 255, a: 200 } });
    }
    _buildSettings() {
      super._buildSettings();
      const v = this.settings.groups.find((g) => g.name === "Visual");
      v.enum("origin", "Line origin", "crosshair", ["crosshair", "top", "bottom", "player"]);
      v.double("line-width", "Thickness", 1.2, { min: 0.4, max: 5 });
    }
    renderWorld({ ctx, projection, viewport }) {
      const alpha = this.settings.get("alpha").value;
      const originMode = this.settings.get("origin").value;
      const lw = this.settings.get("line-width").value;
      const origin = this._origin(originMode, viewport, projection);
      if (!origin) return;
      ctx.save();
      ctx.lineWidth = lw;
      for (const { entity, kind } of this.candidates(this.game)) {
        const p = projection?.projectEntityCentered?.(entity) ?? projection?.worldToScreen?.(entity.x, entity.y + (entity.height ?? 1.8) / 2, entity.z);
        if (!p || p.behind) continue;
        ctx.strokeStyle = rgba(kind === "player" ? this.settings.get("player-color") : this.settings.get("color"), alpha);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    _origin(mode, viewport, projection) {
      if (!viewport) return null;
      if (mode === "top") return { x: viewport.width / 2, y: 0 };
      if (mode === "bottom") return { x: viewport.width / 2, y: viewport.height };
      if (mode === "player") {
        const player = this.game.getPlayer();
        const p = player && projection?.worldToScreen?.(player.x, player.y + 1.2, player.z);
        return p ?? { x: viewport.width / 2, y: viewport.height / 2 };
      }
      return { x: viewport.width / 2, y: viewport.height / 2 };
    }
  };
  var Nametags = class extends WorldRenderModule {
    constructor() {
      super({ id: "nametags", name: "Nametags", description: "Custom labels above entities.", defaultRange: 48, defaultColor: { r: 255, g: 255, b: 255, a: 230 } });
    }
    _buildSettings() {
      super._buildSettings();
      const v = this.settings.groups.find((g) => g.name === "Visual");
      v.bool("distance", "Show distance", true);
      v.bool("health", "Show health", true);
      v.bool("background", "Draw a background box", true);
      v.double("scale", "Text scale", 1, { min: 0.5, max: 2.5 });
    }
    renderWorld({ ctx, projection }) {
      const scale = this.settings.get("scale").value;
      const withBg = this.settings.get("background").value;
      const showDist = this.settings.get("distance").value;
      const showHealth = this.settings.get("health").value;
      const color = this.settings.get("color");
      ctx.save();
      ctx.font = `${11 * scale}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (const { entity, dist } of this.candidates(this.game)) {
        const p = projection?.worldToScreen?.(entity.x, entity.y + (entity.height ?? 1.8) + 0.3, entity.z);
        if (!p || p.behind) continue;
        const label = entityLabel(entity, { showDistance: showDist, showHealth, playerDist: dist });
        const w = ctx.measureText(label).width;
        if (withBg) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(p.x - w / 2 - 3, p.y - 14 * scale, w + 6, 15 * scale);
        }
        ctx.fillStyle = rgba(color);
        ctx.fillText(label, p.x, p.y);
      }
      ctx.restore();
    }
  };
  var StorageESP = class extends Module {
    constructor() {
      super({
        id: "storage-esp",
        name: "Storage ESP",
        description: "Highlights nearby storage containers.",
        category: "Render",
        requiredCapabilities: ["world", "blocks", "render"]
      });
      this._sub = null;
    }
    onInit() {
      const f = this.settings.addGroup("Filter");
      f.int("range", "Search radius", 32, { min: 4, max: 128 });
      f.bool("chests", "Chests and barrels", true);
      f.bool("furnaces", "Furnaces", true);
      f.bool("dispensers", "Dispensers and droppers", false);
      f.bool("shulkers", "Shulker boxes", false);
      const v = this.settings.addGroup("Visual");
      v.color("color", "Box colour", { r: 240, g: 200, b: 70, a: 180 });
      v.double("alpha", "Opacity", 0.75, { min: 0.05, max: 1 });
    }
    onEnable() {
      this._sub = this.subscribe(Events.RenderWorld, ({ ctx, projection }) => this._draw(ctx, projection));
    }
    onDisable() {
      this._sub?.dispose();
      this._sub = null;
    }
    _draw(ctx, projection) {
      const player = this.game.getPlayer?.();
      if (!player || !this.game.findBlocks) return;
      const wanted = [];
      if (this.settings.get("chests").value) wanted.push("chest", "trapped_chest", "barrel");
      if (this.settings.get("furnaces").value) wanted.push("furnace", "blast_furnace", "smoker");
      if (this.settings.get("dispensers").value) wanted.push("dispenser", "dropper");
      if (this.settings.get("shulkers").value) wanted.push("shulker_box");
      const found = this.game.findBlocks(wanted, this.settings.get("range").value);
      ctx.save();
      ctx.strokeStyle = rgba(this.settings.get("color"), this.settings.get("alpha").value);
      for (const b of found ?? []) {
        const p = projection?.worldToScreen?.(b.x, b.y, b.z);
        if (p && !p.behind) ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
      }
      ctx.restore();
    }
  };
  var Radar = class extends Module {
    constructor() {
      super({
        id: "radar",
        name: "Radar",
        description: "Minimap-style radar of nearby entities.",
        category: "HUD",
        requiredCapabilities: ["world", "entities", "hud"],
        runsInMenus: false,
        defaultX: 400,
        defaultY: 4
      });
      this._sub = null;
    }
    onInit() {
      const g = this.settings.addGroup("Radar");
      g.int("range", "Radar range (blocks)", 48, { min: 8, max: 200 });
      g.int("size", "Radar size (px)", 110, { min: 60, max: 260 });
      g.bool("rotate", "Rotate with player orientation", true);
      g.bool("players", "Show players", true);
      g.bool("mobs", "Show mobs", true);
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 400, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 4, { min: 0, max: 4e3 });
    }
    hudRender() {
      if (this.game?.hasCapability?.("hud") && this.game?.getCanvas?.()) return "";
      const c = this._candidates();
      if (c.length === 0) return "";
      return c.slice(0, 6).map((e) => `${e.dx >= 0 ? "\u2192" : "\u2190"}${Math.abs(e.dist).toFixed(0)}`).join(" ");
    }
    _candidates() {
      const player = this.game.getPlayer?.();
      if (!player) return [];
      const range = this.settings.get("range").value;
      const out = [];
      for (const e of this.game.getEntities?.() ?? []) {
        if (e.isSelf) continue;
        if (e.isPlayer && !this.settings.get("players").value) continue;
        if (!e.isPlayer && !this.settings.get("mobs").value) continue;
        const dx = e.x - player.x;
        const dz = e.z - player.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > range) continue;
        out.push({ dx, dz, dist, entity: e });
      }
      return out;
    }
    onEnable() {
      this._sub = this.subscribe(Events.RenderHud, (ev) => this._draw(ev));
    }
    onDisable() {
      this._sub?.dispose();
      this._sub = null;
    }
    _draw({ ctx }) {
      if (!ctx) return;
      const size = this.settings.get("size").value;
      const range = this.settings.get("range").value;
      const player = this.game.getPlayer?.();
      if (!player) return;
      const x = this.settings.get("hud-x").value + size / 2;
      const y = this.settings.get("hud-y").value + size / 2;
      const r = size / 2;
      const rotate = this.settings.get("rotate").value;
      const yawRad = rotate ? -(player.yaw ?? 0) * Math.PI / 180 : 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      for (const c of this._candidates()) {
        const cos = Math.cos(yawRad);
        const sin = Math.sin(yawRad);
        const rx = c.dx * cos - c.dz * sin;
        const rz = c.dx * sin + c.dz * cos;
        const px = x + rx / range * r;
        const py = y + rz / range * r;
        ctx.fillStyle = c.entity.isPlayer ? "#4f8ef7" : "#d64545";
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };
  var NoHurtCam = class extends Module {
    constructor() {
      super({ id: "no-hurt-cam", name: "NoHurtCam", description: "Removes the camera tilt when damaged.", category: "Render", requiredCapabilities: ["world"] });
    }
    onInit() {
      this.settings.addGroup("General").bool("tilt", "Also remove the directional tilt", true);
    }
    onEnable() {
      if (this.game.setHurtCam) {
        this.game.setHurtCam(false);
        return;
      }
      throw new Error("adapter does not expose camera-hurt control");
    }
    onDisable() {
      this.game.setHurtCam?.(true);
    }
  };
  var XRay = class extends Module {
    constructor() {
      super({
        id: "xray",
        name: "X-Ray",
        description: "Would expose ores through walls; requires a block-visibility hook the runtime does not expose.",
        category: "Render",
        unsupported: true,
        unsupportedReason: "no supported block-face visibility hook in the Eaglercraft renderer"
      });
    }
    onInit() {
      const g = this.settings.addGroup("Blocks");
      g.string("ores", "Ore list (comma separated)", "diamond_ore,gold_ore,iron_ore,emerald_ore,ancient_debris");
      g.double("opacity", "Non-ore opacity", 0.15, { min: 0, max: 1 });
    }
  };
  function createRenderModules() {
    return [
      new Fullbright(),
      new Zoom(),
      new CustomCrosshair(),
      new EntityESP(),
      new Tracers(),
      new Nametags(),
      new StorageESP(),
      new Radar(),
      new NoHurtCam(),
      new XRay()
    ];
  }

  // src/modules/world-modules.js
  var LOCAL_NOTE3 = "Single-player / authorised testing only.";
  var AutoTool = class extends Module {
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
      if (best !== void 0 && best !== null) this.game.selectSlot?.(best);
    }
    onDisable() {
      if (this.settings.get("restore").value && this._lastSlot >= 0) this.game.selectSlot?.(this._lastSlot);
      this._lastSlot = -1;
    }
  };
  var AutoEat = class extends Module {
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
      if (this.settings.get("restore-slot").value && this._eatenSlot !== null) (this.game.restoreSelectedSlot ?? this.game.selectSlot)?.call(this.game, this._eatenSlot);
      this._eatenSlot = null;
    }
    onTick() {
      const p = this.game.getPlayer?.();
      if (!p || typeof p.hunger !== "number") return;
      if (p.hunger >= this.settings.get("threshold").value) {
        this._finish();
        return;
      }
      if (p.usingItem) return;
      const food = this.game.findFoodInHotbar?.(this.settings.get("food").value);
      if (!Number.isInteger(food) || food < 0) {
        this._finish();
        return;
      }
      if (this._eatenSlot === null) this._eatenSlot = this.game.getSelectedSlot?.() ?? 0;
      this.game.selectSlot?.(food);
      if (this.game.getSelectedSlot?.() !== food) return;
      if (this.game.startUsingItem) this.game.startUsingItem();
      else this.game.useItem?.();
    }
    onDisable() {
      this._finish();
    }
  };
  var FastPlace = class extends Module {
    constructor() {
      super({ id: "fast-place", name: "FastPlace", description: `Removes the item-use cooldown. ${LOCAL_NOTE3}`, category: "Player", requiredCapabilities: ["inventory"] });
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
  };
  var AutoRespawn = class extends Module {
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
  };
  var AntiAFK = class extends Module {
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
  };
  var DurabilityWarnings = class extends Module {
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
      if (this._lastWarn && now - this._lastWarn < 5e3) return;
      this._lastWarn = now;
      this.manager.notify(`${held.name} is nearly broken (${held.durability} left)`, "warn");
    }
  };
  var InventoryManager = class extends Module {
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
  };
  var AutoReconnect = class extends Module {
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
        }, this.settings.get("delay").value * 1e3);
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
  };
  var ChestOrganizer = class extends Module {
    constructor() {
      super({
        id: "chest-organizer",
        name: "Chest Organizer",
        description: "Sorts items into nearby containers.",
        category: "Player",
        unsupported: true,
        unsupportedReason: "requires container screen automation not exposed by the runtime"
      });
    }
  };
  var WorldTime = class extends Module {
    constructor() {
      super({ id: "world-time", name: "World Time", description: "Shows the in-game time of day.", category: "HUD", requiredCapabilities: ["world"], runsInMenus: false });
      this._sub = null;
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 380, { min: 0, max: 4e3 });
      l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
      l.bool("show-day", "Show the day number", true);
    }
    hudRender() {
      const w = this.game.getWorld?.();
      if (!w || typeof w.time !== "number") return "Time: \u2014";
      const total = (w.time % 24e3 + 24e3) % 24e3;
      const hours = Math.floor(total / 1e3 + 6) % 24;
      const minutes = Math.floor(total % 1e3 / 1e3 * 60);
      const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return this.settings.get("show-day").value ? `Time: ${clock} (day ${w.day ?? "?"})` : `Time: ${clock}`;
    }
  };
  var BlockSearch = class extends Module {
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
      const names = this.settings.get("blocks").value.split(",").map((s) => s.trim()).filter(Boolean);
      if (!this.game.findBlocks) return;
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
  };
  var Waypoints = class extends Module {
    constructor() {
      super({ id: "waypoints", name: "Waypoints", description: "Save and render named positions.", category: "World", requiredCapabilities: ["world", "render"] });
      this.store = /* @__PURE__ */ new Map();
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
      this.store = /* @__PURE__ */ new Map();
      for (const [key, list] of Object.entries(data)) {
        if (!Array.isArray(list)) continue;
        this.store.set(
          key,
          list.filter((w) => w && typeof w.name === "string" && Number.isFinite(w.x) && Number.isFinite(w.y) && Number.isFinite(w.z)).map((w) => ({ name: String(w.name).slice(0, 48), x: +w.x, y: +w.y, z: +w.z, color: w.color ?? null, dim: w.dim ?? "overworld" }))
        );
      }
      return true;
    }
    reset() {
      this.store.clear();
    }
  };
  var ChunkBorders = class extends Module {
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
          const c2 = projection.worldToScreen(x, p.y, z + 16);
          if (a?.visible && c2?.visible) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(c2.x, c2.y);
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
  };
  var BiomeInfo = class extends Module {
    constructor() {
      super({ id: "biome-info", name: "Biome Info", description: "Shows the current biome.", category: "HUD", requiredCapabilities: ["world"], runsInMenus: false });
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 396, { min: 0, max: 4e3 });
      l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    }
    hudRender() {
      const w = this.game.getWorld?.();
      if (!w || !w.biome) return "";
      return `Biome: ${w.biome}`;
    }
  };
  var LightLevelOverlay = class extends Module {
    constructor() {
      super({
        id: "light-level",
        name: "Light Level Overlay",
        description: "Light-level numbers on blocks; needs a block-light accessor the runtime does not expose.",
        category: "World",
        unsupported: true,
        unsupportedReason: "no per-block light lookup available"
      });
    }
  };
  function createWorldModules() {
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
      new LightLevelOverlay()
    ];
  }

  // src/core/screenshot.js
  function captureGameCanvas(canvas, timeoutMs = 2e3) {
    let gl;
    try {
      gl = canvas.getContext("webgl2");
    } catch {
    }
    if (!gl) return { result: Promise.resolve().then(() => canvas.toDataURL("image/png")), cancel() {
    } };
    const original = gl.drawArrays;
    let timer, rejectCapture, finished = false;
    function cleanup() {
      clearTimeout(timer);
      if (gl.drawArrays === draw) gl.drawArrays = original;
    }
    function cancel() {
      if (finished) return;
      finished = true;
      cleanup();
      rejectCapture(new Error("screenshot cancelled"));
    }
    let resolveCapture;
    function draw(mode, first, count) {
      const value = original.call(this, mode, first, count);
      if (!finished && mode === gl.TRIANGLES && first === 0 && count === 3 && gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
        finished = true;
        try {
          resolveCapture(canvas.toDataURL("image/png"));
        } catch (err) {
          rejectCapture(err);
        } finally {
          cleanup();
        }
      }
      return value;
    }
    const result = new Promise((resolve, reject) => {
      resolveCapture = resolve;
      rejectCapture = reject;
      timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error("no completed game frame within screenshot timeout"));
      }, timeoutMs);
      gl.drawArrays = draw;
    });
    return { result, cancel };
  }

  // src/modules/misc-modules.js
  var Notifications = class extends Module {
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
      const want = level === "info" && this.settings.get("module-toggles").value || level === "warn" && this.settings.get("warnings").value || level === "error" && this.settings.get("errors").value;
      if (!want) return;
      this.log.push({ at: Date.now(), text, level });
      const max = this.settings.get("history").value;
      while (this.log.length > max) this.log.shift();
      this.manager.client?.toasts?.push(text, level);
    }
    onEnable() {
      this._sub = this.manager.bus.on(Events.Notification, (ev) => {
        if (ev.__handledBy) return;
        ev.__handledBy = true;
        this.handle(ev.text, ev.level);
      });
    }
    onDisable() {
      this._sub?.dispose();
      this._sub = null;
    }
  };
  var FriendManager = class extends Module {
    constructor() {
      super({ id: "friend-manager", name: "Friend Manager", description: "Manages a friend list excluded from combat modules.", category: "Misc", runsInMenus: true });
      this.friends = /* @__PURE__ */ new Set();
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
  };
  var Macros = class extends Module {
    constructor() {
      super({ id: "macros", name: "Macros", description: "Keybound multi-step action sequences.", category: "Misc", runsInMenus: true });
      this.macros = [{ name: "example", bind: null, steps: [{ action: "toggle", module: "sprint" }] }];
      this._running = null;
      this._stepIndex = 0;
      this._waitUntil = 0;
    }
    onDisable() {
      this._running = null;
      this._stepIndex = 0;
      this._waitUntil = 0;
    }
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
      this.macros = data.filter((m) => m && typeof m.name === "string" && Array.isArray(m.steps)).map((m) => ({ name: m.name.slice(0, 48), bind: m.bind ?? null, steps: m.steps.slice(0, 32) }));
      return true;
    }
    reset() {
      this.macros = [];
    }
  };
  var ModuleSearch = class extends Module {
    constructor() {
      super({ id: "module-search", name: "Module Search", description: "Opens the ClickGUI focused on the search box.", category: "Misc", runsInMenus: true });
      this.bind.set({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
    }
    onEnable() {
      this.manager.client?.clickgui?.show();
      this.disable();
    }
  };
  var KeybindManagerPanel = class extends Module {
    constructor() {
      super({ id: "keybind-manager", name: "Keybind Manager", description: "Opens the ClickGUI where binds are edited.", category: "Misc", runsInMenus: true });
    }
    onEnable() {
      this.manager.client?.clickgui?.show();
      this.manager.notify(`${this.manager.bindList().length} module binds configured`, "info");
      this.disable();
    }
  };
  var SessionStats = class extends Module {
    constructor() {
      super({ id: "session-stats", name: "Session Statistics", description: "Tracks session time, distance travelled and deaths.", category: "Misc", runsInMenus: true });
      this.stats = { deaths: 0, distance: 0, startedAt: Date.now(), _last: null, kills: 0 };
      this._eventSubs = [];
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 420, { min: 0, max: 4e3 });
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
        })
      );
    }
    onDisable() {
      for (const s of this._eventSubs) s.dispose();
      this._eventSubs = [];
    }
    hudRender() {
      const parts = [];
      if (this.settings.get("time").value) {
        const secs = Math.floor((Date.now() - this.stats.startedAt) / 1e3);
        parts.push(`${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, "0")}s`);
      }
      if (this.settings.get("distance").value) parts.push(`${this.stats.distance.toFixed(0)}m`);
      if (this.settings.get("deaths").value) parts.push(`${this.stats.deaths} deaths`);
      return `Session: ${parts.join(" \xB7 ")}`;
    }
    serialise() {
      return { ...this.stats, _last: void 0 };
    }
    load(data) {
      if (!data || typeof data !== "object") return false;
      this.stats = { kills: 0, deaths: 0, distance: 0, startedAt: Date.now(), ...data, _last: null };
      return true;
    }
    reset() {
      this.stats = { deaths: 0, distance: 0, startedAt: Date.now(), _last: null, kills: 0 };
    }
  };
  var PingDisplay = class extends Module {
    constructor() {
      super({ id: "ping-display", name: "Ping Display", description: "Shows the connection latency.", category: "HUD", requiredCapabilities: ["network"], runsInMenus: false });
    }
    onInit() {
      const l = this.settings.addGroup("Layout");
      l.int("hud-x", "Horizontal position", 4, { min: 0, max: 4e3 });
      l.int("hud-y", "Vertical position", 440, { min: 0, max: 4e3 });
      l.double("hud-scale", "Text scale", 1, { min: 0.5, max: 3 });
    }
    hudRender() {
      const ping = this.game.getPing?.();
      if (ping === void 0 || ping === null || ping < 0) return "Ping: n/a";
      return `Ping: ${Math.round(ping)}ms`;
    }
  };
  var ScreenshotUtil = class extends Module {
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
      capture.result.then((url) => {
        if (!this.active || this._capture !== capture) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = `meteor-${Date.now()}.png`;
        a.click();
        this.manager.notify("screenshot saved", "info");
      }).catch((err) => {
        if (this.active && this._capture === capture) this.manager.notify(`screenshot failed: ${err.message}`, "error");
      }).finally(() => {
        if (this._capture === capture) {
          this._capture = null;
          this.disable();
        }
      });
    }
    onDisable() {
      const capture = this._capture;
      this._capture = null;
      capture?.cancel();
    }
  };
  var AutoGG = class extends Module {
    constructor() {
      super({ id: "auto-gg", name: "AutoGG", description: "Sends a configurable message when a game ends.", category: "Misc", requiredCapabilities: ["chat"], runsInMenus: true });
      this._sub = null;
      this._timers = /* @__PURE__ */ new Set();
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
    _cancelPending() {
      for (const timer of this._timers) clearTimeout(timer);
      this._timers.clear();
    }
    onDisable() {
      this._cancelPending();
      this._sub?.dispose();
      this._sub = null;
    }
  };
  var ChatTimestamps = class extends Module {
    constructor() {
      super({
        id: "chat-timestamps",
        name: "Chat Timestamps",
        description: "Prefixes chat messages with a timestamp; requires a chat-render hook the runtime does not expose.",
        category: "Misc",
        unsupported: true,
        unsupportedReason: "no chat message render/format hook available"
      });
    }
  };
  var DebugConsole = class extends Module {
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
      g.int("max-lines", "Keep this many lines", 200, { min: 20, max: 1e3 });
    }
    onEnable() {
      this._eventSubs.push(this.subscribe(Events.ModuleToggled, (ev) => {
        if (this.settings.get("modules").value) this.log(`module ${ev.module.id} -> ${ev.active}`);
      }));
      this._eventSubs.push(this.subscribe(Events.Notification, (ev) => {
        if (ev.level === "error" && this.settings.get("errors").value) this.log(`error ${ev.text}`);
      }));
      for (const type of Object.values(Events)) {
        this._eventSubs.push(this.subscribe(type, (ev) => {
          if (this.settings.get("events").value) this.log(`event ${ev?.type ?? type}`);
        }));
      }
    }
    onDisable() {
      for (const s of this._eventSubs) s.dispose();
      this._eventSubs = [];
    }
    log(line) {
      const entry = `${(/* @__PURE__ */ new Date()).toLocaleTimeString()}  ${line}`;
      this.lines.push(entry);
      const max = this.settings.get("max-lines").value;
      while (this.lines.length > max) this.lines.shift();
      console.debug(`[meteor] ${line}`);
    }
  };
  var ServerInfo = class extends Module {
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
      if (this.settings.get("players").value && info.players !== void 0) parts.push(`${info.players} players`);
      return parts.join(" \xB7 ");
    }
  };
  function createMiscModules() {
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
      new ServerInfo()
    ];
  }

  // src/modules/hud-modules.js
  var LAYOUT_GROUP = "Layout";
  var HudModule = class extends Module {
    /**
     * @param {object} def plus {defaultX, defaultY}
     */
    constructor(def) {
      super({ category: "HUD", runsInMenus: true, ...def });
      const layout = this.settings.addGroup(LAYOUT_GROUP);
      this.hudX = layout.int("hud-x", "Horizontal position", def.defaultX ?? 4, { min: 0, max: 4e3 });
      this.hudY = layout.int("hud-y", "Vertical position", def.defaultY ?? 4, { min: 0, max: 4e3 });
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
  };
  var FpsDisplay = class extends HudModule {
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
  };
  var CpsCounter = class extends HudModule {
    constructor() {
      super({
        id: "cps-counter",
        name: "CPS Counter",
        description: "Clicks per second for the left and right mouse buttons.",
        defaultX: 4,
        defaultY: 22,
        sortKey: 20
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
      const cutoff = performance.now() - 1e3;
      while (arr.length && arr[0] < cutoff) arr.shift();
      return arr.length;
    }
    hudRender() {
      const parts = [];
      if (this.settings.get("show-left").value) parts.push(`${this._count(this._left)}`);
      if (this.settings.get("show-right").value) parts.push(`R ${this._count(this._right)}`);
      return `CPS: ${parts.join(" | ")}`;
    }
  };
  var Coordinates = class extends HudModule {
    constructor() {
      super({
        id: "coordinates",
        name: "Coordinates",
        description: "Shows the player's X/Y/Z position.",
        requiredCapabilities: ["world"],
        defaultX: 4,
        defaultY: 40
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
      if (!p) return "XYZ: \u2014";
      const prec = this.settings.get("precision").value;
      const fmt = (n) => Number(n).toFixed(prec);
      let out = this.settings.get("show-y").value ? `XYZ: ${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}` : `XZ: ${fmt(p.x)}, ${fmt(p.z)}`;
      if (this.settings.get("show-nether").value) {
        out += `  [N: ${fmt(p.x / 8)}, ${fmt(p.z / 8)}]`;
      }
      this._last = p;
      return out;
    }
  };
  var DirectionHud = class extends HudModule {
    constructor() {
      super({ id: "direction", name: "Direction", description: "Shows the compass direction the player faces.", requiredCapabilities: ["world"], defaultX: 4, defaultY: 58 });
    }
    hudRender(game) {
      const p = game?.getPlayer?.();
      if (!p || typeof p.yaw !== "number") return "Facing: \u2014";
      const yaw = (p.yaw % 360 + 360) % 360;
      const dirs = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
      const idx = Math.round(yaw / 45) % 8;
      return `Facing: ${dirs[idx]} (${Math.round(yaw)}\xB0)`;
    }
  };
  var Keystrokes = class extends HudModule {
    constructor() {
      super({ id: "keystrokes", name: "Keystrokes", description: "Shows WASD/space/mouse input while playing.", defaultX: 4, defaultY: 76 });
      this._spaceDown = false;
    }
    hudRender() {
      const kb = this.manager.client?.keybinds;
      const held = kb?.heldKeys ?? /* @__PURE__ */ new Set();
      const on = (code) => held.has(code) ? "\u2588" : "\xB7";
      const w = on("KeyW");
      const a = on("KeyA");
      const s = on("KeyS");
      const d = on("KeyD");
      const sp = held.has("Space") ? "\u2588\u2588\u2588\u2588\u2588" : "\xB7\xB7\xB7\xB7\xB7";
      if (!this.settings.get("compact").value) {
        return `  ${w}
${a} ${s} ${d}
${sp}`;
      }
      return `WASD ${w}${a}${s}${d}  SP ${on("Space")}`;
    }
    onInit() {
      const g = this.settings.addGroup("Display");
      g.bool("compact", "Compact single-line form", false);
    }
  };
  var ActiveModulesList = class extends HudModule {
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
  };
  var SessionTimer = class extends HudModule {
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
      const m = Math.floor(secs % 3600 / 60);
      const s = secs % 60;
      const time = `${h > 0 ? `${h}h ` : ""}${m}m ${String(s).padStart(2, "0")}s`;
      if (!this.settings.get("show-clock").value) return `Session: ${time}`;
      return `Session: ${time}
${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`;
    }
  };
  var SpeedHud = class extends HudModule {
    constructor() {
      super({ id: "speed-hud", name: "Speed", description: "Horizontal blocks per second.", requiredCapabilities: ["world"], defaultX: 4, defaultY: 240 });
      this._prev = null;
    }
    hudRender(game) {
      const p = game?.getPlayer?.();
      if (!p) return "Speed: \u2014";
      const now = performance.now();
      if (this._prev) {
        const dt = (now - this._prev.t) / 1e3;
        if (dt > 1e-3) {
          const dx = p.x - this._prev.x;
          const dz = p.z - this._prev.z;
          const bps = Math.sqrt(dx * dx + dz * dz) / dt;
          this._smooth = this._smooth === void 0 ? bps : this._smooth * 0.7 + bps * 0.3;
        }
      }
      this._prev = { x: p.x, z: p.z, t: now };
      return `Speed: ${(this._smooth ?? 0).toFixed(2)} b/s`;
    }
  };
  var CustomTextHud = class extends HudModule {
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
  };
  var ArmorHud = class extends HudModule {
    constructor() {
      super({
        id: "armor-hud",
        name: "Armor HUD",
        description: "Shows worn armour and durability (needs inventory access).",
        requiredCapabilities: ["inventory"],
        defaultX: 4,
        defaultY: 280
      });
    }
    hudRender(game) {
      const inv = game?.getInventory?.();
      const armor = (inv?.armor ?? []).filter(Boolean);
      if (!armor.length) return "Armor: none";
      return armor.filter(Boolean).map((a) => `${a.name} ${a.durability ?? "?"}/${a.maxDurability ?? "?"}`).join("\n");
    }
  };
  var PotionHud = class extends HudModule {
    constructor() {
      super({
        id: "potion-hud",
        name: "Potion HUD",
        description: "Shows active status effects (needs effect access).",
        defaultX: 4,
        defaultY: 320
      });
    }
    hudRender(game) {
      const effects = game?.getPlayer?.()?.effects;
      if (!effects || !effects.length) return "";
      return effects.map((e) => `${e.name} ${e.amplifier + 1} (${Math.ceil(e.duration / 20)}s)`).join("\n");
    }
  };
  var PerformanceMonitor = class extends HudModule {
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
      if (now - this._since > 1e3) {
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
  };
  function createHudModules() {
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
      new PerformanceMonitor()
    ];
  }

  // src/modules/index.js
  function createAllModules() {
    return [
      ...createCombatModules(),
      ...createMovementModules(),
      ...createRenderModules(),
      ...createWorldModules(),
      ...createMiscModules(),
      ...createHudModules()
    ];
  }

  // src/core/meteor.js
  var MeteorClient = class {
    constructor({ adapter, storage, modules, document: doc, window: win } = {}) {
      this.doc = doc ?? globalThis.document;
      this.win = win ?? globalThis.window;
      this.bus = new EventBus();
      this.adapter = adapter ?? new NullAdapter();
      this.stats = new Stats();
      this.theme = new Theme();
      this.version = "0.1.0";
      this.allowMultiplayerCombat = false;
      this._started = false;
      this._subs = [];
      this.modules = new ModuleManager({
        bus: this.bus,
        game: this.adapter,
        onNotify: (text, level) => this.notify(text, level)
      });
      this.modules.client = this;
      this.keybinds = new KeybindManager({ bus: this.bus, modules: this.modules });
      this.config = new ConfigManager({ modules: this.modules, notify: (t, l) => this.notify(t, l), storage });
      this.hud = new HUDManager({ modules: this.modules, theme: this.theme, game: this.adapter });
      this.tooltips = new Tooltips(() => this.clickgui?.tooltipEl);
      this.toasts = new Toasts(() => this.clickgui?.toastWrap);
      this.clickgui = new ClickGUI({
        modules: this.modules,
        theme: this.theme,
        keybinds: this.keybinds,
        tooltips: this.tooltips,
        hudEditor: this.hud,
        config: this.config,
        notify: (t, l) => this.notify(t, l)
      });
      this.ticker = new Ticker({
        hz: 20,
        onTick: (ticks) => this._clientTick(ticks),
        onFrame: (now) => this._frame(now)
      });
      this.errorLog = [];
      setErrorSink((event, err) => {
        this.errorLog.push({ at: Date.now(), event: event?.type, message: String(err?.message ?? err) });
        if (this.errorLog.length > 200) this.errorLog.shift();
      });
      this._moduleFactory = modules ?? createAllModules;
    }
    // -- lifecycle ------------------------------------------------------------
    init() {
      ensureStyles(this.doc);
      this.theme._applyCssVars(this.doc.documentElement);
      const list = typeof this._moduleFactory === "function" ? this._moduleFactory() : this._moduleFactory;
      this.modules.registerAll(list);
      this._registerSystem("theme", {
        save: () => this.theme.serialise(),
        load: (d) => this.theme.load(d),
        reset: () => this.theme.reset()
      });
      this._registerSystem("hud", {
        save: () => this.hud.serialise(),
        load: (d) => this.hud.load(d),
        reset: () => this.hud.resetLayout()
      });
      this._registerSystem("gui", {
        save: () => this.clickgui.serialiseLayout(),
        load: (d) => this.clickgui.loadLayout(d)
      });
      const waypoints = this.modules.get("waypoints");
      if (waypoints) {
        this._registerSystem("waypoints", {
          save: () => waypoints.serialise(),
          load: (d) => waypoints.load(d),
          reset: () => waypoints.reset()
        });
      }
      const macros = this.modules.get("macros");
      if (macros) {
        this._registerSystem("macros", {
          save: () => macros.serialise(),
          load: (d) => macros.load(d),
          reset: () => macros.reset()
        });
      }
      const friends = this.modules.get("friend-manager");
      if (friends) {
        this._registerSystem(
          "friends",
          {
            save: () => friends.list(),
            load: (d) => {
              friends.friends = new Set(Array.isArray(d) ? d.map(String).slice(0, 500) : []);
              return true;
            },
            reset: () => {
              friends.friends.clear();
            }
          },
          (raw) => Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : null
        );
      }
      const session = this.modules.get("session-stats");
      if (session) {
        this._registerSystem("session-stats", {
          save: () => session.serialise(),
          load: (d) => session.load(d),
          reset: () => session.reset()
        });
      }
      this.clickgui.mount(this.doc.body);
      this.hud.mount(this.doc.body);
      this.keybinds.onToggleRequest = () => this.clickgui.toggle();
      this._subs.push(
        this.bus.on(Events.ModuleToggled, (ev) => {
          if (ev.module?.category === "HUD") this.hud.sync();
          if (!this.modules._suspendCallbacks) this.config.save(false);
        })
      );
      this._onBeforeUnload = () => this.config.save(true);
      this.win?.addEventListener?.("beforeunload", this._onBeforeUnload);
      this._onVisibility = () => {
        if (this.doc.hidden) this.config.save(true);
      };
      this.doc?.addEventListener?.("visibilitychange", this._onVisibility);
      this._onResize = () => this.hud.sync();
      this.win?.addEventListener?.("resize", this._onResize);
      return this;
    }
    _registerSystem(name, system, sanitiser) {
      this.config.registerSystem(name, system, sanitiser);
    }
    start() {
      if (this._started) return this;
      this._started = true;
      this.keybinds.attach(this.win ?? this.doc);
      this.config.load();
      this.hud.sync();
      this.ticker.start();
      this.bus.emit(Events.Connect, { reason: "client-start" });
      return this;
    }
    stop() {
      if (!this._started) return this;
      this._started = false;
      this.ticker.stop();
      this.keybinds.dispose();
      this.win?.removeEventListener?.("beforeunload", this._onBeforeUnload);
      this.doc?.removeEventListener?.("visibilitychange", this._onVisibility);
      this.win?.removeEventListener?.("resize", this._onResize);
      for (const s of this._subs) s.dispose();
      this._subs = [];
      this.config.save(true);
      this.modules.disableAll();
      this.clickgui.dispose();
      this.hud.dispose();
      return this;
    }
    // -- adapter swapping -----------------------------------------------------
    /**
     * Swap the game adapter (world load/unload, server join, menu return).
     * Enabled modules whose capabilities vanish are disabled cleanly.
     */
    setAdapter(adapter) {
      const prevInWorld = this.adapter?.inWorld?.() ?? false;
      this.adapter = adapter ?? new NullAdapter();
      this.modules.game = this.adapter;
      this.hud.game = this.adapter;
      const nowInWorld = this.adapter.inWorld?.() ?? false;
      if (prevInWorld && !nowInWorld) {
        this.bus.emit(Events.WorldUnload, {});
      }
      if (!prevInWorld && nowInWorld) {
        this.bus.emit(Events.WorldLoad, {});
      }
      this.modules.revalidateAll();
      this.hud.sync();
      return this;
    }
    isRemoteSession() {
      return this.adapter?.isRemote?.() ?? false;
    }
    isFriend(name) {
      const fm = this.modules.get("friend-manager");
      return fm ? fm.isFriend(name) : false;
    }
    // -- loop -----------------------------------------------------------------
    _clientTick(ticks) {
      const t0 = performance.now();
      try {
        this.bus.emit(Events.ClientTick, { ticks });
        this.adapter?.update?.(ticks);
        this.modules.revalidateAll({ silent: true });
        for (const event of this.adapter?.drainEvents?.() ?? []) this.bus.emit(event.type, event);
        if (this.adapter?.isTyping) this.keybinds.typing = this.adapter.isTyping();
        this.modules.tick(ticks);
      } catch (err) {
        this.notify(`client tick error: ${err.message}`, "error");
        console.error("[meteor] client tick failed", err);
      } finally {
        this.stats.measureTick(performance.now() - t0);
      }
    }
    _frame(now) {
      this.stats.frame(now);
      this.hud.refresh();
    }
    // -- notifications --------------------------------------------------------
    notify(text, level = "info") {
      const notif = this.modules.get("notifications");
      if (notif && notif.active) {
        notif.handle(text, level);
        this.bus.emit(Events.Notification, { text, level, __handledBy: true });
        return true;
      }
      this.toasts?.push(text, level);
      this.bus.emit(Events.Notification, { text, level, __handledBy: true });
      return true;
    }
    // -- introspection --------------------------------------------------------
    /** Catalogue for the docs/tests: every module with its metadata. */
    catalogue() {
      return this.modules.all().map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        description: m.description,
        unsupported: m.unsupported,
        unsupportedReason: m.unsupportedReason,
        requiredCapabilities: m.requiredCapabilities,
        settings: m.settings.all().map((s) => ({ name: s.name, type: s.constructor.name, value: s.value }))
      }));
    }
    diagnostics() {
      return {
        version: this.version,
        categories: CATEGORIES.map((c) => c.id),
        modules: this.modules.all().length,
        active: this.modules.activeCount(),
        listeners: this.bus.totalListeners(),
        adapter: this.adapter?.runtimeName,
        capabilities: [...this.adapter?.capabilities ?? []],
        stats: this.stats.snapshot(),
        errors: this.errorLog.slice(-10),
        config: this.config.diagnostics()
      };
    }
  };

  // src/index.js
  var instance = null;
  function bootMeteor(options = {}) {
    if (instance && !options.fresh) return instance;
    if (instance) shutdownMeteor();
    const client = new MeteorClient(options);
    client.init();
    client.start();
    instance = client;
    return client;
  }
  function getMeteor() {
    return instance;
  }
  function shutdownMeteor() {
    instance?.stop();
    instance = null;
  }
  if (typeof window !== "undefined") {
    window.Meteor = window.Meteor ?? {};
    Object.assign(window.Meteor, {
      boot: bootMeteor,
      get: getMeteor,
      shutdown: shutdownMeteor,
      MeteorClient,
      Events,
      Module,
      Settings,
      SettingGroup
    });
  }
  return __toCommonJS(index_exports);
})();
