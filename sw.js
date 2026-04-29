// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker v127 (stale-while-revalidate)
// ═══════════════════════════════════════════════════════════════════
// Strategy moderne (Twitter, GitHub, Notion):
//  - HTML: NETWORK-FIRST → gjithmonë provon fresh, cache si fallback
//  - JS/CSS: STALE-WHILE-REVALIDATE → instant nga cache, update në bg
//  - recover.html: ASNJËHERË cache, gjithmonë fresh
//  - Cross-origin (CDN): browser bën gjithçka normalisht
//
// SAFETY:
//  - Asnjë postMessage që trigger-on reload (mësimi nga v117 disaster)
//  - clients.claim() merr kontrollin POSTÉ install, jo gjatë update
//  - Old caches (versionet e mëparshme) fshihen te activate
//  - Çdo cache.put i wrappuar në try/catch për të mos crashed fetch
// ═══════════════════════════════════════════════════════════════════

const SW_VERSION = 'v127';
const CACHE_NAME = 'hurma-' + SW_VERSION;

// Pre-cache i kufizuar — vetëm essentials. Pjesa tjetër cache-ohet
// on-demand nga fetch handler. Pre-cache i madh = install i ngadaltë.
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// ── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW ' + SW_VERSION + '] install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // addAll fail-safe: nëse ndonjë URL fail, cache i tjerët vazhdojnë
            return Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(url).catch((err) => console.warn('[SW] precache miss:', url, err.message))
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW ' + SW_VERSION + '] activate');
    event.waitUntil((async () => {
        // Fshi cache-t e vjetra (versionet e tjera)
        try {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => {
                    console.log('[SW] deleting old cache:', k);
                    return caches.delete(k);
                })
            );
        } catch (e) { console.warn('[SW] cache cleanup:', e); }
        // Merr kontrollin e klientëve të hapur menjëherë
        try { await self.clients.claim(); } catch (e) {}
    })());
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Skip non-GET (POST/PUT etc shkojnë drejtpërdrejt)
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); }
    catch (e) { return; } // skip URL invalide

    // Skip cross-origin (Chart.js, xlsx CDN handled by browser default cache)
    if (url.origin !== self.location.origin) return;

    // recover.html: gjithmonë fresh, asnjëherë cache (panic button)
    if (url.pathname === '/recover.html') return;

    // sw.js: gjithmonë fresh (browser update detection)
    if (url.pathname === '/sw.js') return;

    // HTML pages → NETWORK-FIRST
    const isHTML = req.destination === 'document' ||
                   url.pathname === '/' ||
                   url.pathname.endsWith('.html');
    if (isHTML) {
        event.respondWith(networkFirst(req));
        return;
    }

    // Everything else (JS, CSS, JSON, images) → STALE-WHILE-REVALIDATE
    event.respondWith(staleWhileRevalidate(req));
});

// ── STRATEGIES ─────────────────────────────────────────────

async function networkFirst(request) {
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
    } catch (err) {
        // Offline → kthe nga cache nëse kemi
        const cached = await caches.match(request);
        if (cached) {
            console.log('[SW] offline → cache hit:', request.url);
            return cached;
        }
        // Asnjë fallback → fail (browser shfaq "no internet")
        throw err;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Background fetch (mos prit, përditëso cache për herën tjetër)
    const networkPromise = fetch(request).then((res) => {
        if (res && res.status === 200) {
            cache.put(request, res.clone()).catch(() => {});
        }
        return res;
    }).catch(() => cached); // nëse offline, kthe cache si fallback

    // Kthe cache MENJËHERË nëse kemi (instant load!)
    // Përndryshe, prit network
    return cached || networkPromise;
}

// ── MESSAGE ────────────────────────────────────────────────
// Klient mund të dërgojë { type: 'SKIP_WAITING' } për të aktivizuar SW të ri
// pa pritur navigim. Përdoret për "Update available" → click → reload.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW ' + SW_VERSION + '] loaded — stale-while-revalidate active');
