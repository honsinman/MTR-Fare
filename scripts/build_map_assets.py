#!/usr/bin/env python3
import csv,json,os,sys
import fitz
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf=os.path.join(ROOT,'assets','mtr-system-map.pdf'); png=os.path.join(ROOT,'assets','mtr-system-map.png'); js=os.path.join(ROOT,'assets','map-hotspots.js'); csvp=os.path.join(ROOT,'data','raw','mtr_lines_and_stations.csv')
COLORS={'AEL':'#00888A','TCL':'#F7943E','TML':'#923011','TKL':'#7D499D','EAL':'#53B7E8','SIL':'#BAC429','TWL':'#ED1D24','ISL':'#007DC5','KTL':'#00AB4E','DRL':'#F173AC'}
alias={'HKU':['HKU','Hong Kong University'],'AsiaWorld-Expo':['AsiaWorld-Expo','AsiaWorld Expo'],'LOHAS Park':['LOHAS Park'],'East Tsim Sha Tsui':['East Tsim Sha Tsui'],'Exhibition Centre':['Exhibition Centre']}
# unique station English name -> first line color
stations={}
with open(csvp,'r',encoding='utf-8-sig',newline='') as f:
 r=csv.DictReader(f)
 for row in r:
  keys={k.upper():k for k in row}
  lk=next((keys[k] for k in keys if 'LINE' in k and 'CODE' in k),None)
  ek=next((keys[k] for k in keys if ('ENGLISH' in k or 'ENG' in k) and 'NAME' in k),None)
  if not ek: ek=next((k for k in row if 'STATION_NAME' in k.upper() and 'CHI' not in k.upper()),None)
  if not ek: continue
  name=(row.get(ek) or '').strip(); line=(row.get(lk) or '').strip() if lk else ''
  if name and name not in stations: stations[name]=COLORS.get(line,'#111827')
doc=fitz.open(pdf); page=doc[0]; rect=page.rect; W,H=rect.width,rect.height
# render exact page artwork at 144 dpi
pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False); pix.save(png)
points={}; missing=[]
for name,color in stations.items():
 hits=[]
 for q in alias.get(name,[name]):
  hits.extend(page.search_for(q))
 if not hits:
  missing.append(name); continue
 # remove likely legend/footer hits; prefer smaller station-label text and central map body
 cand=[]
 for r in hits:
  cx=(r.x0+r.x1)/2; cy=(r.y0+r.y1)/2
  if cy/H>.86 and cx/W<.35: continue
  if r.height>22: continue
  score=r.height + (0.8 if cy/H>.82 else 0) + (0.5 if cx/W<.05 or cx/W>.97 else 0)
  cand.append((score,r))
 if not cand: cand=[(r.height,r) for r in hits]
 r=min(cand,key=lambda x:x[0])[1]
 # clickable label bbox, padded; marker sits just left of bbox via CSS
 pad=2.5; x=max(0,r.x0-pad); y=max(0,r.y0-pad); w=min(W-x,r.width+2*pad); h=min(H-y,r.height+2*pad)
 points[name]={'x':round(x/W*100,3),'y':round(y/H*100,3),'w':round(max(w/W*100,1.5),3),'h':round(max(h/H*100,1.8),3),'color':color}
with open(js,'w',encoding='utf-8') as f:
 f.write('// Auto-generated from text positions in the exact official MTR route-map PDF.\nwindow.MTR_MAP_POINTS=')
 json.dump(points,f,ensure_ascii=False,separators=(',',':')); f.write(';\n')
print('hotspots',len(points),'missing',len(missing))
if missing: print('missing:',', '.join(missing))
# Fail only if seriously incomplete; exact names in the PDF should normally resolve almost all stations.
if len(points)<90: raise SystemExit('Too few station labels found in official PDF')
