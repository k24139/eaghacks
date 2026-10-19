import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
export const JDK={version:'25.0.4.1+1',directory:'jdk-25.0.4.1+1',url:'https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_linux_hotspot_25.0.4.1_1.tar.gz',sha256:'dbb698396d478e7fa2b1e50f4103324b2a99b90569ee27c33f2261f9215cf41e'};
export const GRADLE={version:'9.6.1',url:'https://github.com/gradle/gradle-distributions/releases/download/v9.6.1/gradle-9.6.1-bin.zip',wrapperURL:'https://services.gradle.org/distributions/gradle-9.6.1-bin.zip',sha256:'9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14'};
const hash=(kind,data)=>createHash(kind).update(data).digest('hex');
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw Error(`${cmd} failed: ${r.status}`);}
async function download(path,pin){if(!existsSync(path))run('curl',['-fL','--retry','2','--connect-timeout','20','--max-time','300','-o',path,pin.url]);if(hash('sha256',await readFile(path))!==pin.sha256)throw Error(`Checksum mismatch: ${path}`);}
export async function prepareToolchains(directory,env=process.env){
 const root=resolve(directory);await mkdir(root,{recursive:true});let javaHome=env.JAVA_HOME;
 const javac=javaHome&&spawnSync(join(javaHome,'bin/javac'),['-version'],{encoding:'utf8'});
 if(!javac||javac.status!==0||!/^javac 25(?:[.\s]|$)/.test(javac.stdout)){
  if(process.platform!=='linux'||process.arch!=='x64')throw Error('Set JAVA_HOME to a Java 25 JDK');javaHome=join(root,JDK.directory);
  if(!existsSync(join(javaHome,'bin/javac'))){const archive=join(root,'jdk25.tar.gz');await download(archive,JDK);run('tar',['--no-same-owner','-xzf',archive,'-C',root]);}
 }
 for(const tool of ['java','javac']){const r=spawnSync(join(javaHome,'bin',tool),['-version'],{encoding:'utf8'}),text=r.stdout+r.stderr;if(r.status!==0||!(tool==='java'?/version "25[."]/.test(text):/^javac 25[.\s]/.test(text)))throw Error(`Java 25 required: ${text}`);console.log(text.trim());}
 const gradleHome=resolve(root,'../gradle'),archive=join(root,'gradle-9.6.1-bin.zip');await download(archive,GRADLE);
 const key=BigInt('0x'+hash('md5',GRADLE.wrapperURL)).toString(36),cache=join(gradleHome,'wrapper/dists/gradle-9.6.1-bin',key);await mkdir(cache,{recursive:true});await copyFile(archive,join(cache,'gradle-9.6.1-bin.zip'));
 await writeFile(join(root,'toolchain-inputs.json'),JSON.stringify({jdk:JDK,gradle:GRADLE},null,2));return{javaHome,gradleHome};
}
export function buildEnvironment({javaHome,gradleHome},original=process.env){const env={...original,JAVA_HOME:javaHome,GRADLE_USER_HOME:gradleHome,PATH:join(javaHome,'bin')+':'+original.PATH},props=[];
 const proxy=original.HTTPS_PROXY||original.https_proxy;if(proxy){const u=new URL(proxy);for(const scheme of ['http','https'])props.push(`-D${scheme}.proxyHost=${u.hostname}`,`-D${scheme}.proxyPort=${u.port||80}`);}
 if(existsSync('/etc/ssl/certs/java/cacerts'))props.push('-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts');env.GRADLE_OPTS=[original.GRADLE_OPTS||'',...props].join(' ');return env;}
