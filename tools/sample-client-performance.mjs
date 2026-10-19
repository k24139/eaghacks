/** Bounded rAF/main-thread samples. This is not a GPU-presented-frame counter. */
import {withDeadline} from './performance-host-guard.mjs';
export function summarizeFrameTimes(times,elapsedMs){
 if(!times.length||!Number.isFinite(elapsedMs)||elapsedMs<=0||!times.every(t=>Number.isFinite(t)&&t>=0))throw Error('No valid frame sample');
 const sorted=times.slice().sort((a,b)=>a-b);
 return {frames:times.length,elapsedMs,fps:times.length/elapsedMs*1000,
  meanFrameMs:times.reduce((a,b)=>a+b,0)/times.length,p50FrameMs:sorted[Math.floor((sorted.length-1)*.5)],
  p95FrameMs:sorted[Math.ceil((sorted.length-1)*.95)],maxFrameMs:sorted.at(-1),
  spikesOver50ms:times.filter(t=>t>50).length,spikesOver100ms:times.filter(t=>t>100).length};
}
export async function measureClientFrames(page,durationMs=5000,{timeoutMs=15000}={}){
 const raw=await withDeadline(page.evaluate(async({duration,timeout})=>{
  const frameTimesMs=[],bridgeCostsMs=[],start=performance.now(),first=window.__eaghacksNativeState;
  const stats=window.EaglerHacks.client.stats,tickAccum=stats._moduleTickAccum,tickSamples=stats._samples,renderAccum=stats._moduleRenderAccum;
  const firstTick=first?.tick,firstSequence=first?.bridge?.sequence;let previous=start,observedSequence=firstSequence;
  await new Promise((resolve,reject)=>{
   let raf;const timer=setTimeout(()=>{cancelAnimationFrame(raf);reject(Error('Animation-frame sample timeout'));},timeout);
   function frame(now){frameTimesMs.push(now-previous);previous=now;const b=window.__eaghacksNativeState?.bridge;
    if(b&&b.sequence!==observedSequence){observedSequence=b.sequence;if(Number.isFinite(b.snapshotMs))bridgeCostsMs.push(b.snapshotMs);}
    if(now-start<duration)raf=requestAnimationFrame(frame);else{clearTimeout(timer);resolve();}
   }raf=requestAnimationFrame(frame);
  });
  const elapsedMs=performance.now()-start,state=window.__eaghacksNativeState,sampledTicks=stats._samples-tickSamples;
  return {requestedDurationMs:duration,elapsedMs,frameTimesMs,bridgeCostsMs,
   worldTicksPerSecond:firstTick===undefined||!state?null:(state.tick-firstTick)/elapsedMs*1000,
   nativeSnapshotsPerSecond:firstSequence===undefined||!state?null:(state.bridge.sequence-firstSequence)/elapsedMs*1000,
   observedBridgeCostSamples:bridgeCostsMs.length,observedBridgeCostMeanMs:bridgeCostsMs.length?bridgeCostsMs.reduce((a,b)=>a+b,0)/bridgeCostsMs.length:null,
   freshModuleTickMeanMs:sampledTicks?(stats._moduleTickAccum-tickAccum)/sampledTicks:null,
   moduleRenderMsPerObservedFrame:(stats._moduleRenderAccum-renderAccum)/frameTimesMs.length,
   jsHeapUsedBytes:performance.memory?.usedJSHeapSize??null,
   jsHeapScope:'JavaScript only. Excludes WASM, GPU, workers and browser-native memory.',
   viewport:{width:innerWidth,height:innerHeight}};
 },{duration:durationMs,timeout:timeoutMs}),timeoutMs+1000,'Frame evaluation');
 return {...raw,...summarizeFrameTimes(raw.frameTimesMs,raw.elapsedMs)};
}
