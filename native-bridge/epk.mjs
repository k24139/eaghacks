import { gunzipSync, inflateSync } from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function readEPK(bytes){
  if(bytes.subarray(0,8).toString()!=='EAGPKG$$')throw Error('Invalid EPK header');
  if(bytes.subarray(-8).toString()!==':::YEE:>')throw Error('Invalid EPK trailer');
  let data=bytes.subarray(8,-8),p=0;
  const take=n=>{if(n<0||p+n>data.length)throw Error('Truncated EPK');const v=data.subarray(p,p+n);p+=n;return v;};
  const u8=()=>take(1)[0],u16=()=>take(2).readUInt16BE(),u32=()=>take(4).readUInt32BE(),str=()=>take(u8()).toString('utf8');
  if(!str().startsWith('ver2.'))throw Error('Unsupported EPK version');str();take(u16());take(8);const count=u32(),compression=String.fromCharCode(u8());
  data=take(data.length-p);if(compression==='G')data=gunzipSync(data);else if(compression==='Z')data=inflateSync(data);else if(compression!=='0')throw Error('Unsupported EPK compression');p=0;
  const files=[],names=new Set();
  for(let i=0;i<count;i++){
    const type=take(4).toString(),name=str(),length=u32();
    if(type==='FILE'){
      if(!name||name.startsWith('/')||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').some(x=>x==='.'||x==='..'||!x))throw Error('Unsafe EPK path');
      if(names.has(name))throw Error('Duplicate EPK path');names.add(name);
      if(length<5)throw Error('Invalid EPK file size');const checksum=u32(),content=take(length-5);if(crc32(content)!==checksum)throw Error('Invalid EPK checksum');
      if(take(1).toString()!==':')throw Error('Invalid EPK file terminator');files.push({name,data:content});
    }else take(length);
    if(take(1).toString()!=='>')throw Error('Invalid EPK object terminator');
  }
  if(take(4).toString()!=='END$'||p!==data.length)throw Error('Invalid EPK end');return files;
}
