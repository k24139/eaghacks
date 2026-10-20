/** Read-only Phase 8 standalone verification; no build or historical receipt mutation. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
const bytes=await readFile('input/phase8/native-fixed.html'),html=bytes.toString();
const hash=s=>createHash('sha256').update(s).digest('hex');
const r=JSON.parse(await readFile('reports/reliability-phase8/runtime.json'));
if(bytes.length!==r.htmlBytes||hash(bytes)!==r.artifactSHA256||await gameplaySourceDigest()!==r.sourceDigest)throw Error('Phase 8 baseline mismatch');
for(const p of r.payloads){
 const encoded=html.match(new RegExp('<script[^>]*id="'+p.id+'"[^>]*>([\\s\\S]*?)</script>'))?.[1];
 if(!encoded||hash(encoded)!==p.encodedSHA256)throw Error('Payload changed '+p.id);
 p.decodedSHA256=hash(Buffer.from(encoded.trim(),'base64'));
 if(p.id==='eag-inline-wasm-br')r.compiledWasmSHA256=hash(brotliDecompressSync(Buffer.from(encoded.trim(),'base64')));
}
if(r.compiledWasmSHA256!=='aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d')throw Error('WASM mismatch');
r.phase9RuntimeChanged=false;r.phase9Regenerated=false;
await writeFile('reports/reliability-phase9/runtime.json',JSON.stringify(r,null,2)+'\n');
console.log(r.htmlBytes,r.artifactSHA256,r.sourceDigest,r.compiledWasmSHA256);
