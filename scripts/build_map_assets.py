#!/usr/bin/env python3
"""Render the exact official MTR PDF and create station hit targets.

Station labels are located from PDF text. Where possible, each click target is
snapped to the nearest small vector station symbol next to that label, which is
more accurate than placing a target on the text itself.
"""
from __future__ import annotations
import csv,json,math,os
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
pdf=ROOT/'assets'/'mtr-system-map.pdf'; png=ROOT/'assets'/'mtr-system-map.png'; js=ROOT/'assets'/'map-hotspots.js'; csvp=ROOT/'data'/'raw'/'mtr_lines_and_stations.csv'
COLORS={'AEL':'#00888A','TCL':'#F7943E','TML':'#923011','TKL':'#7D499D','EAL':'#53B7E8','SIL':'#BAC429','TWL':'#ED1D24','ISL':'#007DC5','KTL':'#00AB4E','DRL':'#F173AC'}
ALIASES={
 'HKU':['HKU','Hong Kong University'],
 'AsiaWorld-Expo':['AsiaWorld-Expo','AsiaWorld Expo'],
 'LOHAS Park':['LOHAS Park','LOHAS'],
 'East Tsim Sha Tsui':['East Tsim Sha Tsui'],
 'Exhibition Centre':['Exhibition Centre'],
 'Disneyland Resort':['Disneyland Resort'],
}

def pick_key(row,terms):
    for k in row:
        u=k.upper()
        if all(t in u for t in terms):return k
    return None
stations={}
with csvp.open('r',encoding='utf-8-sig',newline='') as f:
    for row in csv.DictReader(f):
        lk=pick_key(row,['LINE','CODE'])
        ek=next((k for k in row if ('ENGLISH' in k.upper() or 'ENG' in k.upper()) and 'NAME' in k.upper()),None)
        if not ek: ek=next((k for k in row if 'STATION_NAME' in k.upper() and 'CHI' not in k.upper()),None)
        if not ek: continue
        name=(row.get(ek) or '').strip(); line=(row.get(lk) or '').strip() if lk else ''
        if name and name not in stations:stations[name]=COLORS.get(line,'#111827')

doc=fitz.open(pdf); page=doc[0]; rect=page.rect; W,H=rect.width,rect.height
pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False); pix.save(png)

# Candidate station symbols from PDF vector drawings. Text glyphs do not appear
# here; this primarily yields route lines, nodes and icons. Keep compact,
# near-square shapes and snap only when they are close to a station label.
symbols=[]
try:
    for d in page.get_drawings():
        r=d.get('rect')
        if not r: continue
        w,h=float(r.width),float(r.height)
        if 1.2<=w<=18 and 1.2<=h<=18 and max(w,h)/max(min(w,h),.1)<=2.2:
            symbols.append(((r.x0+r.x1)/2,(r.y0+r.y1)/2,w,h))
except Exception:
    symbols=[]

def dist_to_rect(px,py,r):
    dx=max(r.x0-px,0,px-r.x1); dy=max(r.y0-py,0,py-r.y1)
    return math.hypot(dx,dy)

def choose_text_hit(name):
    hits=[]
    for q in ALIASES.get(name,[name]):
        hits.extend(page.search_for(q))
    if not hits:return None
    cand=[]
    for r in hits:
        cx=(r.x0+r.x1)/2; cy=(r.y0+r.y1)/2
        # Avoid footer/legend copies and large headings.
        if cy/H>.88 and cx/W<.40: continue
        if r.height>24: continue
        score=r.height + (1.0 if cy/H>.84 else 0) + (0.6 if cx/W<.03 or cx/W>.97 else 0)
        cand.append((score,r))
    if not cand:cand=[(r.height,r) for r in hits]
    return min(cand,key=lambda x:x[0])[1]

points={}; missing=[]; snapped=0
for name,color in stations.items():
    r=choose_text_hit(name)
    if r is None:
        missing.append(name);continue
    # Prefer a compact vector node close to the label. A 28pt radius allows
    # labels placed above/below/alongside the station symbol.
    near=[]
    for sx,sy,sw,sh in symbols:
        d=dist_to_rect(sx,sy,r)
        if d<=28:near.append((d,abs(sw-sh),sw*sh,sx,sy))
    if near:
        # nearest, then most circle-like, then smaller area
        _,_,_,cx,cy=min(near,key=lambda x:(x[0],x[1],x[2])); snapped+=1
    else:
        # Fallback: left edge / vertical centre of the station label, where MTR
        # route maps conventionally place the symbol next to the text.
        cx=max(0,r.x0-3.0); cy=(r.y0+r.y1)/2
    points[name]={'cx':round(cx/W*100,3),'cy':round(cy/H*100,3),'color':color}

with js.open('w',encoding='utf-8') as f:
    f.write('// Auto-generated from the exact official MTR route-map PDF.\nwindow.MTR_MAP_POINTS=')
    json.dump(points,f,ensure_ascii=False,separators=(',',':'));f.write(';\n')
print('hotspots',len(points),'snapped_to_vector_node',snapped,'missing',len(missing))
if missing:print('missing:',', '.join(missing))
# The exact map image is still useful even if a future PDF label changes. Do not
# block Pages deployment solely because one label could not be auto-located.
if len(points)<80: raise SystemExit('Too few station labels found in official PDF; refusing badly incomplete click layer')
