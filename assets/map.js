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
function pctW(w){return (Number(w)/nw*100)+'%'}
function pctH(h){return (Number(h)/nh*100)+'%'}

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
    b.classList.toggle('selected',b.dataset.station===s.from||b.dataset.station===s.to);
  });
}

function build(){
  layer.innerHTML='';
  const entries=Object.entries(window.MTR_MAP_POINTS||{});
  for(const [station,p] of entries){
    if(!p||p.px==null||p.py==null)continue;
    const b=document.createElement('button');
    b.type='button';
    b.className='map-hit '+(p.shape==='interchange'?'interchange-hit':'station-hit');
    b.dataset.station=station;
    b.title=station;
    b.setAttribute('aria-label',station);
    b.style.left=pctX(p.px);
    b.style.top=pctY(p.py);
    b.style.width=pctW(p.w||15);
    b.style.height=pctH(p.h||15);
    b.style.setProperty('--station-angle',(Number(p.angle)||0)+'deg');
    b.addEventListener('click',()=>window.setStationFromMap?.(station));
    layer.appendChild(b);
  }
  selected();
}

img.addEventListener('load',()=>{
  if(img.naturalWidth&&img.naturalHeight){
    nw=img.naturalWidth;
    nh=img.naturalHeight;
  }
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

if(img.complete&&img.naturalWidth){
  nw=img.naturalWidth;nh=img.naturalHeight;build();fit();
}
})();
