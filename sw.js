const CACHE="mta1-pwa-v20260822-2";

const STATIC_SHELL=[
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(STATIC_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(k=>k!==CACHE)
          .map(k=>caches.delete(k))
      )
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const url=new URL(event.request.url);

  // Never intercept live external APIs.
  if(url.origin!==self.location.origin) return;

  // IMPORTANT:
  // Installed web app navigation should use the newest index.html when online.
  // Cache is only the offline fallback.
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE)
            .then(cache=>cache.put("./",copy))
            .catch(()=>{});
          return response;
        })
        .catch(async ()=>{
          return (await caches.match("./")) ||
                 (await caches.match(event.request)) ||
                 Response.error();
        })
    );
    return;
  }

  // Static local files: cache-first, refresh cache after first fetch.
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;

      return fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE)
          .then(cache=>cache.put(event.request,copy))
          .catch(()=>{});
        return response;
      });
    })
  );
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type:"window",
      includeUncontrolled:true
    }).then(list=>{
      for(const client of list){
        if("focus" in client) return client.focus();
      }
      return clients.openWindow("./");
    })
  );
});
