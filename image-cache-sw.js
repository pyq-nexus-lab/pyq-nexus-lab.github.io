'use strict';
// Cache only immutable public screenshots, never accounts, answers, HTML or API calls.
const IMAGE_CACHE='pyq-question-images-v1',MAX_IMAGES=160;
const scope=new URL('./question-images/',self.registration.scope).href;
let trimming=Promise.resolve();
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||!url.href.startsWith(scope)||!/^\/[a-f0-9]{2}\/[a-f0-9]{64}\.(webp|png|jpg)$/.test(url.href.slice(scope.length-1))||url.search)return;
  event.respondWith((async()=>{
    let cache;try{cache=await caches.open(IMAGE_CACHE);const saved=await cache.match(request);if(saved)return saved;}catch{}
    const response=await fetch(request);
    if(response.ok&&response.type!=='opaque'&&cache){
      const copy=response.clone();
      event.waitUntil((async()=>{
        try{await cache.put(request,copy);}catch{return;}
        trimming=trimming.catch(()=>{}).then(async()=>{const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-MAX_IMAGES)).map(key=>cache.delete(key)));});
        await trimming;
      })().catch(()=>{}));
    }
    return response;
  })());
});
