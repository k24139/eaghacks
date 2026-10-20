/** Hash-only JS integration receipt; rejects any native payload drift. No compiler calls. */
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';
const [candidate='input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html',baseline='input/phase8/native-fixed.html']=process.argv.slice(2);
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(baseline),bytes=await readFile(candidate),html=bytes.toString('utf8');
assert.equal(hash(original),'9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0');
assert.match(html,/<\/html>\s*$/i);
const extract=text=>Object.fromEntries([...text.matchAll(/<script\b([^>]*\bid="(eag-inline-[^"]+)"[^>]*)>([\s\S]*?)<\/script>/g)].map(([,attrs,id,text])=>{
 const b=Buffer.from(text,'base64');assert.equal(b.length,Number(attrs.match(/data-size="(\d+)"/)?.[1]));return [id,b];
}));
const old=extract(original.toString()),current=extract(html),payloads={};assert.equal(Object.keys(current).length,6);
for(const[id,b]of Object.entries(current)){assert.ok(b.equals(old[id]),`Native payload drift: ${id}`);payloads[id]={bytes:b.length,sha256:hash(b),byteIdentical:true};}
const wasm=brotliDecompressSync(current['eag-inline-wasm-br']);assert.equal(hash(wasm),'aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d');
const integration=html.match(/<script id="eaghacks-integration">([\s\S]*?)<\/script>/)?.[1];assert.ok(integration);
const manifest={verifiedAt:new Date().toISOString(),kind:'JavaScript integration release candidate; existing compiled native payloads',artifact:candidate,html:{bytes:(await stat(candidate)).size,sha256:hash(bytes)},sourceDigest:await gameplaySourceDigest(),wasm:{bytes:wasm.length,sha256:hash(wasm)},payloads,integration:{bytes:Buffer.byteLength(integration),sha256:hash(integration)},injectionTool:{path:'tools/inject-eaglercraft.mjs',sha256:hash(await readFile('tools/inject-eaglercraft.mjs')),baseCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim()},historicalBaseline:{sha256:hash(original),unchanged:true}};
await writeFile('reports/release-phase13/release-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({html:manifest.html,sourceDigest:manifest.sourceDigest,wasm:manifest.wasm,nativePayloadsIdentical:true},null,2));
