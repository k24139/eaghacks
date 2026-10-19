/** Read-only validation of a saved native artifact. Does not launch or compile the game. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {matchesPayloadPin} from '../native-bridge/input-pins.mjs';
import {gameplaySourceDigest} from '../native-bridge/source-digest.mjs';

const [htmlPath,receiptPath]=process.argv.slice(2);
assert.ok(htmlPath&&receiptPath,'Usage: node tools/verify-recovery-artifact.mjs <native.html> <build.json>');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const [bytes,receiptText,pinsText,evidenceText]=await Promise.all([
 readFile(htmlPath),readFile(receiptPath,'utf8'),
 readFile(new URL('../native-bridge/inputs.json',import.meta.url),'utf8'),
 readFile(new URL('../native-bridge/gameplay-verification.json',import.meta.url),'utf8'),
]);
assert.match(bytes.subarray(-1024).toString('utf8'),/<\/html>\s*$/i,'Truncated or incomplete native HTML');
const receipt=JSON.parse(receiptText),pins=JSON.parse(pinsText),evidence=JSON.parse(evidenceText);
const htmlSHA256=hash(bytes),sourceDigest=await gameplaySourceDigest();
assert.equal(htmlSHA256,evidence.artifactSHA256,'HTML does not match saved gameplay evidence');
assert.equal(sourceDigest,evidence.sourceDigest,'Source does not match saved gameplay evidence');
assert.equal(receipt.upstream,pins.upstream,'Build receipt upstream differs from source pins');
const payloads={},html=bytes.toString('utf8');let wasm;
for(const [,attrs,id,text]of html.matchAll(/<script\b([^>]*\bid="(eag-inline-[^"]+)"[^>]*)>([\s\S]*?)<\/script>/g)){
 assert.ok(!payloads[id],`Duplicate payload ${id}`);
 const payload=Buffer.from(text,'base64'),size=attrs.match(/\bdata-size="(\d+)"/);
 assert.equal(Number(size?.[1]),payload.length,`Payload length mismatch: ${id}`);
 assert.ok(matchesPayloadPin(id,payload,pins),`Payload hash mismatch: ${id}`);
 payloads[id]={bytes:payload.length,sha256:hash(payload)};
 assert.equal(payloads[id].sha256,receipt.payloads[id].after,`Build receipt payload mismatch: ${id}`);
 if(id==='eag-inline-wasm-br')wasm=brotliDecompressSync(payload);
}
assert.equal(Object.keys(payloads).length,6,'Expected six complete embedded payloads');
assert.equal(wasm.length,receipt.wasmBytes,'Uncompressed WASM length differs from receipt');
assert.equal(hash(wasm),receipt.wasmSHA256,'Uncompressed WASM differs from receipt');
const markers=['__eaghacksNativeBridge','Java/TeaVM-WasmGC','__eaghacksNativeState'];
for(const marker of markers)assert.ok(wasm.includes(Buffer.from(marker)),`Compiled bridge marker absent: ${marker}`);
console.log(JSON.stringify({htmlBytes:bytes.length,htmlSHA256,sourceDigest,upstream:pins.upstream,
 buildMode:receipt.mode,wasmBytes:wasm.length,wasmSHA256:hash(wasm),compiledBridgeMarkers:markers,
 savedGameplayChecks:evidence.results.length,payloads,scope:'Static verification only. No game execution or native compilation.'},null,2));
