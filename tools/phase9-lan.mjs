/** Bounded private LAN gameplay, separate dedicated headed Chrome profiles. No public servers. */
import{chromium}from'playwright';import{appendFile,writeFile,readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';
import{wait,record}from'./phase9-checks.mjs';
let guestContext,guest,host,hostContext,guard;const messages=[];let stopped=false;
const screen=(p,name,timeout=20000)=>wait(p,n=>window.__eaghacksScreenState?.screenName===n,name,timeout);
async function click(p,x,y){await p.bringToFront();await p.mouse.click(x,y,{delay:400});await p.waitForTimeout(300);}
export async function bootGuest(){
 if(!host)throw Error('Prepare host first');const preflight=JSON.parse(await readFile('reports/desktop-phase7/webrtc.json'));if(!preflight.passed)throw Error('Transport gate failed');
 guestContext=await chromium.launchPersistentContext('input/phase9/guest-profile',{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking']});guest=guestContext.pages()[0];guest.setDefaultTimeout(15000);const focus=await guestContext.newCDPSession(guest);await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await focus.detach();guest.setDefaultNavigationTimeout(90000);await guestContext.addInitScript({path:'input/phase7/lan-discovery.js'});
 await guestContext.addInitScript(()=>{window.phase9RTC=[];const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(...args){super(...args);phase9RTC.push(this)}}});
 for(const p of[host,guest]){p.on('console',m=>{messages.push({who:p===host?'host':'guest',text:m.text(),type:m.type()})});p.on('pageerror',e=>messages.push({who:p===host?'host':'guest',pageerror:String(e)}));}
 guard=setInterval(()=>{void memory().catch(()=>{})},10000);await memory();
 await guest.goto('http://127.0.0.1:3006/input/phase8/native-fixed.html',{timeout:90000});await wait(guest,()=>window.__eaghacksScreenState?.screenName==='EaglerProfileScreen26'&&!window.__eaghacksScreenState.overlayActive,null,60000);await click(guest,790,235);await guest.keyboard.press('Meta+A');await guest.keyboard.type('Phase8Guest',{delay:20});await click(guest,640,667);if(await guest.evaluate(()=>window.__eaghacksScreenState.screenName==='EaglerDefaultUsernameNoteScreen'))await click(guest,640,678);await screen(guest,'TitleScreen');await memory();return guest.evaluate(()=>({screen:window.__eaghacksScreenState,lan:__eaglerLAN.snapshotJson()}));
}
async function memory(){const ids=[];for(const c of [hostContext,guestContext].filter(Boolean)){const session=await c.browser().newBrowserCDPSession();ids.push(...(await session.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id));await session.detach();}const rss=execFileSync('ps',['-o','pid=,rss=,comm=','-p',[...new Set(ids)].join(',')],{timeout:5000}).toString();const pressure=execFileSync('memory_pressure',['-Q'],{timeout:5000}).toString();await appendFile('reports/reliability-phase9/memory.jsonl',JSON.stringify({at:new Date().toISOString(),pressure,rss,scope:'two-client session host-wide observation'})+'\n');const match=pressure.match(/free percentage: (\d+)/);if(match&&+match[1]<15&&!stopped){stopped=true;await guestContext?.close();throw Error('Memory pressure guard: below 15%')}}
export async function resumeHost(){await host.bringToFront();for(let i=0;i<6&&await host.evaluate(()=>window.__eaghacksScreenState?.screenName!==null);i++){await host.keyboard.press('Escape',{delay:100});await host.waitForTimeout(250);}await screen(host,null);}
export async function connectionEvidence(){const result=await guest.evaluate(async()=>({session:window.__eaghacksNativeState.session,player:window.__eaghacksNativeState.player,lan:__eaglerLAN.snapshotJson(),connections:await Promise.all(phase9RTC.map(async pc=>({state:pc.connectionState,ice:pc.iceConnectionState,stats:[...(await pc.getStats()).values()].filter(s=>['data-channel','transport'].includes(s.type))})))}));await record('private guest joins actual host','remote world plus open channels and game bytes',result,result.session.kind==='remote'&&result.connections.some(c=>c.state==='connected'&&c.stats.some(s=>s.type==='data-channel'&&s.label==='lan'&&s.state==='open'&&s.bytesReceived>100)));return result;
}
export async function inspect(){for(const [name,p]of[['host',host],['guest',guest]]){await p.screenshot({path:`diagnostics/reliability-phase9/lan-${name}.png`,timeout:7000});await writeFile(`reports/reliability-phase9/lan-${name}-state.json`,JSON.stringify(await p.evaluate(()=>({screen:window.__eaghacksScreenState,state:window.__eaghacksNativeState,lan:window.__eaglerLAN?.snapshotJson()})),null,2)+'\n')}await writeFile('reports/reliability-phase9/lan-console.json',JSON.stringify(messages,null,2)+'\n')}
export async function close(){clearInterval(guard);await inspect().catch(()=>{});await guestContext?.close();}
export function pages(){return {host,guest}}
export function adopt(existing){host=existing.host;guest=existing.guest;hostContext=host.context();guestContext=guest?.context();for(const p of [host,guest].filter(Boolean))p.on('console',m=>messages.push({who:p===host?'host':'guest',text:m.text(),type:m.type()}));}
/** Keep the guest foreground after acceptance; foreground switching can pause it. */
export async function inviteForeground({keepInLobby=false,label="path-b"}={}){
 await resumeHost();await host.keyboard.press('Escape',{delay:100});await screen(host,'PauseScreen');
 await click(host,800,417);await screen(host,'MultiplayerOptionsScreen');await click(host,640,310);await screen(host,'EaglerDirectConnectHostScreen');await click(host,874,706);await screen(host,'EaglerLANPeersScreen');
 const guestId=await guest.evaluate(()=>JSON.parse(__eaglerLAN.snapshotJson()).self.id);
 const row=await host.evaluate(id=>__eaglerLAN.peers().findIndex(p=>p.id===id&&p.state==='open'),guestId);if(row<0)throw Error('Guest peer not open');
 await click(host,946,267+66*row);await screen(guest,'EaglerLANInviteScreen',20000);
 if(!keepInLobby)await resumeHost();
 const observer=await import('./phase9-observe.mjs');await observer.progress(host,keepInLobby?label+'-before-acceptance':'path-a-before-acceptance');
 await click(guest,484,525);
 if(keepInLobby){await observer.progress(host,label+'-after-acceptance');await host.screenshot({path:`diagnostics/reliability-phase9/${label}-after-acceptance.png`});}
 await wait(guest,()=>window.__eaghacksNativeState?.session.kind==='remote'&&window.__eaghacksNativeState.player?.health>0,null,60000);
 await guest.waitForTimeout(1000);await guest.bringToFront();if(await guest.evaluate(()=>window.__eaghacksScreenState?.screenName==='PauseScreen'))await guest.keyboard.press('Escape',{delay:150});await screen(guest,null);await memory();return connectionEvidence();
}
