import test from 'node:test';
import assert from 'node:assert/strict';
import {describe} from '../tools/phase5-benchmark.mjs';
test('phase5 pooled durations weight FPS and preserve slow frames',()=>{
 const s=[{sample:{frameTimesMs:[10,10],elapsedMs:20,fps:100}},{sample:{frameTimesMs:[100,100],elapsedMs:200,fps:10}},{sample:{frameTimesMs:[20,20],elapsedMs:40,fps:50}}];
 const r=describe(s);assert.equal(r.fps,6/260*1000);assert.equal(r.meanSampleFps,160/3);assert.equal(r.medianSampleFps,50);assert.equal(r.p95FrameMs,100);assert.equal(r.minSampleFps,10);assert.equal(r.maxSampleFps,100);assert.equal(r.spikesOver50ms,2);assert.equal(r.spikesOver100ms,0);assert.ok(r.frameTimeStdDevMs>0);
});

import {measureGameFrames} from '../tools/phase5-present-sampler.mjs';
import vm from 'node:vm';
test('game sampler excludes offscreen draws and browser RAF from game FPS and restores GL',async()=>{
 const originalDraw=function(){},originalBind=function(){};
 const gl={TRIANGLES:4,FRAMEBUFFER:1,DRAW_FRAMEBUFFER:2,DRAW_FRAMEBUFFER_BINDING:3,getParameter:()=>null,drawArrays:originalDraw,bindFramebuffer:originalBind};
 let submitted=0;const canvas={width:640,height:400,getContext:()=>gl};
 const page={evaluate(fn,arg){return vm.runInNewContext('('+fn.toString()+')(arg)',{arg,document:{querySelector:()=>canvas},performance,setTimeout,clearTimeout,innerWidth:640,innerHeight:400,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}})}};
 const timer=setInterval(()=>{gl.bindFramebuffer(1,{});gl.drawArrays(4,0,3);gl.bindFramebuffer(1,null);gl.drawArrays(4,0,6);submitted++;gl.drawArrays(4,0,3)},2);
 try{const r=await measureGameFrames(page,25);assert.equal(r.frames,submitted-1);assert.equal(r.rafFrameTimesMs.length,0);assert.equal(gl.drawArrays,originalDraw);assert.equal(gl.bindFramebuffer,originalBind);assert.ok(r.elapsedMs>=25);assert.equal(r.fps,r.frames/r.elapsedMs*1000)}finally{clearInterval(timer)}
});
