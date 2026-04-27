// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker KILL-SWITCH (v100)
// ═══════════════════════════════════════════════════════════════════
// Pse "kill-switch": Versionet e mëparshme të SW-së (v75-v95) cache-uan
// HTML/JS me strategjinë network-first. Por kur browser-i ngec në SW
// të vjetër, faqja s'merr update. Tani SW-ja e re VETË-DEINSTALOHET dhe
// pastron tërë cache-in. Pas reload-it, app-i punon pa SW (nga rrjeti
// drejtpërsëdrejti, me Cache-Control: no-cache te HTML).
//
// User-ët në v75-v99: Sapo update-i tjetër ngarkohet (nga ndonjë vizitë),
// SW-ja e re instalohet → aktivizohet → fshin caches → unregister →
// klientët reload → faqja punon nga rrjeti drejtpërdrejt. PROBLEMI ZGJIDHET.
// ═══════════════════════════════════════════════════════════════════

self.addEventListener('install', event => {
    // Skip waiting menjëherë — nuk ka pse të presim
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            // 1. Fshi TË GJITHA cache-t (përfshirë hurma-v* të vjetër)
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(k => caches.delete(k)));

            // 2. Vetë-deinstalim — ky SW heq veten përfundimisht
            await self.registration.unregister();

            // 3. Njofto klientët që SW u fshi (ata do reload-en vetë sipas mesazhit)
            const clientList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientList) {
                try { client.postMessage({ type: 'SW_UNINSTALLED_RELOAD' }); } catch(_) {}
            }
        } catch (e) {
            // Edhe nëse diçka dështon, vazhdojmë
            try { console.warn('[SW kill-switch] Cleanup error (ignored):', e); } catch(_){}
        }
    })());
});

// Fetch handler MINIMAL: gjithçka nga rrjeti, asgjë nga cache
self.addEventListener('fetch', event => {
    // Lëre browser-in ta menaxhojë — mos thirr respondWith fare
    return;
});
