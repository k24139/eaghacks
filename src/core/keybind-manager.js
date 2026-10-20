/**
 * Keybind manager — one place that owns DOM input listeners.
 *
 * Meteor binds keys inside Minecraft's own key handling. In the browser we must
 * attach listeners to `window`/`document`, and the cardinal sin there is
 * interception that also swallows gameplay keys. Rules implemented here:
 *
 *  - Never `preventDefault()`/`stopPropagation()` on a key unless the ClickGUI
 *    is open or we are actively capturing a bind. Gameplay keys must pass
 *    through untouched.
 *  - Ignore input while the player is typing (chat / the game's own text
 *    fields) unless a capture is in progress.
 *  - Bind capture is explicit and consumes exactly the next event, then exits.
 *  - All listeners are removable via dispose(), and are re-attachable on
 *    pointer-lock changes so a lost lock does not leave stale state.
 */
import { keybindFromKeyboardEvent, keybindFromMouseEvent, describeKeybind } from "./settings.js";

export class KeybindManager {
  /**
   * @param {object} deps
   * @param {import('./event-bus.js').EventBus} deps.bus
   * @param {import('./module-manager.js').ModuleManager} [deps.modules]
   */
  constructor({ bus, modules } = {}) {
    this.bus = bus;
    this.modules = modules ?? null;
    /** Keybinds that open/close the ClickGUI. */
    this.guiBinds = [
      { key: "ShiftRight", mouse: null, modifiers: {} },
      { key: null, mouse: 2, modifiers: {} }, // middle click, a common Meteor alternative
    ];
    this.closeBinds = [{ key: "Escape", mouse: null, modifiers: {} }];
    /** @type {null | ((kb:object|null)=>void)} */
    this._captureCallback = null;
    this._target = null;
    this._attached = false;
    this._disposed = false;
    /** Set by the GUI so gameplay input is suppressed while it is open. */
    this.guiOpen = false;
    /** Cooperative flag the host can raise while a text field has focus. */
    this.typing = false;
    /** @type {string|null} */
    this._awaitingRelease = null;
    /** @type {Set<string>} keys currently held, for HUD keystrokes */
    this.heldKeys = new Set();
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
      const kb = keybindFromKeyboardEvent(e);
      cb(kb);
      return;
    }

    // Gameplay input must flow through unless the GUI owns it.
    const isGuiKey = this._matchesAny(e, this.guiBinds);
    const isCloseKey = this.guiOpen && this._matchesAny(e, this.closeBinds);

    this.heldKeys.add(e.code || e.key);

    if (isGuiKey || isCloseKey) {
      // Only now may we consume the event.
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      this.onToggleRequest?.();
      return;
    }

    if (this.guiOpen) {
      // Let text fields and native controls receive their editing keys.
      // Stop propagation so those keys cannot reach the game listeners.
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
        e.stopPropagation();
        return;
      }
      // GUI is modal: swallow gameplay keys so the player does not move while
      // interacting with windows. Escape handled above.
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
      // Not a client bind — let the game have it. We never preventDefault here.
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
      // GUI widgets manage their own handlers; do not forward to the game.
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
      // Preserve native scrolling inside the GUI without forwarding hotbar input.
      e.stopPropagation();
      return;
    }
    this.bus?.emit("mouse-scroll", { event: e, deltaY: e.deltaY, deltaX: e.deltaX });
  }

  _handleBlur() {
    // Losing focus must not leave keys "stuck" — the game would keep walking.
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
    // Movement + interaction keys the game listens for. Blocking these while
    // the GUI is open is intentional; blocking anything else would break
    // browser shortcuts.
    const gameplay = new Set([
      "KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ControlLeft",
      "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7",
      "Digit8", "Digit9", "KeyE", "KeyQ", "KeyT", "KeyF",
    ]);
    return gameplay.has(e.code);
  }
}

export { describeKeybind };
