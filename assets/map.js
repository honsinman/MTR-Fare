(() => {
  'use strict';
  const svg = document.getElementById('railMap');
  if(!svg || !window.MTR_LINES) return;
  const NS='http://www.w3.org/2000/svg';
  const W=1600,H=1050;

  const P={
    'Tuen Mun':[85,190],'Siu Hong':[150,160],'Tin Shui Wai':[215,120],'Long Ping':[270,150],'Yuen Long':[325,180],'Kam Sheung Road':[395,240],
    'Tsuen Wan West':[500,355],'Tsuen Wan':[545,225],'Tai Wo Hau':[570,265],'Kwai Hing':[595,305],'Kwai Fong':[620,345],'Lai King':[650,390],
    'Mei Foo':[635,455],'Lai Chi Kok':[690,470],'Cheung Sha Wan':[735,485],'Sham Shui Po':[770,500],'Prince Edward':[795,535],'Mong Kok':[795,575],
    'Yau Ma Tei':[795,615],'Jordan':[795,655],'Tsim Sha Tsui':[795,700],'Central':[705,835],'Admiralty':[745,835],
    'Shek Kip Mei':[845,535],'Kowloon Tong':[890,525],'Lok Fu':[930,545],'Wong Tai Sin':[970,560],'Diamond Hill':[1010,575],'Choi Hung':[1065,590],
    'Kowloon Bay':[1120,610],'Ngau Tau Kok':[1175,630],'Kwun Tong':[1230,650],'Lam Tin':[1280,680],'Yau Tong':[1315,715],'Tiu Keng Leng':[1350,740],
    'Sheung Wan':[650,835],'Sai Ying Pun':[590,845],'HKU':[535,855],'Kennedy Town':[475,865],'Wan Chai':[805,835],'Causeway Bay':[865,835],
    'Tin Hau':[920,835],'Fortress Hill':[975,835],'North Point':[1030,835],'Quarry Bay':[1090,835],'Tai Koo':[1150,835],'Sai Wan Ho':[1210,835],
    'Shau Kei Wan':[1270,835],'Heng Fa Chuen':[1340,835],'Chai Wan':[1410,835],
    'Hong Kong':[680,785],'Kowloon':[710,690],'Olympic':[700,610],'Nam Cheong':[680,535],'Tsing Yi':[515,470],'Sunny Bay':[350,585],'Tung Chung':[220,655],
    'Disneyland Resort':[315,705],'Airport':[120,590],'AsiaWorld-Expo':[65,530],
    'Tseung Kwan O':[1405,735],'Hang Hau':[1460,700],'Po Lam':[1500,655],'LOHAS Park':[1490,790],
    'Hung Hom':[850,690],'Mong Kok East':[840,590],'Tai Wai':[925,455],'Sha Tin':[980,420],'Fo Tan':[1025,375],'Racecourse':[1080,395],
    'University':[1060,315],'Tai Po Market':[1090,260],'Tai Wo':[1115,215],'Fanling':[1140,170],'Sheung Shui':[1160,120],'Lo Wu':[1240,65],'Lok Ma Chau':[1050,70],
    'East Tsim Sha Tsui':[830,720],'Austin':[760,690],'Che Kung Temple':[950,475],'Sha Tin Wai':[995,460],'City One':[1045,440],'Shek Mun':[1100,420],
    'Tai Shui Hang':[1160,400],'Heng On':[1220,380],'Ma On Shan':[1280,360],'Wu Kai Sha':[1340,340],
    'Hin Keng':[900,505],'Kai Tak':[1000,630],'Sung Wong Toi':[950,660],'To Kwa Wan':[900,680],'Ho Man Tin':[860,650],'Whampoa':[900,720],
    'South Horizons':[545,990],'Lei Tung':[620,975],'Wong Chuk Hang':[690,930],'Ocean Park':[725,890],'Exhibition Centre':[785,765]
  };

  const labelOffset={
    'Central':[-4,22],'Admiralty':[8,22],'Hong Kong':[-60,-10],'Kowloon':[-10,-14],'Tsim Sha Tsui':[-75,-8],'East Tsim Sha Tsui':[8,22],
    'Yau Ma Tei':[10,3],'Mong Kok':[10,3],'Prince Edward':[10,3],'Kowloon Tong':[10,-10],'Tai Wai':[10,-10],'Hung Hom':[10,4],
    'Diamond Hill':[10,-10],'Tsing Yi':[-55,-10],'Sunny Bay':[-55,-10],'Airport':[10,-10],'AsiaWorld-Expo':[10,-10],
    'Tiu Keng Leng':[10,-8],'Tseung Kwan O':[10,-8],'North Point':[10,-10],'Quarry Bay':[10,22], 'Admiralty':[10,22],
    'Ocean Park':[10,22],'Wong Chuk Hang':[10,22],'Lei Tung':[10,22],'South Horizons':[10,22],
    'Exhibition Centre':[10,-10], 'Austin':[-55,-10], 'Nam Cheong':[-68,-10], 'Mei Foo':[-52,-10]
  };

  function el(name,attrs={}){ const e=document.createElementNS(NS,name); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v)); return e; }
  function text(x,y,t,cls){ const e=el('text',{x,y,class:cls||''});e.textContent=t;return e; }
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('role','img');

  // Soft geographical labels keep the visual legible without any image payload.
  svg.append(text(120,330,'NEW TERRITORIES','region'));
  svg.append(text(790,905,'HONG KONG ISLAND','region'));
  svg.append(text(760,300,'NEW TERRITORIES EAST','region'));
  svg.append(text(735,605,'KOWLOON','region'));

  const lineGroup=el('g',{id:'mapLines'}); svg.append(lineGroup);
  function drawSeq(seq,color){
    const pts=seq.map(s=>P[s]).filter(Boolean); if(pts.length<2) return;
    lineGroup.append(el('polyline',{points:pts.map(p=>p.join(',')).join(' '),stroke:color,class:'map-line'}));
  }
  Object.entries(window.MTR_LINES).forEach(([code,line])=>{
    drawSeq(line.stations,line.color);
    if(line.branch) drawSeq(line.branch,line.color);
    if(line.race) drawSeq(line.race,line.color);
  });

  const nodeGroup=el('g',{id:'mapNodes'}); svg.append(nodeGroup);
  const stations=[...new Set(Object.values(window.MTR_LINES).flatMap(l=>[l.stations,l.branch,l.race].filter(Boolean).flat()))].filter(s=>P[s]);
  const nodes=new Map();
  for(const name of stations){
    const [x,y]=P[name], memberships=window.MTR_LINE_MEMBERSHIP[name]||[];
    const g=el('g',{class:'map-node','data-station':name,tabindex:'0',role:'button','aria-label':name});
    const r=memberships.length>1?7.5:5.7;
    g.append(el('circle',{cx:x,cy:y,r}));
    const [dx,dy]=labelOffset[name]||[10,-9];
    const lbl=text(x+dx,y+dy,'',''); lbl.setAttribute('data-label',name); g.append(lbl);
    g.addEventListener('click',()=>window.selectStationFromMap?.(name));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.selectStationFromMap?.(name);}});
    nodeGroup.append(g); nodes.set(name,g);
  }

  function updateLabels(){
    document.querySelectorAll('#railMap [data-label]').forEach(t=>{
      const name=t.getAttribute('data-label'); t.textContent=window.MTR_APP?.labelByEn(name)||name;
    });
  }
  function updateSelection(){
    const s=window.MTR_APP?.selections||{};
    nodes.forEach((g,name)=>g.classList.toggle('selected',name===s.from||name===s.to));
  }
  window.addEventListener('mtr-language-change',updateLabels);
  window.addEventListener('mtr-selection-change',updateSelection);

  const legend=document.getElementById('mapLegend');
  if(legend){
    Object.entries(window.MTR_LINES).forEach(([code,line])=>{
      const d=document.createElement('span'); d.className='legend-item';
      const i=document.createElement('i');i.style.background=line.color;d.append(i);
      const b=document.createElement('span');b.dataset.line=code;d.append(b);legend.append(d);
    });
    const updateLegend=()=>legend.querySelectorAll('[data-line]').forEach(b=>{
      const l=window.MTR_LINES[b.dataset.line];b.textContent=window.MTR_APP?.lang==='en'?l.nameEn:l.nameZh;
    });
    window.addEventListener('mtr-language-change',updateLegend);setTimeout(updateLegend,0);
  }

  let zoom=0.8;
  function applyZoom(){ svg.style.width=`${Math.round(W*zoom)}px`; }
  function fit(){ const c=document.querySelector('.map-scroll'); if(!c)return; zoom=Math.max(.24,Math.min(1.2,(c.clientWidth-10)/W));applyZoom();c.scrollTo({left:0,top:0,behavior:'smooth'}); }
  document.getElementById('zoomIn')?.addEventListener('click',()=>{zoom=Math.min(1.65,zoom+.15);applyZoom();});
  document.getElementById('zoomOut')?.addEventListener('click',()=>{zoom=Math.max(.5,zoom-.15);applyZoom();});
  document.getElementById('zoomFit')?.addEventListener('click',fit);

  updateLabels();updateSelection();applyZoom(); setTimeout(fit,0);
})();
