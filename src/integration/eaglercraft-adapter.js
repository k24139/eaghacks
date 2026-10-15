/**
 * Browser-facing Eaglercraft 26.2-u1 adapter.
 *
 * The standalone TeaVM/WASM build does not export player/world/entity objects,
 * so this adapter deliberately exposes only capabilities that can be verified
 * at the browser boundary. The injector attempts to wrap the optional
 * eaglercraftXOpts screenChanged hook; 26.2-u1 also exposes minecraftServer,
 * which is used as the verified fallback for loaded-session detection.
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
    if (!this._gameplayInputAllowed() && this._syntheticHeld.size) {
      // Key-up is deliberately allowed even while a GUI/pointer-lock transition
      // is in progress so automated movement can never become stuck.
      for (const code of [...this._syntheticHeld]) this._setSyntheticKey(code, false);
    }
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
   * `minecraftServer` is null in menus/disconnected state, "singleplayer" for
   * the integrated server, and the selected server address for multiplayer.
   * The optional screen hook refines this further when a build actually invokes
   * it, but 26.2-u1 is known to expose the hook object without firing it.
   */
  inWorld() {
    if (this.win?.__eaglerGameReady !== true) return false;
    // 26.2-u1 sets this native global only after a world has actually reached
    // its ready state. It is a stronger signal than the server address alone,
    // which may be assigned while a connection/loading screen is still active.
    if (this.win?.__eaglerWorldReady !== true) return false;
    if (this.win?.minecraftServer == null) return false;
    const state = this.win?.__eaghacksScreenState;
    if (this.win?.__eaghacksScreenHookSeen === true && state) {
      return state.screenName === null;
    }
    return true;
  }

  /**
   * Eaglercraft sets window.minecraftServer to "singleplayer" for the
   * integrated server. Null/unknown and any other server value stay
   * conservative and are treated as remote for local-test-only modules.
   */
  isRemote() {
    return this.win?.minecraftServer !== 'singleplayer';
  }

  _clientGuiOpen() {
    return !!this.doc?.getElementById?.('meteor-clickgui')?.classList?.contains?.('mt-open');
  }

  /** Safe moment to inject held/click gameplay input. */
  _gameplayInputAllowed() {
    if (!this.inWorld() || this._clientGuiOpen()) return false;
    const state = this.win?.__eaghacksScreenState;
    if (this.win?.__eaghacksScreenHookSeen === true && state) return state.screenName === null;
    // 26.2-u1 does not fire screenChanged. Pointer lock is the browser-level
    // signal that the game, rather than a menu, currently owns mouse/keyboard.
    const canvas = this.getGameCanvas();
    return !!canvas && this.doc?.pointerLockElement === canvas;
  }

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
    if (!this._gameplayInputAllowed()) return false;
    return this._dispatchMouse(0, 'mousedown') && this._dispatchMouse(0, 'mouseup');
  }

  useItem(_hand) {
    if (!this._gameplayInputAllowed()) return false;
    return this._dispatchMouse(2, 'mousedown') && this._dispatchMouse(2, 'mouseup');
  }

  setForward(on) {
    if (on && !this._gameplayInputAllowed()) return false;
    return this._setSyntheticKey('KeyW', !!on);
  }

  setSneaking(on) {
    if (on && !this._gameplayInputAllowed()) return false;
    return this._setSyntheticKey('ShiftLeft', !!on);
  }

  /**
   * Eaglercraft's default sprint key is left control. Browser injection cannot
   * read Minecraft's internal sprint state, but it can faithfully hold/release
   * the configured default key through the same DOM input path as the player.
   */
  setSprinting(on) {
    if (on && !this._gameplayInputAllowed()) return false;
    return this._setSyntheticKey('ControlLeft', !!on);
  }

  jump() {
    if (!this._gameplayInputAllowed()) return false;
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
      menuReady: this.win?.__eaglerMenuReady === true,
      terrainReady: this.win?.__eaglerTerrainReady === true,
      worldReady: this.win?.__eaglerWorldReady === true,
      screenHookSeen: this.win?.__eaghacksScreenHookSeen === true,
      screenName: screen ? screen.screenName : undefined,
      inWorld: this.inWorld(),
      gameplayInputAllowed: this._gameplayInputAllowed(),
      server: this.win?.minecraftServer ?? null,
      remote: this.isRemote(),
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
