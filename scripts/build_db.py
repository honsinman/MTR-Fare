import csv,json,os,sys,datetime
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw=os.path.join(root,'data','raw')
def rows(name):
    p=os.path.join(raw,name)
    if not os.path.exists(p): return []
    with open(p,'r',encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
out={
 'ready':True,'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'source':'MTR Corporation Limited official Open Data snapshots stored in this GitHub repository',
 'heavyRail':rows('mtr_lines_fares.csv'),'airportExpress':rows('airport_express_fares.csv'),
 'linesAndStations':rows('mtr_lines_and_stations.csv'),'lightRail':rows('light_rail_fares.csv'),
 'lightRailRoutesAndStops':rows('light_rail_routes_and_stops.csv'),'mtrBusFares':rows('mtr_bus_fares.csv'),
 'mtrBusRoutes':rows('mtr_bus_routes.csv'),'mtrBusStops':rows('mtr_bus_stops.csv')}
if not out['heavyRail']:sys.exit('heavy rail fare CSV missing')
with open(os.path.join(root,'data','fares-db.json'),'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
print('rows', {k:len(v) for k,v in out.items() if isinstance(v,list)})
