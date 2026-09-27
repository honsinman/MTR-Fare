(()=>{'use strict';
const viewport=document.querySelector('.map-viewport');
const stage=document.querySelector('.map-stage');
const img=document.getElementById('officialMap');
const layer=document.querySelector('.hotspots');
if(!viewport||!stage||!img||!layer)return;

const meta=window.MTR_MAP_META||{width:2048,height:1379};
let zoom=1;
let minZoom=.18;
const MAX_ZOOM=3.25;
let nw=Number(meta.width)||2048;
let nh=Number(meta.height)||1379;
let suppressClickUntil=0;

const activePointers=new Map();
let panStart=null;
let pinchStart=null;

function pctX(px){return (Number(px)/nw*100)+'%'}
function pctY(py){return (Number(py)/nh*100)+'%'}
function pctW(px){return (Number(px)/nw*100)+'%'}
function pctH(px){return (Number(px)/nh*100)+'%'}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function stationLines(name){return window.MTR_STATION_LINES?.[name]||[]}
function lineColor(id){return window.MTR_LINE_BY_ID?.[id]?.color||null}
function stationColors(name){return stationLines(name).map(lineColor).filter(Boolean)}
function stationFill(name){
  const colors=[...new Set(stationColors(name))];
  if(!colors.length)return '#111827';
  if(colors.length===1)return colors[0];
  const step=100/colors.length;
  const stops=[];
  colors.forEach((c,i)=>stops.push(`${c} ${i*step}% ${(i+1)*step}%`));
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

function computeFitZoom(){
  if(!viewport.clientWidth)return .18;
  return clamp((viewport.clientWidth-2)/nw,.08,1);
}

function fit(){
  minZoom=computeFitZoom();
  zoom=minZoom;
  apply();
  viewport.scrollTo({left:0,top:0,behavior:'auto'});
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

    // V6.9: exactly one-sixth of the V6.8 visible footprint.
    // Percent sizing keeps the button proportional to the map during pinch zoom.
    const VISUAL_SCALE=1/6;
    const visualW=pctW((Number(p.w)||15)*VISUAL_SCALE);
    const visualH=pctH((Number(p.h)||15)*VISUAL_SCALE);
    b.style.setProperty('--visual-w',visualW);
    b.style.setProperty('--visual-h',visualH);
    b.style.width=visualW;
    b.style.height=visualH;
    b.style.setProperty('--station-angle',(Number(p.angle)||0)+'deg');
    b.style.setProperty('--station-color',stationPrimary(station));
    b.style.setProperty('--station-fill',stationFill(station));
    b.addEventListener('click',e=>{
      if(Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();return;}
      window.setStationFromMap?.(station);
    });
    layer.appendChild(b);
  }
  selected();
}

function pointerList(){return [...activePointers.values()]}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function midpoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function viewportPoint(clientX,clientY){
  const r=viewport.getBoundingClientRect();
  return{x:clientX-r.left,y:clientY-r.top};
}

function beginPan(p){
  panStart={x:p.x,y:p.y,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop,moved:false};
}

function beginPinch(){
  const ps=pointerList();
  if(ps.length<2)return;
  const a=ps[0],b=ps[1];
  const mid=midpoint(a,b);
  const vp=viewportPoint(mid.x,mid.y);
  pinchStart={
    distance:Math.max(1,distance(a,b)),
    zoom,
    contentX:(viewport.scrollLeft+vp.x)/zoom,
    contentY:(viewport.scrollTop+vp.y)/zoom,
    viewportX:vp.x,
    viewportY:vp.y
  };
  panStart=null;
  suppressClickUntil=Date.now()+350;
}

viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  try{viewport.setPointerCapture(e.pointerId)}catch(_){ }
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size===1)beginPan({x:e.clientX,y:e.clientY});
  else if(activePointers.size===2)beginPinch();
});

viewport.addEventListener('pointermove',e=>{
  if(!activePointers.has(e.pointerId))return;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

  if(activePointers.size>=2){
    e.preventDefault();
    if(!pinchStart)beginPinch();
    const ps=pointerList();
    const a=ps[0],b=ps[1];
    const d=Math.max(1,distance(a,b));
    const mid=midpoint(a,b);
    const vp=viewportPoint(mid.x,mid.y);
    const next=clamp(pinchStart.zoom*(d/pinchStart.distance),minZoom,MAX_ZOOM);
    zoom=next;
    apply();
    viewport.scrollLeft=pinchStart.contentX*zoom-vp.x;
    viewport.scrollTop=pinchStart.contentY*zoom-vp.y;
    suppressClickUntil=Date.now()+350;
    return;
  }

  if(activePointers.size===1&&panStart){
    const p=pointerList()[0];
    const dx=p.x-panStart.x,dy=p.y-panStart.y;
    if(Math.hypot(dx,dy)>4){
      panStart.moved=true;
      suppressClickUntil=Date.now()+250;
    }
    if(zoom>minZoom+.001){
      e.preventDefault();
      viewport.scrollLeft=panStart.scrollLeft-dx;
      viewport.scrollTop=panStart.scrollTop-dy;
    }
  }
},{passive:false});

function endPointer(e){
  activePointers.delete(e.pointerId);
  try{viewport.releasePointerCapture(e.pointerId)}catch(_){ }
  if(activePointers.size===1){
    const p=pointerList()[0];
    pinchStart=null;
    beginPan(p);
  }else if(activePointers.size===0){
    pinchStart=null;
    panStart=null;
  }
}
viewport.addEventListener('pointerup',endPointer);
viewport.addEventListener('pointercancel',endPointer);

// Desktop/trackpad convenience: Ctrl/Cmd + wheel zooms around the pointer.
viewport.addEventListener('wheel',e=>{
  if(!(e.ctrlKey||e.metaKey))return;
  e.preventDefault();
  const vp=viewportPoint(e.clientX,e.clientY);
  const contentX=(viewport.scrollLeft+vp.x)/zoom;
  const contentY=(viewport.scrollTop+vp.y)/zoom;
  const factor=Math.exp(-e.deltaY*.0025);
  zoom=clamp(zoom*factor,minZoom,MAX_ZOOM);
  apply();
  viewport.scrollLeft=contentX*zoom-vp.x;
  viewport.scrollTop=contentY*zoom-vp.y;
},{passive:false});

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

window.addEventListener('resize',()=>{
  const oldMin=minZoom;
  minZoom=computeFitZoom();
  if(Math.abs(zoom-oldMin)<.01||zoom<minZoom){fit();}
});
window.addEventListener('mtr-selection-change',selected);

if(img.complete&&img.naturalWidth){nw=img.naturalWidth;nh=img.naturalHeight;build();fit()}
})();
