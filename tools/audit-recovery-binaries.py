"""Read-only audit of tracked PNG/ZIP/EPK recovery artifacts. Run from repo root."""
import base64
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import zlib
import zipfile


def validate_png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Invalid PNG signature'
    offset = 8
    while offset < len(data):
        assert offset + 12 <= len(data), 'Truncated PNG header'
        size = struct.unpack('>I', data[offset:offset + 4])[0]
        end = offset + 12 + size
        assert end <= len(data), 'Truncated PNG payload'
        assert zlib.crc32(data[offset + 4:end - 4]) & 0xffffffff == struct.unpack('>I', data[end - 4:end])[0], 'PNG CRC mismatch'
        kind = data[offset + 4:offset + 8]
        offset = end
        if kind == b'IEND':
            assert offset == len(data), 'Trailing PNG data'
            return
    raise AssertionError('Missing PNG end')


rows = []
paths = subprocess.check_output(['git', 'ls-files', '-z', '*.png', '*.zip', '*.epk']).split(b'\0')
for raw_path in filter(None, paths):
    path = Path(raw_path.decode())
    data = path.read_bytes()
    row = dict(path=str(path), bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    try:
        if path.suffix == '.png':
            validate_png(data)
            row['validation'] = 'PNG structure and CRC valid'
        elif path.suffix == '.zip':
            with zipfile.ZipFile(path) as archive:
                assert archive.testzip() is None, 'ZIP CRC mismatch'
            row['validation'] = 'ZIP structure and CRC valid'
        else:
            assert data[:8] == b'EAGPKG$$' and data[-8:] == b':::YEE:>', 'Invalid EPK envelope'
            row['validation'] = 'EPK envelope valid; use benchmark-world.mjs for contents'
    except (AssertionError, zipfile.BadZipFile) as error:
        row.update(validation='INVALID', error=str(error))
        # Describe the transport damage without treating a partial decode as recovery.
        encoded = base64.b64encode(data).decode()
        if encoded.startswith('Warningtruncatedoutput'):
            row['transportDamage'] = 'Base64 decoding included a truncated tool-output warning and omitted data'
    rows.append(row)
print(json.dumps(rows, indent=2))
