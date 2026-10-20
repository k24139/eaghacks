import {writeFile} from 'node:fs/promises';
import {record} from './phase9-checks.mjs';
export async function shutdown(p,label){
 const result=await p.evaluate(()=>{
  for(const sub of window.phase9Subscriptions??[])sub.dispose();
  const r=EaglerHacks;r.shutdown();r.shutdown();
  return {listeners:r.client.bus.totalListeners(),held:[...r.client.keybinds.heldKeys],owned:[...r.adapter._syntheticHeld],using:r.adapter._syntheticUseHeld,capture:r.client.keybinds.capturing,modules:r.client.modules.all().filter(m=>m.active||m._restoreOnWorld).map(m=>m.id),errors:r.client.modules.errors()};
 });
 const pass=result.listeners===0&&!result.held.length&&!result.owned.length&&!result.using&&!result.capture&&!result.modules.length&&!result.errors.length;
 await record(label+' shutdown cleanup','zero listeners, input, module intent and errors',result,pass);return result;
}
export async function environment(p){const cdp=await p.context().newCDPSession(p);const version=await cdp.send('Browser.getVersion');await cdp.detach();const page=await p.evaluate(()=>({userAgent:navigator.userAgent,platform:navigator.platform,url:location.href,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}}));await writeFile('reports/reliability-phase9/environment.json',JSON.stringify({version,page},null,2)+'\n');}
