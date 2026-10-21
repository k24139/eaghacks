import {readFile,writeFile} from 'node:fs/promises';
export async function verify({page,check,command,wait,moduleState}){
 await page.evaluate(()=>EaglerHacks.client.modules.disableAll());
 for(const text of ['/gamemode survival','/time set 18000','/kill @e[type=!minecraft:player]','/tp @s 0 150 0 0 0','/item replace entity @s hotbar.0 with minecraft:iron_sword','/summon minecraft:zombie 0 150 2 {NoAI:1b}'])await command(text);
 await page.evaluate(()=>EaglerHacks.adapter.selectSlot(0));
 await wait(()=>__eaghacksNativeState.player.onGround&&__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health===20));await page.waitForTimeout(1800);
 await page.evaluate(()=>{const a=EaglerHacks.adapter;window.__fallingAttack=a.attack;window.__fallingAttempts=[];a.attack=function(e){const p=this.getPlayer();__fallingAttempts.push({type:e?.type,ground:p.onGround,fall:p.fallDistance,vy:p.velocity.y,at:performance.now()});return __fallingAttack.call(this,e)};const m=EaglerHacks.client.modules.get('kill-aura');for(const[k,v]of Object.entries({players:false,passive:false,hostile:true,cps:.5,'critical-wait':500,'attack-mode':'prefer-falling',range:3.2}))m.settings.get(k).set(v);m.enable();EaglerHacks.client.modules.get('auto-crit').enable()});
 try{
  await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health<20));
  const evidence=await page.evaluate(()=>({attempts:__fallingAttempts,health:__eaghacksNativeState.entities.find(e=>e.type==='minecraft:zombie')?.health}));
  check('KillAura with Criticals waits for observed falling before first real attack',evidence.attempts[0]?.ground===false&&evidence.attempts[0]?.fall>0&&evidence.attempts[0]?.vy<0,evidence);
  check('falling-aware KillAura delivers critical-sized sword damage in controlled fixture',20-evidence.health>8,evidence);
  await writeFile('input/phase14/falling-aura-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 }finally{await moduleState('kill-aura',false);await moduleState('auto-crit',false);await page.evaluate(()=>{EaglerHacks.adapter.attack=__fallingAttack;delete window.__fallingAttack;delete window.__fallingAttempts})}
 const observed=JSON.parse(await readFile('reports/release-phase13/verification.json','utf8')).modules.rows.filter(m=>m.status==='gameplay-observed').map(m=>m.id);
 const rapid=await page.evaluate(ids=>{const c=EaglerHacks.client;c.modules.disableAll();const counts=()=>({bus:c.bus.totalListeners(),settings:c.modules.all().reduce((n,m)=>n+m.settings.all().reduce((a,s)=>a+s._listeners.length,0),0)});const before=counts();for(const id of ids){const m=c.modules.get(id);for(let i=0;i<3;i++){m.enable();m.disable();c.clickgui.close()}}return {before,after:counts(),errors:c.modules.errors().length,held:EaglerHacks.adapter.diagnostics().syntheticHeldKeys,focusedInGUI:c.clickgui.root.contains(document.activeElement)}},observed);
 check('all 41 observed modules survive three toggle cycles without listener or input leaks',rapid.before.bus===rapid.after.bus&&rapid.before.settings===rapid.after.settings&&rapid.errors===0&&rapid.held.length===0,rapid);
 check('closing actual ClickGUI releases hidden search focus for gameplay keys',!rapid.focusedInGUI,rapid);
 await wait(()=>__eaghacksScreenState.screenName===null&&!__eaghacksNativeState.session.paused&&!EaglerHacks.adapter._guiOwnsPause,null,10000);
 await page.mouse.click(640,400,{delay:100});await wait(()=>!!document.pointerLockElement);
 await command('/kill @e[type=minecraft:zombie]');await command('/tp @s 0 150 0 0 20');await moduleState('session-stats',true);
}
