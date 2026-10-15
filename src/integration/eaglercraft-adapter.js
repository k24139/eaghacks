/**
 * Browser-facing Eaglercraft 26.2-u1 adapter.
 *
 * The standalone TeaVM/WASM build does not export player/world/entity objects,
 * so this adapter deliberately exposes only capabilities that can be verified
 * at the browser boundary. The official eaglercraftXOpts screenChanged hook is
 * installed by tools/inject-eaglercraft.mjs before the game boots.
 */
import { GameAdapter } from '../core/adapter.js';

const KEY_INFO = Object.freeze({
  KeyW: { key: 'w', code: 'KeyW' },
  KeyA: { key: 'a', code: 'KeyA' },
  KeyS: { key: 's', code: 'KeyS' },
  KeyD: { key: 'd', code: 'KeyD' },
  Space: { key: ' ', code: 'Space' },
  ShiftLeft: { key: 'Shift', code: 'ShiftLeft' },
  ControlLeft: { key: 'Control', code: 'ControlLeft' },
});

export class EaglercraftBrowserAdapter extends GameAdapter {
  constructor({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
    super();
    this.win = win;
    this.doc = doc;
    this.runtimeName = 'eaglercraft-26.2-u1-browser';
    this.startedAt = Date.now();
    // `input` means browser input can be observed/injected. It is intentionally
    // separate from `movement`, which implies direct player physics access.
    this.capabilities = new Set(win?.addEventListener ? ['input'] : []);
    this.overlay = null;
    this.ctx = null;
    this._lastFrame = 0;
    this._fps = 0;
    this._lastFrameMs = 0;
    this._mounted = false;
    this._syntheticHeld = new Set();
    this.ready = false;
  }

  mount() {
    if (this._mounted) return this;
    if (!this.doc?.body || !this.doc.createElement) return this;
    const canvas = this.doc.createElement('canvas');
    canvas.id = 'eaghacks-hud-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
      'pointer-events:none', 'z-index:2147481900', 'display:block',
    ].join(';');
    this.doc.body.appendChild(canvas);
    const ctx = canvas.getContext?.('2d');
    if (!ctx) {
      canvas.remove();
      return this;
    }
    this.overlay = canvas;
    this.ctx = ctx;
    this._mounted = true;
    this.capabilities.add('hud');
    this._resize();
    return this;
  }

  _resize() {
    if (!this.overlay || !this.ctx) return;
    const { width, height } = this.getViewport();
    const dpr = Math.min(3, Math.max(1, this.win?.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (this.overlay.width !== w || this.overlay.height !== h) {
      this.overlay.width = w;
      this.overlay.height = h;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update() {
    this.ready = this.win?.__eaglerGameReady === true;
  }

  renderHud(bus, Events, now = performance.now()) {
    if (!this.ctx || !this.overlay) return;
    this._resize();
    const viewport = this.getViewport();
    this.ctx.clearRect(0, 0, viewport.width, viewport.height);
    if (this._lastFrame) {
      this._lastFrameMs = now - this._lastFrame;
      const instant = this._lastFrameMs > 0 ? 1000 / this._lastFrameMs : 0;
      this._fps = this._fps ? this._fps * 0.85 + instant * 0.15 : instant;
    }
    this._lastFrame = now;
    bus?.emit?.(Events.RenderHud, { ctx: this.ctx, viewport, frame: now });
  }

  getViewport() {
    return {
      width: Math.max(1, this.win?.innerWidth || 1),
      height: Math.max(1, this.win?.innerHeight || 1),
    };
  }

  getCanvas() { return this.overlay; }
  getGameCanvas() { return this.doc?.querySelector?.('#game_frame canvas') ?? null; }
  getFps() { return this._fps; }
  getFrameTimeMs() { return this._lastFrameMs; }
  getSessionSeconds() { return (Date.now() - this.startedAt) / 1000; }

  /**
   * Eaglercraft's supported screenChanged hook receives null when Minecraft's
   * currentScreen is null. Require game readiness + a hook observation so a
   * transient null during page startup can never be mistaken for gameplay.
   */
  inWorld() {
    const state = this.win?.__eaghacksScreenState;
    return this.win?.__eaglerGameReady === true
      && this.win?.__eaghacksScreenHookSeen === true
      && !!state
      && state.screenName === null;
  }

  /** Unknown sessions stay conservative for combat safeguards. */
  isRemote() { return true; }

  _inputTarget() {
    return this.getGameCanvas() ?? this.doc?.getElementById?.('game_frame') ?? null;
  }

  _dispatchKey(code, down) {
    const target = this._inputTarget();
    const info = KEY_INFO[code];
    const KeyboardEventCtor = this.win?.KeyboardEvent;
    if (!target?.dispatchEvent || !info || typeof KeyboardEventCtor !== 'function') return false;
    try {
      return target.dispatchEvent(new KeyboardEventCtor(down ? 'keydown' : 'keyup', {
        key: info.key,
        code: info.code,
        bubbles: true,
        cancelable: true,
        repeat: false,
      }));
    } catch {
      return false;
    }
  }

  _setSyntheticKey(code, on) {
    const held = this._syntheticHeld.has(code);
    if (!!on === held) return true;
    const ok = this._dispatchKey(code, !!on);
    if (!ok) return false;
    if (on) this._syntheticHeld.add(code);
    else this._syntheticHeld.delete(code);
    return true;
  }

  _tapKey(code) {
    return this._dispatchKey(code, true) && this._dispatchKey(code, false);
  }

  _dispatchMouse(button, type) {
    const target = this._inputTarget();
    const MouseEventCtor = this.win?.MouseEvent;
    if (!target?.dispatchEvent || typeof MouseEventCtor !== 'function') return false;
    const rect = target.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 1, height: 1 };
    const clientX = rect.left + Math.max(1, rect.width || 1) / 2;
    const clientY = rect.top + Math.max(1, rect.height || 1) / 2;
    try {
      return target.dispatchEvent(new MouseEventCtor(type, {
        button,
        buttons: type === 'mousedown' ? (button === 0 ? 1 : button === 2 ? 2 : 4) : 0,
        clientX,
        clientY,
        bubbles: true,
        cancelable: true,
      }));
    } catch {
      return false;
    }
  }

  attack(_entity) {
    if (!this.inWorld()) return false;
    return this._dispatchMouse(0, 'mousedown') && this._dispatchMouse(0, 'mouseup');
  }

  useItem(_hand) {
    if (!this.inWorld()) return false;
    return this._dispatchMouse(2, 'mousedown') && this._dispatchMouse(2, 'mouseup');
  }

  setForward(on) {
    if (!this.inWorld() && on) return false;
    return this._setSyntheticKey('KeyW', !!on);
  }

  setSneaking(on) {
    if (!this.inWorld() && on) return false;
    return this._setSyntheticKey('ShiftLeft', !!on);
  }

  jump() {
    if (!this.inWorld()) return false;
    return this._tapKey('Space');
  }

  setPointerLock(locked) {
    if (!locked) {
      if (!this.doc?.pointerLockElement) return true;
      if (!this.doc.exitPointerLock) return false;
      try { this.doc.exitPointerLock(); return true; } catch { return false; }
    }
    const target = this.getGameCanvas();
    if (!target?.requestPointerLock) return false;
    try {
      const result = target.requestPointerLock();
      result?.catch?.(() => {});
      return true;
    } catch { return false; }
  }

  diagnostics() {
    const tv = this.win?.__tv;
    const screen = this.win?.__eaghacksScreenState;
    return {
      runtime: this.runtimeName,
      shellLoaded: this.win?.__loaded === true,
      gameReady: this.win?.__eaglerGameReady === true,
      screenHookSeen: this.win?.__eaghacksScreenHookSeen === true,
      screenName: screen ? screen.screenName : undefined,
      inWorld: this.inWorld(),
      wasmInstantiated: !!tv,
      wasmExports: tv?.instance?.exports ? Object.keys(tv.instance.exports) : [],
      gameCanvasPresent: !!this.getGameCanvas(),
      capabilities: [...this.capabilities],
      worldAccess: 'unavailable: TeaVM exports do not expose player/world state',
      syntheticHeldKeys: [...this._syntheticHeld],
    };
  }

  dispose() {
    for (const code of [...this._syntheticHeld]) this._setSyntheticKey(code, false);
    this._syntheticHeld.clear();
    this.overlay?.remove?.();
    this.overlay = null;
    this.ctx = null;
    this._mounted = false;
    this.capabilities.delete('hud');
  }
}
