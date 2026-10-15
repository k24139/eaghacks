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
    this.capabilities = new Set(win?.addEventListener ? ['input'] : []);
    this.overlay = null;
    this.ctx = null;
    this._lastFrame = 0;
    this._fps = 0;
    this._lastFrameMs = 0;
    this._mounted = false;
    this._syntheticHeld = new Set();
    this.ready = false;
    this._nativeActive = false;
    this._nativeCapabilities = new Set();
  }

  mount() {
    if (this._mounted) return this;
    if (!this.doc?.body || !this.doc.createElement) return this;
    const canvas = this.doc.createElement('canvas');
    canvas.id = 'eaghacks-hud-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = ['position:fixed','inset:0','width:100vw','height:100vh','pointer-events:none','z-index:2147481900','display:block'].join(';');
    this.doc.body.appendChild(canvas);
    const ctx = canvas.getContext?.('2d');
    if (!ctx) { canvas.remove(); return this; }
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
    if (this.overlay.width !== w || this.overlay.height !== h) { this.overlay.width = w; this.overlay.height = h; }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update() {
    this.ready = this.win?.__eaglerGameReady === true;
    this._syncNativeBridge();
    if (!this._gameplayInputAllowed() && this._syntheticHeld.size) {
      for (const code of [...this._syntheticHeld]) this._setSyntheticKey(code, false);
    }
  }

  _nativeState() {
    const state = this.win?.__eaghacksNativeState;
    return state && state.version === 1 ? state : null;
  }

  _syncNativeBridge() {
    const state = this._nativeState();
    const wanted = new Set();
    if (state?.player && state?.world) wanted.add('world');
    if (Array.isArray(state?.entities)) wanted.add('entities');
    if (state?.features?.render === true && state?.camera && Array.isArray(state.camera.m) && state.camera.m.length === 16) wanted.add('render');
    if (state?.features?.inventory === true && state?.inventory && Array.isArray(state.inventory.hotbar)) wanted.add('inventory');
    if (state?.features?.directMovement === true || state?.features?.combat === true) wanted.add('native-direct');
    if (state?.features?.flight === true) wanted.add('flight');
    if (state?.features?.chat === true) wanted.add('chat');
    if (state?.features?.network === true) wanted.add('network');
    for (const cap of this._nativeCapabilities) if (!wanted.has(cap)) this.capabilities.delete(cap);
    for (const cap of wanted) this.capabilities.add(cap);
    this._nativeCapabilities = wanted;
    this._nativeActive = !!state;
  }

  _nativeCommands() {
    if (!this.win) return null;
    let commands = this.win.__eaghacksNativeCommands;
    if (!commands || typeof commands !== 'object') { commands = {}; this.win.__eaghacksNativeCommands = commands; }
    return commands;
  }
  _queueNative(name, value) {
    if (!this._nativeState()) return false;
    const commands = this._nativeCommands();
    if (!commands) return false;
    commands[name] = value;
    return true;
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
    if (this.hasCapability('render')) bus?.emit?.(Events.RenderWorld, { ctx: this.ctx, projection: this, viewport, frame: now });
    bus?.emit?.(Events.RenderHud, { ctx: this.ctx, viewport, frame: now });
  }

  worldToScreen(x, y, z) {
    const camera = this._nativeState()?.camera;
    const m = camera?.m;
    if (!camera || !Array.isArray(m) || m.length !== 16 || ![x, y, z].every(Number.isFinite)) return null;
    const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
    const clipX = m[0] * dx + m[1] * dy + m[2] * dz + m[3];
    const clipY = m[4] * dx + m[5] * dy + m[6] * dz + m[7];
    const clipZ = m[8] * dx + m[9] * dy + m[10] * dz + m[11];
    const clipW = m[12] * dx + m[13] * dy + m[14] * dz + m[15];
    if (![clipX, clipY, clipZ, clipW].every(Number.isFinite) || Math.abs(clipW) < 1e-7) return null;
    const behind = clipW <= 0;
    const ndcX = clipX / clipW, ndcY = clipY / clipW, ndcZ = clipZ / clipW;
    const viewport = this.getViewport();
    return { x: (ndcX * 0.5 + 0.5) * viewport.width, y: (0.5 - ndcY * 0.5) * viewport.height, depth: ndcZ, behind, visible: !behind && ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1 };
  }

  projectEntityCentered(entity) {
    if (!entity) return null;
    return this.worldToScreen(entity.x, entity.y + (entity.height ?? 1.8) * 0.5, entity.z);
  }

  projectEntity(entity) {
    if (!entity) return null;
    const half = (entity.width ?? 0.6) * 0.5;
    const height = entity.height ?? 1.8;
    const points = [];
    for (const ox of [-half, half]) for (const oy of [0, height]) for (const oz of [-half, half]) {
      const p = this.worldToScreen(entity.x + ox, entity.y + oy, entity.z + oz);
      if (p && !p.behind) points.push(p);
    }
    if (!points.length) return null;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys), behind: false };
  }

  getViewport() { return { width: Math.max(1, this.win?.innerWidth || 1), height: Math.max(1, this.win?.innerHeight || 1) }; }
  getCanvas() { return this.overlay; }
  getGameCanvas() { return this.doc?.querySelector?.('#game_frame canvas') ?? null; }
  getFps() { return this._fps; }
  getFrameTimeMs() { return this._lastFrameMs; }
  getSessionSeconds() { return (Date.now() - this.startedAt) / 1000; }
  getPlayer() { return this._nativeState()?.player ?? null; }
  getWorld() { return this._nativeState()?.world ?? null; }
  getEntities() { const entities = this._nativeState()?.entities; return Array.isArray(entities) ? entities : []; }
  getCrosshairTargetEntity() {
    const id = this._nativeState()?.crosshairEntityId;
    return Number.isInteger(id) && id >= 0 ? this.getEntities().find((entity) => entity?.id === id) ?? null : null;
  }
  getInventory() { return this._nativeState()?.inventory ?? null; }
  getSelectedSlot() { const slot = this._nativeState()?.inventory?.selectedSlot; return Number.isInteger(slot) ? slot : -1; }
  selectSlot(index) { return Number.isInteger(index) && index >= 0 && index <= 8 && !!this._nativeState()?.inventory ? this._queueNative('selectSlot', index) : false; }
  isOnGround() { return this._nativeState()?.player?.onGround === true; }
  getPlayerVelocity() {
    const velocity = this._nativeState()?.player?.velocity;
    return velocity && [velocity.x, velocity.y, velocity.z].every(Number.isFinite) ? { x: velocity.x, y: velocity.y, z: velocity.z } : null;
  }
  setPlayerVelocity(x, y, z) { return [x, y, z].every(Number.isFinite) ? this._queueNative('velocity', { x, y, z }) : false; }
  setRotation(yaw, pitch, speed = 1) {
    if (![yaw, pitch].every(Number.isFinite)) return false;
    const current = this._nativeState()?.player;
    const strength = Number.isFinite(speed) ? Math.max(0, Math.min(1, speed)) : 1;
    if (current && strength < 1) {
      const wrap = (angle) => ((angle + 540) % 360) - 180;
      yaw = (current.yaw ?? 0) + wrap(yaw - (current.yaw ?? 0)) * strength;
      pitch = (current.pitch ?? 0) + (pitch - (current.pitch ?? 0)) * strength;
    }
    return this._queueNative('rotation', { yaw, pitch: Math.max(-90, Math.min(90, pitch)) });
  }

  inWorld() {
    if (this.win?.__eaglerGameReady !== true || this.win?.__eaglerWorldReady !== true || this.win?.minecraftServer == null) return false;
    const state = this.win?.__eaghacksScreenState;
    return this.win?.__eaghacksScreenHookSeen === true && state ? state.screenName === null : true;
  }
  isRemote() { return this.win?.minecraftServer !== 'singleplayer'; }
  _clientGuiOpen() { return !!this.doc?.getElementById?.('meteor-clickgui')?.classList?.contains?.('mt-open'); }
  _gameplayInputAllowed() {
    if (!this.inWorld() || this._clientGuiOpen()) return false;
    const state = this.win?.__eaghacksScreenState;
    if (this.win?.__eaghacksScreenHookSeen === true && state) return state.screenName === null;
    const canvas = this.getGameCanvas();
    return !!canvas && this.doc?.pointerLockElement === canvas;
  }
  _inputTarget() { return this.getGameCanvas() ?? this.doc?.getElementById?.('game_frame') ?? null; }
  _dispatchKey(code, down) {
    const target = this._inputTarget(), info = KEY_INFO[code], Ctor = this.win?.KeyboardEvent;
    if (!target?.dispatchEvent || !info || typeof Ctor !== 'function') return false;
    try { return target.dispatchEvent(new Ctor(down ? 'keydown' : 'keyup', { key: info.key, code: info.code, bubbles: true, cancelable: true, repeat: false })); } catch { return false; }
  }
  _setSyntheticKey(code, on) {
    const held = this._syntheticHeld.has(code);
    if (!!on === held) return true;
    const ok = this._dispatchKey(code, !!on);
    if (!ok) return false;
    if (on) this._syntheticHeld.add(code); else this._syntheticHeld.delete(code);
    return true;
  }
  _tapKey(code) { return this._dispatchKey(code, true) && this._dispatchKey(code, false); }
  _dispatchMouse(button, type) {
    const target = this._inputTarget(), Ctor = this.win?.MouseEvent;
    if (!target?.dispatchEvent || typeof Ctor !== 'function') return false;
    const rect = target.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 1, height: 1 };
    try { return target.dispatchEvent(new Ctor(type, { button, buttons: type === 'mousedown' ? (button === 0 ? 1 : button === 2 ? 2 : 4) : 0, clientX: rect.left + Math.max(1, rect.width || 1) / 2, clientY: rect.top + Math.max(1, rect.height || 1) / 2, bubbles: true, cancelable: true })); } catch { return false; }
  }
  attack(entity) {
    if (Number.isInteger(entity?.id) && this._nativeState()?.features?.combat === true) return this._queueNative('attackEntityId', entity.id);
    return this._gameplayInputAllowed() && this._dispatchMouse(0, 'mousedown') && this._dispatchMouse(0, 'mouseup');
  }
  useItem(hand) {
    if (this._nativeState()?.features?.combat === true) return this._queueNative('useItem', hand === 'offhand' ? 'offhand' : 'mainhand');
    return this._gameplayInputAllowed() && this._dispatchMouse(2, 'mousedown') && this._dispatchMouse(2, 'mouseup');
  }
  setForward(on) { if (on && !this._gameplayInputAllowed()) return false; return this._setSyntheticKey('KeyW', !!on); }
  setSneaking(on) { if (this._nativeState()?.features?.directMovement === true) return this._queueNative('sneaking', !!on); if (on && !this._gameplayInputAllowed()) return false; return this._setSyntheticKey('ShiftLeft', !!on); }
  setSprinting(on) { if (this._nativeState()?.features?.directMovement === true) return this._queueNative('sprinting', !!on); if (on && !this._gameplayInputAllowed()) return false; return this._setSyntheticKey('ControlLeft', !!on); }
  jump() { if (this._nativeState()?.features?.directMovement === true) return this._queueNative('jump', true); return this._gameplayInputAllowed() ? this._tapKey('Space') : false; }
  setPointerLock(locked) {
    if (!locked) { if (!this.doc?.pointerLockElement) return true; if (!this.doc.exitPointerLock) return false; try { this.doc.exitPointerLock(); return true; } catch { return false; } }
    const target = this.getGameCanvas();
    if (!target?.requestPointerLock) return false;
    try { const result = target.requestPointerLock(); result?.catch?.(() => {}); return true; } catch { return false; }
  }
  diagnostics() {
    const tv = this.win?.__tv, screen = this.win?.__eaghacksScreenState;
    return { runtime: this.runtimeName, shellLoaded: this.win?.__loaded === true, gameReady: this.win?.__eaglerGameReady === true, menuReady: this.win?.__eaglerMenuReady === true, terrainReady: this.win?.__eaglerTerrainReady === true, worldReady: this.win?.__eaglerWorldReady === true, screenHookSeen: this.win?.__eaghacksScreenHookSeen === true, screenName: screen ? screen.screenName : undefined, inWorld: this.inWorld(), gameplayInputAllowed: this._gameplayInputAllowed(), server: this.win?.minecraftServer ?? null, remote: this.isRemote(), wasmInstantiated: !!tv, wasmExports: tv?.instance?.exports ? Object.keys(tv.instance.exports) : [], gameCanvasPresent: !!this.getGameCanvas(), capabilities: [...this.capabilities], nativeBridge: this._nativeActive, nativeBridgeVersion: this._nativeState()?.version ?? null, nativeTick: this._nativeState()?.tick ?? null, worldAccess: this._nativeActive ? 'native bridge active' : 'unavailable in stock binary: TeaVM exports do not expose player/world state', syntheticHeldKeys: [...this._syntheticHeld] };
  }
  dispose() {
    for (const code of [...this._syntheticHeld]) this._setSyntheticKey(code, false);
    this._syntheticHeld.clear(); this.overlay?.remove?.(); this.overlay = null; this.ctx = null; this._mounted = false; this.capabilities.delete('hud');
    for (const cap of this._nativeCapabilities) this.capabilities.delete(cap);
    this._nativeCapabilities.clear(); this._nativeActive = false;
  }
}
