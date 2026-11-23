const CACHE = 'coffee-loyalty-v5';
const PRECACHE = ['/', '/logo_houssem.jpeg', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Bieny Coffeeshop';
  const bodyText = data.body || data.message || '';
  const notifUrl = data.url || (data.data && data.data.url) || '/';
  const options = {
    body: bodyText,
    icon: data.icon || '/logo_houssem.jpeg',
    badge: '/logo_houssem.jpeg',
    data: {
      url: notifUrl,
      title: title,
      body: bodyText,
      type: data.type || (data.data && data.data.type) || 'generic',
      image_url: data.image_url || (data.data && data.data.image_url) || null,
      btn_text: data.btn_text || (data.data && data.data.btn_text) || 'Découvrir & Profiter',
      btn_action: data.btn_action || (data.data && data.data.btn_action) || 'close',
      timestamp: Date.now(),
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification?.data || {};
  const baseTargetUrl = notifData.url || '/';

  // Construct target URL with notification details in hash/params so app catches it immediately
  const parsedUrl = new URL(baseTargetUrl, self.location.origin);
  const notifPayload = {
    title: notifData.title || event.notification.title || 'Bieny Coffeeshop',
    body: notifData.body || event.notification.body || '',
    type: notifData.type || 'generic',
    image_url: notifData.image_url || null,
    btn_text: notifData.btn_text || 'Découvrir & Profiter',
    btn_action: notifData.btn_action || 'close',
    timestamp: Date.now(),
  };
  parsedUrl.searchParams.set('notif_open', '1');
  parsedUrl.searchParams.set('notif_data', encodeURIComponent(JSON.stringify(notifPayload)));
  const finalUrl = parsedUrl.toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Broadcast to any open windows
      for (const c of list) {
        c.postMessage({
          type: 'BIENY_NOTIFICATION_CLICK',
          payload: notifPayload,
        });
      }

      // Try to focus existing client window
      for (const c of list) {
        if ('focus' in c) {
          c.focus();
          if ('navigate' in c) {
            return c.navigate(finalUrl);
          }
          return;
        }
      }
      // If no window open, open new window
      if (clients.openWindow) return clients.openWindow(finalUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for navigations and API/Supabase calls
  if (req.mode === 'navigate' || url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
      return res;
    }).catch(() => cached))
  );
});