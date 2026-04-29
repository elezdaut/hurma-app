// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker v130 (KILLSWITCH AGAIN)
// ═══════════════════════════════════════════════════════════════════
// Pas v127 SWR, përdoruesi raportoi ekran krejtësisht bosh — dyshohet
// që SW po servonte HTML cached të vjetër. Kthimi te killswitch:
// fshi gjithçka, unregister, asnjë intercept.
//
// KILLSWITCH STRICT:
//   - Pa fetch handler (ose fetch handler që VETËM bypass-on)
//   - Activate fshin TËRË cache + clients.claim + unregister
//   - Klienti pas refresh-it natyror s'ka më SW = kërkesa direkte në server
//
// Pse: 1MB minified shkarkohet shpejt me Render gzip. Cache i SW
// shtonte komplikim pa përfitim të dukshëm. Stabiliteti > optimizim.
// ═══════════════════════════════════════════════════════════════════

const SW_VERSION = 'v130-killswitch';

self.addEventListener('install', (event) => {
    console.log('[SW ' + SW_VERSION + '] install — auto-skipWaiting');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW ' + SW_VERSION + '] activate — fshi cache + unregister');
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
            console.log('[SW] deleted', keys.length, 'caches');
        } catch (e) { console.warn('[SW] cache delete:', e); }
        try { await self.clients.claim(); } catch (e) {}
        try { await self.registration.unregister(); console.log('[SW] unregistered'); } catch (e) {}
    })());
});

// ZERO fetch handler — browser bën gjithçka normalisht. Asnjë intercept.

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
