(() => {
  'use strict';

  const BASE = window.DATA_BASE || '../data/';
  const HAS_MAP = !!window.HAS_MAP;
  const PDF_URL = 'https://www.mtr.com.hk/archive/en/services/routemap.pdf';

  const T = {
    zh: {
      title: 'MTR FARE', mode: '低數據模式', subtitle: '成人八達通車費・本機查價',
      from: '起點', to: '終點', choose: '選擇車站', swap: '交換', calculate: '計算車費',
      adult: '成人八達通', fare: '車費', loading: '正在載入已儲存的官方車費…',
      missing: '尚未同步官方車費資料。請在 GitHub Actions 執行「Sync official MTR fare data」一次。',
      same: '請選擇兩個不同車站。', notfound: '找不到這一組車站的成人八達通車費。',
      thisSearch: '本次查價', pageData: '本頁', fareDb: '車費庫', zero: '0 B',
      mapTitle: '互動港鐵路綫圖', mapDesc: '點一下設起點，再點一下設終點。可放大、縮小及拖動畫面。',
      officialPdf: '官方 PDF ↗', zoomIn: '＋', zoomOut: '－', fit: '合適大小',
      liteLink: '無地圖版', mapLink: '地圖版', lightRail: '輕鐵車費', source: '資料：港鐵官方 Open Data',
      aelApplied: '已套用機場快綫免費港鐵接駁規則', aelEstimate: '合資格成人八達通車費',
      direct: '成人八達通車費', selectedFrom: '已設起點', selectedTo: '已設終點',
      mapNote: '互動圖按官方路綫與車站製作；右上按鈕可開啟港鐵官方 PDF。',
      dataStatus: '官方車費已儲存在此 GitHub 專案內；查價不會再次連線港鐵網站。'
    },
    en: {
      title: 'MTR FARE', mode: 'Low Data Mode', subtitle: 'Adult Octopus fare · local lookup',
      from: 'From', to: 'To', choose: 'Select station', swap: 'Swap', calculate: 'Calculate Fare',
      adult: 'Adult Octopus', fare: 'Fare', loading: 'Loading stored official fare data…',
      missing: 'Official fare data has not been synced yet. Run “Sync official MTR fare data” once in GitHub Actions.',
      same: 'Please select two different stations.', notfound: 'No Adult Octopus fare was found for this station pair.',
      thisSearch: 'This lookup', pageData: 'Page', fareDb: 'Fare DB', zero: '0 B',
      mapTitle: 'Interactive MTR Map', mapDesc: 'Tap once for From, then tap again for To. Zoom and pan as needed.',
      officialPdf: 'Official PDF ↗', zoomIn: '＋', zoomOut: '－', fit: 'Fit',
      liteLink: 'No-map version', mapLink: 'Map version', lightRail: 'Light Rail fare', source: 'Data: MTR official Open Data',
      aelApplied: 'Airport Express free MTR connection rule applied', aelEstimate: 'Eligible Adult Octopus fare',
      direct: 'Adult Octopus fare', selectedFrom: 'From selected', selectedTo: 'To selected',
      mapNote: 'Interactive schematic follows the official network/stations; use the top-right button to open the official MTR PDF.',
      dataStatus: 'Official fares are stored inside this GitHub project; fare lookups do not call the MTR website.'
    }
  };

  let lang = 'zh';
  try { lang = localStorage.getItem('mtr-fare-lang') === 'en' ? 'en' : 'zh'; } catch {}
  let fareRows = [];
  let aelRows = [];
  let fareIndex = new Map();
  let aelIndex = new Map();
  let fareBytes = 0;
  let dataReady = false;
  let mapTarget = 'from';

  const $ = (s) => document.querySelector(s);
  const fromSel = $('#fromStation');
  const toSel = $('#toStation');
  const result = $('#result');
  const fareValue = $('#fareValue');
  const routeText = $('#routeText');
  const routeSub = $('#routeSub');
  const resultBadge = $('#resultBadge');
  const status = $('#statusText');

  function tr(k){ return T[lang][k] ?? k; }
  function stationLabel(st){ return lang === 'zh' ? st.zh : st.en; }
  function stationObj(en){ return window.MTR_STATIONS.find(s => s.en === en); }
  function labelByEn(en){ const s = stationObj(en); return s ? stationLabel(s) : en; }

  function fmtBytes(n){
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    if (n < 1024) return `${Math.round(n)} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(n < 10240 ? 1 : 0)} KB`;
    return `${(n/1024/1024).toFixed(2)} MB`;
  }

  function measuredPageBytes(){
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const vals = [nav, ...resources].filter(Boolean).map(e => e.transferSize || 0);
      return vals.reduce((a,b)=>a+b,0);
    } catch { return 0; }
  }

  function updateUsage(){
    const page = measuredPageBytes();
    const a = $('#usageSearch'), b = $('#usagePage'), c = $('#usageDb');
    if (a) a.textContent = `${tr('thisSearch')} ${tr('zero')}`;
    if (b) b.textContent = `${tr('pageData')} ${fmtBytes(page)}`;
    if (c) c.textContent = `${tr('fareDb')} ${fmtBytes(fareBytes)}`;
  }

  function populateSelect(select, keep){
    const current = keep ?? select.value;
    select.innerHTML = `<option value="">${tr('choose')}</option>` + window.MTR_STATIONS
      .map(s => `<option value="${escapeHtml(s.en)}">${escapeHtml(stationLabel(s))}</option>`).join('');
    if (current && window.MTR_STATIONS.some(s => s.en === current)) select.value = current;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function applyLanguage(){
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.title = lang === 'zh' ? 'MTR FARE｜低數據車費查詢' : 'MTR FARE | Low-data Fare Lookup';
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = tr(el.dataset.i18n));
    const btn = $('#langBtn'); if (btn) btn.textContent = lang === 'zh' ? 'EN' : '繁';
    populateSelect(fromSel); populateSelect(toSel);
    if ($('#officialPdf')) { $('#officialPdf').textContent = tr('officialPdf'); $('#officialPdf').href = PDF_URL; }
    updateUsage();
    if (!result.classList.contains('hidden') && result.dataset.kind) renderLastResult();
    window.dispatchEvent(new CustomEvent('mtr-language-change', {detail:{lang}}));
  }

  function parseCSV(text){
    const rows=[]; let row=[], cell='', q=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(q){
        if(ch==='"' && text[i+1]==='"'){ cell+='"'; i++; }
        else if(ch==='"') q=false;
        else cell+=ch;
      } else {
        if(ch==='"') q=true;
        else if(ch===','){ row.push(cell); cell=''; }
        else if(ch==='\n'){ row.push(cell.replace(/\r$/,'')); rows.push(row); row=[]; cell=''; }
        else cell+=ch;
      }
    }
    if(cell.length || row.length){ row.push(cell.replace(/\r$/,'')); rows.push(row); }
    if(!rows.length) return [];
    const headers=rows.shift().map(h=>h.trim());
    return rows.filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(headers.map((h,j)=>[h,(r[j]??'').trim()])));
  }

  function first(row, names){ for(const n of names){ if(row[n] != null && row[n] !== '') return row[n]; } return ''; }
  function guessField(row, tests){
    const k = Object.keys(row).find(name => tests.every(re => re.test(name)));
    return k && row[k] != null ? row[k] : '';
  }
  function sourceStation(row){ return first(row,['SRC_STATION_NAME','SOURCE_STATION_NAME','FROM_STATION_NAME','FROM_STATION','SRC_STATION','ORIGIN_STATION_NAME']) || guessField(row,[/(SRC|SOURCE|FROM|ORIGIN)/i,/STATION/i]); }
  function destStation(row){ return first(row,['DEST_STATION_NAME','DESTINATION_STATION_NAME','TO_STATION_NAME','TO_STATION','DEST_STATION','DESTINATION_NAME']) || guessField(row,[/(DEST|DESTINATION|TO)/i,/STATION/i]); }
  function adultOctopus(row){ return first(row,['OCT_ADT_FARE','OCT_ADULT_FARE','ADULT_OCTOPUS_FARE','OCT_ADT','ADULT_FARE','OCTOPUS_ADULT_FARE']) || guessField(row,[/(OCT|OCTOPUS)/i,/(ADT|ADULT)/i,/(FARE|PRICE)/i]); }
  function normalStation(v){
    if (!v) return '';
    const raw = String(v).trim();
    const exact = window.MTR_STATIONS.find(s => s.en.toLowerCase()===raw.toLowerCase() || s.zh===raw);
    if(exact) return exact.en;
    return raw.replace(/ Station$/i,'').trim();
  }
  function num(v){ const n=parseFloat(String(v??'').replace(/[$,]/g,'')); return Number.isFinite(n)?n:null; }
  function key(a,b){ return `${a}|||${b}`; }

  function buildIndexes(){
    fareIndex = new Map();
    for(const r of fareRows){
      const a = normalStation(sourceStation(r));
      const b = normalStation(destStation(r));
      const f = num(adultOctopus(r));
      if(a && b && f!=null){ fareIndex.set(key(a,b),f); fareIndex.set(key(b,a),f); }
    }
    aelIndex = new Map();
    for(const r of aelRows){
      const a = normalStation(sourceStation(r));
      const b = normalStation(destStation(r));
      const f = num(adultOctopus(r));
      if(a && b && f!=null){ aelIndex.set(key(a,b),f); aelIndex.set(key(b,a),f); }
    }
    // Current Adult Octopus direct AEL fallback for the main airport/AWE pairs.
    const fallbacks = [
      ['Hong Kong','Airport',120],['Kowloon','Airport',105],['Tsing Yi','Airport',73],
      ['Airport','AsiaWorld-Expo',6.5]
    ];
    fallbacks.forEach(([a,b,f])=>{ if(!aelIndex.has(key(a,b))){aelIndex.set(key(a,b),f);aelIndex.set(key(b,a),f);} });
  }

  async function getText(url){
    const res = await fetch(url, {cache:'default'});
    if(!res.ok) throw new Error(`${res.status} ${url}`);
    const text = await res.text();
    fareBytes += new TextEncoder().encode(text).length;
    return text;
  }

  async function loadData(){
    status.textContent = tr('loading'); status.className='';
    try {
      const [mtr,ael] = await Promise.all([
        getText(BASE+'mtr_lines_fares.csv'),
        getText(BASE+'airport_express_fares.csv').catch(()=> '')
      ]);
      fareRows = parseCSV(mtr); aelRows = ael ? parseCSV(ael) : [];
      buildIndexes(); dataReady = fareIndex.size > 0;
      if(!dataReady) throw new Error('empty fare table');
      status.textContent = '';
      status.className='note';
    } catch(err){
      buildIndexes();
      dataReady = false;
      status.textContent = tr('missing'); status.className='warn';
      console.warn('Fare data not ready:', err);
    }
    updateUsage();
  }

  function lookupDirect(a,b){
    if(aelIndex.has(key(a,b))) return {fare:aelIndex.get(key(a,b)), kind:'ael-direct'};
    if(fareIndex.has(key(a,b))) return {fare:fareIndex.get(key(a,b)), kind:'mtr'};
    return null;
  }

  function calcAelConnection(a,b){
    const air = new Set(['Airport','AsiaWorld-Expo']);
    if(!(air.has(a) ^ air.has(b))) return null;
    const mtrFirst = !air.has(a) && air.has(b);
    const ordinary = mtrFirst ? a : b;
    const airStation = mtrFirst ? b : a;
    const interchanges = ['Hong Kong','Kowloon','Tsing Yi'];
    const options=[];
    for(const x of interchanges){
      const mtrFare = ordinary===x ? 0 : fareIndex.get(key(ordinary,x));
      const aelFare = aelIndex.get(key(x,airStation));
      if(Number.isFinite(mtrFare) && Number.isFinite(aelFare)){
        // MTR→AEL: lower-fare leg is free. AEL→MTR: connecting MTR journey is free.
        const total = mtrFirst ? Math.max(mtrFare,aelFare) : aelFare;
        options.push({fare:total, interchange:x, mtrFare, aelFare, mtrFirst});
      }
    }
    options.sort((p,q)=>p.fare-q.fare);
    return options[0] || null;
  }

  let last = null;
  function calculate(){
    const a=fromSel.value, b=toSel.value;
    if(!a || !b){ showError(tr('same')); return; }
    if(a===b){ showError(tr('same')); return; }

    let out = lookupDirect(a,b);
    if(!out){
      const conn = calcAelConnection(a,b);
      if(conn) out = {...conn, kind:'ael-connection'};
    }
    if(!out){
      showError(dataReady ? tr('notfound') : tr('missing'));
      return;
    }
    last={a,b,...out};
    renderLastResult();
    mapTarget='from';
    window.dispatchEvent(new CustomEvent('mtr-selection-change'));
    updateUsage();
  }

  function renderLastResult(){
    if(!last) return;
    result.classList.remove('hidden'); result.dataset.kind=last.kind;
    fareValue.textContent = `$${Number(last.fare).toFixed(last.fare%1===0?1:1)}`;
    routeText.textContent = `${labelByEn(last.a)} → ${labelByEn(last.b)}`;
    if(last.kind==='ael-connection'){
      routeSub.textContent = `${tr('aelEstimate')} · ${labelByEn(last.interchange)}`;
      resultBadge.textContent = tr('aelApplied');
      resultBadge.style.display='inline-flex';
    } else {
      routeSub.textContent = tr('direct');
      resultBadge.textContent = tr('adult');
      resultBadge.style.display='inline-flex';
    }
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function showError(msg){
    result.classList.remove('hidden'); result.dataset.kind='error';
    fareValue.textContent='—'; routeText.textContent=msg; routeSub.textContent=''; resultBadge.style.display='none';
    last=null; updateUsage();
  }

  function swap(){ const a=fromSel.value; fromSel.value=toSel.value; toSel.value=a; window.dispatchEvent(new CustomEvent('mtr-selection-change')); }

  window.selectStationFromMap = (name) => {
    if(!fromSel.value || (fromSel.value && toSel.value)){
      fromSel.value=name; toSel.value=''; mapTarget='to'; toast(`${tr('selectedFrom')}: ${labelByEn(name)}`);
    } else {
      toSel.value=name; mapTarget='from'; toast(`${tr('selectedTo')}: ${labelByEn(name)}`);
    }
    window.dispatchEvent(new CustomEvent('mtr-selection-change'));
  };

  function toast(text){ const el=$('#mapTip'); if(!el) return; el.textContent=text; el.style.display='block'; clearTimeout(toast.t); toast.t=setTimeout(()=>el.style.display='none',1500); }

  $('#langBtn')?.addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('mtr-fare-lang',lang);}catch{} applyLanguage();});
  $('#swapBtn')?.addEventListener('click',swap);
  $('#calcBtn')?.addEventListener('click',calculate);
  fromSel?.addEventListener('change',()=>{ if(fromSel.value) mapTarget='to'; window.dispatchEvent(new CustomEvent('mtr-selection-change')); });
  toSel?.addEventListener('change',()=>window.dispatchEvent(new CustomEvent('mtr-selection-change')));

  window.MTR_APP = { get lang(){return lang;}, labelByEn, tr, get selections(){return {from:fromSel?.value||'',to:toSel?.value||''};} };

  applyLanguage();
  loadData();
  window.addEventListener('load',()=>setTimeout(updateUsage,300));
})();
