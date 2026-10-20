import {writeFile} from 'node:fs/promises';
import {record,wait} from './phase8-checks.mjs';
export async function finish(p,context){
 const cdp=await context.newCDPSession(p);
 const version=await cdp.send('Browser.getVersion');
 const environment=await p.evaluate(()=>({userAgent:navigator.userAgent,platform:navigator.platform,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},url:location.href,identity:window.__eaghacksNativeState?.session}));
 await writeFile('reports/reliability-phase8/environment.json',JSON.stringify({version,environment},null,2)+'\n');await cdp.detach();
 await p.evaluate(()=>EaglerHacks.client.config.save(true));
 const state=await p.evaluate(()=>{const r=EaglerHacks;const config=JSON.parse(localStorage.getItem('meteor.eagler.default.config'));r.shutdown();r.shutdown();return {listeners:r.client.bus.totalListeners(),keys:[...r.client.keybinds.heldKeys],owned:[...r.adapter._syntheticHeld],using:r.adapter._syntheticUseHeld,capture:r.client.keybinds.capturing,modules:r.client.modules.all().filter(m=>m.active||m._restoreOnWorld).map(m=>m.id),errors:r.client.modules.errors(),savedConfig:config}});
 await record('final shutdown without external QA listeners','zero listeners/keys/modules, no errors',state,state.listeners===0&&!state.keys.length&&!state.owned.length&&!state.using&&!state.capture&&!state.modules.length&&!state.errors.length);
 return state;
}
