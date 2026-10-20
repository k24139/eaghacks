/** Focused real-world release checks; native state is never substituted. */
export async function extra({page,check,command,wait,moduleState}) {
 if(process.env.QA_MODULE_FROM){const audit=await import('./phase13-module-checks.mjs'),names=['hud','render','utilities','movement','combat','inventory','finalRepairs'];const index=names.indexOf(process.env.QA_MODULE_FROM);if(index<0)throw Error('Unknown module checkpoint');for(const name of names.slice(index))await audit[name](page);return;}
 await command('/gamemode creative');
 await command('/item replace entity @s hotbar.0 with minecraft:stone');
 await page.evaluate(()=>EaglerHacks.adapter.selectSlot(0));
 await command('/tp @s 0 150 0 0 20');
 await command('/setblock 0 150 2 minecraft:stone');
 await command('/setblock 0 150 1 minecraft:air');
 await command('/setblock 0 151 2 minecraft:air');
 await page.evaluate(()=>phase7BeginAudio());
 await page.mouse.click(640,400,{button:'right',delay:250});await page.waitForTimeout(700);
 const audio=await page.evaluate(async()=>{const d=await phase7EndAudio();return {metrics:d.metrics,contexts:d.results.map(({base64,...r})=>r)}});
 check('WebAudio graph produces nonzero samples in gameplay',audio.metrics.peak>0,audio);
 await command('/execute if block 0 151 2 minecraft:stone run tp @s 3 150 0 0 20');
 await wait(()=>__eaghacksNativeState.player.x>3);
 check('simulated right mouse places a real block confirmed by server condition',true);
 await command('/tp @s 0 150 0 0 20');await page.evaluate(()=>EaglerHacks.adapter.setRotation(0,5));await wait(()=>Math.abs(__eaghacksNativeState.player.pitch-5)<1);await page.mouse.down({button:'left'});try{await page.waitForTimeout(1000)}finally{await page.mouse.up({button:'left'})}await page.waitForTimeout(300);
 await command('/execute if block 0 151 2 minecraft:air run tp @s 4 150 0 0 20');
 await wait(()=>__eaghacksNativeState.player.x>4);
 check('simulated left mouse breaks the placed block confirmed by server condition',true);await command('/fill -8 150 -8 8 156 8 minecraft:air');
 await command('/tp @s 0 150 0 0 20');await command('/gamemode survival');
 for(const id of ['active-modules-hud','cps-counter','custom-text','direction','fps-display','keystrokes','performance-monitor','session-timer','speed-hud']){
  await page.evaluate(id=>{const m=EaglerHacks.client.modules.get(id);m.settings.get('hud-x')?.set(12);m.settings.get('hud-y')?.set(30);m.enable()},id);await page.waitForTimeout(250);
  check(id+' renders in world at configured position',await page.evaluate(id=>{const n=document.querySelector(`.mt-hud-el[data-module="${id}"]`);return !!n?.textContent&&n.getBoundingClientRect().width>0&&n.style.left==='12px'&&n.style.top==='30px'},id));
  await moduleState(id,false);
 }
 await page.keyboard.press('ShiftRight');const search=page.getByRole('textbox',{name:'Search modules',exact:true});
 await search.fill('Zoom');check('module search filters actual-client results',await page.locator('.mt-search-win .mt-row').count()===1);
 const stable=await page.evaluate(()=>{
  const c=EaglerHacks.client,s=c.modules.get('zoom').settings.get('factor'),before=s._listeners.length;
  const row=[...document.querySelectorAll('.mt-window[data-category="Render"] .mt-row')].find(n=>n.textContent.includes('Zoom'));
  row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
  const afterOpen=s._listeners.length;c.clickgui.refreshAll();
  return {before,afterOpen,afterRefresh:s._listeners.length};
 });
 check('category refresh releases removed settings listeners in actual client',stable.afterOpen===stable.before+1&&stable.afterRefresh===stable.before,stable);
 await page.keyboard.press('Escape');
 const audit=await import('./phase13-module-checks.mjs');
 for(const name of ['hud','render','utilities','movement','combat','inventory','finalRepairs'])await audit[name](page);
}
