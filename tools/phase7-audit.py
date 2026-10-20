"""Read-only PNG structure, CRC, pixel stream length and artifact hash audit."""
from pathlib import Path
import json,hashlib,struct,zlib
rows=[]
for path in sorted(Path('diagnostics/desktop-phase7').glob('*.png')):
 data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';offset=8;compressed=b'';ended=False
 while offset<len(data):
  size=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+size];end=offset+12+size
  assert end<=len(data) and zlib.crc32(kind+payload)&0xffffffff==struct.unpack('>I',data[end-4:end])[0]
  if kind==b'IHDR':w,h,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',payload)
  if kind==b'IDAT':compressed+=payload
  offset=end
  if kind==b'IEND':assert offset==len(data);ended=True;break
 assert ended and depth==8 and color in (2,6) and interlace==0
 raw=zlib.decompress(compressed);assert len(raw)==h*(1+w*(3 if color==2 else 4))
 rows.append(dict(path=str(path),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),width=w,height=h,validation='PNG structure, CRC and decompressed stream size passed'))
Path('reports/desktop-phase7/binary-integrity.json').write_text(json.dumps(rows,indent=2)+'\n')
print(f'{len(rows)} new PNGs valid; historical PNGs untouched')
