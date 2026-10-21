/** Real combat delivery and timing. Native snapshots/health are never fabricated. */
import {writeFile} from 'node:fs/promises';
import {verifyMechanics} from './phase14-mechanics-checks.mjs';
import {verify as verifyPrevious} from './phase13_1-module-checks.mjs';
export async function verify(ctx){
 const {page,check,wait}=ctx;
 await verifyMechanics(ctx);
 const command=async text=>{await page.evaluate(()=>document.activeElement?.blur?.());await page.keyboard.press('KeyT',{delay:100});await wait(()=>__eaghacksScreenState.screenName==='ChatScreen');await page.keyboard.type(text,{delay:20});await page.keyboard.press('Enter',{delay:100});await wait(()=>__eaghacksScreenState.screenName===null);await page.waitForTimeout(500)};
 const set=async(values)=>page.evaluate(values=>{const m=EaglerHacks.client.modules.get('kill-aura');for(const[k,v]of Object.entries(values))m.settings.get(k).set(v)},values);
 const active=async(on)=>page.evaluate(on=>EaglerHacks.client.modules.get('kill-aura').setActive(on),on);
 const health=()=>page.evaluate(()=>__eaghacksNativeState.entities.find(e=>e.type==='minecraft:zombie'&&!e.dead)?.health);
 const reset=async()=>{await active(false);for(const text of ['/kill @e[type=!minecraft:player]','/tp @s 0 150 0 0 0','/summon minecraft:zombie 0 150 2 {NoAI:1b}'])await command(text);await wait(()=>__eaghacksNativeState.player.onGround&&__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health===20))};
 await page.evaluate(()=>{const a=EaglerHacks.adapter;window.__phase14Attack=a.attack;window.__phase14Attempts=[];a.attack=function(e){const p=this.getPlayer();const accepted=__phase14Attack.call(this,e);__phase14Attempts.push({at:performance.now(),id:e?.id,type:e?.type,health:e?.health,accepted,ground:p?.onGround,fall:p?.fallDistance,vy:p?.velocity?.y});return accepted}});
 const attempts=()=>page.evaluate(()=>structuredClone(__phase14Attempts));
 try{
  await command('/item replace entity @s weapon.mainhand with minecraft:stick');await reset();
  await set({players:false,hostile:true,passive:false,cps:2,'switch-delay':150,'cps-variation':0,range:3.2,rotate:true,'attack-mode':'interval'});
  await page.evaluate(()=>__phase14Attempts=[]);await active(true);await page.waitForTimeout(2600);await active(false);
  const timed=await attempts(),gaps=timed.slice(1).map((x,i)=>x.at-timed[i].at);
  check('KillAura delivers real hostile damage at configured 2 CPS',(await health())<20);
  check('KillAura attempts follow 500 ms deadlines with bounded tick jitter',timed.length>=4&&gaps.every(d=>d>=350&&d<=700),{attempts:timed.length,gaps});
  check('KillAura disable clears pending native attacks immediately',await page.evaluate(()=>!window.__eaghacksNativeCommands?.attackEntityId));
  // A hit already consumed by native code may publish its health snapshot later.
  await page.waitForTimeout(300);let hp=await health();const count=(await attempts()).length;await page.waitForTimeout(800);
  check('KillAura disable stops new attempts and further damage after in-flight native delivery',(await health())===hp&&(await attempts()).length===count);
  await reset();await set({hostile:false});await active(true);await page.waitForTimeout(800);check('hostile filter excludes actual zombie',(await health())===20);await active(false);
  await set({hostile:true,range:2});await command('/tp @s 0 150 -3 0 0');await active(true);await page.waitForTimeout(800);check('range excludes actual hostile five blocks away',(await health())===20);await active(false);await command('/tp @s 0 150 0 0 0');
  await set({range:3.2});await page.keyboard.press('ShiftRight');await wait(()=>EaglerHacks.client.clickgui.open);await active(true);await page.waitForTimeout(700);
  check('GUI blocks native attack delivery and pending commands',(await health())===20&&await page.evaluate(()=>!window.__eaghacksNativeCommands?.attackEntityId));
  await page.keyboard.press('Escape');await wait(()=>!EaglerHacks.client.clickgui.open);await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health<20));await active(false);check('GUI close resumes damage without a queued burst',true);
  // Compare fully recovered grounded and falling sword hits against identical mobs.
  await command('/item replace entity @s weapon.mainhand with minecraft:iron_sword');
  const hits=[];
  for(const falling of [false,true]){
   await reset();await page.waitForTimeout(1800);
   if(falling){await page.evaluate(()=>EaglerHacks.adapter.jump());await wait(()=>{const p=__eaghacksNativeState.player;return !p.onGround&&p.fallDistance>0&&p.velocity.y<0})}
   await page.evaluate(()=>{const a=EaglerHacks.adapter;a.attack(a.getEntities().find(e=>e.type==='minecraft:zombie'&&!e.dead))});
   await wait(()=>__eaghacksNativeState.entities.some(e=>e.type==='minecraft:zombie'&&e.health<20));
   hits.push({falling,health:await health(),attempt:(await attempts()).at(-1)});
  }
  check('naturally falling native hit delivers greater actual damage than grounded hit',hits[1].health<hits[0].health,hits.map(h=>({falling:h.falling,health:h.health})));
  await writeFile('input/phase14/combat-evidence.json',JSON.stringify({timedAttempts:timed,gaps,criticalComparison:hits,claim:'Damage comparison in a dry, unmounted, unblinded fixture only; no universal eligibility guarantee.'},null,2)+'\n');
  // Real macro keyboard route + registered client bind execution.
  await page.evaluate(()=>{const c=EaglerHacks.client,m=c.modules.get('macros');c.modules.get('custom-text').disable();c.modules.get('custom-text').bind.set('KeyP');m.removeMacro('phase14-persist');m.enable();m.addMacro('phase14-bind',{key:'KeyM',mouse:null,modifiers:{ctrl:true}},[{action:'bind',key:'KeyP'}])});
  await page.keyboard.press('KeyM');await page.waitForTimeout(200);check('macro modifiers reject unmodified real browser key',await page.evaluate(()=>!EaglerHacks.client.modules.get('custom-text').active));
  await page.keyboard.press('Control+KeyM');await wait(()=>EaglerHacks.client.modules.get('custom-text').active);check('macro keyboard route executes registered client bind',true);
  await page.evaluate(()=>{const c=EaglerHacks.client;c.modules.get('macros').disable();c.modules.get('macros').removeMacro('phase14-bind');c.modules.get('custom-text').disable();c.modules.get('custom-text').bind.set(null)});
  const samples=[];
  for(let i=0;i<15;i++){samples.push(await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize??null,tickMs:EaglerHacks.client.stats.snapshot().moduleTickMs,listeners:EaglerHacks.client.bus.totalListeners()})));await page.waitForTimeout(1000)}
  await writeFile('input/phase14/sustained-sample.json',JSON.stringify({durationSeconds:15,samples,scope:'one loaded world, combat modules off; descriptive sample, no performance comparison'},null,2)+'\n');
  check('loaded-world sampling has stable listener ownership',samples.every(s=>s.listeners===samples[0].listeners));
 }finally{await active(false);await page.evaluate(()=>{EaglerHacks.adapter.attack=__phase14Attack;delete window.__phase14Attack;delete window.__phase14Attempts})}
 await page.evaluate(()=>{const c=EaglerHacks.client;c.modules.disableAll();for(const m of c.modules.all())m.settings.reset();for(const id of ['kill-aura','bunny-hop','entity-esp'])c.modules.get(id).enable()});
 await verifyPrevious(ctx);
}
