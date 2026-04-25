// ===================== HURMA APP — SERVICE WORKER =====================
// Versioni i cache-it. Ndrysho këtë vlerë kur publikon update të ri.
const CACHE_VERSION = 'hurma-v77';

// Skedarët lokalë që kachojmë për punë offline
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/i18n.js',
    '/hurma-polish.js',
    '/hurma-ai.js',
    '/style.css',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/manifest.json'
];

// ===================== INSTALL =====================
// Kur SW instalohet, kachon të gjitha skedarët kryesorë
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ===================== ACTIVATE =====================
// Fshi cache-t e vjetra kur aktivizohet versioni i ri
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ===================== FETCH (Offline-first) =====================
// Strategjia: Cache-first për skedarët lokalë, Network-first për CDN
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Kërkesat CDN: provo rrjetin, nëse dështon kthe nga cache
    if (url.origin !== self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Skedarët lokalë: network-first për HTML dhe app.js (që të marrin gjithmonë versionin e fundit),
    // cache-first për asetet statike (ikona, manifest).
    const pathname = url.pathname;
    const isCriticalFile = pathname === '/' ||
                           pathname.endsWith('.html') ||
                           pathname.endsWith('.js') ||
                           pathname.endsWith('.css');

    if (isCriticalFile) {
        // Network-first me cache-busting për HTML/JS/CSS: shto timestamp në kërkesë
        // që të mos marrim kurrë versionin e cache-uar të browserit vetë.
        const bustUrl = event.request.url + (event.request.url.includes('?') ? '&' : '?') + '__sw=' + Date.now();
        const bustReq = new Request(bustUrl, {
            method: event.request.method,
            headers: event.request.headers,
            mode: 'same-origin',
            credentials: event.request.credentials,
            redirect: event.request.redirect,
            cache: 'no-store'
        });
        event.respondWith(
            fetch(bustReq)
                .then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request, { ignoreSearch: true })
                    .then(cached => cached || caches.match('/index.html', { ignoreSearch: true })))
        );
        return;
    }

    // Asete statike: cache-first me ignoreSearch (që ?v=X të mos krijojë cache të panevojshme)
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
            .catch(() => caches.match('/index.html', { ignoreSearch: true }))
    );
});

// ===================== PUSH NOTIFICATIONS =====================
// Merr njoftimet nga serveri (e ardhmja — kur të ketë backend)
self.addEventListener('push', event => {
    let data = { title: '🌴 Hurma App', body: 'Ke një njoftim të ri.', tag: 'hurma-generic' };

    if (event.data) {
        try { data = { ...data, ...event.data.json() }; } catch (e) { data.body = event.data.text(); }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-192.svg',
            tag: data.tag || 'hurma-push',
            vibrate: [200, 100, 200],
            requireInteraction: data.requireInteraction || false,
            data: data.url ? { url: data.url } : {}
        })
    );
});

// ===================== NOTIFICATION CLICK =====================
// Kur përdoruesi klikon një njoftim, hap app-in
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url)
        ? event.notification.data.url
        : '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clients => {
                // Nëse app-i është i hapur, fokusohet
                for (const client of clients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
                        return client.focus();
                    }
                }
                // Nëse app-i është i mbyllur, hap tab të ri
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});

// ===================== MESAZHE NGA APP =====================
// App-i mund të dërgojë mesazhe te SW (p.sh. për të shfaqur njoftime)
self.addEventListener('message', event => {
    if (!event.data) return;

    switch (event.data.type) {

        // App-i kërkon të shfaqë një njoftim lokal
        case 'SHOW_NOTIFICATION':
            self.registration.showNotification(event.data.title, {
                body: event.data.body,
                icon: '/icons/icon-192.svg',
                badge: '/icons/icon-192.svg',
                tag: event.data.tag || 'hurma-local',
                vibrate: [150, 75, 150],
                requireInteraction: event.data.requireInteraction || false,
                data: event.data.url ? { url: event.data.url } : {}
            });
            break;

        // App-i kërkon skip waiting (update i ri i disponueshëm)
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});
