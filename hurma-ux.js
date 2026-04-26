// ════════════════════════════════════════════════════════════════════
// HURMA UX — Animacione, Mobile, Empty States, Onboarding (kategoria 5/6/7)
// ════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─── (#26) NUMBER COUNT-UP ─────────────────────────────────────────
    // Animon numra të mëdhenj nga 0 → vlera reale (easing 600ms)
    window.animateCountUp = function(el, targetValue, options) {
        if (!el) return;
        options = options || {};
        const duration = options.duration || 800;
        const suffix = options.suffix || '';
        const decimals = options.decimals || 0;
        const startValue = parseFloat(el.dataset.lastValue || '0') || 0;
        const target = parseFloat(targetValue) || 0;
        if (startValue === target) {
            el.textContent = formatNum(target, decimals) + suffix;
            return;
        }
        el.dataset.lastValue = target;
        const startTime = performance.now();
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        function tick(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const eased = easeOutCubic(t);
            const current = startValue + (target - startValue) * eased;
            el.textContent = formatNum(current, decimals) + suffix;
            if (t < 1) requestAnimationFrame(tick);
            else if (target > startValue) el.classList.add('count-up-flash'), setTimeout(() => el.classList.remove('count-up-flash'), 700);
        }
        requestAnimationFrame(tick);
    };
    function formatNum(n, decimals) {
        if (decimals > 0) return n.toFixed(decimals);
        return Math.round(n).toLocaleString('sq-AL');
    }

    // ─── (#25) CONFETTI BURST ──────────────────────────────────────────
    window.fireConfetti = function(options) {
        options = options || {};
        const count = options.count || 80;
        const colors = options.colors || ['#e17055', '#f39c12', '#27ae60', '#9b59b6', '#3498db', '#fdcb6e'];
        const burst = document.createElement('div');
        burst.className = 'confetti-burst';
        document.body.appendChild(burst);
        for (let i = 0; i < count; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            const x = (Math.random() - 0.5) * window.innerWidth;
            const startLeft = 50 + (Math.random() - 0.5) * 30;
            piece.style.left = startLeft + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.setProperty('--x', x + 'px');
            piece.style.animationDelay = (Math.random() * 300) + 'ms';
            piece.style.animationDuration = (1800 + Math.random() * 1000) + 'ms';
            piece.style.width = (6 + Math.random() * 8) + 'px';
            piece.style.height = (10 + Math.random() * 8) + 'px';
            burst.appendChild(piece);
        }
        setTimeout(() => { try { burst.remove(); } catch(e){} }, 3500);
    };

    // ─── (#27) BOTTOM TAB BAR — sync me page aktive ────────────────────
    function syncBottomTabs() {
        const activePage = (document.querySelector('.nav-item.active') || {}).dataset?.page;
        document.querySelectorAll('.bottom-tab-item[data-page]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === activePage);
        });
    }
    // Vëzhgo ndryshimet te sidebar nav
    const navObserver = new MutationObserver(syncBottomTabs);
    document.addEventListener('DOMContentLoaded', () => {
        const sidebarNav = document.querySelector('.nav-menu');
        if (sidebarNav) navObserver.observe(sidebarNav, { attributes: true, subtree: true, attributeFilter: ['class'] });
        syncBottomTabs();
        // Update bottom tab badges
        const updateBadges = () => {
            const sBadge = document.getElementById('badge-sales');
            const btSales = document.getElementById('bt-badge-sales');
            if (sBadge && btSales) {
                btSales.textContent = sBadge.textContent;
                btSales.classList.toggle('hidden', sBadge.classList.contains('hidden'));
            }
        };
        new MutationObserver(updateBadges).observe(document.body, { subtree: true, childList: true });
    });

    // ─── (#28) PULL-TO-REFRESH ─────────────────────────────────────────
    let ptrStartY = 0;
    let ptrDelta = 0;
    let ptrEl = null;
    function setupPullToRefresh() {
        if (!('ontouchstart' in window)) return;
        const main = document.getElementById('main-content');
        if (!main) return;
        // Krijo indicator nëse mungon
        ptrEl = document.createElement('div');
        ptrEl.className = 'pull-to-refresh';
        ptrEl.innerHTML = '<i class="fas fa-arrow-down"></i>';
        main.appendChild(ptrEl);

        main.addEventListener('touchstart', (e) => {
            if (main.scrollTop <= 0) {
                ptrStartY = e.touches[0].clientY;
                ptrDelta = 0;
            }
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            if (ptrStartY === 0 || main.scrollTop > 0) return;
            ptrDelta = e.touches[0].clientY - ptrStartY;
            if (ptrDelta > 0 && ptrDelta < 120) {
                ptrEl.style.transform = `translateX(-50%) translateY(${Math.min(ptrDelta - 60, 30)}px)`;
                if (ptrDelta > 80) ptrEl.classList.add('active');
                else ptrEl.classList.remove('active');
            }
        }, { passive: true });

        main.addEventListener('touchend', () => {
            if (ptrDelta > 80) {
                ptrEl.classList.add('refreshing');
                ptrEl.querySelector('i').className = 'fas fa-spinner';
                if (typeof refreshAll === 'function') refreshAll();
                if (navigator.vibrate) try { navigator.vibrate(30); } catch(e) {}
                setTimeout(() => {
                    ptrEl.classList.remove('refreshing', 'active');
                    ptrEl.querySelector('i').className = 'fas fa-arrow-down';
                    ptrEl.style.transform = '';
                }, 800);
            } else {
                ptrEl.classList.remove('active');
                ptrEl.style.transform = '';
            }
            ptrStartY = 0;
            ptrDelta = 0;
        }, { passive: true });
    }
    document.addEventListener('DOMContentLoaded', setupPullToRefresh);

    // ─── (#29) SWIPE ACTIONS — për row te tabela ───────────────────────
    // Aplikon te elementet me .swipeable-row
    let swipeStartX = 0, swipeRow = null, swipeContent = null;
    document.addEventListener('touchstart', (e) => {
        const row = e.target.closest('.swipeable-row');
        if (!row) return;
        swipeRow = row;
        swipeContent = row.querySelector('.swipe-content');
        swipeStartX = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!swipeContent) return;
        const dx = e.touches[0].clientX - swipeStartX;
        if (Math.abs(dx) > 10) {
            swipeContent.style.transform = `translateX(${Math.max(-160, Math.min(160, dx))}px)`;
        }
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        if (!swipeContent) return;
        const dx = e.changedTouches[0].clientX - swipeStartX;
        if (dx < -80) {
            swipeContent.style.transform = 'translateX(-160px)';
        } else if (dx > 80) {
            swipeContent.style.transform = 'translateX(160px)';
        } else {
            swipeContent.style.transform = '';
        }
        swipeStartX = 0; swipeRow = null; swipeContent = null;
    }, { passive: true });

    // ─── (#32) FIRST-RUN ONBOARDING TOUR ───────────────────────────────
    const ONBOARD_KEY = 'hurma-onboarding-done';
    const TOUR_STEPS = [
        {
            target: '#page-title',
            title: '👋 Mirë se erdhe te Hurma!',
            text: 'Aplikacion menaxhimi për dyqanin tënd shumicë. Të kalojmë nëpër veçoritë kryesore (1 minutë).'
        },
        {
            target: '.nav-item[data-page="sales"]',
            title: '🛒 Shitjet',
            text: 'Këtu regjistron çdo shitje. Klientët, produktet, fatura — gjithçka në një tabelë të organizuar.'
        },
        {
            target: '.nav-item[data-page="clients"]',
            title: '👥 Klientët',
            text: 'Lista e plotë e klientëve me borxh, telefon, dhe historikun e blerjeve.'
        },
        {
            target: '.nav-item[data-page="faton"]',
            title: '🤝 Llogaria Fatoni',
            text: 'Aty ku menaxhon çdo gjë me furnizuesin Fatoni — borxhin, pagesat, blerjet.'
        },
        {
            target: '.nav-item[data-page="ai"]',
            title: '🤖 Hurma AI',
            text: 'Asistenti yt që njeh dyqanin. Pyete me zë ose tekst, "Sa shita sot?", "Kush ka borxh?".'
        },
        {
            target: '#global-search',
            title: '🔍 Kërkim universal',
            text: 'Shtyp ⌘K (ose Ctrl+K) për paletën e fuqishme. Shkruaj "ajdan medjool 3" → shitje me 1 klikim!'
        }
    ];

    let tourStep = 0;
    let tourOverlay = null;
    let tourTooltip = null;

    window.startOnboardingTour = function() {
        tourStep = 0;
        showTourStep();
    };
    window.skipOnboardingTour = function() {
        try { localStorage.setItem(ONBOARD_KEY, '1'); } catch(e) {}
        cleanupTour();
    };

    function showTourStep() {
        cleanupTour();
        const step = TOUR_STEPS[tourStep];
        if (!step) {
            try { localStorage.setItem(ONBOARD_KEY, '1'); } catch(e) {}
            try { fireConfetti({ count: 60 }); } catch(e) {}
            return;
        }
        const target = document.querySelector(step.target);
        if (!target) {
            tourStep++;
            return showTourStep();
        }

        tourOverlay = document.createElement('div');
        tourOverlay.className = 'onboarding-overlay';
        document.body.appendChild(tourOverlay);

        tourTooltip = document.createElement('div');
        tourTooltip.className = 'onboarding-tooltip';
        tourTooltip.innerHTML = `
            <h4>${step.title}</h4>
            <p>${step.text}</p>
            <div class="ot-actions">
                <button class="btn btn-sm btn-secondary" onclick="skipOnboardingTour()">Anashkalo</button>
                <span class="ot-progress">${tourStep + 1} / ${TOUR_STEPS.length}</span>
                <button class="btn btn-sm btn-primary" onclick="window._tourNext()">${tourStep + 1 === TOUR_STEPS.length ? 'Mbaroj ✓' : 'Vazhdo →'}</button>
            </div>
        `;
        document.body.appendChild(tourTooltip);

        // Pozicionim
        const rect = target.getBoundingClientRect();
        const tipW = 320, tipH = tourTooltip.offsetHeight || 180;
        let top = rect.bottom + 12;
        let left = rect.left + rect.width / 2 - tipW / 2;
        // Nëse jashtë viewport, vendos lart
        if (top + tipH > window.innerHeight - 20) top = rect.top - tipH - 12;
        if (left < 12) left = 12;
        if (left + tipW > window.innerWidth - 12) left = window.innerWidth - tipW - 12;
        tourTooltip.style.left = left + 'px';
        tourTooltip.style.top = top + 'px';

        // Highlight target — outline + scrollIntoView
        target.style.outline = '3px solid #e17055';
        target.style.outlineOffset = '4px';
        target.style.borderRadius = '8px';
        target.style.position = 'relative';
        target.style.zIndex = '99999';
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tourTooltip._target = target;
    }
    window._tourNext = function() {
        tourStep++;
        showTourStep();
    };
    function cleanupTour() {
        if (tourTooltip) {
            const t = tourTooltip._target;
            if (t) { t.style.outline = ''; t.style.zIndex = ''; t.style.outlineOffset = ''; }
            tourTooltip.remove(); tourTooltip = null;
        }
        if (tourOverlay) { tourOverlay.remove(); tourOverlay = null; }
    }

    // Auto-trigger DEAKTIVIZUAR — user-i mund ta thërrasë me window.startOnboardingTour()
    // Dikur shkaktonte ngecje në init nëse query-selectorët mungonin.
    // Trigger manual mbetet i mundshëm nga ⚙️ Cilësimet.

    // ─── (#33) WELCOME SCREEN — Quick actions për new users ────────────
    window.showWelcomeScreen = function() {
        const dash = document.querySelector('#page-dashboard');
        if (!dash) return;
        // Nëse ka tashmë të dhëna, mos e shfaq
        const state = window.state || {};
        if ((state.sales || []).length > 0 || (state.clients || []).length > 0) return;
        // Shfaq vetëm nëse s'ka të dhëna
        const wrap = document.createElement('div');
        wrap.className = 'welcome-screen';
        wrap.id = 'welcome-screen';
        wrap.innerHTML = `
            <div class="welcome-emoji">🌴</div>
            <h1>Mirë se erdhe te Hurma!</h1>
            <p class="welcome-sub">Aplikacioni yt për menaxhimin e dyqanit shumicë. Fillo me 3 hapa të thjeshtë:</p>
            <div class="welcome-actions">
                <a class="welcome-action-card" onclick="navigateTo('clients'); setTimeout(()=>{ if (typeof openClientModal==='function') openClientModal(); }, 200);">
                    <div class="wac-icon"><i class="fas fa-user-plus"></i></div>
                    <div class="wac-title">1. Shto klientin e parë</div>
                    <div class="wac-desc">Emri, telefoni, adresa</div>
                </a>
                <a class="welcome-action-card" onclick="navigateTo('stock');">
                    <div class="wac-icon"><i class="fas fa-boxes-stacked"></i></div>
                    <div class="wac-title">2. Konfiguro stokun</div>
                    <div class="wac-desc">Sa nga çdo produkt ke në dyqan</div>
                </a>
                <a class="welcome-action-card" onclick="navigateTo('sales'); setTimeout(()=>{ if (typeof openSaleModal==='function') openSaleModal(); }, 200);">
                    <div class="wac-icon"><i class="fas fa-cash-register"></i></div>
                    <div class="wac-title">3. Regjistro shitjen e parë</div>
                    <div class="wac-desc">Klient + produkt = fitim 🎉</div>
                </a>
            </div>
            <button class="btn btn-secondary" onclick="document.getElementById('welcome-screen').style.display='none'; localStorage.setItem('hurma-welcome-dismissed','1');">Anashkalo për tani</button>
        `;
        dash.prepend(wrap);
    };
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            try {
                if (localStorage.getItem('hurma-welcome-dismissed') === '1') return;
                showWelcomeScreen();
            } catch(e) {}
        }, 800);
    });

    // ─── (#26) APLIKO COUNT-UP TE DASHBOARD KPI VALUES ─────────────────
    // Hook into refreshDashboard (nëse ekziston)
    if (typeof window.refreshDashboard === 'function') {
        const orig = window.refreshDashboard;
        window.refreshDashboard = function() {
            orig.apply(this, arguments);
            // Animate KPI values
            try {
                document.querySelectorAll('#today-profit, #today-sales, #your-share, #monthly-profit').forEach(el => {
                    if (!el) return;
                    const txt = (el.textContent || '').replace(/[^\d.-]/g, '');
                    const num = parseFloat(txt) || 0;
                    const suffix = el.id === 'today-sales' ? '' : ' ден';
                    animateCountUp(el, num, { suffix, duration: 600 });
                });
            } catch(e) {}
        };
    }

    // ─── EMPTY STATES — auto-replace empty tables ──────────────────────
    window.renderEmptyState = function(container, opts) {
        opts = opts || {};
        const emoji = opts.emoji || '📭';
        const title = opts.title || 'Asnjë e dhënë akoma';
        const text = opts.text || 'Ende s\'ke shtuar asgjë këtu.';
        const action = opts.action || null;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-illustration">${emoji}</div>
                <h3>${title}</h3>
                <p>${text}</p>
                ${action ? `<button class="btn btn-primary" onclick="${action.onclick}">${action.label}</button>` : ''}
            </div>
        `;
    };

    // Eksopo
    window.HurmaUX = { animateCountUp, fireConfetti, startOnboardingTour, showWelcomeScreen, renderEmptyState };
})();
