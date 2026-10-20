import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bootTestClient} from './helpers.mjs';
import {EaglercraftBrowserAdapter} from '../src/integration/eaglercraft-adapter.js';

const ids=['coordinates','radar','zoom'];
test('two remote reconnects restore intent and settings with fresh data and stable listeners',async()=>{
 const {client:c,adapter:a}=await bootTestClient({inWorld:true});c.ticker.stop();a.setRemote(true);
 c.modules.get('zoom').settings.get('factor').set(5);
 for(const id of ids)c.modules.get(id).enable();const baseline=c.bus.totalListeners();
 for(let cycle=0;cycle<2;cycle++){
  a.setWorldLoaded(false);a.capabilities.delete("world");c.modules.revalidateAll();
  for(const id of ids){const m=c.modules.get(id);assert.equal(m.active,false);assert.equal(m._restoreOnWorld,true)}
  assert.ok(c.config.serialiseModules().filter(m=>ids.includes(m.id)).every(m=>m.active));
  a.setWorldLoaded(true);a.capabilities.add("world");a.getPlayer=()=>({x:cycle+20,y:70,z:2});c.modules.revalidateAll();
  assert.ok(ids.every(id=>c.modules.get(id).active));
  assert.match(c.modules.get('coordinates').hudRender(a),new RegExp(`XYZ: ${cycle+20}`));
  assert.equal(c.modules.get('zoom').settings.get('factor').value,5);assert.equal(c.bus.totalListeners(),baseline);
 }
 c.stop();assert.equal(c.bus.totalListeners(),0);
});
test('explicit disable while disconnected cancels persisted restoration',async()=>{
 const {client:c,adapter:a}=await bootTestClient({inWorld:true});c.ticker.stop();
 const m=c.modules.get('radar');m.enable();a.setWorldLoaded(false);a.capabilities.delete("world");c.modules.revalidateAll();m.disable();
 assert.equal(m._restoreOnWorld,false);assert.ok(!c.config.serialiseModules().find(x=>x.id==='radar')?.active);
 a.setWorldLoaded(true);a.capabilities.add("world");c.modules.revalidateAll();assert.equal(m.canEnable(),true);assert.equal(m.active,false);c.stop();
});
test('persisted local combat intent cannot activate after a remote reconnect',async()=>{
 const {client:c,adapter:a}=await bootTestClient({inWorld:true});c.ticker.stop();
 const m=c.modules.get('kill-aura');m.enable();assert.equal(m.active,true);
 a.setWorldLoaded(false);a.capabilities.delete("world");c.modules.revalidateAll();a.setRemote(true);a.setWorldLoaded(true);a.capabilities.add("world");c.modules.revalidateAll();
 assert.equal(m.active,false);assert.match(m.ineligibilityReason(),/blocked on remote/);assert.equal(c.allowMultiplayerCombat,false);
 c.config.deserialiseModules([{id:'kill-aura',active:true}]);c.modules.revalidateAll();assert.equal(m.active,false);c.stop();
});
test('unknown native identity cannot inherit a stale legacy singleplayer identity',()=>{
 const win={minecraftServer:'singleplayer',__eaghacksNativeState:{version:1,player:{},world:{},session:{kind:'unknown'}}};
 const a=new EaglercraftBrowserAdapter({window:win,document:{}});
 assert.equal(a.isRemote(),true);delete win.__eaghacksNativeState.session;assert.equal(a.isRemote(),true);
 win.__eaghacksNativeState.session={kind:'local'};assert.equal(a.isRemote(),false);
 win.__eaghacksNativeState.session.kind='remote';assert.equal(a.isRemote(),true);
});
