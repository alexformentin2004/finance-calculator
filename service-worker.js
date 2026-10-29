'use strict';
/* Finance Calculator 6.0 - offline cache, network-first for updates */
const CACHE='finance-calculator-v6.0.0';
const ASSETS=[
 './','./index.html',
 './style.css?v=6.0.0',
 './theme-v6.css?v=6.0.0',
 './finance.js?v=6.0.0',
 './app.js?v=6.0.0',
 './manifest.webmanifest',
 './icons/icon-192.svg',
 './icons/icon-512.svg',
 './icons/apple-touch-icon.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('finance-calculator-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   if(req.mode==='navigate'||['style','script','manifest'].includes(req.destination)){
     try{const response=await fetch(req,{cache:'no-cache'});if(response.ok)await cache.put(req,response.clone());return response;}
     catch{return await cache.match(req)||(req.mode==='navigate'?await cache.match('./index.html'):undefined)||Response.error();}
   }
   const hit=await cache.match(req);
   if(hit)return hit;
   try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}
   catch{return Response.error();}
 })());
});
