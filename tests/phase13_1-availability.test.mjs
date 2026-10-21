import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EaglercraftBrowserAdapter} from '../src/integration/eaglercraft-adapter.js';
function fixture(){
 const win={addEventListener(){},__eaglerGameReady:true,__eaglerWorldReady:true,__eaghacksNativeBridge:{version:1},__eaghacksScreenHookSeen:true,__eaghacksScreenState:{screenName:'PauseScreen'},__eaghacksNativeState:{version:1,player:{x:0,y:64,z:0},world:{dimension:'minecraft:overworld'},session:{kind:'local',paused:true},features:{directMovement:true,combat:true}}};
 const doc={getElementById(){return null},querySelector(){return null}};return {win,adapter:new EaglercraftBrowserAdapter({window:win,document:doc})};
}
test('a real native player/world remains loaded while paused, with gameplay actions blocked',()=>{
 const {win,adapter:a}=fixture();a.update();assert.equal(a.inWorld(),true);assert.ok(a.hasCapability('world'));assert.ok(a.hasCapability('native-direct'));
 for(const action of [()=>a.jump(),()=>a.attack({id:2}),()=>a.setPlayerVelocity(1,1,1),()=>a.setRotation(30,20)])assert.equal(action(),false);
 assert.equal(win.__eaghacksNativeCommands,undefined);
 win.__eaghacksNativeState.session.paused=false;assert.equal(a.jump(),false,'native screen still owns gameplay input');
 win.__eaghacksScreenState.screenName=null;assert.equal(a.jump(),true);delete win.__eaghacksNativeState;a.update();assert.equal(a.inWorld(),false);assert.equal(win.__eaghacksNativeCommands,undefined);
});
test('native presence requires both player and world, plus readiness, and preserves partial-capability refusal',()=>{
 const {win,adapter:a}=fixture();a.update();
 for(const key of ['player','world']){const previous=win.__eaghacksNativeState[key];delete win.__eaghacksNativeState[key];assert.equal(a.inWorld(),false);win.__eaghacksNativeState[key]=previous;}
 for(const key of ['__eaglerWorldReady','__eaglerGameReady']){win[key]=false;assert.equal(a.inWorld(),false);win[key]=true;}
 win.__eaghacksNativeState.features.combat=false;a.update();assert.equal(a.hasCapability('native-direct'),false);assert.equal(a.inWorld(),true);
});
test('opening ClickGUI refreshes cached row availability after entering a world',async()=>{
 const {bootTestClient}=await import('./helpers.mjs');const {client:c,adapter:a,doc}=await bootTestClient();c.ticker.stop();
 const row=[...doc.querySelectorAll('.mt-window[data-category="Combat"] .mt-row')].find(n=>n.querySelector('.mt-name')?.textContent==='KillAura');
 assert.ok(row.classList.contains('mt-unsupported'));assert.match(row.title,/requires a loaded world/);
 a.setWorldLoaded(true);assert.equal(c.modules.get('kill-aura').ineligibilityReason(),null);c.clickgui.show();
 assert.equal(row.classList.contains('mt-unsupported'),false);assert.doesNotMatch(row.title,/requires a loaded world/);c.stop();
});
test('restored collapsed category state matches its rendered body and expand control',async()=>{
 const {bootTestClient}=await import('./helpers.mjs');const {client:c,doc,win}=await bootTestClient();c.ticker.stop();
 c.clickgui.loadLayout({Combat:{x:12,y:12,expanded:false}});c.clickgui.show();
 const panel=doc.querySelector('.mt-window[data-category="Combat"]'),body=panel.querySelector('.mt-body');
 assert.equal(body.style.display,'none');assert.equal(panel.querySelector('.mt-collapse').textContent,'▸');
 panel.querySelector('.mt-collapse').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));assert.equal(body.style.display,'block');c.stop();
});
test('explicitly cleared preset module binds survive a new client',async()=>{
 const {bootTestClient,FakeStorage}=await import('./helpers.mjs');const storage=new FakeStorage();storage.setItem('meteor.eagler.default.config',JSON.stringify({version:1,modules:[],systems:{}}));const a=await bootTestClient({storage});
 const ids=['zoom','module-search','screenshot-util'];for(const id of ids){assert.ok(a.client.modules.get(id).bind.value);a.client.modules.get(id).bind.set(null)}a.client.config.save(true);
 const b=await bootTestClient({storage});for(const id of ids)assert.equal(b.client.modules.get(id).bind.value,null,id);b.client.stop();
});
