(()=>{'use strict';
const viewport=document.querySelector('.map-viewport'),stage=document.querySelector('.map-stage'),img=document.getElementById('officialMap'),layer=document.querySelector('.hotspots'),fallback=document.getElementById('officialMapFallback'),tools=document.querySelector('.map-tools');if(!viewport||!stage||!img||!layer)return;
let zoom=1,nw=1536,nh=1013;
const stationLines=(name)=>window.MTR_STATION_LINES?.[name]||[];
const stationColors=(name)=>stationLines(name).map(id=>window.MTR_LINE_BY_ID?.[id]?.color).filter(Boolean);
const isInterchange=(name)=>stationLines(name).length>1;
function apply(){const w=nw*zoom,h=nh*zoom;stage.style.width=w+'px';stage.style.height=h+'px';img.style.width=w+'px';img.style.height=h+'px';layer.style.width=w+'px';layer.style.height=h+'px'}
function fit(){if(!viewport.clientWidth||stage.style.display==='none')return;zoom=Math.max(.18,Math.min(1,(viewport.clientWidth-2)/nw));apply();viewport.scrollTo({left:0,top:0})}
function selected(){const s=window.MTR_UI?.selections||{};layer.querySelectorAll('.map-hit').forEach(b=>b.classList.toggle('selected',b.dataset.station===s.from||b.dataset.station===s.to))}
function build(){layer.innerHTML='';for(const [st,p] of Object.entries(window.MTR_MAP_POINTS||{})){
 const b=document.createElement('button');b.type='button';b.className='map-hit';b.dataset.station=st;
 const colors=stationColors(st); const primary=(p&&typeof p==='object'&&!Array.isArray(p)&&p.color)||colors[0]||'#111827';
 if(isInterchange(st)) b.classList.add('interchange-hit'); else b.classList.add('station-hit');
 b.style.setProperty('--hit',primary);
 b.style.setProperty('--ring-a',colors[0]||primary);
 b.style.setProperty('--ring-b',colors[1]||colors[0]||primary);
 b.style.setProperty('--ring-c',colors[2]||colors[1]||colors[0]||primary);
 let x,y;if(Array.isArray(p)){[x,y]=p}else{x=(p.cx!=null?p.cx:p.x);y=(p.cy!=null?p.cy:p.y)}
 if(x==null||y==null) continue;
 b.style.left=x+'%'; b.style.top=y+'%';
 if(p&&typeof p==='object'&&!Array.isArray(p)){
   if(p.w)b.style.setProperty('--w',String(p.w));
   if(p.h)b.style.setProperty('--h',String(p.h));
   if(p.shape)b.dataset.shape=p.shape;
 }
 b.title=st;b.setAttribute('aria-label',st);b.addEventListener('click',()=>window.setStationFromMap?.(st));layer.appendChild(b)
}
selected()}
function showFallback(){stage.style.display='none';if(tools)tools.style.display='none';viewport.classList.add('pdf-fallback-mode');if(fallback){fallback.hidden=false;fallback.style.display='block';if(!fallback.getAttribute('src'))fallback.src=fallback.dataset.src||''}}
img.addEventListener('load',()=>{if(!img.naturalWidth)return showFallback();nw=img.naturalWidth||1536;nh=img.naturalHeight||1013;build();fit()});img.addEventListener('error',showFallback);
window.addEventListener('resize',fit);window.addEventListener('mtr-selection-change',selected);document.getElementById('zoomIn')?.addEventListener('click',()=>{zoom=Math.min(1.8,zoom+.14);apply()});document.getElementById('zoomOut')?.addEventListener('click',()=>{zoom=Math.max(.18,zoom-.14);apply()});document.getElementById('zoomFit')?.addEventListener('click',fit);setTimeout(fit,80);
})();
