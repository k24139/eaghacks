import{readFile,writeFile,readdir}from'node:fs/promises';import{createHash}from'node:crypto';import{command,wait,record,player}from'./phase8-checks.mjs';
export async function attack(p){
 await command(p,'/fill -1 150 1 1 153 4 minecraft:air');
 await command(p,'/kill @e[type=minecraft:pig]');await command(p,'/summon minecraft:pig 0 150 2 {NoAI:1b}');
 await command(p,'/tp @s 0 150 0 0 20');await p.mouse.click(640,400,{delay:100});
 await wait(p,()=>!!document.pointerLockElement&&EaglerHacks.adapter.getCrosshairTargetEntity()?.type==='minecraft:pig');
 await p.waitForTimeout(1200);const before=await p.evaluate(()=>EaglerHacks.adapter.getCrosshairTargetEntity());
 await p.mouse.down({button:'left'});try{await p.waitForTimeout(250)}finally{await p.mouse.up({button:'left'})}
 await wait(p,b=>window.__eaghacksNativeState.entities.find(e=>e.id===b.id)?.health<b.health,before,5000);
 const after=await p.evaluate(id=>window.__eaghacksNativeState.entities.find(e=>e.id===id),before.id);
 await record('gated left-click attack in clear line of sight','health reduced with capture and current target',{before,after},after.health<before.health);
}
export async function recordings(p){const results=[];for(const name of (await readdir('diagnostics/reliability-phase8')).filter(n=>n.endsWith('.webm'))){const bytes=await readFile(`diagnostics/reliability-phase8/${name}`);const row={name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};if(bytes.length<=200)row.validation='MediaRecorder header only: no audio frames during silent interval';else row.decoded=await p.evaluate(async base64=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const context=new OfflineAudioContext(2,1,48000);const buffer=await context.decodeAudioData(bytes.buffer);let peak=0,squares=0,count=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const v of buffer.getChannelData(ch)){peak=Math.max(peak,Math.abs(v));squares+=v*v;count++}return {channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,duration:buffer.duration,peak,rms:Math.sqrt(squares/count)}},bytes.toString('base64')).catch(e=>({error:String(e)}));results.push(row)}await writeFile('reports/reliability-phase8/audio-recording-integrity.json',JSON.stringify(results,null,2)+'\n');return results.map(r=>({name:r.name,decoded:r.decoded,validation:r.validation}));}
