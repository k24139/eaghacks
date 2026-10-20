/**
 * Setting schema, modelled on Meteor Client's `systems/settings`.
 *
 * Every setting serialises to JSON (not NBT) because persistence is browser
 * storage here. The contract ported from Meteor: stable names, defaults,
 * validation, visibility predicates, change callbacks, and "only persist
 * values that differ from the default" so configs stay small and readable.
 *
 * Robustness rules that matter for a live game:
 *  - `parse()` never throws. Bad saved data falls back to the default and the
 *    failure is recorded on the setting (`lastParseError`) rather than
 *    aborting startup. This is what makes corrupt configs non-fatal.
 *  - `set()` validates and coerces, so a module can never end up holding a
 *    string where it expects a number.
 */

let idCounter = 0;

export class Setting {
  constructor(name, description, defaultValue) {
    if (!name) throw new Error("Setting requires a stable name");
    this.name = name;
    this.description = description ?? "";
    this.defaultValue = defaultValue;
    this._value = defaultValue;
    /** @type {null | (() => boolean)} */
    this.visibility = null;
    /** @type {Array<(value:any, setting:Setting)=>void>} */
    this._listeners = [];
    /** @type {null | Error} */
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
    if (coerced === undefined) {
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
        // A change callback must not break the module system.
        // eslint-disable-next-line no-console
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
    if (this.isDefault) return undefined;
    return this._value;
  }

  /**
   * Apply a previously serialised value without throwing.
   * @returns {boolean} success
   */
  deserialise(raw) {
    if (raw === undefined || raw === null) {
      this._value = this.defaultValue;
      return true;
    }
    const parsed = this.parse(raw);
    if (parsed === undefined) {
      this.lastParseError = new Error(`could not deserialise '${this.name}' from ${JSON.stringify(raw)}`);
      this._value = this.defaultValue;
      return false;
    }
    this._value = parsed;
    return true;
  }
}

export class BoolSetting extends Setting {
  constructor(name, description, defaultValue = false) {
    super(name, description, !!defaultValue);
  }
  parse(v) {
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1 || v === "1") return true;
    if (v === "false" || v === 0 || v === "0") return false;
    return undefined;
  }
}

export class IntSetting extends Setting {
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
    if (!Number.isFinite(n)) return undefined;
    return clampInt(Math.round(n), this.min, this.max);
  }
}

export class DoubleSetting extends Setting {
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
    if (!Number.isFinite(n)) return undefined;
    const rounded = Number(n.toFixed(this.precision));
    return clampDouble(rounded, this.min, this.max);
  }
}

export class StringSetting extends Setting {
  constructor(name, description, defaultValue = "", { maxLength = 256, placeholder = "" } = {}) {
    super(name, description, String(defaultValue ?? ""));
    this.maxLength = maxLength;
    this.placeholder = placeholder;
  }
  parse(v) {
    if (v === null || v === undefined) return undefined;
    const s = String(v);
    return s.length > this.maxLength ? s.slice(0, this.maxLength) : s;
  }
}

export class EnumSetting extends Setting {
  /** @param {string[]} options */
  constructor(name, description, defaultValue, options) {
    const opts = options.slice();
    const d = opts.includes(defaultValue) ? defaultValue : opts[0];
    super(name, description, d);
    this.options = opts;
    this._value = d;
  }
  parse(v) {
    if (typeof v !== "string") return undefined;
    // Case-insensitive match keeps hand-edited configs working.
    const exact = this.options.find((o) => o === v);
    if (exact) return exact;
    return this.options.find((o) => o.toLowerCase() === v.toLowerCase());
  }
}

/**
 * Colour stored as { r, g, b, a } with 0-255 channels, plus a hex helper.
 * Meteor stores an integer + rainbow flag; we keep the object form because the
 * GUI needs the channels every frame and this avoids bit-twiddling in render
 * code (a per-frame allocation/cpu saving).
 */
export class ColorSetting extends Setting {
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
    if (coerced === undefined) {
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
        // eslint-disable-next-line no-console
        console.error(`[meteor] onChanged for '${this.name}' threw`, err);
      }
    }
    return true;
  }
  serialise() {
    const base = { ...this._value };
    if (this.rainbow) base.rainbow = true;
    if (this.isDefault && !this.rainbow) return undefined;
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
}

/** Keybind value: { key: string|null, mouse: number|null, modifiers: {ctrl,alt,shift} } */
export class KeybindSetting extends Setting {
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
    if (coerced === undefined) return false;
    const prev = this._value;
    if (sameKeybind(prev, coerced)) return false;
    this._value = coerced;
    for (const fn of this._listeners) {
      try {
        fn(coerced, this, prev);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[meteor] onChanged for '${this.name}' threw`, err);
      }
    }
    return true;
  }
  serialise() {
    if (this.isDefault) return undefined;
    return this._value;
  }
  deserialise(raw) {
    this._value = normaliseKeybind(raw) ?? null;
    return true;
  }
  describe() {
    return describeKeybind(this._value);
  }
}

/**
 * A named group of settings (Meteor's `SettingGroup`). Groups are what the
 * module settings panel renders as expandable sections.
 */
export class SettingGroup {
  /**
   * @param {string} name
   * @param {{expanded?:boolean}} [opts]
   * @param {Settings} [owner] back-reference so group-added settings are indexed
   */
  constructor(name, { expanded = true } = {}, owner = null) {
    this.name = name;
    this.expanded = expanded;
    this.owner = owner;
    /** @type {Setting[]} */
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
}

/** Holds every group for a module and flattens lookups. */
export class Settings {
  constructor() {
    /** @type {SettingGroup[]} */
    this.groups = [];
    this._index = new Map();
    /** @type {SettingGroup} */
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
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

/** Accepts {r,g,b,a}, "#rrggbb(aa)", [r,g,b,a] or a hex int. */
export function normaliseColor(v) {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) {
    const [r, g, b, a = 255] = v;
    return packColor(r, g, b, a);
  }
  if (typeof v === "number") {
    // 0xRRGGBB or 0xRRGGBBAA
    if (v <= 0xffffff) return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 255 };
    return { r: (v >>> 24) & 255, g: (v >>> 16) & 255, b: (v >>> 8) & 255, a: v & 255 };
  }
  if (typeof v === "string") {
    const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v.trim());
    if (!m) return undefined;
    const int = parseInt(m[1], 16);
    const a = m[2] ? parseInt(m[2], 16) : 255;
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a };
  }
  if (typeof v === "object") {
    return packColor(v.r, v.g, v.b, v.a ?? 255);
  }
  return undefined;
}

function packColor(r, g, b, a) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
  return { r: c(r), g: c(g), b: c(b), a: c(a) };
}

function normaliseKeybind(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return { key: v, mouse: null, modifiers: {} };
  if (typeof v === "number") return { key: null, mouse: v, modifiers: {} };
  if (typeof v === "object") {
    return {
      key: typeof v.key === "string" ? v.key : null,
      mouse: typeof v.mouse === "number" ? v.mouse : null,
      modifiers: v.modifiers && typeof v.modifiers === "object" ? v.modifiers : {},
    };
  }
  return undefined;
}

function sameKeybind(a, b) {
  if (a === null && b === null) return true;
  if (!a || !b) return false;
  const ma = a.modifiers ?? {};
  const mb = b.modifiers ?? {};
  return (
    a.key === b.key &&
    a.mouse === b.mouse &&
    !!ma.ctrl === !!mb.ctrl &&
    !!ma.alt === !!mb.alt &&
    !!ma.shift === !!mb.shift
  );
}

export function describeKeybind(kb) {
  if (!kb) return "none";
  const parts = [];
  const m = kb.modifiers ?? {};
  if (m.ctrl) parts.push("Ctrl");
  if (m.alt) parts.push("Alt");
  if (m.shift) parts.push("Shift");
  if (kb.mouse !== null && kb.mouse !== undefined) parts.push(`Mouse${kb.mouse}`);
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

/** Build a keybind from a DOM KeyboardEvent. */
export function keybindFromKeyboardEvent(e) {
  if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return null;
  return {
    key: e.code || e.key,
    mouse: null,
    modifiers: { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey && e.code !== "ShiftLeft" && e.code !== "ShiftRight" },
  };
}

/** Build a keybind from a DOM MouseEvent button index. */
export function keybindFromMouseEvent(e, button) {
  return {
    key: null,
    mouse: button,
    modifiers: { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey },
  };
}
