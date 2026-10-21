/** Availability regression through actual category rows; settings/commands only prepare fixtures. */
import {readFile,writeFile} from 'node:fs/promises';
export async function verify({page,check,wait,capture}){
 const command=async(text,settle=400)=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>__eaghacksScreenState.screenName==='ChatScreen');await page.keyboard.type(text,{delay:8});await page.keyboard.press('Enter',{delay:100});await wait(()=>__eaghacksScreenState.screenName===null);await page.waitForTimeout(settle)};
 const state=()=>page.evaluate(()=>structuredClone(__eaghacksNativeState));
 const active=id=>page.evaluate(id=>EaglerHacks.client.modules.get(id).active,id);
 const settings=async(id,values)=>page.evaluate(({id,values})=>{const m=EaglerHacks.client.modules.get(id);for(const[k,v]of Object.entries(values))m.settings.get(k).set(v)},{id,values});
 const catalogue=await page.evaluate(()=>EaglerHacks.client.catalogue());
 const metadata=Object.fromEntries(catalogue.map(m=>[m.id,m]));
 const open=async()=>{if(!await page.evaluate(()=>EaglerHacks.client.clickgui.open))await page.keyboard.press('ShiftRight');await wait(()=>EaglerHacks.client.clickgui.open);await wait(()=>!EaglerHacks.adapter._gameplayInputAllowed())};
 const close=async()=>{if(await page.evaluate(()=>EaglerHacks.client.clickgui.open))await page.keyboard.press('Escape');await wait(()=>!EaglerHacks.client.clickgui.open&&__eaghacksScreenState.screenName===null&&!__eaghacksNativeState.session.paused)};
 const row=async id=>{const m=metadata[id],panel=page.locator(`.mt-window[data-category="${m.category}"]`);await panel.locator('.mt-header').click();if(await panel.locator('.mt-body').evaluate(n=>getComputedStyle(n).display==='none'))await panel.locator('.mt-collapse').click();const n=panel.locator('.mt-row').filter({has:page.locator('.mt-name',{hasText:new RegExp(`^${m.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})});await n.scrollIntoViewIfNeeded();return {panel,n}};
 const toggle=async(id,on)=>{await open();const {panel,n}=await row(id);const displayed=await n.evaluate(n=>({unavailable:n.classList.contains('mt-unsupported'),title:n.title}));check(`${id}: displayed availability inside loaded world with GUI open`,!displayed.unavailable&&!displayed.title.includes('requires a loaded world'),displayed);if(await active(id)!==on)await n.click();await page.waitForTimeout(100);check(`${id}: actual category click ${on?'enables':'disables'}`,await active(id)===on);await panel.locator('.mt-collapse').click();};
 const pixels=()=>page.evaluate(()=>{const c=document.getElementById('eaghacks-hud-canvas');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)});
 for(const id of ['kill-aura','bunny-hop','entity-esp'])check(`${id} remains enabled after closing GUI`,await active(id));
 for(const id of ['kill-aura','bunny-hop','entity-esp'])await toggle(id,false);await close();
 // A clean, repeatable test platform. Never spawn targets in leftover block fixtures.
 for(const text of ['/gamemode creative','/effect clear @s','/effect give @s minecraft:saturation 1 5 true','/tp @s 0 150 0 0 10'])await command(text);
 await page.waitForTimeout(3000);
 for(const text of ['/fill -8 149 -8 8 149 8 minecraft:stone','/fill -8 150 -8 8 156 8 minecraft:air','/gamerule minecraft:spawn_mobs false','/kill @e[type=!minecraft:player]','/time set 18000','/gamemode survival','/spawnpoint @s 0 150 0','/summon minecraft:pig 0 150 2 {NoAI:1b}'])await command(text);
 await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health===10));
 await settings('kill-aura',{players:false,hostile:false,passive:false,range:2,cps:2});
 await toggle('kill-aura',true);
 check('KillAura GUI activation queues no combat or movement while paused',await page.evaluate(()=>{const q=window.__eaghacksNativeCommands??{};return !EaglerHacks.adapter._gameplayInputAllowed()&&!['attackEntityId','jump','velocity','rotation'].some(k=>k in q)}));
 await close();await page.waitForTimeout(700);
 check('KillAura passive filter prevents damage to real pig', (await state()).entities.some(e=>e.type==='minecraft:pig'&&e.health===10));
 await settings('kill-aura',{passive:true});await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health>0&&e.health<10));
 check('KillAura enabled through GUI damages eligible real mob after close',true);
 await toggle('kill-aura',false);await close();
 let health=(await state()).entities.find(e=>e.type==='minecraft:pig')?.health;await page.waitForTimeout(900);
 check('KillAura disable stops damage and clears queued attacks',(await state()).entities.some(e=>e.type==='minecraft:pig'&&e.health===health)&&await page.evaluate(()=>!window.__eaghacksNativeCommands?.attackEntityId));
 await command('/kill @e[type=minecraft:pig]');await command('/summon minecraft:pig 0 150 5 {NoAI:1b}');await command('/tp @s 0 150 0 0 10');
 await toggle('kill-aura',true);await close();await page.waitForTimeout(700);
 check('KillAura range rejects real target five blocks away',(await state()).entities.some(e=>e.type==='minecraft:pig'&&e.health===10));
 await command('/tp @s 0 150 4 0 10');await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health>0&&e.health<10));check('KillAura attacks when actual player enters configured range',true);await toggle('kill-aura',false);await close();
 // Sprint restriction and real motion, with module activation through GUI.
 await command('/tp @s 0 150 0 0 10');await settings('bunny-hop',{'only-sprinting':true,delay:2});await toggle('bunny-hop',true);await close();await wait(()=>__eaghacksNativeState.player.onGround);
 await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
 check('BunnyHop sprint-only restriction keeps non-sprinting player grounded',(await state()).player.onGround&&(await state()).player.y===150);
 await toggle('sprint',true);await close();await page.keyboard.down('KeyW');try{await wait(()=>__eaghacksNativeState.player.sprinting&&__eaghacksNativeState.player.y>150.1)}finally{await page.keyboard.up('KeyW')}
 check('BunnyHop enabled through GUI jumps while sprinting in real gameplay',true);await toggle('bunny-hop',false);await toggle('sprint',false);await close();await command('/tp @s 0 150 0 0 10');await wait(()=>__eaghacksNativeState.player.onGround);
 await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');check('BunnyHop disable stops automatic jumping',(await state()).player.y===150);await command('/tp @s 0 150 0 0 10');
 // Real passive/hostile filters and rendered movement; no fabricated entity snapshots.
 await command('/kill @e[type=!minecraft:player]');await command('/kill @e[type=minecraft:item]');await command('/summon minecraft:pig 0 150 3 {NoAI:1b}');await command('/summon minecraft:zombie 3 150 3 {NoAI:1b}');
 await settings('entity-esp',{players:false,hostile:false,passive:true});await toggle('entity-esp',true);await close();await page.waitForTimeout(300);
 const candidates=()=>page.evaluate(()=>EaglerHacks.client.modules.get('entity-esp').candidates(EaglerHacks.adapter).map(c=>({id:c.entity.id,type:c.entity.type,self:c.entity.isSelf,x:c.entity.x,z:c.entity.z})));
 check('ESP passive filter renders real pig and excludes hostile',(await candidates()).some(e=>e.type==='minecraft:pig')&&!(await candidates()).some(e=>e.type==='minecraft:zombie')&&await pixels());
 await settings('entity-esp',{passive:false,hostile:true});await page.waitForTimeout(250);check('ESP hostile filter renders real zombie and excludes passive',(await candidates()).some(e=>e.type==='minecraft:zombie')&&!(await candidates()).some(e=>e.type==='minecraft:pig')&&await pixels());
 await settings('entity-esp',{hostile:false,players:true});await page.waitForTimeout(250);check('ESP player filter never includes the actual local self entity',!(await candidates()).some(e=>e.self)&&!await pixels());
 await settings('entity-esp',{players:false,passive:true});
 await page.evaluate(()=>{const a=EaglerHacks.adapter,ctx=a.ctx;window.__availabilityStroke=ctx.strokeRect;window.__availabilityRects=[];ctx.strokeRect=function(...rect){window.__availabilityRects.push(rect);window.__availabilityRects=window.__availabilityRects.slice(-8);return __availabilityStroke.apply(this,rect)}});await page.waitForTimeout(250);
 const bounds1=await page.evaluate(()=>__availabilityRects.at(-1));await command('/tp @e[type=minecraft:pig,limit=1] 2 150 3');await page.waitForTimeout(300);
 const tracked=await page.evaluate(()=>({rect:__availabilityRects.at(-1),native:__eaghacksNativeState.entities.find(e=>e.type==='minecraft:pig')?.x}));
 check('ESP rendered indicators track a real entity teleport',tracked.native>2&&bounds1?.length===4&&tracked.rect?.length===4&&Math.abs(bounds1[0]-tracked.rect[0])>2,{before:bounds1,after:tracked.rect,nativeX:tracked.native});
 await page.evaluate(()=>{EaglerHacks.adapter.ctx.strokeRect=__availabilityStroke;delete window.__availabilityStroke;delete window.__availabilityRects});await toggle('entity-esp',false);await close();await page.waitForTimeout(200);check('ESP disable clears overlay pixels',!await pixels());
 // Focused GUI regression for all 41 previously observed modules, including one-shot actions.
 const previous=JSON.parse(await readFile('reports/release-phase13/verification.json','utf8'));
 const observed=previous.modules.rows.filter(m=>m.status==='gameplay-observed');check('preserve the exact 41 observed module cohort',observed.length===41);
 const oneShot=new Set(['module-search','keybind-manager','screenshot-util']);
 for(const m of observed){
  await open();const {panel,n}=await row(m.id);const availability=await n.evaluate(n=>({grey:n.classList.contains('mt-unsupported'),reason:n.title}));check(`${m.id}: 41-module displayed availability`,!availability.grey&&!availability.reason.includes('requires a loaded world'));
  const download=m.id==='screenshot-util'?page.waitForEvent('download',{timeout:15000}):null;
  await n.click();if(download)await download;await page.waitForTimeout(100);
  check(`${m.id}: 41-module real GUI enable`,oneShot.has(m.id)?await page.evaluate(()=>EaglerHacks.client.clickgui.open):await active(m.id));
  if(await active(m.id))await n.click();await page.waitForTimeout(50);check(`${m.id}: 41-module real GUI disable`,!await active(m.id));
  await panel.locator('.mt-collapse').click();
 }
 // Keep native-dependent targets armed for real world unload/rejoin restoration.
 await commandWithClosed('/kill @e[type=!minecraft:player]');
 for(const id of ['kill-aura','bunny-hop','entity-esp','coordinates','auto-walk'])await toggle(id,true);await close();
 await page.waitForTimeout(200);await page.keyboard.press('Escape');await wait(()=>__eaghacksScreenState.screenName==='PauseScreen');await page.waitForTimeout(200);
 check('native pause releases synthetic movement while preserving loaded-world availability',await page.evaluate(()=>EaglerHacks.adapter.inWorld()&&EaglerHacks.adapter.diagnostics().syntheticHeldKeys.length===0));
 await page.mouse.click(640,489,{delay:400});await wait(()=>!window.__eaghacksNativeState&&!EaglerHacks.adapter.inWorld(),null,60000);await wait(()=>EaglerHacks.adapter._previousNative===null&&!EaglerHacks.client.modules.get('entity-esp').active);await page.waitForTimeout(100);
 check('world exit clears native combat, rendering and owned input',await page.evaluate(()=>!window.__eaghacksNativeCommands&&EaglerHacks.adapter.diagnostics().syntheticHeldKeys.length===0&&!EaglerHacks.client.modules.get('entity-esp').active)&&!await pixels());
 await capture('outside-world');
 await page.keyboard.press('ShiftRight');await wait(()=>EaglerHacks.client.clickgui.open);
 for(const id of ['kill-aura','bunny-hop','entity-esp']){const {panel,n}=await row(id);const unavailable=await n.evaluate(n=>n.classList.contains('mt-unsupported'));check(`${id} unavailable in real GUI outside world`,unavailable&&!await active(id));await panel.locator('.mt-collapse').click()}
 await page.keyboard.press('Escape');await page.mouse.click(640,371,{delay:300});await wait(()=>__eaghacksScreenState.screenName==='SelectWorldScreen');await page.mouse.dblclick(640,210);await wait(()=>window.__eaghacksNativeState?.player&&__eaghacksScreenState.screenName===null,null,180000);
 await wait(()=>['kill-aura','bunny-hop','entity-esp','coordinates'].every(id=>EaglerHacks.client.modules.get(id).active));check('real world reentry restores eligible module intent',true);
 await toggle('auto-walk',false);await close();
 await settings('coordinates',{precision:2});await settings('entity-esp',{range:48});await settings('bunny-hop',{delay:3});
 await toggle('fps-display',true);await close();await page.keyboard.press('Escape');await wait(()=>__eaghacksScreenState.screenName==='PauseScreen');await page.mouse.click(640,489,{delay:300});await wait(()=>!window.__eaghacksNativeState,null,60000);
 const expected=await page.evaluate(ids=>{const c=EaglerHacks.client;c.config.save(true);return ids.map(id=>{const m=c.modules.get(id);return {id,settings:Object.fromEntries(m.settings.all().map(s=>[s.name,s.value]))}})},observed.map(m=>m.id));await writeFile('input/phase13_1/expected-settings.json',JSON.stringify(expected,null,2)+'\n');
 check('no module errors after GUI and lifecycle regression',await page.evaluate(()=>EaglerHacks.client.modules.errors().length===0));
 async function commandWithClosed(text){await close();await command(text)}
}
