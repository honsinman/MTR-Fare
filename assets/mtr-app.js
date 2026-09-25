(()=>{
'use strict';
const LINES=window.MTR_LINES, BY=window.MTR_LINE_BY_ID;
const I18N={
  zh:{low:'低數據模式',select:'選擇車站',from:'起點',to:'終點',line:'路綫',station:'車站',pickLine:'選擇路綫',pickStation:'選擇車站',calc:'計算車費',fare:'成人八達通・Audit 車費',thisLookup:'本次',used:'已用',data:'數據',officialMap:'港鐵官方路綫圖',mapHint:'官方 PDF 原圖・點車站選擇',fit:'合適大小',pdf:'開啟本地官方 PDF',mtr:'港鐵 / AEL',lr:'輕鐵',bus:'港鐵巴士',close:'關閉',same:'請選擇兩個不同車站',missing:'車費資料未載入，請重新整理。',notfound:'資料庫找不到這組 Audit 車費',free:'已套用機場快綫免費港鐵接駁規則',dbSource:'車費只讀取本 GitHub Pages 內的本地資料庫。'},
  en:{low:'Low Data Mode',select:'Select stations',from:'From',to:'To',line:'Line',station:'Station',pickLine:'Select line',pickStation:'Select station',calc:'Calculate Fare',fare:'Adult Octopus · Audit fare',thisLookup:'This lookup',used:'Used',data:'Data',officialMap:'Official MTR system map',mapHint:'Exact local PDF artwork · tap a station',fit:'Fit',pdf:'Open local official PDF',mtr:'MTR / AEL',lr:'Light Rail',bus:'MTR Bus',close:'Close',same:'Choose two different stations',missing:'Fare database is not loaded. Please refresh.',notfound:'No Audit fare found for this station pair',free:'Airport Express free MTR connection rule applied',dbSource:'Fares are read only from the local database on this GitHub Pages site.'}
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let lang='zh';try{lang=localStorage.getItem('mtr-fare-lang')==='en'?'en':'zh'}catch{}
let db=null, dbBytes=0, heavy=new Map(),ael=new Map(),lastResult=null;
const DATA_URL=window.MTR_DATA_URL||'data/mtr.json';
const state={from:{line:'',station:''},to:{line:'',station:''}};
const key=(a,b)=>`${a}|${b}`;const tr=k=>I18N[lang][k]||k;
const stName=en=>lang==='zh'?(window.MTR_STATION_ZH[en]||en):en;
const lineName=id=>{const l=BY[id];return l?(lang==='zh'?l.zh:l.en):tr('pickLine')};
const fmt=n=>n<1024?`${Math.round(n)} B`:n<1048576?`${(n/1024).toFixed(n<10240?1:0)} KB`:`${(n/1048576).toFixed(2)} MB`;
function pageBytes(){try{return [performance.getEntriesByType('navigation')[0],...performance.getEntriesByType('resource')].filter(Boolean).reduce((a,e)=>a+(e.transferSize||0),0)}catch{return 0}}
function tableRows(table){if(!table||!Array.isArray(table.columns)||!Array.isArray(table.rows))return[];return table.rows.map(r=>Object.fromEntries(table.columns.map((c,i)=>[c,r[i]])))}
function pickKey(obj,patterns){const ks=Object.keys(obj);for(const p of patterns){const k=ks.find(x=>p.test(x));if(k)return k}return null}
function buildFareIndex(rows,map){map.clear();if(!rows.length)return;const sample=rows[0];const ak=pickKey(sample,[/^SRC_STATION_NAME$/i,/^ORIGIN_STATION_NAME$/i,/FROM.*STATION.*NAME/i,/SRC.*NAME/i]);const bk=pickKey(sample,[/^DEST_STATION_NAME$/i,/^DESTINATION_STATION_NAME$/i,/TO.*STATION.*NAME/i,/DEST.*NAME/i]);const fk=pickKey(sample,[/^OCT_ADT_FARE$/i,/OCT.*ADT.*FARE/i,/ADULT.*OCT.*FARE/i,/OCTOPUS.*ADULT/i,/ADULT.*FARE/i]);if(!ak||!bk||!fk)return;for(const r of rows){const a=r[ak],b=r[bk],f=Number(r[fk]);if(a&&b&&Number.isFinite(f))map.set(key(a,b),f)}}
function usage(){const a=$('#uLookup'),b=$('#uUsed'),c=$('#uData');if(a)a.textContent=`${tr('thisLookup')} 0 B`;if(b)b.textContent=`${tr('used')} ${fmt(pageBytes())}`;if(c)c.textContent=`${tr('data')} ${fmt(dbBytes)}`}
function renderSelectors(){for(const side of ['from','to']){const s=state[side],line=BY[s.line],lb=$(`#${side}LineBtn`),sb=$(`#${side}StationBtn`);const color=line?.color||'#9ca3af';lb.style.setProperty('--line-color',color);sb.style.setProperty('--line-color',color);lb.textContent=s.line?lineName(s.line):tr('pickLine');sb.textContent=s.station?stName(s.station):tr('pickStation');lb.classList.toggle('empty',!s.line);sb.classList.toggle('empty',!s.station)}}
function setLang(){document.documentElement.lang=lang==='zh'?'zh-Hant':'en';$$('[data-i18n]').forEach(e=>e.textContent=tr(e.dataset.i18n));$('#langBtn').textContent=lang==='zh'?'EN':'繁';renderSelectors();usage();if(lastResult)renderResult(lastResult)}
function openSheet(title,choices,current,onChoose){const sheet=$('#pickerSheet'),list=$('#sheetList');$('#sheetTitle').textContent=title;list.innerHTML='';for(const c of choices){const b=document.createElement('button');b.type='button';b.className='choice-btn '+(c.station?'station-choice':'');b.style.setProperty('--choice',c.color||'#00888A');if(c.value===current)b.classList.add('selected');b.innerHTML=`<span>${c.label}</span>${c.sub?`<span class="choice-sub">${c.sub}</span>`:''}`;b.addEventListener('click',()=>{onChoose(c.value);closeSheet()});list.appendChild(b)}sheet.classList.add('open');document.body.style.overflow='hidden'}
function closeSheet(){$('#pickerSheet').classList.remove('open');document.body.style.overflow=''}
function chooseLine(side){openSheet(tr('pickLine'),LINES.map(l=>({value:l.id,label:lang==='zh'?l.zh:l.en,sub:lang==='zh'?l.en:l.zh,color:l.color})),state[side].line,v=>{state[side].line=v;const names=BY[v].stations.map(x=>x[2]);if(!names.includes(state[side].station))state[side].station='';renderSelectors();dispatchSelection()})}
function chooseStation(side){if(!state[side].line){chooseLine(side);return}const l=BY[state[side].line];openSheet(tr('pickStation'),l.stations.map(s=>({value:s[2],label:lang==='zh'?s[1]:s[2],sub:lang==='zh'?s[2]:s[1],color:l.color,station:true})),state[side].station,v=>{state[side].station=v;renderSelectors();dispatchSelection()})}
function dispatchSelection(){window.dispatchEvent(new CustomEvent('mtr-selection-change'))}
function direct(a,b){if(heavy.has(key(a,b)))return{fare:heavy.get(key(a,b)),kind:'mtr'};if(ael.has(key(a,b)))return{fare:ael.get(key(a,b)),kind:'ael'};return null}
function both(map,a,b){const x=map.get(key(a,b));if(Number.isFinite(x))return x;const y=map.get(key(b,a));return Number.isFinite(y)?y:null}
function combinedAel(a,b){const specials=new Set(['Airport','AsiaWorld-Expo']);const aSpecial=specials.has(a),bSpecial=specials.has(b);if(aSpecial===bSpecial)return null;const airport=aSpecial?a:b, local=aSpecial?b:a;let best=null;for(const [ae,mtr] of [['Hong Kong','Central'],['Kowloon','Kowloon'],['Tsing Yi','Tsing Yi']]){const af=both(ael,airport,ae),mf=both(heavy,local,mtr);if(!Number.isFinite(af)||!Number.isFinite(mf))continue;const fare=aSpecial?af:Math.max(af,mf);const cand={fare,kind:'ael-connect',via:ae};if(!best||cand.fare<best.fare)best=cand}return best}
function calculate(){const a=state.from.station,b=state.to.station;if(!a||!b||a===b){renderResult({error:tr('same')});return}if(!db?.ready){renderResult({error:tr('missing')});return}const r=direct(a,b)||combinedAel(a,b)||{error:tr('notfound')};lastResult=r;renderResult(r);usage()}
function renderResult(r){const box=$('#result');box.classList.remove('hidden');if(r.error){$('#fareValue').textContent='—';$('#fareRoute').textContent=r.error;$('#fareNote').textContent='';return}$('#fareValue').innerHTML=`<span class="currency">$</span>${Number(r.fare).toFixed(1)}`;$('#fareRoute').textContent=`${stName(state.from.station)} → ${stName(state.to.station)}`;$('#fareNote').textContent=r.kind==='ael-connect'?`${tr('free')} · ${lang==='zh'?'經':'via'} ${stName(r.via)}`:tr('fare')}
function autoLine(st,prefer){const arr=window.MTR_STATION_LINES[st]||[];return arr.includes(prefer)?prefer:(arr[0]||'')}
window.setStationFromMap=st=>{if(!state.from.station||(state.from.station&&state.to.station)){state.from.line=autoLine(st,state.from.line);state.from.station=st;state.to.station=''}else{state.to.line=autoLine(st,state.to.line);state.to.station=st}renderSelectors();dispatchSelection()};
window.MTR_UI={get selections(){return{from:state.from.station,to:state.to.station}}};
async function loadDb(){try{const r=await fetch(DATA_URL,{cache:'force-cache'});if(!r.ok)throw 0;const txt=await r.text();dbBytes=new Blob([txt]).size;db=JSON.parse(txt);buildFareIndex(tableRows(db.heavyRail),heavy);buildFareIndex(tableRows(db.airportExpress),ael)}catch{db={ready:false}}usage()}
$('#langBtn')?.addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('mtr-fare-lang',lang)}catch{}setLang()});
for(const side of ['from','to']){$(`#${side}LineBtn`)?.addEventListener('click',()=>chooseLine(side));$(`#${side}StationBtn`)?.addEventListener('click',()=>chooseStation(side))}
$('#swapBtn')?.addEventListener('click',()=>{const t={...state.from};state.from={...state.to};state.to=t;renderSelectors();dispatchSelection()});
$('#calcBtn')?.addEventListener('click',calculate);$('#sheetClose')?.addEventListener('click',closeSheet);$('#sheetBackdrop')?.addEventListener('click',closeSheet);
setLang();loadDb();setTimeout(usage,350);
})();
