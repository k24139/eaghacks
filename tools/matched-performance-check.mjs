/** Exercises the actual rebuilt client in an isolated local QA world. No native state is fabricated. */
import assert from 'node:assert/strict';
import {compareSavedWorld} from './compare-saved-world.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
import {chromium} from 'playwright';
const url=process.argv[2];if(!url)throw Error('Usage: node tools/native-gameplay-check.mjs <native-client-url>');
await mkdir('artifacts',{recursive:true});const results=[],errors=[],inputLimitations=[];let stage='startup';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--in-process-gpu','--use-gl=angle','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('/WARN]')){errors.push(m.text());console.log('GAME LOG',m.text().slice(0,500));}});
const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout});
const snapshot=()=>page.evaluate(()=>structuredClone(window.__eaghacksNativeState));
const check=(name,value,detail)=>{assert.ok(value,`${name}: ${JSON.stringify(detail)}`);results.push({name,detail});console.log('PASS',name,detail===undefined?'':JSON.stringify(detail));};
const click=async(x,y,ms=1500)=>{await page.mouse.click(x,y,{delay:750});await page.waitForTimeout(ms);console.log('UI',x,y,await page.evaluate(()=>window.__eaghacksScreenState?.screenName??null));};
const command=async(text,settle=500)=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='ChatScreen',null,30000);await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName===null,null,30000);await page.waitForTimeout(settle);};
const moduleState=async(id,active)=>page.evaluate(({id,active})=>window.EaglerHacks.client.modules.get(id).setActive(active),{id,active});
const inspect=async()=>{const{start}=await import('node:repl');const server=start({prompt:'native-qa> '});Object.assign(server.context,{page,browser,snapshot,click,command,moduleState});await new Promise(resolve=>server.once('exit',resolve));};
const started=Date.now();
try{
 await page.goto(url,{waitUntil:'load',timeout:120000});
 await wait(()=>window.__eaglerMenuReady===true&&window.__eaglerGameReady===true&&window.__eaghacksNativeBridge?.version===1,null,120000);
 check('compiled Java bridge announces itself',await page.evaluate(()=>window.__eaghacksNativeBridge.runtime==='Java/TeaVM-WasmGC'&&window.__eaghacksNativeBridge.upstream==='1be2375ad67cb42a52d5f586a2422e54b57be625'));
 stage='create-world';
 await wait(()=>['EaglerProfileScreen26','TitleScreen'].includes(window.__eaghacksScreenState?.screenName)&&window.__eaghacksScreenState?.overlayActive===false,null,120000);
 if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerProfileScreen26')){await click(640,667,500);await wait(()=>window.__eaghacksScreenState?.screenName!=='EaglerProfileScreen26');if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerDefaultUsernameNoteScreen'))await click(640,678,500);}
 await wait(()=>window.__eaghacksScreenState?.screenName==='TitleScreen');await click(640,371,500);
 await wait(()=>window.__eaghacksScreenState?.screenName==='EaglerCreateWorldSelectionScreen',null,120000);await click(640,300,500);
 await wait(()=>window.__eaghacksScreenState?.screenName==='CreateWorldScreen',null,120000);await click(640,438,500);
 if(process.env.NATIVE_QA_FLAT==='1'){await click(640,35,500);await click(400,148,500);await click(1035,365,500);await page.screenshot({path:'artifacts/flat-world-settings.png'});if(process.env.NATIVE_QA_SETUP==='1')await inspect();}
 await click(402,752,500);
 await wait(()=>window.__eaglerTerrainReady===true&&window.__eaghacksNativeState?.player,null,240000);
 check('actual single-player world publishes native state',!!(await snapshot()).world);
 check('compiled production bridge exposes snapshot diagnostics and bounded multi-attack',await page.evaluate(()=>{const s=window.__eaghacksNativeState;return s.features.multiAttack&&s.bridge.sequence>0&&Number.isFinite(s.bridge.snapshotMs);}));
 check('native session identifies single-player',await page.evaluate(()=>window.__eaghacksNativeState.session.kind==='local'&&!window.EaglerHacks.adapter.isRemote()));
 if(process.env.NATIVE_QA_LOW_RESOURCE==='1'){
  await page.keyboard.press('Escape',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='PauseScreen');
  await click(480,417,500);await wait(()=>window.__eaghacksScreenState?.screenName==='OptionsScreen');
  await click(400,375,500);await wait(()=>window.__eaghacksScreenState?.screenName==='VideoSettingsScreen');
  await click(880,255,500);await click(400,330,500);await page.mouse.move(640,400);await page.mouse.wheel(0,500);await page.waitForTimeout(1500);await click(664,690,500);
  await click(640,752,500);await click(640,752,500);await click(640,273,500);await wait(()=>window.__eaghacksScreenState?.screenName===null);
  await page.setViewportSize({width:640,height:400});
 }

 await click(320,200);await command('/gamemode creative');await command('/fill -8 149 -8 8 149 8 minecraft:stone');await command('/tp @s 0 150 0 0 20');
 await page.setViewportSize({width:1280,height:800});await page.keyboard.press('Escape',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='PauseScreen');await click(640,489);await wait(()=>window.__eaghacksScreenState?.screenName==='TitleScreen');
 await compareSavedWorld(page,{nativeURL:url,originalURL:new URL('/original.html',url).href,nativePath:'client.html',originalPath:'original.html',output:'artifacts/matched-performance.json'});
}finally{await browser.close();}
