import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectBenchmarkWorld,readNBT,sha256,worldFiles} from '../tools/benchmark-world.mjs';
import {ORIGINAL_EPK_SHA256,recoverEPKHeader} from '../tools/recover-epk-header.mjs';

const bytes=await readFile(new URL('./fixtures/performance/benchmark-world.epk',import.meta.url));
test('recovered benchmark has original full hash, CRC-valid files, settings and 289 stone blocks',()=>{
 assert.equal(sha256(bytes),ORIGINAL_EPK_SHA256);
 const result=inspectBenchmarkWorld(bytes);
 assert.equal(result.files,1256);assert.equal(result.overworldChunks,1225);
 assert.equal(result.platform.stoneBlocks,289);
});
test('recovery rejects partial or corrupted world exports',()=>{
 assert.throws(()=>worldFiles(bytes.subarray(0,-1)),/trailer/);
 const corrupt=Buffer.from(bytes);corrupt[1000]^=1;
 assert.throws(()=>worldFiles(corrupt),/checksum|terminator|size|Truncated/);
 assert.throws(()=>readNBT(Buffer.from([10,0,0,3,0,1,65])),/Truncated/);
 assert.throws(()=>recoverEPKHeader(Buffer.from('unrecognized'),bytes),/Unrecognized damaged/);
});
