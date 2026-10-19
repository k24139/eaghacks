import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function gameplaySourceDigest(){
 const files=[];async function scan(directory,extension){for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())await scan(path,extension);else if(entry.isFile()&&path.endsWith(extension))files.push(path);}}
 await scan(resolve(root,'src'),'.js');await scan(resolve(root,'native-bridge/upstream'),'.java');for(const path of ['native-bridge/apply-native-bridge.mjs','native-bridge/input-pins.mjs','native-bridge/prepare-from-html.mjs','native-bridge/inputs.json','native-bridge/replace-client-payload.mjs','native-bridge/build-native-client.mjs','package.json','package-lock.json','build.mjs','tools/standalone-html.mjs','tools/inject-eaglercraft.mjs'])files.push(resolve(root,path));
 const hash=createHash('sha256');for(const path of files.sort()){hash.update(relative(root,path));hash.update('\0');hash.update(await readFile(path));hash.update('\0');}return hash.digest('hex');
}
