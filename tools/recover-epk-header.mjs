/** Recover only exporter metadata; require the complete original hash before writing. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {sha256,worldFiles} from './benchmark-world.mjs';
export const ORIGINAL_EPK_SHA256='503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784';
export function recoverEPKHeader(damaged,exported){
 assert.equal(sha256(damaged),'2657d47e64269689eecd25c4969a9b2d0e518b25cd5fcf73c8f68dce1e0fcde0','Unrecognized damaged artifact');
 const encoded=damaged.toString('base64');
 assert.ok(encoded.startsWith('Warningtruncatedoutputoriginaltokencount50001Totaloutputlines1RUFH'),'Unrecognized transport damage');
 const originalPrefix=Buffer.from(encoded.slice(encoded.indexOf('RUFH')),'base64');
 // Two strings, comment length+comment, and eight-byte timestamp. Payload begins at 179.
 let offset=8;for(let i=0;i<2;i++)offset+=1+exported[offset];
 offset+=2+exported.readUInt16BE(offset)+8;
 assert.equal(offset,179);assert.equal(exported.length,570090);
 const recovered=Buffer.concat([originalPrefix.subarray(0,offset),exported.subarray(offset)]);
 assert.equal(sha256(recovered),ORIGINAL_EPK_SHA256,'Payload differs from original; refuse reconstruction');
 assert.equal(worldFiles(recovered).length,1256);
 return recovered;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [damaged,exported,output]=process.argv.slice(2);
 assert.ok(damaged&&exported&&output,'Usage: node tools/recover-epk-header.mjs <damaged.epk> <native-export.epk> <output.epk>');
 const recovered=recoverEPKHeader(await readFile(damaged),await readFile(exported));
 await writeFile(output,recovered,{flag:'wx'});
 console.log(JSON.stringify({bytes:recovered.length,sha256:sha256(recovered),files:1256}));
}
