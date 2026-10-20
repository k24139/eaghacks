/** Temporary page observation only; no native hooks or runtime mutations. */
import {writeFile} from 'node:fs/promises';
export async function install(page) {
 await page.evaluate(()=>{
  if(window.phase9Observation)return;
  const o=window.phase9Observation={events:[],longTasks:[],frames:0};
  const add=e=>{o.events.push({type:e.type,at:performance.now(),trusted:e.isTrusted,key:e.code,dx:e.movementX,dy:e.movementY,x:e.clientX,y:e.clientY,locked:!!document.pointerLockElement,yaw:window.__eaghacksNativeState?.player?.yaw,pitch:window.__eaghacksNativeState?.player?.pitch});if(o.events.length>2000)o.events.shift()};
  for(const type of ['mousemove','keydown','keyup','mousedown','mouseup','focus','blur'])window.addEventListener(type,add,true);
  document.addEventListener('pointerlockchange',add);
  try {new PerformanceObserver(list=>{o.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));o.longTasks=o.longTasks.slice(-100)}).observe({type:'longtask',buffered:true})}catch{}
  const frame=()=>{o.frames++;requestAnimationFrame(frame)};requestAnimationFrame(frame);
 });
}
export async function state(page){return page.evaluate(async()=>({at:performance.now(),screen:window.__eaghacksScreenState,tick:window.__eaghacksNativeState?.tick,sequence:window.__eaghacksNativeState?.bridge?.sequence,nextSequence:window.__eaghacksNativeSequence,session:window.__eaghacksNativeState?.session,player:window.__eaghacksNativeState?.player,focus:document.hasFocus(),hidden:document.hidden,pointer:!!document.pointerLockElement,gui:window.EaglerHacks?.client?.clickgui.open,capture:window.EaglerHacks?.client?.keybinds.capturing,observation:window.phase9Observation,lan:window.__eaglerLAN?.snapshotJson(),rtc:await Promise.all((window.phase9RTC??[]).map(async pc=>({connection:pc.connectionState,ice:pc.iceConnectionState,stats:[... (await pc.getStats()).values()].filter(s=>s.type==='data-channel'||s.type==='transport')})))}))}
export async function progress(page,label,ms=1500){await install(page);const before=await state(page);await page.waitForTimeout(ms);const after=await state(page);const result={label,before,after,delta:{frames:after.observation.frames-before.observation.frames,sequence:after.sequence-before.sequence,worldTime:after.tick-before.tick}};await writeFile(`reports/reliability-phase9/${label}.json`,JSON.stringify(result,null,2)+'\n');return result}
/** Short CPU sample; evidence of callbacks, not proof of an awaiting Java method. */
export async function profile(page,label){
 const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');await page.waitForTimeout(1500);const {profile}=await cdp.send('Profiler.stop');await cdp.detach();await writeFile(`reports/reliability-phase9/${label}-cpu.json`,JSON.stringify(profile)+'\n');return {nodes:profile.nodes.length,samples:profile.samples?.length,wasmNodes:profile.nodes.filter(n=>/wasm/i.test(n.callFrame.url+' '+n.callFrame.functionName)).length};
}
