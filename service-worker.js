'use strict';
/* Finance Calculator 4.0 — aggiornamenti affidabili e funzionamento offline */
const CACHE='finance-calculator-v4.0.0';
const ASSETS=[
 './','./index.html','./style.css?v=4.0.0','./theme-v4.css?v=4.0.0',
 './finance.js?v=4.0.0','./app.js?v=4.0.0','./manifest.webmanifest',
 './icons/icon-192.svg','./icons/icon-512.svg','./icons/apple-touch-icon.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith('finance-calculator-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const networkFirst=req.mode==='navigate'||['style','script','manifest'].includes(req.destination);
    if(networkFirst){
      try{
        const response=await fetch(req,{cache:'no-cache'});
        if(response.ok)await cache.put(req,response.clone());
        return response;
      }catch{
        return (await cache.match(req)) ||
          (req.mode==='navigate' ? (await cache.match('./index.html')) : undefined) ||
          Response.error();
      }
    }
    const match=await cache.match(req);
    if(match)return match;
    try{
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    }catch{return Response.error();}
  })());
});
