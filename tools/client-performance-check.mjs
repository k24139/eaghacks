/** Same real-world UI and sampling path for the original and native standalone. */
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [url,output]=process.argv.slice(2);
if(!url||!output)throw Error('Usage: node tools/client-performance-check.mjs <client-url> <results.json>');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--in-process-gpu','--use-gl=angle','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const click=async(x,y,delay=1000)=>{await page.mouse.click(x,y,{delay:750});await page.waitForTimeout(delay);};
const sample=()=>page.evaluate(async()=>{
 const frames=[],start=performance.now(),firstTick=window.__eaghacksNativeState?.tick,firstSequence=window.__eaghacksNativeState?.bridge?.sequence;let previous=start;
 await new Promise(resolve=>{function frame(now){frames.push(now-previous);previous=now;if(now-start<5000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
 const elapsed=performance.now()-start,sorted=frames.slice().sort((a,b)=>a-b),state=window.__eaghacksNativeState;
 return {elapsedMs:elapsed,frames:frames.length,fps:frames.length/elapsed*1000,p50FrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),worldTicksPerSecond:firstTick===undefined?null:(state.tick-firstTick)/elapsed*1000,nativeSnapshotsPerSecond:firstSequence===undefined?null:(state.bridge.sequence-firstSequence)/elapsed*1000,nativeSnapshotMs:state?.bridge?.snapshotMs??null,entities:state?.entities?.length??null,framework:window.EaglerHacks.client.stats.snapshot()};
});
try{
 const started=Date.now();await page.goto(url,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__eaglerMenuReady&&window.__eaglerGameReady&&window.EaglerHacks,null,{timeout:120000});const startupMs=Date.now()-started;
 await click(640,667);await click(640,678);await page.waitForTimeout(2000);
 await click(640,371,30000);await click(640,300,20000);await click(640,438);const worldStarted=Date.now();await click(402,752);
 await page.waitForFunction(()=>window.__eaglerTerrainReady,null,{timeout:240000});const worldLoadMs=Date.now()-worldStarted;
 await click(640,400);await page.waitForTimeout(10000);
 const idle=await sample();await page.keyboard.down('KeyW');const moving=await sample();await page.keyboard.up('KeyW');
 const moduleIds=['coordinates','fps-display','direction','speed-hud','world-time','armor-hud','radar','entity-esp','tracers','nametags'];
 const enabledModules=await page.evaluate(ids=>ids.filter(id=>window.EaglerHacks.client.modules.get(id)?.enable()),moduleIds);
 const overlays=await sample();
 await page.keyboard.press('KeyE');await page.waitForTimeout(500);const inventoryOpened=await page.evaluate(()=>window.__eaghacksNativeState?.session.paused??window.__eaghacksScreenState?.screenName??null);await page.keyboard.press('Escape');
 assert.equal(errors.length,0,errors.join('\n'));
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/client-performance-world.png'});
 const result={url,startupMs,worldLoadMs,idle,moving,overlays,enabledModules,inventoryOpened,errors,notes:'Headless Chromium with software rendering; independently generated worlds. JS heap excludes some Wasm/native memory. Compare on an otherwise idle host.'};await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
