/** Focused Phase 8 procedures reused without module-enable calls during restoration. */
import {wait,record} from './phase9-checks.mjs';
import * as life from './phase9-lifecycle.mjs';
import {writeFile} from 'node:fs/promises';
export async function disconnect(g,forced=false,{disabled=[]}={}){
 await life.remember(g);
 if(forced)await g.evaluate(async()=>{for(const pc of phase9RTC){const stats=[...(await pc.getStats()).values()];if(stats.some(s=>s.type==='data-channel'&&s.label==='lan'&&s.state==='open'&&s.bytesReceived>100)){pc.close();return}}throw Error('No active gameplay connection')});
 else{await g.bringToFront();if(await g.evaluate(()=>window.__eaghacksScreenState?.screenName!=='PauseScreen'))await g.keyboard.press('Escape',{delay:100});await wait(g,()=>window.__eaghacksScreenState?.screenName==='PauseScreen');await g.mouse.click(640,489,{delay:500});}
 if(!disabled.length)await life.disconnected(g,forced?'forced loss cleanup':'normal disconnect cleanup');
 else await life.check('disconnect with disabled modules',g,s=>!s.world&&!s.player&&!s.commands&&!s.owned.length&&!s.using&&s.modules.every(m=>!m.active&&(disabled.includes(m.id)?!m.pending:m.pending))&&!s.errors.length);
 await g.bringToFront();
 for(let i=0;i<4&&await g.evaluate(()=>window.__eaghacksScreenState?.screenName!=='TitleScreen');i++){
  const name=await g.evaluate(()=>window.__eaghacksScreenState?.screenName);
  if(name==='DisconnectedScreen')await g.mouse.click(640,489,{delay:400});else await g.keyboard.press('Escape',{delay:150});await g.waitForTimeout(500);
 }
 await wait(g,()=>window.__eaghacksScreenState?.screenName==='TitleScreen');
}
export async function exchange(host,g){
 const before=await g.evaluate(()=>structuredClone(window.__eaghacksNativeState.player));await g.bringToFront();await g.mouse.click(640,400,{delay:100});await g.keyboard.down('KeyW');try{await g.waitForTimeout(400)}finally{await g.keyboard.up('KeyW')};await g.waitForTimeout(300);
 const after=await g.evaluate(()=>window.__eaghacksNativeState.player),seen=await host.evaluate(name=>window.__eaghacksNativeState?.entities.find(e=>e.name===name),after.name);
 const pass=Math.hypot(after.x-before.x,after.z-before.z)>.2&&!!seen&&Math.hypot(seen.x-after.x,seen.z-after.z)<1;
 await record('actual movement exchanged with host','guest moves and host observes matching player',{before,after,seen},pass);if(!pass)throw Error('Position exchange failed');
 const identity=await host.evaluate(()=>window.__eaghacksNativeState.session.kind);await record('host identity local','local',identity,identity==='local');
 const policy=await g.evaluate(()=>{const c=EaglerHacks.client,m=c.modules.get('kill-aura');return {remote:EaglerHacks.adapter.isRemote(),enabled:m.enable(),active:m.active,errors:c.modules.errors()}});await record('remote combat restriction','remote; combat stays inactive',policy,policy.remote&&!policy.active&&!policy.errors.length);
 await writeFile('reports/reliability-phase9/path-a-gameplay.json',JSON.stringify({before,after,seen,identity,policy},null,2)+'\n');
}
