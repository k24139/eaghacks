/** Actual GUI availability regression. Uses only task profiles and disposable worlds. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const before=process.argv.includes('--before'),artifact=process.argv[2];assert.ok(artifact);
const root='input/phase13_1';await mkdir(root,{recursive:true});
const profile=resolve(process.env.QA_PROFILE||`${root}/profile`),rel=relative(resolve(root),profile);assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel));
const hash=createHash('sha256').update(await readFile(artifact)).digest('hex');
const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--enable-precise-memory-info']});
const page=context.pages()[0];const results=[],errors=[],failed=[],states=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push(r.failure()?.errorText));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('/WARN]'))errors.push(m.text())});
const wait=(fn,arg=null,timeout=30000)=>page.waitForFunction(fn,arg,{timeout});
const check=(name,value,detail)=>{results.push({name,pass:!!value,detail});console.log(value?'PASS':'FAIL',name,detail===undefined?'':JSON.stringify(detail));assert.ok(value,name)};
const click=async(x,y)=>{await page.mouse.click(x,y,{delay:250});await page.waitForTimeout(500)};
const capture=async label=>{const s=await page.evaluate(()=>{const a=EaglerHacks.adapter,n=window.__eaghacksNativeState;return {gameReady:window.__eaglerGameReady,worldReady:window.__eaglerWorldReady,playerPresent:!!n?.player,worldPresent:!!n?.world,player:n?.player?{x:n.player.x,y:n.player.y,z:n.player.z}:null,paused:n?.session?.paused,screenHookSeen:window.__eaghacksScreenHookSeen,screenName:window.__eaghacksScreenState?.screenName,inWorld:a.inWorld(),capabilities:[...a.capabilities],inputAllowed:a._gameplayInputAllowed(),commands:window.__eaghacksNativeCommands??null,modules:['kill-aura','bunny-hop','entity-esp'].map(id=>{const m=EaglerHacks.client.modules.get(id);return {id,active:m.active,pending:m._restoreOnWorld,reason:m.ineligibilityReason()}})}});states.push({label,...s});console.log('STATE',label,JSON.stringify(s));return s};
const rows={ 'kill-aura':['Combat','KillAura'],'bunny-hop':['Movement','BunnyHop'],'entity-esp':['Render','Entity ESP'] };
const rowFor=id=>{const [cat,name]=rows[id];return page.locator(`.mt-window[data-category="${cat}"] .mt-row`).filter({has:page.locator('.mt-name',{hasText:new RegExp(`^${name}$`)})})};
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
 const p=await page.evaluate(()=>({x:__eaghacksNativeState.player.x,z:__eaghacksNativeState.player.z}));await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
 check('normal keyboard movement works before opening GUI',await page.evaluate(p=>Math.hypot(__eaghacksNativeState.player.x-p.x,__eaghacksNativeState.player.z-p.z)>.05,p));
 await capture('before');await page.keyboard.press('ShiftRight');await wait(()=>EaglerHacks.client.clickgui.open);await page.waitForTimeout(1000);await capture('gui-open');
 for(const id of Object.keys(rows)){
  const panel=page.locator(`.mt-window[data-category="${rows[id][0]}"]`);await panel.locator('.mt-header').click();if(await panel.locator('.mt-body').evaluate(n=>getComputedStyle(n).display==='none'))await panel.locator('.mt-collapse').click();const row=rowFor(id);await row.scrollIntoViewIfNeeded();const displayed=await row.evaluate(n=>({unavailable:n.classList.contains('mt-unsupported'),title:n.title}));await row.click();await page.waitForTimeout(100);
  const active=await page.evaluate(id=>EaglerHacks.client.modules.get(id).active,id);console.log('TOGGLE',id,JSON.stringify({displayed,active}));results.push({name:`${id} GUI toggle`,pass:before?!active:active,detail:{displayed,active}});if(!before)check(`${id} is available and active through actual GUI`,!displayed.unavailable&&active);await panel.locator('.mt-collapse').click();
 }
 await page.keyboard.press('Escape');await wait(()=>!EaglerHacks.client.clickgui.open);await page.waitForTimeout(600);await capture('gui-closed');
 if(!before){await (await import('./phase13_1-module-checks.mjs')).verify({page,check,wait,rowFor,capture});}
 check('no unexpected JavaScript errors',errors.length===0,errors);check('no required runtime request failures',failed.length===0,failed);
}finally{
 await writeFile(`${root}/${before?'before':'after'}-results.json`,JSON.stringify({artifactSHA256:hash,results,states,errors,failed},null,2)+'\n');await context.close();
}
