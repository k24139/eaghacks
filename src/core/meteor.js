/**
 * MeteorClient — the bootstrap that owns every subsystem and the client tick.
 *
 * Design notes:
 *  - One place owns DOM listeners and one place owns the tick, so nothing else
 *    can leak listeners or run an uncoordinated animation frame.
 *  - Adapter swaps are supported: `setAdapter()` revalidates every enabled
 *    module, so entering/leaving a world (or a new server) cleanly disables
 *    modules whose capabilities disappeared and re-enables nothing implicitly.
 *  - Everything is wrapped so a failure in the framework surfaces as a toast +
 *    console error, never an unhandled exception that kills the game loop.
 */
import { EventBus, Events, setErrorSink } from "./event-bus.js";
import { ModuleManager, CATEGORIES } from "./module-manager.js";
import { KeybindManager } from "./keybind-manager.js";
import { ConfigManager } from "./config-manager.js";
import { Stats, Ticker } from "./stats.js";
import { GameAdapter, NullAdapter } from "./adapter.js";
import { Theme, ensureStyles } from "../gui/theme.js";
import { ClickGUI, Tooltips, Toasts } from "../gui/clickgui.js";
import { HUDManager } from "../gui/hud.js";
import { createAllModules } from "../modules/index.js";

export class MeteorClient {
  constructor({ adapter, storage, modules, document: doc, window: win } = {}) {
    this.doc = doc ?? globalThis.document;
    this.win = win ?? globalThis.window;
    this.bus = new EventBus();
    this.adapter = adapter ?? new NullAdapter();
    this.stats = new Stats();
    this.theme = new Theme();
    this.version = "0.1.0";
    /** Opt-in guard for intrusive modules on remote servers. */
    this.allowMultiplayerCombat = false;
    this._started = false;
    this._subs = [];

    this.modules = new ModuleManager({
      bus: this.bus,
      game: this.adapter,
      onNotify: (text, level) => this.notify(text, level),
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
      notify: (t, l) => this.notify(t, l),
    });

    this.ticker = new Ticker({
      hz: 20,
      onTick: (ticks) => this._clientTick(ticks),
      onFrame: (now) => this._frame(now),
    });

    // External error reporting hook (used by the debug console / tests).
    this.errorLog = [];
    setErrorSink((event, err) => {
      this.errorLog.push({ at: Date.now(), event: event?.type, message: String(err?.message ?? err) });
      if (this.errorLog.length > 200) this.errorLog.shift();
    });

    // Supply the module list (tests inject a subset).
    this._moduleFactory = modules ?? createAllModules;
  }

  // -- lifecycle ------------------------------------------------------------

  init() {
    ensureStyles(this.doc);
    this.theme._applyCssVars(this.doc.documentElement);
    const list = typeof this._moduleFactory === "function" ? this._moduleFactory() : this._moduleFactory;
    this.modules.registerAll(list);

    // Persistent auxiliary systems, saved alongside modules.
    this._registerSystem("theme", {
      save: () => this.theme.serialise(),
      load: (d) => this.theme.load(d),
      reset: () => this.theme.reset(),
    });
    this._registerSystem("hud", {
      save: () => this.hud.serialise(),
      load: (d) => this.hud.load(d),
      reset: () => this.hud.resetLayout(),
    });
    this._registerSystem("gui", {
      save: () => this.clickgui.serialiseLayout(),
      load: (d) => this.clickgui.loadLayout(d),
    });
    const waypoints = this.modules.get("waypoints");
    if (waypoints) {
      this._registerSystem("waypoints", {
        save: () => waypoints.serialise(),
        load: (d) => waypoints.load(d),
        reset: () => waypoints.reset(),
      });
    }
    const macros = this.modules.get("macros");
    if (macros) {
      this._registerSystem("macros", {
        save: () => macros.serialise(),
        load: (d) => macros.load(d),
        reset: () => macros.reset(),
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
          },
        },
        (raw) => (Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : null),
      );
    }
    const session = this.modules.get("session-stats");
    if (session) {
      this._registerSystem("session-stats", {
        save: () => session.serialise(),
        load: (d) => session.load(d),
        reset: () => session.reset(),
      });
    }

    this.clickgui.mount(this.doc.body);
    this.hud.mount(this.doc.body);

    // Route the GUI open/close bind through the keybind manager.
    this.keybinds.onToggleRequest = () => this.clickgui.toggle();

    // Keep the HUD node set in step with module toggles.
    this._subs.push(
      this.bus.on(Events.ModuleToggled, (ev) => {
        if (ev.module?.category === "HUD") this.hud.sync();
        if (!this.modules._suspendCallbacks) this.config.save(false);
      }),
    );

    // Persist on navigation/unload; a debounced save could be lost otherwise.
    this._onBeforeUnload = () => this.config.save(true);
    this.win?.addEventListener?.("beforeunload", this._onBeforeUnload);
    this._onVisibility = () => {
      if (this.doc.hidden) this.config.save(true);
    };
    this.doc?.addEventListener?.("visibilitychange", this._onVisibility);
    // Resizing keeps HUD elements on-screen (they are absolutely positioned).
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
    // Persist *before* tearing module state down: disableAll() clears the active
    // flags, and saving afterwards would write "everything disabled" over the
    // user's real configuration.
    this.config.save(true);
    this.modules.disableAll();
    // Remove the GUI/HUD DOM and their window listeners so a stopped client
    // leaves nothing behind (and a restarted one does not stack duplicate UIs).
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
      this.modules.revalidateAll({silent:true});
      for(const event of this.adapter?.drainEvents?.() ?? [])this.bus.emit(event.type,event);
      if(this.adapter?.isTyping)this.keybinds.typing=this.adapter.isTyping();
      this.modules.tick(ticks);
    } catch (err) {
      this.notify(`client tick error: ${err.message}`, "error");
      // eslint-disable-next-line no-console
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
    // Route through the notification module when it is enabled so users can
    // filter; otherwise fall back to the raw toast.
    const notif = this.modules.get("notifications");
    if (notif && notif.active) {
      notif.handle(text, level);
      this.bus.emit(Events.Notification, { text, level, __handledBy: true });
      return true;
    }
    // `toasts` may not exist yet: subsystems constructed before the GUI (the
    // config manager) can notify during their own construction.
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
      settings: m.settings.all().map((s) => ({ name: s.name, type: s.constructor.name, value: s.value })),
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
      capabilities: [...(this.adapter?.capabilities ?? [])],
      stats: this.stats.snapshot(),
      errors: this.errorLog.slice(-10),
      config: this.config.diagnostics(),
    };
  }
}

export { GameAdapter, NullAdapter };
