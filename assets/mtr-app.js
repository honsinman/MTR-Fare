(()=>{'use strict';
const LINES=window.MTR_LINES||[],BY=window.MTR_LINE_BY_ID||{},INDEX=window.MTR_FARE_INDEX||{};
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
const BASE=window.MTR_BASE||'./';
const T={
 zh:{low:'低數據模式',mtr:'港鐵',lr:'輕鐵',select:'選擇車站',from:'起點',to:'終點',line:'路綫',station:'車站',calc:'計算車費',fare:'成人八達通',now:'本次',used:'已用',data:'數據',recount:'重計',officialMap:'港鐵官方路綫圖',mapHint:'官方 PDF 原圖・點車站選擇',fit:'合適大小',source:'車費只讀取儲存在本 GitHub Pages 的本地資料庫。',same:'請選擇兩個不同車站',missing:'車費資料尚未同步',notfound:'找不到這組車費',tsingYi:'青衣',kowloon:'九龍',hongKong:'香港'},
 en:{low:'Low Data Mode',mtr:'MTR',lr:'Light Rail',select:'Select stations',from:'From',to:'To',line:'Line',station:'Station',calc:'Calculate Fare',fare:'Adult Octopus',now:'This',used:'Used',data:'Data',recount:'Recount',officialMap:'Official MTR system map',mapHint:'Exact official PDF artwork · tap a station',fit:'Fit',source:'Fares are read only from the local database stored on this GitHub Pages site.',same:'Choose two different stations',missing:'Fare data has not been synced yet',notfound:'Fare not found',tsingYi:'Tsing Yi',kowloon:'Kowloon',hongKong:'Hong Kong'}
};
let lang='zh';try{lang=localStorage.getItem('mtr-fare-lang')==='en'?'en':'zh'}catch{}
let sessionRequests=0,lastLookupBytes=0,mapNext='from';
const state={from:{line:'AEL',station:'Airport'},to:{line:'TCL',station:'Kowloon'}};
const tr=k=>T[lang][k]||k;
function totalReq(){try{return Number(localStorage.getItem('mtr_fare_total_requests')||0)}catch{return 0}}
function setTotalReq(n){try{localStorage.setItem('mtr_fare_total_requests',String(n))}catch{}}
function fmtKB(n){return `${(Number(n||0)/1024).toFixed(1)} KB`}
function usage(){$('sessionRequests').textContent=String(sessionRequests);$('totalRequests').textContent=String(totalReq());$('totalData').textContent=fmtKB(lastLookupBytes)}
function countLookup(bytes){sessionRequests++;lastLookupBytes=Math.max(0,Number(bytes)||0);setTotalReq(totalReq()+1);usage()}
function recount(){sessionRequests=0;lastLookupBytes=0;usage()}
function textBytes(s){return new TextEncoder().encode(String(s||'')).length}
async function fetchJsonCount(url){
 try{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));const txt=await r.text();return{data:JSON.parse(txt),bytes:textBytes(txt)}}catch{return{data:null,bytes:0}}
}
function lineLabel(l){return lang==='zh'?l.zh:l.en}function stationLabel(s){return lang==='zh'?s[1]:s[2]}
function fillLines(side){const sel=$(`${side}Line`),cur=state[side].line;sel.innerHTML='';for(const l of LINES){const o=document.createElement('option');o.value=l.id;o.textContent=lineLabel(l);o.selected=l.id===cur;sel.appendChild(o)}updateLine(side)}
function updateLine(side){const l=BY[state[side].line]||LINES[0];if(!l)return;const ls=$(`${side}LineWrap`),ss=$(`${side}StationWrap`);ls.style.setProperty('--mtr-line',l.color);ss.style.setProperty('--mtr-line',l.color);const stSel=$(`${side}Station`);let cur=state[side].station;stSel.innerHTML='';for(const s of l.stations){const o=document.createElement('option');o.value=s[2];o.textContent=stationLabel(s);stSel.appendChild(o)}if(![...stSel.options].some(o=>o.value===cur))cur=stSel.options[0]?.value||'';state[side].station=cur;stSel.value=cur}
function renderAll(){for(const side of ['from','to'])fillLines(side)}
function applyLang(){document.documentElement.lang=lang==='zh'?'zh-Hant':'en';$$('[data-i18n]').forEach(e=>e.textContent=tr(e.dataset.i18n));$('langBtn').textContent=lang==='zh'?'EN':'繁';renderAll();usage()}
function stationCode(name){for(const l of LINES)for(const s of l.stations)if(s[2]===name)return s[0];return String(name||'').replace(/[^A-Za-z0-9_-]+/g,'_')}
function rows(table){if(!table?.columns||!table?.rows)return[];return table.rows.map(r=>Object.fromEntries(table.columns.map((c,i)=>[c,r[i]])))}
function findCol(obj,names){const ks=Object.keys(obj||{}),low=Object.fromEntries(ks.map(k=>[k.toLowerCase(),k]));for(const n of names){if(low[n.toLowerCase()])return low[n.toLowerCase()]}return null}
function fareFromLegacyTable(table,a,b,kind){const rr=rows(table);if(!rr.length)return null;const o=rr[0];const ak=kind==='ael'?findCol(o,['ST_FROM','SRC_STATION_NAME']):findCol(o,['SRC_STATION_NAME']);const bk=kind==='ael'?findCol(o,['ST_TO','DEST_STATION_NAME']):findCol(o,['DEST_STATION_NAME']);const fk=findCol(o,['OCT_ADT_FARE']);if(!ak||!bk||!fk)return null;for(const r of rr){if(String(r[ak]).trim()===a&&String(r[bk]).trim()===b){const f=Number(r[fk]);if(Number.isFinite(f))return f}}return null}
function fareFromShard(data,dest,kind,origin){if(!data)return null;if(data.fares&&Object.prototype.hasOwnProperty.call(data.fares,dest)){const f=Number(data.fares[dest]);return Number.isFinite(f)?f:null}return fareFromLegacyTable(data,origin,dest,kind)}
function indexedFile(kind,origin){const bucket=kind==='mtr'?INDEX.mtr:INDEX.ael;return bucket&&bucket[origin]?bucket[origin]:null}
async function shardFare(kind,a,b){
 let bytes=0;const first=indexedFile(kind,a)||`${stationCode(a)}.json`;let q=await fetchJsonCount(`${BASE}data/fare/${kind}/${encodeURIComponent(first)}`);bytes+=q.bytes;let fare=fareFromShard(q.data,b,kind,a);if(Number.isFinite(fare))return{fare,bytes};
 const second=indexedFile(kind,b)||`${stationCode(b)}.json`;if(second!==first){q=await fetchJsonCount(`${BASE}data/fare/${kind}/${encodeURIComponent(second)}`);bytes+=q.bytes;fare=fareFromShard(q.data,a,kind,b);if(Number.isFinite(fare))return{fare,bytes}}
 return{fare:null,bytes};
}
const AEL_CITY_OPTIONS=[{key:'tsingYi',station:'Tsing Yi',fare:73},{key:'kowloon',station:'Kowloon',fare:105},{key:'hongKong',station:'Hong Kong',fare:120}];
function isAirportEnd(s){return s==='Airport'||s==='AsiaWorld-Expo'}
async function aelOrMixedFare(a,b,fromLine,toLine){
 const aAir=isAirportEnd(a),bAir=isAirportEnd(b),wantsAel=aAir||bAir||fromLine==='AEL'||toLine==='AEL';if(!wantsAel)return{handled:false,bytes:0};
 if((a==='Airport'&&b==='AsiaWorld-Expo')||(b==='Airport'&&a==='AsiaWorld-Expo'))return{handled:true,fare:6.5,bytes:0};
 // For any trip between Airport / AsiaWorld-Expo and the MTR network, show all
 // three city-terminal choices. The immediately connecting MTR ride is free
 // under MTR's stated conditions, so users may choose the AEL city station.
 if(aAir!==bAir)return{handled:true,options:AEL_CITY_OPTIONS,bytes:0};
 const sh=await shardFare('ael',a,b);return{handled:true,fare:sh.fare,bytes:sh.bytes};
}
function clearResultMode(){const v=$('fareValue');v.classList.remove('ael-options');$('fareMsg').textContent=''}
function showResult(r){$('result').classList.remove('hidden');clearResultMode();const v=$('fareValue');if(r.error){v.textContent='—';$('fareMsg').textContent=r.error;return}if(Array.isArray(r.options)){v.classList.add('ael-options');v.innerHTML=r.options.map(x=>`<span><small>${tr(x.key)}</small><strong>$${Number(x.fare).toFixed(0)}</strong></span>`).join('');return}v.innerHTML=`<span class="currency">$</span>${Number(r.fare).toFixed(1)}`}
async function calculate(){const a=state.from.station,b=state.to.station;if(!a||!b||a===b){countLookup(0);return showResult({error:tr('same')})}let bytes=0;const ae=await aelOrMixedFare(a,b,state.from.line,state.to.line);bytes+=ae.bytes;if(ae.handled){countLookup(bytes);if(ae.options)return showResult({options:ae.options});return showResult(Number.isFinite(ae.fare)?{fare:ae.fare}:{error:tr('notfound')})}const h=await shardFare('mtr',a,b);bytes+=h.bytes;countLookup(bytes);if(Number.isFinite(h.fare))return showResult({fare:h.fare});return showResult({error:tr('notfound')})}
function autoLine(st,prefer){const arr=window.MTR_STATION_LINES?.[st]||[];return arr.includes(prefer)?prefer:(arr[0]||'TWL')}
window.setStationFromMap=st=>{const target=mapNext;state[target].line=autoLine(st,state[target].line);state[target].station=st;mapNext=target==='from'?'to':'from';renderAll();window.dispatchEvent(new CustomEvent('mtr-selection-change'))};
window.MTR_UI={get selections(){return{from:state.from.station,to:state.to.station}}};
for(const side of ['from','to']){$(`${side}Line`).addEventListener('change',e=>{state[side].line=e.target.value;state[side].station='';updateLine(side);window.dispatchEvent(new CustomEvent('mtr-selection-change'))});$(`${side}Station`).addEventListener('change',e=>{state[side].station=e.target.value;mapNext=side==='from'?'to':'from';window.dispatchEvent(new CustomEvent('mtr-selection-change'))})}
$('swapBtn').addEventListener('click',()=>{const x={...state.from};state.from={...state.to};state.to=x;renderAll();window.dispatchEvent(new CustomEvent('mtr-selection-change'))});
$('calcBtn').addEventListener('click',()=>calculate().catch(()=>{countLookup(0);showResult({error:tr('notfound')})}));
$('recountBtn')?.addEventListener('click',recount);
$('langBtn').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('mtr-fare-lang',lang)}catch{}applyLang()});
applyLang();usage();
})();
