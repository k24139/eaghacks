/** Local matched benchmark helpers. No client compilation or world creation. */
import {writeFile,appendFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {summarizeFrameTimes} from './sample-client-performance.mjs';
import {measureGameFrames} from './phase5-present-sampler.mjs';
const exec=promisify(execFile),dir='reports/performance-phase5';
export async function command(page,text){
 await page.keyboard.press('KeyT',{delay:100});await page.waitForTimeout(200);
 await page.keyboard.type(text,{delay:12});await page.keyboard.press('Enter',{delay:100});await page.waitForTimeout(400);
}
export async function setup(page){
 for(const text of ['/gamemode creative','/difficulty peaceful','/gamerule minecraft:advance_time false','/time set 6000','/weather clear','/gamerule minecraft:advance_weather false','/tp @s 0 150 0 0 20'])await command(page,text);
 await page.waitForTimeout(1000);await page.screenshot({path:'input/phase5/commands.png'});
}
export async function settings(page){return page.evaluate(async()=>{
 const bytes=Uint8Array.from(atob(localStorage.getItem('_eaglercraftX.g')),c=>c.charCodeAt(0));
 return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
});}
export async function state(page){return page.evaluate(()=>({native:window.__eaghacksNativeState??null,screen:window.__eaghacksScreenState??null,visibility:document.visibilityState,focused:document.hasFocus(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},modules:window.EaglerHacks.client.modules.active().map(m=>m.id)}));}
export async function memory(context,page,profile){
 const browser=await context.browser().newBrowserCDPSession();
 const info=await browser.send('SystemInfo.getProcessInfo');await browser.detach();
 const ids=info.processInfo.map(p=>p.id);
 const [{stdout:ps},{stdout:pressure},{stdout:vm},{stdout:level}]=await Promise.all([
  exec('ps',['-o','pid=,ppid=,rss=,comm=','-p',ids.join(',')],{timeout:5000}),
  exec('memory_pressure',['-Q'],{timeout:5000}),exec('vm_stat',[],{timeout:5000}),exec('sysctl',['vm.memory_pressure'],{timeout:5000})]);
 const processes=ps.trim().split('\n').map(l=>{const m=l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);return m?{pid:+m[1],ppid:+m[2],rssBytes:+m[3]*1024,command:m[4],type:info.processInfo.find(p=>p.id===+m[1])?.type}:null}).filter(Boolean);
 const wasmLinearMemories=await page.evaluate(()=>Object.entries(window.__tv?.instance?.exports??{}).filter(([k,v])=>v instanceof WebAssembly.Memory).map(([name,v])=>({name,bytes:v.buffer.byteLength})));
 const session=await context.newCDPSession(page);const heap=await session.send('Runtime.getHeapUsage');await session.detach();
 return {timestamp:new Date().toISOString(),profile,processes,browserTreeRssBytes:processes.reduce((s,p)=>s+p.rssBytes,0),browserRssBytes:processes.filter(p=>p.type==='browser').reduce((s,p)=>s+p.rssBytes,0),heap,pressure,pressureLevel:level,vmStat:vm,wasmLinearMemories,wasmMemoryBytes:wasmLinearMemories.length?wasmLinearMemories.reduce((s,m)=>s+m.bytes,0):null};
}
export async function environment(context,page){
 const s=await context.browser().newBrowserCDPSession();const version=await s.send('Browser.getVersion'),system=await s.send('SystemInfo.getInfo');await s.detach();
 return {version,system,page:await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),vendor:gl.getParameter(e.UNMASKED_VENDOR_WEBGL),screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},viewport:{width:innerWidth,height:innerHeight}}})};
}
export async function saveMetadata(context,page,runtime,profile){
 await mkdir(dir,{recursive:true});await writeFile(`${dir}/${runtime}-environment.json`,JSON.stringify(await environment(context,page),null,2)+'\n');
 await writeFile(`${dir}/${runtime}-settings.txt`,await settings(page));await writeFile(`${dir}/${runtime}-state.json`,JSON.stringify(await state(page),null,2)+'\n');
 await appendFile(`${dir}/memory.jsonl`,JSON.stringify({runtime,condition:'before-sampling',...await memory(context,page,profile)})+'\n');
}
export async function runSamples(context,page,runtime,condition,profile){
 const moving=condition.startsWith('movement');await page.bringToFront();
 for(let index=0;index<3;index++){
  await command(page,'/tp @s 0 150 0 0 20');await page.waitForTimeout(5000);
  if(moving)await command(page,'/data get entity @s Pos');
  const before=await state(page);await page.screenshot({path:`diagnostics/performance-phase5/${runtime}-${condition}-${index}-before.png`});
  if(moving)await page.keyboard.down('KeyW');
  let sample,inputHeldMs=null;const holdStart=performance.now();
  try{if(condition==='movement-timed'){const release=(async()=>{await new Promise(r=>setTimeout(r,1000));await page.keyboard.up('KeyW');inputHeldMs=performance.now()-holdStart})();[sample]=await Promise.all([measureGameFrames(page,1000),release])}else sample=await measureGameFrames(page,moving?1000:5000)}finally{if(moving)await page.keyboard.up('KeyW')}
  await page.waitForTimeout(150);const after=await state(page);
  if(moving)await command(page,'/data get entity @s Pos');
  const observation={runtime,condition,index,timestamp:new Date().toISOString(),before,after,inputHeldMs,sample};
  await appendFile(`${dir}/samples.jsonl`,JSON.stringify(observation)+'\n');
  await page.screenshot({path:`diagnostics/performance-phase5/${runtime}-${condition}-${index}-after.png`});
  await appendFile(`${dir}/memory.jsonl`,JSON.stringify({runtime,condition,index,...await memory(context,page,profile)})+'\n');
  console.log('SAMPLE',runtime,condition,index,sample.fps);
 }
}
export function describe(samples){
 const frames=samples.flatMap(s=>s.sample.frameTimesMs),fps=samples.map(s=>s.sample.fps),elapsed=samples.reduce((n,s)=>n+s.sample.elapsedMs,0);
 const mean=fps.reduce((a,b)=>a+b,0)/fps.length,sorted=[...fps].sort((a,b)=>a-b),average=frames.reduce((a,b)=>a+b,0)/frames.length;
 return {...summarizeFrameTimes(frames,elapsed),meanSampleFps:mean,medianSampleFps:(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2,minSampleFps:Math.min(...fps),maxSampleFps:Math.max(...fps),sampleFpsStdDev:Math.sqrt(fps.reduce((s,x)=>s+(x-mean)**2,0)/(fps.length-1)),frameTimeStdDevMs:Math.sqrt(frames.reduce((s,x)=>s+(x-average)**2,0)/frames.length),instantaneousFpsMin:1000/Math.max(...frames),instantaneousFpsMax:1000/Math.min(...frames)};
}
