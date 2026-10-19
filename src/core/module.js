/**
 * Module base class and lifecycle, modelled on Meteor Client's
 * `systems/modules/Module`.
 *
 * Lifecycle summary:
 *   onInit()    -> once, at registration, always safe to run (no game needed)
 *   onEnable()  -> when toggled on  (may touch game state -> must be guarded)
 *   onDisable() -> when toggled off (MUST fully undo onEnable)
 *   onTick(dt)  -> per client tick while enabled
 *   onRender(ctx) -> per frame while enabled
 *
 * Every callback is wrapped by the manager: a throwing callback disables only
 * that module and records the error, so one bad module cannot take the client
 * down. Modules additionally declare `requiredCapabilities`, which the manager
 * checks against the active GameAdapter before allowing enable — this is how
 * features that the runtime cannot support stay honestly disabled instead of
 * half-working.
 */
import { Settings, SettingGroup, BoolSetting, KeybindSetting, describeKeybind } from "./settings.js";
import { SubscriptionBag } from "./event-bus.js";

let moduleCounter = 0;

export class Module {
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
    /** @type {KeybindSetting} */
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
      // If the module was disabled by an earlier failure in this dispatch,
      // do not run its handler again.
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
      // Cleanup must run even if onDisable throws, otherwise a broken module
      // leaks listeners/state forever.
      this._manager?.runGuarded(this, "onDisable", () => this.onDisable());
      this._subs.dispose();
      this._subs = new SubscriptionBag();
    }
    // If onEnable threw, runGuarded may have force-disabled us already.
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

  onInit() {}
  onEnable() {}
  onDisable() {}
  /** @param {number} dtDeltaTicks */
  onTick(_dtDeltaTicks) {}
  /** @param {CanvasRenderingContext2D} ctx @param {object} frame */
  onRender(_ctx, _frame) {}

  /** Extra diagnostic rows surfaced in the GUI. */
  statusLines() {
    const out = [];
    if (this.unsupported) out.push({ label: "status", value: "unsupported" });
    if (this._lastError) out.push({ label: "last error", value: String(this._lastError.message ?? this._lastError) });
    return out;
  }
}
