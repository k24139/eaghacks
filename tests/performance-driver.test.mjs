import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {classifyStockControls} from '../tools/performance-stock-ui.mjs';
import {assertMemoryBudget,MEMORY_LIMIT_BYTES,withDeadline} from '../tools/performance-host-guard.mjs';
import {summarizeFrameTimes,measureClientFrames} from '../tools/sample-client-performance.mjs';

test('stock profile and title are recognized from rendered control text without bridge globals',()=>{
 assert.equal(classifyStockControls({done:'Done',singleplayer:''}),'profile');
 assert.equal(classifyStockControls({singleplayer:'Singleplayer'}),'title');
 assert.equal(classifyStockControls({play:'Play Selected World'}),'world-list');
 assert.equal(classifyStockControls({heading:'Select World',worldRow:'Eaghacks Benchmark 2026'}),'world-list-row');
 assert.equal(classifyStockControls({heading:'Create New World'}),'unknown');
 assert.equal(classifyStockControls({createWorld:'Create Hew World'}),'empty-world-selector');
 assert.equal(classifyStockControls({createWorld:'Create New World'}),'empty-world-selector');
});
test('host memory guard stops at the requested 6.5 GiB boundary',()=>{
 assert.equal(MEMORY_LIMIT_BYTES,6.5*1024**3);
 assert.doesNotThrow(()=>assertMemoryBudget(MEMORY_LIMIT_BYTES-1));
 assert.throws(()=>assertMemoryBudget(MEMORY_LIMIT_BYTES),/Memory guard/);
 assert.throws(()=>assertMemoryBudget(NaN),/valid host memory/);
});
test('frame summary retains slow frames instead of removing spikes',()=>{
 const result=summarizeFrameTimes([10,20,100,200],330);
 assert.equal(result.fps,4/330*1000);assert.equal(result.meanFrameMs,82.5);
 assert.equal(result.p95FrameMs,200);assert.equal(result.maxFrameMs,200);
 assert.equal(result.spikesOver50ms,2);assert.equal(result.spikesOver100ms,1);
 assert.throws(()=>summarizeFrameTimes([],100),/No valid frame/);
});
test('host deadline rejects a page evaluation that never returns',async()=>{
 await assert.rejects(withDeadline(new Promise(()=>{}),10,'Hung page'),/Hung page timed out/);
 assert.equal(await withDeadline(Promise.resolve('ok'),50,'Fast page'),'ok');
});
test('sampler times out and cancels RAF when the page stops producing frames',async()=>{
 let cancelled=false;
 const page={evaluate(fn,arg){return vm.runInNewContext('('+fn.toString()+')(arg)',{
  arg,window:{EaglerHacks:{client:{stats:{_moduleTickAccum:0,_samples:0,_moduleRenderAccum:0}}}},
  performance:{now:()=>0},setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{cancelled=true;},
 });}};
 await assert.rejects(measureClientFrames(page,5,{timeoutMs:20}),/Animation-frame sample timeout/);
 assert.equal(cancelled,true);
});
test('RAF sampler ignores the partial first callback interval',async()=>{
 let timestamp=5,clock=0;
 const page={evaluate(fn,arg){return vm.runInNewContext('('+fn.toString()+')(arg)',{
  arg,window:{EaglerHacks:{client:{stats:{_moduleTickAccum:0,_samples:0,_moduleRenderAccum:0}}}},
  performance:{now:()=>clock},innerWidth:640,innerHeight:400,setTimeout,clearTimeout,
  requestAnimationFrame:cb=>{const current=timestamp;timestamp+=10;return setImmediate(()=>{clock=current;cb(current)})},cancelAnimationFrame:clearImmediate,
 });}};
 const r=await measureClientFrames(page,25,{timeoutMs:1000});assert.deepEqual([...r.frameTimesMs],[10,10,10]);assert.equal(r.elapsedMs,30);assert.equal(r.fps,100);
});
