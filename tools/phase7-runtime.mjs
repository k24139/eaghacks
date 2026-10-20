/** Verify refreshed browser JS identity and unchanged payloads against preserved Phase 6. */
import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import{gameplaySourceDigest}from'../native-bridge/source-digest.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),path=process.argv[2];if(!path)throw Error('Pass refreshed HTML path');
const phase6=JSON.parse(await readFile('reports/module-phase6/runtime.json')),bytes=await readFile(path),html=bytes.toString();
const payloads=phase6.payloads.map(p=>{const value=html.match(new RegExp('<script[^>]*id="'+p.id+'"[^>]*>([\\s\\S]*?)</script>'))?.[1];if(!value||hash(value)!==p.encodedSHA256)throw Error('Payload changed '+p.id);return p});
const result={htmlBytes:bytes.length,artifactSHA256:hash(bytes),sourceDigest:await gameplaySourceDigest(),phase6:{artifactSHA256:phase6.artifactSHA256,sourceDigest:phase6.sourceDigest},payloads,javaChanged:false,nativeMode:'fast-analysis/SIMPLE'};await writeFile('reports/desktop-phase7/runtime.json',JSON.stringify(result,null,2)+'\n');console.log(result.artifactSHA256,result.sourceDigest);
