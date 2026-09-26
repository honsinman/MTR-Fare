#!/usr/bin/env python3
"""Build compact local fare databases and per-origin query shards.

The browser never calls MTR/data.gov.hk. GitHub Actions captures the official CSVs,
then this builder stores both the complete tables and small per-origin JSON shards.
Every source fare column is preserved in both the master database and each shard.
"""
from __future__ import annotations
import csv, datetime, json, os, re, shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data'/'raw'
OUT=ROOT/'data'
ASSETS=ROOT/'assets'

def read_table(name:str):
    p=RAW/name
    with p.open('r',encoding='utf-8-sig',newline='') as f:
        rows=list(csv.reader(f))
    if not rows:
        return {'columns':[],'rows':[]}
    return {'columns':rows[0],'rows':rows[1:]}

def objects(table):
    return [dict(zip(table['columns'],r)) for r in table.get('rows',[])]

def write_json(path:Path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def col(columns,*candidates):
    low={c.lower():c for c in columns}
    for c in candidates:
        if c.lower() in low:return low[c.lower()]
    return None

def clean_dir(p:Path):
    if p.exists(): shutil.rmtree(p)
    p.mkdir(parents=True,exist_ok=True)

def write_shards(table, origin_col, outdir:Path, filename_for_origin):
    cols=table['columns']; idx=cols.index(origin_col)
    groups={}
    for r in table['rows']:
        if idx>=len(r):continue
        origin=str(r[idx]).strip()
        if origin:groups.setdefault(origin,[]).append(r)
    clean_dir(outdir)
    index={}
    for origin,rows in groups.items():
        fn=filename_for_origin(origin)
        if not fn:continue
        payload={'columns':cols,'rows':rows}
        write_json(outdir/f'{fn}.json',payload)
        index[origin]=f'{fn}.json'
    return index

heavy=read_table('mtr_lines_fares.csv')
ael=read_table('airport_express_fares.csv')
stations=read_table('mtr_lines_and_stations.csv')
lrfares=read_table('light_rail_fares.csv')
lrstops=read_table('light_rail_routes_and_stops.csv')
for label,t in [('MTR fares',heavy),('AEL fares',ael),('station list',stations),('Light Rail fares',lrfares),('Light Rail stops',lrstops)]:
    if not t['rows']:raise SystemExit(f'{label} is empty')

built=datetime.datetime.now(datetime.timezone.utc).isoformat()
common={'ready':True,'builtAt':built,'source':'MTR Corporation Open Data snapshot stored in this GitHub repository'}
mtr={**common,'heavyRail':heavy,'airportExpress':ael,'linesAndStations':stations}
lr={**common,'lightRailFares':lrfares,'lightRailRoutesAndStops':lrstops}
write_json(OUT/'mtr.json',mtr); write_json(OUT/'light-rail.json',lr)

# English station name -> station code, from official station list.
sc=col(stations['columns'],'Station Code','STATION_CODE')
ec=col(stations['columns'],'English Name','STATION_NAME','English Station Name')
name_to_code={}
if sc and ec:
    for r in objects(stations):
        n=str(r.get(ec,'')).strip(); c=str(r.get(sc,'')).strip()
        if n and c:name_to_code.setdefault(n,c)

def safe(s):return re.sub(r'[^A-Za-z0-9_-]+','_',s).strip('_') or 'unknown'
def code_for_name(name):return name_to_code.get(name) or safe(name)

h_origin=col(heavy['columns'],'SRC_STATION_NAME')
a_origin=col(ael['columns'],'ST_FROM','SRC_STATION_NAME')
l_origin=col(lrfares['columns'],'from_station_id','SRC_STOP_ID')
if not h_origin: raise SystemExit(f'Cannot identify heavy-rail origin column: {heavy["columns"]}')
if not a_origin: raise SystemExit(f'Cannot identify AEL origin column: {ael["columns"]}')
if not l_origin: raise SystemExit(f'Cannot identify Light Rail origin column: {lrfares["columns"]}')

mtr_index=write_shards(heavy,h_origin,OUT/'fare'/'mtr',code_for_name)
ael_index=write_shards(ael,a_origin,OUT/'fare'/'ael',code_for_name)
lr_index=write_shards(lrfares,l_origin,OUT/'fare'/'light-rail',lambda x:safe(x))
write_json(OUT/'fare-index.json',{'ready':True,'builtAt':built,'mtr':mtr_index,'ael':ael_index,'lightRail':lr_index})

# Keep the complete official AEL table as a tiny bundled fallback too. This is
# useful in a direct HTML preview before Actions has run, and is refreshed by Actions.
ael_fallback={'ready':True,'source':'MTR Corporation Open Data snapshot stored in this GitHub repository','columns':ael['columns'],'rows':ael['rows']}
write_json(OUT/'ael-fallback.json',ael_fallback)
(ASSETS/'ael-fallback.js').write_text('window.AEL_FALLBACK='+json.dumps(ael_fallback,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')

# Build a de-duplicated current Light Rail stop list. It is also emitted as JS so
# station selection works even when previewing the HTML directly from a ZIP.
lc=col(lrstops['columns'],'Stop Code')
li=col(lrstops['columns'],'Stop ID')
lz=col(lrstops['columns'],'Chinese Name')
le=col(lrstops['columns'],'English Name')
stop_by={}
if li:
    for r in objects(lrstops):
        sid=str(r.get(li,'')).strip()
        if not sid:continue
        stop_by.setdefault(sid,{'id':sid,'code':str(r.get(lc,'')).strip() if lc else '', 'zh':str(r.get(lz,'')).strip() if lz else sid,'en':str(r.get(le,'')).strip() if le else sid})

def sid_key(x):
    try:return (0,int(x['id']))
    except:return (1,x['id'])
stop_list=sorted(stop_by.values(),key=sid_key)
write_json(OUT/'light-rail-stops.json',{'ready':True,'builtAt':built,'stops':stop_list})
(ASSETS/'light-rail-stops.js').write_text('window.LIGHT_RAIL_STOPS='+json.dumps(stop_list,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')

print('built master bytes', (OUT/'mtr.json').stat().st_size,(OUT/'light-rail.json').stat().st_size)
print('shards',len(mtr_index),len(ael_index),len(lr_index),'LR stops',len(stop_list))
