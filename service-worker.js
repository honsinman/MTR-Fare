const CACHE='mtr-fare-v64-shell';
const CORE=['./','./index.html','./lite/','./lite/index.html','./light-rail/','./light-rail/index.html','./assets/styles.css','./assets/network.js','./assets/ael-fallback.js','./assets/fare-index.js','./assets/light-rail-stops.js','./assets/mtr-app.js','./assets/light-rail.js','./assets/map.js','./assets/map-hotspots.js','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const dynamic=/\/data\/fare\//.test(u.pathname)||/\/assets\/mtr-system-map\.(png|pdf)$/.test(u.pathname);
 if(dynamic){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x.ok){const y=x.clone();caches.open(CACHE).then(c=>c.put(e.request,y)).catch(()=>{})}return x})));
});
