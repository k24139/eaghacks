/** CPU timestamps of the verified full-screen WebGL present draw, plus browser rAF cadence.
 * This measures game submissions, not GPU completion or physical display refreshes. */
import {summarizeFrameTimes} from './sample-client-performance.mjs';
import {withDeadline} from './performance-host-guard.mjs';
export async function measureGameFrames(page,durationMs=5000){
 const raw=await withDeadline(page.evaluate(({durationMs})=>new Promise((resolve,reject)=>{
  const canvas=document.querySelector('#game_frame canvas'),gl=canvas?.getContext('webgl2');
  if(!gl)return reject(Error('Game WebGL2 context unavailable'));
  const draw=gl.drawArrays,bind=gl.bindFramebuffer,frames=[],rafTimes=[];
  let framebuffer=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),start,previous,last,rafPrevious,raf;
  const heapBefore=performance.memory?.usedJSHeapSize??null;
  function cleanup(){gl.drawArrays=draw;gl.bindFramebuffer=bind;cancelAnimationFrame(raf);clearTimeout(timer)}
  const timer=setTimeout(()=>{cleanup();reject(Error('No completed game present sample within timeout'))},durationMs+10000);
  gl.bindFramebuffer=function(target,value){if(target===gl.FRAMEBUFFER||target===gl.DRAW_FRAMEBUFFER)framebuffer=value;return bind.call(this,target,value)};
  function browserFrame(now){if(rafPrevious!==undefined)rafTimes.push(now-rafPrevious);rafPrevious=now;raf=requestAnimationFrame(browserFrame)}
  raf=requestAnimationFrame(browserFrame);
  gl.drawArrays=function(mode,first,count){
   const result=draw.call(this,mode,first,count);
   if(mode===gl.TRIANGLES&&first===0&&count===3&&framebuffer===null){
    const now=performance.now();
    if(start===undefined){start=previous=now;return result}
    frames.push(now-previous);previous=last=now;
    if(now-start>=durationMs){cleanup();resolve({requestedDurationMs:durationMs,elapsedMs:last-start,frameTimesMs:frames,rafFrameTimesMs:rafTimes,jsHeapBeforeBytes:heapBefore,jsHeapUsedBytes:performance.memory?.usedJSHeapSize??null,canvas:{width:canvas.width,height:canvas.height},viewport:{width:innerWidth,height:innerHeight},metric:'CPU intervals between full-screen WebGL drawArrays(TRIANGLES,0,3) submissions to default draw framebuffer'})}
   }return result;
  };
 }),{durationMs}),durationMs+12000,'Game present sampler');
 return {...raw,...summarizeFrameTimes(raw.frameTimesMs,raw.elapsedMs)};
}
