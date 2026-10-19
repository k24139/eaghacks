/** Compare both real runtimes in one saved world and browser context. */
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {measureClientFrames} from './sample-client-performance.mjs';
export async function compareSavedWorld(page,{nativeURL,originalURL,nativePath,originalPath,output}){
 const wait=(fn,arg,timeout=60000)=>page.waitForFunction(fn,arg,{timeout});
 const click=async(x,y)=>{await page.mouse.click(x,y,{delay:750});await page.waitForTimeout(500);};
 const command=async text=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='ChatScreen');await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName===null);await page.waitForTimeout(500);};
 const disable=()=>page.evaluate(()=>{const c=window.EaglerHacks.client;for(const m of c.modules.all())m.disable();c.config.save(true);});
 const join=async()=>{await page.setViewportSize({width:1280,height:800});await wait(()=>window.__eaghacksScreenState?.screenName==='TitleScreen'&&!window.__eaghacksScreenState.overlayActive);await disable();await click(640,371);await page.waitForTimeout(2000);await page.mouse.dblclick(640,210,{delay:150});await wait(()=>window.__eaglerTerrainReady&&window.__eaghacksScreenState?.screenName===null,null,240000);await page.setViewportSize({width:640,height:400});await click(320,200);await disable();};
 const leave=async()=>{await disable();await page.setViewportSize({width:1280,height:800});await page.keyboard.press('Escape',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='PauseScreen');await click(640,489);await wait(()=>window.__eaghacksScreenState?.screenName==='TitleScreen');};
 const samples=async()=>{await command('/gamemode survival');await command('/tp @s 0 150 0 0 20');await page.waitForTimeout(3000);const idle=[];for(let i=0;i<3;i++)idle.push(await measureClientFrames(page,5000));const moving=[];for(let i=0;i<3;i++){await command('/tp @s 0 150 0 0 20');await page.keyboard.down('KeyW');try{moving.push(await measureClientFrames(page,1000));}finally{await page.keyboard.up('KeyW');}}return {idle,moving};};
 await join();const native=await samples();
 await command('/tp @s 0 150 0 0 20');const overlayModules=await page.evaluate(()=>['coordinates','fps-display','direction','speed-hud','world-time','armor-hud','radar','entity-esp','tracers','nametags'].filter(id=>window.EaglerHacks.client.modules.get(id)?.enable()));await page.waitForTimeout(2000);native.overlays=await measureClientFrames(page,5000);native.overlayModules=overlayModules;
 await leave();await page.goto(originalURL,{waitUntil:'load',timeout:120000});await wait(()=>window.__eaglerMenuReady&&window.EaglerHacks,null,120000);await join();const original=await samples();await leave();
 const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
 const result={native,original,nativeSHA256:await sha(nativePath),originalSHA256:await sha(originalPath),nativeURL,originalURL,scope:'Same saved superflat world, origin, browser context, graphics settings and 640x400 viewport. Three idle samples and three short movement samples. Native overlays measured separately. Headless Chromium SwiftShader. JS heap excludes WASM and workers. Cold startup measured separately.'};
 await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log('Saved matched performance comparison',output);return result;
}
