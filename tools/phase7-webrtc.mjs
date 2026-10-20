/** Bounded transport-only preflight: separate task profiles, loopback signaling, no game clients. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const contexts=[],result={at:new Date().toISOString(),mode:'headed Google Chrome; browser automation; two isolated task profiles',signaling:'SDP/candidates exchanged by local test driver; no external STUN/TURN',peers:[],passed:false};
await mkdir('reports/desktop-phase7',{recursive:true});
try{
 for(const name of ['rtc-a','rtc-b']){
  const c=await chromium.launchPersistentContext(`input/phase7/${name}`,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false,viewport:{width:640,height:400},args:['--no-first-run','--no-default-browser-check','--disable-background-networking']});contexts.push(c);const p=c.pages()[0];p.setDefaultTimeout(15000);await p.goto('http://127.0.0.1:3006/harness/index.html',{timeout:20000});
  await p.evaluate(()=>{window.rtcEvidence={candidates:[],errors:[],states:[],received:[],gathering:[]};window.pc=new RTCPeerConnection({iceServers:[]});pc.onicecandidate=e=>{if(e.candidate)rtcEvidence.candidates.push(e.candidate.toJSON())};pc.onicecandidateerror=e=>rtcEvidence.errors.push({code:e.errorCode,text:e.errorText});pc.onconnectionstatechange=()=>rtcEvidence.states.push(pc.connectionState);pc.onicegatheringstatechange=()=>rtcEvidence.gathering.push(pc.iceGatheringState);pc.ondatachannel=e=>{window.dc=e.channel;dc.onmessage=e=>rtcEvidence.received.push(e.data)};});
 }
 const [a,b]=contexts.map(c=>c.pages()[0]);
 const offer=await a.evaluate(async()=>{window.dc=pc.createDataChannel('phase7');dc.onmessage=e=>rtcEvidence.received.push(e.data);await pc.setLocalDescription(await pc.createOffer());return pc.localDescription.toJSON()});
 await b.evaluate(async offer=>{await pc.setRemoteDescription(offer);await pc.setLocalDescription(await pc.createAnswer())},offer);
 await a.evaluate(async answer=>pc.setRemoteDescription(answer),await b.evaluate(()=>pc.localDescription.toJSON()));
 for(const p of [a,b])await p.waitForFunction(()=>pc.iceGatheringState==='complete',null,{timeout:15000}).catch(e=>{result.gatherTimeout=String(e)});
 const candidates=await Promise.all([a,b].map(p=>p.evaluate(()=>rtcEvidence.candidates)));
 for(let i=0;i<2;i++)for(const candidate of candidates[1-i])await [a,b][i].evaluate(c=>pc.addIceCandidate(c),candidate);
 await Promise.all([a,b].map(p=>p.waitForFunction(()=>pc.connectionState==='connected'&&window.dc?.readyState==='open',null,{timeout:15000})));
 await a.evaluate(()=>dc.send('phase7-a-to-b'));await b.waitForFunction(()=>rtcEvidence.received.includes('phase7-a-to-b'),null,{timeout:5000});await b.evaluate(()=>dc.send('phase7-b-to-a'));await a.waitForFunction(()=>rtcEvidence.received.includes('phase7-b-to-a'),null,{timeout:5000});result.passed=true;
}catch(e){result.failure=String(e)}finally{
 for(const c of contexts){const p=c.pages()[0];result.peers.push(await p.evaluate(async()=>({userAgent:navigator.userAgent,secure:isSecureContext,evidence:rtcEvidence,connectionState:pc.connectionState,iceConnectionState:pc.iceConnectionState,dataChannel:window.dc?.readyState,stats:[...(await pc.getStats()).values()].filter(s=>['candidate-pair','local-candidate','remote-candidate','data-channel','transport'].includes(s.type))})).catch(e=>({error:String(e)})));await c.close();}
 await writeFile('reports/desktop-phase7/webrtc.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
