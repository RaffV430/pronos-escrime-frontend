/* No authenticated page, API response, token or prediction is cached. */
const CACHE = 'pronos-public-v3';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/offline.html', '/app-icon.svg']))
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
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin ||
    event.request.mode !== 'navigate'
  )
    return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
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
    self.registration.showNotification(data.title.slice(0, 120), {
      body: notificationBody(data).slice(0, 200),
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: String(data.tag || 'pronos'),
      renotify: false,
      data: { url: url.href },
    }),
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
