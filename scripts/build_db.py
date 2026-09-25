#!/usr/bin/env python3
import csv,json,os,datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW=os.path.join(ROOT,'data','raw'); OUT=os.path.join(ROOT,'data'); os.makedirs(OUT,exist_ok=True)
def table(name):
 p=os.path.join(RAW,name)
 with open(p,'r',encoding='utf-8-sig',newline='') as f:
  rd=csv.reader(f); rows=list(rd)
 if not rows:return {'columns':[],'rows':[]}
 return {'columns':rows[0],'rows':rows[1:]}
def write(name,obj):
 with open(os.path.join(OUT,name),'w',encoding='utf-8') as f:json.dump(obj,f,ensure_ascii=False,separators=(',',':'))
common={'ready':True,'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'MTR Corporation Open Data snapshot stored in this GitHub repository'}
mtr={**common,'heavyRail':table('mtr_lines_fares.csv'),'airportExpress':table('airport_express_fares.csv'),'linesAndStations':table('mtr_lines_and_stations.csv')}
lr={**common,'lightRailFares':table('light_rail_fares.csv'),'lightRailRoutesAndStops':table('light_rail_routes_and_stops.csv')}
if not mtr['heavyRail']['rows']:raise SystemExit('mtr_lines_fares.csv empty')
if not mtr['airportExpress']['rows']:raise SystemExit('airport_express_fares.csv empty')
if not lr['lightRailFares']['rows']:raise SystemExit('light_rail_fares.csv empty')
write('mtr.json',mtr);write('light-rail.json',lr)
print('built',os.path.getsize(os.path.join(OUT,'mtr.json')),os.path.getsize(os.path.join(OUT,'light-rail.json')))
