/** Record actual game graph output; no microphone or speaker-loopback claim. */
import{writeFile,appendFile}from'node:fs/promises';
import{command,reset,wait,record}from'./phase8-checks.mjs';
export async function capture(page,name,action){
 await page.evaluate(()=>phase7BeginAudio());await action();await page.waitForTimeout(600);const data=await page.evaluate(()=>phase7EndAudio());
 for(let i=0;i<data.results.length;i++){await writeFile(`diagnostics/reliability-phase8/${name}-${i}.webm`,Buffer.from(data.results[i].base64,'base64'));delete data.results[i].base64;}
 await appendFile('reports/reliability-phase8/audio-captures.jsonl',JSON.stringify({name,method:'WebAudio master graph tee to MediaRecorder before hardware destination',...data})+'\n');return data;
}
export async function resumed(p,label){const data=await capture(p,label,async()=>command(p,'/playsound minecraft:entity.pig.ambient master @s ~ ~ ~ 1 1'));await record(`${label} audio`,'nonzero graph output',data,data.metrics.peak>0&&data.metrics.starts>0);}
