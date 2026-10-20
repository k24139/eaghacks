import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {readEPK} from '../native-bridge/epk.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Bounded big-endian Java NBT reader, including modern section long arrays. */
export function readNBT(input) {
 const data=input[0]===0x1f&&input[1]===0x8b?gunzipSync(input):input;let offset=0;
 const take=n=>{assert.ok(n>=0&&offset+n<=data.length,'Truncated NBT');const b=data.subarray(offset,offset+n);offset+=n;return b;};
 const u8=()=>take(1)[0],i32=()=>take(4).readInt32BE();
 const string=()=>take(take(2).readUInt16BE()).toString('utf8');
 const length=()=>{const n=i32();assert.ok(n>=0&&n<=data.length,'Invalid NBT array length');return n;};
 function value(type,depth=0){
  assert.ok(depth<64,'NBT nesting limit');
  switch(type){
   case 1:return take(1).readInt8();case 2:return take(2).readInt16BE();case 3:return i32();
   case 4:return take(8).readBigInt64BE();case 5:return take(4).readFloatBE();case 6:return take(8).readDoubleBE();
   case 7:return take(length());case 8:return string();
   case 9:{const child=u8(),n=length();return Array.from({length:n},()=>value(child,depth+1));}
   case 10:{const out=Object.create(null);for(let child;(child=u8())!==0;){const name=string();assert.ok(!Object.hasOwn(out,name),'Duplicate NBT key');out[name]=value(child,depth+1);}return out;}
   case 11:return Array.from({length:length()},i32);
   case 12:return Array.from({length:length()},()=>take(8).readBigInt64BE());
   default:throw Error('Unsupported NBT type '+type);
  }
 }
 const type=u8();assert.equal(type,10,'Expected compound NBT root');string();const out=value(type);
 assert.equal(offset,data.length,'Trailing NBT data');return out;
}

export function worldFiles(bytes){return readEPK(bytes);}

export function inspectBenchmarkWorld(bytes){
 const files=worldFiles(bytes),byName=new Map(files.map(f=>[f.name,f.data]));
 const level=readNBT(byName.get('level.dat')).Data;
 const generation=readNBT(byName.get('data/minecraft/world_gen_settings.dat')).data;
 const chunks=new Map();
 for(const file of files.filter(f=>f.name.startsWith('minecraft_overworld/chunk/'))){
  const chunk=readNBT(file.data);chunks.set(`${chunk.xPos},${chunk.zPos}`,chunk);
 }
 const block=(x,y,z)=>{
  const chunk=chunks.get(`${Math.floor(x/16)},${Math.floor(z/16)}`);
  assert.ok(chunk,'Missing terrain chunk');const states=chunk.sections.find(s=>s.Y===Math.floor(y/16))?.block_states;
  if(!states)return 'minecraft:air';const palette=states.palette;
  if(palette.length===1)return palette[0].Name;
  const bits=Math.max(4,Math.ceil(Math.log2(palette.length))),perLong=Math.floor(64/bits);
  const mod=n=>(n%16+16)%16,index=mod(y)*256+mod(z)*16+mod(x);
  const packed=BigInt.asUintN(64,states.data[Math.floor(index/perLong)]);
  return palette[Number((packed>>BigInt(index%perLong*bits))&((1n<<BigInt(bits))-1n))].Name;
 };
 let platformBlocks=0;
 for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++){
  assert.equal(block(x,149,z),'minecraft:stone',`Stone platform at ${x},149,${z}`);platformBlocks++;
  assert.equal(block(x,150,z),'minecraft:air','Clear space above platform');
 }
 const ground=[[-64,'minecraft:bedrock'],[-63,'minecraft:dirt'],[-62,'minecraft:dirt'],[-61,'minecraft:grass_block'],[-60,'minecraft:air']];
 for(const [y,name]of ground)assert.equal(block(0,y,0),name,`Superflat layer at ${y}`);
 assert.equal(level.LevelName,'Eaghacks Benchmark 2026');assert.equal(level.GameType,1);
 assert.equal(level.allowCommands,1);assert.equal(level.difficulty_settings.difficulty,'peaceful');
 assert.equal(generation.seed,20261019n);assert.equal(generation.generate_structures,0);assert.equal(generation.bonus_chest,0);
 assert.equal(generation.dimensions['minecraft:overworld'].generator.type,'minecraft:flat');
 const playerFile=files.find(f=>f.name.startsWith('players/data/')&&f.name.endsWith('.dat'));
 assert.ok(playerFile);const player=readNBT(playerFile.data);
 assert.deepEqual(player.Pos,[0.5,150,0.5]);assert.deepEqual(player.Rotation,[0,20]);
 return {bytes:bytes.length,sha256:sha256(bytes),files:files.length,overworldChunks:chunks.size,
  name:level.LevelName,seed:generation.seed.toString(),generator:'minecraft:flat',gameMode:'creative',difficulty:'peaceful',
  structures:false,bonusChest:false,commands:true,platform:{min:[-8,149,-8],max:[8,149,8],stoneBlocks:platformBlocks},
  superflatLayers:ground,player:{position:player.Pos,rotation:player.Rotation},
  worldUUID:level.singleplayer_uuid,worldGenerationSHA256:sha256(byName.get('data/minecraft/world_gen_settings.dat'))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.ok(process.argv[2],'Usage: node tools/benchmark-world.mjs <world.epk>');
 console.log(JSON.stringify(inspectBenchmarkWorld(await readFile(process.argv[2])),null,2));
}
