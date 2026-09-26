#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PNG=ROOT/'assets/mtr-system-map.png'
JS=ROOT/'assets/map-hotspots.js'
NETWORK=ROOT/'assets/network.js'
EXPECTED_SHA256='bf7bb9ebcd912dcb4a47f8e3535b1e988df85c437e66f39e84310c140ca3a5e6'
EXPECTED_W=2048
EXPECTED_H=1379
EXPECTED_STATIONS=98

raw=PNG.read_bytes()
if raw[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit('mtr-system-map.png is not a PNG')
w,h=struct.unpack('>II',raw[16:24])
if (w,h)!=(EXPECTED_W,EXPECTED_H):
    raise SystemExit(f'route map pixel size changed: {(w,h)} != {(EXPECTED_W,EXPECTED_H)}')
sha=hashlib.sha256(raw).hexdigest()
if sha != EXPECTED_SHA256:
    raise SystemExit('route map bytes changed; exact-pixel hotspot registration must be recalibrated')

text=JS.read_text(encoding='utf-8')
m=re.search(r'window\.MTR_MAP_POINTS=(\{.*\});\s*$',text,re.S)
if not m:
    raise SystemExit('map-hotspots.js payload not found')
points=json.loads(m.group(1))
if len(points)!=EXPECTED_STATIONS:
    raise SystemExit(f'expected {EXPECTED_STATIONS} hotspots, found {len(points)}')

network=NETWORK.read_text(encoding='utf-8')
stations=set(re.findall(r"\['[^']+','[^']+','([^']+)'\]",network))
if stations != set(points):
    missing=sorted(stations-set(points)); extra=sorted(set(points)-stations)
    raise SystemExit(f'hotspot/station mismatch missing={missing} extra={extra}')

for name,p in points.items():
    x=float(p['px']); y=float(p['py']); bw=float(p['w']); bh=float(p['h'])
    if not (0 < x < w and 0 < y < h and bw > 0 and bh > 0):
        raise SystemExit(f'invalid hotspot geometry for {name}: {p}')

print(f'route map validated: {w}x{h}, sha256={sha}')
print(f'exact station hotspots validated: {len(points)}')
