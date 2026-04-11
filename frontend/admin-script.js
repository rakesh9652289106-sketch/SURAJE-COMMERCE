/**
 * SURAJ Admin Panel Script
 * Finalized Backend Integration
 */


// Global Navigation function (Defined first for immediate availability)
function showSection(sectionId, forFulfillment = false) {
    console.log("Navigation Triggered -> Section:", sectionId, "Fulfillment:", forFulfillment);
    
    // Special case: aliasing view-fulfillment to view-orders
    if (sectionId === 'view-fulfillment') sectionId = 'view-orders';

    // Hide all sections
    const sections = document.querySelectorAll('.content-section, .admin-section');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
        console.log("Section displayed:", sectionId);
        
        // Context specific data refreshes
        if (sectionId === 'view-dashboard') { fetchDashboardStats(); setupCharts(); }
        if (sectionId === 'view-payment') fetchPaymentHistory();
        if (sectionId === 'view-orders') {
            const heading = document.getElementById('fulfillmentHeading');
            if (heading) heading.style.display = forFulfillment ? 'block' : 'none';
            fetchOrders();
        }
        if (sectionId === 'view-inquiries') fetchMessages();
        if (sectionId === 'view-products') fetchAdminProducts();
        if (sectionId === 'view-reviews') fetchAdminReviews();
        if (sectionId === 'view-users') fetchUsers();
        if (sectionId === 'view-categories') fetchAdminCategories();
        if (sectionId === 'view-brands') fetchAdminBrands();
        if (sectionId === 'view-coupons') fetchAdminCoupons();
        if (sectionId === 'view-notifications') fetchNotificationsHistory();
        if (sectionId === 'view-promo') { fetchBanner(); fetchOffers(); }
    } else {
        console.error("Target section not found:", sectionId);
    }
    
    // Update sidebar active state
    const sidebarItems = document.querySelectorAll('.sidebar-menu li');
    sidebarItems.forEach(item => {
        const clickAttr = item.getAttribute('onclick') || '';
        // Match section id AND the fulfillment flag if relevant
        if (clickAttr.includes(sectionId) && (!clickAttr.includes(', true') || forFulfillment)) {
            if (forFulfillment && !clickAttr.includes(', true')) item.classList.remove('active');
            else if (!forFulfillment && clickAttr.includes(', true')) item.classList.remove('active');
            else item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}
window.showSection = showSection;

function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (!sidebar) return;
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('active');
        if (overlay) overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}
window.toggleAdminSidebar = toggleAdminSidebar;
document.addEventListener("DOMContentLoaded", initAdmin);

function initAdmin() {
    console.log("Admin Dashboard Initializing...");
    
    // Core Initialization
    checkInitialAuth();
    setupEventListeners();
    
    // Optional: Setup charts if available
    try {
        if (typeof setupCharts === 'function') setupCharts();
    } catch(e) { console.warn("Charts component not detected."); }
}



// --- CORE HANDLERS ---

function setupEventListeners() {
    // Modal Close buttons
    [
        { btn: 'closeEditModal', modal: 'editProductModal' },
        { btn: 'closeMessageModal', modal: 'viewMessageModal' }
    ].forEach(m => {
        const btn = document.getElementById(m.btn);
        if (btn) btn.onclick = () => document.getElementById(m.modal).style.display = 'none';
    });

    // Forms
    document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
    document.getElementById('editProductForm')?.addEventListener('submit', handleEditProduct);
    document.getElementById('shopSettingsForm')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('adminDeliverySettingsForm')?.addEventListener('submit', handleSaveDeliverySettings);
    document.getElementById('adminPasswordForm')?.addEventListener('submit', handleUpdateAdminPassword);
    document.getElementById('adminNotificationForm')?.addEventListener('submit', handleSendNotification);
    document.getElementById('bannerEditForm')?.addEventListener('submit', handleSaveBanner);
    document.getElementById('offerForm1')?.addEventListener('submit', (e) => handleSaveOffer(e, 1));
    document.getElementById('offerForm2')?.addEventListener('submit', (e) => handleSaveOffer(e, 2));
    document.getElementById('offerForm3')?.addEventListener('submit', (e) => handleSaveOffer(e, 3));

    // New Management Forms
    document.getElementById('categoryForm')?.addEventListener('submit', handleCategorySubmit);
    document.getElementById('brandForm')?.addEventListener('submit', handleBrandSubmit);
    document.getElementById('couponForm')?.addEventListener('submit', handleCouponSubmit);
    document.getElementById('morningFreshBannerForm')?.addEventListener('submit', handleSaveMorningFreshBanner);
    document.getElementById('adminMarqueeForm')?.addEventListener('submit', handleMarqueeSubmit);
}



// --- DATA FETCHERS ---

async function fetchCategories() {
    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        const dropdownIds = ['pCategory', 'editPCategory', 'adminCategoryFilter', 'bCategory', 'mfCategory', 'oCategory1', 'oCategory2', 'oCategory3', 'adminProductCategory'];
        const options = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        
        dropdownIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const initial = el.innerHTML.includes('disabled') || el.innerHTML.includes('All') ? el.innerHTML : '';
                el.innerHTML = (id === 'adminCategoryFilter' || id === 'adminProductCategory' ? '<option value="All">All Categories</option>' : initial) + options;
            }
        });
    } catch(err) { console.error("Error loading categories:", err); }
}


async function fetchDashboardStats() {
    try {
        const res = await fetch('/api/admin/dashboard/stats');
        const stats = await res.json();
        if (stats) {
            if (document.getElementById('statRevenue')) document.getElementById('statRevenue').innerText = `₹${Math.round(stats.totalRevenue || 0)}`;
            if (document.getElementById('statOrders')) document.getElementById('statOrders').innerText = stats.totalOrders || 0;
            if (document.getElementById('statProducts')) document.getElementById('statProducts').innerText = stats.totalProducts || 0;
            if (document.getElementById('statMessages')) document.getElementById('statMessages').innerText = stats.unreadInquiries || 0;
        }
    } catch(err) { console.error("Failed to load dashboard stats", err); }
}

let revenueChartInstance = null;
async function setupCharts() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    try {
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();
        
        // Process data for last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dataPoints = last7Days.map(date => {
            return orders
                .filter(o => o.created_at.startsWith(date))
                .reduce((sum, o) => sum + o.total, 0);
        });

        if (revenueChartInstance) revenueChartInstance.destroy();

        revenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.split('-').slice(1).reverse().join('/')),
                datasets: [{
                    label: 'Revenue (₹)',
                    data: dataPoints,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#4F46E5'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch(e) { console.error("Chart Error:", e); }
}

async function fetchShopSettings() {
    try {
        const res = await fetch('/api/settings');
        const s = await res.json();
        if (s) {
            if (document.getElementById('sEmail')) document.getElementById('sEmail').value = s.shop_email || "";
            if (document.getElementById('sPhone')) document.getElementById('sPhone').value = s.shop_phone || "";
            if (document.getElementById('sAddress')) document.getElementById('sAddress').value = s.shop_address || "";
            if (document.getElementById('sImage')) document.getElementById('sImage').value = s.shop_image || "";
            if (document.getElementById('manageAllowedPincodes')) document.getElementById('manageAllowedPincodes').value = s.allowed_pincodes || "";
            if (document.getElementById('managePincodeActive')) document.getElementById('managePincodeActive').checked = s.pincode_restriction_active === 1;
        }
    } catch(err) { console.error("Error loading settings:", err); }
}

async function fetchBanner() {
    try {
        const res = await fetch('/api/banners');
        const banners = await res.json();
        
        const heroBanner = banners.find(b => b.id === 1);
        if (heroBanner && document.getElementById('bannerId')) {
            document.getElementById('bannerId').value = heroBanner.id;
            document.getElementById('bBadge').value = heroBanner.badge;
            document.getElementById('bTitle').value = heroBanner.title;
            document.getElementById('bDesc').value = heroBanner.description;
            document.getElementById('bBtnText').value = heroBanner.btnText;
            document.getElementById('bImgUrl').value = heroBanner.imgUrl;
            document.getElementById('bCategory').value = heroBanner.target_category || "All";
        }

        const morningFresh = banners.find(b => b.id === 2);
        if (morningFresh && document.getElementById('mfTitle')) {
            document.getElementById('mfBadge').value = morningFresh.badge || "MORNING FRESH";
            document.getElementById('mfTitle').value = morningFresh.title;
            document.getElementById('mfDesc').value = morningFresh.description;
            document.getElementById('mfBtnText').value = morningFresh.btnText || "Order Now";
            document.getElementById('mfImgUrl').value = morningFresh.imgUrl;
            document.getElementById('mfCategory').value = morningFresh.target_category || "All";
        }
    } catch(err) { console.error("Failed to load banner", err); }
}

async function handleSaveMorningFreshBanner(e) {
    e.preventDefault();
    const data = {
        badge: document.getElementById('mfBadge').value,
        title: document.getElementById('mfTitle').value,
        description: document.getElementById('mfDesc').value,
        btnText: document.getElementById('mfBtnText').value,
        imgUrl: document.getElementById('mfImgUrl').value,
        target_category: document.getElementById('mfCategory').value
    };
    try {
        const res = await fetch(`/api/admin/banners/2`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Toast.show("Morning Fresh Banner Updated", "success");
        } else {
            Toast.show("Failed to update banner", "error");
        }
    } catch(err) { console.error(err); }
}

async function fetchOffers() {
    try {
        const res = await fetch('/api/special-offers');
        const offers = await res.json();
        offers.forEach((o, i) => {
            const idx = i + 1;
            const idEl = document.getElementById(`offerId${idx}`);
            if (idEl) {
                idEl.value = o.id;
                if (document.getElementById(`oTitle${idx}`)) document.getElementById(`oTitle${idx}`).value = o.title;
                if (document.getElementById(`oDesc${idx}`)) document.getElementById(`oDesc${idx}`).value = o.description;
                if (document.getElementById(`oCategory${idx}`)) document.getElementById(`oCategory${idx}`).value = o.target_category || "All";
            }
        });
    } catch(err) { console.error("Error loading offers:", err); }
}



async function loadPaymentSettings() {
    try {
        const res = await fetch('/api/settings');
        const s = await res.json();
        if (s) {
            if (document.getElementById('toggleCard')) document.getElementById('toggleCard').checked = s.pay_card_active === 1;
            if (document.getElementById('toggleCash')) document.getElementById('toggleCash').checked = s.pay_cash_active === 1;
            if (document.getElementById('toggleUPI')) document.getElementById('toggleUPI').checked = s.pay_upi_active === 1;
        }
    } catch(err) { console.error("Error loading payment settings:", err); }
}

// --- PRODUCT MANAGEMENT ---
let tempVariants = [];
let currentEditVariants = [];

function renderVariantList(containerId, list, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = '<p style="font-size: 0.75rem; color: #94A3B8; font-style: italic;">No variants added yet.</p>';
        return;
    }
    container.innerHTML = list.map((v, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: white; border: 1px solid #E2E8F0; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.4rem;">
            <div style="font-size: 0.85rem;">
                <strong>${v.weight}</strong>: ₹${v.price} <span style="text-decoration: line-through; color: #94A3B8; font-size: 0.75rem;">₹${v.originalPrice}</span>
            </div>
            <button type="button" onclick="removeVariant('${type}', ${idx})" style="border: none; background: #FEE2E2; color: #EF4444; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="ph ph-trash" style="font-size: 0.9rem;"></i></button>
        </div>
    `).join('');
}

window.addVariantToTempList = function() {
    const w = document.getElementById('vWeight');
    const p = document.getElementById('vPrice');
    const op = document.getElementById('vOriginalPrice');
    if (!w.value || !p.value) return Toast.show("Weight and Price are required", "warning");
    
    tempVariants.push({
        weight: w.value,
        price: Number(p.value),
        originalPrice: Number(op.value || p.value)
    });
    w.value = ''; p.value = ''; op.value = '';
    renderVariantList('addVariantList', tempVariants, 'add');
}

window.addVariantToEditList = function() {
    const w = document.getElementById('evWeight');
    const p = document.getElementById('evPrice');
    const op = document.getElementById('evOriginalPrice');
    if (!w.value || !p.value) return Toast.show("Weight and Price are required", "warning");

    currentEditVariants.push({
        weight: w.value,
        price: Number(p.value),
        originalPrice: Number(op.value || p.value)
    });
    w.value = ''; p.value = ''; op.value = '';
    renderVariantList('editVariantList', currentEditVariants, 'edit');
}

window.removeVariant = function(type, idx) {
    if (type === 'add') {
        tempVariants.splice(idx, 1);
        renderVariantList('addVariantList', tempVariants, 'add');
    } else {
        currentEditVariants.splice(idx, 1);
        renderVariantList('editVariantList', currentEditVariants, 'edit');
    }
}

async function fetchAdminProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const searchTerm = document.getElementById('adminProductSearch')?.value || "";
    const categoryFilter = document.getElementById('adminProductCategory')?.value || "All";

    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading products...</td></tr>';

    try {
        const url = `/api/products?search=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(categoryFilter)}`;
        const res = await fetch(url);
        const products = await res.json();
        tbody.innerHTML = '';
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No products found.</td></tr>';
            return;
        }

        products.forEach(p => {
            const isLowStock = p.stock_quantity < 10;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td>
                <td><img src="${p.imgUrl}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;"></td>
                <td style="font-weight: 600;">
                    ${p.name}
                    ${p.is_trending ? '<span style="font-size:0.6rem; background:#F3E8FF; color:#9333EA; padding:1px 4px; border-radius:4px; margin-left:4px;">BEST SELLER</span>' : ''}
                </td>
                <td><span style="font-size: 0.8rem; background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px;">${p.category}</span></td>
                <td><strong>₹${p.price}</strong></td>
                <td>
                    <span style="font-weight:700; color:${isLowStock ? '#EF4444' : 'inherit'}">${p.stock_quantity || 0}</span>
                    ${isLowStock ? `<span class="low-stock-badge" style="background:#FEE2E2; color:#EF4444; font-size:0.65rem; padding:1px 4px; border-radius:4px; margin-left:4px;"><i class="ph-fill ph-warning"></i> LOW</span>` : ''}
                </td>
                <td>
                    <label class="switch-ui switch-live">
                        <input type="checkbox" ${p.is_available !== 0 ? 'checked' : ''} onchange="toggleAvailabilityBadge(${p.id}, this.checked ? 1 : 0)">
                        <span class="slider-round"></span>
                    </label>
                </td>
                <td>
                    <label class="switch-ui switch-trending">
                        <input type="checkbox" ${p.is_trending === 1 ? 'checked' : ''} onchange="toggleTrendingBadge(${p.id}, this.checked ? 1 : 0)">
                        <span class="slider-round"></span>
                    </label>
                </td>
                <td>
                    <label class="switch-ui switch-essential">
                        <input type="checkbox" ${p.is_daily_essential === 1 ? 'checked' : ''} onchange="toggleEssentialBadge(${p.id}, this.checked ? 1 : 0)">
                        <span class="slider-round"></span>
                    </label>
                </td>
                <td>
                    <button onclick="openEditModal(${p.id})" class="action-btn" style="background: var(--primary);"><i class="ph ph-pencil"></i></button>
                    <button onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="action-btn" style="background: #EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) { console.error("Failed to load products", err); }
}


async function handleAddProduct(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('pName').value,
        price: Number(document.getElementById('pPrice').value),
        category: document.getElementById('pCategory').value,
        originalPrice: Number(document.getElementById('pOriginalPrice').value),
        weight: document.getElementById('pWeight').value,
        discount: document.getElementById('pDiscount').value,
        stock_quantity: Number(document.getElementById('pStock').value),
        imgUrl: document.getElementById('pImageUrl').value || "https://via.placeholder.com/200",
        is_daily_essential: document.getElementById('pDailyEssential').checked ? 1 : 0,
        variants: tempVariants
    };

    try {
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to add product");
        }
        
        Toast.show("Product added successfully!", "success");
        e.target.reset();
        tempVariants = [];
        renderVariantList('addVariantList', [], 'add');
        fetchAdminProducts();
        populateVariantProductDropdown();
    } catch(err) { 
        console.error("Add Product Error:", err);
        if (typeof Toast !== 'undefined') Toast.show(err.message || "Connection error", "error");
    }
}

window.openEditModal = async function(id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        const p = await res.json();
        if (p) {
            document.getElementById('editPId').value = p.id;
            document.getElementById('editPName').value = p.name;
            document.getElementById('editPCategory').value = p.category;
            document.getElementById('editPPrice').value = p.price;
            document.getElementById('editPOriginalPrice').value = p.originalPrice;
            document.getElementById('editPWeight').value = p.weight;
            document.getElementById('editPDiscount').value = p.discount;
            document.getElementById('editPStock').value = p.stock_quantity || 0;
            document.getElementById('editPImageUrl').value = p.imgUrl;
            document.getElementById('editPDailyEssential').checked = p.is_daily_essential === 1;
            document.getElementById('editPTrending').checked = p.is_trending === 1;
            document.getElementById('editPAvailable').checked = p.is_available !== 0;
            
            // Load Variants
            currentEditVariants = p.variants || [];
            renderVariantList('editVariantList', currentEditVariants, 'edit');
            
            document.getElementById('editProductModal').style.display = 'flex';
        }
    } catch(err) { console.error(err); }
};

async function handleEditProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editPId').value;
    const data = {
        name: document.getElementById('editPName').value,
        category: document.getElementById('editPCategory').value,
        price: Number(document.getElementById('editPPrice').value),
        originalPrice: Number(document.getElementById('editPOriginalPrice').value),
        weight: document.getElementById('editPWeight').value,
        discount: document.getElementById('editPDiscount').value,
        stock_quantity: Number(document.getElementById('editPStock').value),
        imgUrl: document.getElementById('editPImageUrl').value,
        is_daily_essential: document.getElementById('editPDailyEssential').checked ? 1 : 0,
        is_trending: document.getElementById('editPTrending').checked ? 1 : 0,
        is_available: document.getElementById('editPAvailable').checked ? 1 : 0,
        variants: currentEditVariants
    };

    try {
        const res = await fetch(`/api/admin/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Toast.show("Product updated successfully!", "success");
            document.getElementById('editProductModal').style.display = 'none';
            fetchAdminProducts();
        }
    } catch(err) { console.error(err); }
}

window.deleteProduct = async function(id, name) {
    const confirmed = await showConfirm({
        title: "Delete Product?",
        message: `Are you sure you want to delete <strong>"${name}"</strong>?`,
        btnText: "Delete Product"
    });
    if (confirmed) {
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Toast.show("Product deleted.", "info");
                fetchAdminProducts();
                populateVariantProductDropdown();
            }
        } catch(err) { console.error(err); }
    }
};

window.toggleAvailabilityBadge = async function(id, newVal) {
    try {
        await fetch(`/api/admin/products/${id}/availability`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ is_available: newVal })
        });
        Toast.show(`Product ${newVal === 0 ? 'Disabled' : 'Live'}`, "info");
    } catch(e) {
        Toast.show("Failed to update status", "error");
    }
};

window.toggleTrendingBadge = async function(id, newVal) {
    try {
        await fetch(`/api/admin/products/${id}/trending`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ is_trending: newVal })
        });
        Toast.show(`Trending status changed`, "info");
    } catch(e) {
        Toast.show("Failed to update trending status", "error");
    }
};

window.toggleEssentialBadge = async function(id, newVal) {
    try {
        await fetch(`/api/admin/products/${id}/essential`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ is_daily_essential: newVal })
        });
        Toast.show(`Essential status changed`, "info");
    } catch(e) {
        Toast.show("Failed to update essential status", "error");
    }
};

// --- QUICK VARIANT MANAGER LOGIC ---

let quickVariantTempList = [];
let currentQuickProductId = null;

async function populateVariantProductDropdown() {
    const select = document.getElementById('quickVariantProductSelect');
    if (!select) return;
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        // Sort alphabetically by name
        products.sort((a, b) => a.name.localeCompare(b.name));
        
        select.innerHTML = '<option value="" disabled selected>-- Choose a product to add variants --</option>' + 
            products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');
    } catch(err) { console.error("Error populating variant dropdown:", err); }
}

window.loadProductForQuickVariants = async function(productId) {
    if (!productId) return;
    try {
        const res = await fetch(`/api/products/${productId}`);
        const p = await res.json();
        if (p) {
            currentQuickProductId = p.id;
            document.getElementById('quickVariantProductName').innerText = p.name;
            quickVariantTempList = p.variants || [];
            renderQuickVariantList();
            document.getElementById('quickVariantEditor').style.display = 'block';
        }
    } catch(err) { Toast.show("Error loading product", "error"); }
};

function renderQuickVariantList() {
    const container = document.getElementById('quickVariantList');
    if (!container) return;
    if (quickVariantTempList.length === 0) {
        container.innerHTML = '<p style="color: #94A3B8; font-style: italic;">No variants yet. Add some below!</p>';
        return;
    }
    container.innerHTML = quickVariantTempList.map((v, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: white; border: 1px solid #E2E8F0; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div>
                <span style="font-weight: 700; color: #1E293B;">${v.weight}</span>: 
                <span style="color: var(--primary); font-weight: 600;">₹${v.price}</span>
                <span style="text-decoration: line-through; color: #94A3B8; font-size: 0.8rem; margin-left: 0.5rem;">₹${v.originalPrice}</span>
            </div>
            <button type="button" onclick="removeQuickVariant(${idx})" style="border: none; background: #FEE2E2; color: #EF4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
}

window.addQuickVariant = function() {
    const w = document.getElementById('qvWeight');
    const p = document.getElementById('qvPrice');
    const op = document.getElementById('qvOriginalPrice');
    if (!w.value || !p.value) return Toast.show("Weight and Price required", "warning");

    quickVariantTempList.push({
        weight: w.value,
        price: Number(p.value),
        originalPrice: Number(op.value || p.value)
    });
    w.value = ''; p.value = ''; op.value = '';
    renderQuickVariantList();
};

window.removeQuickVariant = function(idx) {
    quickVariantTempList.splice(idx, 1);
    renderQuickVariantList();
};

window.saveQuickVariants = async function() {
    if (!currentQuickProductId) return;
    try {
        const res = await fetch(`/api/admin/products/${currentQuickProductId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ variants: quickVariantTempList })
        });
        if (res.ok) {
            Toast.show("Variants updated successfully!", "success");
            fetchAdminProducts(); // Refresh main table
            closeQuickVariantEditor();
        } else {
            Toast.show("Failed to update variants", "error");
        }
    } catch(err) { console.error(err); }
};

window.closeQuickVariantEditor = function() {
    document.getElementById('quickVariantEditor').style.display = 'none';
    document.getElementById('quickVariantProductSelect').value = "";
    currentQuickProductId = null;
    quickVariantTempList = [];
};

// --- ORDER MANAGEMENT ---

async function fetchOrders(dateFilter = "") {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Loading orders...</td></tr>';

    try {
        // Fetch Order Stats
        const statsRes = await fetch('/api/admin/orders/summary');
        const stats = await statsRes.json();
        if (document.getElementById('statOrdersToday')) document.getElementById('statOrdersToday').innerText = stats.ordersToday || 0;
        if (document.getElementById('statOrdersDelivered')) document.getElementById('statOrdersDelivered').innerText = stats.totalDelivered || 0;

        const url = dateFilter ? `/api/admin/orders?date=${dateFilter}` : '/api/admin/orders';
        const res = await fetch(url);
        let orders = await res.json();
        
        tbody.innerHTML = orders.map(order => {
            const statusColor = order.status === 'delivered' ? '#10B981' : (order.status === 'confirmed' ? '#3B82F6' : '#F59E0B');
            const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
            
            // Calculate Total Items
            const totalItemsCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
            
            // Format Items Line-by-Line
            const itemsHtml = items.map(i => `
                <div style="margin-bottom: 4px; border-bottom: 1px dashed #E2E8F0; padding-bottom: 2px;">
                    <strong>${i.name}</strong> 
                    ${i.weight ? `<span style="color:#64748b;">[${i.weight}]</span>` : ''} 
                    <span style="color:#4F46E5; font-weight:700;">x${i.quantity}</span>
                </div>
            `).join('');

            const customerName = order.username || 'Guest Customer';
            const customerContact = order.email ? `${order.email}<br>${order.phone || ''}` : 'Check Address';

            return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <div style="font-size:0.9rem;"><strong>${customerName}</strong></div>
                        <div style="font-size:0.75rem; color: #64748b; line-height:1.4;">${customerContact}</div>
                    </td>
                    <td><strong>₹${order.total}</strong></td>
                    <td>
                        <div style="max-height: 150px; overflow-y: auto; font-size: 0.8rem;">
                            ${itemsHtml}
                        </div>
                        <div style="margin-top: 8px; font-weight: 700; color: #1E293B;">Total Items: ${totalItemsCount}</div>
                    </td>
                    <td><small style="display:block; max-width:150px; line-height:1.4;">${order.address}</small></td>
                    <td>
                        <span class="badge" style="background:#f1f5f9; color:#475569; font-size:0.7rem;">${order.payment_method}</span>
                        <div style="font-size:0.7rem; text-transform:uppercase; font-weight:700; margin-top:4px; color:${order.payment_status === 'received' ? '#10B981' : '#F59E0B'}">${order.payment_status || 'pending'}</div>
                    </td>
                    <td>
                        <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding:6px; border:1px solid ${statusColor}; color:${statusColor}; font-weight:700; border-radius:6px; font-size:0.85rem; cursor:pointer;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </td>
                    <td><small style="color:#64748b;">${new Date(order.created_at).toLocaleDateString()}<br>${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small></td>
                    <td><button onclick="deleteOrder(${order.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button></td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="9" style="text-align:center;">No orders found.</td></tr>';
    } catch(err) { console.error(err); }
}


window.updateOrderStatus = async function(id, status) {
    try {
        const res = await fetch(`/api/admin/orders/${id}/status`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            Toast.show(`Order #${id} marked as ${status}`, "success");
            fetchOrders();
        }
    } catch(err) { console.error(err); }
};

window.deleteOrder = async function(id) {
    if (await showConfirm({ title: "Delete Order?", message: `Permanently delete Order #${id}?` })) {
        try {
            await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
            Toast.show("Order deleted", "info");
            fetchOrders();
        } catch(err) {}
    }
};

async function fetchPaymentHistory(dateFilter = "") {
    const tbody = document.getElementById('paymentTableBody');
    if (!tbody) return;
    try {
        const url = dateFilter ? `/api/admin/orders?date=${dateFilter}` : '/api/admin/orders';
        const res = await fetch(url);
        const orders = await res.json();
        tbody.innerHTML = orders.map(order => {
            const isPaid = order.payment_status === 'received';
            const payColor = isPaid ? '#10B981' : '#F59E0B';
            
            // Order status coloring
            let statusColor = '#6B7280';
            if (order.status === 'received') statusColor = '#10B981';
            else if (order.status === 'cancelled') statusColor = '#EF4444';
            else if (order.status === 'out for delivery') statusColor = '#3B82F6';

            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.username || 'Guest Customer'}</td>
                    <td><strong>₹${order.total}</strong></td>
                    <td>${order.payment_method}</td>
                    <td><span style="color:${payColor}; font-weight:700; text-transform:uppercase;">${order.payment_status || 'pending'}</span></td>
                    <td><span style="color:${statusColor}; font-weight:700; text-transform:uppercase;">${order.status || 'pending'}</span></td>
                    <td><small>${new Date(order.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <button onclick="updatePaymentStatus(${order.id}, '${isPaid?'pending':'received'}')" class="action-btn" style="background:${isPaid?'#6B7280':'#10B981'};">
                            ${isPaid ? 'Revert' : 'Mark Received'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {}
}

window.fetchPaymentHistory = fetchPaymentHistory;

async function updatePaymentStatus(id, status) {
    const isReceived = status === 'received';
    const msg = isReceived ? "Confirm you have received payment for this order?" : "Revert this payment to pending?";
    
    if (await showConfirm({ 
        title: isReceived ? "Confirm Payment" : "Revert Payment", 
        message: msg,
        btnText: isReceived ? "Yes, Received" : "Revert to Pending",
        btnColor: isReceived ? "#10B981" : "#6B7280"
    })) {
        try {
            const res = await fetch(`/api/admin/orders/${id}/payment-status`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                Toast.show("Payment status updated", "success");
                fetchPaymentHistory();
                fetchOrders();
            } else {
                const errData = await res.json();
                Toast.show(errData.error || "Update failed", "error");
            }
        } catch(e) {
            Toast.show("Network error", "error");
        }
    }
}

window.updatePaymentStatus = updatePaymentStatus;

// --- SUPPORT MANAGEMENT ---

async function fetchMessages(dateFilter = "") {
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;
    try {
        const url = dateFilter ? `/api/admin/support-messages?date=${dateFilter}` : '/api/admin/support-messages';
        const res = await fetch(url);
        const messages = await res.json();
        tbody.innerHTML = messages.map(m => `
            <tr>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td>${m.name}</td>
                <td>${m.email}</td>
                <td>${m.subject}</td>
                <td><small>${m.message.substring(0, 30)}...</small></td>
                <td><span class="badge ${m.status}">${m.status}</span></td>
                <td>
                    <button onclick="viewMessage(${m.id})" class="action-btn" style="background:var(--primary); width:auto; padding:0 8px; font-size:0.8rem; font-weight:600;"><i class="ph ph-reply"></i> Reply</button>
                    <button onclick="deleteMessage(${m.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center;">No inquiries.</td></tr>';
    } catch(e) {}
}

window.viewMessage = async function(id) {
    try {
        const res = await fetch(`/api/admin/support-messages/${id}`);
        const m = await res.json();
        if (m) {
            const container = document.getElementById('messageDetailContent');
            container.innerHTML = `
                <h3 style="margin-bottom:0.5rem;">${m.subject}</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:1rem;">From: ${m.name} (${m.email})</p>
                <div style="background:#f8fafc; padding:1rem; border-radius:8px; margin-bottom:1rem; line-height:1.6;">${m.message}</div>
                ${m.reply ? `<div style="background:#eff6ff; padding:1rem; border-radius:8px; border-left:4px solid #3b82f6;"><strong>Admin Reply:</strong><br>${m.reply}</div>` : ''}
            `;
            document.getElementById('sendReplyBtn').onclick = () => handleSendReply(id);
            const msgDelBtn = document.getElementById('msgDeleteBtn');
            if (msgDelBtn) msgDelBtn.onclick = () => deleteMessage(id);
            document.getElementById('viewMessageModal').style.display = 'flex';
            // Mark as read
            fetch(`/api/admin/support-messages/${id}/read`, { method: 'PATCH' }).then(() => fetchMessages());
        }
    } catch(err) {}
};

async function handleSendReply(id) {
    const replyText = document.getElementById('replyText').value;
    if (!replyText) return Toast.show("Please enter a reply", "error");
    try {
        const res = await fetch(`/api/admin/support-messages/${id}/reply`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ reply: replyText })
        });
        if (res.ok) {
            Toast.show("Reply sent successfully", "success");
            document.getElementById('replyText').value = '';
            document.getElementById('viewMessageModal').style.display = 'none';
            fetchMessages();
        }
    } catch(e) {}
}

window.deleteMessage = async function(id) {
    if (await showConfirm({ title: "Delete Message?", message: "Permanently delete this inquiry?" })) {
        await fetch(`/api/admin/support-messages/${id}`, { method: 'DELETE' });
        Toast.show("Message deleted", "info");
        document.getElementById('viewMessageModal').style.display = 'none';
        fetchMessages();
    }
};

// --- SETTINGS MANAGEMENT ---

async function handleSaveSettings(e) {
    e.preventDefault();
    const data = {
        shop_email: document.getElementById('sEmail').value,
        shop_phone: document.getElementById('sPhone').value,
        shop_address: document.getElementById('sAddress').value,
        shop_image: document.getElementById('sImage').value
    };
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) Toast.show("Shop Settings Updated", "success");
    } catch(e) {}
}

async function handleSaveDeliverySettings(e) {
    e.preventDefault();
    const data = {
        allowed_pincodes: document.getElementById('manageAllowedPincodes').value,
        pincode_restriction_active: document.getElementById('managePincodeActive').checked ? 1 : 0
    };
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) Toast.show("Delivery Area Updated", "success");
    } catch(e) {}
}

async function handleUpdateAdminPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newAdminPassword').value;
    if (newPassword.length < 4) return Toast.show("Password too short", "error");
    
    if (await showConfirm({ title: "Change Admin Password?", message: "Warning: This will change your master login password.", btnText: "Change Password" })) {
        try {
            const res = await fetch('/api/admin/settings/password', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ newPassword })
            });
            if (res.ok) {
                Toast.show("Password updated successfully", "success");
                e.target.reset();
            }
        } catch(e) {}
    }
}

// --- PROMO & NEWS ---

async function handleSaveBanner(e) {
    e.preventDefault();
    const id = document.getElementById('bannerId').value;
    const data = {
        badge: document.getElementById('bBadge').value,
        title: document.getElementById('bTitle').value,
        description: document.getElementById('bDesc').value,
        btnText: document.getElementById('bBtnText').value,
        imgUrl: document.getElementById('bImgUrl').value,
        target_category: document.getElementById('bCategory').value
    };
    try {
        await fetch(`/api/admin/banners/${id}`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        Toast.show("Banner updated", "success");
    } catch(e) {}
}

async function handleSaveMorningFreshBanner(e) {
    e.preventDefault();
    const data = {
        badge: document.getElementById('mfBadge').value,
        title: document.getElementById('mfTitle').value,
        description: document.getElementById('mfDesc').value,
        btnText: document.getElementById('mfBtnText').value,
        imgUrl: document.getElementById('mfImgUrl').value,
        target_category: document.getElementById('mfCategory').value
    };
    try {
        const res = await fetch('/api/admin/banners/2', {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) Toast.show("Morning Fresh Banner Updated", "success");
    } catch(e) { Toast.show("Update failed", "error"); }
}

async function handleSaveOffer(e, index) {
    e.preventDefault();
    const id = document.getElementById(`offerId${index}`).value;
    const data = {
        title: document.getElementById(`oTitle${index}`).value,
        description: document.getElementById(`oDesc${index}`).value,
        target_category: document.getElementById(`oCategory${index}`).value,
        colorClass: index === 1 ? 'bg-orange' : (index === 2 ? 'bg-purple' : 'bg-indigo')
    };
    try {
        const res = await fetch(`/api/admin/special-offers/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) Toast.show(`Offer Box ${index} Updated`, "success");
    } catch(e) {}
}

async function handleSendNotification(e) {
    e.preventDefault();
    const message = document.getElementById('nMessage').value;
    try {
        const res = await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ message })
        });
        if (res.ok) {
            Toast.show("Notification broadcasted!", "success");
            e.target.reset();
            fetchNotificationsHistory();
        }
    } catch(e) {}
}

async function loadMarquee() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        if (settings.marquee_text) {
            document.getElementById('marqueeInput').value = settings.marquee_text;
        }
    } catch(err) {}
}

async function handleMarqueeSubmit(e) {
    e.preventDefault();
    const marquee_text = document.getElementById('marqueeInput').value;
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ marquee_text })
        });
        if (res.ok) {
            Toast.show("Banner scrolling text updated!", "success");
        } else {
            Toast.show("Failed to update marquee", "error");
        }
    } catch(err) {
        Toast.show("Connection error", "error");
    }
}

async function fetchNotificationsHistory(dateFilter = "") {
    const tbody = document.getElementById('notifHistoryBody');
    if (!tbody) return;
    try {
        const url = dateFilter ? `/api/notifications/history?date=${dateFilter}` : '/api/notifications/history';
        const res = await fetch(url);
        const history = await res.json();
        tbody.innerHTML = history.map(n => `
            <tr>
                <td><small>${new Date(n.created_at).toLocaleString()}</small></td>
                <td>${n.message}</td>
                <td><button onclick="deleteNotificationIndividual(${n.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">No notification history.</td></tr>';
    } catch(e) {}
}

window.deleteNotificationIndividual = async function(id) {
    if (await showConfirm({ title: "Delete Notification?", message: "Permanently delete this alert from history?" })) {
        await fetch(`/api/admin/notifications/${id}`, { 
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'}
        });
        Toast.show("Notification deleted", "info");
        fetchNotificationsHistory();
    }
};

window.clearAllNotifications = async function() {
    if (await showConfirm({ 
        title: "Clear All History?", 
        message: "This will permanently delete ALL notification alerts from the system. This cannot be undone.",
        btnText: "Clear Everything",
        btnColor: "#EF4444" 
    })) {
        try {
            const res = await fetch('/api/admin/notifications/history', { method: 'DELETE' });
            if (res.ok) {
                Toast.show("All notifications cleared!", "success");
                fetchNotificationsHistory();
            } else {
                Toast.show("Failed to clear history", "error");
            }
        } catch(e) {
            Toast.show("Network error", "error");
        }
    }
};

// --- REVIEWS ---

async function fetchAdminReviews(dateFilter = "") {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    try {
        const url = dateFilter ? `/api/admin/reviews?date=${dateFilter}` : '/api/admin/reviews';
        const res = await fetch(url);
        const reviews = await res.json();
        tbody.innerHTML = reviews.map(r => `
            <tr>
                <td><small>${new Date(r.created_at).toLocaleDateString()}</small></td>
                <td>${r.product_name || 'Deleted Product'}</td>
                <td>${r.username}</td>
                <td><span style="color:#F59E0B;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></td>
                <td><small>${r.comment}</small></td>
                <td><button onclick="deleteReview(${r.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;">No reviews found.</td></tr>';
    } catch(e) {}
}

window.deleteReview = async function(id) {
    if (await showConfirm({ title: "Delete Review?", message: "Permanently delete this customer review?" })) {
        await fetch(`/api/admin/reviews/${id}`, { 
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'}
        });
        Toast.show("Review deleted", "info");
        fetchAdminReviews();
    }
};

// --- USER MANAGEMENT ---

async function fetchUsers(search = "", date = "") {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    try {
        const url = `/api/admin/users?search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}`;
        const res = await fetch(url);
        let users = await res.json();

        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td style="font-weight:600;">${u.username}</td>
                <td>${u.email || 'N/A'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="badge" style="background:${u.status === 'active' ? '#DCFCE7' : '#FEE2E2'}; color:${u.status === 'active' ? '#16A34A' : '#DC2626'}">
                        ${u.status}
                    </span>
                </td>
                <td style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="toggleUserStatus(${u.id}, '${u.status}')" class="action-btn" style="background:${u.status === 'active' ? '#EF4444' : '#10B981'}; width: auto; padding: 4px 10px; font-size: 0.75rem;">
                        ${u.status === 'active' ? 'Block' : 'Activate'}
                    </button>
                    <button onclick="deleteUser(${u.id})" class="action-btn" style="background:#EF4444; width: auto; padding: 4px 10px; font-size: 0.75rem;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        console.error("Error fetching users:", e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error loading users.</td></tr>';
    }
}

window.toggleUserStatus = async function(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const msg = newStatus === 'inactive' ? 'Block this user?' : 'Re-activate this user?';
    if (await showConfirm({ title: "User Access", message: msg, btnText: newStatus === 'inactive' ? 'Block' : 'Activate', btnColor: newStatus === 'inactive' ? '#EF4444' : '#10B981' })) {
        await fetch(`/api/admin/users/${id}/status`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });
        Toast.show(`User is now ${newStatus}`, "info");
        fetchUsers();
    }
};

window.deleteUser = async function(id) {
    if (await showConfirm({ title: "Delete User", message: "Permanently delete this user? This action cannot be undone.", btnText: "Delete", btnColor: "#EF4444" })) {
        try {
            await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            Toast.show("User deleted successfully", "success");
            fetchUsers();
        } catch(e) {
            Toast.show("Failed to delete user", "error");
        }
    }
};


// --- CATEGORY MANAGEMENT ---

async function fetchAdminCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('/api/categories');
        const cats = await res.json();
        tbody.innerHTML = cats.map(c => `
            <tr>
                <td>#${c.id}</td>
                <td><i class="ph ${c.iconUrl}" style="font-size:1.5rem; color:var(--primary);"></i></td>
                <td style="font-weight:600;">${c.name}</td>
                <td>
                    <button onclick="openEditCategoryModal(${c.id}, '${c.name}', '${c.iconUrl}')" class="action-btn" style="background:var(--primary);"><i class="ph ph-pencil"></i></button>
                    <button onclick="deleteCategory(${c.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">No categories.</td></tr>';
    } catch(e) {}
}

window.openAddCategoryModal = () => {
    const title = document.querySelector('#categoryModal h2');
    if (title) title.innerText = "Add Category";
    document.getElementById('catId').value = "";
    document.getElementById('catName').value = "";
    document.getElementById('catIcon').value = "";
    document.getElementById('categoryModal').style.display = 'flex';
};

window.openEditCategoryModal = (id, name, icon) => {
    const title = document.querySelector('#categoryModal h2');
    if (title) title.innerText = "Edit Category";
    document.getElementById('catId').value = id;
    document.getElementById('catName').value = name;
    document.getElementById('catIcon').value = icon;
    document.getElementById('categoryModal').style.display = 'flex';
};

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('catId').value;
    const data = {
        name: document.getElementById('catName').value,
        iconUrl: document.getElementById('catIcon').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
    
    try {
        await fetch(url, {
            method,
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        Toast.show("Category saved", "success");
        document.getElementById('categoryModal').style.display = 'none';
        fetchAdminCategories();
        fetchCategories(); // Update dropdowns everywhere
    } catch(e) {}
}

window.deleteCategory = async function(id) {
    if (await showConfirm({ title: "Delete Category?", message: "Existing products in this category will remain, but the category itself will be removed." })) {
        await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
        Toast.show("Category removed", "info");
        fetchAdminCategories();
        fetchCategories();
    }
};

// --- BRAND MANAGEMENT ---

async function fetchAdminBrands() {
    const tbody = document.getElementById('brandsTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('/api/brands');
        const brands = await res.json();
        tbody.innerHTML = brands.map(b => `
            <tr>
                <td>#${b.id}</td>
                <td style="font-weight:600;">${b.name}</td>
                <td>
                    <button onclick="deleteBrand(${b.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">No brand partners.</td></tr>';
    } catch(e) {}
}

window.openAddBrandModal = () => {
    document.getElementById('brandNameInput').value = "";
    document.getElementById('brandModal').style.display = 'flex';
};

async function handleBrandSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('brandNameInput').value;
    try {
        await fetch('/api/admin/brands', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ name })
        });
        Toast.show("Brand added", "success");
        document.getElementById('brandModal').style.display = 'none';
        fetchAdminBrands();
    } catch(e) {}
}

window.deleteBrand = async function(id) {
    if (await showConfirm({ title: "Remove Brand?", message: "Permanently delete this brand partner?" })) {
        await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
        Toast.show("Brand removed", "info");
        fetchAdminBrands();
    }
};

// --- COUPON MANAGEMENT ---

async function fetchAdminCoupons(dateFilter = "") {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    try {
        // Fetch stats first
        const statsRes = await fetch('/api/admin/coupons/stats');
        const stats = await statsRes.json();
        if (document.getElementById('statCouponUses')) document.getElementById('statCouponUses').innerText = stats.totalUses;
        if (document.getElementById('statCouponSaved')) document.getElementById('statCouponSaved').innerText = `₹${stats.totalSaved}`;
        if (document.getElementById('statTodayUses')) document.getElementById('statTodayUses').innerText = stats.todayUses;
        if (document.getElementById('statTodaySaved')) document.getElementById('statTodaySaved').innerText = `₹${stats.todaySaved}`;



        const url = dateFilter ? `/api/admin/coupons?date=${dateFilter}` : '/api/admin/coupons';
        const res = await fetch(url);
        const coupons = await res.json();
        tbody.innerHTML = coupons.map(c => `
            <tr>
                <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700;">${c.code}</code></td>
                <td><strong>${c.discount_type === 'percent' ? c.discount_value + '%' : '₹' + c.discount_value}</strong></td>
                <td>${c.discount_type}</td>
                <td>₹${c.min_amount || 0}</td>
                <td><span class="badge" style="background:#E0E7FF; color:#4338CA;">${c.useCount || 0} uses</span></td>
                <td><small>${new Date(c.expiry_date).toLocaleDateString()}</small></td>
                <td>
                    <button onclick="deleteCoupon(${c.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center;">No coupons.</td></tr>';
    } catch(e) { console.error("Error fetching coupons:", e); }
}


window.openAddCouponModal = () => {
    document.getElementById('couponForm').reset();
    document.getElementById('couponModal').style.display = 'flex';
};

async function handleCouponSubmit(e) {
    e.preventDefault();
    const data = {
        code: document.getElementById('couponCode').value.toUpperCase(),
        discount_value: Number(document.getElementById('couponValue').value),
        discount_type: document.getElementById('couponType').value,
        min_amount: Number(document.getElementById('couponMinAmt').value) || 0,
        expiry_date: document.getElementById('couponExpiry').value,
        is_one_time: document.getElementById('couponIsOneTime').checked ? 1 : 0
    };
    try {
        await fetch('/api/admin/coupons', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        Toast.show("Coupon created with usage limits", "success");
        document.getElementById('couponModal').style.display = 'none';
        fetchAdminCoupons();
        e.target.reset();
    } catch(e) {}
}

window.deleteCoupon = async function(id) {
    if (await showConfirm({ title: "Delete Coupon?", message: "This code will no longer be valid for customers." })) {
        await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
        Toast.show("Coupon deleted", "info");
        fetchAdminCoupons();
    }
};

// --- UTILS ---

async function adminLogout() {
    if (await showConfirm({ title: "Logout Admin?", message: "You will need credentials to access the panel again.", btnText: "Logout" })) {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin.html';
        } catch(e) {
            console.error("Logout failed", e);
        }
    }
}

function showConfirm({ title, message, btnText, btnColor }) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return Promise.resolve(confirm(message || "Are you sure?"));
    
    return new Promise((resolve) => {
        document.getElementById('confirmTitle').textContent = title || "Are you sure?";
        document.getElementById('confirmMessage').innerHTML = message || "This cannot be undone.";
        const proceed = document.getElementById('confirmProceedBtn');
        const cancel = document.getElementById('confirmCancelBtn');
        
        proceed.textContent = btnText || "Delete";
        proceed.style.background = btnColor || "#EF4444";
        modal.style.display = 'flex';
        
        const clean = (val) => {
            modal.style.display = 'none';
            proceed.removeEventListener('click', onP);
            cancel.removeEventListener('click', onC);
            resolve(val);
        };
        const onP = () => clean(true);
        const onC = () => clean(false);
        proceed.addEventListener('click', onP);
        cancel.addEventListener('click', onC);
    });
}

// --- AUTH HANDLERS ---

let authMode = 'setup'; // 'setup', 'login', 'recover'

async function checkInitialAuth() {
    console.log("Checking Admin Session...");
    const overlay = document.getElementById('adminLoginOverlay');
    const main = document.getElementById('adminLayoutMain');
    
    try {
        const res = await fetch('/api/admin/check-session');
        const data = await res.json();
        
        if (data.authenticated) {
            console.log("Admin session valid.");
            if (overlay) overlay.style.display = 'none';
            if (main) main.style.display = 'flex';
            // Start everything only after auth
            startDashboardLoad();
        } else {
            console.log("No valid session. Showing login.");
            if (main) main.style.display = 'none';
            if (overlay) overlay.style.display = 'flex';
            
            // Check if setup is needed
            const setupRes = await fetch('/api/admin/check-setup');
            const setupData = await setupRes.json();
            setAuthMode(setupData.setupRequired ? 'setup' : 'login');
        }
    } catch(e) {
        console.error("Auth check failed.", e);
    }
}

function startDashboardLoad() {
    fetchCategories(); 
    fetchDashboardStats();
    setupCharts();
    fetchShopSettings();
    fetchBanner();
    fetchOffers();
    loadPaymentSettings();
    loadMarquee();
    if (typeof populateVariantProductDropdown === 'function') populateVariantProductDropdown();
}

function setAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('adminAuthTitle');
    const desc = document.getElementById('adminAuthDesc');
    const nameInput = document.getElementById('adminFullName');
    const passInput = document.getElementById('adminPassword');
    const confirmWrapper = document.getElementById('adminConfirmPasswordField');
    const newPassWrapper = document.getElementById('adminNewPasswordWrapper');
    const secFields = document.getElementById('adminSecurityFields');
    const btn = document.getElementById('adminSubmitBtn');
    const forgotBtn = document.getElementById('adminForgotBtn');
    const backBtn = document.getElementById('adminBackToLoginBtn');
    
    // Reset all
    nameInput.style.display = 'none';
    passInput.parentElement.style.display = 'none';
    if (confirmWrapper) confirmWrapper.style.display = 'none';
    if (newPassWrapper) newPassWrapper.style.display = 'none';
    secFields.style.display = 'none';
    forgotBtn.style.display = 'none';
    backBtn.style.display = 'none';
    
    if (mode === 'setup') {
        title.innerHTML = '<i class="ph ph-shield-plus"></i> Admin Setup';
        desc.innerText = 'Create master credentials to secure panel.';
        nameInput.style.display = 'block';
        passInput.parentElement.style.display = 'block';
        passInput.placeholder = 'Master Password';
        if (confirmWrapper) confirmWrapper.style.display = 'block';
        secFields.style.display = 'block';
        btn.innerText = 'Save Credentials';
    } else if (mode === 'login') {
        title.innerHTML = '<i class="ph ph-shield-check"></i> Admin Login';
        desc.innerText = 'Enter master credentials to access dashboard.';
        nameInput.style.display = 'block'; // Show name for login too
        passInput.parentElement.style.display = 'block';
        passInput.placeholder = 'Password';
        btn.innerText = 'Login to Panel';
        forgotBtn.style.display = 'inline-block';
    } else if (mode === 'recover') {
        title.innerHTML = '<i class="ph ph-shield-warning"></i> Reset Master Password';
        desc.innerText = 'Answer security questions to reset credentials.';
        if (newPassWrapper) newPassWrapper.style.display = 'block';
        if (confirmWrapper) confirmWrapper.style.display = 'block';
        secFields.style.display = 'block';
        btn.innerText = 'Reset Password';
        backBtn.style.display = 'inline-block';
    }
}

document.getElementById('adminForgotBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('recover');
});

document.getElementById('adminBackToLoginBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('login');
});

document.getElementById('adminSubmitBtn')?.addEventListener('click', async () => {
    const phone = document.getElementById('adminPhone').value;
    
    if (authMode === 'setup') {
        const full_name = document.getElementById('adminFullName').value;
        const password = document.getElementById('adminPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        const security_q1 = document.getElementById('adminQ1').value;
        const security_a1 = document.getElementById('adminA1').value;
        const security_q2 = document.getElementById('adminQ2').value;
        const security_a2 = document.getElementById('adminA2').value;

        if (password !== confirmPassword) {
            return Toast.show("Passwords do not match", "warning");
        }
        
        try {
            const res = await fetch('/api/admin/setup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone, full_name, password, security_q1, security_a1, security_q2, security_a2 })
            });
            const data = await res.json();
            if (res.ok) {
                Toast.show("Admin Setup Complete!", "success");
                checkInitialAuth();
            } else Toast.show(data.error, "error");
        } catch(e) { Toast.show("Setup failed.", "error"); }
        
    } else if (authMode === 'login') {
        const full_name = document.getElementById('adminFullName').value;
        const password = document.getElementById('adminPassword').value;
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ full_name, phone, password })
            });
            const data = await res.json();
            if (res.ok) {
                Toast.show("Welcome Admin!", "success");
                checkInitialAuth();
            } else Toast.show(data.error, "error");
        } catch(e) { Toast.show("Login failed.", "error"); }
        
    } else if (authMode === 'recover') {
        const q1 = document.getElementById('adminQ1').value;
        const a1 = document.getElementById('adminA1').value;
        const q2 = document.getElementById('adminQ2').value;
        const a2 = document.getElementById('adminA2').value;
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            return Toast.show("Passwords do not match", "warning");
        }
        
        try {
            const verifyRes = await fetch('/api/admin/verify-security', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone, q1, a1, q2, a2 })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyRes.ok && verifyData.success) {
                const resetRes = await fetch('/api/admin/reset-password', {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ admin_id: verifyData.admin_id, newPassword })
                });
                const resetData = await resetRes.json();
                if (resetRes.ok) {
                    Toast.show(resetData.message, "success");
                    setAuthMode('login');
                } else Toast.show(resetData.error, "error");
            } else Toast.show(verifyData.error || "Verification failed.", "error");
        } catch(e) { Toast.show("Recovery process failed.", "error"); }
    }
});

async function savePaymentSettings() {
    const data = {
        card: document.getElementById('toggleCard').checked,
        cash: document.getElementById('toggleCash').checked,
        upi: document.getElementById('toggleUPI').checked
    };
    try {
        const res = await fetch('/api/admin/settings/payments', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) Toast.show("Payment setting updated", "info");
    } catch(err) { console.error("Failed to update payment settings", err); }
}

async function handleMarqueeSubmit(e) {
    e.preventDefault();
    const marqueeInput = document.getElementById('marqueeInput');
    const marquee_text = marqueeInput.value;
    
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ marquee_text })
        });
        if (res.ok) {
            Toast.show("BANNER UPDATED SUCCESSFULLY!", "success");
        }
    } catch(err) { console.error("Failed to update marquee", err); }
}

async function loadMarquee() {
    try {
        const res = await fetch('/api/settings');
        const s = await res.json();
        if (s && s.marquee_text) {
            const marqueeInput = document.getElementById('marqueeInput');
            if (marqueeInput) marqueeInput.value = s.marquee_text;
        }
    } catch(err) { console.error("Failed to load marquee", err); }
}


window.checkInitialAuth = checkInitialAuth;
window.handleAdminLogin = handleAdminLogin;
window.handleAdminRecovery = handleAdminRecovery;
window.adminLogout = adminLogout;
window.showConfirm = showConfirm;
window.fetchOrders = fetchOrders;
window.fetchNotificationsHistory = fetchNotificationsHistory;
window.fetchAdminReviews = fetchAdminReviews;
window.fetchAdminProducts = fetchAdminProducts;
window.fetchAdminCoupons = fetchAdminCoupons;
window.fetchAdminCategories = fetchAdminCategories;
window.fetchAdminBrands = fetchAdminBrands;
window.fetchMessages = fetchMessages;
window.openAddCategoryModal = openAddCategoryModal;
window.openAddBrandModal = openAddBrandModal;
window.openAddCouponModal = openAddCouponModal;
window.savePaymentSettings = savePaymentSettings;
window.handleMarqueeSubmit = handleMarqueeSubmit;
window.loadMarquee = loadMarquee;
window.handleSaveMorningFreshBanner = handleSaveMorningFreshBanner;

window.toggleAdminSidebar = function() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminSidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            overlay.style.display = 'block';
        }
    }
};

window.togglePasswordVisibility = function(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('ph-eye');
        icon.classList.add('ph-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('ph-eye-slash');
        icon.classList.add('ph-eye');
    }
}
