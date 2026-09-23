const CACHE='travaglio-suprema-ia-v5';

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(
    request.mode==='navigate' ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.startsWith('/assets/episodes/')
  ){
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }
});
