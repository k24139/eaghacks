import test from 'node:test';
import assert from 'node:assert/strict';
import { EaglercraftBrowserAdapter } from '../src/integration/eaglercraft-adapter.js';

function setup() {
  const win = { addEventListener() {}, __eaglerGameReady: true, __eaglerWorldReady: true, minecraftServer: 'singleplayer', __eaghacksScreenHookSeen: true, __eaghacksScreenState: { screenName: null } };
  const doc = { pointerLockElement: null, getElementById() { return null; }, querySelector() { return null; } };
  return { win, adapter: new EaglercraftBrowserAdapter({ window: win, document: doc }) };
}

function installState(win) {
  win.__eaghacksNativeState = {
    version: 1,
    tick: 42,
    world: { time: 6000, dimension: 'minecraft:overworld', biome: null },
    player: { x: 1, y: 64, z: 2, yaw: 90, pitch: -5, health: 18, maxHealth: 20, hunger: 17, onGround: true, name: 'Player', velocity: { x: 0.1, y: 0, z: -0.2 } },
    camera: { x: 0, y: 0, z: 0, m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    entities: [
      { id: 7, name: 'Player', x: 1, y: 64, z: 2, isSelf: true, isPlayer: true, visible: true },
      { id: 9, name: 'Zombie', x: 3, y: 64, z: 2, isSelf: false, hostile: true, visible: true },
    ],
    inventory: {
      selectedSlot: 4,
      hotbar: [
        { slot: 0, id: 'minecraft:bread', name: 'Bread', count: 4, durability: -1, maxDurability: 0, food: true, nutrition: 5, saturation: 6 },
        null, null, null,
        { slot: 4, id: 'minecraft:diamond_pickaxe', name: 'Diamond Pickaxe', count: 1, durability: 1200, maxDurability: 1561, food: false, nutrition: 0, saturation: 0 },
      ],
      armor: [{ slot: 0, id: 'minecraft:diamond_boots', name: 'Diamond Boots', count: 1, durability: 300, maxDurability: 429, food: false, nutrition: 0, saturation: 0 }],
    },
    crosshairEntityId: 9,
    features: { directMovement: true, combat: true, render: true, inventoryRead: true },
  };
}

test('native snapshot adds only verified capabilities and exposes real state', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.hasCapability('world'), true);
  assert.equal(adapter.hasCapability('entities'), true);
  assert.equal(adapter.hasCapability('native-direct'), true);
  assert.equal(adapter.hasCapability('render'), true);
  assert.equal(adapter.hasCapability('native-inventory-read'), true);
  assert.equal(adapter.hasCapability('movement'), false);
  assert.equal(adapter.hasCapability('inventory'), false, 'read metadata does not imply full inventory mutation support');
  assert.deepEqual(adapter.getPlayer(), win.__eaghacksNativeState.player);
  assert.deepEqual(adapter.getWorld(), {...win.__eaghacksNativeState.world,day:0});
  assert.equal(adapter.getCrosshairTargetEntity()?.id, 9);
  assert.equal(adapter.isOnGround(), true);
  assert.deepEqual(adapter.getPlayerVelocity(), { x: 0.1, y: 0, z: -0.2 });
});

test('native actions are queued atomically for the Java tick bridge', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.setRotation(12.5, -7, 0.5), true);
  assert.equal(adapter.setPlayerVelocity(1, 2, 3), true);
  assert.equal(adapter.setSprinting(true), true);
  assert.equal(adapter.setSneaking(false), true);
  assert.equal(adapter.jump(), true);
  assert.equal(adapter.attack({ id: 9 }), true);
  assert.equal(adapter.useItem('offhand'), true);
  assert.deepEqual(win.__eaghacksNativeCommands, {
    rotation: { yaw: 51.25, pitch: -6 }, velocity: { x: 1, y: 2, z: 3 },
    sprinting: true, sneaking: false, jump: true, attackEntityId: 9, useItem: 'offhand',
  });
});

test('native capabilities disappear cleanly when the bridge snapshot disappears', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  delete win.__eaghacksNativeState; adapter.update();
  assert.equal(adapter.hasCapability('world'), false);
  assert.equal(adapter.hasCapability('entities'), false);
  assert.equal(adapter.hasCapability('native-direct'), false);
  assert.equal(adapter.hasCapability('render'), false);
  assert.equal(adapter.hasCapability('native-inventory-read'), false);
  assert.equal(adapter.hasCapability('input'), true);
});

test('native camera matrix projects world coordinates into the overlay viewport', () => {
  const { win, adapter } = setup(); win.innerWidth = 800; win.innerHeight = 600; installState(win); adapter.update();
  assert.deepEqual(adapter.worldToScreen(0, 0, 0), { x: 400, y: 300, depth: 0, behind: false, visible: true });
  const topRight = adapter.worldToScreen(1, 1, 0);
  assert.equal(topRight.x, 800); assert.equal(topRight.y, 0); assert.equal(topRight.visible, true);
  assert.equal(adapter.projectEntityCentered({ x: 0, y: 0, z: 0, height: 2 }).y, 0);
});

test('native inventory helpers expose held durability and food selection without broad inventory capability', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.getHeldItem()?.id, 'minecraft:diamond_pickaxe');
  assert.equal(adapter.getHeldItem()?.durability, 1200);
  assert.equal(adapter.findFoodInHotbar('bread'), 0);
  assert.equal(adapter.findFoodInHotbar('auto'), 0);
  assert.equal(adapter.findFoodInHotbar('cooked_beef'), -1);
  assert.equal(adapter.hasCapability('inventory'), false);
});

test('native commands stop in menus and pending commands do not cross sessions', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.attack({ id: 9 }), true);
  win.__eaghacksScreenState.screenName = 'PauseScreen';
  assert.equal(adapter.jump(), false);
  assert.equal(adapter.selectSlot(2), false);
  assert.equal(adapter.setRotation(5, 10), false);
  assert.equal(adapter.setPlayerVelocity(1, 2, 3), false);
  assert.equal(adapter.useItem(), false);
  assert.equal(adapter.setSprinting(false), true, 'cleanup remains possible');
  adapter.update();
  assert.deepEqual(win.__eaghacksNativeCommands, { sprinting: false });
  win.__eaghacksScreenState.screenName = null;
  win.__eaglerWorldReady = false;
  assert.equal(adapter.attack({ id: 9 }), false);
});

test('native local and remote identity override the legacy null server string',()=>{
 const {win,adapter}=setup();installState(win);win.minecraftServer=null;win.__eaghacksNativeState.session={kind:'local',paused:false};adapter.update();assert.equal(adapter.isRemote(),false);win.__eaghacksNativeState.session.kind='remote';assert.equal(adapter.isRemote(),true);delete win.__eaghacksNativeState.session;assert.equal(adapter.isRemote(),true);
});
test('native options and cleanup remain writable in menus without permitting gameplay',()=>{
 const{win,adapter}=setup();installState(win);Object.assign(win.__eaghacksNativeState.features,{brightnessControl:true,fovControl:true,hurtCameraControl:true});win.__eaghacksNativeState.session={kind:'local',paused:true};win.__eaghacksNativeState.options={fov:70,brightness:.5};adapter.update();assert.equal(adapter.getFov(),70);assert.equal(adapter.setFov(17.5),true);assert.equal(adapter.setBrightness(1),true);assert.equal(adapter.setHurtCam(false),true);assert.equal(adapter.jump(),false);adapter.update();assert.deepEqual(win.__eaghacksNativeCommands,{fov:17.5,brightness:1,noHurtCamera:true});delete win.__eaghacksNativeState;adapter.update();assert.equal(win.__eaghacksNativeCommands,undefined);assert.equal(adapter.hasCapability('fov-control'),false);
});
test('native load, death, respawn and unload events follow real snapshot transitions',()=>{
 const{win,adapter}=setup();installState(win);adapter.update();assert.equal(adapter.drainEvents().filter(e=>e.type==='world-load').length,1);win.__eaghacksNativeState=structuredClone(win.__eaghacksNativeState);win.__eaghacksNativeState.player.dead=true;adapter.update();assert.equal(adapter.drainEvents().filter(e=>e.type==='player-death').length,1);win.__eaghacksNativeState=structuredClone(win.__eaghacksNativeState);win.__eaghacksNativeState.player.dead=false;adapter.update();assert.equal(adapter.drainEvents().filter(e=>e.type==='player-respawn').length,1);delete win.__eaghacksNativeState;adapter.update();assert.equal(adapter.drainEvents().filter(e=>e.type==='world-unload').length,1);assert.equal(adapter._previousNative,null);
});
test('game-consumed input is owned once and released on focus loss and shutdown',async()=>{
 const{JSDOM}=await import('jsdom');const dom=new JSDOM('<div id="game_frame"><canvas></canvas></div>');const win=dom.window;
 Object.assign(win,{__eaglerGameReady:true,__eaglerWorldReady:true,__eaghacksScreenHookSeen:true,__eaghacksScreenState:{screenName:null}});
 win.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){}});
 const adapter=new EaglercraftBrowserAdapter({window:win,document:win.document});installState(win);adapter.mount();adapter.update();const events=[],canvas=adapter.getGameCanvas();
 for(const type of ['mousedown','mouseup','keydown','keyup'])canvas.addEventListener(type,e=>{e.preventDefault();events.push([type,e.button??e.code]);});
 assert.equal(adapter.startUsingItem(),true);assert.equal(adapter.startUsingItem(),true);assert.equal(adapter.setForward(true),true);assert.equal(events.length,2);
 win.dispatchEvent(new win.Event('blur'));assert.equal(events.length,4);assert.equal(adapter._syntheticUseHeld,false);assert.equal(adapter._syntheticHeld.size,0);assert.equal(adapter.startUsingItem(),false);assert.equal(adapter.jump(),false);
 win.dispatchEvent(new win.Event('focus'));assert.equal(adapter.startUsingItem(),true);adapter.dispose();assert.equal(events.at(-1)[0],'mouseup');
});

test('native movement emits traveled distance while teleports and world changes are excluded',()=>{
 const{win,adapter}=setup();installState(win);adapter.update();adapter.drainEvents();win.__eaghacksNativeState=structuredClone(win.__eaghacksNativeState);win.__eaghacksNativeState.player.x+=.5;adapter.update();assert.equal(adapter.drainEvents().find(e=>e.type==='player-move').distance,.5);win.__eaghacksNativeState=structuredClone(win.__eaghacksNativeState);win.__eaghacksNativeState.player.x+=100;adapter.update();assert.equal(adapter.drainEvents().some(e=>e.type==='player-move'),false);
});

test('native weapon checks distinguish a held melee weapon from food and tools',()=>{
 const{win,adapter}=setup();installState(win);adapter.update();assert.equal(adapter.heldItemIsWeapon(),false);win.__eaghacksNativeState.inventory.hotbar[4].id='minecraft:diamond_sword';assert.equal(adapter.heldItemIsWeapon(),true);win.__eaghacksNativeState.inventory.hotbar[4].id='minecraft:bread';assert.equal(adapter.heldItemIsWeapon(),false);
});

test('compiled native client requires a live player even when boot signals remain sticky',()=>{
 const{win,adapter}=setup();win.__eaghacksNativeBridge={version:1};assert.equal(adapter.inWorld(),false);installState(win);adapter.update();assert.equal(adapter.inWorld(),true);delete win.__eaghacksNativeState;adapter.update();assert.equal(adapter.inWorld(),false);
});

test('native pause gates input without unloading the world when the screen hook is absent',()=>{
 const{win,adapter}=setup();installState(win);delete win.__eaghacksScreenState;win.__eaghacksScreenHookSeen=false;win.__eaghacksNativeState.session={kind:'local',paused:false};adapter.update();assert.equal(adapter.inWorld(),true);win.__eaghacksNativeState.session.paused=true;assert.equal(adapter.inWorld(),true);assert.equal(adapter.jump(),false);
});

test('effect, biome and crosshair capabilities track their native contract and restore in menus',()=>{
 const{win,adapter}=setup();installState(win);Object.assign(win.__eaghacksNativeState.features,{effects:true,biome:true,crosshairControl:true});win.__eaghacksNativeState.options={hideCrosshair:false};win.__eaghacksNativeState.session={kind:'local',paused:true};adapter.update();for(const cap of ['effects','biome','crosshair-control'])assert.equal(adapter.hasCapability(cap),true);assert.equal(adapter.getVanillaCrosshairVisible(),true);assert.equal(adapter.setVanillaCrosshairVisible(false),true);assert.deepEqual(win.__eaghacksNativeCommands,{hideCrosshair:true});assert.equal(adapter.setVanillaCrosshairVisible(true),true);assert.deepEqual(win.__eaghacksNativeCommands,{hideCrosshair:false});delete win.__eaghacksNativeState;adapter.update();assert.equal(adapter.hasCapability('crosshair-control'),false);assert.equal(win.__eaghacksNativeCommands,undefined);
});

test('native multi-target commands preserve distinct attacks, cap batches and cancel on disable',()=>{
 const{win,adapter}=setup();installState(win);win.__eaghacksNativeState.features.multiAttack=true;adapter.update();assert.equal(adapter.hasCapability('native-multi-attack'),true);for(let id=100;id<116;id++)assert.equal(adapter.attack({id}),true);assert.equal(adapter.attack({id:999}),false);assert.equal(adapter.attack({id:100}),true);assert.deepEqual(win.__eaghacksNativeCommands.attackEntityId,Array.from({length:16},(_,i)=>100+i));adapter.cancelAttacks();assert.equal(win.__eaghacksNativeCommands.attackEntityId,undefined);
});

test('only an owned slot restoration is tagged to survive a native menu',()=>{
 const{win,adapter}=setup();installState(win);win.__eaghacksNativeState.session={kind:'local',paused:true};adapter.update();assert.equal(adapter.selectSlot(2),false);assert.equal(adapter.restoreSelectedSlot(2),true);adapter.update();assert.deepEqual(win.__eaghacksNativeCommands,{selectSlot:2,restoreSlot:true});win.__eaghacksNativeState.inventory.selectedSlot=2;adapter.update();assert.equal(win.__eaghacksNativeCommands,undefined);
});

test('the compiled JavaScript cleanup gate drops stale gameplay while preserving restoration',async()=>{
 const{readFile}=await import('node:fs/promises');const{runInNewContext}=await import('node:vm');const source=await readFile(new URL('../native-bridge/upstream/platform-teavm/src/main/java/net/lax1dude/eaglercraft/v1_8/internal/PlatformMeteorBridge.java',import.meta.url),'utf8');const literal=source.match(/@JSBody\(params = \{\}, script = ("(?:[^"\\]|\\.)*")\)\s+public static native void restrictCommandsToCleanup/)[1];const commands={rotation:{yaw:1,pitch:2},velocity:{x:1,y:2,z:3},jump:true,attackEntityId:[1,2],useItem:'mainhand',swing:true,sprinting:false,sneaking:true,selectSlot:2,restoreSlot:true,brightness:.5,respawn:true};runInNewContext('(function(){'+JSON.parse(literal)+'})()',{globalThis:{__eaghacksNativeCommands:commands}});assert.deepEqual(commands,{sprinting:false,selectSlot:2,brightness:.5,respawn:true});
});

function guiControlFixture(){
 const {win,adapter}=setup();installState(win);const canvas={},ui={open:true},keys=[];
 win.__eaghacksNativeState.session={kind:'local',paused:false};win.__eaghacksNativeState.bridge={sequence:1};
 adapter.getGameCanvas=()=>canvas;adapter.doc.pointerLockElement=canvas;
 adapter.doc.exitPointerLock=()=>{adapter.doc.pointerLockElement=null;};adapter._clientGuiOpen=()=>ui.open;
 adapter._tapKey=code=>{keys.push(code);return true;};return{win,adapter,ui,keys};
}
test('GUI close resumes only its own delayed native pause and only once',()=>{
 const{win,adapter,ui,keys}=guiControlFixture();adapter.setPointerLock(false);ui.open=false;adapter.onGuiClosed();assert.deepEqual(keys,[]);
 win.__eaghacksScreenState.screenName='PauseScreen';win.__eaghacksNativeState.session.paused=true;adapter.update();adapter.update();assert.deepEqual(keys,['Escape']);
});
test('GUI close preserves an existing pause and cancels restoration after world loss',()=>{
 const original=guiControlFixture();original.win.__eaghacksScreenState.screenName='PauseScreen';original.win.__eaghacksNativeState.session.paused=true;original.adapter.setPointerLock(false);original.ui.open=false;original.adapter.onGuiClosed();original.adapter.update();assert.deepEqual(original.keys,[]);
 const changed=guiControlFixture();changed.adapter.setPointerLock(false);changed.ui.open=false;changed.adapter.onGuiClosed();delete changed.win.__eaghacksNativeState;changed.adapter.update();installState(changed.win);changed.win.__eaghacksNativeState.session={kind:'local',paused:true};changed.win.__eaghacksScreenState.screenName='PauseScreen';changed.adapter.update();assert.deepEqual(changed.keys,[]);
});
test('rapid GUI reopening retains pause ownership without sending a premature resume',()=>{
 const{win,adapter,ui,keys}=guiControlFixture();adapter.setPointerLock(false);ui.open=false;adapter.onGuiClosed();ui.open=true;adapter.setPointerLock(false);win.__eaghacksScreenState.screenName='PauseScreen';win.__eaghacksNativeState.session.paused=true;adapter.update();assert.deepEqual(keys,[]);ui.open=false;adapter.onGuiClosed();adapter.update();assert.deepEqual(keys,['Escape']);
});
test('an absent engine pause cannot leave a pending GUI resume for a later user menu',()=>{
 const{win,adapter,ui,keys}=guiControlFixture();adapter.setPointerLock(false);ui.open=false;adapter.onGuiClosed();win.__eaghacksNativeState.bridge.sequence=5;adapter.update();win.__eaghacksScreenState.screenName='PauseScreen';win.__eaghacksNativeState.session.paused=true;adapter.update();assert.deepEqual(keys,[]);
});

test('partial native feature advertisements cannot arm modules needing the direct action contract', async () => {
  const { ModuleManager } = await import('../src/core/module-manager.js');
  const { createEaglercraftModules } = await import('../src/integration/eaglercraft-modules.js');
  for (const missing of ['directMovement', 'combat']) {
    const { win, adapter } = setup();
    installState(win);
    win.__eaghacksNativeState.session = { kind: 'local', paused: false };
    win.__eaghacksNativeState.features[missing] = false;
    adapter.update();
    assert.equal(adapter.hasCapability('native-direct'), false, `missing ${missing}`);
    const manager = new ModuleManager({ game: adapter });
    manager.registerAll(createEaglercraftModules());
    for (const id of ['speed', 'bunny-hop', 'anti-afk', 'kill-aura', 'aim-assist', 'trigger-bot', 'auto-crit', 'auto-eat']) {
      assert.equal(manager.get(id).enable(), false, `${id}: missing ${missing}`);
    }
    win.__eaghacksNativeState.features[missing] = true;
    adapter.update();
    assert.equal(adapter.hasCapability('native-direct'), true);
    assert.equal(manager.get('speed').canEnable(), true);
    manager.get('speed').enable();
    win.__eaghacksNativeState.features[missing] = false;
    adapter.update();
    manager.revalidateAll();
    assert.equal(manager.get('speed').active, false, 'capability loss suspends active modules');
    win.__eaghacksNativeState.features[missing] = true;
    adapter.update();
    manager.revalidateAll();
    assert.equal(manager.get('speed').active, true, 'verified capability restoration resumes modules');
    manager.disableAll();
  }
});

test('native velocity, rotation and swing reject unadvertised actions without queueing commands', () => {
  const { win, adapter } = setup();
  installState(win);
  win.__eaghacksNativeState.features.directMovement = false;
  adapter.update();
  assert.equal(adapter.setPlayerVelocity(1, 0, 0), false);
  assert.equal(adapter.setRotation(90, 0), false);
  assert.equal(win.__eaghacksNativeCommands, undefined);
  win.__eaghacksNativeState.features.directMovement = true;
  win.__eaghacksNativeState.features.combat = false;
  adapter.update();
  assert.equal(adapter.swingHand(), false);
  assert.equal(win.__eaghacksNativeCommands, undefined);
});

test('a new trusted Escape cancels delayed GUI restoration before opening the user pause menu',()=>{
 const {win,adapter,ui,keys}=guiControlFixture();adapter.setPointerLock(false);ui.open=false;adapter.onGuiClosed();
 // The native pause caused by releasing pointer lock has not arrived yet.
 adapter._userKeyDown?.({isTrusted:true,code:'Escape',defaultPrevented:false});
 win.__eaghacksScreenState.screenName='PauseScreen';win.__eaghacksNativeState.session.paused=true;adapter.update();
 assert.deepEqual(keys,[],'restoration must not dismiss the new user menu');
 // Synthetic restoration events and the consumed GUI-close key retain ownership.
 for(const event of [{isTrusted:false,code:'Escape'},{isTrusted:true,code:'Escape',defaultPrevented:true}]){
  const f=guiControlFixture();f.adapter.setPointerLock(false);f.ui.open=false;f.adapter.onGuiClosed();f.adapter._userKeyDown?.(event);
  f.win.__eaghacksScreenState.screenName='PauseScreen';f.win.__eaghacksNativeState.session.paused=true;f.adapter.update();assert.deepEqual(f.keys,['Escape']);
 }
});
