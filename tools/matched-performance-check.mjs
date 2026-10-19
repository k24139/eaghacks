/** Recovery-safe comparison of an existing world. Never creates terrain or rebuilds a client. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
import {stockToSavedWorldList} from './performance-stock-ui.mjs';
import {compareSavedWorld} from './compare-saved-world.mjs';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
import {assertMemoryBudget,memorySnapshot,startMemoryGuard,withDeadline,killOwnedBrowser,MEMORY_LIMIT_BYTES} from './performance-host-guard.mjs';
const exec=promisify(execFile),[nativeURL,stockURL,profileArg]=process.argv.slice(2);
assert.ok(nativeURL&&stockURL,'Usage: node tools/matched-performance-check.mjs <native-url> <stock-url> [persistent-profile]');
assert.equal(new URL(nativeURL).origin,new URL(stockURL).origin,'Both clients must use the same origin');
const profile=resolve(profileArg??'input/performance/profile'),directory=resolve(process.env.EAGHACKS_PERF_DIAGNOSTICS??'diagnostics/performance-phase2'),reportDir=resolve('reports/performance-phase2');
await mkdir(directory,{recursive:true});await mkdir(reportDir,{recursive:true});
const logPath=join(directory,'run.log');
const log=(...values)=>{const line=new Date().toISOString()+' '+values.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' ');console.log(line);void appendFile(logPath,line+'\n');};
const nativePath=resolve(process.env.NATIVE_ARTIFACT??'input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html');
const receipt=resolve(process.env.NATIVE_RECEIPT??'input/deliverable/native-build-receipt.json');
const stockPath=resolve(process.env.STOCK_ARTIFACT??'input/performance/stock.html');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const [nativeBytes,stockBytes,pinText]=await Promise.all([readFile(nativePath),readFile(stockPath),readFile('native-bridge/inputs.json','utf8')]);
assert.equal(sha(nativeBytes),'eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c');
assert.equal(await gameplaySourceDigest(),'49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f');
assert.match(stockBytes.subarray(-1024).toString(),/<\/html>\s*$/i,'Stock HTML is incomplete');
const pins=JSON.parse(pinText),stockPayloads={};
for(const [,attrs,id,text]of stockBytes.toString().matchAll(/<script\b([^>]*\bid="(eag-inline-[^"]+)"[^>]*)>([\s\S]*?)<\/script>/g)){
 const bytes=Buffer.from(text,'base64');assert.equal(bytes.length,pins.payloads[id].bytes);assert.equal(sha(bytes),pins.payloads[id].sha256);stockPayloads[id]={bytes:bytes.length,sha256:sha(bytes)};
}
assert.equal(Object.keys(stockPayloads).length,6);
await exec(process.execPath,['tools/verify-recovery-artifact.mjs',nativePath,receipt],{timeout:15000});
const result={status:'preflight',startingCommit:'791b8d1bd86df0b2bedaff70413a5dbc3097998c',sourceDigest:await gameplaySourceDigest(),
 artifacts:{native:{path:nativePath,bytes:nativeBytes.length,sha256:sha(nativeBytes),mode:'fast-analysis/SIMPLE development build'},
 stock:{path:stockPath,bytes:stockBytes.length,sha256:sha(stockBytes),payloads:stockPayloads,baseline:'Original stock game payloads with the saved browser integration shell; Meteor modules disabled during sampling'}},
 environment:{profile,origin:new URL(stockURL).origin,memoryLimitBytes:MEMORY_LIMIT_BYTES,renderer:'Headless Chromium / ANGLE SwiftShader'},
 plannedSettings:{navigationViewport:[1280,800],sampleViewport:[640,400],world:'Existing verified superflat only',idleDurationMs:5000,movementDurationMs:1000,samplesPerCondition:3,warmupMs:3000,positionCommand:'/tp @s 0 150 0 0 20'},
 measurements:{idle:null,movement:null,memory:null,spikes:null,equivalentOverlays:null,bridgeSelfTime:null},
 parityClaim:false,failures:[],memorySamples:[]};
let context,guard,rejectStop;const stopped=new Promise((_,reject)=>{rejectStop=reject;});void stopped.catch(()=>{});
const save=()=>writeFile(join(reportDir,'raw.json'),JSON.stringify(result,null,2)+'\n');
try{
 assertMemoryBudget((await memorySnapshot(profile)).cgroupBytes);
 guard=startMemoryGuard({profile,logPath:join(directory,'memory.jsonl'),onStop:error=>{log(error.message);rejectStop(error);void killOwnedBrowser(profile);}});
 context=await Promise.race([chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,
  viewport:{width:1280,height:800},args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--in-process-gpu','--use-gl=angle','--enable-unsafe-swiftshader','--use-angle=swiftshader']}),stopped]);
 result.environment.chromium=context.browser().version();const page=context.pages()[0]??await context.newPage();
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);page.on('console',m=>log('browser',m.type(),m.text().slice(0,500)));page.on('pageerror',e=>log('pageerror',String(e)));
 await Promise.race([withDeadline((async()=>{
  log('stock startup');await page.goto(stockURL,{waitUntil:'load'});await page.waitForFunction(()=>window.__eaglerMenuReady===true,null,{timeout:90000});
  result.stockBridgeSignals=await page.evaluate(()=>({screenState:typeof window.__eaghacksScreenState,nativeBridge:typeof window.__eaghacksNativeBridge}));
  await stockToSavedWorldList(page,{directory,log});
  result.stockNavigation='passed; existing saved-world list recognized';await save();
  await page.goto(nativeURL,{waitUntil:'load'});await page.waitForFunction(()=>window.__eaglerMenuReady&&window.__eaghacksNativeBridge?.version===1,null,{timeout:90000});
  if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerProfileScreen26')){
   await page.mouse.click(640,667,{delay:750});await page.waitForTimeout(1000);
   if(await page.evaluate(()=>window.__eaghacksScreenState?.screenName==='EaglerDefaultUsernameNoteScreen'))await page.mouse.click(640,678,{delay:750});
  }
  result.comparison=await compareSavedWorld(page,{nativeURL,originalURL:stockURL,nativePath,originalPath:stockPath,output:join(reportDir,'comparison.json'),directory,log});
  result.status='samples-collected-requires-settings-review';
 })(),360000,'Performance attempt'),stopped]);
}catch(error){
 result.status='blocked';result.failures.push({name:error.name,message:error.message});log('BLOCKED',error.name,error.message);
 const page=context?.pages()[0];if(page&&!page.isClosed()){
  await withDeadline(page.screenshot({path:join(directory,'blocked-screen.png'),timeout:7000}),8000,'Diagnostic screenshot').catch(()=>{});
  result.databaseInventory=await withDeadline(page.evaluate(async()=>{
   const databases=await indexedDB.databases(),out=[];
   for(const db of databases){const database=await new Promise((resolve,reject)=>{const r=indexedDB.open(db.name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const stores=[];for(const store of database.objectStoreNames){const tx=database.transaction(store,'readonly'),s=tx.objectStore(store);const count=await new Promise((resolve,reject)=>{const r=s.count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});stores.push({name:store,count});}
    database.close();out.push({name:db.name,version:db.version,stores});
   }return out;
  }),10000,'Read-only world database inventory').catch(error=>({error:error.message}));
 }
}finally{
 guard?.stop();result.memorySamples=guard?.samples??[];
 await withDeadline(context?.close()??Promise.resolve(),7000,'Chromium close').catch(()=>killOwnedBrowser(profile));
 await killOwnedBrowser(profile);await save();log('saved',join(reportDir,'raw.json'),result.status);
}
