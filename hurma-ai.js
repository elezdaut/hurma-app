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
    // System prompt — kontekst i plotë: çdo të dhënë e app-it
    // Përditësohet automatikisht në çdo mesazh (snapshot freskët).
    // ═══════════════════════════════════════════════════════════════════
    function buildSystemPrompt() {
        const state = window.state || {};
        const PRODUCTS = (typeof window.PRODUCTS !== 'undefined' && window.PRODUCTS) ? window.PRODUCTS : [];

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const monthStart = today.substring(0, 7);

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

        // ── Llogaria Fatoni (furnizuesi) ─────────────────────────────────
        const fatonDebt = (typeof calcFatonDebt === 'function') ? calcFatonDebt() : 0;
        const fatonPayments = (state.fatonPayments || []).slice(-30).reverse(); // 30 të fundit
        const fatonPurchases = (state.fatonPurchases || []).slice(-30).reverse();
        const lastFatonPay = fatonPayments[0];
        const daysSinceFatonPay = lastFatonPay && lastFatonPay.date
            ? Math.floor((now - new Date(lastFatonPay.date)) / (1000*60*60*24))
            : null;

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

        // ── Pagesa nga klientët ──────────────────────────────────────────
        const clientPayments = (state.clientPayments || []).slice(-50).reverse();

        // ── Shitjet e fundit (50, që AI ka kontekst të mjaftueshëm) ─────
        const recentSales = (state.sales || []).slice(-50).reverse().map(s => {
            const c = (state.clients || []).find(cl => cl && cl.id === s.clientId);
            const p = PRODUCTS.find(pr => pr.id === s.productId);
            return {
                id: s.id || null,
                data: s.date,
                koha: s.createdAt || null,
                klient: c ? c.name : '-',
                klient_id: s.clientId,
                produkt: p ? p.name : (s.productId || '-'),
                produkt_id: s.productId,
                sasi: s.quantity,
                cmim_shitje: s.sellPrice,
                cmim_blerje: s.buyPrice,
                qarkullim: s.sellTotal,
                fitim: s.profit,
                pagesa: s.paymentType || 'cash',
                fatura_paguar: s.invoicePaid || false,
                lokacioni: s.location || null,
                shenim: s.note || null,
                zbritje: s.discount || 0
            };
        });

        // ── Porositë (te Fatoni) ─────────────────────────────────────────
        const orders = (state.orders || []).slice(-30).reverse().map(o => {
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

        // ── Kthimet ───────────────────────────────────────────────────────
        const returns = (state.returns || []).slice(-30).reverse().map(r => {
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

        // ── Shpenzimet ────────────────────────────────────────────────────
        const expenses = (state.expenses || []).slice(-50).reverse().map(e => ({
            data: e.date,
            kategoria: e.category || 'tjetër',
            shuma: e.amount,
            përshkrimi: e.description || ''
        }));
        const monthExpenses = expenses.filter(e => e.data && e.data.startsWith(monthStart));
        const totalMonthExpenses = monthExpenses.reduce((sum, e) => sum + (e.shuma || 0), 0);

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
            klientë: clients,
            produkte: products,
            faton: {
                borxhi_aktual: fatonDebt,
                pagesa_e_fundit: lastFatonPay,
                ditë_pa_paguar: daysSinceFatonPay,
                pagesa_30_të_fundit: fatonPayments.slice(0, 10), // 10 të fundit
                blerje_30_të_fundit: fatonPurchases.slice(0, 10)
            },
            shitje_50_të_fundit: recentSales,
            fatura_hapura: openInvoices,
            pagesa_klientësh_50_të_fundit: clientPayments,
            porositë_30_të_fundit: orders,
            kthimet_30_të_fundit: returns,
            shpenzime: { total_muaji: totalMonthExpenses, lista_50_të_fundit: expenses },
            shënime: notes,
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

## 🧠 Çfarë mund të bësh me të dhënat
Ti ke akses **TË PLOTË** te:
- ✅ TË GJITHË klientët (jo vetëm 50) me historik blerjesh, borxh, pagesa, kontakte
- ✅ TË GJITHA produktet me stok, çmime, margjinë, velocity, ditë stoku të mbetura
- ✅ Statistika: sot / javë / muaj / total (qarkullim, fitim, count)
- ✅ Llogaria Fatoni: borxhi, pagesa, blerjet
- ✅ 50 shitjet e fundit me detaje të plota
- ✅ Të gjitha faturat e hapura (me ditë vonese të llogaritura)
- ✅ Pagesa nga klientët, porosi, kthime, shpenzime, shënime
- ✅ Qëllimet, log aktivitetesh, kontaktet
- ✅ **Insights të para-llogaritura**: top klientë, produkte me stok kritik, fatura vonesa, etj.

## 📊 Të dhënat aktuale të dyqanit (~${tokenEstimate} tokens)
*Snapshot freskët në çdo mesazh që dërgon — informacioni i ri që fut në app shfaqet menjëherë këtu.*

\`\`\`json
${contextJson}
\`\`\`

## 💡 Shembuj se si ta përdorësh kontekstin
- Pyetje "Sa borxh ka X?" → Kërko në \`klientë\` për emrin → përdor \`borxh_aktual\`
- "Çfarë duhet të porosis?" → Përdor \`insights_të_gatshme.produkte_që_duhen_porositur\`
- "Sa fitova këtë muaj?" → Përdor \`statistika.muaji_aktual.fitim\`
- "Kush janë top klientët?" → \`insights_të_gatshme.top_5_klientë_për_qarkullim\`
- "Cilët klientë s'kanë blerë shumë kohë?" → \`insights_të_gatshme.klientë_pasivë_30d\`

Përdor **VETËM** të dhënat lart për përgjigje konkrete. Për pyetje të përgjithshme (strategji biznesi, marketing) mund të kombinosh njohuritë e tua me të dhënat.`;
    }

    function calcClientDebt(clientId) {
        if (typeof window.calcClientDebt === 'function') {
            try { return window.calcClientDebt(clientId) || 0; } catch (e) {}
        }
        const state = window.state || {};
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
        const state = window.state || {};
        const PRODUCTS = (typeof window.PRODUCTS !== 'undefined' && window.PRODUCTS) ? window.PRODUCTS : [];
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
            sendMessage(text);
        };
        if (sendBtn) sendBtn.onclick = doSend;
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    doSend();
                }
            };
            // Auto-grow
            input.oninput = () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 200) + 'px';
            };
        }

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
