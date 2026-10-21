/** Load the origin chunks before constructing the existing GUI combat fixture. */
import {verify as verifyPrevious} from './phase13_1-module-checks.mjs';
export async function verify(ctx){
 const {page,wait,check}=ctx;
 await page.evaluate(()=>{EaglerHacks.client.modules.disableAll();document.activeElement?.blur?.()});
 await page.mouse.click(640,400,{delay:100});
 const command=async text=>{await page.keyboard.press('KeyT',{delay:100});await wait(()=>__eaghacksScreenState.screenName==='ChatScreen');await page.keyboard.type(text,{delay:8});await page.keyboard.press('Enter',{delay:100});await wait(()=>__eaghacksScreenState.screenName===null);await page.waitForTimeout(500)};
 await command('/gamemode creative');await command('/tp @s 0 150 0 0 10');await page.waitForTimeout(12000);await command('/fill -8 149 -8 8 149 8 minecraft:stone');await command('/tp @s 0 150 0 0 10');
 await wait(()=>Math.abs(__eaghacksNativeState.player.y-150)<.1&&__eaghacksNativeState.player.onGround);
 check('GUI combat fixture starts grounded on loaded origin platform',true);
 await page.evaluate(()=>{for(const id of ['kill-aura','bunny-hop','entity-esp'])EaglerHacks.client.modules.get(id).enable()});
 await verifyPrevious(ctx);
}
