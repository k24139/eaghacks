// QA-only graph capture before the hardware destination. Does not certify speakers/headphones.
(() => {
 const evidence=window.phase7Audio={starts:[],contexts:[],captures:[]};
 const connect=AudioNode.prototype.connect,start=AudioBufferSourceNode.prototype.start;
 const tapped=new WeakSet();
 AudioNode.prototype.connect=function(destination,...args){
  const result=connect.call(this,destination,...args);
  if(destination===this.context.destination&&!tapped.has(this)){
   tapped.add(this);const ctx=this.context,stream=ctx.createMediaStreamDestination(),analyser=ctx.createAnalyser();
   connect.call(this,stream);connect.call(this,analyser);const chunks=[],recorder=new MediaRecorder(stream.stream);
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   const tap={ctx,analyser,chunks,recorder,master:this};evidence.contexts.push(tap);
  }
  return result;
 };
 AudioBufferSourceNode.prototype.start=function(...args){evidence.starts.push({at:performance.now(),duration:this.buffer?.duration,state:this.context.state,channels:this.buffer?.numberOfChannels});return start.apply(this,args)};
 window.phase7BeginAudio=()=>{for(const t of evidence.contexts){t.chunks.length=0;if(t.recorder.state==='inactive')t.recorder.start();}evidence.current={startedAt:performance.now(),starts:evidence.starts.length,peak:0,squares:0,count:0};evidence.timer=setInterval(()=>{for(const t of evidence.contexts){const values=new Float32Array(t.analyser.fftSize);t.analyser.getFloatTimeDomainData(values);for(const v of values){evidence.current.peak=Math.max(evidence.current.peak,Math.abs(v));evidence.current.squares+=v*v;evidence.current.count++}}},10)};
 window.phase7EndAudio=async()=>{clearInterval(evidence.timer);const results=[];for(const t of evidence.contexts){await new Promise(r=>{if(t.recorder.state==='inactive')return r();t.recorder.onstop=r;t.recorder.stop()});const blob=new Blob(t.chunks,{type:t.recorder.mimeType}),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);results.push({state:t.ctx.state,gain:t.master.gain?.value,mime:blob.type,bytes:bytes.length,base64:btoa(binary)});}return {metrics:{...evidence.current,endedAt:performance.now(),starts:evidence.starts.length-evidence.current.starts,rms:Math.sqrt(evidence.current.squares/evidence.current.count)},results};};
})();
