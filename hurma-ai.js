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
    // System prompt — i jep AI-it kontekstin e plotë të dyqanit
    // ═══════════════════════════════════════════════════════════════════
    function buildSystemPrompt() {
        const state = window.state || {};
        const PRODUCTS = (typeof window.PRODUCTS !== 'undefined' && window.PRODUCTS) ? window.PRODUCTS : [];

        const today = new Date().toISOString().split('T')[0];
        const todaySales = (state.sales || []).filter(s => s && s.date === today);
        const todayProfit = todaySales.reduce((sum, s) => sum + ((s && s.profit) || 0), 0);
        const todayRevenue = todaySales.reduce((sum, s) => sum + ((s && s.sellTotal) || 0), 0);

        const monthStart = today.substring(0, 7);
        const monthSales = (state.sales || []).filter(s => s && s.date && s.date.startsWith(monthStart));
        const monthProfit = monthSales.reduce((sum, s) => sum + ((s && s.profit) || 0), 0);
        const monthRevenue = monthSales.reduce((sum, s) => sum + ((s && s.sellTotal) || 0), 0);

        // Klientët me borxh
        const clients = (state.clients || []).map(c => {
            const debt = calcClientDebt(c.id);
            const lastSale = (state.sales || [])
                .filter(s => s && s.clientId === c.id)
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
            return {
                id: c.id,
                name: c.name,
                phone: c.phone || null,
                debt,
                lastPurchase: lastSale ? lastSale.date : null,
                totalPurchases: (state.sales || []).filter(s => s && s.clientId === c.id).length
            };
        });

        // Produkte me stok
        const products = PRODUCTS.map(p => {
            const stk = ((state.stock || {})[p.id] || 0);
            const sold = (state.sales || []).filter(s => s && s.productId === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0);
            return {
                id: p.id,
                name: p.name,
                weight: p.weight || '',
                buyPrice: p.buyPrice || 0,
                sellPrice: p.sellPrice || 0,
                margin: ((p.sellPrice || 0) - (p.buyPrice || 0)),
                marginPct: p.buyPrice ? Math.round((((p.sellPrice || 0) - p.buyPrice) / p.buyPrice) * 100) : 0,
                stock: stk,
                totalSold: sold,
                stockStatus: stk === 0 ? 'mungon' : stk < 5 ? 'i ulët' : 'OK'
            };
        });

        // Borxhi i Fatonit
        const fatonDebt = (typeof calcFatonDebt === 'function') ? calcFatonDebt() : 0;

        // Përmbledhje e gjendjes
        const stateContext = {
            data_aktuale: today,
            shitje_sot: { count: todaySales.length, fitim: todayProfit, qarkullim: todayRevenue },
            shitje_muaji: { count: monthSales.length, fitim: monthProfit, qarkullim: monthRevenue },
            borxhi_fatoni: fatonDebt,
            klientet: clients.slice(0, 50), // limit për mos kaluar token-et
            produktet: products,
            shitjet_e_fundit_10: (state.sales || []).slice(-10).reverse().map(s => {
                const c = clients.find(cl => cl.id === s.clientId);
                const p = products.find(pr => pr.id === s.productId);
                return {
                    data: s.date,
                    klient: c ? c.name : '-',
                    produkt: p ? p.name : '-',
                    sasi: s.quantity,
                    total: s.sellTotal,
                    fitim: s.profit,
                    pagesa: s.paymentType || 'cash',
                    invoice_paguar: s.invoicePaid || false
                };
            })
        };

        return `Ti je **Hurma AI**, asistenti personal i Elezit, pronar i një dyqani shumicë në Maqedoni që shet **hurma (datë)** dhe ëmbëlsira.

## Konteksti i biznesit
- **Pronari**: Elezi (gjuha shqipe, valuta = денарë / ден)
- **Furnizuesi kryesor**: **Fatoni** — Elezi blen prej tij
- **Klientët**: dyqane më të vegjël që blejnë nga Elezi (p.sh. Sulejmani, Maxi Market)
- **Produktet kryesore**: Medjool, Sukeri, Mexhdul (lloje hurmash) në kuti të ndryshme

## Stili i përgjigjeve
- **Përgjigju në SHQIP** (gjithmonë, përveç nëse përdoruesi pyet në gjuhë tjetër)
- Ji **konciz dhe praktik** — Elezi është i zënë, jo akademik
- Përdor **markdown** (lista, bold, tabela kur ka kuptim)
- Përdor **emoji** me kursim (1-2 për pikëzim, jo nëpër çdo fjali)
- Kur jep numra, përdor **ден** dhe formato (1.620 ден, jo 1620)
- Kur sugjeron veprime, ji konkret: "Kontakto Sulejmanin sot — borxh 2.400 ден, s'ka blerë 12 ditë"
- Mos shpik të dhëna që nuk i ke në kontekst — nëse nuk e di, thuaj qartë

## Informacioni real i dyqanit (përdor SIGURT këto për përgjigje)
\`\`\`json
${JSON.stringify(stateContext, null, 2)}
\`\`\`

Përdor **vetëm** të dhënat lart për pyetje konkrete. Nëse përdoruesi pyet diçka që s'është aty (p.sh. çmimet e konkurrencës), thuaj që s'ke akses te ato të dhëna por mund të japësh këshillë të përgjithshme.`;
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
