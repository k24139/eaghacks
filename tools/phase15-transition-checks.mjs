/** Missing per-module transition dimension, using genuine saved-world unload and reentry. */
import {readFile} from 'node:fs/promises';
export async function verify({page,check,wait}){
 const rows=JSON.parse(await readFile('reports/release-phase14/verification.json','utf8')).modules.rows;
 const ids=rows.filter(m=>m.status==='gameplay-observed'&&!['module-search','keybind-manager','screenshot-util'].includes(m.id)).map(m=>m.id);
 await page.evaluate(()=>{EaglerHacks.client.modules.disableAll()});
 if(!await page.evaluate(()=>EaglerHacks.client.clickgui.open))await page.keyboard.press('ShiftRight');await wait(()=>EaglerHacks.client.clickgui.open);
 await page.evaluate(ids=>{for(const id of ids)EaglerHacks.client.modules.get(id).enable()},ids);
 for(const id of ids)check(`${id}: armed for actual world transition`,await page.evaluate(id=>EaglerHacks.client.modules.get(id).active,id));
 await page.keyboard.press('Escape');await wait(()=>!EaglerHacks.client.clickgui.open&&__eaghacksScreenState.screenName===null);await page.keyboard.press('Escape');await wait(()=>__eaghacksScreenState.screenName==='PauseScreen');await page.waitForTimeout(300);check('fresh user pause after GUI close survives pending restoration',await page.evaluate(()=>__eaghacksScreenState.screenName==='PauseScreen'&&__eaghacksNativeState.session.paused));await page.screenshot({path:'input/phase15/transitions/before-save.png'});await page.mouse.click(640,489,{delay:250});await page.waitForTimeout(1500);console.log('SAVE STATE',JSON.stringify(await page.evaluate(()=>({screen:__eaghacksScreenState,gui:EaglerHacks.client.clickgui.open,active:document.activeElement?.outerHTML?.slice(0,150),player:window.__eaghacksNativeState?.player?{y:window.__eaghacksNativeState.player.y}:null}))));await page.screenshot({path:'input/phase15/transitions/after-save.png'});await wait(()=>!window.__eaghacksNativeState&&!EaglerHacks.adapter.inWorld(),null,60000);await page.waitForTimeout(200);
 for(const id of ids){const s=await page.evaluate(id=>{const m=EaglerHacks.client.modules.get(id);return {eligible:m.canEnable(),active:m.active,pending:m._restoreOnWorld}},id);check(`${id}: actual world exit preserves eligible intent`,s.eligible?s.active:!s.active&&s.pending,s)}
 check('cohort world exit clears all owned movement and native commands',await page.evaluate(()=>!window.__eaghacksNativeCommands&&EaglerHacks.adapter.diagnostics().syntheticHeldKeys.length===0));
 await page.mouse.click(640,371,{delay:250});await wait(()=>__eaghacksScreenState.screenName==='SelectWorldScreen');await page.mouse.dblclick(640,210);await wait(()=>window.__eaghacksNativeState?.player&&__eaghacksScreenState.screenName===null,null,180000);
 await wait(ids=>ids.every(id=>EaglerHacks.client.modules.get(id).active),ids,30000);
 for(const id of ids)check(`${id}: actual saved-world reentry retains or restores activity`,await page.evaluate(id=>EaglerHacks.client.modules.get(id).active,id));
 await page.evaluate(()=>EaglerHacks.client.modules.disableAll());await page.waitForTimeout(300);
 check('cohort final disable leaves no module errors input or attack commands',await page.evaluate(()=>EaglerHacks.client.modules.errors().length===0&&EaglerHacks.adapter.diagnostics().syntheticHeldKeys.length===0&&!window.__eaghacksNativeCommands?.attackEntityId));
}
