/** A real Chrome process restart against the same standalone URL and task profile. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
const [url,profile='input/phase13_1/profile']=process.argv.slice(2);assert.ok(url);
const rel=relative(resolve('input/phase13_1'),resolve(profile));assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel),'Use a dedicated child of input/phase13_1');
const results=[],errors=[],failed=[];
const check=(name,value)=>{assert.ok(value,name);results.push(name);console.log('PASS',name)};
const launch=async()=>{
 const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--enable-precise-memory-info']});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('/WARN]'))errors.push(m.text())});page.on('requestfailed',r=>failed.push({url:r.url().split('?')[0],error:r.failure()?.errorText}));
 try{await page.goto(url,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__eaglerMenuReady&&window.EaglerHacks&&window.__eaghacksNativeBridge,null,{timeout:120000});return {context,page};}catch(error){await context.close();throw error;}
};
let context,page;
try{
 ({context,page}=await launch());
 const expected=JSON.parse(await (await import('node:fs/promises')).readFile('input/phase13_1/expected-settings.json','utf8'));
 const differences=await page.evaluate(expected=>expected.flatMap(({id,settings})=>Object.entries(settings).flatMap(([name,value])=>{const actual=EaglerHacks.client.modules.get(id).settings.get(name).value;return JSON.stringify(actual)===JSON.stringify(value)?[]:[{id,name,expected:value,actual}]})),expected);
 await writeFile('input/phase13_1/setting-differences.json',JSON.stringify(differences,null,2)+'\n');if(differences.length)console.log('SETTING DIFFERENCES',JSON.stringify(differences));
 check('all 41 module setting sets survive an actual Chrome process restart',differences.length===0);
 check('FPS enabled survives Chrome process restart',await page.evaluate(()=>EaglerHacks.client.modules.get('fps-display').active));
 check('world HUD intent waits for player identity after restart',await page.evaluate(()=>{const m=EaglerHacks.client.modules.get('coordinates');return !m.active&&m._restoreOnWorld&&!EaglerHacks.adapter.getPlayer()}));
 await page.bringToFront();
 await page.waitForFunction(()=>['EaglerProfileScreen26','TitleScreen'].includes(window.__eaghacksScreenState?.screenName)&&!window.__eaghacksScreenState?.overlayActive,null,{timeout:120000});
 if(await page.evaluate(()=>__eaghacksScreenState.screenName==='EaglerProfileScreen26')){await page.mouse.click(640,667,{delay:250});await page.waitForTimeout(500)}
 if(await page.evaluate(()=>__eaghacksScreenState.screenName==='EaglerDefaultUsernameNoteScreen'))await page.mouse.click(640,678,{delay:250});
 await page.waitForFunction(()=>__eaghacksScreenState.screenName==='TitleScreen');await page.mouse.click(640,371,{delay:250});
 await page.waitForFunction(()=>__eaghacksScreenState.screenName==='SelectWorldScreen',null,{timeout:120000});await page.mouse.dblclick(640,210);
 await page.waitForFunction(()=>window.__eaghacksNativeState?.player&&['kill-aura','bunny-hop','entity-esp'].every(id=>EaglerHacks.client.modules.get(id).active),null,{timeout:180000});
 check('priority module intent restores only after an actual saved world loads after restart',await page.evaluate(()=>EaglerHacks.adapter.inWorld()));
 await page.mouse.click(640,400,{delay:100});await page.keyboard.press('ShiftRight');await page.waitForFunction(()=>EaglerHacks.client.clickgui.open);await page.waitForTimeout(300);
 check('priority GUI rows remain available after Chrome restart and world reentry',await page.evaluate(()=>['KillAura','BunnyHop','Entity ESP'].every(name=>{const n=[...document.querySelectorAll('.mt-window[data-category] .mt-row')].find(n=>n.querySelector('.mt-name')?.textContent===name);return n&&!n.classList.contains('mt-unsupported')&&!n.title.includes('requires a loaded world')})));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!EaglerHacks.client.clickgui.open&&__eaghacksScreenState.screenName===null);await page.keyboard.press('Escape');await page.waitForFunction(()=>__eaghacksScreenState.screenName==='PauseScreen');await page.mouse.click(640,489,{delay:250});await page.waitForFunction(()=>!window.__eaghacksNativeState,null,{timeout:60000});
 await page.evaluate(()=>{const c=EaglerHacks.client;c.modules.get('fps-display').disable();c.modules.get('coordinates').settings.get('precision').set(2);c.config.save(true)});
 await context.close();context=null;
 ({context,page}=await launch());
 check('explicit module disable persists across second Chrome restart',await page.evaluate(()=>!EaglerHacks.client.modules.get('fps-display').active));
 check('HUD precision persists across process restart',await page.evaluate(()=>EaglerHacks.client.modules.get('coordinates').settings.get('precision').value===2));
 await context.addInitScript(()=>{const key='meteor.eagler.default.config',d=JSON.parse(localStorage.getItem(key));d.modules.push({id:'zoom',settings:{factor:{invalid:true}}});localStorage.setItem(key,JSON.stringify(d))});
 await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.EaglerHacks&&window.__eaglerMenuReady,null,{timeout:120000});
 check('invalid stored settings safely recover during actual client boot',await page.evaluate(()=>{const s=EaglerHacks.client.modules.get('zoom').settings.get('factor');return s.value===s.defaultValue&&!!s.lastParseError}));
 await page.evaluate(()=>{const c=EaglerHacks.client;window.__shutdownRefs={c,a:EaglerHacks.adapter};EaglerHacks.shutdown()});
 check('shutdown removes listeners, UI, native commands and synthetic inputs',await page.evaluate(()=>{const {c,a}=__shutdownRefs;return c.bus.totalListeners()===0&&!document.getElementById('meteor-clickgui')&&!document.getElementById('eaghacks-hud-canvas')&&!window.__eaghacksNativeCommands&&a.diagnostics().syntheticHeldKeys.length===0&&!window.EaglerHacks}));
 check('no required runtime requests failed',failed.length===0);check('no uncaught JavaScript errors across restarts',errors.length===0);
 await writeFile('input/phase13_1/restart-results.json',JSON.stringify({results,errors,failed,method:'Standalone file URL, actual Chrome processes, dedicated task profile'},null,2)+'\n');
}finally{await context?.close()}
