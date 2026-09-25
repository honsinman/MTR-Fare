#!/usr/bin/env python3
import csv, json, os, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW=os.path.join(ROOT,'data','raw')
OUT=os.path.join(ROOT,'data')

def table(name):
    p=os.path.join(RAW,name)
    if not os.path.exists(p):
        return {'columns':[],'rows':[]}
    with open(p,'r',encoding='utf-8-sig',newline='') as f:
        rd=csv.reader(f)
        rows=list(rd)
    if not rows:return {'columns':[],'rows':[]}
    header=[x.strip() for x in rows[0]]
    data=[]
    for r in rows[1:]:
        if not any(str(x).strip() for x in r):continue
        if len(r)<len(header):r=r+['']*(len(header)-len(r))
        data.append(r[:len(header)])
    return {'columns':header,'rows':data}

def write(name,obj):
    with open(os.path.join(OUT,name),'w',encoding='utf-8') as f:
        json.dump(obj,f,ensure_ascii=False,separators=(',',':'))

stamp=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()
common={'ready':True,'generatedAt':stamp,'provider':'MTR Corporation Limited','storage':'Static GitHub Pages database generated from CSV snapshots stored in this repository'}
mtr={**common,'heavyRail':table('mtr_lines_fares.csv'),'airportExpress':table('airport_express_fares.csv'),'linesAndStations':table('mtr_lines_and_stations.csv')}
lr={**common,'lightRailFares':table('light_rail_fares.csv'),'lightRailRoutesAndStops':table('light_rail_routes_and_stops.csv')}
bus={**common,'mtrBusFares':table('mtr_bus_fares.csv'),'mtrBusRoutes':table('mtr_bus_routes.csv'),'mtrBusStops':table('mtr_bus_stops.csv')}
if not mtr['heavyRail']['rows']:raise SystemExit('mtr_lines_fares.csv empty')
if not lr['lightRailFares']['rows']:raise SystemExit('light_rail_fares.csv empty')
if not bus['mtrBusFares']['rows']:raise SystemExit('mtr_bus_fares.csv empty')
write('mtr.json',mtr);write('light-rail.json',lr);write('mtr-bus.json',bus)
print('Built:',{k:os.path.getsize(os.path.join(OUT,k)) for k in ['mtr.json','light-rail.json','mtr-bus.json']})
