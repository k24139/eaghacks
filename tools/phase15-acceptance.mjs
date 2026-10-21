/** Outstanding interactions and setting coverage in a real single-player world. */
import {writeFile,readFile} from 'node:fs/promises';
export async function verify({page,check,command,wait,moduleState}){
 const set=async(id,values)=>page.evaluate(({id,values})=>{const m=EaglerHacks.client.modules.get(id);for(const[k,v]of Object.entries(values))m.settings.get(k).set(v)},{id,values});
 await page.evaluate(()=>EaglerHacks.client.modules.disableAll());
 for(const text of ['/gamemode creative','/effect clear @s','/effect give @s minecraft:saturation 1 5 true','/fill -8 150 -8 8 156 8 minecraft:air','/kill @e[type=!minecraft:player]','/tp @s 0 150 0 0 20','/time set 18000','/item replace entity @s hotbar.0 with minecraft:stick','/summon minecraft:pig 0 150 2 {NoAI:1b}','/gamemode survival'])await command(text);
 await page.evaluate(()=>EaglerHacks.adapter.selectSlot(0));await wait(()=>EaglerHacks.adapter.getCrosshairTargetEntity()?.type==='minecraft:pig');
 await set('auto-clicker',{cps:4,hold:true,'activation-key':{key:'KeyV',mouse:null,modifiers:{ctrl:true}}});
 await moduleState('auto-clicker',true);await page.keyboard.down('KeyV');await page.waitForTimeout(800);
 check('AutoClicker modified hold rejects unmodified browser key on actual pig',await page.evaluate(()=>__eaghacksNativeState.entities.find(e=>e.type==='minecraft:pig')?.health===10));
 await page.keyboard.down('ControlLeft');await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health<10));await page.keyboard.up('ControlLeft');await page.keyboard.up('KeyV');
 check('AutoClicker Ctrl hold delivers actual native damage',true);await moduleState('auto-clicker',false);
 await command('/kill @e[type=minecraft:pig]');await command('/summon minecraft:pig 0 150 2 {NoAI:1b}');await wait(()=>EaglerHacks.adapter.getCrosshairTargetEntity()?.health===10);
 await set('auto-clicker',{'activation-key':{key:null,mouse:1,modifiers:{}}});await moduleState('auto-clicker',true);await page.mouse.down({button:'middle'});
 try{await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health<10))}finally{await page.mouse.up({button:'middle'})}
 await page.waitForTimeout(300);const hp=await page.evaluate(()=>__eaghacksNativeState.entities.find(e=>e.type==='minecraft:pig')?.health);await page.waitForTimeout(600);
 check('AutoClicker mouse hold damages actual pig and release stops delivery',hp<10&&hp===await page.evaluate(()=>__eaghacksNativeState.entities.find(e=>e.type==='minecraft:pig')?.health));await moduleState('auto-clicker',false);
 // Delegate methods record requests but still deliver through the real adapter.
 await command('/kill @e[type=!minecraft:player]');await command('/summon minecraft:zombie 0 150 2 {NoAI:1b}');await command('/tp @s 0 150 0 0 0');
 await page.evaluate(()=>{const a=EaglerHacks.adapter;window.__p15Attack=a.attack;window.__p15Attempts=[];a.attack=function(e){__p15Attempts.push({at:performance.now(),id:e?.id});return __p15Attack.call(this,e)}});
 try{
  await set('kill-aura',{cps:2,players:false,hostile:true,passive:false,'attack-mode':'interval','rotate-speed':.6});await set('trigger-bot',{'weapon-only':false,delay:0});await set('auto-clicker',{hold:false,cps:20});
  for(const id of ['kill-aura','trigger-bot','auto-clicker','aim-assist','auto-crit'])await moduleState(id,true);
  await page.waitForTimeout(1800);
  const attempts=await page.evaluate(()=>__p15Attempts);const gaps=attempts.slice(1).map((a,i)=>a.at-attempts[i].at);
  check('five combat modules preserve sole aura attempt ownership',attempts.length>=3&&gaps.every(n=>n>=350),{attempts:attempts.length,gaps});
  await moduleState('trigger-bot',false);await moduleState('auto-clicker',false);await page.waitForTimeout(600);
  check('secondary combat disable preserves aura delivery',await page.evaluate(n=>__p15Attempts.length>n,attempts.length));
  for(const id of ['kill-aura','aim-assist','auto-crit'])await moduleState(id,false);await page.waitForTimeout(250);const count=await page.evaluate(()=>__p15Attempts.length);await page.waitForTimeout(700);
  check('all combat owners disabled leaves no new attempts or queued commands',await page.evaluate(count=>__p15Attempts.length===count&&!window.__eaghacksNativeCommands?.attackEntityId,count));
 }finally{await page.evaluate(()=>{EaglerHacks.client.modules.disableAll();EaglerHacks.adapter.attack=__p15Attack;delete window.__p15Attack;delete window.__p15Attempts})}
 // Material render settings, with live native data.
 for(const smooth of [false,true]){
  await set('zoom',{factor:2,smooth});await moduleState('zoom',true);await wait(()=>Math.abs(__eaghacksNativeState.options.fov-35)<.2);await set('zoom',{factor:5});await wait(()=>Math.abs(__eaghacksNativeState.options.fov-14)<.2);await moduleState('zoom',false);await wait(()=>__eaghacksNativeState.options.fov===70);
  check(`Zoom factor live update and restore with smooth=${smooth}`,true);
 }
 // HUD common layout plus module-specific contents are covered by the existing suite.
 const observed=JSON.parse(await readFile('reports/release-phase14/verification.json','utf8')).modules.rows.filter(m=>m.status==='gameplay-observed').map(m=>m.id);
 const hudIds=await page.evaluate(ids=>ids.filter(id=>EaglerHacks.client.modules.get(id).settings.get('hud-opacity')),observed);
 for(const id of hudIds){
  await set(id,{'hud-x':37,'hud-y':61,'hud-scale':1.5,'hud-opacity':.6,background:false,'hud-color':{r:12,g:180,b:90,a:255}});await moduleState(id,true);await page.waitForTimeout(120);
  check(`${id}: alternate HUD layout in loaded world`,await page.evaluate(id=>{const n=document.querySelector(`.mt-hud-el[data-module="${id}"]`);return !!n&&n.style.left==='37px'&&n.style.top==='61px'&&n.style.opacity==='0.6'&&n.style.transform.includes('1.5')},id));await moduleState(id,false);
 }
 const rapid=await page.evaluate(ids=>{const c=EaglerHacks.client;const counts=()=>({bus:c.bus.totalListeners(),settings:c.modules.all().reduce((n,m)=>n+m.settings.all().reduce((n,s)=>n+s._listeners.length,0),0)});const before=counts();for(const id of ids){const m=c.modules.get(id);for(let i=0;i<3;i++){m.enable();m.disable();c.clickgui.close()}}return {before,after:counts(),errors:c.modules.errors().length,held:EaglerHacks.adapter.diagnostics().syntheticHeldKeys,focus:c.clickgui.root.contains(document.activeElement)}},observed);
 check('41 observed modules repeated toggles release listeners input and GUI focus',JSON.stringify(rapid.before)===JSON.stringify(rapid.after)&&!rapid.errors&&!rapid.held.length&&!rapid.focus,rapid);
 await wait(()=>__eaghacksScreenState.screenName===null&&!__eaghacksNativeState.session.paused&&!EaglerHacks.adapter._guiOwnsPause);await page.mouse.click(640,400,{delay:100});await wait(()=>!!document.pointerLockElement);
 await command('/kill @e[type=!minecraft:player]');await command('/tp @s 0 150 0 0 20');await moduleState('session-stats',true);
 await writeFile('input/phase15/acceptance-settings.json',JSON.stringify({hudIds,observed,scope:'Risk-based alternate HUD layout, zoom settings, modified/mouse holds, five-module combat ownership; native data never substituted'},null,2)+'\n');
}
