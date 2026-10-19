import {readFile,readdir,appendFile} from 'node:fs/promises';
export const MEMORY_LIMIT_BYTES=6.5*1024**3;
export async function browserProcesses(profile){
 const entries=await readdir('/proc');const all=[];
 for(const name of entries.filter(n=>/^\d+$/.test(n))){try{
  const [cmd,status]=await Promise.all([readFile(`/proc/${name}/cmdline`,'utf8'),readFile(`/proc/${name}/status`,'utf8')]);
  all.push({pid:+name,ppid:+status.match(/^PPid:\s+(\d+)/m)[1],rssBytes:+(status.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024,
   root:cmd.split('\0').includes('--user-data-dir='+profile)&&cmd.includes('chromium')});
 }catch{/* Process exited during inspection. */}}
 const owned=new Set(all.filter(p=>p.root).map(p=>p.pid));
 let changed;do{changed=false;for(const p of all)if(owned.has(p.ppid)&&!owned.has(p.pid)){owned.add(p.pid);changed=true;}}while(changed);
 return all.filter(p=>owned.has(p.pid));
}
export function assertMemoryBudget(bytes,limit=MEMORY_LIMIT_BYTES){
 if(!Number.isFinite(bytes)||bytes<0)throw Error('Cannot read valid host memory usage');
 if(bytes>=limit)throw Error(`Memory guard: ${(bytes/1024**3).toFixed(2)} GiB reached the ${(limit/1024**3).toFixed(2)} GiB stop`);
}
export async function memorySnapshot(profile){
 const cgroupBytes=Number((await readFile('/sys/fs/cgroup/memory.current','utf8')).trim());
 const processes=await browserProcesses(profile);
 return {at:new Date().toISOString(),cgroupBytes,browserRSSBytes:processes.reduce((s,p)=>s+p.rssBytes,0),browserPids:processes.map(p=>p.pid)};
}
export function withDeadline(promise,ms,label){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out after '+ms+' ms')),ms);})]).finally(()=>clearTimeout(timer));
}
export async function killOwnedBrowser(profile){
 const processes=await browserProcesses(profile);
 for(const p of processes.reverse()){try{process.kill(p.pid,'SIGKILL');}catch{/* Already exited. */}}
}
export function startMemoryGuard({profile,logPath,onStop,read=()=>memorySnapshot(profile),limit=MEMORY_LIMIT_BYTES}){
 let busy=false,stopped=false;const samples=[];
 const check=async()=>{if(busy||stopped)return;busy=true;try{
  const sample=await read();samples.push(sample);await appendFile(logPath,JSON.stringify(sample)+'\n');assertMemoryBudget(sample.cgroupBytes,limit);
 }catch(error){if(!stopped){stopped=true;clearInterval(timer);onStop(error);}}finally{busy=false;}};
 const timer=setInterval(check,1000);void check();
 return {samples,stop(){stopped=true;clearInterval(timer);}};
}
