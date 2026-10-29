'use strict';
/* Finance Calculator PWA 3.0: prefer network for app code, preserve offline fallback. */
const CACHE = 'finance-calculator-v3.0.0';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=3.0.0',
  './theme-v3.css?v=3.0.0',
  './finance.js?v=3.0.0',
  './app.js?v=3.0.0',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('finance-calculator-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const req=event.request;
  const u=new URL(req.url);
  if(req.method!=='GET' || u.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const useNetworkFirst=req.mode==='navigate'||['style','script','manifest'].includes(req.destination);
    if(useNetworkFirst){
      try{
        const response=await fetch(req,{cache:'no-cache'});
        if(response.ok)await cache.put(req,response.clone());
        return response;
      }catch{
        return await cache.match(req) || (req.mode==='navigate' ? await cache.match('./index.html') : undefined) || Response.error();
      }
    }
    const cached=await cache.match(req);
    if(cached)return cached;
    try{
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    }catch{return Response.error();}
  })());
});
