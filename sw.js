const CACHE="mta1-pwa-milestones-v1";
const APP_SHELL=[
  "./mta_1train_pwa_lockscreen_milestones.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      await cache.addAll(APP_SHELL);
      // Cache protobuf runtime for reopening offline after first install.
      try{
        const url="https://cdn.jsdelivr.net/npm/protobufjs@7.5.4/dist/protobuf.min.js";
        const r=await fetch(url,{mode:"no-cors"});
        await cache.put(url,r);
      }catch{}
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const protobuf=url.hostname==="cdn.jsdelivr.net" &&
    url.pathname.includes("/protobufjs@7.5.4/");

  // Cache only app-shell resources. Live MTA/weather/routing APIs remain network-only.
  if(!sameOrigin && !protobuf) return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;

      return fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        return response;
      });
    })
  );
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if("focus" in client) return client.focus();
      }
      return clients.openWindow("./mta_1train_pwa_lockscreen_milestones.html");
    })
  );
});
