import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync,deflateSync} from 'node:zlib';
import {readEPK,crc32} from '../native-bridge/epk.mjs';import {JDK,GRADLE,buildEnvironment} from '../native-bridge/toolchains.mjs';
import {createHash} from 'node:crypto';
import {matchesPayloadPin} from '../native-bridge/input-pins.mjs';
function fixture(names=['assets/test.txt'],compression='0'){
 const uint=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;},text=s=>Buffer.concat([Buffer.from([Buffer.byteLength(s)]),Buffer.from(s)]);
 let body=Buffer.concat([...names.map(name=>{const data=Buffer.from('verified bytes');return Buffer.concat([Buffer.from('FILE'),text(name),uint(data.length+5),uint(crc32(data)),data,Buffer.from(':>')]);}),Buffer.from('END$')]);
 if(compression==='G')body=gzipSync(body);if(compression==='Z')body=deflateSync(body);
 return Buffer.concat([Buffer.from('EAGPKG$$'),text('ver2.0'),text('assets.epk'),Buffer.alloc(10),uint(names.length),Buffer.from(compression),body,Buffer.from(':::YEE:>')]);
}
for(const mode of ['0','G','Z'])test(`EPK ${mode} resources round-trip with checksum verification`,()=>{const files=readEPK(fixture(undefined,mode));assert.equal(files.length,1);assert.equal(files[0].data.toString(),'verified bytes');});
test('EPK rejects corrupt file contents',()=>{const b=fixture();b[b.indexOf('verified bytes')]=0;assert.throws(()=>readEPK(b),/checksum/);});
test('EPK rejects traversal, duplicate names and truncated trailers',()=>{for(const name of ['../escape','/root','assets/../escape','a\\b','C:/escape'])assert.throws(()=>readEPK(fixture([name])),/Unsafe/);assert.throws(()=>readEPK(fixture(['same','same'])),/Duplicate/);assert.throws(()=>readEPK(fixture().subarray(0,-1)),/trailer/);});
test('native toolchains pin downloads and configure only task-local Java and Gradle',()=>{assert.match(JDK.version,/^25\./);assert.equal(GRADLE.version,'9.6.1');for(const pin of[JDK,GRADLE])assert.match(pin.sha256,/^[0-9a-f]{64}$/);const env=buildEnvironment({javaHome:'/task/jdk',gradleHome:'/task/gradle'},{PATH:'/usr/bin',HTTPS_PROXY:'http://proxy.example:1234'});assert.equal(env.JAVA_HOME,'/task/jdk');assert.equal(env.GRADLE_USER_HOME,'/task/gradle');assert.match(env.GRADLE_OPTS,/-Dhttps.proxyHost=proxy.example/);});

test('rebuilding from a certified client never relaxes asset or worker pins',()=>{
 const original=Buffer.from('original'),rebuilt=Buffer.from('rebuilt'),unknown=Buffer.from('unknown');
 const pin=data=>({bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
 const inputs={upstream:'pinned',payloads:{'eag-inline-wasm-br':pin(original),'eag-inline-assets':pin(original)},rebuiltClients:[{...pin(rebuilt),upstream:'pinned'}]};
 assert.equal(matchesPayloadPin('eag-inline-wasm-br',original,inputs),true);
 assert.equal(matchesPayloadPin('eag-inline-wasm-br',rebuilt,inputs),true);
 assert.equal(matchesPayloadPin('eag-inline-wasm-br',unknown,inputs),false);
 assert.equal(matchesPayloadPin('eag-inline-assets',rebuilt,inputs),false);
 assert.equal(matchesPayloadPin('unknown-id',original,inputs),false);
 inputs.rebuiltClients[0].upstream='different';assert.equal(matchesPayloadPin('eag-inline-wasm-br',rebuilt,inputs),false);
});
