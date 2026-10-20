"""Validate newly captured PNG chunks/CRCs, and decode their color diversity."""
import hashlib,json,struct,zlib
from pathlib import Path

def inspect(path):
 data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';pos=8;compressed=b''
 while pos<len(data):
  size=struct.unpack('>I',data[pos:pos+4])[0];kind=data[pos+4:pos+8];payload=data[pos+8:pos+8+size];end=pos+12+size
  assert end<=len(data);assert zlib.crc32(kind+payload)&0xffffffff==struct.unpack('>I',data[end-4:end])[0]
  if kind==b'IHDR':w,h,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',payload)
  if kind==b'IDAT':compressed+=payload
  pos=end
  if kind==b'IEND':assert pos==len(data);break
 else:raise ValueError('missing IEND')
 assert depth==8 and color in (2,6) and interlace==0
 channels=3 if color==2 else 4;stride=w*channels;raw=zlib.decompress(compressed);previous=bytearray(stride);colors=set()
 for y in range(h):
  offset=y*(stride+1);f=raw[offset];row=bytearray(raw[offset+1:offset+1+stride])
  for x in range(stride):
   a=row[x-channels] if x>=channels else 0;b=previous[x];c=previous[x-channels] if x>=channels else 0
   if f==1:p=a
   elif f==2:p=b
   elif f==3:p=(a+b)//2
   elif f==4:
    p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c);p=a if pa<=pb and pa<=pc else b if pb<=pc else c
   else:assert f==0;p=0
   row[x]=(row[x]+p)&255
  colors.update(bytes(row[x:x+channels]) for x in range(0,stride,channels));previous=row
 return dict(path=str(path),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),width=w,height=h,distinctColors=len(colors),validation='PNG structure/CRC/decompression passed')
rows=[inspect(p) for p in sorted(Path('diagnostics/module-phase6').glob('*.png'))]
Path('reports/module-phase6/binary-integrity.json').write_text(json.dumps(rows,indent=2)+'\n')
for r in rows:
 if 'game-canvas' in r['path']:print(json.dumps(r))
