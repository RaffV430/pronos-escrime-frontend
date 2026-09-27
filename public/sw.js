/* No authenticated page, API response, token or prediction is cached. */
const CACHE='pronos-public-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/app-icon.svg'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pronos-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||event.request.mode!=='navigate')return;event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});

self.addEventListener('push',event=>{
 let data;try{data=event.data?.json();}catch{return;}
 if(!data||typeof data.title!=='string')return;
 let url;try{url=new URL(data.url,self.location.origin);if(url.origin!==self.location.origin)return;}catch{return;}
 event.waitUntil(self.registration.showNotification(data.title.slice(0,120),{body:String(data.body||'').slice(0,200),icon:'/app-icon-192.png',badge:'/app-icon-192.png',tag:String(data.tag||'pronos'),renotify:false,data:{url:url.href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 let url;try{url=new URL(event.notification.data?.url||'/',self.location.origin);if(url.origin!==self.location.origin)return;}catch{return;}
 // A new view preserves any unsaved predictions in an existing open view.
 event.waitUntil(self.clients.openWindow(url.href));
});
