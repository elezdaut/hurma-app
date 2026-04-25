// ════════════════════════════════════════════════════════════════════════
// HURMA AI — Claude Opus i integruar me njohje të dhënash
// ════════════════════════════════════════════════════════════════════════
// Bisedo me AI që e di gjithçka për dyqanin tënd. Përdor API-në e Anthropic
// direkt nga browser-i (kërkon `anthropic-dangerous-direct-browser-access`).
// Çelësi ruhet vetëm në localStorage të pajisjes tënde.
// ────────────────────────────────────────────────────────────────────────

(function() {
    'use strict';

    const STORAGE_KEY_API = 'hurma-ai-api-key';
    const STORAGE_KEY_CONV = 'hurma-ai-conversation';
    const STORAGE_KEY_MODEL = 'hurma-ai-model';
    const STORAGE_KEY_TTS = 'hurma-ai-tts-enabled';
    const STORAGE_KEY_BRIEFING = 'hurma-ai-last-briefing';
    const STORAGE_KEY_OPENAI = 'hurma-ai-openai-key'; // për Whisper transcription

    // ═══════════════════════════════════════════════════════════════════
    // SLASH COMMANDS — komanda të shpejta që zgjerohen në pyetje të plota
    // ═══════════════════════════════════════════════════════════════════
    const SLASH_COMMANDS = [
        { cmd: '/borxh', label: 'Klientë me borxh', icon: 'fa-triangle-exclamation', expand: 'Cilët klientë kanë borxh? Më jep listën me prioritet (sa borxh, ditë vonese), telefonat, dhe propozim mesazhi WhatsApp për secilin.' },
        { cmd: '/sot', label: 'Çfarë ndodhi sot', icon: 'fa-calendar-day', expand: 'Më jep një përmbledhje të plotë të ditës së sotme: shitjet, fitimi, klientët që blenë, produktet që shitëm, çdo gjë që duhet ta di.' },
        { cmd: '/stok', label: 'Stok i ulët', icon: 'fa-boxes-stacked', expand: 'Cilët produkte janë me stok të ulët ose që do mbarojnë së shpejti? Më rendit me prioritet dhe sa duhet të porosis nga Fatoni.' },
        { cmd: '/javore', label: 'Raport javor', icon: 'fa-chart-line', expand: 'Bëj një raport të plotë të javës: shitjet totale, fitimin, top klientët, top produktet, krahasim me javën e kaluar, dhe sugjerime për javën e ardhshme.' },
        { cmd: '/muajore', label: 'Raport mujor', icon: 'fa-chart-bar', expand: 'Bëj raport mujor: qarkullim total, fitim, krahasim me muajin e kaluar, top 5 klientë, top 5 produkte, dhe trende të rëndësishme.' },
        { cmd: '/faton', label: 'Llogaria Fatoni', icon: 'fa-handshake', expand: 'Si është gjendja me Fatonin? Sa borxh kam, sa kam paguar muajin këtë, kur ishte pagesa e fundit, dhe çfarë duhet bërë.' },
        { cmd: '/parashiko', label: 'Parashikim', icon: 'fa-crystal-ball', expand: 'Bëj parashikim për javën dhe muajin e ardhshëm bazuar në historik. Çfarë do shitet më shumë, sa fitim pritet, çfarë duhet të bëj.' },
        { cmd: '/kontakto', label: 'Kë të kontaktoj', icon: 'fa-phone', expand: 'Cilët klientë duhet të kontaktoj sot? Listo me prioritet (borxh i madh, s\'kanë blerë gjatë, e të tjera) dhe propozim mesazhi.' },
        { cmd: '/cmime', label: 'Analizë çmimesh', icon: 'fa-percent', expand: 'Analizo çmimet e produkteve të mia: cili ka margjinë më të mirë, cili më të keqen, çfarë duhet të ndryshoj?' },
        { cmd: '/fitim', label: 'Si të rrit fitimin', icon: 'fa-rocket', expand: 'Më jep 5 sugjerime praktike dhe konkrete për të rritur fitimin javës së ardhshme bazuar në të dhënat e mia.' }
    ];

    // Modelet e disponueshme — më i ri / më i fuqishëm i pari
    const MODELS = [
        { id: 'claude-opus-4-5', label: 'Claude Opus 4.5 (më i mençur)', tier: 'opus' },
        { id: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1', tier: 'opus' },
        { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (i shpejtë + i mirë)', tier: 'sonnet' },
        { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (më i shpejtë + më lirë)', tier: 'haiku' }
    ];
    const DEFAULT_MODEL = 'claude-opus-4-5';

    let conversation = []; // { role: 'user'|'assistant', content: '...' }
    let isStreaming = false;
    let abortController = null;

    // ═══════════════════════════════════════════════════════════════════
    // System prompt — kontekst i PLOTË HISTORIK: çdo shitje, klient, pagesë
    // Përditësohet automatikisht në çdo mesazh (snapshot freskët).
    // ═══════════════════════════════════════════════════════════════════
    // Helper që merr state nga çdo vend i mundshëm (window.state, global state, hurma-state localStorage)
    function getLiveState() {
        if (typeof window.state === 'object' && window.state) return window.state;
        try { if (typeof state === 'object' && state) return state; } catch(e) {}
        // Fallback: lexo direkt nga localStorage
        try {
            const raw = localStorage.getItem('hurma-state');
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return {};
    }
    function getLiveProducts() {
        if (Array.isArray(window.PRODUCTS)) return window.PRODUCTS;
        try { if (Array.isArray(PRODUCTS)) return PRODUCTS; } catch(e) {}
        const s = getLiveState();
        if (Array.isArray(s.customProducts) && s.customProducts.length) return s.customProducts;
        return [];
    }

    function buildSystemPrompt() {
        const state = getLiveState();
        const PRODUCTS = getLiveProducts();

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const monthStart = today.substring(0, 7);
        const currentYear = today.substring(0, 4);
        const lastYear = String(parseInt(currentYear, 10) - 1);

        // ── Klientët (TË GJITHË) ──────────────────────────────────────────
        const clients = (state.clients || []).map(c => {
            const cSales = (state.sales || []).filter(s => s && s.clientId === c.id);
            const cPayments = (state.clientPayments || []).filter(p => p && p.clientId === c.id);
            const totalRevenue = cSales.reduce((sum, s) => sum + ((s && s.sellTotal) || 0), 0);
            const totalProfit = cSales.reduce((sum, s) => sum + ((s && s.profit) || 0), 0);
            const totalPaid = cPayments.reduce((sum, p) => sum + ((p && p.amount) || 0), 0);
            const debt = calcClientDebt(c.id);
            const lastSale = cSales.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
            const lastPay = cPayments.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
            const daysSinceLastBuy = lastSale && lastSale.date
                ? Math.floor((now - new Date(lastSale.date)) / (1000*60*60*24))
                : null;
            return {
                id: c.id,
                emri: c.name,
                telefoni: c.phone || null,
                email: c.email || null,
                adresa: c.address || null,
                lokacioni: c.location || null,
                shenim: c.note || null,
                borxh_aktual: debt,
                shitje_count: cSales.length,
                qarkullim_total: totalRevenue,
                fitim_total: totalProfit,
                paguar_total: totalPaid,
                blerja_e_fundit: lastSale ? lastSale.date : null,
                ditë_pa_blerë: daysSinceLastBuy,
                pagesa_e_fundit: lastPay ? lastPay.date : null,
                është_pinned: (state.pinnedClients || []).includes(c.id)
            };
        });

        // ── Produktet (TË GJITHË me stok + analitikë) ────────────────────
        const products = PRODUCTS.map(p => {
            const stk = ((state.stock || {})[p.id] || 0);
            const pSales = (state.sales || []).filter(s => s && s.productId === p.id);
            const totalSold = pSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const totalRevenue = pSales.reduce((sum, s) => sum + ((s && s.sellTotal) || 0), 0);
            const totalProfit = pSales.reduce((sum, s) => sum + ((s && s.profit) || 0), 0);
            // Velocity 30 ditë (sa shitet në ditë mesatarisht)
            const recent30 = pSales.filter(s => {
                if (!s.date) return false;
                const d = new Date(s.date);
                const days = (now - d) / (1000*60*60*24);
                return days <= 30 && days >= 0;
            });
            const sold30 = recent30.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const velocityPerDay = sold30 / 30;
            const daysOfStock = velocityPerDay > 0 ? Math.round(stk / velocityPerDay) : null;
            return {
                id: p.id,
                emri: p.name,
                pesha: p.weight || '',
                kategoria: p.category || null,
                cmim_blerje: p.buyPrice || 0,
                cmim_shitje: p.sellPrice || 0,
                margjina_për_copë: ((p.sellPrice || 0) - (p.buyPrice || 0)),
                margjina_pct: p.buyPrice ? Math.round((((p.sellPrice || 0) - p.buyPrice) / p.buyPrice) * 100) : 0,
                stok_aktual: stk,
                shitur_30_ditë: sold30,
                velocity_ditore: Math.round(velocityPerDay * 100) / 100,
                ditë_stoku_mbeten: daysOfStock,
                shitur_total: totalSold,
                qarkullim_total: totalRevenue,
                fitim_total: totalProfit,
                statusi_stokut: stk === 0 ? '🔴 MUNGON' : stk < 3 ? '🔴 URGJENT' : stk < 5 ? '🟠 i ulët' : '🟢 OK',
                ka_skadencë: !!p.expiryDate
            };
        });

        // ── Statistikat e ditës / javës / muajit ─────────────────────────
        const todaySales = (state.sales || []).filter(s => s && s.date === today);
        const monthSales = (state.sales || []).filter(s => s && s.date && s.date.startsWith(monthStart));
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekSales = (state.sales || []).filter(s => s && s.date && s.date >= weekStartStr);

        const sumProfit = arr => arr.reduce((sum, s) => sum + ((s && s.profit) || 0), 0);
        const sumRevenue = arr => arr.reduce((sum, s) => sum + ((s && s.sellTotal) || 0), 0);

        const stats = {
            sot: { count: todaySales.length, fitim: sumProfit(todaySales), qarkullim: sumRevenue(todaySales) },
            javë_e_fundit: { count: weekSales.length, fitim: sumProfit(weekSales), qarkullim: sumRevenue(weekSales) },
            muaji_aktual: { count: monthSales.length, fitim: sumProfit(monthSales), qarkullim: sumRevenue(monthSales) },
            shitje_total_gjithë_kohërave: { count: (state.sales || []).length, fitim: sumProfit(state.sales || []), qarkullim: sumRevenue(state.sales || []) }
        };

        // ── Llogaria Fatoni (furnizuesi) — TË GJITHA pagesat + blerjet ───
        const fatonDebt = (typeof calcFatonDebt === 'function') ? calcFatonDebt() : 0;
        const allFatonPayments = (state.fatonPayments || []).slice().reverse(); // ALL, më të reja para
        const allFatonPurchases = (state.fatonPurchases || []).slice().reverse();
        const lastFatonPay = allFatonPayments[0];
        const daysSinceFatonPay = lastFatonPay && lastFatonPay.date
            ? Math.floor((now - new Date(lastFatonPay.date)) / (1000*60*60*24))
            : null;
        // Agregime Faton sipas vitit
        const fatonByYear = {};
        allFatonPayments.forEach(p => {
            if (!p || !p.date) return;
            const yr = p.date.substring(0, 4);
            if (!fatonByYear[yr]) fatonByYear[yr] = { paguar: 0, count_pagesa: 0, blerje: 0, count_blerje: 0 };
            fatonByYear[yr].paguar += (p.amount || 0);
            fatonByYear[yr].count_pagesa += 1;
        });
        allFatonPurchases.forEach(p => {
            if (!p || !p.date) return;
            const yr = p.date.substring(0, 4);
            if (!fatonByYear[yr]) fatonByYear[yr] = { paguar: 0, count_pagesa: 0, blerje: 0, count_blerje: 0 };
            fatonByYear[yr].blerje += (p.totalCost || p.cost || p.amount || 0);
            fatonByYear[yr].count_blerje += 1;
        });

        // ── Pjesa e fitimit (Elezi vs Partneri) ──────────────────────────
        const profitSplit = state.profitSplit || { owner: 50, partner: 50 };
        const partnerName = state.partnerName || 'Partneri';

        // ── Faturat e hapura ──────────────────────────────────────────────
        const openInvoices = (state.sales || [])
            .filter(s => s && s.paymentType === 'invoice_60' && !s.invoicePaid)
            .map(s => {
                const c = (state.clients || []).find(cl => cl && cl.id === s.clientId);
                const p = PRODUCTS.find(pr => pr.id === s.productId);
                const dueDate = s.dueDate || (s.date ? (() => {
                    const d = new Date(s.date); d.setDate(d.getDate() + 60);
                    return d.toISOString().split('T')[0];
                })() : null);
                const overdue = dueDate && dueDate < today;
                return {
                    id: s.id || null,
                    klient: c ? c.name : '-',
                    klient_id: s.clientId,
                    produkt: p ? p.name : (s.productId || '-'),
                    sasi: s.quantity,
                    shuma: s.sellTotal,
                    paguar_pjesërisht: s.amountPaid || 0,
                    mbetur: (s.sellTotal || 0) - (s.amountPaid || 0),
                    data_shitjes: s.date,
                    data_skadimit: dueDate,
                    vonesë: overdue,
                    ditë_vonesë: overdue && dueDate ? Math.floor((now - new Date(dueDate)) / (1000*60*60*24)) : 0
                };
            })
            .sort((a, b) => (b.mbetur || 0) - (a.mbetur || 0));

        // ── Pagesa nga klientët — TË GJITHA ─────────────────────────────
        const allClientPayments = (state.clientPayments || []).slice().reverse();

        // ── Shitjet — adaptive: TË GJITHA nëse <= 800; përndryshe samplim i zgjuar ─
        const allSales = (state.sales || []);
        const totalSalesCount = allSales.length;
        const sortedSales = allSales.slice().sort((a, b) => {
            const da = (b && (b.createdAt || b.date)) || '';
            const db = (a && (a.createdAt || a.date)) || '';
            return da.localeCompare(db);
        });

        function formatSale(s) {
            if (!s) return null;
            const c = (state.clients || []).find(cl => cl && cl.id === s.clientId);
            const p = PRODUCTS.find(pr => pr.id === s.productId);
            return {
                id: s.id || null,
                data: s.date,
                klient: c ? c.name : '-',
                produkt: p ? p.name : (s.productId || '-'),
                sasi: s.quantity,
                cmim_shitje: s.sellPrice,
                qarkullim: s.sellTotal,
                fitim: s.profit,
                pagesa: s.paymentType || 'cash',
                fatura_paguar: s.invoicePaid || false,
                shenim: s.note || null,
                zbritje: s.discount || 0
            };
        }

        let salesData;
        if (totalSalesCount <= 800) {
            // I vogël: TË GJITHA shitjet (më të rejat para)
            salesData = {
                qasje: 'TË_GJITHA',
                count_total: totalSalesCount,
                lista: sortedSales.map(formatSale).filter(Boolean)
            };
        } else {
            // I madh: 100 të parat (origjina) + 500 të fundit + mungoj në mes
            salesData = {
                qasje: 'PJESORE_ME_AGREGIM',
                count_total: totalSalesCount,
                shenim: 'Për shitjet e plota mes këtyre, përdor agregimet vjetore/mujore poshtë',
                shitjet_e_para_100: sortedSales.slice(-100).reverse().map(formatSale).filter(Boolean),
                shitjet_e_fundit_500: sortedSales.slice(0, 500).map(formatSale).filter(Boolean)
            };
        }

        // ── Agregime shitje sipas vitit / muajit ──────────────────────────
        const salesByYear = {};
        const salesByMonth = {}; // YYYY-MM
        const salesByClient = {}; // clientId
        const salesByProduct = {}; // productId
        allSales.forEach(s => {
            if (!s || !s.date) return;
            const yr = s.date.substring(0, 4);
            const ym = s.date.substring(0, 7);
            const profit = (s.profit || 0);
            const revenue = (s.sellTotal || 0);
            const qty = (s.quantity || 0);

            if (!salesByYear[yr]) salesByYear[yr] = { count: 0, qarkullim: 0, fitim: 0, sasi: 0 };
            salesByYear[yr].count++;
            salesByYear[yr].qarkullim += revenue;
            salesByYear[yr].fitim += profit;
            salesByYear[yr].sasi += qty;

            if (!salesByMonth[ym]) salesByMonth[ym] = { count: 0, qarkullim: 0, fitim: 0, sasi: 0 };
            salesByMonth[ym].count++;
            salesByMonth[ym].qarkullim += revenue;
            salesByMonth[ym].fitim += profit;
            salesByMonth[ym].sasi += qty;
        });

        // Mbaj vetëm 24 muajt e fundit për agregim mujor (që mos të rritet shumë)
        const sortedMonths = Object.keys(salesByMonth).sort().reverse();
        const recent24Months = {};
        sortedMonths.slice(0, 36).forEach(m => { recent24Months[m] = salesByMonth[m]; });

        // ── Porositë — TË GJITHA ─────────────────────────────────────────
        const allOrders = (state.orders || []).slice().reverse().map(o => {
            const p = PRODUCTS.find(pr => pr.id === o.productId);
            return {
                id: o.id,
                data: o.date,
                produkt: p ? p.name : (o.productId || '-'),
                sasi: o.quantity,
                cmim: o.price || 0,
                statusi: o.status || 'pending',
                shenim: o.note || null
            };
        });

        // ── Kthimet — TË GJITHA ───────────────────────────────────────────
        const allReturns = (state.returns || []).slice().reverse().map(r => {
            const p = PRODUCTS.find(pr => pr.id === r.productId);
            const c = (state.clients || []).find(cl => cl && cl.id === r.clientId);
            return {
                data: r.date,
                produkt: p ? p.name : '-',
                sasi: r.quantity,
                klient: c ? c.name : null,
                arsye: r.reason || null
            };
        });

        // ── Shpenzimet — TË GJITHA + agregim mujor ──────────────────────
        const allExpenses = (state.expenses || []).slice().reverse().map(e => ({
            data: e.date,
            kategoria: e.category || 'tjetër',
            shuma: e.amount,
            përshkrimi: e.description || ''
        }));
        const monthExpenses = allExpenses.filter(e => e.data && e.data.startsWith(monthStart));
        const totalMonthExpenses = monthExpenses.reduce((sum, e) => sum + (e.shuma || 0), 0);
        const expensesByMonth = {};
        const expensesByCategory = {};
        allExpenses.forEach(e => {
            if (!e || !e.data) return;
            const ym = e.data.substring(0, 7);
            if (!expensesByMonth[ym]) expensesByMonth[ym] = 0;
            expensesByMonth[ym] += (e.shuma || 0);
            const cat = e.kategoria || 'tjetër';
            if (!expensesByCategory[cat]) expensesByCategory[cat] = { total: 0, count: 0 };
            expensesByCategory[cat].total += (e.shuma || 0);
            expensesByCategory[cat].count++;
        });

        // ── Shënimet ──────────────────────────────────────────────────────
        const notes = (state.notes || []).slice(-30).reverse().map(n => ({
            data: n.date || n.createdAt,
            titull: n.title || '',
            tekst: (n.text || '').substring(0, 500), // limit length
            klient_lidhur: n.linkedClient || null,
            tag: n.tag || null
        }));

        // ── Qëllimet ──────────────────────────────────────────────────────
        const targets = (state.targets || []).map(t => ({
            tipi: t.type || 'profit',
            periudha: t.period || 'monthly',
            vlera_synuar: t.target,
            vlera_aktuale: t.actual || 0,
            përqindje: t.target ? Math.round(((t.actual || 0) / t.target) * 100) : 0
        }));

        // ── Kontaktet ─────────────────────────────────────────────────────
        const contacts = (state.contacts || []).map(c => ({
            emri: c.name,
            telefoni: c.phone,
            email: c.email,
            kategoria: c.category || null
        }));

        // ── Activity log (50 të fundit) ──────────────────────────────────
        const activityLog = (state.activityLog || []).slice(-50).reverse().map(a => ({
            koha: a.timestamp || a.time || a.date,
            tipi: a.type || a.action,
            detaji: (a.text || a.details || '').substring(0, 200),
            faqja: a.page || null
        }));

        // ── Lokacionet ────────────────────────────────────────────────────
        const locations = (state.locations || []);

        // ── Quick Sale Presets ───────────────────────────────────────────
        const presets = (state.salePresets || []).map(p => {
            const prod = PRODUCTS.find(x => x.id === p.productId);
            return {
                emri: p.name,
                produkt: prod ? prod.name : p.productId,
                sasi: p.quantity,
                cmim_përdoret: prod ? prod.sellPrice * p.quantity : 0
            };
        });

        // ── Insight i shpejtë i AI (top performers, alarme) ──────────────
        const insights = {
            top_5_klientë_për_qarkullim: clients.slice().sort((a,b) => b.qarkullim_total - a.qarkullim_total).slice(0,5).map(c => ({ emri: c.emri, qarkullim: c.qarkullim_total, borxh: c.borxh_aktual })),
            top_5_klientë_me_borxh: clients.filter(c => c.borxh_aktual > 0).sort((a,b) => b.borxh_aktual - a.borxh_aktual).slice(0,5).map(c => ({ emri: c.emri, borxh: c.borxh_aktual, telefoni: c.telefoni })),
            klientë_pasivë_30d: clients.filter(c => c.ditë_pa_blerë !== null && c.ditë_pa_blerë >= 30).map(c => ({ emri: c.emri, ditë: c.ditë_pa_blerë })),
            top_5_produkte_për_fitim: products.slice().sort((a,b) => b.fitim_total - a.fitim_total).slice(0,5).map(p => ({ emri: p.emri, fitim: p.fitim_total })),
            produkte_me_stok_kritik: products.filter(p => p.stok_aktual < 5).map(p => ({ emri: p.emri, stok: p.stok_aktual, ditë_mbeten: p.ditë_stoku_mbeten })),
            fatura_të_vonuara: openInvoices.filter(i => i.vonesë).slice(0, 10).map(i => ({ klient: i.klient, mbetur: i.mbetur, ditë_vonesë: i.ditë_vonesë })),
            produkte_që_duhen_porositur: products.filter(p => p.ditë_stoku_mbeten !== null && p.ditë_stoku_mbeten <= 7).map(p => ({ emri: p.emri, stok: p.stok_aktual, velocity: p.velocity_ditore }))
        };

        // ── Cilësimet (settings) ─────────────────────────────────────────
        const settings = {
            partner_emri: partnerName,
            ndarja_fitimit: profitSplit,
            currency: state.currency || 'ден',
            biznes_emri: state.businessName || 'Hurma',
            partner_telefoni: state.partnerPhone || null
        };

        // Krijo objektin e plotë të kontekstit
        const fullContext = {
            data_aktuale: today,
            koha_aktuale: now.toISOString(),
            statistika: stats,
            klientë: clients, // TË GJITHË klientët
            produkte: products, // TË GJITHA produktet
            faton: {
                borxhi_aktual: fatonDebt,
                pagesa_e_fundit: lastFatonPay,
                ditë_pa_paguar: daysSinceFatonPay,
                pagesa_TË_GJITHA: allFatonPayments, // ALL — historiku i plotë i pagesave
                blerje_TË_GJITHA: allFatonPurchases, // ALL — historiku i plotë i blerjeve
                agregim_sipas_vitit: fatonByYear // total paguar/blerë për çdo vit
            },
            shitjet: salesData, // adaptive: ALL nëse <800, ndryshe split + agregim
            agregimi_shitjeve_vjetor: salesByYear, // çdo vit: count/qarkullim/fitim/sasi
            agregimi_shitjeve_mujor_36muaj: recent24Months, // 36 muajt e fundit
            fatura_TË_GJITHA_hapura: openInvoices, // ALL
            pagesa_klientësh_TË_GJITHA: allClientPayments, // ALL
            porositë_TË_GJITHA: allOrders,
            kthimet_TË_GJITHA: allReturns,
            shpenzime: {
                total_muaji_aktual: totalMonthExpenses,
                lista_TË_GJITHA: allExpenses,
                agregim_mujor: expensesByMonth,
                agregim_sipas_kategorisë: expensesByCategory
            },
            shënime: notes, // 30 të fundit (zakonisht s'janë critical historic)
            qëllime: targets,
            kontakte: contacts,
            log_aktivitetesh_50_të_fundit: activityLog,
            lokacionet: locations,
            quick_sale_presets: presets,
            insights_të_gatshme: insights,
            cilësimet: settings
        };

        const contextJson = JSON.stringify(fullContext, null, 2);
        const tokenEstimate = Math.round(contextJson.length / 4); // ~4 chars/token

        return `Ti je **Hurma AI**, asistenti personal i Elezit, pronar i një dyqani shumicë në Maqedoni që shet **hurma (datë)** dhe ëmbëlsira.

## 🏪 Konteksti i biznesit
- **Pronari**: Elezi (gjuha shqipe, valuta = денарë / ден)
- **Furnizuesi kryesor**: **Fatoni** — Elezi blen prej tij me kushte 60-ditëshe ose cash
- **Klientët**: dyqane më të vegjël që blejnë nga Elezi (p.sh. Sulejmani, Maxi Market)
- **Produktet**: Medjool, Sukeri, Mexhdul (lloje hurmash) në kuti të ndryshme
- **Modeli i fitimit**: Elezi blen nga Fatoni → shet me shumicë te klientët; fitimi ndahet me partnerin sipas %

## 🎯 Stili i përgjigjeve
- **Përgjigju në SHQIP gjithmonë** (përveç nëse përdoruesi ndërron gjuhën)
- **Konciz dhe praktik** — Elezi është i zënë, jo akademik
- Përdor **markdown** (lista, **bold**, tabela kur ndihmojnë)
- **Emoji me kursim** (1-2 për pikëzim, jo nëpër çdo fjali)
- Numrat: **formato me pikë mijëshjesh** dhe njësinë **ден** (p.sh. 1.620 ден, jo 1620)
- Sugjerime **konkrete me veprim**: "Kontakto Sulejmanin sot — borxh 2.400 ден, s'ka blerë 12 ditë"
- Mos shpik të dhëna që s'i ke. Nëse mungon info, thuaj qartë: "Nuk ka të dhëna për këtë"

## 🧠 KE QASJE TË PLOTË NË HISTORIKUN E DYQANIT (jo vetëm të dhënat e fundit!)

**E rëndësishme**: Ti **ke** të dhëna historike të plota. Mos thuaj kurrë "Nuk ka të dhëna historike" — kontrollo gjithmonë në JSON-in poshtë.

Ke akses **HISTORIK** te:
- ✅ **TË GJITHË klientët** (\`klientë\`) me TOTAL lifetime: qarkullim, fitim, paguar, shitje count, blerja e parë & e fundit
- ✅ **TË GJITHA produktet** (\`produkte\`) me totale historike + velocity
- ✅ **Llogaria Fatoni — historiku i PLOTË**: \`pagesa_TË_GJITHA\` + \`blerje_TË_GJITHA\` + \`agregim_sipas_vitit\` për çdo vit
- ✅ **Shitjet** (\`shitjet\`):
  • Nëse total ≤ 800 → TË GJITHA shitjet me detaje
  • Nëse > 800 → 100 të parat + 500 të fundit + agregim i plotë
- ✅ **Agregimi vjetor i shitjeve** (\`agregimi_shitjeve_vjetor\`): për çdo vit që ka shitje, sheh count/qarkullim/fitim/sasi
- ✅ **Agregimi mujor 36 muajt e fundit** (\`agregimi_shitjeve_mujor_36muaj\`): YYYY-MM → metrika
- ✅ **TË GJITHA faturat e hapura** (\`fatura_TË_GJITHA_hapura\`) me ditë vonese
- ✅ **TË GJITHA pagesat e klientëve** (\`pagesa_klientësh_TË_GJITHA\`)
- ✅ **TË GJITHA porositë** (\`porositë_TË_GJITHA\`)
- ✅ **TË GJITHA kthimet** (\`kthimet_TË_GJITHA\`)
- ✅ **Shpenzimet komplet**: \`lista_TË_GJITHA\` + \`agregim_mujor\` + \`agregim_sipas_kategorisë\`
- ✅ **Insights të para-llogaritura** (\`insights_të_gatshme\`)

## 📊 Të dhënat aktuale + historike të dyqanit (~${tokenEstimate} tokens)
*Snapshot freskët në çdo mesazh që dërgon — informacioni i ri që fut në app shfaqet menjëherë këtu.*

\`\`\`json
${contextJson}
\`\`\`

## 💡 Shembuj se si ta përdorësh kontekstin (PYETJE HISTORIKE!)
- "Sa shita vitin e kaluar?" → \`agregimi_shitjeve_vjetor['2025']\`
- "Krahaso muajin këtë me të kaluarin" → \`agregimi_shitjeve_mujor_36muaj['2026-04']\` vs \`['2026-03']\`
- "Sa kam paguar Fatonin gjithsej?" → Mblidh \`faton.pagesa_TË_GJITHA\` ose përdor \`faton.agregim_sipas_vitit\`
- "Kur kam blerë për herë të parë te Fatoni?" → \`faton.blerje_TË_GJITHA\` (data më e vjetër)
- "Sa shpenzime kam pasur muajin X?" → \`shpenzime.agregim_mujor['2026-03']\`
- "Cilat janë kategoritë kryesore të shpenzimeve?" → \`shpenzime.agregim_sipas_kategorisë\`
- "Sa borxh ka X?" → Kërko \`klientë\` për emrin → \`borxh_aktual\`
- "Top klientët e mi?" → \`insights_të_gatshme.top_5_klientë_për_qarkullim\` ose \`klientë\` rendit sipas \`qarkullim_total\`
- "Cili produkt ka shitur më shumë gjithçka?" → \`produkte\` rendit sipas \`shitur_total\`
- "Cilat fatura janë vonë?" → \`fatura_TË_GJITHA_hapura\` filtro me \`vonesë: true\`
- "Trend i shitjeve 12 muajt e fundit?" → \`agregimi_shitjeve_mujor_36muaj\` (ki 36 muaj!)

⚠️ **MOS thuaj "nuk ka të dhëna historike"** — gjithmonë ke akses te:
- Agregime vjetore (që nga viti i parë i shitjeve)
- Agregime mujore (36 muajt e fundit)
- Lista e plotë e të dhënave kritike (klientë, produkte, fatura, pagesa Fatoni)

Përdor **VETËM** të dhënat lart për përgjigje konkrete. Për pyetje të përgjithshme (strategji biznesi, marketing) mund të kombinosh njohuritë e tua me të dhënat.

## ⚡ Veprime të kushtueshme (action buttons)
Kur ka kuptim, mund të shtosh **butona veprimi** në përgjigjen tënde që Elezi t'i klikojë drejtpërdrejt. Sintaksa:

\`[btn:Etiketa|action|arg]\`

**Veprimet e disponueshme:**
- \`[btn:Hap Sulejmanin|openClient360|<clientId>]\` — hap pamjen 360° të klientit
- \`[btn:Shih Medjool 1kg|openProduct360|<productId>]\` — pamje produkti
- \`[btn:Shko te Klientët|navigateTo|clients]\` — navigon te faqja
- \`[btn:Shitje e re|openSaleModal]\` — hap modalin e shitjes
- \`[btn:Paguaj Fatonin|openFatonPaymentModal]\` — modal pagese Fatoni
- \`[btn:WhatsApp Sulejmani|sendWhatsApp|<phone>|<msg>]\` — dërgon mesazh WhatsApp

**Shembull**: "Sulejmani ka **2.400 ден borxh**. [btn:Hap Sulejmanin|openClient360|cli_xyz123] [btn:Dërgo kujtesë WhatsApp|sendWhatsApp|389XX|Përshëndetje Sulejmani, ke borxh 2400 ден]"

⚠️ Përdor butona vetëm kur janë **konkretë dhe të dobishëm** — jo për çdo gjë. ID-të merri nga JSON-i i klientëve/produkteve.`;
    }

    function calcClientDebt(clientId) {
        if (typeof window.calcClientDebt === 'function') {
            try { return window.calcClientDebt(clientId) || 0; } catch (e) {}
        }
        const state = getLiveState();
        const sales = (state.sales || []).filter(s => s && s.clientId === clientId && s.paymentType === 'invoice_60' && !s.invoicePaid);
        return Math.max(0, sales.reduce((sum, s) => sum + ((s.sellTotal || 0) - (s.amountPaid || 0)), 0));
    }

    // ═══════════════════════════════════════════════════════════════════
    // API Key management
    // ═══════════════════════════════════════════════════════════════════
    function getApiKey() {
        try { return localStorage.getItem(STORAGE_KEY_API) || ''; } catch (e) { return ''; }
    }
    function setApiKey(key) {
        try { localStorage.setItem(STORAGE_KEY_API, key); return true; } catch (e) { return false; }
    }
    function clearApiKey() {
        try { localStorage.removeItem(STORAGE_KEY_API); } catch (e) {}
    }
    function getModel() {
        try { return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL; } catch (e) { return DEFAULT_MODEL; }
    }
    function setModel(m) {
        try { localStorage.setItem(STORAGE_KEY_MODEL, m); } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════════
    // Conversation persistence
    // ═══════════════════════════════════════════════════════════════════
    function loadConversation() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CONV);
            if (raw) conversation = JSON.parse(raw) || [];
        } catch (e) { conversation = []; }
    }
    function saveConversation() {
        try {
            // Kufizo në 50 mesazhet e fundit për mos rritur shumë
            const trimmed = conversation.slice(-50);
            localStorage.setItem(STORAGE_KEY_CONV, JSON.stringify(trimmed));
        } catch (e) {}
    }
    function clearConversation() {
        conversation = [];
        try { localStorage.removeItem(STORAGE_KEY_CONV); } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════════
    // Markdown render (i thjeshtë por i sigurt)
    // ═══════════════════════════════════════════════════════════════════
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function renderMarkdown(text) {
        let html = escapeHtml(text);
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        // Headings
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        // Lists (simple)
        html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)(?:\n(?!<li>)|$)/g, '<ul>$1</ul>\n');
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        // Action buttons [btn:Label|action|arg]
        html = renderActionButtons(html);
        // Paragraphs (split by double newline)
        const paragraphs = html.split(/\n\n+/).map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (/^<(h\d|ul|ol|pre|li)/.test(trimmed)) return trimmed;
            return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
        }).filter(Boolean);
        return paragraphs.join('');
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI rendering
    // ═══════════════════════════════════════════════════════════════════
    function renderMessages() {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        const messages = container.querySelectorAll('.ai-msg:not(.ai-welcome)');
        messages.forEach(m => m.remove());

        // Re-inject from conversation
        conversation.forEach((msg, idx) => {
            appendMessageToDOM(msg.role, msg.content, idx === conversation.length - 1);
        });
    }

    function appendMessageToDOM(role, content, scrollToView) {
        const container = document.getElementById('ai-messages');
        if (!container) return null;
        const msgEl = document.createElement('div');
        msgEl.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-bot');
        const avatar = role === 'user'
            ? '<i class="fas fa-user"></i>'
            : '<i class="fas fa-wand-magic-sparkles"></i>';
        msgEl.innerHTML = `
            <div class="ai-msg-avatar">${avatar}</div>
            <div class="ai-msg-bubble">${role === 'user' ? escapeHtml(content) : renderMarkdown(content)}</div>
            <button class="ai-msg-copy" title="Kopjo"><i class="fas fa-copy"></i></button>
        `;
        const copyBtn = msgEl.querySelector('.ai-msg-copy');
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(content).then(() => {
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
                    });
                }
            };
        }
        container.appendChild(msgEl);
        if (scrollToView) container.scrollTop = container.scrollHeight;
        return msgEl;
    }

    function showStatus(text, isError) {
        const el = document.getElementById('ai-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'ai-status' + (isError ? ' ai-status-error' : '');
    }

    // Info badge: tregon sa të dhëna ka akses AI (rifreskon në çdo render)
    function updateContextInfo() {
        const el = document.getElementById('ai-context-info');
        if (!el) return;
        const state = getLiveState();
        const PRODUCTS = getLiveProducts();
        const counts = {
            klientë: (state.clients || []).length,
            produkte: PRODUCTS.length,
            shitje: (state.sales || []).length,
            fatura: (state.sales || []).filter(s => s && s.paymentType === 'invoice_60' && !s.invoicePaid).length,
            shpenzime: (state.expenses || []).length,
            shënime: (state.notes || []).length
        };
        el.innerHTML = `
            <i class="fas fa-database"></i>
            <span><strong>${counts.klientë}</strong> klientë</span>
            <span class="ai-ci-sep">·</span>
            <span><strong>${counts.produkte}</strong> produkte</span>
            <span class="ai-ci-sep">·</span>
            <span><strong>${counts.shitje}</strong> shitje</span>
            <span class="ai-ci-sep">·</span>
            <span><strong>${counts.fatura}</strong> fatura të hapura</span>
            <span class="ai-ci-live">🟢 LIVE</span>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Send message me streaming
    // ═══════════════════════════════════════════════════════════════════
    async function sendMessage(userText) {
        if (isStreaming) return;
        const apiKey = getApiKey();
        if (!apiKey) { showSetup(); return; }
        const text = (userText || '').trim();
        if (!text) return;

        // Shto user message
        conversation.push({ role: 'user', content: text });
        appendMessageToDOM('user', text, true);
        saveConversation();

        // Hide quick prompts after first message
        const qp = document.getElementById('ai-quick-prompts');
        if (qp && conversation.length >= 2) qp.classList.add('ai-qp-hidden');

        isStreaming = true;
        showStatus('Hurma AI po mendon…');
        const sendBtn = document.getElementById('ai-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        // Krijo placeholder për përgjigjen
        const botMsgEl = appendMessageToDOM('assistant', '', true);
        const bubble = botMsgEl ? botMsgEl.querySelector('.ai-msg-bubble') : null;
        if (bubble) bubble.innerHTML = '<span class="ai-typing"><span></span><span></span><span></span></span>';

        let assistantText = '';
        abortController = new AbortController();

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: getModel(),
                    max_tokens: 4096,
                    system: buildSystemPrompt(),
                    messages: conversation.map(m => ({ role: m.role, content: m.content })),
                    stream: true
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `Gabim ${response.status}`;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) errMsg += ': ' + errJson.error.message;
                } catch(e) { errMsg += ': ' + errText.substring(0, 200); }
                throw new Error(errMsg);
            }

            // Parse SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (bubble) bubble.innerHTML = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.substring(6).trim();
                    if (data === '[DONE]' || !data) continue;
                    try {
                        const event = JSON.parse(data);
                        if (event.type === 'content_block_delta' && event.delta && event.delta.text) {
                            assistantText += event.delta.text;
                            if (bubble) bubble.innerHTML = renderMarkdown(assistantText);
                            // auto-scroll
                            const container = document.getElementById('ai-messages');
                            if (container) container.scrollTop = container.scrollHeight;
                        } else if (event.type === 'message_stop') {
                            // u përfundua
                        }
                    } catch (e) { /* skip parse errors */ }
                }
            }

            if (assistantText) {
                conversation.push({ role: 'assistant', content: assistantText });
                saveConversation();
                // Lidh action buttons (nëse AI ka inkluduar [btn:...])
                if (bubble) _attachActionHandlers(bubble);
                // Lexo me zë (nëse TTS i ndezur)
                if (getTtsEnabled()) {
                    speakText(stripMarkdown(assistantText));
                }
            }
            showStatus('');
        } catch (err) {
            if (err.name === 'AbortError') {
                if (bubble) bubble.innerHTML = '<em>Përgjigja u ndalua.</em>';
                showStatus('Përgjigja u ndalua', true);
            } else {
                if (bubble) bubble.innerHTML = '<strong>Gabim:</strong> ' + escapeHtml(err.message || String(err));
                showStatus('Gabim: ' + (err.message || 'I panjohur'), true);
                // Heq mesazhin e fundit nga konversata sepse dështoi
                if (conversation.length && conversation[conversation.length - 1].role === 'user') {
                    // mbaje user-in, por mos shto assistant të zbrazët
                }
            }
        } finally {
            isStreaming = false;
            if (sendBtn) sendBtn.disabled = false;
            abortController = null;
            const input = document.getElementById('ai-input');
            if (input) input.focus();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Setup screen
    // ═══════════════════════════════════════════════════════════════════
    function showSetup() {
        const setup = document.getElementById('ai-setup');
        const messages = document.getElementById('ai-messages');
        const inputWrap = document.getElementById('ai-input-wrap');
        const qp = document.getElementById('ai-quick-prompts');
        if (setup) setup.classList.remove('hidden');
        if (messages) messages.style.display = 'none';
        if (inputWrap) inputWrap.style.display = 'none';
        if (qp) qp.style.display = 'none';
    }
    function hideSetup() {
        const setup = document.getElementById('ai-setup');
        const messages = document.getElementById('ai-messages');
        const inputWrap = document.getElementById('ai-input-wrap');
        const qp = document.getElementById('ai-quick-prompts');
        if (setup) setup.classList.add('hidden');
        if (messages) messages.style.display = '';
        if (inputWrap) inputWrap.style.display = '';
        if (qp && conversation.length < 2) qp.style.display = '';
    }

    // ═══════════════════════════════════════════════════════════════════
    // Settings menu (model picker, clear key)
    // ═══════════════════════════════════════════════════════════════════
    function showSettingsMenu() {
        const existing = document.getElementById('ai-settings-menu');
        if (existing) { existing.remove(); return; }

        const menu = document.createElement('div');
        menu.id = 'ai-settings-menu';
        menu.className = 'ai-settings-menu';
        const currentModel = getModel();
        menu.innerHTML = `
            <div class="ai-sm-section">
                <div class="ai-sm-label">Modeli AI</div>
                ${MODELS.map(m => `
                    <label class="ai-sm-radio">
                        <input type="radio" name="ai-model" value="${m.id}" ${m.id === currentModel ? 'checked' : ''}>
                        <span>${m.label}</span>
                    </label>
                `).join('')}
            </div>
            <div class="ai-sm-section">
                <label class="ai-sm-toggle">
                    <input type="checkbox" id="ai-sm-tts" ${getTtsEnabled() ? 'checked' : ''}>
                    <span><i class="fas fa-volume-high"></i> Lexo me zë (Text-to-Speech)</span>
                </label>
            </div>
            <div class="ai-sm-section">
                <button class="ai-sm-btn" id="ai-sm-whisper">
                    <i class="fas fa-microphone"></i> ${getOpenAIKey() ? 'Voice (Whisper) ✓ aktiv' : 'Konfiguro Voice (Whisper)'}
                </button>
            </div>
            <div class="ai-sm-section">
                <button class="ai-sm-btn ai-sm-btn-danger" id="ai-sm-clear-key">
                    <i class="fas fa-key"></i> Hiq çelësin API
                </button>
                <button class="ai-sm-btn" id="ai-sm-export-conv">
                    <i class="fas fa-download"></i> Eksporto bisedën
                </button>
            </div>
        `;
        document.body.appendChild(menu);

        const btnRect = document.getElementById('ai-settings-btn').getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (btnRect.bottom + 8) + 'px';
        menu.style.right = Math.max(8, window.innerWidth - btnRect.right) + 'px';
        menu.style.zIndex = '10000';

        menu.querySelectorAll('input[name="ai-model"]').forEach(radio => {
            radio.onchange = () => {
                setModel(radio.value);
                updateModelTag();
                if (typeof showToast === 'function') showToast('Modeli u ndryshua', 'success');
            };
        });
        const ttsCheck = menu.querySelector('#ai-sm-tts');
        if (ttsCheck) ttsCheck.onchange = () => {
            setTtsEnabled(ttsCheck.checked);
            if (typeof showToast === 'function') {
                showToast(ttsCheck.checked ? '🔊 TTS u ndez' : '🔇 TTS u shua', 'success');
            }
        };
        const whisperBtn = menu.querySelector('#ai-sm-whisper');
        if (whisperBtn) whisperBtn.onclick = () => {
            menu.remove();
            _showWhisperSetupModal('Konfiguro Whisper për voice që punon në çdo browser:');
        };
        const clearBtn = menu.querySelector('#ai-sm-clear-key');
        if (clearBtn) clearBtn.onclick = () => {
            if (confirm('A je i sigurt që do ta hiqesh çelësin API?')) {
                clearApiKey();
                showSetup();
                menu.remove();
            }
        };
        const exportBtn = menu.querySelector('#ai-sm-export-conv');
        if (exportBtn) exportBtn.onclick = () => {
            const text = conversation.map(m => `${m.role === 'user' ? '👤 Ti' : '🤖 Hurma AI'}:\n${m.content}\n`).join('\n---\n\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hurma-ai-bisede-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            menu.remove();
        };

        setTimeout(() => {
            const close = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', close);
                }
            };
            document.addEventListener('click', close);
        }, 50);
    }

    function updateModelTag() {
        const tag = document.getElementById('ai-model-tag');
        if (!tag) return;
        const modelId = getModel();
        const found = MODELS.find(m => m.id === modelId);
        tag.textContent = found ? found.label.split('(')[0].trim() : 'Claude';
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎤 VOICE INPUT — Web Speech API (Chrome/Safari/Edge)
    // ═══════════════════════════════════════════════════════════════════
    let _recognition = null;
    let _isRecording = false;

    function _supportsVoice() {
        return typeof (window.SpeechRecognition || window.webkitSpeechRecognition) === 'function';
    }

    function _detectOS() {
        const ua = navigator.userAgent || '';
        const platform = (navigator.platform || '').toLowerCase();
        if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
        if (/android/i.test(ua)) return 'android';
        if (platform.startsWith('mac') || /macintosh/i.test(ua)) return 'mac';
        if (platform.startsWith('win') || /windows/i.test(ua)) return 'windows';
        if (platform.startsWith('linux') || /linux/i.test(ua)) return 'linux';
        return 'other';
    }
    function _isSafari() {
        return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    }

    // Provo gjuhë në mënyrë sekuenciale derisa të gjenden lokale të punueshme
    const VOICE_LANGS = ['sq-AL', 'sq', 'mk-MK', 'en-US'];
    let _voiceLangIdx = 0;

    async function _ensureMicPermission() {
        // Kërko permission shprehimisht (prep për start të suksesshëm)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { ok: true, reason: 'no-api-check' }; // Sk e kontrollojmë dot, hajde provojmë
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Mbyll stream-in menjëherë — nuk na duhet, vetëm donim permission
            stream.getTracks().forEach(t => t.stop());
            return { ok: true };
        } catch(e) {
            return { ok: false, error: e.name || 'unknown', message: e.message };
        }
    }

    async function startVoiceInput() {
        // Diagnostika fillestare
        console.log('[voice] start clicked, support:', _supportsVoice(), 'protocol:', location.protocol);

        if (!_supportsVoice()) {
            const ua = navigator.userAgent || '';
            const isFirefox = ua.includes('Firefox');
            const msg = isFirefox
                ? '❌ Firefox nuk e mbështet input me zë. Provo Chrome, Safari, ose Edge.'
                : '❌ Browser-i juaj nuk mbështet input me zë.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
        }

        // HTTPS check
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            const msg = '🔒 Input me zë kërkon HTTPS. Hap app-in nga https:// (jo http://).';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
        }

        if (_isRecording) { stopVoiceInput(); return; }

        // Kërko permission për mikrofonin para se ta startosh
        showStatus('🎤 Duke kërkuar leje për mikrofonin...');
        const perm = await _ensureMicPermission();
        if (!perm.ok) {
            const errMap = {
                'NotAllowedError': '🚫 Lejoje aksesin në mikrofon te ikona e shiritit të adresës.',
                'NotFoundError': '🎤 Nuk u gjet mikrofon në pajisjen tënde.',
                'NotReadableError': '⚠️ Mikrofoni është në përdorim nga një app tjetër.',
                'OverconstrainedError': '⚠️ Mikrofoni nuk mbështet konfigurimin e kërkuar.',
                'SecurityError': '🔒 Aksesi u bllokua nga policy e sigurisë.'
            };
            const msg = errMap[perm.error] || ('🎤 Gabim mikrofoni: ' + (perm.message || perm.error));
            console.warn('[voice] permission denied:', perm);
            if (typeof showToast === 'function') showToast(msg, 'error');
            showStatus(msg, true);
            return;
        }

        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        try {
            _recognition = new Recognition();
        } catch(e) {
            console.warn('[voice] new Recognition() failed:', e);
            showStatus('Nuk u krijua dot recognition: ' + e.message, true);
            return;
        }

        // Filloj me gjuhën aktuale (ose Shqip në fillim)
        _recognition.lang = VOICE_LANGS[_voiceLangIdx] || 'sq-AL';
        _recognition.continuous = false;
        _recognition.interimResults = true;
        _recognition.maxAlternatives = 1;

        const input = document.getElementById('ai-input');
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.add('ai-mic-recording');
        _isRecording = true;
        showStatus('🎤 Po dëgjoj... fol qartë (' + _recognition.lang + ')');

        let finalTranscript = '';
        _recognition.onstart = () => {
            console.log('[voice] started, lang:', _recognition.lang);
        };
        _recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalTranscript += transcript;
                else interim += transcript;
            }
            if (input) input.value = finalTranscript + interim;
            console.log('[voice] transcript:', finalTranscript || interim);
        };
        _recognition.onerror = (event) => {
            console.warn('[voice] error:', event.error, event);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const errMap = {
                'no-speech': 'Nuk dëgjova asgjë. Klikoji 🎤 dhe fol më afër mikrofonit.',
                'not-allowed': '🚫 Aksesi në mikrofon u bllokua. Lejoje te ikona e shiritit të adresës.',
                'aborted': '', // silent — user-initiated
                'audio-capture': '🎤 Nuk lexohet dot mikrofoni. Kontrollo që është i lidhur.',
                'network': '🌐 Gabim rrjeti. Web Speech API kërkon internet.',
                'language-not-supported': null // trajtohet poshtë
            };
            // service-not-allowed: trajtim special për Safari (kërkon Dictation të ndezur në macOS)
            if (event.error === 'service-not-allowed') {
                if (isSafari) {
                    _showSafariVoiceHelp();
                } else {
                    if (typeof showToast === 'function') showToast('🚫 Shërbimi i njohjes së zërit u bllokua. Provo Chrome.', 'error');
                }
                stopVoiceInput();
                return;
            }
            if (event.error === 'language-not-supported') {
                // Provo gjuhën tjetër në listë
                _voiceLangIdx++;
                if (_voiceLangIdx < VOICE_LANGS.length) {
                    console.log('[voice] retry with:', VOICE_LANGS[_voiceLangIdx]);
                    stopVoiceInput();
                    setTimeout(() => startVoiceInput(), 200);
                    return;
                } else {
                    if (typeof showToast === 'function') showToast('🌍 Asnjë nga gjuhët nuk mbështetet në këtë browser.', 'error');
                    _voiceLangIdx = 0;
                }
            } else if (errMap[event.error] !== undefined) {
                const msg = errMap[event.error];
                if (msg) {
                    if (typeof showToast === 'function') showToast(msg, 'error');
                    showStatus(msg, true);
                }
            } else if (event.error) {
                const msg = '🎤 Gabim: ' + event.error;
                if (typeof showToast === 'function') showToast(msg, 'error');
                showStatus(msg, true);
            }
            stopVoiceInput();
        };
        _recognition.onend = () => {
            console.log('[voice] ended, transcript:', finalTranscript);
            const wasRecording = _isRecording;
            stopVoiceInput();
            if (wasRecording && finalTranscript.trim() && input) {
                input.value = finalTranscript.trim();
                setTimeout(() => {
                    const text = input.value.trim();
                    if (text) {
                        input.value = '';
                        sendMessage(text);
                    }
                }, 500);
            }
        };

        try {
            _recognition.start();
            console.log('[voice] start() called successfully');
        } catch(e) {
            console.warn('[voice] start() threw:', e);
            // InvalidStateError zakonisht do thotë që një tjetër recognition është aktive
            if (e.name === 'InvalidStateError') {
                showStatus('⚠️ Recognition aktiv tashmë — provo prapë pas 1 sekonde.', true);
            } else {
                showStatus('Gabim start: ' + (e.message || e.name), true);
            }
            stopVoiceInput();
        }
    }

    function stopVoiceInput() {
        _isRecording = false;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.remove('ai-mic-recording');
        if (_recognition) {
            try { _recognition.stop(); } catch(e) {}
            _recognition = null;
        }
        showStatus('');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎤 PRESS-AND-HOLD MIC — MediaRecorder + Whisper (punon në çdo browser)
    // ═══════════════════════════════════════════════════════════════════
    // - pointerdown → MediaRecorder.start() (RELIABLE, jo si Web Speech)
    // - bubble e kuqe me kohëmatës dhe waveform animim
    // - pointerup → MediaRecorder.stop() → POST te Whisper → Claude
    // - Fallback: nëse s'ka OpenAI key, përdor Web Speech (jo e besueshme)
    // ═══════════════════════════════════════════════════════════════════
    let _holdRecording = false;
    let _holdMediaRecorder = null;
    let _holdAudioChunks = [];
    let _holdAudioStream = null;
    let _holdRecognition = null; // fallback Web Speech
    let _holdTranscriptFinal = ''; // për Web Speech fallback
    let _holdBubble = null;
    let _holdLangIdx = 0;
    let _holdHelpShown = false;
    let _holdStartTime = 0;
    let _holdTimerInterval = null;
    let _holdMode = 'whisper'; // 'whisper' ose 'webspeech'

    function getOpenAIKey() {
        try { return localStorage.getItem(STORAGE_KEY_OPENAI) || ''; } catch(e) { return ''; }
    }
    function setOpenAIKey(k) {
        try { localStorage.setItem(STORAGE_KEY_OPENAI, k); } catch(e) {}
    }

    function _showLiveBubble() {
        if (_holdBubble) return;
        _holdBubble = document.createElement('div');
        _holdBubble.id = 'mic-hold-bubble';
        _holdBubble.className = 'mic-hold-bubble';
        _holdBubble.innerHTML = `
            <div class="mhb-waveform">
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="mhb-text" id="mhb-text">Po regjistroj... fol tani</div>
            <div class="mhb-time" id="mhb-time">0:00</div>
            <div class="mhb-hint">🎤 Lësho për të dërguar · Esc për të anuluar</div>
        `;
        const wrap = document.getElementById('ai-input-wrap');
        if (wrap) wrap.appendChild(_holdBubble);
        else document.body.appendChild(_holdBubble);

        // Timer
        _holdStartTime = Date.now();
        if (_holdTimerInterval) clearInterval(_holdTimerInterval);
        _holdTimerInterval = setInterval(() => {
            const sec = Math.floor((Date.now() - _holdStartTime) / 1000);
            const m = Math.floor(sec / 60), s = sec % 60;
            const tEl = document.getElementById('mhb-time');
            if (tEl) tEl.textContent = m + ':' + (s < 10 ? '0' + s : s);
        }, 200);
    }
    function _updateLiveBubble(text) {
        if (!_holdBubble) return;
        const el = _holdBubble.querySelector('#mhb-text');
        if (el) {
            el.textContent = text || 'Po dëgjoj...';
            if (text && text.trim().length > 0) el.classList.add('mhb-has-text');
            else el.classList.remove('mhb-has-text');
        }
    }
    function _hideLiveBubble() {
        if (_holdTimerInterval) { clearInterval(_holdTimerInterval); _holdTimerInterval = null; }
        if (_holdBubble) {
            _holdBubble.classList.add('mhb-out');
            const ref = _holdBubble;
            _holdBubble = null;
            setTimeout(() => { try { ref.remove(); } catch(e) {} }, 200);
        }
    }
    function _setBubbleStatus(text) {
        if (!_holdBubble) return;
        const tEl = _holdBubble.querySelector('#mhb-text');
        if (tEl) tEl.textContent = text;
    }

    async function _startHoldRecording() {
        if (_holdRecording) return;

        // Vendos modin: Whisper nëse ka OpenAI key (më i besueshëm), përndryshe Web Speech
        const openaiKey = getOpenAIKey();
        _holdMode = openaiKey ? 'whisper' : 'webspeech';
        console.log('[voice] mode:', _holdMode);

        if (_holdMode === 'whisper') {
            await _startWhisperRecording();
        } else {
            // Web Speech fallback (mund të dështojë në Safari)
            _startWebSpeechRecording();
        }
    }

    // ── 🎙️ Whisper recording (RELIABLE — punon në Safari, Chrome, Firefox) ──
    async function _startWhisperRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof showToast === 'function') showToast('🎤 Browser-i nuk e mbështet regjistrimin e zërit.', 'error');
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            if (typeof showToast === 'function') showToast('🎤 MediaRecorder nuk mbështetet.', 'error');
            return;
        }

        try {
            _holdAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            console.warn('[whisper] getUserMedia failed:', e);
            const errMap = {
                'NotAllowedError': '🚫 Lejoje aksesin në mikrofon te ikona e shiritit të adresës.',
                'NotFoundError': '🎤 Nuk u gjet mikrofon.',
                'NotReadableError': '⚠️ Mikrofoni është në përdorim nga një app tjetër.'
            };
            const msg = errMap[e.name] || ('🎤 ' + (e.message || e.name));
            if (typeof showToast === 'function') showToast(msg, 'error');
            return;
        }

        // Zgjedh mime type të mbështetur
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4'; // Safari preferon mp4
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; // default
            }
        }
        console.log('[whisper] mimeType:', mimeType || 'default');

        try {
            _holdMediaRecorder = mimeType
                ? new MediaRecorder(_holdAudioStream, { mimeType })
                : new MediaRecorder(_holdAudioStream);
        } catch (e) {
            console.warn('[whisper] MediaRecorder failed:', e);
            _holdAudioStream.getTracks().forEach(t => t.stop());
            _holdAudioStream = null;
            if (typeof showToast === 'function') showToast('🎤 Gabim regjistrimi: ' + e.message, 'error');
            return;
        }

        _holdAudioChunks = [];
        _holdMediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) _holdAudioChunks.push(e.data);
        };
        _holdMediaRecorder.onerror = (e) => {
            console.warn('[whisper] recorder error:', e);
        };

        _holdMediaRecorder.start(250); // dump çdo 250ms
        _holdRecording = true;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.add('ai-mic-recording');
        _showLiveBubble();
        if (navigator.vibrate) try { navigator.vibrate(15); } catch(e) {}
    }

    // ── 🌐 Web Speech fallback (jo i besueshëm në Safari) ──
    function _startWebSpeechRecording() {
        if (!_supportsVoice()) {
            // Nuk mbështetet — sugjero të shtosh OpenAI key
            _showWhisperSetupModal('Voice nuk funksionon në këtë browser. Për të folur me AI, instalo Whisper (5 sekonda):');
            return;
        }
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        try {
            _holdRecognition = new Recognition();
        } catch(e) { return; }
        _holdRecognition.lang = VOICE_LANGS[_holdLangIdx] || 'sq-AL';
        _holdRecognition.continuous = true;
        _holdRecognition.interimResults = true;
        _holdTranscriptFinal = '';
        _holdRecording = true;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.add('ai-mic-recording');
        _showLiveBubble();
        if (navigator.vibrate) try { navigator.vibrate(15); } catch(e) {}

        _holdRecognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) _holdTranscriptFinal += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            _updateLiveBubble(_holdTranscriptFinal + interim);
        };
        _holdRecognition.onerror = (event) => {
            console.warn('[webspeech] error:', event.error);
            if (event.error === 'language-not-supported') {
                _holdLangIdx++;
                if (_holdLangIdx < VOICE_LANGS.length) {
                    _stopHoldRecording(false);
                    setTimeout(() => _startWebSpeechRecording(), 100);
                    return;
                }
                _holdLangIdx = 0;
            }
            if ((event.error === 'not-allowed' || event.error === 'service-not-allowed') && !_holdHelpShown) {
                _holdHelpShown = true;
                _showWhisperSetupModal('Web Speech API u bllokua nga browser-i. Përdor Whisper për voice që punon kudo:');
            } else if (event.error === 'no-speech') {
                if (typeof showToast === 'function') showToast('Nuk dëgjova asgjë.', 'warning');
            }
            _stopHoldRecording(false);
        };
        try { _holdRecognition.start(); }
        catch(e) { _stopHoldRecording(false); }
    }

    async function _stopHoldRecording(send) {
        const wasRec = _holdRecording;
        _holdRecording = false;
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) micBtn.classList.remove('ai-mic-recording');

        if (_holdMode === 'whisper' && _holdMediaRecorder) {
            // Stop recorder + transkripto via Whisper
            const recorder = _holdMediaRecorder;
            _holdMediaRecorder = null;
            const stream = _holdAudioStream;
            _holdAudioStream = null;

            try {
                if (recorder.state !== 'inactive') recorder.stop();
            } catch(e) {}
            // Prit final dataavailable
            await new Promise(resolve => {
                recorder.onstop = resolve;
                setTimeout(resolve, 1500); // safety timeout
            });
            // Mbyll mic stream
            if (stream) stream.getTracks().forEach(t => t.stop());

            if (!wasRec || !send) {
                _hideLiveBubble();
                _holdAudioChunks = [];
                return;
            }

            if (_holdAudioChunks.length === 0) {
                _setBubbleStatus('Asnjë audio nuk u regjistrua');
                setTimeout(_hideLiveBubble, 1000);
                return;
            }

            const blob = new Blob(_holdAudioChunks, { type: recorder.mimeType || 'audio/webm' });
            _holdAudioChunks = [];
            console.log('[whisper] audio blob size:', blob.size, 'type:', blob.type);

            // Mos transkripto regjistrime shumë të shkurtra (< 0.3s zakonisht boshllëk)
            if (blob.size < 1000) {
                _setBubbleStatus('Regjistrimi shumë i shkurtër');
                setTimeout(_hideLiveBubble, 1000);
                return;
            }

            await _transcribeAndSend(blob);
        } else if (_holdRecognition) {
            // Web Speech path
            try { _holdRecognition.stop(); } catch(e) {}
            _holdRecognition = null;
            _hideLiveBubble();
            if (wasRec && send && _holdTranscriptFinal.trim()) {
                const text = _holdTranscriptFinal.trim();
                _holdTranscriptFinal = '';
                if (navigator.vibrate) try { navigator.vibrate([15, 30, 15]); } catch(e) {}
                sendMessage(text);
            }
        } else {
            _hideLiveBubble();
        }
    }

    async function _transcribeAndSend(blob) {
        const openaiKey = getOpenAIKey();
        if (!openaiKey) {
            _hideLiveBubble();
            _showWhisperSetupModal('Konfiguro OpenAI key për transkriptim:');
            return;
        }
        _setBubbleStatus('🎙️ Po transkriptohet...');
        // Përcakto extension
        const blobType = blob.type || 'audio/webm';
        let ext = 'webm';
        if (blobType.includes('mp4')) ext = 'mp4';
        else if (blobType.includes('mpeg')) ext = 'mp3';
        else if (blobType.includes('ogg')) ext = 'ogg';
        else if (blobType.includes('wav')) ext = 'wav';

        const formData = new FormData();
        formData.append('file', blob, 'audio.' + ext);
        formData.append('model', 'whisper-1');
        formData.append('language', 'sq'); // Shqip — Whisper e mbështet shumë mirë

        try {
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + openaiKey },
                body: formData
            });
            if (!response.ok) {
                const errText = await response.text();
                let msg = 'Whisper error ' + response.status;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) msg = errJson.error.message;
                } catch(e) {}
                throw new Error(msg);
            }
            const data = await response.json();
            const text = (data.text || '').trim();
            console.log('[whisper] transcript:', text);

            _hideLiveBubble();
            if (text) {
                if (navigator.vibrate) try { navigator.vibrate([15, 30, 15]); } catch(e) {}
                sendMessage(text);
            } else {
                if (typeof showToast === 'function') showToast('Nuk u dëgjua asnjë fjalë.', 'warning');
            }
        } catch (e) {
            console.warn('[whisper] failed:', e);
            _setBubbleStatus('❌ ' + (e.message || 'Transkriptimi dështoi'));
            setTimeout(_hideLiveBubble, 2500);
            if (typeof showToast === 'function') showToast('Transkriptimi dështoi: ' + e.message, 'error');
        }
    }

    // Modal për setup të OpenAI Whisper key
    function _showWhisperSetupModal(introText) {
        const existing = document.getElementById('whisper-setup-modal');
        if (existing) { existing.remove(); return; }
        const overlay = document.createElement('div');
        overlay.id = 'whisper-setup-modal';
        overlay.className = 'mic-helper-overlay';
        overlay.innerHTML = `
            <div class="mh-backdrop"></div>
            <div class="mh-card" style="max-width:500px;">
                <button class="mh-close" aria-label="Mbyll">×</button>
                <div class="mh-icon">🎙️</div>
                <h3>Konfiguro Voice (Whisper)</h3>
                <p class="mh-sub" style="margin-bottom:12px;">${introText || 'Whisper transkripton zërin tënd në çdo browser, edhe Safari pa Dictation.'}</p>
                <ol class="svh-steps" style="margin-bottom:14px;">
                    <li><span class="svh-step-num">1</span><div>Shko te <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style="color:#e17055;font-weight:600;">platform.openai.com/api-keys</a></div></li>
                    <li><span class="svh-step-num">2</span><div><strong>Create new secret key</strong> → kopjoje (fillon me <code style="background:var(--bg-secondary);padding:1px 5px;border-radius:4px;">sk-...</code>)</div></li>
                    <li><span class="svh-step-num">3</span><div>Ngjite poshtë + ruaj. Mbahet vetëm në pajisjen tënde.</div></li>
                </ol>
                <div class="ai-setup-input-wrap" style="margin-bottom:10px;">
                    <input type="password" id="whisper-key-input" placeholder="sk-..." autocomplete="off" spellcheck="false" style="flex:1;padding:11px 14px;border:1px solid var(--border);border-radius:10px;font-family:monospace;font-size:0.85rem;background:var(--bg);color:var(--text);">
                </div>
                <div class="svh-alt" style="margin-bottom:14px;">
                    💰 <strong>Kosto:</strong> ~$0.006 për minutë audio (~0.3 ден). Top-up minimal $5 → mjafton për ~14.000 pyetje voice. Krejt e ekonomshme.
                </div>
                <div class="svh-actions">
                    <button class="svh-btn svh-btn-primary" id="whisper-save-key">Ruaj çelësin</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.mh-close').onclick = close;
        overlay.querySelector('.mh-backdrop').onclick = close;
        overlay.querySelector('#whisper-save-key').onclick = () => {
            const inp = overlay.querySelector('#whisper-key-input');
            const key = inp ? inp.value.trim() : '';
            if (!key.startsWith('sk-')) {
                if (typeof showToast === 'function') showToast('Çelësi duhet të fillojë me sk-', 'error');
                return;
            }
            setOpenAIKey(key);
            close();
            if (typeof showToast === 'function') showToast('✅ Whisper u konfigurua! Provo mic-un tani.', 'success');
        };
        const inp = overlay.querySelector('#whisper-key-input');
        if (inp) setTimeout(() => inp.focus(), 100);
    }

    // Modal i ri për shfaqjen e udhëzimeve të OS-it (zëvendëson handleMicClick old)
    function _showOSDictationHelp() {
        const existing = document.getElementById('mic-helper-overlay');
        if (existing) { existing.remove(); return; }
        const os = _detectOS();
        let osBlock = '';
        if (os === 'mac') {
            osBlock = '<div class="mh-key-cue"><kbd class="mh-kbd-big">fn</kbd><span class="mh-plus">+</span><kbd class="mh-kbd-big">fn</kbd></div><p class="mh-hint">Shtyp <strong>fn dy herë radhazi</strong></p><p class="mh-sub">Alternativisht: aktivizo Dictation te System Settings → Keyboard → Dictation</p>';
        } else if (os === 'ios') {
            osBlock = '<div class="mh-key-cue"><i class="fas fa-microphone mh-ios-mic"></i></div><p class="mh-hint">Klikoji 🎤 te tastiera iOS</p>';
        } else if (os === 'windows') {
            osBlock = '<div class="mh-key-cue"><kbd class="mh-kbd-big">⊞ Win</kbd><span class="mh-plus">+</span><kbd class="mh-kbd-big">H</kbd></div><p class="mh-hint">Shtyp <strong>Win + H</strong></p>';
        } else {
            osBlock = '<p class="mh-hint">Përdor dictation të sistemit</p>';
        }
        const overlay = document.createElement('div');
        overlay.id = 'mic-helper-overlay';
        overlay.className = 'mic-helper-overlay';
        overlay.innerHTML = `
            <div class="mh-backdrop"></div>
            <div class="mh-card">
                <button class="mh-close" aria-label="Mbyll">×</button>
                <div class="mh-icon">🎤</div>
                <h3>Voice nuk funksionon këtu</h3>
                <p class="mh-sub" style="margin-bottom:16px;">Browser-i bllokoi njohjen e zërit. Përdor dictation të sistemit:</p>
                ${osBlock}
                <div class="mh-actions"><button class="mh-btn mh-btn-cancel" id="mh-cancel">E kuptova</button></div>
            </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.mh-close').onclick = close;
        overlay.querySelector('.mh-backdrop').onclick = close;
        overlay.querySelector('#mh-cancel').onclick = close;
    }

    function handleMicClick() {
        const input = document.getElementById('ai-input');
        if (!input) return;

        // FOKUSO input-in menjëherë (kjo bën që fn fn dhe iOS keyboard mic të funksionojnë)
        input.focus();

        // Mbylle nëse është e hapur tashmë
        const existing = document.getElementById('mic-helper-overlay');
        if (existing) { existing.remove(); return; }

        const os = _detectOS();
        const safari = _isSafari();

        // Vendos sa kohë të vëzhgohet input-i për tekst (dictation duhet kohë)
        let dictationTimer = null;
        let lastValue = input.value;

        const startWatching = () => {
            if (dictationTimer) clearInterval(dictationTimer);
            let stableCount = 0;
            dictationTimer = setInterval(() => {
                const cur = input.value || '';
                if (cur !== lastValue) {
                    lastValue = cur;
                    stableCount = 0;
                    // Update visual hint
                    const liveText = document.getElementById('mic-live-text');
                    if (liveText) {
                        liveText.textContent = cur ? '"' + cur + '"' : 'Po dëgjoj...';
                        liveText.classList.add('mic-live-active');
                    }
                } else if (cur.trim().length > 0) {
                    stableCount++;
                    // Pas 1.5s pa ndryshim, auto-dërgo
                    if (stableCount >= 3) {
                        clearInterval(dictationTimer);
                        const text = cur.trim();
                        input.value = '';
                        const overlay = document.getElementById('mic-helper-overlay');
                        if (overlay) overlay.remove();
                        sendMessage(text);
                    }
                }
            }, 500);
        };

        const stopWatching = () => {
            if (dictationTimer) { clearInterval(dictationTimer); dictationTimer = null; }
        };

        // Krijo overlay sipas OS-it
        const overlay = document.createElement('div');
        overlay.id = 'mic-helper-overlay';
        overlay.className = 'mic-helper-overlay';

        let osBlock = '';
        if (os === 'mac') {
            osBlock = `
                <div class="mh-key-cue">
                    <kbd class="mh-kbd-big">fn</kbd>
                    <span class="mh-plus">+</span>
                    <kbd class="mh-kbd-big">fn</kbd>
                </div>
                <p class="mh-hint">Shtyp <strong>fn dy herë radhazi</strong> tani</p>
                <p class="mh-sub">macOS Dictation aktivizohet menjëherë — fol në Shqip ose Anglisht</p>`;
        } else if (os === 'ios') {
            osBlock = `
                <div class="mh-key-cue">
                    <i class="fas fa-microphone mh-ios-mic"></i>
                </div>
                <p class="mh-hint">Klikoji ikonën <strong>🎤</strong> në tastierën tënde</p>
                <p class="mh-sub">Është mes hapësirës dhe emoji-ve te tastiera iOS</p>`;
        } else if (os === 'windows') {
            osBlock = `
                <div class="mh-key-cue">
                    <kbd class="mh-kbd-big">⊞ Win</kbd>
                    <span class="mh-plus">+</span>
                    <kbd class="mh-kbd-big">H</kbd>
                </div>
                <p class="mh-hint">Shtyp <strong>Win + H</strong> tani</p>
                <p class="mh-sub">Windows Speech Recognition do hapet — fol qartë</p>`;
        } else if (os === 'android') {
            osBlock = `
                <div class="mh-key-cue">
                    <i class="fas fa-microphone mh-ios-mic"></i>
                </div>
                <p class="mh-hint">Klikoji <strong>🎤</strong> në tastierën Gboard/Android</p>
                <p class="mh-sub">Zakonisht në krye të tastierës ose pranë space</p>`;
        } else {
            osBlock = `
                <p class="mh-hint">Përdor dictation të sistemit tënd</p>
                <p class="mh-sub">Linux: instalo një app dictation, ose përdor Chrome (Web Speech API)</p>`;
        }

        overlay.innerHTML = `
            <div class="mh-backdrop"></div>
            <div class="mh-card">
                <button class="mh-close" aria-label="Mbyll">×</button>
                <div class="mh-icon">🎤</div>
                <h3>Pyet me zë</h3>
                ${osBlock}
                <div class="mh-live-text" id="mic-live-text">Po pres ta dëgjoj zërin tënd...</div>
                <p class="mh-tip">💡 <strong>Sapo mbaron së foluri</strong>, AI dërgon automatikisht pyetjen pas 1.5 sekondash heshtjeje.</p>
                <div class="mh-actions">
                    <button class="mh-btn mh-btn-cancel" id="mh-cancel">Anulo</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Filloj vëzhgimin
        startWatching();

        const close = () => {
            stopWatching();
            overlay.remove();
            input.focus();
        };
        overlay.querySelector('.mh-close').onclick = close;
        overlay.querySelector('.mh-backdrop').onclick = close;
        overlay.querySelector('#mh-cancel').onclick = close;

        // Esc për ta mbyllur
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Bonus: nëse jemi në Chrome/Edge desktop dhe Web Speech mbështetet, provo paralelisht
        // (vetëm jashtë Safari/iOS sepse aty është i pabesueshëm)
        if (_supportsVoice() && !safari && os !== 'ios' && os !== 'android') {
            // Lëre user-in të zgjedhë: i japim 600ms të lexojë overlay-in, pastaj provojmë auto
            setTimeout(() => {
                if (document.getElementById('mic-helper-overlay')) {
                    try { startVoiceInputSilent(); } catch(e) {}
                }
            }, 600);
        }
    }

    // Versioni "silent" i Web Speech që fluturon mbi dictation native (best-effort)
    function startVoiceInputSilent() {
        if (!_supportsVoice() || _isRecording) return;
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        try {
            _recognition = new Recognition();
        } catch(e) { return; }
        _recognition.lang = 'en-US'; // Më e mbështetura — fjalë pak duhen
        _recognition.continuous = false;
        _recognition.interimResults = true;
        _isRecording = true;
        const input = document.getElementById('ai-input');
        let finalT = '';
        _recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (input) input.value = finalT + interim;
        };
        _recognition.onerror = () => { _isRecording = false; };
        _recognition.onend = () => { _isRecording = false; };
        try { _recognition.start(); } catch(e) { _isRecording = false; }
    }

    // Modal me udhëzime për Safari kur dictation s'është i ndezur (mbahet për fallback)
    function _showSafariVoiceHelp() {
        const existing = document.getElementById('safari-voice-help');
        if (existing) { existing.remove(); return; }
        const overlay = document.createElement('div');
        overlay.id = 'safari-voice-help';
        overlay.className = 'svh-overlay';
        overlay.innerHTML = `
            <div class="svh-backdrop"></div>
            <div class="svh-card">
                <button class="svh-close" aria-label="Mbyll">×</button>
                <div class="svh-icon">🎤</div>
                <h2>Aktivizo Dictation për Safari</h2>
                <p class="svh-intro">Safari përdor <strong>Dictation</strong> e macOS për të dëgjuar zërin. Duhet ta ndezësh një herë në cilësimet e Mac-ut:</p>
                <ol class="svh-steps">
                    <li>
                        <span class="svh-step-num">1</span>
                        <div>
                            <strong>Hap System Settings</strong> (ikona e Apple →  System Settings)
                        </div>
                    </li>
                    <li>
                        <span class="svh-step-num">2</span>
                        <div>
                            <strong>Keyboard → Dictation</strong> → <em>Aktivizoje (toggle ON)</em>
                            <div class="svh-step-note">Mund të kërkojë të shkarkojë gjuhën — pranoje</div>
                        </div>
                    </li>
                    <li>
                        <span class="svh-step-num">3</span>
                        <div>
                            <strong>Privacy & Security → Speech Recognition</strong> → siguro që Safari është i lejuar
                        </div>
                    </li>
                    <li>
                        <span class="svh-step-num">4</span>
                        <div>
                            <strong>Privacy & Security → Microphone</strong> → siguro që Safari është i lejuar
                        </div>
                    </li>
                    <li>
                        <span class="svh-step-num">5</span>
                        <div>
                            <strong>Kthehu te Safari, ringarko faqen</strong> dhe klikoji përsëri 🎤
                        </div>
                    </li>
                </ol>
                <div class="svh-alt">
                    <strong>Alternativa më e thjeshtë:</strong> Hape app-in në <strong>Chrome</strong> ose <strong>Edge</strong> — punon menjëherë pa cilësime shtesë.
                </div>
                <div class="svh-actions">
                    <button class="svh-btn svh-btn-primary" id="svh-ok">E kuptova</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.svh-close').onclick = close;
        overlay.querySelector('.svh-backdrop').onclick = close;
        overlay.querySelector('#svh-ok').onclick = close;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔊 TEXT-TO-SPEECH — lexon përgjigjet e AI me zë
    // ═══════════════════════════════════════════════════════════════════
    function getTtsEnabled() {
        try { return localStorage.getItem(STORAGE_KEY_TTS) === '1'; } catch(e) { return false; }
    }
    function setTtsEnabled(v) {
        try { localStorage.setItem(STORAGE_KEY_TTS, v ? '1' : '0'); } catch(e) {}
    }

    function speakText(text) {
        if (!getTtsEnabled() || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'sq-AL';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            // Provo të gjej një zë në Shqip ose Maqedonisht (më afër)
            const voices = window.speechSynthesis.getVoices();
            const sqVoice = voices.find(v => v.lang.startsWith('sq')) || voices.find(v => v.lang.startsWith('mk')) || voices.find(v => v.lang.startsWith('en'));
            if (sqVoice) utterance.voice = sqVoice;
            window.speechSynthesis.speak(utterance);
        } catch(e) { console.warn('TTS failed:', e); }
    }

    function stripMarkdown(text) {
        return String(text || '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/^#+\s+/gm, '')
            .replace(/^[-*]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[🎯📊💰🛒👤📦🤝🟢🟠🔴⚠️✅❌💡⭐🚀]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 📅 DAILY MORNING BRIEFING — auto në vizitën e parë të ditës
    // ═══════════════════════════════════════════════════════════════════
    function shouldShowBriefing() {
        try {
            const last = localStorage.getItem(STORAGE_KEY_BRIEFING) || '';
            const today = new Date().toISOString().split('T')[0];
            return last !== today;
        } catch(e) { return false; }
    }
    function markBriefingShown() {
        try { localStorage.setItem(STORAGE_KEY_BRIEFING, new Date().toISOString().split('T')[0]); } catch(e) {}
    }

    function triggerMorningBriefing() {
        if (!getApiKey()) return; // Mos thirr nëse s'ka çelës
        if (conversation.length > 0) return; // Mos prish një bisedë ekzistuese
        markBriefingShown();
        const prompt = 'Më jep brief-in tim të mëngjesit — i shkurtër dhe praktik (max 5-6 pika kyçe):\n\n1. Si është gjendja sot? Borxhi i Fatonit, fitimi i djeshëm, stoku\n2. Cilët 2-3 klientë DUHET t\'i kontaktoj sot dhe pse\n3. Cilët produkte po mbarojnë\n4. Çfarë duhet të bëj URGJENT sot\n5. Një këshillë e shpejtë për të rritur fitimin\n\nJi konkret, me emra dhe numra. S\'ka nevojë për intro të gjatë.';
        sendMessage(prompt);
    }

    // ═══════════════════════════════════════════════════════════════════
    // / SLASH COMMANDS — popup me sugjerime kur fillon me /
    // ═══════════════════════════════════════════════════════════════════
    function showSlashPopup(query) {
        const popup = document.getElementById('ai-slash-popup');
        if (!popup) return;
        const q = (query || '').toLowerCase().substring(1); // heq /
        const matches = SLASH_COMMANDS.filter(c =>
            c.cmd.substring(1).startsWith(q) || c.label.toLowerCase().includes(q)
        ).slice(0, 6);
        if (matches.length === 0) {
            popup.classList.add('hidden');
            return;
        }
        popup.innerHTML = matches.map((c, i) => `
            <button class="ai-slash-item ${i === 0 ? 'ai-slash-active' : ''}" data-cmd="${c.cmd}">
                <i class="fas ${c.icon}"></i>
                <span class="ai-slash-cmd">${c.cmd}</span>
                <span class="ai-slash-label">${c.label}</span>
            </button>
        `).join('');
        popup.classList.remove('hidden');
        popup.querySelectorAll('.ai-slash-item').forEach(btn => {
            btn.onclick = () => {
                const cmd = btn.dataset.cmd;
                const found = SLASH_COMMANDS.find(c => c.cmd === cmd);
                if (found) {
                    const input = document.getElementById('ai-input');
                    if (input) input.value = '';
                    hideSlashPopup();
                    sendMessage(found.expand);
                }
            };
        });
    }
    function hideSlashPopup() {
        const popup = document.getElementById('ai-slash-popup');
        if (popup) popup.classList.add('hidden');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 ACTION BUTTONS NË PËRGJIGJE — AI mund të sugjerojë veprime
    // Format: [btn:Etiketa|funksioni|arg]
    // p.sh.: [btn:Hap Sulejmanin|openClient360|cli_123]
    // ═══════════════════════════════════════════════════════════════════
    const SAFE_ACTIONS = {
        'openClient360': (id) => typeof openClient360 === 'function' && openClient360(id),
        'openProduct360': (id) => typeof openProduct360 === 'function' && openProduct360(id),
        'navigateTo': (page) => typeof navigateTo === 'function' && navigateTo(page),
        'openSaleModal': () => typeof openSaleModal === 'function' && openSaleModal(),
        'openFatonPaymentModal': () => typeof openFatonPaymentModal === 'function' && openFatonPaymentModal(),
        'sendWhatsApp': (phone, msg) => {
            if (phone) window.open('https://wa.me/' + String(phone).replace(/[^0-9+]/g, '') + '?text=' + encodeURIComponent(msg || ''), '_blank');
        }
    };

    function renderActionButtons(html) {
        // Match [btn:Label|action|arg1|arg2]
        return html.replace(/\[btn:([^\|\]]+)\|([^\|\]]+)(?:\|([^\]]+))?\]/g, (match, label, action, args) => {
            if (!SAFE_ACTIONS[action]) return match;
            const argList = (args || '').split('|').map(a => a.trim());
            const argsJson = encodeURIComponent(JSON.stringify(argList));
            return `<button class="ai-action-btn" data-action="${escapeHtml(action)}" data-args="${argsJson}">
                <i class="fas fa-bolt"></i> ${escapeHtml(label)}
            </button>`;
        });
    }

    // Hook për lidhjen e action buttons pas çdo render
    function _attachActionHandlers(container) {
        if (!container) return;
        container.querySelectorAll('.ai-action-btn:not([data-bound])').forEach(btn => {
            btn.dataset.bound = '1';
            btn.onclick = () => {
                const action = btn.dataset.action;
                let args = [];
                try { args = JSON.parse(decodeURIComponent(btn.dataset.args || '%5B%5D')); }
                catch(e) {}
                if (SAFE_ACTIONS[action]) {
                    try { SAFE_ACTIONS[action].apply(null, args); }
                    catch(e) { console.warn('Action failed:', e); }
                }
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // Init / event handlers
    // ═══════════════════════════════════════════════════════════════════
    function init() {
        loadConversation();
        renderMessages();
        updateModelTag();
        updateContextInfo();
        // Refresh kontekst info çdo 2s kur tab-i AI është aktiv
        setInterval(() => {
            const aiPage = document.getElementById('page-ai');
            if (aiPage && aiPage.classList.contains('active')) {
                updateContextInfo();
            }
        }, 2000);

        if (!getApiKey()) showSetup();
        else hideSetup();

        // Save key
        const saveBtn = document.getElementById('ai-save-key-btn');
        if (saveBtn) saveBtn.onclick = () => {
            const input = document.getElementById('ai-api-key-input');
            const key = input ? input.value.trim() : '';
            if (!key.startsWith('sk-ant-')) {
                if (typeof showToast === 'function') showToast('Çelësi duhet të fillojë me sk-ant-', 'error');
                else alert('Çelësi duhet të fillojë me sk-ant-');
                return;
            }
            setApiKey(key);
            if (input) input.value = '';
            hideSetup();
            if (typeof showToast === 'function') showToast('✅ Çelësi u ruajt. Mund të bisedosh tani!', 'success');
        };

        // Send
        const sendBtn = document.getElementById('ai-send-btn');
        const input = document.getElementById('ai-input');
        const doSend = () => {
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            input.style.height = 'auto';
            hideSlashPopup();
            sendMessage(text);
        };
        if (sendBtn) sendBtn.onclick = doSend;
        if (input) {
            input.onkeydown = (e) => {
                // Slash command navigation
                const popup = document.getElementById('ai-slash-popup');
                const popupVisible = popup && !popup.classList.contains('hidden');
                if (popupVisible) {
                    const items = popup.querySelectorAll('.ai-slash-item');
                    const activeIdx = Array.from(items).findIndex(el => el.classList.contains('ai-slash-active'));
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const newIdx = e.key === 'ArrowDown'
                            ? Math.min(items.length - 1, activeIdx + 1)
                            : Math.max(0, activeIdx - 1);
                        items.forEach((el, i) => el.classList.toggle('ai-slash-active', i === newIdx));
                        return;
                    }
                    if (e.key === 'Tab' || (e.key === 'Enter' && items.length > 0)) {
                        e.preventDefault();
                        const active = popup.querySelector('.ai-slash-active') || items[0];
                        if (active) active.click();
                        return;
                    }
                    if (e.key === 'Escape') { hideSlashPopup(); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    doSend();
                }
            };
            // Auto-grow + slash popup
            input.oninput = () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 200) + 'px';
                const val = input.value;
                if (val.startsWith('/') && !val.includes(' ')) {
                    showSlashPopup(val);
                } else {
                    hideSlashPopup();
                }
            };
        }

        // Voice input — PRESS AND HOLD (UX si WhatsApp)
        const micBtn = document.getElementById('ai-mic-btn');
        if (micBtn) {
            // Pengo context menu në long-press (mobile)
            micBtn.addEventListener('contextmenu', (e) => e.preventDefault());

            // pointerdown → fillon recording (funksionon për mouse, touch, pen)
            micBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                try { micBtn.setPointerCapture(e.pointerId); } catch(_){}
                _startHoldRecording();
            });

            // pointerup → ndalon dhe dërgon
            micBtn.addEventListener('pointerup', (e) => {
                e.preventDefault();
                if (_holdRecording) _stopHoldRecording(true);
            });
            // pointercancel ose leave → ndalon pa dërguar
            micBtn.addEventListener('pointercancel', () => {
                if (_holdRecording) _stopHoldRecording(false);
            });

            // Edhe document.pointerup në rast se user lëviz jashtë butonit
            document.addEventListener('pointerup', () => {
                if (_holdRecording) _stopHoldRecording(true);
            });
            document.addEventListener('pointercancel', () => {
                if (_holdRecording) _stopHoldRecording(false);
            });

            // Esc anulon (jo dërgo)
            document.addEventListener('keydown', (e) => {
                if (_holdRecording && e.key === 'Escape') {
                    _stopHoldRecording(false);
                }
            });

            // Tooltip update
            micBtn.title = 'Shtyp dhe mbaj për të folur — lësho për të dërguar';
        }

        // Lidhe action buttons për mesazhet ekzistuese (pas re-render)
        _attachActionHandlers(document.getElementById('ai-messages'));

        // Auto-trigger morning briefing kur faqja AI hapet (nëse s'është bërë sot)
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-page="ai"]');
            if (navItem && getApiKey() && shouldShowBriefing()) {
                setTimeout(() => triggerMorningBriefing(), 800);
            }
        });

        // Clear conversation
        const clearBtn = document.getElementById('ai-clear-btn');
        if (clearBtn) clearBtn.onclick = () => {
            if (confirm('A do ta pastrosh historinë e bisedës?')) {
                clearConversation();
                renderMessages();
                const qp = document.getElementById('ai-quick-prompts');
                if (qp) { qp.classList.remove('ai-qp-hidden'); qp.style.display = ''; }
                // Re-add welcome message
                const container = document.getElementById('ai-messages');
                if (container) {
                    // Welcome remains in HTML; remove only dynamic ones
                    const dynamics = container.querySelectorAll('.ai-msg:not(.ai-welcome)');
                    dynamics.forEach(d => d.remove());
                }
            }
        };

        // Settings
        const settingsBtn = document.getElementById('ai-settings-btn');
        if (settingsBtn) settingsBtn.onclick = (e) => { e.stopPropagation(); showSettingsMenu(); };

        // Quick prompts
        document.querySelectorAll('.ai-qp-btn').forEach(btn => {
            btn.onclick = () => {
                const prompt = btn.dataset.prompt;
                if (prompt) {
                    const inp = document.getElementById('ai-input');
                    if (inp) inp.value = prompt;
                    sendMessage(prompt);
                    if (inp) inp.value = '';
                }
            };
        });
    }

    // Init kur dom-i është gati dhe kur klikohet tab-i
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM tashmë gati
        setTimeout(init, 100);
    }

    // Re-init nëse navigon te faqja AI (state mund të jetë rinovuar)
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('[data-page="ai"]');
        if (navItem) {
            setTimeout(() => {
                if (!getApiKey()) showSetup();
                else hideSetup();
                updateModelTag();
            }, 50);
        }
    });

    // Expose for debugging
    window.HurmaAI = {
        sendMessage,
        clearConversation: () => { clearConversation(); renderMessages(); },
        getConversation: () => conversation.slice(),
        setModel,
        getModel
    };
})();
