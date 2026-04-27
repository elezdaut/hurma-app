// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker NO-OP (v999-killswitch-final)
// ═══════════════════════════════════════════════════════════════════
// KISS: Asnjë fetch handler. Vetëm install + activate që fshijnë gjithçka
// dhe unregister vetën. Pa loop, pa intercept.
//
// Kur browser-i kontrollon update për sw.js, merr këtë version. Skip waiting
// → activate → fshin tërë cache → unregister vetë. Asnjë postMessage, asnjë
// reload artificial. Klienti pas refresh natyror s'do ketë më SW.
// ═══════════════════════════════════════════════════════════════════

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil((async function() {
        // Fshi tërë cache-t (Cache API)
        try {
            var keys = await caches.keys();
            await Promise.all(keys.map(function(k) { return caches.delete(k); }));
        } catch (e) {}
        // Unregister këtë SW përfundimisht
        try { await self.registration.unregister(); } catch (e) {}
    })());
});

// MOS shto fetch handler — lëre browser-in të bëjë çdo gjë normalisht
// Asnjë respondWith, asnjë intercept, asnjë cache busting
