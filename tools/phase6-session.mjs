/** Dedicated local Chrome session for the Phase 6 procedure. Commands are trusted local JS on stdin. */
import {chromium} from 'playwright';
import {createInterface} from 'node:readline';
import {appendFile,readFile,mkdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {withDeadline} from './performance-host-guard.mjs';
const headed=process.argv.includes('--headed');
const [profileArg,url,presetPath]=process.argv.slice(2).filter(arg=>arg!=='--headed');
if(!profileArg||!url)throw Error('Usage: node tools/phase5-session.mjs input/phase6/<dedicated-profile> <client-url> [preset-json]');
const profile=resolve(profileArg),rel=relative(resolve('input/phase6'),profile);
if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Profile must be a dedicated child of input/phase6');
if(new URL(url).origin!=='http://127.0.0.1:3006')throw Error('Required origin is http://127.0.0.1:3006');
await mkdir('input/phase6',{recursive:true});
const context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:!headed,viewport:{width:1280,height:800},args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--enable-precise-memory-info']});
const page=context.pages()[0];page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
page.on('pageerror',e=>{void appendFile('input/phase6/page-errors.log',String(e)+'\n')});
page.on('console',m=>{void appendFile('input/phase6/console.log',m.type()+' '+m.text()+'\n')});
try{
 if(presetPath){const preset=JSON.parse(await readFile(presetPath,'utf8'));await context.addInitScript(p=>{for(const[k,v]of Object.entries(p))localStorage.setItem(k,v)},preset)}
 await page.goto(url);await page.bringToFront();console.log('READY');
 for await(const line of createInterface({input:process.stdin,terminal:false})){
  await appendFile('input/phase6/session-commands.log',line+'\n');
  try{const run=Object.getPrototypeOf(async function(){}).constructor('page','context',line);console.log('RESULT',JSON.stringify(await withDeadline(run(page,context),120000,'Session command')))}
  catch(e){console.error(String(e));await page.screenshot({path:'input/phase6/error.png',timeout:7000}).catch(()=>{});for(const key of ['KeyW','KeyA','KeyS','KeyD','Space','KeyV'])await page.keyboard.up(key).catch(()=>{});await page.evaluate(()=>{for(const m of window.EaglerHacks?.client?.modules?.all()??[])m.disable()}).catch(()=>{});}
 }
}finally{await withDeadline(context.close(),10000,'Browser close')}
