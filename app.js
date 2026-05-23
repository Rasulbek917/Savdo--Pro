/* ==========================================================================
   SavdoPro - Smart Business Application Controller
   ========================================================================== */

// --- Global Application State ---
const APP_STATE = {
    categories: [],
    products: [],
    sales: [],
    debts: [],
    users: [], // List of user accounts for Admin
    activeView: 'dashboard',
    activePeriod: 'month',
    theme: 'dark',
    cart: [],
    chart: null,
    html5QrScanner: null,
    currentUser: null // Logged in user details
};

// --- Firebase Config & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyA4ehihGXdntnAk2v68PiBpWo1Mltm6eZA",
  authDomain: "savdopro-90afb.firebaseapp.com",
  projectId: "savdopro-90afb",
  storageBucket: "savdopro-90afb.firebasestorage.app",
  messagingSenderId: "106815442513",
  appId: "1:106815442513:web:24003ef474e58bf8247270",
  measurementId: "G-DYKHYN5T97"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Keep track of active Firestore listener subscriptions
let firestoreSubscriptions = [];

// --- Seed Data Configuration (matches user image metrics) ---
function getInitialSeedData() {
    const today = new Date();
    
    // Formatting date helper: YYYY-MM-DD
    const formatDate = (dateOffset) => {
        const d = new Date();
        d.setDate(today.getDate() - dateOffset);
        return d.toISOString().split('T')[0];
    };

    const categories = [
        { id: 'cat-1', name: 'Kitoblar', description: 'O\'quv qo\'llanmalari va badiiy kitoblar' },
        { id: 'cat-2', name: 'Mevalar', description: 'Yangi uzilgan meva va sabzavotlar' },
        { id: 'cat-3', name: 'Ichimliklar', description: 'Salqin ichimliklar va sharbatlar' },
        { id: 'cat-4', name: 'Shirinliklar', description: 'Turli xil pishiriqlar va shokoladlar' }
    ];

    const products = [
        { 
            id: 'prod-1', 
            name: 'tactics', 
            categoryId: 'cat-1', 
            costPrice: 35000, 
            sellingPrice: 50000, 
            unit: 'dona', 
            stock: 0, 
            code: 'tactics' 
        },
        { 
            id: 'prod-2', 
            name: 'olma', 
            categoryId: 'cat-2', 
            costPrice: 8000, 
            sellingPrice: 12000, 
            unit: 'kg', 
            stock: 0, 
            code: 'olma' 
        },
        { 
            id: 'prod-3', 
            name: 'Coca-Cola 1.5L', 
            categoryId: 'cat-3', 
            costPrice: 9000, 
            sellingPrice: 13000, 
            unit: 'dona', 
            stock: 45, 
            code: '5449000000996' 
        },
        { 
            id: 'prod-4', 
            name: 'Chococream', 
            categoryId: 'cat-4', 
            costPrice: 18000, 
            sellingPrice: 25000, 
            unit: 'dona', 
            stock: 3, 
            code: 'CHOCO777' 
        },
        { 
            id: 'prod-5', 
            name: 'Pepsi 1.5L', 
            categoryId: 'cat-3', 
            costPrice: 8500, 
            sellingPrice: 12500, 
            unit: 'dona', 
            stock: 4, 
            code: '5449000000123' 
        }
    ];

    // Seed sales history to match the dashboard image:
    // Total Revenue: 4,729,800 So'm, Cost: 771,000 So'm, Profit: 3,858,800 So'm
    const sales = [
        {
            id: 'sale-1001',
            timestamp: formatDate(2) + 'T14:30:00', // 2 days ago
            items: [
                { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 150, costPrice: 9000, sellingPrice: 13000 },
                { productId: 'prod-4', name: 'Chococream', quantity: 24, costPrice: 18000, sellingPrice: 25000 }
            ],
            totalRevenue: 2550000,
            totalCost: 410000,
            totalProfit: 2140000
        },
        {
            id: 'sale-1002',
            timestamp: formatDate(1) + 'T16:45:00', // 1 day ago
            items: [
                { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 38, costPrice: 9000, sellingPrice: 13000 },
                { productId: 'prod-4', name: 'Chococream', quantity: 16, costPrice: 18000, sellingPrice: 25000 }
            ],
            totalRevenue: 609800,
            totalCost: 111000,
            totalProfit: 498800
        },
        {
            id: 'sale-1003',
            timestamp: formatDate(0) + 'T11:15:00', // Today
            items: [
                { productId: 'prod-3', name: 'Coca-Cola 1.5L', quantity: 98, costPrice: 9000, sellingPrice: 13000 },
                { productId: 'prod-4', name: 'Chococream', quantity: 20, costPrice: 18000, sellingPrice: 25000 }
            ],
            totalRevenue: 1570000,
            totalCost: 250000,
            totalProfit: 1320000
        }
    ];

    // Debts (unpaid & paid)
    const debts = [
        {
            id: 'debt-1',
            name: 'Alijon Valiyev',
            phone: '+998901234567',
            amount: 150000,
            date: formatDate(3),
            notes: 'Qarz kitoblar uchun',
            status: 'paid'
        }
    ];

    return { categories, products, sales, debts };
}

// --- Multi-Tenant Login & Database logic ---
function initDatabase() {
    // 1. Initialize Users list (Multi-Tenant Accounts) from localStorage cache first
    const cachedUsers = localStorage.getItem('savdopro_users');
    if (cachedUsers) {
        APP_STATE.users = JSON.parse(cachedUsers);
    } else {
        const defaultUsers = [
            { id: 'user-admin', username: 'admin', password: '123', shopName: 'Admin Boshqaruv', role: 'admin' },
            { id: 'user-shop1', username: 'kitob', password: '123', shopName: 'Kitoblar Olami', role: 'staff' },
            { id: 'user-shop2', username: 'meva', password: '123', shopName: 'Meva Bozori', role: 'staff' }
        ];
        APP_STATE.users = defaultUsers;
        localStorage.setItem('savdopro_users', JSON.stringify(defaultUsers));
    }

    // Sync users from Firestore in background
    db.collection('users').get().then(snapshot => {
        if (snapshot.empty) {
            // Seed Firestore with current users if empty
            APP_STATE.users.forEach(u => {
                db.collection('users').doc(u.id).set(u);
            });
        } else {
            const users = [];
            snapshot.forEach(doc => {
                users.push(doc.data());
            });
            APP_STATE.users = users;
            localStorage.setItem('savdopro_users', JSON.stringify(users));
        }
    }).catch(err => {
        console.error("Firestore users sync failed, using cache:", err);
    });

    // 2. Initialize Seed data for the standard demo shops (to populate them)
    const seed = getInitialSeedData();
    
    // Seed kitob (Kitoblar Olami)
    if (!localStorage.getItem('savdopro_user-shop1_categories')) {
        const cat = seed.categories.filter(c => c.id === 'cat-1');
        const prod = seed.products.filter(p => p.categoryId === 'cat-1');
        localStorage.setItem('savdopro_user-shop1_categories', JSON.stringify(cat));
        localStorage.setItem('savdopro_user-shop1_products', JSON.stringify(prod));
        localStorage.setItem('savdopro_user-shop1_sales', JSON.stringify([]));
        localStorage.setItem('savdopro_user-shop1_debts', JSON.stringify([]));
    }

    // Seed meva (Meva Bozori)
    if (!localStorage.getItem('savdopro_user-shop2_categories')) {
        const cat = seed.categories.filter(c => c.id === 'cat-2');
        const prod = seed.products.filter(p => p.categoryId === 'cat-2');
        localStorage.setItem('savdopro_user-shop2_categories', JSON.stringify(cat));
        localStorage.setItem('savdopro_user-shop2_products', JSON.stringify(prod));
        localStorage.setItem('savdopro_user-shop2_sales', JSON.stringify([]));
        localStorage.setItem('savdopro_user-shop2_debts', JSON.stringify([]));
    }

    // Seed admin (Admin Boshqaruv gets the full seeded data!)
    if (!localStorage.getItem('savdopro_user-admin_categories')) {
        localStorage.setItem('savdopro_user-admin_categories', JSON.stringify(seed.categories));
        localStorage.setItem('savdopro_user-admin_products', JSON.stringify(seed.products));
        localStorage.setItem('savdopro_user-admin_sales', JSON.stringify(seed.sales));
        localStorage.setItem('savdopro_user-admin_debts', JSON.stringify(seed.debts));
    }

    // Theme loading
    APP_STATE.theme = localStorage.getItem('savdopro_theme') || 'dark';
    document.body.setAttribute('data-theme', APP_STATE.theme);
    
    // 3. Handle Sessions and Login overlay
    const savedUserId = localStorage.getItem('savdopro_session_user_id');
    if (savedUserId) {
        const user = APP_STATE.users.find(u => u.id === savedUserId);
        if (user) {
            loginUserSession(user);
            return;
        }
    }
    
    // Show landing page if not logged in
    showLandingPage();
}

function unsubscribeFirestore() {
    firestoreSubscriptions.forEach(unsub => {
        try {
            unsub();
        } catch (e) {
            console.error("Error unsubscribing Firestore:", e);
        }
    });
    firestoreSubscriptions = [];
}

function loginUserSession(user) {
    APP_STATE.currentUser = user;
    localStorage.setItem('savdopro_session_user_id', user.id);
    
    // 1. Load this user's isolated data keys from localStorage cache first
    const prefix = user.id;
    APP_STATE.categories = JSON.parse(localStorage.getItem(`savdopro_${prefix}_categories`)) || [];
    APP_STATE.products = JSON.parse(localStorage.getItem(`savdopro_${prefix}_products`)) || [];
    APP_STATE.sales = JSON.parse(localStorage.getItem(`savdopro_${prefix}_sales`)) || [];
    APP_STATE.debts = JSON.parse(localStorage.getItem(`savdopro_${prefix}_debts`)) || [];
    
    // 2. Unsubscribe old Firestore listeners
    unsubscribeFirestore();

    // 3. Subscribe to real-time updates for this shop
    const unsubShop = db.collection('shops').doc(user.id).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            
            // Sync in-memory APP_STATE
            if (data.categories) APP_STATE.categories = data.categories;
            if (data.products) APP_STATE.products = data.products;
            if (data.sales) APP_STATE.sales = data.sales;
            if (data.debts) APP_STATE.debts = data.debts;
            
            // Update local cache
            localStorage.setItem(`savdopro_${prefix}_categories`, JSON.stringify(APP_STATE.categories));
            localStorage.setItem(`savdopro_${prefix}_products`, JSON.stringify(APP_STATE.products));
            localStorage.setItem(`savdopro_${prefix}_sales`, JSON.stringify(APP_STATE.sales));
            localStorage.setItem(`savdopro_${prefix}_debts`, JSON.stringify(APP_STATE.debts));
            
            // Refresh views
            renderSalesChart();
            renderRealTime();
        } else {
            // First time login - seed Firestore document with current local data
            db.collection('shops').doc(user.id).set({
                categories: APP_STATE.categories,
                products: APP_STATE.products,
                sales: APP_STATE.sales,
                debts: APP_STATE.debts
            }).catch(err => console.error("Firestore shop seed failed:", err));
        }
    }, err => {
        console.error("Firestore shop sync error:", err);
    });
    firestoreSubscriptions.push(unsubShop);

    // 4. If admin, subscribe to global users collection to sync user list in real-time
    if (user.role === 'admin') {
        const unsubUsers = db.collection('users').onSnapshot(snapshot => {
            const users = [];
            snapshot.forEach(doc => {
                users.push(doc.data());
            });
            APP_STATE.users = users;
            localStorage.setItem('savdopro_users', JSON.stringify(users));
            if (APP_STATE.activeView === 'admin') {
                renderAdminView();
            }
        }, err => {
            console.error("Firestore users sync error:", err);
        });
        firestoreSubscriptions.push(unsubUsers);
    }

    // Hide login and landing views
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('login-overlay').classList.add('hidden');
    document.querySelector('.app-container').classList.remove('hidden');
    
    // Update profile card in sidebar
    document.querySelector('.sidebar-user .user-avatar').textContent = user.username[0].toUpperCase();
    document.querySelector('.sidebar-user .user-info h4').textContent = user.username;
    document.querySelector('.sidebar-user .user-info p').textContent = user.shopName;
    
    // Toggle Admin navigation and views visibility based on role
    const isCtrlAdmin = (user.role === 'admin');
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        const view = item.getAttribute('data-view');
        if (view === 'admin') {
            item.style.display = isCtrlAdmin ? 'flex' : 'none';
        } else {
            item.style.display = isCtrlAdmin ? 'none' : 'flex';
        }
    });
    
    // Welcome Toast
    showToast('Tizimga kirildi', `Xush kelibsiz, ${user.username}! Do'kon: ${user.shopName}`);
    
    // Reload UI in appropriate view
    if (isCtrlAdmin) {
        switchView('admin');
    } else {
        switchView('dashboard');
    }
}

function logoutUserSession() {
    APP_STATE.currentUser = null;
    localStorage.removeItem('savdopro_session_user_id');
    
    // Unsubscribe Firestore listeners
    unsubscribeFirestore();

    // Clear state data to prevent visual flashes
    APP_STATE.categories = [];
    APP_STATE.products = [];
    APP_STATE.sales = [];
    APP_STATE.debts = [];
    APP_STATE.cart = [];
    
    showLandingPage();
    showToast('Tizimdan chiqildi', 'Sessiya muvaffaqiyatli yakunlandi', 'warning');
}

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

function handleRegisterSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value.trim();
    const shopName = document.getElementById('register-shopname').value.trim();

    if (!username || !password || !shopName) return;

    if (APP_STATE.users.some(u => u.username === username)) {
        showToast('Ro\'yxatdan o\'tish xatosi', 'Ushbu foydalanuvchi nomi band!', 'danger');
        return;
    }

    const newUserId = 'user-' + Date.now();
    const newUser = {
        id: newUserId,
        username,
        password,
        shopName,
        role: 'staff'
    };

    APP_STATE.users.push(newUser);
    
    // Initialize empty databases for the new shop in localStorage
    localStorage.setItem(`savdopro_${newUserId}_categories`, JSON.stringify([]));
    localStorage.setItem(`savdopro_${newUserId}_products`, JSON.stringify([]));
    localStorage.setItem(`savdopro_${newUserId}_sales`, JSON.stringify([]));
    localStorage.setItem(`savdopro_${newUserId}_debts`, JSON.stringify([]));

    // Persist user globally
    persistData('users');

    // Create Firestore document for the new shop
    db.collection('shops').doc(newUserId).set({
        categories: [],
        products: [],
        sales: [],
        debts: []
    }).catch(err => console.error("Firestore shop creation failed:", err));

    // Close registration modal
    document.getElementById('register-modal').classList.remove('active');

    // Auto log in!
    loginUserSession(newUser);
    showToast('Do\'kon ochildi', 'Yangi do\'kon muvaffaqiyatli ro\'yxatdan o\'tdi!', 'success');
}

function persistData(key) {
    if (!APP_STATE.currentUser) return;
    const prefix = APP_STATE.currentUser.id;
    
    if (key === 'users') {
        localStorage.setItem('savdopro_users', JSON.stringify(APP_STATE.users));
    } else {
        localStorage.setItem(`savdopro_${prefix}_${key}`, JSON.stringify(APP_STATE[key]));
    }
    
    // Upload changes to Firestore
    if (key === 'users') {
        APP_STATE.users.forEach(u => {
            db.collection('users').doc(u.id).set(u).catch(err => console.error("Firestore user save failed:", err));
        });
    } else {
        db.collection('shops').doc(prefix).set({
            [key]: APP_STATE[key]
        }, { merge: true }).catch(err => {
            console.error(`Firestore save failed for ${key}:`, err);
            showToast('Sinxronizatsiya xatosi', 'Ma\'lumotlarni bulutga yozib bo\'lmadi', 'danger');
        });
    }
    
    renderRealTime();
}

// --- View Router Controller ---
function switchView(viewName) {
    APP_STATE.activeView = viewName;
    
    // Toggle active state in sidebar menu
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        if (panel.id === `${viewName}-view`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Set Header titles
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    
    const titles = {
        dashboard: { main: 'Bosh sahifa', sub: 'DO\'KONINGIZ STATISTIKASI VA MONITORINGI' },
        categories: { main: 'Kategoriyalar', sub: 'MAHSULOT KATEGORIYALARINI BOSHQARISH' },
        products: { main: 'Mahsulotlar', sub: 'OMBORXONA MAHSULOTLARI RO\'YXATI' },
        'low-stock': { main: 'Kam qolganlar', sub: 'ZAXIRASI TUGAYOTGAN MAHSULOTLAR' },
        'best-sellers': { main: 'Ko\'p sotilganlar', sub: 'ENG KO\'P SOTILAYOTGAN TOVARLAR ANALITIKASI' },
        debts: { main: 'Qarzlar daftari', sub: 'MIJOZLAR QARZDORLIGI NAZORATI' },
        sell: { main: 'Sotuv bo\'limi', sub: 'TEZKOR POS SAVDO TERMINALI' },
        admin: { main: 'Foydalanuvchilar boshqaruvi', sub: 'TIZIMDAGI DO\'KONLAR VA USERS MONITORINGI' }
    };

    if (titles[viewName]) {
        titleEl.textContent = titles[viewName].main;
        subtitleEl.textContent = titles[viewName].sub;
    }

    // Load scanner shutdown safety on view switch
    stopQRScanner();

    // Specific view actions
    if (viewName === 'dashboard') {
        renderSalesChart();
    }
    
    renderRealTime();
}

// --- Real-time Rendering Pipeline ---
function renderRealTime() {
    updateBadges();
    
    switch (APP_STATE.activeView) {
        case 'dashboard':
            renderDashboardStats();
            renderDashboardLowStock();
            renderDashboardPopular();
            break;
        case 'categories':
            renderCategories();
            break;
        case 'products':
            renderProducts();
            break;
        case 'low-stock':
            renderLowStockTable();
            break;
        case 'best-sellers':
            renderBestSellersView();
            break;
        case 'debts':
            renderDebtsTable();
            break;
        case 'sell':
            renderPOSCatalog();
            renderPOSCart();
            break;
        case 'admin':
            renderAdminView();
            break;
    }
    
    // Refresh Lucide icons in the DOM
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Update badges on Sidebar
function updateBadges() {
    const lowStockCount = APP_STATE.products.filter(p => p.stock <= 5).length;
    const badge = document.getElementById('low-stock-count-badge');
    badge.textContent = lowStockCount;
    if (lowStockCount > 0) {
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// --- Toast Notifications toaster ---
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'danger') icon = 'alert-octagon';

    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${icon}"></i></div>
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- Dynamic Date Filtering ---
function getFilteredTransactions() {
    const now = new Date();
    const period = APP_STATE.activePeriod;
    
    return APP_STATE.sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        const diffTime = Math.abs(now - saleDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (period === 'day') {
            return saleDate.toDateString() === now.toDateString();
        } else if (period === 'week') {
            return diffDays <= 7;
        } else if (period === 'month') {
            return diffDays <= 30;
        } else if (period === 'year') {
            return diffDays <= 365;
        }
        return true;
    });
}

// --- 1. Dashboard Logic ---
function renderDashboardStats() {
    const filteredSales = getFilteredTransactions();
    
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    filteredSales.forEach(sale => {
        totalRevenue += sale.totalRevenue;
        totalCost += sale.totalCost;
        totalProfit += sale.totalProfit;
    });

    // Unpaid debts
    let totalDebts = APP_STATE.debts
        .filter(d => d.status === 'unpaid')
        .reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);

    // Format currencies
    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('stat-cost').textContent = formatCurrency(totalCost);
    document.getElementById('stat-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('stat-debts').textContent = formatCurrency(totalDebts);
}

function renderDashboardLowStock() {
    const lowStockContainer = document.getElementById('widget-low-stock-list');
    const badge = document.getElementById('widget-low-stock-badge');
    
    const lowStockItems = APP_STATE.products.filter(p => p.stock <= 5);
    badge.textContent = `${lowStockItems.length} ta`;

    if (lowStockItems.length === 0) {
        lowStockContainer.innerHTML = '<p class="text-center text-muted" style="padding: 20px 0;">Hamma mahsulotlar yetarli miqdorda.</p>';
        return;
    }

    lowStockContainer.innerHTML = lowStockItems.map(item => {
        const category = APP_STATE.categories.find(c => c.id === item.categoryId)?.name || 'Kategoriyasiz';
        return `
            <div class="low-stock-item" onclick="openEditProduct('${item.id}')" style="cursor:pointer;">
                <div class="low-stock-info">
                    <h5>${item.name}</h5>
                    <p>${category}</p>
                </div>
                <span class="low-stock-badge">${item.stock} ${item.unit}</span>
            </div>
        `;
    }).join('');
}

function renderDashboardPopular() {
    const container = document.getElementById('dashboard-popular-list');
    const popular = getPopularProducts(5);

    if (popular.length === 0) {
        container.innerHTML = '<div class="text-center text-muted" style="grid-column: 1/-1; padding: 20px;">Hali sotuvlar amalga oshirilmagan.</div>';
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
        </div>
    `).join('');
}

function getPopularProducts(limit = 5) {
    const productSalesMap = {};

    APP_STATE.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSalesMap[item.productId]) {
                const prod = APP_STATE.products.find(p => p.id === item.productId);
                productSalesMap[item.productId] = {
                    name: item.name,
                    unit: prod?.unit || 'dona',
                    categoryName: APP_STATE.categories.find(c => c.id === prod?.categoryId)?.name || 'Kategoriyasiz',
                    soldQty: 0,
                    profit: 0
                };
            }
            productSalesMap[item.productId].soldQty += item.quantity;
            productSalesMap[item.productId].profit += (item.sellingPrice - item.costPrice) * item.quantity;
        });
    });

    return Object.values(productSalesMap)
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, limit);
}

// --- Chart rendering ---
function renderSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Destroy previous instance
    if (APP_STATE.chart) {
        APP_STATE.chart.destroy();
    }

    // Determine values and labels based on selected period
    let labels = [];
    let revenueData = [];
    let profitData = [];
    let costData = [];

    const now = new Date();
    const period = APP_STATE.activePeriod;

    // Helper functions for dates
    const getDayNameUz = (date) => {
        const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
        return days[date.getDay()];
    };

    const getMonthNameUz = (monthIndex) => {
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        return months[monthIndex];
    };

    if (period === 'day') {
        // Today, breakdown by hourly blocks (last 6 hours)
        for (let i = 5; i >= 0; i--) {
            const h = new Date();
            h.setHours(now.getHours() - i);
            labels.push(`${h.getHours()}:00`);
            
            // Calculate sales in this hour
            let rev = 0, prf = 0, cst = 0;
            APP_STATE.sales.forEach(sale => {
                const sd = new Date(sale.timestamp);
                if (sd.toDateString() === now.toDateString() && sd.getHours() === h.getHours()) {
                    rev += sale.totalRevenue;
                    cst += sale.totalCost;
                    prf += sale.totalProfit;
                }
            });
            revenueData.push(rev);
            profitData.push(prf);
            costData.push(cst);
        }
    } 
    else if (period === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            labels.push(getDayNameUz(d) + ` (${d.getDate()}-${getMonthNameUz(d.getMonth())})`);

            let rev = 0, prf = 0, cst = 0;
            APP_STATE.sales.forEach(sale => {
                const sd = new Date(sale.timestamp);
                if (sd.toDateString() === d.toDateString()) {
                    rev += sale.totalRevenue;
                    cst += sale.totalCost;
                    prf += sale.totalProfit;
                }
            });
            revenueData.push(rev);
            profitData.push(prf);
            costData.push(cst);
        }
    } 
    else if (period === 'month') {
        // Last 30 days, grouped in intervals of 2 days (to match visual image)
        // Image has intervals: 27-yan, 29-yan, 31-yan, 2-fev, etc.
        // We will generate the last 30 days labels with dynamic 2-day intervals
        for (let i = 15; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i * 2);
            labels.push(`${d.getDate()}-${getMonthNameUz(d.getMonth()).toLowerCase()}`);

            // Find sales on this day or previous day (2-day bucket)
            let rev = 0, prf = 0, cst = 0;
            const targetDates = [d.toDateString()];
            const prevD = new Date(d);
            prevD.setDate(d.getDate() - 1);
            targetDates.push(prevD.toDateString());

            APP_STATE.sales.forEach(sale => {
                const sd = new Date(sale.timestamp);
                if (targetDates.includes(sd.toDateString())) {
                    rev += sale.totalRevenue;
                    cst += sale.totalCost;
                    prf += sale.totalProfit;
                }
            });
            revenueData.push(rev);
            profitData.push(prf);
            costData.push(cst);
        }
    } 
    else if (period === 'year') {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
            const m = new Date();
            m.setMonth(now.getMonth() - i);
            labels.push(getMonthNameUz(m.getMonth()) + ` ${m.getFullYear()}`);

            let rev = 0, prf = 0, cst = 0;
            APP_STATE.sales.forEach(sale => {
                const sd = new Date(sale.timestamp);
                if (sd.getMonth() === m.getMonth() && sd.getFullYear() === m.getFullYear()) {
                    rev += sale.totalRevenue;
                    cst += sale.totalCost;
                    prf += sale.totalProfit;
                }
            });
            revenueData.push(rev);
            profitData.push(prf);
            costData.push(cst);
        }
    }

    // Chart.js Configuration
    APP_STATE.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tushum',
                    data: revenueData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 6
                },
                {
                    label: 'Foyda',
                    data: profitData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 6
                },
                {
                    label: 'Xarajat',
                    data: costData,
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 11, weight: 600 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 10 },
                        callback: function(value) {
                            return value >= 1000000 ? (value / 1000000).toFixed(1) + 'M So\'m' : value.toLocaleString() + ' So\'m';
                        }
                    }
                }
            }
        }
    });
}

// --- Excel Export Engine ---
function exportDataToExcel() {
    const period = APP_STATE.activePeriod;
    const transactions = getFilteredTransactions();

    // Prepare table headers
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'Chek ID;Sana;Sotilgan tovarlar;Jami Tushum (So\'m);Tan Narxi (So\'m);Sof Foyda (So\'m)\r\n';

    transactions.forEach(sale => {
        const dateStr = new Date(sale.timestamp).toLocaleString('uz-UZ').replace(',', '');
        const itemsStr = sale.items.map(item => `${item.name} (${item.quantity} ${item.unit || 'dona'})`).join(' / ');
        
        csvContent += `${sale.id};${dateStr};${itemsStr};${sale.totalRevenue};${sale.totalCost};${sale.totalProfit}\r\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `SavdoPro_Statistika_${period.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Muvaffaqiyatli yuklandi', `${period.toUpperCase()} bo'yicha ma'lumotlar yuklab olindi`, 'success');
}

function clearStoreData() {
    if (!APP_STATE.currentUser) return;
    const confirmClear = confirm("Haqiqatan ham bugungi barcha savdo/tushum ma'lumotlarini o'chirmoqchimisiz? (Mahsulotlar, kategoriyalar va qarzlar o'zgarmasdan qoladi)");
    if (!confirmClear) return;
    
    // Filter out today's sales
    const todayStr = new Date().toDateString();
    APP_STATE.sales = APP_STATE.sales.filter(sale => {
        return new Date(sale.timestamp).toDateString() !== todayStr;
    });
    
    // Persist sales data to localStorage
    persistData('sales');
    
    // Explicitly update all views & stats & charts
    renderSalesChart();
    renderDashboardStats();
    renderDashboardLowStock();
    renderDashboardPopular();
    updateBadges();
    
    showToast('Bugungi savdolar o\'chirildi', 'Bugungi kunga tegishli savdo ma\'lumotlari muvaffaqiyatli tozalandi!', 'success');
}

// --- 2. Categories Management ---
function renderCategories() {
    const container = document.getElementById('categories-list');
    const searchVal = document.getElementById('search-categories-input').value.toLowerCase();
    
    const filteredCategories = APP_STATE.categories.filter(c => 
        c.name.toLowerCase().includes(searchVal) || 
        (c.description && c.description.toLowerCase().includes(searchVal))
    );

    if (filteredCategories.length === 0) {
        container.innerHTML = '<div class="text-center text-muted" style="grid-column: 1/-1; padding: 40px;">Kategoriyalar topilmadi.</div>';
        return;
    }

    container.innerHTML = filteredCategories.map(cat => {
        const count = APP_STATE.products.filter(p => p.categoryId === cat.id).length;
        return `
            <div class="category-card" data-id="${cat.id}">
                <div class="category-info">
                    <h4>${cat.name}</h4>
                    <p>${cat.description || 'Tavsif berilmagan'}</p>
                </div>
                <div class="category-stats">
                    <i data-lucide="box"></i>
                    <span>${count} ta mahsulot</span>
                </div>
                <div class="category-actions">
                    <button class="btn btn-outline" onclick="openCategoryProducts('${cat.id}')">
                        <i data-lucide="eye"></i>
                        <span>Ichiga kirish</span>
                    </button>
                    <button class="btn btn-icon-sm" onclick="openEditCategory('${cat.id}')" title="Tahrirlash">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn btn-icon-sm delete" onclick="deleteCategory('${cat.id}')" title="O'chirish">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddCategory() {
    document.getElementById('category-modal-title').textContent = 'Kategoriya qo\'shish';
    document.getElementById('category-form-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-desc').value = '';
    
    document.getElementById('category-modal').classList.add('active');
}

function openEditCategory(id) {
    const cat = APP_STATE.categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('category-modal-title').textContent = 'Kategoriyani tahrirlash';
    document.getElementById('category-form-id').value = cat.id;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-desc').value = cat.description || '';
    
    document.getElementById('category-modal').classList.add('active');
}

function deleteCategory(id) {
    if (confirm('Kategoriyani o\'chirishni tasdiqlaysizmi? Kategoriya ichidagi mahsulotlar o\'chmaydi.')) {
        APP_STATE.categories = APP_STATE.categories.filter(c => c.id !== id);
        // Set category of associated products to null or empty
        APP_STATE.products.forEach(p => {
            if (p.categoryId === id) {
                p.categoryId = '';
            }
        });
        persistData('categories');
        persistData('products');
        showToast('Kategoriya o\'chirildi', 'Muvaffaqiyatli bajarildi', 'danger');
    }
}

function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('category-form-id').value;
    const name = document.getElementById('category-name').value.trim();
    const description = document.getElementById('category-desc').value.trim();

    if (!name) return;

    if (id) {
        // Edit existing
        const cat = APP_STATE.categories.find(c => c.id === id);
        if (cat) {
            cat.name = name;
            cat.description = description;
            showToast('Tahrirlandi', 'Kategoriya muvaffaqiyatli yangilandi');
        }
    } else {
        // Add new
        const newCat = {
            id: 'cat-' + Date.now(),
            name,
            description
        };
        APP_STATE.categories.push(newCat);
        showToast('Yangi kategoriya', 'Kategoriya muvaffaqiyatli saqlandi');
    }

    persistData('categories');
    document.getElementById('category-modal').classList.remove('active');
}

// Enter Category: view products inside
function openCategoryProducts(id) {
    const cat = APP_STATE.categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('category-products-modal-title').textContent = `"${cat.name}" kategoriyasidagi mahsulotlar`;
    const tbody = document.getElementById('category-products-table-body');
    const catProds = APP_STATE.products.filter(p => p.categoryId === id);

    if (catProds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Ushbu kategoriyada mahsulotlar yo\'q.</td></tr>';
    } else {
        tbody.innerHTML = catProds.map(prod => `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td>${prod.stock} ${prod.unit}</td>
                <td><code>${prod.code || '-'}</code></td>
                <td class="action-cell">
                    <button class="btn-icon-sm" onclick="openEditProduct('${prod.id}'); closeModal('category-products-modal');" title="Tahrirlash">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-icon-sm delete" onclick="deleteProduct('${prod.id}'); openCategoryProducts('${id}');" title="O'chirish">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('category-products-modal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

// --- 3. Products Management ---
function renderProducts() {
    const tbody = document.getElementById('products-table-body');
    const searchVal = document.getElementById('search-products-input').value.toLowerCase();

    const filteredProducts = APP_STATE.products.filter(p => 
        p.name.toLowerCase().includes(searchVal) || 
        (p.code && p.code.toLowerCase().includes(searchVal))
    );

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Mahsulotlar topilmadi.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredProducts.map(prod => {
        const catName = APP_STATE.categories.find(c => c.id === prod.categoryId)?.name || 'Kategoriyasiz';
        const qrCodeImg = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(prod.code || prod.name)}`;
        
        return `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${catName}</td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td>
                    <span class="badge ${prod.stock <= 5 ? 'badge-danger' : 'badge-success'}">
                        ${prod.stock} ${prod.unit}
                    </span>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${qrCodeImg}" width="28" height="28" alt="QR" style="border: 1px solid #333;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'><rect width=\'60\' height=\'60\' fill=\'%23fff\'/><rect x=\'10\' y=\'10\' width=\'15\' height=\'15\'/><rect x=\'35\' y=\'10\' width=\'15\' height=\'15\'/><rect x=\'10\' y=\'35\' width=\'15\' height=\'15\'/></svg>'">
                        <code>${prod.code || '-'}</code>
                    </div>
                </td>
                <td class="action-cell">
                    <button class="btn-icon-sm" onclick="printProductQR('${prod.id}')" title="QR kodni chop etish">
                        <i data-lucide="printer"></i>
                    </button>
                    <button class="btn-icon-sm" onclick="openEditProduct('${prod.id}')" title="Tahrirlash">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-icon-sm delete" onclick="deleteProduct('${prod.id}')" title="O'chirish">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddProduct() {
    // Populate categories select
    const select = document.getElementById('product-category');
    select.innerHTML = APP_STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    document.getElementById('product-modal-title').textContent = 'Yangi mahsulot qo\'shish';
    document.getElementById('product-form-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-cost').value = '';
    document.getElementById('product-selling').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-unit').value = 'dona';
    document.getElementById('product-code').value = '';

    document.getElementById('product-modal').classList.add('active');
}

function openEditProduct(id) {
    const prod = APP_STATE.products.find(p => p.id === id);
    if (!prod) return;

    // Populate categories select
    const select = document.getElementById('product-category');
    select.innerHTML = APP_STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    document.getElementById('product-modal-title').textContent = 'Mahsulotni tahrirlash';
    document.getElementById('product-form-id').value = prod.id;
    document.getElementById('product-name').value = prod.name;
    document.getElementById('product-category').value = prod.categoryId;
    document.getElementById('product-cost').value = prod.costPrice;
    document.getElementById('product-selling').value = prod.sellingPrice;
    document.getElementById('product-stock').value = prod.stock;
    document.getElementById('product-unit').value = prod.unit;
    document.getElementById('product-code').value = prod.code || '';

    document.getElementById('product-modal').classList.add('active');
}

function deleteProduct(id) {
    if (confirm('Mahsulotni o\'chirishni tasdiqlaysizmi?')) {
        APP_STATE.products = APP_STATE.products.filter(p => p.id !== id);
        persistData('products');
        showToast('Mahsulot o\'chirildi', 'Bajarildi', 'danger');
    }
}

function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-form-id').value;
    const name = document.getElementById('product-name').value.trim();
    const categoryId = document.getElementById('product-category').value;
    const costPrice = parseInt(document.getElementById('product-cost').value);
    const sellingPrice = parseInt(document.getElementById('product-selling').value);
    const stock = parseFloat(document.getElementById('product-stock').value);
    const unit = document.getElementById('product-unit').value;
    let code = document.getElementById('product-code').value.trim();

    if (!name || isNaN(costPrice) || isNaN(sellingPrice) || isNaN(stock)) return;

    if (!code) {
        // Auto generate barcode if empty
        code = 'SP-' + Math.floor(10000000 + Math.random() * 90000000);
    }

    if (id) {
        // Edit existing
        const prod = APP_STATE.products.find(p => p.id === id);
        if (prod) {
            prod.name = name;
            prod.categoryId = categoryId;
            prod.costPrice = costPrice;
            prod.sellingPrice = sellingPrice;
            prod.stock = stock;
            prod.unit = unit;
            prod.code = code;
            showToast('Tahrirlandi', 'Mahsulot muvaffaqiyatli yangilandi');
        }
    } else {
        // Add new
        const newProd = {
            id: 'prod-' + Date.now(),
            name,
            categoryId,
            costPrice,
            sellingPrice,
            stock,
            unit,
            code
        };
        APP_STATE.products.push(newProd);
        showToast('Yangi mahsulot', 'Mahsulot muvaffaqiyatli saqlandi');
    }

    persistData('products');
    document.getElementById('product-modal').classList.remove('active');
}

function printProductQR(id) {
    const prod = APP_STATE.products.find(p => p.id === id);
    if (!prod) return;

    const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(prod.code || prod.name)}`;
    
    // Open a printable popup window
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    printWindow.document.write(`
        <html>
        <head>
            <title>QR Code Print - ${prod.name}</title>
            <style>
                body { font-family: 'Outfit', sans-serif; text-align: center; padding: 40px; }
                h2 { margin-bottom: 5px; font-size: 18px; }
                p { font-size: 12px; color: #555; margin-bottom: 20px; }
                .qr-container { border: 1px solid #ddd; padding: 15px; display: inline-block; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <h2>${prod.name}</h2>
                <p>Kod: ${prod.code}</p>
                <img src="${qrCodeImgUrl}" width="150" height="150" alt="QR Code">
                <br><br>
                <strong>Narxi: ${prod.sellingPrice.toLocaleString()} So'm</strong>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// --- 4. Low Stock View ---
function renderLowStockTable() {
    const tbody = document.getElementById('low-stock-table-body');
    const lowStockItems = APP_STATE.products.filter(p => p.stock <= 5);

    if (lowStockItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Zaxirasi kam mahsulotlar mavjud emas.</td></tr>';
        return;
    }

    tbody.innerHTML = lowStockItems.map(prod => {
        const catName = APP_STATE.categories.find(c => c.id === prod.categoryId)?.name || 'Kategoriyasiz';
        const statusText = prod.stock === 0 ? 'Tugagan' : 'Kam qolgan';
        const statusClass = prod.stock === 0 ? 'badge-danger' : 'badge-warning-dark';
        
        return `
            <tr>
                <td class="product-cell-name">${prod.name}</td>
                <td>${catName}</td>
                <td><strong style="color:var(--color-danger);">${prod.stock} ${prod.unit}</strong></td>
                <td>${formatCurrency(prod.costPrice)}</td>
                <td>${formatCurrency(prod.sellingPrice)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="action-cell">
                    <button class="btn btn-outline" onclick="openEditProduct('${prod.id}')">
                        <i data-lucide="edit-3"></i>
                        <span>Tahrirlash / To'ldirish</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- 5. Best Sellers Analytics ---
function renderBestSellersView() {
    const tbody = document.getElementById('best-sellers-table-body');
    
    // Sort items by popularity
    const list = getPopularProducts(20);
    
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sotuvlar topilmadi.</td></tr>';
        document.getElementById('top-product-today-name').textContent = 'Hali sotuvlar yo\'q';
        document.getElementById('top-product-today-details').textContent = '';
        return;
    }

    // Top product today
    const topProd = list[0];
    document.getElementById('top-product-today-name').textContent = topProd.name;
    document.getElementById('top-product-today-details').textContent = `Jami sotilgan: ${topProd.soldQty} ${topProd.unit} | Topilgan sof foyda: ${formatCurrency(topProd.profit)}`;

    tbody.innerHTML = list.map(item => `
        <tr>
            <td class="product-cell-name">${item.name}</td>
            <td>${item.categoryName}</td>
            <td><strong>${item.soldQty} ${item.unit}</strong></td>
            <td>-</td> 
            <td><span style="color:var(--color-success); font-weight:700;">+${formatCurrency(item.profit)}</span></td>
        </tr>
    `).join('');
    
    // Fix estimated calculations in UI
    let accurateHTML = '';
    list.forEach(item => {
        // Calculate total revenue and profit directly from transaction logs
        let revenue = 0;
        APP_STATE.sales.forEach(sale => {
            sale.items.forEach(saleItem => {
                if (saleItem.productId === APP_STATE.products.find(p => p.name === item.name)?.id) {
                    revenue += saleItem.sellingPrice * saleItem.quantity;
                }
            });
        });
        accurateHTML += `
            <tr>
                <td class="product-cell-name">${item.name}</td>
                <td>${item.categoryName}</td>
                <td><strong>${item.soldQty} ${item.unit}</strong></td>
                <td>${formatCurrency(revenue)}</td>
                <td><span style="color:var(--color-success); font-weight:700;">+${formatCurrency(item.profit)}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = accurateHTML;
}

// Safe Date Formatting Helper
function formatDateSafe(dateString) {
    if (!dateString) return '-';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
}

// --- 6. Debts Tracker ---
function renderDebtsTable() {
    const tbody = document.getElementById('debts-table-body');
    const searchVal = document.getElementById('search-debts-input').value.toLowerCase();
    
    // Get active filter
    const activeFilterBtn = document.querySelector('#debts-filter-tabs .filter-btn.active');
    const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';

    let filtered = APP_STATE.debts.filter(d => 
        d.name.toLowerCase().includes(searchVal) || 
        (d.phone && d.phone.includes(searchVal))
    );

    if (filter === 'unpaid') {
        filtered = filtered.filter(d => d.status === 'unpaid');
    } else if (filter === 'paid') {
        filtered = filtered.filter(d => d.status === 'paid');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Qarz yozuvlari topilmadi.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(debt => `
        <tr>
            <td class="product-cell-name">${debt.name}</td>
            <td>${debt.phone || '-'}</td>
            <td><strong>${formatCurrency(debt.amount)}</strong></td>
            <td>${formatDateSafe(debt.date)}</td>
            <td>${debt.notes || '-'}</td>
            <td>
                <span class="badge ${debt.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                    ${debt.status === 'paid' ? 'To\'langan' : 'To\'lanmagan'}
                </span>
            </td>
            <td class="action-cell">
                <button class="btn-icon-sm success" onclick="toggleDebtPaid('${debt.id}')" title="To'lov holatini o'zgartirish">
                    <i data-lucide="check"></i>
                </button>
                <button class="btn-icon-sm" onclick="openEditDebt('${debt.id}')" title="Tahrirlash">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-icon-sm delete" onclick="deleteDebt('${debt.id}')" title="O'chirish">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddDebt() {
    document.getElementById('debt-modal-title').textContent = 'Yangi qarz qo\'shish';
    document.getElementById('debt-form-id').value = '';
    document.getElementById('debt-customer').value = '';
    document.getElementById('debt-phone').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('debt-status').value = 'unpaid';
    document.getElementById('debt-notes').value = '';

    document.getElementById('debt-modal').classList.add('active');
}

function openEditDebt(id) {
    const debt = APP_STATE.debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('debt-modal-title').textContent = 'Qarz yozuvini tahrirlash';
    document.getElementById('debt-form-id').value = debt.id;
    document.getElementById('debt-customer').value = debt.name;
    document.getElementById('debt-phone').value = debt.phone || '';
    document.getElementById('debt-amount').value = debt.amount;
    document.getElementById('debt-date').value = debt.date;
    document.getElementById('debt-status').value = debt.status;
    document.getElementById('debt-notes').value = debt.notes || '';

    document.getElementById('debt-modal').classList.add('active');
}

function deleteDebt(id) {
    if (confirm('Ushbu qarz yozuvini o\'chirishni tasdiqlaysizmi?')) {
        APP_STATE.debts = APP_STATE.debts.filter(d => d.id !== id);
        persistData('debts');
        showToast('Qarz o\'chirildi', 'Bajarildi', 'danger');
    }
}

function toggleDebtPaid(id) {
    const debt = APP_STATE.debts.find(d => d.id === id);
    if (!debt) return;

    debt.status = debt.status === 'paid' ? 'unpaid' : 'paid';
    persistData('debts');
    showToast('Holat yangilandi', `Qarz holati ${debt.status === 'paid' ? 'to\'langan' : 'to\'lanmagan'} deb o'zgartirildi`);
}

function saveDebt(e) {
    e.preventDefault();
    const id = document.getElementById('debt-form-id').value;
    const name = document.getElementById('debt-customer').value.trim();
    const phone = document.getElementById('debt-phone').value.trim();
    const amount = parseInt(document.getElementById('debt-amount').value);
    const date = document.getElementById('debt-date').value;
    const status = document.getElementById('debt-status').value;
    const notes = document.getElementById('debt-notes').value.trim();

    if (!name || isNaN(amount) || !date) return;

    if (id) {
        // Edit existing
        const debt = APP_STATE.debts.find(d => d.id === id);
        if (debt) {
            debt.name = name;
            debt.phone = phone;
            debt.amount = amount;
            debt.date = date;
            debt.status = status;
            debt.notes = notes;
            showToast('Yangilandi', 'Qarz yozuvi muvaffaqiyatli tahrirlandi');
        }
    } else {
        // Add new
        const newDebt = {
            id: 'debt-' + Date.now(),
            name,
            phone,
            amount,
            date,
            status,
            notes
        };
        APP_STATE.debts.push(newDebt);
        showToast('Qarz yozildi', 'Yangi qarz ro\'yxatga olindi');
    }

    persistData('debts');
    document.getElementById('debt-modal').classList.remove('active');
}

// --- 7. POS / Sell Terminal Logic ---
let posCategoryFilter = 'all';

function renderPOSCatalog() {
    const filtersContainer = document.getElementById('pos-category-filters');
    const catalogContainer = document.getElementById('pos-products-list');
    const searchVal = document.getElementById('pos-search-input').value.toLowerCase();

    // Render POS category filters tab
    let categoryFiltersHTML = `<div class="pos-category-tab ${posCategoryFilter === 'all' ? 'active' : ''}" onclick="setPOSCategoryFilter('all')">Barchasi</div>`;
    categoryFiltersHTML += APP_STATE.categories.map(c => `
        <div class="pos-category-tab ${posCategoryFilter === c.id ? 'active' : ''}" onclick="setPOSCategoryFilter('${c.id}')">${c.name}</div>
    `).join('');
    filtersContainer.innerHTML = categoryFiltersHTML;

    // Filter products
    let filtered = APP_STATE.products;
    if (posCategoryFilter !== 'all') {
        filtered = filtered.filter(p => p.categoryId === posCategoryFilter);
    }
    if (searchVal) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchVal) || 
            (p.code && p.code.toLowerCase().includes(searchVal))
        );
    }

    if (filtered.length === 0) {
        catalogContainer.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1; padding:40px;">Mahsulotlar topilmadi.</div>';
        return;
    }

    catalogContainer.innerHTML = filtered.map(prod => {
        let stockClass = 'in-stock';
        let stockText = `${prod.stock} ${prod.unit}`;
        
        if (prod.stock === 0) {
            stockClass = 'out-stock';
            stockText = 'Tugagan';
        } else if (prod.stock <= 5) {
            stockClass = 'low-stock';
            stockText = `Kam: ${prod.stock} ${prod.unit}`;
        }
        
        return `
            <div class="pos-product-card" onclick="addToCart('${prod.id}')">
                <span class="pos-product-stock-badge ${stockClass}">${stockText}</span>
                <h4>${prod.name}</h4>
                <p>Kod: ${prod.code || '-'}</p>
                <div class="price-row">
                    <span class="price">${formatCurrency(prod.sellingPrice)}</span>
                    <span class="unit">/${prod.unit}</span>
                </div>
            </div>
        `;
    }).join('');
}

function setPOSCategoryFilter(catId) {
    posCategoryFilter = catId;
    renderPOSCatalog();
}

function addToCart(productId) {
    const prod = APP_STATE.products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
        showToast('Zaxira yetarli emas', `"${prod.name}" tovari tugagan!`, 'warning');
        return;
    }

    const cartItem = APP_STATE.cart.find(item => item.productId === productId);
    if (cartItem) {
        if (cartItem.quantity + 1 > prod.stock) {
            showToast('Zaxira cheklovi', `Mavjud qoldiq: ${prod.stock} ${prod.unit}`, 'warning');
            return;
        }
        cartItem.quantity += 1;
    } else {
        APP_STATE.cart.push({
            productId: prod.id,
            name: prod.name,
            sellingPrice: prod.sellingPrice,
            costPrice: prod.costPrice,
            unit: prod.unit,
            quantity: 1
        });
    }

    showToast('Savatchaga qo\'shildi', `"${prod.name}" savatchaga joylandi`, 'success');
    renderPOSCart();
}

function updateCartQty(productId, qty) {
    const item = APP_STATE.cart.find(i => i.productId === productId);
    const prod = APP_STATE.products.find(p => p.id === productId);
    
    if (!item || !prod) return;

    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (parsedQty > prod.stock) {
        showToast('Zaxira cheklovi', `Mavjud qoldiq: ${prod.stock} ${prod.unit}`, 'warning');
        item.quantity = prod.stock;
    } else {
        item.quantity = parsedQty;
    }

    renderPOSCart();
}

function removeFromCart(productId) {
    APP_STATE.cart = APP_STATE.cart.filter(item => item.productId !== productId);
    renderPOSCart();
}

function renderPOSCart() {
    const cartContainer = document.getElementById('pos-cart-list');
    
    if (APP_STATE.cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart-message">
                <i data-lucide="shopping-cart"></i>
                <p>Savatcha bo'sh. Mahsulot tanlang yoki shtrix kodni skanerlang.</p>
            </div>
        `;
        document.getElementById('pos-total-count').textContent = '0 dona';
        document.getElementById('pos-total-sum').textContent = '0 So\'m';
        if (window.lucide) lucide.createIcons();
        return;
    }

    let totalSum = 0;
    let totalCount = 0;

    cartContainer.innerHTML = APP_STATE.cart.map(item => {
        const itemSum = item.sellingPrice * item.quantity;
        totalSum += itemSum;
        totalCount += (item.unit === 'dona' ? Math.floor(item.quantity) : 1);
        
        const stepAttr = item.unit === 'dona' ? '1' : 'any';

        return `
            <div class="cart-item">
                <div class="cart-item-detail">
                    <h5>${item.name}</h5>
                    <p>${formatCurrency(item.sellingPrice)} / ${item.unit}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="adjustCartQty('${item.productId}', -1)">-</button>
                    <input type="number" class="cart-qty-input" value="${item.quantity}" step="${stepAttr}" min="0.1" onchange="updateCartQty('${item.productId}', this.value)">
                    <button class="cart-qty-btn" onclick="adjustCartQty('${item.productId}', 1)">+</button>
                </div>
                <div class="cart-item-price">${formatCurrency(itemSum)}</div>
                <button class="btn-remove-item" onclick="removeFromCart('${item.productId}')">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
    }).join('');

    document.getElementById('pos-total-count').textContent = `${totalCount} xil`;
    document.getElementById('pos-total-sum').textContent = formatCurrency(totalSum);

    if (window.lucide) lucide.createIcons();
}

function adjustCartQty(productId, delta) {
    const item = APP_STATE.cart.find(i => i.productId === productId);
    if (item) {
        const newQty = item.quantity + delta;
        updateCartQty(productId, newQty);
    }
}

// Clear Checkout Cart
document.getElementById('btn-clear-cart').addEventListener('click', () => {
    if (APP_STATE.cart.length > 0 && confirm('Savatchani tozalashni xohlaysizmi?')) {
        APP_STATE.cart = [];
        renderPOSCart();
    }
});

// POS Checkout Finalization
function checkoutCart() {
    if (APP_STATE.cart.length === 0) {
        showToast('Savatcha bo\'sh', 'Sotish uchun avval tovar qo\'shing!', 'warning');
        return;
    }

    // Calculate checkout totals
    let totalRevenue = 0;
    let totalCost = 0;
    
    APP_STATE.cart.forEach(item => {
        totalRevenue += item.sellingPrice * item.quantity;
        totalCost += item.costPrice * item.quantity;
    });

    const totalProfit = totalRevenue - totalCost;

    // 1. Generate Receipt invoice details
    const saleId = 'SP-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('receipt-id').textContent = saleId;
    
    const now = new Date();
    document.getElementById('receipt-time').textContent = now.toLocaleString('uz-UZ');
    document.getElementById('receipt-total-amount').textContent = formatCurrency(totalRevenue);
    
    const rowsContainer = document.getElementById('receipt-items-rows');
    rowsContainer.innerHTML = APP_STATE.cart.map(item => `
        <div class="receipt-item-row">
            <div class="receipt-item-main">
                <span>${item.name}</span>
                <span>${(item.sellingPrice * item.quantity).toLocaleString()}</span>
            </div>
            <div class="receipt-item-sub">
                ${item.quantity} ${item.unit} x ${item.sellingPrice.toLocaleString()}
            </div>
        </div>
    `).join('');

    // 2. Generate QR Payment Code
    // Standard static Click/Payme link configuration in QR
    const qrText = `click://pay?merchant_id=12345&service_id=6789&trans_id=${saleId}&amount=${totalRevenue}`;
    const qrHolder = document.getElementById('receipt-qr-canvas-holder');
    qrHolder.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}" width="150" height="150" alt="Payment QR" style="display:block;">`;

    // Open receipt payment modal
    document.getElementById('receipt-modal').classList.add('active');
}

// Cash Register Sound Synthesizer (Metallic Clink & Coin Ring "Chiling")
function playCashRegisterSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;

        // --- Part 1: Metallic Cash Register Clink ("cha") ---
        const bufferSize = audioCtx.sampleRate * 0.08; // 80ms burst
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.06, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseNode.start(now);

        // --- Part 2: Slowly Decaying Coin Ring ("ching" / "chiling") ---
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const ringGain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1600, now + 0.02); // Primary coin pitch
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2100, now + 0.02); // Harmonious bright overtone

        ringGain.gain.setValueAtTime(0.0, now);
        ringGain.gain.setValueAtTime(0.12, now + 0.02);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55); // Ring out decay

        osc1.connect(ringGain);
        osc2.connect(ringGain);
        ringGain.connect(audioCtx.destination);

        osc1.start(now + 0.02);
        osc2.start(now + 0.02);

        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
    } catch (e) {
        console.log('Web Audio API is blocked or unsupported:', e);
    }
}

// Confirm transaction and commit database changes
function finalizeTransaction() {
    // 1. Deduct Stock from products database
    APP_STATE.cart.forEach(cartItem => {
        const prod = APP_STATE.products.find(p => p.id === cartItem.productId);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - cartItem.quantity);
        }
    });

    // 2. Append sale to transaction log
    let totalRevenue = 0;
    let totalCost = 0;
    
    APP_STATE.cart.forEach(item => {
        totalRevenue += item.sellingPrice * item.quantity;
        totalCost += item.costPrice * item.quantity;
    });

    const newSale = {
        id: 'sale-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: [...APP_STATE.cart],
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost
    };

    APP_STATE.sales.push(newSale);

    // Play cash register chiling sound
    playCashRegisterSound();

    // Save
    persistData('products');
    persistData('sales');

    // 3. Cleanup State
    APP_STATE.cart = [];
    renderPOSCart();
    
    // Close modal
    document.getElementById('receipt-modal').classList.remove('active');
    
    showToast('Sotuv yakunlandi', 'Ombordan tovarlar yozildi, statistika yangilandi');
}

// --- Print functions ---
document.getElementById('btn-print-receipt').addEventListener('click', () => {
    const printContent = document.getElementById('receipt-invoice-print').innerHTML;
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    printWindow.document.write(`
        <html>
        <head>
            <title>Kassa Cheki</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; line-height: 1.4; color: black; }
                .receipt-brand { text-align: center; }
                .receipt-divider { margin: 8px 0; }
                .receipt-total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
                .receipt-item-row { display: flex; flex-direction: column; margin-bottom: 6px; }
                .receipt-item-main { display: flex; justify-content: space-between; font-weight: bold; }
                .receipt-item-sub { font-size: 10px; color: #555; margin-left: 10px; }
            </style>
        </head>
        <body>
            <div>${printContent}</div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
});

// --- 8. QR Camera Scanner Logic (Html5Qrcode wrapper) ---
let activeScannerScope = 'pos'; // 'pos' | 'products'

function startQRScanner(scope = 'pos') {
    activeScannerScope = scope;
    document.getElementById('scanner-modal').classList.add('active');
    document.getElementById('scanner-status-text').textContent = 'Kamera yoqilmoqda...';

    // Cleanup active scanner if any
    if (APP_STATE.html5QrScanner) {
        stopQRScanner();
    }

    APP_STATE.html5QrScanner = new Html5Qrcode("qr-reader");
    
    // Start camera stream
    APP_STATE.html5QrScanner.start(
        { facingMode: "environment" }, // Rear camera
        {
            fps: 10,
            qrbox: { width: 220, height: 220 }
        },
        onScanSuccess,
        onScanFailure
    ).then(() => {
        document.getElementById('scanner-status-text').textContent = 'QR/Shtrix kodni ramkaga to\'g\'rilang...';
    }).catch(err => {
        document.getElementById('scanner-status-text').innerHTML = `<span style="color:var(--color-danger)">Kameraga ruxsat berilmadi!</span>`;
        showToast('Kamera xatosi', 'Kamerani yoqib bo\'lmadi. Ruxsatlarni tekshiring', 'danger');
        console.error(err);
    });
}

function stopQRScanner() {
    if (APP_STATE.html5QrScanner) {
        try {
            APP_STATE.html5QrScanner.stop().then(() => {
                APP_STATE.html5QrScanner = null;
            }).catch(e => console.log('Scanner stop caught:', e));
        } catch (e) {
            console.log('Scanner error:', e);
        }
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Beep sound indicator
    playBeepSound();
    
    stopQRScanner();
    document.getElementById('scanner-modal').classList.remove('active');

    showToast('Skanerlandi', `Natija: ${decodedText}`);

    if (activeScannerScope === 'pos-scan') {
        // POS Scanning Scope - find product by code and append to checkout
        const prod = APP_STATE.products.find(p => p.code === decodedText || p.id === decodedText);
        if (prod) {
            addToCart(prod.id);
            switchView('sell');
        } else {
            showToast('Topilmadi', `Kodni mos tovar ombordan topilmadi: "${decodedText}"`, 'warning');
        }
    } else if (activeScannerScope === 'pos-add' || activeScannerScope === 'products-add') {
        // Registering a new product - open add product modal pre-filled with the code
        openAddProduct();
        document.getElementById('product-code').value = decodedText;
        showToast('Yangi tovar kiritish', `QR shtrix-kod joylashtirildi: "${decodedText}"`);
    } else if (activeScannerScope === 'products-scan') {
        // Products List Scope - search query filter
        const input = document.getElementById('search-products-input');
        input.value = decodedText;
        switchView('products');
        renderProducts();
    }
}

function onScanFailure(error) {
    // Fail silently to prevent console log floods during standard camera cycles
}

// Beeper trigger for visual scanning confirmation
function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Beep pitch
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Beep volume

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // Duration: 100ms
    } catch (e) {
        console.log('AudioContext beep blocked or unsupported:', e);
    }
}

// Auto Barcode/QR generator inside Form Dialogs
document.getElementById('btn-generate-barcode').addEventListener('click', () => {
    const generated = 'SP-' + Math.floor(10000000 + Math.random() * 90000000);
    document.getElementById('product-code').value = generated;
    showToast('Kod yaratildi', `Kategoriya: ${generated}`);
});

// --- Modal Dialog Utils ---
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Setup global close events for modal cross/backdrop buttons
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) {
            modal.classList.remove('active');
            stopQRScanner();
        }
    });
});

// Close scanner cancel button specific handlers
document.getElementById('btn-stop-scanner-cancel').addEventListener('click', () => {
    stopQRScanner();
    closeModal('scanner-modal');
});
document.getElementById('btn-close-scanner').addEventListener('click', () => {
    stopQRScanner();
    closeModal('scanner-modal');
});

// --- Admin view functions (Manage users/shops) ---
function renderAdminView() {
    const tbody = document.getElementById('users-table-body');
    const searchVal = document.getElementById('search-users-input').value.toLowerCase();

    let filtered = APP_STATE.users.filter(u => 
        u.username.toLowerCase().includes(searchVal) || 
        u.shopName.toLowerCase().includes(searchVal)
    );

    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td class="product-cell-name">${user.username}</td>
            <td><code>${user.password}</code></td>
            <td>${user.shopName}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-success' : 'badge-unpaid'}">${user.role.toUpperCase()}</span></td>
            <td class="action-cell">
                <button class="btn-icon-sm" onclick="openEditUser('${user.id}')" title="Tahrirlash">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-icon-sm delete" onclick="deleteUser('${user.id}')" ${user.id === 'user-admin' ? 'disabled' : ''} title="O'chirish">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

function openAddUser() {
    document.getElementById('user-modal-title').textContent = 'Yangi foydalanuvchi qo\'shish';
    document.getElementById('user-form-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-shopname').value = '';
    document.getElementById('user-role').value = 'staff';

    document.getElementById('user-modal').classList.add('active');
}

function openEditUser(id) {
    const user = APP_STATE.users.find(u => u.id === id);
    if (!user) return;

    document.getElementById('user-modal-title').textContent = 'Foydalanuvchini tahrirlash';
    document.getElementById('user-form-id').value = user.id;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-password').value = user.password;
    document.getElementById('user-shopname').value = user.shopName;
    document.getElementById('user-role').value = user.role;

    document.getElementById('user-modal').classList.add('active');
}

function deleteUser(id) {
    if (id === 'user-admin') {
        showToast('Taqiqlangan', 'Bosh administrator o\'chirilishi mumkin emas!', 'danger');
        return;
    }

    if (confirm('Foydalanuvchi va unga tegishli do\'kon ma\'lumotlarini butunlay o\'chirishni xohlaysizmi?')) {
        APP_STATE.users = APP_STATE.users.filter(u => u.id !== id);
        
        // Remove isolated databases for this user from localStorage
        localStorage.removeItem(`savdopro_${id}_categories`);
        localStorage.removeItem(`savdopro_${id}_products`);
        localStorage.removeItem(`savdopro_${id}_sales`);
        localStorage.removeItem(`savdopro_${id}_debts`);
        
        // Remove from Firestore
        db.collection('shops').doc(id).delete().catch(err => console.error("Firestore shop delete failed:", err));
        db.collection('users').doc(id).delete().catch(err => console.error("Firestore user delete failed:", err));

        persistData('users');
        showToast('Foydalanuvchi o\'chirildi', 'Bajarildi', 'danger');
    }
}

function saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('user-form-id').value;
    const username = document.getElementById('user-username').value.trim().toLowerCase();
    const password = document.getElementById('user-password').value.trim();
    const shopName = document.getElementById('user-shopname').value.trim();
    const role = document.getElementById('user-role').value;

    if (!username || !password || !shopName) return;

    if (id) {
        // Edit existing
        const user = APP_STATE.users.find(u => u.id === id);
        if (user) {
            user.username = username;
            user.password = password;
            user.shopName = shopName;
            user.role = role;
            showToast('Yangilandi', 'Foydalanuvchi ma\'lumotlari tahrirlandi');
        }
    } else {
        // Check duplication
        if (APP_STATE.users.some(u => u.username === username)) {
            showToast('Xatolik', 'Ushbu foydalanuvchi nomi band!', 'danger');
            return;
        }
        
        // Add new
        const newUserId = 'user-' + Date.now();
        const newUser = {
            id: newUserId,
            username,
            password,
            shopName,
            role
        };
        APP_STATE.users.push(newUser);
        
        // Initialize empty database entries for the new shop in localStorage
        localStorage.setItem(`savdopro_${newUserId}_categories`, JSON.stringify([]));
        localStorage.setItem(`savdopro_${newUserId}_products`, JSON.stringify([]));
        localStorage.setItem(`savdopro_${newUserId}_sales`, JSON.stringify([]));
        localStorage.setItem(`savdopro_${newUserId}_debts`, JSON.stringify([]));

        // Create Firestore document for the new shop
        db.collection('shops').doc(newUserId).set({
            categories: [],
            products: [],
            sales: [],
            debts: []
        }).catch(err => console.error("Firestore shop creation failed:", err));

        showToast('Foydalanuvchi qo\'shildi', 'Yangi do\'kon tizimga muvaffaqiyatli kiritildi');
    }

    persistData('users');
    document.getElementById('user-modal').classList.remove('active');
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

// --- Utility Helpers ---
function formatCurrency(amount) {
    return parseInt(amount).toLocaleString('uz-UZ') + ' So\'m';
}

// --- POS Qarzga Sotish (Debt Checkout) Controllers ---
function openPOSDebtCheckout() {
    if (APP_STATE.cart.length === 0) {
        showToast('Savatcha bo\'sh', 'Qarzga sotish uchun avval tovar qo\'shing!', 'warning');
        return;
    }

    let totalRevenue = 0;
    APP_STATE.cart.forEach(item => {
        totalRevenue += item.sellingPrice * item.quantity;
    });

    document.getElementById('pos-debt-amount').value = totalRevenue;
    document.getElementById('pos-debt-amount-label').textContent = formatCurrency(totalRevenue);
    
    // Clear previous inputs
    document.getElementById('pos-debt-customer').value = '';
    document.getElementById('pos-debt-phone').value = '';
    document.getElementById('pos-debt-notes').value = '';

    document.getElementById('pos-debt-modal').classList.add('active');
}

function handlePOSDebtSubmit(e) {
    e.preventDefault();
    const amount = parseInt(document.getElementById('pos-debt-amount').value);
    const name = document.getElementById('pos-debt-customer').value.trim();
    const phone = document.getElementById('pos-debt-phone').value.trim();
    const notes = document.getElementById('pos-debt-notes').value.trim();

    if (!name || isNaN(amount)) return;

    // 1. Deduct Stock from products database
    APP_STATE.cart.forEach(cartItem => {
        const prod = APP_STATE.products.find(p => p.id === cartItem.productId);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - cartItem.quantity);
        }
    });

    // 2. Append sale to transaction log
    let totalCost = 0;
    APP_STATE.cart.forEach(item => {
        totalCost += item.costPrice * item.quantity;
    });

    const newSale = {
        id: 'sale-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: [...APP_STATE.cart],
        totalRevenue: amount,
        totalCost,
        totalProfit: amount - totalCost,
        paymentMethod: 'debt'
    };

    APP_STATE.sales.push(newSale);

    // 3. Create active unpaid debt entry in ledger
    const newDebt = {
        id: 'debt-' + Date.now(),
        name,
        phone,
        amount,
        date: new Date().toISOString().split('T')[0],
        status: 'unpaid',
        notes: notes ? notes : `POS sotuvdan qarz (Chek #${newSale.id})`
    };

    APP_STATE.debts.push(newDebt);

    // Play chime sound
    playCashRegisterSound();

    // Persist to partitioned DB keys
    persistData('products');
    persistData('sales');
    persistData('debts');

    // Close modal & reset POS
    document.getElementById('pos-debt-modal').classList.remove('active');
    APP_STATE.cart = [];
    renderPOSCart();

    showToast('Qarz yozildi', `Savdo muvaffaqiyatli yakunlandi. Mijoz: ${name}, Qarz: ${formatCurrency(amount)}`);
}

// --- Application Entry Point & Event Bindings ---
// --- Application Entry Point & Event Bindings ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize local databases
    initDatabase();

    // 2. Sidebar Navigation links click events binding
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // 3. Bind Logout button
    document.querySelector('.logout-btn').addEventListener('click', logoutUserSession);

    // 4. Bind Login Form submit
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);

    // Landing Page events binding
    document.getElementById('landing-btn-login').addEventListener('click', showLoginOverlay);
    document.getElementById('landing-btn-register').addEventListener('click', showRegisterModal);
    document.getElementById('hero-btn-start').addEventListener('click', showRegisterModal);
    document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
    
    // Close login when clicking outside overlay card
    document.getElementById('login-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'login-overlay') {
            showLandingPage();
        }
    });

    // 5. Bind Admin Panel operations
    document.getElementById('search-users-input').addEventListener('input', renderAdminView);
    document.getElementById('btn-add-user').addEventListener('click', openAddUser);
    document.getElementById('user-form').addEventListener('submit', saveUser);

    // 6. Bind theme toggles
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const activeTheme = APP_STATE.theme === 'dark' ? 'light' : 'dark';
        APP_STATE.theme = activeTheme;
        localStorage.setItem('savdopro_theme', activeTheme);
        document.body.setAttribute('data-theme', activeTheme);
        
        const icon = document.getElementById('theme-toggle-btn').querySelector('i');
        if (activeTheme === 'light') {
            icon.setAttribute('data-lucide', 'moon');
        } else {
            icon.setAttribute('data-lucide', 'sun');
        }
        if (window.lucide) lucide.createIcons();
    });

    // 7. Statistics Period Toggles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP_STATE.activePeriod = btn.getAttribute('data-period');
            renderSalesChart();
            renderDashboardStats();
        });
    });

    // 8. Statistics Export Button bind
    document.getElementById('btn-export-stats').addEventListener('click', exportDataToExcel);
    document.getElementById('btn-clear-store-data').addEventListener('click', clearStoreData);

    // 9. Categories search binding
    document.getElementById('search-categories-input').addEventListener('input', renderCategories);
    document.getElementById('btn-add-category').addEventListener('click', openAddCategory);
    document.getElementById('category-form').addEventListener('submit', saveCategory);

    // 10. Products search/creation binding
    document.getElementById('search-products-input').addEventListener('input', renderProducts);
    document.getElementById('btn-add-product').addEventListener('click', openAddProduct);
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('btn-scan-product').addEventListener('click', () => {
        startQRScanner('products-scan');
    });
    document.getElementById('btn-scan-add-product').addEventListener('click', () => {
        startQRScanner('products-add');
    });

    // 11. Debts search/creation/filters binding
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

    // 12. POS Checkout trigger buttons binding
    document.getElementById('pos-search-input').addEventListener('input', renderPOSCatalog);
    document.getElementById('pos-btn-scan').addEventListener('click', () => {
        startQRScanner('pos-scan');
    });
    document.getElementById('pos-btn-checkout').addEventListener('click', checkoutCart);
    document.getElementById('pos-btn-qr-pay').addEventListener('click', checkoutCart);
    document.getElementById('pos-btn-debt').addEventListener('click', openPOSDebtCheckout);
    document.getElementById('pos-debt-form').addEventListener('submit', handlePOSDebtSubmit);
    document.getElementById('btn-confirm-sale-success').addEventListener('click', finalizeTransaction);

    // Initial lucide icons instantiation
    if (window.lucide) lucide.createIcons();
});
