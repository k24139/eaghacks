/** Record actual game graph output; no microphone or speaker-loopback claim. */
import{writeFile,appendFile}from'node:fs/promises';
import{command,reset,wait,record}from'./phase7-checks.mjs';
export async function capture(page,name,action){
 await page.evaluate(()=>phase7BeginAudio());await action();await page.waitForTimeout(600);const data=await page.evaluate(()=>phase7EndAudio());
 for(let i=0;i<data.results.length;i++){await writeFile(`diagnostics/desktop-phase7/${name}-${i}.webm`,Buffer.from(data.results[i].base64,'base64'));delete data.results[i].base64;}
 await appendFile('reports/desktop-phase7/audio-captures.jsonl',JSON.stringify({name,method:'WebAudio master graph tee to MediaRecorder before hardware destination',...data})+'\n');return data;
}
export async function sounds(page){
 await reset(page);await command(page,'/gamemode creative');await command(page,'/item replace entity @s hotbar.0 with minecraft:stone');await page.evaluate(()=>EaglerHacks.adapter.selectSlot(0));await wait(page,()=>__eaghacksNativeState.inventory.selectedSlot===0);await command(page,'/tp @s 0 150 0 0 80');await page.mouse.click(640,400,{delay:100});
 let data=await capture(page,'block-place',async()=>{await page.mouse.click(640,400,{button:'right',delay:100})});await record('block placement audio','nonzero game graph samples and source start',data,data.metrics.peak>0&&data.metrics.starts>0);
 data=await capture(page,'block-break',async()=>{await page.mouse.click(640,400,{button:'left',delay:100})});await record('block breaking audio','nonzero game graph samples and source start',data,data.metrics.peak>0&&data.metrics.starts>0);
 await command(page,'/summon minecraft:pig ~ ~ ~2 {NoAI:1b}');data=await capture(page,'entity-sound',async()=>command(page,'/playsound minecraft:entity.pig.ambient master @s ~ ~ ~ 1 1'));await record('entity event audio','nonzero captured pig event',data,data.metrics.peak>0&&data.metrics.starts>0);
 data=await capture(page,'inventory',async()=>{await page.keyboard.press('KeyE',{delay:100});await page.waitForTimeout(200);await page.keyboard.press('Escape',{delay:100})});await record('inventory open close audio observation','record event behavior without requiring a nonexistent open sound',data,true);
 await page.screenshot({path:'diagnostics/desktop-phase7/audio-gameplay.png'});
}
export async function blocksRetry(page){
 await command(page,'/tp @s 0 150 0 0 20');await command(page,'/setblock 0 150 2 minecraft:stone');await command(page,'/setblock 0 150 1 minecraft:air');await page.mouse.click(640,400,{delay:100});await page.waitForTimeout(200);
 let data=await capture(page,'block-place-targeted',async()=>{await page.mouse.down({button:'right'});try{await page.waitForTimeout(250)}finally{await page.mouse.up({button:'right'})}});await command(page,'/execute if block 0 151 2 minecraft:stone run say PHASE7_PLACEMENT_CONFIRMED');await record('targeted right-click placement audio','nonzero game audio; verify block via command log',data,data.metrics.peak>0&&data.metrics.starts>0);
 data=await capture(page,'block-break-targeted',async()=>{await page.mouse.down({button:'left'});try{await page.waitForTimeout(250)}finally{await page.mouse.up({button:'left'})}});await command(page,'/execute if block 0 151 2 minecraft:air run say PHASE7_BREAK_CONFIRMED');await record('targeted left-click breaking audio','nonzero game audio; verify air via command log',data,data.metrics.peak>0&&data.metrics.starts>0);
}
export async function stableBlocks(page){
 await command(page,'/fill -8 149 -8 8 149 8 minecraft:stone');await command(page,'/tp @s 0 150 0 0 20');await wait(page,()=>__eaghacksNativeState.player.onGround&&__eaghacksNativeState.player.y===150);await blocksRetry(page);await page.screenshot({path:'diagnostics/desktop-phase7/blocks-confirmed.png'});
}
export async function masterAtSoundScreen(p,x){await p.mouse.click(x,140,{delay:100});await p.screenshot({path:`diagnostics/desktop-phase7/volume-${x}.png`});await p.mouse.click(640,752,{delay:200});await p.mouse.click(640,752,{delay:200});await p.keyboard.press('Escape',{delay:100});await wait(p,()=>__eaghacksScreenState.screenName===null);}
export async function volumeMuted(p){await masterAtSoundScreen(p,180);const data=await capture(p,'volume-muted',async()=>command(p,'/playsound minecraft:entity.pig.ambient master @s ~ ~ ~ 1 1'));await record('master volume zero silences graph','peak=0; no source starts at zero configured volume',data,data.metrics.peak===0&&data.metrics.starts===0);await p.keyboard.press('Escape',{delay:100});await p.mouse.click(480,417,{delay:300});await p.mouse.click(870,300,{delay:300});}
export async function volumeRestored(p){await masterAtSoundScreen(p,1090);const data=await capture(p,'volume-restored',async()=>command(p,'/playsound minecraft:entity.pig.ambient master @s ~ ~ ~ 1 1'));await record('master volume restored','nonzero output and gain=1',data,data.metrics.peak>0&&data.results.every(r=>r.gain===1));}
export async function resumed(p,label){const data=await capture(p,label,async()=>command(p,'/playsound minecraft:entity.pig.ambient master @s ~ ~ ~ 1 1'));await record(`${label} audio`,'nonzero graph output',data,data.metrics.peak>0&&data.metrics.starts>0);}
