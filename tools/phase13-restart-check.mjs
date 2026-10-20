/** A real Chrome process restart against the same standalone URL and task profile. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
const [url,profile='input/phase13/rc-profile-retry']=process.argv.slice(2);assert.ok(url);
const rel=relative(resolve('input/phase13'),resolve(profile));assert.ok(rel&&!rel.startsWith('..')&&!isAbsolute(rel),'Use a dedicated child of input/phase13');
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
 check('FPS enabled survives Chrome process restart',await page.evaluate(()=>EaglerHacks.client.modules.get('fps-display').active));
 check('world HUD intent waits for player identity after restart',await page.evaluate(()=>{const m=EaglerHacks.client.modules.get('coordinates');return !m.active&&m._restoreOnWorld&&!EaglerHacks.adapter.getPlayer()}));
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
 await writeFile('input/phase13/restart-results.json',JSON.stringify({results,errors,failed,method:'Standalone file URL, actual Chrome processes, dedicated task profile'},null,2)+'\n');
}finally{await context?.close()}
