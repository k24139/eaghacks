import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bootTestClient} from './helpers.mjs';

test('macro wait without an explicit delay retains its 250 ms default',async()=>{
 const {client}=await bootTestClient({inWorld:true});client.ticker.stop();
 const m=client.modules.get('macros');m.enable();
 m.addMacro('wait-default',null,[{action:'wait'},{action:'enable',module:'custom-text'}]);
 const start=performance.now();m.runByName('wait-default');m.onTick();
 assert.ok(m._waitUntil>=start+249,'default wait must not be overwritten');
 m.onTick();assert.equal(client.modules.get('custom-text').active,false);
 m.disable();assert.equal(m._running,null);
});

test('chunk borders project both X and Z grid directions',async()=>{
 const {client,adapter}=await bootTestClient({inWorld:true});client.ticker.stop();
 const m=client.modules.get('chunk-borders'),segments=[];let start;
 adapter.getPlayer=()=>({x:0,y:150,z:0});
 const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){start=[x,y]},lineTo(x,y){segments.push([start,[x,y]])},stroke(){}};
 m._draw(ctx,{worldToScreen:(x,y,z)=>({x,y:z,visible:true})});
 assert.ok(segments.some(([a,b])=>a[0]===b[0]&&a[1]!==b[1]),'must draw Z-directed boundaries');
 assert.ok(segments.some(([a,b])=>a[1]===b[1]&&a[0]!==b[0]),'must draw X-directed boundaries');
});

test('notifications deliver one toast, history row and bus event per manager notice',async()=>{
 const {client}=await bootTestClient({inWorld:true});client.ticker.stop();
 const m=client.modules.get('notifications');m.enable();m.log.length=0;
 const calls=[];client.toasts.push=(...a)=>calls.push(a);const events=[];
 client.bus.on('notification',e=>events.push(e));
 client.modules.notify('phase6 single warning','warn');
 assert.equal(m.log.filter(x=>x.text==='phase6 single warning').length,1);
 assert.equal(calls.length,1);assert.equal(events.length,1);
});

import {captureGameCanvas} from '../src/core/screenshot.js';
function screenshotFixture(){
 let framebuffer=null,inside=false,reads=0;
 const gl={TRIANGLES:4,DRAW_FRAMEBUFFER_BINDING:1,getParameter:()=>framebuffer,drawArrays(){inside=true;queueMicrotask(()=>inside=false)}};
 const canvas={getContext:()=>gl,toDataURL(){reads++;assert.ok(inside,'read before browser clears framebuffer');return 'data:image/png;real-frame'}};
 return {gl,canvas,setFramebuffer:v=>framebuffer=v,get reads(){return reads}};
}
test('screenshot ignores offscreen passes and reads only after the completed game draw',async()=>{
 const f=screenshotFixture(),original=f.gl.drawArrays,capture=captureGameCanvas(f.canvas);
 f.setFramebuffer({});f.gl.drawArrays(4,0,3);assert.equal(f.reads,0);
 f.setFramebuffer(null);f.gl.drawArrays(4,0,3);
 assert.equal(await capture.result,'data:image/png;real-frame');assert.equal(f.gl.drawArrays,original);
});
test('screenshot cancellation and timeout restore WebGL and reject without a download',async()=>{
 for(const timeout of [false,true]){const f=screenshotFixture(),original=f.gl.drawArrays,capture=captureGameCanvas(f.canvas,5);if(!timeout)capture.cancel();await assert.rejects(capture.result,/cancelled|timeout/);assert.equal(f.gl.drawArrays,original);assert.equal(f.reads,0)}
});
