/** Read stock canvas controls from screenshots. No native bridge signals are used. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const exec=promisify(execFile);
const regions={done:[340,640,940,710],singleplayer:[340,345,940,398],
 play:[178,646,628,703],createWorld:[340,275,940,330],heading:[280,0,1000,115],worldRow:[240,152,1050,255]};
export const normalizeControl=(text='')=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
export function classifyStockControls(controls){
 if(normalizeControl(controls.singleplayer)==='singleplayer')return 'title';
 if(normalizeControl(controls.done)==='done')return 'profile';
 if(normalizeControl(controls.play)==='playselectedworld')return 'world-list';
 if(/^create[nh]ewworld$/.test(normalizeControl(controls.createWorld)))return 'empty-world-selector';
 return 'unknown';
}
export class MissingSavedWorldError extends Error{
 constructor(detail){super(detail);this.name='MissingSavedWorldError';}
}
export async function readStockControls(page,directory,tag){
 await mkdir(directory,{recursive:true});
 const screenshot=join(directory,tag+'.png');await page.screenshot({path:screenshot,timeout:10000});
 const script="from PIL import Image\nimport sys,json\nim=Image.open(sys.argv[1]).convert('L')\nregions=json.loads(sys.argv[2])\nfor name,box in regions.items():\n c=im.crop(box);c=c.point(lambda p:0 if p>180 else 255).resize((c.width*2,c.height*2));c.save(sys.argv[3]+'/'+name+'.png')";
 await exec('python3',['-c',script,screenshot,JSON.stringify(regions),directory],{timeout:10000});
 const controls={};
 for(const name of Object.keys(regions)){
  const {stdout}=await exec('tesseract',[join(directory,name+'.png'),'stdout','--psm',name==='heading'||name==='worldRow'?'6':'7'],{timeout:10000});
  controls[name]=stdout.trim();
 }
 await writeFile(join(directory,tag+'.json'),JSON.stringify({screenshot,controls,screen:classifyStockControls(controls)},null,2)+'\n');
 return {controls,screen:classifyStockControls(controls)};
}
export async function stockToSavedWorldList(page,{directory,log=console.log}={}){
 await page.bringToFront();await page.setViewportSize({width:1280,height:800});
 const visualWait=async(tag,accepted,timeoutMs)=>{const until=Date.now()+timeoutMs;let view,iteration=0;do{view=await readStockControls(page,directory,tag+'-'+iteration++);log(tag,view.screen,view.controls);if(accepted.includes(view.screen))return view;await page.waitForTimeout(1500);}while(Date.now()<until);throw Error('Stock controls did not become recognizable before the visual deadline: '+tag);};
 let view=await visualWait('stock-initial',['profile','title'],60000);
 if(view.screen==='profile'){
  // The Username field and Done button are actual visible controls in the supplied stock UI.
  await page.mouse.click(790,235,{delay:150});await page.keyboard.press('Control+A');
  await page.keyboard.type('Phase2Bench',{delay:30});await page.mouse.click(640,667,{delay:750});
  await page.waitForTimeout(1000);view=await visualWait('stock-after-profile',['title'],30000);
 }
 if(view.screen!=='title')throw Error('Stock title controls were not recognized. Inspect saved screenshot; no world was created.');
 await page.mouse.click(640,371,{delay:750});await page.waitForTimeout(1000);
 view=await visualWait('stock-world-selection',['world-list','empty-world-selector'],60000);
 if(view.screen!=='world-list')throw new MissingSavedWorldError('Stock runtime did not show a saved-world list. No Create New World control was clicked. Restore the verified superflat world/profile.');
 return view;
}
