(()=>{
'use strict';
const viewport=document.querySelector('.map-viewport'),stage=document.querySelector('.map-stage'),img=document.getElementById('officialMap'),layer=document.querySelector('.hotspots');if(!viewport||!stage||!img||!layer)return;
let zoom=.5;const W=1536;function apply(){stage.style.width=`${W*zoom}px`;img.style.width=`${W*zoom}px`;layer.style.width=`${W*zoom}px`;layer.style.height=`${(1013)*zoom}px`;for(const b of layer.children){b.style.left=`${b.dataset.x}%`;b.style.top=`${b.dataset.y}%`;}}
function fit(){zoom=Math.max(.24,Math.min(1,(viewport.clientWidth-4)/W));apply();viewport.scrollTo({left:0,top:0})}
function build(){layer.innerHTML='';for(const [st,[x,y]] of Object.entries(window.MTR_MAP_POINTS||{})){const b=document.createElement('button');b.className='map-hit';b.type='button';b.dataset.station=st;b.dataset.x=x;b.dataset.y=y;b.style.left=`${x}%`;b.style.top=`${y}%`;b.setAttribute('aria-label',st);b.addEventListener('click',()=>window.setStationFromMap?.(st));layer.appendChild(b)}sel()}
function sel(){const s=window.MTR_UI?.selections||{};layer.querySelectorAll('.map-hit').forEach(b=>b.classList.toggle('selected',b.dataset.station===s.from||b.dataset.station===s.to))}
img.addEventListener('load',()=>{document.getElementById('mapMissing').style.display='none';build();setTimeout(fit,0)});img.addEventListener('error',()=>{img.style.display='none';layer.style.display='none';const ob=document.getElementById('mapPdfFallback');ob.style.display='block';document.getElementById('mapMissing').style.display='block'});
window.addEventListener('mtr-selection-change',sel);document.getElementById('zoomIn')?.addEventListener('click',()=>{zoom=Math.min(1.45,zoom+.12);apply()});document.getElementById('zoomOut')?.addEventListener('click',()=>{zoom=Math.max(.25,zoom-.12);apply()});document.getElementById('zoomFit')?.addEventListener('click',fit);setTimeout(fit,50);
})();
