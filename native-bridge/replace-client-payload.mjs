import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {brotliCompressSync,constants} from 'node:zlib';
const [baseArg,wasmArg,outArg]=process.argv.slice(2);if(!outArg)throw Error('Usage: replace-client-payload.mjs base.html native.wasm output.html');
const base=await readFile(baseArg,'utf8'),wasm=await readFile(wasmArg);new WebAssembly.Module(wasm,{builtins:['js-string']});
for(const marker of ['__eaghacksNativeBridge','__eaghacksNativeNextState'])if(!wasm.includes(Buffer.from(marker)))throw Error(`Missing compiled native marker: ${marker}`);
const pattern=/<script\b([^>]*\bid="(eag-inline-[^"]+)"[^>]*)>([\s\S]*?)<\/script>/g;
const before=new Map([...base.matchAll(pattern)].map(m=>[m[2],Buffer.from(m[3],'base64')]));if(before.size!==6)throw Error('Six payloads required');
const compressed=brotliCompressSync(wasm,{params:{[constants.BROTLI_PARAM_QUALITY]:5}});let replaced=0;
const output=base.replace(pattern,(all,attrs,id)=>{if(id!=='eag-inline-wasm-br')return all;replaced++;if(!/data-size="\d+"/.test(attrs))throw Error('Payload length missing');return `<script${attrs.replace(/data-size="\d+"/,`data-size="${compressed.length}"`)}>\n${compressed.toString('base64').match(/.{1,65536}/g).join('\n')}\n</script>`;});
if(replaced!==1)throw Error('Exactly one client payload required');const after=new Map([...output.matchAll(pattern)].map(m=>[m[2],Buffer.from(m[3],'base64')])),hash=b=>createHash('sha256').update(b).digest('hex'),payloads={};
for(const[id,bytes]of before){const changed=!bytes.equals(after.get(id));if(id!=='eag-inline-wasm-br'&&changed)throw Error(`Unexpected payload change: ${id}`);payloads[id]={before:hash(bytes),after:hash(after.get(id)),changed};}
await mkdir(dirname(resolve(outArg)),{recursive:true});await writeFile(outArg,output);await writeFile(outArg+'.payloads.json',JSON.stringify({wasmBytes:wasm.length,wasmSHA256:hash(wasm),payloads},null,2)+'\n');console.log('Replaced client WASM; the five other payloads remain byte-identical.');
