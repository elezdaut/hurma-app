// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker NO-OP (v118-killswitch-safe)
// ═══════════════════════════════════════════════════════════════════
// REVERT i v117: postMessage(SW_UNINSTALLED_RELOAD) shkaktonte loop
// infinit reload-i sepse çdo page load regjistronte SW, që pastaj
// dërgonte reload, që rifreskonte, që regjistronte SW përsëri…
//
// Tani, si v999 origjinal, sw.js VETËM:
// 1) Fshin cache-t (Cache API)
// 2) Unregister vetën
// PA postMessage, PA reload artificial.
//
// Klienti pas refresh-it të radhës natyror s'do ketë më SW dhe do
// marrë `?v=118` të reja nga server-i.
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
// MOS dërgo postMessage — shkakton reload loop me SW që unregister-on
