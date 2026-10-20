/** Audit registry requirements and retain separate current/historical native evidence. */
import {installDom} from './dom-env.mjs';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
installDom();
const {bootMeteor,shutdownMeteor}=await import('../src/index.js');
const {MockAdapter}=await import('../src/core/adapter.js');
const {createEaglercraftModules}=await import('../src/integration/eaglercraft-modules.js');
const available=new Set(['input','hud','world','entities','render','native-direct','native-inventory-read','brightness-control','fov-control','hurt-camera-control','native-respawn','effects','biome','crosshair-control','native-multi-attack']);
const partial={fullbright:'Night-vision effect mutation absent; gamma subset works.','auto-crit':'Jump subset exists; packet hook absent. Jump does not establish critical-hit damage timing.','no-hurt-cam':'Damage/death suppression exists; independent directional tilt absent.',macros:'Module/wait steps work; chat method unavailable; bind steps warn without execution.','target-hud':'Health/distance/bar exist; target armor metadata absent.','screenshot-util':'Direct WebGL read produces black PNG; requires same-task completed draw capture.'};
const limitations={
 'auto-totem':'No offhand inventory mutation/totem contract. Generic main/offhand useItem command does not implement slot management.',
 'auto-weapon':'Read-only hotbar and selectSlot already exist. findBestWeapon/ranking is absent (no attack-damage/enchantment metadata); broad inventory gate remains. Possible focused JS follow-up, not a required Java build for simple ID ranking.',
 'auto-armor':'Armor/main inventory reads exist; equipBestArmor/inventory click or equip command absent.',
 'reach-display':'No attacker/distance combat event stream. Target snapshots do not identify hits.',
 velocity:'setPlayerVelocity exists; no incoming knockback multiplier/interception hook.',
 'auto-jump':'jump/onGround/forward reads exist; isBlockAhead collision lookup absent.',
 flight:'Direct velocity exists; setFlying/player flight flags and flight speed controls absent.',
 'high-jump':'Direct velocity/jump exist; setJumpHeight/getJumpHeight contract absent.',
 jesus:'No fluid collision or fluid movement interception.',
 'no-fall':'fallDistance is readable; no setNoFall or fall-damage override.',
 'no-slow':'No item-use movement-modifier interception.',
 parkour:'jump/sneak exist; isBlockAhead with gap query absent.',
 'safe-walk':'Sneak exists; no setSafeWalk edge-collision constraint.',
 spider:'No horizontal-collision hook.',
 step:'No setStepHeight/getStepHeight API.',
 timer:'No setTickRate/getTickRateMultiplier API.',
 'auto-tool':'Inventory/slot reads and selection exist; block type and findBestTool ranking absent.',
 'chest-organizer':'No container slot/click automation.',
 'fast-place':'useItem exists; no setRightClickDelay/getRightClickDelay hook.',
 'inventory-manager':'Reads exist; sort/drop/slot-click mutation contract absent.',
 'freecam':'Projection exists; camera detachment/update/restore API absent.',
 'storage-esp':'No block/container enumeration.',xray:'No renderer face-visibility override.',
 'block-search':'No block enumeration/lookup.', 'light-level':'No per-block light lookup.',
 waypoints:'Position/dimension exist; stable world-save/server identity absent.',
 'auto-gg':'No sendChat bridge method; keyboard command entry by a test driver is not a native chat capability.',
 'auto-reconnect':'No reconnect/server connection contract.',
 'chat-timestamps':'No incoming chat render/format interception.',
 'server-info':'No server address/player-count network contract.', 'ping-display':'No ping/network read contract.'
};
const historical=JSON.parse(await readFile('native-bridge/gameplay-verification.json','utf8'));
let phase6={verifiedModules:[],evaluatedModules:[]};try{phase6=JSON.parse(await readFile('reports/module-phase6/verification.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const digest=await gameplaySourceDigest(),current=phase6.sourceDigest===digest?new Set(phase6.verifiedModules):new Set();
const tests=await Promise.all((await readdir('tests')).filter(f=>f.endsWith('.test.mjs')).map(async f=>({file:'tests/'+f,text:await readFile('tests/'+f,'utf8')})));
const checks=(await readFile('reports/module-phase6/checks.jsonl','utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const c=bootMeteor({adapter:new MockAdapter(),modules:createEaglercraftModules(),storage:null,fresh:true});
const rows=c.catalogue().map(m=>{
 const missing=m.requiredCapabilities.filter(x=>!available.has(x)),blocked=m.unsupported||missing.length>0;
 const old=historical.verifiedModules.includes(m.id),wasPartial=!!partial[m.id];
 const initial=blocked?'unsupported':wasPartial?'partial':old?'historical-verified':'implemented-unverified';
 const status=blocked?'unsupported':wasPartial&&!(m.id==='screenshot-util'&&current.has(m.id))?'partial':current.has(m.id)?'phase6-verified':old?'historical-verified':'implemented-unverified';
 const results=checks.filter(r=>[r.module].flat().includes(m.id));
 return {...m,initial,status,missingCapabilities:missing,existingNativeSubset:limitations[m.id]??null,limitations:limitations[m.id]??(status==='partial'?partial[m.id]:m.id==='fps-display'?'Framework/browser animation FPS; not game submission or physical display FPS.':m.id==='hitboxes'?'Projected screen rectangles; not physical hitbox expansion.':m.id==='chunk-borders'?'Local 5x5 grid; segments with offscreen endpoints are omitted.':'Only tested settings/lifecycle in linked evidence; not exhaustive.'),automatedCoverage:tests.filter(t=>t.text.includes(m.id)||t.text.includes(m.name)).map(t=>t.file),gameplayChecks:results.map(r=>({name:r.name,pass:r.pass,runtime:r.runtime,artifactSHA256:r.artifactSHA256})),historicalEvidence:old?{path:'native-bridge/gameplay-verification.json',sourceDigest:historical.sourceDigest,artifactSHA256:historical.artifactSHA256}:null};
}).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
shutdownMeteor();
const count=key=>rows.reduce((r,m)=>(r[m[key]]=(r[m[key]]??0)+1,r),{});
await writeFile('reports/module-phase6/module-matrix.json',JSON.stringify({sourceDigest:digest,availableCapabilities:[...available],initialCounts:count('initial'),finalCounts:count('status'),coverageNote:'Automated file links are literal module ID/name matches, not per-module test totals; shared tests may cover more. Gameplay checks explicitly separate intermediate and final artifacts.',modules:rows},null,2)+'\n');
const text=['# Phase 6 module validation matrix','','Generated by `node tools/phase6-module-audit.mjs`. Full settings, test links and hash-bound check references are in `module-matrix.json`.','','| Module | Category | Initial → final | Required capabilities | Automated coverage | Limits / exact missing functionality |','| --- | --- | --- | --- | --- | --- |',...rows.map(m=>`| ${m.name} | ${m.category} | ${m.initial} → ${m.status} | ${m.requiredCapabilities.join(', ')||'client UI'} | ${m.automatedCoverage.join(', ')||'shared framework checks only'} | ${m.limitations} |`)];await writeFile('reports/module-phase6/MODULE_MATRIX.md',text.join('\n')+'\n');console.log(JSON.stringify({initial:count('initial'),final:count('status')}));
