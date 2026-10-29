'use strict';
const CACHE='finance-calculator-v1.0.1';
const ASSETS=['./','./index.html','./style.css','./finance.js','./app.js','./manifest.webmanifest','./icons/icon-192.svg','./icons/icon-512.svg','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('finance-calculator-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate'){
   try{const network=await fetch(event.request);if(network.ok)cache.put(event.request,network.clone());return network;}
   catch{return await cache.match(event.request)||await cache.match('./index.html')||Response.error();}
  }
  const hit=await cache.match(event.request);if(hit)return hit;
  try{const network=await fetch(event.request);if(network.ok)cache.put(event.request,network.clone());return network;}
  catch{return Response.error();}
 })());
});