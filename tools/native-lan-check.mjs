/** Real private LAN gameplay. The pinned discovery helper supplies the test environment. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';

const url=process.argv[2],discovery=process.env.NATIVE_LAN_DISCOVERY_SCRIPT;
if(!url||!discovery)throw Error('Pass the native URL and set NATIVE_LAN_DISCOVERY_SCRIPT to the pinned upstream lan-discovery.js');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--in-process-gpu','--use-gl=angle','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const host=await browser.newPage({viewport:{width:1280,height:800}}),guest=await browser.newPage({viewport:{width:1280,height:800}});
const results=[],errors=[],hostChat=[];let stage='boot-host';
for(const page of [host,guest]){await page.addInitScript({path:discovery});page.on('pageerror',e=>errors.push(String(e)));}
host.on('console',m=>{if(m.text().includes('[CHAT]'))hostChat.push(m.text());});
const wait=(page,fn,arg,timeout=60000)=>page.waitForFunction(fn,arg,{timeout});
const atScreen=(page,name,timeout)=>wait(page,name=>window.__eaghacksScreenState?.screenName===name,name,timeout);
const state=page=>page.evaluate(()=>structuredClone(window.__eaghacksNativeState));
const click=async(page,x,y)=>{await page.bringToFront();await page.mouse.click(x,y,{delay:750});await page.waitForTimeout(600);console.log('UI',page===host?'host':'guest',x,y,await page.evaluate(()=>window.__eaghacksScreenState?.screenName));};
const moduleState=(page,id,active)=>page.evaluate(({id,active})=>window.EaglerHacks.client.modules.get(id).setActive(active),{id,active});
const command=async(page,text)=>{await page.bringToFront();await page.keyboard.press('KeyT',{delay:100});await atScreen(page,'ChatScreen');await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await atScreen(page,null);await page.waitForTimeout(500);};
const check=(name,ok,detail)=>{assert.ok(ok,`${name}: ${JSON.stringify(detail)}`);results.push({name,detail});console.log('PASS',name,JSON.stringify(detail));};

async function lowResource(page){
 await page.bringToFront();await page.keyboard.press('Escape',{delay:100});await atScreen(page,'PauseScreen');
 await click(page,480,417);await atScreen(page,'OptionsScreen');await click(page,400,375);await atScreen(page,'VideoSettingsScreen');
 await click(page,880,255);await page.mouse.move(640,400);await page.mouse.wheel(0,500);await page.waitForTimeout(1500);await click(page,664,655);
 await click(page,640,752);await click(page,640,752);await click(page,640,273);await atScreen(page,null);
}

async function boot(page,name){
 await page.goto(url,{waitUntil:'load',timeout:120000});
 await wait(page,()=>window.__eaglerGameReady&&window.__eaglerMenuReady&&window.__eaghacksNativeBridge?.version===1,null,120000);
 await wait(page,()=>window.__eaghacksScreenState?.screenName==='EaglerProfileScreen26'&&!window.__eaghacksScreenState.overlayActive,null,120000);
 await click(page,790,235);await page.keyboard.press('Control+A');await page.keyboard.type(name,{delay:30});await click(page,640,667);
 if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerDefaultUsernameNoteScreen'))await click(page,640,678);
 await atScreen(page,'TitleScreen');
}
async function openRoom(){
 await host.setViewportSize({width:1280,height:800});await atScreen(host,null);await host.keyboard.press('Escape',{delay:100});await atScreen(host,'PauseScreen');
 await click(host,800,417);await atScreen(host,'MultiplayerOptionsScreen');await host.screenshot({path:'artifacts/native-lan-share-menu.png'});
 await click(host,640,310);await atScreen(host,'EaglerDirectConnectHostScreen');await click(host,874,706);await atScreen(host,'EaglerLANPeersScreen');
}
async function invite(){
 await guest.setViewportSize({width:1280,height:800});await openRoom();await host.waitForTimeout(3000);await click(host,946,267);
 await atScreen(guest,'EaglerLANInviteScreen',120000);await click(guest,484,525);
 await wait(guest,()=>window.__eaghacksNativeState?.session.kind==='remote'&&window.__eaghacksNativeState.player?.health>0,null,120000);
 await atScreen(guest,null);await atScreen(host,null,120000);
}
async function inspect(){const{start}=await import('node:repl');const repl=start({prompt:'lan-qa> '});Object.assign(repl.context,{host,guest,browser,click,atScreen,state,command,moduleState,openRoom,invite,hostChat,results});await new Promise(r=>repl.once('exit',r));}

await mkdir('artifacts',{recursive:true});
try{
 await boot(host,'NativeQAHost');await click(host,640,371);await atScreen(host,'EaglerCreateWorldSelectionScreen',120000);await click(host,640,300);await atScreen(host,'CreateWorldScreen');await click(host,640,438);
 await click(host,640,35);await click(host,400,148);await click(host,1035,365);await click(host,402,752);
 await wait(host,()=>window.__eaglerTerrainReady&&window.__eaghacksNativeState?.player,null,240000);await atScreen(host,null);await lowResource(host);await click(host,640,400);
 await command(host,'/gamemode creative');await command(host,'/fill -8 149 -8 8 149 8 minecraft:stone');await command(host,'/tp @s 0 150 0 0 20');
 check('private host has real local identity',(await state(host)).session.kind==='local');
 stage='boot-guest';await boot(guest,'NativeQAGuest');await guest.evaluate(()=>{window.__nativeLANEvents=[];for(const event of ['world-load','world-unload'])window.EaglerHacks.client.bus.on(event,()=>window.__nativeLANEvents.push(event));});
 stage='connect';await invite();check('guest connects with proven remote identity',(await state(guest)).session.kind==='remote');await lowResource(guest);
 check('host receives the actual guest player entity',(await state(host)).entities.some(e=>e.name==='NativeQAGuest'&&e.isPlayer));
 await command(host,'/tp NativeQAGuest 0 150 1');await command(host,'/give NativeQAGuest minecraft:bread 2');
 await wait(guest,()=>window.__eaghacksNativeState.inventory.main.some(i=>i?.id==='minecraft:bread'&&i.count===2));check('server inventory update reaches native guest snapshot',true);
 await guest.evaluate(()=>window.EaglerHacks.adapter.selectSlot(3));await wait(guest,()=>window.__eaghacksNativeState.inventory.selectedSlot===3);check('native selection changes the real remote player slot',true);
 await host.setViewportSize({width:640,height:400});await guest.setViewportSize({width:640,height:400});const before=(await state(guest)).player;
 await guest.keyboard.down('KeyW');try{await wait(guest,b=>Math.hypot(window.__eaghacksNativeState.player.x-b.x,window.__eaghacksNativeState.player.z-b.z)>.3,before,15000);}finally{await guest.keyboard.up('KeyW');}
 const after=(await state(guest)).player;await wait(host,p=>window.__eaghacksNativeState.entities.some(e=>e.name==='NativeQAGuest'&&Math.hypot(e.x-p.x,e.z-p.z)<.5),after,30000);
 check('remote movement propagates to the actual host entity',true,{before:[before.x,before.z],after:[after.x,after.z]});
 stage='chat';await command(guest,'Native LAN QA hello');for(let i=0;i<30&&!hostChat.some(m=>m.includes('Native LAN QA hello'));i++)await host.waitForTimeout(500);
 check('guest chat reaches the actual host',hostChat.some(m=>m.includes('Native LAN QA hello')));
 check('remote combat automation remains blocked by default',await guest.evaluate(()=>{const m=window.EaglerHacks.client.modules.get('kill-aura');return !m.enable()&&!m.active&&m.errorCount===0;}));
 stage='disconnect';await moduleState(guest,'coordinates',true);await moduleState(guest,'zoom',true);await wait(guest,()=>window.__eaghacksNativeState.options.fov<30);
 await guest.setViewportSize({width:1280,height:800});await guest.keyboard.press('Escape',{delay:100});await atScreen(guest,'PauseScreen');await click(guest,640,489);
 await wait(guest,()=>!window.__eaghacksNativeState&&!window.EaglerHacks.adapter.getPlayer());check('disconnect clears native data and commands',await guest.evaluate(()=>!window.__eaghacksNativeCommands&&window.EaglerHacks.client.modules.get('zoom')._restoreOnWorld));
 await wait(host,()=>!window.__eaghacksNativeState.entities.some(e=>e.name==='NativeQAGuest'));check('host removes the disconnected player',true);
 stage='reconnect';await invite();await wait(guest,()=>window.__eaghacksNativeState.options.fov<30&&window.EaglerHacks.client.modules.get('coordinates').active);
 check('reconnect resumes eligible camera and HUD intent',true);check('lifecycle follows connect-disconnect-reconnect',await guest.evaluate(()=>window.__nativeLANEvents.filter(e=>e==='world-load').length===2&&window.__nativeLANEvents.filter(e=>e==='world-unload').length===1));
 stage='shutdown';await guest.evaluate(()=>window.EaglerHacks.shutdown());await wait(guest,()=>window.__eaghacksNativeState.options.fov===70);check('shutdown restores actual native camera state',true);check('no uncaught page errors',errors.length===0,errors);
 const artifactSHA256=process.env.NATIVE_ARTIFACT?createHash('sha256').update(await readFile(process.env.NATIVE_ARTIFACT)).digest('hex'):null;
 await writeFile('artifacts/native-lan-results.json',JSON.stringify({results,artifactSHA256,sourceDigest:await gameplaySourceDigest(),discoveryHelperSHA256:createHash('sha256').update(await readFile(discovery)).digest('hex'),scope:'Two private loopback peers; unchanged pinned upstream discovery helper supplied by QA; actual WebRTC/Java gameplay'},null,2)+'\n');
 console.log(`${results.length}/${results.length} private native LAN checks passed.`);if(process.env.NATIVE_QA_REVIEW==='1')await inspect();
}catch(error){console.log('FAILED LAN STAGE',stage,error);await host.screenshot({path:'artifacts/native-lan-host-failure.png'}).catch(()=>{});await guest.screenshot({path:'artifacts/native-lan-guest-failure.png'}).catch(()=>{});if(process.env.NATIVE_QA_DEBUG==='1')await inspect();throw error;}finally{await browser.close();}
