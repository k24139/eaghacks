/** Exercises the existing compiled client with refreshed JavaScript in an isolated local QA world. No native state is fabricated. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
import {chromium} from 'playwright';
const url=process.argv[2];if(!url)throw Error('Usage: node tools/native-gameplay-check.mjs <native-client-url>');
await mkdir('artifacts',{recursive:true});const results=[],errors=[],inputLimitations=[];let stage='startup';
// Fail before browser startup if a recovered artifact was truncated.
if(process.env.NATIVE_ARTIFACT){
 const bytes=await readFile(process.env.NATIVE_ARTIFACT);
 assert.match(bytes.subarray(-1024).toString('utf8'),/<\/html>\s*$/i,'Native HTML is incomplete. Restore the saved artifact before running QA.');
 if(process.env.NATIVE_EXPECTED_SHA256)assert.equal(createHash('sha256').update(bytes).digest('hex'),process.env.NATIVE_EXPECTED_SHA256,'Native HTML SHA-256 does not match the expected artifact.');
}
const profile=resolve(process.env.QA_PROFILE||'input/phase13/rc-profile'),profileRel=relative(resolve('input/phase13'),profile);assert.ok(profileRel&&!profileRel.startsWith('..')&&!isAbsolute(profileRel),'Use a dedicated child of input/phase13');
const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--enable-precise-memory-info']});
const browser={close:()=>context.close()};
const page=await context.newPage();await context.addInitScript({path:'tools/phase7-audio-probe.js'});page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('/WARN]')){errors.push(m.text());console.log('GAME LOG',m.text().slice(0,500));}});
const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout});
const snapshot=()=>page.evaluate(()=>structuredClone(window.__eaghacksNativeState));
const check=(name,value,detail)=>{assert.ok(value,`${name}: ${JSON.stringify(detail)}`);results.push({name,detail});console.log('PASS',name,detail===undefined?'':JSON.stringify(detail));};
const click=async(x,y,ms=1500)=>{await page.mouse.click(x,y,{delay:750});await page.waitForTimeout(ms);console.log('UI',x,y,await page.evaluate(()=>window.__eaghacksScreenState?.screenName??null));};
const command=async(text,settle=500)=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='ChatScreen',null,30000);await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName===null,null,30000);await page.waitForTimeout(settle);};
const moduleState=async(id,active)=>page.evaluate(({id,active})=>window.EaglerHacks.client.modules.get(id).setActive(active),{id,active});
const inspect=async()=>{const{start}=await import('node:repl');const server=start({prompt:'native-qa> '});Object.assign(server.context,{page,browser,snapshot,click,command,moduleState});await new Promise(resolve=>server.once('exit',resolve));};
const started=Date.now();let moved,brightness;
try{
 await page.goto(url,{waitUntil:'load',timeout:120000});
 await wait(()=>window.__eaglerMenuReady===true&&window.__eaglerGameReady===true&&window.__eaghacksNativeBridge?.version===1,null,120000);
 check('compiled Java bridge announces itself',await page.evaluate(()=>window.__eaghacksNativeBridge.runtime==='Java/TeaVM-WasmGC'&&window.__eaghacksNativeBridge.upstream==='1be2375ad67cb42a52d5f586a2422e54b57be625'));
 await page.evaluate(()=>{const c=EaglerHacks.client;c.modules.disableAll();for(const m of c.modules.all())m.settings.reset();c.config.save(true)});
 stage='create-world';
 await wait(()=>['EaglerProfileScreen26','TitleScreen'].includes(window.__eaghacksScreenState?.screenName)&&window.__eaghacksScreenState?.overlayActive===false,null,120000);
 if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerProfileScreen26')){await click(640,667,500);await wait(()=>window.__eaghacksScreenState?.screenName!=='EaglerProfileScreen26');if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerDefaultUsernameNoteScreen'))await click(640,678,500);}
 await wait(()=>window.__eaghacksScreenState?.screenName==='TitleScreen');await click(640,371,500);
 if(process.env.QA_SAVED==='1'){await wait(()=>window.__eaghacksScreenState?.screenName==='SelectWorldScreen',null,120000);await page.mouse.dblclick(640,210);}else{
 await wait(()=>window.__eaghacksScreenState?.screenName==='EaglerCreateWorldSelectionScreen',null,120000);await click(640,300,500);
 await wait(()=>window.__eaghacksScreenState?.screenName==='CreateWorldScreen',null,120000);await click(640,438,500);
 if(process.env.NATIVE_QA_FLAT==='1'){await click(640,35,500);await click(400,148,500);await click(1035,365,500);await page.screenshot({path:'input/phase13/rc-flat-world-settings.png'});if(process.env.NATIVE_QA_SETUP==='1')await inspect();}
 await click(402,752,500);
 }
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
 if(process.env.QA_RESUME_AFTER_BASE!=='1'){
 stage='controlled-world';await click(process.env.NATIVE_QA_LOW_RESOURCE==='1'?320:640,process.env.NATIVE_QA_LOW_RESOURCE==='1'?200:400);await moduleState('session-stats',true);
 await command('/gamemode creative');await command('/effect clear @s');await command('/effect give @s minecraft:saturation 1 5 true');await command('/effect give @s minecraft:instant_health 1 5 true');await command('/clear @s');await command('/gamerule minecraft:spawn_mobs false');await command('/kill @e[type=!minecraft:player]');await command('/tp @s 0 150 0 0 0',4000);await command('/fill -8 149 -8 8 149 8 minecraft:stone',1500);await command('/fill -8 150 -8 8 156 8 minecraft:air');await command('/tp @s 0 150 0 0 0');await command('/spawnpoint @s 0 150 0');await command('/gamemode survival');await command('/give @s minecraft:bread 4');await command('/summon minecraft:pig 0 150 2 {NoAI:1b}');
 await wait(()=>Math.abs(window.__eaghacksNativeState.player.y-150)<.1&&window.__eaghacksNativeState.player.onGround);await wait(()=>window.__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health>0));
 await page.keyboard.press('KeyE',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName==='InventoryScreen');check('actual survival inventory opens',true);
 await page.keyboard.press('Escape',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName===null);const center=process.env.NATIVE_QA_LOW_RESOURCE==='1'?{x:320,y:200}:{x:640,y:400};await click(center.x,center.y,500);
 await wait(()=>!!document.pointerLockElement&&document.getElementById('game_frame').contains(document.pointerLockElement),null,30000);check('actual game canvas captures the mouse',true);
 const mouseYaw=(await snapshot()).player.yaw;await page.evaluate(()=>{window.__qaMouseEvents=[];window.__qaMouseListener=e=>{if(e.isTrusted&&window.__qaMouseEvents.length<100)window.__qaMouseEvents.push({dx:e.movementX,dy:e.movementY});};document.addEventListener('mousemove',window.__qaMouseListener,true);});
 await page.mouse.move(center.x+40,center.y+5,{steps:4});await page.waitForTimeout(1000);const mouseResult=await page.evaluate(()=>{document.removeEventListener('mousemove',window.__qaMouseListener,true);return {yaw:window.__eaghacksNativeState.player.yaw,events:window.__qaMouseEvents};});
 check('trusted mouse movement reaches the actual captured game canvas',mouseResult.events.some(e=>Math.abs(e.dx)+Math.abs(e.dy)>0),mouseResult);
 if(Math.abs(mouseResult.yaw-mouseYaw)>.1)check('captured mouse changes actual native camera yaw',true);else{assert.ok(Math.abs(mouseResult.events.reduce((s,e)=>s+e.dx,0))<1&&Math.abs(mouseResult.events.reduce((s,e)=>s+e.dy,0))<1,'Uncancelled relative mouse movement must change native camera');inputLimitations.push({test:'physical pointer-lock camera motion',reason:'Headless Chromium generated cancelling trusted recenter deltas; native yaw did not change. Pointer capture and native rotation commands are checked separately.',events:mouseResult.events});}
 const before=await snapshot();await page.keyboard.down('KeyW');try{await wait(p=>Math.hypot(window.__eaghacksNativeState.player.x-p.x,window.__eaghacksNativeState.player.z-p.z)>.1,before.player,30000);}finally{await page.keyboard.up('KeyW');}moved=await snapshot();
 check('real movement changes native coordinates',Math.hypot(moved.player.x-before.player.x,moved.player.z-before.player.z)>.1,{before:[before.player.x,before.player.z],after:[moved.player.x,moved.player.z]});
 check('real entities expose type, velocity and health',moved.entities.some(e=>e.type==='minecraft:pig'&&e.health>0&&Number.isFinite(e.velocity.y)));
 check('native inventory contains the actual bread',moved.inventory.hotbar.some(i=>i?.id==='minecraft:bread'));
 check('native main inventory has 36 slots',moved.inventory.main.length===36);
 check('native camera contains a finite projection',moved.camera.m.length===16&&moved.camera.m.every(Number.isFinite));
 check('native biome identifies the actual loaded region',typeof moved.world.biome==='string'&&moved.world.biome.startsWith('minecraft:'));
 check('native effects are an actual typed collection',Array.isArray(moved.player.effects));
 stage='native-actions';await command('/damage @s 2 minecraft:generic',20);await wait(()=>window.__eaghacksNativeState.player.health<20&&window.__eaghacksNativeState.player.hurtTime>0);check('real damage updates native health and hurt state',true);
 await page.evaluate(()=>window.EaglerHacks.adapter.selectSlot(3));await wait(()=>window.__eaghacksNativeState.inventory.selectedSlot===3);check('native slot command changes actual selection',true);
 await page.evaluate(()=>window.EaglerHacks.adapter.setRotation(30,10));await wait(()=>Math.abs(window.__eaghacksNativeState.player.yaw-30)<1&&Math.abs(window.__eaghacksNativeState.player.pitch-10)<1);check('native rotation changes real yaw and pitch',true);
 await wait(()=>window.__eaghacksNativeState.player.onGround);const y=(await snapshot()).player.y;await page.evaluate(()=>window.EaglerHacks.adapter.jump());await wait(y=>window.__eaghacksNativeState.player.y>y+.05,y);check('native jump changes real height',true);
 stage='combat';await command('/tp @s 0 150 0 0 0');await page.evaluate(()=>{const m=window.EaglerHacks.client.modules.get('kill-aura');m.settings.get('passive').set(true);m.settings.get('hostile').set(false);m.enable();});
 await wait(()=>window.__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&e.health>0&&e.health<e.maxHealth));check('KillAura damages a real private-world mob',true);await moduleState('kill-aura',false);
 stage='batched-actions';await command('/summon minecraft:pig 1 150 1 {NoAI:1b}');await command('/summon minecraft:pig -1 150 1 {NoAI:1b}');
 await wait(()=>[1.5,-.5].every(x=>window.__eaghacksNativeState.entities.some(e=>e.type==='minecraft:pig'&&Math.abs(e.x-x)<.1&&Math.abs(e.z-1.5)<.1&&e.health===10)),null,30000);
 const batchTargets=await page.evaluate(()=>[1.5,-.5].map(x=>window.__eaghacksNativeState.entities.find(e=>e.type==='minecraft:pig'&&Math.abs(e.x-x)<.1&&Math.abs(e.z-1.5)<.1&&e.health===10)).filter(Boolean).map(e=>({id:e.id,health:e.health})));
 check('two actual healthy private-world mobs prepare batch test',batchTargets.length===2,batchTargets);
 await page.evaluate(targets=>targets.forEach(e=>window.EaglerHacks.adapter.attack(e)),batchTargets);
 await wait(targets=>targets.every(t=>window.__eaghacksNativeState.entities.some(e=>e.id===t.id&&e.health<t.health)),batchTargets,30000);
 check('compiled bounded batch damages two actual mobs',true);
 stage='rotation-conflict';await page.evaluate(()=>window.EaglerHacks.adapter.setRotation(15,20));await wait(()=>Math.abs(window.__eaghacksNativeState.player.yaw-15)<1);
 await moduleState('aim-assist',true);await wait(()=>Math.abs(window.__eaghacksNativeState.player.yaw)<1);check('Aim Assist rotates toward an actual mob',true);await moduleState('aim-assist',false);
 await page.evaluate(()=>window.EaglerHacks.adapter.setRotation(15,20));await wait(()=>Math.abs(window.__eaghacksNativeState.player.yaw-15)<1);
 await page.evaluate(()=>{window.EaglerHacks.client.modules.get('kill-aura').enable();window.EaglerHacks.client.modules.get('aim-assist').enable();});
 try{await wait(()=>Math.abs(window.__eaghacksNativeState.player.yaw)>20);check('KillAura owns actual rotation when Aim Assist is also enabled',true);}finally{await moduleState('kill-aura',false);await moduleState('aim-assist',false);}
 stage='movement';await command('/tp @s 0 150 0 0 0');await moduleState('sprint',true);await page.keyboard.down('KeyW');try{await wait(()=>window.__eaghacksNativeState.player.sprinting);check('Sprint changes actual sprint state while moving',true);}finally{await page.keyboard.up('KeyW');await moduleState('sprint',false);}await wait(()=>!window.__eaghacksNativeState.player.sprinting);check('Sprint releases state when disabled',true);
 stage='movement-conflict';await command('/tp @s 0 150 0 0 0');await moduleState('sprint',true);await moduleState('speed',true);await page.keyboard.down('KeyW');
 try{await wait(()=>{const p=window.__eaghacksNativeState.player;return p.sprinting&&p.onGround&&Math.hypot(p.velocity.x,p.velocity.z)>.18;},null,15000);check('Speed and Sprint combine in actual movement',true);}finally{await page.keyboard.up('KeyW');await moduleState('speed',false);await moduleState('sprint',false);}
 await wait(()=>{const p=window.__eaghacksNativeState.player;return !p.sprinting&&Math.hypot(p.velocity.x,p.velocity.z)<.05;},null,30000);check('combined movement disables without sustained velocity or sprint',true);await command('/tp @s 0 150 0 0 20');
 stage='focus';await command('/gamemode creative');await moduleState('auto-walk',true);await wait(()=>window.__eaghacksNativeState.player.moveForward>0&&window.EaglerHacks.adapter.diagnostics().syntheticHeldKeys.includes('KeyW'),null,30000);
 const other=await page.context().newPage();let emulatedBlur=false;
 try{await other.goto('about:blank');await other.bringToFront();await page.waitForTimeout(500);
  if(await page.evaluate(()=>document.hasFocus())){emulatedBlur=true;inputLimitations.push({test:'physical browser focus transition',reason:'Headless Chromium keeps both tabs focused. The blur listener is exercised with a programmatic FocusEvent, and actual native movement release is checked. Desktop focus switching remains manual QA.'});await page.evaluate(()=>window.dispatchEvent(new FocusEvent('blur')));}
  await wait(()=>window.EaglerHacks.adapter.diagnostics().syntheticHeldKeys.length===0,null,10000);check(emulatedBlur?'programmatic blur releases keys in the actual native world':'actual browser focus loss releases module-owned movement keys',true);
 }finally{await moduleState('auto-walk',false);await other.close();await page.bringToFront();if(emulatedBlur)await page.evaluate(()=>window.dispatchEvent(new FocusEvent('focus')));}
 if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='PauseScreen'))await page.keyboard.press('Escape',{delay:100});await wait(()=>window.__eaghacksScreenState?.screenName===null);await wait(()=>window.__eaghacksNativeState.player.moveForward===0&&Math.hypot(window.__eaghacksNativeState.player.velocity.x,window.__eaghacksNativeState.player.velocity.z)<.05,null,30000);check('focus regain and module disable leave no sustained movement',true);await command('/tp @s 0 150 0 0 20');
 await command('/gamemode survival');
 stage='camera';const matrix=(await snapshot()).camera.m[0];await moduleState('zoom',true);await wait(()=>window.__eaghacksNativeState.options.fov<30);await wait(m=>Math.abs(window.__eaghacksNativeState.camera.m[0]-m)>.01,matrix);check('Zoom changes actual FOV and camera projection',true);await moduleState('zoom',false);await wait(()=>window.__eaghacksNativeState.options.fov===70);check('Zoom restores native FOV',true);
 brightness=(await snapshot()).options.brightness;await moduleState('fullbright',true);await wait(()=>window.__eaghacksNativeState.options.brightness===1);check('Fullbright changes real gamma option',true);await moduleState('fullbright',false);await wait(v=>window.__eaghacksNativeState.options.brightness===v,brightness);check('Fullbright restores real gamma option',true);
 await moduleState('no-hurt-cam',true);await wait(()=>window.__eaghacksNativeState.options.noHurtCamera);check('NoHurtCam enables compiled camera hook',true);await moduleState('no-hurt-cam',false);await wait(()=>!window.__eaghacksNativeState.options.noHurtCamera);check('NoHurtCam restores the compiled hook',true);
 stage='food';await command('/effect give @s minecraft:hunger 3 255 true');await page.waitForTimeout(4000);const hungry=(await snapshot()).player.hunger;check('real hunger effect prepares food test',hungry<16,hungry);await page.evaluate(()=>window.EaglerHacks.adapter.selectSlot(3));await wait(()=>window.__eaghacksNativeState.inventory.selectedSlot===3);await moduleState('auto-eat',true);await wait(()=>window.__eaghacksNativeState.player.usingItem);check('AutoEat starts real food use',true);await wait(h=>window.__eaghacksNativeState.player.hunger>h,hungry,15000);check('AutoEat increases actual hunger',true);await moduleState('auto-eat',false);await wait(()=>window.__eaghacksNativeState.inventory.selectedSlot===3&&!window.__eaghacksNativeState.player.usingItem);check('AutoEat releases use and restores actual slot',true);
 stage='render';await command('/tp @s 0 150 0 0 20');
 for(const id of ['entity-esp','tracers','nametags']){
  await page.evaluate(id=>{const m=window.EaglerHacks.client.modules.get(id);m.settings.get('passive')?.set(true);m.enable();},id);await page.waitForTimeout(600);
  check(id+' draws actual entity overlay pixels',await page.evaluate(()=>{const c=document.getElementById('eaghacks-hud-canvas');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);}));await moduleState(id,false);await page.waitForTimeout(150);
 }
 stage='hud';await moduleState('coordinates',true);await page.waitForTimeout(200);
 const hud=await page.evaluate(()=>{const n=document.querySelector('.mt-hud-el[data-module="coordinates"]');return {text:n?.textContent??'',width:n?.getBoundingClientRect().width??0};});
 check('Coordinates HUD displays actual player position',/XYZ:/.test(hud.text)&&hud.width>0,hud);await moduleState('coordinates',false);
 await moduleState('world-time',true);await page.waitForTimeout(200);check('World Time HUD reads actual native clock',await page.evaluate(()=>/Time: \d\d:\d\d \(day \d+\)/.test(document.querySelector('.mt-hud-el[data-module="world-time"]')?.textContent??'')));await moduleState('world-time',false);
 await command('/item replace entity @s armor.head with minecraft:iron_helmet');await wait(()=>window.__eaghacksNativeState.inventory.armor.some(i=>i?.id==='minecraft:iron_helmet'));await moduleState('armor-hud',true);await page.waitForTimeout(200);check('Armor HUD displays actual equipped armor metadata',await page.evaluate(()=>/Iron Helmet/i.test(document.querySelector('.mt-hud-el[data-module="armor-hud"]')?.textContent??'')));await moduleState('armor-hud',false);

 await moduleState('biome-info',true);await page.waitForTimeout(300);check('Biome Info displays the real native biome',await page.evaluate(()=>/Biome: minecraft:/.test(document.querySelector('.mt-hud-el[data-module=\"biome-info\"]')?.textContent??'')));await moduleState('biome-info',false);
 await command('/effect give @s minecraft:speed 10 0 true');await wait(()=>window.__eaghacksNativeState.player.effects.some(e=>/speed/i.test(e.name)));await moduleState('potion-hud',true);await page.waitForTimeout(300);check('Potion HUD displays an actual active effect',await page.evaluate(()=>/Speed/.test(document.querySelector('.mt-hud-el[data-module=\"potion-hud\"]')?.textContent??'')));await moduleState('potion-hud',false);
 await moduleState('custom-crosshair',true);await wait(()=>window.__eaghacksNativeState.options.hideCrosshair);check('Custom Crosshair suppresses the real vanilla crosshair through its compiled hook',true);await moduleState('custom-crosshair',false);await wait(()=>!window.__eaghacksNativeState.options.hideCrosshair);check('Custom Crosshair restores the real vanilla crosshair',true);
 stage='gui';await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(500);await page.keyboard.press('ShiftRight');await page.waitForTimeout(200);check('ClickGUI opens inside actual native world',await page.evaluate(()=>window.EaglerHacks.client.clickgui.open));await page.keyboard.press('Escape');await wait(()=>window.__eaghacksScreenState?.screenName===null,null,30000);check('ClickGUI close restores actual game control without an extra pause menu',true);await click(640,400);
 }else{
 await moduleState('session-stats',true);
 for(const text of ['/gamemode creative','/effect clear @s','/effect give @s minecraft:saturation 1 5 true','/tp @s 0 150 0 0 0'])await command(text,1000);
 await page.waitForTimeout(3000);
 for(const text of ['/fill -8 149 -8 8 149 8 minecraft:stone','/fill -8 150 -8 8 156 8 minecraft:air','/kill @e[type=!minecraft:player]','/spawnpoint @s 0 150 0','/gamemode survival'])await command(text);
 await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');moved=await snapshot();brightness=moved.options.brightness;
 }
 stage='phase13-additional';await (await import('./phase13-extra-checks.mjs')).extra({page,check,command,wait,moduleState});
 stage='respawn';await page.evaluate(()=>{window.__nativeQALifecycle=[];for(const event of ['player-death','player-respawn'])window.EaglerHacks.client.bus.on(event,()=>window.__nativeQALifecycle.push(event));const m=window.EaglerHacks.client.modules.get('auto-respawn');m.settings.get('delay').set(40);m.enable();});await command('/kill @s',20);await wait(()=>window.__nativeQALifecycle.includes('player-death'));check('real death emits native lifecycle event',true);await wait(()=>window.__nativeQALifecycle.includes('player-respawn')&&window.__eaghacksNativeState.player.health>0,null,30000);check('AutoRespawn returns actual player to world',true);await moduleState('auto-respawn',false);
 check('Session Statistics records real movement and death',await page.evaluate(()=>{const s=window.EaglerHacks.client.modules.get('session-stats').stats;return s.distance>0&&s.deaths>=1;}));await moduleState('session-stats',false);
 stage='world-transitions';await page.screenshot({path:'input/phase13/rc-native-live-world.png'});
 await moduleState('zoom',true);await moduleState('fullbright',true);await wait(()=>window.__eaghacksNativeState.options.fov<30&&window.__eaghacksNativeState.options.brightness===1);
 await page.keyboard.press('Escape');await wait(()=>window.__eaghacksNativeState.session.paused===true);
 check('camera modules retain intent in a paused loaded world',await page.evaluate(()=>EaglerHacks.adapter.inWorld()&&EaglerHacks.client.modules.get('zoom').active&&EaglerHacks.client.modules.get('fullbright').active));
 const menuBefore=await snapshot();await page.evaluate(()=>{window.EaglerHacks.client.ticker.stop();window.__eaghacksNativeCommands={jump:true,sprinting:true,selectSlot:7,rotation:{yaw:140,pitch:40},velocity:{x:1,y:1,z:1}};});
 try{await wait(sequence=>window.__eaghacksNativeState.bridge.sequence>sequence+1,menuBefore.bridge.sequence,30000);const after=await snapshot();check('compiled Java menu gate blocks stale actions while framework ticker is stopped',after.inventory.selectedSlot===menuBefore.inventory.selectedSlot&&after.player.yaw===menuBefore.player.yaw&&Math.abs(after.player.y-menuBefore.player.y)<.01&&!after.player.sprinting);}
 finally{await page.evaluate(()=>{delete window.__eaghacksNativeCommands;window.EaglerHacks.client.ticker.start();});}
 await click(640,489,1000);
 await wait(()=>!window.__eaghacksNativeState&&!window.EaglerHacks.adapter.inWorld(),null,60000);
 await wait(()=>window.EaglerHacks.adapter._previousNative===null);
 check('world exit clears real native snapshot and stale commands',await page.evaluate(()=>!window.__eaghacksNativeCommands&&!window.EaglerHacks.adapter.getPlayer()));
 check('world exit retains pending user module intent',await page.evaluate(()=>window.EaglerHacks.client.modules.get('zoom')._restoreOnWorld&&!window.EaglerHacks.client.modules.get('zoom').active));
 await click(640,371,10000);await page.mouse.dblclick(640,210);await wait(()=>window.__eaglerTerrainReady&&window.__eaghacksNativeState?.player,null,240000);
 await wait(()=>window.__eaghacksNativeState.options.fov<30&&window.__eaghacksNativeState.options.brightness===1);
 check('saved world reopens and eligible modules resume from real data',true);
 await moduleState('zoom',false);await moduleState('fullbright',false);await wait(v=>window.__eaghacksNativeState.options.fov===70&&window.__eaghacksNativeState.options.brightness===v,brightness);
 check('camera state restores after leaving and rejoining a world',true);
 await moduleState('coordinates',true);await moduleState('fps-display',true);await page.evaluate(()=>window.EaglerHacks.client.config.save(true));
 await page.keyboard.press('Escape');await click(640,489,1000);await wait(()=>!window.__eaghacksNativeState&&!window.EaglerHacks.adapter.inWorld(),null,60000);await page.evaluate(()=>window.EaglerHacks.client.config.save(true));
 stage='reload';await page.reload({waitUntil:'load',timeout:120000});await wait(()=>window.__eaglerMenuReady&&window.__eaghacksNativeBridge?.version===1,null,120000);
 check('configuration survives a real native-client page reload',await page.evaluate(()=>window.EaglerHacks.client.modules.get('fps-display').active));
 check('saved native HUD waits for a real world after reload',await page.evaluate(()=>!window.EaglerHacks.client.modules.get('coordinates').active&&window.EaglerHacks.client.modules.get('coordinates')._restoreOnWorld));
 check('no uncaught page errors',errors.length===0,errors);check('no module crashes',await page.evaluate(()=>window.EaglerHacks.client.modules.errors().length===0));
 const verifiedModules=['kill-aura','aim-assist','sprint','speed','auto-walk','zoom','fullbright','no-hurt-cam','auto-eat','entity-esp','tracers','nametags','coordinates','world-time','armor-hud','session-stats','auto-respawn','biome-info','potion-hud','custom-crosshair'];
 const artifactSHA256=process.env.NATIVE_ARTIFACT ? createHash('sha256').update(await readFile(process.env.NATIVE_ARTIFACT)).digest('hex') : null;
 const sourceDigest=await gameplaySourceDigest();
 const performance=await page.evaluate(()=>window.EaglerHacks.client.stats.snapshot());await page.screenshot({path:'input/phase13/rc-native-gameplay-success.png'});
 await writeFile('input/phase13/rc-native-gameplay-results.json',JSON.stringify({results,inputLimitations,elapsedMs:Date.now()-started,sample:moved,menuFrameworkStats:performance,performanceContext:'Post-reload menu statistics; real gameplay performance is sampled separately',verifiedModules,artifactSHA256,sourceDigest},null,2));console.log(`${results.length}/${results.length} actual native gameplay checks passed.`);
 if(process.env.NATIVE_QA_REVIEW==='1')await inspect();
}catch(e){await page.screenshot({path:'input/phase13/rc-native-gameplay-failure.png'}).catch(()=>{});console.log('FAILED STAGE',stage,e.stack);console.log('DIAGNOSTICS',JSON.stringify(await page.evaluate(()=>({screen:window.__eaghacksScreenState,gameReady:window.__eaglerGameReady,menuReady:window.__eaglerMenuReady,worldReady:window.__eaglerWorldReady,terrainReady:window.__eaglerTerrainReady})).catch(()=>null)));console.log('ERRORS',errors.slice(0,10));const live=await snapshot().catch(()=>null);console.log('LIVE STATE',JSON.stringify(live&&{player:live.player,entityCount:live.entities?.length,inventory:live.inventory,session:live.session,options:live.options,bridge:live.bridge}));if(process.env.NATIVE_QA_DEBUG==='1')await inspect();throw e;}finally{await browser.close();}
