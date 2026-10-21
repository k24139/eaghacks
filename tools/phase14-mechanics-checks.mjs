import {writeFile} from 'node:fs/promises';
export async function verifyMechanics({page,check,wait}) {
 const command=async text=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>__eaghacksScreenState.screenName==='ChatScreen');await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await wait(()=>__eaghacksScreenState.screenName===null);await page.waitForTimeout(500);};
 await page.evaluate(()=>EaglerHacks.client.modules.disableAll());
 for(const s of ['/gamemode creative','/tp @s 0 150 0 0 0'])await command(s);
 await page.waitForTimeout(12000);
 for(const s of ['/setblock 0 149 0 minecraft:stone','/fill -8 149 -8 8 149 8 minecraft:stone','/fill -8 150 -8 8 156 8 minecraft:air','/kill @e[type=!minecraft:player]','/gamerule minecraft:spawn_mobs false','/item replace entity @s weapon.mainhand with minecraft:iron_axe','/time set 18000','/gamemode survival'])await command(s);
 const evidence=[];
 for(const delay of [250,650,1600]){
  await command('/kill @e[type=minecraft:zombie]');await command('/tp @s 0 150 0 0 0');await command('/summon minecraft:zombie 0 150 2 {NoAI:1b}');
  await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health===20));await wait(()=>Math.abs(__eaghacksNativeState.player.y-150)<.1);await page.waitForTimeout(1800);
  const result=await page.evaluate(async delay=>{const a=EaglerHacks.adapter;const target=()=>a.getEntities().find(e=>e.type==='minecraft:zombie'&&!e.dead);const start=target().health;const position={x:a.getPlayer().x,y:a.getPlayer().y,z:a.getPlayer().z,target:target()};const at=performance.now();a.attack(target());await new Promise(r=>setTimeout(r,delay));const before=target()?.health;a.attack(target());await new Promise(r=>setTimeout(r,250));return {position,delay,start,before,after:target()?.health,elapsed:performance.now()-at,player:{onGround:a.getPlayer().onGround,fallDistance:a.getPlayer().fallDistance},item:__eaghacksNativeState.inventory.hotbar[__eaghacksNativeState.inventory.selectedSlot]};},delay);
  evidence.push(result);console.log('COMBAT MODEL',JSON.stringify({delay:result.delay,start:result.start,before:result.before,after:result.after}));
 }
 await writeFile('input/phase14/mechanics-probe.json',JSON.stringify(evidence,null,2));check('combat damage probe recorded from native entities',evidence.every(x=>x.after<x.start));
 check('native modern weapon recovery reduces early second-hit damage',evidence[1].before-evidence[1].after>0 && evidence[2].before-evidence[2].after>(evidence[1].before-evidence[1].after)*1.5);
}
