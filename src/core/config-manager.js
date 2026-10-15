/**
 * Configuration manager, modelled on Meteor's `systems/config` + `profiles`.
 *
 * Meteor stores NBT on disk. In the browser the equivalent is `localStorage`,
 * but the *contract* ported here is what actually matters:
 *   - modules save name, keybind, favourite, active flag and their settings
 *   - only values differing from defaults are written
 *   - a corrupt config can never prevent startup (every read is validated and
 *     falls back to defaults, recording the failure)
 *   - named profiles, with export/import for sharing
 *
 * Storage is wrapped so the same manager works in a browser (localStorage), in
 * a test runner (in-memory map) and inside a sandboxed iframe where
 * localStorage throws on access.
 */

export const CONFIG_VERSION = 1;

class MemoryStorage {
  constructor() {
    this._m = new Map();
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
}

/**
 * Wrap a Storage-like object and swallow the "storage disabled / quota" class
 * of errors so a locked-down browser cannot crash the client.
 */
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

export class ConfigManager {
  /**
   * @param {object} deps
   * @param {import('./module-manager.js').ModuleManager} deps.modules
   * @param {(text:string, level?:string)=>void} [deps.notify]
   * @param {StorageLike} [deps.storage]
   */
  constructor({ modules, notify, storage, prefix = "meteor.eagler" } = {}) {
    this.modules = modules;
    this.prefix = prefix;
    this._notify = notify ?? (() => {});
    this._storage = safeStorage(storage ?? globalThis.localStorage, this._notify);
    /** Extra systems that want to persist state (HUD, theme, macros). */
    this._systems = new Map();
    /** @type {Map<string,(data:any)=>any>} per-system sanitisers */
    this._sanitisers = new Map();
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
        // `bind` is stored explicitly below so the GUI can show it even when it
        // equals the default.
        const v = s.serialise();
        if (v !== undefined) {
          settings[s.name] = v;
          any = true;
        }
      }
      const entry = { id: m.id };
      if (any) entry.settings = settings;
      if (m.active) entry.active = true;
      if (this.modules.isFavourite(m)) entry.favourite = true;
      // Only persist the module entry if it holds non-default state.
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
    // Suspend notifications while restoring so a 40-module profile does not
    // spam the HUD with 40 "enabled" toasts.
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
          // Module removed in an update — expected, not an error worth alarming
          // the user about, but worth recording.
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
          // Enable after settings are applied. Failures (missing capability,
          // unsupported) are non-fatal and reported by the module itself.
          if (m.canEnable()) {
            m._active = true;
            this.modules._active.add(m);
            this.modules.runGuarded(m, "onEnable", () => m.onEnable());
          } else {
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
      savedAt: new Date().toISOString(),
      profile: this._activeProfile,
      modules: this.serialiseModules(),
      systems,
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
      // Future config from a newer build: try best-effort, but say so.
      diag.errors.push(`config version ${data.version} is newer than ${CONFIG_VERSION}; loading best-effort`);
    }
    const modDiag = this.deserialiseModules(data.modules);
    diag.recovered ||= modDiag.recovered;
    diag.errors.push(...modDiag.errors);
    diag.loadedSettings += modDiag.loadedSettings;

    if (data.systems && typeof data.systems === "object") {
      for (const [name, sys] of this._systems) {
        const raw = data.systems[name];
        if (raw === undefined || raw === null) continue;
        try {
          const sanitiser = this._sanitisers.get(name);
          const clean = sanitiser ? sanitiser(raw) : raw;
          if (clean === undefined || clean === null) {
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
      // Coalesce a burst of toggles into one write. Config writes are the
      // classic cause of frame hitches in browser clients.
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
      // No saved config for this profile: start from a clean slate. Without
      // this, switching to a brand-new profile would keep the previous
      // profile's in-memory settings.
      this._resetToDefaults();
      this.lastLoadDiagnostics = { recovered: false, errors: [], loadedSettings: 0 };
      return this.lastLoadDiagnostics;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // Corrupt JSON: quarantine it instead of losing it, then continue with
      // defaults. This is the "corrupt config must not block startup" rule.
      this._quarantine(raw);
      const diag = { recovered: true, errors: [`config was not valid JSON (${err.message}); quarantined`], loadedSettings: 0 };
      this.lastLoadDiagnostics = diag;
      this._notify("config file was corrupt and has been quarantined", "warn");
      return diag;
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
      /* best effort */
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
        /* a system that cannot reset must not block the reset */
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
      /* fall through */
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
      /* ignore */
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
        // Not base64 — accept plain JSON too.
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
      moduleErrors: this.modules.errors().length,
    };
  }
}

// ---------------------------------------------------------------------------
// base64 helpers that work in browser and node without Buffer
// ---------------------------------------------------------------------------

export function base64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  if (typeof btoa === "function") {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  return Buffer.from(bytes).toString("base64");
}

export function base64Decode(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}
