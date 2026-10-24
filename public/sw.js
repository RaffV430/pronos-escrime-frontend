/* Only the public SPA shell and immutable assets are cached here. Account data uses the scoped consultation cache. */
const CACHE = 'pronos-public-v4';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/offline.html', '/app-icon.svg']))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('pronos-public-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const known = await cache.match(event.request);
        if (known) return known;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      }),
    );
  } else if (event.request.mode === 'navigate') {
    const update = fetch(event.request).then(async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
        const cache = await caches.open(CACHE);
        await cache.put('/', response.clone());
      }
      return response;
    });
    event.waitUntil(update.catch(() => {}));
    event.respondWith(caches.match('/').then((shell) => shell || update.catch(() => caches.match('/offline.html'))));
  }
});

function notificationBody(data, now = new Date()) {
  const t = data.timing;
  if (t?.version !== 1 || typeof t.round !== 'string' || !Number.isInteger(t.count) || t.count < 1)
    return String(data.body || '');
  const date = t.closesAt ? new Date(t.closesAt) : null;
  let closing = 'horaire de clôture à confirmer';
  if (date && Number.isFinite(date.getTime())) {
    // No timeZone override: use the receiving device's current zone, even when the app is closed.
    const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
      date,
    );
    closing = `${t.staggered ? 'clôtures dès' : 'clôture à'} ${time}${day.format(date) !== day.format(now) ? ` le ${day.format(date)}` : ''}`;
  }
  return `${t.round} · ${t.count} match${t.count > 1 ? 's' : ''} ${t.kind === 'REMINDER' ? 'à compléter' : 'à pronostiquer'} · ${closing}`;
}

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    return;
  }
  if (!data || typeof data.title !== 'string') return;
  let url;
  try {
    url = new URL(data.url, self.location.origin);
    if (url.origin !== self.location.origin) return;
  } catch {
    return;
  }
  event.waitUntil(
    Promise.all([
      data.adminAlert && self.navigator.setAppBadge
        ? (data.badgeCount === 0
            ? self.navigator.clearAppBadge()
            : self.navigator.setAppBadge(Number.isInteger(data.badgeCount) ? data.badgeCount : undefined)
          ).catch(() => {})
        : Promise.resolve(),
      self.registration.showNotification(data.title.slice(0, 120), {
        body: notificationBody(data).slice(0, 200),
        icon: '/app-icon-192.png',
        badge: '/notification-badge-96.png',
        tag: String(data.tag || 'pronos'),
        renotify: false,
        data: { url: url.href },
      }),
    ]),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url;
  try {
    url = new URL(event.notification.data?.url || '/', self.location.origin);
    if (url.origin !== self.location.origin) return;
  } catch {
    return;
  }
  // A new view preserves any unsaved predictions in an existing open view.
  event.waitUntil(self.clients.openWindow(url.href));
});
