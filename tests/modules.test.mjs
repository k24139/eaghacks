import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom } from "./helpers.mjs";

ensureDom();
const { Module } = await import("../src/core/module.js");
const { ModuleManager } = await import("../src/core/module-manager.js");
const { EventBus } = await import("../src/core/event-bus.js");
const { MockAdapter, NullAdapter } = await import("../src/core/adapter.js");

function makeManager(adapter) {
  if (!adapter) {
    adapter = new MockAdapter();
    // Most lifecycle tests need a loaded world, because modules default to
    // running only inside a world.
    adapter.setWorldLoaded(true);
  }
  const bus = new EventBus();
  const notify = [];
  const mm = new ModuleManager({ bus, game: adapter, onNotify: (t, l) => notify.push({ t, l }) });
  return { mm, bus, notify, adapter };
}

test("a module cannot enable when a required capability is missing", () => {
  const { mm } = makeManager(new NullAdapter());
  const m = new Module({ id: "needs-world", name: "Needs World", category: "Render", requiredCapabilities: ["world"] });
  mm.register(m);
  assert.equal(m.canEnable(), false);
  m.enable();
  assert.equal(m.active, false);
  assert.match(m.ineligibilityReason(), /world/);
});

test("enable/disable calls lifecycle hooks exactly once each", () => {
  const { mm } = makeManager();
  let enables = 0;
  let disables = 0;
  class M extends Module {
    onEnable() {
      enables++;
    }
    onDisable() {
      disables++;
    }
  }
  const m = new M({ id: "x", name: "X", category: "Misc" });
  mm.register(m);
  m.enable();
  m.enable();
  m.disable();
  m.disable();
  assert.equal(enables, 1);
  assert.equal(disables, 1);
  assert.equal(m.active, false);
});

test("a module that throws in onTick is disabled and does not break the others", () => {
  const { mm, notify } = makeManager();
  let goodTicks = 0;
  class Bad extends Module {
    onTick() {
      throw new Error("tick boom");
    }
  }
  class Good extends Module {
    onTick() {
      goodTicks++;
    }
  }
  const bad = new Bad({ id: "bad", name: "Bad", category: "Misc" });
  const good = new Good({ id: "good", name: "Good", category: "Misc" });
  mm.registerAll([bad, good]);
  bad.enable();
  good.enable();
  mm.tick(1);
  assert.equal(bad.active, false, "crashing module is disabled");
  assert.equal(good.active, true, "unrelated module keeps running");
  assert.equal(goodTicks, 1);
  assert.ok(notify.some((n) => n.l === "error"));
  assert.ok(bad.errorCount >= 1);
});

test("an exception during onEnable leaves the module disabled", () => {
  const { mm } = makeManager();
  class Boom extends Module {
    onEnable() {
      throw new Error("cannot enable");
    }
  }
  const m = new Boom({ id: "boom", name: "Boom", category: "Misc" });
  mm.register(m);
  m.enable();
  assert.equal(m.active, false);
});

test("adapter swap disables modules whose capabilities disappeared", () => {
  const adapter = new MockAdapter();
  adapter.setWorldLoaded(true);
  const { mm } = makeManager(adapter);
  const m = new Module({ id: "w", name: "World Only", category: "Render", requiredCapabilities: ["world"] });
  mm.register(m);
  m.enable();
  assert.equal(m.active, true);
  mm.game = new NullAdapter();
  const changed = mm.revalidateAll();
  assert.equal(m.active, false);
  assert.deepEqual(changed.map((c) => c.id), ["w"]);
});

test("keybinds toggle the matching module and modifiers take precedence", () => {
  const { mm } = makeManager();
  const plain = new Module({ id: "p", name: "Plain", category: "Misc" });
  const modded = new Module({ id: "m", name: "Modded", category: "Misc" });
  mm.registerAll([plain, modded]);
  plain.bind.set({ key: "KeyG", mouse: null, modifiers: {} });
  modded.bind.set({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
  mm.onKeybindPressed({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
  assert.equal(modded.active, true);
  assert.equal(plain.active, false);
  mm.onKeybindPressed({ key: "KeyG", mouse: null, modifiers: {} });
  assert.equal(plain.active, true);
});

test("search matches name, id and description", () => {
  const { mm } = makeManager();
  mm.registerAll([
    new Module({ id: "kill-aura", name: "KillAura", description: "attacks nearby targets", category: "Combat" }),
    new Module({ id: "fullbright", name: "Fullbright", description: "brighter world", category: "Render" }),
  ]);
  assert.equal(mm.search("kill")[0].id, "kill-aura");
  assert.equal(mm.search("brighter")[0].id, "fullbright");
  assert.equal(mm.search("aura")[0].id, "kill-aura");
  assert.equal(mm.search("zzzz").length, 0);
});

test("favourites persist on the module rather than the GUI", () => {
  const { mm } = makeManager();
  const m = new Module({ id: "fav", name: "Fav", category: "Misc" });
  mm.register(m);
  assert.equal(mm.isFavourite(m), false);
  mm.toggleFavourite(m);
  assert.equal(mm.isFavourite(m), true);
  assert.deepEqual(mm.favouriteIds(), ["fav"]);
});

test("duplicate module ids are rejected at registration", () => {
  const { mm } = makeManager();
  mm.register(new Module({ id: "dup", name: "A", category: "Misc" }));
  assert.throws(() => mm.register(new Module({ id: "dup", name: "B", category: "Misc" })), /duplicate module id/);
});

test("a module throwing in onInit is registered but marked unsupported", () => {
  const { mm } = makeManager();
  class BadInit extends Module {
    onInit() {
      throw new Error("init fail");
    }
  }
  const m = new BadInit({ id: "badinit", name: "BadInit", category: "Misc" });
  mm.register(m);
  assert.equal(mm.get("badinit"), m);
  assert.equal(m.unsupported, true);
  assert.match(m.unsupportedReason, /init failed/);
});

test('crashed modules release subscriptions before re-enable', () => {
  const { mm, bus } = makeManager();
  let calls = 0;
  class Listening extends Module {
    onEnable() { this.subscribe('probe', () => calls++); }
    onTick() { throw new Error('expected regression test crash'); }
  }
  const module = mm.register(new Listening({ id: 'listening' }));
  module.enable();
  assert.equal(bus.listenerCount('probe'), 1);
  mm.tick();
  assert.equal(bus.listenerCount('probe'), 0);
  module.enable();
  assert.equal(bus.listenerCount('probe'), 1);
  bus.emit('probe');
  assert.equal(calls, 1);
});

test('AutoEat waits for native slot confirmation and releases input and restores its slot',async()=>{
 const{AutoEat}=await import('../src/modules/world-modules.js');const{mm,adapter}=makeManager();let selected=4,pending,held=false,starts=0,restored;const player={hunger:10,usingItem:false};
 Object.assign(adapter,{getPlayer:()=>player,getSelectedSlot:()=>selected,findFoodInHotbar:()=>1,selectSlot:value=>{pending=value;return true;},startUsingItem:()=>{held=true;starts++;},stopUsingItem:()=>{held=false;},restoreSelectedSlot:value=>{restored=value;}});
 const module=mm.register(new AutoEat());module.enable();mm.tick(1);assert.equal(pending,1);assert.equal(held,false);selected=pending;mm.tick(2);assert.equal(held,true);player.usingItem=true;mm.tick(3);assert.equal(starts,1);module.disable();assert.equal(held,false);assert.equal(restored,4);assert.equal(module._eatenSlot,null);
});

test('session statistics and debug listeners disable cleanly and can be enabled again',async()=>{
 const{SessionStats,DebugConsole}=await import('../src/modules/misc-modules.js');const{mm,bus}=makeManager();
 for(const module of [new SessionStats(),new DebugConsole()]){mm.register(module);module.enable();assert.equal(module.active,true);module.disable();assert.equal(module.active,false);module.enable();module.disable();assert.equal(module.errorCount,0);}
 const stats=mm.get('session-stats');stats.enable();bus.emit('player-move',{distance:1.5});bus.emit('player-death',{});assert.equal(stats.stats.distance,1.5);assert.equal(stats.stats.deaths,1);stats.disable();bus.emit('player-death',{});assert.equal(stats.stats.deaths,1);
});
test('KillAura angle priority selects the centered target rather than the closest',async()=>{
 const{KillAura}=await import('../src/modules/combat-modules.js');const{mm,adapter}=makeManager();adapter.entities=[{id:1,x:1,y:64,z:0,passive:true,visible:true},{id:2,x:0,y:64,z:2,passive:true,visible:true}];const module=mm.register(new KillAura());module.settings.get('passive').set(true);module.settings.get('priority').set('angle');assert.equal(module._targets()[0].entity.id,2);module.settings.get('priority').set('closest');assert.equal(module._targets()[0].entity.id,1);
});

test('disabling a macro cancels its pending action instead of resuming later',async()=>{
 const{Macros}=await import('../src/modules/misc-modules.js');const{mm}=makeManager();const target=mm.register(new Module({id:'sprint',name:'Target',category:'Movement'}));const macro=mm.register(new Macros());macro.enable();assert.equal(macro.runByName('example'),true);macro.disable();macro.enable();mm.tick(1);assert.equal(target.active,false);macro.runByName('example');mm.tick(1);assert.equal(target.active,true);macro.disable();target.disable();
});

test('Criticals refuses packet mode without a hook and defaults to the available jump mode',async()=>{
 const{AutoCrit}=await import('../src/modules/combat-modules.js');const{mm}=makeManager();const module=mm.register(new AutoCrit());assert.equal(module.settings.get('mode').value,'jump');assert.equal(module.enable(),true);module.disable();module.settings.get('mode').set('packet');assert.equal(module.enable(),false);assert.match(module.ineligibilityReason(),/packet hook/);assert.equal(module.errorCount,0);
});

test('AutoGG cancels delayed chat on disable and world exit',async()=>{
 const{AutoGG}=await import('../src/modules/misc-modules.js');const{mm,bus,adapter}=makeManager();let sent=0;adapter.capabilities.add('chat');adapter.sendChat=()=>sent++;const module=mm.register(new AutoGG());module.settings.get('delay').set(0);module.enable();bus.emit('player-death',{});module.disable();await new Promise(r=>setTimeout(r,10));assert.equal(sent,0);module.enable();bus.emit('player-death',{});bus.emit('world-unload',{});await new Promise(r=>setTimeout(r,10));assert.equal(sent,0);module.disable();
});

test('Debug Console error and event settings change while enabled',async()=>{
 const{DebugConsole}=await import('../src/modules/misc-modules.js');const{mm,bus}=makeManager();const module=mm.register(new DebugConsole());module.settings.get('events').set(false);module.settings.get('modules').set(false);module.enable();const before=module.lines.length;bus.emit('notification',{level:'error',text:'probe'});assert.equal(module.lines.length,before+1);assert.match(module.lines.at(-1),/error probe/);module.settings.get('errors').set(false);bus.emit('notification',{level:'error',text:'hidden'});assert.equal(module.lines.length,before+1);module.disable();
});

test('aim and trigger ignore dead, occluded and friendly native targets',async()=>{
 const{AimAssist,TriggerBot}=await import('../src/modules/combat-modules.js');const{mm,adapter}=makeManager();mm.client={isFriend:name=>name==='friend'};let actions=0;Object.assign(adapter,{setRotation:()=>actions++,attack:()=>actions++,heldItemIsWeapon:()=>true});
 const aim=mm.register(new AimAssist()),trigger=mm.register(new TriggerBot());aim.enable();trigger.enable();
 for(const extra of [{dead:true},{visible:false},{name:'friend'}]){const target={id:1,x:0,y:64,z:2,visible:true,...extra};adapter.entities=[target];adapter.getCrosshairTargetEntity=()=>target;mm.tick(1);}
 assert.equal(actions,0);
});

test('combat modules ignore native nonliving entities with sentinel health',async()=>{
 const{KillAura,AimAssist,TriggerBot}=await import('../src/modules/combat-modules.js');const{mm,adapter}=makeManager();let actions=0;
 const item={id:99,x:0,y:64,z:1,health:-1,visible:true,passive:true};adapter.entities=[item];Object.assign(adapter,{getCrosshairTargetEntity:()=>item,heldItemIsWeapon:()=>true,attack:()=>actions++,setRotation:()=>actions++});
 const aura=mm.register(new KillAura());aura.settings.get('passive').set(true);assert.deepEqual(aura._targets(),[]);
 for(const m of [new AimAssist(),new TriggerBot()]){mm.register(m);m.enable();m.onTick();m.disable();}assert.equal(actions,0);
});

test('AutoRespawn counts logical ticks and cancels pending respawn on disable',async()=>{
 const{AutoRespawn}=await import('../src/modules/world-modules.js');const{mm,bus,adapter}=makeManager();let respawns=0;adapter.respawn=()=>respawns++;const m=mm.register(new AutoRespawn());m.settings.get('delay').set(10);m.enable();bus.emit('player-death',{});mm.tick(5);assert.equal(respawns,0);mm.tick(5);assert.equal(respawns,1);bus.emit('player-death',{});m.disable();m.enable();mm.tick(20);assert.equal(respawns,1);m.disable();
});

test('Aim Assist yields rotation to KillAura and resumes after its target or ownership disappears',async()=>{
 const{KillAura,AimAssist}=await import('../src/modules/combat-modules.js');const{mm,adapter}=makeManager();const rotations=[];adapter.entities=[{id:1,x:1,y:64,z:1,health:10,passive:true,visible:true},{id:2,x:0,y:64,z:2,health:10,passive:true,visible:true}];Object.assign(adapter,{setRotation:(yaw,pitch)=>rotations.push({yaw,pitch}),attack:()=>true});const aura=mm.register(new KillAura()),aim=mm.register(new AimAssist());aura.settings.get('passive').set(true);aim.settings.get('fov').set(180);aura.enable();aim.enable();mm.tick(1);assert.equal(rotations.length,1);assert.equal(rotations[0].yaw,-45);aura.settings.get('rotate').set(false);mm.tick(1);assert.equal(rotations.length,2);assert.equal(Math.abs(rotations[1].yaw),0);aura.disable();mm.tick(1);assert.equal(rotations.length,3);aim.disable();
});
