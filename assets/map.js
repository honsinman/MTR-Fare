(()=>{'use strict';
const viewport=document.querySelector('.map-viewport');
const stage=document.querySelector('.map-stage');
const img=document.getElementById('officialMap');
const layer=document.querySelector('.hotspots');
if(!viewport||!stage||!img||!layer)return;

const meta=window.MTR_MAP_META||{width:2048,height:1379};
let zoom=1;
let nw=Number(meta.width)||2048;
let nh=Number(meta.height)||1379;

function pctX(px){return (Number(px)/nw*100)+'%'}
function pctY(py){return (Number(py)/nh*100)+'%'}
function pctW(px){return (Number(px)/nw*100)+'%'}
function pctH(px){return (Number(px)/nh*100)+'%'}

function stationLines(name){return window.MTR_STATION_LINES?.[name]||[]}
function lineColor(id){return window.MTR_LINE_BY_ID?.[id]?.color||null}
function stationColors(name){return stationLines(name).map(lineColor).filter(Boolean)}
function stationFill(name){
  const colors=[...new Set(stationColors(name))];
  if(!colors.length)return '#111827';
  if(colors.length===1)return colors[0];
  const step=100/colors.length;
  const stops=[];
  colors.forEach((c,i)=>{stops.push(`${c} ${i*step}% ${(i+1)*step}%`)});
  return `conic-gradient(from 0deg,${stops.join(',')})`;
}
function stationPrimary(name){return stationColors(name)[0]||'#111827'}

function apply(){
  const w=nw*zoom,h=nh*zoom;
  stage.style.width=w+'px';
  stage.style.height=h+'px';
  img.style.width=w+'px';
  img.style.height=h+'px';
  layer.style.width=w+'px';
  layer.style.height=h+'px';
}

function fit(){
  if(!viewport.clientWidth)return;
  zoom=Math.max(.18,Math.min(1,(viewport.clientWidth-2)/nw));
  apply();
  viewport.scrollTo({left:0,top:0});
}

function selected(){
  const s=window.MTR_UI?.selections||{};
  layer.querySelectorAll('.map-hit').forEach(b=>{
    const isFrom=b.dataset.station===s.from;
    const isTo=b.dataset.station===s.to;
    b.classList.toggle('from-selected',isFrom);
    b.classList.toggle('to-selected',isTo&&!isFrom);
    b.classList.toggle('selected',isFrom||isTo);
    b.setAttribute('aria-pressed',(isFrom||isTo)?'true':'false');
  });
}

function build(){
  layer.innerHTML='';
  for(const [station,p] of Object.entries(window.MTR_MAP_POINTS||{})){
    if(!p||p.px==null||p.py==null)continue;
    const b=document.createElement('button');
    b.type='button';
    b.className='map-hit '+(p.shape==='interchange'?'interchange-hit':'station-hit');
    b.dataset.station=station;
    b.title=station;
    b.setAttribute('aria-label',station);
    b.style.left=pctX(p.px);
    b.style.top=pctY(p.py);

    // V6.8: visible button follows the exact registered map-symbol footprint.
    // The previous CSS still contained fixed 28/36 px !important rules, which
    // is why V6.7 looked large even though JS requested a much smaller size.
    // These percentages are tied to the native 2048×1379 map, so the button
    // now scales with the route map at every zoom level.
    const VISUAL_SCALE=1;
    const visualW=pctW((Number(p.w)||15)*VISUAL_SCALE);
    const visualH=pctH((Number(p.h)||15)*VISUAL_SCALE);
    b.style.setProperty('--visual-w',visualW);
    b.style.setProperty('--visual-h',visualH);
    b.style.width=visualW;
    b.style.height=visualH;
    b.style.setProperty('--station-angle',(Number(p.angle)||0)+'deg');
    b.style.setProperty('--station-color',stationPrimary(station));
    b.style.setProperty('--station-fill',stationFill(station));
    b.addEventListener('click',()=>window.setStationFromMap?.(station));
    layer.appendChild(b);
  }
  selected();
}

img.addEventListener('load',()=>{
  if(img.naturalWidth&&img.naturalHeight){nw=img.naturalWidth;nh=img.naturalHeight}
  build();
  fit();
});
img.addEventListener('error',()=>{
  const msg=document.createElement('div');
  msg.className='map-missing';
  msg.style.display='block';
  msg.textContent='MTR route map image is missing from this GitHub build.';
  viewport.replaceChildren(msg);
});

window.addEventListener('resize',fit);
window.addEventListener('mtr-selection-change',selected);
document.getElementById('zoomIn')?.addEventListener('click',()=>{zoom=Math.min(2.5,zoom+.15);apply()});
document.getElementById('zoomOut')?.addEventListener('click',()=>{zoom=Math.max(.18,zoom-.15);apply()});
document.getElementById('zoomFit')?.addEventListener('click',fit);

if(img.complete&&img.naturalWidth){nw=img.naturalWidth;nh=img.naturalHeight;build();fit()}
})();
