import {test} from 'node:test';
import assert from 'node:assert/strict';
import {KillAura,AutoClicker,TriggerBot,AutoCrit,TargetHUD,fallingOpportunity} from '../src/modules/combat-modules.js';
import {Macros} from '../src/modules/misc-modules.js';
import {Module} from '../src/core/module.js';
import {ModuleManager} from '../src/core/module-manager.js';
import {MockAdapter} from '../src/core/adapter.js';
import {EventBus,Events} from '../src/core/event-bus.js';
function setup(t){
 let now=0;t.mock.method(performance,'now',()=>now);
 const game=new MockAdapter();game.setWorldLoaded(true);
 const attacks=[],rotations=[];let allowed=true;
 Object.assign(game,{attack:e=>{attacks.push({id:e?.id,at:now});return true},cancelAttacks:()=>{},setRotation:(...r)=>rotations.push(r),_gameplayInputAllowed:()=>allowed});
 game.entities=[{id:1,x:0,y:64,z:2,health:20,passive:true,visible:true}];
 const manager=new ModuleManager({game,bus:new EventBus()});manager.client={keybinds:{},isFriend:n=>n==='friend'};
 const aura=manager.register(new KillAura());aura.settings.get('passive').set(true);aura.enable();
 return {game,manager,aura,attacks,rotations,time:n=>now=n,allowed:v=>allowed=v};
}
test('KillAura fractional deadlines deliver configured CPS under tick jitter',t=>{
 const {aura,attacks,time}=setup(t);aura.settings.get('cps').set(8);
 for(let n=0;n<1000;n+=50){time(n);aura.onTick()}
 assert.equal(attacks.length,8);assert.deepEqual(attacks.map(a=>a.at),[0,150,250,400,500,650,750,900]);
});
test('KillAura ignores duplicate callbacks and discards stall backlog',t=>{
 const {aura,attacks,time}=setup(t);aura.settings.get('cps').set(10);
 aura.onTick();aura.onTick();time(5000);aura.onTick();aura.onTick();time(5099);aura.onTick();
 assert.deepEqual(attacks.map(a=>a.at),[0,5000]);time(5100);aura.onTick();assert.equal(attacks.length,3);
});
test('KillAura CPS variation clamps bounds and preserves deterministic fixed timing',t=>{
 const {aura}=setup(t);aura.settings.get('cps').set(10);aura.settings.get('cps-variation').set(2);
 t.mock.method(Math,'random',()=>0);assert.equal(aura._interval(),125);Math.random.mock.mockImplementation(()=>1);assert.equal(aura._interval(),1000/12);
 aura.settings.get('cps').set(1);Math.random.mock.mockImplementation(()=>0);assert.equal(aura._interval(),2000);
 aura.settings.get('cps').set(20);Math.random.mock.mockImplementation(()=>1);assert.equal(aura._interval(),50);
});
test('KillAura GUI block clears timing, targets and queued attacks without a resume burst',t=>{
 const {aura,game,attacks,time,allowed}=setup(t);let cleared=0;game.cancelAttacks=()=>cleared++;
 aura.onTick();allowed(false);time(1000);aura.onTick();assert.equal(aura._targetId,null);assert.equal(cleared,1);
 allowed(true);time(1010);aura.onTick();assert.equal(attacks.length,1);time(1500);aura.onTick();assert.equal(attacks.length,2);
 aura.disable();assert.equal(cleared,2);assert.equal(aura._nextAttack,0);aura.enable();aura.onTick();assert.equal(attacks.length,3);
});
test('KillAura target switch delay and loss/reacquisition use current snapshots',t=>{
 const {aura,game,attacks,time}=setup(t);aura.settings.get('cps').set(20);aura.onTick();
 game.entities[0]={...game.entities[0],id:2};time(100);aura.onTick();time(249);aura.onTick();assert.equal(attacks.length,1);
 time(250);aura.onTick();assert.equal(attacks.at(-1).id,2);game.entities=[];aura.onTick();assert.equal(aura._targetId,null);
 game.entities=[{id:3,x:0,y:64,z:1,health:10,hostile:true}];time(1000);aura.onTick();assert.equal(attacks.at(-1).id,3);
});
test('KillAura rejects friends, disabled classifications, occlusion, nonliving and malformed targets',t=>{
 const {aura,game}=setup(t);aura.settings.get('players').set(false);aura.settings.get('hostile').set(false);
 const base=game.entities[0];game.entities=[base,{...base,id:2,isPlayer:true},{...base,id:3,hostile:true},{...base,id:4,visible:false},{...base,id:5,name:'friend'},{...base,id:6,health:-1},{...base,id:7,x:NaN},{...base,id:8,z:10},{...base,id:9,isSelf:true},{...base,id:10,health:NaN}];
 assert.deepEqual(aura._targets().map(t=>t.entity.id),[1]);aura.settings.get('passive').set(false);assert.deepEqual(aura._targets(),[]);
});
test('KillAura priorities and bounded multi-target attack rotate only toward primary',t=>{
 const {aura,game,attacks,rotations}=setup(t);const base=game.entities[0];game.entities=[base,{...base,id:2,health:5,z:1}];
 aura.settings.get('priority').set('lowest-health');assert.equal(aura._targets()[0].entity.id,2);
 aura.settings.get('priority').set('highest-health');assert.equal(aura._targets()[0].entity.id,1);
 aura.settings.get('priority').set('closest');assert.equal(aura._targets()[0].entity.id,2);
 aura.settings.get('multi').set(true);aura.onTick();assert.deepEqual(attacks.map(a=>a.id),[2,1]);assert.equal(rotations.length,1);
});
test('KillAura rotates smoothly between attacks and honors rotation off',t=>{
 const {aura,time,attacks,rotations}=setup(t);aura.onTick();time(50);aura.onTick();assert.equal(rotations.length,2);assert.equal(attacks.length,1);
 assert.equal(rotations[1][2],.6);aura.settings.get('rotate').set(false);time(100);aura.onTick();assert.equal(rotations.length,2);
});
test('falling opportunity rejects missing state and known critical exclusions',()=>{
 const p={onGround:false,fallDistance:.1,velocity:{y:-.1},effects:[]};assert.equal(fallingOpportunity(p),true);
 for(const extra of [{onGround:true},{fallDistance:0},{velocity:{y:.1}},{sprinting:true},{usingItem:true},{dead:true},{effects:[{name:'minecraft:blindness'}]}])assert.equal(fallingOpportunity({...p,...extra}),false);
 assert.equal(fallingOpportunity(null),false);
});
test('prefer-falling waits within a bound then starts a full interval from delivery',t=>{
 const {aura,time,attacks,game}=setup(t);aura.settings.get('attack-mode').set('prefer-falling');aura.onTick();time(249);aura.onTick();assert.equal(attacks.length,0);
 time(250);aura.onTick();assert.equal(attacks.length,1);assert.equal(aura._nextAttack,750);
 time(750);Object.assign(game.player,{onGround:false,fallDistance:.2,velocity:{y:-.1}});aura.onTick();assert.equal(attacks.length,2);
});
test('rejected native attacks do not consume the scheduler deadline',t=>{
 const {aura,game,time}=setup(t);game.attack=()=>false;aura.onTick();assert.equal(aura._nextAttack,0);time(50);game.attack=()=>true;aura.onTick();assert.equal(aura._nextAttack,550);
});
test('combat ownership prevents TriggerBot and AutoClicker duplicate attacks',t=>{
 const {manager,aura,attacks,game}=setup(t);game.getCrosshairTargetEntity=()=>game.entities[0];game.heldItemIsWeapon=()=>true;
 const trigger=manager.register(new TriggerBot()),clicker=manager.register(new AutoClicker());trigger.enable();clicker.enable();manager.tick();assert.equal(attacks.length,1);
 aura.disable();manager.tick();assert.equal(attacks.length,2);trigger.disable();for(let i=0;i<3;i++)manager.tick();assert.equal(attacks.length,3);
 clicker.disable();clicker.enable();assert.equal(clicker._leftAccum,0);
});
test('Criticals uses filtered aura targets and never claims a jump is a critical',t=>{
 const {aura,manager,game}=setup(t);let jumps=0;game.isOnGround=()=>true;game.jump=()=>jumps++;
 const crit=manager.register(new AutoCrit());crit.enable();crit.onTick();assert.equal(jumps,1);
 aura.settings.get('passive').set(false);crit.onTick();assert.equal(jumps,1);
 crit.settings.get('mode').set('packet');assert.match(crit.ineligibilityReason(),/packet hook/);
});
test('capability loss/recovery and world unload reset combat state',t=>{
 const {aura,manager,game}=setup(t);aura.onTick();game.setWorldLoaded(false);manager.revalidateAll();assert.equal(aura.active,false);assert.equal(aura._targetId,null);
 game.setWorldLoaded(true);manager.revalidateAll();assert.equal(aura.active,true);assert.equal(aura._nextAttack,0);
});
test('Macros routes modifier-matched client binds and cancels on UI or world exit',t=>{
 const {manager,aura}=setup(t);aura.disable();const macros=manager.register(new Macros()),target=manager.register(new Module({id:'sample'}));target.bind.set('KeyP');macros.enable();
 macros.addMacro('bound',{key:'KeyM',modifiers:{ctrl:true}},[{action:'bind',key:'KeyP'}]);
 assert.equal(manager.onKeybindPressed({key:'KeyM'}),false);assert.equal(manager.onKeybindPressed({key:'KeyM',modifiers:{ctrl:true}}),true);macros.onTick();assert.equal(target.active,true);
 macros.runByName('bound');manager.client.keybinds.guiOpen=true;macros.onTick();assert.equal(macros._running,null);assert.equal(target.active,true);
 manager.client.keybinds.guiOpen=false;macros.runByName('bound');manager.bus.emit(Events.WorldUnload,{});assert.equal(macros._running,null);
 macros.disable();assert.equal(macros.runByName('bound'),false);
});
test('Target HUD ignores dead targets and scales its health bar',t=>{
 const {manager,game}=setup(t);const hud=manager.register(new TargetHUD());game.entities[0].dead=true;assert.equal(hud._target(),null);
 game.entities[0].dead=false;hud.settings.get('hud-scale').set(2);const rects=[];hud._drawBar({ctx:{fillRect:(...r)=>rects.push(r)}});assert.equal(rects[0][2],200);assert.equal(rects[0][3],12);
});

test('disabling secondary combat modules preserves an active primary attack queue',t=>{
 const {manager,game,aura}=setup(t);let cleared=0;game.cancelAttacks=()=>cleared++;
 const trigger=manager.register(new TriggerBot()),clicker=manager.register(new AutoClicker());trigger.enable();clicker.enable();trigger.disable();clicker.disable();assert.equal(cleared,0);
 aura.disable();assert.equal(cleared,1);trigger.enable();clicker.enable();clicker.disable();assert.equal(cleared,1);trigger.disable();assert.equal(cleared,2);
});
