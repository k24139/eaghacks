/**
 * Typed event bus modelled on Meteor Client's Orbit event bus.
 *
 * Differences from Orbit that matter for a JS/WASM runtime:
 *  - Subscription handles are first-class (`dispose()`), so a module can be
 *    unsubscribed deterministically when it is disabled. Leaked listeners are
 *    the single easiest way to kill frame time in a browser game.
 *  - Dispatch never throws out of `emit()`: a misbehaving listener is reported
 *    to the error sink and skipped, which satisfies the "one module failing must
 *    not disable unrelated modules" requirement.
 *  - Events are plain objects; `cancel()` mutates the event. Cancellation is
 *    only honoured by dispatchers that opt in via `emitCancellable()`.
 */

/** Sink used for listener errors. Never let a module crash the host. */
let errorSink = (event, err) => {
  // eslint-disable-next-line no-console
  console.error("[meteor] listener threw", event?.type ?? "(unknown)", err);
};

export function setErrorSink(fn) {
  if (typeof fn === "function") errorSink = fn;
}

export class CancellableEvent {
  constructor(type) {
    this.type = type;
    this.cancelled = false;
  }
  cancel() {
    this.cancelled = true;
  }
}

/**
 * A module-bound subscription. Modules should keep these and dispose them in
 * their disable/cleanup path.
 */
export class Subscription {
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
}

/** Groups subscriptions so a module can dispose them all with one call. */
export class SubscriptionBag {
  constructor() {
    this._subs = new Set();
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
}

export class EventBus {
  constructor() {
    /** @type {Map<string, Array<{listener:Function, priority:number}>>} */
    this._listeners = new Map();
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
    // Insert keeping descending priority; stable for equal priorities.
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
      opts,
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
      // Snapshot: a listener may subscribe/unsubscribe mid-dispatch.
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
}

/**
 * Canonical event names. Keeping them as constants avoids the "typo silently
 * subscribes to nothing" class of bug, which is very hard to notice at runtime.
 */
export const Events = Object.freeze({
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
  PacketSend: "packet-send",
});
