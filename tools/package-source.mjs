/** Rebuild framework bundles and package only reproducible project source. */
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=resolve(process.argv[2]||'Eaglercraft-26.2-u1-Meteor-Source.zip');
execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'inherit'});
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0');
const added=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0');
const roots=['src/','tests/','tools/','dist/','harness/','native-bridge/','.github/'];
const rootFiles=new Set(['package.json','package-lock.json','build.mjs','README.md','PROGRESS.md','MODULES.md','TEST_RESULTS.md','INTEGRATION.md','.gitignore']);
const files=[...new Set([...tracked,...added,'dist/meteor.bundle.js','dist/eaghacks-integration.js'])].filter(p=>p&&(rootFiles.has(p)||roots.some(r=>p.startsWith(r)))&&existsSync(resolve(root,p))&&!p.endsWith('.zip')).sort();
const python=`import sys,json,zipfile,pathlib,os
request=json.load(sys.stdin)
with zipfile.ZipFile(request['output'],'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name in request['files']:
  path=pathlib.Path(request['root'])/name
  entry=zipfile.ZipInfo(name,(1980,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED
  entry.external_attr=(0o755 if path.stat().st_mode & 0o111 else 0o644)<<16
  archive.writestr(entry,path.read_bytes())
print(str(pathlib.Path(request['output']).resolve()))
print(str(len(request['files']))+' source files packaged')
`;
const result=spawnSync('python3',['-c',python],{cwd:root,input:JSON.stringify({root,output,files}),encoding:'utf8'});process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
