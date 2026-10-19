import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readEPK} from './epk.mjs';
import {matchesPayloadPin} from './input-pins.mjs';
const [htmlArg,projectArg]=process.argv.slice(2);
if(!htmlArg||!projectArg)throw Error('Usage: prepare-from-html.mjs <matching.html> <pinned-source>');
const expected=JSON.parse(await readFile(new URL('./inputs.json',import.meta.url))),project=await realpath(resolve(projectArg));
if(execFileSync('git',['-C',project,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==expected.upstream)throw Error('Upstream revision mismatch');
const html=await readFile(htmlArg,'utf8'),hash=b=>createHash('sha256').update(b).digest('hex'),payloads=new Map();
for(const [,attrs,id,text]of html.matchAll(/<script\b([^>]*\bid="(eag-inline-[^"]+)"[^>]*)>([\s\S]*?)<\/script>/g)){
 if(payloads.has(id))throw Error('Duplicate payload');const bytes=Buffer.from(text,'base64'),size=attrs.match(/\bdata-size="(\d+)"/);
 if(!size||+size[1]!==bytes.length||!matchesPayloadPin(id,bytes,expected))throw Error(`Payload does not match pinned 26.2-u1: ${id}`);payloads.set(id,bytes);
}
if(payloads.size!==6)throw Error('Expected six pinned payloads');
const files=readEPK(payloads.get('eag-inline-assets')),tree=hash(Buffer.from(files.map(f=>`${f.name}\t${hash(f.data)}`).sort().join('\n')));
if(files.length!==expected.resourceFiles||tree!==expected.resourceTree)throw Error('Resource tree mismatch');
const root=resolve(project,'game/src/main/resources');await mkdir(root,{recursive:true});const verifiedDirectories=new Set([root]);
for(const file of files){let parent=root;const parts=file.name.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);if(verifiedDirectories.has(parent))continue;const stat=await lstat(parent).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat?.isSymbolicLink())throw Error('Refusing symlink');await mkdir(parent,{recursive:true});verifiedDirectories.add(parent);}
 const target=resolve(root,file.name),stat=await lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat?.isSymbolicLink())throw Error('Refusing symlink');if(stat){if(!(await readFile(target)).equals(file.data))throw Error(`Resource conflict: ${file.name}`);}else await writeFile(target,file.data);
}
const preserved=resolve(project,'eaghacks-inputs');await mkdir(preserved,{recursive:true});
for(const [id,bytes]of payloads)await writeFile(resolve(preserved,id+'.bin'),bytes);
await writeFile(resolve(preserved,'manifest.json'),JSON.stringify({...expected,inputHTML:hash(Buffer.from(html))},null,2)+'\n');
console.log(`Verified six payloads and restored ${files.length} CRC-checked resources; tree=${tree}`);
