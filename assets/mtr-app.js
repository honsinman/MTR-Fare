(()=>{'use strict';
const LINES=window.MTR_LINES||[], BY=window.MTR_LINE_BY_ID||{};
const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
const BASE=window.MTR_BASE||'./';
const T={
 zh:{low:'低數據模式',mtr:'港鐵',lr:'輕鐵',select:'選擇車站',from:'起點',to:'終點',line:'路綫',station:'車站',calc:'計算車費',fare:'成人八達通',now:'本次',used:'已用',data:'數據',officialMap:'港鐵官方路綫圖',mapHint:'官方 PDF 原圖・點車站選擇',fit:'合適大小',source:'車費只讀取儲存在本 GitHub Pages 的本地資料庫。',same:'請選擇兩個不同車站',missing:'車費資料尚未同步',notfound:'找不到這組車費'},
 en:{low:'Low Data Mode',mtr:'MTR',lr:'Light Rail',select:'Select stations',from:'From',to:'To',line:'Line',station:'Station',calc:'Calculate Fare',fare:'Adult Octopus',now:'This',used:'Used',data:'Data',officialMap:'Official MTR system map',mapHint:'Exact official PDF artwork · tap a station',fit:'Fit',source:'Fares are read only from the local database stored on this GitHub Pages site.',same:'Choose two different stations',missing:'Fare data has not been synced yet',notfound:'Fare not found'}
};
let lang='zh'; try{lang=localStorage.getItem('mtr-fare-lang')==='en'?'en':'zh'}catch{}
let sessionRequests=0, mapNext='from';
const state={from:{line:'AEL',station:'Airport'},to:{line:'TCL',station:'Kowloon'}};
const tr=k=>T[lang][k]||k;
function totalReq(){try{return Number(localStorage.getItem('mtr_fare_total_requests')||0)}catch{return 0}}
function setTotalReq(n){try{localStorage.setItem('mtr_fare_total_requests',String(n))}catch{}}
function totalBytes(){try{return Number(localStorage.getItem('mtr_fare_total_bytes')||0)}catch{return 0}}
function addTotalBytes(n){if(!(n>0))return;try{localStorage.setItem('mtr_fare_total_bytes',String(totalBytes()+n))}catch{}}
function fmtKB(n){return `${(Number(n||0)/1024).toFixed(1)} KB`}
function usage(){$('sessionRequests').textContent=String(sessionRequests);$('totalRequests').textContent=String(totalReq());$('totalData').textContent=fmtKB(totalBytes())}
function countLookup(bytes){sessionRequests++;setTotalReq(totalReq()+1);addTotalBytes(bytes||0);usage()}
function textBytes(s){return new TextEncoder().encode(String(s||'')).length}
async function fetchJsonCount(url){
 try{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));const txt=await r.text();return{data:JSON.parse(txt),bytes:textBytes(txt)}}catch{return{data:null,bytes:0}}
}
function lineLabel(l){return lang==='zh'?l.zh:l.en} function stationLabel(s){return lang==='zh'?s[1]:s[2]}
function fillLines(side){const sel=$(`${side}Line`),cur=state[side].line;sel.innerHTML='';for(const l of LINES){const o=document.createElement('option');o.value=l.id;o.textContent=lineLabel(l);o.selected=l.id===cur;sel.appendChild(o)}updateLine(side)}
function updateLine(side){const l=BY[state[side].line]||LINES[0];if(!l)return;const ls=$(`${side}LineWrap`),ss=$(`${side}StationWrap`);ls.style.setProperty('--mtr-line',l.color);ss.style.setProperty('--mtr-line',l.color);const stSel=$(`${side}Station`);let cur=state[side].station;stSel.innerHTML='';for(const s of l.stations){const o=document.createElement('option');o.value=s[2];o.textContent=stationLabel(s);stSel.appendChild(o)}if(![...stSel.options].some(o=>o.value===cur))cur=stSel.options[0]?.value||'';state[side].station=cur;stSel.value=cur}
function renderAll(){for(const side of ['from','to'])fillLines(side)}
function applyLang(){document.documentElement.lang=lang==='zh'?'zh-Hant':'en';$$('[data-i18n]').forEach(e=>e.textContent=tr(e.dataset.i18n));$('langBtn').textContent=lang==='zh'?'EN':'繁';renderAll();usage()}
function stationCode(name){for(const l of LINES)for(const s of l.stations)if(s[2]===name)return s[0];return String(name||'').replace(/[^A-Za-z0-9_-]+/g,'_')}
function rows(table){if(!table?.columns||!table?.rows)return[];return table.rows.map(r=>Object.fromEntries(table.columns.map((c,i)=>[c,r[i]])))}
function findCol(obj,names){const ks=Object.keys(obj||{}),low=Object.fromEntries(ks.map(k=>[k.toLowerCase(),k]));for(const n of names){if(low[n.toLowerCase()])return low[n.toLowerCase()]}return null}
function fareFromTable(table,a,b,kind){const rr=rows(table);if(!rr.length)return null;const o=rr[0];const ak=kind==='ael'?findCol(o,['ST_FROM','SRC_STATION_NAME']):findCol(o,['SRC_STATION_NAME']);const bk=kind==='ael'?findCol(o,['ST_TO','DEST_STATION_NAME']):findCol(o,['DEST_STATION_NAME']);const fk=findCol(o,['OCT_ADT_FARE']);if(!ak||!bk||!fk)return null;for(const r of rr){if(String(r[ak]).trim()===a&&String(r[bk]).trim()===b){const f=Number(r[fk]);if(Number.isFinite(f))return f}}return null}
async function shardFare(kind,a,b){let bytes=0;const code=stationCode(a);const q=await fetchJsonCount(`${BASE}data/fare/${kind}/${encodeURIComponent(code)}.json`);bytes+=q.bytes;let fare=fareFromTable(q.data,a,b,kind);if(Number.isFinite(fare))return{fare,bytes};const code2=stationCode(b);if(code2!==code){const q2=await fetchJsonCount(`${BASE}data/fare/${kind}/${encodeURIComponent(code2)}.json`);bytes+=q2.bytes;fare=fareFromTable(q2.data,b,a,kind);if(Number.isFinite(fare))return{fare,bytes}}return{fare:null,bytes}}
async function aelDatabase(){const q=await fetchJsonCount(`${BASE}data/ael-fallback.json`);if(q.data?.rows?.length)return q;const f=window.AEL_FALLBACK||null;const txt=f?JSON.stringify(f):'';return{data:f,bytes:textBytes(txt)}}
function aelFareFrom(db,a,b){return fareFromTable(db,a,b,'ael')}
function buildGraph(){const g=new Map(),add=(a,b)=>{if(!g.has(a))g.set(a,new Set());if(!g.has(b))g.set(b,new Set());g.get(a).add(b);g.get(b).add(a)};for(const l of LINES){if(l.id==='AEL')continue;for(let i=1;i<l.stations.length;i++)add(l.stations[i-1][2],l.stations[i][2])}add('Hong Kong','Central');add('Tsim Sha Tsui','East Tsim Sha Tsui');return g}
const GRAPH=buildGraph();
function hops(a,b){if(a===b)return 0;const q=[[a,0]],seen=new Set([a]);while(q.length){const [x,d]=q.shift();for(const n of GRAPH.get(x)||[]){if(n===b)return d+1;if(!seen.has(n)){seen.add(n);q.push([n,d+1])}}}return 999}
async function aelOrMixedFare(a,b,fromLine,toLine){const aelDb=await aelDatabase();let bytes=aelDb.bytes;const db=aelDb.data;const airportSide=new Set(['Airport','AsiaWorld-Expo']);const aAir=airportSide.has(a),bAir=airportSide.has(b);const wantsAel=aAir||bAir||fromLine==='AEL'||toLine==='AEL';if(!wantsAel)return{fare:null,bytes:0,handled:false};
 let f=aelFareFrom(db,a,b);if(Number.isFinite(f))return{fare:f,bytes,handled:true};
 // Free MTR connection: Airport Express passengers may connect at Hong Kong,
 // Kowloon or Tsing Yi; the immediately connecting MTR journey is free under
 // the official conditions. Pick the city station requiring the fewest MTR hops.
 if(aAir!==bAir){const airport=aAir?a:b,other=aAir?b:a;let best=null;for(const via of ['Hong Kong','Kowloon','Tsing Yi']){const af=aelFareFrom(db,airport,via)??aelFareFrom(db,via,airport);if(!Number.isFinite(af))continue;const d=hops(via,other);const cand={fare:af,d};if(!best||cand.d<best.d||(cand.d===best.d&&cand.fare<best.fare))best=cand}if(best)return{fare:best.fare,bytes,handled:true}}
 // If this was explicitly selected as Airport Express but the bundled fallback
 // lacks the city-to-city pair, try the Action-built official AEL shard.
 const sh=await shardFare('ael',a,b);bytes+=sh.bytes;if(Number.isFinite(sh.fare))return{fare:sh.fare,bytes,handled:true};return{fare:null,bytes,handled:true}}
function showResult(r){$('result').classList.remove('hidden');$('fareMsg').textContent='';if(r.error){$('fareValue').textContent='—';$('fareMsg').textContent=r.error;return}$('fareValue').innerHTML=`<span class="currency">$</span>${Number(r.fare).toFixed(1)}`}
async function calculate(){const a=state.from.station,b=state.to.station;if(!a||!b||a===b){countLookup(0);return showResult({error:tr('same')})}let bytes=0;const ae=await aelOrMixedFare(a,b,state.from.line,state.to.line);bytes+=ae.bytes;if(ae.handled){countLookup(bytes);return showResult(Number.isFinite(ae.fare)?{fare:ae.fare}:{error:tr('notfound')})}const h=await shardFare('mtr',a,b);bytes+=h.bytes;if(Number.isFinite(h.fare)){countLookup(bytes);return showResult({fare:h.fare})}
 // Backward-compatible fallback for an older repo that has only data/mtr.json.
 const full=await fetchJsonCount(`${BASE}data/mtr.json`);bytes+=full.bytes;const f=fareFromTable(full.data?.heavyRail,a,b,'mtr')??fareFromTable(full.data?.heavyRail,b,a,'mtr');countLookup(bytes);if(Number.isFinite(f))return showResult({fare:f});return showResult({error:full.data?.ready?tr('notfound'):tr('missing')})}
function autoLine(st,prefer){const arr=window.MTR_STATION_LINES?.[st]||[];return arr.includes(prefer)?prefer:(arr[0]||'TWL')}
window.setStationFromMap=st=>{const target=mapNext;state[target].line=autoLine(st,state[target].line);state[target].station=st;mapNext=target==='from'?'to':'from';renderAll();window.dispatchEvent(new CustomEvent('mtr-selection-change'))};
window.MTR_UI={get selections(){return{from:state.from.station,to:state.to.station}}};
for(const side of ['from','to']){$(`${side}Line`).addEventListener('change',e=>{state[side].line=e.target.value;state[side].station='';updateLine(side);window.dispatchEvent(new CustomEvent('mtr-selection-change'))});$(`${side}Station`).addEventListener('change',e=>{state[side].station=e.target.value;mapNext=side==='from'?'to':'from';window.dispatchEvent(new CustomEvent('mtr-selection-change'))})}
$('swapBtn').addEventListener('click',()=>{const x={...state.from};state.from={...state.to};state.to=x;renderAll();window.dispatchEvent(new CustomEvent('mtr-selection-change'))});
$('calcBtn').addEventListener('click',()=>calculate().catch(()=>{countLookup(0);showResult({error:tr('notfound')})}));
$('langBtn').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('mtr-fare-lang',lang)}catch{}applyLang()});
applyLang();usage();
})();
