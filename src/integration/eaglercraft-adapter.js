/**
 * Browser-facing Eaglercraft 26.2-u1 adapter.
 * The standalone TeaVM build exposes shell diagnostics, not game state.
 * Advertise only verified browser capabilities; never fabricate a loaded world.
 */
import { GameAdapter } from '../core/adapter.js';

export class EaglercraftBrowserAdapter extends GameAdapter {
  constructor({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
    super();
    this.win = win;
    this.doc = doc;
    this.runtimeName = 'eaglercraft-26.2-u1-browser';
    this.startedAt = Date.now();
    this.capabilities = new Set(win?.addEventListener ? ['input'] : []);
    this.overlay = null;
    this.ctx = null;
    this._lastFrame = 0;
    this._fps = 0;
    this._lastFrameMs = 0;
    this._mounted = false;
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
    // Shell ready != world loaded. The WASM has no exported world accessor.
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
  inWorld() { return false; }
  isRemote() { return true; } // Unknown session: conservatively enforce remote safeguards.

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
    return {
      runtime: this.runtimeName,
      shellLoaded: this.win?.__loaded === true,
      gameReady: this.win?.__eaglerGameReady === true,
      wasmInstantiated: !!tv,
      wasmExports: tv?.instance?.exports ? Object.keys(tv.instance.exports) : [],
      gameCanvasPresent: !!this.getGameCanvas(),
      capabilities: [...this.capabilities],
      worldAccess: 'unavailable: TeaVM exports do not expose player/world state',
    };
  }

  dispose() {
    this.overlay?.remove?.();
    this.overlay = null;
    this.ctx = null;
    this._mounted = false;
    this.capabilities.delete('hud');
  }
}
