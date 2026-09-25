(()=>{
'use strict';
const viewport=document.querySelector('.map-viewport'),stage=document.querySelector('.map-stage'),img=document.getElementById('officialMap'),layer=document.querySelector('.hotspots');
if(!viewport||!stage||!img||!layer)return;
let zoom=1,nw=1536,nh=1013;
function apply(){const w=nw*zoom,h=nh*zoom;stage.style.width=w+'px';stage.style.height=h+'px';img.style.width=w+'px';img.style.height=h+'px';layer.style.width=w+'px';layer.style.height=h+'px'}
function fit(){if(!viewport.clientWidth)return;zoom=Math.max(.18,Math.min(1,(viewport.clientWidth-2)/nw));apply();viewport.scrollTo({left:0,top:0})}
function selected(){const s=window.MTR_UI?.selections||{};layer.querySelectorAll('.map-hit').forEach(b=>b.classList.toggle('selected',b.dataset.station===s.from||b.dataset.station===s.to))}
function build(){layer.innerHTML='';for(const [st,[x,y]] of Object.entries(window.MTR_MAP_POINTS||{})){const b=document.createElement('button');b.type='button';b.className='map-hit';b.dataset.station=st;b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label',st);b.addEventListener('click',()=>window.setStationFromMap?.(st));layer.appendChild(b)}selected()}
img.addEventListener('load',()=>{nw=img.naturalWidth||1536;nh=img.naturalHeight||1013;build();fit()});
img.addEventListener('error',()=>{img.style.display='none';layer.style.display='none';document.getElementById('mapMissing')?.style.setProperty('display','block')});
window.addEventListener('resize',fit);window.addEventListener('mtr-selection-change',selected);
document.getElementById('zoomIn')?.addEventListener('click',()=>{zoom=Math.min(1.8,zoom+.14);apply()});
document.getElementById('zoomOut')?.addEventListener('click',()=>{zoom=Math.max(.18,zoom-.14);apply()});
document.getElementById('zoomFit')?.addEventListener('click',fit);
setTimeout(fit,80);
})();
