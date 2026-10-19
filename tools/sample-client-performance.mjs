/** Fresh real-frame samples, reusable in the same saved world for both clients. */
export function measureClientFrames(page,durationMs=5000){
 return page.evaluate(async duration=>{
  const frames=[],bridgeCosts=[],start=performance.now(),first=window.__eaghacksNativeState;
  const stats=window.EaglerHacks.client.stats,tickAccum=stats._moduleTickAccum,tickSamples=stats._samples,renderAccum=stats._moduleRenderAccum;
  const firstTick=first?.tick,firstSequence=first?.bridge?.sequence;let previous=start,observedSequence=firstSequence;
  await new Promise(resolve=>{
   function frame(now){frames.push(now-previous);previous=now;const b=window.__eaghacksNativeState?.bridge;if(b&&b.sequence!==observedSequence){observedSequence=b.sequence;if(Number.isFinite(b.snapshotMs))bridgeCosts.push(b.snapshotMs);}if(now-start<duration)requestAnimationFrame(frame);else resolve();}
   requestAnimationFrame(frame);
  });
  const elapsed=performance.now()-start,sorted=frames.slice().sort((a,b)=>a-b),state=window.__eaghacksNativeState,bridgeSorted=bridgeCosts.slice().sort((a,b)=>a-b),sampledTicks=stats._samples-tickSamples;
  return {
   elapsedMs:elapsed,frames:frames.length,fps:frames.length/elapsed*1000,
   p50FrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),
   worldTicksPerSecond:firstTick===undefined?null:(state.tick-firstTick)/elapsed*1000,
   nativeSnapshotsPerSecond:firstSequence===undefined?null:(state.bridge.sequence-firstSequence)/elapsed*1000,
   nativeSnapshotMs:state?.bridge?.snapshotMs??null,entities:state?.entities?.length??null,
   observedBridgeCostSamples:bridgeCosts.length,observedBridgeCostMeanMs:bridgeCosts.length?bridgeCosts.reduce((a,b)=>a+b,0)/bridgeCosts.length:null,observedBridgeCostP95Ms:bridgeSorted[Math.floor(bridgeSorted.length*.95)]??null,
   sampledModuleTicks:sampledTicks,freshModuleTickMeanMs:sampledTicks?(stats._moduleTickAccum-tickAccum)/sampledTicks:null,
   moduleRenderMsPerObservedFrame:(stats._moduleRenderAccum-renderAccum)/frames.length,
   framework:window.EaglerHacks.client.stats.snapshot(),viewport:{width:innerWidth,height:innerHeight}
  };
 },durationMs);
}
