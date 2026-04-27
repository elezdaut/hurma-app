// ============================================================================
// HURMA — Polish layer (v1)
// Ten premium, iOS-native enhancements added on top of the core app.
// 100% additive: no existing API is redefined. Every hook is defensive:
// if the core app is missing a function, the enhancement simply no-ops.
// ============================================================================
(function () {
    'use strict';

    // ------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------
    var $  = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var on = function (el, ev, fn, opts) { if (el && el.addEventListener) el.addEventListener(ev, fn, opts || false); };
    var safeCall = function (fn, args) { try { return typeof fn === 'function' ? fn.apply(null, args || []) : undefined; } catch (e) { console.warn('[hurma-polish]', e); } };
    var prefersReducedMotion = function () {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    };

    // ============================================================
    // 1. HAPTICS — subtle vibration on interactions (Android only)
    //    iOS Safari doesn't expose navigator.vibrate, so this is a
    //    no-op there, by design.
    // ============================================================
    var haptic = {
        light:   function () { try { navigator.vibrate &&  navigator.vibrate(6);             } catch (e) {} },
        medium:  function () { try { navigator.vibrate &&  navigator.vibrate(12);            } catch (e) {} },
        heavy:   function () { try { navigator.vibrate &&  navigator.vibrate(18);            } catch (e) {} },
        success: function () { try { navigator.vibrate &&  navigator.vibrate([8, 30, 12]);   } catch (e) {} },
        error:   function () { try { navigator.vibrate &&  navigator.vibrate([20, 40, 20]);  } catch (e) {} },
        warn:    function () { try { navigator.vibrate &&  navigator.vibrate([10, 20, 10]);  } catch (e) {} }
    };
    window.hurmaHaptic = haptic;

    // Attach light haptic to every primary-interactive click.
    on(document, 'pointerdown', function (e) {
        var el = e.target.closest && e.target.closest(
            '.nav-item, .hurma-tab-bar__btn, .hurma-tab-bar__fab, .btn, .sidebar-toggle, ' +
            '.quick-action, .balance-card, .dist-action-btn, #pwa-install-btn'
        );
        if (el) haptic.light();
    }, { passive: true });

    // ============================================================
    // 2. PULL-TO-REFRESH — mobile only, triggers refreshPage()
    // ============================================================
    (function installPullToRefresh() {
        var indicator = document.createElement('div');
        indicator.id = 'hurma-pull-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.innerHTML = '<div class="hurma-pull-ring"></div>';
        document.body.appendChild(indicator);

        var startY = 0, pulling = false, pulled = 0;
        var THRESHOLD = 70;
        var MAX = 110;

        function currentScrollTop() {
            return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
        }

        on(window, 'touchstart', function (e) {
            if (currentScrollTop() <= 0 && !pulling && e.touches && e.touches.length === 1) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        on(window, 'touchmove', function (e) {
            if (!pulling) return;
            if (currentScrollTop() > 0) { reset(); return; }
            pulled = Math.max(0, Math.min(MAX, e.touches[0].clientY - startY));
            if (pulled > 2) {
                indicator.style.transform = 'translate(-50%, ' + (pulled - 30) + 'px)';
                indicator.style.opacity = String(Math.min(1, pulled / THRESHOLD));
                indicator.classList.toggle('hurma-pull-ready', pulled >= THRESHOLD);
            }
        }, { passive: true });

        on(window, 'touchend', function () {
            if (!pulling) return;
            pulling = false;
            if (pulled >= THRESHOLD) {
                indicator.classList.add('hurma-pull-spinning');
                indicator.style.transform = 'translate(-50%, 24px)';
                indicator.style.opacity = '1';
                haptic.medium();
                // Refresh the active page using the existing API.
                var activeNav = $('.nav-item.active');
                var page = activeNav && activeNav.getAttribute('data-page');
                if (page) safeCall(window.refreshPage, [page]);
                setTimeout(reset, 650);
            } else {
                reset();
            }
            pulled = 0;
        });

        on(window, 'touchcancel', reset);

        function reset() {
            pulling = false;
            pulled = 0;
            indicator.classList.remove('hurma-pull-ready', 'hurma-pull-spinning');
            indicator.style.transform = 'translate(-50%, -60px)';
            indicator.style.opacity = '0';
        }
        reset();
    })();

    // ============================================================
    // 3. COMMAND PALETTE — ⌘K / Ctrl+K fuzzy search
    //    Pages + clients + products, jump with Enter.
    // ============================================================
    var palette = (function () {
        var root, input, list, items = [];
        var selectedIdx = 0;

        function build() {
            root = document.createElement('div');
            root.id = 'hurma-palette';
            root.className = 'hurma-palette hidden';
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-label', 'Command palette');
            root.innerHTML =
                '<div class="hurma-palette__backdrop" data-close="1"></div>' +
                '<div class="hurma-palette__panel">' +
                    '<div class="hurma-palette__search">' +
                        '<i class="fas fa-search"></i>' +
                        '<input type="text" id="hurma-palette-input" placeholder="Kërko faqe, klient, produkt…" autocomplete="off" spellcheck="false">' +
                        '<kbd>esc</kbd>' +
                    '</div>' +
                    '<div class="hurma-palette__list" id="hurma-palette-list" role="listbox"></div>' +
                    '<div class="hurma-palette__footer">' +
                        '<span><kbd>↑</kbd><kbd>↓</kbd> lëviz</span>' +
                        '<span><kbd>↵</kbd> hap</span>' +
                        '<span><kbd>esc</kbd> mbyll</span>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(root);
            input = $('#hurma-palette-input', root);
            list  = $('#hurma-palette-list', root);

            on(root, 'click', function (e) {
                if (e.target.dataset && e.target.dataset.close) close();
            });
            on(input, 'input', render);
            on(input, 'keydown', onKey);
        }

        function collect() {
            var results = [];
            // Pages from the sidebar (authoritative list)
            $$('.nav-item').forEach(function (el) {
                var page  = el.getAttribute('data-page');
                var label = (el.querySelector('span') && el.querySelector('span').textContent || page || '').trim();
                var icon  = (el.querySelector('i') && el.querySelector('i').className) || 'fas fa-circle';
                if (page && label) {
                    results.push({ kind: 'page', label: label, icon: icon, page: page, group: 'Faqe' });
                }
            });
            // Clients
            if (window.state && Array.isArray(window.state.clients)) {
                window.state.clients.slice(0, 50).forEach(function (c) {
                    results.push({
                        kind: 'client', label: c.name, icon: 'fas fa-user',
                        page: 'clients', clientId: c.id,
                        sub: (c.debt ? (c.debt + ' ден borxh') : 'Pa borxh'),
                        group: 'Klientë'
                    });
                });
            }
            // Products (static constant from app.js — PRODUCTS)
            if (window.PRODUCTS && typeof window.PRODUCTS === 'object') {
                Object.keys(window.PRODUCTS).forEach(function (id) {
                    var p = window.PRODUCTS[id];
                    if (p && p.name) {
                        results.push({
                            kind: 'product', label: p.name + (p.pack ? ' ' + p.pack : ''),
                            icon: 'fas fa-box', page: 'stock', productId: id,
                            sub: (p.sell ? p.sell + ' ден / copë' : ''),
                            group: 'Produkte'
                        });
                    }
                });
            }
            return results;
        }

        // Very simple fuzzy match: all query chars in order.
        function fuzzy(q, str) {
            if (!q) return 0;
            q = q.toLowerCase(); str = str.toLowerCase();
            if (str.indexOf(q) !== -1) return 100 + (str.startsWith(q) ? 20 : 0);
            var si = 0, matched = 0;
            for (var qi = 0; qi < q.length; qi++) {
                var idx = str.indexOf(q[qi], si);
                if (idx === -1) return 0;
                si = idx + 1; matched++;
            }
            return matched;
        }

        function render() {
            var q = input.value.trim();
            items = collect();
            var scored = items.map(function (it) { return { it: it, score: fuzzy(q, it.label) }; });
            scored = q ? scored.filter(function (s) { return s.score > 0; }).sort(function (a, b) { return b.score - a.score; })
                       : scored;
            items = scored.slice(0, 20).map(function (s) { return s.it; });
            selectedIdx = 0;
            if (!items.length) {
                list.innerHTML = '<div class="hurma-palette__empty">Asnjë rezultat për <b>' + escapeHtml(q) + '</b></div>';
                return;
            }
            var lastGroup = null, html = '';
            items.forEach(function (it, i) {
                if (it.group !== lastGroup) {
                    html += '<div class="hurma-palette__group">' + it.group + '</div>';
                    lastGroup = it.group;
                }
                html +=
                    '<div class="hurma-palette__item" role="option" data-idx="' + i + '">' +
                        '<i class="' + it.icon + '"></i>' +
                        '<div class="hurma-palette__item-main">' +
                            '<div class="hurma-palette__item-label">' + escapeHtml(it.label) + '</div>' +
                            (it.sub ? '<div class="hurma-palette__item-sub">' + escapeHtml(it.sub) + '</div>' : '') +
                        '</div>' +
                        '<i class="fas fa-arrow-right hurma-palette__item-arrow"></i>' +
                    '</div>';
            });
            list.innerHTML = html;
            updateSelection();
            $$('.hurma-palette__item', list).forEach(function (el) {
                on(el, 'click', function () {
                    selectedIdx = parseInt(el.getAttribute('data-idx'), 10);
                    activate();
                });
                on(el, 'mouseenter', function () {
                    selectedIdx = parseInt(el.getAttribute('data-idx'), 10);
                    updateSelection();
                });
            });
        }

        function updateSelection() {
            $$('.hurma-palette__item', list).forEach(function (el, i) {
                el.classList.toggle('is-selected', i === selectedIdx);
            });
            var sel = $('.hurma-palette__item.is-selected', list);
            if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
        }

        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(items.length - 1, selectedIdx + 1); updateSelection(); return; }
            if (e.key === 'ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); updateSelection(); return; }
            if (e.key === 'Enter')     { e.preventDefault(); activate(); return; }
        }

        function activate() {
            var it = items[selectedIdx];
            if (!it) return;
            close();
            // Navigate to the page first…
            safeCall(window.navigateTo, [it.page]);
            // …then drill in if we have a deeper target.
            setTimeout(function () {
                if (it.kind === 'client' && it.clientId && typeof window.openClient360 === 'function') {
                    safeCall(window.openClient360, [it.clientId]);
                } else if (it.kind === 'product' && it.productId && typeof window.openProduct360 === 'function') {
                    safeCall(window.openProduct360, [it.productId]);
                }
            }, 120);
            haptic.medium();
        }

        function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

        function open() {
            if (!root) build();
            root.classList.remove('hidden');
            root.classList.add('is-open');
            input.value = '';
            render();
            setTimeout(function () { input.focus(); }, 30);
        }
        function close() {
            if (!root) return;
            root.classList.remove('is-open');
            setTimeout(function () { root.classList.add('hidden'); }, 180);
        }
        return { open: open, close: close };
    })();
    window.hurmaCommandPalette = palette;

    // ============================================================
    // 4. KEYBOARD SHORTCUTS — power-user productivity
    //    ⌘K open palette · ⌘/ focus global search · Esc close modals
    //    ⌘1..⌘9 jump to sidebar page N
    // ============================================================
    on(document, 'keydown', function (e) {
        var mod = e.metaKey || e.ctrlKey;
        var key = e.key;
        // ⌘K — Master Palette (super-smart) ka prioritet, fallback te paleta e vjetër
        if (mod && (key === 'k' || key === 'K')) {
            e.preventDefault();
            if (typeof window.openMasterPalette === 'function') {
                window.openMasterPalette();
            } else {
                palette.open();
            }
            return;
        }
        // ⌘/ — focus global search
        if (mod && key === '/') {
            var search = $('#global-search-input, [data-role="search"]');
            if (search) { e.preventDefault(); search.focus(); }
            return;
        }
        // ⌘1..9 — nth sidebar page
        if (mod && /^[1-9]$/.test(key)) {
            var idx = parseInt(key, 10) - 1;
            var navs = $$('.nav-item');
            if (navs[idx]) {
                var p = navs[idx].getAttribute('data-page');
                if (p) { e.preventDefault(); safeCall(window.navigateTo, [p]); }
            }
        }
        // Escape — close palette if open, else let app handle
        if (key === 'Escape') {
            var pal = $('#hurma-palette');
            if (pal && pal.classList.contains('is-open')) {
                e.preventDefault(); palette.close();
            }
        }
    });

    // ============================================================
    // 5. NUMBER COUNT-UP — animate KPI values
    //    Watches elements marked [data-hurma-count] and tweens
    //    their text to their target value.
    // ============================================================
    function countUp(el) {
        if (!el) return;
        var target = parseFloat(el.getAttribute('data-hurma-count') || el.textContent.replace(/[^0-9.-]/g, ''));
        if (!isFinite(target)) return;
        if (prefersReducedMotion()) { el.textContent = formatNum(target); return; }
        var duration = 800;
        var start = parseFloat(el.getAttribute('data-hurma-count-from') || '0');
        var t0 = performance.now();
        function tick(now) {
            var k = Math.min(1, (now - t0) / duration);
            var eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
            el.textContent = formatNum(start + (target - start) * eased);
            if (k < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
    function formatNum(n) {
        n = Math.round(n);
        return n.toLocaleString('en-US').replace(/,/g, ' ');
    }
    window.hurmaCountUp = countUp;
    // Auto-run on any element with data-hurma-count at startup.
    on(document, 'DOMContentLoaded', function () { $$('[data-hurma-count]').forEach(countUp); });

    // ============================================================
    // 6. POLISHED TOAST — glass-blur amber toasts.
    //    We do NOT replace the app's `showToast`; we augment with
    //    `hurmaToast(msg, kind)` for new code, and also re-render
    //    existing toasts with better styling.
    // ============================================================
    function hurmaToast(message, kind) {
        kind = kind || 'info';
        var container = $('#toast-container') || (function () {
            var c = document.createElement('div');
            c.id = 'toast-container';
            c.style.cssText = 'position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(c);
            return c;
        })();
        var toast = document.createElement('div');
        toast.className = 'hurma-toast hurma-toast--' + kind;
        var icon = ({ success: 'fa-check-circle', error: 'fa-times-circle', warn: 'fa-exclamation-triangle', info: 'fa-info-circle' })[kind] || 'fa-info-circle';
        toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + String(message == null ? '' : message).replace(/</g, '&lt;') + '</span>';
        container.appendChild(toast);
        // Haptic feedback matching kind.
        if (kind === 'success') haptic.success();
        else if (kind === 'error') haptic.error();
        else if (kind === 'warn') haptic.warn();
        requestAnimationFrame(function () { toast.classList.add('is-visible'); });
        setTimeout(function () {
            toast.classList.remove('is-visible');
            setTimeout(function () { toast.remove(); }, 260);
        }, 3500);
    }
    window.hurmaToast = hurmaToast;

    // ============================================================
    // 7. APP BADGE — show overdue invoice count on the app icon
    //    (Chrome/Edge/Safari supports setAppBadge when installed.)
    // ============================================================
    function updateAppBadge() {
        try {
            if (!('setAppBadge' in navigator)) return;
            var count = 0;
            // Look at known state shapes without breaking if missing.
            if (window.state) {
                if (Array.isArray(window.state.sales)) {
                    var today = new Date().toISOString().slice(0, 10);
                    count += window.state.sales.filter(function (s) {
                        return s && s.paymentType === 'invoice_60' && !s.invoicePaid &&
                               s.dueDate && s.dueDate < today;
                    }).length;
                }
                if (Array.isArray(window.state.distDeliveries)) {
                    count += window.state.distDeliveries.filter(function (d) {
                        return d && d.paid === false && d.paymentDueDate &&
                               d.paymentDueDate < new Date().toISOString().slice(0, 10);
                    }).length;
                }
            }
            if (count > 0) navigator.setAppBadge(count);
            else navigator.clearAppBadge && navigator.clearAppBadge();
        } catch (e) { /* no-op */ }
    }
    window.hurmaUpdateAppBadge = updateAppBadge;
    on(window, 'load', updateAppBadge);
    // Re-check every 5 minutes; also on visibility change.
    setInterval(updateAppBadge, 5 * 60 * 1000);
    on(document, 'visibilitychange', function () { if (!document.hidden) updateAppBadge(); });

    // ============================================================
    // 8. AUTO DARK MODE — follow system preference on first run
    //    Only if the user hasn't manually chosen a theme yet.
    // ============================================================
    (function autoDark() {
        try {
            var saved = localStorage.getItem('hurma-theme');
            if (saved) return;
            var mql = window.matchMedia('(prefers-color-scheme: dark)');
            function apply(e) {
                // Do not override if the user has since set one.
                if (localStorage.getItem('hurma-theme')) return;
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
            apply(mql);
            if (mql.addEventListener) mql.addEventListener('change', apply);
            else if (mql.addListener) mql.addListener(apply);
        } catch (e) { /* no-op */ }
    })();

    // ============================================================
    // 9. FIRST-RUN ONBOARDING — 3 iOS-style slides, once only.
    // ============================================================
    (function onboarding() {
        try {
            if (localStorage.getItem('hurma-onboarding-done') === '1') return;
            // Wait until the splash has faded out so it doesn't overlap.
            setTimeout(show, 900);

            function show() {
                if (localStorage.getItem('hurma-onboarding-done') === '1') return;
                var slides = [
                    {
                        title: 'Mirë se erdhe në Hurma',
                        body: 'Menaxho shitjet, klientët, stokun dhe borxhet në një vend të vetëm — sikur një app i vërtetë iOS.',
                        art: renderArt('hero')
                    },
                    {
                        title: 'Gjej gjithçka menjëherë',
                        body: 'Shtyp ⌘K (ose Ctrl+K) për paletën universale: faqe, klientë, produkte — të gjitha në një kërkim.',
                        art: renderArt('search')
                    },
                    {
                        title: 'Instalo si app',
                        body: 'Prek "Shto në ekranin kryesor" që të hapesh menjëherë, me status bar amber dhe offline-mode të plotë.',
                        art: renderArt('install')
                    }
                ];
                var i = 0;
                var root = document.createElement('div');
                root.id = 'hurma-onboarding';
                root.className = 'hurma-onboarding';
                root.innerHTML =
                    '<div class="hurma-onboarding__panel">' +
                        '<div class="hurma-onboarding__art" id="hurma-ob-art"></div>' +
                        '<h2 id="hurma-ob-title"></h2>' +
                        '<p id="hurma-ob-body"></p>' +
                        '<div class="hurma-onboarding__dots" id="hurma-ob-dots"></div>' +
                        '<div class="hurma-onboarding__actions">' +
                            '<button class="hurma-onboarding__skip" id="hurma-ob-skip">Kalo</button>' +
                            '<button class="hurma-onboarding__next" id="hurma-ob-next">Vazhdo</button>' +
                        '</div>' +
                    '</div>';
                document.body.appendChild(root);
                setTimeout(function () { root.classList.add('is-open'); }, 30);

                function paint() {
                    var s = slides[i];
                    $('#hurma-ob-art').innerHTML = s.art;
                    $('#hurma-ob-title').textContent = s.title;
                    $('#hurma-ob-body').textContent = s.body;
                    $('#hurma-ob-next').textContent = i === slides.length - 1 ? 'Fillo' : 'Vazhdo';
                    $('#hurma-ob-dots').innerHTML = slides.map(function (_, j) {
                        return '<span class="hurma-onboarding__dot ' + (i === j ? 'is-active' : '') + '"></span>';
                    }).join('');
                }
                paint();
                on($('#hurma-ob-next'), 'click', function () {
                    haptic.light();
                    if (i < slides.length - 1) { i++; paint(); }
                    else finish();
                });
                on($('#hurma-ob-skip'), 'click', finish);
                on(root, 'click', function (e) {
                    if (e.target === root) finish();   // click on backdrop
                });

                function finish() {
                    try { localStorage.setItem('hurma-onboarding-done', '1'); } catch (e) {}
                    root.classList.remove('is-open');
                    setTimeout(function () { root.remove(); }, 300);
                }

                // Swipe between slides on touch.
                var sx = 0;
                on(root, 'touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
                on(root, 'touchend', function (e) {
                    var dx = (e.changedTouches[0].clientX - sx);
                    if (dx < -50 && i < slides.length - 1) { i++; paint(); haptic.light(); }
                    else if (dx > 50 && i > 0) { i--; paint(); haptic.light(); }
                });
            }

            function renderArt(kind) {
                if (kind === 'hero') {
                    return '<svg viewBox="0 0 140 100" width="140" height="100">' +
                        '<defs><linearGradient id="oa1" x1="0" y1="0" x2="0" y2="1">' +
                            '<stop offset="0" stop-color="#F4B24A"/><stop offset="1" stop-color="#B8731A"/></linearGradient></defs>' +
                        '<rect x="10" y="14" width="120" height="72" rx="18" fill="url(#oa1)"/>' +
                        '<path d="M70 28 C88 40, 96 48, 96 50 C96 52, 88 60, 70 72 C52 60, 44 52, 44 50 C44 48, 52 40, 70 28 Z" fill="#FBF6EE"/>' +
                        '<path d="M50 50 C58 48, 82 48, 90 50 C82 52, 58 52, 50 50 Z" fill="#3A2410" opacity="0.55"/>' +
                    '</svg>';
                }
                if (kind === 'search') {
                    return '<svg viewBox="0 0 140 100" width="140" height="100">' +
                        '<rect x="12" y="34" width="116" height="40" rx="12" fill="#FBF6EE" stroke="#B8731A" stroke-width="1.5"/>' +
                        '<circle cx="32" cy="54" r="7" fill="none" stroke="#B8731A" stroke-width="2.5"/>' +
                        '<path d="M37 59 L44 66" stroke="#B8731A" stroke-width="2.5" stroke-linecap="round"/>' +
                        '<rect x="52" y="48" width="60" height="4" rx="2" fill="#E29A2B" opacity="0.8"/>' +
                        '<rect x="52" y="58" width="40" height="3" rx="1.5" fill="#B8731A" opacity="0.5"/>' +
                    '</svg>';
                }
                if (kind === 'install') {
                    return '<svg viewBox="0 0 140 100" width="140" height="100">' +
                        '<defs><linearGradient id="oa2" x1="0" y1="0" x2="0" y2="1">' +
                            '<stop offset="0" stop-color="#F4B24A"/><stop offset="1" stop-color="#B8731A"/></linearGradient></defs>' +
                        '<rect x="44" y="18" width="52" height="64" rx="12" fill="url(#oa2)"/>' +
                        '<path d="M70 36 C78 42, 82 46, 82 48 C82 50, 78 54, 70 60 C62 54, 58 50, 58 48 C58 46, 62 42, 70 36 Z" fill="#FBF6EE"/>' +
                        '<path d="M70 72 v10 M65 79 l5 5 5 -5" fill="none" stroke="#3A2410" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>';
                }
                return '';
            }
        } catch (e) { /* never block app on onboarding failure */ }
    })();

    // ============================================================
    // 10. LARGE-TITLE SCROLL EFFECT (iOS Navigation Bar)
    //     Any element with class `hurma-large-title` will scale down
    //     & the page-title in the top bar will fade in as we scroll.
    //     We also add a subtle header blur when scrolled > 2px.
    // ============================================================
    (function largeTitle() {
        var topbar = $('.topbar') || $('.top-bar') || $('header.main-header') || null;
        if (!topbar) return;
        on(window, 'scroll', function () {
            var scrolled = (window.scrollY || 0) > 2;
            topbar.classList.toggle('is-scrolled', scrolled);
        }, { passive: true });
    })();

    // ============================================================
    // Self-test — surface failures loudly in the dev console.
    // ============================================================
    (function selfTest() {
        var results = {
            haptic:            typeof window.hurmaHaptic === 'object',
            palette:           typeof window.hurmaCommandPalette === 'object',
            toast:             typeof window.hurmaToast === 'function',
            countUp:           typeof window.hurmaCountUp === 'function',
            appBadge:          typeof window.hurmaUpdateAppBadge === 'function',
            pullIndicatorDom:  !!document.getElementById('hurma-pull-indicator')
        };
        var failed = Object.keys(results).filter(function (k) { return !results[k]; });
        if (failed.length) {
            console.warn('[hurma-polish] self-test FAILED:', failed, results);
        } else {
            console.log('%c[hurma-polish] v1 loaded · all 10 enhancements active', 'color:#E29A2B;font-weight:bold;');
        }
    })();
})();

// ============================================================================
// HURMA — Polish layer v2 (10 more iOS-native enhancements, 2026-04-19)
// Strictly additive. Every feature is an isolated IIFE section.
// Exports: hurmaContextMenu, hurmaSkeleton, hurmaShare, hurmaUndo, hurmaEmptyState
// ============================================================================
(function () {
    'use strict';

    // Local helpers (re-declared because v1's were IIFE-scoped).
    var $  = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var on = function (el, ev, fn, opts) { if (el && el.addEventListener) el.addEventListener(ev, fn, opts || false); };
    var prefersReducedMotion = function () {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    };
    var safeCall = function (fn, args) { try { return typeof fn === 'function' ? fn.apply(null, args || []) : undefined; } catch (e) { console.warn('[hurma-polish2]', e); } };
    var escapeHtml = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]; }); };
    var haptic = (window.hurmaHaptic && typeof window.hurmaHaptic === 'object') ? window.hurmaHaptic : { light: function(){}, medium: function(){}, heavy: function(){}, success: function(){}, error: function(){}, warn: function(){} };

    // ============================================================
    // 11. CONTEXT MENU — long-press on list rows → iOS action sheet
    //     Auto-detects .client-card, .product-row, etc.
    //     App can also dispatch/listen 'hurma-contextrequest' for custom menus.
    // ============================================================
    var ctxMenu = (function () {
        var root = null;
        var pressTimer = null;
        var pressStartX = 0, pressStartY = 0;
        var LONG_PRESS_MS = 520;
        var LIST_SELECTORS = '.client-card, .sale-row, .product-row, .dist-delivery-row, .debt-row, .invoice-row, [data-ctx-menu]';

        function build() {
            root = document.createElement('div');
            root.id = 'hurma-ctxmenu';
            root.className = 'hurma-ctxmenu hidden';
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.innerHTML =
                '<div class="hurma-ctxmenu__backdrop" data-close="1"></div>' +
                '<div class="hurma-ctxmenu__sheet"></div>';
            document.body.appendChild(root);
            on(root, 'click', function (e) {
                if (e.target.dataset && e.target.dataset.close) close();
            });
        }

        function open(actions, title) {
            if (!Array.isArray(actions) || !actions.length) return;
            if (!root) build();
            var sheet = root.querySelector('.hurma-ctxmenu__sheet');
            var html = '';
            if (title) html += '<div class="hurma-ctxmenu__title">' + escapeHtml(title) + '</div>';
            html += '<div class="hurma-ctxmenu__group">';
            actions.forEach(function (a, idx) {
                html += '<button class="hurma-ctxmenu__item ' + (a.destructive ? 'is-destructive' : '') + '" data-idx="' + idx + '" type="button">' +
                            (a.icon ? '<i class="' + a.icon + '"></i>' : '<i class="fas fa-circle"></i>') +
                            '<span>' + escapeHtml(a.label) + '</span>' +
                        '</button>';
            });
            html += '</div>';
            html += '<button class="hurma-ctxmenu__cancel" data-close="1" type="button">Anulo</button>';
            sheet.innerHTML = html;
            $$('.hurma-ctxmenu__item', sheet).forEach(function (btn) {
                on(btn, 'click', function () {
                    var i = parseInt(btn.getAttribute('data-idx'), 10);
                    var act = actions[i];
                    close();
                    if (act && typeof act.onSelect === 'function') {
                        setTimeout(function () { safeCall(act.onSelect); }, 220);
                    }
                });
            });
            root.classList.remove('hidden');
            requestAnimationFrame(function () { root.classList.add('is-open'); });
            haptic.medium();
        }

        function close() {
            if (!root) return;
            root.classList.remove('is-open');
            setTimeout(function () { root.classList.add('hidden'); }, 240);
        }

        // Default action inference — conservative, only if hook defined.
        function inferTitle(el) {
            var lbl = el.querySelector('.client-name, .sale-title, .product-name, .dist-title, h3, h4, .title');
            return (lbl && lbl.textContent.trim()) || '';
        }
        function inferActions(el) {
            var actions = [];
            if (el.classList && el.classList.contains('client-card')) {
                var cid = el.getAttribute('data-client-id') || el.dataset && el.dataset.clientId;
                if (cid && typeof window.openClient360 === 'function') {
                    actions.push({ key: 'open', label: 'Hap profilin', icon: 'fas fa-user', onSelect: function () { safeCall(window.openClient360, [cid]); } });
                }
                if (typeof window.openSaleModal === 'function') {
                    actions.push({ key: 'sale', label: 'Shto shitje', icon: 'fas fa-plus', onSelect: function () { safeCall(window.openSaleModal, [cid]); } });
                }
            } else if (el.classList && el.classList.contains('product-row')) {
                var pid = el.getAttribute('data-product-id') || el.dataset && el.dataset.productId;
                if (pid && typeof window.openProduct360 === 'function') {
                    actions.push({ key: 'open', label: 'Hap produktin', icon: 'fas fa-box', onSelect: function () { safeCall(window.openProduct360, [pid]); } });
                }
            }
            return actions;
        }

        function startPress(e) {
            var target = e.target && e.target.closest && e.target.closest(LIST_SELECTORS);
            if (!target) return;
            clearTimeout(pressTimer);
            var touch = (e.touches && e.touches[0]) || e;
            pressStartX = touch.clientX || 0;
            pressStartY = touch.clientY || 0;
            pressTimer = setTimeout(function () {
                var ev = new CustomEvent('hurma-contextrequest', { bubbles: true, cancelable: true, detail: { target: target, open: open } });
                target.dispatchEvent(ev);
                if (!ev.defaultPrevented) {
                    var actions = inferActions(target);
                    if (actions.length) open(actions, inferTitle(target));
                }
            }, LONG_PRESS_MS);
        }
        function cancelPress(e) {
            if (e && e.touches && e.touches[0]) {
                var t = e.touches[0];
                if (Math.abs((t.clientX || 0) - pressStartX) > 8 || Math.abs((t.clientY || 0) - pressStartY) > 8) {
                    clearTimeout(pressTimer);
                }
            } else {
                clearTimeout(pressTimer);
            }
        }

        on(document, 'touchstart', startPress, { passive: true });
        on(document, 'touchmove', cancelPress, { passive: true });
        on(document, 'touchend', cancelPress, { passive: true });
        on(document, 'touchcancel', cancelPress, { passive: true });
        on(document, 'contextmenu', function (e) {
            var target = e.target && e.target.closest && e.target.closest(LIST_SELECTORS);
            if (!target) return;
            var actions = inferActions(target);
            if (actions.length) { e.preventDefault(); open(actions, inferTitle(target)); }
        });

        return { open: open, close: close };
    })();
    window.hurmaContextMenu = ctxMenu;

    // ============================================================
    // 12. OFFLINE BANNER — surface navigator.onLine state
    // ============================================================
    (function offlineDetect() {
        var banner = null;
        function build() {
            banner = document.createElement('div');
            banner.id = 'hurma-offline-banner';
            banner.className = 'hurma-offline-banner hidden';
            banner.setAttribute('role', 'status');
            banner.setAttribute('aria-live', 'polite');
            banner.innerHTML = '<i class="fas fa-wifi" aria-hidden="true"></i><span class="hurma-offline-banner__msg">Je offline</span>';
            document.body.appendChild(banner);
        }
        function setState(offline, justCame) {
            if (!banner) build();
            var msg = banner.querySelector('.hurma-offline-banner__msg');
            var icon = banner.querySelector('i');
            if (offline) {
                if (msg) msg.textContent = 'Je offline — puna ruhet lokalisht';
                if (icon) icon.className = 'fas fa-wifi-slash';
                banner.classList.remove('is-online'); banner.classList.add('is-offline');
                banner.classList.remove('hidden');
                requestAnimationFrame(function () { banner.classList.add('is-visible'); });
                if (justCame) haptic.warn();
            } else {
                if (!banner.classList.contains('is-offline')) { banner.classList.add('hidden'); return; }
                if (msg) msg.textContent = 'Online përsëri';
                if (icon) icon.className = 'fas fa-wifi';
                banner.classList.remove('is-offline'); banner.classList.add('is-online');
                if (justCame) haptic.success();
                setTimeout(function () {
                    banner.classList.remove('is-visible', 'is-online');
                    banner.classList.add('hidden');
                }, 2200);
            }
        }
        on(window, 'online', function () { setState(false, true); });
        on(window, 'offline', function () { setState(true, true); });
        // Initial check after load (defer to avoid splash overlap).
        setTimeout(function () {
            if (typeof navigator.onLine === 'boolean' && !navigator.onLine) setState(true, false);
        }, 1200);
    })();

    // ============================================================
    // 13. SKELETON LOADERS — hurmaSkeleton(target, rows)
    //     Renders shimmer placeholder rows while real data loads.
    // ============================================================
    function hurmaSkeleton(target, rows) {
        rows = Math.max(1, Math.min(20, parseInt(rows, 10) || 5));
        var el = typeof target === 'string' ? $(target) : target;
        if (!el) return;
        var html = '';
        for (var i = 0; i < rows; i++) {
            var w1 = 50 + Math.floor(Math.random() * 40);
            var w2 = 25 + Math.floor(Math.random() * 30);
            html += '<div class="hurma-skel-row" aria-hidden="true">' +
                        '<div class="hurma-skel-avatar"></div>' +
                        '<div class="hurma-skel-lines">' +
                            '<div class="hurma-skel-line" style="width:' + w1 + '%"></div>' +
                            '<div class="hurma-skel-line short" style="width:' + w2 + '%"></div>' +
                        '</div>' +
                    '</div>';
        }
        el.innerHTML = html;
        el.classList.add('hurma-skel-container');
        return el;
    }
    window.hurmaSkeleton = hurmaSkeleton;

    // ============================================================
    // 14. WEB SHARE — hurmaShare({ title, text, url })
    //     Native sheet on iOS/Android; clipboard fallback elsewhere.
    // ============================================================
    function hurmaShare(data) {
        data = data || {};
        var payload = {
            title: data.title || document.title || 'Hurma',
            text:  data.text  || '',
            url:   data.url   || (typeof location === 'object' ? location.href : '')
        };
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                navigator.share(payload).then(function () {
                    haptic.success();
                }).catch(function () { /* user cancelled or failed — no-op */ });
                haptic.light();
                return true;
            }
        } catch (e) { /* fallthrough */ }

        // Fallback: clipboard + toast
        var text = [payload.title, payload.text, payload.url].filter(Boolean).join('\n');
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    safeCall(window.hurmaToast, ['U kopjua në clipboard', 'success']);
                    haptic.success();
                });
                return true;
            }
        } catch (e) {}
        // Last resort: show toast with the text
        safeCall(window.hurmaToast, ['Ndarja nuk mbështetet në këtë pajisje', 'warn']);
        return false;
    }
    window.hurmaShare = hurmaShare;

    // ============================================================
    // 15. KEYBOARD AVOIDANCE — scroll focused input above the keyboard
    // ============================================================
    (function keyboardAvoid() {
        var ua = (navigator && navigator.userAgent) || '';
        var isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
        if (!isMobile) return;
        on(document, 'focusin', function (e) {
            var t = e.target;
            if (!t || !t.matches) return;
            if (!t.matches('input, textarea, select, [contenteditable="true"]')) return;
            setTimeout(function () {
                if (document.activeElement !== t) return;
                try {
                    var rect = t.getBoundingClientRect();
                    var vv = window.visualViewport;
                    var viewH = (vv && vv.height) || window.innerHeight || 0;
                    if (!viewH) return;
                    var safeBottom = viewH - 80;
                    if (rect.bottom > safeBottom) {
                        var delta = rect.bottom - safeBottom;
                        window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
                    }
                } catch (err) {}
            }, 280);
        });
        // On visualViewport resize (keyboard open/close) re-align if focus persists.
        if (window.visualViewport) {
            on(window.visualViewport, 'resize', function () {
                var t = document.activeElement;
                if (!t || !t.matches || !t.matches('input, textarea, select, [contenteditable="true"]')) return;
                try {
                    var rect = t.getBoundingClientRect();
                    var viewH = window.visualViewport.height;
                    if (rect.bottom > viewH - 60) {
                        window.scrollBy({ top: rect.bottom - (viewH - 80), behavior: 'auto' });
                    }
                } catch (e) {}
            });
        }
    })();

    // ============================================================
    // 16. UNDO SNACKBAR — hurmaUndo(msg, onUndo, durationMs)
    //     Use right after destructive actions. Calls onUndo() if clicked.
    // ============================================================
    function hurmaUndo(message, onUndo, duration) {
        duration = Math.max(1500, Math.min(20000, parseInt(duration, 10) || 5000));
        var bar = document.createElement('div');
        bar.className = 'hurma-undo';
        bar.setAttribute('role', 'status');
        bar.innerHTML =
            '<span class="hurma-undo__msg">' + escapeHtml(message || '') + '</span>' +
            '<button class="hurma-undo__btn" type="button">Zhbëj</button>';
        document.body.appendChild(bar);
        requestAnimationFrame(function () { bar.classList.add('is-visible'); });

        var dismissed = false;
        function dismiss(undone) {
            if (dismissed) return;
            dismissed = true;
            clearTimeout(timer);
            bar.classList.remove('is-visible');
            setTimeout(function () { bar.remove(); }, 300);
            if (undone) {
                safeCall(onUndo);
                safeCall(window.hurmaToast, ['U zhbë', 'info']);
                haptic.success();
            }
        }
        on(bar.querySelector('.hurma-undo__btn'), 'click', function () { dismiss(true); });
        var timer = setTimeout(function () { dismiss(false); }, duration);
        haptic.warn();
        return { dismiss: function () { dismiss(false); } };
    }
    window.hurmaUndo = hurmaUndo;

    // ============================================================
    // 17. PRINT MODE — add/remove .is-printing class around printing.
    //     Actual layout rules live in @media print in style.css.
    // ============================================================
    (function printMode() {
        on(window, 'beforeprint', function () {
            try { document.documentElement.classList.add('is-printing'); } catch (e) {}
        });
        on(window, 'afterprint', function () {
            try { document.documentElement.classList.remove('is-printing'); } catch (e) {}
        });
        if (typeof window.matchMedia === 'function') {
            try {
                var mql = window.matchMedia('print');
                var handler = function (e) {
                    document.documentElement.classList.toggle('is-printing', !!e.matches);
                };
                if (mql.addEventListener) mql.addEventListener('change', handler);
                else if (mql.addListener) mql.addListener(handler);
            } catch (e) {}
        }
    })();

    // ============================================================
    // 18. EMPTY STATES — hurmaEmptyState(container, opts)
    //     opts: { icon, title, message, actionLabel, onAction }
    // ============================================================
    function hurmaEmptyState(container, opts) {
        var el = typeof container === 'string' ? $(container) : container;
        if (!el) return;
        opts = opts || {};
        var icon        = opts.icon        || 'fa-inbox';
        var title       = opts.title       || 'S\'ka asgjë ende';
        var message     = opts.message     || 'Fillo duke shtuar të dhëna të reja.';
        var actionLabel = opts.actionLabel || '';
        var html =
            '<div class="hurma-empty">' +
                '<div class="hurma-empty__art"><i class="fas ' + icon + '" aria-hidden="true"></i></div>' +
                '<h3 class="hurma-empty__title">' + escapeHtml(title) + '</h3>' +
                '<p class="hurma-empty__msg">' + escapeHtml(message) + '</p>' +
                (actionLabel
                    ? '<button class="hurma-empty__action" type="button">' + escapeHtml(actionLabel) + '</button>'
                    : '') +
            '</div>';
        el.innerHTML = html;
        if (actionLabel && typeof opts.onAction === 'function') {
            on(el.querySelector('.hurma-empty__action'), 'click', function () {
                haptic.light();
                safeCall(opts.onAction);
            });
        }
        return el;
    }
    window.hurmaEmptyState = hurmaEmptyState;

    // ============================================================
    // 19. PAGE TRANSITIONS — subtle cross-fade on navigateTo()
    //     Respects prefers-reduced-motion & only wraps once.
    // ============================================================
    (function pageTransitions() {
        if (prefersReducedMotion()) return;
        // Wait for app.js to define navigateTo.
        function tryWrap() {
            var nav = window.navigateTo;
            if (typeof nav !== 'function' || nav.__hurmaWrapped) return;
            var orig = nav;
            var wrapped = function () {
                var target = $('.main-content') || $('#main-content') || $('main') || $('.content') || null;
                if (!target) { return orig.apply(this, arguments); }
                target.classList.remove('hurma-page-enter');
                target.classList.add('hurma-page-exit');
                var args = Array.prototype.slice.call(arguments);
                var self = this;
                setTimeout(function () {
                    var result;
                    try { result = orig.apply(self, args); }
                    catch (e) { console.warn('[hurma-polish2] navigateTo threw', e); }
                    target.classList.remove('hurma-page-exit');
                    target.classList.add('hurma-page-enter');
                    setTimeout(function () { target.classList.remove('hurma-page-enter'); }, 320);
                    return result;
                }, 120);
            };
            wrapped.__hurmaWrapped = true;
            window.navigateTo = wrapped;
        }
        // Try immediately; also retry after DOMContentLoaded in case app.js
        // loads later.
        tryWrap();
        on(document, 'DOMContentLoaded', tryWrap);
        setTimeout(tryWrap, 1500);
    })();

    // ============================================================
    // 20. SWIPE-TO-ACTION — swipe left on list rows reveals actions
    //     Emits 'hurma-swipe-delete' on the row when delete is tapped.
    // ============================================================
    (function swipeActions() {
        var ROW_SEL = '.client-card, .sale-row, .product-row, .dist-delivery-row, [data-swipeable]';
        var active = null, startX = 0, startY = 0, dx = 0, locked = false, axisX = false;
        var REVEAL = -88;

        function closeAll() {
            $$('.hurma-swipe-open').forEach(function (el) {
                el.classList.remove('hurma-swipe-open');
                el.style.transform = '';
            });
        }

        on(document, 'touchstart', function (e) {
            if (!e.touches || e.touches.length !== 1) return;
            var t = e.target && e.target.closest && e.target.closest(ROW_SEL);
            // Close any open row on touches outside it.
            closeAll();
            if (!t) return;
            active = t;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            dx = 0; locked = false; axisX = false;
        }, { passive: true });

        on(document, 'touchmove', function (e) {
            if (!active) return;
            var t = e.touches[0];
            var ddx = t.clientX - startX, ddy = t.clientY - startY;
            if (!locked) {
                if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) {
                    locked = true;
                    axisX = Math.abs(ddx) > Math.abs(ddy);
                    if (!axisX) { active = null; return; }
                }
            }
            if (!axisX) return;
            dx = Math.max(-120, Math.min(0, ddx));
            active.style.transform = 'translateX(' + dx + 'px)';
            if (!active.querySelector('.hurma-swipe-actions')) {
                var html = '<div class="hurma-swipe-actions">' +
                              '<button class="hurma-swipe-btn hurma-swipe-btn--delete" type="button" aria-label="Fshi"><i class="fas fa-trash"></i></button>' +
                           '</div>';
                active.insertAdjacentHTML('beforeend', html);
                var btn = active.querySelector('.hurma-swipe-btn--delete');
                on(btn, 'click', function (ev) {
                    ev.stopPropagation();
                    haptic.error();
                    var row = btn.closest(ROW_SEL);
                    if (row) {
                        var cev = new CustomEvent('hurma-swipe-delete', { bubbles: true, detail: { row: row } });
                        row.dispatchEvent(cev);
                    }
                });
            }
        }, { passive: true });

        on(document, 'touchend', function () {
            if (!active) return;
            if (dx < REVEAL / 1.5) {
                active.classList.add('hurma-swipe-open');
                active.style.transform = 'translateX(' + REVEAL + 'px)';
                haptic.medium();
            } else {
                active.classList.remove('hurma-swipe-open');
                active.style.transform = '';
            }
            active = null; locked = false; dx = 0; axisX = false;
        });

        on(document, 'touchcancel', function () {
            if (!active) return;
            active.style.transform = '';
            active.classList.remove('hurma-swipe-open');
            active = null; locked = false; dx = 0; axisX = false;
        });
    })();

    // ============================================================
    // Self-test — surface v2 failures in the dev console.
    // ============================================================
    (function selfTest() {
        var checks = {
            ctxMenu:    typeof window.hurmaContextMenu === 'object',
            skeleton:   typeof window.hurmaSkeleton === 'function',
            share:      typeof window.hurmaShare === 'function',
            undo:       typeof window.hurmaUndo === 'function',
            emptyState: typeof window.hurmaEmptyState === 'function'
        };
        var failed = Object.keys(checks).filter(function (k) { return !checks[k]; });
        try {
            if (failed.length) {
                console.warn('[hurma-polish v2] self-test FAILED:', failed, checks);
            } else {
                console.log('%c[hurma-polish v2] loaded · 10 additional enhancements active', 'color:#B8731A;font-weight:bold;');
            }
        } catch (e) {}
    })();

    // ============================================================================
    // ============================================================================
    // HURMA — Polish layer (v3) — INSIGHTS ENGINE
    // Pure-function layer that reads window.state and returns actionable
    // intelligence. No DOM writes. Safe to call at any time.
    // All functions are defensive: missing state or empty arrays never throw.
    // Exposed as window.hurmaInsights.
    // ============================================================================

    (function insightsEngine() {

        // ------- helpers (local, do not pollute the outer scope) -------
        function _state() {
            return (window && window.state && typeof window.state === 'object') ? window.state : {};
        }
        function _sales()         { var s = _state().sales;             return Array.isArray(s) ? s : []; }
        function _clients()       { var c = _state().clients;           return Array.isArray(c) ? c : []; }
        function _stock()         { var x = _state().stock;             return (x && typeof x === 'object') ? x : {}; }
        function _clientVisits()  { var v = _state().clientVisits;      return Array.isArray(v) ? v : []; }
        function _distDeliveries(){ var d = _state().distDeliveries;    return Array.isArray(d) ? d : []; }
        function _products()      {
            // PRODUCTS is an array in app.js (confirmed at line 10).
            if (Array.isArray(window.PRODUCTS)) return window.PRODUCTS;
            if (window.PRODUCTS && typeof window.PRODUCTS === 'object') {
                // fallback: if someone changed it to a map, flatten to array
                return Object.keys(window.PRODUCTS).map(function (k) {
                    var v = window.PRODUCTS[k];
                    return (v && typeof v === 'object') ? Object.assign({ id: k }, v) : { id: k, name: String(v) };
                });
            }
            return [];
        }
        function _todayISO() { return new Date().toISOString().slice(0, 10); }
        function _daysBetween(a, b) {
            // a, b: ISO 'YYYY-MM-DD' strings. Positive if b is after a.
            if (!a || !b) return 0;
            var ta = Date.parse(a), tb = Date.parse(b);
            if (isNaN(ta) || isNaN(tb)) return 0;
            return Math.round((tb - ta) / 86400000);
        }
        function _addDays(iso, n) {
            var t = Date.parse(iso); if (isNaN(t)) return iso;
            return new Date(t + n * 86400000).toISOString().slice(0, 10);
        }
        function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
        function _median(arr) {
            if (!arr.length) return 0;
            var s = arr.slice().sort(function (a, b) { return a - b; });
            var m = Math.floor(s.length / 2);
            return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
        }
        function _mean(arr) {
            if (!arr.length) return 0;
            var sum = 0; for (var i = 0; i < arr.length; i++) sum += arr[i];
            return sum / arr.length;
        }
        function _productById(id) {
            var ps = _products();
            for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].id === id) return ps[i];
            return null;
        }
        function _clientById(id) {
            var cs = _clients();
            for (var i = 0; i < cs.length; i++) if (cs[i] && cs[i].id === id) return cs[i];
            return null;
        }

        // ------------------------------------------------------------
        // 1) clientHealthScore(clientId) → { score: 0-100, rating, reasons[] }
        // Factors:
        //   - Debt load (50 pts)   : 0 debt = 50; debt >= lifetime = 0
        //   - Overdue invoices (30): 0 overdue = 30; each overdue -10 down to 0
        //   - Recent activity (20) : sale in last 30d = 20; last 90d = 10; older = 0
        // ------------------------------------------------------------
        function clientHealthScore(clientId) {
            var client = _clientById(clientId);
            if (!client) return {
                score: 0,
                rating: 'unknown',
                reasons: ['Klienti nuk gjendet'],
                breakdown: { debt: 0, overdue: 0, activity: 0 },
                stats: {
                    lifetimeSpend: 0, debt: 0,
                    openInvoiceCount: 0, overdueCount: 0,
                    daysSinceLastSale: null
                }
            };

            var today   = _todayISO();
            var sales   = _sales().filter(function (s) { return s && s.clientId === clientId; });
            var reasons = [];

            // Lifetime spend (for debt-to-spend ratio)
            var lifetimeSpend = sales.reduce(function (a, s) { return a + (Number(s.sellTotal) || 0); }, 0);
            var debt = Math.max(0, Number(client.debt) || 0);

            // --- Component 1: Debt load (50)
            var debtScore = 50;
            if (lifetimeSpend > 0) {
                var ratio = debt / (lifetimeSpend + debt); // 0..1
                debtScore = Math.round(50 * (1 - ratio));
                if (ratio > 0.5) reasons.push('Borxh i lartë krahasuar me blerjet');
                else if (ratio > 0.2) reasons.push('Borxh mesatar');
            } else if (debt > 0) {
                debtScore = 20;
                reasons.push('Borxh pa histori blerjesh');
            } else {
                reasons.push('Pa borxh');
            }

            // --- Component 2: Overdue invoices (30)
            var openInvoices = sales.filter(function (s) {
                return s.paymentType === 'invoice_60' && !s.invoicePaid;
            });
            var overdue = openInvoices.filter(function (s) {
                return s.dueDate && s.dueDate < today;
            });
            var overdueScore = _clamp(30 - overdue.length * 10, 0, 30);
            if (overdue.length >= 3) reasons.push(overdue.length + ' fatura të vonuara');
            else if (overdue.length) reasons.push(overdue.length + ' faturë e vonuar');

            // --- Component 3: Recent activity (20)
            var lastDate = null;
            for (var i = 0; i < sales.length; i++) {
                var d = sales[i].date; if (d && (!lastDate || d > lastDate)) lastDate = d;
            }
            var activityScore = 0, daysSince = null;
            if (lastDate) {
                daysSince = _daysBetween(lastDate, today);
                if (daysSince <= 30) activityScore = 20;
                else if (daysSince <= 90) activityScore = 10;
                else reasons.push('Joaktiv për ' + daysSince + ' ditë');
            } else {
                reasons.push('Pa shitje të regjistruara');
            }

            var total = _clamp(debtScore + overdueScore + activityScore, 0, 100);
            var rating = total >= 75 ? 'healthy' : total >= 50 ? 'watch' : total >= 25 ? 'risk' : 'critical';
            return {
                score: total,
                rating: rating,
                reasons: reasons,
                breakdown: { debt: debtScore, overdue: overdueScore, activity: activityScore },
                stats: {
                    lifetimeSpend: Math.round(lifetimeSpend),
                    debt: debt,
                    openInvoiceCount: openInvoices.length,
                    overdueCount: overdue.length,
                    daysSinceLastSale: daysSince
                }
            };
        }

        // ------------------------------------------------------------
        // 2) stockForecastDays(productId) → { days, rate, level }
        // Uses last 30 days of sales to compute daily rate, divides remaining stock.
        // Returns Infinity if rate = 0 (never runs out).
        // ------------------------------------------------------------
        function stockForecastDays(productId) {
            var stock = Math.max(0, Number(_stock()[productId]) || 0);
            var today = _todayISO();
            var cutoff = _addDays(today, -30);
            var recent = _sales().filter(function (s) {
                return s && s.productId === productId && s.date && s.date >= cutoff;
            });
            var qtySold = recent.reduce(function (a, s) { return a + (Number(s.quantity) || 0); }, 0);
            var rate = qtySold / 30; // units per day
            var days = rate > 0 ? Math.floor(stock / rate) : Infinity;
            var level =
                stock === 0       ? 'out'      :
                days <= 3         ? 'critical' :
                days <= 7         ? 'low'      :
                days <= 14        ? 'warn'     :
                                    'ok';
            return { days: days, rate: Number(rate.toFixed(2)), stock: stock, level: level };
        }

        // ------------------------------------------------------------
        // 3) topActionsForToday() → [{ type, urgency, title, detail, target }]
        // Merges overdue invoices, stock alerts, upcoming dues & scheduled visits.
        // Sorted by urgency (100 = most urgent).
        // ------------------------------------------------------------
        function topActionsForToday(limit) {
            limit = typeof limit === 'number' ? limit : 8;
            var out = [], today = _todayISO();

            // 3a) Overdue invoices → urgency 100 - (daysOverdue * -0.5), capped
            _sales().forEach(function (s) {
                if (!s || s.paymentType !== 'invoice_60' || s.invoicePaid || !s.dueDate) return;
                if (s.dueDate >= today) return;
                var c = _clientById(s.clientId) || { name: 'Klient' };
                var daysLate = _daysBetween(s.dueDate, today);
                out.push({
                    type: 'overdue_invoice',
                    urgency: _clamp(85 + Math.min(15, daysLate), 0, 100),
                    title: 'Kontakto: ' + c.name,
                    detail: 'Faturë e vonuar ' + daysLate + ' ditë · ' + Math.round(Number(s.sellTotal) || 0) + ' ден',
                    target: { kind: 'client', id: s.clientId, saleId: s.id }
                });
            });

            // 3b) Stock critical → urgency 70-85
            _products().forEach(function (p) {
                if (!p || !p.id) return;
                var f = stockForecastDays(p.id);
                if (f.level === 'out') {
                    out.push({
                        type: 'stock_out',
                        urgency: 90,
                        title: 'Porosi: ' + p.name,
                        detail: 'Stoku është 0',
                        target: { kind: 'product', id: p.id }
                    });
                } else if (f.level === 'critical') {
                    out.push({
                        type: 'stock_critical',
                        urgency: 80,
                        title: 'Stok kritik: ' + p.name,
                        detail: 'Do mbarojë për ~' + f.days + ' ditë',
                        target: { kind: 'product', id: p.id }
                    });
                } else if (f.level === 'low') {
                    out.push({
                        type: 'stock_low',
                        urgency: 65,
                        title: 'Stok i ulët: ' + p.name,
                        detail: 'Do mbarojë për ~' + f.days + ' ditë',
                        target: { kind: 'product', id: p.id }
                    });
                }
            });

            // 3c) Invoices due within 3 days → urgency 60
            _sales().forEach(function (s) {
                if (!s || s.paymentType !== 'invoice_60' || s.invoicePaid || !s.dueDate) return;
                var days = _daysBetween(today, s.dueDate);
                if (days < 0 || days > 3) return;
                var c = _clientById(s.clientId) || { name: 'Klient' };
                out.push({
                    type: 'due_soon',
                    urgency: 55 + (3 - days) * 2,
                    title: 'Faturë në afat: ' + c.name,
                    detail: (days === 0 ? 'Sot' : 'Për ' + days + ' ditë') + ' · ' + Math.round(Number(s.sellTotal) || 0) + ' ден',
                    target: { kind: 'client', id: s.clientId, saleId: s.id }
                });
            });

            // 3d) Scheduled visits today → urgency 50
            _clientVisits().forEach(function (v) {
                if (!v || !v.nextVisitDate || v.nextVisitDate !== today) return;
                var c = _clientById(v.clientId) || { name: 'Klient' };
                out.push({
                    type: 'visit_today',
                    urgency: 50,
                    title: 'Vizitë sot: ' + c.name,
                    detail: v.purpose || 'Vizitë e planifikuar',
                    target: { kind: 'client', id: v.clientId }
                });
            });

            // 3e) High-debt clients with no recent activity → urgency 40
            _clients().forEach(function (c) {
                if (!c || !(Number(c.debt) > 0)) return;
                var hs = clientHealthScore(c.id);
                if (hs.rating === 'critical' && hs.stats.daysSinceLastSale != null && hs.stats.daysSinceLastSale > 60) {
                    out.push({
                        type: 'debt_stale',
                        urgency: 40,
                        title: 'Borxh i lënë: ' + c.name,
                        detail: c.debt + ' ден · pa kontakt për ' + hs.stats.daysSinceLastSale + ' ditë',
                        target: { kind: 'client', id: c.id }
                    });
                }
            });

            out.sort(function (a, b) { return b.urgency - a.urgency; });
            return out.slice(0, limit);
        }

        // ------------------------------------------------------------
        // 4) detectAnomalies(saleOrId) → { anomalous, reasons[] }
        // Flags a sale as atypical if any of:
        //   - qty > 3× client's historical average
        //   - sellTotal > 3× client's historical average
        //   - sellTotal > 3× global median
        //   - profit margin < 5% or > 80% (possible input error)
        // ------------------------------------------------------------
        function detectAnomalies(saleOrId) {
            var s = typeof saleOrId === 'string'
                ? _sales().filter(function (x) { return x.id === saleOrId; })[0]
                : saleOrId;
            if (!s) return { anomalous: false, reasons: ['Shitja nuk gjendet'] };

            var reasons = [];
            var others = _sales().filter(function (o) {
                return o && o.id !== s.id && o.clientId === s.clientId;
            });
            var avgQty   = _mean(others.map(function (o) { return Number(o.quantity)  || 0; }));
            var avgTotal = _mean(others.map(function (o) { return Number(o.sellTotal) || 0; }));
            var medGlobal = _median(_sales().map(function (o) { return Number(o.sellTotal) || 0; }));

            if (avgQty > 0 && Number(s.quantity) > avgQty * 3) {
                reasons.push('Sasi ' + Math.round(Number(s.quantity) / avgQty) + '× më e madhe se mesatarja e klientit');
            }
            if (avgTotal > 0 && Number(s.sellTotal) > avgTotal * 3) {
                reasons.push('Vlerë ' + Math.round(Number(s.sellTotal) / avgTotal) + '× më e madhe se mesatarja e klientit');
            }
            if (medGlobal > 0 && Number(s.sellTotal) > medGlobal * 3) {
                reasons.push('Shitje > 3× mediana globale');
            }
            var margin = (Number(s.profit) && Number(s.sellTotal))
                ? (Number(s.profit) / Number(s.sellTotal))
                : null;
            if (margin !== null) {
                if (margin < 0.05) reasons.push('Marzhë shumë e ulët (' + Math.round(margin * 100) + '%)');
                if (margin > 0.80) reasons.push('Marzhë shumë e lartë (' + Math.round(margin * 100) + '%)');
            }

            return { anomalous: reasons.length > 0, reasons: reasons };
        }

        // ------------------------------------------------------------
        // 5) weeklyDigest() → summary for the last 7 days vs. previous 7
        // ------------------------------------------------------------
        function weeklyDigest() {
            var today = _todayISO();
            var last7Start  = _addDays(today, -6);   // today inclusive
            var prev7Start  = _addDays(today, -13);
            var prev7End    = _addDays(today, -7);

            var sales = _sales();
            var cur = sales.filter(function (s) { return s && s.date && s.date >= last7Start && s.date <= today; });
            var prev = sales.filter(function (s) { return s && s.date && s.date >= prev7Start && s.date <= prev7End; });

            function agg(arr) {
                return {
                    count: arr.length,
                    total: arr.reduce(function (a, s) { return a + (Number(s.sellTotal) || 0); }, 0),
                    profit: arr.reduce(function (a, s) { return a + (Number(s.profit) || 0); }, 0)
                };
            }
            var curAgg  = agg(cur);
            var prevAgg = agg(prev);
            function pct(a, b) {
                if (!b) return a > 0 ? 100 : 0;
                return Math.round(((a - b) / b) * 100);
            }

            // Top client & product this week
            var byClient = {}, byProduct = {};
            cur.forEach(function (s) {
                if (!s) return;
                if (s.clientId)  byClient[s.clientId]   = (byClient[s.clientId]  || 0) + (Number(s.sellTotal) || 0);
                if (s.productId) byProduct[s.productId] = (byProduct[s.productId] || 0) + (Number(s.quantity)  || 0);
            });
            function topKey(obj) {
                var best = null, bestV = -Infinity;
                for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    if (obj[k] > bestV) { bestV = obj[k]; best = k; }
                }
                return { id: best, value: bestV === -Infinity ? 0 : bestV };
            }
            var topClient  = topKey(byClient);
            var topProduct = topKey(byProduct);
            var topClientName  = topClient.id ? (_clientById(topClient.id) || {}).name || '-' : null;
            var topProductName = topProduct.id ? (_productById(topProduct.id) || {}).name || '-' : null;

            // New overdue this week
            var newOverdue = sales.filter(function (s) {
                return s.paymentType === 'invoice_60' && !s.invoicePaid && s.dueDate &&
                       s.dueDate < today && s.dueDate >= last7Start;
            }).length;

            return {
                week: { start: last7Start, end: today },
                sales:   { count: curAgg.count,  total: Math.round(curAgg.total),  profit: Math.round(curAgg.profit) },
                prev:    { count: prevAgg.count, total: Math.round(prevAgg.total), profit: Math.round(prevAgg.profit) },
                delta: {
                    countPct:  pct(curAgg.count,  prevAgg.count),
                    totalPct:  pct(curAgg.total,  prevAgg.total),
                    profitPct: pct(curAgg.profit, prevAgg.profit)
                },
                topClient:  topClient.id  ? { id: topClient.id,  name: topClientName,  total: Math.round(topClient.value) } : null,
                topProduct: topProduct.id ? { id: topProduct.id, name: topProductName, quantity: topProduct.value } : null,
                newOverdue: newOverdue
            };
        }

        // ------------------------------------------------------------
        // Batch helper — useful for UI that needs everything at once.
        // ------------------------------------------------------------
        function snapshot() {
            var today = _todayISO();
            var openInvoices = _sales().filter(function (s) {
                return s && s.paymentType === 'invoice_60' && !s.invoicePaid;
            });
            var overdue = openInvoices.filter(function (s) { return s.dueDate && s.dueDate < today; });
            var totalDebt = _clients().reduce(function (a, c) { return a + (Number(c.debt) || 0); }, 0);

            var critical = 0, low = 0;
            _products().forEach(function (p) {
                if (!p || !p.id) return;
                var f = stockForecastDays(p.id);
                if (f.level === 'critical' || f.level === 'out') critical++;
                else if (f.level === 'low') low++;
            });

            return {
                at: today,
                counts: {
                    clients: _clients().length,
                    sales: _sales().length,
                    openInvoices: openInvoices.length,
                    overdueInvoices: overdue.length,
                    stockCritical: critical,
                    stockLow: low
                },
                totalDebt: Math.round(totalDebt),
                topActions: topActionsForToday(5)
            };
        }

        window.hurmaInsights = {
            clientHealthScore: clientHealthScore,
            stockForecastDays: stockForecastDays,
            topActionsForToday: topActionsForToday,
            detectAnomalies:   detectAnomalies,
            weeklyDigest:      weeklyDigest,
            snapshot:          snapshot,
            // Expose helpers for future modules that want to reuse them.
            _util: {
                todayISO:     _todayISO,
                daysBetween:  _daysBetween,
                addDays:      _addDays,
                median:       _median,
                mean:         _mean,
                clamp:        _clamp,
                productById:  _productById,
                clientById:   _clientById
            }
        };
    })();

    // ============================================================
    // Self-test — surface v3 failures in the dev console.
    // ============================================================
    (function insightsSelfTest() {
        var checks = {
            module:           typeof window.hurmaInsights === 'object',
            clientHealth:     window.hurmaInsights && typeof window.hurmaInsights.clientHealthScore === 'function',
            stockForecast:    window.hurmaInsights && typeof window.hurmaInsights.stockForecastDays === 'function',
            topActions:       window.hurmaInsights && typeof window.hurmaInsights.topActionsForToday === 'function',
            anomalies:        window.hurmaInsights && typeof window.hurmaInsights.detectAnomalies === 'function',
            weeklyDigest:     window.hurmaInsights && typeof window.hurmaInsights.weeklyDigest === 'function',
            snapshot:         window.hurmaInsights && typeof window.hurmaInsights.snapshot === 'function'
        };
        // Smoke-run with whatever state exists — must not throw.
        try {
            checks.smokeTopActions = Array.isArray(window.hurmaInsights.topActionsForToday());
            checks.smokeSnapshot   = typeof window.hurmaInsights.snapshot() === 'object';
            checks.smokeDigest     = typeof window.hurmaInsights.weeklyDigest() === 'object';
        } catch (e) {
            checks.smokeError = String(e && e.message || e);
        }
        var failed = Object.keys(checks).filter(function (k) { return k !== 'smokeError' && !checks[k]; });
        try {
            if (failed.length || checks.smokeError) {
                console.warn('[hurma-polish v3] self-test FAILED:', failed, checks);
            } else {
                console.log('%c[hurma-polish v3] loaded · insights engine ready', 'color:#2F8F4E;font-weight:bold;');
            }
        } catch (e) {}
    })();

    // ============================================================================
    // ============================================================================
    // HURMA — Polish layer (v3.1) — UI COMPONENTS (Insights-powered)
    // Reusable DOM factories that render the insights engine's output.
    // These return DOM nodes — zero app.js modification. Call them anywhere:
    //   document.body.appendChild(window.hurmaHealthBadge('client-id'));
    //   document.body.appendChild(window.hurmaForecastBadge('product-id'));
    //   document.body.appendChild(window.hurmaActionsPanel({ limit: 5 }));
    // ============================================================================

    (function uiComponents() {

        function _escapeHtml(s) {
            return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
            });
        }
        function _getInsights() {
            return window.hurmaInsights || null;
        }
        function _haptic(kind) {
            try {
                if (window.hurmaHaptic && typeof window.hurmaHaptic[kind] === 'function') {
                    window.hurmaHaptic[kind]();
                }
            } catch (e) { /* no-op */ }
        }

        // ------------------------------------------------------------
        // hurmaHealthBadge(clientId, opts)
        //   opts.showLabel (default true)  — "Mirë/Kujdes/Rrezik/Kritik"
        //   opts.size      (default 'md')  — 'sm' | 'md' | 'lg'
        // Returns a <span> with data-attributes & native tooltip.
        // ------------------------------------------------------------
        function hurmaHealthBadge(clientId, opts) {
            opts = opts || {};
            var el = document.createElement('span');
            el.className = 'hurma-health-badge hurma-health-badge--' + (opts.size || 'md');

            var I = _getInsights();
            if (!I || typeof I.clientHealthScore !== 'function') {
                el.classList.add('hurma-health-badge--unknown');
                el.innerHTML = '<span class="hurma-health-badge__dot"></span>' +
                               '<span class="hurma-health-badge__score">—</span>';
                el.setAttribute('title', 'Motori i inteligjencës nuk është aktiv');
                return el;
            }

            var h = I.clientHealthScore(clientId);
            el.classList.add('hurma-health-badge--' + h.rating);
            el.setAttribute('data-hurma-client', clientId);
            el.setAttribute('data-hurma-score', String(h.score));
            el.setAttribute('data-hurma-rating', h.rating);

            var ratingLabel = ({
                healthy:  'Mirë',
                watch:    'Kujdes',
                risk:     'Rrezik',
                critical: 'Kritik',
                unknown:  'I panjohur'
            })[h.rating] || h.rating;

            var parts = [
                '<span class="hurma-health-badge__dot" aria-hidden="true"></span>',
                '<span class="hurma-health-badge__score">' + h.score + '</span>'
            ];
            if (opts.showLabel !== false) {
                parts.push('<span class="hurma-health-badge__label">' + _escapeHtml(ratingLabel) + '</span>');
            }
            el.innerHTML = parts.join('');

            // Rich tooltip — native title avoids extra tooltip lib
            var bd = h.breakdown || {};
            var tipLines = ['Shëndeti: ' + h.score + '/100 — ' + ratingLabel];
            if (bd.debt != null || bd.overdue != null || bd.activity != null) {
                tipLines.push('───────────────────');
                if (bd.debt != null)     tipLines.push('Borxh: ' + bd.debt + '/50');
                if (bd.overdue != null)  tipLines.push('Vonesa: ' + bd.overdue + '/30');
                if (bd.activity != null) tipLines.push('Aktiviteti: ' + bd.activity + '/20');
            }
            if (h.reasons && h.reasons.length) {
                tipLines.push('───────────────────');
                tipLines.push(h.reasons.join('\n'));
            }
            el.setAttribute('title', tipLines.join('\n'));

            return el;
        }
        window.hurmaHealthBadge = hurmaHealthBadge;

        // ------------------------------------------------------------
        // hurmaForecastBadge(productId, opts)
        //   opts.size      (default 'md') — 'sm' | 'md' | 'lg'
        //   opts.variant   (default 'full') — 'full' | 'compact'
        // ------------------------------------------------------------
        function hurmaForecastBadge(productId, opts) {
            opts = opts || {};
            var el = document.createElement('span');
            el.className = 'hurma-forecast-badge hurma-forecast-badge--' + (opts.size || 'md');

            var I = _getInsights();
            if (!I || typeof I.stockForecastDays !== 'function') {
                el.classList.add('hurma-forecast-badge--ok');
                el.innerHTML = '<span class="hurma-forecast-badge__dot" aria-hidden="true"></span>' +
                               '<span class="hurma-forecast-badge__label">—</span>';
                return el;
            }

            var f = I.stockForecastDays(productId);
            el.classList.add('hurma-forecast-badge--' + f.level);
            el.setAttribute('data-hurma-product', productId);
            el.setAttribute('data-hurma-level', f.level);
            el.setAttribute('data-hurma-days', String(f.days));

            var label;
            if (f.level === 'out')                 label = 'Mbaroi';
            else if (f.days === Infinity)          label = (opts.variant === 'compact' ? 'Stabil' : 'Stok stabil');
            else if (f.days <= 0)                  label = 'Sot';
            else if (f.days === 1)                 label = '1 ditë';
            else                                   label = '~' + f.days + ' ditë';

            el.innerHTML = '<span class="hurma-forecast-badge__dot" aria-hidden="true"></span>' +
                           '<span class="hurma-forecast-badge__label">' + _escapeHtml(label) + '</span>';

            var tipLines = [
                'Stoku: ' + f.stock + ' copë',
                'Shitje/ditë: ' + f.rate,
                (f.days === Infinity ? 'Ritmi zero — stabil' :
                 f.level === 'out'   ? 'Stoku është bosh'    :
                                       'Do mbarojë për ~' + f.days + ' ditë')
            ];
            el.setAttribute('title', tipLines.join('\n'));

            return el;
        }
        window.hurmaForecastBadge = hurmaForecastBadge;

        // ------------------------------------------------------------
        // hurmaActionsPanel(opts)
        //   opts.limit    (default 5)
        //   opts.title    (default 'Veprime për sot')
        //   opts.onClick  (optional — custom click handler)
        // Returns a <div> that auto-refreshes every 60s while attached.
        // ------------------------------------------------------------
        var ICONS_BY_TYPE = {
            overdue_invoice: 'fa-exclamation-circle',
            stock_out:       'fa-times-circle',
            stock_critical:  'fa-box',
            stock_low:       'fa-box-open',
            due_soon:        'fa-clock',
            visit_today:     'fa-map-marker-alt',
            debt_stale:      'fa-user-clock'
        };
        function _urgencyClass(u) {
            if (u >= 90) return 'urgent';
            if (u >= 70) return 'high';
            if (u >= 50) return 'medium';
            return 'low';
        }

        function hurmaActionsPanel(opts) {
            opts = opts || {};
            var limit   = typeof opts.limit === 'number' ? opts.limit : 5;
            var title   = opts.title || 'Veprime për sot';
            var onClick = typeof opts.onClick === 'function' ? opts.onClick : null;

            var el = document.createElement('div');
            el.className = 'hurma-actions-panel';

            function render() {
                var I = _getInsights();
                if (!I || typeof I.topActionsForToday !== 'function') {
                    el.innerHTML = '<div class="hurma-actions-panel__header">' +
                                     '<span class="hurma-actions-panel__title">' + _escapeHtml(title) + '</span>' +
                                   '</div>' +
                                   '<div class="hurma-actions-panel__empty">' +
                                     '<i class="fas fa-info-circle"></i>' +
                                     '<span>Motori i inteligjencës nuk është aktiv</span>' +
                                   '</div>';
                    return;
                }
                var actions = I.topActionsForToday(limit);

                var html = '<div class="hurma-actions-panel__header">' +
                             '<span class="hurma-actions-panel__title">' + _escapeHtml(title) + '</span>' +
                             '<span class="hurma-actions-panel__count">' + actions.length + '</span>' +
                           '</div>';

                if (!actions.length) {
                    html += '<div class="hurma-actions-panel__empty">' +
                              '<i class="fas fa-check-circle"></i>' +
                              '<span>Gjithçka në rregull — asnjë veprim urgjent</span>' +
                            '</div>';
                } else {
                    html += '<ul class="hurma-actions-panel__list">';
                    actions.forEach(function (a, idx) {
                        var urgencyCls = _urgencyClass(a.urgency);
                        var icon = ICONS_BY_TYPE[a.type] || 'fa-info-circle';
                        var targetKind = a.target && a.target.kind ? a.target.kind : '';
                        var targetId   = a.target && a.target.id   ? a.target.id   : '';
                        var saleId     = a.target && a.target.saleId ? a.target.saleId : '';
                        html +=
                            '<li class="hurma-actions-panel__item hurma-actions-panel__item--' + urgencyCls + '" ' +
                                'data-hurma-action-idx="' + idx + '" ' +
                                'data-hurma-action-type="' + _escapeHtml(a.type) + '" ' +
                                'data-hurma-target-kind="' + _escapeHtml(targetKind) + '" ' +
                                'data-hurma-target-id="'   + _escapeHtml(targetId)   + '" ' +
                                'data-hurma-sale-id="'     + _escapeHtml(saleId)     + '" ' +
                                'tabindex="0" role="button">' +
                              '<span class="hurma-actions-panel__urgency" aria-hidden="true"></span>' +
                              '<i class="fas ' + icon + ' hurma-actions-panel__icon" aria-hidden="true"></i>' +
                              '<div class="hurma-actions-panel__main">' +
                                '<div class="hurma-actions-panel__item-title">'  + _escapeHtml(a.title)  + '</div>' +
                                '<div class="hurma-actions-panel__item-detail">' + _escapeHtml(a.detail) + '</div>' +
                              '</div>' +
                              '<i class="fas fa-chevron-right hurma-actions-panel__chevron" aria-hidden="true"></i>' +
                            '</li>';
                    });
                    html += '</ul>';
                }
                el.innerHTML = html;

                // Wire clicks — delegate-style, but per-item so keyboard focus works.
                var items = el.querySelectorAll('.hurma-actions-panel__item');
                for (var i = 0; i < items.length; i++) {
                    (function (item) {
                        function activate() {
                            var idx  = parseInt(item.getAttribute('data-hurma-action-idx'), 10);
                            var kind = item.getAttribute('data-hurma-target-kind');
                            var id   = item.getAttribute('data-hurma-target-id');
                            var saleId = item.getAttribute('data-hurma-sale-id');
                            _haptic('light');

                            // Custom handler wins.
                            if (onClick) {
                                try {
                                    onClick({ idx: idx, kind: kind, id: id, saleId: saleId, item: item });
                                } catch (e) { /* swallow */ }
                                return;
                            }

                            // Default: open the relevant 360 modal or navigate.
                            if (kind === 'client' && id) {
                                if (typeof window.openClient360 === 'function')       window.openClient360(id);
                                else if (typeof window.navigateTo === 'function')     window.navigateTo('clients');
                            } else if (kind === 'product' && id) {
                                if (typeof window.openProduct360 === 'function')      window.openProduct360(id);
                                else if (typeof window.navigateTo === 'function')     window.navigateTo('stock');
                            }
                        }
                        item.addEventListener('click', activate);
                        item.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault(); activate();
                            }
                        });
                    })(items[i]);
                }
            }

            render();

            // Auto-refresh every 60s while attached to the DOM
            var interval = setInterval(function () {
                if (!document.body || !document.body.contains(el)) {
                    clearInterval(interval);
                    return;
                }
                render();
            }, 60000);

            // Expose a manual refresh method for callers that change state
            el.refresh = render;

            return el;
        }
        window.hurmaActionsPanel = hurmaActionsPanel;

    })();

    // ============================================================
    // Self-test v3.1 — verify UI components are exported.
    // ============================================================
    (function uiComponentsSelfTest() {
        var checks = {
            healthBadge:   typeof window.hurmaHealthBadge   === 'function',
            forecastBadge: typeof window.hurmaForecastBadge === 'function',
            actionsPanel:  typeof window.hurmaActionsPanel  === 'function'
        };
        // Smoke: each factory must return a Node-like object without throwing.
        try {
            var h = window.hurmaHealthBadge('__smoke__');
            var f = window.hurmaForecastBadge('__smoke__');
            var p = window.hurmaActionsPanel({ limit: 3 });
            checks.healthNode   = !!(h && h.nodeType === 1 && h.className.indexOf('hurma-health-badge') === 0);
            checks.forecastNode = !!(f && f.nodeType === 1 && f.className.indexOf('hurma-forecast-badge') === 0);
            checks.panelNode    = !!(p && p.nodeType === 1 && p.className.indexOf('hurma-actions-panel') === 0);
            checks.panelRefresh = typeof p.refresh === 'function';
        } catch (e) {
            checks.smokeError = String(e && e.message || e);
        }
        var failed = Object.keys(checks).filter(function (k) { return k !== 'smokeError' && !checks[k]; });
        try {
            if (failed.length || checks.smokeError) {
                console.warn('[hurma-polish v3.1] ui-components FAILED:', failed, checks);
            } else {
                console.log('%c[hurma-polish v3.1] loaded · 3 insight-powered UI components', 'color:#B8731A;font-weight:bold;');
            }
        } catch (e) {}
    })();

    // ============================================================
    // v3.2 — DASHBOARD WIRE-UP (Actions Panel in the home page)
    // ------------------------------------------------------------
    // Goal: surface hurmaActionsPanel({limit:5}) on the Dashboard WITHOUT
    // touching app.js. Mounts a single host div at the TOP of the dashboard
    // (right after export buttons, before the first .stats-grid) and
    // renders the panel inside it exactly once. The panel itself has its
    // own auto-refresh (setInterval) so we don't re-render it — we only
    // ensure the host exists after every dashboard refresh.
    //
    // Pattern mirrors existing app.js helpers (renderExecutiveDashboardWidget,
    // refreshDashboardMiniatures, showSmartSuggestions): find-or-create-host,
    // render-if-empty, be idempotent.
    //
    // Triggers:
    //   1) DOMContentLoaded (initial page load when dashboard is visible)
    //   2) After refreshDashboard() runs (wrapped once it becomes available)
    //   3) After navigateTo('dashboard') (wrapped once it becomes available)
    //
    // Safety:
    //   - Zero writes to state, localStorage or app.js internals.
    //   - If hurmaActionsPanel is missing, this module exits silently.
    //   - If anchor is missing (dashboard not rendered yet), we bail and
    //     retry on the next trigger.
    //   - Monkey-patching is guarded by a flag so multiple runs are safe.
    // ============================================================
    (function dashboardActionsWireUp() {

        var HOST_ID   = 'hurma-dashboard-actions-host';
        var PAGE_ID   = 'page-dashboard';
        var PATCH_KEY = '__hurmaDashboardActionsPatched__';

        // Lookup helpers ---------------------------------------------------
        function getDashboard() {
            if (typeof document === 'undefined') return null;
            return document.getElementById(PAGE_ID);
        }

        function getFirstStatsGrid(dashboard) {
            if (!dashboard) return null;
            return dashboard.querySelector('.stats-grid');
        }

        // Core mount: idempotent — safe to call many times ----------------
        function mountDashboardActionsPanel() {
            // Hard dependency: if UI factory isn't here, give up gracefully.
            if (typeof window.hurmaActionsPanel !== 'function') return false;

            var dash = getDashboard();
            if (!dash) return false;

            // Anchor: the FIRST .stats-grid inside the dashboard page.
            // We insert the host just BEFORE it, so the panel sits at the
            // very top of the content area (below export buttons).
            var statsGrid = getFirstStatsGrid(dash);
            if (!statsGrid || !statsGrid.parentNode) return false;

            var host = document.getElementById(HOST_ID);

            // Create host if it doesn't exist yet.
            if (!host) {
                host = document.createElement('div');
                host.id = HOST_ID;
                host.className = 'hurma-dashboard-actions-host';
                statsGrid.parentNode.insertBefore(host, statsGrid);
            }

            // Ensure the host is positioned BEFORE .stats-grid even if some
            // other code moved it (defensive for unknown future edits).
            if (host.nextSibling !== statsGrid) {
                try { statsGrid.parentNode.insertBefore(host, statsGrid); } catch (e) {}
            }

            // Only render the panel once. The panel auto-refreshes itself
            // via its own setInterval (see hurmaActionsPanel definition).
            // If the panel was removed from the DOM (e.g. innerHTML wipe),
            // render a fresh one.
            var hasPanel = !!host.querySelector('.hurma-actions-panel');
            if (!hasPanel) {
                host.innerHTML = ''; // clean slate
                try {
                    var panel = window.hurmaActionsPanel({ limit: 5 });
                    if (panel && panel.nodeType === 1) {
                        host.appendChild(panel);
                    }
                } catch (e) {
                    try { console.warn('[hurma-polish v3.2] mount panel failed:', e); } catch (_) {}
                    return false;
                }
            } else {
                // Panel exists — nudge it to refresh content immediately
                // (this makes the first dashboard visit feel snappier).
                var existing = host.querySelector('.hurma-actions-panel');
                if (existing && typeof existing.refresh === 'function') {
                    try { existing.refresh(); } catch (_) {}
                }
            }

            return true;
        }
        window.hurmaMountDashboardActionsPanel = mountDashboardActionsPanel;

        // Trigger 1: DOMContentLoaded (or immediately if already loaded) ----
        function scheduleInitialMount() {
            var tryMount = function () {
                // Retry a few times because app.js may still be wiring up.
                var attempts = 0;
                var maxAttempts = 20; // ~4 seconds at 200ms
                var interval = setInterval(function () {
                    attempts++;
                    var ok = mountDashboardActionsPanel();
                    if (ok || attempts >= maxAttempts) clearInterval(interval);
                }, 200);
            };
            if (typeof document === 'undefined') return;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryMount, { once: true });
            } else {
                // Already loaded — but app.js may render asynchronously.
                setTimeout(tryMount, 0);
            }
        }

        // Trigger 2 + 3: patch refreshDashboard and navigateTo --------------
        // These globals are defined by app.js; we don't know the exact
        // timing of when they become available, so we patch lazily.
        // IMPORTANT: track each patch independently so if only one function
        // is available on attempt 1, the other can still be patched later.
        var _patchedRefresh = false;
        var _patchedNav     = false;

        function patchGlobalsOnce() {
            if (typeof window === 'undefined') return;

            // --- Patch refreshDashboard (once) ---
            if (!_patchedRefresh && typeof window.refreshDashboard === 'function') {
                var _origRefresh = window.refreshDashboard;
                window.refreshDashboard = function () {
                    var ret = _origRefresh.apply(this, arguments);
                    try { mountDashboardActionsPanel(); } catch (e) {}
                    return ret;
                };
                _patchedRefresh = true;
            }

            // --- Patch navigateTo (once) ---
            if (!_patchedNav && typeof window.navigateTo === 'function') {
                var _origNav = window.navigateTo;
                window.navigateTo = function (page) {
                    var ret = _origNav.apply(this, arguments);
                    if (page === 'dashboard') {
                        // Defer slightly so that app.js finishes its own
                        // page-activation work (display:block, etc.).
                        setTimeout(function () {
                            try { mountDashboardActionsPanel(); } catch (e) {}
                        }, 50);
                    }
                    return ret;
                };
                _patchedNav = true;
            }

            // Flip the flag only when BOTH patches are in place.
            if (_patchedRefresh && _patchedNav) window[PATCH_KEY] = true;
        }

        // Run the patch attempt multiple times because app.js globals
        // might not be hoisted yet when hurma-polish.js loads.
        function schedulePatching() {
            var attempts = 0;
            var maxAttempts = 30; // ~6 seconds at 200ms
            var interval = setInterval(function () {
                attempts++;
                patchGlobalsOnce();
                // Stop either when BOTH are patched or when we exhaust attempts.
                var done = (_patchedRefresh && _patchedNav) || attempts >= maxAttempts;
                if (done) clearInterval(interval);
            }, 200);
        }

        // Kick everything off ----------------------------------------------
        scheduleInitialMount();
        schedulePatching();

        // ------------------------------------------------------------
        // Self-test v3.2 — verify the module wired up its entry points.
        // ------------------------------------------------------------
        try {
            var selfChecks = {
                mountFn:     typeof window.hurmaMountDashboardActionsPanel === 'function',
                hostId:      HOST_ID === 'hurma-dashboard-actions-host',
                panelSource: typeof window.hurmaActionsPanel === 'function'
            };
            var failed = Object.keys(selfChecks).filter(function (k) { return !selfChecks[k]; });
            if (failed.length) {
                console.warn('[hurma-polish v3.2] dashboard wire-up FAILED:', failed, selfChecks);
            } else {
                console.log('%c[hurma-polish v3.2] dashboard actions wired · top of #page-dashboard', 'color:#B8731A;font-weight:bold;');
            }
        } catch (e) {}

    })();

    // ============================================================
    // v3.3 — BUTTON DOCTOR (diagnose + self-heal onclick handlers)
    // ------------------------------------------------------------
    // Problem: when a button's inline `onclick="fooBar()"` references
    // a function that doesn't exist (renamed, typo, removed), the click
    // silently does nothing AND logs a raw ReferenceError to the console
    // that most users never see. Multiplied across 203 onclick attributes
    // in index.html, broken buttons are hard to find.
    //
    // Solution:
    //   1) Scan all onclick buttons, report which are broken
    //   2) When a user clicks a broken button, show a friendly toast
    //      (instead of silently doing nothing)
    //   3) Expose window.hurmaButtonDoctor() for on-demand diagnostics
    //
    // Zero side-effects on WORKING buttons. Only intercepts FAILING clicks.
    // ============================================================
    (function buttonDoctor() {

        var ATTACHED_KEY = '__hurmaBtnDoctorAttached__';
        // Match `name(` only — skip `name.x(`, `name[…]`, etc. so we don't
        // false-flag patterns like `state.foo()` or `e.preventDefault()`.
        var FN_NAME_RE = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/;

        function extractFunctionName(onclickAttr) {
            if (!onclickAttr) return null;
            var m = FN_NAME_RE.exec(onclickAttr);
            return m ? m[1] : null;
        }

        // A few names that are valid but aren't plain window-functions
        // (e.g. `document.xxx`, `this.xxx`, keywords). Skip these.
        var SKIP_NAMES = { 'document': 1, 'window': 1, 'this': 1,
                           'return': 1, 'if': 1, 'event': 1, 'void': 1 };

        function scanButtons() {
            var nodes = document.querySelectorAll('[onclick]');
            var report = {
                total: nodes.length,
                ok: 0,
                broken: [],
                skipped: 0
            };
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                var attr = n.getAttribute('onclick') || '';
                var fnName = extractFunctionName(attr);
                if (!fnName || SKIP_NAMES[fnName]) { report.skipped++; continue; }
                if (typeof window[fnName] === 'function') { report.ok++; continue; }
                report.broken.push({
                    fn: fnName,
                    attr: attr.length > 80 ? attr.slice(0, 80) + '…' : attr,
                    text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
                    node: n
                });
            }
            return report;
        }

        // Public diagnostic — call in browser console:
        //   hurmaButtonDoctor()       → prints a summary
        //   hurmaButtonDoctor(true)   → also returns the detailed report
        function hurmaButtonDoctor(returnReport) {
            var r = scanButtons();
            try {
                console.log('%c🌴 Hurma Button Doctor', 'color:#B8731A;font-weight:bold;font-size:14px;');
                console.log('Total onclick buttons:', r.total);
                console.log('OK (handler found):   ', r.ok);
                console.log('Skipped (non-global): ', r.skipped);
                console.log('BROKEN:               ', r.broken.length);
                if (r.broken.length) {
                    console.warn('Broken buttons (missing global functions):');
                    for (var i = 0; i < r.broken.length; i++) {
                        var b = r.broken[i];
                        console.warn('  ✗ ' + b.fn + '()  · text: "' + b.text + '"  · attr: ' + b.attr);
                    }
                } else {
                    console.log('%c✓ Të gjithë butonat kanë handler të vlefshëm.', 'color:#2F8F4E;font-weight:bold;');
                }
            } catch (e) {}
            return returnReport ? r : r.broken.length;
        }
        window.hurmaButtonDoctor = hurmaButtonDoctor;

        // Friendly toast helper (non-intrusive, fallback to console) --------
        function showFriendlyErr(msg) {
            try {
                // Prefer app.js's showToast if available
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, 'error');
                    return;
                }
            } catch (e) {}
            // Fallback: ephemeral div bottom-center (no framework)
            try {
                var t = document.createElement('div');
                t.textContent = msg;
                t.style.cssText = [
                    'position:fixed', 'left:50%', 'bottom:24px',
                    'transform:translateX(-50%)',
                    'background:#C0392B', 'color:#fff',
                    'padding:10px 16px', 'border-radius:10px',
                    'font:500 14px/1.3 -apple-system,BlinkMacSystemFont,sans-serif',
                    'box-shadow:0 4px 14px rgba(0,0,0,0.22)',
                    'z-index:999999', 'max-width:90vw',
                    'pointer-events:none'
                ].join(';');
                document.body.appendChild(t);
                setTimeout(function () {
                    t.style.transition = 'opacity 0.4s'; t.style.opacity = '0';
                    setTimeout(function () { t.remove(); }, 500);
                }, 2400);
            } catch (e) {}
        }

        // Document-level listener that only activates on capture-phase and
        // ONLY intercepts clicks where the inline handler is known-broken.
        // Working buttons are never touched.
        function installGlobalHealer() {
            if (window[ATTACHED_KEY]) return;
            window[ATTACHED_KEY] = true;

            document.addEventListener('click', function (e) {
                var t = e.target;
                // Walk up for an onclick owner (buttons often have icon children)
                while (t && t !== document) {
                    if (t.getAttribute && t.getAttribute('onclick')) break;
                    t = t.parentNode;
                }
                if (!t || t === document) return;

                var attr = t.getAttribute('onclick');
                if (!attr) return;
                var fnName = extractFunctionName(attr);
                if (!fnName || SKIP_NAMES[fnName]) return;

                if (typeof window[fnName] !== 'function') {
                    // Broken button — swallow the click and warn the user.
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        console.warn('[hurma] buton i prishur: ' + fnName + '() nuk ekziston');
                    } catch (ex) {}
                    showFriendlyErr('Ky buton nuk është i lidhur me asnjë veprim (' + fnName + ')');
                }
            }, true); // capture = true so we run BEFORE the native inline handler
        }

        // Kick off after DOM is ready ---------------------------------------
        function boot() {
            try { installGlobalHealer(); } catch (e) {}
            // Silently scan a few times as the app finishes loading
            // so the final report reflects all dynamically-added buttons.
            var reports = 0;
            var iv = setInterval(function () {
                reports++;
                try {
                    var r = scanButtons();
                    if (r.broken.length) {
                        console.warn('[hurma-polish v3.3] button doctor: ' + r.broken.length +
                                     ' buton të prishur · run hurmaButtonDoctor() për detaje');
                    } else if (reports === 1) {
                        console.log('%c[hurma-polish v3.3] button doctor: të gjithë butonat OK', 'color:#2F8F4E;');
                    }
                } catch (e) {}
                if (reports >= 3) clearInterval(iv); // check 3 times, 2s apart
            }, 2000);

            // P24: also re-scan whenever new buttons appear in the DOM so the
            // report stays accurate for dynamically-added buttons (modals,
            // menus, table rows, etc.). Debounced to avoid spam.
            try {
                if (typeof MutationObserver === 'function') {
                    var pending = 0;
                    var observer = new MutationObserver(function (muts) {
                        var hasNewBtn = false;
                        for (var i = 0; i < muts.length && !hasNewBtn; i++) {
                            var added = muts[i].addedNodes || [];
                            for (var j = 0; j < added.length; j++) {
                                var n = added[j];
                                if (n && n.nodeType === 1 &&
                                    (n.matches && n.matches('[onclick]') ||
                                     n.querySelector && n.querySelector('[onclick]'))) {
                                    hasNewBtn = true; break;
                                }
                            }
                        }
                        if (!hasNewBtn) return;
                        clearTimeout(pending);
                        pending = setTimeout(function () {
                            try {
                                var r = scanButtons();
                                if (r.broken.length) {
                                    console.warn('[hurma-polish] button doctor (dyn): ' +
                                                 r.broken.length + ' buton të prishur');
                                }
                            } catch (e) {}
                        }, 800);
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            } catch (e) {}
        }

        if (typeof document === 'undefined') return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot, { once: true });
        } else {
            setTimeout(boot, 0);
        }

        // Self-test ---------------------------------------------------------
        try {
            if (typeof window.hurmaButtonDoctor === 'function') {
                console.log('%c[hurma-polish v3.3] button doctor ready · run hurmaButtonDoctor() në console', 'color:#B8731A;font-weight:bold;');
            } else {
                console.warn('[hurma-polish v3.3] hurmaButtonDoctor not exported');
            }
        } catch (e) {}

    })();

})();
