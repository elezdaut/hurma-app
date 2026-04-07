// ===================== DATA =====================
const DEFAULT_PRODUCTS = [
    { id: 'medjool_500', name: 'Medjool 500g', weight: '500g', buyPrice: 270, sellPrice: 290 },
    { id: 'medjool_1kg', name: 'Medjool 1kg', weight: '1kg', buyPrice: 510, sellPrice: 540 },
    { id: 'sukeri_400', name: 'Sukeri 400g', weight: '400g', buyPrice: 90, sellPrice: 100 },
    { id: 'sukeri_900', name: 'Sukeri 900g', weight: '900g', buyPrice: 200, sellPrice: 220 },
];

// Feature 1: Dynamic products (can be managed from Settings)
let PRODUCTS = [...DEFAULT_PRODUCTS];

// ===================== STATE =====================
let state = {
    sales: [],
    stock: {},
    stockBatches: [],
    clients: [],
    orders: [],
    fatonPayments: [],
    fatonProfitCollections: [],
    returns: [],
    contacts: [],
    notes: [],
    targets: [],
    expenses: [],
    locations: ['Dyqan', 'Treg', 'Online'],
    notifications: [],
    weeklyReports: [],
    fatonDebtHistory: [],
    pinnedClients: [],
    salesMonthFilter: '',
    // Feature 1: Custom products
    customProducts: null,
    // Feature 3: Configurable profit split
    profitSplit: { owner: 50, partner: 50 },
    partnerName: 'Orhan',
    // Feature 5: Cash drawer
    cashDrawer: [],
    // Feature 6: Client credit limits
    // (stored per client as client.creditLimit)
    // Feature 7: Client payment history
    clientPayments: [],
    // Feature 8: Client categories
    clientCategories: ['Regular', 'Shumice', 'Njeheresh'],
    // Feature 12: PIN lock
    pinCode: null,
    pinEnabled: false,
    // Feature 13: Auto-backup settings
    autoBackup: { enabled: false, interval: 'weekly', lastBackup: null },
    // Feature 14: Dashboard customization
    dashboardCards: null,
    // Feature 15: Quick sale presets
    salePresets: [],
    // Feature 18: Expense categories
    expenseCategories: ['Transport', 'Paketim', 'Qira', 'Marketing', 'Tjeter'],
    // Feature 19: Activity log
    activityLog: [],
    // Feature 16: Table sort state
    tableSortState: {},
    // DATA PROTECTION FEATURES
    trash: [],           // Koshi i plehrave
    restoreLog: [],      // Ditari i restore-ve
    changeTimeline: [],  // Timeline ndryshimesh
    hourlySnapshots: []  // Snapshots çdo orë
};

// ===================== INIT =====================
function init() {
    loadState();
    // Feature 12: PIN lock check
    if (state.pinEnabled && state.pinCode) {
        showPinLockScreen();
        return;
    }
    initAfterAuth();
}

function initAfterAuth() {
    initStock();
    applyTranslations();
    populateProductSelects();
    populateLocationSelects();
    navigateTo('dashboard');
    checkNotifications();
    initCharts();
    refreshAll();
    checkWeeklyReport();
    initOfflineMode();
    initKeyboardShortcuts();
    initFatonDebtTracking();
    // Feature 13: Auto-backup check
    checkAutoBackup();

    const theme = localStorage.getItem('hurma-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('dark-mode-toggle').checked = theme === 'dark';
    try { initCrossTabFeatures(); } catch(e) { console.log('CrossTab init error:', e); }
    try { initPWA(); } catch(e) { console.log('PWA init error:', e); }
}

// Fallback: ensure cross-tab features init even if initAfterAuth partially fails
window.addEventListener('load', function() {
    setTimeout(function() {
        if (!document.getElementById('global-fab')) {
            try { initCrossTabFeatures(); } catch(e) {}
        }
    }, 500);
});

function loadState() {
    const saved = localStorage.getItem('hurma-state');
    if (saved) {
        let parsed;
        try { parsed = JSON.parse(saved); } catch(e) { console.error('Corrupt state data:', e); return; }
        state = { ...state, ...parsed };
        // Ensure new arrays exist for backward compatibility
        if (!state.fatonProfitCollections) state.fatonProfitCollections = [];
        if (!state.fatonProfitOwed) state.fatonProfitOwed = [];
        if (!state.fatonPurchases) state.fatonPurchases = [];
        if (!state.weeklyReports) state.weeklyReports = [];
        if (!state.fatonDebtHistory) state.fatonDebtHistory = [];
        if (!state.pinnedClients) state.pinnedClients = [];
        if (!state.salesMonthFilter) state.salesMonthFilter = '';
        // New features backward compatibility
        if (!state.profitSplit) state.profitSplit = { owner: 50, partner: 50 };
        if (!state.partnerName) state.partnerName = 'Orhan';
        if (!state.cashDrawer) state.cashDrawer = [];
        if (!state.clientPayments) state.clientPayments = [];
        if (!state.clientCategories) state.clientCategories = ['Regular', 'Shumice', 'Njeheresh'];
        if (!state.autoBackup) state.autoBackup = { enabled: false, interval: 'weekly', lastBackup: null };
        if (!state.salePresets) state.salePresets = [];
        if (!state.expenseCategories) state.expenseCategories = ['Transport', 'Paketim', 'Qira', 'Marketing', 'Tjeter'];
        if (!state.activityLog) state.activityLog = [];
        if (!state.tableSortState) state.tableSortState = {};
        if (!state.fatonInstallments) state.fatonInstallments = [];
        if (!state.fatonDebtLimit) state.fatonDebtLimit = 0;
        if (!state.paymentReceipts) state.paymentReceipts = [];
        if (!state.scheduledPayments) state.scheduledPayments = [];
        if (!state.clientInstallments) state.clientInstallments = {};
        if (!state.paymentAuditTrail) state.paymentAuditTrail = [];
        if (!state.paymentTemplates) state.paymentTemplates = [];
        if (!state.currencyRates) state.currencyRates = { EUR: 61.5, USD: 56.0, MKD: 1 };
        if (!state.suppliers) state.suppliers = [{ id: 'faton', name: 'Faton', phone: '', balance: 0 }];
        if (!state.promotions) state.promotions = [];
        if (!state.dashboardWidgets) state.dashboardWidgets = { todayProfit: true, todaySales: true, yourShare: true, partnerShare: true, miniatures: true, suggestions: true, quickActions: true, profitChart: true, salesByProduct: true, weeklyComparison: true };
        if (!state.autoOrderThreshold) state.autoOrderThreshold = 3;
        // Data protection features
        if (!state.trash) state.trash = [];
        if (!state.restoreLog) state.restoreLog = [];
        if (!state.changeTimeline) state.changeTimeline = [];
        if (!state.hourlySnapshots) state.hourlySnapshots = [];
        // Feature 1: Load custom products
        if (state.customProducts && state.customProducts.length > 0) {
            PRODUCTS = state.customProducts;
        }
    }
}

function saveState() {
    localStorage.setItem('hurma-state', JSON.stringify(state));
}

function initStock() {
    PRODUCTS.forEach(p => {
        if (state.stock[p.id] === undefined) {
            state.stock[p.id] = 0;
        }
    });
}

// ===================== NAVIGATION =====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (!pageEl || !navEl) return;
    pageEl.classList.add('active');
    navEl.classList.add('active');

    const spanEl = navEl.querySelector('span');
    const titleKey = spanEl ? spanEl.getAttribute('data-i18n') : page;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) {
        pageTitleEl.textContent = t(titleKey);
        pageTitleEl.setAttribute('data-i18n', titleKey);
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }

    refreshPage(page);
    showFatonFAB(page === 'faton');
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ===================== THEME =====================
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hurma-theme', next);
    document.getElementById('dark-mode-toggle').checked = next === 'dark';
}

// ===================== REFRESH =====================
function refreshAll() {
    refreshDashboard();
    refreshSales();
    refreshStock();
    refreshClients();
    refreshOrders();
    refreshFaton();
    refreshReturns();
    refreshContacts();
    refreshNotes();
    refreshTargets();
    refreshExpenses();
    refreshLocations();
    refreshBalance();
    updateCharts();
    try { updateTabBadges(); updateSyncStatusBar(); refreshRecentActivityBar(); refreshDashboardMiniatures(); showSmartSuggestions(); updateLiveProfitTracker(); } catch(e) {}
}

function refreshPage(page) {
    switch(page) {
        case 'dashboard': refreshDashboard(); updateCharts(); break;
        case 'sales': refreshSales(); break;
        case 'stock': refreshStock(); break;
        case 'clients': refreshClients(); break;
        case 'orders': refreshOrders(); break;
        case 'faton': refreshFaton(); break;
        case 'reports': generateReport(); break;
        case 'returns': refreshReturns(); break;
        case 'contacts': refreshContacts(); break;
        case 'notes': refreshNotes(); break;
        case 'targets': refreshTargets(); break;
        case 'calculator': break;
        case 'settings': refreshExpenses(); refreshLocations(); refreshProducts(); refreshSettingsUI(); break;
        case 'balance': refreshBalance(); break;
        case 'activity': refreshActivityLog(); break;
        case 'cashDrawer': refreshCashDrawer(); break;
        case 'trends': refreshTrends(); break;
    }
}

// ===================== DASHBOARD =====================
function refreshDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date === today);
    const todayReturns = state.returns.filter(r => r.date === today);

    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const todayReturnLoss = todayReturns.reduce((sum, r) => sum + (getProduct(r.productId).sellPrice - getProduct(r.productId).buyPrice) * r.quantity, 0);
    const netTodayProfit = todayProfit - todayReturnLoss;

    document.getElementById('today-profit').textContent = netTodayProfit + ' ден';
    document.getElementById('today-sales').textContent = todaySales.length;
    // Feature 3: Use configurable profit split
    document.getElementById('your-share').textContent = calcOwnerShare(netTodayProfit) + ' ден';
    const partnerShareEl = document.getElementById('orhan-share');
    if (partnerShareEl) {
        partnerShareEl.textContent = calcPartnerShare(netTodayProfit) + ' ден';
        // Update label if partner name changed
        const partnerLabelEl = partnerShareEl.parentElement.querySelector('.stat-label');
        if (partnerLabelEl) partnerLabelEl.textContent = state.partnerName + ' Share';
    }

    const totalStock = Object.values(state.stock).reduce((sum, v) => sum + v, 0);
    document.getElementById('total-stock').textContent = totalStock + ' ' + t('pieces');

    const fatonDebt = calcFatonDebt();
    document.getElementById('faton-debt').textContent = fatonDebt + ' ден';

    // Profit to collect from Faton (from invoice sales)
    const profitToCollect = calcFatonProfitOwed() - calcFatonProfitCollected();
    document.getElementById('faton-profit-to-collect').textContent = profitToCollect + ' ден';

    const now = new Date();
    const monthSales = state.sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlyProfit = monthSales.reduce((sum, s) => sum + s.profit, 0);
    document.getElementById('monthly-profit').textContent = monthlyProfit + ' ден';

    // Best seller
    const productCounts = {};
    state.sales.forEach(s => {
        productCounts[s.productId] = (productCounts[s.productId] || 0) + s.quantity;
    });
    const bestId = Object.keys(productCounts).sort((a, b) => productCounts[b] - productCounts[a])[0];
    document.getElementById('best-seller').textContent = bestId ? getProduct(bestId).name : '-';

    // Cash vs Invoice stats
    const todayCash = todaySales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0);
    const todayInvoice = todaySales.filter(s => s.paymentType === 'invoice_60').reduce((sum, s) => sum + s.sellTotal, 0);
    document.getElementById('today-cash').textContent = todayCash + ' ден';
    document.getElementById('today-invoice').textContent = todayInvoice + ' ден';

    // Open invoices (unpaid)
    const openInvoices = state.sales.filter(s => s.paymentType === 'invoice_60' && !s.invoicePaid);
    const openInvoiceTotal = openInvoices.reduce((sum, s) => sum + s.sellTotal, 0);
    document.getElementById('open-invoices').textContent = openInvoices.length + ' (' + openInvoiceTotal + ' ден)';

    // Overdue invoices
    const today2 = new Date().toISOString().split('T')[0];
    const overdueInvoices = openInvoices.filter(s => s.dueDate && s.dueDate < today2);
    const overdueTotal = overdueInvoices.reduce((sum, s) => sum + s.sellTotal, 0);
    document.getElementById('overdue-invoices').textContent = overdueInvoices.length + ' (' + overdueTotal + ' ден)';

    // Feature 11: Real profit vs Paper profit
    const allProfit = state.sales.reduce((sum, s) => sum + s.profit, 0);
    const cashProfit = state.sales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.profit, 0);
    const collectedInvoiceProfit = calcFatonProfitCollected();
    const realProfit = cashProfit + collectedInvoiceProfit;
    const realProfitEl = document.getElementById('real-profit');
    const paperProfitEl = document.getElementById('paper-profit');
    if (realProfitEl) realProfitEl.textContent = realProfit + ' ден';
    if (paperProfitEl) paperProfitEl.textContent = allProfit + ' ден';

    // Feature 21: Weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const thisWeekSales = state.sales.filter(s => s.date >= weekStartStr);
    const thisWeekProfit = thisWeekSales.reduce((sum, s) => sum + s.profit, 0);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];
    const lastWeekSales = state.sales.filter(s => s.date >= lastWeekStartStr && s.date <= lastWeekEndStr);
    const lastWeekProfit = lastWeekSales.reduce((sum, s) => sum + s.profit, 0);

    const monthStart = now.toISOString().substring(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
    const lastMonthSales = state.sales.filter(s => s.date.startsWith(lastMonthStr));
    const lastMonthProfit = lastMonthSales.reduce((sum, s) => sum + s.profit, 0);

    const weekStatsEl = document.getElementById('week-stats');
    if (weekStatsEl) {
        const weekChange = lastWeekProfit > 0 ? Math.round(((thisWeekProfit - lastWeekProfit) / lastWeekProfit) * 100) : 0;
        const monthChange = lastMonthProfit > 0 ? Math.round(((monthlyProfit - lastMonthProfit) / lastMonthProfit) * 100) : 0;
        weekStatsEl.innerHTML = `
            <div class="stat-card"><i class="fas fa-calendar-week"></i><div><h3>Kjo jave</h3><p>${thisWeekProfit} den (${thisWeekSales.length} shitje)</p></div></div>
            <div class="stat-card"><i class="fas fa-exchange-alt"></i><div><h3>vs Java e kaluar</h3><p style="color:${weekChange >= 0 ? 'var(--success)' : 'var(--danger)'}">${weekChange >= 0 ? '+' : ''}${weekChange}% (${lastWeekProfit} den)</p></div></div>
            <div class="stat-card"><i class="fas fa-calendar-alt"></i><div><h3>Ky muaj</h3><p>${monthlyProfit} den (${monthSales.length} shitje)</p></div></div>
            <div class="stat-card"><i class="fas fa-exchange-alt"></i><div><h3>vs Muaji i kaluar</h3><p style="color:${monthChange >= 0 ? 'var(--success)' : 'var(--danger)'}">${monthChange >= 0 ? '+' : ''}${monthChange}% (${lastMonthProfit} den)</p></div></div>
        `;
    }

    // Feature 7: Quick action buttons on dashboard
    const quickActionsEl = document.getElementById('quick-actions');
    if (quickActionsEl) {
        quickActionsEl.innerHTML = `
            <button class="btn btn-success" onclick="openQuickCashSale()"><i class="fas fa-money-bill"></i> Shto shitje cash</button>
            <button class="btn btn-primary" onclick="openQuickInvoiceSale()"><i class="fas fa-file-invoice"></i> Shto shitje fature</button>
            <button class="btn btn-secondary" onclick="openFatonPaymentModal()"><i class="fas fa-hand-holding-usd"></i> Paguaj Fatonin</button>
        `;
    }

    // Feature 3: Show last weekly report
    const lastReportEl = document.getElementById('last-weekly-report');
    if (lastReportEl && state.weeklyReports.length > 0) {
        const lastReport = state.weeklyReports[state.weeklyReports.length - 1];
        lastReportEl.innerHTML = `
            <h4>Raporti javor (${lastReport.weekStart} - ${lastReport.weekEnd})</h4>
            <p>Shitje: ${lastReport.totalSales} | Fitimi: ${lastReport.totalProfit} den | Cash: ${lastReport.cashRevenue} den | Fatura: ${lastReport.invoiceRevenue} den</p>
        `;
    }

    // Feature 15: Quick Sale Presets
    const presetsEl = document.getElementById('quick-sale-presets');
    const dashboardCards = state.dashboardCards || {};
    if (presetsEl && dashboardCards.presets !== false) {
        if (state.salePresets && state.salePresets.length > 0) {
            let html = '<h3>Quick Sale Presets</h3><div style="display:flex; flex-wrap:wrap; gap:10px;">';
            state.salePresets.forEach(preset => {
                const product = getProduct(preset.productId);
                html += `
                    <button class="btn btn-primary" onclick="executePreset(${preset.id})" style="min-width:150px;">
                        <i class="fas fa-bolt"></i> ${preset.name}<br>
                        <small>${preset.quantity}x ${product.name}</small>
                    </button>
                `;
            });
            html += '</div>';
            presetsEl.innerHTML = html;
        } else {
            presetsEl.innerHTML = '';
        }
    }
}

// ===================== SALES =====================
function openSaleModal(editId) {
    const isEdit = editId !== undefined;
    const sale = isEdit ? state.sales[editId] : null;

    let html = `
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="sale-product">
                ${PRODUCTS.map(p => `<option value="${p.id}" ${sale && sale.productId === p.id ? 'selected' : ''}>${p.name} (${t('buy_price')}: ${p.buyPrice}, ${t('sell_price')}: ${p.sellPrice})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="sale-quantity" min="1" value="${sale ? sale.quantity : 1}">
        </div>
        <div class="form-group">
            <label>${t('discount')} (%):</label>
            <input type="number" id="sale-discount" min="0" max="100" value="${sale ? sale.discount || 0 : 0}">
        </div>
        <div class="form-group">
            <label>Custom Sell Price (optional):</label>
            <input type="number" id="sale-custom-price" min="0" placeholder="Leave empty for default price">
        </div>
        <div class="form-group">
            <label>${t('client')} (${t('optional')}):</label>
            <select id="sale-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}" ${sale && sale.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('location')}:</label>
            <select id="sale-location">
                ${state.locations.map(l => `<option value="${l}" ${sale && sale.location === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="sale-date" value="${sale ? sale.date : new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="sale-note">${sale ? sale.note || '' : ''}</textarea>
        </div>
        <div class="form-group">
            <label>${t('payment_type')}:</label>
            <select id="sale-payment-type" onchange="toggleInvoiceDueDate()">
                <option value="cash" ${sale && sale.paymentType === 'cash' ? 'selected' : ''}>${t('cash')}</option>
                <option value="invoice_60" ${sale && sale.paymentType === 'invoice_60' ? 'selected' : ''}>${t('invoice_60')}</option>
            </select>
        </div>
        <div class="form-group ${sale && sale.paymentType === 'invoice_60' ? '' : 'hidden'}" id="invoice-due-date-group">
            <label>${t('invoice_due_date')}:</label>
            <input type="date" id="sale-due-date" value="${sale && sale.dueDate ? sale.dueDate : ''}">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="sale-is-debt" ${sale && sale.isDebt ? 'checked' : ''}> ${t('debt')} (${t('client')} ${t('pay_debt')})
            </label>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateSale(${editId})` : 'addSale()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('add_sale')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('new_sale'), html);
    setTimeout(() => { if (typeof addLiveCalculation === 'function') addLiveCalculation(); }, 100);
}

function toggleInvoiceDueDate() {
    const paymentType = document.getElementById('sale-payment-type').value;
    const dueDateGroup = document.getElementById('invoice-due-date-group');
    if (paymentType === 'invoice_60') {
        dueDateGroup.classList.remove('hidden');
        // Auto-set due date to 60 days from sale date
        const saleDate = document.getElementById('sale-date').value;
        if (saleDate && !document.getElementById('sale-due-date').value) {
            const due = new Date(saleDate);
            due.setDate(due.getDate() + 60);
            document.getElementById('sale-due-date').value = due.toISOString().split('T')[0];
        }
    } else {
        dueDateGroup.classList.add('hidden');
    }
}

function addSale() {
    const productId = document.getElementById('sale-product').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
    const discount = parseFloat(document.getElementById('sale-discount').value) || 0;
    const clientId = document.getElementById('sale-client').value;
    const location = document.getElementById('sale-location').value;
    const date = document.getElementById('sale-date').value;
    const note = document.getElementById('sale-note').value;
    const isDebt = document.getElementById('sale-is-debt').checked;
    const paymentType = document.getElementById('sale-payment-type').value;
    let dueDate = '';
    if (paymentType === 'invoice_60') {
        dueDate = document.getElementById('sale-due-date').value;
        if (!dueDate) {
            const due = new Date(date);
            due.setDate(due.getDate() + 60);
            dueDate = due.toISOString().split('T')[0];
        }
    }

    if (quantity <= 0) return;

    // Feature 2: Custom sell price
    const customSellPriceEl = document.getElementById('sale-custom-price');
    const customSellPrice = customSellPriceEl ? parseFloat(customSellPriceEl.value) : null;

    const product = getProduct(productId);
    const effectiveSellPrice = customSellPrice && customSellPrice > 0 ? customSellPrice : product.sellPrice;
    const sellTotal = effectiveSellPrice * quantity * (1 - discount / 100);
    const buyTotal = product.buyPrice * quantity;
    const profit = sellTotal - buyTotal;

    // Feature 6: Credit limit check
    if (paymentType === 'invoice_60' && clientId) {
        const client = state.clients.find(c => c.id === clientId);
        if (client && client.creditLimit && client.creditLimit > 0) {
            const currentDebt = client.debt || 0;
            const totalAfterSale = currentDebt + Math.round(sellTotal);
            if (totalAfterSale > client.creditLimit) {
                if (!confirm(`Warning: This sale will exceed client's credit limit of ${client.creditLimit} den. Current debt: ${currentDebt} den. Continue?`)) {
                    return;
                }
            }
        }
    }

    // Save undo state BEFORE mutation
    if (typeof saveUndoState === 'function') saveUndoState('Shitje: ' + product.name + ' x' + quantity);

    const saleId = Date.now();
    state.sales.push({
        id: saleId,
        productId,
        quantity,
        discount,
        sellTotal: Math.round(sellTotal),
        buyTotal,
        profit: Math.round(profit),
        clientId,
        location,
        date,
        note,
        isDebt,
        paymentType,
        dueDate,
        invoicePaid: paymentType === 'cash'
    });

    // Update stock
    state.stock[productId] = Math.max(0, (state.stock[productId] || 0) - quantity);

    // Update client debt
    if (isDebt && clientId) {
        const client = state.clients.find(c => c.id === clientId);
        if (client) {
            client.debt = (client.debt || 0) + Math.round(sellTotal);
        }
    }

    // Faton debt logic based on payment type:
    // Cash: buyTotal adds to Faton debt (we+Orhani must pay Faton)
    // Invoice 60: client pays Faton directly at bank, no debt increase
    //   BUT the profit (sellPrice - buyPrice) belongs to us, tracked separately
    if (paymentType === 'invoice_60') {
        // Track profit that Faton owes us from this invoice sale
        if (!state.fatonProfitOwed) state.fatonProfitOwed = [];
        state.fatonProfitOwed.push({
            id: Date.now(),
            saleId,
            productId,
            quantity,
            profit: Math.round(profit),
            clientId,
            date,
            collected: false
        });
    }

    // (undo state already saved before mutation above)

    // Auto-apply promotion discount
    const activeDiscount = typeof getActiveDiscount === 'function' ? getActiveDiscount(productId) : 0;
    if (activeDiscount > 0 && discount === 0) {
        const lastSale = state.sales[state.sales.length - 1];
        const promoSellTotal = effectiveSellPrice * quantity * (1 - activeDiscount / 100);
        lastSale.sellTotal = Math.round(promoSellTotal);
        lastSale.profit = Math.round(promoSellTotal - buyTotal);
        lastSale.promoApplied = activeDiscount;
    }

    // Auto-register cash payment for client tracking
    if (typeof autoRegisterCashPayment === 'function' && (paymentType || 'cash') === 'cash') {
        autoRegisterCashPayment(state.sales[state.sales.length - 1]);
    }

    // Log activity
    if (typeof logActivity === 'function') {
        const clientName = clientId ? (state.clients.find(c => c.id === clientId) || {}).name || '' : '';
        logActivity('sale', 'Shitje: ' + product.name + ' x' + quantity + (clientName ? ' - ' + clientName : '') + ' = ' + Math.round(sellTotal) + ' ден');
    }

    // Enhanced toast with details
    const profitMsg = Math.round(profit) + ' ден fitim';
    const ownerMsg = typeof calcOwnerShare === 'function' ? ' (Elez: ' + calcOwnerShare(Math.round(profit)) + ')' : '';

    saveState();
    closeModal();
    refreshAll();
    checkNotifications();

    // Show detailed toast
    showToast('Shitje: ' + product.name + ' x' + quantity + ' | ' + profitMsg + ownerMsg);

    // Check low stock notification
    if ((state.stock[productId] || 0) < 3) {
        setTimeout(() => showToast('⚠️ Stoku i ' + product.name + ' është vetëm ' + (state.stock[productId] || 0) + '!'), 1500);
    }
}

function updateSale(index) {
    const old = state.sales[index];
    const productId = document.getElementById('sale-product').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
    const discount = parseFloat(document.getElementById('sale-discount').value) || 0;
    const clientId = document.getElementById('sale-client').value;
    const location = document.getElementById('sale-location').value;
    const date = document.getElementById('sale-date').value;
    const note = document.getElementById('sale-note').value;
    const isDebt = document.getElementById('sale-is-debt').checked;
    const paymentType = document.getElementById('sale-payment-type').value;
    let dueDate = '';
    if (paymentType === 'invoice_60') {
        dueDate = document.getElementById('sale-due-date').value;
        if (!dueDate) {
            const due = new Date(date);
            due.setDate(due.getDate() + 60);
            dueDate = due.toISOString().split('T')[0];
        }
    }

    // Restore old stock
    state.stock[old.productId] = (state.stock[old.productId] || 0) + old.quantity;

    // Reverse old client debt if it was a debt sale
    if (old.isDebt && old.clientId) {
        const oldClient = state.clients.find(c => c.id === old.clientId);
        if (oldClient) oldClient.debt = Math.max(0, oldClient.debt - old.sellTotal);
    }

    // Feature 2: Custom sell price
    const customSellPriceEl = document.getElementById('sale-custom-price');
    const customSellPrice = customSellPriceEl ? parseFloat(customSellPriceEl.value) : null;

    const product = getProduct(productId);
    const effectiveSellPrice = customSellPrice && customSellPrice > 0 ? customSellPrice : product.sellPrice;
    const sellTotal = effectiveSellPrice * quantity * (1 - discount / 100);
    const buyTotal = product.buyPrice * quantity;
    const profit = sellTotal - buyTotal;

    state.sales[index] = {
        ...old,
        productId,
        quantity,
        discount,
        sellTotal: Math.round(sellTotal),
        buyTotal,
        profit: Math.round(profit),
        clientId,
        location,
        date,
        note,
        isDebt,
        paymentType,
        dueDate,
        invoicePaid: paymentType === 'cash' ? true : (old.invoicePaid || false)
    };

    // Deduct new stock
    state.stock[productId] = Math.max(0, (state.stock[productId] || 0) - quantity);

    // Apply new client debt if this is a debt sale
    if (isDebt && clientId) {
        const newClient = state.clients.find(c => c.id === clientId);
        if (newClient) newClient.debt += Math.round(sellTotal);
    }

    saveState();
    closeModal();
    refreshAll();
}

function deleteSale(index) {
    if (!confirm(t('confirm_delete'))) return;
    const sale = state.sales[index];
    const product = getProduct(sale.productId);

    // Restore stock
    state.stock[sale.productId] = (state.stock[sale.productId] || 0) + sale.quantity;

    // Reverse client debt if this was a debt sale
    if (sale.isDebt && sale.clientId) {
        const client = state.clients.find(c => c.id === sale.clientId);
        if (client) client.debt = Math.max(0, client.debt - sale.sellTotal);
    }

    state.sales.splice(index, 1);

    // Feature 19: Activity log
    logActivity('Sale Deleted', `${sale.quantity}x ${product.name} - ${sale.sellTotal} den`);
    saveState();
    refreshAll();
}

function refreshSales() {
    const tbody = document.getElementById('sales-body');
    let sales = [...state.sales].reverse();
    tbody.innerHTML = '';

    // Feature 10: Monthly tabs
    renderSalesMonthTabs();

    // Apply filters
    const search = (document.getElementById('sales-search').value || '').toLowerCase();
    const dateFrom = document.getElementById('sales-date-from').value;
    const dateTo = document.getElementById('sales-date-to').value;
    const productFilter = document.getElementById('sales-product-filter').value;
    const locationFilter = document.getElementById('sales-location-filter').value;
    const paymentTypeFilter = document.getElementById('sales-payment-filter') ? document.getElementById('sales-payment-filter').value : '';
    const monthFilter = state.salesMonthFilter || '';

    sales = sales.filter(s => {
        const product = getProduct(s.productId);
        if (search && !product.name.toLowerCase().includes(search)) return false;
        if (dateFrom && s.date < dateFrom) return false;
        if (dateTo && s.date > dateTo) return false;
        if (productFilter && s.productId !== productFilter) return false;
        if (locationFilter && s.location !== locationFilter) return false;
        if (paymentTypeFilter && (s.paymentType || 'cash') !== paymentTypeFilter) return false;
        if (monthFilter && !s.date.startsWith(monthFilter)) return false;
        return true;
    });

    let totalSales = 0, totalProfit = 0, totalCash = 0, totalInvoice = 0;

    sales.forEach((s, i) => {
        const product = getProduct(s.productId);
        const client = s.clientId ? state.clients.find(c => c.id === s.clientId) : null;
        const realIndex = state.sales.indexOf(s);
        totalSales += s.sellTotal;
        totalProfit += s.profit;
        const pType = s.paymentType || 'cash';
        if (pType === 'cash') totalCash += s.sellTotal;
        else totalInvoice += s.sellTotal;

        // Invoice status
        let invoiceStatusHtml = '';
        if (pType === 'invoice_60') {
            if (s.invoicePaid) {
                invoiceStatusHtml = `<span style="color:var(--success)">${t('paid')}</span>`;
            } else {
                const daysLeft = s.dueDate ? Math.ceil((new Date(s.dueDate) - new Date()) / (1000*60*60*24)) : 0;
                if (daysLeft < 0) {
                    invoiceStatusHtml = `<span style="color:var(--danger)">${t('overdue')} (${Math.abs(daysLeft)} ${t('overdue_days')})</span>`;
                } else {
                    invoiceStatusHtml = `<span style="color:var(--warning)">${t('unpaid')} (${daysLeft} ${t('days_until_due')})</span>`;
                }
            }
        }

        tbody.innerHTML += `
            <tr>
                <td>${s.date}</td>
                <td><span style="cursor:pointer;color:var(--primary);text-decoration:underline;" onclick="openProduct360('${s.productId}')">${product.name}</span></td>
                <td>${s.quantity}</td>
                <td>${product.buyPrice} ден</td>
                <td>${product.sellPrice} ден${s.discount ? ` (-${s.discount}%)` : ''}</td>
                <td>${s.sellTotal} ден</td>
                <td>${s.profit} ден</td>
                <td>${client ? `<span style="cursor:pointer;color:var(--primary);text-decoration:underline;" onclick="openClient360('${client.id}')">${client.name}</span>` : '-'}${s.isDebt ? ' <span style="color:var(--danger)">(borxh)</span>' : ''}</td>
                <td><span class="payment-badge ${pType}">${t(pType)}</span>${pType === 'invoice_60' ? '<br>' + invoiceStatusHtml : ''}</td>
                <td>${s.location || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openSaleModal(${realIndex})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSale(${realIndex})"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="generateInvoice(${realIndex})"><i class="fas fa-file-invoice"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="duplicateSale(${realIndex})" title="Kopjo"><i class="fas fa-copy"></i></button>
                    ${pType === 'invoice_60' && !s.invoicePaid ? `<button class="btn btn-sm btn-success" onclick="markInvoicePaid(${realIndex})"><i class="fas fa-check"></i></button>` : ''}
                </td>
            </tr>
        `;
    });

    document.getElementById('sales-total').textContent = totalSales + ' ден';
    document.getElementById('sales-profit-total').textContent = totalProfit + ' ден';
    document.getElementById('sales-your-share').textContent = calcOwnerShare(totalProfit) + ' ден';
    document.getElementById('sales-orhan-share').textContent = calcPartnerShare(totalProfit) + ' ден';
    document.getElementById('sales-cash-total').textContent = totalCash + ' ден';
    document.getElementById('sales-invoice-total').textContent = totalInvoice + ' ден';
}

function markInvoicePaid(index) {
    const sale = state.sales[index];
    const profit = sale.profit;
    const cashDebt = calcFatonDebt();
    const client = sale.clientId ? state.clients.find(c => c.id === sale.clientId) : null;
    const product = getProduct(sale.productId);

    let html = `
        <div style="background:var(--bg-primary);padding:12px;border-radius:8px;margin-bottom:15px;">
            <p><strong>${t('product')}:</strong> ${product.name} x${sale.quantity}</p>
            <p><strong>${t('total')}:</strong> ${sale.sellTotal} den</p>
            <p><strong>${t('profit')}:</strong> ${profit} den</p>
            ${client ? `<p><strong>${t('client')}:</strong> ${client.name}</p>` : ''}
            <p><strong>${t('faton_cash_debt')}:</strong> ${cashDebt} den</p>
        </div>
        <div class="form-group">
            <label>${t('profit_collection_type')}:</label>
            <select id="invoice-profit-type">
                <option value="deduct_from_debt">${t('deduct_from_debt')}</option>
                <option value="faton_returns_cash">${t('faton_returns_cash')}</option>
                <option value="collect_later">Mblidhe me vone</option>
            </select>
        </div>
        <div class="form-group">
            <label>${t('amount')}:</label>
            <input type="number" id="invoice-profit-amount" value="${profit}" min="0" max="${profit}">
        </div>
        <button class="btn btn-success" onclick="confirmMarkInvoicePaid(${index})" style="width:100%;">
            <i class="fas fa-check"></i> ${t('mark_paid')}
        </button>
    `;
    openModal(t('mark_paid') + ' - ' + t('collect_profit'), html);
}

function confirmMarkInvoicePaid(index) {
    const sale = state.sales[index];
    const profitType = document.getElementById('invoice-profit-type').value;
    const amount = parseInt(document.getElementById('invoice-profit-amount').value) || 0;

    // Mark invoice as paid
    state.sales[index].invoicePaid = true;
    state.sales[index].invoicePaidDate = new Date().toISOString().split('T')[0];

    // Auto-collect profit if not "collect later"
    if (profitType !== 'collect_later' && amount > 0) {
        if (!state.fatonProfitCollections) state.fatonProfitCollections = [];
        state.fatonProfitCollections.push({
            id: Date.now(),
            type: profitType,
            amount: amount,
            deductAmount: profitType === 'deduct_from_debt' ? amount : 0,
            cashAmount: profitType === 'faton_returns_cash' ? amount : 0,
            date: new Date().toISOString().split('T')[0],
            note: 'Auto: Fatura e paguar - ' + getProduct(sale.productId).name
        });
        showToast(t('collect_profit') + ': ' + amount + ' den', 'success');
    }

    saveState();
    closeModal();
    refreshAll();
    checkNotifications();
}

function filterSales() {
    refreshSales();
}

// ===================== STOCK =====================
function openStockModal() {
    let html = `
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="stock-product">
                ${PRODUCTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="stock-quantity" min="1" value="1">
        </div>
        <div class="form-group">
            <label>${t('expiry_date')} (${t('optional')}):</label>
            <input type="date" id="stock-expiry">
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="stock-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <button class="btn btn-primary" onclick="addStock()" style="width:100%;">${t('add_stock')}</button>
    `;
    openModal(t('add_stock'), html);
}

function addStock() {
    const productId = document.getElementById('stock-product').value;
    const quantity = parseInt(document.getElementById('stock-quantity').value) || 0;
    const expiry = document.getElementById('stock-expiry').value;
    const date = document.getElementById('stock-date').value;

    if (quantity <= 0) return;

    state.stock[productId] = (state.stock[productId] || 0) + quantity;

    // Add to Faton purchases (tracks all stock bought from Faton)
    const product = getProduct(productId);
    if (!state.fatonPurchases) state.fatonPurchases = [];
    state.fatonPurchases.push({
        id: Date.now(),
        productId,
        quantity,
        total: product.buyPrice * quantity,
        date
    });

    // Add batch for expiry tracking
    if (expiry) {
        state.stockBatches.push({
            id: Date.now(),
            productId,
            quantity,
            expiry,
            date
        });
    }

    saveState();
    closeModal();
    refreshAll();
    checkNotifications();
    showToast(t('add_stock') + ': ' + product.name + ' x' + quantity, 'success');
    logActivity('Stock Added', `${quantity}x ${product.name}`);
}

function refreshStock() {
    const container = document.getElementById('stock-cards');
    container.innerHTML = '';

    PRODUCTS.forEach(p => {
        const count = state.stock[p.id] || 0;
        const isLow = count < 10;
        // Feature 14: Smart stock depletion
        const depletionDays = calcStockDepletionDays(p.id);
        const depletionHtml = depletionDays !== null ? `<div style="color:${depletionDays < 7 ? 'var(--danger)' : 'var(--warning)'};margin-top:5px;font-size:0.85em;"><i class="fas fa-hourglass-half"></i> Do te mbaroje per ~${depletionDays} dite</div>` : '';
        container.innerHTML += `
            <div class="stock-card" style="cursor:pointer;" onclick="showProductHistory('${p.id}')">
                <h4>${p.name}</h4>
                <div class="stock-count ${isLow ? 'stock-low' : ''}">${count}</div>
                <div class="stock-info">${t('pieces')}</div>
                <div class="stock-info">${t('buy_price')}: ${p.buyPrice} ден | ${t('sell_price')}: ${p.sellPrice} ден</div>
                ${isLow ? `<div style="color:var(--danger);margin-top:5px;font-size:0.85em;"><i class="fas fa-exclamation-triangle"></i> ${t('low_stock')}</div>` : ''}
                ${depletionHtml}
                <div style="margin-top:10px;" id="qr-${p.id}"></div>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();showQR('${p.id}')" style="margin-top:8px;"><i class="fas fa-qrcode"></i> ${t('qr_code')}</button>
            </div>
        `;
    });

    // Expiry table
    const expiryBody = document.getElementById('expiry-body');
    expiryBody.innerHTML = '';
    state.stockBatches.forEach(batch => {
        const product = getProduct(batch.productId);
        const daysLeft = Math.ceil((new Date(batch.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        let status = t('ok_status');
        let statusClass = '';
        if (daysLeft < 0) { status = t('expired'); statusClass = 'color:var(--danger)'; }
        else if (daysLeft < 14) { status = t('expiring_soon'); statusClass = 'color:var(--warning)'; }

        expiryBody.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>${batch.quantity}</td>
                <td>${batch.expiry}</td>
                <td>${daysLeft}</td>
                <td style="${statusClass}">${status}</td>
            </tr>
        `;
    });
}

function showQR(productId) {
    const el = document.getElementById(`qr-${productId}`);
    el.innerHTML = '';
    const product = getProduct(productId);
    new QRCode(el, {
        text: JSON.stringify({ product: product.name, price: product.sellPrice }),
        width: 100,
        height: 100
    });
}

// ===================== CLIENTS =====================
function openClientModal(editId) {
    const isEdit = editId !== undefined;
    const client = isEdit ? state.clients.find(c => c.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>${t('name')}:</label>
            <input type="text" id="client-name" value="${client ? client.name : ''}" placeholder="${t('enter_name')}">
        </div>
        <div class="form-group">
            <label>${t('phone')}:</label>
            <input type="text" id="client-phone" value="${client ? client.phone || '' : ''}" placeholder="${t('enter_phone')}">
        </div>
        <div class="form-group">
            <label>${t('email')} (${t('optional')}):</label>
            <input type="email" id="client-email" value="${client ? client.email || '' : ''}">
        </div>
        <div class="form-group">
            <label>${t('address')} (${t('optional')}):</label>
            <input type="text" id="client-address" value="${client ? client.address || '' : ''}">
        </div>
        <div class="form-group">
            <label>Credit Limit (den) (${t('optional')}):</label>
            <input type="number" id="client-credit-limit" min="0" value="${client && client.creditLimit ? client.creditLimit : ''}" placeholder="0 = no limit">
        </div>
        <div class="form-group">
            <label>Category:</label>
            <select id="client-category">
                ${state.clientCategories.map(cat => `<option value="${cat}" ${client && client.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateClient('${editId}')` : 'addClient()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('add_client')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('add_client'), html);
}

function addClient() {
    const name = document.getElementById('client-name').value.trim();
    if (!name) return;

    const creditLimitEl = document.getElementById('client-credit-limit');
    const creditLimit = creditLimitEl ? parseFloat(creditLimitEl.value) || 0 : 0;
    const categoryEl = document.getElementById('client-category');
    const category = categoryEl ? categoryEl.value : 'Regular';

    state.clients.push({
        id: Date.now().toString(),
        name,
        phone: document.getElementById('client-phone').value,
        email: document.getElementById('client-email').value,
        address: document.getElementById('client-address').value,
        creditLimit,
        category,
        debt: 0
    });
    logActivity('client', 'Klient i ri: ' + name, 'clients');
    saveState();
    closeModal();
    refreshClients();
}

function updateClient(id) {
    const client = state.clients.find(c => c.id === id);
    if (!client) return;

    const creditLimitEl = document.getElementById('client-credit-limit');
    const creditLimit = creditLimitEl ? parseFloat(creditLimitEl.value) || 0 : 0;
    const categoryEl = document.getElementById('client-category');
    const category = categoryEl ? categoryEl.value : 'Regular';

    client.name = document.getElementById('client-name').value.trim();
    client.phone = document.getElementById('client-phone').value;
    client.email = document.getElementById('client-email').value;
    client.address = document.getElementById('client-address').value;
    client.creditLimit = creditLimit;
    client.category = category;
    saveState();
    closeModal();
    refreshClients();
}

function deleteClient(id) {
    if (!confirm(t('confirm_delete'))) return;
    const client = state.clients.find(c => c.id === id);
    logActivity('client', 'Klient fshirë: ' + (client ? client.name : id), 'clients');
    state.clients = state.clients.filter(c => c.id !== id);
    saveState();
    refreshClients();
}

function payClientDebt(id) {
    const client = state.clients.find(c => c.id === id);
    if (!client) return;
    let html = `
        <div class="form-group">
            <label>${t('amount')} (${t('debt')}: ${client.debt} ден):</label>
            <input type="number" id="debt-amount" value="${client.debt}" min="0" max="${client.debt}">
        </div>
        <button class="btn btn-primary" onclick="processDebtPayment('${id}')" style="width:100%;">${t('pay_debt')}</button>
    `;
    openModal(t('pay_debt') + ' - ' + client.name, html);
}

function processDebtPayment(id) {
    const amount = parseInt(document.getElementById('debt-amount').value) || 0;
    const client = state.clients.find(c => c.id === id);
    if (client) {
        client.debt = Math.max(0, client.debt - amount);

        // Feature 7: Add to client payment history
        addClientPaymentLog(id, amount, 'Cash', 'Debt payment');

        // Feature 19: Activity log
        logActivity('Client Payment', `${client.name} paid ${amount} den`);

        saveState();
        closeModal();
        refreshClients();
    }
}

function refreshClients() {
    const tbody = document.getElementById('clients-body');
    tbody.innerHTML = '';
    const search = (document.getElementById('clients-search').value || '').toLowerCase();

    // Feature 8: Category filter
    const categoryFilter = document.getElementById('clients-category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : '';

    let clients = state.clients.filter(c => {
        const matchesSearch = !search || c.name.toLowerCase().includes(search);
        const matchesCategory = !selectedCategory || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Feature 24: Pin/favorite clients - pinned first
    const pinned = state.pinnedClients || [];
    clients.sort((a, b) => {
        const aPin = pinned.includes(a.id) ? 0 : 1;
        const bPin = pinned.includes(b.id) ? 0 : 1;
        return aPin - bPin;
    });

    clients.forEach(c => {
        const clientSales = state.sales.filter(s => s.clientId === c.id);
        const totalPurchases = clientSales.reduce((sum, s) => sum + s.sellTotal, 0);
        const clientCash = clientSales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0);
        const clientOpenInvoices = clientSales.filter(s => s.paymentType === 'invoice_60' && !s.invoicePaid);
        const clientOpenInvoiceTotal = clientOpenInvoices.reduce((sum, s) => sum + s.sellTotal, 0);
        const clientOverdue = clientOpenInvoices.filter(s => s.dueDate && s.dueDate < new Date().toISOString().split('T')[0]);
        const clientOverdueTotal = clientOverdue.reduce((sum, s) => sum + s.sellTotal, 0);

        // Feature 13: Client margin/stats
        const clientProfit = clientSales.reduce((sum, s) => sum + s.profit, 0);
        const avgPerOrder = clientSales.length > 0 ? Math.round(clientProfit / clientSales.length) : 0;
        const uniqueDates = [...new Set(clientSales.map(s => s.date))];
        const frequency = uniqueDates.length;
        const isPinned = pinned.includes(c.id);

        tbody.innerHTML += `
            <tr>
                <td>${isPinned ? '<i class="fas fa-star" style="color:var(--warning);margin-right:4px;"></i>' : ''}<span style="cursor:pointer;color:var(--primary);text-decoration:underline;" onclick="openClient360('${c.id}')">${c.name}</span></td>
                <td>${c.phone || '-'}</td>
                <td>${totalPurchases} ден</td>
                <td>${clientCash} ден</td>
                <td>${clientOpenInvoices.length > 0 ? `<span style="color:var(--warning)">${clientOpenInvoices.length} (${clientOpenInvoiceTotal} ден)</span>` : '-'}</td>
                <td>${clientOverdue.length > 0 ? `<span style="color:var(--danger)">${clientOverdue.length} (${clientOverdueTotal} ден)</span>` : '-'}</td>
                <td style="${c.debt > 0 ? 'color:var(--danger)' : ''}">${c.debt || 0} ден</td>
                <td>${clientProfit} ден</td>
                <td>${avgPerOrder} ден</td>
                <td>${frequency}x</td>
                <td>
                    <button class="btn btn-sm ${isPinned ? 'btn-warning' : 'btn-secondary'}" onclick="togglePinClient('${c.id}')" title="${isPinned ? 'Hiq pin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="openClientModal('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteClient('${c.id}')"><i class="fas fa-trash"></i></button>
                    ${c.debt > 0 ? `<button class="btn btn-sm btn-success" onclick="payClientDebt('${c.id}')"><i class="fas fa-money-bill"></i></button>` : ''}
                    ${clientOpenInvoices.length > 0 ? `<button class="btn btn-sm btn-secondary" onclick="showClientInvoices('${c.id}')"><i class="fas fa-file-invoice"></i></button>` : ''}
                    ${c.phone ? `<button class="btn btn-sm" style="background:#25D366; color:white;" onclick="sendWhatsApp('${c.phone}', 'Përshëndetje ${c.name}')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>` : ''}
                    ${c.phone ? `<button class="btn btn-sm btn-secondary" onclick="showWhatsAppTemplates('${c.phone}', '${c.name}')" title="Shabllone WhatsApp"><i class="fas fa-comment-dots"></i></button>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="showClientPaymentHistory('${c.id}')" title="Historia"><i class="fas fa-history"></i></button>
                    <button class="btn btn-sm btn-success" onclick="openQuickCollectModal('${c.id}')" title="Mbledh Pagese"><i class="fas fa-hand-holding-usd"></i></button>
                    <button class="btn btn-sm btn-info" onclick="showClientQR('${c.id}')" title="QR Kod"><i class="fas fa-qrcode"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="generateClientStatement('${c.id}')" title="Pasqyrë"><i class="fas fa-file-alt"></i></button>
                    ${c.debt > 0 ? `<button class="btn btn-sm btn-warning" onclick="sendClientDebtWhatsApp('${c.id}')" title="Kujto Borxhin"><i class="fas fa-comment-dollar"></i></button>` : ''}
                    ${c.debt > 0 ? `<button class="btn btn-sm btn-info" onclick="openClientInstallmentModal('${c.id}')" title="Këste"><i class="fas fa-calendar-check"></i></button>` : ''}
                    ${c.debt > 0 ? `<button class="btn btn-sm btn-success" onclick="openEarlyPaymentModal('${c.id}')" title="Zbritje e Hershme"><i class="fas fa-percentage"></i></button>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="showClientPaymentChart('${c.id}')" title="Grafiku"><i class="fas fa-chart-line"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="printClientHistory('${c.id}')" title="Printo"><i class="fas fa-print"></i></button>
                </td>
            </tr>
        `;
    });
}

function showClientInvoices(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const invoices = state.sales.filter(s => s.clientId === clientId && s.paymentType === 'invoice_60');

    let html = `<div class="table-container"><table><thead><tr>
        <th>${t('date')}</th><th>${t('product')}</th><th>${t('total')}</th>
        <th>${t('invoice_due_date')}</th><th>${t('status')}</th><th>${t('actions')}</th>
    </tr></thead><tbody>`;

    invoices.forEach(s => {
        const product = getProduct(s.productId);
        const realIndex = state.sales.indexOf(s);
        let statusHtml = '';
        if (s.invoicePaid) {
            statusHtml = `<span style="color:var(--success)">${t('paid')}</span>`;
        } else {
            const daysLeft = s.dueDate ? Math.ceil((new Date(s.dueDate) - new Date()) / (1000*60*60*24)) : 0;
            if (daysLeft < 0) {
                statusHtml = `<span style="color:var(--danger)">${t('overdue')} (${Math.abs(daysLeft)}d)</span>`;
            } else {
                statusHtml = `<span style="color:var(--warning)">${t('unpaid')} (${daysLeft}d)</span>`;
            }
        }
        html += `<tr>
            <td>${s.date}</td>
            <td>${product.name} x${s.quantity}</td>
            <td>${s.sellTotal} ден</td>
            <td>${s.dueDate || '-'}</td>
            <td>${statusHtml}</td>
            <td>${!s.invoicePaid ? `<button class="btn btn-sm btn-success" onclick="markInvoicePaid(${realIndex});closeModal();"><i class="fas fa-check"></i> ${t('mark_paid')}</button>` : ''}</td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    openModal(t('client_invoices') + ' - ' + client.name, html);
}

function filterClients() {
    refreshClients();
}

// ===================== ORDERS =====================
function openOrderModal(editId) {
    const isEdit = editId !== undefined;
    const order = isEdit ? state.orders[editId] : null;

    let html = `
        <div class="form-group">
            <label>${t('client')}:</label>
            <select id="order-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}" ${order && order.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="order-product">
                ${PRODUCTS.map(p => `<option value="${p.id}" ${order && order.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="order-quantity" min="1" value="${order ? order.quantity : 1}">
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="order-date" value="${order ? order.date : new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="order-note">${order ? order.note || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateOrder(${editId})` : 'addOrder()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('new_order')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('new_order'), html);
}

function addOrder() {
    const clientId = document.getElementById('order-client').value;
    const productId = document.getElementById('order-product').value;
    const quantity = parseInt(document.getElementById('order-quantity').value) || 0;
    const date = document.getElementById('order-date').value;
    const note = document.getElementById('order-note').value;

    state.orders.push({
        id: Date.now(),
        clientId,
        productId,
        quantity,
        date,
        note,
        status: 'pending'
    });
    const product = getProduct(productId);
    logActivity('order', 'Porosi: ' + (product ? product.name : productId) + ' x' + quantity, 'orders');
    saveState();
    closeModal();
    refreshOrders();
}

function updateOrder(index) {
    state.orders[index] = {
        ...state.orders[index],
        clientId: document.getElementById('order-client').value,
        productId: document.getElementById('order-product').value,
        quantity: parseInt(document.getElementById('order-quantity').value) || 0,
        date: document.getElementById('order-date').value,
        note: document.getElementById('order-note').value,
    };
    saveState();
    closeModal();
    refreshOrders();
}

function changeOrderStatus(index, status) {
    state.orders[index].status = status;
    if (status === 'completed') {
        // Convert order to sale
        const order = state.orders[index];
        const product = getProduct(order.productId);
        state.sales.push({
            id: Date.now(),
            productId: order.productId,
            quantity: order.quantity,
            discount: 0,
            sellTotal: product.sellPrice * order.quantity,
            buyTotal: product.buyPrice * order.quantity,
            profit: (product.sellPrice - product.buyPrice) * order.quantity,
            clientId: order.clientId,
            location: '',
            date: new Date().toISOString().split('T')[0],
            note: 'Nga porosi',
            isDebt: false
        });
        state.stock[order.productId] = Math.max(0, (state.stock[order.productId] || 0) - order.quantity);
    }
    saveState();
    refreshOrders();
    refreshAll();
}

function deleteOrder(index) {
    if (!confirm(t('confirm_delete'))) return;
    state.orders.splice(index, 1);
    saveState();
    refreshOrders();
}

function refreshOrders() {
    const tbody = document.getElementById('orders-body');
    tbody.innerHTML = '';

    state.orders.forEach((o, i) => {
        const product = getProduct(o.productId);
        const client = state.clients.find(c => c.id === o.clientId);
        const statusColors = { pending: 'var(--warning)', completed: 'var(--success)', cancelled: 'var(--danger)' };

        tbody.innerHTML += `
            <tr>
                <td>${o.date}</td>
                <td>${client ? client.name : '-'}</td>
                <td>${product.name}</td>
                <td>${o.quantity}</td>
                <td style="color:${statusColors[o.status] || ''}">${t(o.status)}</td>
                <td>
                    ${o.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="changeOrderStatus(${i},'completed')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="changeOrderStatus(${i},'cancelled')"><i class="fas fa-times"></i></button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="openOrderModal(${i})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOrder(${i})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// ===================== FATON ACCOUNT =====================
function calcFatonDebt() {
    // Cash debt: all stock purchases minus cash payments made to Faton
    // Invoice sales are paid by client directly, so they don't add to debt
    const purchases = (state.fatonPurchases || []).reduce((sum, p) => sum + p.total, 0);
    const payments = state.fatonPayments.reduce((sum, p) => sum + p.amount, 0);

    // Subtract amounts that were deducted from debt via profit collection
    const deductedFromDebt = (state.fatonProfitCollections || [])
        .filter(c => c.type === 'deduct_from_debt' || c.type === 'combination')
        .reduce((sum, c) => sum + (c.deductAmount || 0), 0);

    return purchases - payments - deductedFromDebt;
}

function calcFatonProfitOwed() {
    // Total profit from invoice sales (client pays Faton, profit belongs to us)
    const profitOwed = (state.fatonProfitOwed || []).reduce((sum, p) => sum + p.profit, 0);
    return profitOwed;
}

function calcFatonProfitCollected() {
    const collected = (state.fatonProfitCollections || []).reduce((sum, c) => sum + c.amount, 0);
    return collected;
}

function openFatonPaymentModal(editIndex) {
    const isEdit = editIndex !== undefined;
    const existing = isEdit ? state.fatonPayments[editIndex] : null;
    const currentDebt = calcFatonDebt();

    // Last 5 payments
    const last5 = [...state.fatonPayments].reverse().slice(0, 5);
    let last5html = '';
    if (last5.length > 0 && !isEdit) {
        last5html = '<div style="margin-bottom:12px;"><small style="color:var(--text-secondary);">5 pagesat e fundit:</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">';
        last5.forEach(p => {
            last5html += '<span style="background:var(--bg-primary);padding:3px 8px;border-radius:12px;font-size:0.78em;">' + p.date.slice(5) + ': <strong>' + p.amount + '</strong> den</span>';
        });
        last5html += '</div></div>';
    }

    // Quick pay buttons
    const halfDebt = Math.round(currentDebt / 2);
    let quickBtns = '';
    if (!isEdit && currentDebt > 0) {
        quickBtns = '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">';
        quickBtns += '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'faton-amount\').value=' + currentDebt + ';document.getElementById(\'faton-amount\').dispatchEvent(new Event(\'input\'));">Paguaj gjithcka (' + currentDebt + ')</button>';
        quickBtns += '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'faton-amount\').value=' + halfDebt + ';document.getElementById(\'faton-amount\').dispatchEvent(new Event(\'input\'));">Gjysma (' + halfDebt + ')</button>';
        quickBtns += '</div>';
    }

    let html = `
        <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:15px;">
            <p><strong>Borxhi aktual:</strong> <span style="color:${currentDebt > 0 ? 'var(--danger)' : 'var(--success)'}">${currentDebt} den</span></p>
            <p id="faton-payment-preview" style="margin-top:5px;color:var(--success);display:none;"><strong>Pas pageses:</strong> <span id="faton-preview-amount"></span></p>
        </div>
        ${last5html}
        ${quickBtns}
        <div class="form-group">
            <label>${t('amount')}:</label>
            <input type="number" id="faton-amount" min="1" value="${isEdit ? existing.amount : ''}" placeholder="${t('enter_amount')}" oninput="updateFatonPaymentPreview(${currentDebt})">
        </div>
        <div class="form-group">
            <label>Kategoria e pageses:</label>
            <select id="faton-payment-category">
                <option value="cash" ${isEdit && existing.category === 'cash' ? 'selected' : ''}>Cash dorezim</option>
                <option value="bank_transfer" ${isEdit && existing.category === 'bank_transfer' ? 'selected' : ''}>Transfer bankar</option>
                <option value="deduction" ${isEdit && existing.category === 'deduction' ? 'selected' : ''}>Zbritje nga fitimi</option>
                <option value="goods" ${isEdit && existing.category === 'goods' ? 'selected' : ''}>Mall/Produkte</option>
                <option value="other" ${isEdit && existing.category === 'other' ? 'selected' : ''}>Tjeter</option>
            </select>
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="faton-date" value="${isEdit ? existing.date : new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="faton-note">${isEdit ? (existing.note || '') : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? 'updateFatonPayment(' + editIndex + ')' : 'addFatonPayment()'}" style="width:100%;">${isEdit ? 'Perditeso pagesen' : t('add_payment')}</button>
    `;
    openModal(isEdit ? 'Ndrysho pagesen' : t('add_payment'), html);
}

function updateFatonPaymentPreview(currentDebt) {
    const amount = parseInt(document.getElementById('faton-amount').value) || 0;
    const preview = document.getElementById('faton-payment-preview');
    const previewAmount = document.getElementById('faton-preview-amount');
    if (amount > 0) {
        const newDebt = currentDebt - amount;
        preview.style.display = 'block';
        previewAmount.textContent = newDebt + ' den';
        previewAmount.style.color = newDebt > 0 ? 'var(--danger)' : 'var(--success)';
    } else {
        preview.style.display = 'none';
    }
}

function addFatonPayment() {
    const amount = parseInt(document.getElementById('faton-amount').value) || 0;
    if (amount <= 0) return;

    const category = document.getElementById('faton-payment-category').value;
    const date = document.getElementById('faton-date').value;
    const note = document.getElementById('faton-note').value;

    function doPayment() {
        const payment = {
            id: Date.now(),
            amount,
            date: date,
            note: note,
            category: category
        };
        state.fatonPayments.push(payment);
        saveState();

        // Create receipt
        const receipt = createReceipt(payment, state.fatonPayments.length - 1);

        // Audit trail
        addPaymentAudit('PAGESE_RE', 'Shuma: ' + amount + ' den, Metoda: ' + getCategoryLabel(category) + (note ? ', Shenim: ' + note : ''));

        refreshFaton();
        refreshDashboard();
        logActivity('Faton Payment', amount + ' den - ' + getCategoryLabel(category));

        // Show confirmation modal instead of just toast
        showPaymentConfirmation(payment, receipt);
    }

    closeModal();
    verifyPinForPayment(doPayment);
}

function updateFatonPayment(index) {
    const amount = parseInt(document.getElementById('faton-amount').value) || 0;
    if (amount <= 0) return;
    const oldAmount = state.fatonPayments[index].amount;
    state.fatonPayments[index].amount = amount;
    state.fatonPayments[index].date = document.getElementById('faton-date').value;
    state.fatonPayments[index].note = document.getElementById('faton-note').value;
    state.fatonPayments[index].category = document.getElementById('faton-payment-category').value;
    saveState();
    addPaymentAudit('EDITIM_PAGESE', 'Index: ' + index + ', Shuma e vjeter: ' + oldAmount + ' den, Shuma e re: ' + amount + ' den');
    closeModal();
    refreshFaton();
    showToast('Pagesa u perditesua', 'success');
}

function deleteFatonPayment(index) {
    if (!confirm(t('confirm_delete'))) return;
    const payment = state.fatonPayments[index];
    addPaymentAudit('FSHIRJE_PAGESE', 'Shuma: ' + payment.amount + ' den, Data: ' + payment.date);
    state.fatonPayments.splice(index, 1);
    saveState();
    refreshFaton();
}

// ===================== PROFIT COLLECTION FROM FATON =====================
function openProfitCollectionModal() {
    const profitOwed = calcFatonProfitOwed();
    const profitCollected = calcFatonProfitCollected();
    const profitRemaining = profitOwed - profitCollected;
    const cashDebt = calcFatonDebt();

    if (profitRemaining <= 0) {
        openModal(t('collect_profit'), `<p>${t('no_data')}</p>`);
        return;
    }

    let html = `
        <div style="background:var(--bg-primary);padding:12px;border-radius:8px;margin-bottom:15px;">
            <p><strong>${t('faton_profit_remaining')}:</strong> ${profitRemaining} ден</p>
            <p><strong>${t('faton_cash_debt')}:</strong> ${cashDebt} ден</p>
        </div>
        <div class="form-group">
            <label>${t('profit_collection_type')}:</label>
            <select id="profit-collection-type" onchange="toggleProfitCollectionFields()">
                <option value="faton_returns_cash">${t('faton_returns_cash')}</option>
                <option value="deduct_from_debt">${t('deduct_from_debt')}</option>
                <option value="periodic_payment">${t('periodic_payment')}</option>
                <option value="combination">${t('combination')}</option>
            </select>
        </div>
        <div class="form-group" id="profit-amount-group">
            <label>${t('amount')}:</label>
            <input type="number" id="profit-collection-amount" min="1" max="${profitRemaining}" value="${profitRemaining}">
        </div>
        <div class="form-group hidden" id="profit-deduct-group">
            <label>${t('deduct_from_debt')} (${t('amount')}):</label>
            <input type="number" id="profit-deduct-amount" min="0" max="${Math.min(profitRemaining, cashDebt)}" value="${Math.min(profitRemaining, cashDebt)}">
        </div>
        <div class="form-group hidden" id="profit-cash-group">
            <label>${t('faton_returns_cash')} (${t('amount')}):</label>
            <input type="number" id="profit-cash-amount" min="0" value="0">
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="profit-collection-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="profit-collection-note"></textarea>
        </div>
        <button class="btn btn-success" onclick="addProfitCollection()" style="width:100%;">${t('collect_profit')}</button>
    `;
    openModal(t('collect_profit'), html);
}

function toggleProfitCollectionFields() {
    const type = document.getElementById('profit-collection-type').value;
    const amountGroup = document.getElementById('profit-amount-group');
    const deductGroup = document.getElementById('profit-deduct-group');
    const cashGroup = document.getElementById('profit-cash-group');

    amountGroup.classList.remove('hidden');
    deductGroup.classList.add('hidden');
    cashGroup.classList.add('hidden');

    if (type === 'combination') {
        amountGroup.classList.add('hidden');
        deductGroup.classList.remove('hidden');
        cashGroup.classList.remove('hidden');
    }
}

function addProfitCollection() {
    const type = document.getElementById('profit-collection-type').value;
    const date = document.getElementById('profit-collection-date').value;
    const note = document.getElementById('profit-collection-note').value;
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();

    if (!state.fatonProfitCollections) state.fatonProfitCollections = [];

    let amount = 0;
    let deductAmount = 0;
    let cashAmount = 0;

    if (type === 'combination') {
        deductAmount = parseInt(document.getElementById('profit-deduct-amount').value) || 0;
        cashAmount = parseInt(document.getElementById('profit-cash-amount').value) || 0;
        amount = deductAmount + cashAmount;
    } else if (type === 'deduct_from_debt') {
        amount = parseInt(document.getElementById('profit-collection-amount').value) || 0;
        deductAmount = amount;
    } else {
        // faton_returns_cash or periodic_payment
        amount = parseInt(document.getElementById('profit-collection-amount').value) || 0;
        cashAmount = amount;
    }

    if (amount <= 0 || amount > profitRemaining) return;

    state.fatonProfitCollections.push({
        id: Date.now(),
        type,
        amount,
        deductAmount,
        cashAmount,
        date,
        note
    });

    saveState();
    closeModal();
    refreshFaton();
    refreshDashboard();
    checkNotifications();
}

function deleteProfitCollection(index) {
    if (!confirm(t('confirm_delete'))) return;
    if (!state.fatonProfitCollections) return;
    state.fatonProfitCollections.splice(index, 1);
    saveState();
    refreshFaton();
}

// Installment planning
function openFatonInstallmentModal() {
    const debt = calcFatonDebt();
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();
    const totalOwed = debt + profitRemaining;

    let html = `
        <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:15px;">
            <p><strong>Borxhi total:</strong> ${totalOwed} den</p>
        </div>
        <div class="form-group">
            <label>Numri i kesteve:</label>
            <input type="number" id="installment-count" min="2" max="24" value="3" oninput="previewInstallments()">
        </div>
        <div class="form-group">
            <label>Data e pageses se pare:</label>
            <input type="date" id="installment-start" value="${new Date().toISOString().split('T')[0]}" onchange="previewInstallments()">
        </div>
        <div class="form-group">
            <label>Intervali (dite):</label>
            <input type="number" id="installment-interval" min="7" max="90" value="30" oninput="previewInstallments()">
        </div>
        <div id="installment-preview" style="margin:15px 0;"></div>
        <button class="btn btn-primary" onclick="saveFatonInstallments()" style="width:100%;">Ruaj planin e kesteve</button>
    `;
    openModal('Planifikimi i kesteve', html);
    setTimeout(previewInstallments, 100);
}

function previewInstallments() {
    const debt = calcFatonDebt() + (calcFatonProfitOwed() - calcFatonProfitCollected());
    const count = parseInt(document.getElementById('installment-count').value) || 3;
    const start = document.getElementById('installment-start').value;
    const interval = parseInt(document.getElementById('installment-interval').value) || 30;
    const perInstallment = Math.ceil(debt / count);

    let html = '<table class="data-table"><thead><tr><th>#</th><th>Data</th><th>Shuma</th></tr></thead><tbody>';
    let remaining = debt;
    for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + (i * interval));
        const amount = Math.min(perInstallment, remaining);
        remaining -= amount;
        html += '<tr><td>' + (i + 1) + '</td><td>' + d.toISOString().split('T')[0] + '</td><td>' + amount + ' den</td></tr>';
    }
    html += '</tbody></table>';
    document.getElementById('installment-preview').innerHTML = html;
}

function saveFatonInstallments() {
    const debt = calcFatonDebt() + (calcFatonProfitOwed() - calcFatonProfitCollected());
    const count = parseInt(document.getElementById('installment-count').value) || 3;
    const start = document.getElementById('installment-start').value;
    const interval = parseInt(document.getElementById('installment-interval').value) || 30;
    const perInstallment = Math.ceil(debt / count);

    const installments = [];
    let remaining = debt;
    for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + (i * interval));
        const amount = Math.min(perInstallment, remaining);
        remaining -= amount;
        installments.push({ date: d.toISOString().split('T')[0], amount, paid: false });
    }

    state.fatonInstallments = installments;
    saveState();
    closeModal();
    refreshFaton();
    showToast('Plani i kesteve u ruajt', 'success');
    logActivity('Faton', 'Plan kestesh: ' + count + ' x ' + perInstallment + ' den');
}

function markInstallmentPaid(index) {
    if (!state.fatonInstallments || !state.fatonInstallments[index]) return;
    state.fatonInstallments[index].paid = true;
    saveState();
    refreshFaton();
    showToast('Kesti u shenua si i paguar', 'success');
}

// Debt limit & reminder
function openFatonDebtLimitModal() {
    const currentLimit = state.fatonDebtLimit || 0;
    let html = `
        <div class="form-group">
            <label>Limiti i borxhit (den):</label>
            <input type="number" id="faton-debt-limit" min="0" value="${currentLimit}" placeholder="P.sh. 50000">
            <small style="color:var(--text-secondary);">Kur borxhi kalon kete limit, do te merrni njoftim</small>
        </div>
        <button class="btn btn-primary" onclick="saveFatonDebtLimit()" style="width:100%;margin-top:10px;">Ruaj limitin</button>
    `;
    openModal('Limiti i borxhit ndaj Fatonit', html);
}

function saveFatonDebtLimit() {
    state.fatonDebtLimit = parseInt(document.getElementById('faton-debt-limit').value) || 0;
    saveState();
    closeModal();
    refreshFaton();
    showToast('Limiti u vendos: ' + state.fatonDebtLimit + ' den', 'success');
}

// Monthly Faton Report
function openFatonMonthlyReport() {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const purchases = (state.fatonPurchases || []).filter(p => p.date && p.date.startsWith(key));
        const payments = state.fatonPayments.filter(p => p.date && p.date.startsWith(key));
        const collections = (state.fatonProfitCollections || []).filter(c => c.date && c.date.startsWith(key));

        months.push({
            label: d.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }),
            totalPurchases: purchases.reduce((s, p) => s + p.total, 0),
            totalPayments: payments.reduce((s, p) => s + p.amount, 0),
            totalCollections: collections.reduce((s, c) => s + c.amount, 0),
            purchaseCount: purchases.length,
            paymentCount: payments.length
        });
    }

    let html = '<table class="data-table"><thead><tr><th>Muaji</th><th>Blerje</th><th>Pagesa</th><th>Fitim mbledhur</th><th>Neto</th></tr></thead><tbody>';
    months.forEach(m => {
        const net = m.totalPayments + m.totalCollections - m.totalPurchases;
        html += '<tr>';
        html += '<td><strong>' + m.label + '</strong></td>';
        html += '<td style="color:var(--danger);">-' + m.totalPurchases + ' den <small>(' + m.purchaseCount + ')</small></td>';
        html += '<td style="color:var(--success);">+' + m.totalPayments + ' den <small>(' + m.paymentCount + ')</small></td>';
        html += '<td style="color:var(--accent);">+' + m.totalCollections + ' den</td>';
        html += '<td style="color:' + (net >= 0 ? 'var(--success)' : 'var(--danger)') + ';font-weight:bold;">' + (net >= 0 ? '+' : '') + net + ' den</td>';
        html += '</tr>';
    });
    html += '</tbody></table>';

    openModal('Raporti mujor - Fatoni', html);
}

function getCategoryLabel(cat) {
    const labels = {
        'cash': 'Cash dorezim',
        'bank_transfer': 'Transfer bankar',
        'deduction': 'Zbritje',
        'goods': 'Mall/Produkte',
        'other': 'Tjeter'
    };
    return labels[cat] || cat || 'Cash dorezim';
}

function getCategoryIcon(cat) {
    const icons = {
        'cash': 'fa-money-bill-wave',
        'bank_transfer': 'fa-university',
        'deduction': 'fa-percentage',
        'goods': 'fa-box',
        'other': 'fa-ellipsis-h'
    };
    return icons[cat] || 'fa-money-bill-wave';
}

function refreshFaton() {
    const purchases = state.fatonPurchases || [];
    const totalPurchased = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaid = state.fatonPayments.reduce((sum, p) => sum + p.amount, 0);

    const deductedFromDebt = (state.fatonProfitCollections || [])
        .filter(c => c.type === 'deduct_from_debt' || c.type === 'combination')
        .reduce((sum, c) => sum + (c.deductAmount || 0), 0);
    const cashDebt = totalPurchased - totalPaid - deductedFromDebt;

    document.getElementById('faton-total-purchased').textContent = totalPurchased + ' den';
    document.getElementById('faton-total-paid').textContent = totalPaid + ' den';
    document.getElementById('faton-remaining').textContent = cashDebt + ' den';

    // Profit from invoice sales
    const profitOwed = calcFatonProfitOwed();
    const profitCollected = calcFatonProfitCollected();
    const profitRemaining = profitOwed - profitCollected;

    document.getElementById('faton-invoice-profit-total').textContent = profitOwed + ' den';
    document.getElementById('faton-profit-collected').textContent = profitCollected + ' den';
    document.getElementById('faton-profit-remaining').textContent = profitRemaining + ' den';

    // Feature 1: Net total balance
    const netTotal = cashDebt + profitRemaining;
    const netEl = document.getElementById('faton-net-total');
    const netBalance = document.getElementById('faton-net-balance');
    const netBreakdown = document.getElementById('faton-net-breakdown');
    if (netEl) {
        netEl.textContent = netTotal + ' den';
        netBreakdown.textContent = 'Cash borxh: ' + cashDebt + ' den | Fitim pa mbledhur: ' + profitRemaining + ' den';
        if (netTotal <= 0) netBalance.className = 'faton-net-balance faton-debt-clear';
        else if (netTotal > (state.fatonDebtLimit || 999999)) netBalance.className = 'faton-net-balance faton-debt-danger';
        else if (netTotal > (state.fatonDebtLimit || 999999) * 0.7) netBalance.className = 'faton-net-balance faton-debt-warning';
        else netBalance.className = 'faton-net-balance';
    }

    // Feature 2: Color coding on debt cards
    const debtCard = document.getElementById('faton-card-debt');
    const profitCard = document.getElementById('faton-card-profit-remaining');
    if (debtCard) {
        debtCard.style.borderLeft = cashDebt <= 0 ? '4px solid var(--success)' : cashDebt > 30000 ? '4px solid var(--danger)' : '4px solid var(--warning)';
    }
    if (profitCard) {
        profitCard.style.borderLeft = profitRemaining <= 0 ? '4px solid var(--success)' : profitRemaining > 20000 ? '4px solid var(--danger)' : '4px solid var(--warning)';
    }

    // Feature 8: Debt limit warning
    if (state.fatonDebtLimit && netTotal > state.fatonDebtLimit) {
        const limitWarning = document.getElementById('faton-net-breakdown');
        if (limitWarning) limitWarning.innerHTML += ' <span style="color:var(--danger);font-weight:bold;"> | KUJDES: Limiti ' + state.fatonDebtLimit + ' den u kalua!</span>';
    }

    // Feature 6: Unified timeline
    const timelineBody = document.getElementById('faton-timeline-body');
    if (timelineBody) {
        const filterFrom = document.getElementById('faton-timeline-from') ? document.getElementById('faton-timeline-from').value : '';
        const filterTo = document.getElementById('faton-timeline-to') ? document.getElementById('faton-timeline-to').value : '';
        const filterType = document.getElementById('faton-timeline-type') ? document.getElementById('faton-timeline-type').value : '';

        let events = [];

        // Add purchases
        purchases.forEach(p => {
            const product = getProduct(p.productId);
            events.push({
                date: p.date,
                type: 'purchase',
                label: 'Blerje',
                icon: 'fa-shopping-cart',
                color: 'var(--danger)',
                desc: (product ? product.name : '-') + ' x' + p.quantity,
                amount: -p.total,
                raw: p
            });
        });

        // Add payments
        state.fatonPayments.forEach((p, i) => {
            events.push({
                date: p.date,
                type: 'payment',
                label: getCategoryLabel(p.category),
                icon: getCategoryIcon(p.category),
                color: 'var(--success)',
                desc: (p.note || 'Pagese') + (p.category ? ' [' + getCategoryLabel(p.category) + ']' : ''),
                amount: p.amount,
                raw: p,
                editIndex: i
            });
        });

        // Add profit collections
        (state.fatonProfitCollections || []).forEach((c, i) => {
            let typeLabel = '';
            switch (c.type) {
                case 'faton_returns_cash': typeLabel = 'Kthim cash'; break;
                case 'deduct_from_debt': typeLabel = 'Zbritje nga borxhi'; break;
                case 'periodic_payment': typeLabel = 'Pagese periodike'; break;
                case 'combination': typeLabel = 'Kombinim'; break;
            }
            events.push({
                date: c.date,
                type: 'profit_collection',
                label: 'Fitim: ' + typeLabel,
                icon: 'fa-hand-holding-usd',
                color: 'var(--accent)',
                desc: (c.note || typeLabel) + ' - ' + c.amount + ' den',
                amount: c.amount,
                raw: c,
                collectionIndex: i
            });
        });

        // Apply filters
        if (filterFrom) events = events.filter(e => e.date >= filterFrom);
        if (filterTo) events = events.filter(e => e.date <= filterTo);
        if (filterType) events = events.filter(e => e.type === filterType);

        // Sort by date descending
        events.sort((a, b) => b.date.localeCompare(a.date));

        // Calculate running balance
        let runningBalance = 0;
        const sortedAsc = [...events].reverse();
        const balances = new Map();
        sortedAsc.forEach((e, i) => {
            if (e.type === 'purchase') runningBalance += Math.abs(e.amount);
            else runningBalance -= e.amount;
            balances.set(sortedAsc.length - 1 - i, runningBalance);
        });

        timelineBody.innerHTML = '';
        events.forEach((e, i) => {
            const bal = balances.get(i) || 0;
            let actions = '';
            if (e.type === 'payment' && e.editIndex !== undefined) {
                actions = '<button class="btn btn-sm btn-secondary" onclick="openFatonPaymentModal(' + e.editIndex + ')"><i class="fas fa-edit"></i></button> ' +
                          '<button class="btn btn-sm btn-danger" onclick="deleteFatonPayment(' + e.editIndex + ')"><i class="fas fa-trash"></i></button>';
            } else if (e.type === 'profit_collection' && e.collectionIndex !== undefined) {
                actions = '<button class="btn btn-sm btn-danger" onclick="deleteProfitCollection(' + e.collectionIndex + ')"><i class="fas fa-trash"></i></button>';
            }

            timelineBody.innerHTML += '<tr>' +
                '<td>' + e.date + '</td>' +
                '<td><span style="color:' + e.color + ';"><i class="fas ' + e.icon + '"></i> ' + e.label + '</span></td>' +
                '<td>' + e.desc + '</td>' +
                '<td style="color:' + (e.type === 'purchase' ? 'var(--danger)' : 'var(--success)') + ';font-weight:bold;">' + (e.type === 'purchase' ? '' : '+') + (e.type === 'purchase' ? e.amount : e.amount) + ' den</td>' +
                '<td style="font-weight:bold;color:' + (bal > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + bal + ' den</td>' +
                '<td>' + actions + '</td>' +
                '</tr>';
        });
    }

    // Feature 7: Installment plan display
    const installmentDiv = document.getElementById('faton-installment-plan');
    if (installmentDiv && state.fatonInstallments && state.fatonInstallments.length > 0) {
        let html = '<div style="background:var(--bg-secondary);padding:15px;border-radius:10px;"><h4 style="margin-bottom:10px;"><i class="fas fa-calendar-check"></i> Plani i kesteve</h4>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;">';
        state.fatonInstallments.forEach((inst, i) => {
            const isOverdue = !inst.paid && inst.date < new Date().toISOString().split('T')[0];
            const bg = inst.paid ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--bg-primary)';
            const color = inst.paid || isOverdue ? 'white' : 'var(--text)';
            html += '<div style="background:' + bg + ';color:' + color + ';padding:10px 15px;border-radius:8px;border:1px solid var(--border);min-width:140px;text-align:center;">';
            html += '<div style="font-size:0.8em;opacity:0.8;">Kesti ' + (i + 1) + '</div>';
            html += '<div style="font-weight:bold;font-size:1.1em;">' + inst.amount + ' den</div>';
            html += '<div style="font-size:0.85em;">' + inst.date + '</div>';
            if (!inst.paid) html += '<button class="btn btn-sm" style="margin-top:5px;background:white;color:#333;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;" onclick="markInstallmentPaid(' + i + ')">Paguaj</button>';
            else html += '<div style="margin-top:5px;font-size:0.8em;"><i class="fas fa-check"></i> Paguar</div>';
            html += '</div>';
        });
        html += '</div></div>';
        installmentDiv.innerHTML = html;
    } else if (installmentDiv) {
        installmentDiv.innerHTML = '';
    }

    // Feature 11: Purchases vs Payments monthly chart
    renderFatonPurchasesVsPaymentsChart();

    // Mini dashboard
    renderFatonMiniDashboard();

    // Existing debt chart
    renderFatonDebtChart();

    // Design features
    initFatonDesignFeatures();

    // Check reminders
    checkFatonReminders();
}

function renderFatonPurchasesVsPaymentsChart() {
    const canvas = document.getElementById('faton-purchases-vs-payments-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy old chart
    if (window.fatonPvPChart) window.fatonPvPChart.destroy();

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7));
    }

    const purchaseData = months.map(m => (state.fatonPurchases || []).filter(p => p.date && p.date.startsWith(m)).reduce((s, p) => s + p.total, 0));
    const paymentData = months.map(m => state.fatonPayments.filter(p => p.date && p.date.startsWith(m)).reduce((s, p) => s + p.amount, 0));
    const labels = months.map(m => { const d = new Date(m + '-01'); return d.toLocaleDateString('sq-AL', { month: 'short', year: '2-digit' }); });

    window.fatonPvPChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Blerje', data: purchaseData, backgroundColor: 'rgba(214, 48, 49, 0.7)', borderRadius: 5 },
                { label: 'Pagesa', data: paymentData, backgroundColor: 'rgba(0, 184, 148, 0.7)', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ===================== PAYMENT RECEIPT SYSTEM =====================

// Generate unique payment number
function generatePaymentNumber() {
    const year = new Date().getFullYear();
    const count = (state.paymentReceipts || []).length + 1;
    return 'PAY-' + year + '-' + String(count).padStart(4, '0');
}

// Create receipt for a payment
function createReceipt(payment, paymentIndex) {
    if (!state.paymentReceipts) state.paymentReceipts = [];

    const debt = calcFatonDebt();
    const profitOwed = calcFatonProfitOwed();
    const profitCollected = calcFatonProfitCollected();
    const totalSales = state.sales.reduce((s, x) => s + x.sellTotal, 0);
    const totalProfit = state.sales.reduce((s, x) => s + x.profit, 0);
    const totalExpenses = state.expenses.reduce((s, x) => s + x.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    const receipt = {
        id: Date.now(),
        receiptNumber: generatePaymentNumber(),
        paymentId: payment.id,
        paymentIndex: paymentIndex,
        date: payment.date,
        amount: payment.amount,
        category: payment.category || 'cash',
        note: payment.note || '',
        // Balances at time of payment
        debtBefore: debt + payment.amount,
        debtAfter: debt,
        // Profit split
        totalNetProfit: netProfit,
        elezShare: calcOwnerShare(netProfit),
        orhanShare: calcPartnerShare(netProfit),
        profitSplitOwner: state.profitSplit.owner,
        profitSplitPartner: state.profitSplit.partner,
        // Faton balance
        fatonProfitRemaining: profitOwed - profitCollected,
        // Status
        status: 'confirmed',
        signature: null,
        proofImage: null,
        createdAt: new Date().toISOString()
    };

    state.paymentReceipts.push(receipt);
    saveState();
    return receipt;
}

// View receipt detail
function viewReceipt(receiptIndex) {
    const receipt = state.paymentReceipts[receiptIndex];
    if (!receipt) return;

    let html = '<div class="receipt-document">';
    html += '<div class="receipt-header">';
    html += '<h2 style="margin:0;color:#2c3e50;">HURMA APP</h2>';
    html += '<p style="margin:2px 0;color:#777;font-size:0.85em;">Deshmi Pagese / Payment Receipt</p>';
    html += '<div class="receipt-number">' + receipt.receiptNumber + '</div>';
    html += '</div>';

    html += '<div class="receipt-divider"></div>';

    html += '<div class="receipt-row"><span>Data:</span><strong>' + receipt.date + '</strong></div>';
    html += '<div class="receipt-row"><span>Shuma:</span><strong style="color:var(--success);font-size:1.2em;">' + receipt.amount + ' den</strong></div>';
    html += '<div class="receipt-row"><span>Metoda:</span><strong>' + getCategoryLabel(receipt.category) + '</strong></div>';
    if (receipt.note) html += '<div class="receipt-row"><span>Shenim:</span><strong>' + receipt.note + '</strong></div>';
    html += '<div class="receipt-row"><span>Statusi:</span><strong style="color:' + getStatusColor(receipt.status) + ';">' + getStatusLabel(receipt.status) + '</strong></div>';

    html += '<div class="receipt-divider"></div>';
    html += '<h4 style="margin:10px 0 8px;color:#2c3e50;">Bilanci</h4>';
    html += '<div class="receipt-row"><span>Borxhi para pageses:</span><strong style="color:var(--danger);">' + receipt.debtBefore + ' den</strong></div>';
    html += '<div class="receipt-row"><span>Borxhi pas pageses:</span><strong style="color:' + (receipt.debtAfter > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + receipt.debtAfter + ' den</strong></div>';
    html += '<div class="receipt-row"><span>Fitim Fatonit pa mbledhur:</span><strong>' + receipt.fatonProfitRemaining + ' den</strong></div>';

    html += '<div class="receipt-divider"></div>';
    html += '<h4 style="margin:10px 0 8px;color:#2c3e50;">Ndarja e Fitimit</h4>';
    html += '<div class="receipt-row"><span>Fitimi neto total:</span><strong>' + receipt.totalNetProfit + ' den</strong></div>';
    html += '<div class="receipt-row"><span>Elez (' + receipt.profitSplitOwner + '%):</span><strong style="color:var(--accent);">' + receipt.elezShare + ' den</strong></div>';
    html += '<div class="receipt-row"><span>' + state.partnerName + ' (' + receipt.profitSplitPartner + '%):</span><strong style="color:var(--accent);">' + receipt.orhanShare + ' den</strong></div>';

    // Signature area
    if (receipt.signature) {
        html += '<div class="receipt-divider"></div>';
        html += '<p style="font-size:0.8em;color:#777;">Nenshkrimi dixhital:</p>';
        html += '<img src="' + receipt.signature + '" style="max-width:200px;border:1px solid #ddd;border-radius:4px;">';
    }

    // Proof image
    if (receipt.proofImage) {
        html += '<div class="receipt-divider"></div>';
        html += '<p style="font-size:0.8em;color:#777;">Deshmi (foto):</p>';
        html += '<img src="' + receipt.proofImage + '" style="max-width:100%;border-radius:8px;">';
    }

    // QR Code
    html += '<div class="receipt-divider"></div>';
    html += '<div id="receipt-qr-' + receiptIndex + '" style="text-align:center;margin:10px 0;"></div>';

    html += '<div class="receipt-footer">';
    html += '<p>Gjeneruar nga Hurma App - ' + new Date().toLocaleDateString('sq-AL') + '</p>';
    html += '</div>';
    html += '</div>';

    // Action buttons
    html += '<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary" onclick="downloadReceiptPDF(' + receiptIndex + ')"><i class="fas fa-file-pdf"></i> Shkarko PDF</button>';
    html += '<button class="btn btn-success" onclick="shareReceiptWhatsApp(' + receiptIndex + ')"><i class="fab fa-whatsapp"></i> WhatsApp</button>';
    if (!receipt.signature) html += '<button class="btn btn-secondary" onclick="openSignatureModal(' + receiptIndex + ')"><i class="fas fa-signature"></i> Nenshkruaj</button>';
    if (!receipt.proofImage) html += '<button class="btn btn-secondary" onclick="uploadProofImage(' + receiptIndex + ')"><i class="fas fa-camera"></i> Shto deshmi</button>';
    if (receipt.status === 'confirmed') html += '<button class="btn btn-accent" onclick="verifyReceipt(' + receiptIndex + ')"><i class="fas fa-check-double"></i> Verifiko</button>';
    html += '</div>';

    openModal('Fatura #' + receipt.receiptNumber, html);

    // Generate QR code after modal opens
    setTimeout(() => {
        const qrContainer = document.getElementById('receipt-qr-' + receiptIndex);
        if (qrContainer && typeof QRCode !== 'undefined') {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: 'HURMA-PAY|' + receipt.receiptNumber + '|' + receipt.amount + '|' + receipt.date,
                width: 120,
                height: 120
            });
        }
    }, 200);
}

function getStatusColor(status) {
    const colors = { pending: 'var(--warning)', confirmed: 'var(--accent)', verified: 'var(--success)' };
    return colors[status] || 'var(--text)';
}

function getStatusLabel(status) {
    const labels = { pending: 'Ne pritje', confirmed: 'Konfirmuar', verified: 'Verifikuar' };
    return labels[status] || status;
}

function verifyReceipt(receiptIndex) {
    if (!state.paymentReceipts[receiptIndex]) return;
    state.paymentReceipts[receiptIndex].status = 'verified';
    saveState();
    viewReceipt(receiptIndex);
    showToast('Fatura u verifikua', 'success');
    logActivity('Receipt', 'Verifikuar: ' + state.paymentReceipts[receiptIndex].receiptNumber);
}

// Download receipt as PDF
function downloadReceiptPDF(receiptIndex) {
    const receipt = state.paymentReceipts[receiptIndex];
    if (!receipt) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('HURMA APP', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Deshmi Pagese / Payment Receipt', 105, 27, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(receipt.receiptNumber, 105, 36, { align: 'center' });

    // Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);

    // Payment details
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let y = 50;

    doc.text('Data:', 20, y);
    doc.text(receipt.date, 80, y);
    y += 8;

    doc.setFontSize(13);
    doc.text('Shuma:', 20, y);
    doc.setTextColor(39, 174, 96);
    doc.text(receipt.amount + ' den', 80, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Metoda:', 20, y);
    doc.text(getCategoryLabel(receipt.category), 80, y);
    y += 8;

    if (receipt.note) {
        doc.text('Shenim:', 20, y);
        doc.text(receipt.note, 80, y);
        y += 8;
    }

    doc.text('Statusi:', 20, y);
    doc.text(getStatusLabel(receipt.status), 80, y);
    y += 12;

    // Balance section
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Bilanci', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Borxhi para pageses:', 20, y);
    doc.setTextColor(214, 48, 49);
    doc.text(receipt.debtBefore + ' den', 80, y);
    y += 7;

    doc.setTextColor(0, 0, 0);
    doc.text('Borxhi pas pageses:', 20, y);
    doc.setTextColor(receipt.debtAfter > 0 ? 214 : 39, receipt.debtAfter > 0 ? 48 : 174, receipt.debtAfter > 0 ? 49 : 96);
    doc.text(receipt.debtAfter + ' den', 80, y);
    y += 12;

    // Profit split section
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Ndarja e Fitimit', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Fitimi neto total:', 20, y);
    doc.text(receipt.totalNetProfit + ' den', 80, y);
    y += 7;
    doc.text('Elez (' + receipt.profitSplitOwner + '%):', 20, y);
    doc.setTextColor(41, 128, 185);
    doc.text(receipt.elezShare + ' den', 80, y);
    y += 7;
    doc.setTextColor(0, 0, 0);
    doc.text(state.partnerName + ' (' + receipt.profitSplitPartner + '%):', 20, y);
    doc.setTextColor(41, 128, 185);
    doc.text(receipt.orhanShare + ' den', 80, y);
    y += 15;

    // Signature
    if (receipt.signature) {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.text('Nenshkrimi dixhital:', 20, y);
        y += 3;
        doc.addImage(receipt.signature, 'PNG', 20, y, 50, 25);
        y += 30;
    }

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 270, 190, 270);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gjeneruar nga Hurma App - ' + new Date().toLocaleDateString('sq-AL'), 105, 278, { align: 'center' });

    doc.save('Fatura_' + receipt.receiptNumber + '.pdf');
    showToast('PDF u shkarkua', 'success');
}

// Share receipt via WhatsApp
function shareReceiptWhatsApp(receiptIndex) {
    const receipt = state.paymentReceipts[receiptIndex];
    if (!receipt) return;

    let text = '*HURMA APP - Deshmi Pagese*\n';
    text += '━━━━━━━━━━━━━━━━\n';
    text += '*' + receipt.receiptNumber + '*\n\n';
    text += '*Data:* ' + receipt.date + '\n';
    text += '*Shuma:* ' + receipt.amount + ' den\n';
    text += '*Metoda:* ' + getCategoryLabel(receipt.category) + '\n';
    if (receipt.note) text += '*Shenim:* ' + receipt.note + '\n';
    text += '\n*Bilanci:*\n';
    text += 'Borxhi para: ' + receipt.debtBefore + ' den\n';
    text += 'Borxhi pas: ' + receipt.debtAfter + ' den\n';
    text += '\n*Ndarja e Fitimit:*\n';
    text += 'Fitimi neto: ' + receipt.totalNetProfit + ' den\n';
    text += 'Elez (' + receipt.profitSplitOwner + '%): ' + receipt.elezShare + ' den\n';
    text += state.partnerName + ' (' + receipt.profitSplitPartner + '%): ' + receipt.orhanShare + ' den\n';
    text += '\n_Gjeneruar nga Hurma App_';

    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// Digital signature
function openSignatureModal(receiptIndex) {
    let html = '<div style="text-align:center;">';
    html += '<p style="margin-bottom:10px;color:var(--text-secondary);">Nenshkruani me gisht ose mouse brenda zones:</p>';
    html += '<canvas id="signature-canvas" width="350" height="150" style="border:2px solid var(--border);border-radius:8px;background:white;cursor:crosshair;touch-action:none;"></canvas>';
    html += '<div style="display:flex;gap:8px;margin-top:12px;justify-content:center;">';
    html += '<button class="btn btn-secondary" onclick="clearSignature()"><i class="fas fa-eraser"></i> Pastro</button>';
    html += '<button class="btn btn-primary" onclick="saveSignature(' + receiptIndex + ')"><i class="fas fa-check"></i> Ruaj nenshkrimin</button>';
    html += '</div></div>';

    openModal('Nenshkrimi dixhital', html);

    setTimeout(() => {
        const canvas = document.getElementById('signature-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let drawing = false;

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }

        function startDraw(e) { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        function draw(e) { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#2c3e50'; ctx.lineTo(p.x, p.y); ctx.stroke(); }
        function stopDraw() { drawing = false; }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDraw);
        canvas.addEventListener('mouseleave', stopDraw);
        canvas.addEventListener('touchstart', startDraw);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDraw);

        window._signatureCanvas = canvas;
    }, 200);
}

function clearSignature() {
    const canvas = window._signatureCanvas || document.getElementById('signature-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignature(receiptIndex) {
    const canvas = window._signatureCanvas || document.getElementById('signature-canvas');
    if (!canvas || !state.paymentReceipts[receiptIndex]) return;
    state.paymentReceipts[receiptIndex].signature = canvas.toDataURL('image/png');
    saveState();
    closeModal();
    viewReceipt(receiptIndex);
    showToast('Nenshkrimi u ruajt', 'success');
}

// Upload proof image
function uploadProofImage(receiptIndex) {
    openModal('Ngarko Deshmi', `
        <div style="text-align:center;padding:15px;">
            <div style="font-size:3em;margin-bottom:10px;">📷</div>
            <p style="color:#888;margin-bottom:15px;">Zgjidhni foton e deshmisë</p>
            <input type="file" accept="image/*" capture="environment"
                onchange="_onProofImageSelected(this, ${receiptIndex})"
                style="width:100%;padding:15px;border:3px dashed var(--primary);border-radius:12px;font-size:1em;cursor:pointer;background:var(--bg-secondary);box-sizing:border-box;">
        </div>
    `);
}

function _onProofImageSelected(input, receiptIndex) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        state.paymentReceipts[receiptIndex].proofImage = ev.target.result;
        saveState();
        closeModal();
        viewReceipt(receiptIndex);
        showToast('Deshmi u shtua', 'success');
    };
    reader.readAsDataURL(file);
}

// Receipt history page
function showReceiptHistory() {
    if (!state.paymentReceipts || state.paymentReceipts.length === 0) {
        openModal('Historiku i faturave', '<p>Nuk ka fatura ende.</p>');
        return;
    }

    let html = '<div style="margin-bottom:10px;">';
    html += '<button class="btn btn-primary" onclick="exportAllReceiptsPDF()"><i class="fas fa-file-pdf"></i> Eksporto te gjitha ne PDF</button>';
    html += '</div>';
    html += '<table class="data-table"><thead><tr><th>#</th><th>Data</th><th>Shuma</th><th>Metoda</th><th>Statusi</th><th>Veprime</th></tr></thead><tbody>';

    [...state.paymentReceipts].reverse().forEach((r, i) => {
        const realIndex = state.paymentReceipts.length - 1 - i;
        html += '<tr>';
        html += '<td><strong>' + r.receiptNumber + '</strong></td>';
        html += '<td>' + r.date + '</td>';
        html += '<td style="font-weight:bold;color:var(--success);">' + r.amount + ' den</td>';
        html += '<td>' + getCategoryLabel(r.category) + '</td>';
        html += '<td><span style="color:' + getStatusColor(r.status) + ';font-weight:600;">' + getStatusLabel(r.status) + '</span></td>';
        html += '<td>';
        html += '<button class="btn btn-sm btn-primary" onclick="viewReceipt(' + realIndex + ')"><i class="fas fa-eye"></i></button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="downloadReceiptPDF(' + realIndex + ')"><i class="fas fa-file-pdf"></i></button> ';
        html += '<button class="btn btn-sm btn-success" onclick="shareReceiptWhatsApp(' + realIndex + ')"><i class="fab fa-whatsapp"></i></button>';
        html += '</td></tr>';
    });
    html += '</tbody></table>';

    openModal('Historiku i faturave (' + state.paymentReceipts.length + ')', html);
}

// Export all receipts to single PDF
function exportAllReceiptsPDF() {
    if (!state.paymentReceipts || state.paymentReceipts.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('HURMA APP - Te gjitha faturat', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Gjeneruar: ' + new Date().toLocaleDateString('sq-AL'), 105, 27, { align: 'center' });

    const headers = ['#', 'Data', 'Shuma', 'Metoda', 'Borxh Para', 'Borxh Pas', 'Elez', 'Orhan', 'Status'];
    const rows = state.paymentReceipts.map(r => [
        r.receiptNumber, r.date, r.amount + ' den', getCategoryLabel(r.category),
        r.debtBefore + ' den', r.debtAfter + ' den',
        r.elezShare + ' den', r.orhanShare + ' den',
        getStatusLabel(r.status)
    ]);

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 34,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save('Faturat_Te_Gjitha_' + new Date().toISOString().split('T')[0] + '.pdf');
    showToast('PDF me te gjitha faturat u shkarkua', 'success');
}

// ===================== ENHANCED PAYMENT MODAL (2-STEP) =====================

// Post-payment confirmation/summary modal
function showPaymentConfirmation(payment, receipt) {
    const debt = calcFatonDebt();
    const profitOwed = calcFatonProfitOwed();
    const profitCollected = calcFatonProfitCollected();
    const netTotal = debt + (profitOwed - profitCollected);
    const totalProfit = state.sales.reduce((s, x) => s + x.profit, 0);
    const totalExpenses = state.expenses.reduce((s, x) => s + x.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    let html = '<div style="text-align:center;padding:10px;">';
    html += '<div style="font-size:3em;color:var(--success);margin-bottom:10px;"><i class="fas fa-check-circle"></i></div>';
    html += '<h3 style="color:var(--success);margin-bottom:15px;">Pagesa u regjistrua me sukses!</h3>';
    html += '<div class="receipt-number" style="margin-bottom:15px;">' + receipt.receiptNumber + '</div>';

    html += '<div class="confirmation-grid">';
    html += '<div class="confirmation-card"><div class="conf-label">Pagesa</div><div class="conf-value" style="color:var(--success);">' + payment.amount + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Borxhi mbetur</div><div class="conf-value" style="color:' + (debt > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + debt + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Borxhi TOTAL</div><div class="conf-value" style="color:' + (netTotal > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + netTotal + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Fitimi i Elezit</div><div class="conf-value" style="color:var(--accent);">' + calcOwnerShare(netProfit) + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Fitimi i ' + state.partnerName + 'it</div><div class="conf-value" style="color:var(--accent);">' + calcPartnerShare(netProfit) + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Fatonit i ngelet</div><div class="conf-value">' + (profitOwed - profitCollected) + ' den</div></div>';
    html += '</div>';

    html += '<div style="display:flex;gap:8px;margin-top:20px;justify-content:center;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary" onclick="viewReceipt(' + (state.paymentReceipts.length - 1) + ')"><i class="fas fa-receipt"></i> Shiko faturen</button>';
    html += '<button class="btn btn-success" onclick="shareReceiptWhatsApp(' + (state.paymentReceipts.length - 1) + ')"><i class="fab fa-whatsapp"></i> Dergo WhatsApp</button>';
    html += '<button class="btn btn-secondary" onclick="downloadReceiptPDF(' + (state.paymentReceipts.length - 1) + ')"><i class="fas fa-file-pdf"></i> Shkarko PDF</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal()"><i class="fas fa-times"></i> Mbyll</button>';
    html += '</div></div>';

    openModal('Pagesa u konfirmua', html);
}

// ===================== PIN VERIFICATION FOR PAYMENTS =====================
function verifyPinForPayment(callback) {
    if (!state.pinEnabled || !state.pinCode) {
        callback();
        return;
    }
    let html = '<div style="text-align:center;">';
    html += '<p style="margin-bottom:15px;"><i class="fas fa-lock" style="font-size:2em;color:var(--warning);"></i></p>';
    html += '<p>Vendosni PIN per te konfirmuar pagesen:</p>';
    html += '<input type="password" id="payment-pin-input" maxlength="4" style="text-align:center;font-size:1.5em;letter-spacing:10px;width:150px;margin:15px auto;display:block;padding:10px;border:2px solid var(--border);border-radius:8px;">';
    html += '<button class="btn btn-primary" onclick="checkPaymentPin()" style="width:100%;margin-top:10px;">Konfirmo</button>';
    html += '</div>';
    openModal('Verifikimi PIN', html);
    window._paymentPinCallback = callback;
    setTimeout(() => { const inp = document.getElementById('payment-pin-input'); if (inp) inp.focus(); }, 200);
}

function checkPaymentPin() {
    const pin = document.getElementById('payment-pin-input').value;
    if (pin === state.pinCode) {
        closeModal();
        if (window._paymentPinCallback) window._paymentPinCallback();
    } else {
        showToast('PIN i gabuar!', 'error');
    }
}

// ===================== PAYMENT AUDIT TRAIL =====================
function addPaymentAudit(action, details) {
    if (!state.paymentAuditTrail) state.paymentAuditTrail = [];
    state.paymentAuditTrail.push({
        date: new Date().toISOString(),
        action: action,
        details: details,
        user: 'Elez'
    });
    saveState();
}

function showPaymentAuditTrail() {
    if (!state.paymentAuditTrail || state.paymentAuditTrail.length === 0) {
        openModal('Audit Trail', '<p>Nuk ka histori ende.</p>');
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>Data & Ora</th><th>Veprimi</th><th>Detaje</th><th>Perdoruesi</th></tr></thead><tbody>';
    [...state.paymentAuditTrail].reverse().forEach(a => {
        html += '<tr><td style="white-space:nowrap;font-size:0.85em;">' + new Date(a.date).toLocaleString('sq-AL') + '</td>';
        html += '<td><strong>' + a.action + '</strong></td>';
        html += '<td>' + a.details + '</td>';
        html += '<td>' + a.user + '</td></tr>';
    });
    html += '</tbody></table>';
    openModal('Audit Trail - Historiku i ndryshimeve (' + state.paymentAuditTrail.length + ')', html);
}

// ===================== PAYMENT TEMPLATES =====================
function openPaymentTemplateModal() {
    const templates = state.paymentTemplates || [];
    let html = '<h4 style="margin-bottom:10px;">Shabllonet ekzistuese:</h4>';

    if (templates.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:15px;">';
        templates.forEach((tmpl, i) => {
            html += '<button class="btn btn-secondary" onclick="usePaymentTemplate(' + i + ')" style="padding:10px 15px;">';
            html += '<strong>' + tmpl.name + '</strong><br>';
            html += '<small>' + tmpl.amount + ' den - ' + getCategoryLabel(tmpl.category) + '</small>';
            html += '</button>';
        });
        html += '</div>';
    } else {
        html += '<p style="color:var(--text-secondary);margin-bottom:15px;">Nuk ka shabllone ende.</p>';
    }

    html += '<div class="receipt-divider"></div>';
    html += '<h4 style="margin:10px 0;">Krijo shabllone te re:</h4>';
    html += '<div class="form-group"><label>Emri i shabllonet:</label><input type="text" id="template-name" placeholder="P.sh. Pagesa mujore Fatonit"></div>';
    html += '<div class="form-group"><label>Shuma:</label><input type="number" id="template-amount" min="1"></div>';
    html += '<div class="form-group"><label>Kategoria:</label><select id="template-category"><option value="cash">Cash dorezim</option><option value="bank_transfer">Transfer bankar</option><option value="deduction">Zbritje</option><option value="goods">Mall/Produkte</option><option value="other">Tjeter</option></select></div>';
    html += '<div class="form-group"><label>Shenim:</label><input type="text" id="template-note" placeholder="Opsionale"></div>';
    html += '<button class="btn btn-primary" onclick="savePaymentTemplate()" style="width:100%;"><i class="fas fa-save"></i> Ruaj shabllonen</button>';

    openModal('Shabllonet e pagesave', html);
}

function savePaymentTemplate() {
    const name = document.getElementById('template-name').value;
    const amount = parseInt(document.getElementById('template-amount').value) || 0;
    if (!name || amount <= 0) { showToast('Plotesoni emrin dhe shumen', 'error'); return; }

    if (!state.paymentTemplates) state.paymentTemplates = [];
    state.paymentTemplates.push({
        name: name,
        amount: amount,
        category: document.getElementById('template-category').value,
        note: document.getElementById('template-note').value
    });
    saveState();
    showToast('Shablloni u ruajt', 'success');
    openPaymentTemplateModal();
}

function usePaymentTemplate(index) {
    const tmpl = (state.paymentTemplates || [])[index];
    if (!tmpl) return;
    closeModal();
    openFatonPaymentModal();
    setTimeout(() => {
        const amountEl = document.getElementById('faton-amount');
        const catEl = document.getElementById('faton-payment-category');
        const noteEl = document.getElementById('faton-note');
        if (amountEl) amountEl.value = tmpl.amount;
        if (catEl) catEl.value = tmpl.category;
        if (noteEl) noteEl.value = tmpl.note || '';
        // Trigger preview
        if (amountEl) amountEl.dispatchEvent(new Event('input'));
    }, 300);
}

// ===================== MULTI-CURRENCY SUPPORT =====================
function openCurrencyModal() {
    const rates = state.currencyRates || { EUR: 61.5, USD: 56.0, MKD: 1 };
    let html = '<p style="margin-bottom:10px;color:var(--text-secondary);">Vendosni kurset e kembimit (1 valute = X den):</p>';
    html += '<div class="form-group"><label>1 EUR =</label><input type="number" id="rate-eur" step="0.1" value="' + rates.EUR + '"> den</div>';
    html += '<div class="form-group"><label>1 USD =</label><input type="number" id="rate-usd" step="0.1" value="' + rates.USD + '"> den</div>';
    html += '<div class="receipt-divider"></div>';
    html += '<h4 style="margin:10px 0;">Konvertuesi:</h4>';
    html += '<div class="form-group"><label>Shuma:</label><input type="number" id="convert-amount" oninput="convertCurrency()"></div>';
    html += '<div class="form-group"><label>Nga:</label><select id="convert-from" onchange="convertCurrency()"><option value="MKD">MKD (den)</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div>';
    html += '<div id="convert-result" style="padding:10px;background:var(--bg-secondary);border-radius:8px;margin-top:10px;"></div>';
    html += '<div class="receipt-divider"></div>';
    html += '<button class="btn btn-primary" onclick="saveCurrencyRates()" style="width:100%;"><i class="fas fa-save"></i> Ruaj kurset</button>';

    openModal('Multi-valute', html);
}

function convertCurrency() {
    const rates = state.currencyRates || { EUR: 61.5, USD: 56.0, MKD: 1 };
    const amount = parseFloat(document.getElementById('convert-amount').value) || 0;
    const from = document.getElementById('convert-from').value;
    const resultDiv = document.getElementById('convert-result');
    if (!resultDiv || amount <= 0) { if (resultDiv) resultDiv.innerHTML = ''; return; }

    let amountInDen = amount * (rates[from] || 1);
    let html = '<strong>' + amount + ' ' + from + ' =</strong><br>';
    html += '<div style="font-size:1.3em;font-weight:bold;color:var(--accent);margin:5px 0;">' + Math.round(amountInDen) + ' MKD (den)</div>';
    if (from !== 'EUR') html += '<div>' + (amountInDen / rates.EUR).toFixed(2) + ' EUR</div>';
    if (from !== 'USD') html += '<div>' + (amountInDen / rates.USD).toFixed(2) + ' USD</div>';
    resultDiv.innerHTML = html;
}

function saveCurrencyRates() {
    state.currencyRates = {
        EUR: parseFloat(document.getElementById('rate-eur').value) || 61.5,
        USD: parseFloat(document.getElementById('rate-usd').value) || 56.0,
        MKD: 1
    };
    saveState();
    closeModal();
    showToast('Kurset u ruajten', 'success');
}

// ===================== PAYMENT CALENDAR =====================
function openPaymentCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let html = '<div style="text-align:center;margin-bottom:10px;">';
    html += '<h3>' + now.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }) + '</h3>';
    html += '</div>';

    html += '<table class="data-table" style="text-align:center;"><thead><tr>';
    ['Hen', 'Mar', 'Mer', 'Enj', 'Pre', 'Sht', 'Die'].forEach(d => html += '<th style="padding:6px;">' + d + '</th>');
    html += '</tr></thead><tbody>';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    // Get payment dates and installment dates for this month
    const monthStr = (year + '-' + String(month + 1).padStart(2, '0'));
    const paymentDates = {};
    state.fatonPayments.forEach(p => {
        if (p.date && p.date.startsWith(monthStr)) {
            const day = parseInt(p.date.split('-')[2]);
            if (!paymentDates[day]) paymentDates[day] = [];
            paymentDates[day].push({ type: 'payment', amount: p.amount });
        }
    });
    const installmentDates = {};
    (state.fatonInstallments || []).forEach(inst => {
        if (inst.date && inst.date.startsWith(monthStr)) {
            const day = parseInt(inst.date.split('-')[2]);
            if (!installmentDates[day]) installmentDates[day] = [];
            installmentDates[day].push({ paid: inst.paid, amount: inst.amount });
        }
    });

    let dayCount = 0;
    for (let row = 0; row < 6; row++) {
        html += '<tr>';
        for (let col = 0; col < 7; col++) {
            dayCount++;
            const dayNum = dayCount - startDay;
            if (dayNum < 1 || dayNum > daysInMonth) {
                html += '<td style="padding:6px;"></td>';
            } else {
                const isToday = dayNum === now.getDate();
                const hasPayment = paymentDates[dayNum];
                const hasInstallment = installmentDates[dayNum];
                let style = 'padding:6px;position:relative;';
                if (isToday) style += 'background:var(--accent);color:white;border-radius:50%;font-weight:bold;';

                html += '<td style="' + style + '">' + dayNum;
                if (hasPayment) html += '<div style="font-size:0.65em;color:var(--success);font-weight:bold;">+' + hasPayment.reduce((s, p) => s + p.amount, 0) + '</div>';
                if (hasInstallment) {
                    const inst = hasInstallment[0];
                    html += '<div style="font-size:0.65em;color:' + (inst.paid ? 'var(--success)' : 'var(--warning)') + ';">' + (inst.paid ? '✓' : '⏰') + inst.amount + '</div>';
                }
                html += '</td>';
            }
        }
        html += '</tr>';
        if (dayCount - startDay >= daysInMonth) break;
    }
    html += '</tbody></table>';

    openModal('Kalendari i pagesave', html);
}

// ===================== COMPARISON TABLE =====================
function showFatonComparison() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    function getMonthData(monthKey) {
        const purchases = (state.fatonPurchases || []).filter(p => p.date && p.date.startsWith(monthKey));
        const payments = state.fatonPayments.filter(p => p.date && p.date.startsWith(monthKey));
        const collections = (state.fatonProfitCollections || []).filter(c => c.date && c.date.startsWith(monthKey));
        return {
            purchaseTotal: purchases.reduce((s, p) => s + p.total, 0),
            purchaseCount: purchases.length,
            paymentTotal: payments.reduce((s, p) => s + p.amount, 0),
            paymentCount: payments.length,
            collectionTotal: collections.reduce((s, c) => s + c.amount, 0)
        };
    }

    const current = getMonthData(thisMonth);
    const previous = getMonthData(lastMonth);

    function trend(curr, prev) {
        if (prev === 0) return curr > 0 ? '<span style="color:var(--success);">↑ Ri</span>' : '-';
        const diff = ((curr - prev) / prev * 100).toFixed(0);
        return diff > 0 ? '<span style="color:var(--success);">↑ +' + diff + '%</span>' : diff < 0 ? '<span style="color:var(--danger);">↓ ' + diff + '%</span>' : '<span>→ 0%</span>';
    }

    let html = '<table class="data-table"><thead><tr><th>Metrike</th><th>' + new Date(now.getFullYear(), now.getMonth() - 1).toLocaleDateString('sq-AL', { month: 'long' }) + '</th><th>' + now.toLocaleDateString('sq-AL', { month: 'long' }) + '</th><th>Trendi</th></tr></thead><tbody>';
    html += '<tr><td>Blerje (total)</td><td>' + previous.purchaseTotal + ' den</td><td>' + current.purchaseTotal + ' den</td><td>' + trend(current.purchaseTotal, previous.purchaseTotal) + '</td></tr>';
    html += '<tr><td>Blerje (numri)</td><td>' + previous.purchaseCount + '</td><td>' + current.purchaseCount + '</td><td>' + trend(current.purchaseCount, previous.purchaseCount) + '</td></tr>';
    html += '<tr><td>Pagesa (total)</td><td>' + previous.paymentTotal + ' den</td><td>' + current.paymentTotal + ' den</td><td>' + trend(current.paymentTotal, previous.paymentTotal) + '</td></tr>';
    html += '<tr><td>Pagesa (numri)</td><td>' + previous.paymentCount + '</td><td>' + current.paymentCount + '</td><td>' + trend(current.paymentCount, previous.paymentCount) + '</td></tr>';
    html += '<tr><td>Fitim mbledhur</td><td>' + previous.collectionTotal + ' den</td><td>' + current.collectionTotal + ' den</td><td>' + trend(current.collectionTotal, previous.collectionTotal) + '</td></tr>';
    html += '</tbody></table>';

    openModal('Krahasimi mujor - Fatoni', html);
}

// ===================== BALANCE PER PRODUCT =====================
function showBalancePerProduct() {
    const purchases = state.fatonPurchases || [];
    const byProduct = {};
    purchases.forEach(p => {
        const prod = getProduct(p.productId);
        const name = prod ? prod.name : p.productId;
        if (!byProduct[name]) byProduct[name] = { purchased: 0, qty: 0 };
        byProduct[name].purchased += p.total;
        byProduct[name].qty += p.quantity;
    });

    const totalPurchased = purchases.reduce((s, p) => s + p.total, 0);

    let html = '<table class="data-table"><thead><tr><th>Produkti</th><th>Sasia</th><th>Shuma</th><th>% e borxhit</th></tr></thead><tbody>';
    Object.entries(byProduct).sort((a, b) => b[1].purchased - a[1].purchased).forEach(([name, data]) => {
        const pct = totalPurchased > 0 ? (data.purchased / totalPurchased * 100).toFixed(1) : 0;
        html += '<tr><td><strong>' + name + '</strong></td><td>' + data.qty + '</td><td>' + data.purchased + ' den</td>';
        html += '<td><div style="display:flex;align-items:center;gap:8px;"><div style="width:60px;height:8px;background:#eee;border-radius:4px;"><div style="width:' + pct + '%;height:100%;background:var(--accent);border-radius:4px;"></div></div> ' + pct + '%</td></tr>';
    });
    html += '</tbody></table>';

    openModal('Borxhi sipas produktit', html);
}

// ===================== PROFIT CHART PER PERSON =====================
function showProfitPerPersonChart() {
    let html = '<canvas id="profit-person-chart" width="400" height="250"></canvas>';
    openModal('Fitimi - Elez vs ' + state.partnerName, html);

    setTimeout(() => {
        const canvas = document.getElementById('profit-person-chart');
        if (!canvas) return;

        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.toISOString().slice(0, 7));
        }

        const elezData = months.map(m => {
            const monthSales = state.sales.filter(s => s.date && s.date.startsWith(m));
            const profit = monthSales.reduce((s, x) => s + x.profit, 0);
            const expenses = state.expenses.filter(e => e.date && e.date.startsWith(m)).reduce((s, x) => s + x.amount, 0);
            return calcOwnerShare(profit - expenses);
        });

        const orhanData = months.map(m => {
            const monthSales = state.sales.filter(s => s.date && s.date.startsWith(m));
            const profit = monthSales.reduce((s, x) => s + x.profit, 0);
            const expenses = state.expenses.filter(e => e.date && e.date.startsWith(m)).reduce((s, x) => s + x.amount, 0);
            return calcPartnerShare(profit - expenses);
        });

        const labels = months.map(m => { const d = new Date(m + '-01'); return d.toLocaleDateString('sq-AL', { month: 'short' }); });

        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Elez', data: elezData, borderColor: '#2980b9', backgroundColor: 'rgba(41,128,185,0.1)', fill: true, tension: 0.3 },
                    { label: state.partnerName, data: orhanData, borderColor: '#e67e22', backgroundColor: 'rgba(230,126,34,0.1)', fill: true, tension: 0.3 }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }, 300);
}

// ===================== DETAILED PAYMENT REPORT =====================
function showDetailedPaymentReport(paymentIndex) {
    const payment = state.fatonPayments[paymentIndex];
    if (!payment) return;

    // Find sales around this payment date (same day or nearby)
    const paymentDate = payment.date;
    const daySales = state.sales.filter(s => s.date === paymentDate);

    let html = '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:15px;">';
    html += '<p><strong>Pagesa:</strong> ' + payment.amount + ' den</p>';
    html += '<p><strong>Data:</strong> ' + payment.date + '</p>';
    html += '<p><strong>Metoda:</strong> ' + getCategoryLabel(payment.category) + '</p>';
    html += '</div>';

    if (daySales.length > 0) {
        html += '<h4 style="margin-bottom:8px;">Shitjet e dites:</h4>';
        html += '<table class="data-table"><thead><tr><th>Produkti</th><th>Sasia</th><th>Blerje</th><th>Shitje</th><th>Fitim</th><th>Elez</th><th>' + state.partnerName + '</th></tr></thead><tbody>';
        let totalProfit = 0;
        daySales.forEach(s => {
            const p = getProduct(s.productId);
            const buyCost = p.buyPrice * s.quantity;
            totalProfit += s.profit;
            html += '<tr><td>' + p.name + '</td><td>' + s.quantity + '</td><td>' + buyCost + ' den</td><td>' + s.sellTotal + ' den</td>';
            html += '<td style="color:var(--success);font-weight:bold;">' + s.profit + ' den</td>';
            html += '<td>' + calcOwnerShare(s.profit) + ' den</td>';
            html += '<td>' + calcPartnerShare(s.profit) + ' den</td></tr>';
        });
        html += '<tr style="font-weight:bold;background:var(--bg-secondary);"><td>TOTALI</td><td>' + daySales.reduce((s, x) => s + x.quantity, 0) + '</td><td></td><td>' + daySales.reduce((s, x) => s + x.sellTotal, 0) + ' den</td>';
        html += '<td style="color:var(--success);">' + totalProfit + ' den</td>';
        html += '<td>' + calcOwnerShare(totalProfit) + ' den</td>';
        html += '<td>' + calcPartnerShare(totalProfit) + ' den</td></tr>';
        html += '</tbody></table>';
    } else {
        html += '<p style="color:var(--text-secondary);">Nuk ka shitje te regjistruara per kete date.</p>';
    }

    openModal('Raport i detajuar - Pagesa ' + payment.date, html);
}

// ===================== PAYMENT SPLIT =====================
function openSplitPaymentModal() {
    const currentDebt = calcFatonDebt();
    let html = '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:15px;">';
    html += '<p><strong>Borxhi aktual:</strong> <span style="color:var(--danger);">' + currentDebt + ' den</span></p></div>';
    html += '<h4 style="margin-bottom:10px;">Ndani pagesen ne pjese:</h4>';
    html += '<div id="split-parts"><div class="split-part" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
    html += '<input type="number" class="split-amount" placeholder="Shuma" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;">';
    html += '<select class="split-category" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;"><option value="cash">Cash</option><option value="bank_transfer">Transfer</option><option value="deduction">Zbritje</option><option value="goods">Mall</option></select>';
    html += '</div></div>';
    html += '<button type="button" class="btn btn-secondary btn-sm" onclick="addSplitPart()" style="margin-bottom:12px;"><i class="fas fa-plus"></i> Shto pjese</button>';
    html += '<div id="split-total" style="padding:10px;background:var(--bg-primary);border-radius:8px;margin-bottom:12px;font-weight:bold;"></div>';
    html += '<div class="form-group"><label>Data:</label><input type="date" id="split-date" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div class="form-group"><label>Shenim:</label><textarea id="split-note"></textarea></div>';
    html += '<button class="btn btn-primary" onclick="processSplitPayment()" style="width:100%;"><i class="fas fa-check"></i> Regjistro pagesen e ndare</button>';
    openModal('Pagese e ndare (Split)', html);
    updateSplitTotal();
}

function addSplitPart() {
    const container = document.getElementById('split-parts');
    const part = document.createElement('div');
    part.className = 'split-part';
    part.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
    part.innerHTML = '<input type="number" class="split-amount" placeholder="Shuma" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;" oninput="updateSplitTotal()">' +
        '<select class="split-category" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;"><option value="cash">Cash</option><option value="bank_transfer">Transfer</option><option value="deduction">Zbritje</option><option value="goods">Mall</option></select>' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove();updateSplitTotal()"><i class="fas fa-times"></i></button>';
    container.appendChild(part);
}

function updateSplitTotal() {
    const amounts = document.querySelectorAll('.split-amount');
    let total = 0;
    amounts.forEach(a => total += parseInt(a.value) || 0);
    const el = document.getElementById('split-total');
    if (el) el.innerHTML = 'Totali: <span style="color:var(--success);">' + total + ' den</span>';
}

function processSplitPayment() {
    const amounts = document.querySelectorAll('.split-amount');
    const categories = document.querySelectorAll('.split-category');
    const date = document.getElementById('split-date').value;
    const note = document.getElementById('split-note').value;
    let totalAmount = 0;
    const parts = [];
    amounts.forEach((a, i) => {
        const amt = parseInt(a.value) || 0;
        if (amt > 0) { parts.push({ amount: amt, category: categories[i].value }); totalAmount += amt; }
    });
    if (parts.length === 0) { showToast('Vendosni shuma', 'error'); return; }
    parts.forEach(p => {
        state.fatonPayments.push({ id: Date.now() + Math.random(), amount: p.amount, date: date, note: note + ' [Split: ' + getCategoryLabel(p.category) + ']', category: p.category });
    });
    saveState();
    addPaymentAudit('PAGESE_SPLIT', 'Totali: ' + totalAmount + ' den, ' + parts.length + ' pjese');
    closeModal();
    refreshFaton();
    refreshDashboard();
    showToast('Pagesa e ndare u regjistrua: ' + totalAmount + ' den', 'success');
    logActivity('Faton Split Payment', totalAmount + ' den ne ' + parts.length + ' pjese');
}

// ===================== PAYMENT WITH DISCOUNT =====================
function openDiscountPaymentModal() {
    const debt = calcFatonDebt();
    let html = '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:15px;">';
    html += '<p><strong>Borxhi aktual:</strong> ' + debt + ' den</p></div>';
    html += '<div class="form-group"><label>Shuma e pageses:</label><input type="number" id="discount-amount" min="1" oninput="calcPaymentDiscount()"></div>';
    html += '<div class="form-group"><label>Zbritja (%):</label><input type="number" id="discount-pct" min="0" max="50" value="5" oninput="calcPaymentDiscount()"></div>';
    html += '<div id="discount-preview" style="padding:12px;background:var(--bg-primary);border-radius:8px;margin-bottom:12px;"></div>';
    html += '<div class="form-group"><label>Data:</label><input type="date" id="discount-date" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<button class="btn btn-primary" onclick="processDiscountPayment()" style="width:100%;"><i class="fas fa-percentage"></i> Paguaj me zbritje</button>';
    openModal('Pagese me zbritje', html);
}

function calcPaymentDiscount() {
    const amount = parseInt(document.getElementById('discount-amount').value) || 0;
    const pct = parseInt(document.getElementById('discount-pct').value) || 0;
    const discount = Math.round(amount * pct / 100);
    const effectivePayment = amount + discount;
    const el = document.getElementById('discount-preview');
    if (el) {
        el.innerHTML = '<div style="display:flex;justify-content:space-between;"><span>Pagesa juaj:</span><strong>' + amount + ' den</strong></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Zbritja (' + pct + '%):</span><strong style="color:var(--success);">+' + discount + ' den</strong></div>' +
            '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:5px;margin-top:5px;"><span>Vlera efektive:</span><strong style="color:var(--accent);font-size:1.1em;">' + effectivePayment + ' den</strong></div>';
    }
}

function processDiscountPayment() {
    const amount = parseInt(document.getElementById('discount-amount').value) || 0;
    const pct = parseInt(document.getElementById('discount-pct').value) || 0;
    if (amount <= 0) return;
    const discount = Math.round(amount * pct / 100);
    const effectivePayment = amount + discount;
    state.fatonPayments.push({
        id: Date.now(), amount: effectivePayment,
        date: document.getElementById('discount-date').value,
        note: 'Pagese me zbritje ' + pct + '% (Paguar: ' + amount + ', Zbritje: ' + discount + ')',
        category: 'cash'
    });
    saveState(); closeModal(); refreshFaton(); refreshDashboard();
    addPaymentAudit('PAGESE_ZBRITJE', 'Paguar: ' + amount + ', Zbritje: ' + discount + ', Efektive: ' + effectivePayment);
    showToast('Pagesa me zbritje: ' + effectivePayment + ' den efektive', 'success');
}

// ===================== FATON WHATSAPP NOTIFICATION =====================
function notifyFatonPayment(payment) {
    const debt = calcFatonDebt();
    let text = '*Njoftim Pagese - Hurma App*\n';
    text += '━━━━━━━━━━━━━━━━━━\n';
    text += '*Data:* ' + payment.date + '\n';
    text += '*Shuma e paguar:* ' + payment.amount + ' den\n';
    text += '*Metoda:* ' + getCategoryLabel(payment.category) + '\n';
    text += '*Borxhi i mbetur:* ' + debt + ' den\n';
    text += '━━━━━━━━━━━━━━━━━━\n';
    text += '_Konfirmuar nga Hurma App_';
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// ===================== PAYMENT METHOD COMPARISON CHART =====================
function showPaymentMethodChart() {
    const methods = {};
    state.fatonPayments.forEach(p => {
        const cat = p.category || 'cash';
        if (!methods[cat]) methods[cat] = 0;
        methods[cat] += p.amount;
    });
    let html = '<canvas id="payment-method-chart" width="400" height="300"></canvas>';
    html += '<div style="margin-top:15px;">';
    const total = Object.values(methods).reduce((s, v) => s + v, 0);
    Object.entries(methods).forEach(([cat, amount]) => {
        const pct = total > 0 ? (amount / total * 100).toFixed(1) : 0;
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">';
        html += '<span>' + getCategoryLabel(cat) + '</span><strong>' + amount + ' den (' + pct + '%)</strong></div>';
    });
    html += '</div>';
    openModal('Krahasimi i metodave te pageses', html);
    setTimeout(() => {
        const canvas = document.getElementById('payment-method-chart');
        if (!canvas) return;
        const colors = ['#27ae60', '#2980b9', '#e67e22', '#8e44ad', '#e74c3c'];
        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(methods).map(getCategoryLabel),
                datasets: [{ data: Object.values(methods), backgroundColor: colors.slice(0, Object.keys(methods).length), borderWidth: 2 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }, 200);
}

// ===================== PAYMENT REFERENCE TO PURCHASE =====================
function openReferencePaymentModal() {
    const purchases = (state.fatonPurchases || []).filter(p => !p.fullyPaid);
    if (purchases.length === 0) { showToast('Nuk ka blerje te papaguara', 'info'); return; }
    let html = '<p style="margin-bottom:10px;color:var(--text-secondary);">Zgjidhni blerjet qe deshironi ti paguani:</p>';
    html += '<div id="ref-purchases" style="max-height:300px;overflow-y:auto;">';
    purchases.forEach((p, i) => {
        const prod = getProduct(p.productId);
        html += '<label style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;">';
        html += '<input type="checkbox" class="ref-check" value="' + i + '" onchange="updateRefTotal()">';
        html += '<div style="flex:1;"><strong>' + (prod ? prod.name : '-') + '</strong> x' + p.quantity;
        html += '<br><small style="color:var(--text-secondary);">' + p.date + ' - ' + p.total + ' den</small></div>';
        html += '</label>';
    });
    html += '</div>';
    html += '<div id="ref-total" style="padding:10px;background:var(--bg-secondary);border-radius:8px;margin:12px 0;font-weight:bold;">Totali: 0 den</div>';
    html += '<div class="form-group"><label>Data:</label><input type="date" id="ref-date" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<button class="btn btn-primary" onclick="processReferencePayment()" style="width:100%;"><i class="fas fa-link"></i> Paguaj blerjet e zgjedhura</button>';
    openModal('Pagese me reference', html);
}

function updateRefTotal() {
    const checks = document.querySelectorAll('.ref-check:checked');
    const purchases = state.fatonPurchases || [];
    let total = 0;
    checks.forEach(c => { total += purchases[parseInt(c.value)].total; });
    document.getElementById('ref-total').innerHTML = 'Totali: <span style="color:var(--success);">' + total + ' den</span> (' + checks.length + ' blerje)';
}

function processReferencePayment() {
    const checks = document.querySelectorAll('.ref-check:checked');
    if (checks.length === 0) { showToast('Zgjidhni blerje', 'error'); return; }
    const purchases = state.fatonPurchases || [];
    let total = 0;
    const refs = [];
    checks.forEach(c => {
        const idx = parseInt(c.value);
        total += purchases[idx].total;
        refs.push(purchases[idx].date + ' - ' + getProduct(purchases[idx].productId).name);
    });
    state.fatonPayments.push({
        id: Date.now(), amount: total,
        date: document.getElementById('ref-date').value,
        note: 'Pagese per: ' + refs.join(', '),
        category: 'cash'
    });
    saveState(); closeModal(); refreshFaton(); refreshDashboard();
    addPaymentAudit('PAGESE_REFERENCE', total + ' den per ' + checks.length + ' blerje');
    showToast('Pagesa me reference: ' + total + ' den', 'success');
}

// ===================== PAYMENT CONTRACT PDF =====================
function generatePaymentContract() {
    const debt = calcFatonDebt();
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();
    const installments = state.fatonInstallments || [];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('KONTRATE PAGESE', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Hurma App - ' + new Date().toLocaleDateString('sq-AL'), 105, 27, { align: 'center' });

    doc.setDrawColor(200); doc.line(20, 32, 190, 32);

    let y = 42;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Palet:', 20, y);
    doc.text('Pala 1 (Bleresi): Elez Dauti', 20, y + 8);
    doc.text('Pala 2 (Shitesi): Fatoni', 20, y + 16);
    y += 30;

    doc.text('Borxhi total cash: ' + debt + ' den', 20, y); y += 8;
    doc.text('Fitimi pa mbledhur: ' + profitRemaining + ' den', 20, y); y += 8;
    doc.text('Borxhi TOTAL neto: ' + (debt + profitRemaining) + ' den', 20, y); y += 15;

    if (installments.length > 0) {
        doc.setFontSize(12); doc.text('Plani i kesteve:', 20, y); y += 8;
        doc.setFontSize(10);
        installments.forEach((inst, i) => {
            const status = inst.paid ? 'PAGUAR' : 'PA PAGUAR';
            doc.text('Kesti ' + (i + 1) + ': ' + inst.amount + ' den - Afati: ' + inst.date + ' - ' + status, 25, y);
            y += 7;
        });
    }

    y += 20;
    doc.setDrawColor(200); doc.line(20, y, 90, y); doc.line(110, y, 190, y);
    doc.setFontSize(9);
    doc.text('Nenshkrimi i Bleresit', 55, y + 7, { align: 'center' });
    doc.text('Nenshkrimi i Shitesit', 150, y + 7, { align: 'center' });

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Gjeneruar automatikisht nga Hurma App - ' + new Date().toLocaleString('sq-AL'), 105, 285, { align: 'center' });

    doc.save('Kontrate_Pagese_' + new Date().toISOString().split('T')[0] + '.pdf');
    showToast('Kontrata u gjenerua ne PDF', 'success');
}

// ===================== BALANCE ALERT =====================
function showBalanceAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'balance-alert balance-alert-' + type;
    alertDiv.innerHTML = '<i class="fas fa-' + (type === 'danger' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle') + '"></i> ' + message;
    alertDiv.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;padding:15px 20px;border-radius:10px;color:white;font-weight:600;box-shadow:0 4px 15px rgba(0,0,0,0.2);animation:slideInRight 0.4s ease;max-width:350px;';
    alertDiv.style.background = type === 'danger' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db';
    document.body.appendChild(alertDiv);
    setTimeout(() => { alertDiv.style.animation = 'fadeOut 0.4s ease'; setTimeout(() => alertDiv.remove(), 400); }, 4000);
}

// ===================== CSV EXPORT FOR ACCOUNTANT =====================
function exportFatonCSV() {
    let csv = 'Data,Lloji,Pershkrim,Debi,Kredi,Bilanci,Kategoria\n';
    let balance = 0;
    const events = [];
    (state.fatonPurchases || []).forEach(p => {
        const prod = getProduct(p.productId);
        events.push({ date: p.date, type: 'Blerje', desc: (prod ? prod.name : '-') + ' x' + p.quantity, debit: p.total, credit: 0, cat: '-' });
    });
    state.fatonPayments.forEach(p => {
        events.push({ date: p.date, type: 'Pagese', desc: p.note || '-', debit: 0, credit: p.amount, cat: getCategoryLabel(p.category) });
    });
    events.sort((a, b) => a.date.localeCompare(b.date));
    events.forEach(e => {
        balance += e.debit - e.credit;
        csv += e.date + ',' + e.type + ',"' + e.desc + '",' + e.debit + ',' + e.credit + ',' + balance + ',' + e.cat + '\n';
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Faton_Kontabilitet_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    showToast('CSV per kontabilistin u shkarkua', 'success');
}

// ===================== ONE-CLICK QUICK PAY =====================
function quickPayLastAmount() {
    if (state.fatonPayments.length === 0) { showToast('Nuk ka pagesa te meparshme', 'info'); return; }
    const lastPayment = state.fatonPayments[state.fatonPayments.length - 1];
    const debt = calcFatonDebt();
    if (debt <= 0) { showToast('Nuk ka borxh', 'success'); return; }
    const amount = Math.min(lastPayment.amount, debt);
    let html = '<div style="text-align:center;padding:15px;">';
    html += '<div style="font-size:2.5em;color:var(--accent);margin-bottom:15px;"><i class="fas fa-bolt"></i></div>';
    html += '<h3>Pagese e shpejte</h3>';
    html += '<p style="margin:10px 0;">Shuma: <strong style="font-size:1.4em;color:var(--success);">' + amount + ' den</strong></p>';
    html += '<p style="color:var(--text-secondary);">Njejte si pagesa e fundit (' + lastPayment.date + ')</p>';
    html += '<p style="margin:10px 0;">Borxhi aktual: <strong>' + debt + ' den</strong> → <strong style="color:var(--success);">' + (debt - amount) + ' den</strong></p>';
    html += '<div style="display:flex;gap:10px;margin-top:20px;justify-content:center;">';
    html += '<button class="btn btn-primary" onclick="executeQuickPay(' + amount + ')"><i class="fas fa-check"></i> Konfirmo</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal()"><i class="fas fa-times"></i> Anulo</button>';
    html += '</div></div>';
    openModal('Pagese 1-klik', html);
}

function executeQuickPay(amount) {
    state.fatonPayments.push({
        id: Date.now(), amount: amount,
        date: new Date().toISOString().split('T')[0],
        note: 'Pagese e shpejte (1-klik)',
        category: 'cash'
    });
    saveState();
    if (typeof createReceipt === 'function') createReceipt(state.fatonPayments[state.fatonPayments.length - 1], state.fatonPayments.length - 1);
    addPaymentAudit('PAGESE_SHPEJTE', amount + ' den');
    closeModal();
    refreshFaton(); refreshDashboard();
    showBalanceAlert('success', 'Pagesa e shpejte: ' + amount + ' den u regjistrua!');
    logActivity('Quick Pay', amount + ' den');
}

// ===================== PAYMENT STATISTICS =====================
function showPaymentStats() {
    const payments = state.fatonPayments;
    if (payments.length === 0) { openModal('Statistikat', '<p>Nuk ka pagesa.</p>'); return; }
    const amounts = payments.map(p => p.amount);
    const total = amounts.reduce((s, a) => s + a, 0);
    const avg = Math.round(total / amounts.length);
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const maxPayment = payments.find(p => p.amount === max);
    const minPayment = payments.find(p => p.amount === min);

    // Frequency
    const dates = payments.map(p => new Date(p.date).getTime()).sort();
    let avgDays = 0;
    if (dates.length > 1) {
        const diffs = [];
        for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86400000);
        avgDays = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
    }

    // Monthly trend
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisMonthTotal = payments.filter(p => p.date && p.date.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0);
    const lastMonthTotal = payments.filter(p => p.date && p.date.startsWith(lastMonth)).reduce((s, p) => s + p.amount, 0);

    let html = '<div class="confirmation-grid" style="grid-template-columns:repeat(2,1fr);">';
    html += '<div class="confirmation-card"><div class="conf-label">Pagesa totale</div><div class="conf-value">' + payments.length + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Shuma totale</div><div class="conf-value">' + total + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Mesatarja</div><div class="conf-value" style="color:var(--accent);">' + avg + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Me e madhe</div><div class="conf-value" style="color:var(--success);">' + max + ' den</div><div style="font-size:0.7em;color:var(--text-secondary);">' + (maxPayment ? maxPayment.date : '') + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Me e vogla</div><div class="conf-value" style="color:var(--warning);">' + min + ' den</div><div style="font-size:0.7em;color:var(--text-secondary);">' + (minPayment ? minPayment.date : '') + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Frekuenca</div><div class="conf-value">' + (avgDays > 0 ? 'Cdo ' + avgDays + ' dite' : '-') + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Ky muaj</div><div class="conf-value">' + thisMonthTotal + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Muaji kaluar</div><div class="conf-value">' + lastMonthTotal + ' den</div></div>';
    html += '</div>';

    openModal('Statistikat e pagesave', html);
}

// ===================== SCHEDULED PAYMENT =====================
function openScheduledPaymentModal() {
    let html = '<div class="form-group"><label>Shuma:</label><input type="number" id="sched-amount" min="1"></div>';
    html += '<div class="form-group"><label>Kategoria:</label><select id="sched-category"><option value="cash">Cash</option><option value="bank_transfer">Transfer</option></select></div>';
    html += '<div class="form-group"><label>Data e pare:</label><input type="date" id="sched-start" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div class="form-group"><label>Persertit cdo:</label><select id="sched-interval"><option value="7">Jave</option><option value="14">2 Jave</option><option value="30" selected>Muaj</option></select></div>';
    html += '<div class="form-group"><label>Numri i perserijteve:</label><input type="number" id="sched-count" min="1" max="24" value="3"></div>';
    html += '<div class="form-group"><label>Shenim:</label><input type="text" id="sched-note" value="Pagese e programuar"></div>';
    html += '<button class="btn btn-primary" onclick="saveScheduledPayment()" style="width:100%;"><i class="fas fa-clock"></i> Programo pagesen</button>';
    openModal('Pagese e programuar', html);
}

function saveScheduledPayment() {
    const amount = parseInt(document.getElementById('sched-amount').value) || 0;
    if (amount <= 0) { showToast('Vendosni shumen', 'error'); return; }
    if (!state.scheduledPayments) state.scheduledPayments = [];
    state.scheduledPayments.push({
        id: Date.now(),
        amount: amount,
        category: document.getElementById('sched-category').value,
        startDate: document.getElementById('sched-start').value,
        interval: parseInt(document.getElementById('sched-interval').value),
        count: parseInt(document.getElementById('sched-count').value),
        executed: 0,
        note: document.getElementById('sched-note').value,
        active: true
    });
    saveState(); closeModal();
    showToast('Pagesa u programua', 'success');
    logActivity('Scheduled Payment', amount + ' den x ' + document.getElementById('sched-count').value);
}

function checkScheduledPayments() {
    if (!state.scheduledPayments) return;
    const today = new Date().toISOString().split('T')[0];
    state.scheduledPayments.forEach(sp => {
        if (!sp.active || sp.executed >= sp.count) return;
        let nextDate = new Date(sp.startDate);
        nextDate.setDate(nextDate.getDate() + (sp.interval * sp.executed));
        if (nextDate.toISOString().split('T')[0] <= today) {
            showBalanceAlert('info', 'Pagese e programuar: ' + sp.amount + ' den eshte gati per sot!');
        }
    });
}

// ===================== GUARANTEE FOR LARGE PAYMENTS =====================
function requirePaymentGuarantee(amount, callback) {
    if (amount < 50000) { callback(); return; }
    let html = '<div style="text-align:center;padding:10px;">';
    html += '<div style="font-size:2em;color:var(--warning);margin-bottom:10px;"><i class="fas fa-shield-alt"></i></div>';
    html += '<h3>Garanci per pagese te madhe</h3>';
    html += '<p style="margin:10px 0;">Pagesa <strong>' + amount + ' den</strong> kerkon deshmi te dyfishte:</p>';
    html += '<div style="text-align:left;margin:15px 0;">';
    html += '<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><input type="checkbox" id="guarantee-photo"> <span>Foto/deshmi e pageses</span></label>';
    html += '<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="guarantee-confirm"> <span>Konfirmoj qe kjo pagese eshte e sakte</span></label>';
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="verifyGuarantee()" style="width:100%;"><i class="fas fa-check-double"></i> Vazhdo me pagesen</button>';
    html += '</div>';
    openModal('Garanci Pagese', html);
    window._guaranteeCallback = callback;
}

function verifyGuarantee() {
    const photo = document.getElementById('guarantee-photo').checked;
    const confirm = document.getElementById('guarantee-confirm').checked;
    if (!photo || !confirm) { showToast('Duhet te konfirmoni te dyja pikat', 'error'); return; }
    closeModal();
    if (window._guaranteeCallback) window._guaranteeCallback();
}

// ===================== FATON MINI DASHBOARD =====================
function renderFatonMiniDashboard() {
    const container = document.getElementById('faton-mini-dashboard');
    if (!container) return;

    const debt = calcFatonDebt();
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();
    const netTotal = debt + profitRemaining;
    const totalProfit = state.sales.reduce((s, x) => s + x.profit, 0);
    const totalExpenses = state.expenses.reduce((s, x) => s + x.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    // Last 7 days trend
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayPayments = state.fatonPayments.filter(p => p.date === dateStr).reduce((s, p) => s + p.amount, 0);
        const dayPurchases = (state.fatonPurchases || []).filter(p => p.date === dateStr).reduce((s, p) => s + p.total, 0);
        last7.push({ date: dateStr, payments: dayPayments, purchases: dayPurchases });
    }

    let html = '<div class="faton-mini-grid">';

    // Mini card 1: Debt trend sparkline
    html += '<div class="faton-mini-card">';
    html += '<div class="mini-label">Borxhi 7 dite</div>';
    html += '<canvas id="faton-mini-debt-chart" width="150" height="60"></canvas>';
    html += '</div>';

    // Mini card 2: Quick stats
    html += '<div class="faton-mini-card">';
    html += '<div class="mini-label">Pagesa sot</div>';
    const todayPayments = state.fatonPayments.filter(p => p.date === new Date().toISOString().split('T')[0]);
    html += '<div class="mini-value" style="color:var(--success);">' + todayPayments.reduce((s, p) => s + p.amount, 0) + ' den</div>';
    html += '<div class="mini-label" style="margin-top:5px;">Blerje sot</div>';
    const todayPurchases = (state.fatonPurchases || []).filter(p => p.date === new Date().toISOString().split('T')[0]);
    html += '<div class="mini-value" style="color:var(--danger);">' + todayPurchases.reduce((s, p) => s + p.total, 0) + ' den</div>';
    html += '</div>';

    // Mini card 3: Profit split
    html += '<div class="faton-mini-card">';
    html += '<div class="mini-label">Fitimi neto</div>';
    html += '<div class="mini-value">' + netProfit + ' den</div>';
    html += '<div style="display:flex;gap:10px;margin-top:5px;">';
    html += '<div><small>Elez</small><div style="font-weight:bold;color:#2980b9;">' + calcOwnerShare(netProfit) + '</div></div>';
    html += '<div><small>' + state.partnerName + '</small><div style="font-weight:bold;color:#e67e22;">' + calcPartnerShare(netProfit) + '</div></div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // Render mini sparkline chart
    setTimeout(() => {
        const canvas = document.getElementById('faton-mini-debt-chart');
        if (!canvas) return;
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: last7.map(d => d.date.slice(5)),
                datasets: [{
                    data: last7.map(d => d.purchases - d.payments),
                    borderColor: '#e74c3c',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }, 100);
}

// ===================== UPCOMING PAYMENT REMINDER =====================
function checkFatonReminders() {
    const installments = state.fatonInstallments || [];
    const today = new Date().toISOString().split('T')[0];
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    installments.forEach((inst, i) => {
        if (!inst.paid && inst.date >= today && inst.date <= in3Days) {
            showToast('Kujtese: Kesti ' + (i + 1) + ' (' + inst.amount + ' den) afati: ' + inst.date, 'warning');
        }
    });
}

// ===================== RETURNS =====================
function openReturnModal() {
    let html = `
        <div class="form-group">
            <label>${t('client')}:</label>
            <select id="return-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="return-product">
                ${PRODUCTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="return-quantity" min="1" value="1">
        </div>
        <div class="form-group">
            <label>${t('reason')}:</label>
            <textarea id="return-reason" placeholder="${t('enter_reason')}"></textarea>
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="return-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <button class="btn btn-primary" onclick="addReturn()" style="width:100%;">${t('new_return')}</button>
    `;
    openModal(t('new_return'), html);
}

function addReturn() {
    const clientId = document.getElementById('return-client').value;
    const productId = document.getElementById('return-product').value;
    const quantity = parseInt(document.getElementById('return-quantity').value) || 0;
    const reason = document.getElementById('return-reason').value;
    const date = document.getElementById('return-date').value;

    if (quantity <= 0) return;

    state.returns.push({ id: Date.now(), clientId, productId, quantity, reason, date });

    // Restore stock
    state.stock[productId] = (state.stock[productId] || 0) + quantity;

    const product = getProduct(productId);
    logActivity('return', 'Kthim: ' + (product ? product.name : productId) + ' x' + quantity, 'returns');
    saveState();
    closeModal();
    refreshReturns();
    refreshAll();
}

function deleteReturn(index) {
    if (!confirm(t('confirm_delete'))) return;
    const ret = state.returns[index];
    state.stock[ret.productId] = Math.max(0, (state.stock[ret.productId] || 0) - ret.quantity);
    state.returns.splice(index, 1);
    saveState();
    refreshReturns();
    refreshAll();
}

function refreshReturns() {
    const tbody = document.getElementById('returns-body');
    tbody.innerHTML = '';
    [...state.returns].reverse().forEach((r, i) => {
        const realIndex = state.returns.length - 1 - i;
        const product = getProduct(r.productId);
        const client = state.clients.find(c => c.id === r.clientId);
        tbody.innerHTML += `
            <tr>
                <td>${r.date}</td>
                <td>${client ? client.name : '-'}</td>
                <td>${product.name}</td>
                <td>${r.quantity}</td>
                <td>${r.reason || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteReturn(${realIndex})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// ===================== CONTACTS =====================
function openContactModal(editId) {
    const isEdit = editId !== undefined;
    const contact = isEdit ? state.contacts.find(c => c.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>${t('name')}:</label>
            <input type="text" id="contact-name" value="${contact ? contact.name : ''}" placeholder="${t('enter_name')}">
        </div>
        <div class="form-group">
            <label>${t('phone')}:</label>
            <input type="text" id="contact-phone" value="${contact ? contact.phone || '' : ''}" placeholder="${t('enter_phone')}">
        </div>
        <div class="form-group">
            <label>${t('email')} (${t('optional')}):</label>
            <input type="email" id="contact-email" value="${contact ? contact.email || '' : ''}">
        </div>
        <div class="form-group">
            <label>${t('role')}:</label>
            <select id="contact-role">
                <option value="supplier" ${contact && contact.role === 'supplier' ? 'selected' : ''}>${t('supplier')}</option>
                <option value="client" ${contact && contact.role === 'client' ? 'selected' : ''}>${t('client_role')}</option>
                <option value="other" ${contact && contact.role === 'other' ? 'selected' : ''}>${t('other')}</option>
            </select>
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="contact-note">${contact ? contact.note || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateContact('${editId}')` : 'addContact()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('add_contact')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('add_contact'), html);
}

function addContact() {
    const name = document.getElementById('contact-name').value.trim();
    if (!name) return;
    state.contacts.push({
        id: Date.now().toString(),
        name,
        phone: document.getElementById('contact-phone').value,
        email: document.getElementById('contact-email').value,
        role: document.getElementById('contact-role').value,
        note: document.getElementById('contact-note').value
    });
    saveState();
    closeModal();
    refreshContacts();
}

function updateContact(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;
    contact.name = document.getElementById('contact-name').value.trim();
    contact.phone = document.getElementById('contact-phone').value;
    contact.email = document.getElementById('contact-email').value;
    contact.role = document.getElementById('contact-role').value;
    contact.note = document.getElementById('contact-note').value;
    saveState();
    closeModal();
    refreshContacts();
}

function deleteContact(id) {
    if (!confirm(t('confirm_delete'))) return;
    state.contacts = state.contacts.filter(c => c.id !== id);
    saveState();
    refreshContacts();
}

function refreshContacts() {
    const grid = document.getElementById('contacts-grid');
    grid.innerHTML = '';
    state.contacts.forEach(c => {
        const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
        grid.innerHTML += `
            <div class="contact-card">
                <div class="contact-avatar">${initials}</div>
                <div class="contact-info">
                    <h4>${c.name}</h4>
                    <p><i class="fas fa-phone"></i> ${c.phone || '-'}</p>
                    <p><i class="fas fa-envelope"></i> ${c.email || '-'}</p>
                    <p><i class="fas fa-tag"></i> ${t(c.role === 'client' ? 'client_role' : c.role)}</p>
                </div>
                <div class="contact-actions">
                    ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-sm btn-success"><i class="fas fa-phone"></i></a>` : ''}
                    ${c.phone ? `<a href="sms:${c.phone}" class="btn btn-sm btn-secondary"><i class="fas fa-sms"></i></a>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="openContactModal('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteContact('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

// ===================== NOTES =====================
function openNoteModal(editId) {
    const isEdit = editId !== undefined;
    const note = isEdit ? state.notes.find(n => n.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>${t('enter_title')}:</label>
            <input type="text" id="note-title" value="${note ? note.title : ''}">
        </div>
        <div class="form-group">
            <label>${t('enter_note')}:</label>
            <textarea id="note-content">${note ? note.content : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateNote('${editId}')` : 'addNote()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('add_note')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('add_note'), html);
}

function addNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    if (!title) return;
    state.notes.push({
        id: Date.now().toString(),
        title,
        content,
        date: new Date().toISOString().split('T')[0]
    });
    saveState();
    closeModal();
    refreshNotes();
}

function updateNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    note.title = document.getElementById('note-title').value.trim();
    note.content = document.getElementById('note-content').value.trim();
    saveState();
    closeModal();
    refreshNotes();
}

function deleteNote(id) {
    if (!confirm(t('confirm_delete'))) return;
    state.notes = state.notes.filter(n => n.id !== id);
    saveState();
    refreshNotes();
}

function refreshNotes() {
    const grid = document.getElementById('notes-grid');
    grid.innerHTML = '';
    [...state.notes].reverse().forEach(n => {
        grid.innerHTML += `
            <div class="note-card">
                <h4>${n.title}</h4>
                <p>${n.content}</p>
                <div class="note-date">${n.date}</div>
                <div class="note-actions">
                    <button class="btn btn-sm btn-secondary" onclick="openNoteModal('${n.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteNote('${n.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

// ===================== TARGETS =====================
function openTargetModal(editId) {
    const isEdit = editId !== undefined;
    const target = isEdit ? state.targets.find(t => t.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>${t('enter_title')}:</label>
            <input type="text" id="target-title" value="${target ? target.title : ''}">
        </div>
        <div class="form-group">
            <label>${t('target_value')}:</label>
            <input type="number" id="target-goal" value="${target ? target.goal : ''}" min="1">
        </div>
        <div class="form-group">
            <label>${t('current_value')}:</label>
            <input type="number" id="target-current" value="${target ? target.current : 0}" min="0">
        </div>
        <div class="form-group">
            <label>${t('month')}:</label>
            <input type="month" id="target-month" value="${target ? target.month : new Date().toISOString().substring(0,7)}">
        </div>
        <div class="form-group">
            <label>${t('enter_description')} (${t('optional')}):</label>
            <textarea id="target-desc">${target ? target.description || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateTarget('${editId}')` : 'addTarget()'}" style="width:100%;">
            ${isEdit ? t('edit') : t('add_target')}
        </button>
    `;
    openModal(isEdit ? t('edit') : t('add_target'), html);
}

function addTarget() {
    const title = document.getElementById('target-title').value.trim();
    const goal = parseInt(document.getElementById('target-goal').value) || 0;
    if (!title || goal <= 0) return;
    state.targets.push({
        id: Date.now().toString(),
        title,
        goal,
        current: parseInt(document.getElementById('target-current').value) || 0,
        month: document.getElementById('target-month').value,
        description: document.getElementById('target-desc').value
    });
    saveState();
    closeModal();
    refreshTargets();
}

function updateTarget(id) {
    const target = state.targets.find(t => t.id === id);
    if (!target) return;
    target.title = document.getElementById('target-title').value.trim();
    target.goal = parseInt(document.getElementById('target-goal').value) || 0;
    target.current = parseInt(document.getElementById('target-current').value) || 0;
    target.month = document.getElementById('target-month').value;
    target.description = document.getElementById('target-desc').value;
    saveState();
    closeModal();
    refreshTargets();
}

function deleteTarget(id) {
    if (!confirm(t('confirm_delete'))) return;
    state.targets = state.targets.filter(t => t.id !== id);
    saveState();
    refreshTargets();
}

function refreshTargets() {
    const grid = document.getElementById('targets-grid');
    grid.innerHTML = '';
    state.targets.forEach(tg => {
        const pct = Math.min(100, Math.round((tg.current / tg.goal) * 100));
        grid.innerHTML += `
            <div class="target-card">
                <h4>${tg.title}</h4>
                <p style="font-size:0.85em;color:var(--text-secondary)">${tg.description || ''}</p>
                <p style="font-size:0.85em;color:var(--text-secondary)">${tg.month}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${pct >= 100 ? 'var(--success)' : 'var(--accent)'}">${pct}%</div>
                </div>
                <div class="target-info">
                    <span>${tg.current} / ${tg.goal}</span>
                    <span>${pct >= 100 ? '&#10003; ' + t('completed') : ''}</span>
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-secondary" onclick="openTargetModal('${tg.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTarget('${tg.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

// ===================== CALCULATOR =====================
function calculateQuick() {
    const productId = document.getElementById('calc-product').value;
    const quantity = parseInt(document.getElementById('calc-quantity').value) || 0;

    if (!productId || quantity <= 0) {
        document.getElementById('calc-buy-total').textContent = '0 ден';
        document.getElementById('calc-sell-total').textContent = '0 ден';
        document.getElementById('calc-profit').textContent = '0 ден';
        document.getElementById('calc-your-share').textContent = '0 ден';
        document.getElementById('calc-orhan-share').textContent = '0 ден';
        return;
    }

    const product = getProduct(productId);
    const buyTotal = product.buyPrice * quantity;
    const sellTotal = product.sellPrice * quantity;
    const profit = sellTotal - buyTotal;

    document.getElementById('calc-buy-total').textContent = buyTotal + ' ден';
    document.getElementById('calc-sell-total').textContent = sellTotal + ' ден';
    document.getElementById('calc-profit').textContent = profit + ' ден';
    // Feature 3: Use configurable profit split
    document.getElementById('calc-your-share').textContent = calcOwnerShare(profit) + ' ден';
    document.getElementById('calc-orhan-share').textContent = calcPartnerShare(profit) + ' ден';
}

// Feature 15: Markup calculator
function calculateMarkup() {
    const productId = document.getElementById('markup-product') ? document.getElementById('markup-product').value : '';
    const newSellPrice = parseInt(document.getElementById('markup-sell-price') ? document.getElementById('markup-sell-price').value : 0) || 0;
    const quantity = parseInt(document.getElementById('markup-quantity') ? document.getElementById('markup-quantity').value : 1) || 1;
    const markupResult = document.getElementById('markup-result');
    if (!markupResult || !productId) return;

    const product = getProduct(productId);
    const buyPrice = product.buyPrice;
    const newProfit = (newSellPrice - buyPrice) * quantity;
    const markup = buyPrice > 0 ? Math.round(((newSellPrice - buyPrice) / buyPrice) * 100) : 0;

    markupResult.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
            <div class="stat-card"><div><h3>Cmimi blerjes</h3><p>${buyPrice} den</p></div></div>
            <div class="stat-card"><div><h3>Cmimi ri shitjes</h3><p>${newSellPrice} den</p></div></div>
            <div class="stat-card"><div><h3>Fitimi total</h3><p>${newProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Markup</h3><p>${markup}%</p></div></div>
            <div class="stat-card"><div><h3>Pjesa jote</h3><p>${calcOwnerShare(newProfit)} den</p></div></div>
            <div class="stat-card"><div><h3>Pjesa e ${state.partnerName}</h3><p>${calcPartnerShare(newProfit)} den</p></div></div>
        </div>
    `;
}

// ===================== EXPENSES =====================
function openExpenseModal() {
    let html = `
        <div class="form-group">
            <label>${t('description')}:</label>
            <input type="text" id="expense-desc" placeholder="${t('enter_description')}">
        </div>
        <div class="form-group">
            <label>${t('amount')}:</label>
            <input type="number" id="expense-amount" min="1" placeholder="${t('enter_amount')}">
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="expense-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>Category:</label>
            <select id="expense-category">
                ${state.expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="expense-shared"> Shpenzim i perbashket (ndahet 50/50)
            </label>
        </div>
        <button class="btn btn-primary" onclick="addExpense()" style="width:100%;">${t('add_expense')}</button>
    `;
    openModal(t('add_expense'), html);
}

function addExpense() {
    const description = document.getElementById('expense-desc').value.trim();
    const amount = parseInt(document.getElementById('expense-amount').value) || 0;
    const date = document.getElementById('expense-date').value;
    const shared = document.getElementById('expense-shared') ? document.getElementById('expense-shared').checked : false;
    const categoryEl = document.getElementById('expense-category');
    const category = categoryEl ? categoryEl.value : 'Tjeter';

    if (!description || amount <= 0) return;

    state.expenses.push({ id: Date.now(), description, amount, date, shared, category });
    saveState();
    closeModal();
    refreshExpenses();
    showToast(t('add_expense') + ': ' + amount + ' den', 'success');
    logActivity('Expense Added', `${description} - ${amount} den (${category})`);
}

function deleteExpense(index) {
    if (!confirm(t('confirm_delete'))) return;
    state.expenses.splice(index, 1);
    saveState();
    refreshExpenses();
}

function refreshExpenses() {
    const tbody = document.getElementById('expenses-body');
    tbody.innerHTML = '';
    state.expenses.forEach((e, i) => {
        const sharedLabel = e.shared ? ' <span style="color:var(--accent);font-size:0.8em;">(50/50)</span>' : '';
        const perPerson = e.shared ? `<br><span style="font-size:0.8em;">Per person: ${Math.round(e.amount / 2)} den</span>` : '';
        tbody.innerHTML += `
            <tr>
                <td>${e.date}</td>
                <td>${e.description}${sharedLabel}</td>
                <td>${e.amount} ден${perPerson}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense(${i})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// ===================== LOCATIONS =====================
function openLocationModal() {
    let html = `
        <div class="form-group">
            <label>${t('name')}:</label>
            <input type="text" id="location-name" placeholder="${t('enter_name')}">
        </div>
        <button class="btn btn-primary" onclick="addLocation()" style="width:100%;">${t('add_location')}</button>
    `;
    openModal(t('add_location'), html);
}

function addLocation() {
    const name = document.getElementById('location-name').value.trim();
    if (!name || state.locations.includes(name)) return;
    state.locations.push(name);
    saveState();
    closeModal();
    refreshLocations();
    populateLocationSelects();
}

function deleteLocation(name) {
    state.locations = state.locations.filter(l => l !== name);
    saveState();
    refreshLocations();
    populateLocationSelects();
}

function refreshLocations() {
    const container = document.getElementById('locations-list');
    container.innerHTML = '';
    state.locations.forEach(l => {
        container.innerHTML += `
            <span class="location-tag">${l} <button onclick="deleteLocation('${l}')">&times;</button></span>
        `;
    });
}

// ===================== REPORTS =====================
function generateReport() {
    const period = document.getElementById('report-period').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;

    let sales = state.sales;
    if (dateFrom) sales = sales.filter(s => s.date >= dateFrom);
    if (dateTo) sales = sales.filter(s => s.date <= dateTo);

    const totalRevenue = sales.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    let filteredExpenses = state.expenses;
    if (dateFrom) filteredExpenses = filteredExpenses.filter(e => e.date >= dateFrom);
    if (dateTo) filteredExpenses = filteredExpenses.filter(e => e.date <= dateTo);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    let filteredReturns = state.returns;
    if (dateFrom) filteredReturns = filteredReturns.filter(r => r.date >= dateFrom);
    if (dateTo) filteredReturns = filteredReturns.filter(r => r.date <= dateTo);
    const returnLoss = filteredReturns.reduce((sum, r) => {
        const p = getProduct(r.productId);
        return sum + (p.sellPrice - p.buyPrice) * r.quantity;
    }, 0);

    // Cash vs Invoice breakdown
    const cashSales = sales.filter(s => (s.paymentType || 'cash') === 'cash');
    const invoiceSales = sales.filter(s => s.paymentType === 'invoice_60');
    const totalCashRevenue = cashSales.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalInvoiceRevenue = invoiceSales.reduce((sum, s) => sum + s.sellTotal, 0);
    const paidInvoices = invoiceSales.filter(s => s.invoicePaid);
    const unpaidInvoices = invoiceSales.filter(s => !s.invoicePaid);
    const paidInvoiceTotal = paidInvoices.reduce((sum, s) => sum + s.sellTotal, 0);
    const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, s) => sum + s.sellTotal, 0);
    const overdueInv = unpaidInvoices.filter(s => s.dueDate && s.dueDate < new Date().toISOString().split('T')[0]);
    const overdueInvTotal = overdueInv.reduce((sum, s) => sum + s.sellTotal, 0);

    const statsContainer = document.getElementById('report-stats');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-money-bill-wave"></i>
            <div><h3>${t('total_sales_amount')}</h3><p>${totalRevenue} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-chart-line"></i>
            <div><h3>${t('total_profit_amount')}</h3><p>${totalProfit} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-receipt"></i>
            <div><h3>${t('total_expenses')}</h3><p>${totalExpenses} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-coins"></i>
            <div><h3>${t('net_profit')}</h3><p>${netProfit} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-user"></i>
            <div><h3>${t('your_share')} (${state.profitSplit.owner}%)</h3><p>${calcOwnerShare(netProfit)} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-user-friends"></i>
            <div><h3>${state.partnerName} (${state.profitSplit.partner}%)</h3><p>${calcPartnerShare(netProfit)} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-money-bill"></i>
            <div><h3>${t('total_cash')}</h3><p>${totalCashRevenue} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-file-invoice-dollar"></i>
            <div><h3>${t('total_invoices')}</h3><p>${totalInvoiceRevenue} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-clock"></i>
            <div><h3>${t('open_invoices')}</h3><p>${unpaidInvoices.length} (${unpaidInvoiceTotal} ден)</p></div>
        </div>
        <div class="stat-card" style="${overdueInv.length > 0 ? 'border-left:4px solid var(--danger)' : ''}">
            <i class="fas fa-exclamation-circle"></i>
            <div><h3>${t('overdue_invoices')}</h3><p>${overdueInv.length} (${overdueInvTotal} ден)</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-hand-holding-usd"></i>
            <div><h3>${t('faton_cash_debt')}</h3><p>${calcFatonDebt()} ден</p></div>
        </div>
        <div class="stat-card">
            <i class="fas fa-coins"></i>
            <div><h3>${t('profit_to_collect')}</h3><p>${calcFatonProfitOwed() - calcFatonProfitCollected()} ден</p></div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--success)">
            <i class="fas fa-check-circle"></i>
            <div><h3>Fitimi real</h3><p>${cashSales.reduce((s, x) => s + x.profit, 0) + calcFatonProfitCollected()} ден</p></div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--warning)">
            <i class="fas fa-file-alt"></i>
            <div><h3>Fitimi ne leter</h3><p>${totalProfit} ден</p></div>
        </div>
    `;

    updateReportCharts(sales);
}

function updateReportCharts(sales) {
    // Comparison chart
    const months = {};
    sales.forEach(s => {
        const m = s.date.substring(0, 7);
        months[m] = (months[m] || 0) + s.profit;
    });

    const compCtx = document.getElementById('comparisonChart').getContext('2d');
    if (window.compChart) window.compChart.destroy();
    window.compChart = new Chart(compCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(months),
            datasets: [{
                label: t('profit'),
                data: Object.values(months),
                backgroundColor: '#e17055'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Location chart
    const locationData = {};
    sales.forEach(s => {
        const loc = s.location || 'N/A';
        locationData[loc] = (locationData[loc] || 0) + s.sellTotal;
    });

    const locCtx = document.getElementById('locationChart').getContext('2d');
    if (window.locChart) window.locChart.destroy();
    window.locChart = new Chart(locCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(locationData),
            datasets: [{
                data: Object.values(locationData),
                backgroundColor: ['#e17055', '#00b894', '#fdcb6e', '#6c5ce7', '#74b9ff']
            }]
        },
        options: { responsive: true }
    });
}

// ===================== EXPORT =====================
function exportCSV() {
    let csv = 'Data,Produkti,Sasia,Cmimi Blerjes,Cmimi Shitjes,Totali,Fitimi,Klienti,Lokacioni,Lloji Pageses,Data Afatit,Statusi Fatures\n';
    state.sales.forEach(s => {
        const p = getProduct(s.productId);
        const client = s.clientId ? state.clients.find(c => c.id === s.clientId) : null;
        const pType = s.paymentType || 'cash';
        let invStatus = '';
        if (pType === 'invoice_60') {
            invStatus = s.invoicePaid ? 'E paguar' : (s.dueDate && s.dueDate < new Date().toISOString().split('T')[0] ? 'E vonuar' : 'E papaguar');
        }
        csv += `${s.date},${p.name},${s.quantity},${p.buyPrice},${p.sellPrice},${s.sellTotal},${s.profit},${client ? client.name : ''},${s.location || ''},${pType === 'cash' ? 'Cash' : 'Fature 60'},${s.dueDate || ''},${invStatus}\n`;
    });
    downloadFile('hurma-raport.csv', csv, 'text/csv');
}

function exportPDF() {
    // Simple text-based report
    let text = '=== HURMA APP - RAPORT ===\n\n';
    text += `Data: ${new Date().toLocaleDateString()}\n\n`;
    text += `Totali shitjeve: ${state.sales.reduce((s, x) => s + x.sellTotal, 0)} ден\n`;
    text += `Fitimi total: ${state.sales.reduce((s, x) => s + x.profit, 0)} ден\n`;
    text += `Shpenzimet: ${state.expenses.reduce((s, x) => s + x.amount, 0)} ден\n\n`;
    text += '--- SHITJET ---\n';
    state.sales.forEach(s => {
        const p = getProduct(s.productId);
        text += `${s.date} | ${p.name} x${s.quantity} | ${s.sellTotal} ден | Fitim: ${s.profit} ден\n`;
    });
    downloadFile('hurma-raport.txt', text, 'text/plain');
}

function printReport() {
    window.print();
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ===================== BACKUP =====================
function exportBackup() {
    const data = JSON.stringify(state, null, 2);
    downloadFile('hurma-backup.json', data, 'application/json');
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    // Reset input so same file can be selected again
    event.target.value = '';
    // Use the same modal-based restore flow
    const reader = new FileReader();
    reader.onerror = () => showToast('Gabim gjatë leximit!', 'error');
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                showToast('Skedari nuk është backup valid!', 'error');
                return;
            }
            window._pendingRestore = data;
            window._pendingRestoreFile = file.name;
            // Reuse the same confirmation modal from restoreFromBackup
            const salesCount = Array.isArray(data.sales) ? data.sales.length : 0;
            const clientsCount = Array.isArray(data.clients) ? data.clients.length : 0;
            const stockCount = data.stock ? Object.keys(data.stock).length : 0;
            const paymentsCount = Array.isArray(data.clientPayments) ? data.clientPayments.length : 0;
            openModal('Importo Backup', `
                <div style="text-align:center;padding:10px;">
                    <div style="font-size:3em;margin-bottom:10px;">📦</div>
                    <h3 style="margin-bottom:15px;">Skedari: ${file.name}</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;text-align:left;background:var(--bg-secondary);padding:15px;border-radius:10px;">
                        <div><i class="fas fa-shopping-cart"></i> Shitje: <strong>${salesCount}</strong></div>
                        <div><i class="fas fa-users"></i> Klientë: <strong>${clientsCount}</strong></div>
                        <div><i class="fas fa-boxes"></i> Produkte stok: <strong>${stockCount}</strong></div>
                        <div><i class="fas fa-money-bill"></i> Pagesa: <strong>${paymentsCount}</strong></div>
                    </div>
                    <div style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:15px;color:#e65100;">
                        <i class="fas fa-exclamation-triangle"></i> <strong>KUJDES:</strong> Të dhënat aktuale do të zëvendësohen!
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="closeModal()" style="flex:1;padding:12px;border:2px solid var(--border);background:var(--bg);color:var(--text-primary);border-radius:8px;cursor:pointer;font-size:1em;">
                            <i class="fas fa-times"></i> Anulo
                        </button>
                        <button onclick="_confirmRestore()" style="flex:1;padding:12px;border:none;background:var(--success);color:white;border-radius:8px;cursor:pointer;font-size:1em;font-weight:bold;">
                            <i class="fas fa-check"></i> Konfirmo Rikthimin
                        </button>
                    </div>
                </div>
            `);
        } catch (err) {
            showToast('Skedari JSON i dëmtuar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ===================== NOTIFICATIONS =====================
function checkNotifications() {
    state.notifications = [];

    // Low stock
    PRODUCTS.forEach(p => {
        if ((state.stock[p.id] || 0) < 10) {
            state.notifications.push({
                type: 'warning',
                text: `${p.name}: ${t('low_stock')} (${state.stock[p.id] || 0} ${t('pieces')})`
            });
        }
    });

    // Expiring soon
    state.stockBatches.forEach(batch => {
        const daysLeft = Math.ceil((new Date(batch.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        const product = getProduct(batch.productId);
        if (daysLeft < 0) {
            state.notifications.push({
                type: 'danger',
                text: `${product.name}: ${t('expired')}! (${batch.expiry})`
            });
        } else if (daysLeft < 14) {
            state.notifications.push({
                type: 'warning',
                text: `${product.name}: ${t('expiring_soon')} (${daysLeft} ${t('days_left')})`
            });
        }
    });

    // Faton debt
    const fatonDebt = calcFatonDebt();
    if (fatonDebt > 5000) {
        state.notifications.push({
            type: 'danger',
            text: `${t('faton_debt')}: ${fatonDebt} ден`
        });
    }

    // Feature 6: Alert when Faton debt exceeds 10,000
    if (fatonDebt > 10000) {
        state.notifications.push({
            type: 'danger',
            text: `KUJDES: Borxhi i Fatonit ka kaluar 10,000 den! (${fatonDebt} den)`
        });
    }

    // Feature 14: Smart stock depletion alerts
    PRODUCTS.forEach(p => {
        const days = calcStockDepletionDays(p.id);
        if (days !== null && days <= 7) {
            state.notifications.push({
                type: 'warning',
                text: `${p.name} do te mbaroje per ~${days} dite (bazuar ne shitje)`
            });
        }
    });

    // Client debts
    state.clients.forEach(c => {
        if (c.debt > 0) {
            state.notifications.push({
                type: 'info',
                text: `${c.name}: ${t('debt')} ${c.debt} ден`
            });
        }
    });

    // Uncollected profit from Faton
    const profitToCollect = calcFatonProfitOwed() - calcFatonProfitCollected();
    if (profitToCollect > 0) {
        state.notifications.push({
            type: 'info',
            text: `${t('profit_to_collect')}: ${profitToCollect} ден (${t('faton_profit_remaining')})`
        });
    }

    // Overdue invoices + Feature 6: Smart notifications at 3, 7, 14 days
    const todayStr = new Date().toISOString().split('T')[0];
    state.sales.filter(s => s.paymentType === 'invoice_60' && !s.invoicePaid).forEach(s => {
        const client = s.clientId ? state.clients.find(c => c.id === s.clientId) : null;
        const product = getProduct(s.productId);
        const daysLeft = s.dueDate ? Math.ceil((new Date(s.dueDate) - new Date()) / (1000*60*60*24)) : 0;
        if (daysLeft < 0) {
            state.notifications.push({
                type: 'danger',
                text: `${t('overdue')}: ${product.name} - ${client ? client.name : ''} - ${s.sellTotal} ден (${Math.abs(daysLeft)} ${t('overdue_days')})`
            });
        } else if (daysLeft <= 3) {
            state.notifications.push({
                type: 'danger',
                text: `URGJENT (3 dite): ${product.name} - ${client ? client.name : ''} - ${s.sellTotal} ден`
            });
        } else if (daysLeft <= 7) {
            state.notifications.push({
                type: 'warning',
                text: `${t('invoice_60')} (7 dite): ${product.name} - ${client ? client.name : ''} - ${s.sellTotal} ден (${daysLeft} ${t('days_until_due')})`
            });
        } else if (daysLeft <= 14) {
            state.notifications.push({
                type: 'info',
                text: `${t('invoice_60')} (14 dite): ${product.name} - ${client ? client.name : ''} - ${s.sellTotal} ден (${daysLeft} ${t('days_until_due')})`
            });
        }
    });

    // Update badge
    const badge = document.getElementById('notification-badge');
    if (state.notifications.length > 0) {
        badge.textContent = state.notifications.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Update panel
    const list = document.getElementById('notification-list');
    list.innerHTML = '';
    state.notifications.forEach(n => {
        list.innerHTML += `<div class="notification-item ${n.type}">${n.text}</div>`;
    });
}

function toggleNotifications() {
    document.getElementById('notification-panel').classList.toggle('hidden');
}

// ===================== INVOICE =====================
function generateInvoice(saleIndex) {
    const sale = state.sales[saleIndex];
    const product = getProduct(sale.productId);
    const client = sale.clientId ? state.clients.find(c => c.id === sale.clientId) : null;

    const content = document.getElementById('invoice-content');
    content.innerHTML = `
        <div class="invoice-header">
            <h2>HURMA APP</h2>
            <p>${t('invoice')}</p>
        </div>
        <div class="invoice-details">
            <p><strong>${t('date')}:</strong> ${sale.date}</p>
            ${client ? `<p><strong>${t('client')}:</strong> ${client.name}</p>` : ''}
            ${sale.location ? `<p><strong>${t('location')}:</strong> ${sale.location}</p>` : ''}
        </div>
        <table class="invoice-table">
            <thead>
                <tr><th>${t('product')}</th><th>${t('quantity')}</th><th>${t('sell_price')}</th><th>${t('total')}</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>${product.name}</td>
                    <td>${sale.quantity}</td>
                    <td>${product.sellPrice} ден</td>
                    <td>${sale.sellTotal} ден</td>
                </tr>
            </tbody>
        </table>
        ${sale.discount ? `<p>${t('discount')}: ${sale.discount}%</p>` : ''}
        <div class="invoice-total">${t('total')}: ${sale.sellTotal} ден</div>
    `;

    document.getElementById('invoice-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
}

function printInvoice() {
    const content = document.getElementById('invoice-content').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>${t('invoice')}</title>
        <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}h2{margin:0}.invoice-total{text-align:right;font-size:1.2em;font-weight:bold;margin-top:10px}</style>
        </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
}

// ===================== CHARTS =====================
let salesChart, profitChart, productChart;

function initCharts() {
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: t('sales'), data: [], borderColor: '#e17055', backgroundColor: 'rgba(225,112,85,0.1)', fill: true, tension: 0.3 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const profitCtx = document.getElementById('profitChart').getContext('2d');
    profitChart = new Chart(profitCtx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: t('profit'), data: [], backgroundColor: '#00b894' }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const productCtx = document.getElementById('productChart').getContext('2d');
    productChart = new Chart(productCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#e17055', '#00b894', '#fdcb6e', '#6c5ce7'] }] },
        options: { responsive: true }
    });
}

function updateCharts() {
    if (typeof salesChart === 'undefined' || !salesChart || typeof profitChart === 'undefined' || !profitChart) return;
    // Last 7 days
    const days = [];
    const salesData = [];
    const profitData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push(dateStr.substring(5));
        const daySales = state.sales.filter(s => s.date === dateStr);
        salesData.push(daySales.reduce((sum, s) => sum + s.sellTotal, 0));
        profitData.push(daySales.reduce((sum, s) => sum + s.profit, 0));
    }

    salesChart.data.labels = days;
    salesChart.data.datasets[0].data = salesData;
    salesChart.update();

    profitChart.data.labels = days;
    profitChart.data.datasets[0].data = profitData;
    profitChart.update();

    // Product chart
    const productData = {};
    PRODUCTS.forEach(p => {
        productData[p.name] = state.sales.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0);
    });
    productChart.data.labels = Object.keys(productData);
    productChart.data.datasets[0].data = Object.values(productData);
    productChart.update();
}

// ===================== HELPERS =====================
function getProduct(id) {
    return PRODUCTS.find(p => p.id === id) || PRODUCTS[0];
}

function openModal(title, bodyHtml) {
    if (bodyHtml === undefined) {
        // Single argument: treat as full HTML body
        document.getElementById('modal-title').textContent = '';
        document.getElementById('modal-body').innerHTML = title;
    } else {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
    }
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('invoice-modal').classList.add('hidden');
}

function populateProductSelects() {
    // Sales filter
    const salesFilter = document.getElementById('sales-product-filter');
    salesFilter.innerHTML = `<option value="">${t('all_products')}</option>`;
    PRODUCTS.forEach(p => {
        salesFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    // Calculator
    const calcSelect = document.getElementById('calc-product');
    calcSelect.innerHTML = '<option value="">--</option>';
    PRODUCTS.forEach(p => {
        calcSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.buyPrice}/${p.sellPrice})</option>`;
    });
}

function populateLocationSelects() {
    const salesLocFilter = document.getElementById('sales-location-filter');
    salesLocFilter.innerHTML = `<option value="">${t('all_locations')}</option>`;
    state.locations.forEach(l => {
        salesLocFilter.innerHTML += `<option value="${l}">${l}</option>`;
    });
}

// ===================== FEATURE 23: TOAST NOTIFICATIONS =====================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: '#00b894', error: '#d63031', warning: '#fdcb6e', info: '#0984e3' };
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:0.9em;max-width:350px;animation:slideIn 0.3s ease;cursor:pointer;`;
    toast.textContent = message;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 4000);
}

// ===================== FEATURE 19: DUPLICATE SALE =====================
function duplicateSale(index) {
    const sale = state.sales[index];
    if (!sale) return;
    // Open sale modal pre-filled with this sale's data
    let html = `
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="sale-product">
                ${PRODUCTS.map(p => `<option value="${p.id}" ${sale.productId === p.id ? 'selected' : ''}>${p.name} (${t('buy_price')}: ${p.buyPrice}, ${t('sell_price')}: ${p.sellPrice})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="sale-quantity" min="1" value="${sale.quantity}">
        </div>
        <div class="form-group">
            <label>${t('discount')} (%):</label>
            <input type="number" id="sale-discount" min="0" max="100" value="${sale.discount || 0}">
        </div>
        <div class="form-group">
            <label>${t('client')} (${t('optional')}):</label>
            <select id="sale-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}" ${sale.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('location')}:</label>
            <select id="sale-location">
                ${state.locations.map(l => `<option value="${l}" ${sale.location === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('date')}:</label>
            <input type="date" id="sale-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>${t('note')} (${t('optional')}):</label>
            <textarea id="sale-note">${sale.note || ''}</textarea>
        </div>
        <div class="form-group">
            <label>${t('payment_type')}:</label>
            <select id="sale-payment-type" onchange="toggleInvoiceDueDate()">
                <option value="cash" ${sale.paymentType === 'cash' ? 'selected' : ''}>${t('cash')}</option>
                <option value="invoice_60" ${sale.paymentType === 'invoice_60' ? 'selected' : ''}>${t('invoice_60')}</option>
            </select>
        </div>
        <div class="form-group ${sale.paymentType === 'invoice_60' ? '' : 'hidden'}" id="invoice-due-date-group">
            <label>${t('invoice_due_date')}:</label>
            <input type="date" id="sale-due-date" value="">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="sale-is-debt" ${sale.isDebt ? 'checked' : ''}> ${t('debt')} (${t('client')} ${t('pay_debt')})
            </label>
        </div>
        <button class="btn btn-primary" onclick="addSale()" style="width:100%;">
            ${t('add_sale')} (Kopje)
        </button>
    `;
    openModal(t('new_sale') + ' (Kopje)', html);
}

// ===================== FEATURE 10: MONTHLY TABS IN SALES =====================
function renderSalesMonthTabs() {
    let tabsEl = document.getElementById('sales-month-tabs');
    if (!tabsEl) return;

    const months = new Set();
    state.sales.forEach(s => {
        if (s.date) months.add(s.date.substring(0, 7));
    });
    const sortedMonths = [...months].sort().reverse();

    let html = `<button class="btn btn-sm ${!state.salesMonthFilter ? 'btn-primary' : 'btn-secondary'}" onclick="setSalesMonthFilter('')" style="margin:2px;">Te gjitha</button>`;
    sortedMonths.forEach(m => {
        const [year, month] = m.split('-');
        const monthNames = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nen', 'Dhj'];
        const label = monthNames[parseInt(month) - 1] + ' ' + year;
        html += `<button class="btn btn-sm ${state.salesMonthFilter === m ? 'btn-primary' : 'btn-secondary'}" onclick="setSalesMonthFilter('${m}')" style="margin:2px;">${label}</button>`;
    });
    tabsEl.innerHTML = html;
}

function setSalesMonthFilter(month) {
    state.salesMonthFilter = month;
    refreshSales();
}

// ===================== FEATURES 5+18: PRODUCT HISTORY WITH CHART =====================
function showProductHistory(productId) {
    const product = getProduct(productId);
    const productSales = state.sales.filter(s => s.productId === productId);
    const totalSold = productSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalBought = (state.fatonPurchases || []).filter(p => p.productId === productId).reduce((sum, p) => sum + p.quantity, 0);
    const totalProfit = productSales.reduce((sum, s) => sum + s.profit, 0);

    // Top clients
    const clientCounts = {};
    productSales.forEach(s => {
        if (s.clientId) {
            const client = state.clients.find(c => c.id === s.clientId);
            const name = client ? client.name : s.clientId;
            clientCounts[name] = (clientCounts[name] || 0) + s.quantity;
        }
    });
    const topClients = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Monthly sales data for chart
    const monthlySales = {};
    productSales.forEach(s => {
        const m = s.date.substring(0, 7);
        monthlySales[m] = (monthlySales[m] || 0) + s.quantity;
    });
    const sortedMonths = Object.keys(monthlySales).sort();

    let html = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
            <div class="stat-card"><div><h3>Totali blere</h3><p>${totalBought} cope</p></div></div>
            <div class="stat-card"><div><h3>Totali shitur</h3><p>${totalSold} cope</p></div></div>
            <div class="stat-card"><div><h3>Fitimi total</h3><p>${totalProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Stoku</h3><p>${state.stock[productId] || 0} cope</p></div></div>
        </div>
        <h4>Top klientet</h4>
        <ul style="margin-bottom:15px;">
            ${topClients.length > 0 ? topClients.map(([name, qty]) => `<li>${name}: ${qty} cope</li>`).join('') : '<li>Nuk ka te dhena</li>'}
        </ul>
        <h4>Shitjet mujore</h4>
        <canvas id="product-history-chart" height="200"></canvas>
    `;

    openModal(product.name + ' - Historia', html);

    // Render chart after modal is open
    setTimeout(() => {
        const ctx = document.getElementById('product-history-chart');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedMonths,
                    datasets: [{
                        label: 'Shitje (cope)',
                        data: sortedMonths.map(m => monthlySales[m]),
                        backgroundColor: '#e17055'
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }, 100);
}

// ===================== FEATURE 24: PIN/FAVORITE CLIENTS =====================
function togglePinClient(clientId) {
    if (!state.pinnedClients) state.pinnedClients = [];
    const idx = state.pinnedClients.indexOf(clientId);
    if (idx >= 0) {
        state.pinnedClients.splice(idx, 1);
    } else {
        state.pinnedClients.push(clientId);
    }
    saveState();
    refreshClients();
}

// ===================== FEATURE 8: FATON DEBT CHART + TRACKING =====================
function initFatonDebtTracking() {
    if (!state.fatonDebtHistory) state.fatonDebtHistory = [];
    const today = new Date().toISOString().split('T')[0];
    const lastEntry = state.fatonDebtHistory.length > 0 ? state.fatonDebtHistory[state.fatonDebtHistory.length - 1] : null;
    if (!lastEntry || lastEntry.date !== today) {
        state.fatonDebtHistory.push({
            date: today,
            debt: calcFatonDebt()
        });
        // Keep last 90 days
        if (state.fatonDebtHistory.length > 90) {
            state.fatonDebtHistory = state.fatonDebtHistory.slice(-90);
        }
        saveState();
    }
}

function renderFatonDebtChart() {
    const ctx = document.getElementById('faton-debt-chart');
    if (!ctx) return;
    const history = state.fatonDebtHistory || [];
    if (window.fatonDebtChartInstance) window.fatonDebtChartInstance.destroy();
    window.fatonDebtChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: history.map(h => h.date.substring(5)),
            datasets: [{
                label: 'Borxhi Fatonit (den)',
                data: history.map(h => h.debt),
                borderColor: '#d63031',
                backgroundColor: 'rgba(214,48,49,0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
    });
}

// ===================== FEATURE 9: FATON EXPORT REPORT =====================
function exportFatonReport() {
    const purchases = state.fatonPurchases || [];
    const payments = state.fatonPayments || [];
    const debt = calcFatonDebt();
    const profitOwed = calcFatonProfitOwed();
    const profitCollected = calcFatonProfitCollected();

    let text = '=== RAPORTI I FATONIT ===\n';
    text += `Data: ${new Date().toLocaleDateString()}\n\n`;
    text += `Totali blerjeve: ${purchases.reduce((s, p) => s + p.total, 0)} den\n`;
    text += `Totali pagesave: ${payments.reduce((s, p) => s + p.amount, 0)} den\n`;
    text += `Borxhi mbetur: ${debt} den\n`;
    text += `Fitimi nga faturat: ${profitOwed} den\n`;
    text += `Fitimi i mbledhur: ${profitCollected} den\n`;
    text += `Fitimi per tu mbledhur: ${profitOwed - profitCollected} den\n\n`;

    text += '--- BLERJET ---\n';
    text += 'Data,Produkti,Sasia,Totali\n';
    purchases.forEach(p => {
        const product = getProduct(p.productId);
        text += `${p.date},${product.name},${p.quantity},${p.total}\n`;
    });

    text += '\n--- PAGESAT ---\n';
    text += 'Data,Shuma,Shenime\n';
    payments.forEach(p => {
        text += `${p.date},${p.amount},${p.note || ''}\n`;
    });

    downloadFile('faton-raport.csv', text, 'text/csv');
    showToast('Raporti i Fatonit u eksportua', 'success');
}

// ===================== FEATURE 20: ADVANCED FATON FILTERING =====================
function filterFatonPurchases() {
    const dateFrom = document.getElementById('faton-filter-date-from') ? document.getElementById('faton-filter-date-from').value : '';
    const dateTo = document.getElementById('faton-filter-date-to') ? document.getElementById('faton-filter-date-to').value : '';
    const productFilter = document.getElementById('faton-filter-product') ? document.getElementById('faton-filter-product').value : '';

    const purchasesBody = document.getElementById('faton-purchases-body');
    if (!purchasesBody) return;
    purchasesBody.innerHTML = '';

    let purchases = [...(state.fatonPurchases || [])].reverse();
    if (dateFrom) purchases = purchases.filter(p => p.date >= dateFrom);
    if (dateTo) purchases = purchases.filter(p => p.date <= dateTo);
    if (productFilter) purchases = purchases.filter(p => p.productId === productFilter);

    purchases.forEach(p => {
        const product = getProduct(p.productId);
        purchasesBody.innerHTML += `
            <tr>
                <td>${p.date}</td>
                <td>${product ? product.name : '-'}</td>
                <td>${p.quantity}</td>
                <td>${p.total} ден</td>
                <td>-</td>
            </tr>
        `;
    });
}

// ===================== FEATURES 2+17: BALANCE SHEET PAGE =====================
function refreshBalance() {
    const container = document.getElementById('balance-content');
    if (!container) return;

    const fatonDebt = calcFatonDebt();
    const profitToCollect = calcFatonProfitOwed() - calcFatonProfitCollected();
    const clientDebts = state.clients.reduce((sum, c) => sum + (c.debt || 0), 0);

    // Stock monetary value
    let stockValue = 0;
    PRODUCTS.forEach(p => {
        stockValue += (state.stock[p.id] || 0) * p.buyPrice;
    });
    let stockSellValue = 0;
    PRODUCTS.forEach(p => {
        stockSellValue += (state.stock[p.id] || 0) * p.sellPrice;
    });

    // Cash from sales (approximate cash in hand)
    const totalCashRevenue = state.sales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0);
    const totalFatonPayments = state.fatonPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const cashInHand = totalCashRevenue - totalFatonPayments - totalExpenses;

    // Net balance: what we have - what we owe
    const totalAssets = cashInHand + profitToCollect + clientDebts + stockSellValue;
    const totalLiabilities = fatonDebt;
    const netBalance = totalAssets - totalLiabilities;

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;">
            <div class="stat-card" style="border-left:4px solid var(--success)">
                <i class="fas fa-wallet"></i>
                <div><h3>Cash ne dore (aprox)</h3><p>${cashInHand} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--danger)">
                <i class="fas fa-hand-holding-usd"></i>
                <div><h3>Borxhi ndaj Fatonit</h3><p>${fatonDebt} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--warning)">
                <i class="fas fa-coins"></i>
                <div><h3>Fitimi per tu mbledhur</h3><p>${profitToCollect} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--info, #0984e3)">
                <i class="fas fa-users"></i>
                <div><h3>Borxhet e klienteve</h3><p>${clientDebts} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--accent)">
                <i class="fas fa-boxes"></i>
                <div><h3>Vlera e stokut (blerje)</h3><p>${stockValue} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--accent)">
                <i class="fas fa-store"></i>
                <div><h3>Vlera e stokut (shitje)</h3><p>${stockSellValue} den</p></div>
            </div>
            <div class="stat-card" style="border-left:4px solid ${netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                <i class="fas fa-balance-scale"></i>
                <div><h3>Bilanci neto</h3><p style="font-size:1.3em;font-weight:bold;color:${netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">${netBalance} den</p></div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-pie"></i>
                <div><h3>Totali aseteve</h3><p>${totalAssets} den</p></div>
            </div>
        </div>

        <h3 style="margin-top:25px;">Borxhet e klienteve</h3>
        <div class="table-container">
            <table>
                <thead><tr><th>Klienti</th><th>Borxhi</th><th>Faturat e hapura</th></tr></thead>
                <tbody>
                    ${state.clients.filter(c => c.debt > 0 || state.sales.some(s => s.clientId === c.id && s.paymentType === 'invoice_60' && !s.invoicePaid)).map(c => {
                        const openInv = state.sales.filter(s => s.clientId === c.id && s.paymentType === 'invoice_60' && !s.invoicePaid);
                        const invTotal = openInv.reduce((sum, s) => sum + s.sellTotal, 0);
                        return `<tr>
                            <td>${c.name}</td>
                            <td style="color:var(--danger)">${c.debt || 0} den</td>
                            <td>${openInv.length > 0 ? openInv.length + ' (' + invTotal + ' den)' : '-'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===================== FEATURE 3: AUTO WEEKLY REPORT =====================
function checkWeeklyReport() {
    if (!state.weeklyReports) state.weeklyReports = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Check if we already have a report for this week
    const existingReport = state.weeklyReports.find(r => r.weekStart === weekStartStr);
    if (existingReport) return;

    // Generate report for last week if we are at start of new week (Sunday/Monday)
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

    // Check if last week report already exists
    if (state.weeklyReports.find(r => r.weekStart === lastWeekStartStr)) return;

    // Generate last week's report
    const weekSales = state.sales.filter(s => s.date >= lastWeekStartStr && s.date <= lastWeekEndStr);
    if (weekSales.length === 0) return;

    const report = {
        id: Date.now(),
        weekStart: lastWeekStartStr,
        weekEnd: lastWeekEndStr,
        totalSales: weekSales.length,
        totalRevenue: weekSales.reduce((sum, s) => sum + s.sellTotal, 0),
        totalProfit: weekSales.reduce((sum, s) => sum + s.profit, 0),
        cashRevenue: weekSales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0),
        invoiceRevenue: weekSales.filter(s => s.paymentType === 'invoice_60').reduce((sum, s) => sum + s.sellTotal, 0),
        topProduct: (() => {
            const counts = {};
            weekSales.forEach(s => counts[s.productId] = (counts[s.productId] || 0) + s.quantity);
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            return top ? getProduct(top[0]).name : '-';
        })(),
        generatedAt: new Date().toISOString()
    };

    state.weeklyReports.push(report);
    // Keep last 52 weeks
    if (state.weeklyReports.length > 52) {
        state.weeklyReports = state.weeklyReports.slice(-52);
    }
    saveState();
}

// ===================== FEATURE 7: QUICK ACTION HELPERS =====================
function openQuickCashSale() {
    openSaleModal();
    // Pre-select cash after modal opens
    setTimeout(() => {
        const paymentSelect = document.getElementById('sale-payment-type');
        if (paymentSelect) paymentSelect.value = 'cash';
    }, 50);
}

function openQuickInvoiceSale() {
    openSaleModal();
    // Pre-select invoice after modal opens
    setTimeout(() => {
        const paymentSelect = document.getElementById('sale-payment-type');
        if (paymentSelect) {
            paymentSelect.value = 'invoice_60';
            toggleInvoiceDueDate();
        }
    }, 50);
}

// ===================== FEATURE 14: SMART STOCK DEPLETION =====================
function calcStockDepletionDays(productId) {
    const currentStock = state.stock[productId] || 0;
    if (currentStock <= 0) return 0;

    // Calculate average daily sales from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentSales = state.sales.filter(s => s.productId === productId && s.date >= thirtyDaysAgoStr);
    const totalSold = recentSales.reduce((sum, s) => sum + s.quantity, 0);
    const avgDailySales = totalSold / 30;

    if (avgDailySales <= 0) return null; // No sales data
    return Math.round(currentStock / avgDailySales);
}

// ===================== FEATURE 12: KEYBOARD SHORTCUTS =====================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        // Escape: close modal
        if (e.key === 'Escape') {
            closeModal();
            return;
        }

        // N: new sale
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            openSaleModal();
            return;
        }

        // F: Faton payment
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            openFatonPaymentModal();
            return;
        }

        // S: add stock
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            openStockModal();
            return;
        }

        // Ctrl+E: export
        if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            exportCSV();
            return;
        }

        // ?: show keyboard shortcuts help
        if (e.key === '?') {
            e.preventDefault();
            showKeyboardShortcutsHelp();
            return;
        }
    });
}

function showKeyboardShortcutsHelp() {
    const html = `
        <div style="line-height:2;">
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">N</kbd> - Shitje e re</p>
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">F</kbd> - Pagesa Fatonit</p>
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">S</kbd> - Shto stok</p>
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">Ctrl+E</kbd> - Eksporto CSV</p>
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">Escape</kbd> - Mbyll modalin</p>
            <p><kbd style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;border:1px solid var(--border);">?</kbd> - Ndihme per shortcutet</p>
        </div>
    `;
    openModal('Shortcutet e tastjeres', html);
}

// ===================== FEATURE 22: OFFLINE MODE INDICATOR =====================
function initOfflineMode() {
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

function updateOnlineStatus() {
    let banner = document.getElementById('offline-banner');
    if (!navigator.onLine) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#d63031;color:#fff;text-align:center;padding:10px;z-index:9999;font-weight:bold;';
            banner.innerHTML = '<i class="fas fa-wifi-slash"></i> Jeni offline - Te dhenat ruhen lokalisht';
            document.body.appendChild(banner);
        }
    } else {
        if (banner) banner.remove();
    }
}

// ===================== FEATURE 25: ORHAN REPORT =====================
function generateOrhanReport() {
    const dateFrom = document.getElementById('orhan-date-from') ? document.getElementById('orhan-date-from').value : '';
    const dateTo = document.getElementById('orhan-date-to') ? document.getElementById('orhan-date-to').value : '';

    let sales = state.sales;
    if (dateFrom) sales = sales.filter(s => s.date >= dateFrom);
    if (dateTo) sales = sales.filter(s => s.date <= dateTo);

    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    let filteredExpenses = state.expenses;
    if (dateFrom) filteredExpenses = filteredExpenses.filter(e => e.date >= dateFrom);
    if (dateTo) filteredExpenses = filteredExpenses.filter(e => e.date <= dateTo);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const sharedExpenses = filteredExpenses.filter(e => e.shared).reduce((sum, e) => sum + e.amount, 0);
    const personalExpenses = totalExpenses - sharedExpenses;
    const sharedExpensePerPerson = Math.round(sharedExpenses / 2);

    const netProfit = totalProfit - totalExpenses;
    const orhanShare = calcPartnerShare(netProfit);
    const orhanSharedExpense = sharedExpensePerPerson;

    const cashProfit = sales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.profit, 0);
    const invoiceProfit = sales.filter(s => s.paymentType === 'invoice_60').reduce((sum, s) => sum + s.profit, 0);
    const collectedProfit = calcFatonProfitCollected();

    let html = `
        <div class="form-group" style="display:flex;gap:10px;margin-bottom:15px;">
            <div>
                <label>Nga:</label>
                <input type="date" id="orhan-date-from" value="${dateFrom}" onchange="generateOrhanReport()">
            </div>
            <div>
                <label>Deri:</label>
                <input type="date" id="orhan-date-to" value="${dateTo}" onchange="generateOrhanReport()">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="stat-card"><div><h3>Fitimi total</h3><p>${totalProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Shpenzimet totale</h3><p>${totalExpenses} den</p></div></div>
            <div class="stat-card"><div><h3>Fitimi neto</h3><p>${netProfit} den</p></div></div>
            <div class="stat-card" style="border-left:4px solid var(--accent)"><div><h3>Pjesa e Orhanit</h3><p style="font-size:1.2em;font-weight:bold;">${orhanShare} den</p></div></div>
            <div class="stat-card"><div><h3>Fitimi cash</h3><p>${cashProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Fitimi faturash</h3><p>${invoiceProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Fitimi i mbledhur (fatura)</h3><p>${collectedProfit} den</p></div></div>
            <div class="stat-card"><div><h3>Shpenzime te perbashketa</h3><p>${sharedExpenses} den (${sharedExpensePerPerson} per person)</p></div></div>
        </div>
        <div style="margin-top:15px;">
            <button class="btn btn-primary" onclick="exportOrhanReport()"><i class="fas fa-download"></i> Eksporto raportin</button>
        </div>
    `;
    openModal('Raporti i Orhanit', html);
}

function exportOrhanReport() {
    const totalProfit = state.sales.reduce((sum, s) => sum + s.profit, 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    let text = '=== RAPORTI I ORHANIT ===\n';
    text += `Data: ${new Date().toLocaleDateString()}\n\n`;
    text += `Fitimi total: ${totalProfit} den\n`;
    text += `Shpenzimet: ${totalExpenses} den\n`;
    text += `Fitimi neto: ${netProfit} den\n`;
    text += `Pjesa e ${state.partnerName}: ${calcPartnerShare(netProfit)} den\n`;
    text += `Borxhi ndaj Fatonit: ${calcFatonDebt()} den\n`;

    downloadFile('orhan-raport.txt', text, 'text/plain');
    showToast('Raporti i Orhanit u eksportua', 'success');
}

// ===================== POPULATE CLIENT SELECTS WITH PINNED FIRST (Feature 24) =====================
function getClientOptionsHtml(selectedId) {
    const pinned = state.pinnedClients || [];
    const sorted = [...state.clients].sort((a, b) => {
        const aPin = pinned.includes(a.id) ? 0 : 1;
        const bPin = pinned.includes(b.id) ? 0 : 1;
        return aPin - bPin;
    });
    return sorted.map(c => {
        const pin = pinned.includes(c.id) ? '* ' : '';
        return `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${pin}${c.name}</option>`;
    }).join('');
}

// ===================== FEATURE 1: PRODUCT MANAGEMENT =====================
function openProductModal(editId) {
    const isEdit = editId !== undefined;
    const product = isEdit ? PRODUCTS.find(p => p.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>Product Name:</label>
            <input type="text" id="product-name" value="${product ? product.name : ''}" required>
        </div>
        <div class="form-group">
            <label>Weight/Size:</label>
            <input type="text" id="product-weight" value="${product ? product.weight : ''}" placeholder="e.g., 500g, 1kg">
        </div>
        <div class="form-group">
            <label>Buy Price (den):</label>
            <input type="number" id="product-buy-price" min="0" value="${product ? product.buyPrice : 0}">
        </div>
        <div class="form-group">
            <label>Sell Price (den):</label>
            <input type="number" id="product-sell-price" min="0" value="${product ? product.sellPrice : 0}">
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updateProduct('${editId}')` : 'addProduct()'}" style="width:100%;">
            ${isEdit ? 'Update Product' : 'Add Product'}
        </button>
        ${isEdit ? `<button class="btn btn-danger" onclick="deleteProduct('${editId}')" style="width:100%; margin-top:10px;">Delete Product</button>` : ''}
    `;
    openModal(isEdit ? 'Edit Product' : 'Add Product', html);
}

function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const weight = document.getElementById('product-weight').value.trim();
    const buyPrice = parseFloat(document.getElementById('product-buy-price').value) || 0;
    const sellPrice = parseFloat(document.getElementById('product-sell-price').value) || 0;

    if (!name) {
        showToast('Product name is required', 'error');
        return;
    }

    const id = 'custom_' + Date.now();
    const newProduct = { id, name, weight, buyPrice, sellPrice };
    PRODUCTS.push(newProduct);
    state.customProducts = [...PRODUCTS];
    state.stock[id] = 0;

    saveState();
    closeModal();
    refreshProducts();
    populateProductSelects();
    showToast('Product added successfully', 'success');
    logActivity('Product Added', `Added product: ${name}`);
}

function updateProduct(id) {
    const name = document.getElementById('product-name').value.trim();
    const weight = document.getElementById('product-weight').value.trim();
    const buyPrice = parseFloat(document.getElementById('product-buy-price').value) || 0;
    const sellPrice = parseFloat(document.getElementById('product-sell-price').value) || 0;

    if (!name) {
        showToast('Product name is required', 'error');
        return;
    }

    const productIndex = PRODUCTS.findIndex(p => p.id === id);
    if (productIndex === -1) return;

    PRODUCTS[productIndex] = { id, name, weight, buyPrice, sellPrice };
    state.customProducts = [...PRODUCTS];

    saveState();
    closeModal();
    refreshProducts();
    populateProductSelects();
    showToast('Product updated successfully', 'success');
    logActivity('Product Updated', `Updated product: ${name}`);
}

function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;

    // Check if product is used in any sales
    const usedInSales = state.sales.some(s => s.productId === id);
    if (usedInSales) {
        showToast('Cannot delete: product is used in sales history', 'error');
        return;
    }

    const productIndex = PRODUCTS.findIndex(p => p.id === id);
    if (productIndex === -1) return;

    const productName = PRODUCTS[productIndex].name;
    PRODUCTS.splice(productIndex, 1);
    state.customProducts = [...PRODUCTS];
    delete state.stock[id];

    saveState();
    closeModal();
    refreshProducts();
    populateProductSelects();
    showToast('Product deleted successfully', 'success');
    logActivity('Product Deleted', `Deleted product: ${productName}`);
}

function refreshProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;

    let html = '<h3>Product Management</h3>';
    html += '<button class="btn btn-primary" onclick="openProductModal()" style="margin-bottom:15px;">Add New Product</button>';
    html += '<table class="data-table"><thead><tr><th>Name</th><th>Weight</th><th>Buy Price</th><th>Sell Price</th><th>Margin</th><th>Actions</th></tr></thead><tbody>';

    PRODUCTS.forEach(p => {
        const margin = p.sellPrice - p.buyPrice;
        const marginPct = p.buyPrice > 0 ? ((margin / p.buyPrice) * 100).toFixed(1) : 0;
        html += `
            <tr>
                <td>${p.name}</td>
                <td>${p.weight}</td>
                <td>${p.buyPrice} den</td>
                <td>${p.sellPrice} den</td>
                <td>${margin} den (${marginPct}%)</td>
                <td>
                    <button class="btn btn-sm" onclick="openProductModal('${p.id}')">Edit</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===================== FEATURE 3: CONFIGURABLE PROFIT SPLIT =====================
function openProfitSplitModal() {
    let html = `
        <div class="form-group">
            <label>Partner Name:</label>
            <input type="text" id="profit-partner-name" value="${state.partnerName || 'Orhan'}">
        </div>
        <div class="form-group">
            <label>Owner Share (%):</label>
            <input type="number" id="profit-owner-pct" min="0" max="100" value="${state.profitSplit.owner}">
        </div>
        <div class="form-group">
            <label>Partner Share (%):</label>
            <input type="number" id="profit-partner-pct" min="0" max="100" value="${state.profitSplit.partner}">
        </div>
        <p style="font-size:12px; color:#666;">Note: Percentages should add up to 100%</p>
        <button class="btn btn-primary" onclick="saveProfitSplit()" style="width:100%;">Save Profit Split</button>
    `;
    openModal('Profit Split Settings', html);
}

function saveProfitSplit() {
    const partnerName = document.getElementById('profit-partner-name').value.trim();
    const ownerPct = parseFloat(document.getElementById('profit-owner-pct').value) || 50;
    const partnerPct = parseFloat(document.getElementById('profit-partner-pct').value) || 50;

    if (ownerPct + partnerPct !== 100) {
        showToast('Percentages must add up to 100%', 'error');
        return;
    }

    state.partnerName = partnerName;
    state.profitSplit = { owner: ownerPct, partner: partnerPct };

    saveState();
    closeModal();
    refreshAll();
    showToast('Profit split updated successfully', 'success');
    logActivity('Profit Split Changed', `Owner: ${ownerPct}%, ${partnerName}: ${partnerPct}%`);
}

function calcOwnerShare(profit) {
    return Math.round(profit * (state.profitSplit.owner / 100));
}

function calcPartnerShare(profit) {
    return Math.round(profit * (state.profitSplit.partner / 100));
}

// ===================== FEATURE 5: CASH DRAWER =====================
function refreshCashDrawer() {
    const today = new Date().toISOString().split('T')[0];
    const drawerToday = state.cashDrawer.find(d => d.date === today);
    const todaySales = state.sales.filter(s => s.date === today && s.paymentType === 'cash');
    const todayFatonPayments = state.fatonPayments.filter(f => f.date === today);
    const todayExpenses = state.expenses.filter(e => e.date === today);

    const startingCash = drawerToday ? drawerToday.startingCash : 0;
    const cashSales = todaySales.reduce((sum, s) => sum + s.sellTotal, 0);
    const fatonPayments = todayFatonPayments.reduce((sum, f) => sum + f.amount, 0);
    const expenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedBalance = startingCash + cashSales - fatonPayments - expenses;

    let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Starting Cash</div>
                <div class="stat-value">${startingCash} den</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cash Sales</div>
                <div class="stat-value" style="color:green;">+${cashSales} den</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Faton Payments</div>
                <div class="stat-value" style="color:red;">-${fatonPayments} den</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Expenses</div>
                <div class="stat-value" style="color:red;">-${expenses} den</div>
            </div>
            <div class="stat-card" style="background:#f0f0f0;">
                <div class="stat-label">Expected Balance</div>
                <div class="stat-value" style="font-size:24px;">${expectedBalance} den</div>
            </div>
        </div>
        <button class="btn btn-primary" onclick="openCashDrawerModal()" style="margin-top:20px;">Set Starting Cash</button>
        <h3 style="margin-top:30px;">Cash Drawer History</h3>
        <table class="data-table">
            <thead><tr><th>Date</th><th>Starting Cash</th><th>Note</th></tr></thead>
            <tbody>
                ${state.cashDrawer.slice().reverse().map(d => `
                    <tr>
                        <td>${d.date}</td>
                        <td>${d.startingCash} den</td>
                        <td>${d.note || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('page-cashDrawer').innerHTML = html;
}

function openCashDrawerModal() {
    const today = new Date().toISOString().split('T')[0];
    const existing = state.cashDrawer.find(d => d.date === today);

    let html = `
        <div class="form-group">
            <label>Date:</label>
            <input type="date" id="drawer-date" value="${today}">
        </div>
        <div class="form-group">
            <label>Starting Cash (den):</label>
            <input type="number" id="drawer-amount" min="0" value="${existing ? existing.startingCash : 0}">
        </div>
        <div class="form-group">
            <label>Note:</label>
            <textarea id="drawer-note">${existing ? existing.note || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveCashDrawer()" style="width:100%;">Save</button>
    `;
    openModal('Set Starting Cash', html);
}

function saveCashDrawer() {
    const date = document.getElementById('drawer-date').value;
    const amount = parseFloat(document.getElementById('drawer-amount').value) || 0;
    const note = document.getElementById('drawer-note').value.trim();

    const existingIndex = state.cashDrawer.findIndex(d => d.date === date);
    const drawer = { date, startingCash: amount, note };

    if (existingIndex >= 0) {
        state.cashDrawer[existingIndex] = drawer;
    } else {
        state.cashDrawer.push(drawer);
    }

    saveState();
    closeModal();
    refreshCashDrawer();
    showToast('Cash drawer updated', 'success');
    logActivity('Cash Drawer Set', `${date}: ${amount} den`);
}

// ===================== FEATURE 7: CLIENT PAYMENT HISTORY =====================
function addClientPaymentLog(clientId, amount, method, note) {
    if (!state.clientPayments) state.clientPayments = [];
    state.clientPayments.push({
        id: Date.now(),
        clientId,
        amount,
        method,
        note: note || '',
        date: new Date().toISOString().split('T')[0],
        status: 'active'
    });
    saveState();
}

// (English duplicate of showClientPaymentHistory removed - detailed Albanian version below is used)

// ===================== FEATURE 9: P&L REPORT =====================
function generatePLReport() {
    const filterMonth = state.salesMonthFilter || '';
    const sales = filterMonth ? state.sales.filter(s => s.date.startsWith(filterMonth)) : state.sales;
    const expenses = filterMonth ? state.expenses.filter(e => e.date.startsWith(filterMonth)) : state.expenses;

    const totalRevenue = sales.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalCOGS = sales.reduce((sum, s) => sum + s.buyTotal, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    const ownerShare = calcOwnerShare(netProfit);
    const partnerShare = calcPartnerShare(netProfit);

    let html = `
        <h2>Profit & Loss Statement</h2>
        ${filterMonth ? `<p>Period: ${filterMonth}</p>` : '<p>Period: All Time</p>'}
        <table class="data-table" style="margin-top:20px;">
            <tbody>
                <tr><td><strong>Revenue (Sales)</strong></td><td style="text-align:right;"><strong>${totalRevenue} den</strong></td></tr>
                <tr><td>Cost of Goods Sold</td><td style="text-align:right;">-${totalCOGS} den</td></tr>
                <tr style="background:#f0f0f0;"><td><strong>Gross Profit</strong></td><td style="text-align:right;"><strong>${grossProfit} den</strong></td></tr>
                <tr><td>Operating Expenses</td><td style="text-align:right;">-${totalExpenses} den</td></tr>
                <tr style="background:#e0e0e0;"><td><strong>Net Profit</strong></td><td style="text-align:right;"><strong>${netProfit} den</strong></td></tr>
                <tr><td>Owner Share (${state.profitSplit.owner}%)</td><td style="text-align:right;">${ownerShare} den</td></tr>
                <tr><td>${state.partnerName} Share (${state.profitSplit.partner}%)</td><td style="text-align:right;">${partnerShare} den</td></tr>
            </tbody>
        </table>
    `;
    openModal('P&L Report', html);
}

// ===================== FEATURE 10: SALES TREND ANALYSIS =====================
function refreshTrends() {
    const months3 = getLast3Months();
    const months6 = getLast6Months();
    const months12 = getLast12Months();

    let html = '<h2>Sales Trend Analysis</h2>';

    // 3 Month Trend
    html += '<h3>Last 3 Months</h3>';
    html += generateTrendTable(months3);

    // 6 Month Trend
    html += '<h3 style="margin-top:30px;">Last 6 Months</h3>';
    html += generateTrendTable(months6);

    // 12 Month Trend
    html += '<h3 style="margin-top:30px;">Last 12 Months</h3>';
    html += generateTrendTable(months12);

    document.getElementById('page-trends').innerHTML = html;
}

function getLast3Months() {
    return getLastNMonths(3);
}

function getLast6Months() {
    return getLastNMonths(6);
}

function getLast12Months() {
    return getLastNMonths(12);
}

function getLastNMonths(n) {
    const months = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        months.push(monthStr);
    }
    return months;
}

function generateTrendTable(months) {
    let html = '<table class="data-table"><thead><tr><th>Month</th><th>Sales</th><th>Revenue</th><th>Profit</th><th>Trend</th></tr></thead><tbody>';

    const data = months.map(m => {
        const sales = state.sales.filter(s => s.date.startsWith(m));
        return {
            month: m,
            count: sales.length,
            revenue: sales.reduce((sum, s) => sum + s.sellTotal, 0),
            profit: sales.reduce((sum, s) => sum + s.profit, 0)
        };
    });

    data.forEach((d, idx) => {
        let trend = '-';
        if (idx > 0) {
            const prevProfit = data[idx - 1].profit;
            if (prevProfit > 0) {
                const change = ((d.profit - prevProfit) / prevProfit * 100).toFixed(1);
                trend = change > 0 ? `+${change}%` : `${change}%`;
            }
        }
        html += `
            <tr>
                <td>${d.month}</td>
                <td>${d.count}</td>
                <td>${d.revenue} den</td>
                <td>${d.profit} den</td>
                <td>${trend}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    return html;
}

// ===================== FEATURE 11: AGING REPORT FOR DEBTS =====================
function generateAgingReport() {
    const today = new Date();
    const clients = state.clients.filter(c => c.debt > 0);

    const aging = {
        '0-30': [],
        '31-60': [],
        '61-90': [],
        '90+': []
    };

    clients.forEach(c => {
        // Find most recent sale for this client to determine age
        const clientSales = state.sales.filter(s => s.clientId === c.id && s.isDebt).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (clientSales.length === 0) {
            aging['90+'].push(c);
            return;
        }

        const lastSaleDate = new Date(clientSales[0].date);
        const daysDiff = Math.floor((today - lastSaleDate) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) aging['0-30'].push(c);
        else if (daysDiff <= 60) aging['31-60'].push(c);
        else if (daysDiff <= 90) aging['61-90'].push(c);
        else aging['90+'].push(c);
    });

    let html = '<h2>Aging Report - Client Debts</h2>';

    ['0-30', '31-60', '61-90', '90+'].forEach(range => {
        const clients = aging[range];
        const total = clients.reduce((sum, c) => sum + c.debt, 0);
        html += `
            <h3 style="margin-top:20px;">${range} Days (Total: ${total} den)</h3>
            <table class="data-table">
                <thead><tr><th>Client</th><th>Debt</th><th>Phone</th></tr></thead>
                <tbody>
                    ${clients.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td>${c.debt} den</td>
                            <td>${c.phone || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    });

    openModal('Aging Report', html);
}

// ===================== FEATURE 12: PIN LOCK =====================
function showPinLockScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'pin-lock-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; display:flex; align-items:center; justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:white; padding:40px; border-radius:10px; text-align:center; max-width:300px;';
    box.innerHTML = `
        <h2>Enter PIN</h2>
        <input type="password" id="pin-input" maxlength="6" style="font-size:24px; text-align:center; padding:10px; width:100%; margin:20px 0;" placeholder="******">
        <button class="btn btn-primary" onclick="verifyPin()" style="width:100%;">Unlock</button>
        <p id="pin-error" style="color:red; margin-top:10px;"></p>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('pin-input').focus();
    document.getElementById('pin-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') verifyPin();
    });
}

function verifyPin() {
    const input = document.getElementById('pin-input').value;
    if (input === state.pinCode) {
        document.getElementById('pin-lock-overlay').remove();
        initAfterAuth();
    } else {
        document.getElementById('pin-error').textContent = 'Incorrect PIN';
        document.getElementById('pin-input').value = '';
    }
}

function openPinSettingsModal() {
    let html = `
        <div class="form-group">
            <label>
                <input type="checkbox" id="pin-enabled" ${state.pinEnabled ? 'checked' : ''}> Enable PIN Lock
            </label>
        </div>
        <div class="form-group">
            <label>PIN Code (6 digits):</label>
            <input type="password" id="pin-code" maxlength="6" value="${state.pinCode || ''}" placeholder="******">
        </div>
        <button class="btn btn-primary" onclick="savePinSettings()" style="width:100%;">Save PIN Settings</button>
    `;
    openModal('PIN Lock Settings', html);
}

function savePinSettings() {
    const enabled = document.getElementById('pin-enabled').checked;
    const code = document.getElementById('pin-code').value;

    if (enabled && (!code || code.length < 4)) {
        showToast('PIN must be at least 4 characters', 'error');
        return;
    }

    state.pinEnabled = enabled;
    state.pinCode = code;

    saveState();
    closeModal();
    showToast('PIN settings saved', 'success');
    logActivity('PIN Settings Changed', enabled ? 'PIN enabled' : 'PIN disabled');
}

// ===================== FEATURE 13: AUTO-BACKUP =====================
function checkAutoBackup() {
    if (!state.autoBackup || !state.autoBackup.enabled) return;

    const lastBackup = state.autoBackup.lastBackup ? new Date(state.autoBackup.lastBackup) : null;
    const now = new Date();

    let shouldBackup = false;

    if (!lastBackup) {
        shouldBackup = true;
    } else {
        const daysDiff = Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));

        if (state.autoBackup.interval === 'daily' && daysDiff >= 1) shouldBackup = true;
        else if (state.autoBackup.interval === 'weekly' && daysDiff >= 7) shouldBackup = true;
        else if (state.autoBackup.interval === 'monthly' && daysDiff >= 30) shouldBackup = true;
    }

    if (shouldBackup) {
        exportBackup();
        state.autoBackup.lastBackup = now.toISOString();
        saveState();
    }
}

function openAutoBackupSettings() {
    let html = `
        <div class="form-group">
            <label>
                <input type="checkbox" id="backup-enabled" ${state.autoBackup.enabled ? 'checked' : ''}> Enable Auto-Backup
            </label>
        </div>
        <div class="form-group">
            <label>Backup Interval:</label>
            <select id="backup-interval">
                <option value="daily" ${state.autoBackup.interval === 'daily' ? 'selected' : ''}>Daily</option>
                <option value="weekly" ${state.autoBackup.interval === 'weekly' ? 'selected' : ''}>Weekly</option>
                <option value="monthly" ${state.autoBackup.interval === 'monthly' ? 'selected' : ''}>Monthly</option>
            </select>
        </div>
        <p style="font-size:12px; color:#666;">Last backup: ${state.autoBackup.lastBackup ? new Date(state.autoBackup.lastBackup).toLocaleString() : 'Never'}</p>
        <button class="btn btn-primary" onclick="saveAutoBackupSettings()" style="width:100%;">Save Settings</button>
    `;
    openModal('Auto-Backup Settings', html);
}

function saveAutoBackupSettings() {
    const enabled = document.getElementById('backup-enabled').checked;
    const interval = document.getElementById('backup-interval').value;

    state.autoBackup = {
        enabled,
        interval,
        lastBackup: state.autoBackup.lastBackup
    };

    saveState();
    closeModal();
    showToast('Auto-backup settings saved', 'success');
}

// ===================== FEATURE 14: DASHBOARD CUSTOMIZATION =====================
// (English duplicate removed - Albanian version at ADV-17 below is used)

// ===================== FEATURE 15: QUICK SALE PRESETS =====================
function openPresetModal(editId) {
    const isEdit = editId !== undefined;
    const preset = isEdit ? state.salePresets.find(p => p.id === editId) : null;

    let html = `
        <div class="form-group">
            <label>Preset Name:</label>
            <input type="text" id="preset-name" value="${preset ? preset.name : ''}" placeholder="e.g., Quick Medjool 500g">
        </div>
        <div class="form-group">
            <label>Product:</label>
            <select id="preset-product">
                ${PRODUCTS.map(p => `<option value="${p.id}" ${preset && preset.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Quantity:</label>
            <input type="number" id="preset-quantity" min="1" value="${preset ? preset.quantity : 1}">
        </div>
        <div class="form-group">
            <label>Discount (%):</label>
            <input type="number" id="preset-discount" min="0" max="100" value="${preset ? preset.discount || 0 : 0}">
        </div>
        <div class="form-group">
            <label>Location:</label>
            <select id="preset-location">
                ${state.locations.map(l => `<option value="${l}" ${preset && preset.location === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-primary" onclick="${isEdit ? `updatePreset(${editId})` : 'addPreset()'}" style="width:100%;">
            ${isEdit ? 'Update Preset' : 'Add Preset'}
        </button>
        ${isEdit ? `<button class="btn btn-danger" onclick="deletePreset(${editId})" style="width:100%; margin-top:10px;">Delete Preset</button>` : ''}
    `;
    openModal(isEdit ? 'Edit Preset' : 'Add Quick Sale Preset', html);
}

function addPreset() {
    const name = document.getElementById('preset-name').value.trim();
    const productId = document.getElementById('preset-product').value;
    const quantity = parseInt(document.getElementById('preset-quantity').value) || 1;
    const discount = parseFloat(document.getElementById('preset-discount').value) || 0;
    const location = document.getElementById('preset-location').value;

    if (!name) {
        showToast('Preset name is required', 'error');
        return;
    }

    state.salePresets.push({
        id: Date.now(),
        name,
        productId,
        quantity,
        discount,
        location
    });

    saveState();
    closeModal();
    refreshDashboard();
    showToast('Preset added', 'success');
}

function updatePreset(id) {
    const name = document.getElementById('preset-name').value.trim();
    const productId = document.getElementById('preset-product').value;
    const quantity = parseInt(document.getElementById('preset-quantity').value) || 1;
    const discount = parseFloat(document.getElementById('preset-discount').value) || 0;
    const location = document.getElementById('preset-location').value;

    if (!name) {
        showToast('Preset name is required', 'error');
        return;
    }

    const index = state.salePresets.findIndex(p => p.id === id);
    if (index >= 0) {
        state.salePresets[index] = { id, name, productId, quantity, discount, location };
    }

    saveState();
    closeModal();
    refreshDashboard();
    showToast('Preset updated', 'success');
}

function deletePreset(id) {
    if (!confirm('Delete this preset?')) return;

    const index = state.salePresets.findIndex(p => p.id === id);
    if (index >= 0) {
        state.salePresets.splice(index, 1);
    }

    saveState();
    closeModal();
    refreshDashboard();
    showToast('Preset deleted', 'success');
}

function executePreset(id) {
    const preset = state.salePresets.find(p => p.id === id);
    if (!preset) return;

    const product = getProduct(preset.productId);
    const sellTotal = product.sellPrice * preset.quantity * (1 - preset.discount / 100);
    const buyTotal = product.buyPrice * preset.quantity;
    const profit = sellTotal - buyTotal;

    const saleId = Date.now();
    state.sales.push({
        id: saleId,
        productId: preset.productId,
        quantity: preset.quantity,
        discount: preset.discount,
        sellTotal: Math.round(sellTotal),
        buyTotal,
        profit: Math.round(profit),
        clientId: '',
        location: preset.location,
        date: new Date().toISOString().split('T')[0],
        note: `Quick sale from preset: ${preset.name}`,
        isDebt: false,
        paymentType: 'cash',
        dueDate: '',
        invoicePaid: true
    });

    state.stock[preset.productId] = Math.max(0, (state.stock[preset.productId] || 0) - preset.quantity);

    saveState();
    refreshAll();
    showToast(`Quick sale: ${preset.name}`, 'success');
    logActivity('Quick Sale', `Preset: ${preset.name}, ${preset.quantity}x ${product.name}`);
}

// ===================== FEATURE 16: TABLE SORTING & PAGINATION =====================
function sortTable(tableId, column, type) {
    // Store sort state
    if (!state.tableSortState[tableId]) {
        state.tableSortState[tableId] = { column: null, direction: 'asc' };
    }

    const sortState = state.tableSortState[tableId];

    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }

    saveState();

    // Trigger refresh based on table
    if (tableId === 'sales-table') refreshSales();
}

function paginateTable(data, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        data: data.slice(start, end),
        totalPages: Math.ceil(data.length / perPage),
        currentPage: page
    };
}

// ===================== FEATURE 17: AUTO RESTOCK SUGGESTION =====================
function generateRestockSuggestion() {
    const days = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const recentSales = state.sales.filter(s => s.date >= cutoffStr);

    const suggestions = PRODUCTS.map(p => {
        const productSales = recentSales.filter(s => s.productId === p.id);
        const totalSold = productSales.reduce((sum, s) => sum + s.quantity, 0);
        const avgPerDay = totalSold / days;
        const currentStock = state.stock[p.id] || 0;
        const daysRemaining = avgPerDay > 0 ? Math.floor(currentStock / avgPerDay) : 999;
        const suggestedRestock = avgPerDay > 0 ? Math.ceil(avgPerDay * 14) : 0; // 2 weeks supply

        return {
            product: p,
            avgPerDay: avgPerDay.toFixed(1),
            currentStock,
            daysRemaining,
            suggestedRestock,
            needsRestock: daysRemaining < 7
        };
    }).filter(s => s.avgPerDay > 0);

    suggestions.sort((a, b) => a.daysRemaining - b.daysRemaining);

    let html = '<h2>Restock Suggestions (Based on Last 30 Days)</h2>';
    html += '<table class="data-table"><thead><tr><th>Product</th><th>Avg/Day</th><th>Current Stock</th><th>Days Left</th><th>Suggested Restock</th></tr></thead><tbody>';

    suggestions.forEach(s => {
        const rowStyle = s.needsRestock ? 'background:#ffebee;' : '';
        html += `
            <tr style="${rowStyle}">
                <td>${s.product.name}</td>
                <td>${s.avgPerDay}</td>
                <td>${s.currentStock}</td>
                <td>${s.daysRemaining < 999 ? s.daysRemaining : 'N/A'}</td>
                <td><strong>${s.suggestedRestock}</strong></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    openModal('Restock Suggestions', html);
}

// ===================== FEATURE 18: EXPENSE CATEGORIES =====================
function refreshExpenseCategories() {
    // This is managed through the settings UI
    // Categories are already in state.expenseCategories
}

function openExpenseCategoryModal() {
    let html = `
        <h3>Manage Expense Categories</h3>
        <div class="form-group">
            <label>Categories (one per line):</label>
            <textarea id="expense-categories" rows="6">${state.expenseCategories.join('\n')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveExpenseCategories()" style="width:100%;">Save Categories</button>
    `;
    openModal('Expense Categories', html);
}

function saveExpenseCategories() {
    const text = document.getElementById('expense-categories').value;
    const categories = text.split('\n').map(c => c.trim()).filter(c => c);

    if (categories.length === 0) {
        showToast('At least one category is required', 'error');
        return;
    }

    state.expenseCategories = categories;
    saveState();
    closeModal();
    showToast('Expense categories updated', 'success');
}

// ===================== FEATURE 19: ACTIVITY LOG =====================
function logActivity(typeOrAction, textOrDetails, page) {
    if (!state.activityLog) state.activityLog = [];
    const now = new Date();
    state.activityLog.push({
        id: Date.now(),
        type: typeOrAction,
        action: typeOrAction,
        text: textOrDetails,
        details: textOrDetails,
        time: now.toLocaleTimeString('sq', { hour: '2-digit', minute: '2-digit' }),
        page: page || typeOrAction || 'activity',
        timestamp: now.toISOString()
    });

    if (state.activityLog.length > 500) {
        state.activityLog = state.activityLog.slice(-500);
    }

    saveState();
    try { refreshRecentActivityBar(); } catch(e) {}
}

function refreshActivityLog() {
    let html = '<h2>Activity Log</h2>';

    if (!state.activityLog || state.activityLog.length === 0) {
        html += '<p>No activity logged yet</p>';
    } else {
        html += '<table class="data-table"><thead><tr><th>Timestamp</th><th>Action</th><th>Details</th></tr></thead><tbody>';

        state.activityLog.slice().reverse().slice(0, 100).forEach(log => {
            const date = new Date(log.timestamp);
            html += `
                <tr>
                    <td>${date.toLocaleString()}</td>
                    <td><strong>${log.action}</strong></td>
                    <td>${log.details}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
    }

    document.getElementById('page-activity').innerHTML = html;
}

// ===================== FEATURE 20: WHATSAPP INTEGRATION =====================
function sendWhatsApp(phone, message) {
    // Remove non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
    logActivity('WhatsApp Sent', `To: ${phone}`);
}

// ===================== SETTINGS UI =====================
function refreshSettingsUI() {
    // Add buttons for all new settings features
    const container = document.getElementById('settings-additional');
    if (!container) return;

    let html = '<h3>Additional Settings</h3>';
    html += '<button class="btn" onclick="openProfitSplitModal()" style="margin:5px;">Profit Split Settings</button>';
    html += '<button class="btn" onclick="openPinSettingsModal()" style="margin:5px;">PIN Lock Settings</button>';
    html += '<button class="btn" onclick="openAutoBackupSettings()" style="margin:5px;">Auto-Backup Settings</button>';
    html += '<button class="btn" onclick="openDashboardSettings()" style="margin:5px;">Dashboard Customization</button>';
    html += '<button class="btn" onclick="openExpenseCategoryModal()" style="margin:5px;">Expense Categories</button>';
    html += '<button class="btn" onclick="openPresetModal()" style="margin:5px;">Manage Quick Sale Presets</button>';
    html += '<button class="btn" onclick="generateRestockSuggestion()" style="margin:5px;">Restock Suggestions</button>';
    html += '<button class="btn" onclick="generateAgingReport()" style="margin:5px;">Aging Report</button>';
    html += '<button class="btn" onclick="generatePLReport()" style="margin:5px;">P&L Report</button>';

    html += '<h3 style="margin-top:25px; color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Reset & Pastrim</h3>';
    html += '<button class="btn btn-reset-open" onclick="openResetCenter()" style="margin:5px;"><i class="fas fa-trash-alt"></i> Hap Reset Center</button>';

    container.innerHTML = html;
}

// ===================== RESET FUNCTIONS =====================

// Helper: Double confirmation - must type RESET to confirm
function confirmReset(sectionName) {
    return confirm(`A jeni i sigurt qe deshironi te beni RESET te "${sectionName}"?\n\nKjo nuk mund te kthehet mbrapa!`);
}

// 1. Reset Shitjet
function resetSales() {
    if (!confirmReset('Shitjet')) return;
    state.sales = [];
    saveState();
    refreshAll();
    showToast('Shitjet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i te gjitha shitjeve');
}

// 2. Reset Stoku
function resetStock() {
    if (!confirmReset('Stoku')) return;
    PRODUCTS.forEach(p => { state.stock[p.id] = 0; });
    state.stockBatches = [];
    saveState();
    refreshAll();
    showToast('Stoku u zerua me sukses', 'success');
    logActivity('RESET', 'Reset i stokut');
}

// 3. Reset Klientet
function resetClients() {
    if (!confirmReset('Klientet')) return;
    state.clients = [];
    state.clientPayments = [];
    state.pinnedClients = [];
    saveState();
    refreshAll();
    showToast('Klientet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i te gjitha klienteve');
}

// 4. Reset vetem Borxhet e Klienteve (pa fshire klientet)
function resetClientDebts() {
    if (!confirmReset('Borxhet e Klienteve')) return;
    state.clients.forEach(c => { c.debt = 0; });
    state.sales.forEach(s => {
        if (s.paymentType === 'invoice_60' && !s.invoicePaid) {
            s.invoicePaid = true;
        }
    });
    saveState();
    refreshAll();
    showToast('Borxhet e klienteve u zeruan', 'success');
    logActivity('RESET', 'Reset i borxheve te klienteve');
}

// 5. Reset Llogaria Fatoni
function resetFaton() {
    if (!confirmReset('Llogaria e Fatonit')) return;
    state.fatonPurchases = [];
    state.fatonPayments = [];
    state.fatonProfitCollections = [];
    state.fatonProfitOwed = [];
    state.fatonDebtHistory = [];
    saveState();
    refreshAll();
    showToast('Llogaria e Fatonit u resetua', 'success');
    logActivity('RESET', 'Reset i llogarise se Fatonit');
}

// 6. Reset Porosite
function resetOrders() {
    if (!confirmReset('Porosite')) return;
    state.orders = [];
    saveState();
    refreshAll();
    showToast('Porosite u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i porosive');
}

// 7. Reset Kthimet
function resetReturns() {
    if (!confirmReset('Kthimet')) return;
    state.returns = [];
    saveState();
    refreshAll();
    showToast('Kthimet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i kthimeve');
}

// 8. Reset Shpenzimet
function resetExpenses() {
    if (!confirmReset('Shpenzimet')) return;
    state.expenses = [];
    saveState();
    refreshAll();
    showToast('Shpenzimet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i shpenzimeve');
}

// 9. Reset Arka Ditore
function resetCashDrawer() {
    if (!confirmReset('Arka Ditore')) return;
    state.cashDrawer = [];
    saveState();
    refreshCashDrawer();
    showToast('Arka ditore u resetua', 'success');
    logActivity('RESET', 'Reset i arkes ditore');
}

// 10. Reset Log Aktivitetesh
function resetActivityLog() {
    if (!confirmReset('Log Aktivitetesh')) return;
    state.activityLog = [];
    saveState();
    refreshActivityLog();
    showToast('Logu i aktiviteteve u pastrua', 'success');
}

// 11. Reset Raporte Javore
function resetWeeklyReports() {
    if (!confirmReset('Raportet Javore')) return;
    state.weeklyReports = [];
    saveState();
    refreshAll();
    showToast('Raportet javore u fshin', 'success');
    logActivity('RESET', 'Reset i raporteve javore');
}

// 12. Reset Kontakte
function resetContacts() {
    if (!confirmReset('Kontaktet')) return;
    state.contacts = [];
    saveState();
    refreshAll();
    showToast('Kontaktet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i kontakteve');
}

// 13. Reset Shenime
function resetNotes() {
    if (!confirmReset('Shenimet')) return;
    state.notes = [];
    saveState();
    refreshAll();
    showToast('Shenimet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i shenimeve');
}

// 14. Reset Qellimet
function resetTargets() {
    if (!confirmReset('Qellimet')) return;
    state.targets = [];
    saveState();
    refreshAll();
    showToast('Qellimet u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i qellimeve');
}

// 15. Reset Preset-et
function resetPresets() {
    if (!confirmReset('Preset-et e shitjeve')) return;
    state.salePresets = [];
    saveState();
    refreshAll();
    showToast('Preset-et u fshin me sukses', 'success');
    logActivity('RESET', 'Reset i preset-eve');
}

// 16. Reset Fitimi
function resetProfit() {
    if (!confirmReset('Fitimi & Ndarja')) return;
    // Zero out profit from all sales
    state.sales.forEach(s => { s.profit = 0; });
    // Reset Faton profit tracking
    state.fatonProfitOwed = [];
    state.fatonProfitCollections = [];
    // Reset profit split to default 50/50
    state.profitSplit = { owner: 50, partner: 50 };
    saveState();
    refreshAll();
    showToast('Fitimi u resetua me sukses', 'success');
    logActivity('RESET', 'Reset i fitimit dhe ndarjes');
}

// 17. RESET I PLOTE
function resetAll() {
    if (!confirm('A jeni i sigurt qe deshironi te fshini TE GJITHA TE DHENAT?\n\nKjo nuk mund te kthehet mbrapa!')) return;
    const typed = prompt('Shkruani RESET per te konfirmuar fshirjen totale:');
    if (typed !== 'RESET') { showToast('Reset u anulua', 'info'); return; }

    exportBackup();

    localStorage.removeItem('hurma-state');
    PRODUCTS.length = 0;
    DEFAULT_PRODUCTS.forEach(p => PRODUCTS.push(p));

    state = {
        sales: [], stock: {}, stockBatches: [], clients: [], orders: [],
        fatonPayments: [], fatonProfitCollections: [], returns: [],
        contacts: [], notes: [], targets: [], expenses: [],
        locations: ['Dyqan', 'Treg', 'Online'], notifications: [],
        weeklyReports: [], fatonDebtHistory: [], pinnedClients: [],
        salesMonthFilter: '', customProducts: null,
        profitSplit: { owner: 50, partner: 50 }, partnerName: 'Orhan',
        cashDrawer: [], clientPayments: [],
        clientCategories: ['Regular', 'Shumice', 'Njeheresh'],
        pinCode: null, pinEnabled: false,
        autoBackup: { enabled: false, interval: 'weekly', lastBackup: null },
        dashboardCards: null, salePresets: [],
        expenseCategories: ['Transport', 'Paketim', 'Qira', 'Marketing', 'Tjeter'],
        activityLog: [], tableSortState: {},
        fatonInstallments: [], fatonDebtLimit: 0,
        paymentReceipts: [], paymentAuditTrail: [],
        paymentTemplates: [], currencyRates: { EUR: 61.5, USD: 56.0, MKD: 1 }
    };

    initStock();
    saveState();
    refreshAll();
    populateProductSelects();
    populateLocationSelects();
    showToast('Aplikacioni u resetua plotesisht!', 'success');
}

// Open Reset Center modal
function openResetCenter() {
    let html = `
        <div style="margin-bottom:15px; padding:12px; background:#fff3cd; border-radius:8px; color:#856404;">
            <i class="fas fa-exclamation-triangle"></i> <strong>KUJDES:</strong> Reset-i eshte i pakthyeshem! Mendohuni mire para se te klikoni.
        </div>

        <h4 style="margin:15px 0 10px; color:var(--text-secondary);">Biznesi</h4>
        <div class="reset-grid">
            <button class="btn btn-reset" onclick="resetSales()">
                <i class="fas fa-cash-register"></i> Reset Shitjet
                <span class="reset-desc">${state.sales.length} shitje</span>
            </button>
            <button class="btn btn-reset" onclick="resetStock()">
                <i class="fas fa-boxes-stacked"></i> Reset Stoku
                <span class="reset-desc">${Object.values(state.stock).reduce((s,v)=>s+v,0)} cope</span>
            </button>
            <button class="btn btn-reset" onclick="resetExpenses()">
                <i class="fas fa-receipt"></i> Reset Shpenzimet
                <span class="reset-desc">${state.expenses.length} shpenzime</span>
            </button>
            <button class="btn btn-reset" onclick="resetOrders()">
                <i class="fas fa-clipboard-list"></i> Reset Porosite
                <span class="reset-desc">${state.orders.length} porosi</span>
            </button>
            <button class="btn btn-reset" onclick="resetReturns()">
                <i class="fas fa-undo"></i> Reset Kthimet
                <span class="reset-desc">${state.returns.length} kthime</span>
            </button>
            <button class="btn btn-reset" onclick="resetProfit()">
                <i class="fas fa-coins"></i> Reset Fitimi
                <span class="reset-desc">Fitimi & ndarja</span>
            </button>
        </div>

        <h4 style="margin:15px 0 10px; color:var(--text-secondary);">Klientet & Fatoni</h4>
        <div class="reset-grid">
            <button class="btn btn-reset" onclick="resetClients()">
                <i class="fas fa-users"></i> Reset Klientet
                <span class="reset-desc">${state.clients.length} kliente</span>
            </button>
            <button class="btn btn-reset" onclick="resetClientDebts()">
                <i class="fas fa-hand-holding-usd"></i> Zero Borxhet
                <span class="reset-desc">${state.clients.filter(c=>c.debt>0).length} me borxh</span>
            </button>
            <button class="btn btn-reset" onclick="resetFaton()">
                <i class="fas fa-handshake"></i> Reset Fatoni
                <span class="reset-desc">${(state.fatonPurchases||[]).length} blerje</span>
            </button>
        </div>

        <h4 style="margin:15px 0 10px; color:var(--text-secondary);">Te tjera</h4>
        <div class="reset-grid">
            <button class="btn btn-reset" onclick="resetContacts()">
                <i class="fas fa-address-book"></i> Reset Kontaktet
                <span class="reset-desc">${state.contacts.length} kontakte</span>
            </button>
            <button class="btn btn-reset" onclick="resetNotes()">
                <i class="fas fa-sticky-note"></i> Reset Shenimet
                <span class="reset-desc">${state.notes.length} shenime</span>
            </button>
            <button class="btn btn-reset" onclick="resetTargets()">
                <i class="fas fa-bullseye"></i> Reset Qellimet
                <span class="reset-desc">${state.targets.length} qellime</span>
            </button>
            <button class="btn btn-reset" onclick="resetPresets()">
                <i class="fas fa-bolt"></i> Reset Preset-et
                <span class="reset-desc">${state.salePresets.length} presete</span>
            </button>
            <button class="btn btn-reset" onclick="resetCashDrawer()">
                <i class="fas fa-cash-register"></i> Reset Arka Ditore
                <span class="reset-desc">${state.cashDrawer.length} dite</span>
            </button>
            <button class="btn btn-reset" onclick="resetWeeklyReports()">
                <i class="fas fa-chart-bar"></i> Reset Raportet
                <span class="reset-desc">${(state.weeklyReports||[]).length} raporte</span>
            </button>
            <button class="btn btn-reset" onclick="resetActivityLog()">
                <i class="fas fa-history"></i> Reset Logjet
                <span class="reset-desc">${(state.activityLog||[]).length} log</span>
            </button>
        </div>

        <h4 style="margin:20px 0 10px; color:var(--danger);">Zona e Rrezikshme</h4>
        <div style="padding:15px; border:2px solid var(--danger); border-radius:8px;">
            <button class="btn btn-reset-all" onclick="resetAll()">
                <i class="fas fa-skull-crossbones"></i> RESET I PLOTE - Fshi GJITHCKA
            </button>
            <p style="font-size:0.8em; color:var(--text-secondary); margin-top:8px;">Automatikisht do te ruaje nje backup para se te fshije.</p>
        </div>
    `;
    openModal('Reset & Pastrim', html);
}

// ===================== EXPORT FUNCTIONS =====================

// Core Excel export
function exportToExcel(headers, rows, filename) {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Auto-width columns
    ws['!cols'] = headers.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename + '.xlsx');
    showToast('Excel u shkarkua: ' + filename + '.xlsx', 'success');
}

// Core PDF export
function exportToPDF(title, headers, rows, filename, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: orientation || 'portrait' });
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.text('Hurma App - ' + new Date().toLocaleDateString('sq-AL'), 14, 28);
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 34,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 }
    });
    doc.save(filename + '.pdf');
    showToast('PDF u shkarkua: ' + filename + '.pdf', 'success');
}

// Core Word export
function exportToWord(title, headers, rows, filename) {
    let html = '<html><head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;}table{border-collapse:collapse;width:100%;margin-top:15px;}th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:11px;}th{background:#2c3e50;color:white;}tr:nth-child(even){background:#f5f5f5;}</style></head><body>';
    html += '<h2>' + title + '</h2>';
    html += '<p style="color:#777;font-size:11px;">Hurma App - ' + new Date().toLocaleDateString('sq-AL') + '</p>';
    html += '<table><thead><tr>';
    headers.forEach(h => html += '<th>' + h + '</th>');
    html += '</tr></thead><tbody>';
    rows.forEach(r => {
        html += '<tr>';
        r.forEach(cell => html += '<td>' + (cell !== null && cell !== undefined ? cell : '') + '</td>');
        html += '</tr>';
    });
    html += '</tbody></table></body></html>';
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename + '.doc';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Word u shkarkua: ' + filename + '.doc', 'success');
}

// ---- Page-specific exports ----

// Dashboard export
function exportDashboard(format) {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date === today);
    const totalRev = todaySales.reduce((s, x) => s + x.sellTotal, 0);
    const totalProfit = todaySales.reduce((s, x) => s + x.profit, 0);
    const totalExp = state.expenses.filter(e => e.date === today).reduce((s, x) => s + x.amount, 0);
    const headers = ['Metrike', 'Vlera'];
    const rows = [
        ['Shitje sot', todaySales.length],
        ['Te ardhura sot', totalRev + ' den'],
        ['Fitimi sot', totalProfit + ' den'],
        ['Shpenzime sot', totalExp + ' den'],
        ['Fitimi neto', (totalProfit - totalExp) + ' den'],
        ['Pjesa jote (' + state.profitSplit.owner + '%)', calcOwnerShare(totalProfit - totalExp) + ' den'],
        ['Pjesa e ' + state.partnerName + ' (' + state.profitSplit.partner + '%)', calcPartnerShare(totalProfit - totalExp) + ' den']
    ];
    const fname = 'Dashboard_' + today;
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Dashboard - ' + today, headers, rows, fname);
    else exportToWord('Dashboard - ' + today, headers, rows, fname);
}

// Sales export
function exportSales(format) {
    const headers = ['Data', 'Produkti', 'Sasia', 'Cmimi shitjes', 'Totali', 'Fitimi', 'Pagesa', 'Klienti', 'Lokacioni'];
    const rows = state.sales.map(s => {
        const p = getProduct(s.productId);
        const client = s.clientId ? (state.clients.find(c => c.id === s.clientId) || {}) : {};
        return [s.date, p.name, s.quantity, (s.sellPrice || p.sellPrice) + ' den', s.sellTotal + ' den', s.profit + ' den', s.paymentType || 'cash', client.name || '-', s.location || '-'];
    });
    const fname = 'Shitjet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Shitjet', headers, rows, fname, 'landscape');
    else exportToWord('Shitjet', headers, rows, fname);
}

// Stock export
function exportStock(format) {
    const headers = ['Produkti', 'Pesha', 'Sasia', 'Cmim Blerjes', 'Cmim Shitjes', 'Vlera Stokut'];
    const rows = PRODUCTS.map(p => {
        const count = state.stock[p.id] || 0;
        return [p.name, p.weight, count, p.buyPrice + ' den', p.sellPrice + ' den', (count * p.buyPrice) + ' den'];
    });
    const fname = 'Stoku_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Stoku', headers, rows, fname);
    else exportToWord('Stoku', headers, rows, fname);
}

// Clients export
function exportClients(format) {
    const headers = ['Emri', 'Telefoni', 'Kategoria', 'Borxhi', 'Limiti Kreditit', 'Blerje Totale'];
    const rows = state.clients.map(c => {
        const totalPurchases = state.sales.filter(s => s.clientId === c.id).reduce((sum, s) => sum + s.sellTotal, 0);
        return [c.name, c.phone || '-', c.category || 'Regular', c.debt + ' den', (c.creditLimit || 0) + ' den', totalPurchases + ' den'];
    });
    const fname = 'Klientet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Klientet', headers, rows, fname);
    else exportToWord('Klientet', headers, rows, fname);
}

// Orders export
function exportOrders(format) {
    const headers = ['Data', 'Klienti', 'Produkti', 'Sasia', 'Statusi', 'Shenimet'];
    const rows = state.orders.map(o => [o.date, o.clientName || '-', o.product || '-', o.quantity, o.status || 'pending', o.notes || '-']);
    const fname = 'Porosite_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Porosite', headers, rows, fname);
    else exportToWord('Porosite', headers, rows, fname);
}

// Faton export
function exportFaton(format) {
    const headers = ['Data', 'Lloji', 'Pershkrim', 'Shuma', 'Kategoria'];
    const rows = [];
    // Add purchases
    (state.fatonPurchases || []).forEach(p => {
        const prod = getProduct(p.productId);
        rows.push([p.date, 'Blerje', (prod ? prod.name : '-') + ' x' + p.quantity, '-' + p.total + ' den', '-']);
    });
    // Add payments
    (state.fatonPayments || []).forEach(p => {
        rows.push([p.date, 'Pagese', p.note || '-', '+' + p.amount + ' den', getCategoryLabel(p.category)]);
    });
    // Add profit collections
    (state.fatonProfitCollections || []).forEach(c => {
        rows.push([c.date, 'Mbledhje fitimi', c.note || c.type, '+' + c.amount + ' den', '-']);
    });
    // Sort by date
    rows.sort((a, b) => b[0].localeCompare(a[0]));
    // Add summary row
    rows.push(['', '', '', '', '']);
    rows.push(['PERMBLEDHJE', 'Borxh cash: ' + calcFatonDebt() + ' den', 'Fitim pa mbledhur: ' + (calcFatonProfitOwed() - calcFatonProfitCollected()) + ' den', 'TOTAL: ' + (calcFatonDebt() + calcFatonProfitOwed() - calcFatonProfitCollected()) + ' den', '']);
    const fname = 'Fatoni_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Llogaria e Fatonit', headers, rows, fname, 'landscape');
    else exportToWord('Llogaria e Fatonit', headers, rows, fname);
}

// Reports export
function exportReports(format) {
    const headers = ['Java', 'Fillimi', 'Mbarimi', 'Shitje', 'Fitimi', 'Shpenzime'];
    const rows = (state.weeklyReports || []).map(r => [r.weekNumber, r.startDate, r.endDate, r.totalSales + ' den', r.totalProfit + ' den', r.totalExpenses + ' den']);
    const fname = 'Raportet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Raportet Javore', headers, rows, fname);
    else exportToWord('Raportet Javore', headers, rows, fname);
}

// Balance/P&L export
function exportBalance(format) {
    const totalRevenue = state.sales.reduce((s, x) => s + x.sellTotal, 0);
    const totalCost = state.sales.reduce((s, x) => s + (x.sellTotal - x.profit), 0);
    const totalProfit = state.sales.reduce((s, x) => s + x.profit, 0);
    const totalExpenses = state.expenses.reduce((s, x) => s + x.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    const headers = ['Zeri', 'Vlera'];
    const rows = [
        ['Te ardhura totale', totalRevenue + ' den'],
        ['Kosto e mallit', totalCost + ' den'],
        ['Fitimi bruto', totalProfit + ' den'],
        ['Shpenzime totale', totalExpenses + ' den'],
        ['Fitimi neto', netProfit + ' den'],
        ['Pjesa jote (' + state.profitSplit.owner + '%)', calcOwnerShare(netProfit) + ' den'],
        ['Pjesa e ' + state.partnerName + ' (' + state.profitSplit.partner + '%)', calcPartnerShare(netProfit) + ' den']
    ];
    const fname = 'Bilanci_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Bilanci - Fitimi & Humbje', headers, rows, fname);
    else exportToWord('Bilanci - Fitimi & Humbje', headers, rows, fname);
}

// Returns export
function exportReturns(format) {
    const headers = ['Data', 'Produkti', 'Sasia', 'Arsyeja', 'Klienti'];
    const rows = state.returns.map(r => {
        const p = getProduct(r.productId);
        return [r.date, p.name, r.quantity, r.reason || '-', r.clientName || '-'];
    });
    const fname = 'Kthimet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Kthimet', headers, rows, fname);
    else exportToWord('Kthimet', headers, rows, fname);
}

// Contacts export
function exportContacts(format) {
    const headers = ['Emri', 'Telefoni', 'Roli', 'Shenimet'];
    const rows = state.contacts.map(c => [c.name, c.phone || '-', c.role || '-', c.notes || '-']);
    const fname = 'Kontaktet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Kontaktet', headers, rows, fname);
    else exportToWord('Kontaktet', headers, rows, fname);
}

// Notes export
function exportNotes(format) {
    const headers = ['Data', 'Teksti', 'Kategoria'];
    const rows = state.notes.map(n => [n.date, n.text, n.category || '-']);
    const fname = 'Shenimet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Shenimet', headers, rows, fname);
    else exportToWord('Shenimet', headers, rows, fname);
}

// Targets export
function exportTargets(format) {
    const headers = ['Qellimi', 'Afati', 'Statusi'];
    const rows = state.targets.map(t => [t.text, t.deadline || '-', t.completed ? 'Perfunduar' : 'Aktiv']);
    const fname = 'Qellimet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Qellimet', headers, rows, fname);
    else exportToWord('Qellimet', headers, rows, fname);
}

// Expenses export
function exportExpenses(format) {
    const headers = ['Data', 'Shuma', 'Kategoria', 'Shenim'];
    const rows = state.expenses.map(e => [e.date, e.amount + ' den', e.category || '-', e.note || '-']);
    const fname = 'Shpenzimet_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Shpenzimet', headers, rows, fname);
    else exportToWord('Shpenzimet', headers, rows, fname);
}

// Cash Drawer export
function exportCashDrawer(format) {
    const headers = ['Data', 'Cash Fillestar', 'Shitje', 'Shpenzime', 'Bilanci Pritur', 'Aktual', 'Diferenca'];
    const rows = state.cashDrawer.map(d => [d.date, d.startingCash + ' den', d.sales + ' den', d.expenses + ' den', d.expected + ' den', d.actual + ' den', d.difference + ' den']);
    const fname = 'ArkaDitore_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Arka Ditore', headers, rows, fname, 'landscape');
    else exportToWord('Arka Ditore', headers, rows, fname);
}

// Activity Log export
function exportActivityLog(format) {
    const headers = ['Data & Ora', 'Lloji', 'Mesazhi'];
    const rows = (state.activityLog || []).map(a => [a.date, a.type, a.message]);
    const fname = 'Aktiviteti_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Log Aktivitetesh', headers, rows, fname);
    else exportToWord('Log Aktivitetesh', headers, rows, fname);
}

// Trends export
function exportTrends(format) {
    const last30 = state.sales.filter(s => {
        const d = new Date(s.date);
        return d >= new Date(Date.now() - 30 * 86400000);
    });
    const byProduct = {};
    last30.forEach(s => {
        const p = getProduct(s.productId);
        if (!byProduct[p.name]) byProduct[p.name] = { qty: 0, rev: 0, profit: 0 };
        byProduct[p.name].qty += s.quantity;
        byProduct[p.name].rev += s.sellTotal;
        byProduct[p.name].profit += s.profit;
    });
    const headers = ['Produkti', 'Sasia (30 dite)', 'Te ardhura', 'Fitimi'];
    const rows = Object.entries(byProduct).map(([name, d]) => [name, d.qty, d.rev + ' den', d.profit + ' den']);
    const fname = 'Trende_' + new Date().toISOString().split('T')[0];
    if (format === 'excel') exportToExcel(headers, rows, fname);
    else if (format === 'pdf') exportToPDF('Trende (30 dite)', headers, rows, fname);
    else exportToWord('Trende (30 dite)', headers, rows, fname);
}

// Helper: generate export buttons HTML for any page
function getExportButtons(exportFuncName) {
    return '<div class="export-buttons">' +
        '<button class="btn btn-export btn-excel" onclick="' + exportFuncName + '(\'excel\')"><i class="fas fa-file-excel"></i> Excel</button>' +
        '<button class="btn btn-export btn-pdf" onclick="' + exportFuncName + '(\'pdf\')"><i class="fas fa-file-pdf"></i> PDF</button>' +
        '<button class="btn btn-export btn-word" onclick="' + exportFuncName + '(\'word\')"><i class="fas fa-file-word"></i> Word</button>' +
    '</div>';
}

// ===================== CLIENT PAYMENT SYSTEM =====================

// Feature 1, 5, 6: Client payment dashboard
function openClientPaymentDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = (state.clientPayments || []).filter(p => p.date === today);
    const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
    const clientsWithDebt = state.clients.filter(c => c.debt > 0);
    const totalDebt = clientsWithDebt.reduce((s, c) => s + c.debt, 0);

    // Profit split for today
    const todaySales = state.sales.filter(s => s.date === today);
    const todayProfit = todaySales.reduce((s, x) => s + x.profit, 0);

    let html = '';
    // Mini dashboard
    html += '<div class="confirmation-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px;">';
    html += '<div class="confirmation-card"><div class="conf-label">Mbledhur sot</div><div class="conf-value" style="color:var(--success);">' + todayTotal + ' den</div><div style="font-size:0.7em;">' + todayPayments.length + ' pagesa</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Borxh total</div><div class="conf-value" style="color:var(--danger);">' + totalDebt + ' den</div><div style="font-size:0.7em;">' + clientsWithDebt.length + ' kliente</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Fitimi sot</div><div class="conf-value">' + todayProfit + ' den</div><div style="font-size:0.7em;">Elez: ' + calcOwnerShare(todayProfit) + ' | ' + state.partnerName + ': ' + calcPartnerShare(todayProfit) + '</div></div>';
    html += '</div>';

    // Today's payments list
    html += '<h4 style="margin-bottom:8px;"><i class="fas fa-clock"></i> Pagesat e sotme</h4>';
    if (todayPayments.length > 0) {
        html += '<table class="data-table"><thead><tr><th>Klienti</th><th>Shuma</th><th>Metoda</th><th>Shenim</th></tr></thead><tbody>';
        todayPayments.forEach(p => {
            const client = state.clients.find(c => c.id === p.clientId);
            html += '<tr><td>' + (client ? client.name : '-') + '</td><td style="color:var(--success);font-weight:bold;">' + p.amount + ' den</td><td>' + (p.method || 'Cash') + '</td><td>' + (p.note || '-') + '</td></tr>';
        });
        html += '</tbody></table>';
    } else {
        html += '<p style="color:var(--text-secondary);">Nuk ka pagesa sot.</p>';
    }

    // Who owes - sorted by debt
    html += '<h4 style="margin:15px 0 8px;"><i class="fas fa-exclamation-triangle"></i> Kush ka borxh</h4>';
    if (clientsWithDebt.length > 0) {
        html += '<table class="data-table"><thead><tr><th>Klienti</th><th>Borxhi</th><th>Dite pa paguar</th><th>Veprime</th></tr></thead><tbody>';
        clientsWithDebt.sort((a, b) => b.debt - a.debt).forEach(c => {
            const lastPayment = (state.clientPayments || []).filter(p => p.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))[0];
            const daysSince = lastPayment ? Math.round((Date.now() - new Date(lastPayment.date).getTime()) / 86400000) : '?';
            const urgency = daysSince > 30 ? 'var(--danger)' : daysSince > 14 ? 'var(--warning)' : 'var(--text)';
            html += '<tr><td><strong>' + c.name + '</strong></td>';
            html += '<td style="color:var(--danger);font-weight:bold;">' + c.debt + ' den</td>';
            html += '<td style="color:' + urgency + ';">' + daysSince + ' dite</td>';
            html += '<td><button class="btn btn-sm btn-success" onclick="closeModal();openQuickCollectModal(\'' + c.id + '\')"><i class="fas fa-hand-holding-usd"></i></button> ';
            html += '<button class="btn btn-sm btn-success" onclick="sendClientDebtWhatsApp(\'' + c.id + '\')"><i class="fab fa-whatsapp"></i></button></td></tr>';
        });
        html += '</tbody></table>';
    } else {
        html += '<p style="color:var(--success);">Askush nuk ka borxh!</p>';
    }

    openModal('Pagesat e klienteve', html);
}

// Feature 2, 3: Quick collect payment from client
function openQuickCollectModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const clientSales = state.sales.filter(s => s.clientId === clientId);
    const totalProfit = clientSales.reduce((s, x) => s + x.profit, 0);
    const totalBought = clientSales.reduce((s, x) => s + x.sellTotal, 0);
    const totalPaid = (state.clientPayments || []).filter(p => p.clientId === clientId && p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0);
    const lastPayments = (state.clientPayments || []).filter(p => p.clientId === clientId && p.status !== 'cancelled').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const paidPercent = client.debt > 0 ? Math.round((totalPaid / (totalPaid + client.debt)) * 100) : 100;

    let html = '';
    // Client info header
    html += '<div style="background:var(--bg-secondary);padding:12px;border-radius:10px;margin-bottom:15px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div><strong style="font-size:1.1em;">' + client.name + '</strong>';
    if (client.phone) html += '<br><small style="color:var(--text-secondary);"><i class="fas fa-phone"></i> ' + client.phone + '</small>';
    if (client.city) html += ' <small style="color:var(--text-secondary);"><i class="fas fa-map-marker-alt"></i> ' + client.city + '</small>';
    html += '</div>';
    html += '<div style="text-align:right;"><div style="font-size:0.8em;color:var(--text-secondary);">Borxhi</div><div style="font-size:1.3em;font-weight:bold;color:' + (client.debt > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + client.debt + ' den</div></div>';
    html += '</div>';

    // Progress bar - sa % e borxhit eshte paguar
    html += '<div style="margin-top:10px;">';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.75em;color:var(--text-secondary);margin-bottom:3px;"><span>Paguar: ' + totalPaid + ' den</span><span>' + paidPercent + '%</span></div>';
    html += '<div style="background:var(--border);border-radius:10px;height:8px;overflow:hidden;">';
    html += '<div style="background:linear-gradient(90deg,var(--success),#2ecc71);height:100%;width:' + paidPercent + '%;border-radius:10px;transition:width 0.5s;"></div>';
    html += '</div></div>';
    html += '</div>';

    // Quick amount buttons
    if (client.debt > 0) {
        html += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">';
        html += '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'collect-amount\').value=' + client.debt + ';updateCollectPreview(\'' + clientId + '\')">Gjithcka (' + client.debt + ')</button>';
        html += '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'collect-amount\').value=' + Math.round(client.debt / 2) + ';updateCollectPreview(\'' + clientId + '\')">Gjysma (' + Math.round(client.debt / 2) + ')</button>';
        [500, 1000, 2000, 3000, 5000, 10000].forEach(v => {
            if (client.debt > v) html += '<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById(\'collect-amount\').value=' + v + ';updateCollectPreview(\'' + clientId + '\')">' + v.toLocaleString() + '</button>';
        });
        html += '</div>';
    }

    // Form fields
    html += '<div class="form-group"><label><i class="fas fa-money-bill"></i> Shuma:</label><input type="number" id="collect-amount" class="form-control" min="1" max="' + client.debt + '" value="' + client.debt + '" oninput="updateCollectPreview(\'' + clientId + '\')"></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<div class="form-group" style="flex:1;"><label><i class="fas fa-calendar"></i> Data:</label><input type="date" id="collect-date" class="form-control" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div class="form-group" style="flex:1;"><label><i class="fas fa-credit-card"></i> Metoda:</label><select id="collect-method" class="form-control"><option value="Cash">Cash</option><option value="Transfer">Transfer bankar</option><option value="Tjeter">Tjeter</option></select></div>';
    html += '</div>';
    html += '<div class="form-group"><label><i class="fas fa-tag"></i> Kategoria:</label><select id="collect-category" class="form-control"><option value="borxh">Pagese borxhi</option><option value="keste">Keste</option><option value="paradhenie">Paradhenie</option><option value="porosi">Pagese porosie</option></select></div>';
    html += '<div class="form-group"><label><i class="fas fa-user"></i> Pagese nga:</label><input type="text" id="collect-payer" class="form-control" placeholder="Klienti vete (opsionale)" value="' + client.name + '"></div>';
    html += '<div class="form-group"><label><i class="fas fa-sticky-note"></i> Shenim:</label><input type="text" id="collect-note" class="form-control" placeholder="Opsionale"></div>';

    // Auto actions checkboxes
    html += '<div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:12px;">';
    html += '<div style="font-size:0.85em;font-weight:600;margin-bottom:6px;"><i class="fas fa-magic"></i> Veprime automatike:</div>';
    html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.85em;margin-bottom:4px;cursor:pointer;"><input type="checkbox" id="collect-auto-receipt"> <i class="fas fa-receipt" style="color:var(--primary);"></i> Gjenero fature PDF</label>';
    html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.85em;margin-bottom:4px;cursor:pointer;"><input type="checkbox" id="collect-auto-whatsapp" checked> <i class="fab fa-whatsapp" style="color:#25d366;"></i> Dergo konfirmim WhatsApp klientit</label>';
    html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.85em;cursor:pointer;"><input type="checkbox" id="collect-auto-profit-wa" checked> <i class="fab fa-whatsapp" style="color:#128c7e;"></i> Dergo deshmine e fitimit (Elez + Orhan)</label>';
    html += '</div>';

    // Live preview of profit split
    html += '<div id="collect-preview" style="background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid var(--border);">';
    html += buildCollectPreview(clientId, client.debt, totalProfit);
    html += '</div>';

    // Main button
    html += '<button class="btn btn-success" onclick="collectClientPayment(\'' + clientId + '\')" style="width:100%;font-size:1.1em;padding:14px;border-radius:12px;"><i class="fas fa-check-circle"></i> Pranuar - Merr pagesen</button>';

    // Last payments
    if (lastPayments.length > 0) {
        html += '<div style="margin-top:15px;border-top:1px solid var(--border);padding-top:10px;"><small style="color:var(--text-secondary);font-weight:600;"><i class="fas fa-history"></i> Pagesat e fundit:</small>';
        lastPayments.forEach(p => {
            html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.85em;border-bottom:1px solid var(--border);">';
            html += '<span>' + p.date + '</span><span style="color:var(--success);font-weight:bold;">+' + p.amount + ' den</span><span>' + (p.method || 'Cash') + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    openModal('Merr pagese - ' + client.name, html);
}

// Live preview helper for collect modal
function buildCollectPreview(clientId, amount, totalProfit) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return '';
    const newDebt = Math.max(0, client.debt - amount);
    let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85em;">';
    h += '<div style="text-align:center;padding:8px;background:white;border-radius:8px;"><div style="color:var(--text-secondary);font-size:0.75em;">Borxhi pas pageses</div><div style="font-size:1.2em;font-weight:700;color:' + (newDebt > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + newDebt + ' den</div></div>';
    h += '<div style="text-align:center;padding:8px;background:white;border-radius:8px;"><div style="color:var(--text-secondary);font-size:0.75em;">Pagesa</div><div style="font-size:1.2em;font-weight:700;color:var(--success);">' + amount + ' den</div></div>';
    h += '<div style="text-align:center;padding:8px;background:white;border-radius:8px;"><div style="color:var(--text-secondary);font-size:0.75em;"><i class="fas fa-user" style="color:#e67e22;"></i> Pjesa Elezit</div><div style="font-size:1.2em;font-weight:700;color:#e67e22;">' + calcOwnerShare(totalProfit) + ' den</div></div>';
    h += '<div style="text-align:center;padding:8px;background:white;border-radius:8px;"><div style="color:var(--text-secondary);font-size:0.75em;"><i class="fas fa-user" style="color:#8e44ad;"></i> Pjesa ' + (state.partnerName || 'Orhan') + '</div><div style="font-size:1.2em;font-weight:700;color:#8e44ad;">' + calcPartnerShare(totalProfit) + ' den</div></div>';
    h += '</div>';
    if (newDebt === 0 && client.debt > 0) h += '<div style="text-align:center;margin-top:8px;color:var(--success);font-weight:bold;"><i class="fas fa-star"></i> Borxhi do te pastrohet komplet!</div>';
    return h;
}

// Update preview when amount changes
function updateCollectPreview(clientId) {
    const el = document.getElementById('collect-preview');
    if (!el) return;
    const amount = parseInt(document.getElementById('collect-amount').value) || 0;
    const totalProfit = state.sales.filter(s => s.clientId === clientId).reduce((s, x) => s + x.profit, 0);
    el.innerHTML = buildCollectPreview(clientId, amount, totalProfit);
}

// Feature 3: Process collection
function collectClientPayment(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const amount = parseInt(document.getElementById('collect-amount').value) || 0;
    if (amount <= 0) { showToast('Vendosni shumen', 'error'); return; }

    const method = document.getElementById('collect-method').value;
    const note = document.getElementById('collect-note').value;
    const payDate = document.getElementById('collect-date') ? document.getElementById('collect-date').value : new Date().toISOString().split('T')[0];
    const category = document.getElementById('collect-category') ? document.getElementById('collect-category').value : 'borxh';
    const payer = document.getElementById('collect-payer') ? document.getElementById('collect-payer').value : client.name;
    const autoReceipt = document.getElementById('collect-auto-receipt') ? document.getElementById('collect-auto-receipt').checked : false;
    const autoWhatsApp = document.getElementById('collect-auto-whatsapp') ? document.getElementById('collect-auto-whatsapp').checked : false;
    const autoProfitWA = document.getElementById('collect-auto-profit-wa') ? document.getElementById('collect-auto-profit-wa').checked : false;

    // Update debt
    const oldDebt = client.debt;
    client.debt = Math.max(0, client.debt - amount);

    // Log payment with extra fields
    if (!state.clientPayments) state.clientPayments = [];
    state.clientPayments.push({
        id: Date.now(),
        clientId,
        amount,
        method,
        note: note || 'Pagese e mbledhur nga Elezi',
        date: payDate,
        category: category,
        payer: payer,
        status: 'active'
    });

    // Audit
    if (typeof addPaymentAudit === 'function') addPaymentAudit('KLIENT_PAGESE', client.name + ': ' + amount + ' den (' + method + ')');

    saveState();
    closeModal();
    refreshClients();

    // Calculate profit
    const profit = state.sales.filter(s => s.clientId === clientId).reduce((s, x) => s + x.profit, 0);
    const ownerShare = calcOwnerShare(profit);
    const partnerShare = calcPartnerShare(profit);

    // Auto actions
    if (autoReceipt) generateClientReceipt(clientId, amount);
    if (autoWhatsApp) sendClientPaymentWhatsApp(clientId, amount);
    if (autoProfitWA) sendProfitSplitWhatsApp(clientId, amount, oldDebt, profit, ownerShare, partnerShare);

    // Show confirmation
    let confirmHtml = '<div style="text-align:center;padding:10px;">';
    confirmHtml += '<div style="font-size:3em;color:var(--success);margin-bottom:10px;"><i class="fas fa-check-circle"></i></div>';
    confirmHtml += '<h3 style="color:var(--success);">Pagesa u pranua!</h3>';
    confirmHtml += '<p style="margin:10px 0;font-size:1.2em;"><strong>' + client.name + '</strong> pagoi <strong style="color:var(--success);">' + amount + ' den</strong></p>';
    if (payer !== client.name) confirmHtml += '<p style="font-size:0.9em;color:var(--text-secondary);">Pagese nga: <strong>' + payer + '</strong></p>';
    confirmHtml += '<div class="confirmation-grid" style="grid-template-columns:repeat(2,1fr);margin:15px 0;">';
    confirmHtml += '<div class="confirmation-card"><div class="conf-label">Borxhi para</div><div class="conf-value" style="color:var(--danger);">' + oldDebt + ' den</div></div>';
    confirmHtml += '<div class="confirmation-card"><div class="conf-label">Borxhi tani</div><div class="conf-value" style="color:' + (client.debt > 0 ? 'var(--warning)' : 'var(--success)') + ';">' + client.debt + ' den</div></div>';
    confirmHtml += '<div class="confirmation-card"><div class="conf-label"><i class="fas fa-user" style="color:#e67e22;"></i> Fitimi Elezit</div><div class="conf-value" style="color:#e67e22;">' + ownerShare + ' den</div></div>';
    confirmHtml += '<div class="confirmation-card"><div class="conf-label"><i class="fas fa-user" style="color:#8e44ad;"></i> Fitimi ' + state.partnerName + '</div><div class="conf-value" style="color:#8e44ad;">' + partnerShare + ' den</div></div>';
    confirmHtml += '</div>';

    // Auto-action status
    let actionsHtml = '<div style="background:var(--bg);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:0.8em;">';
    if (autoReceipt) actionsHtml += '<div style="color:var(--success);"><i class="fas fa-check"></i> Fatura PDF u gjenerua</div>';
    if (autoWhatsApp) actionsHtml += '<div style="color:#25d366;"><i class="fas fa-check"></i> WhatsApp konfirmim u dergua te klienti</div>';
    if (autoProfitWA) actionsHtml += '<div style="color:#128c7e;"><i class="fas fa-check"></i> Deshmi fitimi u dergua (Elez + ' + state.partnerName + ')</div>';
    actionsHtml += '</div>';
    confirmHtml += actionsHtml;

    confirmHtml += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">';
    if (!autoReceipt) confirmHtml += '<button class="btn btn-primary" onclick="generateClientReceipt(\'' + clientId + '\',' + amount + ')"><i class="fas fa-receipt"></i> Fatura</button>';
    if (!autoWhatsApp) confirmHtml += '<button class="btn btn-success" onclick="sendClientPaymentWhatsApp(\'' + clientId + '\',' + amount + ')"><i class="fab fa-whatsapp"></i> WhatsApp Klientit</button>';
    if (!autoProfitWA) confirmHtml += '<button class="btn btn-info" onclick="sendProfitSplitWhatsApp(\'' + clientId + '\',' + amount + ',' + oldDebt + ',' + profit + ',' + ownerShare + ',' + partnerShare + ')"><i class="fab fa-whatsapp"></i> Deshmi Fitimi</button>';
    confirmHtml += '<button class="btn btn-secondary" onclick="closeModal()">Mbyll</button>';
    confirmHtml += '</div></div>';

    openModal('Pagesa u pranua', confirmHtml);
    logActivity('Client Payment', client.name + ' pagoi ' + amount + ' den (' + method + ')');
    if (typeof showConfetti === 'function' && client.debt === 0) showConfetti();
}

// WhatsApp: Send profit split report after payment
function sendProfitSplitWhatsApp(clientId, amount, oldDebt, profit, ownerShare, partnerShare) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const totalPaid = (state.clientPayments || []).filter(p => p.clientId === clientId && p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0);
    const totalBought = state.sales.filter(s => s.clientId === clientId).reduce((s, x) => s + x.sellTotal, 0);
    const today = new Date().toLocaleDateString('sq-AL');

    let text = '*DESHMI PAGESE & FITIMI*\n';
    text += '*Hurma App - ' + today + '*\n';
    text += '━━━━━━━━━━━━━━━━━━━━\n\n';
    text += '*KLIENTI:* ' + client.name + '\n';
    if (client.phone) text += '*Tel:* ' + client.phone + '\n';
    text += '\n';
    text += '*PAGESA:*\n';
    text += '  Shuma: *' + amount + ' den*\n';
    text += '  Borxhi para: ' + oldDebt + ' den\n';
    text += '  Borxhi tani: *' + client.debt + ' den*\n';
    if (client.debt === 0) text += '  *BORXHI U PASTRUA!*\n';
    text += '\n━━━━━━━━━━━━━━━━━━━━\n';
    text += '*FITIMI NGA KY KLIENT:*\n';
    text += '  Blerje totale: ' + totalBought + ' den\n';
    text += '  Paguar totale: ' + totalPaid + ' den\n';
    text += '  Fitimi total: *' + profit + ' den*\n';
    text += '\n';
    text += '*NDARJA E FITIMIT:*\n';
    text += '  Elez (' + state.profitSplit.owner + '%): *' + ownerShare + ' den*\n';
    text += '  ' + (state.partnerName || 'Orhan') + ' (' + state.profitSplit.partner + '%): *' + partnerShare + ' den*\n';
    text += '\n━━━━━━━━━━━━━━━━━━━━\n';
    text += '_Gjeneruar nga Hurma App_';

    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// Feature 4, 10: Client receipt PDF
function generateClientReceipt(clientId, amount) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('sq-AL');
    const receiptNum = 'KL-' + new Date().getFullYear() + '-' + String((state.clientPayments || []).length).padStart(4, '0');

    doc.setFontSize(18); doc.setTextColor(44, 62, 80);
    doc.text('DESHMI PAGESE', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text('Hurma App | ' + today, 105, 28, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(41, 128, 185);
    doc.text(receiptNum, 105, 36, { align: 'center' });

    doc.setDrawColor(200); doc.line(20, 42, 190, 42);

    let y = 52;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Klienti: ' + client.name, 20, y); y += 8;
    if (client.phone) { doc.text('Tel: ' + client.phone, 20, y); y += 8; }
    doc.text('Data: ' + today, 20, y); y += 12;

    doc.setFontSize(14); doc.setTextColor(39, 174, 96);
    doc.text('Shuma e paguar: ' + amount + ' den', 20, y); y += 12;

    doc.setFontSize(10); doc.setTextColor(0);
    doc.text('Borxhi i mbetur: ' + client.debt + ' den', 20, y); y += 10;

    doc.setDrawColor(200); doc.line(20, y, 190, y); y += 10;
    doc.text('Pranuar nga: Elez Dauti', 20, y); y += 15;

    doc.setDrawColor(200); doc.line(20, y, 90, y); doc.line(110, y, 190, y);
    doc.setFontSize(9);
    doc.text('Nenshkrimi pranuesit', 55, y + 7, { align: 'center' });
    doc.text('Nenshkrimi paguesit', 150, y + 7, { align: 'center' });

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Gjeneruar nga Hurma App', 105, 280, { align: 'center' });

    doc.save('Pagese_' + client.name.replace(/\s+/g, '_') + '_' + receiptNum + '.pdf');
    showToast('Fatura PDF u shkarkua', 'success');
}

// Feature 10: Send payment WhatsApp to client
function sendClientPaymentWhatsApp(clientId, amount) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    let text = '*Konfirmim Pagese - Hurma*\n';
    text += '━━━━━━━━━━━━━━━━\n';
    text += '*Klienti:* ' + client.name + '\n';
    text += '*Shuma:* ' + amount + ' den\n';
    text += '*Data:* ' + new Date().toLocaleDateString('sq-AL') + '\n';
    text += '*Borxhi mbetur:* ' + client.debt + ' den\n';
    text += '━━━━━━━━━━━━━━━━\n';
    text += '_Pranuar nga Elez - Hurma App_';
    const phone = client.phone ? client.phone.replace(/[^0-9]/g, '') : '';
    window.open('https://wa.me/' + (phone ? phone : '') + '?text=' + encodeURIComponent(text), '_blank');
}

// Feature 24: Send debt reminder WhatsApp
function sendClientDebtWhatsApp(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    let text = '*Kujtese Borxhi - Hurma*\n\n';
    text += 'Pershendetje ' + client.name + ',\n';
    text += 'Ju kujtojme qe keni nje borxh te papaguar:\n\n';
    text += '*Shuma:* ' + client.debt + ' den\n';
    text += '*Data:* ' + new Date().toLocaleDateString('sq-AL') + '\n\n';
    text += 'Ju lutem beni pagesen sa me pare.\n';
    text += 'Faleminderit!';
    const phone = client.phone ? client.phone.replace(/[^0-9]/g, '') : '';
    window.open('https://wa.me/' + (phone ? phone : '') + '?text=' + encodeURIComponent(text), '_blank');
}

// ===================== PAYMENT CORRECTION FUNCTIONS =====================

// Edit a client payment (change amount, method, note)
function editClientPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment) return;

    let html = '<div style="padding:10px;">';
    html += '<div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:15px;">';
    html += '<p style="margin:0;font-size:0.85em;color:var(--text-secondary);">Pagesa origjinale: <strong>' + payment.amount + ' den</strong> | ' + payment.date + ' | ' + (payment.method || '-') + '</p>';
    html += '</div>';
    html += '<div class="form-group"><label>Shuma e re (den)</label><input type="number" id="edit-pay-amount" class="form-control" value="' + payment.amount + '"></div>';
    html += '<div class="form-group"><label>Metoda</label><select id="edit-pay-method" class="form-control">';
    ['Cash', 'Transfer', 'Tjeter'].forEach(m => {
        html += '<option value="' + m + '"' + (payment.method === m ? ' selected' : '') + '>' + m + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Shenim</label><input type="text" id="edit-pay-note" class="form-control" value="' + (payment.note || '') + '" placeholder="Arsyeja e ndryshimit..."></div>';
    html += '<div style="display:flex;gap:8px;margin-top:15px;">';
    html += '<button class="btn btn-primary" onclick="saveEditedPayment(\'' + clientId + '\',' + paymentId + ')" style="flex:1;"><i class="fas fa-save"></i> Ruaj ndryshimet</button>';
    html += '<button class="btn btn-secondary" onclick="showClientPaymentHistory(\'' + clientId + '\')" style="flex:1;"><i class="fas fa-arrow-left"></i> Kthehu</button>';
    html += '</div></div>';

    openModal('Edito pagesen - ' + client.name, html);
}

function saveEditedPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment) return;

    const newAmount = parseInt(document.getElementById('edit-pay-amount').value) || 0;
    if (newAmount <= 0) { showToast('Shuma duhet te jete me e madhe se 0', 'error'); return; }

    const oldAmount = payment.amount;
    const diff = newAmount - oldAmount;

    // Adjust client debt: if new amount is bigger, debt goes down more; if smaller, debt goes up
    client.debt = Math.max(0, client.debt - diff);

    // Update payment
    payment.amount = newAmount;
    payment.method = document.getElementById('edit-pay-method').value;
    payment.note = document.getElementById('edit-pay-note').value;
    payment.editedAt = new Date().toISOString();
    payment.editHistory = payment.editHistory || [];
    payment.editHistory.push({ oldAmount, newAmount, date: new Date().toISOString() });

    if (typeof addPaymentAudit === 'function') addPaymentAudit('PAGESE_EDITUAR', client.name + ': ' + oldAmount + ' → ' + newAmount + ' den');
    logActivity('Payment Edited', client.name + ': ' + oldAmount + ' → ' + newAmount + ' den');

    saveState();
    showToast('Pagesa u ndryshua: ' + oldAmount + ' → ' + newAmount + ' den', 'success');
    showClientPaymentHistory(clientId);
}

// Cancel a payment (mark as cancelled, return debt to client)
function cancelClientPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment) return;

    let html = '<div style="text-align:center;padding:15px;">';
    html += '<div style="font-size:3em;color:var(--warning);margin-bottom:10px;"><i class="fas fa-exclamation-triangle"></i></div>';
    html += '<h3>Anulo pagesen?</h3>';
    html += '<p>Kjo do te ktheje borxhin <strong>' + payment.amount + ' den</strong> te klientit <strong>' + client.name + '</strong></p>';
    html += '<div style="background:var(--bg);border-radius:10px;padding:12px;margin:15px 0;">';
    html += '<p style="margin:0;">Borxhi aktual: <strong style="color:var(--danger);">' + client.debt + ' den</strong></p>';
    html += '<p style="margin:5px 0 0;">Borxhi pas anulimit: <strong style="color:var(--danger);">' + (client.debt + payment.amount) + ' den</strong></p>';
    html += '</div>';
    html += '<div class="form-group"><label>Arsyeja e anulimit</label><input type="text" id="cancel-pay-reason" class="form-control" placeholder="P.sh. Klienti nuk e dha borxhin..."></div>';
    html += '<div style="display:flex;gap:8px;margin-top:15px;">';
    html += '<button class="btn btn-warning" onclick="confirmCancelPayment(\'' + clientId + '\',' + paymentId + ')" style="flex:1;color:white;"><i class="fas fa-undo"></i> Po, anulo</button>';
    html += '<button class="btn btn-secondary" onclick="showClientPaymentHistory(\'' + clientId + '\')" style="flex:1;"><i class="fas fa-arrow-left"></i> Jo, kthehu</button>';
    html += '</div></div>';

    openModal('Anulo pagesen', html);
}

function confirmCancelPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment || payment.status === 'cancelled') return;

    const reason = document.getElementById('cancel-pay-reason') ? document.getElementById('cancel-pay-reason').value : '';

    // Return debt
    client.debt += payment.amount;

    // Mark as cancelled
    payment.status = 'cancelled';
    payment.cancelledAt = new Date().toISOString();
    payment.cancelReason = reason;

    if (typeof addPaymentAudit === 'function') addPaymentAudit('PAGESE_ANULUAR', client.name + ': ' + payment.amount + ' den - ' + (reason || 'Pa arsye'));
    logActivity('Payment Cancelled', client.name + ' - ' + payment.amount + ' den anuluar');

    saveState();
    refreshClients();
    showToast('Pagesa ' + payment.amount + ' den u anulua. Borxhi i klientit u rikthye.', 'warning');
    showClientPaymentHistory(clientId);
}

// Delete a payment permanently
function deleteClientPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment) return;

    let html = '<div style="text-align:center;padding:15px;">';
    html += '<div style="font-size:3em;color:var(--danger);margin-bottom:10px;"><i class="fas fa-trash-alt"></i></div>';
    html += '<h3 style="color:var(--danger);">Fshi pagesen perfundimisht?</h3>';
    html += '<p>Kjo veprim <strong>nuk mund te kthehet</strong>!</p>';
    html += '<p>Pagesa: <strong>' + payment.amount + ' den</strong> | ' + payment.date + '</p>';
    if (payment.status !== 'cancelled') {
        html += '<p style="color:var(--warning);"><i class="fas fa-info-circle"></i> Borxhi i klientit do te rritet me ' + payment.amount + ' den</p>';
    }
    html += '<div style="display:flex;gap:8px;margin-top:15px;">';
    html += '<button class="btn btn-danger" onclick="confirmDeletePayment(\'' + clientId + '\',' + paymentId + ')" style="flex:1;"><i class="fas fa-trash"></i> Po, fshi</button>';
    html += '<button class="btn btn-secondary" onclick="showClientPaymentHistory(\'' + clientId + '\')" style="flex:1;"><i class="fas fa-arrow-left"></i> Jo, kthehu</button>';
    html += '</div></div>';

    openModal('Fshi pagesen', html);
}

function confirmDeletePayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const idx = (state.clientPayments || []).findIndex(p => p.id === paymentId);
    if (idx === -1) return;

    const payment = state.clientPayments[idx];

    // If payment was active (not cancelled), return debt
    if (payment.status !== 'cancelled') {
        client.debt += payment.amount;
    }

    // Remove from array
    state.clientPayments.splice(idx, 1);

    if (typeof addPaymentAudit === 'function') addPaymentAudit('PAGESE_FSHIRE', client.name + ': ' + payment.amount + ' den fshire');
    logActivity('Payment Deleted', client.name + ' - ' + payment.amount + ' den fshire');

    saveState();
    refreshClients();
    showToast('Pagesa u fshi. Borxhi u korrigjua.', 'warning');
    showClientPaymentHistory(clientId);
}

// Restore a cancelled payment
function restoreClientPayment(clientId, paymentId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payment = (state.clientPayments || []).find(p => p.id === paymentId);
    if (!payment || payment.status !== 'cancelled') return;

    // Re-apply payment
    client.debt = Math.max(0, client.debt - payment.amount);
    payment.status = 'active';
    payment.restoredAt = new Date().toISOString();
    delete payment.cancelReason;

    if (typeof addPaymentAudit === 'function') addPaymentAudit('PAGESE_RIKTHYER', client.name + ': ' + payment.amount + ' den rikthyer');
    logActivity('Payment Restored', client.name + ' - ' + payment.amount + ' den rikthyer');

    saveState();
    refreshClients();
    showToast('Pagesa ' + payment.amount + ' den u rikthye!', 'success');
    showClientPaymentHistory(clientId);
}

// Feature 7: Client payment history
function showClientPaymentHistory(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payments = (state.clientPayments || []).filter(p => p.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
    const clientSales = state.sales.filter(s => s.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
    const totalPaid = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0);
    const totalBought = clientSales.reduce((s, x) => s + x.sellTotal, 0);
    const totalProfit = clientSales.reduce((s, x) => s + x.profit, 0);

    let html = '<div class="confirmation-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:15px;">';
    html += '<div class="confirmation-card"><div class="conf-label">Blerje totale</div><div class="conf-value">' + totalBought + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Paguar totale</div><div class="conf-value" style="color:var(--success);">' + totalPaid + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Borxhi</div><div class="conf-value" style="color:var(--danger);">' + client.debt + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Fitimi</div><div class="conf-value">' + totalProfit + '</div></div>';
    html += '</div>';

    // Payments table
    const activePayments = payments.filter(p => p.status !== 'cancelled');
    const cancelledPayments = payments.filter(p => p.status === 'cancelled');
    html += '<h4 style="margin-bottom:8px;">Pagesat (' + activePayments.length + (cancelledPayments.length ? ' + ' + cancelledPayments.length + ' anuluar' : '') + ')</h4>';
    if (payments.length > 0) {
        html += '<table class="data-table"><thead><tr><th>Data</th><th>Shuma</th><th>Metoda</th><th>Shenim</th><th>Status</th><th>Veprime</th></tr></thead><tbody>';
        payments.forEach(p => {
            const isCancelled = p.status === 'cancelled';
            const rowStyle = isCancelled ? 'opacity:0.5;text-decoration:line-through;' : '';
            html += '<tr style="' + rowStyle + '">';
            html += '<td>' + p.date + '</td>';
            html += '<td style="color:' + (isCancelled ? 'var(--text-secondary)' : 'var(--success)') + ';font-weight:bold;">' + p.amount + ' den</td>';
            html += '<td>' + (p.method || '-') + '</td>';
            html += '<td>' + (p.note || '-') + '</td>';
            html += '<td>' + (isCancelled ? '<span style="color:var(--danger);font-size:0.8em;"><i class="fas fa-ban"></i> Anuluar</span>' : '<span style="color:var(--success);font-size:0.8em;"><i class="fas fa-check-circle"></i> Aktive</span>') + '</td>';
            html += '<td style="white-space:nowrap;">';
            if (!isCancelled) {
                html += '<button class="btn btn-sm btn-secondary" onclick="editClientPayment(\'' + clientId + '\',' + p.id + ')" title="Edito" style="margin-right:3px;"><i class="fas fa-edit"></i></button>';
                html += '<button class="btn btn-sm btn-warning" onclick="cancelClientPayment(\'' + clientId + '\',' + p.id + ')" title="Anulo" style="margin-right:3px;color:white;"><i class="fas fa-undo"></i></button>';
                html += '<button class="btn btn-sm btn-danger" onclick="deleteClientPayment(\'' + clientId + '\',' + p.id + ')" title="Fshi"><i class="fas fa-trash"></i></button>';
            } else {
                html += '<button class="btn btn-sm btn-success" onclick="restoreClientPayment(\'' + clientId + '\',' + p.id + ')" title="Rikthe"><i class="fas fa-redo"></i></button>';
            }
            html += '</td></tr>';
        });
        html += '</tbody></table>';
    } else html += '<p style="color:var(--text-secondary);">Nuk ka pagesa.</p>';

    // Sales table
    html += '<h4 style="margin:15px 0 8px;">Blerjet (' + clientSales.length + ')</h4>';
    if (clientSales.length > 0) {
        html += '<table class="data-table"><thead><tr><th>Data</th><th>Produkti</th><th>Sasia</th><th>Totali</th><th>Fitimi</th></tr></thead><tbody>';
        clientSales.slice(0, 20).forEach(s => {
            const p = getProduct(s.productId);
            html += '<tr><td>' + s.date + '</td><td>' + p.name + '</td><td>' + s.quantity + '</td><td>' + s.sellTotal + ' den</td><td>' + s.profit + ' den</td></tr>';
        });
        html += '</tbody></table>';
    }

    // Action buttons
    html += '<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary" onclick="closeModal();openQuickCollectModal(\'' + clientId + '\')"><i class="fas fa-hand-holding-usd"></i> Merr pagese</button>';
    html += '<button class="btn btn-secondary" onclick="generateClientStatement(\'' + clientId + '\')"><i class="fas fa-file-pdf"></i> Statement</button>';
    html += '<button class="btn btn-secondary" onclick="showClientPaymentChart(\'' + clientId + '\')"><i class="fas fa-chart-line"></i> Grafik</button>';
    html += '<button class="btn btn-success" onclick="sendClientDebtWhatsApp(\'' + clientId + '\')"><i class="fab fa-whatsapp"></i> Kujtese</button>';
    html += '</div>';

    openModal('Historiku - ' + client.name, html);
}

// Feature 15: Client statement PDF
function generateClientStatement(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payments = (state.clientPayments || []).filter(p => p.clientId === clientId);
    const sales = state.sales.filter(s => s.clientId === clientId);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(44, 62, 80);
    doc.text('LLOGARIA E KLIENTIT', 105, 18, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text('Hurma App - ' + new Date().toLocaleDateString('sq-AL'), 105, 25, { align: 'center' });

    let y = 35;
    doc.setFontSize(12); doc.setTextColor(0);
    doc.text('Klienti: ' + client.name, 20, y); y += 7;
    if (client.phone) { doc.text('Tel: ' + client.phone, 20, y); y += 7; }
    doc.text('Borxhi aktual: ' + client.debt + ' den', 20, y); y += 10;

    // All transactions
    const events = [];
    sales.forEach(s => { events.push({ date: s.date, type: 'Blerje', desc: getProduct(s.productId).name + ' x' + s.quantity, debit: s.sellTotal, credit: 0 }); });
    payments.forEach(p => { events.push({ date: p.date, type: 'Pagese', desc: (p.method || 'Cash') + (p.note ? ' - ' + p.note : ''), debit: 0, credit: p.amount }); });
    events.sort((a, b) => a.date.localeCompare(b.date));

    const headers = ['Data', 'Lloji', 'Pershkrim', 'Debi', 'Kredi', 'Bilanci'];
    let balance = 0;
    const rows = events.map(e => {
        balance += e.debit - e.credit;
        return [e.date, e.type, e.desc, e.debit > 0 ? e.debit + '' : '', e.credit > 0 ? e.credit + '' : '', balance + ''];
    });

    doc.autoTable({ head: [headers], body: rows, startY: y, styles: { fontSize: 8 }, headStyles: { fillColor: [44, 62, 80] } });
    doc.save('Statement_' + client.name.replace(/\s+/g, '_') + '.pdf');
    showToast('Statement PDF u shkarkua', 'success');
}

// Feature 16: Client payment installments
function openClientInstallmentModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client || client.debt <= 0) { showToast('Ky klient nuk ka borxh', 'info'); return; }
    let html = '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:12px;">';
    html += '<p><strong>' + client.name + '</strong> - Borxhi: <span style="color:var(--danger);font-weight:bold;">' + client.debt + ' den</span></p></div>';
    html += '<div class="form-group"><label>Numri i kesteve:</label><input type="number" id="cl-inst-count" min="2" max="12" value="3"></div>';
    html += '<div class="form-group"><label>Intervali (dite):</label><input type="number" id="cl-inst-interval" min="7" max="90" value="30"></div>';
    html += '<button class="btn btn-primary" onclick="saveClientInstallments(\'' + clientId + '\')" style="width:100%;"><i class="fas fa-calendar-check"></i> Krijo plan kestesh</button>';
    openModal('Keste per ' + client.name, html);
}

function saveClientInstallments(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const count = parseInt(document.getElementById('cl-inst-count').value) || 3;
    const interval = parseInt(document.getElementById('cl-inst-interval').value) || 30;
    const perInst = Math.ceil(client.debt / count);
    if (!state.clientInstallments) state.clientInstallments = {};
    const installments = [];
    let remaining = client.debt;
    for (let i = 0; i < count; i++) {
        const d = new Date(); d.setDate(d.getDate() + (i * interval));
        const amt = Math.min(perInst, remaining); remaining -= amt;
        installments.push({ date: d.toISOString().split('T')[0], amount: amt, paid: false });
    }
    state.clientInstallments[clientId] = installments;
    saveState(); closeModal();
    showToast('Plani i kesteve u krijua per ' + client.name, 'success');
}

// Feature 17: Early payment discount
function openEarlyPaymentModal(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client || client.debt <= 0) return;
    const discount3 = Math.round(client.debt * 0.03);
    const discount5 = Math.round(client.debt * 0.05);
    let html = '<div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:12px;">';
    html += '<p><strong>' + client.name + '</strong> - Borxhi: ' + client.debt + ' den</p></div>';
    html += '<p style="margin-bottom:12px;">Zgjidhni zbritjen per pagese te shpejte:</p>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    html += '<button class="btn btn-success" onclick="applyEarlyDiscount(\'' + clientId + '\',3)" style="padding:12px;text-align:left;"><strong>3% zbritje</strong> - Klienti paguan ' + (client.debt - discount3) + ' den (kursen ' + discount3 + ' den)</button>';
    html += '<button class="btn btn-success" onclick="applyEarlyDiscount(\'' + clientId + '\',5)" style="padding:12px;text-align:left;"><strong>5% zbritje</strong> - Klienti paguan ' + (client.debt - discount5) + ' den (kursen ' + discount5 + ' den)</button>';
    html += '<button class="btn btn-secondary" onclick="closeModal();openQuickCollectModal(\'' + clientId + '\')" style="padding:12px;">Pa zbritje - Pagese normale</button>';
    html += '</div>';
    openModal('Zbritje per pagese te shpejte', html);
}

function applyEarlyDiscount(clientId, pct) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const discount = Math.round(client.debt * pct / 100);
    const newDebt = client.debt - discount;
    client.debt = 0;
    addClientPaymentLog(clientId, newDebt, 'Cash', 'Pagese e plote me ' + pct + '% zbritje (zbritja: ' + discount + ' den)');
    saveState(); closeModal(); refreshClients();
    showToast(client.name + ' pagoi ' + newDebt + ' den me ' + pct + '% zbritje', 'success');
    logActivity('Early Payment', client.name + ': ' + newDebt + ' den (zbritje ' + pct + '%)');
    if (typeof showConfetti === 'function') showConfetti();
}

// Feature 18: Client ranking by debt
function showClientRanking() {
    const clients = [...state.clients].sort((a, b) => b.debt - a.debt);
    let html = '<table class="data-table"><thead><tr><th>#</th><th>Klienti</th><th>Borxhi</th><th>Blerje totale</th><th>Pagesa totale</th><th>Statusi</th></tr></thead><tbody>';
    clients.forEach((c, i) => {
        const totalBought = state.sales.filter(s => s.clientId === c.id).reduce((s, x) => s + x.sellTotal, 0);
        const totalPaid = (state.clientPayments || []).filter(p => p.clientId === c.id && p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0);
        const status = c.debt <= 0 ? '<span style="color:var(--success);"><i class="fas fa-check-circle"></i> I rregullt</span>' : c.debt > 10000 ? '<span style="color:var(--danger);"><i class="fas fa-exclamation-circle"></i> Borxh i larte</span>' : '<span style="color:var(--warning);"><i class="fas fa-clock"></i> Ka borxh</span>';
        html += '<tr><td><strong>' + (i + 1) + '</strong></td><td>' + c.name + '</td>';
        html += '<td style="color:' + (c.debt > 0 ? 'var(--danger)' : 'var(--success)') + ';font-weight:bold;">' + c.debt + ' den</td>';
        html += '<td>' + totalBought + ' den</td><td>' + totalPaid + ' den</td><td>' + status + '</td></tr>';
    });
    html += '</tbody></table>';
    openModal('Ranking klientesh sipas borxhit', html);
}

// Feature 19: Client payment chart
function showClientPaymentChart(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    let html = '<canvas id="client-payment-chart" width="400" height="250"></canvas>';
    openModal('Grafiku i pagesave - ' + client.name, html);
    setTimeout(() => {
        const canvas = document.getElementById('client-payment-chart');
        if (!canvas) return;
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.toISOString().slice(0, 7)); }
        const buyData = months.map(m => state.sales.filter(s => s.clientId === clientId && s.date && s.date.startsWith(m)).reduce((s, x) => s + x.sellTotal, 0));
        const payData = months.map(m => (state.clientPayments || []).filter(p => p.clientId === clientId && p.date && p.date.startsWith(m)).reduce((s, p) => s + p.amount, 0));
        const labels = months.map(m => new Date(m + '-01').toLocaleDateString('sq-AL', { month: 'short' }));
        new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Blerje', data: buyData, backgroundColor: 'rgba(231,76,60,0.7)' }, { label: 'Pagesa', data: payData, backgroundColor: 'rgba(39,174,96,0.7)' }] },
            options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }, 200);
}

// Feature 20: Payment grouping by period
function showPaymentsByPeriod() {
    const payments = (state.clientPayments || []).filter(p => p.status !== 'cancelled');
    const byMonth = {};
    payments.forEach(p => {
        const key = p.date ? p.date.slice(0, 7) : 'unknown';
        if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, payments: [] };
        byMonth[key].total += p.amount;
        byMonth[key].count++;
        byMonth[key].payments.push(p);
    });
    let html = '<table class="data-table"><thead><tr><th>Periudha</th><th>Pagesa</th><th>Shuma</th><th>Mesatarja</th></tr></thead><tbody>';
    Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).forEach(([month, data]) => {
        const d = new Date(month + '-01');
        html += '<tr><td><strong>' + d.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }) + '</strong></td>';
        html += '<td>' + data.count + '</td><td style="color:var(--success);font-weight:bold;">' + data.total + ' den</td>';
        html += '<td>' + Math.round(data.total / data.count) + ' den</td></tr>';
    });
    html += '</tbody></table>';
    openModal('Pagesat sipas periudhes', html);
}

// Feature 22: Client comparison
function showClientComparison() {
    const clients = state.clients.filter(c => state.sales.some(s => s.clientId === c.id));
    let html = '<table class="data-table"><thead><tr><th>Klienti</th><th>Blerje</th><th>Paguar</th><th>Borxh</th><th>% Paguar</th><th>Vleresimi</th></tr></thead><tbody>';
    clients.forEach(c => {
        const bought = state.sales.filter(s => s.clientId === c.id).reduce((s, x) => s + x.sellTotal, 0);
        const paid = (state.clientPayments || []).filter(p => p.clientId === c.id && p.status !== 'cancelled').reduce((s, p) => s + p.amount, 0);
        const pct = bought > 0 ? Math.round(paid / bought * 100) : 100;
        const rating = pct >= 90 ? '<span style="color:var(--success);">Shkelqyeshem</span>' : pct >= 70 ? '<span style="color:var(--accent);">Mire</span>' : pct >= 50 ? '<span style="color:var(--warning);">Mesatar</span>' : '<span style="color:var(--danger);">Dobet</span>';
        html += '<tr><td><strong>' + c.name + '</strong></td><td>' + bought + '</td><td style="color:var(--success);">' + paid + '</td><td style="color:var(--danger);">' + c.debt + '</td>';
        html += '<td><div style="display:flex;align-items:center;gap:5px;"><div style="width:50px;height:6px;background:#eee;border-radius:3px;"><div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + (pct >= 70 ? 'var(--success)' : 'var(--danger)') + ';border-radius:3px;"></div></div>' + pct + '%</td>';
        html += '<td>' + rating + '</td></tr>';
    });
    html += '</tbody></table>';
    openModal('Krahasimi i klienteve', html);
}

// Feature 13: Auto debt reminders check
function checkClientDebtReminders() {
    const now = new Date();
    state.clients.forEach(c => {
        if (c.debt <= 0) return;
        const lastPayment = (state.clientPayments || []).filter(p => p.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (lastPayment) {
            const days = Math.round((now.getTime() - new Date(lastPayment.date).getTime()) / 86400000);
            if (days >= 30) {
                if (typeof showBalanceAlert === 'function') showBalanceAlert('danger', c.name + ' ka ' + days + ' dite pa paguar! Borxh: ' + c.debt + ' den');
            }
        }
    });
}

// Feature 14: QR code for client debt
function showClientQR(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    let html = '<div style="text-align:center;">';
    html += '<p style="margin-bottom:10px;"><strong>' + client.name + '</strong></p>';
    html += '<p>Borxhi: <strong style="color:var(--danger);">' + client.debt + ' den</strong></p>';
    html += '<div id="client-qr-code" style="margin:20px auto;display:inline-block;"></div>';
    html += '<p style="font-size:0.8em;color:var(--text-secondary);margin-top:10px;">Skanoni per te pare detajet</p>';
    html += '</div>';
    openModal('QR - ' + client.name, html);
    setTimeout(() => {
        const container = document.getElementById('client-qr-code');
        if (container && typeof QRCode !== 'undefined') {
            new QRCode(container, { text: 'HURMA|' + client.name + '|Borxh:' + client.debt + '|Tel:' + (client.phone || '-'), width: 180, height: 180 });
        }
    }, 200);
}

// Feature 25: Weekly payment report
function showWeeklyPaymentReport() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekPayments = (state.clientPayments || []).filter(p => p.date >= weekStr && p.status !== 'cancelled');
    const totalCollected = weekPayments.reduce((s, p) => s + p.amount, 0);
    const totalDebtRemaining = state.clients.reduce((s, c) => s + c.debt, 0);
    const clientsWhoPaid = [...new Set(weekPayments.map(p => p.clientId))].length;

    let html = '<div class="confirmation-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:15px;">';
    html += '<div class="confirmation-card"><div class="conf-label">Mbledhur kete jave</div><div class="conf-value" style="color:var(--success);">' + totalCollected + ' den</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Kliente qe paguan</div><div class="conf-value">' + clientsWhoPaid + '</div></div>';
    html += '<div class="confirmation-card"><div class="conf-label">Borxh total mbetur</div><div class="conf-value" style="color:var(--danger);">' + totalDebtRemaining + ' den</div></div>';
    html += '</div>';

    html += '<h4>Detajet javore:</h4>';
    html += '<table class="data-table"><thead><tr><th>Data</th><th>Klienti</th><th>Shuma</th><th>Metoda</th></tr></thead><tbody>';
    weekPayments.sort((a, b) => b.date.localeCompare(a.date)).forEach(p => {
        const client = state.clients.find(c => c.id === p.clientId);
        html += '<tr><td>' + p.date + '</td><td>' + (client ? client.name : '-') + '</td><td style="color:var(--success);font-weight:bold;">' + p.amount + ' den</td><td>' + (p.method || 'Cash') + '</td></tr>';
    });
    html += '</tbody></table>';
    openModal('Raporti javor i pagesave', html);
}

// Feature 28: Export client payments CSV
function exportClientPaymentsCSV() {
    const payments = (state.clientPayments || []).filter(p => p.status !== 'cancelled');
    let csv = 'Data,Klienti,Shuma,Metoda,Shenim,Statusi\n';
    payments.forEach(p => {
        const client = state.clients.find(c => c.id === p.clientId);
        csv += p.date + ',"' + (client ? client.name : '-') + '",' + p.amount + ',' + (p.method || 'Cash') + ',"' + (p.note || '') + '",' + (p.status || 'active') + '\n';
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Pagesat_Klienteve_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    showToast('CSV u shkarkua', 'success');
}

// Feature 29: Print client history
function printClientHistory(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;
    const payments = (state.clientPayments || []).filter(p => p.clientId === clientId);
    const sales = state.sales.filter(s => s.clientId === clientId);

    let html = '<html><head><style>body{font-family:Arial;font-size:12px;}table{width:100%;border-collapse:collapse;margin:10px 0;}th,td{border:1px solid #ccc;padding:6px;text-align:left;}th{background:#2c3e50;color:white;}</style></head><body>';
    html += '<h2>Hurma App - Historiku i ' + client.name + '</h2>';
    html += '<p>Data: ' + new Date().toLocaleDateString('sq-AL') + ' | Borxhi: ' + client.debt + ' den</p>';
    html += '<h3>Pagesat</h3><table><tr><th>Data</th><th>Shuma</th><th>Metoda</th></tr>';
    payments.forEach(p => html += '<tr><td>' + p.date + '</td><td>' + p.amount + ' den</td><td>' + (p.method || 'Cash') + '</td></tr>');
    html += '</table>';
    html += '<h3>Blerjet</h3><table><tr><th>Data</th><th>Produkti</th><th>Totali</th></tr>';
    sales.forEach(s => html += '<tr><td>' + s.date + '</td><td>' + getProduct(s.productId).name + '</td><td>' + s.sellTotal + ' den</td></tr>');
    html += '</table></body></html>';

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
}

// Feature 30: Auto-register cash sale as payment
function autoRegisterCashPayment(sale) {
    if ((sale.paymentType || 'cash') === 'cash' && sale.clientId) {
        addClientPaymentLog(sale.clientId, sale.sellTotal, 'Cash', 'Pagese automatike nga shitja');
    }
}

// ===================== CROSS-TAB INTEGRATION =====================

// Feature 1: Global Search
function globalSearch(query) {
    const results = document.getElementById('global-search-results');
    if (!query || query.length < 2) { results.classList.add('hidden'); return; }
    query = query.toLowerCase();
    let html = '';

    // Search clients
    state.clients.filter(c => c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query))).slice(0, 3).forEach(c => {
        html += `<div class="search-result-item" onclick="navigateTo('clients');closeSidePanel();hideSearchResults();">
            <i class="fas fa-user"></i><div><div class="sr-name">${c.name}</div><div class="sr-detail">${c.phone || ''} | Borxh: ${c.debt || 0} ден</div></div><span class="sr-type">Klient</span></div>`;
    });

    // Search products
    PRODUCTS.filter(p => p.name.toLowerCase().includes(query)).slice(0, 3).forEach(p => {
        html += `<div class="search-result-item" onclick="openProduct360('${p.id}')">
            <i class="fas fa-box"></i><div><div class="sr-name">${p.name}</div><div class="sr-detail">Blerje: ${p.buyPrice} | Shitje: ${p.sellPrice} ден</div></div><span class="sr-type">Produkt</span></div>`;
    });

    // Search sales
    state.sales.filter(s => {
        const p = getProduct(s.productId);
        const c = state.clients.find(cl => cl.id === s.clientId);
        return (p && p.name.toLowerCase().includes(query)) || (c && c.name.toLowerCase().includes(query)) || (s.date && s.date.includes(query));
    }).slice(0, 3).forEach(s => {
        const p = getProduct(s.productId);
        html += `<div class="search-result-item" onclick="navigateTo('sales');hideSearchResults();">
            <i class="fas fa-cash-register"></i><div><div class="sr-name">${p ? p.name : 'N/A'} x${s.quantity}</div><div class="sr-detail">${s.date} | ${s.sellTotal} ден</div></div><span class="sr-type">Shitje</span></div>`;
    });

    // Search notes
    state.notes.filter(n => (n.title && n.title.toLowerCase().includes(query)) || (n.content && n.content.toLowerCase().includes(query))).slice(0, 2).forEach(n => {
        html += `<div class="search-result-item" onclick="navigateTo('notes');hideSearchResults();">
            <i class="fas fa-sticky-note"></i><div><div class="sr-name">${n.title || 'Shënim'}</div><div class="sr-detail">${(n.content || '').substring(0, 50)}...</div></div><span class="sr-type">Shënim</span></div>`;
    });

    // Search contacts
    state.contacts.filter(c => (c.name && c.name.toLowerCase().includes(query)) || (c.phone && c.phone.includes(query))).slice(0, 2).forEach(c => {
        html += `<div class="search-result-item" onclick="navigateTo('contacts');hideSearchResults();">
            <i class="fas fa-address-book"></i><div><div class="sr-name">${c.name}</div><div class="sr-detail">${c.phone || ''}</div></div><span class="sr-type">Kontakt</span></div>`;
    });

    if (!html) html = '<div class="search-result-item"><i class="fas fa-info-circle"></i><div class="sr-name">Asnjë rezultat</div></div>';
    results.innerHTML = html;
    results.classList.remove('hidden');
}

function showSearchResults() {
    const input = document.getElementById('global-search-input');
    if (input.value.length >= 2) globalSearch(input.value);
}

function hideSearchResults() {
    document.getElementById('global-search-results').classList.add('hidden');
}

// Feature 2: Dashboard Miniatures (enhance refreshDashboard - called via refreshDashboardMiniatures)
function refreshDashboardMiniatures() {
    const dash = document.getElementById('page-dashboard');
    let miniDiv = document.getElementById('dashboard-miniatures');
    if (!miniDiv) {
        miniDiv = document.createElement('div');
        miniDiv.id = 'dashboard-miniatures';
        miniDiv.className = 'suggestions-bar';
        miniDiv.style.marginTop = '15px';
        const statsGrid = dash.querySelector('.stats-grid');
        if (statsGrid) statsGrid.parentNode.insertBefore(miniDiv, statsGrid.nextSibling);
    }

    const lowStock = PRODUCTS.filter(p => (state.stock[p.id] || 0) < 5);
    const debtClients = state.clients.filter(c => c.debt > 0);
    const totalDebt = debtClients.reduce((s, c) => s + (c.debt || 0), 0);
    const pendingOrders = state.orders.filter(o => o.status === 'pending');
    const fatonDebt = calcTotalOwedToFaton();

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">';
    html += `<div class="panel-360-card"><div class="p360-value" style="color:${lowStock.length > 0 ? 'var(--danger)' : 'var(--success)'}">${lowStock.length}</div><div class="p360-label"><i class="fas fa-boxes-stacked"></i> Stok i ulët</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value" style="color:${debtClients.length > 0 ? 'var(--warning)' : 'var(--success)'}">${debtClients.length}</div><div class="p360-label"><i class="fas fa-users"></i> Klientë me borxh</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value" style="color:var(--danger)">${totalDebt} ден</div><div class="p360-label"><i class="fas fa-hand-holding-usd"></i> Borxh total klientësh</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value">${pendingOrders.length}</div><div class="p360-label"><i class="fas fa-clipboard-list"></i> Porosi aktive</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value" style="color:var(--danger)">${fatonDebt} ден</div><div class="p360-label"><i class="fas fa-handshake"></i> Borxh Fatoni</div></div>`;
    html += '</div>';
    miniDiv.innerHTML = '<strong><i class="fas fa-th-large"></i> Përmbledhje nga të gjitha tabet</strong>' + html;
}

function calcTotalOwedToFaton() {
    // Delegate to the correct calcFatonDebt function
    return calcFatonDebt();
}

// Feature 3: Smart Notifications
function generateSmartNotifications() {
    const notifs = [];
    const today = new Date().toISOString().split('T')[0];

    // Low stock alerts
    PRODUCTS.forEach(p => {
        const qty = state.stock[p.id] || 0;
        if (qty < 3) notifs.push({ type: 'danger', icon: 'fa-boxes-stacked', text: `Stoku i ${p.name} është ${qty} - duhet furnizim!`, action: `navigateTo('stock')` });
        else if (qty < 5) notifs.push({ type: 'warning', icon: 'fa-boxes-stacked', text: `Stoku i ${p.name} po mbaron (${qty})`, action: `navigateTo('stock')` });
    });

    // Client debt alerts
    state.clients.filter(c => c.debt > 0).forEach(c => {
        if (c.debt > 5000) notifs.push({ type: 'danger', icon: 'fa-user-clock', text: `${c.name} ka borxh ${c.debt} ден - shumë i lartë!`, action: `openClient360('${c.id}')` });
    });

    // Overdue invoices
    state.sales.filter(s => s.paymentType === 'invoice_60' && !s.invoicePaid && s.dueDate && s.dueDate < today).forEach(s => {
        const client = state.clients.find(c => c.id === s.clientId);
        notifs.push({ type: 'warning', icon: 'fa-file-invoice', text: `Fatura e ${client ? client.name : 'N/A'} ka skaduar (${s.dueDate})`, action: `navigateTo('clients')` });
    });

    // Faton debt
    const fatonDebt = calcTotalOwedToFaton();
    if (fatonDebt > 10000) notifs.push({ type: 'danger', icon: 'fa-handshake', text: `Borxhi ndaj Fatonit: ${fatonDebt} ден - shumë i lartë!`, action: `navigateTo('faton')` });

    // Pending orders
    const pendingOrders = state.orders.filter(o => o.status === 'pending');
    if (pendingOrders.length > 0) notifs.push({ type: 'info', icon: 'fa-clipboard-list', text: `${pendingOrders.length} porosi në pritje`, action: `navigateTo('orders')` });

    return notifs;
}

function showSmartSuggestions() {
    const dash = document.getElementById('page-dashboard');
    let sugDiv = document.getElementById('smart-suggestions');
    if (!sugDiv) {
        sugDiv = document.createElement('div');
        sugDiv.id = 'smart-suggestions';
        const miniDiv = document.getElementById('dashboard-miniatures');
        if (miniDiv) miniDiv.parentNode.insertBefore(sugDiv, miniDiv.nextSibling);
        else { const sg = dash.querySelector('.stats-grid'); if (sg) sg.parentNode.insertBefore(sugDiv, sg.nextSibling); }
    }

    const suggestions = [];
    const today = new Date().toISOString().split('T')[0];

    // Stock suggestions
    PRODUCTS.forEach(p => {
        if ((state.stock[p.id] || 0) < 3) suggestions.push({ icon: 'fa-truck', text: `${p.name} po mbaron - porosit nga Fatoni`, btn: 'Porosit', action: `navigateTo('faton')` });
    });

    // Payment suggestions
    const fatonDebt = calcTotalOwedToFaton();
    if (fatonDebt > 5000 && (state.fatonPayments || []).length > 0) {
        const lastPay = state.fatonPayments[state.fatonPayments.length - 1];
        const daysSince = Math.floor((new Date() - new Date(lastPay.date)) / (1000*60*60*24));
        if (daysSince > 14) suggestions.push({ icon: 'fa-money-bill', text: `Fatoni s'është paguar ${daysSince} ditë - konsidero pagesë`, btn: 'Pago', action: `navigateTo('faton')` });
    }

    // Client suggestions
    state.clients.forEach(c => {
        const sales = state.sales.filter(s => s.clientId === c.id);
        if (sales.length >= 3) {
            const dates = sales.map(s => new Date(s.date)).sort((a,b) => b-a);
            if (dates.length >= 2) {
                const avgGap = (dates[0] - dates[dates.length-1]) / (dates.length - 1) / (1000*60*60*24);
                const daysSinceLast = (new Date() - dates[0]) / (1000*60*60*24);
                if (daysSinceLast > avgGap * 1.5) suggestions.push({ icon: 'fa-user-clock', text: `${c.name} zakonisht blen çdo ${Math.round(avgGap)} ditë - ndoshta duhet kontaktuar`, btn: 'Kontakto', action: c.phone ? `sendWhatsApp('${c.phone}','Përshëndetje ${c.name}')` : `navigateTo('clients')` });
            }
        }
    });

    if (suggestions.length === 0) { sugDiv.innerHTML = ''; return; }

    let html = '<div class="suggestions-bar"><strong><i class="fas fa-lightbulb"></i> Sugjerime</strong>';
    suggestions.slice(0, 5).forEach(s => {
        html += `<div class="suggestion-item"><i class="fas ${s.icon}"></i><span>${s.text}</span><button onclick="${s.action}">${s.btn}</button></div>`;
    });
    html += '</div>';
    sugDiv.innerHTML = html;
}

// Feature 4: Quick Actions FAB (Global)
function initGlobalQuickActions() {
    let fab = document.getElementById('global-fab');
    if (fab) return;
    fab = document.createElement('div');
    fab.id = 'global-fab';
    fab.className = 'fab-container';
    fab.innerHTML = `
        <div class="fab-menu" id="global-fab-menu">
        </div>
        <div class="fab-badge" id="fab-badge"></div>
        <button class="fab-button" id="fab-main-btn" onclick="toggleGlobalFAB()"><i class="fas fa-plus" id="fab-icon"></i></button>`;
    document.body.appendChild(fab);
    fab.style.bottom = '50px';
    updateFABBadge();

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!fab.contains(e.target)) {
            const menu = document.getElementById('global-fab-menu');
            if (menu && menu.classList.contains('active')) {
                toggleGlobalFAB();
            }
        }
    });
}

function getFABItems() {
    // Dynamic items based on current page
    const currentPage = document.querySelector('.nav-item.active');
    const page = currentPage ? currentPage.dataset.page : 'dashboard';

    const allItems = [
        { icon: 'fa-cash-register', label: 'Shitje e Re', color: '#2ecc71', action: "navigateTo('sales');setTimeout(()=>openSaleModal(),100);toggleGlobalFAB()", priority: 1 },
        { icon: 'fa-money-bill', label: 'Pago Fatonin', color: '#3498db', action: "navigateTo('faton');setTimeout(()=>openFatonPaymentModal(),100);toggleGlobalFAB()", priority: 2 },
        { icon: 'fa-user-plus', label: 'Klient i Ri', color: '#9b59b6', action: "navigateTo('clients');setTimeout(()=>openClientModal(),100);toggleGlobalFAB()", priority: 3 },
        { icon: 'fa-clipboard-list', label: 'Porosi e Re', color: '#f39c12', action: "navigateTo('orders');setTimeout(()=>openOrderModal(),100);toggleGlobalFAB()", priority: 4 },
        { icon: 'fa-sticky-note', label: 'Shënim i Ri', color: '#1abc9c', action: "navigateTo('notes');setTimeout(()=>openNoteModal(),100);toggleGlobalFAB()", priority: 5 },
        { icon: 'fa-stream', label: 'Timeline', color: '#8e44ad', action: "openGlobalTimeline();toggleGlobalFAB()", priority: 6 },
        { icon: 'fa-file-alt', label: 'Raport Ditor', color: '#e67e22', action: "generateDailyReport();toggleGlobalFAB()", priority: 7 },
        { icon: 'fa-download', label: 'Eksport Total', color: '#2c3e50', action: "masterExport();toggleGlobalFAB()", priority: 8 },
        { icon: 'fa-crown', label: 'Klienti i Ditës', color: '#f1c40f', action: "showClientOfDay();toggleGlobalFAB()", priority: 9 },
        { icon: 'fa-chart-bar', label: 'Krahasim', color: '#e74c3c', action: "showComparisonChart();toggleGlobalFAB()", priority: 10 },
    ];

    // Prioritize based on current page
    const pageBoost = { 'sales': 'fa-cash-register', 'faton': 'fa-money-bill', 'clients': 'fa-user-plus', 'orders': 'fa-clipboard-list', 'notes': 'fa-sticky-note' };
    const boosted = pageBoost[page];
    if (boosted) {
        const idx = allItems.findIndex(i => i.icon === boosted);
        if (idx > 0) { const item = allItems.splice(idx, 1)[0]; item.priority = 0; allItems.unshift(item); }
    }

    return allItems;
}

function toggleGlobalFAB() {
    const menu = document.getElementById('global-fab-menu');
    const icon = document.getElementById('fab-icon');
    if (!menu) return;

    const isOpen = menu.classList.contains('active');

    if (isOpen) {
        // Close with animation
        const items = menu.querySelectorAll('.fab-menu-item');
        items.forEach((item, i) => {
            item.style.transitionDelay = (items.length - 1 - i) * 30 + 'ms';
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px) scale(0.8)';
        });
        setTimeout(() => { menu.classList.remove('active'); }, 200);
        if (icon) { icon.className = 'fas fa-plus'; icon.style.transform = 'rotate(0deg)'; }
    } else {
        // Build menu items dynamically
        const items = getFABItems();
        menu.innerHTML = items.map((item, i) =>
            `<div class="fab-menu-item" onclick="${item.action}" style="transition-delay:${i * 40}ms;opacity:0;transform:translateY(10px) scale(0.8);">
                <span class="fab-item-label">${item.label}</span>
                <span class="fab-item-icon" style="background:${item.color};"><i class="fas ${item.icon}"></i></span>
            </div>`
        ).join('');

        menu.classList.add('active');

        // Animate items in
        requestAnimationFrame(() => {
            menu.querySelectorAll('.fab-menu-item').forEach(item => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0) scale(1)';
            });
        });

        if (icon) { icon.className = 'fas fa-times'; icon.style.transform = 'rotate(90deg)'; }
    }
}

function updateFABBadge() {
    const badge = document.getElementById('fab-badge');
    if (!badge) return;
    const pendingOrders = state.orders.filter(o => o.status === 'pending').length;
    const debtClients = state.clients.filter(c => c.debt > 0).length;
    const total = pendingOrders + debtClients;
    if (total > 0) {
        badge.textContent = total;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Feature 5: Global Timeline
function openGlobalTimeline() {
    const events = [];

    state.sales.forEach(s => {
        const p = getProduct(s.productId);
        const c = state.clients.find(cl => cl.id === s.clientId);
        events.push({ date: s.date, time: s.time || '00:00', type: 'sale', icon: 'fa-cash-register', cls: 'sale', title: `Shitje: ${p ? p.name : 'N/A'} x${s.quantity}`, detail: `${c ? c.name : 'Pa klient'} | ${s.sellTotal} ден | Fitim: ${s.profit} ден` });
    });

    (state.fatonPayments || []).forEach(p => {
        events.push({ date: p.date, time: '12:00', type: 'payment', icon: 'fa-money-bill', cls: 'payment', title: `Pagesë Fatoni: ${p.amount} ден`, detail: p.note || '' });
    });

    (state.returns || []).forEach(r => {
        events.push({ date: r.date, time: '12:00', type: 'return', icon: 'fa-undo', cls: 'return', title: `Kthim: ${r.productId}`, detail: `${r.quantity} copë | ${r.refundAmount || 0} ден` });
    });

    state.orders.forEach(o => {
        events.push({ date: o.date, time: '12:00', type: 'order', icon: 'fa-clipboard-list', cls: 'order', title: `Porosi: ${o.productId}`, detail: `${o.quantity} copë | ${o.status}` });
    });

    events.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    let html = '<div class="global-timeline">';
    events.slice(0, 50).forEach(e => {
        html += `<div class="gt-item">
            <div class="gt-icon ${e.cls}"><i class="fas ${e.icon}"></i></div>
            <div class="gt-content"><div class="gt-title">${e.title}</div><div class="gt-detail">${e.detail}</div><div class="gt-time">${e.date} ${e.time}</div></div>
        </div>`;
    });
    html += '</div>';

    openModal(`<h3><i class="fas fa-stream"></i> Timeline Globale</h3>${html}`);
}

// Feature 6: Daily Report
function generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date === today);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.sellTotal, 0);
    const todayCash = todaySales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0);
    const todayInvoice = todaySales.filter(s => s.paymentType === 'invoice_60').reduce((sum, s) => sum + s.sellTotal, 0);
    const todayPayments = (state.fatonPayments || []).filter(p => p.date === today);
    const todayFatonPaid = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDebtClients = state.clients.reduce((sum, c) => sum + (c.debt || 0), 0);
    const fatonDebt = calcTotalOwedToFaton();
    const ownerShare = calcOwnerShare(todayProfit);
    const partnerShare = calcPartnerShare(todayProfit);

    let html = `<div class="daily-report">
        <h3><i class="fas fa-file-alt"></i> Raport Ditor - ${today}</h3>
        <div class="dr-row"><span class="dr-label">Shitje sot</span><span class="dr-value">${todaySales.length} shitje</span></div>
        <div class="dr-row"><span class="dr-label">Qarkullimi</span><span class="dr-value">${todayRevenue} ден</span></div>
        <div class="dr-row"><span class="dr-label">Fitimi</span><span class="dr-value" style="color:var(--success)">${todayProfit} ден</span></div>
        <div class="dr-row"><span class="dr-label">Cash</span><span class="dr-value">${todayCash} ден</span></div>
        <div class="dr-row"><span class="dr-label">Faturë</span><span class="dr-value">${todayInvoice} ден</span></div>
        <hr>
        <div class="dr-row"><span class="dr-label">Elez (${state.profitSplit.owner}%)</span><span class="dr-value">${ownerShare} ден</span></div>
        <div class="dr-row"><span class="dr-label">${state.partnerName} (${state.profitSplit.partner}%)</span><span class="dr-value">${partnerShare} ден</span></div>
        <hr>
        <div class="dr-row"><span class="dr-label">Paguar Fatonit sot</span><span class="dr-value">${todayFatonPaid} ден</span></div>
        <div class="dr-row"><span class="dr-label">Borxhi Fatoni total</span><span class="dr-value" style="color:var(--danger)">${fatonDebt} ден</span></div>
        <div class="dr-row"><span class="dr-label">Borxhi klientësh total</span><span class="dr-value" style="color:var(--danger)">${totalDebtClients} ден</span></div>
        <hr>
        <div class="dr-row"><span class="dr-label">Stoku</span><span class="dr-value">${PRODUCTS.map(p => p.name + ': ' + (state.stock[p.id]||0)).join(', ')}</span></div>
        <div style="margin-top:15px;text-align:center;">
            <button class="btn btn-primary" onclick="exportDailyReportPDF()"><i class="fas fa-file-pdf"></i> Shkarko PDF</button>
        </div>
    </div>`;

    openModal(html);
}

function exportDailyReportPDF() {
    const today = new Date().toISOString().split('T')[0];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Raport Ditor - ' + today, 20, 20);
    doc.setFontSize(12);

    const todaySales = state.sales.filter(s => s.date === today);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.sellTotal, 0);
    const fatonDebt = calcTotalOwedToFaton();
    const totalDebtClients = state.clients.reduce((sum, c) => sum + (c.debt || 0), 0);

    let y = 35;
    const lines = [
        ['Shitje sot', todaySales.length + ''],
        ['Qarkullimi', todayRevenue + ' den'],
        ['Fitimi', todayProfit + ' den'],
        ['Elez (' + state.profitSplit.owner + '%)', calcOwnerShare(todayProfit) + ' den'],
        [state.partnerName + ' (' + state.profitSplit.partner + '%)', calcPartnerShare(todayProfit) + ' den'],
        ['Borxhi Fatoni', fatonDebt + ' den'],
        ['Borxhi klientesh', totalDebtClients + ' den'],
    ];
    lines.forEach(l => { doc.text(l[0] + ': ' + l[1], 20, y); y += 8; });

    doc.save('raport-ditor-' + today + '.pdf');
    showToast('PDF u shkarkua!');
}

// Feature 7: Product 360° View
function openProduct360(productId) {
    const product = getProduct(productId);
    if (!product) return;

    const stock = state.stock[productId] || 0;
    const sales = state.sales.filter(s => s.productId === productId);
    const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const totalRevenue = sales.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const totalBought = sales.reduce((sum, s) => sum + s.buyTotal, 0);
    const uniqueClients = [...new Set(sales.map(s => s.clientId).filter(Boolean))];

    const title = `${product.name} - Pamje 360°`;
    let html = `<div class="panel-360-grid">
        <div class="panel-360-card"><div class="p360-value">${stock}</div><div class="p360-label">Stok aktual</div></div>
        <div class="panel-360-card"><div class="p360-value">${totalSold}</div><div class="p360-label">Gjithsej shitur</div></div>
        <div class="panel-360-card"><div class="p360-value">${totalRevenue} ден</div><div class="p360-label">Qarkullim</div></div>
        <div class="panel-360-card"><div class="p360-value" style="color:var(--success)">${totalProfit} ден</div><div class="p360-label">Fitim total</div></div>
        <div class="panel-360-card"><div class="p360-value">${totalBought} ден</div><div class="p360-label">Kosto Fatoni</div></div>
        <div class="panel-360-card"><div class="p360-value">${uniqueClients.length}</div><div class="p360-label">Klientë</div></div>
    </div>`;

    // Last 5 sales
    html += '<h4>Shitjet e fundit</h4><div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Klienti</th><th>Sasia</th><th>Totali</th><th>Fitimi</th></tr></thead><tbody>';
    sales.slice(-5).reverse().forEach(s => {
        const c = state.clients.find(cl => cl.id === s.clientId);
        html += `<tr><td>${s.date}</td><td>${c ? c.name : '-'}</td><td>${s.quantity}</td><td>${s.sellTotal} ден</td><td>${s.profit} ден</td></tr>`;
    });
    html += '</tbody></table></div>';

    openSidePanel(title, html);
}

// Feature 8: Client 360° Panel
function openClient360(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const sales = state.sales.filter(s => s.clientId === clientId);
    const totalPurchases = sales.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const cashPaid = sales.filter(s => (s.paymentType || 'cash') === 'cash').reduce((sum, s) => sum + s.sellTotal, 0);
    const payments = (state.clientPayments || []).filter(p => p.clientId === clientId);
    const totalClientPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const openInvoices = sales.filter(s => s.paymentType === 'invoice_60' && !s.invoicePaid);
    const notes = state.notes.filter(n => n.linkedClient === clientId);
    const orders = state.orders.filter(o => o.clientId === clientId);

    let html = `<div class="panel-360-grid">
        <div class="panel-360-card"><div class="p360-value">${totalPurchases} ден</div><div class="p360-label">Blerje totale</div></div>
        <div class="panel-360-card"><div class="p360-value" style="color:var(--success)">${totalProfit} ден</div><div class="p360-label">Fitim total</div></div>
        <div class="panel-360-card"><div class="p360-value">${cashPaid} ден</div><div class="p360-label">Cash paguar</div></div>
        <div class="panel-360-card"><div class="p360-value" style="color:var(--danger)">${client.debt || 0} ден</div><div class="p360-label">Borxhi aktual</div></div>
        <div class="panel-360-card"><div class="p360-value">${sales.length}</div><div class="p360-label">Nr. shitjeve</div></div>
        <div class="panel-360-card"><div class="p360-value">${openInvoices.length}</div><div class="p360-label">Fatura hapura</div></div>
    </div>`;

    // Contact info
    html += '<div style="margin-bottom:12px;">';
    if (client.phone) html += `<button class="btn btn-sm" style="background:#25D366;color:white;" onclick="sendWhatsApp('${client.phone}','Përshëndetje ${client.name}')"><i class="fab fa-whatsapp"></i> WhatsApp</button> `;
    html += `<button class="btn btn-sm btn-success" onclick="openQuickCollectModal('${clientId}');closeSidePanel()"><i class="fas fa-hand-holding-usd"></i> Mbledh Pagesë</button> `;
    html += `<button class="btn btn-sm btn-info" onclick="generateClientStatement('${clientId}')"><i class="fas fa-file-alt"></i> Pasqyrë</button>`;
    html += '</div>';

    // Last 5 sales
    html += '<h4>Shitjet e fundit</h4><div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Produkti</th><th>Totali</th></tr></thead><tbody>';
    sales.slice(-5).reverse().forEach(s => {
        const p = getProduct(s.productId);
        html += `<tr><td>${s.date}</td><td>${p ? p.name : 'N/A'} x${s.quantity}</td><td>${s.sellTotal} ден</td></tr>`;
    });
    html += '</tbody></table></div>';

    if (orders.length > 0) {
        html += '<h4>Porositë</h4><div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Produkti</th><th>Statusi</th></tr></thead><tbody>';
        orders.slice(-3).reverse().forEach(o => {
            html += `<tr><td>${o.date}</td><td>${(getProduct(o.productId) || {}).name || o.productId} x${o.quantity}</td><td>${o.status}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }

    openSidePanel(client.name + ' - 360°', html);
}

// Feature 9: Tab Badges
function updateTabBadges() {
    const today = new Date().toISOString().split('T')[0];

    // Sales badge - today's sales count
    const todaySales = state.sales.filter(s => s.date === today).length;
    setBadge('badge-sales', todaySales);

    // Stock badge - low stock count
    const lowStock = PRODUCTS.filter(p => (state.stock[p.id] || 0) < 5).length;
    setBadge('badge-stock', lowStock);

    // Clients badge - clients with debt
    const debtClients = state.clients.filter(c => c.debt > 0).length;
    setBadge('badge-clients', debtClients);

    // Orders badge - pending orders
    const pendingOrders = state.orders.filter(o => o.status === 'pending').length;
    setBadge('badge-orders', pendingOrders);

    // Faton badge - debt indicator
    const fatonDebt = calcTotalOwedToFaton();
    setBadge('badge-faton', fatonDebt > 0 ? 1 : 0);

    // Returns badge
    const recentReturns = state.returns.filter(r => r.date === today).length;
    setBadge('badge-returns', recentReturns);
}

function setBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Feature 10: Side Panel
function openSidePanel(title, contentHtml) {
    document.getElementById('side-panel-title').textContent = title;
    document.getElementById('side-panel-body').innerHTML = contentHtml;
    document.getElementById('side-panel-overlay').classList.remove('hidden');
    const panel = document.getElementById('side-panel');
    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('open'), 10);
}

function closeSidePanel() {
    const panel = document.getElementById('side-panel');
    panel.classList.remove('open');
    setTimeout(() => {
        panel.classList.add('hidden');
        document.getElementById('side-panel-overlay').classList.add('hidden');
    }, 300);
}

// Feature 11: Auto-Link Notes with Context
function openNoteModalLinked(type, id, name) {
    // Open note modal with pre-linked context
    openNoteModal();
    setTimeout(() => {
        const titleInput = document.querySelector('#modal input[type="text"]');
        if (titleInput) titleInput.value = `Shënim për: ${name}`;
        // Store link info
        window._noteLink = { type, id, name };
    }, 100);
}

function saveNoteWithLink() {
    const note = state.notes[state.notes.length - 1];
    if (note && window._noteLink) {
        note.linkedClient = window._noteLink.type === 'client' ? window._noteLink.id : null;
        note.linkedProduct = window._noteLink.type === 'product' ? window._noteLink.id : null;
        note.linkedType = window._noteLink.type;
        note.linkedName = window._noteLink.name;
        saveState();
        window._noteLink = null;
    }
}

// Feature 12: Global Date Filter
function applyGlobalDateFilter() {
    const from = document.getElementById('global-date-from').value;
    const to = document.getElementById('global-date-to').value;
    window._globalDateFilter = { from, to };
    refreshAll();
    showToast(`Filtri: ${from || '...'} deri ${to || '...'}`);
}

function clearGlobalDateFilter() {
    document.getElementById('global-date-from').value = '';
    document.getElementById('global-date-to').value = '';
    window._globalDateFilter = null;
    refreshAll();
    showToast('Filtri u hoq');
}

function filterByGlobalDate(items, dateField) {
    if (!window._globalDateFilter) return items;
    const { from, to } = window._globalDateFilter;
    return items.filter(item => {
        const d = item[dateField || 'date'];
        if (!d) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });
}

// Feature 13: Monthly Comparison Helper
function getMonthlyComparison(currentValue, previousValue) {
    if (previousValue === 0 && currentValue === 0) return '<span class="month-compare same">= 0%</span>';
    if (previousValue === 0) return '<span class="month-compare up"><i class="fas fa-arrow-up"></i> Ri</span>';
    const pct = Math.round(((currentValue - previousValue) / previousValue) * 100);
    if (pct > 0) return `<span class="month-compare up"><i class="fas fa-arrow-up"></i> +${pct}%</span>`;
    if (pct < 0) return `<span class="month-compare down"><i class="fas fa-arrow-down"></i> ${pct}%</span>`;
    return '<span class="month-compare same">= 0%</span>';
}

function getLastMonthSales() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisSales = state.sales.filter(s => s.date && s.date.startsWith(thisMonth));
    const lastSales = state.sales.filter(s => s.date && s.date.startsWith(lastMonth));
    return {
        thisRevenue: thisSales.reduce((s, x) => s + x.sellTotal, 0),
        lastRevenue: lastSales.reduce((s, x) => s + x.sellTotal, 0),
        thisProfit: thisSales.reduce((s, x) => s + x.profit, 0),
        lastProfit: lastSales.reduce((s, x) => s + x.profit, 0),
        thisCount: thisSales.length,
        lastCount: lastSales.length
    };
}

// Feature 14: Keyboard Shortcuts Enhancement
function enhanceKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+K or / for global search
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.target.matches('input, textarea, select'))) {
            e.preventDefault();
            const input = document.getElementById('global-search-input');
            if (input) input.focus();
            return;
        }
        // Escape to close panels
        if (e.key === 'Escape') {
            closeSidePanel();
            hideSearchResults();
            return;
        }
        // Alt+1-9 for quick navigation
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const pages = ['dashboard', 'sales', 'stock', 'clients', 'orders', 'faton', 'reports', 'balance', 'returns'];
            const idx = parseInt(e.key) - 1;
            if (pages[idx]) navigateTo(pages[idx]);
            return;
        }
        // Alt+S for new sale
        if (e.altKey && e.key === 's') { e.preventDefault(); navigateTo('sales'); setTimeout(() => openSaleModal(), 100); }
        // Alt+P for pay Faton
        if (e.altKey && e.key === 'p') { e.preventDefault(); navigateTo('faton'); setTimeout(() => openFatonPaymentModal(), 100); }
        // Alt+R for daily report
        if (e.altKey && e.key === 'r') { e.preventDefault(); generateDailyReport(); }
        // Alt+T for timeline
        if (e.altKey && e.key === 't') { e.preventDefault(); openGlobalTimeline(); }
    });
}

// Feature 15: Recent Activity Bar
function refreshRecentActivityBar() {
    const rab = document.getElementById('rab-items');
    if (!rab) return;

    const activities = (state.activityLog || []).slice(-5).reverse();
    if (activities.length === 0) {
        rab.innerHTML = '<div class="rab-item"><i class="fas fa-info-circle"></i> Asnjë veprim ende</div>';
        return;
    }

    const iconMap = {
        'sale': 'fa-cash-register', 'Sale Deleted': 'fa-trash', 'Quick Sale': 'fa-bolt',
        'payment': 'fa-money-bill', 'Client Payment': 'fa-hand-holding-usd',
        'Faton Payment': 'fa-handshake', 'Faton': 'fa-handshake', 'Faton Split Payment': 'fa-handshake',
        'Quick Pay': 'fa-money-bill', 'Scheduled Payment': 'fa-calendar-check',
        'stock': 'fa-boxes-stacked', 'Stock Added': 'fa-boxes-stacked',
        'client': 'fa-user', 'order': 'fa-clipboard-list',
        'return': 'fa-undo', 'Receipt': 'fa-receipt',
        'note': 'fa-sticky-note', 'contact': 'fa-address-book', 'settings': 'fa-cog',
        'Expense Added': 'fa-wallet', 'Product Added': 'fa-plus-circle',
        'Product Updated': 'fa-edit', 'Product Deleted': 'fa-minus-circle',
        'Profit Split Changed': 'fa-percentage', 'Cash Drawer Set': 'fa-cash-register',
        'PIN Settings Changed': 'fa-lock', 'WhatsApp Sent': 'fa-whatsapp',
        'RESET': 'fa-exclamation-triangle', 'Early Payment': 'fa-percentage'
    };

    const pageMap = {
        'sale': 'sales', 'Sale Deleted': 'sales', 'Quick Sale': 'sales',
        'Client Payment': 'clients', 'Early Payment': 'clients',
        'Faton Payment': 'faton', 'Faton': 'faton', 'Faton Split Payment': 'faton', 'Quick Pay': 'faton',
        'Stock Added': 'stock', 'stock': 'stock',
        'Expense Added': 'balance', 'RESET': 'settings',
        'Product Added': 'settings', 'Product Updated': 'settings', 'Product Deleted': 'settings'
    };

    rab.innerHTML = activities.map(a => {
        const type = a.type || a.action || '';
        const icon = iconMap[type] || 'fa-circle';
        const page = a.page || pageMap[type] || 'activity';
        const text = a.text || a.details || a.action || 'Veprim';
        const time = a.time || (a.timestamp ? new Date(a.timestamp).toLocaleTimeString('sq', { hour: '2-digit', minute: '2-digit' }) : '');
        return `<div class="rab-item" onclick="navigateTo('${page}')" title="${text}">
            <i class="fas ${icon}"></i>
            <span>${text.length > 40 ? text.substring(0, 40) + '...' : text}</span>
            <span class="rab-time">${time}</span>
        </div>`;
    }).join('');
}

function toggleRecentBar() {
    const bar = document.getElementById('recent-activity-bar');
    if (bar) bar.classList.toggle('collapsed');
}

// Feature 16: Master Export
function masterExport() {
    if (typeof XLSX === 'undefined') { showToast('XLSX library not loaded'); return; }
    const wb = XLSX.utils.book_new();

    // Sales sheet
    const salesData = state.sales.map(s => {
        const p = getProduct(s.productId);
        const c = state.clients.find(cl => cl.id === s.clientId);
        return { Data: s.date, Produkti: p ? p.name : s.productId, Sasia: s.quantity, Cmimi_Blerje: s.buyTotal, Cmimi_Shitje: s.sellTotal, Fitimi: s.profit, Klienti: c ? c.name : '-', Pagesa: s.paymentType || 'cash' };
    });
    if (salesData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Shitjet');

    // Clients sheet
    const clientsData = state.clients.map(c => ({ Emri: c.name, Telefoni: c.phone || '', Kategoria: c.category || '', Borxhi: c.debt || 0 }));
    if (clientsData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientsData), 'Klientet');

    // Stock sheet
    const stockData = PRODUCTS.map(p => ({ Produkti: p.name, Sasia: state.stock[p.id] || 0, Cmimi_Blerje: p.buyPrice, Cmimi_Shitje: p.sellPrice }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockData), 'Stoku');

    // Faton payments sheet
    const fatonData = (state.fatonPayments || []).map(p => ({ Data: p.date, Shuma: p.amount, Shenim: p.note || '' }));
    if (fatonData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fatonData), 'Pagesa_Fatoni');

    // Orders sheet
    const ordersData = state.orders.map(o => ({ Data: o.date, Produkti: o.productId, Sasia: o.quantity, Statusi: o.status }));
    if (ordersData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), 'Porosite');

    // Returns sheet
    const returnsData = (state.returns || []).map(r => ({ Data: r.date, Produkti: r.productId, Sasia: r.quantity, Kthim: r.refundAmount || 0 }));
    if (returnsData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returnsData), 'Kthimet');

    // Summary sheet
    const fatonDebt = calcTotalOwedToFaton();
    const totalDebtClients = state.clients.reduce((s, c) => s + (c.debt || 0), 0);
    const totalProfit = state.sales.reduce((s, x) => s + x.profit, 0);
    const summaryData = [
        { Emertimi: 'Shitje totale', Vlera: state.sales.length },
        { Emertimi: 'Fitim total', Vlera: totalProfit },
        { Emertimi: 'Borxh Fatoni', Vlera: fatonDebt },
        { Emertimi: 'Borxh klientesh', Vlera: totalDebtClients },
        { Emertimi: 'Klientë', Vlera: state.clients.length },
        { Emertimi: 'Produkte', Vlera: PRODUCTS.length },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Permbledhje');

    XLSX.writeFile(wb, 'hurma-eksport-total-' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('Eksporti total u shkarkua!');
}

// Feature 17: Sync Status Bar
function updateSyncStatusBar() {
    // Data status
    const dataEl = document.getElementById('sync-data-status');
    if (dataEl) {
        const hasData = state.sales.length > 0 || state.clients.length > 0;
        dataEl.textContent = hasData ? 'OK ✓' : 'Bosh';
        dataEl.className = hasData ? 'sync-ok' : 'sync-warn';
    }

    // Backup status
    const backupEl = document.getElementById('sync-backup-status');
    if (backupEl) {
        const lastBackup = state.autoBackup ? state.autoBackup.lastBackup : null;
        if (lastBackup) {
            const hours = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000*60*60));
            backupEl.textContent = hours < 1 ? 'Tani' : hours + 'h';
            backupEl.className = hours < 24 ? 'sync-ok' : 'sync-warn';
        } else {
            backupEl.textContent = 'Asnjë';
            backupEl.className = 'sync-warn';
        }
    }

    // Stock count
    const stockEl = document.getElementById('sync-stock-count');
    if (stockEl) {
        const total = Object.values(state.stock).reduce((s, v) => s + v, 0);
        stockEl.textContent = total + ' copë';
        stockEl.className = total < 10 ? 'sync-danger' : 'sync-ok';
    }

    // Debt count
    const debtEl = document.getElementById('sync-debt-count');
    if (debtEl) {
        const debtCount = state.clients.filter(c => c.debt > 0).length;
        debtEl.textContent = debtCount + ' borxhe';
        debtEl.className = debtCount > 0 ? 'sync-warn' : 'sync-ok';
    }
}

// Feature 18: Clickable client/product names across app
function makeNamesClickable() {
    // This runs after table refreshes to make names clickable
    document.querySelectorAll('[data-client-id]').forEach(el => {
        el.style.cursor = 'pointer';
        el.style.textDecoration = 'underline';
        el.style.color = 'var(--primary)';
        el.onclick = () => openClient360(el.dataset.clientId);
    });
    document.querySelectorAll('[data-product-id]').forEach(el => {
        el.style.cursor = 'pointer';
        el.style.textDecoration = 'underline';
        el.style.color = 'var(--primary)';
        el.onclick = () => openProduct360(el.dataset.productId);
    });
}

// ===================== ADVANCED FEATURES =====================

// ADV-1: Auto Backup to JSON download
function autoBackupJSON() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hurma-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    state.autoBackup.lastBackup = new Date().toISOString();
    saveState();
    showToast('Backup u ruajt!');
    try { updateSyncStatusBar(); } catch(e) {}
}

function restoreFromBackup() {
    openModal('Rikthe Backup nga Skedar', `
        <div style="text-align:center;padding:15px;">
            <div style="font-size:3em;margin-bottom:10px;">📂</div>
            <h3 style="margin-bottom:5px;">Zgjidhni skedarin backup</h3>
            <p style="color:#888;margin-bottom:20px;">Zgjidhni skedarin .json nga Downloads</p>
            <div style="margin-bottom:20px;">
                <input type="file" id="restore-file-input" accept=".json"
                    onchange="_onRestoreFileSelected(this)"
                    style="width:100%;padding:15px;border:3px dashed var(--primary);border-radius:12px;font-size:1em;cursor:pointer;background:var(--bg-secondary);box-sizing:border-box;">
            </div>
            <div id="restore-preview" style="display:none;"></div>
            <div id="restore-actions" style="display:none;"></div>
        </div>
    `);
}

function _onRestoreFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => showToast('Gabim gjatë leximit!', 'error');
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                showToast('Skedari nuk është backup valid!', 'error');
                return;
            }
            window._pendingRestore = data;
            window._pendingRestoreFile = file.name;

            const salesCount = Array.isArray(data.sales) ? data.sales.length : 0;
            const clientsCount = Array.isArray(data.clients) ? data.clients.length : 0;
            const paymentsCount = Array.isArray(data.clientPayments) ? data.clientPayments.length : 0;
            const stockCount = data.stock ? Object.keys(data.stock).length : 0;
            const totalDebt = (data.clients || []).reduce((s, c) => s + (c.debt || 0), 0);

            const preview = document.getElementById('restore-preview');
            const actions = document.getElementById('restore-actions');
            if (preview) {
                preview.style.display = 'block';
                preview.innerHTML = `
                    <div style="background:var(--bg-secondary);padding:15px;border-radius:10px;margin-bottom:15px;text-align:left;">
                        <h4 style="margin:0 0 10px;color:var(--primary);"><i class="fas fa-file-code"></i> ${file.name}</h4>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <div><i class="fas fa-shopping-cart"></i> Shitje: <strong>${salesCount}</strong></div>
                            <div><i class="fas fa-users"></i> Klientë: <strong>${clientsCount}</strong></div>
                            <div><i class="fas fa-boxes"></i> Stok: <strong>${stockCount}</strong> produkte</div>
                            <div><i class="fas fa-money-bill"></i> Pagesa: <strong>${paymentsCount}</strong></div>
                        </div>
                        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
                            <span style="color:var(--danger);">Borxh total: <strong>${totalDebt} den</strong></span>
                        </div>
                    </div>
                    <div style="background:#fff3e0;padding:10px;border-radius:8px;margin-bottom:15px;color:#e65100;font-size:0.9em;">
                        <i class="fas fa-exclamation-triangle"></i> Të dhënat aktuale (${state.sales.length} shitje, ${state.clients.length} klientë) do të zëvendësohen!
                    </div>
                `;
            }
            if (actions) {
                actions.style.display = 'flex';
                actions.style.gap = '10px';
                actions.innerHTML = `
                    <button onclick="closeModal()" style="flex:1;padding:14px;border:2px solid var(--border);background:var(--bg);color:var(--text-primary);border-radius:8px;cursor:pointer;font-size:1em;">
                        <i class="fas fa-times"></i> Anulo
                    </button>
                    <button onclick="_confirmRestore()" style="flex:1;padding:14px;border:none;background:var(--success);color:white;border-radius:8px;cursor:pointer;font-size:1.1em;font-weight:bold;">
                        <i class="fas fa-check"></i> RIKTHE
                    </button>
                `;
            }
        } catch(err) {
            showToast('Skedari JSON është i dëmtuar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

function _confirmRestore() {
    const data = window._pendingRestore;
    const fileName = window._pendingRestoreFile || 'backup';
    if (!data) { showToast('Nuk ka të dhëna për rikthim!', 'error'); return; }

    // Save current version before replacing
    if (typeof saveVersion === 'function') {
        try { saveVersion(); } catch(e) {}
    }

    // Fully replace state
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, data);

    // Ensure activityLog exists before logging
    if (!state.activityLog) state.activityLog = [];
    logActivity('restore', 'Backup u rikthye nga skedar: ' + fileName);

    saveState();
    // Also save to IndexedDB for double safety
    if (typeof saveToIndexedDB === 'function') {
        try { saveToIndexedDB(); } catch(e) {}
    }

    window._pendingRestore = null;
    window._pendingRestoreFile = null;

    closeModal();
    showToast('Backup u rikthye me sukses! Faqja po ringarkohet...', 'success');
    setTimeout(() => location.reload(), 1000);
}

// ADV-2: Undo/Redo History
let undoHistory = [];
let redoHistory = [];
const MAX_UNDO = 20;

function saveUndoState(action) {
    undoHistory.push({ action, state: JSON.stringify(state), timestamp: Date.now() });
    if (undoHistory.length > MAX_UNDO) undoHistory.shift();
    redoHistory = [];
}

function undoLastAction() {
    if (undoHistory.length === 0) { showToast('Asgjë për të kthyer'); return; }
    const entry = undoHistory.pop();
    redoHistory.push({ action: 'undo', state: JSON.stringify(state), timestamp: Date.now() });
    const oldState = JSON.parse(entry.state);
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, oldState);
    saveState();
    refreshAll();
    showToast('U kthye: ' + entry.action);
}

function redoLastAction() {
    if (redoHistory.length === 0) { showToast('Asgjë për të ribërë'); return; }
    const entry = redoHistory.pop();
    undoHistory.push({ action: 'redo', state: JSON.stringify(state), timestamp: Date.now() });
    const newState = JSON.parse(entry.state);
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, newState);
    saveState();
    refreshAll();
    showToast('U ribë veprimi');
}

// ADV-3: Sales Prediction
function showSalesPrediction() {
    const now = new Date();
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySales = state.sales.filter(s => s.date === dateStr);
        last30.push({ date: dateStr, count: daySales.length, revenue: daySales.reduce((s, x) => s + x.sellTotal, 0), profit: daySales.reduce((s, x) => s + x.profit, 0) });
    }
    const avgRevenue = Math.round(last30.reduce((s, d) => s + d.revenue, 0) / 30);
    const avgProfit = Math.round(last30.reduce((s, d) => s + d.profit, 0) / 30);
    const avgCount = Math.round(last30.reduce((s, d) => s + d.count, 0) / 30 * 10) / 10;
    const last7 = last30.slice(-7).reduce((s, d) => s + d.revenue, 0);
    const prev7 = last30.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
    const trend = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
    const trendIcon = trend > 0 ? '<i class="fas fa-arrow-up" style="color:var(--success)"></i>' : trend < 0 ? '<i class="fas fa-arrow-down" style="color:var(--danger)"></i>' : '<i class="fas fa-minus"></i>';
    const weeklyPrediction = Math.round(avgRevenue * 7);
    const weeklyProfitPred = Math.round(avgProfit * 7);
    const dayNames = ['Diel', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    const dayTotals = [0,0,0,0,0,0,0];
    state.sales.forEach(s => { const d = new Date(s.date).getDay(); dayTotals[d] += s.sellTotal; });
    let bestDay = 0;
    for (let i = 1; i < 7; i++) { if (dayTotals[i] > dayTotals[bestDay]) bestDay = i; }
    let html = `<div class="daily-report"><h3><i class="fas fa-chart-line"></i> Parashikim Shitjesh</h3>
        <div class="panel-360-grid">
            <div class="panel-360-card"><div class="p360-value">${avgCount}</div><div class="p360-label">Mesatare shitje/ditë</div></div>
            <div class="panel-360-card"><div class="p360-value">${avgRevenue} ден</div><div class="p360-label">Mesatare qarkullim/ditë</div></div>
            <div class="panel-360-card"><div class="p360-value">${avgProfit} ден</div><div class="p360-label">Mesatare fitim/ditë</div></div>
            <div class="panel-360-card"><div class="p360-value">${trendIcon} ${trend}%</div><div class="p360-label">Trendi (7 ditë)</div></div>
        </div>
        <h4><i class="fas fa-forward"></i> Parashikim 7 ditë</h4>
        <div class="dr-row"><span class="dr-label">Qarkullim i pritshëm</span><span class="dr-value">${weeklyPrediction} ден</span></div>
        <div class="dr-row"><span class="dr-label">Fitim i pritshëm</span><span class="dr-value" style="color:var(--success)">${weeklyProfitPred} ден</span></div>
        <div class="dr-row"><span class="dr-label">Dita më e mirë</span><span class="dr-value">${dayNames[bestDay]}</span></div>
        <h4><i class="fas fa-chart-bar"></i> Shitjet sipas ditës</h4>
        <div style="display:flex;gap:8px;align-items:flex-end;height:100px;margin-top:10px;">`;
    const maxDay = Math.max(...dayTotals, 1);
    dayNames.forEach((name, i) => { const h = Math.round((dayTotals[i] / maxDay) * 80); html += `<div style="flex:1;text-align:center;"><div style="background:var(--primary);height:${h}px;border-radius:4px 4px 0 0;margin:0 2px;"></div><small>${name}</small></div>`; });
    html += '</div></div>';
    openModal(html);
}

// ADV-4: Most Profitable Product ranking
function showProfitableProducts() {
    const productStats = PRODUCTS.map(p => {
        const sales = state.sales.filter(s => s.productId === p.id);
        return { ...p, totalProfit: sales.reduce((s, x) => s + x.profit, 0), totalSold: sales.reduce((s, x) => s + x.quantity, 0), totalRevenue: sales.reduce((s, x) => s + x.sellTotal, 0), margin: sales.reduce((s, x) => s + x.sellTotal, 0) > 0 ? Math.round((sales.reduce((s, x) => s + x.profit, 0) / sales.reduce((s, x) => s + x.sellTotal, 0)) * 100) : 0, salesCount: sales.length };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
    let html = '<h3><i class="fas fa-trophy"></i> Produktet më fitimprurëse</h3><div class="table-container"><table class="data-table"><thead><tr><th>#</th><th>Produkti</th><th>Shitur</th><th>Qarkullim</th><th>Fitimi</th><th>Marzhi</th></tr></thead><tbody>';
    productStats.forEach((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1);
        html += `<tr><td>${medal}</td><td>${p.name}</td><td>${p.totalSold} copë</td><td>${p.totalRevenue} ден</td><td style="color:var(--success);font-weight:700">${p.totalProfit} ден</td><td>${p.margin}%</td></tr>`;
    });
    html += '</tbody></table></div>';
    openModal(html);
}

// ADV-5: Best Sales Hour
function showBestSalesHour() {
    const hourData = new Array(24).fill(0);
    state.sales.forEach(s => { if (s.time) { const h = parseInt(s.time.split(':')[0]); if (!isNaN(h)) hourData[h] += s.sellTotal; } });
    let bestHour = 0;
    for (let i = 1; i < 24; i++) { if (hourData[i] > hourData[bestHour]) bestHour = i; }
    const maxH = Math.max(...hourData, 1);
    let html = `<h3><i class="fas fa-clock"></i> Ora më e mirë e shitjes</h3>
        <div class="panel-360-grid"><div class="panel-360-card"><div class="p360-value">${bestHour}:00</div><div class="p360-label">Ora më e mirë</div></div>
        <div class="panel-360-card"><div class="p360-value">${hourData[bestHour]} ден</div><div class="p360-label">Qarkullim</div></div></div>
        <h4>Shitjet sipas orës</h4><div style="display:flex;gap:2px;align-items:flex-end;height:120px;overflow-x:auto;">`;
    for (let i = 6; i <= 22; i++) { const h = Math.round((hourData[i] / maxH) * 100); html += `<div style="flex:1;text-align:center;min-width:30px;"><div style="background:${i === bestHour ? 'var(--success)' : 'var(--primary)'};height:${h}px;border-radius:4px 4px 0 0;"></div><small style="font-size:0.65rem;">${i}h</small></div>`; }
    html += '</div>';
    openModal(html);
}

// ADV-6: Sales Season Analysis
function showSalesSeason() {
    const monthNames = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
    const monthData = new Array(12).fill(0); const monthProfit = new Array(12).fill(0); const monthCount = new Array(12).fill(0);
    state.sales.forEach(s => { if (s.date) { const m = parseInt(s.date.split('-')[1]) - 1; monthData[m] += s.sellTotal; monthProfit[m] += s.profit; monthCount[m]++; } });
    let bestMonth = 0;
    for (let i = 1; i < 12; i++) { if (monthData[i] > monthData[bestMonth]) bestMonth = i; }
    const maxM = Math.max(...monthData, 1);
    let html = `<h3><i class="fas fa-calendar-alt"></i> Sezoni i Shitjeve</h3>
        <div class="panel-360-grid"><div class="panel-360-card"><div class="p360-value">${monthNames[bestMonth]}</div><div class="p360-label">Muaji më i mirë</div></div>
        <div class="panel-360-card"><div class="p360-value">${monthData[bestMonth]} ден</div><div class="p360-label">Qarkullim</div></div></div>
        <div style="display:flex;gap:4px;align-items:flex-end;height:120px;margin-top:10px;">`;
    monthNames.forEach((name, i) => { const h = Math.round((monthData[i] / maxM) * 100); html += `<div style="flex:1;text-align:center;"><div style="background:${i === bestMonth ? 'var(--success)' : 'var(--primary)'};height:${h}px;border-radius:4px 4px 0 0;"></div><small style="font-size:0.6rem;">${name}</small></div>`; });
    html += '</div>';
    html += '<h4 style="margin-top:15px;">Detaje</h4><div class="table-container"><table class="data-table"><thead><tr><th>Muaji</th><th>Shitje</th><th>Qarkullim</th><th>Fitimi</th></tr></thead><tbody>';
    monthNames.forEach((name, i) => { if (monthCount[i] > 0) html += `<tr><td>${name}</td><td>${monthCount[i]}</td><td>${monthData[i]} ден</td><td style="color:var(--success)">${monthProfit[i]} ден</td></tr>`; });
    html += '</tbody></table></div>';
    openModal(html);
}

// ADV-7: Client Map
function showClientMap() {
    const zones = {};
    state.clients.forEach(c => { const zone = c.city || c.zone || c.address || 'Pa vendndodhje'; if (!zones[zone]) zones[zone] = { count: 0, debt: 0, revenue: 0 }; zones[zone].count++; zones[zone].debt += (c.debt || 0); zones[zone].revenue += state.sales.filter(s => s.clientId === c.id).reduce((s, x) => s + x.sellTotal, 0); });
    const sortedZones = Object.entries(zones).sort((a, b) => b[1].revenue - a[1].revenue);
    let html = '<h3><i class="fas fa-map-marker-alt"></i> Harta e Klientëve</h3><div class="table-container"><table class="data-table"><thead><tr><th>Zona</th><th>Klientë</th><th>Qarkullim</th><th>Borxh</th></tr></thead><tbody>';
    sortedZones.forEach(([zone, data]) => { html += `<tr><td><i class="fas fa-map-pin" style="color:var(--primary)"></i> ${zone}</td><td>${data.count}</td><td>${data.revenue} ден</td><td style="color:${data.debt > 0 ? 'var(--danger)' : ''}">${data.debt} ден</td></tr>`; });
    html += '</tbody></table></div>';
    openModal(html);
}

// ADV-8: WhatsApp Templates
function showWhatsAppTemplates(phone, clientName) {
    const templates = [
        { name: 'Kujtesë borxhi', icon: 'fa-money-bill', msg: `Përshëndetje ${clientName}, ju kujtojmë që keni borxh të papaguar. Faleminderit!` },
        { name: 'Porosi gati', icon: 'fa-check-circle', msg: `Përshëndetje ${clientName}, porosia juaj është gati për dorëzim!` },
        { name: 'Faleminderit', icon: 'fa-heart', msg: `Faleminderit ${clientName} për blerjen! Ju mirëpresim përsëri!` },
        { name: 'Ofertë speciale', icon: 'fa-tag', msg: `Përshëndetje ${clientName}! Kemi ofertë speciale. Na kontaktoni!` },
        { name: 'Kujtesë fature', icon: 'fa-file-invoice', msg: `Përshëndetje ${clientName}, fatura juaj po afrohet afatit. Ju lutem bëni pagesën.` },
        { name: 'Produkt i ri', icon: 'fa-box', msg: `Përshëndetje ${clientName}! Kemi arritur produkte të reja. Na vizitoni!` },
    ];
    let html = '<h3><i class="fab fa-whatsapp" style="color:#25D366"></i> Shabllone WhatsApp</h3><div style="display:grid;gap:10px;">';
    templates.forEach(t => {
        const encodedMsg = encodeURIComponent(t.msg);
        html += `<div style="background:var(--bg);border-radius:10px;padding:12px;border:1px solid var(--border);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><strong><i class="fas ${t.icon}"></i> ${t.name}</strong><button class="btn btn-sm" style="background:#25D366;color:white;" onclick="window.open('https://wa.me/${(phone||'').replace(/[^0-9]/g,'')}?text=${encodedMsg}','_blank');closeModal();"><i class="fab fa-whatsapp"></i> Dërgo</button></div><p style="font-size:0.85rem;color:var(--text-secondary);margin:0;">${t.msg}</p></div>`;
    });
    html += '</div>';
    openModal(html);
}

// ADV-9: Stock Count (Physical Inventory)
function openStockCountModal() {
    let html = '<h3><i class="fas fa-clipboard-check"></i> Inventar Fizik</h3><p style="color:var(--text-secondary)">Fut sasinë reale të stokut</p>';
    html += '<div class="table-container"><table class="data-table"><thead><tr><th>Produkti</th><th>Sistemi</th><th>Real</th><th>Diferenca</th></tr></thead><tbody>';
    PRODUCTS.forEach(p => { const sysQty = state.stock[p.id] || 0; html += `<tr><td>${p.name}</td><td>${sysQty}</td><td><input type="number" id="count-${p.id}" value="${sysQty}" min="0" style="width:70px;padding:4px;border:1px solid var(--border);border-radius:4px;" oninput="updateCountDiff('${p.id}', ${sysQty}, this.value)"></td><td id="diff-${p.id}" style="font-weight:700">0</td></tr>`; });
    html += '</tbody></table></div>';
    html += '<div style="margin-top:15px;display:flex;gap:10px;"><button class="btn btn-primary" onclick="applyStockCount()"><i class="fas fa-check"></i> Apliko</button><button class="btn btn-secondary" onclick="closeModal()">Anulo</button></div>';
    openModal(html);
}

function updateCountDiff(productId, sysQty, realQty) {
    const diff = parseInt(realQty) - sysQty;
    const el = document.getElementById('diff-' + productId);
    if (el) { el.textContent = (diff > 0 ? '+' : '') + diff; el.style.color = diff === 0 ? 'var(--text)' : diff > 0 ? 'var(--success)' : 'var(--danger)'; }
}

function applyStockCount() {
    let changes = 0;
    PRODUCTS.forEach(p => { const input = document.getElementById('count-' + p.id); if (input) { const newQty = parseInt(input.value) || 0; if (newQty !== (state.stock[p.id] || 0)) { state.stock[p.id] = newQty; changes++; } } });
    saveState(); refreshAll(); closeModal();
    showToast(`Inventari u përditësua! ${changes} ndryshime`);
}

// ADV-10: Multiple Suppliers
function openSuppliersModal() {
    if (!state.suppliers) state.suppliers = [{ id: 'faton', name: 'Faton', phone: '', balance: 0 }];
    let html = '<h3><i class="fas fa-truck"></i> Furnitorët</h3><div class="table-container"><table class="data-table"><thead><tr><th>Emri</th><th>Telefoni</th><th>Borxhi</th><th>Veprime</th></tr></thead><tbody>';
    state.suppliers.forEach(s => { html += `<tr><td>${s.name}</td><td>${s.phone || '-'}</td><td style="color:var(--danger)">${s.balance || 0} ден</td><td><button class="btn btn-sm btn-secondary" onclick="editSupplier('${s.id}')"><i class="fas fa-edit"></i></button></td></tr>`; });
    html += '</tbody></table></div><button class="btn btn-primary" style="margin-top:10px;" onclick="addNewSupplier()"><i class="fas fa-plus"></i> Shto furnitor</button>';
    openModal(html);
}

function addNewSupplier() {
    const name = prompt('Emri i furnitorit:'); if (!name) return;
    const phone = prompt('Telefoni (opsional):') || '';
    if (!state.suppliers) state.suppliers = [{ id: 'faton', name: 'Faton', phone: '', balance: 0 }];
    state.suppliers.push({ id: 'sup_' + Date.now(), name, phone, balance: 0 });
    saveState(); openSuppliersModal(); showToast('Furnitori u shtua!');
}

function editSupplier(id) {
    if (!state.suppliers) return;
    const sup = state.suppliers.find(s => s.id === id); if (!sup) return;
    const name = prompt('Emri:', sup.name); if (name) sup.name = name;
    const phone = prompt('Telefoni:', sup.phone); if (phone !== null) sup.phone = phone;
    saveState(); openSuppliersModal();
}

// ADV-11: Barcode/QR Scanner
function openBarcodeScanner() {
    let html = `<h3><i class="fas fa-barcode"></i> Skaner Barkod/QR</h3><div style="margin-bottom:10px;"><input type="text" id="barcode-input" placeholder="Fut barkodin..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:1rem;"></div>
        <button class="btn btn-primary" onclick="searchBarcode()"><i class="fas fa-search"></i> Kërko</button><div id="barcode-result" style="margin-top:15px;"></div>
        <hr style="margin:15px 0;"><h4>Barkodët</h4><div class="table-container"><table class="data-table"><thead><tr><th>Produkti</th><th>ID</th><th>QR</th></tr></thead><tbody>`;
    PRODUCTS.forEach(p => { html += `<tr><td>${p.name}</td><td>${p.id}</td><td><button class="btn btn-sm btn-info" onclick="showProductQR('${p.id}')"><i class="fas fa-qrcode"></i></button></td></tr>`; });
    html += '</tbody></table></div>';
    openModal(html);
}

function searchBarcode() {
    const code = document.getElementById('barcode-input').value.trim(); if (!code) return;
    const product = PRODUCTS.find(p => p.id === code || p.name.toLowerCase().includes(code.toLowerCase()));
    const resultDiv = document.getElementById('barcode-result');
    if (product) { const stock = state.stock[product.id] || 0; resultDiv.innerHTML = `<div class="panel-360-card" style="text-align:left;padding:15px;"><strong>${product.name}</strong><br>Stoku: ${stock} | Blerje: ${product.buyPrice} ден | Shitje: ${product.sellPrice} ден</div>`; }
    else resultDiv.innerHTML = '<p style="color:var(--danger)">Nuk u gjet!</p>';
}

function showProductQR(productId) {
    const product = getProduct(productId); if (!product) return;
    let html = `<h3>${product.name} - QR</h3><div id="product-qr-container" style="text-align:center;padding:20px;"></div>`;
    openModal(html);
    setTimeout(() => { const c = document.getElementById('product-qr-container'); if (c && typeof QRCode !== 'undefined') new QRCode(c, { text: JSON.stringify({ id: product.id, name: product.name, price: product.sellPrice }), width: 200, height: 200 }); }, 100);
}

// ADV-12: Offers & Promotions
function openPromotionsModal() {
    if (!state.promotions) state.promotions = [];
    const today = new Date().toISOString().split('T')[0];
    const active = state.promotions.filter(p => (!p.endDate || p.endDate >= today) && (!p.startDate || p.startDate <= today));
    let html = '<h3><i class="fas fa-tag"></i> Oferta & Promocione</h3>';
    if (active.length > 0) { html += '<h4 style="color:var(--success)">Aktive</h4>'; active.forEach(p => { html += `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid var(--success);"><strong>${p.name}</strong> - ${p.discount}% zbritje<br><small>${p.productId ? (getProduct(p.productId)||{}).name || 'Të gjitha' : 'Të gjitha'} | Deri: ${p.endDate || 'Pa limit'}</small><button class="btn btn-sm btn-danger" style="float:right" onclick="deletePromotion('${p.id}')"><i class="fas fa-trash"></i></button></div>`; }); }
    html += `<h4 style="margin-top:15px;">Shto ofertë</h4><div style="display:grid;gap:8px;">
        <input type="text" id="promo-name" placeholder="Emri" style="padding:8px;border:1px solid var(--border);border-radius:6px;">
        <select id="promo-product" style="padding:8px;border:1px solid var(--border);border-radius:6px;"><option value="">Të gjitha</option>${PRODUCTS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
        <input type="number" id="promo-discount" placeholder="Zbritja (%)" min="1" max="99" style="padding:8px;border:1px solid var(--border);border-radius:6px;">
        <div style="display:flex;gap:8px;"><input type="date" id="promo-start" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;"><input type="date" id="promo-end" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;"></div>
        <button class="btn btn-success" onclick="addPromotion()"><i class="fas fa-plus"></i> Shto</button></div>`;
    openModal(html);
}

function addPromotion() {
    const name = document.getElementById('promo-name').value; const discount = parseInt(document.getElementById('promo-discount').value);
    if (!name || !discount) { showToast('Plotëso emrin dhe zbritjen!'); return; }
    if (!state.promotions) state.promotions = [];
    state.promotions.push({ id: 'promo_' + Date.now(), name, discount, productId: document.getElementById('promo-product').value || null, startDate: document.getElementById('promo-start').value || null, endDate: document.getElementById('promo-end').value || null });
    saveState(); showToast('Oferta u shtua!'); openPromotionsModal();
}

function deletePromotion(id) { if (!state.promotions) return; state.promotions = state.promotions.filter(p => p.id !== id); saveState(); openPromotionsModal(); }

function getActiveDiscount(productId) {
    if (!state.promotions) return 0;
    const today = new Date().toISOString().split('T')[0];
    const promo = state.promotions.find(p => (!p.endDate || p.endDate >= today) && (!p.startDate || p.startDate <= today) && (!p.productId || p.productId === productId));
    return promo ? promo.discount : 0;
}

// ADV-13: Auto-Order when stock is low
function checkAutoOrders() {
    if (!state.autoOrderThreshold) state.autoOrderThreshold = 3;
    const lowProducts = PRODUCTS.filter(p => (state.stock[p.id] || 0) < state.autoOrderThreshold);
    if (lowProducts.length === 0) { showToast('Stoku OK, nuk nevojiten porosi'); return; }
    let html = `<h3><i class="fas fa-magic"></i> Porosi Automatike</h3><p>Produkte me stok nën ${state.autoOrderThreshold}:</p>`;
    html += '<div class="table-container"><table class="data-table"><thead><tr><th>Produkti</th><th>Stoku</th><th>Porosi</th><th>Veprim</th></tr></thead><tbody>';
    lowProducts.forEach(p => { const stock = state.stock[p.id] || 0; html += `<tr><td>${p.name}</td><td style="color:var(--danger)">${stock}</td><td><input type="number" id="auto-order-${p.id}" value="${10 - stock}" min="1" style="width:60px;padding:4px;border:1px solid var(--border);border-radius:4px;"></td><td><button class="btn btn-sm btn-success" onclick="createAutoOrder('${p.id}')"><i class="fas fa-check"></i></button></td></tr>`; });
    html += '</tbody></table></div><button class="btn btn-primary" style="margin-top:10px;" onclick="createAllAutoOrders()"><i class="fas fa-cart-plus"></i> Porosit të gjitha</button>';
    openModal(html);
}

function createAutoOrder(productId) {
    const input = document.getElementById('auto-order-' + productId);
    const qty = parseInt(input ? input.value : 5) || 5;
    const product = getProduct(productId);
    state.orders.push({ id: 'ord_' + Date.now(), date: new Date().toISOString().split('T')[0], productId, quantity: qty, status: 'pending', note: 'Auto-porosi' });
    saveState(); showToast(`Porosi: ${product.name} x${qty}`);
}

function createAllAutoOrders() {
    PRODUCTS.forEach(p => { if ((state.stock[p.id] || 0) < (state.autoOrderThreshold || 3)) createAutoOrder(p.id); });
    closeModal(); refreshAll();
}

// ADV-14: Profit by Client
function showProfitByClient() {
    const clientStats = state.clients.map(c => {
        const sales = state.sales.filter(s => s.clientId === c.id);
        return { ...c, totalProfit: sales.reduce((s, x) => s + x.profit, 0), totalRevenue: sales.reduce((s, x) => s + x.sellTotal, 0), salesCount: sales.length, avgOrder: sales.length > 0 ? Math.round(sales.reduce((s, x) => s + x.sellTotal, 0) / sales.length) : 0 };
    }).filter(c => c.salesCount > 0).sort((a, b) => b.totalProfit - a.totalProfit);
    let html = '<h3><i class="fas fa-users"></i> Fitimi sipas Klientit</h3><div class="table-container"><table class="data-table"><thead><tr><th>#</th><th>Klienti</th><th>Shitje</th><th>Qarkullim</th><th>Fitimi</th><th>Mesatare</th></tr></thead><tbody>';
    clientStats.forEach((c, i) => { const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1); html += `<tr onclick="openClient360('${c.id}')" style="cursor:pointer"><td>${medal}</td><td>${c.name}</td><td>${c.salesCount}</td><td>${c.totalRevenue} ден</td><td style="color:var(--success);font-weight:700">${c.totalProfit} ден</td><td>${c.avgOrder} ден</td></tr>`; });
    html += '</tbody></table></div>';
    openModal(html);
}

// ADV-15: Beautiful Monthly PDF Report
function generateMonthlyPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const monthName = now.toLocaleString('sq', { month: 'long', year: 'numeric' });

    const monthSales = state.sales.filter(s => s.date && s.date.startsWith(month));
    const totalRevenue = monthSales.reduce((s, x) => s + x.sellTotal, 0);
    const totalProfit = monthSales.reduce((s, x) => s + x.profit, 0);
    const totalCost = monthSales.reduce((s, x) => s + x.buyTotal, 0);
    const fatonDebt = calcTotalOwedToFaton();
    const clientDebt = state.clients.reduce((s, c) => s + (c.debt || 0), 0);
    const ownerShare = calcOwnerShare(totalProfit);
    const partnerShare = calcPartnerShare(totalProfit);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('Hurma App', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Raport Mujor - ' + monthName, 105, 30, { align: 'center' });
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Summary
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let y = 45;
    const addRow = (label, value, color) => {
        doc.setTextColor(100, 100, 100);
        doc.text(label, 25, y);
        const c = color || [0, 0, 0];
        doc.setTextColor(c[0], c[1], c[2]);
        doc.text(String(value), 140, y, { align: 'right' });
        y += 8;
    };

    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Permbledhje', 25, y); y += 10;
    doc.setFontSize(10);

    addRow('Shitje totale:', monthSales.length + ' shitje');
    addRow('Qarkullim:', totalRevenue + ' den');
    addRow('Kosto:', totalCost + ' den');
    addRow('Fitimi:', totalProfit + ' den', [46, 204, 113]);
    addRow('Elez (' + state.profitSplit.owner + '%):', ownerShare + ' den', [52, 152, 219]);
    addRow(state.partnerName + ' (' + state.profitSplit.partner + '%):', partnerShare + ' den', [52, 152, 219]);

    y += 5;
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Borxhet', 25, y); y += 10;
    doc.setFontSize(10);
    addRow('Borxhi Fatoni:', fatonDebt + ' den', [231, 76, 60]);
    addRow('Borxhi klientesh:', clientDebt + ' den', [231, 76, 60]);

    // Product table
    y += 5;
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Shitjet sipas produktit', 25, y); y += 5;

    const productRows = PRODUCTS.map(p => {
        const pSales = monthSales.filter(s => s.productId === p.id);
        return [p.name, pSales.reduce((s,x) => s + x.quantity, 0) + '', pSales.reduce((s,x) => s + x.sellTotal, 0) + ' den', pSales.reduce((s,x) => s + x.profit, 0) + ' den'];
    });

    doc.autoTable({
        startY: y,
        head: [['Produkti', 'Sasia', 'Qarkullim', 'Fitimi']],
        body: productRows,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        margin: { left: 25, right: 25 }
    });

    // Stock status
    y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text('Gjendja e stokut', 25, y); y += 5;

    const stockRows = PRODUCTS.map(p => [p.name, (state.stock[p.id] || 0) + ' cope']);
    doc.autoTable({
        startY: y,
        head: [['Produkti', 'Sasia']],
        body: stockRows,
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] },
        margin: { left: 25, right: 25 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Gjeneruar nga Hurma App - ' + new Date().toLocaleDateString('sq'), 105, 290, { align: 'center' });
    }

    doc.save('hurma-raport-' + month + '.pdf');
    showToast('Raporti PDF u shkarkua!');
}

// ADV-16: Yearly Comparison
function showYearlyComparison() {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    const thisYearSales = state.sales.filter(s => s.date && s.date.startsWith(thisYear + ''));
    const lastYearSales = state.sales.filter(s => s.date && s.date.startsWith(lastYear + ''));

    const thisRevenue = thisYearSales.reduce((s, x) => s + x.sellTotal, 0);
    const lastRevenue = lastYearSales.reduce((s, x) => s + x.sellTotal, 0);
    const thisProfit = thisYearSales.reduce((s, x) => s + x.profit, 0);
    const lastProfit = lastYearSales.reduce((s, x) => s + x.profit, 0);

    const revChange = lastRevenue > 0 ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100) : 0;
    const profChange = lastProfit > 0 ? Math.round(((thisProfit - lastProfit) / lastProfit) * 100) : 0;

    let html = `<h3><i class="fas fa-chart-line"></i> Krahasim Vjetor: ${thisYear} vs ${lastYear}</h3>`;
    html += '<div class="panel-360-grid">';
    html += `<div class="panel-360-card"><div class="p360-value">${thisYearSales.length}</div><div class="p360-label">Shitje ${thisYear}</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value">${lastYearSales.length}</div><div class="p360-label">Shitje ${lastYear}</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value">${thisRevenue} ден</div><div class="p360-label">Qarkullim ${thisYear}</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value">${lastRevenue} ден</div><div class="p360-label">Qarkullim ${lastYear}</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value" style="color:var(--success)">${thisProfit} ден</div><div class="p360-label">Fitim ${thisYear}</div></div>`;
    html += `<div class="panel-360-card"><div class="p360-value" style="color:var(--success)">${lastProfit} ден</div><div class="p360-label">Fitim ${lastYear}</div></div>`;
    html += '</div>';

    html += `<div style="text-align:center;margin:15px 0;">
        <span class="month-compare ${revChange >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${revChange >= 0 ? 'up' : 'down'}"></i> Qarkullim: ${revChange > 0 ? '+' : ''}${revChange}%</span>
        &nbsp;&nbsp;
        <span class="month-compare ${profChange >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${profChange >= 0 ? 'up' : 'down'}"></i> Fitim: ${profChange > 0 ? '+' : ''}${profChange}%</span>
    </div>`;

    // Monthly breakdown
    const monthNames = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
    html += '<h4>Krahasim mujor</h4><div class="table-container"><table class="data-table"><thead><tr><th>Muaji</th><th>' + thisYear + '</th><th>' + lastYear + '</th><th>Ndryshim</th></tr></thead><tbody>';

    for (let m = 0; m < 12; m++) {
        const mm = String(m + 1).padStart(2, '0');
        const thisM = thisYearSales.filter(s => s.date && s.date.substring(5, 7) === mm).reduce((s, x) => s + x.sellTotal, 0);
        const lastM = lastYearSales.filter(s => s.date && s.date.substring(5, 7) === mm).reduce((s, x) => s + x.sellTotal, 0);
        const change = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0;
        html += `<tr><td>${monthNames[m]}</td><td>${thisM} ден</td><td>${lastM} ден</td>
            <td><span class="month-compare ${change >= 0 ? 'up' : 'down'}">${change > 0 ? '+' : ''}${change}%</span></td></tr>`;
    }
    html += '</tbody></table></div>';
    openModal(html);
}

// ADV-17: Customizable Dashboard
function openDashboardSettings() {
    if (!state.dashboardWidgets) {
        state.dashboardWidgets = {
            todayProfit: true, todaySales: true, yourShare: true, partnerShare: true,
            miniatures: true, suggestions: true, quickActions: true,
            profitChart: true, salesByProduct: true, weeklyComparison: true
        };
    }
    const w = state.dashboardWidgets;

    let html = '<h3><i class="fas fa-th-large"></i> Personalizo Dashboard-in</h3>';
    html += '<p style="color:var(--text-secondary)">Zgjidh çfarë do të shfaqet në Dashboard</p>';
    html += '<div style="display:grid;gap:8px;">';

    const widgets = [
        { key: 'todayProfit', label: 'Fitimi i sotëm', icon: 'fa-money-bill-wave' },
        { key: 'todaySales', label: 'Shitjet e sotme', icon: 'fa-shopping-cart' },
        { key: 'yourShare', label: 'Pjesa jote (Elez)', icon: 'fa-user' },
        { key: 'partnerShare', label: 'Pjesa e Orhanit', icon: 'fa-users' },
        { key: 'miniatures', label: 'Përmbledhje nga tabet', icon: 'fa-th-large' },
        { key: 'suggestions', label: 'Sugjerime smart', icon: 'fa-lightbulb' },
        { key: 'quickActions', label: 'Butona të shpejtë', icon: 'fa-bolt' },
        { key: 'profitChart', label: 'Grafiku i fitimit', icon: 'fa-chart-line' },
        { key: 'salesByProduct', label: 'Shitjet sipas produktit', icon: 'fa-chart-pie' },
        { key: 'weeklyComparison', label: 'Krahasim javor', icon: 'fa-calendar-week' },
    ];

    widgets.forEach(wg => {
        html += `<label style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg);border-radius:8px;cursor:pointer;">
            <input type="checkbox" ${w[wg.key] ? 'checked' : ''} onchange="toggleDashWidget('${wg.key}', this.checked)">
            <i class="fas ${wg.icon}" style="width:20px;color:var(--primary)"></i>
            <span>${wg.label}</span>
        </label>`;
    });
    html += '</div>';
    html += '<button class="btn btn-primary" style="margin-top:15px;width:100%;" onclick="closeModal();refreshDashboard();"><i class="fas fa-check"></i> Ruaj</button>';
    openModal(html);
}

function toggleDashWidget(key, enabled) {
    if (!state.dashboardWidgets) state.dashboardWidgets = {};
    state.dashboardWidgets[key] = enabled;
    saveState();
}

// ADV-18: Auto Weekly WhatsApp Report
function generateWeeklyWhatsAppReport() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStart = weekAgo.toISOString().split('T')[0];
    const weekEnd = now.toISOString().split('T')[0];

    const weekSales = state.sales.filter(s => s.date >= weekStart && s.date <= weekEnd);
    const revenue = weekSales.reduce((s, x) => s + x.sellTotal, 0);
    const profit = weekSales.reduce((s, x) => s + x.profit, 0);
    const ownerShare = calcOwnerShare(profit);
    const partnerShare = calcPartnerShare(profit);
    const fatonDebt = calcTotalOwedToFaton();
    const clientDebt = state.clients.reduce((s, c) => s + (c.debt || 0), 0);

    const msg = `📊 *RAPORT JAVOR*
📅 ${weekStart} - ${weekEnd}

🛒 Shitje: ${weekSales.length}
💰 Qarkullim: ${revenue} ден
✅ Fitimi: ${profit} ден

👤 Elez (${state.profitSplit.owner}%): ${ownerShare} ден
👥 ${state.partnerName} (${state.profitSplit.partner}%): ${partnerShare} ден

⚠️ Borxh Fatoni: ${fatonDebt} ден
⚠️ Borxh klientësh: ${clientDebt} ден

📦 Stoku: ${PRODUCTS.map(p => p.name + ': ' + (state.stock[p.id] || 0)).join(', ')}

🌴 _Hurma App_`;

    const encoded = encodeURIComponent(msg);

    let html = `<h3><i class="fab fa-whatsapp" style="color:#25D366"></i> Raport Javor WhatsApp</h3>`;
    html += `<pre style="background:var(--bg);padding:15px;border-radius:10px;white-space:pre-wrap;font-size:0.85rem;">${msg}</pre>`;
    html += `<div style="display:flex;gap:10px;margin-top:15px;">
        <button class="btn" style="background:#25D366;color:white;flex:1;" onclick="window.open('https://wa.me/?text=${encoded}','_blank')"><i class="fab fa-whatsapp"></i> Dërgo në WhatsApp</button>
        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(\`${msg.replace(/`/g, '\\`')}\`);showToast('U kopjua!')"><i class="fas fa-copy"></i> Kopjo</button>
    </div>`;
    openModal(html);
}

// ADV-19: Email Notification Reminder (generates email draft)
function generateEmailReminder(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const overdue = state.sales.filter(s => s.clientId === clientId && s.paymentType === 'invoice_60' && !s.invoicePaid && s.dueDate && s.dueDate < new Date().toISOString().split('T')[0]);
    const totalOverdue = overdue.reduce((s, x) => s + x.sellTotal, 0);

    const subject = encodeURIComponent(`Kujtesë pagese - ${client.name}`);
    const body = encodeURIComponent(`I/E nderuar ${client.name},

Ju njoftojmë që keni fatura të papaguara me vlerë totale ${totalOverdue || client.debt || 0} ден.

Ju lutem bëni pagesën sa më shpejt.

Fatura të vonuara: ${overdue.length}
Vlera totale: ${totalOverdue || client.debt || 0} ден

Me respekt,
Hurma App`);

    window.open(`mailto:${client.email || ''}?subject=${subject}&body=${body}`);
    showToast('Draft email u hap!');
}

// ADV-20: Reports Hub - Central access to all reports
function openReportsHub() {
    let html = '<h3><i class="fas fa-chart-bar"></i> Qendra e Raporteve</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">';

    const reports = [
        { name: 'Raport Ditor', icon: 'fa-calendar-day', color: '#3498db', action: 'generateDailyReport()' },
        { name: 'Raport Mujor PDF', icon: 'fa-file-pdf', color: '#e74c3c', action: 'generateMonthlyPDF()' },
        { name: 'Raport Javor WhatsApp', icon: 'fa-whatsapp', color: '#25D366', action: 'generateWeeklyWhatsAppReport()' },
        { name: 'Krahasim Vjetor', icon: 'fa-chart-line', color: '#9b59b6', action: 'showYearlyComparison()' },
        { name: 'Parashikim Shitjesh', icon: 'fa-crystal-ball', color: '#f39c12', action: 'showSalesPrediction()' },
        { name: 'Produktet Fitimprurëse', icon: 'fa-trophy', color: '#e67e22', action: 'showProfitableProducts()' },
        { name: 'Ora e Shitjes', icon: 'fa-clock', color: '#1abc9c', action: 'showBestSalesHour()' },
        { name: 'Sezoni i Shitjeve', icon: 'fa-calendar-alt', color: '#2ecc71', action: 'showSalesSeason()' },
        { name: 'Harta Klientëve', icon: 'fa-map-marker-alt', color: '#e74c3c', action: 'showClientMap()' },
        { name: 'Fitimi sipas Klientit', icon: 'fa-users', color: '#3498db', action: 'showProfitByClient()' },
        { name: 'Timeline Globale', icon: 'fa-stream', color: '#8e44ad', action: 'openGlobalTimeline()' },
        { name: 'Eksport Total', icon: 'fa-download', color: '#2c3e50', action: 'masterExport()' },
        { name: 'Inventar Fizik', icon: 'fa-clipboard-check', color: '#16a085', action: 'openStockCountModal()' },
        { name: 'Porosi Automatike', icon: 'fa-magic', color: '#d35400', action: 'checkAutoOrders()' },
        { name: 'Oferta & Promocione', icon: 'fa-tag', color: '#c0392b', action: 'openPromotionsModal()' },
        { name: 'Furnitorët', icon: 'fa-truck', color: '#7f8c8d', action: 'openSuppliersModal()' },
    ];

    reports.forEach(r => {
        html += `<div onclick="${r.action};closeModal();" style="background:var(--bg);border-radius:12px;padding:16px;text-align:center;cursor:pointer;border:2px solid transparent;transition:all 0.2s;"
            onmouseover="this.style.borderColor='${r.color}';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.borderColor='transparent';this.style.transform='none'">
            <i class="fas ${r.icon}" style="font-size:1.8rem;color:${r.color};display:block;margin-bottom:8px;"></i>
            <strong style="font-size:0.85rem;">${r.name}</strong>
        </div>`;
    });
    html += '</div>';
    openModal(html);
}

// FIX-8: Live Profit Tracker in Header
function updateLiveProfitTracker() {
    let tracker = document.getElementById('live-profit-tracker');
    if (!tracker) {
        tracker = document.createElement('div');
        tracker.id = 'live-profit-tracker';
        tracker.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:700;padding:4px 10px;background:rgba(46,204,113,0.1);border-radius:15px;color:var(--success);cursor:pointer;';
        tracker.title = 'Fitimi i sotëm';
        tracker.onclick = function() { generateDailyReport(); };
        const topbarRight = document.querySelector('.topbar-right');
        if (topbarRight) topbarRight.insertBefore(tracker, topbarRight.firstChild);
    }
    const today = new Date().toISOString().split('T')[0];
    const todayProfit = state.sales.filter(s => s.date === today).reduce((sum, s) => sum + s.profit, 0);
    tracker.innerHTML = '<i class="fas fa-coins"></i> ' + todayProfit + ' ден';
}

// FIX-9: Client of the Day
function getClientOfDay() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date === today && s.clientId);
    const clientTotals = {};
    todaySales.forEach(s => { clientTotals[s.clientId] = (clientTotals[s.clientId] || 0) + s.sellTotal; });
    const bestClientId = Object.keys(clientTotals).sort((a, b) => clientTotals[b] - clientTotals[a])[0];
    if (!bestClientId) return null;
    const client = state.clients.find(c => c.id === bestClientId);
    return client ? { name: client.name, total: clientTotals[bestClientId], id: bestClientId } : null;
}

function showClientOfDay() {
    const cod = getClientOfDay();
    if (!cod) { showToast('Asnjë klient sot'); return; }
    openModal(`<div style="text-align:center;padding:20px;"><i class="fas fa-crown" style="font-size:3rem;color:#f1c40f;"></i><h2 style="margin:10px 0;">Klienti i Ditës</h2><h3 style="color:var(--primary);">${cod.name}</h3><p style="font-size:1.5rem;font-weight:700;">${cod.total} ден</p><button class="btn btn-primary" onclick="openClient360('${cod.id}');closeModal();"><i class="fas fa-user"></i> Shiko profilin</button></div>`);
}

// FIX-10: Comparison Chart
function showComparisonChart() {
    const last7 = []; const now = new Date();
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; last7.push({ date: dateStr.slice(5), sales: state.sales.filter(s => s.date === dateStr).reduce((s, x) => s + x.sellTotal, 0), fatonPay: (state.fatonPayments || []).filter(p => p.date === dateStr).reduce((s, p) => s + p.amount, 0), clientPay: (state.clientPayments || []).filter(p => p.date === dateStr).reduce((s, p) => s + p.amount, 0) }); }
    const maxVal = Math.max(...last7.map(d => Math.max(d.sales, d.fatonPay, d.clientPay)), 1);
    let html = '<h3><i class="fas fa-chart-bar"></i> Krahasim: Shitje vs Pagesa</h3><div style="display:flex;gap:6px;margin-bottom:10px;font-size:0.8rem;"><span><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:2px;"></span> Shitje</span><span><span style="display:inline-block;width:12px;height:12px;background:var(--primary);border-radius:2px;"></span> Fatoni</span><span><span style="display:inline-block;width:12px;height:12px;background:var(--warning);border-radius:2px;"></span> Klientë</span></div>';
    html += '<div style="display:flex;gap:8px;align-items:flex-end;height:150px;">';
    last7.forEach(d => { const sh = Math.round((d.sales / maxVal) * 130); const fh = Math.round((d.fatonPay / maxVal) * 130); const ch = Math.round((d.clientPay / maxVal) * 130); html += `<div style="flex:1;text-align:center;"><div style="display:flex;gap:2px;align-items:flex-end;justify-content:center;height:130px;"><div style="width:8px;background:var(--success);height:${sh}px;border-radius:2px 2px 0 0;"></div><div style="width:8px;background:var(--primary);height:${fh}px;border-radius:2px 2px 0 0;"></div><div style="width:8px;background:var(--warning);height:${ch}px;border-radius:2px 2px 0 0;"></div></div><small style="font-size:0.65rem;">${d.date}</small></div>`; });
    html += '</div>'; openModal(html);
}

// FIX-11: Auto evening backup
function checkEveningBackup() { const now = new Date(); const hour = now.getHours(); const today = now.toISOString().split('T')[0]; const last = localStorage.getItem('hurma-last-auto-backup'); if (hour >= 20 && last !== today && state.sales.length > 0) { localStorage.setItem('hurma-last-auto-backup', today); autoBackupJSON(); } }

// FIX-12: Stock alerts
function checkStockAlerts() { const empty = PRODUCTS.filter(p => (state.stock[p.id] || 0) === 0); const low = PRODUCTS.filter(p => { const s = state.stock[p.id] || 0; return s > 0 && s < 3; }); if (empty.length > 0) showToast('STOK 0: ' + empty.map(p => p.name).join(', ')); if (low.length > 0) setTimeout(() => showToast('Stok i ulët: ' + low.map(p => p.name + '(' + (state.stock[p.id]||0) + ')').join(', ')), 2000); }

// FIX-13: Live calculation in sale modal
function addLiveCalculation() {
    const qtyEl = document.getElementById('sale-quantity'); const discEl = document.getElementById('sale-discount'); const prodEl = document.getElementById('sale-product'); const customEl = document.getElementById('sale-custom-price');
    if (!qtyEl || !prodEl) return;
    let calcDiv = document.getElementById('sale-live-calc');
    if (!calcDiv) { calcDiv = document.createElement('div'); calcDiv.id = 'sale-live-calc'; calcDiv.style.cssText = 'background:var(--bg);padding:12px;border-radius:10px;margin:10px 0;text-align:center;'; const btn = document.querySelector('#modal-body .btn-primary'); if (btn) btn.parentNode.insertBefore(calcDiv, btn); }
    function calc() { const product = getProduct(prodEl.value); if (!product) return; const qty = parseInt(qtyEl.value) || 0; const disc = parseFloat(discEl.value) || 0; const cp = customEl ? parseFloat(customEl.value) : 0; const price = cp > 0 ? cp : product.sellPrice; const total = Math.round(price * qty * (1 - disc / 100)); const cost = product.buyPrice * qty; const profit = total - cost; const os = typeof calcOwnerShare === 'function' ? calcOwnerShare(profit) : Math.round(profit * 0.5); const ps = profit - os; const ap = typeof getActiveDiscount === 'function' ? getActiveDiscount(prodEl.value) : 0; calcDiv.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;"><div><small style="color:var(--text-secondary)">Totali</small><br><strong>${total} ден</strong></div><div><small style="color:var(--text-secondary)">Fitimi</small><br><strong style="color:var(--success)">${profit} ден</strong></div><div><small style="color:var(--text-secondary)">Stoku</small><br><strong style="color:${(state.stock[prodEl.value]||0) - qty < 3 ? 'var(--danger)' : ''}">${(state.stock[prodEl.value] || 0) - qty}</strong></div></div><div style="margin-top:6px;font-size:0.8rem;color:var(--text-secondary);">Elez: ${os} ден | ${state.partnerName || 'Orhan'}: ${ps} ден</div>${ap > 0 ? '<div style="color:var(--warning);font-size:0.8rem;margin-top:4px;"><i class="fas fa-tag"></i> Ofertë: -' + ap + '%</div>' : ''}`; }
    [qtyEl, discEl, prodEl, customEl].forEach(el => { if (el) el.addEventListener('input', calc); });
    if (prodEl) prodEl.addEventListener('change', calc); calc();
}

// FIX-14: Enhanced toast
function showDetailedToast(message, type, duration) { const toast = document.createElement('div'); toast.className = 'toast ' + (type || 'success'); toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`; const c = document.getElementById('toast-container'); if (c) { c.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration || 3000); } }

// FIX-15: Global date filter sync
function applyGlobalDateFilterToSales() { if (!window._globalDateFilter) return; const f = window._globalDateFilter; const sf = document.getElementById('sales-date-from'); const st = document.getElementById('sales-date-to'); if (sf && f.from) sf.value = f.from; if (st && f.to) st.value = f.to; }

// Feature 19: Init all cross-tab features
function initCrossTabFeatures() {
    initGlobalQuickActions();
    enhanceKeyboardShortcuts();
    updateTabBadges();
    updateSyncStatusBar();
    refreshRecentActivityBar();
    refreshDashboardMiniatures();
    showSmartSuggestions();
    updateLiveProfitTracker();
    checkStockAlerts();
    checkEveningBackup();
    // Start periodic updates
    setInterval(() => {
        updateTabBadges();
        updateSyncStatusBar();
        refreshRecentActivityBar();
    }, 30000); // Every 30 seconds
}

// Feature 20: Enhanced refreshAll to include cross-tab features
const _originalRefreshAll = typeof refreshAll === 'function' ? refreshAll : null;
function refreshAllWithCrossTabs() {
    if (_originalRefreshAll) _originalRefreshAll();
    try {
        updateTabBadges();
        updateSyncStatusBar();
        refreshRecentActivityBar();
        refreshDashboardMiniatures();
        showSmartSuggestions();
    } catch(e) { console.log('Cross-tab refresh error:', e); }
}

// ===================== DESIGN FEATURES =====================

// Feature 16: Confetti animation on payment
function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 2 + 's';
        piece.style.animationDuration = (2 + Math.random() * 2) + 's';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = (6 + Math.random() * 8) + 'px';
        container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
}

// Feature 17: Debt progress bar
function renderDebtProgressBar(containerId, paid, total) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (total <= 0) { container.innerHTML = ''; return; }
    const pct = Math.min(100, Math.round((paid / total) * 100));
    let color;
    if (pct >= 80) color = '#27ae60';
    else if (pct >= 50) color = '#f39c12';
    else if (pct >= 25) color = '#e67e22';
    else color = '#e74c3c';
    container.innerHTML = '<div class="debt-progress-container"><div class="debt-progress-bar" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:0.78em;color:var(--text-secondary);"><span>Paguar: ' + paid + ' den</span><span>' + pct + '% e borxhit</span><span>Total: ' + total + ' den</span></div>';
}

// Feature 20: Animated icons for high debt
function updateDebtIcons() {
    const debt = calcFatonDebt();
    const icons = document.querySelectorAll('#page-faton .stat-card i');
    icons.forEach(icon => {
        if (debt > 30000) icon.classList.add('pulse-icon');
        else icon.classList.remove('pulse-icon');
    });
}

// Feature 22: Badge on sidebar
function updateFatonBadge() {
    const debt = calcFatonDebt();
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();
    const total = debt + profitRemaining;
    let badge = document.getElementById('faton-nav-badge');
    const navItem = document.querySelector('.nav-item[data-page="faton"]');
    if (!navItem) return;
    navItem.style.position = 'relative';
    if (total > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'faton-nav-badge';
            badge.className = 'nav-badge';
            navItem.appendChild(badge);
        }
        badge.textContent = total > 99999 ? Math.round(total / 1000) + 'k' : total;
    } else if (badge) {
        badge.remove();
    }
}

// Feature 25: Sticky header for balance
function makeFatonHeaderSticky() {
    const netBalance = document.getElementById('faton-net-balance');
    if (netBalance && !netBalance.classList.contains('faton-sticky-header')) {
        netBalance.classList.add('faton-sticky-header');
    }
}

// Feature 26: Floating action button
function initFatonFAB() {
    if (document.getElementById('faton-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'faton-fab';
    fab.className = 'fab-container';
    fab.style.display = 'none';
    fab.innerHTML = '<div class="fab-menu" id="fab-menu">' +
        '<div class="fab-menu-item" onclick="quickPayLastAmount()"><i class="fas fa-bolt"></i> Pagese e shpejte</div>' +
        '<div class="fab-menu-item" onclick="openFatonPaymentModal()"><i class="fas fa-plus"></i> Shto pagese</div>' +
        '<div class="fab-menu-item" onclick="openSplitPaymentModal()"><i class="fas fa-divide"></i> Pagese split</div>' +
        '<div class="fab-menu-item" onclick="showReceiptHistory()"><i class="fas fa-receipt"></i> Faturat</div>' +
        '</div>' +
        '<button class="fab-button" onclick="toggleFABMenu()"><i class="fas fa-plus"></i></button>';
    document.body.appendChild(fab);
}

function toggleFABMenu() {
    const fab = document.getElementById('faton-fab');
    if (!fab) return;
    const menu = fab.querySelector('.fab-menu');
    const btn = fab.querySelector('.fab-button');
    if (menu) {
        menu.classList.toggle('active');
        if (btn) btn.innerHTML = menu.classList.contains('active') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-plus"></i>';
    }
}

function showFatonFAB(show) {
    const fab = document.getElementById('faton-fab');
    if (fab) fab.style.display = show ? 'block' : 'none';
    // Hide global FAB when faton FAB is shown, and vice versa
    const globalFab = document.getElementById('global-fab');
    if (globalFab) globalFab.style.display = show ? 'none' : 'block';
}

// Feature 29: "PAGUAR" stamp when debt is 0
function showPaidStamp() {
    const debt = calcFatonDebt();
    const profitRemaining = calcFatonProfitOwed() - calcFatonProfitCollected();
    const netBalance = document.getElementById('faton-net-balance');
    if (!netBalance) return;
    let stamp = document.getElementById('paid-stamp');
    if (debt + profitRemaining <= 0) {
        if (!stamp) {
            stamp = document.createElement('div');
            stamp.id = 'paid-stamp';
            stamp.className = 'paid-stamp';
            stamp.textContent = 'PAGUAR';
            netBalance.style.position = 'relative';
            netBalance.appendChild(stamp);
        }
    } else if (stamp) {
        stamp.remove();
    }
}

// Feature 30: Circle progress SVG
function renderCircleProgress(containerId, percentage, label) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const pct = Math.min(100, Math.max(0, percentage));
    const offset = 283 - (283 * pct / 100);
    let color;
    if (pct >= 80) color = '#27ae60';
    else if (pct >= 50) color = '#f39c12';
    else color = '#e74c3c';
    container.innerHTML = '<div class="circle-progress">' +
        '<svg width="90" height="90" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="45" fill="none" stroke="#eee" stroke-width="8"/>' +
        '<circle cx="50" cy="50" r="45" fill="none" stroke="' + color + '" stroke-width="8" stroke-dasharray="283" stroke-dashoffset="' + offset + '" stroke-linecap="round" style="transition:stroke-dashoffset 1s ease;"/>' +
        '</svg>' +
        '<div class="circle-text">' + pct + '%</div>' +
        '</div>' +
        '<div style="text-align:center;font-size:0.75em;color:var(--text-secondary);margin-top:4px;">' + label + '</div>';
}

// Feature 28: Dynamic colors based on time of day
function applyTimeBasedTheme() {
    const hour = new Date().getHours();
    const fatonPage = document.getElementById('page-faton');
    if (!fatonPage) return;
    if (hour >= 20 || hour < 6) {
        fatonPage.style.setProperty('--faton-tint', 'rgba(44, 62, 80, 0.03)');
    } else if (hour >= 6 && hour < 12) {
        fatonPage.style.setProperty('--faton-tint', 'rgba(241, 196, 15, 0.02)');
    } else {
        fatonPage.style.setProperty('--faton-tint', 'rgba(52, 152, 219, 0.02)');
    }
}

// Feature 27: Stepper HTML generator for modals
function generateStepper(steps, currentStep) {
    let html = '<div class="stepper">';
    steps.forEach((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        html += '<div class="stepper-step" style="position:relative;">';
        html += '<div class="stepper-circle ' + (isCompleted ? 'completed' : isActive ? 'active' : '') + '">';
        html += isCompleted ? '<i class="fas fa-check"></i>' : (i + 1);
        html += '</div></div>';
        if (i < steps.length - 1) {
            html += '<div class="stepper-line ' + (isCompleted ? 'completed' : '') + '"></div>';
        }
    });
    html += '</div>';
    return html;
}

// Initialize design features for Faton page
function initFatonDesignFeatures() {
    initFatonFAB();
    updateDebtIcons();
    updateFatonBadge();
    makeFatonHeaderSticky();
    showPaidStamp();
    applyTimeBasedTheme();

    // Render progress bar
    const totalPurchased = (state.fatonPurchases || []).reduce((s, p) => s + p.total, 0);
    const totalPaid = state.fatonPayments.reduce((s, p) => s + p.amount, 0);
    const deducted = (state.fatonProfitCollections || []).filter(c => c.type === 'deduct_from_debt' || c.type === 'combination').reduce((s, c) => s + (c.deductAmount || 0), 0);
    renderDebtProgressBar('faton-progress-bar', totalPaid + deducted, totalPurchased);

    // Render circle progress
    const pctPaid = totalPurchased > 0 ? Math.round(((totalPaid + deducted) / totalPurchased) * 100) : 100;
    renderCircleProgress('faton-circle-progress', pctPaid, 'Paguar');
}

// ===================== FEATURES 1-10 (New) =====================

// FEATURE 1: Top 5 produktet e javës
function showTopWeekProducts() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEnd = now.toISOString().split('T')[0];

    const weekSales = state.sales.filter(s => s.date >= weekStartStr && s.date <= weekEnd);

    const productStats = {};
    weekSales.forEach(s => {
        if (!productStats[s.productId]) {
            productStats[s.productId] = { qty: 0, revenue: 0, profit: 0 };
        }
        productStats[s.productId].qty += s.quantity;
        productStats[s.productId].revenue += s.sellTotal;
        productStats[s.productId].profit += s.profit;
    });

    const sorted = Object.keys(productStats)
        .map(id => { const p = getProduct(id); return p ? { id, name: p.name, ...productStats[id] } : null; })
        .filter(x => x !== null)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    let html = `<h3><i class="fas fa-trophy"></i> Top 5 Produktet e Javës</h3>`;
    html += `<p style="color:var(--text-secondary);font-size:0.85rem;">${weekStartStr} — ${weekEnd}</p>`;

    if (sorted.length === 0) {
        html += '<p style="text-align:center;color:var(--text-secondary);">Asnjë shitje këtë javë.</p>';
    } else {
        const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>#</th><th>Produkti</th><th>Sasia</th><th>Qarkullim</th><th>Fitimi</th></tr></thead><tbody>';
        sorted.forEach((p, i) => {
            html += `<tr>
                <td style="font-size:1.2rem;">${medals[i]}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.qty}</td>
                <td>${p.revenue} ден</td>
                <td style="color:var(--success);font-weight:700;">${p.profit} ден</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }
    openModal(html);
}

// FEATURE 2: Grafik fitimi Elez vs Orhan (6 muajt e fundit)
function showPartnerProfitChart() {
    const now = new Date();
    const months = [];
    const elezData = [];
    const orhanData = [];
    const monthNames = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const mSales = state.sales.filter(s => s.date && s.date.startsWith(key));
        const profit = mSales.reduce((sum, s) => sum + s.profit, 0);
        const elezShare = calcOwnerShare(profit);
        const orhanShare = calcPartnerShare(profit);
        months.push(monthNames[d.getMonth()]);
        elezData.push(elezShare);
        orhanData.push(orhanShare);
    }

    const canvasId = 'partner-profit-chart-' + Date.now();
    let html = `<h3><i class="fas fa-chart-bar"></i> Fitimi Elez vs ${state.partnerName} (6 muajt e fundit)</h3>`;
    html += `<canvas id="${canvasId}" height="250"></canvas>`;
    html += `<div style="display:flex;gap:20px;justify-content:center;margin-top:10px;font-size:0.85rem;">
        <span><span style="display:inline-block;width:14px;height:14px;background:#3498db;border-radius:3px;margin-right:4px;"></span>Elez</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#e74c3c;border-radius:3px;margin-right:4px;"></span>${state.partnerName}</span>
    </div>`;

    openModal(html);

    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (typeof Chart === 'undefined') {
            canvas.parentElement.innerHTML += '<p style="color:var(--danger);text-align:center;">Chart.js nuk është i ngarkuar.</p>';
            return;
        }
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Elez', data: elezData, backgroundColor: 'rgba(52,152,219,0.8)', borderRadius: 4 },
                    { label: state.partnerName, data: orhanData, backgroundColor: 'rgba(231,76,60,0.8)', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => v + ' ден' } }
                }
            }
        });
    }, 100);
}

// FEATURE 3: Klientët "të fjetur" (30+ ditë pa blerë)
function showSleepingClients() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - 30);
    const thresholdStr = threshold.toISOString().split('T')[0];

    const sleeping = state.clients.map(c => {
        const clientSales = state.sales.filter(s => s.clientId === c.id);
        if (clientSales.length === 0) return null;
        const lastSale = clientSales.reduce((a, b) => a.date > b.date ? a : b);
        if (lastSale.date >= thresholdStr) return null;
        const totalBought = clientSales.reduce((s, x) => s + x.sellTotal, 0);
        const daysSince = Math.floor((new Date(today) - new Date(lastSale.date)) / (1000 * 60 * 60 * 24));
        return { ...c, lastDate: lastSale.date, totalBought, daysSince };
    }).filter(Boolean).sort((a, b) => b.daysSince - a.daysSince);

    let html = `<h3><i class="fas fa-bed"></i> Klientët e Fjetur (30+ ditë)</h3>`;

    if (sleeping.length === 0) {
        html += '<p style="text-align:center;color:var(--success);"><i class="fas fa-check-circle"></i> Të gjithë klientët janë aktivë!</p>';
    } else {
        html += `<p style="color:var(--text-secondary);font-size:0.85rem;">${sleeping.length} klientë nuk kanë blerë prej 30+ ditësh</p>`;
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>Klienti</th><th>Ditë pa blerë</th><th>Blerja e fundit</th><th>Total blerë</th><th>Kujtesë</th></tr></thead><tbody>';
        sleeping.forEach(c => {
            const waMsg = encodeURIComponent(`Pershendetje ${c.name}! Kemi produkte te reja Hurma. A keni nevoje per ndonje porosi?`);
            const waLink = `https://wa.me/${(c.phone || '').replace(/\D/g, '')}?text=${waMsg}`;
            html += `<tr>
                <td><strong>${c.name}</strong></td>
                <td style="color:var(--danger);font-weight:700;">${c.daysSince} ditë</td>
                <td>${c.lastDate}</td>
                <td>${c.totalBought} ден</td>
                <td>${c.phone ? `<a href="${waLink}" target="_blank" class="btn btn-sm" style="background:#25D366;color:white;"><i class="fab fa-whatsapp"></i></a>` : '-'}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }
    openModal(html);
}

// FEATURE 4: Totali ditor i pagesave
function getTodayPaymentsTotal() {
    const today = new Date().toISOString().split('T')[0];
    const clientPay = (state.clientPayments || []).filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
    const fatonPay = (state.fatonPayments || []).filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
    return clientPay + fatonPay;
}

function showTodayPaymentsSummary() {
    const today = new Date().toISOString().split('T')[0];
    const clientPayments = (state.clientPayments || []).filter(p => p.date === today);
    const fatonPayments = (state.fatonPayments || []).filter(p => p.date === today);

    const totalClient = clientPayments.reduce((s, p) => s + p.amount, 0);
    const totalFaton = fatonPayments.reduce((s, p) => s + p.amount, 0);
    const grandTotal = totalClient + totalFaton;

    let html = `<h3><i class="fas fa-hand-holding-usd"></i> Pagesat e Sotme (${today})</h3>`;
    html += `<div class="panel-360-grid" style="margin-bottom:15px;">
        <div class="panel-360-card"><div class="p360-value" style="color:var(--success)">${grandTotal} ден</div><div class="p360-label">Total sot</div></div>
        <div class="panel-360-card"><div class="p360-value">${totalClient} ден</div><div class="p360-label">Nga klientët</div></div>
        <div class="panel-360-card"><div class="p360-value">${totalFaton} ден</div><div class="p360-label">Nga Fatoni</div></div>
    </div>`;

    if (clientPayments.length > 0) {
        html += '<h4><i class="fas fa-users"></i> Pagesat e klientëve</h4>';
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>Klienti</th><th>Shuma</th><th>Shënim</th></tr></thead><tbody>';
        clientPayments.forEach(p => {
            const client = state.clients.find(c => c.id === p.clientId);
            html += `<tr><td>${client ? client.name : p.clientId}</td><td style="color:var(--success);font-weight:700;">${p.amount} ден</td><td>${p.note || '-'}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }

    if (fatonPayments.length > 0) {
        html += '<h4><i class="fas fa-truck"></i> Pagesat ndaj Fatoni</h4>';
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>Shuma</th><th>Shënim</th></tr></thead><tbody>';
        fatonPayments.forEach(p => {
            html += `<tr><td style="color:var(--primary);font-weight:700;">${p.amount} ден</td><td>${p.note || '-'}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }

    if (clientPayments.length === 0 && fatonPayments.length === 0) {
        html += '<p style="text-align:center;color:var(--text-secondary);">Asnjë pagesë e regjistruar sot.</p>';
    }

    openModal(html);
}

// FEATURE 5: Duplikimi i shitjes
function duplicateSale(saleIndex) {
    const sale = state.sales[saleIndex];
    if (!sale) { showToast('Shitja nuk u gjet!', 'error'); return; }

    // Build the same modal as openSaleModal but with pre-filled values from the duplicated sale
    let html = `
        <h3><i class="fas fa-copy"></i> Kopjo Shitjen</h3>
        <div class="form-group">
            <label>${t('product')}:</label>
            <select id="sale-product">
                ${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === sale.productId ? 'selected' : ''}>${p.name} (blerje: ${p.buyPrice}, shitje: ${p.sellPrice})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('quantity')}:</label>
            <input type="number" id="sale-quantity" min="1" value="${sale.quantity}">
        </div>
        <div class="form-group">
            <label>${t('discount')} (%):</label>
            <input type="number" id="sale-discount" min="0" max="100" value="${sale.discount || 0}">
        </div>
        <div class="form-group">
            <label>Custom Sell Price (opsionale):</label>
            <input type="number" id="sale-custom-price" min="0" placeholder="Lër bosh për çmim standard" value="${sale.customPrice || ''}">
        </div>
        <div class="form-group">
            <label>${t('client')} (${t('optional')}):</label>
            <select id="sale-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}" ${c.id === sale.clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Data:</label>
            <input type="date" id="sale-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>Mënyra e pagesës:</label>
            <select id="sale-payment-type">
                <option value="cash" ${(sale.paymentType || 'cash') === 'cash' ? 'selected' : ''}>Cash</option>
                <option value="invoice_60" ${sale.paymentType === 'invoice_60' ? 'selected' : ''}>Faturë 60 ditë</option>
            </select>
        </div>
        <div class="form-group">
            <label>Lokacioni:</label>
            <input type="text" id="sale-location" value="${sale.location || ''}">
        </div>
        <button class="btn btn-success" onclick="confirmDuplicateSale()" style="width:100%;margin-top:10px;">
            <i class="fas fa-save"></i> Shto Shitjen e Re
        </button>`;
    openModal(html);
    setTimeout(() => { try { addLiveCalculation(); } catch(e) {} }, 100);
}

function confirmDuplicateSale() {
    const productId = document.getElementById('sale-product').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value) || 1;
    const discount = parseFloat(document.getElementById('sale-discount').value) || 0;
    const customPrice = parseFloat(document.getElementById('sale-custom-price').value) || 0;
    const clientId = document.getElementById('sale-client').value;
    const date = document.getElementById('sale-date').value || new Date().toISOString().split('T')[0];
    const paymentType = document.getElementById('sale-payment-type').value;
    const location = document.getElementById('sale-location').value;

    const product = getProduct(productId);
    if (!product) { showToast('Produkti nuk u gjet!', 'error'); return; }

    const price = customPrice > 0 ? customPrice : product.sellPrice;
    const sellTotal = Math.round(price * quantity * (1 - discount / 100));
    const buyTotal = product.buyPrice * quantity;
    const profit = sellTotal - buyTotal;

    const newSale = {
        id: 'sale_' + Date.now(),
        date, productId, quantity, discount, customPrice: customPrice || null,
        sellTotal, buyTotal, profit, clientId: clientId || null,
        paymentType: paymentType || 'cash', location: location || null
    };

    if (newSale.paymentType === 'invoice_60') {
        const due = new Date(date);
        due.setDate(due.getDate() + 60);
        newSale.dueDate = due.toISOString().split('T')[0];
        newSale.invoicePaid = false;
    }

    state.sales.push(newSale);
    if (state.stock[productId] !== undefined) state.stock[productId] = Math.max(0, (state.stock[productId] || 0) - quantity);
    logActivity('Sale Added (Copy)', `${quantity}x ${product.name} - ${sellTotal} ден`);
    saveState();
    closeModal();
    refreshAll();
    showToast('Shitja u kopjua dhe u shtua!', 'success');
}

// FEATURE 6: Shitje të shpejta (Quick sales) — butonë në Dashboard
function showQuickSaleButtons() {
    const productCounts = {};
    state.sales.forEach(s => {
        productCounts[s.productId] = (productCounts[s.productId] || 0) + s.quantity;
    });

    const top3 = PRODUCTS
        .map(p => ({ ...p, sold: productCounts[p.id] || 0 }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 3);

    if (top3.length === 0) return '<p style="color:var(--text-secondary);">Asnjë shitje ende.</p>';

    let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    top3.forEach(p => {
        html += `<button class="btn btn-primary" style="flex:1;min-width:100px;" onclick="openQuickSaleForProduct('${p.id}')">
            <i class="fas fa-bolt"></i><br>
            <strong>${p.name}</strong><br>
            <small>${p.sellPrice} ден</small>
        </button>`;
    });
    html += '</div>';
    return html;
}

function openQuickSaleForProduct(productId) {
    const product = getProduct(productId);
    if (!product) return;

    let html = `
        <h3><i class="fas fa-bolt"></i> Shitje e Shpejtë — ${product.name}</h3>
        <input type="hidden" id="sale-product" value="${productId}">
        <div class="form-group">
            <label>Sasia:</label>
            <input type="number" id="sale-quantity" min="1" value="1" style="font-size:1.5rem;text-align:center;">
        </div>
        <div class="form-group">
            <label>${t('client')} (${t('optional')}):</label>
            <select id="sale-client">
                <option value="">-- ${t('select_client')} --</option>
                ${state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('discount')} (%):</label>
            <input type="number" id="sale-discount" min="0" max="100" value="0">
        </div>
        <input type="hidden" id="sale-custom-price" value="">
        <input type="hidden" id="sale-date" value="${new Date().toISOString().split('T')[0]}">
        <input type="hidden" id="sale-payment-type" value="cash">
        <input type="hidden" id="sale-location" value="">
        <div style="background:var(--bg);padding:12px;border-radius:10px;text-align:center;margin:10px 0;">
            <strong>Çmimi: ${product.sellPrice} ден/njësi</strong><br>
            <small style="color:var(--text-secondary);">Stoku: ${state.stock[productId] || 0}</small>
        </div>
        <button class="btn btn-success" onclick="confirmDuplicateSale()" style="width:100%;margin-top:10px;font-size:1.1rem;">
            <i class="fas fa-check"></i> Shto Shitjen
        </button>`;

    openModal(html);
}

// FEATURE 7: Target ditor
function openDailyTargetModal() {
    if (!state.dailyTarget) state.dailyTarget = 0;
    const progress = getDailyTargetProgress();

    let html = `<h3><i class="fas fa-bullseye"></i> Target Ditor i Fitimit</h3>`;

    if (progress.target > 0) {
        const barColor = progress.percent >= 100 ? 'var(--success)' : progress.percent >= 60 ? 'var(--warning)' : 'var(--danger)';
        html += `<div style="margin-bottom:15px;background:var(--bg);padding:15px;border-radius:10px;text-align:center;">
            <div style="font-size:1.4rem;font-weight:700;color:${barColor}">${progress.current} / ${progress.target} ден</div>
            <div style="background:#eee;border-radius:10px;height:12px;margin:8px 0;overflow:hidden;">
                <div style="height:100%;width:${Math.min(100, progress.percent)}%;background:${barColor};border-radius:10px;transition:width 0.5s;"></div>
            </div>
            <small style="color:var(--text-secondary);">${progress.percent}% e targetit</small>
        </div>`;
    }

    html += `<div class="form-group">
        <label>Vendos target të ri (ден):</label>
        <input type="number" id="daily-target-input" min="0" value="${state.dailyTarget || ''}" placeholder="p.sh. 5000">
    </div>
    <button class="btn btn-primary" onclick="saveDailyTarget()" style="width:100%;">
        <i class="fas fa-save"></i> Ruaj Targetin
    </button>
    ${progress.target > 0 ? `<button class="btn btn-secondary" onclick="state.dailyTarget=0;saveState();closeModal();showToast('Targeti u fshi');" style="width:100%;margin-top:8px;"><i class="fas fa-times"></i> Fshi Targetin</button>` : ''}`;

    openModal(html);
}

function saveDailyTarget() {
    const val = parseInt(document.getElementById('daily-target-input').value) || 0;
    state.dailyTarget = val;
    saveState();
    closeModal();
    showToast(val > 0 ? `Targeti u vendos: ${val} ден` : 'Targeti u fshi', 'success');
}

function getDailyTargetProgress() {
    if (!state.dailyTarget) state.dailyTarget = 0;
    const today = new Date().toISOString().split('T')[0];
    const current = state.sales.filter(s => s.date === today).reduce((sum, s) => sum + s.profit, 0);
    const target = state.dailyTarget;
    const percent = target > 0 ? Math.round((current / target) * 100) : 0;
    return { target, current, percent };
}

// FEATURE 8: Krahasim javor (kjo javë vs java e kaluar)
function showWeeklyComparison() {
    const now = new Date();
    const dayOfWeek = now.getDay();

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek);
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

    const thisWeekSales = state.sales.filter(s => s.date >= thisWeekStartStr && s.date <= todayStr);
    const lastWeekSales = state.sales.filter(s => s.date >= lastWeekStartStr && s.date <= lastWeekEndStr);

    const thisRevenue = thisWeekSales.reduce((s, x) => s + x.sellTotal, 0);
    const lastRevenue = lastWeekSales.reduce((s, x) => s + x.sellTotal, 0);
    const thisProfit = thisWeekSales.reduce((s, x) => s + x.profit, 0);
    const lastProfit = lastWeekSales.reduce((s, x) => s + x.profit, 0);

    const thisPayments = (state.clientPayments || []).filter(p => p.date >= thisWeekStartStr && p.date <= todayStr).reduce((s, p) => s + p.amount, 0);
    const lastPayments = (state.clientPayments || []).filter(p => p.date >= lastWeekStartStr && p.date <= lastWeekEndStr).reduce((s, p) => s + p.amount, 0);

    function pctChange(curr, prev) {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    }
    function arrowHtml(curr, prev) {
        const pct = pctChange(curr, prev);
        const up = pct >= 0;
        return `<span class="month-compare ${up ? 'up' : 'down'}" style="font-size:0.9rem;">
            <i class="fas fa-arrow-${up ? 'up' : 'down'}"></i> ${pct > 0 ? '+' : ''}${pct}%
        </span>`;
    }

    let html = `<h3><i class="fas fa-calendar-week"></i> Krahasim Javor</h3>`;
    html += `<p style="color:var(--text-secondary);font-size:0.8rem;">Kjo javë: ${thisWeekStartStr} — ${todayStr} &nbsp;|&nbsp; Java e kaluar: ${lastWeekStartStr} — ${lastWeekEndStr}</p>`;

    const rows = [
        { label: 'Shitje (#)', thisVal: thisWeekSales.length, lastVal: lastWeekSales.length },
        { label: 'Qarkullim', thisVal: thisRevenue, lastVal: lastRevenue, unit: ' ден' },
        { label: 'Fitimi', thisVal: thisProfit, lastVal: lastProfit, unit: ' ден' },
        { label: 'Pagesa klientësh', thisVal: thisPayments, lastVal: lastPayments, unit: ' ден' },
    ];

    html += '<div class="table-container"><table class="data-table"><thead><tr><th>Metrika</th><th>Kjo javë</th><th>Java e kaluar</th><th>Ndryshim</th></tr></thead><tbody>';
    rows.forEach(r => {
        html += `<tr>
            <td><strong>${r.label}</strong></td>
            <td style="color:var(--success);font-weight:700;">${r.thisVal}${r.unit || ''}</td>
            <td>${r.lastVal}${r.unit || ''}</td>
            <td>${arrowHtml(r.thisVal, r.lastVal)}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    openModal(html);
}

// FEATURE 9: Nota për klient
function openClientNotesModal(clientId) {
    if (!state.clientNotes) state.clientNotes = [];
    const client = state.clients.find(c => c.id === clientId);
    if (!client) { showToast('Klienti nuk u gjet!', 'error'); return; }

    const notes = state.clientNotes.filter(n => n.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));

    let html = `<h3><i class="fas fa-sticky-note"></i> Notat për ${client.name}</h3>`;
    html += `<div class="form-group" style="display:flex;gap:8px;">
        <textarea id="client-note-text" placeholder="Shkruaj një shënim..." rows="2" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;resize:none;"></textarea>
        <button class="btn btn-primary" onclick="addClientNote('${clientId}')" style="align-self:flex-end;"><i class="fas fa-plus"></i> Shto</button>
    </div>`;

    if (notes.length === 0) {
        html += '<p style="text-align:center;color:var(--text-secondary);">Asnjë shënim ende.</p>';
    } else {
        html += '<div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';
        notes.forEach(n => {
            html += `<div style="background:var(--bg);padding:10px 12px;border-radius:8px;border-left:3px solid var(--primary);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <small style="color:var(--text-secondary);">${n.date}</small>
                    <button class="btn btn-sm btn-danger" onclick="deleteClientNote('${n.id}','${clientId}')" style="padding:2px 6px;"><i class="fas fa-trash"></i></button>
                </div>
                <div>${n.text}</div>
            </div>`;
        });
        html += '</div>';
    }
    openModal(html);
}

function addClientNote(clientId) {
    const text = (document.getElementById('client-note-text').value || '').trim();
    if (!text) { showToast('Shkruaj një shënim!', 'error'); return; }
    if (!state.clientNotes) state.clientNotes = [];
    state.clientNotes.push({
        id: 'note_' + Date.now(),
        clientId,
        text,
        date: new Date().toISOString().split('T')[0]
    });
    saveState();
    openClientNotesModal(clientId);
    showToast('Shënimi u shtua!', 'success');
}

function deleteClientNote(noteId, clientId) {
    if (!state.clientNotes) return;
    state.clientNotes = state.clientNotes.filter(n => n.id !== noteId);
    saveState();
    openClientNotesModal(clientId);
}

// FEATURE 10: Statistika të shpejta në sidebar
function updateSidebarStats() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date === today);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const totalClientDebt = state.clients.reduce((sum, c) => sum + (c.debt || 0), 0);

    // Today sales count badge
    let salesBadge = document.getElementById('sidebar-today-sales-badge');
    if (!salesBadge) {
        const navSales = document.querySelector('.nav-item[data-page="sales"]');
        if (navSales) {
            navSales.style.position = 'relative';
            salesBadge = document.createElement('span');
            salesBadge.id = 'sidebar-today-sales-badge';
            salesBadge.className = 'nav-badge';
            salesBadge.style.cssText = 'position:absolute;top:4px;right:4px;background:var(--primary);color:white;border-radius:50%;min-width:18px;height:18px;font-size:0.65rem;display:flex;align-items:center;justify-content:center;font-weight:700;';
            navSales.appendChild(salesBadge);
        }
    }
    if (salesBadge) salesBadge.textContent = todaySales.length;

    // Today profit badge
    let profitBadge = document.getElementById('sidebar-today-profit-badge');
    if (!profitBadge) {
        const navDash = document.querySelector('.nav-item[data-page="dashboard"]');
        if (navDash) {
            navDash.style.position = 'relative';
            profitBadge = document.createElement('span');
            profitBadge.id = 'sidebar-today-profit-badge';
            profitBadge.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:0.6rem;color:var(--success);font-weight:700;white-space:nowrap;';
            navDash.appendChild(profitBadge);
        }
    }
    if (profitBadge) profitBadge.textContent = todayProfit > 0 ? todayProfit + ' ден' : '';

    // Total debt badge on clients nav
    let debtBadge = document.getElementById('sidebar-debt-badge');
    if (!debtBadge) {
        const navClients = document.querySelector('.nav-item[data-page="clients"]');
        if (navClients) {
            navClients.style.position = 'relative';
            debtBadge = document.createElement('span');
            debtBadge.id = 'sidebar-debt-badge';
            debtBadge.className = 'nav-badge';
            debtBadge.style.cssText = 'position:absolute;top:4px;right:4px;background:var(--danger);color:white;border-radius:10px;padding:1px 5px;font-size:0.6rem;font-weight:700;white-space:nowrap;';
            navClients.appendChild(debtBadge);
        }
    }
    if (debtBadge) {
        if (totalClientDebt > 0) {
            debtBadge.textContent = totalClientDebt > 99999 ? Math.round(totalClientDebt / 1000) + 'k' : totalClientDebt;
            debtBadge.style.display = 'flex';
        } else {
            debtBadge.style.display = 'none';
        }
    }
}

// Patch loadState to initialize new state keys
(function patchLoadStateForNewFeatures() {
    const _origLoadState = loadState;
    loadState = function() {
        _origLoadState();
        if (!state.dailyTarget) state.dailyTarget = 0;
        if (!state.clientNotes) state.clientNotes = [];
    };
})();

// Patch refreshDashboard to call updateSidebarStats
(function patchRefreshDashboardForSidebar() {
    const _origRefreshDashboard = refreshDashboard;
    refreshDashboard = function() {
        _origRefreshDashboard.apply(this, arguments);
        try { updateSidebarStats(); } catch(e) {}
    };
})();

// ============================================================
// FEATURE 11: Kujtese automatike borxhi (Debt reminder badge)
// ============================================================
function checkDebtReminders() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    let count = 0;
    (state.clients || []).forEach(client => {
        if ((client.debt || 0) <= 0) return;
        // Find last payment date for this client
        const payments = (state.clientPayments || []).filter(p => p.clientId === client.id);
        let lastPaymentDate = null;
        if (payments.length > 0) {
            const sorted = payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            lastPaymentDate = new Date(sorted[0].date);
        }
        // Find last purchase date
        const sales = (state.sales || []).filter(s => s.clientId === client.id);
        let lastSaleDate = null;
        if (sales.length > 0) {
            const sorted = sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            lastSaleDate = new Date(sorted[0].date);
        }
        const lastActivity = lastPaymentDate && lastSaleDate
            ? (lastPaymentDate > lastSaleDate ? lastPaymentDate : lastSaleDate)
            : (lastPaymentDate || lastSaleDate);
        if (!lastActivity || lastActivity < thirtyDaysAgo) {
            count++;
        }
    });
    return count;
}

function showDebtRemindersModal() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const overdueClients = [];
    (state.clients || []).forEach(client => {
        if ((client.debt || 0) <= 0) return;
        const payments = (state.clientPayments || []).filter(p => p.clientId === client.id);
        let lastPaymentDate = null;
        if (payments.length > 0) {
            const sorted = payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            lastPaymentDate = new Date(sorted[0].date);
        }
        const sales = (state.sales || []).filter(s => s.clientId === client.id);
        let lastSaleDate = null;
        if (sales.length > 0) {
            const sorted = sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            lastSaleDate = new Date(sorted[0].date);
        }
        const lastActivity = lastPaymentDate && lastSaleDate
            ? (lastPaymentDate > lastSaleDate ? lastPaymentDate : lastSaleDate)
            : (lastPaymentDate || lastSaleDate);
        if (!lastActivity || lastActivity < thirtyDaysAgo) {
            const daysSince = lastActivity
                ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
                : null;
            overdueClients.push({ client, daysSince, lastActivity });
        }
    });

    overdueClients.sort((a, b) => (b.client.debt || 0) - (a.client.debt || 0));

    if (overdueClients.length === 0) {
        openModal('Kujtesa Borxhesh', '<p style="text-align:center;color:var(--success);padding:2rem;">Nuk ka borxhe me vonese mbi 30 dite.</p>');
        return;
    }

    let rows = overdueClients.map(({ client, daysSince, lastActivity }) => {
        const lastStr = lastActivity ? lastActivity.toISOString().split('T')[0] : 'Asnje';
        const daysStr = daysSince !== null ? daysSince + ' dite' : 'Asnje aktivitet';
        const phone = (client.phone || '').replace(/\s+/g, '');
        const msg = encodeURIComponent(`Pershendetje ${client.name}, deshironim t'ju kujtojme per borxhin prej ${client.debt} den. Ju lutem kontaktoni ne per rregullim. Faleminderit!`);
        const waLink = phone ? `<a href="https://wa.me/${phone}?text=${msg}" target="_blank" style="background:var(--success);color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;text-decoration:none;font-size:0.8rem;">WhatsApp</a>` : '<span style="color:#aaa;font-size:0.8rem;">Pa nr.</span>';
        return `<tr>
            <td style="padding:8px;font-weight:600;">${client.name}</td>
            <td style="padding:8px;color:var(--danger);font-weight:700;">${client.debt} den</td>
            <td style="padding:8px;color:#888;font-size:0.85rem;">${lastStr}</td>
            <td style="padding:8px;font-size:0.85rem;">${daysStr}</td>
            <td style="padding:8px;">${waLink}</td>
        </tr>`;
    }).join('');

    const html = `
        <p style="color:#888;margin-bottom:1rem;">Klientet me borxh pa aktivitet mbi 30 dite (${overdueClients.length} klient):</p>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead><tr style="background:var(--bg-secondary);">
                <th style="padding:8px;text-align:left;">Klienti</th>
                <th style="padding:8px;text-align:left;">Borxhi</th>
                <th style="padding:8px;text-align:left;">Aktiviteti i fundit</th>
                <th style="padding:8px;text-align:left;">Dite pa pagese</th>
                <th style="padding:8px;text-align:left;">Veprim</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        </div>`;
    openModal('Kujtesa Borxhesh - Vonese mbi 30 Dite', html);
}

// ============================================================
// FEATURE 12: Pagese e shpejte nga Dashboard
// ============================================================
function showQuickPaymentDashboard() {
    const clientsWithDebt = (state.clients || [])
        .filter(c => (c.debt || 0) > 0)
        .slice()
        .sort((a, b) => (b.debt || 0) - (a.debt || 0));

    if (clientsWithDebt.length === 0) {
        openModal('Pagese e Shpejte', '<p style="text-align:center;color:var(--success);padding:2rem;">Nuk ka klient me borxh aktiv.</p>');
        return;
    }

    const rows = clientsWithDebt.map(c => `
        <tr>
            <td style="padding:10px;font-weight:600;">${c.name}</td>
            <td style="padding:10px;color:var(--danger);font-weight:700;">${c.debt} den</td>
            <td style="padding:10px;">${c.phone || '-'}</td>
            <td style="padding:10px;">
                <button onclick="openQuickCollectModal('${c.id}')" style="background:var(--primary);color:white;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;">Merr Pagese</button>
            </td>
        </tr>`).join('');

    const totalDebt = clientsWithDebt.reduce((s, c) => s + (c.debt || 0), 0);

    const html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <span style="color:#888;">${clientsWithDebt.length} klient me borxh</span>
            <span style="font-weight:700;color:var(--danger);">Gjithsej: ${totalDebt} den</span>
        </div>
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead style="position:sticky;top:0;background:var(--bg-secondary);">
                <tr>
                    <th style="padding:8px;text-align:left;">Klienti</th>
                    <th style="padding:8px;text-align:left;">Borxhi</th>
                    <th style="padding:8px;text-align:left;">Telefoni</th>
                    <th style="padding:8px;text-align:left;">Veprim</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>`;
    openModal('Pagese e Shpejte - Dashboard', html);
}

// processQuickCollect - used by the first openQuickCollectModal
function processQuickCollect(clientId) {
    const amountEl = document.getElementById('quick-pay-amount');
    if (!amountEl) return;
    const amount = parseFloat(amountEl.value);
    if (!amount || amount <= 0) { showToast('Shuma duhet te jete me e madhe se 0', 'error'); return; }
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) return;
    if (amount > client.debt) { showToast('Shuma nuk mund te jete me e madhe se borxhi', 'error'); return; }

    if (!state.clientPayments) state.clientPayments = [];
    state.clientPayments.push({
        id: Date.now().toString(),
        clientId: client.id,
        amount,
        method: 'Cash',
        status: 'active',
        date: new Date().toISOString().split('T')[0],
        note: 'Pagese e shpejte nga dashboard'
    });
    client.debt = Math.max(0, (client.debt || 0) - amount);
    saveState();
    logActivity('payment', `Pagese e shpejte: ${client.name} pagoi ${amount} den. Borxh mbetur: ${client.debt} den`);
    showToast(`Pagesa e ${amount} den u regjistrua per ${client.name}!`, 'success');

    // Ask to send thank you
    const sendWa = client.phone ? `<br><br><button onclick="sendThankYouWhatsApp('${client.id}', ${amount})" style="background:var(--success);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-top:8px;">Dergo Faleminderit WhatsApp</button>` : '';
    openModal('Pagesa u Regjistrua', `<div style="text-align:center;padding:1rem;"><span style="font-size:2rem;">✓</span><p style="font-size:1.1rem;margin-top:0.5rem;">${client.name} pagoi <strong>${amount} den</strong>.</p><p>Borxh mbetur: <strong style="color:${client.debt>0?'var(--danger)':'var(--success)'};">${client.debt} den</strong></p>${sendWa}</div>`);
}

// ============================================================
// FEATURE 13: Historiku i borxhit per klient
// ============================================================
function showClientDebtHistory(clientId) {
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) return;

    const events = [];

    // Sales (add debt)
    (state.sales || []).filter(s => s.clientId === clientId).forEach(s => {
        const prod = getProduct(s.productId);
        events.push({
            date: s.date,
            type: 'shitje',
            label: `Shitje: ${prod ? prod.name : 'Produkt'} x${s.quantity || 1}`,
            amount: +(s.sellTotal || 0),
            delta: +(s.sellTotal || 0),
            icon: '🛒',
            color: 'var(--danger)'
        });
    });

    // Payments (reduce debt)
    (state.clientPayments || []).filter(p => p.clientId === clientId).forEach(p => {
        events.push({
            date: p.date,
            type: 'pagese',
            label: p.note || 'Pagese',
            amount: p.amount,
            delta: -p.amount,
            icon: '💰',
            color: 'var(--success)'
        });
    });

    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (events.length === 0) {
        openModal('Historiku i Borxhit - ' + client.name, '<p style="text-align:center;padding:2rem;color:#888;">Nuk ka aktivitet te regjistruar.</p>');
        return;
    }

    // Build running balance
    let running = 0;
    const timelineItems = events.map(ev => {
        running += ev.delta;
        const sign = ev.delta >= 0 ? '+' : '';
        return `
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;">
            <div style="min-width:36px;height:36px;border-radius:50%;background:${ev.color}22;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">${ev.icon}</div>
            <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:600;font-size:0.9rem;">${ev.label}</span>
                    <span style="font-weight:700;color:${ev.color};font-size:0.9rem;">${sign}${ev.delta} den</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:2px;">
                    <span style="font-size:0.78rem;color:#888;">${ev.date}</span>
                    <span style="font-size:0.78rem;color:#888;">Gjendje: <strong style="color:${running>0?'var(--danger)':'var(--success)'};">${running} den</strong></span>
                </div>
            </div>
        </div>
        <div style="border-left:2px dashed var(--border);margin-left:18px;height:8px;"></div>`;
    }).join('');

    const html = `
        <div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--bg-secondary);border-radius:10px;margin-bottom:1.2rem;">
            <span>Borxhi aktual:</span>
            <strong style="color:${(client.debt||0)>0?'var(--danger)':'var(--success)'};">${client.debt || 0} den</strong>
        </div>
        <div style="max-height:420px;overflow-y:auto;padding-right:4px;">
            ${timelineItems}
        </div>`;
    openModal('Historiku i Borxhit - ' + client.name, html);
}

// ============================================================
// FEATURE 14: WhatsApp raport ditor per Orhanin
// ============================================================
function sendDailyReportToOrhan() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = (state.sales || []).filter(s => s.date === today);
    const totalRevenue = todaySales.reduce((s, x) => s + (x.sellTotal || 0), 0);
    const totalProfit = todaySales.reduce((s, x) => s + (x.profit || 0), 0);
    const orhanShare = typeof calcPartnerShare === 'function' ? calcPartnerShare(totalProfit) : Math.round(totalProfit * 0.5);
    const paymentsToday = (state.clientPayments || []).filter(p => p.date === today);
    const totalPayments = paymentsToday.reduce((s, p) => s + (p.amount || 0), 0);

    // Stock alerts
    const lowStock = PRODUCTS.filter(p => (state.stock[p.id] || 0) < 10);
    const stockAlert = lowStock.length > 0
        ? `\n⚠️ Stok i ulet: ${lowStock.map(p => p.name + ' (' + (state.stock[p.id] || 0) + ')').join(', ')}`
        : '\n✅ Stoku eshte ne rregull';

    const msg = `📊 *Raporti Ditor - ${today}*\n\n` +
        `🛒 Shitje: ${todaySales.length}\n` +
        `💵 Te ardhura: ${totalRevenue} den\n` +
        `📈 Fitim total: ${totalProfit} den\n` +
        `💰 Pjesa jote (Orhan): ${orhanShare} den\n` +
        `✅ Pagesa te mbledhura: ${totalPayments} den` +
        stockAlert +
        `\n\nDerguar me: Hurma App 🌴`;

    const orhanPhone = (state.orhanPhone || '').replace(/\s+/g, '');
    if (!orhanPhone) {
        openModal('Raport per Orhanin', `<div style="padding:1rem;">
            <p style="margin-bottom:1rem;color:#888;">Numri i telefonit te Orhanit nuk eshte konfiguruar. Mesazhi i pergatitur:</p>
            <textarea style="width:100%;height:200px;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:0.85rem;box-sizing:border-box;" readonly>${msg}</textarea>
        </div>`);
        return;
    }
    window.open('https://wa.me/' + orhanPhone + '?text=' + encodeURIComponent(msg), '_blank');
    showToast('Raporti u dergua tek Orhani!', 'success');
    logActivity('report', 'Raporti ditor u dergua tek Orhani per ' + today);
}

// ============================================================
// FEATURE 15: Mesazh falenderimi pas pageses
// ============================================================
function sendThankYouWhatsApp(clientId, amount) {
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) return;
    const phone = (client.phone || '').replace(/\s+/g, '');
    if (!phone) { showToast('Klienti nuk ka numer telefoni', 'error'); return; }

    const debt = client.debt || 0;
    const debtMsg = debt > 0
        ? `Borxhi juaj i mbetur eshte ${debt} den.`
        : 'Borxhi juaj eshte paguar plotesisht! Ju falenderojme!';

    const msg = `Pershendetje ${client.name}! 🌴\n\nJu falenderojme per pagesen e ${amount} den.\n${debtMsg}\n\nJu presim serisht ne dyqanin Hurma!\nFaleminderit! 🙏`;
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    logActivity('whatsapp', `Mesazh falenderimi u dergua tek ${client.name} per pagesen ${amount} den`);
}

// ============================================================
// FEATURE 16: Klienti i fundit ne header
// ============================================================
function updateLastClientHeader() {
    const sales = (state.sales || []);
    if (sales.length === 0) return;
    const sorted = sales.slice().sort((a, b) => {
        const da = new Date((b.createdAt || b.date));
        const db = new Date((a.createdAt || a.date));
        return da - db;
    });
    const lastSale = sorted[0];
    const client = (state.clients || []).find(c => c.id === lastSale.clientId);
    if (!client) return;
    const productName = lastSale.product || lastSale.productName || 'Produkt';

    let badge = document.getElementById('last-client-header-badge');
    if (!badge) {
        const topbar = document.querySelector('.topbar') || document.querySelector('header') || document.querySelector('.header');
        if (!topbar) return;
        badge = document.createElement('div');
        badge.id = 'last-client-header-badge';
        badge.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:0.8rem;cursor:pointer;margin-left:auto;';
        badge.title = 'Shitja e fundit';
        topbar.appendChild(badge);
    }
    badge.innerHTML = `<span style="color:var(--primary);">🛒</span><span><strong>${client.name}</strong> &mdash; ${productName}</span>`;
    badge.onclick = () => showClientDebtHistory(client.id);
}

// ============================================================
// FEATURE 17: Kalendar pagesash
// ============================================================
function showPaymentCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('sq-AL', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sunday
    const startOffset = (firstDay + 6) % 7; // Monday start

    // Group payments by day
    const payByDay = {};
    (state.clientPayments || []).forEach(p => {
        if (!p.date) return;
        const d = new Date(p.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            if (!payByDay[day]) payByDay[day] = 0;
            payByDay[day] += p.amount || 0;
        }
    });

    const dayNames = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];
    let calHtml = `<h3 style="text-align:center;margin-bottom:1rem;text-transform:capitalize;">${monthName}</h3>`;
    calHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    dayNames.forEach(d => {
        calHtml += `<div style="text-align:center;font-weight:700;font-size:0.75rem;color:#888;padding:4px;">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
        calHtml += '<div></div>';
    }

    const todayDate = now.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const amount = payByDay[day] || 0;
        const isToday = day === todayDate;
        const hasPay = amount > 0;
        calHtml += `<div style="border-radius:8px;padding:6px 2px;text-align:center;min-height:48px;background:${isToday ? 'var(--primary)22' : hasPay ? 'var(--success)11' : 'var(--bg-secondary)'};border:1px solid ${isToday ? 'var(--primary)' : 'var(--border)'};position:relative;">
            <div style="font-weight:${isToday?'700':'400'};font-size:0.85rem;color:${isToday?'var(--primary)':'inherit'};">${day}</div>
            ${hasPay ? `<div style="font-size:0.68rem;color:var(--success);font-weight:700;margin-top:2px;">${amount > 999 ? Math.round(amount/1000)+'k' : amount}</div>` : ''}
        </div>`;
    }
    calHtml += '</div>';

    // Summary
    const totalMonth = Object.values(payByDay).reduce((s, v) => s + v, 0);
    const payDays = Object.keys(payByDay).length;
    calHtml += `<div style="display:flex;justify-content:space-between;margin-top:1rem;padding:10px;background:var(--bg-secondary);border-radius:10px;">
        <span style="color:#888;">Dite me pagesa: <strong>${payDays}</strong></span>
        <span>Gjithsej: <strong style="color:var(--success);">${totalMonth} den</strong></span>
    </div>`;

    openModal('Kalendari i Pagesave', calHtml);
}

// ============================================================
// FEATURE 18: Produkti me fitim me te larte
// ============================================================
function showMostProfitableProduct() {
    const profitByProduct = {};
    const revByProduct = {};
    const qtyByProduct = {};
    (state.sales || []).forEach(s => {
        const prod = getProduct(s.productId);
        const name = prod ? prod.name : 'E panjohur';
        if (!profitByProduct[name]) { profitByProduct[name] = 0; revByProduct[name] = 0; qtyByProduct[name] = 0; }
        profitByProduct[name] += s.profit || 0;
        revByProduct[name] += s.sellTotal || 0;
        qtyByProduct[name] += s.quantity || 1;
    });

    const products = Object.keys(profitByProduct);
    if (products.length === 0) {
        openModal('Produkti me Fitim me te Larte', '<p style="text-align:center;padding:2rem;color:#888;">Nuk ka shitje te regjistruara.</p>');
        return;
    }

    products.sort((a, b) => profitByProduct[b] - profitByProduct[a]);
    const top = products[0];
    const maxProfit = profitByProduct[top];
    const allMax = profitByProduct[products[0]] || 1;

    const bars = products.slice(0, 8).map(p => {
        const pct = Math.round((profitByProduct[p] / allMax) * 100);
        return `<div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;">
                <span style="font-weight:${p===top?'700':'400'};color:${p===top?'var(--primary)':'inherit'};">${p}</span>
                <span style="color:var(--success);font-weight:600;">${profitByProduct[p]} den</span>
            </div>
            <div style="background:var(--bg-secondary);border-radius:6px;height:10px;">
                <div style="background:${p===top?'var(--primary)':'var(--success)'};width:${pct}%;height:10px;border-radius:6px;transition:width 0.5s;"></div>
            </div>
        </div>`;
    }).join('');

    const html = `
        <div style="text-align:center;padding:1rem 0 1.5rem;">
            <div style="font-size:2.5rem;">🏆</div>
            <h2 style="margin:0.5rem 0 0.3rem;color:var(--primary);">${top}</h2>
            <p style="color:#888;font-size:0.9rem;">Produkti me fitim me te larte</p>
            <div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;">
                <div style="background:var(--success)22;padding:10px 20px;border-radius:10px;">
                    <div style="font-size:1.3rem;font-weight:700;color:var(--success);">${maxProfit} den</div>
                    <div style="font-size:0.75rem;color:#888;">Fitim total</div>
                </div>
                <div style="background:var(--primary)22;padding:10px 20px;border-radius:10px;">
                    <div style="font-size:1.3rem;font-weight:700;color:var(--primary);">${revByProduct[top]} den</div>
                    <div style="font-size:0.75rem;color:#888;">Te ardhura</div>
                </div>
                <div style="background:var(--bg-secondary);padding:10px 20px;border-radius:10px;">
                    <div style="font-size:1.3rem;font-weight:700;">${qtyByProduct[top]}</div>
                    <div style="font-size:0.75rem;color:#888;">Cope shitura</div>
                </div>
            </div>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin-bottom:1rem;">
        <h4 style="margin-bottom:0.8rem;color:#888;">Krahasimi i fitimeve sipas produktit:</h4>
        ${bars}`;
    openModal('Produkti me Fitim me te Larte', html);
}

// ============================================================
// FEATURE 19: Alert kur arrihet targeti ditor
// ============================================================
function checkDailyTargetReached() {
    if (!state.dailyTarget || state.dailyTarget <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    const todayProfit = (state.sales || []).filter(s => s.date === today).reduce((s, x) => s + (x.profit || 0), 0);
    if (todayProfit < state.dailyTarget) return;

    // Avoid repeating the celebration
    const key = 'hurma_target_celebrated_' + today;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');

    showToast(`Urime! Targeti ditor i ${state.dailyTarget} den u arrit! Fitimi sot: ${todayProfit} den`, 'success');

    // Simple confetti effect
    try {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const colors = ['#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#ec4899'];
        const particles = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: -10,
            r: Math.random() * 6 + 3,
            d: Math.random() * 80 + 20,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            alpha: 1
        }));
        let frame = 0;
        function animateConfetti() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.008;
            });
            ctx.globalAlpha = 1;
            frame++;
            if (frame < 200 && particles.some(p => p.alpha > 0)) {
                requestAnimationFrame(animateConfetti);
            } else {
                canvas.remove();
            }
        }
        animateConfetti();
    } catch(e) { /* confetti optional */ }
}

// ============================================================
// FEATURE 20: Krahasim javor chart
// ============================================================
function showWeeklyComparisonChart() {
    const now = new Date();
    // Get Monday of current week
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0
    const mondayThis = new Date(now);
    mondayThis.setDate(now.getDate() - dayOfWeek);
    mondayThis.setHours(0, 0, 0, 0);

    const mondayLast = new Date(mondayThis);
    mondayLast.setDate(mondayThis.getDate() - 7);

    const dayLabels = ['Hënë', 'Martë', 'Mërkurë', 'Enjte', 'Premte', 'Shtunë', 'Diel'];
    const thisWeek = Array(7).fill(0);
    const lastWeek = Array(7).fill(0);

    (state.sales || []).forEach(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        const diffThis = Math.round((d - mondayThis) / (24 * 60 * 60 * 1000));
        const diffLast = Math.round((d - mondayLast) / (24 * 60 * 60 * 1000));
        if (diffThis >= 0 && diffThis < 7) thisWeek[diffThis] += s.profit || 0;
        if (diffLast >= 0 && diffLast < 7) lastWeek[diffLast] += s.profit || 0;
    });

    const canvasId = 'weekly-chart-' + Date.now();
    const html = `
        <div style="display:flex;gap:1rem;justify-content:center;margin-bottom:1rem;font-size:0.85rem;">
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:4px;background:#3b82f6;display:inline-block;border-radius:2px;"></span>Kjo jave</span>
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:4px;background:#f59e0b;display:inline-block;border-radius:2px;"></span>Jave e kaluar</span>
        </div>
        <canvas id="${canvasId}" style="max-height:280px;"></canvas>
        <div style="margin-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">
            <div style="background:var(--bg-secondary);padding:10px;border-radius:10px;text-align:center;">
                <div style="font-size:0.75rem;color:#888;">Fitimi kete jave</div>
                <div style="font-weight:700;color:var(--primary);font-size:1.1rem;">${thisWeek.reduce((a,b)=>a+b,0)} den</div>
            </div>
            <div style="background:var(--bg-secondary);padding:10px;border-radius:10px;text-align:center;">
                <div style="font-size:0.75rem;color:#888;">Fitimi javen e kaluar</div>
                <div style="font-weight:700;color:#f59e0b;font-size:1.1rem;">${lastWeek.reduce((a,b)=>a+b,0)} den</div>
            </div>
        </div>`;

    openModal('Krahasimi Javor i Shitjeve', html);

    // Render chart after modal opens
    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (typeof Chart === 'undefined') {
            canvas.insertAdjacentHTML('afterend', '<p style="text-align:center;color:#888;font-size:0.85rem;">Chart.js nuk eshte i ngarkuar.</p>');
            return;
        }
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [
                    {
                        label: 'Kjo jave',
                        data: thisWeek,
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        borderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Jave e kaluar',
                        data: lastWeek,
                        borderColor: '#f59e0b',
                        backgroundColor: '#f59e0b15',
                        borderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y} den fitim`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => v + ' den' }
                    }
                }
            }
        });
    }, 150);
}

// Patch: call checkDailyTargetReached after sales refresh and call updateLastClientHeader
(function patchFeaturesPost11to20() {
    if (typeof refreshSales === 'function') {
        const _origRefreshSales = refreshSales;
        refreshSales = function() {
            _origRefreshSales.apply(this, arguments);
            try { updateLastClientHeader(); } catch(e) {}
            try { checkDailyTargetReached(); } catch(e) {}
        };
    }
    if (typeof refreshDashboard === 'function') {
        const _origRD = refreshDashboard;
        refreshDashboard = function() {
            _origRD.apply(this, arguments);
            try { updateLastClientHeader(); } catch(e) {}
        };
    }
})();

// ============================================================
// FEATURES 21-30
// ============================================================

// FEATURE 21: Count-up animation for dashboard numbers
function animateCountUp(elementId, targetValue, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    // Extract numeric part; preserve any suffix text like ' ден'
    const fullText = el.textContent || '';
    const suffixMatch = fullText.match(/[^\d\.\-]+$/);
    const suffix = suffixMatch ? suffixMatch[0] : '';
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (targetValue - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = targetValue + suffix;
    }
    requestAnimationFrame(step);
}

function animateDashboardNumbers() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = (state.sales || []).filter(s => s.date === todayStr);
    const todayReturns = (state.returns || []).filter(r => r.date === todayStr);
    const todayProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const todayReturnLoss = todayReturns.reduce((sum, r) => {
        const p = getProduct ? getProduct(r.productId) : null;
        return sum + (p ? (p.sellPrice - p.buyPrice) * r.quantity : 0);
    }, 0);
    const netProfit = todayProfit - todayReturnLoss;

    animateCountUp('today-profit', netProfit, 800);
    animateCountUp('today-sales', todaySales.length, 800);
    animateCountUp('your-share', calcOwnerShare(netProfit), 800);
    const fatonDebt = typeof calcFatonDebt === 'function' ? calcFatonDebt() : 0;
    animateCountUp('faton-debt', fatonDebt, 800);
    const totalStock = Object.values(state.stock || {}).reduce((sum, v) => sum + v, 0);
    animateCountUp('total-stock', totalStock, 800);
}

// FEATURE 22: Konfeti per shitje te madhe
function checkBigSale(amount) {
    if (amount > 5000) {
        if (typeof showConfetti === 'function') {
            showConfetti();
        }
        showToast('Shitje e madhe! ' + amount + ' den 🎉', 'success');
    }
}

// FEATURE 23: Trend indicators for dashboard cards
function addTrendIndicators() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todaySales = (state.sales || []).filter(s => s.date === todayStr);
    const yesterdaySales = (state.sales || []).filter(s => s.date === yesterdayStr);
    const todayReturns = (state.returns || []).filter(r => r.date === todayStr);
    const yestReturns = (state.returns || []).filter(r => r.date === yesterdayStr);

    function netProfit(sales, returns) {
        const p = sales.reduce((s, x) => s + (x.profit || 0), 0);
        const l = returns.reduce((s, r) => {
            const prod = typeof getProduct === 'function' ? getProduct(r.productId) : null;
            return s + (prod ? (prod.sellPrice - prod.buyPrice) * r.quantity : 0);
        }, 0);
        return p - l;
    }

    const metrics = [
        { id: 'today-profit', today: netProfit(todaySales, todayReturns), yesterday: netProfit(yesterdaySales, yestReturns), label: 'Fitim' },
        { id: 'today-sales',  today: todaySales.length, yesterday: yesterdaySales.length, label: 'Shitje' },
        { id: 'your-share',   today: calcOwnerShare(netProfit(todaySales, todayReturns)), yesterday: calcOwnerShare(netProfit(yesterdaySales, yestReturns)), label: 'Pjesa' }
    ];

    metrics.forEach(m => {
        const el = document.getElementById(m.id);
        if (!el) return;
        // Remove old badge if exists
        const old = el.parentElement.querySelector('.trend-badge');
        if (old) old.remove();

        let icon, color, pct;
        if (m.yesterday === 0 && m.today === 0) {
            icon = '—'; color = 'var(--text-secondary)'; pct = '0%';
        } else if (m.yesterday === 0) {
            icon = '▲'; color = 'var(--success)'; pct = '+100%';
        } else {
            const diff = ((m.today - m.yesterday) / Math.abs(m.yesterday) * 100).toFixed(1);
            if (diff > 0) { icon = '▲'; color = 'var(--success)'; pct = '+' + diff + '%'; }
            else if (diff < 0) { icon = '▼'; color = 'var(--danger)'; pct = diff + '%'; }
            else { icon = '—'; color = 'var(--text-secondary)'; pct = '0%'; }
        }

        const badge = document.createElement('span');
        badge.className = 'trend-badge';
        badge.style.cssText = 'font-size:0.72em;color:' + color + ';margin-left:6px;font-weight:600;white-space:nowrap;';
        badge.textContent = icon + ' ' + pct;
        badge.title = 'Dje: ' + m.yesterday;
        el.parentElement.appendChild(badge);
    });
}

// FEATURE 24: Fitimi per ore (Profit by hour)
function showProfitByHour() {
    const hourlyProfit = new Array(24).fill(0);
    const hourlySales = new Array(24).fill(0);
    (state.sales || []).forEach(s => {
        if (!s.timestamp && !s.time) return;
        let hour = null;
        if (s.timestamp) hour = new Date(s.timestamp).getHours();
        else if (s.time) hour = parseInt(s.time.split(':')[0]);
        if (hour !== null && hour >= 0 && hour < 24) {
            hourlyProfit[hour] += (s.profit || 0);
            hourlySales[hour]++;
        }
    });

    const canvasId = 'profit-by-hour-chart-' + Date.now();
    const html = `
        <div style="margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;">
            <div class="stat-card" style="flex:1;min-width:140px;"><div><h3>Ora me fitim me te larte</h3><p id="pbh-peak-hour" style="font-size:1.1em;font-weight:700;"></p></div></div>
            <div class="stat-card" style="flex:1;min-width:140px;"><div><h3>Shitjet kryesore</h3><p id="pbh-peak-sales" style="font-size:1.1em;font-weight:700;"></p></div></div>
        </div>
        <canvas id="${canvasId}" style="max-height:320px;"></canvas>`;
    openModal('Fitimi sipas ores se dites', html);

    setTimeout(() => {
        const maxProfit = Math.max(...hourlyProfit);
        const peakHour = hourlyProfit.indexOf(maxProfit);
        const maxSales = Math.max(...hourlySales);
        const peakSalesHour = hourlySales.indexOf(maxSales);
        const peakEl = document.getElementById('pbh-peak-hour');
        const peakSEl = document.getElementById('pbh-peak-sales');
        if (peakEl) peakEl.textContent = peakHour + ':00 (' + maxProfit + ' den)';
        if (peakSEl) peakSEl.textContent = peakSalesHour + ':00 (' + maxSales + ' shitje)';

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const labels = Array.from({ length: 24 }, (_, i) => i + ':00');
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Fitim (den)',
                    data: hourlyProfit,
                    backgroundColor: hourlyProfit.map(v => v === maxProfit && maxProfit > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.6)'),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.y + ' den | ' + hourlySales[ctx.dataIndex] + ' shitje' } } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' den' } } }
            }
        });
    }, 180);
}

// FEATURE 25: ROI per produkt
function showProductROI() {
    const salesData = {};
    (state.sales || []).forEach(s => {
        if (!salesData[s.productId]) salesData[s.productId] = { units: 0, revenue: 0, profit: 0 };
        salesData[s.productId].units += (s.quantity || 0);
        salesData[s.productId].revenue += (s.sellTotal || 0);
        salesData[s.productId].profit += (s.profit || 0);
    });

    const rows = PRODUCTS.map(p => {
        const d = salesData[p.id] || { units: 0, revenue: 0, profit: 0 };
        const roi = p.buyPrice > 0 ? (((p.sellPrice - p.buyPrice) / p.buyPrice) * 100).toFixed(1) : 0;
        const unitProfit = (p.sellPrice || 0) - (p.buyPrice || 0);
        return { name: p.name, buy: p.buyPrice || 0, sell: p.sellPrice || 0, unitProfit, roi: parseFloat(roi), units: d.units, totalProfit: d.profit };
    }).sort((a, b) => b.roi - a.roi);

    const tableRows = rows.map(r => `
        <tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.buy} den</td>
            <td>${r.sell} den</td>
            <td>${r.unitProfit} den</td>
            <td style="color:${r.roi >= 20 ? 'var(--success)' : r.roi >= 10 ? 'var(--warning)' : 'var(--danger)'};font-weight:700;">${r.roi}%</td>
            <td>${r.units}</td>
            <td style="font-weight:600;">${r.totalProfit} den</td>
        </tr>`).join('');

    const html = `
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr>
                    <th>Produkti</th><th>Cmimi blerjes</th><th>Cmimi shitjes</th>
                    <th>Fitim/njesi</th><th>ROI %</th><th>Njesi shitura</th><th>Fitim total</th>
                </tr></thead>
                <tbody>${tableRows || '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);">Nuk ka te dhena</td></tr>'}</tbody>
            </table>
        </div>`;
    openModal('ROI per Produkt', html);
}

// FEATURE 26: Parashikim javore (Weekly Forecast)
function showWeeklyForecast() {
    const today = new Date();
    // Collect daily totals for the past 28 days
    const dailyData = {};
    for (let i = 1; i <= 28; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const daySales = (state.sales || []).filter(s => s.date === ds);
        dailyData[ds] = {
            count: daySales.length,
            revenue: daySales.reduce((s, x) => s + (x.sellTotal || 0), 0),
            profit: daySales.reduce((s, x) => s + (x.profit || 0), 0)
        };
    }

    // Average per day across 4 weeks
    const values = Object.values(dailyData);
    const avgCount = values.reduce((s, v) => s + v.count, 0) / 28;
    const avgRevenue = values.reduce((s, v) => s + v.revenue, 0) / 28;
    const avgProfit = values.reduce((s, v) => s + v.profit, 0) / 28;

    const forecastCount = Math.round(avgCount * 7);
    const forecastRevenue = Math.round(avgRevenue * 7);
    const forecastProfit = Math.round(avgProfit * 7);
    const forecastOwner = calcOwnerShare(forecastProfit);
    const forecastPartner = calcPartnerShare(forecastProfit);

    // Day names in Albanian
    const dayNames = ['E Hene', 'E Marte', 'E Merkure', 'E Enjte', 'E Premte', 'E Shtune', 'E Diele'];
    const dailyCards = dayNames.map((day, i) => `
        <div class="stat-card" style="flex:1;min-width:120px;text-align:center;">
            <div><h3 style="font-size:0.8em;">${day}</h3>
            <p style="font-size:0.95em;font-weight:600;">${Math.round(avgProfit)} den</p>
            <p style="font-size:0.75em;color:var(--text-secondary);">${Math.round(avgCount)} shitje</p></div>
        </div>`).join('');

    const html = `
        <div style="background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:12px;padding:16px;color:#fff;margin-bottom:16px;">
            <h3 style="margin:0 0 4px 0;font-size:1em;opacity:0.85;">Parashikim per javen e ardhshme</h3>
            <p style="margin:0;font-size:0.78em;opacity:0.7;">Bazuar ne mesataren e 28 diteve te fundit</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <div class="stat-card" style="flex:1;min-width:130px;"><div><h3>Shitje te parashikuara</h3><p style="font-size:1.3em;font-weight:700;color:var(--primary);">${forecastCount}</p></div></div>
            <div class="stat-card" style="flex:1;min-width:130px;"><div><h3>Te ardhura</h3><p style="font-size:1.3em;font-weight:700;color:var(--accent);">${forecastRevenue} den</p></div></div>
            <div class="stat-card" style="flex:1;min-width:130px;"><div><h3>Fitim i parashikuar</h3><p style="font-size:1.3em;font-weight:700;color:var(--success);">${forecastProfit} den</p></div></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <div class="stat-card" style="flex:1;min-width:130px;"><div><h3>Pjesa e Elez</h3><p style="font-size:1.1em;font-weight:700;">${forecastOwner} den</p></div></div>
            <div class="stat-card" style="flex:1;min-width:130px;"><div><h3>Pjesa e ${state.partnerName}</h3><p style="font-size:1.1em;font-weight:700;">${forecastPartner} den</p></div></div>
        </div>
        <h4 style="margin:0 0 8px 0;color:var(--text-secondary);font-size:0.85em;">PARASHIKIM DITOR</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${dailyCards}</div>`;
    openModal('Parashikim Javor', html);
}

// FEATURE 27: Zbritje per sasi (Volume Discounts)
function getVolumeDiscount(quantity) {
    const discounts = state.volumeDiscounts || [];
    let best = 0;
    discounts.forEach(d => {
        if (quantity >= d.minQty && d.discountPct > best) best = d.discountPct;
    });
    return best;
}

function openVolumeDiscountSettings() {
    if (!state.volumeDiscounts) state.volumeDiscounts = [];

    function renderRows() {
        if (!state.volumeDiscounts.length) return '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:12px;">Nuk ka zbritje te caktuara</td></tr>';
        return state.volumeDiscounts.map((d, i) => `
            <tr>
                <td>${d.minQty}+</td>
                <td style="color:var(--success);font-weight:700;">${d.discountPct}%</td>
                <td><button class="btn btn-danger" style="padding:4px 10px;font-size:0.8em;" onclick="state.volumeDiscounts.splice(${i},1);saveState();document.getElementById('vd-tbody').innerHTML=renderVDRows();">Fshi</button></td>
            </tr>`).join('');
    }

    window.renderVDRows = renderRows;

    const html = `
        <div style="margin-bottom:16px;padding:12px;background:var(--card-bg);border-radius:8px;border:1px solid var(--border);">
            <h4 style="margin:0 0 10px 0;">Shto zbritje te re</h4>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:100px;">
                    <label style="font-size:0.8em;color:var(--text-secondary);">Sasi minimale</label>
                    <input type="number" id="vd-minqty" class="form-input" placeholder="p.sh. 10" min="1" style="width:100%;">
                </div>
                <div style="flex:1;min-width:100px;">
                    <label style="font-size:0.8em;color:var(--text-secondary);">Zbritja (%)</label>
                    <input type="number" id="vd-pct" class="form-input" placeholder="p.sh. 5" min="0.1" max="100" step="0.1" style="width:100%;">
                </div>
                <button class="btn btn-primary" onclick="(function(){
                    const qty = parseInt(document.getElementById('vd-minqty').value);
                    const pct = parseFloat(document.getElementById('vd-pct').value);
                    if (!qty || !pct || qty < 1 || pct <= 0) { showToast('Vendos vlera valide','error'); return; }
                    if (!state.volumeDiscounts) state.volumeDiscounts = [];
                    state.volumeDiscounts.push({minQty:qty, discountPct:pct});
                    state.volumeDiscounts.sort((a,b)=>a.minQty-b.minQty);
                    saveState();
                    document.getElementById('vd-tbody').innerHTML=renderVDRows();
                    document.getElementById('vd-minqty').value='';
                    document.getElementById('vd-pct').value='';
                    showToast('Zbritja u shtua','success');
                })();">Shto</button>
            </div>
        </div>
        <table class="data-table" style="width:100%;border-collapse:collapse;">
            <thead><tr><th>Sasi (min)</th><th>Zbritja</th><th>Veprime</th></tr></thead>
            <tbody id="vd-tbody">${renderRows()}</tbody>
        </table>
        <div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:6px;font-size:0.82em;color:var(--text-secondary);">
            <strong>Shembull:</strong> Nese vendosni 10+ = 5%, blerja e 10 copave marre zbritje 5% nga cmimi total.
        </div>`;
    openModal('Cilesimet e Zbritjeve per Sasi', html);
}

// FEATURE 28: Harta e borxheve sipas qytetit
function showDebtByCity() {
    const cityMap = {};
    (state.clients || []).forEach(c => {
        const city = (c.city || c.zone || c.address || 'Pa qytet').trim() || 'Pa qytet';
        if (!cityMap[city]) cityMap[city] = { city, totalDebt: 0, clientCount: 0, clients: [] };
        cityMap[city].totalDebt += (c.debt || 0);
        cityMap[city].clientCount++;
        cityMap[city].clients.push(c.name);
    });

    const sorted = Object.values(cityMap).sort((a, b) => b.totalDebt - a.totalDebt);
    const totalDebt = sorted.reduce((s, c) => s + c.totalDebt, 0);

    const tableRows = sorted.map(c => {
        const pct = totalDebt > 0 ? ((c.totalDebt / totalDebt) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td><strong>${c.city}</strong></td>
                <td style="color:${c.totalDebt > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700;">${c.totalDebt} den</td>
                <td>${c.clientCount}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="flex:1;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:var(--danger);border-radius:4px;"></div>
                        </div>
                        <span style="font-size:0.78em;color:var(--text-secondary);">${pct}%</span>
                    </div>
                </td>
            </tr>`;
    }).join('');

    const html = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <div class="stat-card" style="flex:1;"><div><h3>Borxh total</h3><p style="font-size:1.2em;font-weight:700;color:var(--danger);">${totalDebt} den</p></div></div>
            <div class="stat-card" style="flex:1;"><div><h3>Qytete me borxh</h3><p style="font-size:1.2em;font-weight:700;">${sorted.filter(c=>c.totalDebt>0).length}</p></div></div>
            <div class="stat-card" style="flex:1;"><div><h3>Total klientet</h3><p style="font-size:1.2em;font-weight:700;">${(state.clients||[]).length}</p></div></div>
        </div>
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr><th>Qyteti</th><th>Borxh total</th><th>Nr. klientesh</th><th>Perqindja e borxhit</th></tr></thead>
                <tbody>${tableRows || '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">Nuk ka te dhena</td></tr>'}</tbody>
            </table>
        </div>`;
    openModal('Harta e Borxheve sipas Qytetit', html);
}

// FEATURE 29: Kontrate klienti (Client Contract PDF)
function generateClientContract(clientId) {
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) { showToast('Klienti nuk u gjet', 'error'); return; }
    if (!window.jspdf) { showToast('jsPDF nuk eshte ngarkuar', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const contractDate = new Date().toLocaleDateString('sq-AL');
    const contractNo = 'KON-' + Date.now().toString().slice(-6);
    const clientSales = (state.sales || []).filter(s => s.clientId === clientId);

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('KONTRATE BASHKEPUNIMI', 105, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nr. ' + contractNo + '  |  Date: ' + contractDate, 105, 23, { align: 'center' });

    // Reset text color
    doc.setTextColor(30, 30, 30);

    // Parties section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PALET KONTRAKTUESE', 14, 42);
    doc.setDrawColor(79, 70, 229);
    doc.line(14, 44, 196, 44);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 50;
    doc.setFont('helvetica', 'bold');
    doc.text('SHITESI:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Elez Dauti  |  Hurma Business', 50, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('BLERESI:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(client.name + (client.phone ? '  |  Tel: ' + client.phone : ''), 50, y);
    y += 6;
    if (client.city || client.address) {
        doc.text('Adresa: ' + (client.city || client.address || ''), 50, y);
        y += 6;
    }

    // Terms section
    y += 4;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('KUSHTET E KONTRATES', 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const terms = [
        '1. Pagesa behet brenda 30 diteve nga data e fatures (ose 60 dite me miratim te veçante).',
        '2. Cmimi eshte i fiksuar per periudhen e kontrates.',
        '3. Kthimi i mallrave behet vetem me miratim te shitesit brenda 7 diteve.',
        '4. Ne rast vonese pagese aplikohet interest 0.5% per çdo dite vonese.',
        '5. Çdo ndryshim i kontrates duhet te jete me shkrim dhe i nenshkruar nga te dyja palet.'
    ];
    terms.forEach(t => { doc.text(t, 14, y, { maxWidth: 182 }); y += 8; });

    // Products table
    y += 4;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUKTET E RENA DAKORD', 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 10;

    // Table header
    doc.setFillColor(240, 240, 255);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Produkti', 16, y);
    doc.text('Cmimi', 120, y);
    doc.text('Njesi shitura', 150, y);
    doc.text('Total', 180, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 4;

    // Aggregate products for this client
    const productAgg = {};
    clientSales.forEach(s => {
        if (!productAgg[s.productId]) productAgg[s.productId] = { units: 0, total: 0 };
        productAgg[s.productId].units += (s.quantity || 0);
        productAgg[s.productId].total += (s.sellTotal || 0);
    });

    doc.setFont('helvetica', 'normal');
    const prodEntries = Object.entries(productAgg);
    if (prodEntries.length === 0) {
        doc.text('(Nuk ka produkte te regjistruara)', 16, y);
        y += 8;
    } else {
        prodEntries.slice(0, 15).forEach(([pid, d]) => {
            const p = PRODUCTS.find(pr => pr.id === pid);
            const name = p ? p.name : 'Produkt ' + pid;
            const price = p ? p.sellPrice + ' den' : '-';
            doc.text(name.substring(0, 40), 16, y);
            doc.text(price, 120, y);
            doc.text(String(d.units), 155, y);
            doc.text(d.total + ' den', 175, y);
            y += 7;
            if (y > 250) { doc.addPage(); y = 20; }
        });
    }

    // Financial summary
    const totalOwed = client.debt || 0;
    const totalPaid = clientSales.reduce((s, x) => s + (x.sellTotal || 0), 0) - totalOwed;
    y += 4;
    doc.setFillColor(240, 255, 240);
    doc.rect(14, y - 4, 182, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total i blerjes: ' + clientSales.reduce((s, x) => s + (x.sellTotal || 0), 0) + ' den', 16, y + 2);
    doc.text('Paguar: ' + Math.max(0, totalPaid) + ' den', 90, y + 2);
    doc.setTextColor(200, 0, 0);
    doc.text('Borxh aktual: ' + totalOwed + ' den', 150, y + 2);
    doc.setTextColor(30, 30, 30);
    y += 20;

    // Signatures
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('NENSHKRIMET', 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SHITESI', 40, y, { align: 'center' });
    doc.text('BLERESI', 165, y, { align: 'center' });
    y += 18;
    doc.line(14, y, 70, y);
    doc.line(130, y, 196, y);
    y += 5;
    doc.text('Elez Dauti', 40, y, { align: 'center' });
    doc.text(client.name, 163, y, { align: 'center' });
    y += 5;
    doc.text('Date: ' + contractDate, 40, y, { align: 'center' });
    doc.text('Date: ___________', 163, y, { align: 'center' });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Kontrate Nr. ' + contractNo + '  |  Hurma Business  |  Faqe ' + i + '/' + pageCount, 105, 290, { align: 'center' });
    }

    doc.save('Kontrate_' + client.name.replace(/\s+/g, '_') + '_' + contractNo + '.pdf');
    showToast('Kontrata u gjenerua per ' + client.name, 'success');
    logActivity('contract', 'Kontrate e gjeneruar per: ' + client.name);
}

// FEATURE 30: Audit log i plote (Full Audit Log)
function showFullAuditLog() {
    const activities = state.activityLog || [];

    // Collect unique types
    const types = [...new Set(activities.map(a => a.type || 'general'))];

    const html = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
            <input type="text" id="audit-search" class="form-input" placeholder="Kerko..." style="flex:1;min-width:150px;" oninput="filterAuditLog()">
            <select id="audit-type-filter" class="form-input" style="min-width:130px;" onchange="filterAuditLog()">
                <option value="">Te gjitha llojet</option>
                ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <input type="date" id="audit-date-from" class="form-input" style="min-width:130px;" onchange="filterAuditLog()">
            <input type="date" id="audit-date-to" class="form-input" style="min-width:130px;" onchange="filterAuditLog()">
            <button class="btn btn-success" onclick="exportAuditLog()"><i class="fas fa-file-excel"></i> Excel</button>
        </div>
        <div id="audit-count" style="font-size:0.82em;color:var(--text-secondary);margin-bottom:8px;"></div>
        <div id="audit-log-body" style="max-height:420px;overflow-y:auto;"></div>`;

    openModal('Log i Plote i Aktiviteteve', html);

    setTimeout(() => {
        filterAuditLog();
    }, 100);
}

function filterAuditLog() {
    const activities = state.activityLog || [];
    const search = (document.getElementById('audit-search') || {}).value || '';
    const typeFilter = (document.getElementById('audit-type-filter') || {}).value || '';
    const dateFrom = (document.getElementById('audit-date-from') || {}).value || '';
    const dateTo = (document.getElementById('audit-date-to') || {}).value || '';

    let filtered = activities.filter(a => {
        if (typeFilter && (a.type || 'general') !== typeFilter) return false;
        if (search) {
            const searchLower = search.toLowerCase();
            if (!(a.text || '').toLowerCase().includes(searchLower) &&
                !(a.type || '').toLowerCase().includes(searchLower)) return false;
        }
        if (dateFrom || dateTo) {
            const aDate = (a.date || a.timestamp || '').split('T')[0];
            if (dateFrom && aDate < dateFrom) return false;
            if (dateTo && aDate > dateTo) return false;
        }
        return true;
    }).slice().reverse();

    const countEl = document.getElementById('audit-count');
    if (countEl) countEl.textContent = 'Duke shfaqur ' + filtered.length + ' nga ' + activities.length + ' aktivitete';

    const body = document.getElementById('audit-log-body');
    if (!body) return;

    if (!filtered.length) {
        body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);">Nuk u gjet asnje aktivitet</div>';
        return;
    }

    const typeColors = { sale: 'var(--success)', client: 'var(--primary)', order: 'var(--accent)', return: 'var(--danger)', general: 'var(--text-secondary)' };

    body.innerHTML = filtered.map(a => {
        const type = a.type || 'general';
        const color = typeColors[type] || 'var(--primary)';
        const dateStr = a.date || a.timestamp || '';
        const displayDate = dateStr ? new Date(dateStr).toLocaleString('sq-AL') : '';
        return `
            <div style="display:flex;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border);align-items:flex-start;">
                <span style="min-width:70px;font-size:0.72em;background:${color}20;color:${color};border-radius:4px;padding:2px 6px;font-weight:600;text-align:center;">${type}</span>
                <div style="flex:1;">
                    <div style="font-size:0.9em;">${a.text || '-'}</div>
                    <div style="font-size:0.75em;color:var(--text-secondary);margin-top:2px;">${displayDate}</div>
                </div>
            </div>`;
    }).join('');
}

function exportAuditLog() {
    const activities = state.activityLog || [];
    const search = (document.getElementById('audit-search') || {}).value || '';
    const typeFilter = (document.getElementById('audit-type-filter') || {}).value || '';
    const dateFrom = (document.getElementById('audit-date-from') || {}).value || '';
    const dateTo = (document.getElementById('audit-date-to') || {}).value || '';

    let filtered = activities.filter(a => {
        if (typeFilter && (a.type || 'general') !== typeFilter) return false;
        if (search) {
            const sl = search.toLowerCase();
            if (!(a.text || '').toLowerCase().includes(sl) && !(a.type || '').toLowerCase().includes(sl)) return false;
        }
        if (dateFrom || dateTo) {
            const aDate = (a.date || a.timestamp || '').split('T')[0];
            if (dateFrom && aDate < dateFrom) return false;
            if (dateTo && aDate > dateTo) return false;
        }
        return true;
    }).slice().reverse();

    const headers = ['Tipi', 'Teksti', 'Data'];
    const rows = filtered.map(a => [
        a.type || 'general',
        a.text || '',
        a.date || a.timestamp || ''
    ]);

    if (typeof exportToExcel === 'function') {
        exportToExcel(headers, rows, 'Audit_Log_' + new Date().toISOString().split('T')[0]);
        showToast('Log-u u eksportua ne Excel', 'success');
    } else {
        showToast('Eksporti ne Excel nuk eshte i disponueshem', 'error');
    }
}

// Patch: Hook into refreshDashboard for features 21, 23
(function patchFeatures21to30() {
    // Initialize volumeDiscounts in state if missing
    if (!state.volumeDiscounts) {
        state.volumeDiscounts = [
            { minQty: 10, discountPct: 5 },
            { minQty: 20, discountPct: 10 },
            { minQty: 50, discountPct: 15 }
        ];
        // Don't saveState() here - this IIFE runs before loadState() and would overwrite backup data
    }

    // Patch refreshDashboard to trigger count-up and trend indicators
    if (typeof refreshDashboard === 'function') {
        const _origRD2 = refreshDashboard;
        refreshDashboard = function() {
            _origRD2.apply(this, arguments);
            setTimeout(() => {
                try { animateDashboardNumbers(); } catch(e) {}
                try { addTrendIndicators(); } catch(e) {}
            }, 50);
        };
    }

    // Patch recordSale / addSale to trigger big sale confetti
    if (typeof recordSale === 'function') {
        const _origRS = recordSale;
        recordSale = function() {
            const result = _origRS.apply(this, arguments);
            try {
                const lastSale = (state.sales || []).slice(-1)[0];
                if (lastSale && lastSale.sellTotal) checkBigSale(lastSale.sellTotal);
            } catch(e) {}
            return result;
        };
    }
})();

// ===================== FEATURE 11: DARK MODE TRANSITION ANIMATION =====================
function enhanceDarkModeToggle() {
    const originalToggle = toggleTheme;
    window.toggleTheme = function() {
        document.body.classList.add('theme-transitioning');
        originalToggle();
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 400);
    };
}

// Auto-enhance on load
enhanceDarkModeToggle();


// ===================== FEATURE 12: PIN PER FSHIRJE (PIN FOR DELETION) =====================
function requestPinForDelete(callback) {
    if (!state.deletePin) {
        state.deletePin = '1234';
        saveState();
    }
    const body = `
        <div style="text-align:center;padding:10px 0;">
            <p style="margin-bottom:12px;color:var(--text-secondary);">Fut PIN-in 4-shifror për të konfirmuar fshirjen:</p>
            <input type="password" id="delete-pin-input" maxlength="4" inputmode="numeric" pattern="[0-9]*"
                style="font-size:2em;letter-spacing:8px;text-align:center;width:130px;border:2px solid var(--primary);border-radius:8px;padding:8px;background:var(--bg-secondary);color:var(--text-primary);"
                placeholder="••••" autocomplete="off"/>
            <div id="delete-pin-error" style="color:var(--danger);margin-top:8px;min-height:18px;font-size:0.9em;"></div>
        </div>`;
    openModal('🔐 Konfirmo Fshirjen', body);
    setTimeout(() => {
        const input = document.getElementById('delete-pin-input');
        if (input) input.focus();
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.style.cssText = 'margin-top:12px;width:100%;';
        confirmBtn.textContent = 'Konfirmo Fshirjen';
        confirmBtn.onclick = function() {
            const entered = document.getElementById('delete-pin-input').value;
            if (entered === String(state.deletePin)) {
                document.querySelector('.modal-overlay')?.remove();
                callback();
            } else {
                document.getElementById('delete-pin-error').textContent = 'PIN i gabuar! Provo sërish.';
                document.getElementById('delete-pin-input').value = '';
                document.getElementById('delete-pin-input').focus();
            }
        };
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.appendChild(confirmBtn);
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') confirmBtn.click();
            });
        }
    }, 50);
}

function openChangePinModal() {
    if (!state.deletePin) state.deletePin = '1234';
    const body = `
        <div style="display:flex;flex-direction:column;gap:14px;padding:6px 0;">
            <div>
                <label style="font-weight:600;color:var(--text-primary);">PIN aktual:</label>
                <input type="password" id="current-pin" maxlength="4" inputmode="numeric"
                    style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:1.1em;letter-spacing:6px;text-align:center;background:var(--bg-secondary);color:var(--text-primary);"
                    placeholder="••••" autocomplete="off"/>
            </div>
            <div>
                <label style="font-weight:600;color:var(--text-primary);">PIN i ri:</label>
                <input type="password" id="new-pin" maxlength="4" inputmode="numeric"
                    style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:1.1em;letter-spacing:6px;text-align:center;background:var(--bg-secondary);color:var(--text-primary);"
                    placeholder="••••" autocomplete="off"/>
            </div>
            <div>
                <label style="font-weight:600;color:var(--text-primary);">Konfirmo PIN i ri:</label>
                <input type="password" id="confirm-new-pin" maxlength="4" inputmode="numeric"
                    style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:1.1em;letter-spacing:6px;text-align:center;background:var(--bg-secondary);color:var(--text-primary);"
                    placeholder="••••" autocomplete="off"/>
            </div>
            <div id="change-pin-error" style="color:var(--danger);font-size:0.9em;min-height:18px;"></div>
            <button class="btn btn-primary" onclick="submitChangePinModal()" style="width:100%;">Ndrysho PIN</button>
        </div>`;
    openModal('🔑 Ndrysho PIN Fshirjes', body);
}

function submitChangePinModal() {
    const current = document.getElementById('current-pin').value;
    const newPin = document.getElementById('new-pin').value;
    const confirm = document.getElementById('confirm-new-pin').value;
    const errEl = document.getElementById('change-pin-error');
    if (current !== String(state.deletePin)) {
        errEl.textContent = 'PIN aktual është i gabuar!';
        return;
    }
    if (!/^\d{4}$/.test(newPin)) {
        errEl.textContent = 'PIN i ri duhet të jetë 4 shifra!';
        return;
    }
    if (newPin !== confirm) {
        errEl.textContent = 'PIN-et e reja nuk përputhen!';
        return;
    }
    state.deletePin = newPin;
    saveState();
    document.querySelector('.modal-overlay')?.remove();
    showToast('PIN u ndryshua me sukses!', 'success');
    logActivity('settings', 'PIN fshirjes u ndryshua');
}

function pinProtectedAction(callback) {
    requestPinForDelete(callback);
}


// ===================== FEATURE 13: WHATSAPP GRUP RAPORT =====================
function sendGroupWhatsAppReport() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = (state.sales || []).filter(s => s.date === today);
    const totalRevenue = todaySales.reduce((sum, s) => sum + (s.sellTotal || 0), 0);
    const totalCost = todaySales.reduce((sum, s) => sum + (s.buyTotal || 0), 0);
    const profit = totalRevenue - totalCost;
    const ownerShare = typeof calcOwnerShare === 'function' ? calcOwnerShare(profit) : Math.round(profit * 0.5);
    const partnerShare = typeof calcPartnerShare === 'function' ? calcPartnerShare(profit) : Math.round(profit * 0.5);
    const partnerName = state.partnerName || 'Orhan';

    const todayPayments = (state.clientPayments || []).filter(p => (p.date || '').startsWith(today));
    const totalPayments = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Stock alerts
    const lowStock = PRODUCTS.filter(p => (state.stock[p.id] || 0) < 3);
    const stockAlert = lowStock.length > 0
        ? `⚠️ Stock i ulët: ${lowStock.map(p => p.name).join(', ')}`
        : '✅ Stock normal';

    // Top product today
    const prodSales = {};
    todaySales.forEach(s => {
        (s.items || [{ productId: s.productId, quantity: s.quantity }]).forEach(item => {
            prodSales[item.productId] = (prodSales[item.productId] || 0) + (item.quantity || 0);
        });
    });
    const topProdId = Object.keys(prodSales).sort((a, b) => prodSales[b] - prodSales[a])[0];
    const topProd = topProdId ? (PRODUCTS.find(p => p.id === topProdId) || {}).name || topProdId : 'N/A';

    const dateFormatted = new Date().toLocaleDateString('sq-MK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const report = [
        `🌴 *HURMA - Raporti Ditor*`,
        `📅 ${dateFormatted}`,
        ``,
        `💰 *Shitje sot:* ${todaySales.length} shitje`,
        `💵 *Xhiro:* ${totalRevenue} ден`,
        `📈 *Fitim neto:* ${profit} ден`,
        ``,
        `👤 *Elez (50%):* ${ownerShare} ден`,
        `🤝 *${partnerName} (50%):* ${partnerShare} ден`,
        ``,
        `💳 *Pagesa të marra:* ${totalPayments} ден`,
        ``,
        `🏆 *Produkti kryesor:* ${topProd}`,
        ``,
        stockAlert,
        ``,
        `_Raport automatik nga Hurma App_`
    ].join('\n');

    const encoded = encodeURIComponent(report);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    logActivity('report', 'WhatsApp grup raport u dërgua');
    showToast('Raporti u hap në WhatsApp!', 'success');
}


// ===================== FEATURE 14: KATALOG PRODUKTESH PDF =====================
function generateProductCatalog() {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        // Load jsPDF dynamically if not present
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => _buildProductCatalogPdf();
        script.onerror = () => showToast('Nuk u ngarkua jsPDF. Kontrollo lidhjen.', 'error');
        document.head.appendChild(script);
        showToast('Duke ngarkuar PDF bibliotekën...', 'info');
        return;
    }
    _buildProductCatalogPdf();
}

function _buildProductCatalogPdf() {
    try {
        const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const today = new Date().toLocaleDateString('sq-MK');

        // Header background
        doc.setFillColor(139, 90, 43);
        doc.rect(0, 0, pageW, 35, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('🌴 HURMA - Katalog Produktesh', pageW / 2, 15, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gjeneruar: ${today}`, pageW / 2, 25, { align: 'center' });

        // Table header
        let y = 45;
        doc.setFillColor(245, 235, 220);
        doc.rect(10, y - 6, pageW - 20, 10, 'F');
        doc.setTextColor(80, 50, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Produkti', 14, y);
        doc.text('Çmimi blerjes', 75, y);
        doc.text('Çmimi shitjes', 115, y);
        doc.text('Stoku', 155, y);
        doc.text('Kategoria', 175, y);

        y += 4;
        doc.setDrawColor(139, 90, 43);
        doc.line(10, y, pageW - 10, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        PRODUCTS.forEach((p, i) => {
            if (y > pageH - 25) {
                doc.addPage();
                y = 20;
            }
            const rowColor = i % 2 === 0 ? [255, 252, 248] : [245, 240, 235];
            doc.setFillColor(...rowColor);
            doc.rect(10, y - 5, pageW - 20, 9, 'F');

            doc.setTextColor(30, 30, 30);
            doc.text(String(p.name || ''), 14, y);
            doc.text(String(p.buyPrice || 0) + ' ден/kg', 75, y);
            doc.text(String(p.sellPrice || 0) + ' ден/kg', 115, y);
            const stockQty = state.stock[p.id] || 0;
            const stockColor = stockQty < 3 ? [200, 50, 50] : stockQty < 5 ? [180, 120, 0] : [30, 130, 60];
            doc.setTextColor(...stockColor);
            doc.text(String(stockQty) + ' kg', 155, y);
            doc.setTextColor(30, 30, 30);
            doc.text(p.category || 'Hurma', 175, y);
            y += 10;
        });

        // Footer
        doc.setFillColor(139, 90, 43);
        doc.rect(0, pageH - 14, pageW, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text('Hurma App - Katalog konfidencial', pageW / 2, pageH - 5, { align: 'center' });

        doc.save(`Katalog_Produktesh_${today.replace(/\./g, '-')}.pdf`);
        showToast('Katalogu PDF u gjenerua!', 'success');
        logActivity('export', 'Katalog produktesh PDF u krijua');
    } catch (e) {
        console.error('Catalog PDF error:', e);
        showToast('Gabim gjatë gjenerimit të katalogut: ' + e.message, 'error');
    }
}


// ===================== FEATURE 15: KOMISION SHITESI (SELLER COMMISSION) =====================
(function initSellerCommission() {
    if (state.sellerCommission === undefined || state.sellerCommission === null) {
        state.sellerCommission = 0;
        // Don't saveState() here - this IIFE runs before loadState() and would overwrite backup data
    }
})();

function calculateCommission(saleTotal) {
    const pct = parseFloat(state.sellerCommission) || 0;
    return Math.round((saleTotal * pct) / 100);
}

function openCommissionSettings() {
    const current = state.sellerCommission || 0;
    const body = `
        <div style="display:flex;flex-direction:column;gap:14px;padding:6px 0;">
            <p style="color:var(--text-secondary);font-size:0.95em;">Vendos përqindjen e komisionit për shitësin. Komisioni llogaritet si % e totalit të shitjes.</p>
            <div style="display:flex;align-items:center;gap:12px;">
                <label style="font-weight:600;color:var(--text-primary);min-width:80px;">Komision %:</label>
                <input type="number" id="commission-pct" min="0" max="100" step="0.5" value="${current}"
                    style="width:100px;padding:8px 12px;border:2px solid var(--primary);border-radius:8px;font-size:1.1em;background:var(--bg-secondary);color:var(--text-primary);"/>
            </div>
            <div id="commission-preview" style="background:var(--bg-secondary);border-radius:8px;padding:12px;font-size:0.95em;color:var(--text-secondary);">
                Shembull: shitje 1000 ден → komision <strong>${calculateCommission(1000)} ден</strong>
            </div>
            <button class="btn btn-primary" onclick="saveCommissionSettings()" style="width:100%;">💾 Ruaj Komisionin</button>
        </div>`;
    openModal('💼 Komision Shitësi', body);
    setTimeout(() => {
        const input = document.getElementById('commission-pct');
        if (input) {
            input.addEventListener('input', function() {
                const pct = parseFloat(this.value) || 0;
                const ex = Math.round(1000 * pct / 100);
                const preview = document.getElementById('commission-preview');
                if (preview) preview.innerHTML = `Shembull: shitje 1000 ден → komision <strong>${ex} ден</strong>`;
            });
        }
    }, 50);
}

function saveCommissionSettings() {
    const val = parseFloat(document.getElementById('commission-pct').value);
    if (isNaN(val) || val < 0 || val > 100) {
        showToast('Përqindja duhet të jetë 0-100!', 'error');
        return;
    }
    state.sellerCommission = val;
    saveState();
    document.querySelector('.modal-overlay')?.remove();
    showToast(`Komision ${val}% u ruajt!`, 'success');
    logActivity('settings', `Komision shitësi u vendos në ${val}%`);
}

function showCommissionReport() {
    const now = new Date();
    const monthStr = now.toISOString().substring(0, 7);
    const monthSales = (state.sales || []).filter(s => (s.date || '').startsWith(monthStr));
    const totalSellRevenue = monthSales.reduce((sum, s) => sum + (s.sellTotal || 0), 0);
    const totalCommission = calculateCommission(totalSellRevenue);
    const pct = state.sellerCommission || 0;

    const rows = monthSales.map(s => {
        const comm = calculateCommission(s.sellTotal || 0);
        return `<tr>
            <td style="padding:8px;">${s.date || ''}</td>
            <td style="padding:8px;">${((state.clients.find(c => c.id === s.clientId) || {}).name || 'N/A')}</td>
            <td style="padding:8px;text-align:right;">${(s.sellTotal || 0).toLocaleString()} ден</td>
            <td style="padding:8px;text-align:right;color:var(--success);font-weight:600;">${comm.toLocaleString()} ден</td>
        </tr>`;
    }).join('');

    const body = `
        <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                <div style="background:var(--bg-secondary);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:0.8em;color:var(--text-secondary);">Komision %</div>
                    <div style="font-size:1.8em;font-weight:700;color:var(--primary);">${pct}%</div>
                </div>
                <div style="background:var(--bg-secondary);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:0.8em;color:var(--text-secondary);">Xhiro muajore</div>
                    <div style="font-size:1.4em;font-weight:700;color:var(--text-primary);">${totalSellRevenue.toLocaleString()} ден</div>
                </div>
                <div style="background:var(--success);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:0.8em;color:rgba(255,255,255,0.85);">Total Komision</div>
                    <div style="font-size:1.8em;font-weight:700;color:#fff;">${totalCommission.toLocaleString()} ден</div>
                </div>
            </div>
            <div style="max-height:320px;overflow-y:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.9em;">
                    <thead>
                        <tr style="background:var(--primary);color:#fff;">
                            <th style="padding:8px;text-align:left;">Data</th>
                            <th style="padding:8px;text-align:left;">Klienti</th>
                            <th style="padding:8px;text-align:right;">Shitje</th>
                            <th style="padding:8px;text-align:right;">Komision</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--text-secondary);">Asnjë shitje këtë muaj</td></tr>'}</tbody>
                </table>
            </div>
            <button class="btn btn-secondary" onclick="openCommissionSettings()" style="width:100%;">⚙️ Ndrysho Komisionin</button>
        </div>`;
    openModal(`💼 Raport Komisionesh - ${monthStr}`, body);
}


// ===================== FEATURE 16: GARANCI PRODUKTI (PRODUCT WARRANTY TRACKING) =====================
function addWarranty(saleIndex) {
    const sale = (state.sales || [])[saleIndex];
    if (!sale) { showToast('Shitja nuk u gjet!', 'error'); return; }
    const existing = sale.warrantyDays || 0;
    const body = `
        <div style="display:flex;flex-direction:column;gap:14px;padding:6px 0;">
            <p style="color:var(--text-secondary);">Shitja: <strong>${((state.clients.find(c => c.id === sale.clientId) || {}).name || 'Pa klient')}</strong> - ${(getProduct(sale.productId) || {}).name || ''} - ${sale.date || ''}</p>
            <div style="display:flex;align-items:center;gap:12px;">
                <label style="font-weight:600;min-width:100px;">Ditë garancie:</label>
                <input type="number" id="warranty-days-input" min="0" max="3650" value="${existing}"
                    style="width:100px;padding:8px;border:2px solid var(--primary);border-radius:8px;font-size:1.1em;background:var(--bg-secondary);color:var(--text-primary);"/>
            </div>
            <p style="font-size:0.85em;color:var(--text-secondary);">Shembuj: 30 (1 muaj), 90 (3 muaj), 365 (1 vit)</p>
            <button class="btn btn-primary" onclick="saveWarranty(${saleIndex})" style="width:100%;">💾 Ruaj Garancinë</button>
        </div>`;
    openModal('🛡️ Shto Garanci', body);
}

function saveWarranty(saleIndex) {
    const days = parseInt(document.getElementById('warranty-days-input').value);
    if (isNaN(days) || days < 0) { showToast('Numri i ditëve është i pavlefshëm!', 'error'); return; }
    state.sales[saleIndex].warrantyDays = days;
    state.sales[saleIndex].warrantyStart = state.sales[saleIndex].date;
    saveState();
    document.querySelector('.modal-overlay')?.remove();
    showToast(`Garanci ${days} ditë u ruajt!`, 'success');
    logActivity('warranty', `Garanci ${days} ditë u shtua për shitjen ${saleIndex}`);
}

function showWarrantyTracker() {
    const today = new Date();
    const warranties = (state.sales || [])
        .map((s, i) => ({ ...s, _index: i }))
        .filter(s => s.warrantyDays > 0 && s.warrantyStart);

    if (warranties.length === 0) {
        openModal('🛡️ Gjurmues Garancie', '<p style="text-align:center;padding:30px;color:var(--text-secondary);">Asnjë garanci e regjistruar ende.<br><small>Shto garanci nga lista e shitjeve.</small></p>');
        return;
    }

    const rows = warranties.map(s => {
        const start = new Date(s.warrantyStart);
        const expiry = new Date(start);
        expiry.setDate(expiry.getDate() + s.warrantyDays);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        const isActive = daysLeft > 0;
        const statusColor = isActive ? (daysLeft <= 7 ? 'var(--warning)' : 'var(--success)') : 'var(--danger)';
        const statusText = isActive ? (daysLeft <= 7 ? `⚠️ ${daysLeft} ditë mbetur` : `✅ Aktive (${daysLeft} ditë)`) : '❌ Skaduar';
        return `<tr>
            <td style="padding:8px;">${((state.clients.find(c => c.id === s.clientId) || {}).name || 'Pa klient')} — ${(getProduct(s.productId) || {}).name || ''}</td>
            <td style="padding:8px;">${s.warrantyStart}</td>
            <td style="padding:8px;">${expiry.toISOString().split('T')[0]}</td>
            <td style="padding:8px;">${s.warrantyDays} ditë</td>
            <td style="padding:8px;"><span style="font-weight:600;color:${statusColor};">${statusText}</span></td>
            <td style="padding:8px;"><button class="btn btn-sm" style="padding:3px 8px;font-size:0.8em;" onclick="addWarranty(${s._index})">✏️</button></td>
        </tr>`;
    }).join('');

    const active = warranties.filter(s => {
        const exp = new Date(new Date(s.warrantyStart).getTime() + s.warrantyDays * 86400000);
        return exp > today;
    }).length;

    const body = `
        <div>
            <div style="display:flex;gap:10px;margin-bottom:14px;">
                <div style="background:var(--success);border-radius:8px;padding:10px 18px;color:#fff;text-align:center;">
                    <div style="font-size:0.8em;opacity:0.85;">Aktive</div>
                    <div style="font-size:1.6em;font-weight:700;">${active}</div>
                </div>
                <div style="background:var(--danger);border-radius:8px;padding:10px 18px;color:#fff;text-align:center;">
                    <div style="font-size:0.8em;opacity:0.85;">Skaduar</div>
                    <div style="font-size:1.6em;font-weight:700;">${warranties.length - active}</div>
                </div>
            </div>
            <div style="max-height:360px;overflow-y:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85em;">
                    <thead>
                        <tr style="background:var(--primary);color:#fff;">
                            <th style="padding:8px;">Klienti</th>
                            <th style="padding:8px;">Fillimi</th>
                            <th style="padding:8px;">Skadon</th>
                            <th style="padding:8px;">Ditë</th>
                            <th style="padding:8px;">Statusi</th>
                            <th style="padding:8px;"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    openModal('🛡️ Gjurmues Garancie', body);
}


// ===================== FEATURE 17: SMS TEMPLATE PER KLIENT =====================
function showSMSTemplates(clientId) {
    const client = (state.clients || []).find(c => c.id === clientId || c.id === String(clientId));
    const clientName = client ? client.name : 'Klienti';
    const ownerName = 'Elez';
    const shopName = 'Hurma Shop';
    const today = new Date().toLocaleDateString('sq-MK');

    const templates = [
        {
            icon: '💳',
            title: 'Kujtesë Pagese',
            text: `Pershendetje ${clientName}! Kemi vërejtur se keni një borxh të papaguar. Ju lutemi na kontaktoni për të rregulluar pagesat. Faleminderit! - ${ownerName}, ${shopName}`
        },
        {
            icon: '🙏',
            title: 'Falenderim',
            text: `Faleminderit shumë ${clientName} për blerjen tuaj! Shpresojmë të jeni të kënaqur me produktet tona. Na vizitoni sërish! - ${shopName}`
        },
        {
            icon: '🌴',
            title: 'Produkt i Ri',
            text: `Pershendetje ${clientName}! Kemi produkte të reja Hurma Medjool premium! Cilësi e shkëlqyer dhe çmim i mirë. Kontaktoni na sot! - ${ownerName}, ${shopName}`
        },
        {
            icon: '📦',
            title: 'Porosia Gati',
            text: `Pershendetje ${clientName}! Porosia juaj është gati dhe pret ju. Mund ta merrni sot gjatë orareve të punës. Faleminderit! - ${shopName}`
        },
        {
            icon: '🎉',
            title: 'Përshëndetje Festive',
            text: `${clientName}, ju urojmë festa të mbarë dhe lumturi! Shpresojmë që produktet tona Hurma t'i bëjnë festat tuaja edhe më të ëmbla! - ${shopName} (${today})`
        }
    ];

    const cards = templates.map((t, i) => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;background:var(--bg-secondary);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;color:var(--text-primary);">${t.icon} ${t.title}</span>
                <button class="btn btn-sm btn-secondary" onclick="copySmsTemplate(${i})" style="padding:4px 12px;font-size:0.85em;" id="copy-sms-btn-${i}">📋 Kopjo</button>
            </div>
            <p id="sms-template-${i}" style="font-size:0.88em;color:var(--text-secondary);line-height:1.5;margin:0;">${t.text}</p>
        </div>`).join('');

    openModal(`📱 Template SMS - ${clientName}`, `<div style="max-height:480px;overflow-y:auto;">${cards}</div>`);

    window._smsTemplates = templates;
}

function copySmsTemplate(index) {
    const templates = window._smsTemplates || [];
    const text = templates[index] ? templates[index].text : '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById(`copy-sms-btn-${index}`);
            if (btn) { btn.textContent = '✅ U kopjua!'; setTimeout(() => { btn.textContent = '📋 Kopjo'; }, 2000); }
            showToast('Teksti u kopjua!', 'success');
        }).catch(() => _fallbackCopySms(text, index));
    } else {
        _fallbackCopySms(text, index);
    }
}

function _fallbackCopySms(text, index) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        const btn = document.getElementById(`copy-sms-btn-${index}`);
        if (btn) { btn.textContent = '✅ U kopjua!'; setTimeout(() => { btn.textContent = '📋 Kopjo'; }, 2000); }
        showToast('Teksti u kopjua!', 'success');
    } catch(e) {
        showToast('Nuk u kopjua. Kopjoje manualisht.', 'error');
    }
    document.body.removeChild(ta);
}


// ===================== FEATURE 18: SKELETON LOADING EFFECT =====================
function showSkeletonLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const skeletonHtml = `
        <div class="skeleton-wrapper" id="skeleton-${containerId}">
            ${Array(5).fill(0).map(() => `
            <div class="skeleton-row">
                <div class="skeleton-block" style="width:40%;height:16px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:25%;height:16px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:20%;height:16px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:15%;height:16px;border-radius:4px;"></div>
            </div>`).join('')}
        </div>`;
    container.insertAdjacentHTML('afterbegin', skeletonHtml);
}

function hideSkeletonLoading(containerId) {
    const skeleton = document.getElementById(`skeleton-${containerId}`);
    if (skeleton) skeleton.remove();
}


// ===================== FEATURE 19: SWIPE TO DELETE (MOBILE) =====================
function initSwipeToDelete() {
    const tables = document.querySelectorAll('#sales-table tbody, #orders-table tbody');
    tables.forEach(tbody => {
        if (tbody.dataset.swipeInited) return;
        tbody.dataset.swipeInited = 'true';
        tbody.addEventListener('touchstart', _swipeTouchStart, { passive: true });
        tbody.addEventListener('touchmove', _swipeTouchMove, { passive: false });
        tbody.addEventListener('touchend', _swipeTouchEnd);
    });
}

let _swipeStartX = 0;
let _swipeStartY = 0;
let _swipeRow = null;

function _swipeTouchStart(e) {
    const row = e.target.closest('tr');
    if (!row) return;
    _swipeStartX = e.touches[0].clientX;
    _swipeStartY = e.touches[0].clientY;
    _swipeRow = row;
}

function _swipeTouchMove(e) {
    if (!_swipeRow) return;
    const dx = e.touches[0].clientX - _swipeStartX;
    const dy = Math.abs(e.touches[0].clientY - _swipeStartY);
    if (dy > 20) { _swipeRow = null; return; }
    if (dx < -40) {
        e.preventDefault();
        _swipeRow.classList.add('swipe-left-active');
    } else if (dx > 10) {
        _swipeRow.classList.remove('swipe-left-active');
    }
}

function _swipeTouchEnd(e) {
    if (!_swipeRow) return;
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    if (dx < -80) {
        _ensureSwipeDeleteBtn(_swipeRow);
    } else {
        _swipeRow.classList.remove('swipe-left-active');
    }
    _swipeRow = null;
}

function _ensureSwipeDeleteBtn(row) {
    if (row.querySelector('.swipe-delete-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'swipe-delete-btn';
    btn.innerHTML = '🗑️ Fshi';
    btn.onclick = function(e) {
        e.stopPropagation();
        row.classList.remove('swipe-left-active');
        btn.remove();
        // Trigger existing delete if data-index is available
        const deleteBtn = row.querySelector('[onclick*="delete"], [onclick*="Delete"], [onclick*="fshi"], [onclick*="Fshi"]');
        if (deleteBtn) {
            pinProtectedAction(() => deleteBtn.click());
        } else {
            showToast('Zgjidh rreshtin dhe fshi manualisht.', 'info');
        }
    };
    row.style.position = 'relative';
    row.appendChild(btn);
    setTimeout(() => {
        if (row.contains(btn)) {
            row.classList.remove('swipe-left-active');
            btn.remove();
        }
    }, 3000);
}

// Re-init swipe after page navigation
(function patchNavigateForSwipe() {
    if (typeof navigateTo === 'function') {
        const _orig = navigateTo;
        navigateTo = function(page) {
            _orig.apply(this, arguments);
            if (page === 'sales' || page === 'orders') {
                setTimeout(initSwipeToDelete, 300);
            }
        };
    }
})();


// ===================== FEATURE 20: NUMRA LIVE DASHBOARD (AUTO-REFRESH) =====================
let _dashboardRefreshInterval = null;

function startDashboardAutoRefresh() {
    stopDashboardAutoRefresh();
    _dashboardRefreshInterval = setInterval(function() {
        const activePage = document.querySelector('.page.active');
        if (activePage && activePage.id === 'page-dashboard') {
            try { refreshDashboard(); } catch(e) {}
        } else {
            stopDashboardAutoRefresh();
        }
    }, 30000);
}

function stopDashboardAutoRefresh() {
    if (_dashboardRefreshInterval) {
        clearInterval(_dashboardRefreshInterval);
        _dashboardRefreshInterval = null;
    }
}

// Patch navigateTo to start/stop auto-refresh on dashboard navigation
(function patchNavigateForAutoRefresh() {
    if (typeof navigateTo === 'function') {
        const _origNav = navigateTo;
        navigateTo = function(page) {
            _origNav.apply(this, arguments);
            if (page === 'dashboard') {
                startDashboardAutoRefresh();
            } else {
                stopDashboardAutoRefresh();
            }
        };
    }
})();


// ===================== FEATURE 21: AUTO-BACKUP CDON DITE NE JSON =====================

function downloadJSONBackup() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = 'hurma_backup_' + dateStr + '.json';
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    localStorage.setItem('hurma_last_auto_backup', dateStr);
    showToast('Backup u shkarkua: ' + filename, 'success');
    logActivity('backup', 'Backup automatik JSON u shkarkua: ' + filename);
}

function setupAutoBackup() {
    const today = new Date().toISOString().slice(0, 10);
    const lastBackup = localStorage.getItem('hurma_last_auto_backup');
    const hour = new Date().getHours();
    if (lastBackup !== today && hour >= 20) {
        setTimeout(() => {
            showToast('Duke bere backup automatik ditor...', 'info');
            downloadJSONBackup();
        }, 3000);
    }
}


// ===================== FEATURE 22: BACKUP NE EMAIL =====================

function sendBackupToEmail() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const subject = encodeURIComponent('Hurma Backup ' + dateStr);
    const instructions = 'Te dhenat e backup jane kopjuar me poshte. Kopjoni dhe ruani ne nje skedar .json';
    const body = encodeURIComponent(instructions + '\n\n[KLIKONI BUTONIN ME POSHTE PER TE KOPJUAR TE DHENAT]');
    const mailtoLink = 'mailto:?subject=' + subject + '&body=' + body;

    const backupData = JSON.stringify(state, null, 2);
    const sizeKB = Math.round(new TextEncoder().encode(backupData).length / 1024);

    openModal('Backup me Email', `
        <div style="text-align:center; padding:10px;">
            <p style="margin-bottom:12px;">Hap klientin e emailit dhe paste te dhenat manualisht.</p>
            <p style="color:#888; font-size:13px; margin-bottom:16px;">Madhesia e backup: <strong>${sizeKB} KB</strong></p>
            <a href="${mailtoLink}" target="_blank"
               style="display:inline-block; background:#2196F3; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-size:15px; margin-bottom:16px;">
               Hap Email Klientin
            </a>
            <br>
            <button onclick="
                navigator.clipboard.writeText(${JSON.stringify(backupData)}).then(()=>{
                    showToast('Te dhenat u kopjuan ne clipboard!', 'success');
                }).catch(()=>{
                    showToast('Clipboard nuk funksionoi. Provo manualisht.', 'error');
                });
            " style="background:#4CAF50; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-size:15px; cursor:pointer; margin-top:8px;">
               Kopjo te Dhenat e Backup
            </button>
            <p style="font-size:12px; color:#aaa; margin-top:16px;">Ruani te dhenat e kopjuara si skedar hurma_backup_${dateStr}.json</p>
        </div>
    `);
}


// ===================== FEATURE 23: EXPORT EXCEL JAVOR =====================

function setupWeeklyExcelExport() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    if (dayOfWeek !== 0) return;

    const weekKey = _getWeekKey(now);
    const lastExport = localStorage.getItem('hurma_last_weekly_export');
    if (lastExport === weekKey) return;

    setTimeout(() => {
        showToast('Exportim javor automatik po fillon...', 'info');
        try {
            masterExport();
            localStorage.setItem('hurma_last_weekly_export', weekKey);
            logActivity('export', 'Export Excel javor automatik u krye per javen ' + weekKey);
        } catch(e) {
            showToast('Exportimi javor deshtoi: ' + e.message, 'error');
        }
    }, 5000);
}

function manualWeeklyExport() {
    try {
        masterExport();
        const weekKey = _getWeekKey(new Date());
        localStorage.setItem('hurma_last_weekly_export', weekKey);
        showToast('Exportimi javor u krye me sukses!', 'success');
        logActivity('export', 'Export Excel javor manual u krye per javen ' + weekKey);
    } catch(e) {
        showToast('Exportimi deshtoi: ' + e.message, 'error');
    }
}

function _getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
    return d.toISOString().slice(0, 10);
}


// ===================== FEATURE 24: BACKUP ME 1-KLIK =====================

function oneClickBackup() {
    const backupData = JSON.stringify(state, null, 2);
    const bytes = new TextEncoder().encode(backupData).length;
    const sizeStr = bytes < 1024 * 1024
        ? Math.round(bytes / 1024) + ' KB'
        : (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    // Store for clipboard copy
    window._hurmaBackupClipboard = backupData;

    openModal('Backup me 1-Klik', `
        <div style="padding:8px;">
            <p style="text-align:center; color:#888; margin-bottom:20px;">
                Madhesia e te dhenave: <strong>${sizeStr}</strong>
            </p>
            <div style="display:flex; flex-direction:column; gap:14px;">
                <button onclick="downloadJSONBackup(); closeModal();"
                    style="background:#2196F3; color:#fff; border:none; padding:16px; border-radius:10px;
                           font-size:16px; cursor:pointer; display:flex; align-items:center; gap:12px;">
                    <span style="font-size:24px;">💾</span>
                    <span><strong>Shkarko JSON</strong><br><small style="opacity:.8;">Skedar backup i plote</small></span>
                </button>
                <button onclick="try{masterExport();}catch(e){showToast('Exportimi deshtoi','error');} closeModal();"
                    style="background:#4CAF50; color:#fff; border:none; padding:16px; border-radius:10px;
                           font-size:16px; cursor:pointer; display:flex; align-items:center; gap:12px;">
                    <span style="font-size:24px;">📊</span>
                    <span><strong>Shkarko Excel</strong><br><small style="opacity:.8;">Te gjitha te dhenat ne spreadsheet</small></span>
                </button>
                <button onclick="copyBackupToClipboard()"
                    style="background:#FF9800; color:#fff; border:none; padding:16px; border-radius:10px;
                           font-size:16px; cursor:pointer; display:flex; align-items:center; gap:12px;">
                    <span style="font-size:24px;">📋</span>
                    <span><strong>Kopjo ne Clipboard</strong><br><small style="opacity:.8;">Per paste manual</small></span>
                </button>
            </div>
        </div>
    `);
}

function copyBackupToClipboard() {
    const data = window._hurmaBackupClipboard || JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(data).then(() => {
        showToast('Te dhenat u kopjuan ne clipboard!', 'success');
        closeModal();
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = data;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Te dhenat u kopjuan!', 'success');
        closeModal();
    });
}


// ===================== FEATURE 25: DOUBLE-SAVE (localStorage + IndexedDB) =====================

function _openHurmaDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('HurmaDB', 1);
        req.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('state')) {
                db.createObjectStore('state');
            }
        };
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
    });
}

function saveToIndexedDB() {
    _openHurmaDB().then(db => {
        const tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put(JSON.parse(JSON.stringify(state)), 'main');
        tx.oncomplete = function() { db.close(); };
        tx.onerror = function(e) { console.warn('IndexedDB save error:', e.target.error); };
    }).catch(e => console.warn('IndexedDB open error:', e));
}

function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
        _openHurmaDB().then(db => {
            const tx = db.transaction('state', 'readonly');
            const req = tx.objectStore('state').get('main');
            req.onsuccess = function(e) {
                db.close();
                resolve(e.target.result || null);
            };
            req.onerror = function(e) { db.close(); reject(e.target.error); };
        }).catch(reject);
    });
}

function recoverFromIndexedDB() {
    loadFromIndexedDB().then(saved => {
        if (!saved) {
            showToast('Nuk u gjet asnje backup ne IndexedDB.', 'warning');
            return;
        }
        const keys = Object.keys(saved);
        openModal('Rimorro nga IndexedDB', `
            <p>U gjet nje backup ne IndexedDB me <strong>${keys.length}</strong> fusha.</p>
            <p>Shitjet: <strong>${(saved.sales||[]).length}</strong>,
               Klientet: <strong>${(saved.clients||[]).length}</strong>,
               Pagesat: <strong>${(saved.clientPayments||[]).length}</strong></p>
            <p style="color:#e74c3c; margin-top:12px;">Kjo do te zevendesoje te dhenat aktuale!</p>
            <div style="display:flex; gap:10px; margin-top:16px; justify-content:flex-end;">
                <button onclick="document.getElementById('hurma-modal')?.remove();"
                    style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Anulo</button>
                <button onclick="
                    Object.keys(state).forEach(k => delete state[k]);
                    Object.assign(state, window._idbRecoveryData);
                    if (!state.activityLog) state.activityLog = [];
                    logActivity('recovery','Rikuperim i te dhenave nga IndexedDB');
                    saveState();
                    showToast('Te dhenat u rimorran! Faqja po ringarkohet...','success');
                    document.getElementById('hurma-modal')?.remove();
                    setTimeout(() => location.reload(), 1000);
                " style="background:#e74c3c; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Rimorro</button>
            </div>
        `);
        window._idbRecoveryData = saved;
    }).catch(e => showToast('Gabim ne leximin e IndexedDB: ' + e.message, 'error'));
}

// Patch saveState to also save to IndexedDB
(function patchSaveStateForIndexedDB() {
    const _origSaveState = saveState;
    saveState = function() {
        _origSaveState.apply(this, arguments);
        saveToIndexedDB();
        checkStorageSpace();
    };
})();


// ===================== FEATURE 26: KOMPRESIM I TE DHENAVE =====================

function getStateSize() {
    const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function _getStateSizeBytes() {
    return new TextEncoder().encode(JSON.stringify(state)).length;
}

function compressOldData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    const oldSales = (state.sales || []).filter(s => (s.date || '') < cutoff);
    const keepSales = (state.sales || []).filter(s => (s.date || '') >= cutoff);

    if (oldSales.length === 0) {
        showToast('Nuk ka shitje me te vjetra se 6 muaj per te arkivuar.', 'info');
        return;
    }

    const totalOld = oldSales.reduce((s, x) => s + (x.sellTotal || 0), 0);
    const profitOld = oldSales.reduce((s, x) => s + (x.profit || 0), 0);

    openModal('Kompreso te Dhenat e Vjetra', `
        <p>Gjenden <strong>${oldSales.length}</strong> shitje para ${cutoff}.</p>
        <p>Totali: <strong>${totalOld.toFixed(2)} MKD</strong>, Fitimi: <strong>${profitOld.toFixed(2)} MKD</strong></p>
        <p style="color:#e67e22; margin-top:8px;">Keto shitje do te zhvendosen ne arkiv (nuk fshihen, ruhen si permbledhje).</p>
        <div style="display:flex; gap:10px; margin-top:16px; justify-content:flex-end;">
            <button onclick="document.getElementById('hurma-modal')?.remove();"
                style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Anulo</button>
            <button onclick="
                if (!state.archivedSales) state.archivedSales = [];
                state.archivedSales = state.archivedSales.concat(window._oldSalesBuffer);
                state.sales = window._keepSalesBuffer;
                saveState();
                showToast('${oldSales.length} shitje u arkivuan me sukses!','success');
                logActivity('archive','Kompresi: ' + window._oldSalesBuffer.length + ' shitje u arkivuan');
                document.getElementById('hurma-modal')?.remove();
            " style="background:#e67e22; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Arkivo</button>
        </div>
    `);
    window._oldSalesBuffer = oldSales;
    window._keepSalesBuffer = keepSales;
}


// ===================== FEATURE 27: ALERT KUR MBUSHET HAPESIRA =====================

function checkStorageSpace() {
    try {
        const used = Object.keys(localStorage).reduce((total, key) => {
            return total + (localStorage.getItem(key) || '').length * 2;
        }, 0);
        const usedKB = Math.round(used / 1024);

        // Try to detect quota by attempting a test write
        let quotaKB = 5120; // default 5MB estimate
        try {
            const testKey = '__hurma_quota_test__';
            const chunk = 'x'.repeat(1024); // 1KB
            let written = 0;
            try {
                while (written < 10240) { // up to 10MB test
                    localStorage.setItem(testKey + written, chunk);
                    written += 1;
                }
                quotaKB = usedKB + written;
            } catch(e) {
                // quota exceeded during test
                quotaKB = usedKB + written;
            } finally {
                // Always clean up ALL test keys
                const testKeys = Object.keys(localStorage).filter(k => k.startsWith('__hurma_quota_test__'));
                testKeys.forEach(k => localStorage.removeItem(k));
            }
        } catch(e) {
            // outer error
        }

        const pct = Math.min(100, Math.round((usedKB / quotaKB) * 100));

        if (pct >= 90) {
            openModal('Hapesira e Plote! ⚠️', `
                <p style="color:#e74c3c; font-weight:bold;">Hapesira e ruajtjes eshte ${pct}% e mbushur (${usedKB} KB)!</p>
                <p style="margin:12px 0;">Ndermerni veprim menjehere per te shmangur humbjen e te dhenave.</p>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
                    <button onclick="archiveOldData(); document.getElementById('hurma-modal')?.remove();"
                        style="background:#e67e22; color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer; font-size:15px;">
                        Arkivo te Dhenat e Vjetra
                    </button>
                    <button onclick="downloadJSONBackup(); document.getElementById('hurma-modal')?.remove();"
                        style="background:#2196F3; color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer; font-size:15px;">
                        Shkarko Backup JSON
                    </button>
                </div>
            `);
        } else if (pct >= 80) {
            showToast('⚠️ Hapesira e ruajtjes ' + pct + '% e mbushur (' + usedKB + ' KB). Beni backup!', 'warning');
        }
    } catch(e) {
        console.warn('checkStorageSpace error:', e);
    }
}


// ===================== FEATURE 28: ARKIVO TE DHENAT E VJETRA =====================

function archiveOldData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    const oldSales = (state.sales || []).filter(s => (s.date || '') < cutoff);
    const oldPayments = (state.clientPayments || []).filter(p => (p.date || '') < cutoff);
    const oldActivities = (state.activityLog || []).filter(a => (a.date || a.timestamp || '').slice(0,10) < cutoff);

    const totalCount = oldSales.length + oldPayments.length + oldActivities.length;
    if (totalCount === 0) {
        showToast('Nuk ka te dhena me te vjetra se 6 muaj per te arkivuar.', 'info');
        return;
    }

    openModal('Arkivo te Dhenat e Vjetra', `
        <p>Gjenden te dhena per arkivim:</p>
        <ul style="margin:12px 0 12px 20px;">
            <li>Shitje: <strong>${oldSales.length}</strong></li>
            <li>Pagesa: <strong>${oldPayments.length}</strong></li>
            <li>Aktivitete: <strong>${oldActivities.length}</strong></li>
        </ul>
        <p style="color:#e67e22;">Keto do te zhvendosen ne arkiv (mund te rikthehen me vone).</p>
        <div style="display:flex; gap:10px; margin-top:16px; justify-content:flex-end;">
            <button onclick="document.getElementById('hurma-modal')?.remove();"
                style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Anulo</button>
            <button onclick="_doArchiveOldData(); document.getElementById('hurma-modal')?.remove();"
                style="background:#e67e22; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Arkivo</button>
        </div>
    `);
}

function _doArchiveOldData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    if (!state.archive) state.archive = { sales: [], payments: [], activities: [], archivedAt: [] };

    const oldSales = (state.sales || []).filter(s => (s.date || '') < cutoff);
    const oldPayments = (state.clientPayments || []).filter(p => (p.date || '') < cutoff);
    const oldActivities = (state.activityLog || []).filter(a => (a.date || a.timestamp || '').slice(0,10) < cutoff);

    // Calculate summary stats before archiving
    const salesSummary = {
        count: oldSales.length,
        total: oldSales.reduce((s, x) => s + (x.sellTotal || 0), 0),
        profit: oldSales.reduce((s, x) => s + (x.profit || 0), 0),
        periodStart: oldSales.length ? oldSales.reduce((m, x) => x.date < m ? x.date : m, oldSales[0].date) : null,
        periodEnd: cutoff
    };

    state.archive.sales = state.archive.sales.concat(oldSales);
    state.archive.payments = state.archive.payments.concat(oldPayments);
    state.archive.activities = state.archive.activities.concat(oldActivities);
    state.archive.archivedAt.push({ date: new Date().toISOString(), salesSummary });

    state.sales = (state.sales || []).filter(s => (s.date || '') >= cutoff);
    state.clientPayments = (state.clientPayments || []).filter(p => (p.date || '') >= cutoff);
    state.activityLog = (state.activityLog || []).filter(a => (a.date || a.timestamp || '').slice(0,10) >= cutoff);

    saveState();
    showToast('Arkivimi u krye: ' + oldSales.length + ' shitje, ' + oldPayments.length + ' pagesa, ' + oldActivities.length + ' aktivitete.', 'success');
    logActivity('archive', 'Arkivim: ' + oldSales.length + ' shitje, ' + oldPayments.length + ' pagesa u arkivuan');
}

function viewArchive() {
    if (!state.archive || (state.archive.sales.length === 0 && state.archive.payments.length === 0)) {
        showToast('Arkivi eshte bosh.', 'info');
        return;
    }
    const a = state.archive;
    const totalSales = a.sales.reduce((s, x) => s + (x.sellTotal || 0), 0);
    const totalProfit = a.sales.reduce((s, x) => s + (x.profit || 0), 0);
    const totalPayments = a.payments.reduce((s, x) => s + (x.amount || 0), 0);

    openModal('Arkivi i te Dhenave', `
        <div style="padding:4px;">
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:16px;">
                <div style="background:#f0f4ff; border-radius:8px; padding:12px; text-align:center;">
                    <div style="font-size:22px; font-weight:bold;">${a.sales.length}</div>
                    <div style="font-size:12px; color:#888;">Shitje</div>
                </div>
                <div style="background:#f0fff4; border-radius:8px; padding:12px; text-align:center;">
                    <div style="font-size:22px; font-weight:bold;">${a.payments.length}</div>
                    <div style="font-size:12px; color:#888;">Pagesa</div>
                </div>
                <div style="background:#fff8f0; border-radius:8px; padding:12px; text-align:center;">
                    <div style="font-size:22px; font-weight:bold;">${a.activities.length}</div>
                    <div style="font-size:12px; color:#888;">Aktivitete</div>
                </div>
            </div>
            <p>Totali shitjeve: <strong>${totalSales.toFixed(2)} MKD</strong></p>
            <p>Fitimi total: <strong>${totalProfit.toFixed(2)} MKD</strong></p>
            <p>Pagesat totale: <strong>${totalPayments.toFixed(2)} MKD</strong></p>
            <div style="display:flex; gap:10px; margin-top:16px; justify-content:flex-end;">
                <button onclick="restoreFromArchive(); document.getElementById('hurma-modal')?.remove();"
                    style="background:#4CAF50; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">
                    Rikthe te Dhenat
                </button>
                <button onclick="document.getElementById('hurma-modal')?.remove();"
                    style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Mbyll</button>
            </div>
        </div>
    `);
}

function restoreFromArchive() {
    if (!state.archive || (state.archive.sales.length === 0 && state.archive.payments.length === 0)) {
        showToast('Nuk ka te dhena per te rikthyer.', 'info');
        return;
    }
    const a = state.archive;
    openModal('Rikthe nga Arkivi', `
        <p>Do te rikthehen:</p>
        <ul style="margin:12px 0 12px 20px;">
            <li><strong>${a.sales.length}</strong> shitje</li>
            <li><strong>${a.payments.length}</strong> pagesa</li>
            <li><strong>${a.activities.length}</strong> aktivitete</li>
        </ul>
        <p style="color:#e74c3c;">Keto do te shtohen tek te dhenat aktuale.</p>
        <div style="display:flex; gap:10px; margin-top:16px; justify-content:flex-end;">
            <button onclick="document.getElementById('hurma-modal')?.remove();"
                style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Anulo</button>
            <button onclick="
                state.sales = (state.sales || []).concat(state.archive.sales || []);
                state.clientPayments = (state.clientPayments || []).concat(state.archive.payments || []);
                state.activityLog = (state.activityLog || []).concat(state.archive.activities || []);
                state.archive = { sales: [], payments: [], activities: [], archivedAt: [] };
                saveState();
                refreshAll();
                showToast('Te dhenat u rikthyen nga arkivi!','success');
                logActivity('restore','Rikthim i te dhenave nga arkivi');
                document.getElementById('hurma-modal')?.remove();
            " style="background:#4CAF50; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Rikthe</button>
        </div>
    `);
}


// ===================== FEATURE 29: PASTRO DUPLIKATET =====================

function findDuplicates() {
    const sales = state.sales || [];
    const clients = state.clients || [];
    const payments = state.clientPayments || [];

    // Find duplicate sales: same date + clientId + total
    const saleDupMap = {};
    sales.forEach((s, i) => {
        const key = (s.date || '') + '|' + (s.clientId || '') + '|' + (s.sellTotal || 0);
        if (!saleDupMap[key]) saleDupMap[key] = [];
        saleDupMap[key].push(i);
    });
    const dupSaleGroups = Object.values(saleDupMap).filter(g => g.length > 1);

    // Find duplicate clients: same name (case-insensitive)
    const clientNameMap = {};
    clients.forEach((c, i) => {
        const key = (c.name || '').toLowerCase().trim();
        if (!clientNameMap[key]) clientNameMap[key] = [];
        clientNameMap[key].push(i);
    });
    const dupClientGroups = Object.values(clientNameMap).filter(g => g.length > 1);

    // Find duplicate payments: same date + clientId + amount
    const payDupMap = {};
    payments.forEach((p, i) => {
        const key = (p.date || '') + '|' + (p.clientId || '') + '|' + (p.amount || 0);
        if (!payDupMap[key]) payDupMap[key] = [];
        payDupMap[key].push(i);
    });
    const dupPayGroups = Object.values(payDupMap).filter(g => g.length > 1);

    const totalDups = dupSaleGroups.reduce((s, g) => s + g.length - 1, 0)
                    + dupClientGroups.reduce((s, g) => s + g.length - 1, 0)
                    + dupPayGroups.reduce((s, g) => s + g.length - 1, 0);

    if (totalDups === 0) {
        showToast('Nuk u gjet asnje duplikat!', 'success');
        return;
    }

    let rows = '';

    dupSaleGroups.forEach(group => {
        const s = sales[group[0]];
        const clientName = (clients.find(c => c.id === s.clientId) || {}).name || s.clientId || 'I panjohur';
        group.slice(1).forEach(idx => {
            rows += `<tr>
                <td>Shitje</td>
                <td>${s.date || '-'}</td>
                <td>${clientName}</td>
                <td>${(s.sellTotal || 0)} den</td>
                <td><button onclick="_deleteDupSale(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">Fshi</button></td>
            </tr>`;
        });
    });

    dupClientGroups.forEach(group => {
        const c = clients[group[0]];
        group.slice(1).forEach(idx => {
            rows += `<tr>
                <td>Klient</td>
                <td>-</td>
                <td>${(clients[idx] || {}).name || '-'}</td>
                <td>-</td>
                <td><button onclick="_deleteDupClient(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">Fshi</button></td>
            </tr>`;
        });
    });

    dupPayGroups.forEach(group => {
        const p = payments[group[0]];
        const clientName = (clients.find(c => c.id === p.clientId) || {}).name || p.clientId || 'I panjohur';
        group.slice(1).forEach(idx => {
            rows += `<tr>
                <td>Pagese</td>
                <td>${p.date || '-'}</td>
                <td>${clientName}</td>
                <td>${(p.amount || 0).toFixed(2)} MKD</td>
                <td><button onclick="_deleteDupPayment(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">Fshi</button></td>
            </tr>`;
        });
    });

    openModal('Duplikate te Gjetura (' + totalDups + ')', `
        <p style="margin-bottom:12px; color:#e74c3c;">U gjet <strong>${totalDups}</strong> te dhena te dyfishtme.</p>
        <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:8px; text-align:left;">Lloji</th>
                    <th style="padding:8px; text-align:left;">Data</th>
                    <th style="padding:8px; text-align:left;">Klienti</th>
                    <th style="padding:8px; text-align:left;">Shuma</th>
                    <th style="padding:8px; text-align:left;">Veprim</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>
        <div style="margin-top:16px; text-align:right;">
            <button onclick="document.getElementById('hurma-modal')?.remove();"
                style="background:#ccc; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">Mbyll</button>
        </div>
    `);
}

function _deleteDupSale(idx) {
    if (!confirm('Fshi kete shitje duplikate?')) return;
    state.sales.splice(idx, 1);
    saveState();
    showToast('Shitja duplikate u fshi.', 'success');
    document.getElementById('hurma-modal')?.remove();
    findDuplicates();
}

function _deleteDupClient(idx) {
    if (!confirm('Fshi kete klient duplikat?')) return;
    state.clients.splice(idx, 1);
    saveState();
    showToast('Klienti duplikat u fshi.', 'success');
    document.getElementById('hurma-modal')?.remove();
    findDuplicates();
}

function _deleteDupPayment(idx) {
    if (!confirm('Fshi kete pagese duplikate?')) return;
    state.clientPayments.splice(idx, 1);
    saveState();
    showToast('Pagesa duplikate u fshi.', 'success');
    document.getElementById('hurma-modal')?.remove();
    findDuplicates();
}


// ===================== FEATURE 30: DASHBOARD I HAPESIRES =====================

function showStorageDashboard() {
    const calcBytes = (data) => new TextEncoder().encode(JSON.stringify(data)).length;

    const salesBytes = calcBytes(state.sales || []);
    const clientsBytes = calcBytes(state.clients || []);
    const paymentsBytes = calcBytes(state.clientPayments || []);
    const activitiesBytes = calcBytes(state.activityLog || []);
    const ordersBytes = calcBytes(state.orders || []);
    const archiveBytes = calcBytes(state.archive || {});
    const archivedSalesBytes = calcBytes(state.archivedSales || []);
    const otherBytes = calcBytes(state) - salesBytes - clientsBytes - paymentsBytes - activitiesBytes - ordersBytes - archiveBytes;

    const totalBytes = calcBytes(state);

    // localStorage total usage
    let lsUsed = 0;
    try {
        lsUsed = Object.keys(localStorage).reduce((t, k) => t + (localStorage.getItem(k) || '').length * 2, 0);
    } catch(e) {}

    const fmt = (b) => b < 1024 ? b + ' B' : b < 1024*1024 ? Math.round(b/1024) + ' KB' : (b/(1024*1024)).toFixed(2) + ' MB';
    const pct = (b) => Math.min(100, Math.round((b / totalBytes) * 100));

    const bar = (b, color) => {
        const p = pct(b);
        return `<div style="background:#eee; border-radius:4px; height:8px; margin-top:4px;">
            <div style="background:${color}; width:${p}%; height:8px; border-radius:4px;"></div>
        </div>`;
    };

    const lsPct = Math.min(100, Math.round((lsUsed / (5 * 1024 * 1024)) * 100));
    const lsColor = lsPct >= 90 ? '#e74c3c' : lsPct >= 70 ? '#e67e22' : '#4CAF50';

    openModal('Dashboard i Hapesires', `
        <div style="padding:4px;">
            <div style="background:#f8f9fa; border-radius:10px; padding:14px; margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong>Hapesira totale e localStorage</strong>
                    <span style="color:${lsColor}; font-weight:bold;">${lsPct}%</span>
                </div>
                <div style="background:#eee; border-radius:6px; height:12px;">
                    <div style="background:${lsColor}; width:${lsPct}%; height:12px; border-radius:6px; transition:width 0.3s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px; color:#888;">
                    <span>Te perdorura: ${fmt(lsUsed)}</span>
                    <span>Kuota: ~5 MB</span>
                </div>
            </div>

            <p style="font-weight:bold; margin-bottom:10px;">Breakdown sipas llojit:</p>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                ${[
                    ['Shitje', salesBytes, '#2196F3', (state.sales||[]).length],
                    ['Klientet', clientsBytes, '#4CAF50', (state.clients||[]).length],
                    ['Pagesat', paymentsBytes, '#FF9800', (state.clientPayments||[]).length],
                    ['Aktivitetet', activitiesBytes, '#9C27B0', (state.activityLog||[]).length],
                    ['Porositë', ordersBytes, '#00BCD4', (state.orders||[]).length],
                    ['Arkivi', archiveBytes + archivedSalesBytes, '#795548', ((state.archive||{}).sales||[]).length + (state.archivedSales||[]).length],
                    ['Tjeter', Math.max(0, otherBytes), '#607D8B', '-']
                ].map(([label, bytes, color, count]) => `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:13px;">
                            <span>${label} <span style="color:#888;">(${count} rekorde)</span></span>
                            <span style="font-weight:bold;">${fmt(bytes)}</span>
                        </div>
                        ${bar(bytes, color)}
                    </div>
                `).join('')}
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button onclick="archiveOldData(); document.getElementById('hurma-modal')?.remove();"
                    style="background:#e67e22; color:#fff; border:none; padding:10px; border-radius:8px; cursor:pointer; font-size:13px;">
                    Arkivo te Vjetrat
                </button>
                <button onclick="downloadJSONBackup(); document.getElementById('hurma-modal')?.remove();"
                    style="background:#2196F3; color:#fff; border:none; padding:10px; border-radius:8px; cursor:pointer; font-size:13px;">
                    Shkarko Backup
                </button>
                <button onclick="findDuplicates(); document.getElementById('hurma-modal')?.remove();"
                    style="background:#9C27B0; color:#fff; border:none; padding:10px; border-radius:8px; cursor:pointer; font-size:13px;">
                    Pastro Duplikate
                </button>
                <button onclick="oneClickBackup(); document.getElementById('hurma-modal')?.remove();"
                    style="background:#4CAF50; color:#fff; border:none; padding:10px; border-radius:8px; cursor:pointer; font-size:13px;">
                    Backup 1-Klik
                </button>
            </div>
        </div>
    `);
}


// ===================== INIT FEATURES 21-30 =====================
(function initStorageFeatures() {
    // Run after DOM and state are loaded
    const _origInitAfterAuth = typeof initAfterAuth === 'function' ? initAfterAuth : null;
    // Setup auto-backup and weekly export checks via a post-init hook
    window.addEventListener('load', function() {
        setTimeout(function() {
            try { setupAutoBackup(); } catch(e) { console.warn('setupAutoBackup error:', e); }
            try { setupWeeklyExcelExport(); } catch(e) { console.warn('setupWeeklyExcelExport error:', e); }
            // Ensure archive objects exist
            if (!state.archive) state.archive = { sales: [], payments: [], activities: [], archivedAt: [] };
            if (!state.archivedSales) state.archivedSales = [];
        }, 2000);
    });
})();


// ===================== FEATURE 11: VERSIONING (30 versione) =====================

function saveVersion() {
    const MAX_VERSIONS = 30;
    let idx = parseInt(localStorage.getItem('hurma_version_index') || '0', 10);
    const snapshot = {
        timestamp: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(state))
    };
    localStorage.setItem('hurma_version_' + idx, JSON.stringify(snapshot));
    idx = (idx + 1) % MAX_VERSIONS;
    localStorage.setItem('hurma_version_index', String(idx));
    showToast('Version i ruajtur (#' + ((idx === 0 ? MAX_VERSIONS : idx) - 1) + ')', 'success');
    logActivity('version', 'Version i ri i ruajtur');
}

function showVersionHistory() {
    const MAX_VERSIONS = 30;
    let rows = '';
    let count = 0;
    for (let i = 0; i < MAX_VERSIONS; i++) {
        const raw = localStorage.getItem('hurma_version_' + i);
        if (!raw) continue;
        try {
            const snap = JSON.parse(raw);
            const dt = new Date(snap.timestamp);
            const label = dt.toLocaleDateString('sq-AL') + ' ' + dt.toLocaleTimeString('sq-AL');
            const salesCount = Array.isArray(snap.data.sales) ? snap.data.sales.length : '?';
            rows += `<tr>
                <td style="padding:8px 12px;">${i}</td>
                <td style="padding:8px 12px;">${label}</td>
                <td style="padding:8px 12px;">${salesCount} shitje</td>
                <td style="padding:8px 12px;">
                    <button onclick="restoreVersion(${i})" style="background:#4CAF50;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Rikthe</button>
                </td>
            </tr>`;
            count++;
        } catch(e) {}
    }
    if (count === 0) {
        rows = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#888;">Nuk ka versione të ruajtura ende.</td></tr>';
    }
    openModal('Historiku i Versioneve', `
        <p style="margin-bottom:12px;color:#666;">Maksimumi 30 versione ruhen me rotacion.</p>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="padding:8px 12px;text-align:left;">#</th>
                        <th style="padding:8px 12px;text-align:left;">Data & Ora</th>
                        <th style="padding:8px 12px;text-align:left;">Permbajtja</th>
                        <th style="padding:8px 12px;text-align:left;">Veprim</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
            <button onclick="saveVersion()" style="background:#2196F3;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;">Ruaj Version Tani</button>
        </div>
    `);
}

function restoreVersion(n) {
    const raw = localStorage.getItem('hurma_version_' + n);
    if (!raw) { showToast('Versioni nuk u gjet!', 'error'); return; }
    if (!confirm('A jeni i sigurt? Të dhënat aktuale do të zëvendësohen me versionin e zgjedhur.')) return;
    try {
        const snap = JSON.parse(raw);
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, snap.data);
        if (!state.activityLog) state.activityLog = [];
        logActivity('version', 'Version #' + n + ' u rikthye');
        saveState();
        showToast('Versioni u rikthye me sukses!', 'success');
        document.getElementById('hurma-modal')?.remove();
        setTimeout(() => location.reload(), 800);
    } catch(e) {
        showToast('Gabim gjatë rikthimit: ' + e.message, 'error');
    }
}


// ===================== FEATURE 12: ENKRIPTIM I TE DHENAVE =====================

function encryptData(data, password) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
}

function decryptData(encrypted, password) {
    const str = decodeURIComponent(escape(atob(encrypted)));
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return result;
}

function openEncryptBackupModal() {
    openModal('Backup i Enkriptuar', `
        <p style="margin-bottom:12px;color:#666;">Vendosni një fjalëkalim për të enkriptuar backup-in tuaj.</p>
        <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Fjalëkalimi:</label>
            <input type="password" id="enc-password" placeholder="Fjalëkalimi i enkriptimit..."
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Konfirmo fjalëkalimin:</label>
            <input type="password" id="enc-password-confirm" placeholder="Konfirmo fjalëkalimin..."
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <button onclick="_doEncryptDownload()" style="background:#4CAF50;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;">
            Shkarko Backup të Enkriptuar
        </button>
    `);
}

function _doEncryptDownload() {
    const pw = document.getElementById('enc-password')?.value || '';
    const pw2 = document.getElementById('enc-password-confirm')?.value || '';
    if (!pw || pw.length < 4) { showToast('Fjalëkalimi duhet të jetë të paktën 4 karaktere!', 'error'); return; }
    if (pw !== pw2) { showToast('Fjalëkalimet nuk përputhen!', 'error'); return; }
    const encrypted = encryptData(JSON.stringify(state), pw);
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hurma_backup_enkriptuar_' + new Date().toISOString().slice(0, 10) + '.enc';
    a.click();
    URL.revokeObjectURL(url);
    state.autoBackup = state.autoBackup || {};
    state.autoBackup.lastBackup = new Date().toISOString();
    saveState();
    logActivity('backup', 'Backup i enkriptuar u shkarkua');
    showToast('Backup i enkriptuar u shkarkua!', 'success');
    document.getElementById('hurma-modal')?.remove();
}

function openDecryptRestoreModal() {
    openModal('Rikthe nga Backup i Enkriptuar', `
        <p style="margin-bottom:12px;color:#666;">Ngarkoni skedarin .enc dhe vendosni fjalëkalimin për rikthim.</p>
        <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Skedari .enc:</label>
            <input type="file" id="enc-file-input" accept=".enc,.txt"
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Fjalëkalimi:</label>
            <input type="password" id="dec-password" placeholder="Fjalëkalimi i enkriptimit..."
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <button onclick="_doDecryptRestore()" style="background:#2196F3;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;">
            Deshifroje dhe Rikthe
        </button>
    `);
}

function _doDecryptRestore() {
    const fileInput = document.getElementById('enc-file-input');
    const pw = document.getElementById('dec-password')?.value || '';
    if (!fileInput || !fileInput.files[0]) { showToast('Zgjidhni një skedar!', 'error'); return; }
    if (!pw) { showToast('Vendosni fjalëkalimin!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const decrypted = decryptData(e.target.result.trim(), pw);
            const data = JSON.parse(decrypted);
            if (!data.sales && !data.clients && !data.stock) throw new Error('Te dhena te pavlefshme');
            if (!confirm('A jeni i sigurt? Të dhënat aktuale do të zëvendësohen.')) return;
            Object.keys(state).forEach(k => delete state[k]);
            Object.assign(state, data);
            if (!state.activityLog) state.activityLog = [];
            logActivity('backup', 'Rikthim nga backup i enkriptuar');
            saveState();
            showToast('Të dhënat u rikthyen me sukses!', 'success');
            document.getElementById('hurma-modal')?.remove();
            setTimeout(() => location.reload(), 800);
        } catch(err) {
            showToast('Gabim: fjalëkalim i gabuar ose skedar i korruptuar!', 'error');
        }
    };
    reader.readAsText(fileInput.files[0]);
}


// ===================== FEATURE 13: SINKRONIZO MES PAISJEVE =====================

function generateSyncCode() {
    const json = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(json)));
}

function showSyncModal() {
    const code = generateSyncCode();
    const shortCode = code.length > 2000 ? null : code;
    const qrSection = shortCode
        ? `<div id="sync-qr-container" style="text-align:center;margin-bottom:12px;">
                <canvas id="sync-qr-canvas"></canvas>
                <p style="font-size:12px;color:#888;margin-top:4px;">Skanoni QR-në me pajisjen tjetër</p>
           </div>`
        : `<p style="color:#e67e22;font-size:13px;margin-bottom:12px;">⚠️ Të dhënat janë shumë të mëdha për QR kod. Përdorni Copy/Paste.</p>`;

    openModal('Sinkronizo mes Pajisjeve', `
        ${qrSection}
        <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Kodi i Sinkronizimit:</label>
            <textarea id="sync-code-output" readonly rows="4"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:11px;font-family:monospace;box-sizing:border-box;resize:vertical;">${code}</textarea>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:16px;">
            <button onclick="_copySyncCode()" style="flex:1;background:#2196F3;color:#fff;border:none;padding:10px;border-radius:8px;cursor:pointer;">
                Kopjo Kodin
            </button>
        </div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee;">
        <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;">Importo nga Pajisja Tjetër:</label>
            <textarea id="sync-code-input" rows="4" placeholder="Ngjisni kodin nga pajisja tjetër këtu..."
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:11px;font-family:monospace;box-sizing:border-box;resize:vertical;"></textarea>
            <button onclick="_importSyncCode()" style="background:#4CAF50;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;margin-top:8px;width:100%;">
                Importo të Dhënat
            </button>
        </div>
    `);

    if (shortCode && typeof QRCode !== 'undefined') {
        setTimeout(() => {
            try {
                const canvas = document.getElementById('sync-qr-canvas');
                if (canvas) QRCode.toCanvas(canvas, shortCode, { width: 180 }, function(err) {
                    if (err) canvas.parentElement.style.display = 'none';
                });
            } catch(e) {}
        }, 100);
    }
}

function _copySyncCode() {
    const ta = document.getElementById('sync-code-output');
    if (!ta) return;
    ta.select();
    try {
        navigator.clipboard.writeText(ta.value).then(() => showToast('Kodi u kopjua!', 'success'));
    } catch(e) {
        document.execCommand('copy');
        showToast('Kodi u kopjua!', 'success');
    }
}

function _importSyncCode() {
    const code = document.getElementById('sync-code-input')?.value?.trim();
    if (!code) { showToast('Ngjisni kodin!', 'error'); return; }
    try {
        const json = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(json);
        if (!data.sales && !data.clients && !data.stock) throw new Error('Te dhena te pavlefshme');
        if (!confirm('A jeni i sigurt? Të dhënat aktuale do të zëvendësohen me të dhënat nga pajisja tjetër.')) return;
        Object.assign(state, data);
        saveState();
        logActivity('sync', 'Sinkronizim i importuar nga pajisje tjetër');
        showToast('Sinkronizimi u krye me sukses!', 'success');
        document.getElementById('hurma-modal')?.remove();
        setTimeout(() => location.reload(), 800);
    } catch(err) {
        showToast('Kodi është i pavlefshëm ose i korruptuar!', 'error');
    }
}


// ===================== FEATURE 14: IMPORT FROM JSON FILE =====================

function openImportModal() {
    openModal('Importo nga Skedar JSON', `
        <p style="margin-bottom:12px;color:#666;">Zgjidhni një skedar backup .json për ta importuar.</p>
        <div style="margin-bottom:16px;">
            <input type="file" id="import-json-file" accept=".json"
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;"
                onchange="_previewImportFile(this)" />
        </div>
        <div id="import-preview" style="display:none;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:16px;"></div>
        <div id="import-actions" style="display:none;gap:10px;flex-direction:column;">
            <button onclick="_doImport('replace')" style="background:#e53935;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;width:100%;">
                Zëvendëso të Gjitha të Dhënat
            </button>
            <button onclick="_doImport('merge')" style="background:#4CAF50;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;width:100%;">
                Bashko me të Dhënat Ekzistuese
            </button>
        </div>
    `);
}

let _pendingImportData = null;

function _previewImportFile(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            _pendingImportData = data;
            const sales = Array.isArray(data.sales) ? data.sales.length : 'N/A';
            const clients = Array.isArray(data.clients) ? data.clients.length : 'N/A';
            const stock = data.stock ? Object.keys(data.stock).length : 'N/A';
            const payments = Array.isArray(data.clientPayments) ? data.clientPayments.length : 'N/A';
            const expenses = Array.isArray(data.expenses) ? data.expenses.length : 'N/A';
            const preview = document.getElementById('import-preview');
            const actions = document.getElementById('import-actions');
            if (preview) {
                preview.style.display = 'block';
                preview.innerHTML = `
                    <h4 style="margin:0 0 10px;color:#333;">Parashikim i Importimit:</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
                        <div>Shitje: <strong>${sales}</strong></div>
                        <div>Klientë: <strong>${clients}</strong></div>
                        <div>Produkte në stok: <strong>${stock}</strong></div>
                        <div>Pagesa: <strong>${payments}</strong></div>
                        <div>Shpenzime: <strong>${expenses}</strong></div>
                    </div>`;
            }
            if (actions) actions.style.display = 'flex';
        } catch(err) {
            showToast('Skedari JSON është i pavlefshëm!', 'error');
        }
    };
    reader.readAsText(input.files[0]);
}

function _doImport(mode) {
    if (!_pendingImportData) { showToast('Nuk ka të dhëna për importim!', 'error'); return; }
    if (mode === 'replace') {
        if (!confirm('KUJDES: Kjo do të fshijë të gjitha të dhënat aktuale dhe i zëvendëson me të importuarit. Vazhdoni?')) return;
        // Save version before replacing
        if (typeof saveVersion === 'function') saveVersion();
        // Fully replace state (clear old keys first)
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, _pendingImportData);
    } else {
        importFromJSON(_pendingImportData);
        return;
    }
    if (!state.activityLog) state.activityLog = [];
    logActivity('import', 'Importim i plotë nga skedar JSON');
    saveState();
    showToast('Importimi u krye me sukses!', 'success');
    document.getElementById('hurma-modal')?.remove();
    setTimeout(() => location.reload(), 800);
}

function importFromJSON(data) {
    let added = 0;
    const merge = (arr, target) => {
        if (!Array.isArray(data[arr])) return;
        const existing = new Set((state[target] || []).map(x => x.id));
        const newItems = data[arr].filter(x => x.id && !existing.has(x.id));
        state[target] = [...(state[target] || []), ...newItems];
        added += newItems.length;
    };
    merge('sales', 'sales');
    merge('clients', 'clients');
    merge('clientPayments', 'clientPayments');
    merge('expenses', 'expenses');
    merge('contacts', 'contacts');
    merge('notes', 'notes');
    merge('orders', 'orders');
    if (data.stock) {
        Object.keys(data.stock).forEach(k => {
            if (state.stock[k] === undefined) state.stock[k] = data.stock[k];
        });
    }
    saveState();
    logActivity('import', 'Bashkim i të dhënave nga skedar JSON - ' + added + ' rekorde të reja');
    showToast('Bashkimi u krye! ' + added + ' rekorde të reja u shtuan.', 'success');
    document.getElementById('hurma-modal')?.remove();
    setTimeout(() => location.reload(), 800);
}


// ===================== FEATURE 15: SCHEDULED BACKUP REMINDER =====================

function setupBackupReminder() {
    const lastBackup = state.autoBackup?.lastBackup;
    if (!lastBackup) {
        _showBackupBanner(null);
        return;
    }
    const daysSince = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 3) {
        _showBackupBanner(daysSince);
    }
}

function _showBackupBanner(days) {
    if (document.getElementById('backup-reminder-banner')) return;
    const msg = days === null
        ? 'Nuk keni bërë asnjëherë backup!'
        : `Nuk keni bërë backup prej ${days} ditësh`;
    const banner = document.createElement('div');
    banner.id = 'backup-reminder-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:#ff9800;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = `
        <span>⚠️ ${msg}</span>
        <div style="display:flex;gap:10px;align-items:center;">
            <button onclick="_quickBackupFromBanner()" style="background:#fff;color:#e65100;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">Backup tani</button>
            <button onclick="this.closest('#backup-reminder-banner').remove()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.6);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px;">✕</button>
        </div>`;
    document.body.prepend(banner);
}

function _quickBackupFromBanner() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hurma_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    state.autoBackup = state.autoBackup || {};
    state.autoBackup.lastBackup = new Date().toISOString();
    saveState();
    logActivity('backup', 'Backup i shpejtë nga kujtesa');
    showToast('Backup u shkarkua!', 'success');
    document.getElementById('backup-reminder-banner')?.remove();
}


// ===================== FEATURE 16: DATA VALIDATION & REPAIR =====================

function validateData() {
    const issues = [];
    const clientIds = new Set((state.clients || []).map(c => c.id));

    // Orphaned sales
    (state.sales || []).forEach((s, i) => {
        if (s.clientId && !clientIds.has(s.clientId)) {
            issues.push({ type: 'orphan', severity: 'warning', msg: `Shitja #${s.id || i} ka klientId "${s.clientId}" që nuk ekziston.` });
        }
    });

    // Negative stock
    Object.entries(state.stock || {}).forEach(([k, v]) => {
        if (v < 0) issues.push({ type: 'negstock', severity: 'error', msg: `Stoku për "${k}" është negativ (${v}).` });
    });

    // Duplicate sale IDs
    const saleIds = (state.sales || []).map(s => s.id).filter(Boolean);
    const dupSales = saleIds.filter((id, i) => saleIds.indexOf(id) !== i);
    if (dupSales.length) issues.push({ type: 'dupid', severity: 'error', msg: `ID të dyfishta në shitje: ${[...new Set(dupSales)].join(', ')}` });

    // Duplicate client IDs
    const cIds = (state.clients || []).map(c => c.id).filter(Boolean);
    const dupClients = cIds.filter((id, i) => cIds.indexOf(id) !== i);
    if (dupClients.length) issues.push({ type: 'dupid', severity: 'error', msg: `ID të dyfishta te klientët: ${[...new Set(dupClients)].join(', ')}` });

    // Missing required fields in clients
    (state.clients || []).forEach((c, i) => {
        if (!c.name) issues.push({ type: 'missing', severity: 'warning', msg: `Klienti #${i} (id: ${c.id}) nuk ka emër.` });
    });

    // Missing required fields in sales
    (state.sales || []).forEach((s, i) => {
        if (!s.productId) issues.push({ type: 'missing', severity: 'warning', msg: `Shitja #${i} (id: ${s.id}) nuk ka produkt.` });
    });

    let rows = issues.length
        ? issues.map(iss => `<tr>
            <td style="padding:7px 10px;">
                <span style="background:${iss.severity === 'error' ? '#ffebee' : '#fff8e1'};color:${iss.severity === 'error' ? '#c62828' : '#e65100'};padding:2px 8px;border-radius:4px;font-size:12px;">${iss.severity === 'error' ? 'Gabim' : 'Paralajmërim'}</span>
            </td>
            <td style="padding:7px 10px;font-size:13px;">${iss.msg}</td>
           </tr>`).join('')
        : '<tr><td colspan="2" style="padding:20px;text-align:center;color:#4CAF50;font-weight:600;">Nuk u gjetën probleme! Të dhënat janë të sakta.</td></tr>';

    openModal('Validim i të Dhënave', `
        <div style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <span style="font-size:14px;color:#666;">${issues.length} problem(e) u gjetën</span>
            ${issues.length ? `<button onclick="repairData()" style="background:#4CAF50;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">Riparoje Automatikisht</button>` : ''}
        </div>
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f5f5f5;">
                    <th style="padding:8px 10px;text-align:left;min-width:110px;">Lloji</th>
                    <th style="padding:8px 10px;text-align:left;">Përshkrimi</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);
}

function repairData() {
    let fixed = 0;
    const clientIds = new Set((state.clients || []).map(c => c.id));

    // Remove orphaned sales
    const before = (state.sales || []).length;
    state.sales = (state.sales || []).filter(s => !s.clientId || clientIds.has(s.clientId));
    fixed += before - state.sales.length;

    // Fix negative stock
    Object.keys(state.stock || {}).forEach(k => {
        if (state.stock[k] < 0) { state.stock[k] = 0; fixed++; }
    });

    // Remove duplicate sale IDs (keep first)
    const seenSaleIds = new Set();
    const beforeDup = (state.sales || []).length;
    state.sales = (state.sales || []).filter(s => {
        if (!s.id || !seenSaleIds.has(s.id)) { if (s.id) seenSaleIds.add(s.id); return true; }
        return false;
    });
    fixed += beforeDup - state.sales.length;

    // Remove duplicate client IDs (keep first)
    const seenClientIds = new Set();
    const beforeDupC = (state.clients || []).length;
    state.clients = (state.clients || []).filter(c => {
        if (!c.id || !seenClientIds.has(c.id)) { if (c.id) seenClientIds.add(c.id); return true; }
        return false;
    });
    fixed += beforeDupC - state.clients.length;

    saveState();
    logActivity('repair', 'Riparim automatik i të dhënave - ' + fixed + ' probleme u rregulluan');
    showToast(fixed + ' probleme u rregulluan automatikisht!', 'success');
    document.getElementById('hurma-modal')?.remove();
    setTimeout(() => validateData(), 300);
}


// ===================== FEATURE 17: STORAGE ANALYTICS CHART =====================

function showStorageAnalytics() {
    const getSize = (val) => {
        try { return (JSON.stringify(val) || '').length; } catch(e) { return 0; }
    };
    const kb = (bytes) => (bytes / 1024).toFixed(2);

    const breakdown = {
        'Shitje': getSize(state.sales),
        'Klientë': getSize(state.clients),
        'Pagesa': getSize(state.clientPayments),
        'Stok': getSize(state.stock),
        'Shpenzime': getSize(state.expenses),
        'Aktiviteti': getSize(state.activityLog),
        'Porosi': getSize(state.orders),
        'Kontakte': getSize(state.contacts),
        'Shënime': getSize(state.notes),
        'Tjeter': getSize(state.cashDrawer) + getSize(state.notifications) + getSize(state.targets)
    };

    const totalLS = (() => {
        let t = 0;
        for (let k in localStorage) {
            if (localStorage.hasOwnProperty(k)) t += (localStorage.getItem(k) || '').length;
        }
        return t;
    })();

    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const colors = ['#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336','#00BCD4','#FF5722','#3F51B5','#8BC34A','#607D8B'];
    const total = values.reduce((a, b) => a + b, 0);

    const rows = labels.map((l, i) => `<tr>
        <td style="padding:5px 10px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${colors[i % colors.length]};margin-right:6px;vertical-align:middle;"></span>${l}</td>
        <td style="padding:5px 10px;">${kb(values[i])} KB</td>
        <td style="padding:5px 10px;">${total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0}%</td>
    </tr>`).join('');

    openModal('Analitika e Ruajtjes', `
        <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;">
            <div style="flex:0 0 auto;text-align:center;">
                <canvas id="storage-chart" width="220" height="220"></canvas>
            </div>
            <div style="flex:1;min-width:200px;">
                <div style="margin-bottom:12px;background:#f5f5f5;border-radius:8px;padding:10px;font-size:13px;">
                    <div>Gjithsej state: <strong>${kb(total)} KB</strong></div>
                    <div>Gjithsej localStorage: <strong>${kb(totalLS)} KB</strong></div>
                </div>
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                    <thead><tr style="background:#f5f5f5;">
                        <th style="padding:5px 10px;text-align:left;">Lloji</th>
                        <th style="padding:5px 10px;text-align:left;">Madhësia</th>
                        <th style="padding:5px 10px;text-align:left;">%</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `);

    setTimeout(() => {
        const canvas = document.getElementById('storage-chart');
        if (!canvas) return;
        if (typeof Chart !== 'undefined') {
            new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }]
                },
                options: {
                    responsive: false,
                    plugins: { legend: { display: false } }
                }
            });
        } else {
            canvas.parentElement.innerHTML = '<p style="color:#888;font-size:13px;">Chart.js nuk është i disponueshëm.</p>';
        }
    }, 150);
}


// ===================== FEATURE 18: EXPORT PER TAB =====================

function exportTabData(tabName) {
    const tabMap = {
        'sales':          { key: 'sales',          label: 'Shitjet' },
        'clients':        { key: 'clients',         label: 'Klientët' },
        'payments':       { key: 'clientPayments',  label: 'Pagesat' },
        'stock':          { key: 'stock',           label: 'Stoku' },
        'expenses':       { key: 'expenses',        label: 'Shpenzimet' },
        'orders':         { key: 'orders',          label: 'Porositë' },
        'contacts':       { key: 'contacts',        label: 'Kontaktet' },
        'notes':          { key: 'notes',           label: 'Shënimet' },
        'activities':     { key: 'activityLog',     label: 'Aktiviteti' }
    };
    const tab = tabMap[tabName];
    if (!tab) { showToast('Tab i panjohur!', 'error'); return; }
    const data = state[tab.key];
    const json = JSON.stringify({ [tab.key]: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hurma_${tabName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity('export', `Export i seksionit "${tab.label}"`);
    showToast(`"${tab.label}" u eksportua!`, 'success');
}

function showExportOptions() {
    const tabs = [
        { key: 'sales',      label: 'Shitjet',      icon: '🛍️' },
        { key: 'clients',    label: 'Klientët',     icon: '👥' },
        { key: 'payments',   label: 'Pagesat',      icon: '💳' },
        { key: 'stock',      label: 'Stoku',        icon: '📦' },
        { key: 'expenses',   label: 'Shpenzimet',   icon: '💸' },
        { key: 'orders',     label: 'Porositë',     icon: '📋' },
        { key: 'contacts',   label: 'Kontaktet',    icon: '📞' },
        { key: 'notes',      label: 'Shënimet',     icon: '📝' },
        { key: 'activities', label: 'Aktiviteti',   icon: '📊' }
    ];
    const btns = tabs.map(t => `
        <button onclick="exportTabData('${t.key}')" style="background:#f5f5f5;color:#333;border:1px solid #e0e0e0;padding:14px 12px;border-radius:10px;cursor:pointer;text-align:center;font-size:13px;transition:background 0.2s;"
            onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#f5f5f5'">
            <div style="font-size:22px;margin-bottom:4px;">${t.icon}</div>
            <div style="font-weight:600;">${t.label}</div>
        </button>`).join('');

    openModal('Eksporto Seksion', `
        <p style="margin-bottom:16px;color:#666;">Zgjidhni seksionin që dëshironi ta eksportoni si skedar JSON:</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            ${btns}
        </div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee;">
        <button onclick="_exportFullBackup()" style="background:#4CAF50;color:#fff;border:none;padding:12px 20px;border-radius:8px;cursor:pointer;width:100%;font-size:14px;font-weight:600;">
            Eksporto Gjithçka (Backup i Plotë)
        </button>
    `);
}

function _exportFullBackup() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hurma_backup_i_plote_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    state.autoBackup = state.autoBackup || {};
    state.autoBackup.lastBackup = new Date().toISOString();
    saveState();
    logActivity('export', 'Backup i plotë u eksportua');
    showToast('Backup i plotë u shkarkua!', 'success');
}


// ===================== FEATURE 19: MERGE DATA FROM BACKUP =====================

function openMergeModal() {
    openModal('Bashko të Dhëna nga Backup', `
        <p style="margin-bottom:12px;color:#666;">Ngarkoni një backup JSON dhe bashkojeni me të dhënat ekzistuese. Rekorde të dyfishta do të anashkalohen.</p>
        <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:4px;font-weight:600;">Skedari JSON:</label>
            <input type="file" id="merge-json-file" accept=".json"
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;"
                onchange="_previewMergeFile(this)" />
        </div>
        <div id="merge-preview" style="display:none;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:16px;"></div>
        <button id="merge-confirm-btn" onclick="_doMerge()" style="display:none;background:#4CAF50;color:#fff;border:none;padding:12px 20px;border-radius:8px;cursor:pointer;width:100%;font-size:14px;font-weight:600;">
            Bashko të Dhënat
        </button>
    `);
}

let _pendingMergeData = null;

function _previewMergeFile(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            _pendingMergeData = data;

            const arrays = ['sales', 'clients', 'clientPayments', 'expenses', 'contacts', 'notes', 'orders'];
            const existingIds = {};
            arrays.forEach(k => {
                existingIds[k] = new Set((state[k] || []).map(x => x.id).filter(Boolean));
            });

            let previewHtml = '<h4 style="margin:0 0 10px;color:#333;">Parashikim i Bashkimit:</h4>';
            previewHtml += '<table style="width:100%;font-size:13px;border-collapse:collapse;">';
            previewHtml += '<tr style="background:#f5f5f5;"><th style="padding:6px 10px;text-align:left;">Seksioni</th><th style="padding:6px 10px;">Total në skedar</th><th style="padding:6px 10px;">Do të shtohen</th><th style="padding:6px 10px;">Duplikate</th></tr>';

            const labels = { sales: 'Shitje', clients: 'Klientë', clientPayments: 'Pagesa', expenses: 'Shpenzime', contacts: 'Kontakte', notes: 'Shënime', orders: 'Porosi' };
            arrays.forEach(k => {
                if (!Array.isArray(data[k])) return;
                const total = data[k].length;
                const newItems = data[k].filter(x => x.id && !existingIds[k].has(x.id)).length;
                const dups = total - newItems;
                previewHtml += `<tr><td style="padding:6px 10px;">${labels[k] || k}</td><td style="padding:6px 10px;text-align:center;">${total}</td><td style="padding:6px 10px;text-align:center;color:#4CAF50;font-weight:600;">+${newItems}</td><td style="padding:6px 10px;text-align:center;color:#888;">${dups}</td></tr>`;
            });
            previewHtml += '</table>';

            const preview = document.getElementById('merge-preview');
            const btn = document.getElementById('merge-confirm-btn');
            if (preview) { preview.style.display = 'block'; preview.innerHTML = previewHtml; }
            if (btn) btn.style.display = 'block';
        } catch(err) {
            showToast('Skedari JSON është i pavlefshëm!', 'error');
        }
    };
    reader.readAsText(input.files[0]);
}

function _doMerge() {
    if (!_pendingMergeData) { showToast('Nuk ka të dhëna për bashkim!', 'error'); return; }
    importFromJSON(_pendingMergeData);
    _pendingMergeData = null;
}


// ===================== FEATURE 20: AUTO-SAVE INDICATOR =====================

(function setupAutoSaveIndicator() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .autosave-indicator {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(76, 175, 80, 0.92);
            color: #fff;
            padding: 7px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transform: translateY(8px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.18);
            letter-spacing: 0.3px;
        }
        .autosave-indicator.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'autosave-indicator';
    indicator.id = 'autosave-indicator';
    indicator.textContent = '✓ Ruajtur';
    document.body.appendChild(indicator);
})();

function showAutoSaveIndicator() {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    el.classList.add('visible');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('visible'), 1400);
}

// Patch saveState to trigger the indicator
(function patchSaveState() {
    const _origSaveState = saveState;
    window.saveState = function() {
        _origSaveState.apply(this, arguments);
        showAutoSaveIndicator();
    };
    // Also replace the module-level reference
    if (typeof saveState === 'function') {
        saveState = window.saveState;
    }
})();


// ===================== INIT FEATURES 11-20 =====================
(function initFeatures11to20() {
    window.addEventListener('load', function() {
        setTimeout(function() {
            try { setupBackupReminder(); } catch(e) { console.warn('setupBackupReminder error:', e); }
        }, 3000);
    });
})();


// Missing function: Client debt chart
function showClientDebtChart() {
    const clients = state.clients.filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt);
    let html = '<canvas id="client-debt-chart" width="400" height="300"></canvas>';
    if (clients.length === 0) {
        html = '<div style="text-align:center;padding:30px;color:var(--text-secondary);"><i class="fas fa-check-circle" style="font-size:3em;color:var(--success);"></i><p style="margin-top:10px;">Asnje klient nuk ka borxh!</p></div>';
        openModal('Grafiku i Borxheve', html);
        return;
    }
    openModal('Grafiku i Borxheve', html);
    setTimeout(() => {
        const canvas = document.getElementById('client-debt-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        const labels = clients.slice(0, 10).map(c => c.name);
        const data = clients.slice(0, 10).map(c => c.debt);
        const colors = data.map((_, i) => `hsl(${0 + i * 15}, 70%, 55%)`);
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Borxhi (den)',
                    data,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }, 200);
}

// ===================== DATA PROTECTION SUITE (15 Features) =====================

// === FEATURE 1: Auto-Backup para çdo Restore ===
function autoBackupBeforeRestore() {
    const backupData = JSON.stringify(state, null, 2);
    const now = new Date();
    const filename = 'hurma_para_restore_' + now.toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.json';
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    // Also save to localStorage as emergency backup
    localStorage.setItem('hurma_pre_restore_backup', backupData);
    localStorage.setItem('hurma_pre_restore_date', now.toISOString());
    showToast('Backup automatik u shkarkua: ' + filename, 'info');
    return filename;
}

function restorePreRestoreBackup() {
    const backup = localStorage.getItem('hurma_pre_restore_backup');
    if (!backup) { showToast('Nuk ka backup para-restore!', 'error'); return; }
    const date = localStorage.getItem('hurma_pre_restore_date') || 'E panjohur';
    try {
        const data = JSON.parse(backup);
        const salesCount = (data.sales || []).length;
        const clientsCount = (data.clients || []).length;
        openModal('Rikthe Backup Para-Restore', `
            <div style="text-align:center;padding:15px;">
                <div style="font-size:3em;margin-bottom:10px;">🔄</div>
                <p style="color:#666;margin-bottom:15px;">Backup automatik i ruajtur para restore-it të fundit</p>
                <p><strong>Data:</strong> ${new Date(date).toLocaleString('sq-AL')}</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0;background:var(--bg-secondary);padding:12px;border-radius:8px;">
                    <div>Shitje: <strong>${salesCount}</strong></div>
                    <div>Klientë: <strong>${clientsCount}</strong></div>
                </div>
                <div style="display:flex;gap:10px;">
                    <button onclick="closeModal()" class="btn" style="flex:1;">Anulo</button>
                    <button onclick="_doPreRestoreRecovery()" class="btn btn-success" style="flex:1;font-weight:bold;">
                        <i class="fas fa-undo"></i> Rikthe
                    </button>
                </div>
            </div>
        `);
    } catch(e) { showToast('Backup i dëmtuar!', 'error'); }
}

function _doPreRestoreRecovery() {
    const backup = localStorage.getItem('hurma_pre_restore_backup');
    if (!backup) return;
    const data = JSON.parse(backup);
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, data);
    if (!state.activityLog) state.activityLog = [];
    logActivity('recovery', 'Rikthim nga backup para-restore');
    saveState();
    closeModal();
    showToast('Të dhënat u rikthyen!', 'success');
    setTimeout(() => location.reload(), 800);
}

// === FEATURE 2: Koshi i Plehrave (Trash Bin) ===
function moveToTrash(type, item) {
    if (!state.trash) state.trash = [];
    state.trash.push({
        id: Date.now().toString(),
        type: type, // 'sale', 'client', 'payment', 'expense'
        data: JSON.parse(JSON.stringify(item)),
        deletedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    // Keep max 200 items in trash
    if (state.trash.length > 200) state.trash = state.trash.slice(-200);
    trackChange('delete', type, item.id || item.name || 'unknown');
    saveState();
}

function showTrashBin() {
    if (!state.trash) state.trash = [];
    // Clean expired items
    const now = new Date().toISOString();
    state.trash = state.trash.filter(t => t.expiresAt > now);

    if (state.trash.length === 0) {
        openModal('🗑️ Koshi i Plehrave', '<div style="text-align:center;padding:40px;color:#999;"><i class="fas fa-trash" style="font-size:3em;margin-bottom:10px;"></i><p>Koshi është bosh!</p><p style="font-size:0.85em;">Elementet e fshira ruhen këtu për 30 ditë.</p></div>');
        return;
    }

    const typeNames = { sale: 'Shitje', client: 'Klient', payment: 'Pagesë', expense: 'Shpenzim', contact: 'Kontakt', note: 'Shënim' };
    const typeIcons = { sale: 'shopping-cart', client: 'user', payment: 'money-bill', expense: 'receipt', contact: 'address-book', note: 'sticky-note' };

    const rows = state.trash.slice().reverse().map(t => {
        const typeName = typeNames[t.type] || t.type;
        const icon = typeIcons[t.type] || 'file';
        const deletedDate = new Date(t.deletedAt).toLocaleDateString('sq-AL');
        const daysLeft = Math.ceil((new Date(t.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        const itemName = t.data.name || t.data.productId || t.data.note || ('ID: ' + (t.data.id || '?'));
        const amount = t.data.sellTotal || t.data.amount || t.data.debt || '';

        return `<tr>
            <td style="padding:8px;"><i class="fas fa-${icon}" style="color:var(--primary);margin-right:6px;"></i>${typeName}</td>
            <td style="padding:8px;">${itemName}</td>
            <td style="padding:8px;">${amount ? amount + ' den' : '-'}</td>
            <td style="padding:8px;">${deletedDate}</td>
            <td style="padding:8px;"><span style="color:${daysLeft < 7 ? 'var(--danger)' : '#888'};">${daysLeft} ditë</span></td>
            <td style="padding:8px;">
                <button onclick="restoreFromTrash('${t.id}')" class="btn btn-sm btn-success" title="Rikthe"><i class="fas fa-undo"></i></button>
                <button onclick="permanentDeleteFromTrash('${t.id}')" class="btn btn-sm btn-danger" title="Fshi përgjithmonë"><i class="fas fa-times"></i></button>
            </td>
        </tr>`;
    }).join('');

    openModal('🗑️ Koshi i Plehrave (' + state.trash.length + ')', `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#888;font-size:0.9em;">Elementet fshihen automatikisht pas 30 ditëve</span>
            <button onclick="emptyTrash()" style="background:var(--danger);color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.85em;">
                <i class="fas fa-trash"></i> Zbraz Koshin
            </button>
        </div>
        <div class="table-container"><table class="data-table">
            <thead><tr><th>Tipi</th><th>Emri</th><th>Vlera</th><th>Fshirë më</th><th>Mbetur</th><th>Veprime</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `);
}

function restoreFromTrash(trashId) {
    const item = state.trash.find(t => t.id === trashId);
    if (!item) return;

    // Restore to appropriate collection
    switch(item.type) {
        case 'sale':
            state.sales.push(item.data);
            // Restore debt if it was a debt sale
            if (item.data.isDebt && item.data.clientId) {
                const client = state.clients.find(c => c.id === item.data.clientId);
                if (client) client.debt += item.data.sellTotal || 0;
            }
            break;
        case 'client':
            state.clients.push(item.data);
            break;
        case 'payment':
            if (!state.clientPayments) state.clientPayments = [];
            state.clientPayments.push(item.data);
            // Re-apply payment to client debt
            if (item.data.clientId && item.data.status !== 'cancelled') {
                const client = state.clients.find(c => c.id === item.data.clientId);
                if (client) client.debt = Math.max(0, client.debt - (item.data.amount || 0));
            }
            break;
        case 'expense':
            state.expenses.push(item.data);
            break;
        case 'contact':
            state.contacts.push(item.data);
            break;
        case 'note':
            state.notes.push(item.data);
            break;
    }

    state.trash = state.trash.filter(t => t.id !== trashId);
    logActivity('restore_trash', 'U rikthye nga koshi: ' + item.type + ' - ' + (item.data.name || item.data.id));
    saveState();
    showToast('U rikthye nga koshi!', 'success');
    showTrashBin();
}

function permanentDeleteFromTrash(trashId) {
    if (!confirm('Fshirje përfundimtare — nuk mund të kthehet! Vazhdo?')) return;
    state.trash = state.trash.filter(t => t.id !== trashId);
    saveState();
    showToast('U fshi përgjithmonë', 'info');
    showTrashBin();
}

function emptyTrash() {
    if (!confirm('Zbraz gjithë koshin? Kjo nuk mund të kthehet!')) return;
    state.trash = [];
    saveState();
    showToast('Koshi u zbraz', 'info');
    closeModal();
}

// === FEATURE 3: Version History me Preview ===
function showVersionPreview(n) {
    const raw = localStorage.getItem('hurma_version_' + n);
    if (!raw) { showToast('Versioni nuk u gjet!', 'error'); return; }
    try {
        const snap = JSON.parse(raw);
        const d = snap.data || {};
        const salesCount = (d.sales || []).length;
        const clientsCount = (d.clients || []).length;
        const paymentsCount = (d.clientPayments || []).length;
        const expensesCount = (d.expenses || []).length;
        const totalDebt = (d.clients || []).reduce((s, c) => s + (c.debt || 0), 0);
        const totalRevenue = (d.sales || []).reduce((s, x) => s + (x.sellTotal || 0), 0);

        // Compare with current
        const curSales = state.sales.length;
        const curClients = state.clients.length;
        const diff = (cur, old) => { const d = cur - old; return d > 0 ? '+' + d : d === 0 ? '=' : '' + d; };

        openModal('Parashikim Version #' + n, `
            <div style="padding:10px;">
                <p style="color:#888;margin-bottom:15px;">Ruajtur: ${snap.date ? new Date(snap.date).toLocaleString('sq-AL') : 'E panjohur'}</p>
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:var(--bg-secondary);">
                        <th style="padding:8px;text-align:left;">Fusha</th>
                        <th style="padding:8px;text-align:right;">Versioni</th>
                        <th style="padding:8px;text-align:right;">Aktuale</th>
                        <th style="padding:8px;text-align:right;">Dallimi</th>
                    </tr></thead>
                    <tbody>
                        <tr><td style="padding:8px;">Shitje</td><td style="padding:8px;text-align:right;">${salesCount}</td><td style="padding:8px;text-align:right;">${curSales}</td><td style="padding:8px;text-align:right;font-weight:bold;color:${curSales >= salesCount ? 'var(--success)' : 'var(--danger)'};">${diff(curSales, salesCount)}</td></tr>
                        <tr><td style="padding:8px;">Klientë</td><td style="padding:8px;text-align:right;">${clientsCount}</td><td style="padding:8px;text-align:right;">${curClients}</td><td style="padding:8px;text-align:right;font-weight:bold;color:${curClients >= clientsCount ? 'var(--success)' : 'var(--danger)'};">${diff(curClients, clientsCount)}</td></tr>
                        <tr><td style="padding:8px;">Pagesa</td><td style="padding:8px;text-align:right;">${paymentsCount}</td><td style="padding:8px;text-align:right;">${(state.clientPayments||[]).length}</td><td style="padding:8px;text-align:right;">${diff((state.clientPayments||[]).length, paymentsCount)}</td></tr>
                        <tr><td style="padding:8px;">Shpenzime</td><td style="padding:8px;text-align:right;">${expensesCount}</td><td style="padding:8px;text-align:right;">${state.expenses.length}</td><td style="padding:8px;text-align:right;">${diff(state.expenses.length, expensesCount)}</td></tr>
                        <tr style="background:var(--bg-secondary);"><td style="padding:8px;font-weight:bold;">Qarkullim</td><td style="padding:8px;text-align:right;font-weight:bold;">${totalRevenue} den</td><td style="padding:8px;text-align:right;font-weight:bold;">${state.sales.reduce((s,x)=>s+(x.sellTotal||0),0)} den</td><td></td></tr>
                        <tr><td style="padding:8px;font-weight:bold;">Borxh total</td><td style="padding:8px;text-align:right;color:var(--danger);font-weight:bold;">${totalDebt} den</td><td style="padding:8px;text-align:right;color:var(--danger);font-weight:bold;">${state.clients.reduce((s,c)=>s+(c.debt||0),0)} den</td><td></td></tr>
                    </tbody>
                </table>
                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button onclick="closeModal()" class="btn" style="flex:1;">Mbyll</button>
                    <button onclick="restoreVersion(${n})" class="btn btn-danger" style="flex:1;font-weight:bold;">
                        <i class="fas fa-undo"></i> Rikthe këtë Version
                    </button>
                </div>
            </div>
        `);
    } catch(e) { showToast('Gabim: ' + e.message, 'error'); }
}

// === FEATURE 4: Rikthim Selektiv ===
function openSelectiveRestoreModal() {
    openModal('Rikthim Selektiv', `
        <div style="text-align:center;padding:15px;">
            <div style="font-size:3em;margin-bottom:10px;">🎯</div>
            <p style="color:#888;margin-bottom:15px;">Zgjidhni skedarin backup, pastaj zgjidhni cilat të dhëna doni të riktheni.</p>
            <input type="file" id="selective-restore-file" accept=".json"
                onchange="_onSelectiveFileSelected(this)"
                style="width:100%;padding:15px;border:3px dashed var(--primary);border-radius:12px;font-size:1em;cursor:pointer;background:var(--bg-secondary);box-sizing:border-box;">
        </div>
    `);
}

function _onSelectiveFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
                window._selectiveRestoreData = data;
                const cats = [
                    { key: 'sales', name: 'Shitje', icon: 'shopping-cart', count: (data.sales||[]).length, current: state.sales.length },
                    { key: 'clients', name: 'Klientë', icon: 'users', count: (data.clients||[]).length, current: state.clients.length },
                    { key: 'clientPayments', name: 'Pagesa', icon: 'money-bill', count: (data.clientPayments||[]).length, current: (state.clientPayments||[]).length },
                    { key: 'expenses', name: 'Shpenzime', icon: 'receipt', count: (data.expenses||[]).length, current: state.expenses.length },
                    { key: 'contacts', name: 'Kontakte', icon: 'address-book', count: (data.contacts||[]).length, current: state.contacts.length },
                    { key: 'notes', name: 'Shënime', icon: 'sticky-note', count: (data.notes||[]).length, current: state.notes.length },
                    { key: 'stock', name: 'Stoku', icon: 'boxes', count: data.stock ? Object.keys(data.stock).length : 0, current: Object.keys(state.stock||{}).length },
                    { key: 'orders', name: 'Porosi', icon: 'truck', count: (data.orders||[]).length, current: state.orders.length }
                ];

                const checkboxes = cats.map(c => `
                    <label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;cursor:pointer;">
                        <input type="checkbox" class="selective-restore-cb" value="${c.key}" ${c.count > 0 ? 'checked' : 'disabled'}>
                        <i class="fas fa-${c.icon}" style="color:var(--primary);width:20px;text-align:center;"></i>
                        <span style="flex:1;">${c.name}</span>
                        <span style="color:#888;font-size:0.85em;">Backup: <strong>${c.count}</strong> | Aktuale: <strong>${c.current}</strong></span>
                    </label>
                `).join('');

                openModal('Rikthim Selektiv — ' + file.name, `
                    <p style="color:#888;margin-bottom:15px;">Zgjidhni cilat kategori doni të riktheni:</p>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:15px;">${checkboxes}</div>
                    <div style="display:flex;gap:8px;margin-bottom:10px;">
                        <label style="display:flex;align-items:center;gap:6px;padding:8px;background:#fff3e0;border-radius:6px;cursor:pointer;flex:1;">
                            <input type="radio" name="sr-mode" value="replace" checked> <strong>Zëvendëso</strong> <small>(fshi të vjetrat)</small>
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;padding:8px;background:#e8f5e9;border-radius:6px;cursor:pointer;flex:1;">
                            <input type="radio" name="sr-mode" value="merge"> <strong>Bashko</strong> <small>(shto të rejat)</small>
                        </label>
                    </div>
                    <button onclick="_doSelectiveRestore()" class="btn btn-success" style="width:100%;padding:12px;font-size:1.05em;font-weight:bold;">
                        <i class="fas fa-check"></i> Apliko Rikthimin Selektiv
                    </button>
                `);
        } catch(err) { showToast('Skedar i pavlefshëm!', 'error'); }
    };
    reader.readAsText(file);
}

function _doSelectiveRestore() {
    const data = window._selectiveRestoreData;
    if (!data) return;
    const mode = document.querySelector('input[name="sr-mode"]:checked')?.value || 'replace';
    const checked = Array.from(document.querySelectorAll('.selective-restore-cb:checked')).map(cb => cb.value);
    if (checked.length === 0) { showToast('Zgjidhni të paktën një kategori!', 'error'); return; }

    // Auto backup before selective restore
    autoBackupBeforeRestore();

    let restored = 0;
    checked.forEach(key => {
        if (key === 'stock') {
            if (mode === 'replace') {
                state.stock = data.stock || {};
            } else {
                Object.keys(data.stock || {}).forEach(k => {
                    state.stock[k] = (state.stock[k] || 0) + (data.stock[k] || 0);
                });
            }
            restored++;
        } else if (Array.isArray(data[key])) {
            if (mode === 'replace') {
                state[key] = [...data[key]];
            } else {
                const existingIds = new Set((state[key] || []).map(x => x.id));
                const newItems = data[key].filter(x => x.id && !existingIds.has(x.id));
                state[key] = [...(state[key] || []), ...newItems];
            }
            restored++;
        }
    });

    logActivity('selective_restore', `Rikthim selektiv (${mode}): ${checked.join(', ')} — ${restored} kategori`);
    saveState();
    closeModal();
    showToast(`U rikthyen ${restored} kategori me sukses!`, 'success');
    setTimeout(() => location.reload(), 800);
}

// === FEATURE 5: Krahasim Para/Pas Restore ===
function showRestoreComparison(backupData) {
    const fields = [
        { key: 'sales', name: 'Shitje', icon: 'shopping-cart' },
        { key: 'clients', name: 'Klientë', icon: 'users' },
        { key: 'clientPayments', name: 'Pagesa', icon: 'money-bill' },
        { key: 'expenses', name: 'Shpenzime', icon: 'receipt' }
    ];

    const rows = fields.map(f => {
        const current = Array.isArray(state[f.key]) ? state[f.key].length : 0;
        const backup = Array.isArray(backupData[f.key]) ? backupData[f.key].length : 0;
        const diff = backup - current;
        const color = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : '#888';
        const sign = diff > 0 ? '+' : '';
        return `<tr>
            <td style="padding:10px;"><i class="fas fa-${f.icon}" style="margin-right:8px;color:var(--primary);"></i>${f.name}</td>
            <td style="padding:10px;text-align:center;font-weight:bold;">${current}</td>
            <td style="padding:10px;text-align:center;font-weight:bold;">${backup}</td>
            <td style="padding:10px;text-align:center;font-weight:bold;color:${color};">${sign}${diff}</td>
        </tr>`;
    }).join('');

    const currentDebt = state.clients.reduce((s, c) => s + (c.debt || 0), 0);
    const backupDebt = (backupData.clients || []).reduce((s, c) => s + (c.debt || 0), 0);

    return `
        <table style="width:100%;border-collapse:collapse;margin:15px 0;">
            <thead><tr style="background:var(--bg-secondary);">
                <th style="padding:10px;text-align:left;">Kategoria</th>
                <th style="padding:10px;text-align:center;">Aktuale</th>
                <th style="padding:10px;text-align:center;">Backup</th>
                <th style="padding:10px;text-align:center;">Ndryshim</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="display:flex;gap:10px;margin-top:10px;">
            <div style="flex:1;padding:10px;background:#ffebee;border-radius:8px;text-align:center;">
                <small>Borxh aktual</small><br><strong style="color:var(--danger);">${currentDebt} den</strong>
            </div>
            <div style="flex:1;padding:10px;background:#e8f5e9;border-radius:8px;text-align:center;">
                <small>Borxh në backup</small><br><strong style="color:var(--success);">${backupDebt} den</strong>
            </div>
        </div>
    `;
}

// === FEATURE 6: Export Automatik në Email para Restore ===
function sendBackupToEmailBeforeRestore() {
    const backupData = JSON.stringify(state, null, 2);
    const subject = encodeURIComponent('Hurma Backup Para Restore - ' + new Date().toLocaleDateString('sq-AL'));
    const body = encodeURIComponent('Backup automatik para restore.\n\nShitje: ' + state.sales.length + '\nKlientë: ' + state.clients.length + '\n\nKopjo JSON-in nga attachment ose nga ktu poshtë:\n\n' + backupData.substring(0, 500) + '...');
    window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
    showToast('Email po hapet me backup...', 'info');
}

// === FEATURE 7: Snapshot çdo 1 orë ===
function saveHourlySnapshot() {
    if (!state.hourlySnapshots) state.hourlySnapshots = [];
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13); // e.g., "2026-04-07T14"

    // Don't save if already saved this hour
    if (state.hourlySnapshots.some(s => s.hour === hourKey)) return;

    // Keep data lightweight - only counts and key metrics
    const snapshot = {
        hour: hourKey,
        date: now.toISOString(),
        sales: state.sales.length,
        clients: state.clients.length,
        payments: (state.clientPayments || []).length,
        totalDebt: state.clients.reduce((s, c) => s + (c.debt || 0), 0),
        totalRevenue: state.sales.reduce((s, x) => s + (x.sellTotal || 0), 0),
        // Full state for last 24h only
        stateJson: JSON.stringify(state)
    };
    state.hourlySnapshots.push(snapshot);

    // Keep only last 24 snapshots
    if (state.hourlySnapshots.length > 24) {
        // Remove old state JSON to save space
        state.hourlySnapshots.slice(0, -24).forEach(s => delete s.stateJson);
        state.hourlySnapshots = state.hourlySnapshots.slice(-24);
    }
    saveState();
}

function showHourlySnapshots() {
    if (!state.hourlySnapshots || state.hourlySnapshots.length === 0) {
        openModal('Snapshots çdo Orë', '<div style="text-align:center;padding:30px;color:#999;"><i class="fas fa-clock" style="font-size:3em;"></i><p>Ende nuk ka snapshots.</p></div>');
        return;
    }

    const rows = state.hourlySnapshots.slice().reverse().map(s => {
        const time = new Date(s.date).toLocaleString('sq-AL');
        const hasState = !!s.stateJson;
        return `<tr>
            <td style="padding:8px;">${time}</td>
            <td style="padding:8px;">${s.sales}</td>
            <td style="padding:8px;">${s.clients}</td>
            <td style="padding:8px;">${s.payments || 0}</td>
            <td style="padding:8px;color:var(--danger);">${s.totalDebt} den</td>
            <td style="padding:8px;">${hasState ? '<button onclick="restoreHourlySnapshot(\'' + s.hour + '\')" class="btn btn-sm btn-success"><i class="fas fa-undo"></i> Rikthe</button>' : '<span style="color:#ccc;">Skaduar</span>'}</td>
        </tr>`;
    }).join('');

    openModal('⏰ Snapshots çdo Orë (' + state.hourlySnapshots.length + ')', `
        <div class="table-container"><table class="data-table">
            <thead><tr><th>Ora</th><th>Shitje</th><th>Klientë</th><th>Pagesa</th><th>Borxh</th><th>Veprim</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `);
}

function restoreHourlySnapshot(hourKey) {
    const snap = (state.hourlySnapshots || []).find(s => s.hour === hourKey);
    if (!snap || !snap.stateJson) { showToast('Ky snapshot nuk ka të dhëna!', 'error'); return; }
    if (!confirm('Rikthe snapshot-in e orës ' + new Date(snap.date).toLocaleString('sq-AL') + '?')) return;
    autoBackupBeforeRestore();
    try {
        const data = JSON.parse(snap.stateJson);
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, data);
        if (!state.activityLog) state.activityLog = [];
        logActivity('snapshot_restore', 'Rikthim nga snapshot: ' + snap.hour);
        saveState();
        showToast('Snapshot u rikthye!', 'success');
        setTimeout(() => location.reload(), 800);
    } catch(e) { showToast('Gabim: ' + e.message, 'error'); }
}

// Start hourly snapshots
setInterval(saveHourlySnapshot, 60 * 60 * 1000); // çdo 1 orë
// Also save one on page load
setTimeout(saveHourlySnapshot, 5000);

// === FEATURE 8: Timeline e Ndryshimeve ===
function trackChange(action, type, itemId) {
    if (!state.changeTimeline) state.changeTimeline = [];
    state.changeTimeline.push({
        date: new Date().toISOString(),
        action: action, // 'add', 'edit', 'delete', 'restore'
        type: type,      // 'sale', 'client', 'payment', etc.
        itemId: itemId
    });
    // Keep last 500 entries
    if (state.changeTimeline.length > 500) state.changeTimeline = state.changeTimeline.slice(-500);
}

function showChangeTimeline() {
    if (!state.changeTimeline || state.changeTimeline.length === 0) {
        openModal('Timeline Ndryshimesh', '<div style="text-align:center;padding:30px;color:#999;"><i class="fas fa-history" style="font-size:3em;"></i><p>Asnjë ndryshim i regjistruar.</p></div>');
        return;
    }

    const actionIcons = { add: '➕', edit: '✏️', delete: '🗑️', restore: '🔄', cancel: '❌' };
    const actionColors = { add: '#4CAF50', edit: '#2196F3', delete: '#e74c3c', restore: '#FF9800', cancel: '#9C27B0' };
    const typeNames = { sale: 'Shitje', client: 'Klient', payment: 'Pagesë', expense: 'Shpenzim', stock: 'Stok' };

    const rows = state.changeTimeline.slice().reverse().slice(0, 100).map(c => {
        const date = new Date(c.date).toLocaleString('sq-AL');
        const icon = actionIcons[c.action] || '📝';
        const color = actionColors[c.action] || '#666';
        const typeName = typeNames[c.type] || c.type;
        return `<tr>
            <td style="padding:6px 8px;font-size:0.85em;color:#888;">${date}</td>
            <td style="padding:6px 8px;">${icon} <span style="color:${color};font-weight:600;">${c.action}</span></td>
            <td style="padding:6px 8px;">${typeName}</td>
            <td style="padding:6px 8px;font-size:0.85em;color:#888;">${c.itemId || ''}</td>
        </tr>`;
    }).join('');

    openModal('📋 Timeline Ndryshimesh', `
        <p style="color:#888;margin-bottom:10px;">${state.changeTimeline.length} ndryshime totale (shfaqen 100 të fundit)</p>
        <div class="table-container"><table class="data-table">
            <thead><tr><th>Data</th><th>Veprimi</th><th>Tipi</th><th>ID</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `);
}

// === FEATURE 9: Restore me Undo (30 sekonda) ===
let _restoreUndoTimer = null;
let _restoreUndoData = null;

function showRestoreUndoBar() {
    // Remove old bar if exists
    document.getElementById('restore-undo-bar')?.remove();

    const bar = document.createElement('div');
    bar.id = 'restore-undo-bar';
    bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:12px;display:flex;align-items:center;gap:15px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:0.95em;animation:slideUp 0.3s ease;';
    bar.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color:#FF9800;font-size:1.3em;"></i>
        <span>Restore u krye. <strong id="undo-countdown">30</strong>s për ta kthyer</span>
        <button onclick="_undoRestore()" style="background:#FF9800;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:0.95em;">
            <i class="fas fa-undo"></i> KTHE
        </button>
        <button onclick="_dismissUndoBar()" style="background:transparent;color:#888;border:none;cursor:pointer;font-size:1.1em;">✕</button>
    `;
    document.body.appendChild(bar);

    let seconds = 30;
    _restoreUndoTimer = setInterval(() => {
        seconds--;
        const countdown = document.getElementById('undo-countdown');
        if (countdown) countdown.textContent = seconds;
        if (seconds <= 0) _dismissUndoBar();
    }, 1000);
}

function _undoRestore() {
    if (!_restoreUndoData) { showToast('Nuk ka të dhëna për undo!', 'error'); return; }
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, _restoreUndoData);
    if (!state.activityLog) state.activityLog = [];
    logActivity('undo_restore', 'U kthye restore-i i fundit');
    saveState();
    _dismissUndoBar();
    showToast('Restore u kthye! Faqja po ringarkohet...', 'success');
    setTimeout(() => location.reload(), 800);
}

function _dismissUndoBar() {
    clearInterval(_restoreUndoTimer);
    _restoreUndoTimer = null;
    _restoreUndoData = null;
    document.getElementById('restore-undo-bar')?.remove();
}

// === FEATURE 10: Dual Storage Enhanced ===
function dualSave() {
    try { saveState(); } catch(e) { console.warn('localStorage save failed:', e); }
    try { if (typeof saveToIndexedDB === 'function') saveToIndexedDB(); } catch(e) { console.warn('IndexedDB save failed:', e); }
}

// === FEATURE 11: Export Automatik Javor në Excel ===
function checkWeeklyAutoExport() {
    const lastExport = localStorage.getItem('hurma_weekly_excel_export');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (lastExport && new Date(lastExport) > weekAgo) return;
    if (now.getDay() !== 0) return; // vetëm të dielën

    // Auto export
    setTimeout(() => {
        if (typeof masterExport === 'function') {
            try {
                masterExport();
                localStorage.setItem('hurma_weekly_excel_export', now.toISOString());
                showToast('Eksporti javor automatik i Excel u shkarkua!', 'info');
            } catch(e) {}
        }
    }, 5000);
}

// === FEATURE 12: Hash Verifikim ===
function generateBackupHash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return 'HB-' + Math.abs(hash).toString(36).toUpperCase();
}

function downloadVerifiedBackup() {
    const data = JSON.parse(JSON.stringify(state));
    const hash = generateBackupHash(data);
    data._backupMeta = {
        hash: hash,
        date: new Date().toISOString(),
        version: '2.0',
        salesCount: state.sales.length,
        clientsCount: state.clients.length
    };
    const json = JSON.stringify(data, null, 2);
    const filename = 'hurma_verified_' + new Date().toISOString().slice(0, 10) + '_' + hash + '.json';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    showToast('Backup i verifikuar: ' + hash, 'success');
}

function verifyBackupFile() {
    openModal('Verifiko Backup', `
        <div style="text-align:center;padding:15px;">
            <div style="font-size:3em;margin-bottom:10px;">🔍</div>
            <p style="color:#888;margin-bottom:15px;">Zgjidhni skedarin backup për verifikim</p>
            <input type="file" id="verify-backup-file" accept=".json"
                onchange="_onVerifyFileSelected(this)"
                style="width:100%;padding:15px;border:3px dashed var(--primary);border-radius:12px;font-size:1em;cursor:pointer;background:var(--bg-secondary);box-sizing:border-box;">
        </div>
    `);
}

function _onVerifyFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const meta = data._backupMeta;
            if (!meta || !meta.hash) {
                openModal('Verifikim Backup', '<div style="text-align:center;padding:20px;"><i class="fas fa-question-circle" style="font-size:3em;color:#FF9800;"></i><p style="margin-top:10px;">Ky backup nuk ka hash verifikimi.<br>Mund të jetë i vjetër ose i krijuar nga versioni i hershëm.</p><p style="color:#888;">Skedari ka: <strong>' + (data.sales||[]).length + '</strong> shitje, <strong>' + (data.clients||[]).length + '</strong> klientë</p></div>');
                return;
            }
            const dataClean = JSON.parse(JSON.stringify(data));
            delete dataClean._backupMeta;
            const calcHash = generateBackupHash(dataClean);
            const isValid = calcHash === meta.hash;

            openModal('Verifikim Backup', `
                <div style="text-align:center;padding:20px;">
                    <i class="fas fa-${isValid ? 'check-circle' : 'times-circle'}" style="font-size:4em;color:${isValid ? 'var(--success)' : 'var(--danger)'};"></i>
                    <h3 style="margin:15px 0;color:${isValid ? 'var(--success)' : 'var(--danger)'};">${isValid ? 'Backup i Vlefshëm!' : 'KUJDES: Backup i Ndryshuar!'}</h3>
                    <div style="background:var(--bg-secondary);padding:15px;border-radius:10px;text-align:left;font-size:0.9em;">
                        <p>Hash origjinal: <strong>${meta.hash}</strong></p>
                        <p>Hash i rillogaritur: <strong>${calcHash}</strong></p>
                        <p>Data e backup: <strong>${new Date(meta.date).toLocaleString('sq-AL')}</strong></p>
                        <p>Shitje: <strong>${meta.salesCount}</strong> | Klientë: <strong>${meta.clientsCount}</strong></p>
                    </div>
                    ${!isValid ? '<p style="color:var(--danger);margin-top:10px;font-weight:bold;">Skedari mund të jetë i dëmtuar ose i modifikuar!</p>' : ''}
                </div>
            `);
        } catch(err) { showToast('Skedar i pavlefshëm!', 'error'); }
    };
    reader.readAsText(file);
}

// === FEATURE 13: Restore Log (Ditari) ===
function addRestoreLog(action, details) {
    if (!state.restoreLog) state.restoreLog = [];
    state.restoreLog.push({
        date: new Date().toISOString(),
        action: action,
        details: details,
        salesBefore: state.sales.length,
        clientsBefore: state.clients.length,
        debtBefore: state.clients.reduce((s, c) => s + (c.debt || 0), 0)
    });
    if (state.restoreLog.length > 50) state.restoreLog = state.restoreLog.slice(-50);
}

function showRestoreLog() {
    if (!state.restoreLog || state.restoreLog.length === 0) {
        openModal('Ditari i Restore-ve', '<div style="text-align:center;padding:30px;color:#999;"><i class="fas fa-clipboard-list" style="font-size:3em;"></i><p>Asnjë restore i regjistruar.</p></div>');
        return;
    }

    const rows = state.restoreLog.slice().reverse().map(r => {
        const date = new Date(r.date).toLocaleString('sq-AL');
        return `<tr>
            <td style="padding:8px;font-size:0.85em;">${date}</td>
            <td style="padding:8px;"><strong>${r.action}</strong></td>
            <td style="padding:8px;font-size:0.85em;">${r.details || ''}</td>
            <td style="padding:8px;">Sh:${r.salesBefore} | Kl:${r.clientsBefore} | Bor:${r.debtBefore}den</td>
        </tr>`;
    }).join('');

    openModal('📓 Ditari i Restore-ve', `
        <div class="table-container"><table class="data-table">
            <thead><tr><th>Data</th><th>Veprimi</th><th>Detaje</th><th>Para restore</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `);
}

// === FEATURE 14: PIN Protection para Restore ===
function pinProtectedRestore(callback) {
    if (state.deletePin) {
        openModal('Verifikim PIN', `
            <div style="text-align:center;padding:20px;">
                <i class="fas fa-lock" style="font-size:3em;color:var(--primary);margin-bottom:15px;"></i>
                <p style="margin-bottom:15px;">Vendosni PIN-in për të vazhduar me restore:</p>
                <input type="password" id="restore-pin-input" maxlength="6" placeholder="PIN"
                    style="width:150px;text-align:center;font-size:1.5em;padding:10px;border:2px solid var(--primary);border-radius:10px;letter-spacing:8px;"
                    onkeyup="if(event.key==='Enter') _verifyRestorePin()">
                <br><br>
                <button onclick="_verifyRestorePin()" class="btn btn-primary" style="padding:10px 30px;">
                    <i class="fas fa-unlock"></i> Verifiko
                </button>
            </div>
        `);
        window._pinRestoreCallback = callback;
    } else {
        callback();
    }
}

function _verifyRestorePin() {
    const pin = document.getElementById('restore-pin-input')?.value;
    if (pin === state.deletePin) {
        closeModal();
        if (typeof window._pinRestoreCallback === 'function') {
            window._pinRestoreCallback();
            window._pinRestoreCallback = null;
        }
    } else {
        showToast('PIN i gabuar!', 'error');
        document.getElementById('restore-pin-input').value = '';
        document.getElementById('restore-pin-input').focus();
    }
}

// === FEATURE 15: Cloud Sync Placeholder (Google Drive via Manual) ===
function showCloudSyncOptions() {
    const backup = JSON.stringify(state, null, 2);
    const hash = generateBackupHash(state);
    const size = new TextEncoder().encode(backup).length;
    const sizeStr = size < 1024 * 1024 ? Math.round(size / 1024) + ' KB' : (size / (1024 * 1024)).toFixed(2) + ' MB';

    openModal('☁️ Cloud Sync', `
        <div style="padding:10px;">
            <div style="background:var(--bg-secondary);padding:15px;border-radius:10px;margin-bottom:20px;text-align:center;">
                <p style="color:#888;">Madhësia: <strong>${sizeStr}</strong> | Hash: <strong>${hash}</strong></p>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
                <button onclick="uploadToGoogleDrive()" style="padding:14px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#4285F4;color:white;font-size:1em;">
                    <span style="font-size:1.5em;">📁</span>
                    <span style="text-align:left;"><strong>Google Drive</strong><br><small style="opacity:0.8;">Ngarko backup në Drive</small></span>
                </button>
                <button onclick="sendBackupViaWhatsApp()" style="padding:14px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#25D366;color:white;font-size:1em;">
                    <span style="font-size:1.5em;">💬</span>
                    <span style="text-align:left;"><strong>WhatsApp</strong><br><small style="opacity:0.8;">Dërgo backup vetes në WhatsApp</small></span>
                </button>
                <button onclick="sendBackupToEmailBeforeRestore()" style="padding:14px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#EA4335;color:white;font-size:1em;">
                    <span style="font-size:1.5em;">📧</span>
                    <span style="text-align:left;"><strong>Email</strong><br><small style="opacity:0.8;">Dërgo backup në email</small></span>
                </button>
                <button onclick="copyBackupToClipboard()" style="padding:14px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#FF9800;color:white;font-size:1em;">
                    <span style="font-size:1.5em;">📋</span>
                    <span style="text-align:left;"><strong>Clipboard</strong><br><small style="opacity:0.8;">Kopjo për paste manual</small></span>
                </button>
            </div>
        </div>
    `);
}

function uploadToGoogleDrive() {
    downloadVerifiedBackup();
    showToast('Backup u shkarkua — ngarkoje manualisht në Google Drive', 'info');
    setTimeout(() => {
        window.open('https://drive.google.com/drive/my-drive', '_blank');
    }, 1000);
}

function sendBackupViaWhatsApp() {
    const stats = 'Hurma Backup ' + new Date().toLocaleDateString('sq-AL') + '\n' +
        'Shitje: ' + state.sales.length + '\n' +
        'Kliente: ' + state.clients.length + '\n' +
        'Borxh total: ' + state.clients.reduce((s, c) => s + (c.debt || 0), 0) + ' den\n\n' +
        '(Backup JSON u shkarkua si skedar)';
    downloadVerifiedBackup();
    setTimeout(() => {
        window.open('https://wa.me/?text=' + encodeURIComponent(stats), '_blank');
    }, 500);
}

// === UPDATE _confirmRestore to use new features ===
(function() {
    const origConfirmRestore = window._confirmRestore;
    window._confirmRestore = function() {
        const data = window._pendingRestore;
        if (!data) { showToast('Nuk ka të dhëna!', 'error'); return; }

        // Save pre-restore state for undo
        _restoreUndoData = JSON.parse(JSON.stringify(state));

        // Auto backup before restore (Feature 1)
        autoBackupBeforeRestore();

        // Add to restore log (Feature 13)
        addRestoreLog('restore', window._pendingRestoreFile || 'backup');

        // Track change (Feature 8)
        trackChange('restore', 'state', 'full_restore');

        // Do the restore
        Object.keys(state).forEach(k => delete state[k]);
        Object.assign(state, data);
        if (!state.activityLog) state.activityLog = [];
        if (!state.trash) state.trash = [];
        if (!state.restoreLog) state.restoreLog = [];
        if (!state.changeTimeline) state.changeTimeline = [];
        logActivity('restore', 'Backup u rikthye: ' + (window._pendingRestoreFile || ''));

        saveState();
        dualSave();

        window._pendingRestore = null;
        window._pendingRestoreFile = null;
        closeModal();

        showToast('Backup u rikthye me sukses!', 'success');
        showRestoreUndoBar(); // Feature 9: 30s undo
        setTimeout(() => location.reload(), 2000); // 2s delay for undo chance
    };
})();

// === DATA PROTECTION DASHBOARD ===
function showDataProtectionDashboard() {
    const trashCount = (state.trash || []).length;
    const snapshotCount = (state.hourlySnapshots || []).length;
    const versionCount = (() => { let c = 0; for (let i = 1; i <= 30; i++) { if (localStorage.getItem('hurma_version_' + i)) c++; } return c; })();
    const restoreLogCount = (state.restoreLog || []).length;
    const changeCount = (state.changeTimeline || []).length;
    const hasPreRestore = !!localStorage.getItem('hurma_pre_restore_backup');
    const hasPin = !!state.deletePin;

    openModal('🛡️ Mbrojtja e të Dhënave', `
        <div style="padding:5px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
                <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;text-align:center;">
                    <div style="font-size:1.8em;">🗑️</div><strong>${trashCount}</strong><br><small>Në kosh</small>
                </div>
                <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;text-align:center;">
                    <div style="font-size:1.8em;">⏰</div><strong>${snapshotCount}</strong><br><small>Snapshots</small>
                </div>
                <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;text-align:center;">
                    <div style="font-size:1.8em;">📁</div><strong>${versionCount}</strong><br><small>Versione</small>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px;">
                <div style="padding:8px 12px;background:${hasPreRestore ? '#e8f5e9' : '#ffebee'};border-radius:8px;font-size:0.9em;">
                    ${hasPreRestore ? '✅' : '❌'} Backup para-restore
                </div>
                <div style="padding:8px 12px;background:${hasPin ? '#e8f5e9' : '#fff3e0'};border-radius:8px;font-size:0.9em;">
                    ${hasPin ? '🔒' : '🔓'} PIN mbrojtës
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button onclick="showTrashBin()" class="btn" style="padding:12px;">🗑️ Koshi</button>
                <button onclick="showHourlySnapshots()" class="btn" style="padding:12px;">⏰ Snapshots</button>
                <button onclick="showVersionHistory()" class="btn" style="padding:12px;">📁 Versione</button>
                <button onclick="showChangeTimeline()" class="btn" style="padding:12px;">📋 Timeline</button>
                <button onclick="showRestoreLog()" class="btn" style="padding:12px;">📓 Ditari</button>
                <button onclick="restorePreRestoreBackup()" class="btn" style="padding:12px;">🔄 Para-Restore</button>
                <button onclick="openSelectiveRestoreModal()" class="btn btn-info" style="padding:12px;">🎯 Selektiv</button>
                <button onclick="showCloudSyncOptions()" class="btn btn-primary" style="padding:12px;">☁️ Cloud</button>
                <button onclick="downloadVerifiedBackup()" class="btn btn-success" style="padding:12px;">✅ Backup+Hash</button>
                <button onclick="verifyBackupFile()" class="btn btn-warning" style="padding:12px;">🔍 Verifiko</button>
            </div>
        </div>
    `);
}

// Initialize app
document.addEventListener('DOMContentLoaded', init);


// ===================== PWA — PROGRESSIVE WEB APP =====================

let _swRegistration = null;       // Referencë tek SW registration
let _pwaInstallPrompt = null;     // Eventi beforeinstallprompt i ruajtur
let _pwaNotifInterval = null;     // Intervali i kontrolleve periodike

// ---- Pikë hyrëse: regjistron SW dhe nis gjithçka ----
function initPWA() {
    _registerServiceWorker();
    _setupInstallPrompt();
    _listenForSWMessages();
    _handleStartupParams();

    // Kontrollo njoftime menjëherë pas ngarkimit (me vonesë 3s që të hapet UI)
    setTimeout(() => _runNotificationChecks(), 3000);

    // Pastaj çdo 30 minuta derisa tab-i është i hapur
    _pwaNotifInterval = setInterval(() => _runNotificationChecks(), 30 * 60 * 1000);
}

// ---- Regjistro Service Worker ----
function _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            _swRegistration = reg;

            // Kur gjendet update i ri, shfaq bannerin
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        document.getElementById('pwa-update-banner').style.display = 'block';
                    }
                });
            });

            // Kontrollo update menjëherë
            reg.update();
        })
        .catch(err => console.warn('SW regjistrim dështoi:', err));
}

// ---- Ruaj prompt-in "Instalo App" nga browseri ----
function _setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        _pwaInstallPrompt = e;

        // Mos shfaq nëse përdoruesi e ka fshehur këtë sesion
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
            document.getElementById('pwa-install-banner').style.display = 'block';
        }
    });

    // Kur instalohet me sukses, fshih bannerin
    window.addEventListener('appinstalled', () => {
        document.getElementById('pwa-install-banner').style.display = 'none';
        _pwaInstallPrompt = null;
        showToast('🌴 Hurma App u instalua me sukses!', 'success');
    });
}

// ---- Butoni "Instalo" klikuar nga përdoruesi ----
function pwaTriggerInstall() {
    if (!_pwaInstallPrompt) {
        showToast('Browseri nuk mbështet instalimin automatik. Përdor "Shto në ekranin kryesor" nga menuja e browserit.', 'info');
        return;
    }
    _pwaInstallPrompt.prompt();
    _pwaInstallPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
            showToast('Po instalohet Hurma App...', 'success');
        }
        document.getElementById('pwa-install-banner').style.display = 'none';
        _pwaInstallPrompt = null;
    });
}

// ---- Butoni "Jo tani" ----
function pwaDismissInstall() {
    document.getElementById('pwa-install-banner').style.display = 'none';
    sessionStorage.setItem('pwa-install-dismissed', '1');
}

// ---- Butoni "Ringarko" për update ----
function pwaApplyUpdate() {
    if (_swRegistration && _swRegistration.waiting) {
        _swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
}

// ---- Dëgjo mesazhet nga SW (p.sh. klik notifikimt) ----
function _listenForSWMessages() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', event => {
        if (!event.data) return;
        if (event.data.type === 'NOTIFICATION_CLICK' && event.data.url) {
            const url = new URL(event.data.url, window.location.origin);
            const page = url.searchParams.get('page');
            if (page) navigateTo(page);
        }
    });
}

// ---- Trajto parametrat ?page= nga shortcut-et e manifest ----
function _handleStartupParams() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page) setTimeout(() => navigateTo(page), 500);
}

// ===================== NJOFTIME LOKALE (Notification API) =====================

// Kërko leje nga përdoruesi për njoftime
function pwaRequestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Browseri juaj nuk mbështet njoftimet.', 'warning');
        return;
    }
    if (Notification.permission === 'granted') {
        showToast('Njoftimet janë tashmë të aktivizuara ✓', 'success');
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('✅ Njoftimet u aktivizuan! Do të njoftoheni për fatura dhe stok kritik.', 'success');
            _runNotificationChecks();
        } else {
            showToast('Njoftimet u refuzuan. Mund t\'i aktivizosh nga cilësimet e browserit.', 'warning');
        }
    });
}

// Shfaq një njoftim duke përdorur SW (nëse ka) ose Notification API direkt
function _showBrowserNotification(title, body, tag, pageUrl) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
        body,
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag,
        vibrate: [200, 100, 200],
        data: pageUrl ? { url: pageUrl } : {}
    };

    // Preferoj SW showNotification (mbështet klikimin)
    if (_swRegistration) {
        _swRegistration.showNotification(title, options);
    } else {
        const n = new Notification(title, options);
        if (pageUrl) n.onclick = () => { window.focus(); navigateTo(pageUrl); };
    }
}

// ---- Kontrollet kryesore — thirren çdo 30 min ----
function _runNotificationChecks() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    _checkOverdueInvoices();
    _checkCriticalStock();
    _checkHighClientDebts();
    _checkFatonDebtAlert();
}

// 1. Fatura të skaduara
function _checkOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0];
    const overdue = (state.sales || []).filter(s =>
        s.paymentType === 'invoice_60' && !s.invoicePaid && s.dueDate && s.dueDate < today
    );
    if (overdue.length === 0) return;

    const total = overdue.reduce((sum, s) => sum + (s.sellTotal || 0), 0);
    const clientNames = [...new Set(overdue.map(s => {
        const c = (state.clients || []).find(cl => cl.id === s.clientId);
        return c ? c.name : 'I panjohur';
    }))].slice(0, 3).join(', ');

    _showBrowserNotification(
        `⚠️ ${overdue.length} Fatura të Skaduara`,
        `Totali: ${total.toLocaleString()} den\nKlientë: ${clientNames}`,
        'hurma-overdue-invoices',
        '/?page=sales'
    );
}

// 2. Stok kritik (< 3 njësi)
function _checkCriticalStock() {
    const critical = PRODUCTS.filter(p => (state.stock[p.id] || 0) < 3);
    if (critical.length === 0) return;

    const names = critical.map(p => `${p.name} (${state.stock[p.id] || 0})`).join(', ');

    _showBrowserNotification(
        `📦 Stok Kritik — ${critical.length} Produkt${critical.length > 1 ? 'e' : ''}`,
        names,
        'hurma-critical-stock',
        '/?page=stock'
    );
}

// 3. Borxhe të mëdha klientësh (> 5000 den)
function _checkHighClientDebts() {
    const DEBT_THRESHOLD = 5000;
    const debtors = (state.clients || [])
        .filter(c => (c.debt || 0) > DEBT_THRESHOLD)
        .sort((a, b) => b.debt - a.debt)
        .slice(0, 3);

    if (debtors.length === 0) return;

    const names = debtors.map(c => `${c.name}: ${c.debt.toLocaleString()} den`).join('\n');

    _showBrowserNotification(
        `💰 ${debtors.length} Klient${debtors.length > 1 ? 'ë' : ''} me Borxh të Lartë`,
        names,
        'hurma-client-debts',
        '/?page=clients'
    );
}

// 4. Borxhi i Fatonit (> 10,000 den)
function _checkFatonDebtAlert() {
    const FATON_THRESHOLD = 10000;
    try {
        const fatonDebt = calcFatonDebt();
        if (fatonDebt > FATON_THRESHOLD) {
            _showBrowserNotification(
                `🤝 Borxhi i Fatonit: ${fatonDebt.toLocaleString()} den`,
                `Borxhi ka kaluar kufirin prej ${FATON_THRESHOLD.toLocaleString()} den.`,
                'hurma-faton-debt',
                '/?page=faton'
            );
        }
    } catch(e) { /* calcFatonDebt mund të mos jetë e disponueshme */ }
}

// ---- Ndryshimi i temës → përditëso meta theme-color ----
const _origToggleTheme = typeof toggleTheme === 'function' ? toggleTheme : null;
if (_origToggleTheme) {
    // Mbështjellim i sigurt — thirret pas toggleTheme ekzistues
    const _themeMetaSync = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const meta = document.getElementById('meta-theme-color');
        if (meta) meta.setAttribute('content', isDark ? '#1a1a2e' : '#2c7a4b');
    };
    document.getElementById('dark-mode-toggle') &&
        document.getElementById('dark-mode-toggle').addEventListener('change', _themeMetaSync);
}

// ---- Butoni "Njoftime" i ekspozuar për Settings ----
// Thirret nga UI (mund të shtohet buton në Settings)
function openPWASettings() {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const swStatus = _swRegistration ? '✅ Aktiv' : '❌ Jo aktiv';
    const notifStatus = !('Notification' in window)
        ? '❌ Nuk mbështetet'
        : Notification.permission === 'granted' ? '✅ Aktivizuar'
        : Notification.permission === 'denied' ? '🚫 Bllokuar (ndrysho nga cilësimet e browserit)'
        : '⏳ Pa kërkuar leje';

    openModal('⚙️ Cilësimet PWA', `
        <div style="display:flex;flex-direction:column;gap:14px;padding:10px 0;">
            <div style="background:var(--bg-secondary);padding:14px;border-radius:10px;">
                <div style="font-weight:bold;margin-bottom:8px;"><i class="fas fa-mobile-alt"></i> Statusi i App</div>
                <div>📱 Instaluar si app: <strong>${isInstalled ? '✅ Po' : '❌ Jo'}</strong></div>
                <div>⚙️ Service Worker: <strong>${swStatus}</strong></div>
                <div>🔔 Njoftime: <strong>${notifStatus}</strong></div>
            </div>

            ${Notification.permission !== 'granted' ? `
            <button onclick="pwaRequestNotificationPermission();closeModal();"
                style="background:#2c7a4b;color:#fff;border:none;border-radius:10px;padding:12px;font-size:1em;cursor:pointer;font-weight:bold;">
                <i class="fas fa-bell"></i> Aktivizo Njoftimet
            </button>` : `
            <button onclick="_runNotificationChecks();closeModal();showToast('Kontrolli u ekzekutua!','success');"
                style="background:#1565c0;color:#fff;border:none;border-radius:10px;padding:12px;font-size:1em;cursor:pointer;">
                <i class="fas fa-sync"></i> Testo Njoftimet Tani
            </button>`}

            ${!isInstalled && _pwaInstallPrompt ? `
            <button onclick="pwaTriggerInstall();closeModal();"
                style="background:#e65100;color:#fff;border:none;border-radius:10px;padding:12px;font-size:1em;cursor:pointer;font-weight:bold;">
                <i class="fas fa-download"></i> Instalo si App
            </button>` : ''}

            <div style="font-size:0.85em;color:var(--text-secondary);text-align:center;padding-top:4px;">
                Hurma PWA • Service Worker v1<br>
                Njoftime çdo 30 min kur app-i është i hapur
            </div>
        </div>
    `);
}
