import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareToolchains,buildEnvironment} from './toolchains.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');let projectArg,baseHTML,outputArg,heapDirectory,fast=false,heap=process.env.EAGLER_LINK_HEAP_MIB||'11264',toolchains=resolve(root,'input/native-build/toolchains');
const args=process.argv.slice(2);for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--fast')fast=true;else if(['--base-html','--output','--heap-mib','--heap-directory','--toolchains'].includes(arg)){const value=args[++i];if(!value||value.startsWith('--'))throw Error(`Missing ${arg}`);if(arg==='--base-html')baseHTML=resolve(value);if(arg==='--output')outputArg=value;if(arg==='--heap-mib')heap=value;if(arg==='--heap-directory')heapDirectory=resolve(value);if(arg==='--toolchains')toolchains=resolve(value);}else if(arg.startsWith('--')||projectArg)throw Error(`Unexpected ${arg}`);else projectArg=arg;}
if(!projectArg)throw Error('Usage: npm run build:native -- pinned-source --base-html matching.html [--output native.html] [--heap-mib 11264] [--heap-directory directory] [--fast]');
const project=resolve(projectArg),output=resolve(outputArg||'Eaglercraft-26.2-u1-Meteor-Native.html');if(!Number.isInteger(+heap)||+heap<4096||+heap>12544)throw Error('Heap must be 4096..12544 MiB');
for(const path of ['gradlew','game/src/main/java/net/minecraft/client/Minecraft.java','wasm-toolchain/link-web-target-standalone.js'])if(!existsSync(resolve(project,path)))throw Error(`Missing prepared input: ${path}`);
await mkdir(dirname(output),{recursive:true});const paths=await prepareToolchains(toolchains),env=buildEnvironment(paths);env.EAGLER_LINK_HEAP_MIB=heap;if(heapDirectory){await mkdir(heapDirectory,{recursive:true});env.EAGLER_LINK_HEAP_DIRECTORY=heapDirectory;}
function run(cmd,argv,cwd=root){console.log('[native-build]',cmd,...argv);const r=spawnSync(cmd,argv,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
if(baseHTML)run(process.execPath,[resolve(here,'prepare-from-html.mjs'),baseHTML,project]);
run(process.execPath,[resolve(here,'apply-native-bridge.mjs'),project]);
run(process.execPath,[resolve(project,'wasm-toolchain/link-web-target-standalone.js'),'client',...(fast?['--fast-analysis']:[])],project);
const wasm=resolve(project,'target_teavm_wasm_gc/build/generated/teavm',fast?'wasm-gc-fast-analysis/classes.wasm':'wasm-gc/classes.wasm'),baseOutput=resolve(project,'eaghacks-inputs/native-base.html');
if(baseHTML)run(process.execPath,[resolve(here,'replace-client-payload.mjs'),baseHTML,wasm,baseOutput]);else{if(fast)throw Error('Development link requires --base-html');run(process.execPath,[resolve(project,'wasm-toolchain/build-single-html.js'),'--reuse-client','--reuse-mesh','--reuse-server','--fast-package','--output',baseOutput],project);}
run(process.execPath,[resolve(root,'tools/inject-eaglercraft.mjs'),baseOutput,output,...(baseHTML?['--refresh']:[])]);
const receipt={mode:fast?'fast-analysis development build':'precise FULL production client link',upstream:'1be2375ad67cb42a52d5f586a2422e54b57be625',output,clientWasm:wasm,heapMiB:+heap,heapDirectory:heapDirectory??null,...(baseHTML?JSON.parse(await readFile(baseOutput+'.payloads.json','utf8')):{})};
await writeFile(output+'.build.json',JSON.stringify(receipt,null,2)+'\n');if(baseHTML)await writeFile(output+'.payloads.json',await readFile(baseOutput+'.payloads.json'));console.log('Native standalone:',output,receipt.mode);
