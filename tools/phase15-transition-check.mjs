/** Focused transition runner. Terrain-dependent movement is covered by the full gameplay suite. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {verify} from './phase15-transition-checks.mjs';
const root='input/phase15/transitions',artifact=process.argv[2];assert.ok(artifact);
await mkdir(root,{recursive:true});
const profile=resolve(`${root}/profile`),rel=relative(resolve(root),profile);assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel));
const artifactSHA256=createHash('sha256').update(await readFile(artifact)).digest('hex');
const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking']});
const page=context.pages()[0],results=[],errors=[],failed=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push(r.failure()?.errorText));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('/WARN]'))errors.push(m.text())});
const wait=(fn,arg=null,timeout=30000)=>page.waitForFunction(fn,arg,{timeout});
const check=(name,value,detail)=>{results.push({name,pass:!!value,detail});console.log(value?'PASS':'FAIL',name,detail===undefined?'':JSON.stringify(detail));assert.ok(value,name)};
const click=async(x,y)=>{await page.mouse.click(x,y,{delay:250});await page.waitForTimeout(500)};
try{
 await page.goto(pathToFileURL(resolve(artifact)).href,{waitUntil:'load',timeout:120000});await page.bringToFront();
 await wait(()=>window.__eaglerMenuReady&&window.EaglerHacks&&window.__eaghacksNativeBridge,null,120000);
 await page.evaluate(()=>{const c=EaglerHacks.client;c.modules.disableAll();for(const m of c.modules.all())m.settings.reset();c.config.save(true)});
 await wait(()=>['EaglerProfileScreen26','TitleScreen'].includes(window.__eaghacksScreenState?.screenName)&&!window.__eaghacksScreenState?.overlayActive,null,120000);
 if(await page.evaluate(()=>__eaghacksScreenState.screenName==='EaglerProfileScreen26'))await click(640,667);
 if(await page.evaluate(()=>__eaghacksScreenState.screenName==='EaglerDefaultUsernameNoteScreen'))await click(640,678);
 await wait(()=>__eaghacksScreenState.screenName==='TitleScreen');await click(640,371);
 await wait(()=>['SelectWorldScreen','EaglerCreateWorldSelectionScreen'].includes(__eaghacksScreenState.screenName),null,120000);
 if(await page.evaluate(()=>__eaghacksScreenState.screenName==='SelectWorldScreen'))await page.mouse.dblclick(640,210);
 else{await click(640,300);await wait(()=>__eaghacksScreenState.screenName==='CreateWorldScreen');await click(640,438);await click(402,752)}
 await wait(()=>window.__eaghacksNativeState?.player&&__eaghacksScreenState.screenName===null,null,180000);
 await click(640,400);await wait(()=>!!document.pointerLockElement);
 await verify({page,check,wait});
 check('no unexpected JavaScript errors',errors.length===0,errors);check('no required runtime request failures',failed.length===0,failed);
}finally{
 await writeFile(`${root}/after-results.json`,JSON.stringify({artifactSHA256,results,errors,failed},null,2)+'\n');await context.close();
}
