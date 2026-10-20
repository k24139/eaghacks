/** Browser-facing adapter for stock and source-built Eaglercraft 26.2-u1. */
import { GameAdapter } from '../core/adapter.js';
import { Events } from '../core/event-bus.js';

const KEY_INFO = Object.freeze({
  KeyW: { key: 'w', code: 'KeyW' }, KeyA: { key: 'a', code: 'KeyA' },
  KeyS: { key: 's', code: 'KeyS' }, KeyD: { key: 'd', code: 'KeyD' },
  Space: { key: ' ', code: 'Space' }, ShiftLeft: { key: 'Shift', code: 'ShiftLeft' },
  ControlLeft: { key: 'Control', code: 'ControlLeft' },
  Escape: { key: 'Escape', code: 'Escape' },
});

export class EaglercraftBrowserAdapter extends GameAdapter {
  constructor({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
    super();
    this.win = win; this.doc = doc; this.runtimeName = 'eaglercraft-26.2-u1-browser';
    this.startedAt = Date.now();
    this.capabilities = new Set(win?.addEventListener ? ['input'] : []);
    this.overlay = null; this.ctx = null; this._lastFrame = 0; this._fps = 0; this._lastFrameMs = 0;
    this._mounted = false; this._syntheticHeld = new Set(); this._syntheticUseHeld = false; this.ready = false;
    this._nativeActive = false; this._nativeCapabilities = new Set();
    this._previousNative = null; this._events = []; this._pendingSlotRestore = null;
    this._guiOwnsPause = false; this._guiResumeUntil = 0; this._guiResumeSequence = 0;
    this._physicalButtons = new Set();
    this._mouseDown = event => { if(event.isTrusted)this._physicalButtons.add(event.button); };
    this._mouseUp = event => { if(event.isTrusted)this._physicalButtons.delete(event.button); };
    this._focused = true;
    this._blur = () => { this._focused = false; this._physicalButtons.clear(); this.releaseOwnedInput(); this.update(); };
    this._focus = () => { this._focused = true; };
  }

  mount() {
    if (this._mounted) return this;
    if (!this.doc?.body || !this.doc.createElement) return this;
    const canvas = this.doc.createElement('canvas');
    canvas.id = 'eaghacks-hud-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = ['position:fixed','inset:0','width:100vw','height:100vh','pointer-events:none','z-index:2147481900','display:block'].join(';');
    this.doc.body.appendChild(canvas);
    const ctx = canvas.getContext?.('2d');
    if (!ctx) { canvas.remove(); return this; }
    this.win?.addEventListener?.('blur', this._blur); this.win?.addEventListener?.('focus', this._focus);
    this.win?.addEventListener?.('mousedown',this._mouseDown,true);this.win?.addEventListener?.('mouseup',this._mouseUp,true);
    this.overlay = canvas; this.ctx = ctx; this._mounted = true; this.capabilities.add('hud'); this._resize();
    return this;
  }

  _resize() {
    if (!this.overlay || !this.ctx) return;
    const { width, height } = this.getViewport();
    const dpr = Math.min(3, Math.max(1, this.win?.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    if (this.overlay.width !== w || this.overlay.height !== h) { this.overlay.width = w; this.overlay.height = h; }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update() {
    this.ready = this.win?.__eaglerGameReady === true;
    this._syncNativeBridge();
    this._restoreGuiControl();
    const state = this._nativeState(), previous = this._previousNative;
    if (!state || state.inventory?.selectedSlot === this._pendingSlotRestore) this._pendingSlotRestore = null;
    if (!state?.player && this.win) delete this.win.__eaghacksNativeCommands;
    if (state?.player && !previous?.player) this._events.push({ type: Events.WorldLoad, state });
    if (!state?.player && previous?.player) this._events.push({ type: Events.WorldUnload });
    if (state?.player) {
      if (state.player.dead && !previous?.player?.dead) this._events.push({ type: Events.PlayerDeath, player: state.player });
      if (previous?.player?.dead && !state.player.dead) this._events.push({ type: Events.PlayerRespawn, player: state.player });
      if(previous?.player && !previous.player.dead && !state.player.dead && previous.selfEntityId===state.selfEntityId && previous.world?.dimension===state.world?.dimension) {
        const distance=Math.hypot(state.player.x-previous.player.x,state.player.y-previous.player.y,state.player.z-previous.player.z);
        if(Number.isFinite(distance)&&distance>0&&distance<16)this._events.push({type:Events.PlayerMove,distance,player:state.player});
      }
      this._events.push({ type: Events.PlayerTick, player: state.player }, { type: Events.EntityUpdate, entities: state.entities }, { type: Events.InventoryUpdate, inventory: state.inventory });
    }
    this._previousNative = state;
    if (!this._gameplayInputAllowed() && this.win) {
      const commands = this.win.__eaghacksNativeCommands;
      if (commands) for (const key of Object.keys(commands)) if (!this._menuCommandAllowed(key, commands[key])) delete commands[key];
      if (commands && !Object.keys(commands).length) delete this.win.__eaghacksNativeCommands;
    }
    if (!this._gameplayInputAllowed()) this.stopUsingItem();
    if (!this._gameplayInputAllowed() && this._syntheticHeld.size) for (const code of [...this._syntheticHeld]) this._setSyntheticKey(code, false);
  }

  drainEvents() { return this._events.splice(0); }
  isTyping() { return this._nativeState()?.session?.paused === true; }

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
    if (state?.features?.inventoryRead === true && state?.inventory && Array.isArray(state.inventory.hotbar) && Array.isArray(state.inventory.armor)) wanted.add('native-inventory-read');
    // Modules using this aggregate contract need both kinds of direct action.
    if (state?.features?.directMovement === true && state?.features?.combat === true) wanted.add('native-direct');
    if (state?.features?.flight === true) wanted.add('flight');
    if (state?.features?.chat === true) wanted.add('chat');
    if (state?.features?.network === true) wanted.add('network');
    for (const [feature, capability] of [['brightnessControl','brightness-control'], ['fovControl','fov-control'], ['hurtCameraControl','hurt-camera-control'], ['respawn','native-respawn'], ['effects','effects'], ['biome','biome'], ['crosshairControl','crosshair-control'], ['multiAttack','native-multi-attack']]) if (state?.features?.[feature] === true) wanted.add(capability);
    for (const cap of this._nativeCapabilities) if (!wanted.has(cap)) this.capabilities.delete(cap);
    for (const cap of wanted) this.capabilities.add(cap);
    this._nativeCapabilities = wanted; this._nativeActive = !!state;
  }

  _nativeCommands() {
    if (!this.win) return null;
    let commands = this.win.__eaghacksNativeCommands;
    if (!commands || typeof commands !== 'object') { commands = {}; this.win.__eaghacksNativeCommands = commands; }
    return commands;
  }
  _queueNative(name, value) {
    if (!this._nativeState()) return false;
    if (!this._menuCommandAllowed(name, value) && !this._gameplayInputAllowed()) return false;
    const commands = this._nativeCommands(); if (!commands) return false;
    if(name==='attackEntityId'&&this._nativeState()?.features?.multiAttack===true&&commands[name]!==undefined){const ids=Array.isArray(commands[name])?commands[name]:[commands[name]];if(!ids.includes(value)){if(ids.length>=16)return false;ids.push(value);}commands[name]=ids;}else commands[name] = value;
    return true;
  }

  _menuCommandAllowed(name, value) {
    if (['brightness','fov','noHurtCamera','hideCrosshair'].includes(name)) return true;
    if ((name === 'sprinting' || name === 'sneaking') && value === false) return true;
    if (name === 'selectSlot' && value === this._pendingSlotRestore) return true;
    if (name === 'restoreSlot' && value === true && this._pendingSlotRestore !== null) return true;
    return name === 'respawn' && this._nativeState()?.player?.dead === true;
  }

  renderHud(bus, Events, now = performance.now()) {
    if (!this.ctx || !this.overlay) return;
    this._resize(); const viewport = this.getViewport();
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
    const camera = this._nativeState()?.camera, m = camera?.m;
    if (!camera || !Array.isArray(m) || m.length !== 16 || ![x, y, z].every(Number.isFinite)) return null;
    const dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
    const clipX = m[0]*dx + m[1]*dy + m[2]*dz + m[3];
    const clipY = m[4]*dx + m[5]*dy + m[6]*dz + m[7];
    const clipZ = m[8]*dx + m[9]*dy + m[10]*dz + m[11];
    const clipW = m[12]*dx + m[13]*dy + m[14]*dz + m[15];
    if (![clipX, clipY, clipZ, clipW].every(Number.isFinite) || Math.abs(clipW) < 1e-7) return null;
    const behind = clipW <= 0, ndcX = clipX/clipW, ndcY = clipY/clipW, ndcZ = clipZ/clipW;
    const viewport = this.getViewport();
    return { x:(ndcX*.5+.5)*viewport.width, y:(.5-ndcY*.5)*viewport.height, depth:ndcZ, behind, visible:!behind && ndcX>=-1 && ndcX<=1 && ndcY>=-1 && ndcY<=1 };
  }
  projectEntityCentered(entity) { return entity ? this.worldToScreen(entity.x, entity.y + (entity.height ?? 1.8)*.5, entity.z) : null; }
  projectEntity(entity) {
    if (!entity) return null;
    const half=(entity.width??.6)*.5, height=entity.height??1.8, points=[];
    for (const ox of [-half,half]) for (const oy of [0,height]) for (const oz of [-half,half]) {
      const p=this.worldToScreen(entity.x+ox,entity.y+oy,entity.z+oz); if (p&&!p.behind) points.push(p);
    }
    if (!points.length) return null;
    const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
    return { x1:Math.min(...xs), y1:Math.min(...ys), x2:Math.max(...xs), y2:Math.max(...ys), behind:false };
  }

  getViewport() { return { width:Math.max(1,this.win?.innerWidth||1), height:Math.max(1,this.win?.innerHeight||1) }; }
  getCanvas() { return this.overlay; }
  getGameCanvas() { return this.doc?.querySelector?.('#game_frame canvas') ?? null; }
  getFps() { return this._fps; } getFrameTimeMs() { return this._lastFrameMs; }
  getSessionSeconds() { return (Date.now()-this.startedAt)/1000; }
  getPlayer() { return this._nativeState()?.player ?? null; }
  getWorld() { const world=this._nativeState()?.world; return world ? {...world,day:Math.floor(world.time/24000)} : null; }
  getEntities() { const e=this._nativeState()?.entities; return Array.isArray(e)?e:[]; }
  getCrosshairTargetEntity() { const id=this._nativeState()?.crosshairEntityId; return Number.isInteger(id)&&id>=0 ? this.getEntities().find(e=>e?.id===id)??null : null; }
  getInventory() { return this._nativeState()?.inventory ?? null; }
  getHeldItem() { const inv=this.getInventory(), slot=inv?.selectedSlot; return Number.isInteger(slot) ? inv?.hotbar?.[slot]??null : null; }
  isAttacking() { return this._physicalButtons.has(0); }
  heldItemIsWeapon() { return /(?:_sword|_axe|_spear|:trident|:mace)$/.test(this.getHeldItem()?.id ?? ''); }
  findFoodInHotbar(preferred='auto') {
    const candidates=(this.getInventory()?.hotbar??[]).filter(item=>item?.food===true);
    if (!candidates.length) return -1;
    const choice=String(preferred??'auto').toLowerCase();
    if (choice!=='auto'&&choice!=='any') {
      const exact=candidates.find(item=>item.id===choice||item.id?.endsWith(`:${choice}`)||item.id?.endsWith(`/${choice}`));
      return exact?.slot??-1;
    }
    if (choice==='any') return candidates[0]?.slot??-1;
    candidates.sort((a,b)=>(b.nutrition??0)-(a.nutrition??0)||(b.saturation??0)-(a.saturation??0));
    return candidates[0]?.slot??-1;
  }
  getSelectedSlot() { const slot=this._nativeState()?.inventory?.selectedSlot; return Number.isInteger(slot)?slot:-1; }
  selectSlot(index) { return Number.isInteger(index)&&index>=0&&index<=8&&!!this._nativeState()?.inventory ? this._queueNative('selectSlot',index):false; }
  restoreSelectedSlot(index) {
    if (!Number.isInteger(index) || index < 0 || index > 8 || !this._nativeState()?.inventory) return false;
    this._pendingSlotRestore = index; const queued=this._queueNative('selectSlot', index);if(queued)this._nativeCommands().restoreSlot=true;return queued;
  }
  isOnGround() { return this._nativeState()?.player?.onGround===true; }
  getPlayerVelocity() { const v=this._nativeState()?.player?.velocity; return v&&[v.x,v.y,v.z].every(Number.isFinite)?{x:v.x,y:v.y,z:v.z}:null; }
  setPlayerVelocity(x,y,z) { return this._nativeState()?.features?.directMovement === true && [x,y,z].every(Number.isFinite)?this._queueNative('velocity',{x,y,z}):false; }
  setRotation(yaw,pitch,speed=1) {
    if (this._nativeState()?.features?.directMovement !== true || ![yaw,pitch].every(Number.isFinite)) return false;
    const current=this._nativeState()?.player, strength=Number.isFinite(speed)?Math.max(0,Math.min(1,speed)):1;
    if (current&&strength<1) { const wrap=a=>((a+540)%360)-180; yaw=(current.yaw??0)+wrap(yaw-(current.yaw??0))*strength; pitch=(current.pitch??0)+(pitch-(current.pitch??0))*strength; }
    return this._queueNative('rotation',{yaw,pitch:Math.max(-90,Math.min(90,pitch))});
  }

  inWorld() {
    if (this.win?.__eaghacksNativeBridge?.version === 1 && !this._nativeState()?.player) return false;
    if (this.win?.__eaglerGameReady!==true||this.win?.__eaglerWorldReady!==true) return false;
    if (this._nativeState()?.session?.paused === true) return false;
    const state=this.win?.__eaghacksScreenState;
    return this.win?.__eaghacksScreenHookSeen===true&&state ? state.screenName===null : true;
  }
  isRemote() {
    const state = this._nativeState();
    // Native identity takes precedence, including missing/unknown metadata.
    if (state) return state.session?.kind !== 'local';
    return this.win?.minecraftServer !== 'singleplayer';
  }
  _clientGuiOpen() { return !!this.doc?.getElementById?.('meteor-clickgui')?.classList?.contains?.('mt-open'); }
  _gameplayInputAllowed() {
    if (!this._focused || !this.inWorld()||this._clientGuiOpen()) return false;
    if (this._nativeState()?.session?.paused === true) return false;
    const state=this.win?.__eaghacksScreenState;
    if (this.win?.__eaghacksScreenHookSeen===true&&state) return state.screenName===null;
    const canvas=this.getGameCanvas(); return !!canvas&&this.doc?.pointerLockElement===canvas;
  }
  _inputTarget() { return this.getGameCanvas()??this.doc?.getElementById?.('game_frame')??null; }
  _dispatchKey(code,down) {
    const target=this._inputTarget(),info=KEY_INFO[code],Ctor=this.win?.KeyboardEvent;
    if (!target?.dispatchEvent||!info||typeof Ctor!=='function') return false;
    try { target.dispatchEvent(new Ctor(down?'keydown':'keyup',{key:info.key,code:info.code,bubbles:true,cancelable:true,repeat:false})); return true; } catch { return false; }
  }
  _setSyntheticKey(code,on) { const held=this._syntheticHeld.has(code); if (!!on===held) return true; const ok=this._dispatchKey(code,!!on); if(!ok)return false; if(on)this._syntheticHeld.add(code);else this._syntheticHeld.delete(code); return true; }
  _tapKey(code) { return this._dispatchKey(code,true)&&this._dispatchKey(code,false); }
  _dispatchMouse(button,type) {
    const target=this._inputTarget(),Ctor=this.win?.MouseEvent; if(!target?.dispatchEvent||typeof Ctor!=='function')return false;
    const r=target.getBoundingClientRect?.()??{left:0,top:0,width:1,height:1};
    try { target.dispatchEvent(new Ctor(type,{button,buttons:type==='mousedown'?(button===0?1:button===2?2:4):0,clientX:r.left+Math.max(1,r.width||1)/2,clientY:r.top+Math.max(1,r.height||1)/2,bubbles:true,cancelable:true})); return true; } catch { return false; }
  }
  attack(entity) { if(Number.isInteger(entity?.id)&&this._nativeState()?.features?.combat===true)return this._queueNative('attackEntityId',entity.id); return this._gameplayInputAllowed()&&this._dispatchMouse(0,'mousedown')&&this._dispatchMouse(0,'mouseup'); }
  cancelAttacks() { if(this.win?.__eaghacksNativeCommands)delete this.win.__eaghacksNativeCommands.attackEntityId; }
  useItem(hand) { if(this._nativeState()?.features?.combat===true)return this._queueNative('useItem',hand==='offhand'?'offhand':'mainhand'); return this._gameplayInputAllowed()&&this._dispatchMouse(2,'mousedown')&&this._dispatchMouse(2,'mouseup'); }
  startUsingItem() {
    if (!this._gameplayInputAllowed()) return false;
    if (this._syntheticUseHeld) return true;
    if (!this._dispatchMouse(2,'mousedown')) return false;
    this._syntheticUseHeld = true; return true;
  }
  stopUsingItem() {
    if (!this._syntheticUseHeld) return true;
    const released = this._dispatchMouse(2,'mouseup'); this._syntheticUseHeld = false; return released;
  }
  releaseOwnedInput() { for(const code of [...this._syntheticHeld])this._setSyntheticKey(code,false); this.stopUsingItem(); }
  setForward(on) { if(on&&!this._gameplayInputAllowed())return false; return this._setSyntheticKey('KeyW',!!on); }
  setSneaking(on) { if(this._nativeState()?.features?.directMovement===true)return this._queueNative('sneaking',!!on); if(on&&!this._gameplayInputAllowed())return false; return this._setSyntheticKey('ShiftLeft',!!on); }
  setSprinting(on) { if(this._nativeState()?.features?.directMovement===true)return this._queueNative('sprinting',!!on); if(on&&!this._gameplayInputAllowed())return false; return this._setSyntheticKey('ControlLeft',!!on); }
  jump() { if(this._nativeState()?.features?.directMovement===true)return this._queueNative('jump',true); return this._gameplayInputAllowed()?this._tapKey('Space'):false; }
  getBrightness() { return this._nativeState()?.options?.brightness ?? null; }
  setBrightness(value) { return this.hasCapability('brightness-control') && Number.isFinite(value) ? this._queueNative('brightness',Math.max(0,Math.min(1,value))) : false; }
  getFov() { return this._nativeState()?.options?.fov ?? null; }
  setFov(value) { return this.hasCapability('fov-control') && Number.isFinite(value) ? this._queueNative('fov',Math.max(5,Math.min(170,value))) : false; }
  setHurtCam(enabled) { return this.hasCapability('hurt-camera-control') ? this._queueNative('noHurtCamera',!enabled) : false; }
  getVanillaCrosshairVisible() { return !this._nativeState()?.options?.hideCrosshair; }
  setVanillaCrosshairVisible(visible) { return this.hasCapability('crosshair-control') ? this._queueNative('hideCrosshair',!visible) : false; }
  swingHand() { return this._nativeState()?.features?.combat === true ? this._queueNative('swing',true) : false; }
  respawn() { return this.hasCapability('native-respawn') ? this._queueNative('respawn',true) : false; }
  onGuiClosed() {
    if (!this._guiOwnsPause) return;
    this._guiResumeUntil = Date.now() + 5000;
    this._guiResumeSequence = this._nativeState()?.bridge?.sequence ?? 0;
    this._restoreGuiControl();
  }
  _restoreGuiControl() {
    if (!this._guiOwnsPause || !this._guiResumeUntil || this._clientGuiOpen()) return;
    const state = this._nativeState(), screen = this.win?.__eaghacksScreenState?.screenName;
    if (!state?.player || Date.now() > this._guiResumeUntil || (screen !== null && screen !== 'PauseScreen')) {
      this._guiOwnsPause = false; this._guiResumeUntil = 0; return;
    }
    if (screen === 'PauseScreen') {
      if (this._tapKey('Escape')) { this._guiOwnsPause = false; this._guiResumeUntil = 0; }
    } else if ((state.bridge?.sequence ?? 0) > this._guiResumeSequence + 3) {
      this._guiOwnsPause = false; this._guiResumeUntil = 0;
    }
  }
  setPointerLock(locked) {
    if (!locked && this._clientGuiOpen()) {
      const state = this._nativeState();
      this._guiOwnsPause ||= !!state?.player && state.session?.paused === false && this.win?.__eaghacksScreenState?.screenName === null && this.doc?.pointerLockElement === this.getGameCanvas();
      this._guiResumeUntil = 0;
    }
    if(!locked){if(!this.doc?.pointerLockElement)return true;if(!this.doc.exitPointerLock)return false;try{this.doc.exitPointerLock();return true;}catch{return false;}}
    const target=this.getGameCanvas(); if(!target?.requestPointerLock)return false; try{const result=target.requestPointerLock();result?.catch?.(()=>{});return true;}catch{return false;}
  }
  diagnostics() {
    const tv=this.win?.__tv,screen=this.win?.__eaghacksScreenState;
    return {runtime:this.runtimeName,nativeInstalled:this.win?.__eaghacksNativeBridge?.version===1,nativeUpstream:this.win?.__eaghacksNativeBridge?.upstream??null,session:this._nativeState()?.session??null,shellLoaded:this.win?.__loaded===true,gameReady:this.win?.__eaglerGameReady===true,menuReady:this.win?.__eaglerMenuReady===true,terrainReady:this.win?.__eaglerTerrainReady===true,worldReady:this.win?.__eaglerWorldReady===true,screenHookSeen:this.win?.__eaghacksScreenHookSeen===true,screenName:screen?screen.screenName:undefined,inWorld:this.inWorld(),gameplayInputAllowed:this._gameplayInputAllowed(),server:this.win?.minecraftServer??null,remote:this.isRemote(),wasmInstantiated:!!tv,wasmExports:tv?.instance?.exports?Object.keys(tv.instance.exports):[],gameCanvasPresent:!!this.getGameCanvas(),capabilities:[...this.capabilities],nativeBridge:this._nativeActive,nativeBridgeVersion:this._nativeState()?.version??null,nativeTick:this._nativeState()?.tick??null,worldAccess:this._nativeActive?'native bridge active':'unavailable in stock binary: TeaVM exports do not expose player/world state',syntheticHeldKeys:[...this._syntheticHeld]};
  }
  dispose() {
    this._guiOwnsPause = false; this._guiResumeUntil = 0;
    this.releaseOwnedInput(); this.win?.removeEventListener?.('blur',this._blur); this.win?.removeEventListener?.('focus',this._focus);
    this.win?.removeEventListener?.('mousedown',this._mouseDown,true);this.win?.removeEventListener?.('mouseup',this._mouseUp,true);this._physicalButtons.clear();
    this._previousNative=null; this._events=[]; this._pendingSlotRestore=null;
    for(const code of [...this._syntheticHeld])this._setSyntheticKey(code,false);
    this._syntheticHeld.clear();this.overlay?.remove?.();this.overlay=null;this.ctx=null;this._mounted=false;this.capabilities.delete('hud');
    for(const cap of this._nativeCapabilities)this.capabilities.delete(cap);
    this._nativeCapabilities.clear();this._nativeActive=false;
  }
}
