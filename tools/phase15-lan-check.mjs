/** Real private LAN gameplay. The pinned discovery helper supplies the test environment. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';

const root='input/phase15/lan';await mkdir(root,{recursive:true});
const url=process.argv[2],discovery=process.env.NATIVE_LAN_DISCOVERY_SCRIPT;
const lobby=[];let actualGuestName;
if(!url||!discovery)throw Error('Pass the native URL and set NATIVE_LAN_DISCOVERY_SCRIPT to the pinned upstream lan-discovery.js');
const artifactSHA256=createHash('sha256').update(await readFile(process.env.NATIVE_ARTIFACT)).digest('hex');
const sourceDigest=await gameplaySourceDigest();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--no-default-browser-check','--disable-background-networking']});
const deadline=setTimeout(()=>{void browser.close()},300000);
const host=await browser.newPage({viewport:{width:1280,height:800}}),guest=await browser.newPage({viewport:{width:1280,height:800}});
const results=[],errors=[],hostChat=[];let stage='boot-host';
for(const page of [host,guest]){await page.addInitScript(()=>{const RTC=window.RTCPeerConnection;window.RTCPeerConnection=class extends RTC{constructor(config){super({...config,iceServers:[]})}}});await page.addInitScript({path:discovery});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await cdp.detach();page.on('pageerror',e=>errors.push(String(e)));}
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
 await click(page,790,235);await page.keyboard.press('Meta+A');await page.keyboard.type(name,{delay:30});await click(page,640,667);
 if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerDefaultUsernameNoteScreen'))await click(page,640,678);
 await atScreen(page,'TitleScreen');
}
async function openRoom(){
 await host.setViewportSize({width:1280,height:800});await atScreen(host,null);await host.keyboard.press('Escape',{delay:100});await atScreen(host,'PauseScreen');
 await click(host,800,417);await atScreen(host,'MultiplayerOptionsScreen');await host.screenshot({path:'input/phase15/lan/native-lan-share-menu.png'});
 await click(host,640,310);await atScreen(host,'EaglerDirectConnectHostScreen');await click(host,874,706);await atScreen(host,'EaglerLANPeersScreen');
}
async function invite(){
 await guest.setViewportSize({width:1280,height:800});await openRoom();
 const guestId=await guest.evaluate(()=>JSON.parse(__eaglerLAN.snapshotJson()).self.id);
 await wait(host,id=>__eaglerLAN.peers().some(p=>p.id===id&&p.state==='open'),guestId,15000);
 const row=await host.evaluate(id=>__eaglerLAN.peers().findIndex(p=>p.id===id&&p.state==='open'),guestId);
 assert.ok(row>=0);await click(host,946,267+66*row);
 await atScreen(guest,'EaglerLANInviteScreen',30000);
 const before=await host.evaluate(()=>({screen:__eaghacksScreenState.screenName,tick:__eaghacksNativeState.tick,sequence:__eaghacksNativeState.bridge.sequence}));
 await click(guest,484,525);await guest.waitForTimeout(12000);
 const after=await host.evaluate(()=>({screen:__eaghacksScreenState.screenName,tick:__eaghacksNativeState?.tick,sequence:__eaghacksNativeState?.bridge?.sequence}));
 lobby.push({before,after,guestRemote:await guest.evaluate(()=>__eaghacksNativeState?.session.kind==='remote')});
 // Exercise the previously observed Back button and Escape path, with a bounded wait.
 await click(host,874,718);await atScreen(host,'EaglerDirectConnectHostScreen',10000);
 check('host Back navigation after bounded acceptance probe',true);
 await host.keyboard.press('Escape',{delay:150});await atScreen(host,'MultiplayerOptionsScreen',10000);
 check('host Escape navigation after bounded acceptance probe',true);
 // Return host to gameplay after recording the lobby probe.
 for(let i=0;i<6&&await host.evaluate(()=>__eaghacksScreenState.screenName!==null);i++)await host.keyboard.press('Escape',{delay:150});
 await atScreen(host,null,10000);const sequence=(await state(host)).bridge.sequence;await wait(host,s=>__eaghacksNativeState.bridge.sequence>s+1,sequence,10000);check('host returns to responsive gameplay after Back and Escape',true);
 await wait(guest,()=>window.__eaghacksNativeState?.session.kind==='remote'&&window.__eaghacksNativeState.player?.health>0,null,45000);
 await atScreen(guest,null);await atScreen(host,null,120000);
}
async function inspect(){const{start}=await import('node:repl');const repl=start({prompt:'lan-qa> '});Object.assign(repl.context,{host,guest,browser,click,atScreen,state,command,moduleState,openRoom,invite,hostChat,results});await new Promise(r=>repl.once('exit',r));}

await mkdir('artifacts',{recursive:true});
try{
 await boot(host,'NativeQAHost');await click(host,640,371);await atScreen(host,'EaglerCreateWorldSelectionScreen',120000);await click(host,640,300);await atScreen(host,'CreateWorldScreen');await click(host,640,438);
 await click(host,402,752);
 await wait(host,()=>window.__eaglerTerrainReady&&window.__eaghacksNativeState?.player,null,240000);await atScreen(host,null);await click(host,640,400);
 await command(host,'/gamemode creative');await command(host,'/tp @s 0 150 0 0 20');await host.waitForTimeout(12000);await command(host,'/fill -8 149 -8 8 149 8 minecraft:stone');await command(host,'/tp @s 0 150 0 0 20');
 check('private host has real local identity',(await state(host)).session.kind==='local');
 stage='boot-guest';await boot(guest,'NativeQAGuest');await guest.evaluate(()=>{window.__nativeLANEvents=[];for(const event of ['world-load','world-unload'])window.EaglerHacks.client.bus.on(event,()=>window.__nativeLANEvents.push(event));});
 stage='connect';await invite();check('guest connects with proven remote identity',(await state(guest)).session.kind==='remote');
 actualGuestName=(await state(guest)).player.name;assert.match(actualGuestName,/^[A-Za-z0-9_]{1,32}$/);
 await command(host,`/tp ${actualGuestName} 0 150 1`);await wait(host,name=>__eaghacksNativeState.entities.some(e=>e.name===name&&e.isPlayer),actualGuestName);
 check('host receives the actual guest player entity',(await state(host)).entities.some(e=>e.name===actualGuestName&&e.isPlayer));
 await command(host,`/tp ${actualGuestName} 0 150 1`);await command(host,`/give ${actualGuestName} minecraft:bread 2`);
 await wait(guest,()=>window.__eaghacksNativeState.inventory.main.some(i=>i?.id==='minecraft:bread'&&i.count===2));check('server inventory update reaches native guest snapshot',true);
 await guest.evaluate(()=>window.EaglerHacks.adapter.selectSlot(3));await wait(guest,()=>window.__eaghacksNativeState.inventory.selectedSlot===3);check('native selection changes the real remote player slot',true);
 await host.setViewportSize({width:640,height:400});await guest.setViewportSize({width:640,height:400});const before=(await state(guest)).player;
 await guest.keyboard.down('KeyW');try{await wait(guest,b=>Math.hypot(window.__eaghacksNativeState.player.x-b.x,window.__eaghacksNativeState.player.z-b.z)>.3,before,15000);}finally{await guest.keyboard.up('KeyW');}
 const after=(await state(guest)).player;await wait(host,p=>window.__eaghacksNativeState.entities.some(e=>e.name===p.name&&Math.hypot(e.x-p.x,e.z-p.z)<.5),{...after,name:actualGuestName},30000);
 check('remote movement propagates to the actual host entity',true,{before:[before.x,before.z],after:[after.x,after.z]});
 stage='other-player-esp';
 await host.setViewportSize({width:1280,height:800});await command(host,'/tp @s 0 150 0 0 20');await command(host,`/tp ${actualGuestName} 0 150 3`);
 await host.evaluate(()=>{EaglerHacks.client.modules.disableAll();const m=EaglerHacks.client.modules.get('entity-esp');for(const[k,v]of Object.entries({players:true,hostile:false,passive:false,range:16}))m.settings.get(k).set(v);m.enable()});
 await wait(host,()=>EaglerHacks.client.modules.get('entity-esp').candidates(EaglerHacks.adapter).some(c=>c.entity.isPlayer&&!c.entity.isSelf));
 const candidates=()=>host.evaluate(()=>EaglerHacks.client.modules.get('entity-esp').candidates(EaglerHacks.adapter).map(c=>({id:c.entity.id,self:c.entity.isSelf,x:c.entity.x,z:c.entity.z,name:c.entity.name})));
 const pixels=()=>host.evaluate(()=>{const c=document.getElementById('eaghacks-hud-canvas');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)});
 await host.waitForTimeout(300);check('ESP detects genuine guest excludes self and draws overlay',(await candidates()).some(c=>c.name===actualGuestName)&&(await candidates()).every(c=>!c.self)&&await pixels());
 await host.evaluate(()=>EaglerHacks.client.modules.get('entity-esp').settings.get('players').set(false));await host.waitForTimeout(200);check('ESP player setting excludes genuine guest',(await candidates()).length===0&&!await pixels());
 await host.evaluate(()=>{EaglerHacks.client.modules.get('entity-esp').settings.get('players').set(true);const ctx=EaglerHacks.adapter.ctx;window.__p15ESPStroke=ctx.strokeRect;window.__p15ESPRects=[];ctx.strokeRect=function(...rect){__p15ESPRects.push(rect);__p15ESPRects=__p15ESPRects.slice(-8);return __p15ESPStroke.apply(this,rect)}});
 await host.waitForTimeout(300);const beforeRect=await host.evaluate(()=>__p15ESPRects.at(-1));
 try{
  await command(host,`/tp ${actualGuestName} 2 150 3`);await wait(host,()=>EaglerHacks.client.modules.get('entity-esp').candidates(EaglerHacks.adapter).some(c=>c.entity.x>1));await host.waitForTimeout(300);
  const afterRect=await host.evaluate(()=>__p15ESPRects.at(-1));
  check('ESP tracks genuine second player movement',beforeRect?.length===4&&afterRect?.length===4&&Math.abs(beforeRect[0]-afterRect[0])>2,{beforeRect,afterRect});
 }finally{await host.evaluate(()=>{EaglerHacks.adapter.ctx.strokeRect=__p15ESPStroke;delete window.__p15ESPStroke;delete window.__p15ESPRects})}
 await command(host,`/tp ${actualGuestName} 5 150 3`);await wait(host,()=>EaglerHacks.client.modules.get('entity-esp').candidates(EaglerHacks.adapter).some(c=>c.entity.x>4));
 await host.evaluate(()=>EaglerHacks.client.modules.get('entity-esp').settings.get('range').set(4));await host.waitForTimeout(200);check('ESP range excludes genuine distant guest',(await candidates()).length===0&&!await pixels());
 await host.evaluate(()=>EaglerHacks.client.modules.get('entity-esp').disable());await host.waitForTimeout(200);check('ESP genuine player overlay cleans up on disable',!await pixels());
 stage='chat';await command(guest,'Native LAN QA hello');for(let i=0;i<30&&!hostChat.some(m=>m.includes('Native LAN QA hello'));i++)await host.waitForTimeout(500);
 check('guest chat reaches the actual host',hostChat.some(m=>m.includes('Native LAN QA hello')));
 check('remote combat automation remains blocked by default',await guest.evaluate(()=>{const m=window.EaglerHacks.client.modules.get('kill-aura');return !m.enable()&&!m.active&&m.errorCount===0;}));
 stage='disconnect';await moduleState(guest,'coordinates',true);await moduleState(guest,'zoom',true);await wait(guest,()=>window.__eaghacksNativeState.options.fov<30);
 await guest.setViewportSize({width:1280,height:800});await guest.keyboard.press('Escape',{delay:100});await atScreen(guest,'PauseScreen');await click(guest,640,489);
 await wait(guest,()=>!window.__eaghacksNativeState&&!window.EaglerHacks.adapter.getPlayer());check('disconnect clears native data and commands',await guest.evaluate(()=>!window.__eaghacksNativeCommands&&window.EaglerHacks.client.modules.get('zoom')._restoreOnWorld));
 await wait(host,name=>!window.__eaghacksNativeState.entities.some(e=>e.name===name),actualGuestName);check('host removes the disconnected player',true);
 stage='reconnect';await invite();await wait(guest,()=>window.__eaghacksNativeState.options.fov<30&&window.EaglerHacks.client.modules.get('coordinates').active);
 check('reconnect resumes eligible camera and HUD intent',true);check('lifecycle follows connect-disconnect-reconnect',await guest.evaluate(()=>window.__nativeLANEvents.filter(e=>e==='world-load').length===2&&window.__nativeLANEvents.filter(e=>e==='world-unload').length===1));
 stage='shutdown';await guest.evaluate(()=>window.EaglerHacks.shutdown());await wait(guest,()=>window.__eaghacksNativeState.options.fov===70);check('shutdown restores actual native camera state',true);check('no uncaught page errors',errors.length===0,errors);
 await writeFile('input/phase15/lan/native-lan-results.json',JSON.stringify({results,lobby,artifactSHA256,sourceDigest,discoveryHelperSHA256:createHash('sha256').update(await readFile(discovery)).digest('hex'),scope:'Two private loopback peers; unchanged pinned upstream discovery helper supplied by QA; actual WebRTC/Java gameplay'},null,2)+'\n');
 console.log(`${results.length}/${results.length} private native LAN checks passed.`);if(process.env.NATIVE_QA_REVIEW==='1')await inspect();
}catch(error){console.log('FAILED LAN STAGE',stage,error);await writeFile(`${root}/failure.json`,JSON.stringify({stage,error:String(error),artifactSHA256,sourceDigest,lobby,passedChecks:results.map(r=>r.name)},null,2)+'\n');await host.screenshot({path:'input/phase15/lan/native-lan-host-failure.png'}).catch(()=>{});await guest.screenshot({path:'input/phase15/lan/native-lan-guest-failure.png'}).catch(()=>{});if(process.env.NATIVE_QA_DEBUG==='1')await inspect();throw error;}finally{clearTimeout(deadline);await browser.close();}
