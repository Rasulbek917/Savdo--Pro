/* ==========================================================================
   SavdoPro - Firebase REALTIME DATABASE versiyasi
   Barcha o'zgarishlar barcha qurilmalarga DARHOL ko'rinadi
   ========================================================================== */

// --- Global Application State ---
const APP_STATE = {
    categories: [],
    products: [],
    sales: [],
    debts: [],
    users: [],
    activeView: 'dashboard',
    activePeriod: 'month',
    theme: 'dark',
    cart: [],
    chart: null,
    html5QrScanner: null,
    currentUser: null
};

// --- Firebase Config & Initialization ---
// SIZNING Firebase Realtime Database config (savdo-b23e2 loyihasi)
const firebaseConfig = {
    apiKey: "AIzaSyBcZMX9NIf4qlNiDXIYbsmMFxCrxv5kWOE",
    authDomain: "savdo-b23e2.firebaseapp.com",
    databaseURL: "https://savdo-b23e2-default-rtdb.firebaseio.com",
    projectId: "savdo-b23e2",
    storageBucket: "savdo-b23e2.firebasestorage.app",
    messagingSenderId: "10941056010",
    appId: "1:10941056010:web:4455eefde7e2d34d560bf3",
    measurementId: "G-1P31H91HNG"
};

// Firebase initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // <-- Realtime Database

// Aktiv listener'larni saqlash (logout qilganda o'chirish uchun)
let rtListeners = {};

/* ==========================================================================
   SEED DATA
   ========================================================================== */
function getInitialSeedData() {
    const today = new Date();
    const formatDate = (offset) => {
        const d = new Date();
        d.setDate(today.getDate() - offset);
        return d.toISOString().split('T')[0];
    };

    return {
        categories: [
            { id: 'cat-1', name: 'Kitoblar',     description: "O'quv qo'llanmalari va badiiy kitoblar" },
            { id: 'cat-2', name: 'Mevalar',      description: 'Yangi uzilgan meva va sabzavotlar' },
            { id: 'cat-3', name: 'Ichimliklar',  description: 'Salqin ichimliklar va sharbatlar' },
            { id: 'cat-4', name: 'Shirinliklar', description: 'Turli xil pishiriqlar va shokoladlar' }
        ],
        products: [
            { id: 'prod-1', name: 'Tactics',        categoryId: 'cat-1', costPrice: 35000, sellingPrice: 50000,  unit: 'dona', stock: 10,  code: 'tactics'        },
            { id: 'prod-2', name: 'Olma',           categoryId: 'cat-2', costPrice: 8000,  sellingPrice: 12000,  unit: 'kg',   stock: 20,  code: 'olma'           },
            { id: 'prod-3', name: 'Coca-Cola 1.5L', categoryId: 'cat-3', costPrice: 9000,  sellingPrice: 13000,  unit: 'dona', stock: 45,  code: '5449000000996'  },
            { id: 'prod-4', name: 'Chococream',     categoryId: 'cat-4', costPrice: 18000, sellingPrice: 25000,  unit: 'dona', stock: 3,   code: 'CHOCO777'       },
            { id: 'prod-5', name: 'Pepsi 1.5L',    categoryId: 'cat-3', costPrice: 8500,  sellingPrice: 12500,  unit: 'dona', stock: 4,   code: '5449000000123'  }
        ],
        sales: [
            {
                id: 'sale-1001',
                timestamp: formatDate(2) + 'T14:30:00',
                items: [
                    { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 150, costPrice: 9000,  sellingPrice: 13000 },
                    { productId: 'prod-4', name: 'Chococream',     quantity: 24,  costPrice: 18000, sellingPrice: 25000 }
                ],
                totalRevenue: 2550000, totalCost: 410000, totalProfit: 2140000
            },
            {
                id: 'sale-1002',
                timestamp: formatDate(1) + 'T16:45:00',
                items: [
                    { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 38, costPrice: 9000,  sellingPrice: 13000 },
                    { productId: 'prod-4', name: 'Chococream',     quantity: 16, costPrice: 18000, sellingPrice: 25000 }
                ],
                totalRevenue: 609800, totalCost: 111000, totalProfit: 498800
            },
            {
                id: 'sale-1003',
                timestamp: formatDate(0) + 'T11:15:00',
                items: [
                    { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 98, costPrice: 9000,  sellingPrice: 13000 },
                    { productId: 'prod-4', name: 'Chococream',     quantity: 20, costPrice: 18000, sellingPrice: 25000 }
                ],
                totalRevenue: 1570000, totalCost: 250000, totalProfit: 1320000
            }
        ],
        debts: [
            {
                id: 'debt-1',
                name: 'Alijon Valiyev',
                phone: '+998901234567',
                amount: 150000,
                date: formatDate(3),
                notes: 'Qarz kitoblar uchun',
                status: 'paid'
            }
        ]
    };
}

/* ==========================================================================
   FIREBASE REALTIME DATABASE — YOZISH / O'QISH
   ========================================================================== */

/**
 * Bir yo'nalishga ma'lumot yozadi (set)
 * path: 'shops/user-admin/products' kabi
 */
function rtSet(path, data) {
    return db.ref(path).set(data);
}

/**
 * Bir yo'nalishni bir martalik o'qiydi
 */
function rtGet(path) {
    return db.ref(path).once('value').then(snap => snap.val());
}

/**
 * Real-time listener qo'yadi. Har yangilanishda callback chaqiriladi.
 * key — listener ID (keyinroq o'chirish uchun)
 */
function rtListen(path, key, callback) {
    // Avvalgi listener bo'lsa o'chir
    rtUnlisten(key);
    const ref = db.ref(path);
    ref.on('value', snap => {
        callback(snap.val());
    });
    rtListeners[key] = { ref, handler: 'value' };
}

/**
 * Listener'ni o'chiradi
 */
function rtUnlisten(key) {
    if (rtListeners[key]) {
        rtListeners[key].ref.off();
        delete rtListeners[key];
    }
}

/**
 * Barcha listener'larni o'chiradi (logout paytida)
 */
function rtUnlistenAll() {
    Object.keys(rtListeners).forEach(key => rtUnlisten(key));
}

/* ==========================================================================
   PERSIST DATA — Realtime Database ga yozish
   ========================================================================== */
function persistData(key) {
    if (!APP_STATE.currentUser) return;
    const uid = APP_STATE.currentUser.id;

    if (key === 'users') {
        // users ni global joyga yoz
        return rtSet('users', arrayToObject(APP_STATE.users, 'id'));
    } else {
        // Do'kon ma'lumotlarini user ID bo'yicha ajratib yoz
        const data = APP_STATE[key];
        const path = `shops/${uid}/${key}`;
        // Array bo'lsa object ga o'tkazamiz (Realtime DB uchun)
        return rtSet(path, arrayToObject(data, 'id')).catch(err => {
            console.error(`RT save failed: ${path}`, err);
            showToast('Sinxronizatsiya xatosi', "Ma'lumotlarni bulutga yozib bo'lmadi", 'danger');
        });
    }
}

/** Array -> {id: item, ...} object formatiga o'tkazadi */
function arrayToObject(arr, idKey = 'id') {
    if (!Array.isArray(arr)) return {};
    const obj = {};
    arr.forEach(item => {
        if (item && item[idKey]) {
            obj[item[idKey]] = item;
        }
    });
    return obj;
}

/** {id: item} object -> Array ga o'tkazadi */
function objectToArray(obj) {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj);
}

/* ==========================================================================
   INIT DATABASE
   ========================================================================== */
function initDatabase() {
    // Theme
    APP_STATE.theme = localStorage.getItem('savdopro_theme') || 'dark';
    document.body.setAttribute('data-theme', APP_STATE.theme);

    // Users ni RT DB dan bir marta o'qib olish
    rtGet('users').then(usersObj => {
        if (usersObj) {
            APP_STATE.users = objectToArray(usersObj);
        } else {
            // Birinchi ishga tushish — seed users
            const defaultUsers = [
                { id: 'user-admin', username: 'admin', password: '123', shopName: 'Admin Boshqaruv', role: 'admin' },
                { id: 'user-shop1', username: 'kitob',  password: '123', shopName: 'Kitoblar Olami',  role: 'staff' },
                { id: 'user-shop2', username: 'meva',   password: '123', shopName: 'Meva Bozori',     role: 'staff' }
            ];
            APP_STATE.users = defaultUsers;
            rtSet('users', arrayToObject(defaultUsers, 'id'));
        }

        // Session tekshirish
        const savedUserId = localStorage.getItem('savdopro_session_user_id');
        if (savedUserId) {
            const user = APP_STATE.users.find(u => u.id === savedUserId);
            if (user) {
                loginUserSession(user);
                return;
            }
        }
        showLandingPage();
    }).catch(err => {
        console.error('RT DB init error:', err);
        showLandingPage();
    });
}

/* ==========================================================================
   LOGIN / LOGOUT
   ========================================================================== */
function loginUserSession(user) {
    APP_STATE.currentUser = user;
    localStorage.setItem('savdopro_session_user_id', user.id);

    // Barcha eski listener'larni o'chir
    rtUnlistenAll();

    // Do'kon ma'lumotlarini REAL-TIME kuzat
    // Har qanday qurilmadan o'zgarish bo'lsa — darhol bu qurilmaga ham keladi
    const uid = user.id;

    // --- CATEGORIES real-time ---
    rtListen(`shops/${uid}/categories`, 'categories', (data) => {
        APP_STATE.categories = objectToArray(data);
        renderRealTime();
    });

    // --- PRODUCTS real-time ---
    rtListen(`shops/${uid}/products`, 'products', (data) => {
        APP_STATE.products = objectToArray(data);
        renderRealTime();
        updateBadges();
    });

    // --- SALES real-time ---
    rtListen(`shops/${uid}/sales`, 'sales', (data) => {
        APP_STATE.sales = objectToArray(data);
        renderRealTime();
        if (APP_STATE.activeView === 'dashboard') renderSalesChart();
    });

    // --- DEBTS real-time ---
    rtListen(`shops/${uid}/debts`, 'debts', (data) => {
        APP_STATE.debts = objectToArray(data);
        renderRealTime();
    });

    // --- USERS real-time (faqat admin uchun) ---
    if (user.role === 'admin') {
        rtListen('users', 'users', (data) => {
            APP_STATE.users = objectToArray(data);
            if (APP_STATE.activeView === 'admin') renderAdminView();
        });
    }

    // Birinchi marta ma'lumot borligini tekshir, yo'q bo'lsa seed qil
    rtGet(`shops/${uid}`).then(shopData => {
        if (!shopData) {
            // Yangi user — bo'sh yoki seed data bilan boshlash
            const seed = getInitialSeedData();
            let shopSeedData = { categories: {}, products: {}, sales: {}, debts: {} };

            if (uid === 'user-admin') {
                shopSeedData = {
                    categories: arrayToObject(seed.categories, 'id'),
                    products:   arrayToObject(seed.products,   'id'),
                    sales:      arrayToObject(seed.sales,      'id'),
                    debts:      arrayToObject(seed.debts,      'id')
                };
            } else if (uid === 'user-shop1') {
                shopSeedData.categories = arrayToObject(seed.categories.filter(c => c.id === 'cat-1'), 'id');
                shopSeedData.products   = arrayToObject(seed.products.filter(p => p.categoryId === 'cat-1'), 'id');
            } else if (uid === 'user-shop2') {
                shopSeedData.categories = arrayToObject(seed.categories.filter(c => c.id === 'cat-2'), 'id');
                shopSeedData.products   = arrayToObject(seed.products.filter(p => p.categoryId === 'cat-2'), 'id');
            }

            rtSet(`shops/${uid}`, shopSeedData);
        }
    });

    // UI yangilash
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('login-overlay').classList.add('hidden');
    document.querySelector('.app-container').classList.remove('hidden');

    document.querySelector('.sidebar-user .user-avatar').textContent = user.username[0].toUpperCase();
    document.querySelector('.sidebar-user .user-info h4').textContent = user.username;
    document.querySelector('.sidebar-user .user-info p').textContent = user.shopName;

    const isAdmin = (user.role === 'admin');
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        const view = item.getAttribute('data-view');
        if (view === 'admin') {
            item.style.display = isAdmin ? 'flex' : 'none';
        } else {
            item.style.display = isAdmin ? 'none' : 'flex';
        }
    });

    showToast('Tizimga kirildi', `Xush kelibsiz, ${user.username}! Do'kon: ${user.shopName}`);

    if (isAdmin) {
        switchView('admin');
    } else {
        switchView('dashboard');
    }
}

function logoutUserSession() {
    APP_STATE.currentUser = null;
    localStorage.removeItem('savdopro_session_user_id');
    rtUnlistenAll();

    APP_STATE.categories = [];
    APP_STATE.products   = [];
    APP_STATE.sales      = [];
    APP_STATE.debts      = [];
    APP_STATE.cart       = [];

    showLandingPage();
    showToast('Tizimdan chiqildi', 'Sessiya muvaffaqiyatli yakunlandi', 'warning');
}

/* ==========================================================================
   REGISTER
   ========================================================================== */
function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value.trim();
    const shopName = document.getElementById('register-shopname').value.trim();

    if (!username || !password || !shopName) return;

    if (APP_STATE.users.some(u => u.username === username)) {
        showToast("Ro'yxatdan o'tish xatosi", 'Ushbu foydalanuvchi nomi band!', 'danger');
        return;
    }

    const newUserId = 'user-' + Date.now();
    const newUser = { id: newUserId, username, password, shopName, role: 'staff' };
    APP_STATE.users.push(newUser);

    // RT DB ga yoz
    rtSet(`users/${newUserId}`, newUser);
    rtSet(`shops/${newUserId}`, { categories: {}, products: {}, sales: {}, debts: {} });

    document.getElementById('register-modal').classList.remove('active');
    loginUserSession(newUser);
    showToast("Do'kon ochildi", "Yangi do'kon muvaffaqiyatli ro'yxatdan o'tdi!", 'success');
}

/* ==========================================================================
   LANDING / LOGIN PAGES
   ========================================================================== */
function showLandingPage() {
    document.getElementById('landing-page').classList.remove('hidden');
    document.querySelector('.app-container').classList.add('hidden');
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('register-modal').classList.remove('active');
}

function showLoginOverlay() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('register-modal').classList.remove('active');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

function showRegisterModal() {
    document.getElementById('register-modal').classList.add('active');
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-shopname').value = '';
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value.trim();
    const user = APP_STATE.users.find(u => u.username === usernameInput && u.password === passwordInput);

    if (user) {
        loginUserSession(user);
    } else {
        showToast('Login Xatosi', 'Foydalanuvchi nomi yoki maxfiy parol xato!', 'danger');
    }
}

/* ==========================================================================
   VIEW ROUTER
   ========================================================================== */
function switchView(viewName) {
    APP_STATE.activeView = viewName;

    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${viewName}-view`);
    });

    const titles = {
        dashboard:    { main: 'Bosh sahifa',               sub: "DO'KONINGIZ STATISTIKASI VA MONITORINGI"       },
        categories:   { main: 'Kategoriyalar',             sub: 'MAHSULOT KATEGORIYALARINI BOSHQARISH'           },
        products:     { main: 'Mahsulotlar',               sub: "OMBORXONA MAHSULOTLARI RO'YXATI"               },
        'low-stock':  { main: 'Kam qolganlar',             sub: 'ZAXIRASI TUGAYOTGAN MAHSULOTLAR'                },
        'best-sellers':{ main: "Ko'p sotilganlar",         sub: "ENG KO'P SOTILAYOTGAN TOVARLAR ANALITIKASI"     },
        debts:        { main: 'Qarzlar daftari',           sub: 'MIJOZLAR QARZDORLIGI NAZORATI'                  },
        sell:         { main: "Sotuv bo'limi",             sub: 'TEZKOR POS SAVDO TERMINALI'                     },
        admin:        { main: 'Foydalanuvchilar boshqaruvi', sub: "TIZIMDAGI DO'KONLAR VA USERS MONITORINGI"     }
    };

    if (titles[viewName]) {
        document.getElementById('view-title').textContent    = titles[viewName].main;
        document.getElementById('view-subtitle').textContent = titles[viewName].sub;
    }

    stopQRScanner();
    if (viewName === 'dashboard') renderSalesChart();
    renderRealTime();
}

/* ==========================================================================
   REAL-TIME RENDER PIPELINE
   ========================================================================== */
function renderRealTime() {
    updateBadges();
    switch (APP_STATE.activeView) {
        case 'dashboard':    renderDashboardStats(); renderDashboardLowStock(); renderDashboardPopular(); break;
        case 'categories':   renderCategories();    break;
        case 'products':     renderProducts();      break;
        case 'low-stock':    renderLowStockTable(); break;
        case 'best-sellers': renderBestSellersView(); break;
        case 'debts':        renderDebtsTable();    break;
        case 'sell':         renderPOSCatalog(); renderPOSCart(); break;
        case 'admin':        renderAdminView();     break;
    }
    if (window.lucide) lucide.createIcons();
}

function updateBadges() {
    const count = APP_STATE.products.filter(p => p.stock <= 5).length;
    const badge = document.getElementById('low-stock-count-badge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

/* ==========================================================================
   TOAST
   ========================================================================== */
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = { success: 'check-circle', warning: 'alert-triangle', danger: 'alert-octagon' };
    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${iconMap[type] || 'check-circle'}"></i></div>
        <div class="toast-content"><h5>${title}</h5><p>${message}</p></div>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ==========================================================================
   DATE FILTER
   ========================================================================== */
function getFilteredTransactions() {
    const now = new Date();
    return APP_STATE.sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        const diffDays = Math.ceil(Math.abs(now - saleDate) / 86400000);
        if (APP_STATE.activePeriod === 'day')   return saleDate.toDateString() === now.toDateString();
        if (APP_STATE.activePeriod === 'week')  return diffDays <= 7;
        if (APP_STATE.activePeriod === 'month') return diffDays <= 30;
        if (APP_STATE.activePeriod === 'year')  return diffDays <= 365;
        return true;
    });
}

/* ==========================================================================
   DASHBOARD
   ========================================================================== */
function renderDashboardStats() {
    const sales = getFilteredTransactions();
    let totalRevenue = 0, totalCost = 0, totalProfit = 0;
    sales.forEach(s => { totalRevenue += s.totalRevenue; totalCost += s.totalCost; totalProfit += s.totalProfit; });
    const totalDebts = APP_STATE.debts.filter(d => d.status === 'unpaid').reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);

    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('stat-cost').textContent    = formatCurrency(totalCost);
    document.getElementById('stat-profit').textContent  = formatCurrency(totalProfit);
    document.getElementById('stat-debts').textContent   = formatCurrency(totalDebts);
}

function renderDashboardLowStock() {
    const container = document.getElementById('widget-low-stock-list');
    const badge     = document.getElementById('widget-low-stock-badge');
    const items     = APP_STATE.products.filter(p => p.stock <= 5);
    badge.textContent = `${items.length} ta`;

    if (!items.length) {
        container.innerHTML = '<p class="text-center text-muted" style="padding:20px 0;">Hamma mahsulotlar yetarli miqdorda.</p>';
        return;
    }
    container.innerHTML = items.map(item => {
        const cat = APP_STATE.categories.find(c => c.id === item.categoryId)?.name || 'Kategoriyasiz';
        return `
            <div class="low-stock-item" onclick="openEditProduct('${item.id}')" style="cursor:pointer;">
                <div class="low-stock-info"><h5>${item.name}</h5><p>${cat}</p></div>
                <span class="low-stock-badge">${item.stock} ${item.unit}</span>
            </div>`;
    }).join('');
}

function renderDashboardPopular() {
    const container = document.getElementById('dashboard-popular-list');
    const popular   = getPopularProducts(5);

    if (!popular.length) {
        container.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:20px;">Hali sotuvlar amalga oshirilmagan.</div>';
        return;
    }
    container.innerHTML = popular.map(item => `
        <div class="popular-item">
            <div class="popular-item-info">
                <h4>${item.name}</h4>
                <p>Kategoriya: ${item.categoryName}</p>
            </div>
            <div class="popular-item-stats">
                <div class="sold-count">${item.soldQty} ${item.unit}</div>
                <div class="profit-val">+${formatCurrency(item.profit)}</div>
            </div>
        </div>`).join('');
}

function getPopularProducts(limit = 5) {
    const map = {};
    APP_STATE.sales.forEach(sale => {
        (sale.items || []).forEach(item => {
            if (!map[item.productId]) {
                const prod = APP_STATE.products.find(p => p.id === item.productId);
                map[item.productId] = {
                    name: item.name,
                    unit: prod?.unit || 'dona',
                    categoryName: APP_STATE.categories.find(c => c.id === prod?.categoryId)?.name || 'Kategoriyasiz',
                    soldQty: 0,
                    profit: 0
                };
            }
            map[item.productId].soldQty += item.quantity;
            map[item.productId].profit  += (item.sellingPrice - item.costPrice) * item.quantity;
        });
    });
    return Object.values(map).sort((a, b) => b.soldQty - a.soldQty).slice(0, limit);
}

/* ==========================================================================
   CHART
   ========================================================================== */
function renderSalesChart() {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    if (APP_STATE.chart) APP_STATE.chart.destroy();

    const now    = new Date();
    const period = APP_STATE.activePeriod;
    let labels = [], revenueData = [], profitData = [], costData = [];

    const dayUz   = d => ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'][d.getDay()];
    const monthUz = m => ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][m];

    function sumSales(filterFn) {
        let rev = 0, prf = 0, cst = 0;
        APP_STATE.sales.forEach(s => {
            if (filterFn(new Date(s.timestamp))) { rev += s.totalRevenue; cst += s.totalCost; prf += s.totalProfit; }
        });
        return [rev, prf, cst];
    }

    if (period === 'day') {
        for (let i = 5; i >= 0; i--) {
            const h = new Date(); h.setHours(now.getHours() - i);
            labels.push(`${h.getHours()}:00`);
            const [r,p,c] = sumSales(sd => sd.toDateString() === now.toDateString() && sd.getHours() === h.getHours());
            revenueData.push(r); profitData.push(p); costData.push(c);
        }
    } else if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(now.getDate() - i);
            labels.push(`${dayUz(d)} (${d.getDate()}-${monthUz(d.getMonth())})`);
            const [r,p,c] = sumSales(sd => sd.toDateString() === d.toDateString());
            revenueData.push(r); profitData.push(p); costData.push(c);
        }
    } else if (period === 'month') {
        for (let i = 15; i >= 0; i--) {
            const d = new Date(); d.setDate(now.getDate() - i * 2);
            labels.push(`${d.getDate()}-${monthUz(d.getMonth()).toLowerCase()}`);
            const prev = new Date(d); prev.setDate(d.getDate() - 1);
            const [r,p,c] = sumSales(sd => sd.toDateString() === d.toDateString() || sd.toDateString() === prev.toDateString());
            revenueData.push(r); profitData.push(p); costData.push(c);
        }
    } else if (period === 'year') {
        for (let i = 11; i >= 0; i--) {
            const m = new Date(); m.setMonth(now.getMonth() - i);
            labels.push(`${monthUz(m.getMonth())} ${m.getFullYear()}`);
            const [r,p,c] = sumSales(sd => sd.getMonth() === m.getMonth() && sd.getFullYear() === m.getFullYear());
            revenueData.push(r); profitData.push(p); costData.push(c);
        }
    }

    APP_STATE.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Tushum',  data: revenueData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointHoverRadius: 6 },
                { label: 'Foyda',   data: profitData,  borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointHoverRadius: 6 },
                { label: 'Xarajat', data: costData,    borderColor: '#ef4444', borderWidth: 2, borderDash: [5,5], fill: false, tension: 0.4, pointBackgroundColor: '#ef4444', pointHoverRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#9ca3af', font: { family: 'Outfit', size: 11, weight: 600 } } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 },
                    callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+"M So'm" : v.toLocaleString()+" So'm"
                }}
            }
        }
    });
}

/* ==========================================================================
   EXPORT / CLEAR
   ========================================================================== */
function exportDataToExcel() {
    const transactions = getFilteredTransactions();
    let csv = '\uFEFF' + "Chek ID;Sana;Sotilgan tovarlar;Jami Tushum (So'm);Tan Narxi (So'm);Sof Foyda (So'm)\r\n";
    transactions.forEach(sale => {
        const dateStr  = new Date(sale.timestamp).toLocaleString('uz-UZ').replace(',', '');
        const itemsStr = (sale.items||[]).map(i => `${i.name} (${i.quantity} ${i.unit||'dona'})`).join(' / ');
        csv += `${sale.id};${dateStr};${itemsStr};${sale.totalRevenue};${sale.totalCost};${sale.totalProfit}\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SavdoPro_${APP_STATE.activePeriod.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Muvaffaqiyatli yuklandi', "Ma'lumotlar yuklab olindi");
}

function clearStoreData() {
    if (!APP_STATE.currentUser) return;
    if (!confirm("Haqiqatan ham bugungi barcha savdo ma'lumotlarini o'chirmoqchimisiz?")) return;
    const todayStr = new Date().toDateString();
    APP_STATE.sales = APP_STATE.sales.filter(s => new Date(s.timestamp).toDateString() !== todayStr);
    persistData('sales');
    renderSalesChart();
    renderDashboardStats();
    showToast("Bugungi savdolar o'chirildi", 'Muvaffaqiyatli tozalandi!');
}

/* ==========================================================================
   CATEGORIES
   ========================================================================== */
function renderCategories() {
    const container  = document.getElementById('categories-list');
    const searchVal  = document.getElementById('search-categories-input').value.toLowerCase();
    const filtered   = APP_STATE.categories.filter(c =>
        c.name.toLowerCase().includes(searchVal) || (c.description||'').toLowerCase().includes(searchVal)
    );

    if (!filtered.length) {
        container.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;">Kategoriyalar topilmadi.</div>';
        return;
    }
    container.innerHTML = filtered.map(cat => {
        const count = APP_STATE.products.filter(p => p.categoryId === cat.id).length;
        return `
            <div class="category-card" data-id="${cat.id}">
                <div class="category-info"><h4>${cat.name}</h4><p>${cat.description||'Tavsif berilmagan'}</p></div>
                <div class="category-stats"><i data-lucide="box"></i><span>${count} ta mahsulot</span></div>
                <div class="category-actions">
                    <button class="btn btn-outline" onclick="openCategoryProducts('${cat.id}')"><i data-lucide="eye"></i><span>Ichiga kirish</span></button>
                    <button class="btn btn-icon-sm" onclick="openEditCategory('${cat.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn btn-icon-sm delete" onclick="deleteCategory('${cat.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </div>`;
    }).join('');
}

function openAddCategory() {
    document.getElementById('category-modal-title').textContent = "Kategoriya qo'shish";
    document.getElementById('category-form-id').value = '';
    document.getElementById('category-name').value   = '';
    document.getElementById('category-desc').value   = '';
    document.getElementById('category-modal').classList.add('active');
}

function openEditCategory(id) {
    const cat = APP_STATE.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('category-modal-title').textContent = 'Kategoriyani tahrirlash';
    document.getElementById('category-form-id').value = cat.id;
    document.getElementById('category-name').value   = cat.name;
    document.getElementById('category-desc').value   = cat.description || '';
    document.getElementById('category-modal').classList.add('active');
}

function deleteCategory(id) {
    if (!confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    APP_STATE.categories = APP_STATE.categories.filter(c => c.id !== id);
    APP_STATE.products.forEach(p => { if (p.categoryId === id) p.categoryId = ''; });
    persistData('categories');
    persistData('products');
    showToast("Kategoriya o'chirildi", 'Muvaffaqiyatli bajarildi', 'danger');
}

function saveCategory(e) {
    e.preventDefault();
    const id   = document.getElementById('category-form-id').value;
    const name = document.getElementById('category-name').value.trim();
    const description = document.getElementById('category-desc').value.trim();
    if (!name) return;

    if (id) {
        const cat = APP_STATE.categories.find(c => c.id === id);
        if (cat) { cat.name = name; cat.description = description; }
        showToast('Tahrirlandi', 'Kategoriya yangilandi');
    } else {
        APP_STATE.categories.push({ id: 'cat-' + Date.now(), name, description });
        showToast('Yangi kategoriya', 'Muvaffaqiyatli saqlandi');
    }
    persistData('categories');
    document.getElementById('category-modal').classList.remove('active');
}

function openCategoryProducts(id) {
    const cat = APP_STATE.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('category-products-modal-title').textContent = `"${cat.name}" kategoriyasidagi mahsulotlar`;
    const tbody    = document.getElementById('category-products-table-body');
    const catProds = APP_STATE.products.filter(p => p.categoryId === id);

    tbody.innerHTML = catProds.length
        ? catProds.map(prod => `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td>${prod.stock} ${prod.unit}</td>
                <td><code>${prod.code||'-'}</code></td>
                <td class="action-cell">
                    <button class="btn-icon-sm" onclick="openEditProduct('${prod.id}');closeModal('category-products-modal');"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-sm delete" onclick="deleteProduct('${prod.id}');openCategoryProducts('${id}');"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`).join('')
        : "<tr><td colspan='6' class='text-center text-muted'>Ushbu kategoriyada mahsulotlar yo'q.</td></tr>";

    document.getElementById('category-products-modal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   PRODUCTS
   ========================================================================== */
function renderProducts() {
    const tbody    = document.getElementById('products-table-body');
    const searchVal = document.getElementById('search-products-input').value.toLowerCase();
    const filtered  = APP_STATE.products.filter(p =>
        p.name.toLowerCase().includes(searchVal) || (p.code||'').toLowerCase().includes(searchVal)
    );

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Mahsulotlar topilmadi.</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(prod => {
        const catName   = APP_STATE.categories.find(c => c.id === prod.categoryId)?.name || 'Kategoriyasiz';
        const qrImg     = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(prod.code||prod.name)}`;
        const badgeCls  = prod.stock <= 5 ? 'badge-danger' : 'badge-success';
        return `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${catName}</td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td><span class="badge ${badgeCls}">${prod.stock} ${prod.unit}</span></td>
                <td><div style="display:flex;align-items:center;gap:8px;"><img src="${qrImg}" width="28" height="28" alt="QR"><code>${prod.code||'-'}</code></div></td>
                <td class="action-cell">
                    <button class="btn-icon-sm" onclick="printProductQR('${prod.id}')"><i data-lucide="printer"></i></button>
                    <button class="btn-icon-sm" onclick="openEditProduct('${prod.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-sm delete" onclick="deleteProduct('${prod.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function openAddProduct() {
    const select = document.getElementById('product-category');
    select.innerHTML = APP_STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('product-modal-title').textContent = "Yangi mahsulot qo'shish";
    ['product-form-id','product-name','product-cost','product-selling','product-stock','product-code'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('product-unit').value = 'dona';
    document.getElementById('product-modal').classList.add('active');
}

function openEditProduct(id) {
    const prod = APP_STATE.products.find(p => p.id === id);
    if (!prod) return;
    const select = document.getElementById('product-category');
    select.innerHTML = APP_STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('product-modal-title').textContent = 'Mahsulotni tahrirlash';
    document.getElementById('product-form-id').value   = prod.id;
    document.getElementById('product-name').value      = prod.name;
    document.getElementById('product-category').value  = prod.categoryId;
    document.getElementById('product-cost').value      = prod.costPrice;
    document.getElementById('product-selling').value   = prod.sellingPrice;
    document.getElementById('product-stock').value     = prod.stock;
    document.getElementById('product-unit').value      = prod.unit;
    document.getElementById('product-code').value      = prod.code || '';
    document.getElementById('product-modal').classList.add('active');
}

function deleteProduct(id) {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    APP_STATE.products = APP_STATE.products.filter(p => p.id !== id);
    persistData('products');
    showToast("Mahsulot o'chirildi", 'Bajarildi', 'danger');
}

function saveProduct(e) {
    e.preventDefault();
    const id          = document.getElementById('product-form-id').value;
    const name        = document.getElementById('product-name').value.trim();
    const categoryId  = document.getElementById('product-category').value;
    const costPrice   = parseInt(document.getElementById('product-cost').value);
    const sellingPrice= parseInt(document.getElementById('product-selling').value);
    const stock       = parseFloat(document.getElementById('product-stock').value);
    const unit        = document.getElementById('product-unit').value;
    let code          = document.getElementById('product-code').value.trim();

    if (!name || isNaN(costPrice) || isNaN(sellingPrice) || isNaN(stock)) return;
    if (!code) code = 'SP-' + Math.floor(10000000 + Math.random() * 90000000);

    if (id) {
        const prod = APP_STATE.products.find(p => p.id === id);
        if (prod) Object.assign(prod, { name, categoryId, costPrice, sellingPrice, stock, unit, code });
        showToast('Tahrirlandi', 'Mahsulot yangilandi');
    } else {
        APP_STATE.products.push({ id: 'prod-' + Date.now(), name, categoryId, costPrice, sellingPrice, stock, unit, code });
        showToast('Yangi mahsulot', 'Muvaffaqiyatli saqlandi');
    }
    persistData('products');
    document.getElementById('product-modal').classList.remove('active');
}

function printProductQR(id) {
    const prod = APP_STATE.products.find(p => p.id === id);
    if (!prod) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(prod.code||prod.name)}`;
    const win = window.open('', '_blank', 'width=400,height=400');
    win.document.write(`<html><head><title>QR - ${prod.name}</title><style>body{font-family:sans-serif;text-align:center;padding:40px;}.box{border:1px solid #ddd;padding:15px;display:inline-block;border-radius:8px;}</style></head><body><div class="box"><h2>${prod.name}</h2><p>Kod: ${prod.code}</p><img src="${qrUrl}" width="150" height="150"><br><br><strong>Narxi: ${prod.sellingPrice.toLocaleString()} So'm</strong></div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script></body></html>`);
    win.document.close();
}

/* ==========================================================================
   LOW STOCK
   ========================================================================== */
function renderLowStockTable() {
    const tbody = document.getElementById('low-stock-table-body');
    const items = APP_STATE.products.filter(p => p.stock <= 5);
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Zaxirasi kam mahsulotlar mavjud emas.</td></tr>';
        return;
    }
    tbody.innerHTML = items.map(prod => {
        const catName    = APP_STATE.categories.find(c => c.id === prod.categoryId)?.name || 'Kategoriyasiz';
        const statusText = prod.stock === 0 ? 'Tugagan' : 'Kam qolgan';
        const statusCls  = prod.stock === 0 ? 'badge-danger' : 'badge-warning-dark';
        return `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${catName}</td>
                <td><strong style="color:var(--color-danger);">${prod.stock} ${prod.unit}</strong></td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td><span class="badge ${statusCls}">${statusText}</span></td>
                <td class="action-cell"><button class="btn btn-outline" onclick="openEditProduct('${prod.id}')"><i data-lucide="edit-3"></i><span>Tahrirlash / To'ldirish</span></button></td>
            </tr>`;
    }).join('');
}

/* ==========================================================================
   BEST SELLERS
   ========================================================================== */
function renderBestSellersView() {
    const tbody = document.getElementById('best-sellers-table-body');
    const list  = getPopularProducts(20);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sotuvlar topilmadi.</td></tr>';
        document.getElementById('top-product-today-name').textContent    = "Hali sotuvlar yo'q";
        document.getElementById('top-product-today-details').textContent = '';
        return;
    }

    const top = list[0];
    document.getElementById('top-product-today-name').textContent    = top.name;
    document.getElementById('top-product-today-details').textContent = `Jami sotilgan: ${top.soldQty} ${top.unit} | Sof foyda: ${formatCurrency(top.profit)}`;

    tbody.innerHTML = list.map(item => {
        let revenue = 0;
        APP_STATE.sales.forEach(sale => {
            (sale.items||[]).forEach(si => {
                if (si.productId === APP_STATE.products.find(p => p.name === item.name)?.id) revenue += si.sellingPrice * si.quantity;
            });
        });
        return `
            <tr>
                <td class="product-cell-name">${item.name}</td>
                <td>${item.categoryName}</td>
                <td><strong>${item.soldQty} ${item.unit}</strong></td>
                <td>${formatCurrency(revenue)}</td>
                <td><span style="color:var(--color-success);font-weight:700;">+${formatCurrency(item.profit)}</span></td>
            </tr>`;
    }).join('');
}

/* ==========================================================================
   DEBTS
   ========================================================================== */
function formatDateSafe(str) {
    if (!str) return '-';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function renderDebtsTable() {
    const tbody     = document.getElementById('debts-table-body');
    const searchVal = document.getElementById('search-debts-input').value.toLowerCase();
    const filterBtn = document.querySelector('#debts-filter-tabs .filter-btn.active');
    const filter    = filterBtn ? filterBtn.getAttribute('data-filter') : 'all';

    let filtered = APP_STATE.debts.filter(d =>
        d.name.toLowerCase().includes(searchVal) || (d.phone||'').includes(searchVal)
    );
    if (filter === 'unpaid') filtered = filtered.filter(d => d.status === 'unpaid');
    if (filter === 'paid')   filtered = filtered.filter(d => d.status === 'paid');

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Qarz yozuvlari topilmadi.</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(debt => `
        <tr>
            <td class="product-cell-name">${debt.name}</td>
            <td>${debt.phone||'-'}</td>
            <td><strong>${formatCurrency(debt.amount)}</strong></td>
            <td>${formatDateSafe(debt.date)}</td>
            <td>${debt.notes||'-'}</td>
            <td><span class="badge ${debt.status==='paid'?'badge-paid':'badge-unpaid'}">${debt.status==='paid'?"To'langan":"To'lanmagan"}</span></td>
            <td class="action-cell">
                <button class="btn-icon-sm success" onclick="toggleDebtPaid('${debt.id}')"><i data-lucide="check"></i></button>
                <button class="btn-icon-sm" onclick="openEditDebt('${debt.id}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon-sm delete" onclick="deleteDebt('${debt.id}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`).join('');
}

function openAddDebt() {
    document.getElementById('debt-modal-title').textContent = "Yangi qarz qo'shish";
    ['debt-form-id','debt-customer','debt-phone','debt-amount','debt-notes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('debt-date').value   = new Date().toISOString().split('T')[0];
    document.getElementById('debt-status').value = 'unpaid';
    document.getElementById('debt-modal').classList.add('active');
}

function openEditDebt(id) {
    const debt = APP_STATE.debts.find(d => d.id === id);
    if (!debt) return;
    document.getElementById('debt-modal-title').textContent = 'Qarz yozuvini tahrirlash';
    document.getElementById('debt-form-id').value  = debt.id;
    document.getElementById('debt-customer').value = debt.name;
    document.getElementById('debt-phone').value    = debt.phone||'';
    document.getElementById('debt-amount').value   = debt.amount;
    document.getElementById('debt-date').value     = debt.date;
    document.getElementById('debt-status').value   = debt.status;
    document.getElementById('debt-notes').value    = debt.notes||'';
    document.getElementById('debt-modal').classList.add('active');
}

function deleteDebt(id) {
    if (!confirm("Ushbu qarz yozuvini o'chirishni tasdiqlaysizmi?")) return;
    APP_STATE.debts = APP_STATE.debts.filter(d => d.id !== id);
    persistData('debts');
    showToast("Qarz o'chirildi", 'Bajarildi', 'danger');
}

function toggleDebtPaid(id) {
    const debt = APP_STATE.debts.find(d => d.id === id);
    if (!debt) return;
    debt.status = debt.status === 'paid' ? 'unpaid' : 'paid';
    persistData('debts');
    showToast('Holat yangilandi', `Qarz holati ${debt.status==='paid'?"to'langan":"to'lanmagan"} deb o'zgartirildi`);
}

function saveDebt(e) {
    e.preventDefault();
    const id     = document.getElementById('debt-form-id').value;
    const name   = document.getElementById('debt-customer').value.trim();
    const phone  = document.getElementById('debt-phone').value.trim();
    const amount = parseInt(document.getElementById('debt-amount').value);
    const date   = document.getElementById('debt-date').value;
    const status = document.getElementById('debt-status').value;
    const notes  = document.getElementById('debt-notes').value.trim();
    if (!name || isNaN(amount) || !date) return;

    if (id) {
        const debt = APP_STATE.debts.find(d => d.id === id);
        if (debt) Object.assign(debt, { name, phone, amount, date, status, notes });
        showToast('Yangilandi', 'Qarz yozuvi tahrirlandi');
    } else {
        APP_STATE.debts.push({ id: 'debt-' + Date.now(), name, phone, amount, date, status, notes });
        showToast('Qarz yozildi', "Yangi qarz ro'yxatga olindi");
    }
    persistData('debts');
    document.getElementById('debt-modal').classList.remove('active');
}

/* ==========================================================================
   POS / SELL
   ========================================================================== */
let posCategoryFilter = 'all';

function renderPOSCatalog() {
    const filtersEl  = document.getElementById('pos-category-filters');
    const catalogEl  = document.getElementById('pos-products-list');
    const searchVal  = document.getElementById('pos-search-input').value.toLowerCase();

    filtersEl.innerHTML = `<div class="pos-category-tab ${posCategoryFilter==='all'?'active':''}" onclick="setPOSCategoryFilter('all')">Barchasi</div>` +
        APP_STATE.categories.map(c => `<div class="pos-category-tab ${posCategoryFilter===c.id?'active':''}" onclick="setPOSCategoryFilter('${c.id}')">${c.name}</div>`).join('');

    let filtered = APP_STATE.products;
    if (posCategoryFilter !== 'all') filtered = filtered.filter(p => p.categoryId === posCategoryFilter);
    if (searchVal) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchVal) || (p.code||'').toLowerCase().includes(searchVal));

    if (!filtered.length) {
        catalogEl.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;">Mahsulotlar topilmadi.</div>';
        return;
    }
    catalogEl.innerHTML = filtered.map(prod => {
        const cls  = prod.stock === 0 ? 'out-stock' : prod.stock <= 5 ? 'low-stock' : 'in-stock';
        const txt  = prod.stock === 0 ? 'Tugagan' : prod.stock <= 5 ? `Kam: ${prod.stock} ${prod.unit}` : `${prod.stock} ${prod.unit}`;
        return `
            <div class="pos-product-card" onclick="addToCart('${prod.id}')">
                <span class="pos-product-stock-badge ${cls}">${txt}</span>
                <h4>${prod.name}</h4>
                <p>Kod: ${prod.code||'-'}</p>
                <div class="price-row"><span class="price">${formatCurrency(prod.sellingPrice)}</span><span class="unit">/${prod.unit}</span></div>
            </div>`;
    }).join('');
}

function setPOSCategoryFilter(catId) {
    posCategoryFilter = catId;
    renderPOSCatalog();
}

function addToCart(productId) {
    const prod = APP_STATE.products.find(p => p.id === productId);
    if (!prod) return;
    if (prod.stock <= 0) { showToast('Zaxira yetarli emas', `"${prod.name}" tovari tugagan!`, 'warning'); return; }

    const cartItem = APP_STATE.cart.find(i => i.productId === productId);
    if (cartItem) {
        if (cartItem.quantity + 1 > prod.stock) { showToast('Zaxira cheklovi', `Mavjud qoldiq: ${prod.stock} ${prod.unit}`, 'warning'); return; }
        cartItem.quantity += 1;
    } else {
        APP_STATE.cart.push({ productId: prod.id, name: prod.name, sellingPrice: prod.sellingPrice, costPrice: prod.costPrice, unit: prod.unit, quantity: 1 });
    }
    showToast("Savatchaga qo'shildi", `"${prod.name}" savatchaga joylandi`);
    renderPOSCart();
}

function updateCartQty(productId, qty) {
    const item = APP_STATE.cart.find(i => i.productId === productId);
    const prod = APP_STATE.products.find(p => p.id === productId);
    if (!item || !prod) return;
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) { removeFromCart(productId); return; }
    item.quantity = parsedQty > prod.stock ? prod.stock : parsedQty;
    renderPOSCart();
}

function adjustCartQty(productId, delta) {
    const item = APP_STATE.cart.find(i => i.productId === productId);
    if (item) updateCartQty(productId, item.quantity + delta);
}

function removeFromCart(productId) {
    APP_STATE.cart = APP_STATE.cart.filter(i => i.productId !== productId);
    renderPOSCart();
}

function renderPOSCart() {
    const cartEl = document.getElementById('pos-cart-list');
    if (!APP_STATE.cart.length) {
        cartEl.innerHTML = `<div class="empty-cart-message"><i data-lucide="shopping-cart"></i><p>Savatcha bo'sh. Mahsulot tanlang yoki shtrix kodni skanerlang.</p></div>`;
        document.getElementById('pos-total-count').textContent = '0 dona';
        document.getElementById('pos-total-sum').textContent   = "0 So'm";
        if (window.lucide) lucide.createIcons();
        return;
    }
    let totalSum = 0, totalCount = 0;
    cartEl.innerHTML = APP_STATE.cart.map(item => {
        const itemSum = item.sellingPrice * item.quantity;
        totalSum  += itemSum;
        totalCount += item.unit === 'dona' ? Math.floor(item.quantity) : 1;
        return `
            <div class="cart-item">
                <div class="cart-item-detail"><h5>${item.name}</h5><p>${formatCurrency(item.sellingPrice)} / ${item.unit}</p></div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="adjustCartQty('${item.productId}',-1)">-</button>
                    <input type="number" class="cart-qty-input" value="${item.quantity}" step="${item.unit==='dona'?'1':'any'}" min="0.1" onchange="updateCartQty('${item.productId}',this.value)">
                    <button class="cart-qty-btn" onclick="adjustCartQty('${item.productId}',1)">+</button>
                </div>
                <div class="cart-item-price">${formatCurrency(itemSum)}</div>
                <button class="btn-remove-item" onclick="removeFromCart('${item.productId}')"><i data-lucide="x"></i></button>
            </div>`;
    }).join('');
    document.getElementById('pos-total-count').textContent = `${totalCount} xil`;
    document.getElementById('pos-total-sum').textContent   = formatCurrency(totalSum);
    if (window.lucide) lucide.createIcons();
}

function checkoutCart() {
    if (!APP_STATE.cart.length) { showToast("Savatcha bo'sh", 'Sotish uchun avval tovar qo\'shing!', 'warning'); return; }
    let totalRevenue = 0, totalCost = 0;
    APP_STATE.cart.forEach(item => { totalRevenue += item.sellingPrice * item.quantity; totalCost += item.costPrice * item.quantity; });

    const saleId = 'SP-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('receipt-id').textContent           = saleId;
    document.getElementById('receipt-time').textContent         = new Date().toLocaleString('uz-UZ');
    document.getElementById('receipt-total-amount').textContent = formatCurrency(totalRevenue);

    document.getElementById('receipt-items-rows').innerHTML = APP_STATE.cart.map(item => `
        <div class="receipt-item-row">
            <div class="receipt-item-main"><span>${item.name}</span><span>${(item.sellingPrice*item.quantity).toLocaleString()}</span></div>
            <div class="receipt-item-sub">${item.quantity} ${item.unit} x ${item.sellingPrice.toLocaleString()}</div>
        </div>`).join('');

    const qrText = `click://pay?merchant_id=12345&service_id=6789&trans_id=${saleId}&amount=${totalRevenue}`;
    document.getElementById('receipt-qr-canvas-holder').innerHTML =
        `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}" width="150" height="150">`;

    document.getElementById('receipt-modal').classList.add('active');
}

function finalizeTransaction() {
    let totalRevenue = 0, totalCost = 0;
    APP_STATE.cart.forEach(cartItem => {
        const prod = APP_STATE.products.find(p => p.id === cartItem.productId);
        if (prod) prod.stock = Math.max(0, prod.stock - cartItem.quantity);
        totalRevenue += cartItem.sellingPrice * cartItem.quantity;
        totalCost    += cartItem.costPrice    * cartItem.quantity;
    });

    APP_STATE.sales.push({
        id: 'sale-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: [...APP_STATE.cart],
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost
    });

    playCashRegisterSound();
    persistData('products');
    persistData('sales');

    APP_STATE.cart = [];
    renderPOSCart();
    document.getElementById('receipt-modal').classList.remove('active');
    showToast('Sotuv yakunlandi', 'Ombordan tovarlar yozildi, statistika yangilandi');
}

function openPOSDebtCheckout() {
    if (!APP_STATE.cart.length) { showToast("Savatcha bo'sh", "Qarzga sotish uchun avval tovar qo'shing!", 'warning'); return; }
    let totalRevenue = 0;
    APP_STATE.cart.forEach(item => totalRevenue += item.sellingPrice * item.quantity);
    document.getElementById('pos-debt-amount').value = totalRevenue;
    document.getElementById('pos-debt-amount-label').textContent = formatCurrency(totalRevenue);
    document.getElementById('pos-debt-customer').value = '';
    document.getElementById('pos-debt-phone').value    = '';
    document.getElementById('pos-debt-notes').value    = '';
    document.getElementById('pos-debt-modal').classList.add('active');
}

function handlePOSDebtSubmit(e) {
    e.preventDefault();
    const amount = parseInt(document.getElementById('pos-debt-amount').value);
    const name   = document.getElementById('pos-debt-customer').value.trim();
    const phone  = document.getElementById('pos-debt-phone').value.trim();
    const notes  = document.getElementById('pos-debt-notes').value.trim();
    if (!name || isNaN(amount)) return;

    let totalCost = 0;
    APP_STATE.cart.forEach(cartItem => {
        const prod = APP_STATE.products.find(p => p.id === cartItem.productId);
        if (prod) prod.stock = Math.max(0, prod.stock - cartItem.quantity);
        totalCost += cartItem.costPrice * cartItem.quantity;
    });

    const newSale = { id: 'sale-' + Date.now(), timestamp: new Date().toISOString(), items: [...APP_STATE.cart], totalRevenue: amount, totalCost, totalProfit: amount - totalCost, paymentMethod: 'debt' };
    APP_STATE.sales.push(newSale);
    APP_STATE.debts.push({ id: 'debt-' + Date.now(), name, phone, amount, date: new Date().toISOString().split('T')[0], status: 'unpaid', notes: notes || `POS sotuvdan qarz (Chek #${newSale.id})` });

    playCashRegisterSound();
    persistData('products');
    persistData('sales');
    persistData('debts');

    document.getElementById('pos-debt-modal').classList.remove('active');
    APP_STATE.cart = [];
    renderPOSCart();
    showToast('Qarz yozildi', `Savdo yakunlandi. Mijoz: ${name}, Qarz: ${formatCurrency(amount)}`);
}

/* ==========================================================================
   AUDIO
   ========================================================================== */
function playCashRegisterSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 1000;
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.06, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(flt); flt.connect(ng); ng.connect(ctx.destination); noise.start(now);

        const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator(); const rg = ctx.createGain();
        o1.frequency.value = 1600; o2.frequency.value = 2100;
        rg.gain.setValueAtTime(0, now); rg.gain.setValueAtTime(0.12, now + 0.02); rg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        o1.connect(rg); o2.connect(rg); rg.connect(ctx.destination);
        o1.start(now + 0.02); o2.start(now + 0.02); o1.stop(now + 0.55); o2.stop(now + 0.55);
    } catch(e) {}
}

function playBeepSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination); osc.frequency.value = 800; g.gain.value = 0.1;
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

/* ==========================================================================
   QR SCANNER
   ========================================================================== */
let activeScannerScope = 'pos';

function startQRScanner(scope = 'pos') {
    activeScannerScope = scope;
    document.getElementById('scanner-modal').classList.add('active');
    document.getElementById('scanner-status-text').textContent = 'Kamera yoqilmoqda...';
    if (APP_STATE.html5QrScanner) stopQRScanner();

    APP_STATE.html5QrScanner = new Html5Qrcode('qr-reader');
    APP_STATE.html5QrScanner.start(
        { facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
        onScanSuccess, () => {}
    ).then(() => {
        document.getElementById('scanner-status-text').textContent = "QR/Shtrix kodni ramkaga to'g'rilang...";
    }).catch(err => {
        document.getElementById('scanner-status-text').innerHTML = `<span style="color:var(--color-danger)">Kameraga ruxsat berilmadi!</span>`;
        showToast('Kamera xatosi', "Kamerani yoqib bo'lmadi. Ruxsatlarni tekshiring", 'danger');
    });
}

function stopQRScanner() {
    if (APP_STATE.html5QrScanner) {
        try { APP_STATE.html5QrScanner.stop().then(() => { APP_STATE.html5QrScanner = null; }).catch(() => {}); } catch(e) {}
    }
}

function onScanSuccess(decodedText) {
    playBeepSound();
    stopQRScanner();
    document.getElementById('scanner-modal').classList.remove('active');
    showToast('Skanerlandi', `Natija: ${decodedText}`);

    if (activeScannerScope === 'pos-scan') {
        const prod = APP_STATE.products.find(p => p.code === decodedText || p.id === decodedText);
        if (prod) { addToCart(prod.id); switchView('sell'); }
        else showToast('Topilmadi', `Tovar topilmadi: "${decodedText}"`, 'warning');
    } else if (activeScannerScope === 'pos-add' || activeScannerScope === 'products-add') {
        openAddProduct();
        document.getElementById('product-code').value = decodedText;
    } else if (activeScannerScope === 'products-scan') {
        document.getElementById('search-products-input').value = decodedText;
        switchView('products'); renderProducts();
    }
}

/* ==========================================================================
   ADMIN (USERS MANAGEMENT)
   ========================================================================== */
function renderAdminView() {
    const tbody     = document.getElementById('users-table-body');
    const searchVal = document.getElementById('search-users-input').value.toLowerCase();
    const filtered  = APP_STATE.users.filter(u =>
        u.username.toLowerCase().includes(searchVal) || u.shopName.toLowerCase().includes(searchVal)
    );
    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td class="product-cell-name">${user.username}</td>
            <td><code>${user.password}</code></td>
            <td>${user.shopName}</td>
            <td><span class="badge ${user.role==='admin'?'badge-success':'badge-unpaid'}">${user.role.toUpperCase()}</span></td>
            <td class="action-cell">
                <button class="btn-icon-sm" onclick="openEditUser('${user.id}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon-sm delete" onclick="deleteUser('${user.id}')" ${user.id==='user-admin'?'disabled':''}><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`).join('');
    if (window.lucide) lucide.createIcons();
}

function openAddUser() {
    document.getElementById('user-modal-title').textContent = "Yangi foydalanuvchi qo'shish";
    ['user-form-id','user-username','user-password','user-shopname'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('user-role').value = 'staff';
    document.getElementById('user-modal').classList.add('active');
}

function openEditUser(id) {
    const user = APP_STATE.users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('user-modal-title').textContent = 'Foydalanuvchini tahrirlash';
    document.getElementById('user-form-id').value   = user.id;
    document.getElementById('user-username').value  = user.username;
    document.getElementById('user-password').value  = user.password;
    document.getElementById('user-shopname').value  = user.shopName;
    document.getElementById('user-role').value      = user.role;
    document.getElementById('user-modal').classList.add('active');
}

function deleteUser(id) {
    if (id === 'user-admin') { showToast('Taqiqlangan', "Bosh administrator o'chirilishi mumkin emas!", 'danger'); return; }
    if (!confirm("Foydalanuvchi va uning do'kon ma'lumotlarini butunlay o'chirishni xohlaysizmi?")) return;

    APP_STATE.users = APP_STATE.users.filter(u => u.id !== id);
    db.ref(`shops/${id}`).remove();
    db.ref(`users/${id}`).remove();
    persistData('users');
    showToast("Foydalanuvchi o'chirildi", 'Bajarildi', 'danger');
}

function saveUser(e) {
    e.preventDefault();
    const id       = document.getElementById('user-form-id').value;
    const username = document.getElementById('user-username').value.trim().toLowerCase();
    const password = document.getElementById('user-password').value.trim();
    const shopName = document.getElementById('user-shopname').value.trim();
    const role     = document.getElementById('user-role').value;
    if (!username || !password || !shopName) return;

    if (id) {
        const user = APP_STATE.users.find(u => u.id === id);
        if (user) Object.assign(user, { username, password, shopName, role });
        showToast('Yangilandi', "Foydalanuvchi ma'lumotlari tahrirlandi");
    } else {
        if (APP_STATE.users.some(u => u.username === username)) { showToast('Xatolik', 'Ushbu foydalanuvchi nomi band!', 'danger'); return; }
        const newId   = 'user-' + Date.now();
        const newUser = { id: newId, username, password, shopName, role };
        APP_STATE.users.push(newUser);
        rtSet(`shops/${newId}`, { categories: {}, products: {}, sales: {}, debts: {} });
        showToast("Foydalanuvchi qo'shildi", "Yangi do'kon tizimga muvaffaqiyatli kiritildi");
    }
    persistData('users');
    document.getElementById('user-modal').classList.remove('active');
}

/* ==========================================================================
   UTILS
   ========================================================================== */
function formatCurrency(amount) {
    return parseInt(amount || 0).toLocaleString('uz-UZ') + " So'm";
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/* ==========================================================================
   PRINT RECEIPT
   ========================================================================== */
function initPrintReceiptButton() {
    const btn = document.getElementById('btn-print-receipt');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const content = document.getElementById('receipt-invoice-print').innerHTML;
        const win = window.open('', '_blank', 'width=350,height=500');
        win.document.write(`<html><head><title>Kassa Cheki</title><style>body{font-family:'Courier New',monospace;padding:20px;font-size:12px;line-height:1.4;}.receipt-total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;}.receipt-item-row{display:flex;flex-direction:column;margin-bottom:6px;}.receipt-item-main{display:flex;justify-content:space-between;font-weight:bold;}.receipt-item-sub{font-size:10px;color:#555;margin-left:10px;}</style></head><body>${content}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script></body></html>`);
        win.document.close();
    });
}

/* ==========================================================================
   ENTRY POINT
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Init DB
    initDatabase();

    // 2. Sidebar nav
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', e => { e.preventDefault(); switchView(item.getAttribute('data-view')); });
    });

    // 3. Logout
    document.querySelector('.logout-btn').addEventListener('click', logoutUserSession);

    // 4. Login / Register
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
    document.getElementById('landing-btn-login').addEventListener('click', showLoginOverlay);
    document.getElementById('landing-btn-register').addEventListener('click', showRegisterModal);
    document.getElementById('hero-btn-start').addEventListener('click', showRegisterModal);
    document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
    document.getElementById('login-overlay').addEventListener('click', e => { if (e.target.id === 'login-overlay') showLandingPage(); });

    // 5. Admin
    document.getElementById('search-users-input').addEventListener('input', renderAdminView);
    document.getElementById('btn-add-user').addEventListener('click', openAddUser);
    document.getElementById('user-form').addEventListener('submit', saveUser);

    // 6. Theme
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const theme = APP_STATE.theme === 'dark' ? 'light' : 'dark';
        APP_STATE.theme = theme;
        localStorage.setItem('savdopro_theme', theme);
        document.body.setAttribute('data-theme', theme);
        const icon = document.getElementById('theme-toggle-btn').querySelector('i');
        icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
        if (window.lucide) lucide.createIcons();
    });

    // 7. Period toggles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.activePeriod = btn.getAttribute('data-period');
            renderSalesChart();
            renderDashboardStats();
        });
    });

    // 8. Export / Clear
    document.getElementById('btn-export-stats').addEventListener('click', exportDataToExcel);
    document.getElementById('btn-clear-store-data').addEventListener('click', clearStoreData);

    // 9. Categories
    document.getElementById('search-categories-input').addEventListener('input', renderCategories);
    document.getElementById('btn-add-category').addEventListener('click', openAddCategory);
    document.getElementById('category-form').addEventListener('submit', saveCategory);

    // 10. Products
    document.getElementById('search-products-input').addEventListener('input', renderProducts);
    document.getElementById('btn-add-product').addEventListener('click', openAddProduct);
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('btn-scan-product').addEventListener('click', () => startQRScanner('products-scan'));
    document.getElementById('btn-scan-add-product').addEventListener('click', () => startQRScanner('products-add'));
    document.getElementById('btn-generate-barcode').addEventListener('click', () => {
        const code = 'SP-' + Math.floor(10000000 + Math.random() * 90000000);
        document.getElementById('product-code').value = code;
        showToast('Kod yaratildi', `Kod: ${code}`);
    });

    // 11. Debts
    document.getElementById('search-debts-input').addEventListener('input', renderDebtsTable);
    document.getElementById('btn-add-debt').addEventListener('click', openAddDebt);
    document.getElementById('debt-form').addEventListener('submit', saveDebt);
    document.querySelectorAll('#debts-filter-tabs .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#debts-filter-tabs .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDebtsTable();
        });
    });

    // 12. POS
    document.getElementById('pos-search-input').addEventListener('input', renderPOSCatalog);
    document.getElementById('pos-btn-scan').addEventListener('click', () => startQRScanner('pos-scan'));
    document.getElementById('pos-btn-checkout').addEventListener('click', checkoutCart);
    document.getElementById('pos-btn-qr-pay').addEventListener('click', checkoutCart);
    document.getElementById('pos-btn-debt').addEventListener('click', openPOSDebtCheckout);
    document.getElementById('pos-debt-form').addEventListener('submit', handlePOSDebtSubmit);
    document.getElementById('btn-confirm-sale-success').addEventListener('click', finalizeTransaction);
    document.getElementById('btn-clear-cart').addEventListener('click', () => {
        if (APP_STATE.cart.length && confirm('Savatchani tozalashni xohlaysizmi?')) { APP_STATE.cart = []; renderPOSCart(); }
    });

    // 13. Modal close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const modal = e.target.closest('.modal-backdrop');
            if (modal) { modal.classList.remove('active'); stopQRScanner(); }
        });
    });
    document.getElementById('btn-stop-scanner-cancel').addEventListener('click', () => { stopQRScanner(); closeModal('scanner-modal'); });
    document.getElementById('btn-close-scanner').addEventListener('click',        () => { stopQRScanner(); closeModal('scanner-modal'); });

    // 14. Print receipt
    initPrintReceiptButton();

    // 15. Icons
    if (window.lucide) lucide.createIcons();
}); 