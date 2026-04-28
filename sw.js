// ═══════════════════════════════════════════════════════════════════
// HURMA APP — Service Worker NO-OP + AUTO-RELOAD (v117-killswitch-reload)
// ═══════════════════════════════════════════════════════════════════
// Versioni 999-killswitch unregister-onte vetën, por nuk i njoftonte
// klientët që të rifreskoheshin. Si rezultat, përdoruesit me iPhone që
// kishin SW-në e vjetër aktiv, vazhdonin të shihnin kod të vjetër deri
// sa të bënin hard refresh manualisht.
//
// Ky version dërgon postMessage te të gjithë klientët pas activate-it,
// dhe index.html (linja 1459+) është konfiguruar të bëjë location.reload()
// kur merr mesazhin SW_UNINSTALLED_RELOAD.
//
// Ende ZERO fetch handler — browser-i bën gjithçka normalisht.
// ═══════════════════════════════════════════════════════════════════

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil((async function() {
        // 1) Fshi tërë cache-t (Cache API)
        try {
            var keys = await caches.keys();
            await Promise.all(keys.map(function(k) { return caches.delete(k); }));
        } catch (e) {}

        // 2) Merr kontroll mbi çdo klient të hapur menjëherë (pa pritur reload)
        try { await self.clients.claim(); } catch (e) {}

        // 3) Njofto çdo klient të hapur që sapo unregister-uam — index.html
        //    ka listener për këtë mesazh dhe bën location.reload() automatik.
        try {
            var clientList = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });
            clientList.forEach(function(client) {
                try {
                    client.postMessage({
                        type: 'SW_UNINSTALLED_RELOAD',
                        from: 'sw-v117',
                        ts: Date.now()
                    });
                } catch (e) {}
            });
        } catch (e) {}

        // 4) Unregister këtë SW përfundimisht
        try { await self.registration.unregister(); } catch (e) {}
    })());
});

// MOS shto fetch handler — lëre browser-in të bëjë çdo gjë normalisht
// Asnjë respondWith, asnjë intercept, asnjë cache busting
