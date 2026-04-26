/**
 * SURAJ Admin Panel Script
 * Consolidated & Fixed Integration
 */

let currentAdmin = null;
let revenueChart = null;
let tempVariants = [];
let currentEditVariants = [];

document.addEventListener('DOMContentLoaded', () => {
    checkInitialAuth();
    setupEventListeners();
});

// --- AUTHENTICATION ---

async function checkInitialAuth() {
    const overlay = document.getElementById('adminLoginOverlay');
    const main = document.getElementById('adminLayoutMain');

    try {
        const res = await fetch('/api/admin/check-session');
        const data = await res.json();
        
        if (data.authenticated) {
            if (overlay) overlay.style.display = 'none';
            if (main) main.style.display = 'flex';
            initDashboard();
        } else {
            if (overlay) overlay.style.display = 'flex';
            if (main) main.style.display = 'none';
            setAuthMode('login');
        }
    } catch (e) {
        // Fallback if API fails
        if (overlay) overlay.style.display = 'none';
        if (main) main.style.display = 'flex';
        initDashboard();
    }
}

function setAuthMode(mode) {
    const title = document.getElementById('adminAuthTitle');
    const desc = document.getElementById('adminAuthDesc');
    const nameField = document.getElementById('adminFullName');
    const phoneField = document.getElementById('adminPhone');
    const passField = document.getElementById('adminPassword');
    const confirmField = document.getElementById('adminConfirmPasswordField');
    const securityFields = document.getElementById('adminSecurityFields');
    const btn = document.getElementById('adminSubmitBtn');
    const forgotBtn = document.getElementById('adminForgotBtn');
    const backBtn = document.getElementById('adminBackToLoginBtn');

    // Reset visibility
    [nameField, phoneField, passField.parentElement, confirmField, securityFields, forgotBtn, backBtn].forEach(el => {
        if (el) el.style.display = 'none';
    });

    if (mode === 'setup') {
        title.innerHTML = '<i class="ph ph-shield-plus"></i> Admin Setup';
        desc.innerText = 'Create master credentials to secure panel.';
        nameField.style.display = 'block';
        phoneField.style.display = 'block';
        passField.parentElement.style.display = 'block';
        confirmField.style.display = 'block';
        securityFields.style.display = 'block';
        btn.innerText = 'Save Credentials';
    } else if (mode === 'login') {
        title.innerHTML = '<i class="ph ph-shield-check"></i> Admin Login';
        desc.innerText = 'Enter credentials to access dashboard.';
        nameField.style.display = 'block';
        phoneField.style.display = 'block';
        passField.parentElement.style.display = 'block';
        btn.innerText = 'Login to Panel';
        forgotBtn.style.display = 'inline-block';
    } else if (mode === 'recover') {
        title.innerHTML = '<i class="ph ph-shield-warning"></i> Reset Password';
        desc.innerText = 'Answer security questions to reset.';
        phoneField.style.display = 'block';
        securityFields.style.display = 'block';
        document.getElementById('adminNewPasswordWrapper').style.display = 'block';
        btn.innerText = 'Reset Password';
        backBtn.style.display = 'inline-block';
    }
    
    btn.onclick = () => handleAuthSubmit(mode);
}

async function handleAuthSubmit(mode) {
    const payload = {
        full_name: document.getElementById('adminFullName').value,
        phone: document.getElementById('adminPhone').value,
        password: document.getElementById('adminPassword').value
    };

    if (mode === 'setup') {
        payload.security_q1 = document.getElementById('adminQ1').value;
        payload.security_a1 = document.getElementById('adminA1').value;
        payload.security_q2 = document.getElementById('adminQ2').value;
        payload.security_a2 = document.getElementById('adminA2').value;
        if (payload.password !== document.getElementById('adminConfirmPassword').value) {
            return Toast.show("Passwords do not match", "error");
        }
    }

    if (mode === 'recover') {
        payload.q1 = document.getElementById('adminQ1').value;
        payload.a1 = document.getElementById('adminA1').value;
        payload.q2 = document.getElementById('adminQ2').value;
        payload.a2 = document.getElementById('adminA2').value;
        payload.newPassword = document.getElementById('adminNewPassword').value;
    }

    let url = mode === 'setup' ? '/api/admin/setup' : (mode === 'login' ? '/api/admin/login' : '/api/admin/verify-security');
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (mode === 'recover') {
                // After verification, we actually need to hit the reset-password endpoint
                const resetRes = await fetch('/api/admin/reset-password', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_id: data.admin_id, newPassword: payload.newPassword })
                });
                if (resetRes.ok) {
                    Toast.show("Password reset! Please login.", "success");
                    setAuthMode('login');
                }
            } else {
                refreshWithToast(data.message || "Login successful", "success");
            }
        } else {
            Toast.show(data.error || "Failed", "error");
        }
    } catch (err) { Toast.show("Error", "error"); }
}

async function adminLogout() {
    if (confirm("Are you sure you want to logout from the Admin Panel?")) {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            // Clear all admin state
            localStorage.removeItem('admin_last_section');
            localStorage.removeItem('admin_last_fulfillment');
            
            // Show toast and reload to trigger auth check
            refreshWithToast("Admin session ended safely", "info");
        } catch (e) {
            location.reload();
        }
    }
}

// --- NAVIGATION ---

function showSection(sectionId, forFulfillment = false) {
    if (sectionId === 'view-fulfillment') sectionId = 'view-orders';
    
    // Save state for persistence
    localStorage.setItem('admin_last_section', sectionId);
    localStorage.setItem('admin_last_fulfillment', forFulfillment ? 'true' : 'false');

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        
        // Refresh data
        if (sectionId === 'view-dashboard') { fetchDashboardStats(); setupCharts(); }
        if (sectionId === 'view-orders') {
            document.getElementById('fulfillmentHeading').style.display = forFulfillment ? 'block' : 'none';
            document.getElementById('deliveryPincodeSettings').style.display = forFulfillment ? 'block' : 'none';
            fetchOrders();
            if (forFulfillment) fetchDeliverySettings();
        }
        if (sectionId === 'view-products') { fetchAdminProducts(); fetchCategoriesForSelects(); populateVariantProductDropdown(); }
        if (sectionId === 'view-categories') fetchAdminCategories();
        if (sectionId === 'view-brands') fetchAdminBrands();
        if (sectionId === 'view-coupons') fetchAdminCoupons();
        if (sectionId === 'view-notifications') { fetchNotificationsHistory(); loadMarquee(); }
        if (sectionId === 'view-inquiries') fetchMessages();
        if (sectionId === 'view-reviews') fetchAdminReviews();
        if (sectionId === 'view-users') fetchUsers();
        if (sectionId === 'view-payment') fetchPaymentHistory();
        if (sectionId === 'view-promo') { fetchBanner(); fetchOffers(); fetchCategoriesForSelects(); }
        if (sectionId === 'view-settings') fetchShopSettings();
    }
    
    // UI updates
    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        const onclick = li.getAttribute('onclick') || '';
        if (onclick.includes(sectionId) && (onclick.includes('true') === forFulfillment)) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
}

function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('active');
    document.getElementById('adminSidebarOverlay').style.display = sidebar.classList.contains('active') ? 'block' : 'none';
}

// --- DASHBOARD ---

async function initDashboard() {
    // Check for pending toasts from previous reload
    const pendingToast = localStorage.getItem('admin_pending_toast');
    if (pendingToast) {
        const { message, type } = JSON.parse(pendingToast);
        Toast.show(message, type);
        localStorage.removeItem('admin_pending_toast');
    }

    // Restore last section
    const lastSection = localStorage.getItem('admin_last_section') || 'view-dashboard';
    const lastFulfillment = localStorage.getItem('admin_last_fulfillment') === 'true';
    showSection(lastSection, lastFulfillment);

    fetchDashboardStats();
    setupCharts();
}

function refreshWithToast(message, type = 'success') {
    localStorage.setItem('admin_pending_toast', JSON.stringify({ message, type }));
    location.reload();
}

async function fetchDashboardStats(date = "") {
    try {
        const url = date ? `/api/admin/dashboard/stats?date=${date}` : '/api/admin/dashboard/stats';
        const res = await fetch(url);
        const { stats } = await res.json();
        if (stats) {
            if (document.getElementById('statRevenue')) document.getElementById('statRevenue').innerText = `₹${Math.round(stats.totalRevenue)}`;
            if (document.getElementById('statOrdersToday')) document.getElementById('statOrdersToday').innerText = stats.ordersToday;
            if (document.getElementById('statProducts')) document.getElementById('statProducts').innerText = stats.totalProducts;
            if (document.getElementById('statMessages')) document.getElementById('statMessages').innerText = stats.unreadInquiries;
        }
    } catch (e) {}
}

async function setupCharts() {
    console.log("Setting up charts...");
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    try {
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();
        
        if (!Array.isArray(orders)) {
            console.warn("Graph data: Expected array but got", orders);
            return;
        }

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dataPoints = last7Days.map(date => {
            return orders
                .filter(o => {
                    if (!o.created_at) return false;
                    // Robust matching: compare ISO date strings
                    const oDate = new Date(o.created_at).toISOString().split('T')[0];
                    return oDate === date;
                })
                .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        });

        console.log("Graph data points:", dataPoints);

        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(ctx, {
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
                    pointBackgroundColor: '#4F46E5',
                    pointRadius: 4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Revenue: ₹${context.raw}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => '₹' + val
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Critical error setting up revenue chart:", e);
    }
}

// --- PRODUCTS ---

async function fetchAdminProducts() {
    const search = document.getElementById('adminProductSearch').value || '';
    const cat = document.getElementById('adminProductCategory').value || 'All';
    try {
        const res = await fetch(`/api/products?search=${search}&category=${cat}`);
        const products = await res.json();
        const tbody = document.getElementById('productsTableBody');
        
        tbody.innerHTML = products.map(p => {
            const stockLevel = p.stock_quantity || 0;
            const isLowStock = stockLevel < 10;
            const statusColor = isLowStock ? '#EF4444' : '#10B981';
            const statusBg = isLowStock ? '#FEF2F2' : '#F0FDF4';

            return `
                <tr style="transition: background 0.2s ease;">
                    <td style="color: #64748B; font-family: monospace; font-size: 0.85rem;">#${p.id}</td>
                    <td>
                        <div style="position: relative; width: 48px; height: 48px; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; background: #F8FAFC; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <img src="${p.imgurl || p.imgUrl || 'https://via.placeholder.com/60?text=Product'}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 onerror="this.src='https://via.placeholder.com/60?text=Error'">
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #1E293B; font-size: 0.95rem;">${p.name}</div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="font-size: 0.75rem; color: #64748B;">${p.weight || 'N/A'}</span>
                            ${p.variants && p.variants.length > 0 ? `<span title="${p.variants.length} Variants" style="padding: 1px 4px; border-radius: 4px; background: #E0E7FF; color: #4338CA; font-size: 0.65rem; font-weight: 700;">+${p.variants.length} VAR</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: #F1F5F9; color: #475569; font-size: 0.75rem; font-weight: 600;">
                            ${p.category}
                        </span>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #0F172A;">₹${p.price}</div>
                        <div style="font-size: 0.7rem; color: #94A3B8; text-decoration: line-through;">₹${p.originalprice || p.originalPrice || p.price}</div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${isLowStock ? '#FEE2E2' : '#DCFCE7'};">
                                ${stockLevel}
                            </span>
                            ${isLowStock ? '<i class="ph-fill ph-warning" style="color: #EF4444; font-size: 0.9rem;" title="Low Stock"></i>' : ''}
                        </div>
                    </td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" ${p.is_available !== 0 ? 'checked' : ''} onchange="toggleProductField(${p.id}, 'availability', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" ${p.is_trending === 1 ? 'checked' : ''} onchange="toggleProductField(${p.id}, 'trending', this.checked)">
                            <span class="slider" style="background:${p.is_trending ? '#F59E0B' : '#ccc'}"></span>
                        </label>
                    </td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" ${p.is_daily_essential === 1 ? 'checked' : ''} onchange="toggleProductField(${p.id}, 'essential', this.checked)">
                            <span class="slider" style="background:${p.is_daily_essential ? '#3B82F6' : '#ccc'}"></span>
                        </label>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end; padding-right: 1rem;">
                            <button onclick="openEditModal(${p.id})" class="action-btn" style="background: #4F46E5; width: 32px; height: 32px; border-radius: 8px;" title="Edit Product">
                                <i class="ph ph-pencil-simple" style="font-size: 1rem;"></i>
                            </button>
                            <button onclick="deleteProduct(${p.id})" class="action-btn" style="background: #EF4444; width: 32px; height: 32px; border-radius: 8px;" title="Delete Product">
                                <i class="ph ph-trash" style="font-size: 1rem;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Failed to fetch products", e);
    }
}

async function toggleProductField(id, field, val) {
    const payload = {};
    const updateKey = field === 'availability' ? 'is_available' : (field === 'trending' ? 'is_trending' : 'is_daily_essential');
    payload[updateKey] = val ? 1 : 0;
    
    try {
        const res = await fetch(`/api/admin/products/${id}/${field}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            Toast.show("Status updated", "success");
            // No need to full refresh, the switch reflects state
        } else {
            Toast.show("Failed to update status", "error");
        }
    } catch (err) {
        Toast.show("Connection error", "error");
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('pName').value,
        price: Number(document.getElementById('pPrice').value) || 0,
        originalprice: Number(document.getElementById('pOriginalPrice').value) || 0,
        category: document.getElementById('pCategory').value,
        stock_quantity: Number(document.getElementById('pStock').value) || 0,
        weight: document.getElementById('pWeight').value,
        discount: document.getElementById('pDiscount').value,
        imgurl: document.getElementById('pImageUrl').value,
        is_daily_essential: document.getElementById('pDailyEssential').checked ? 1 : 0,
        variants: tempVariants
    };

    try {
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            refreshWithToast("Product added", "success");
        } else {
            const data = await res.json();
            Toast.show(data.error || "Failed to add product", "error");
        }
    } catch (err) {
        Toast.show("Connection error", "error");
    }
}

async function openEditModal(id) {
    const res = await fetch(`/api/products/${id}`);
    const p = await res.json();
    if (p) {
        document.getElementById('editPId').value = p.id;
        document.getElementById('editPName').value = p.name;
        document.getElementById('editPCategory').value = p.category;
        document.getElementById('editPPrice').value = p.price;
        document.getElementById('editPOriginalPrice').value = p.originalprice || p.originalPrice;
        document.getElementById('editPWeight').value = p.weight;
        document.getElementById('editPDiscount').value = p.discount;
        document.getElementById('editPStock').value = p.stock_quantity;
        document.getElementById('editPImageUrl').value = p.imgurl || p.imgUrl;
        document.getElementById('editPDailyEssential').checked = p.is_daily_essential === 1;
        document.getElementById('editPTrending').checked = p.is_trending === 1;
        document.getElementById('editPAvailable').checked = p.is_available !== 0;
        
        currentEditVariants = p.variants || [];
        renderVariantList('editVariantList', currentEditVariants, 'edit');
        document.getElementById('editProductModal').style.display = 'flex';
    }
}

async function handleEditProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editPId').value;
    const payload = {
        name: document.getElementById('editPName').value,
        price: Number(document.getElementById('editPPrice').value) || 0,
        originalprice: Number(document.getElementById('editPOriginalPrice').value) || 0,
        category: document.getElementById('editPCategory').value,
        stock_quantity: Number(document.getElementById('editPStock').value) || 0,
        weight: document.getElementById('editPWeight').value,
        discount: document.getElementById('editPDiscount').value,
        imgurl: document.getElementById('editPImageUrl').value,
        is_daily_essential: document.getElementById('editPDailyEssential').checked ? 1 : 0,
        is_trending: document.getElementById('editPTrending').checked ? 1 : 0,
        is_available: document.getElementById('editPAvailable').checked ? 1 : 0,
        variants: currentEditVariants
    };
    try {
        const res = await fetch(`/api/admin/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            refreshWithToast("Product updated", "success");
        } else {
            const data = await res.json();
            Toast.show(data.error || "Failed to update product", "error");
        }
    } catch (err) {
        Toast.show("Connection error", "error");
    }
}

async function deleteProduct(id) {
    if (confirm("Delete product?")) {
        await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        refreshWithToast("Product removed", "warning");
    }
}

// --- VARIANTS ---

function renderVariantList(containerId, list, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map((v, idx) => `
        <div class="variant-item" style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:5px 10px; border:1px solid #eee; margin-bottom:5px; border-radius:4px;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
                ${v.imgurl ? `<img src="${v.imgurl}" style="width:24px; height:24px; object-fit:contain; border-radius:4px;">` : '<i class="ph ph-image" style="color:#CBD5E1;"></i>'}
                <span>${v.weight} - ₹${v.price}</span>
            </div>
            <button type="button" onclick="removeVariant('${type}', ${idx})" style="border:none; background:none; color:#EF4444;"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
}

window.addVariantToTempList = () => {
    const w = document.getElementById('vWeight')?.value.trim();
    const p = Number(document.getElementById('vPrice')?.value) || 0;
    const op = Number(document.getElementById('vOriginalPrice')?.value) || p;
    const img = document.getElementById('vImgUrl')?.value.trim() || '';
    
    if (!w) return Toast.show("Variant weight/size is required", "warning");
    if (p <= 0) return Toast.show("Variant price must be greater than 0", "warning");
    
    // Check for duplicate weight
    if (tempVariants.find(v => v.weight.toLowerCase() === w.toLowerCase())) {
        return Toast.show("This variant already exists", "warning");
    }

    tempVariants.push({ weight: w, price: p, originalprice: op, imgurl: img });
    renderVariantList('addVariantList', tempVariants, 'add');
    
    // Clear inputs
    document.getElementById('vWeight').value = ''; 
    document.getElementById('vPrice').value = ''; 
    document.getElementById('vOriginalPrice').value = '';
    if (document.getElementById('vImgUrl')) document.getElementById('vImgUrl').value = '';
};

window.addVariantToEditList = () => {
    const w = document.getElementById('evWeight')?.value.trim();
    const p = Number(document.getElementById('evPrice')?.value) || 0;
    const op = Number(document.getElementById('evOriginalPrice')?.value) || p;
    const img = document.getElementById('evImgUrl')?.value.trim() || '';
    
    if (!w) return Toast.show("Variant weight/size is required", "warning");
    if (p <= 0) return Toast.show("Variant price must be greater than 0", "warning");

    if (currentEditVariants.find(v => v.weight.toLowerCase() === w.toLowerCase())) {
        return Toast.show("This variant already exists", "warning");
    }

    currentEditVariants.push({ weight: w, price: p, originalprice: op, imgurl: img });
    renderVariantList('editVariantList', currentEditVariants, 'edit');
    
    document.getElementById('evWeight').value = ''; 
    document.getElementById('evPrice').value = ''; 
    document.getElementById('evOriginalPrice').value = '';
    if (document.getElementById('evImgUrl')) document.getElementById('evImgUrl').value = '';
};

window.removeVariant = (type, idx) => {
    if (type === 'add') {
        tempVariants.splice(idx, 1);
        renderVariantList('addVariantList', tempVariants, 'add');
    } else {
        currentEditVariants.splice(idx, 1);
        renderVariantList('editVariantList', currentEditVariants, 'edit');
    }
};

// Quick Variant Manager
async function populateVariantProductDropdown() {
    const res = await fetch('/api/products');
    const products = await res.json();
    const select = document.getElementById('quickVariantProductSelect');
    if (select) {
        select.innerHTML = '<option value="" disabled selected>-- Choose product --</option>' +
            products.sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
}

window.addVariantToNewList = () => {
    const w = document.getElementById('avWeight').value;
    const p = Number(document.getElementById('avPrice').value);
    const op = Number(document.getElementById('avOriginalPrice').value || p);
    if (!w || !p) return;
    tempVariants.push({ weight: w, price: p, originalprice: op });
    renderNewVariantList();
    document.getElementById('avWeight').value = ''; 
    document.getElementById('avPrice').value = ''; 
    document.getElementById('avOriginalPrice').value = '';
};

function renderNewVariantList() {
    const container = document.getElementById('addVariantList');
    if (!container) return;
    container.innerHTML = tempVariants.map((v, idx) => `
        <div style="background: white; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
            <span style="font-weight: 600;">${v.weight}</span>
            <span style="color: #64748B;">₹${v.price}</span>
            <button type="button" onclick="removeVariantFromNewList(${idx})" style="border: none; background: none; color: #EF4444; padding: 0; cursor: pointer; display: flex;"><i class="ph ph-x-circle"></i></button>
        </div>
    `).join('');
}

window.removeVariantFromNewList = (idx) => {
    tempVariants.splice(idx, 1);
    renderNewVariantList();
};

window.loadProductForQuickVariants = async (id) => {
    const res = await fetch(`/api/products/${id}`);
    const p = await res.json();
    if (p) {
        document.getElementById('quickVariantProductName').innerText = p.name;
        tempVariants = p.variants || [];
        renderQuickVariantList();
        document.getElementById('quickVariantEditor').style.display = 'block';
    }
};

function renderQuickVariantList() {
    const container = document.getElementById('quickVariantList');
    if (!container) return;
    container.innerHTML = tempVariants.map((v, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 12px; border:1px solid #E2E8F0; border-radius:8px; margin-bottom:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
                ${v.imgurl ? `<img src="${v.imgurl}" style="width:24px; height:24px; object-fit:contain; border-radius:4px;">` : '<i class="ph ph-image" style="color:#CBD5E1;"></i>'}
                <span>${v.weight} - ₹${v.price}</span>
            </div>
            <button type="button" onclick="removeQuickVariant(${idx})" style="border:none; background:none; color:#EF4444;"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
}

window.addQuickVariant = () => {
    const w = document.getElementById('qvWeight').value.trim();
    const p = Number(document.getElementById('qvPrice').value);
    const op = Number(document.getElementById('qvOriginalPrice').value || p);
    const img = document.getElementById('qvImgUrl')?.value.trim() || '';
    if (!w || !p) return;
    tempVariants.push({ weight: w, price: p, originalprice: op, imgurl: img });
    renderQuickVariantList();
    document.getElementById('qvWeight').value = ''; 
    document.getElementById('qvPrice').value = ''; 
    document.getElementById('qvOriginalPrice').value = '';
    if (document.getElementById('qvImgUrl')) document.getElementById('qvImgUrl').value = '';
};

window.removeQuickVariant = (idx) => {
    tempVariants.splice(idx, 1);
    renderQuickVariantList();
};

window.saveQuickVariants = async () => {
    const id = document.getElementById('quickVariantProductSelect').value;
    const btn = document.querySelector('button[onclick="saveQuickVariants()"]');
    
    if (!id) return Toast.show("Please select a product", "warning");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Saving...';
    }

    try {
        const res = await fetch(`/api/admin/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: tempVariants })
        });
        
        const data = await res.json();

        if (res.ok) {
            Toast.show("Variants saved", "success");
            closeQuickVariantEditor();
            fetchAdminProducts();
        } else {
            console.error("Save failed:", data.error);
            Toast.show(data.error || "Failed to save variants", "error");
        }
    } catch (err) {
        console.error("Network error:", err);
        Toast.show("Connection error", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Save Changes to Product';
        }
    }
};

window.closeQuickVariantEditor = () => {
    document.getElementById('quickVariantEditor').style.display = 'none';
    document.getElementById('quickVariantProductSelect').value = '';
};

// --- ORDERS ---

async function fetchOrders(date = "") {
    try {
        const res = await fetch(date ? `/api/admin/orders?date=${date}` : '/api/admin/orders');
        const orders = await res.json();
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Calculate stats
        let displayCount, deliveredCount;
        
        if (date) {
            // If a specific date is selected, show stats for that date
            displayCount = orders.length;
            deliveredCount = orders.filter(o => o.status === 'delivered').length;
            // Update labels to be specific
            document.querySelector('#statOrdersToday').parentElement.querySelector('p').innerText = "Orders on " + date;
            document.querySelector('#statOrdersDelivered').parentElement.querySelector('p').innerText = "Delivered on " + date;
        } else {
            // If no date selected, 'Total Orders Today' should only count today's orders
            displayCount = orders.filter(o => o.created_at.startsWith(todayStr)).length;
            deliveredCount = orders.filter(o => o.status === 'delivered' && o.created_at.startsWith(todayStr)).length;
            // Reset labels to default
            document.querySelector('#statOrdersToday').parentElement.querySelector('p').innerText = "Total Orders Today";
            document.querySelector('#statOrdersDelivered').parentElement.querySelector('p').innerText = "Orders Delivered Today";
        }
        
        const statToday = document.getElementById('statOrdersToday');
        const statDelivered = document.getElementById('statOrdersDelivered');
        
        if (statToday) statToday.innerText = displayCount;
        if (statDelivered) statDelivered.innerText = deliveredCount;

        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            const itemsHtml = items.map(i => `<div class="order-item-badge">${i.name} ${i.weight ? `(${i.weight})` : ''} x${i.quantity}</div>`).join('');
            return `
                <tr>
                    <td>#${o.display_id || o.id}</td>
                    <td><div style="font-weight:600;">${o.full_name || 'Customer'}</div><small style="color:#64748B;">${o.phone || ''}</small></td>
                    <td style="font-weight:700; color:#1E293B;">₹${o.total}</td>
                    <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${itemsHtml}</div></td>
                    <td><small style="color:#64748B;">${o.address || ''}</small></td>
                    <td>
                        <div style="text-transform:uppercase; font-size:0.7rem; font-weight:700; color:#475569;">${o.payment_method}</div>
                        <span class="badge ${o.payment_status === 'paid' ? 'delivered' : 'pending'}" style="font-size:0.6rem; padding:1px 6px;">${o.payment_status}</span>
                    </td>
                    <td>
                        <select onchange="updateOrderStatus(${o.id}, this.value)" class="admin-input" style="padding:4px 8px; font-size:0.85rem; border-color:#CBD5E1;">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </td>
                    <td style="white-space:nowrap; font-size:0.85rem; color:#64748B;">${new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button onclick="deleteOrder(${o.id})" class="action-btn" style="background:#EF4444;" title="Delete Order"><i class="ph ph-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {}
}

async function updateOrderStatus(id, status) {
    await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    refreshWithToast("Status updated", "success");
}

async function deleteOrder(id) {
    if (confirm("Delete order?")) {
        await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
        refreshWithToast("Order removed", "warning");
    }
}

async function fetchPaymentHistory(date = "") {
    try {
        const url = date ? `/api/admin/payments?date=${date}` : '/api/admin/payments';
        const res = await fetch(url);
        const payments = await res.json();
        const tbody = document.getElementById('paymentTableBody');
        if (!tbody) return;
        tbody.innerHTML = payments.map(p => `
            <tr>
                <td>#${p.order_id}</td>
                <td><div style="font-weight:600;">${p.full_name}</div><small>${p.phone}</small></td>
                <td style="font-weight:700;">₹${p.amount}</td>
                <td><span class="badge" style="background:#F1F5F9; color:#475569; text-transform:uppercase; font-size:0.7rem;">${p.method}</span></td>
                <td><span style="color:#10B981; font-weight:700;">RECEIVED</span></td>
                <td style="font-size:0.85rem; color:#64748B;">${new Date(p.created_at).toLocaleString()}</td>
                <td>
                    <button onclick="deleteOrder(${p.order_id})" class="action-btn" style="background:#EF4444;" title="Delete Record"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

// --- SUPPORT ---

async function fetchMessages(date = "") {
    const url = date ? `/api/admin/support-messages?date=${date}` : '/api/admin/support-messages';
    const res = await fetch(url);
    const messages = await res.json();
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = messages.map(m => `
        <tr>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
            <td>${m.name}<br><small>${m.email}</small></td>
            <td>${m.subject}</td>
            <td><span class="badge ${m.status}">${m.status}</span></td>
            <td>
                <button onclick="viewMessage(${m.id})" class="action-btn" style="background:#4F46E5; width:auto; padding:4px 12px; display:inline-flex; align-items:center; gap:5px;">
                    <i class="ph ph-reply"></i> Reply
                </button>
                <button onclick="deleteMessage(${m.id})" class="action-btn" style="background:#EF4444; margin-left:5px;"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.viewMessage = async (id) => {
    const res = await fetch(`/api/admin/support-messages/${id}`);
    const m = await res.json();
    if (m) {
        document.getElementById('messageDetailContent').innerHTML = `
            <h3>${m.subject}</h3>
            <p>From: ${m.name} (${m.email})</p>
            <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:10px 0;">${m.message}</div>
            ${m.reply ? `<div style="border-left:4px solid #4F46E5; padding-left:10px;"><strong>Admin:</strong> ${m.reply}</div>` : ''}
        `;
        document.getElementById('sendReplyBtn').onclick = () => handleSendReply(id);
        document.getElementById('viewMessageModal').style.display = 'flex';
        fetch(`/api/admin/support-messages/${id}/read`, { method: 'PATCH' });
    }
};

async function handleSendReply(id) {
    const reply = document.getElementById('replyText').value;
    if (!reply) return;
    await fetch(`/api/admin/support-messages/${id}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply })
    });
    refreshWithToast("Reply sent", "success");
}

async function deleteMessage(id) {
    if (confirm("Delete message?")) {
        await fetch(`/api/admin/support-messages/${id}`, { method: 'DELETE' });
        refreshWithToast("Message removed", "warning");
    }
}

// --- SETTINGS ---

async function fetchShopSettings() {
    const res = await fetch('/api/settings');
    const s = await res.json();
    if (s) {
        document.getElementById('sEmail').value = s.shop_email || '';
        document.getElementById('sPhone').value = s.shop_phone || '';
        document.getElementById('sAddress').value = s.shop_address || '';
        document.getElementById('sImage').value = s.shop_image || '';
        
        // App Config
        if (document.getElementById('defaultLanguage')) document.getElementById('defaultLanguage').value = s.default_language || 'en';
        if (document.getElementById('privacyPolicyText')) document.getElementById('privacyPolicyText').value = s.privacy_policy || '';

    }

    try {
        const adminRes = await fetch('/api/admin/info');
        const adminInfo = await adminRes.json();
        if (adminInfo) {
            document.getElementById('secFullName').value = adminInfo.full_name || '';
            document.getElementById('secPhone').value = adminInfo.phone || '';
        }
    } catch (e) { console.warn("Could not fetch admin info", e); }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const data = {
        shop_email: document.getElementById('sEmail').value,
        shop_phone: document.getElementById('sPhone').value,
        shop_address: document.getElementById('sAddress').value,
        shop_image: document.getElementById('sImage').value
    };
    await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Settings saved", "success");
}

async function handleSaveAppConfig(e) {
    e.preventDefault();
    const data = {
        default_language: document.getElementById('defaultLanguage').value,
        privacy_policy: document.getElementById('privacyPolicyText').value
    };
    await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("App configuration updated", "success");
}


async function fetchDeliverySettings() {
    const res = await fetch('/api/settings');
    const s = await res.json();
    document.getElementById('managePincodeActive').checked = s.pincode_restriction_active === 1;
    document.getElementById('manageAllowedPincodes').value = s.allowed_pincodes;
}

async function handleSaveDeliverySettings(e) {
    e.preventDefault();
    const data = {
        pincode_restriction_active: document.getElementById('managePincodeActive').checked ? 1 : 0,
        allowed_pincodes: document.getElementById('manageAllowedPincodes').value
    };
    await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Delivery settings updated", "success");
}

// --- NOTIFICATIONS ---

async function fetchNotificationsHistory(date = "") {
    try {
        const url = date ? `/api/notifications/history?date=${date}` : '/api/notifications/history';
        const res = await fetch(url);
        const notifications = await res.json();
        const tbody = document.getElementById('notifHistoryBody');
        if (!tbody) return;
        tbody.innerHTML = notifications.map(n => `
            <tr>
                <td>#${n.id}</td>
                <td>${n.message}</td>
                <td>${new Date(n.created_at).toLocaleString()}</td>
                <td>
                    <button onclick="deleteNotification(${n.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

async function handleSendNotification(e) {
    e.preventDefault();
    const message = document.getElementById('nMessage').value;
    await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    refreshWithToast("Broadcast sent", "success");
}

async function deleteNotification(id) {
    if (confirm("Delete this notification?")) {
        const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
        if (res.ok) {
            refreshWithToast("Notification removed", "warning");
        } else {
            Toast.show("Failed to delete notification", "error");
        }
    }
}

async function clearAllNotifications() {
    if (confirm("Clear history?")) {
        await fetch('/api/admin/notifications/history', { method: 'DELETE' });
        refreshWithToast("History cleared", "warning");
    }
}

async function loadMarquee() {
    const res = await fetch('/api/settings');
    const s = await res.json();
    document.getElementById('marqueeInput').value = s.marquee_text;
}

async function handleMarqueeSubmit(e) {
    e.preventDefault();
    const text = document.getElementById('marqueeInput').value;
    await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marquee_text: text })
    });
    refreshWithToast("Marquee updated", "success");
}

// --- PROMO ---

async function fetchBanner() {
    const res = await fetch('/api/banners');
    const banners = await res.json();
    const hero = banners.find(b => b.id === 1);
    if (hero) {
        document.getElementById('bannerId').value = hero.id;
        document.getElementById('bBadge').value = hero.badge;
        document.getElementById('bTitle').value = hero.title;
        document.getElementById('bDesc').value = hero.description;
        document.getElementById('bBtnText').value = hero.btnText;
        document.getElementById('bImgUrl').value = hero.imgUrl;
        document.getElementById('bCategory').value = hero.target_category;
    }
    const mf = banners.find(b => b.id === 2);
    if (mf) {
        document.getElementById('mfBadge').value = mf.badge;
        document.getElementById('mfTitle').value = mf.title;
        document.getElementById('mfDesc').value = mf.description;
        document.getElementById('mfBtnText').value = mf.btnText;
        document.getElementById('mfImgUrl').value = mf.imgUrl;
        document.getElementById('mfCategory').value = mf.target_category;
    }
}

async function handleSaveBanner(e) {
    e.preventDefault();
    const data = {
        badge: document.getElementById('bBadge').value,
        title: document.getElementById('bTitle').value,
        description: document.getElementById('bDesc').value,
        btnText: document.getElementById('bBtnText').value,
        imgUrl: document.getElementById('bImgUrl').value,
        target_category: document.getElementById('bCategory').value
    };
    await fetch(`/api/admin/banners/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Hero banner updated", "success");
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
    await fetch(`/api/admin/banners/2`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Banner updated", "success");
}

async function fetchOffers() {
    const res = await fetch('/api/special-offers');
    const offers = await res.json();
    offers.forEach((o, i) => {
        const id = i + 1;
        document.getElementById(`offerId${id}`).value = o.id;
        document.getElementById(`oTitle${id}`).value = o.title;
        document.getElementById(`oDesc${id}`).value = o.description;
        document.getElementById(`oCategory${id}`).value = o.target_category;
    });
}

async function handleSaveOffer(e, idx) {
    e.preventDefault();
    const id = document.getElementById(`offerId${idx}`).value;
    const data = {
        title: document.getElementById(`oTitle${idx}`).value,
        description: document.getElementById(`oDesc${idx}`).value,
        target_category: document.getElementById(`oCategory${idx}`).value
    };
    await fetch(`/api/admin/special-offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Offer updated", "success");
}

// --- MANAGEMENT ---

async function fetchAdminCategories() {
    const res = await fetch('/api/categories');
    const cats = await res.json();
    document.getElementById('categoriesTableBody').innerHTML = cats.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td><i class="ph ${c.iconUrl || c.iconurl}" style="font-size:1.2rem;"></i></td>
            <td>${c.name}</td>
            <td>
                <button onclick="openEditCategoryModal(${c.id}, '${c.name}', '${c.iconUrl || c.iconurl}')" class="action-btn" style="background:#4F46E5;"><i class="ph ph-pencil"></i></button>
                <button onclick="deleteCategory(${c.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.openAddCategoryModal = () => {
    document.getElementById('catId').value = '';
    document.getElementById('catName').value = '';
    document.getElementById('catIcon').value = '';
    document.getElementById('categoryModal').style.display = 'flex';
};

window.openEditCategoryModal = (id, name, icon) => {
    document.getElementById('catId').value = id;
    document.getElementById('catName').value = name;
    document.getElementById('catIcon').value = icon;
    document.getElementById('categoryModal').style.display = 'flex';
};

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('catId').value;
    const data = { name: document.getElementById('catName').value, iconUrl: document.getElementById('catIcon').value };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    refreshWithToast("Category saved", "success");
}

async function deleteCategory(id) {
    if (confirm("Delete category?")) {
        await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
        refreshWithToast("Category removed", "warning");
    }
}

async function fetchAdminBrands() {
    const res = await fetch('/api/brands');
    const brands = await res.json();
    document.getElementById('brandsTableBody').innerHTML = brands.map(b => `
        <tr>
            <td>#${b.id}</td>
            <td>${b.name}</td>
            <td><button onclick="deleteBrand(${b.id})" class="action-btn" style="background:#EF4444;" title="Delete Brand"><i class="ph ph-trash"></i></button></td>
        </tr>
    `).join('');
}

window.openAddBrandModal = () => {
    document.getElementById('brandNameInput').value = '';
    document.getElementById('brandModal').style.display = 'flex';
};

async function handleBrandSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('brandNameInput').value;
    await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    refreshWithToast("Brand added", "success");
}

async function deleteBrand(id) {
    if (confirm("Remove brand?")) {
        await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
        refreshWithToast("Brand removed", "warning");
    }
}

async function fetchAdminCoupons(date = "") {
    try {
        const statsRes = await fetch('/api/admin/coupons/stats');
        const stats = await statsRes.json();
        if (document.getElementById('statTotalSaved')) document.getElementById('statTotalSaved').innerText = `₹${Math.round(stats.totalSaved)}`;
        if (document.getElementById('statTotalUses')) document.getElementById('statTotalUses').innerText = stats.totalUses;

        const url = date ? `/api/admin/coupons?date=${date}` : '/api/admin/coupons';
        const res = await fetch(url);
        const coupons = await res.json();
        const tbody = document.getElementById('couponsTableBody');
        if (!tbody) return;
        tbody.innerHTML = coupons.map(c => `
            <tr>
                <td><div style="font-weight:700; color:#1E293B;">${c.code}</div></td>
                <td><span class="badge" style="background:#F1F5F9; color:#475569;">${c.discount_type === 'percent' ? c.discount_value + '%' : '₹' + c.discount_value}</span></td>
                <td>
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-main);">${c.discount_type === 'percent' ? 'Percentage' : 'Fixed Amount'}</div>
                    <div style="font-size:0.75rem; color:#64748B;">Min: ₹${c.min_amount}</div>
                </td>
                <td><span style="font-weight:600;">${c.useCount}</span></td>
                <td><span style="font-weight:700; color:#16A34A;">₹${Math.round(c.totalSaved || 0)}</span></td>
                <td style="font-size:0.85rem; color:#64748B;">${new Date(c.expiry_date).toLocaleDateString()}</td>
                <td>
                    <button onclick="deleteCoupon(${c.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}

async function handleCouponSubmit(e) {
    e.preventDefault();
    const data = {
        code: document.getElementById('couponCode').value.toUpperCase(),
        discount_value: Number(document.getElementById('couponValue').value),
        discount_type: document.getElementById('couponType').value,
        min_amount: Number(document.getElementById('couponMinAmt').value),
        expiry_date: document.getElementById('couponExpiry').value,
        is_one_time: document.getElementById('couponIsOneTime').checked ? 1 : 0
    };
    await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    refreshWithToast("Coupon created", "success");
}

async function deleteCoupon(id) {
    if (confirm("Delete coupon?")) {
        await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
        refreshWithToast("Coupon removed", "warning");
    }
}

async function fetchUsers(search = "", date = "") {
    let url = `/api/admin/users?search=${search}`;
    if (date) url += `&date=${date}`;
    const res = await fetch(url);
    const users = await res.json();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td><div style="font-weight:600;">${u.full_name || 'User'}</div><small>${u.username}</small></td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.phone || 'N/A'}</td>
            <td><span class="badge ${u.status || 'active'}">${u.status || 'active'}</span></td>
            <td><small>${new Date(u.created_at).toLocaleDateString()}</small></td>
            <td>
                <button onclick="toggleUserStatus(${u.id}, '${u.status === 'blocked' ? 'active' : 'blocked'}')" class="action-btn" style="background:${u.status === 'blocked' ? '#10B981' : '#F59E0B'};" title="${u.status === 'blocked' ? 'Unblock' : 'Block'} User"><i class="ph ph-prohibit"></i></button>
                <button onclick="deleteUser(${u.id})" class="action-btn" style="background:#EF4444; margin-left:5px;"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function toggleUserStatus(id, current) {
    const status = current === 'active' ? 'inactive' : 'active';
    await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    refreshWithToast(`User ${status === 'active' ? 'activated' : 'blocked'}`, "success");
}

async function deleteUser(id) {
    if (confirm("Delete user?")) {
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        refreshWithToast("User removed", "warning");
    }
}

async function fetchAdminReviews(date = "") {
    const url = date ? `/api/admin/reviews?date=${date}` : '/api/admin/reviews';
    const res = await fetch(url);
    const reviews = await res.json();
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    tbody.innerHTML = reviews.map(r => `
        <tr>
            <td><div style="font-weight:600;">${r.product_name}</div></td>
            <td><div style="font-weight:600;">${r.username}</div></td>
            <td><div style="color:#F59E0B;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div></td>
            <td><small>${r.comment}</small></td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td><button onclick="deleteReview(${r.id})" class="action-btn" style="background:#EF4444;"><i class="ph ph-trash"></i></button></td>
        </tr>
    `).join('');
}

async function deleteReview(id) {
    if (confirm("Delete review?")) {
        await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
        refreshWithToast("Review removed", "warning");
    }
}

// --- UTILS ---

async function fetchCategoriesForSelects() {
    const res = await fetch('/api/categories');
    const cats = await res.json();
    const options = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    const selects = ['pCategory', 'editPCategory', 'adminProductCategory', 'bCategory', 'mfCategory', 'oCategory1', 'oCategory2', 'oCategory3'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const initial = id === 'adminProductCategory' ? '<option value="All">All Categories</option>' : '';
            el.innerHTML = initial + options;
        }
    });
}

function setupEventListeners() {
    document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
    document.getElementById('editProductForm')?.addEventListener('submit', handleEditProduct);
    document.getElementById('shopSettingsForm')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('adminDeliverySettingsForm')?.addEventListener('submit', handleSaveDeliverySettings);
    document.getElementById('adminNotificationForm')?.addEventListener('submit', handleSendNotification);
    document.getElementById('adminMarqueeForm')?.addEventListener('submit', handleMarqueeSubmit);
    document.getElementById('bannerEditForm')?.addEventListener('submit', handleSaveBanner);
    document.getElementById('morningFreshBannerForm')?.addEventListener('submit', handleSaveMorningFreshBanner);
    [1,2,3].forEach(i => document.getElementById(`offerForm${i}`)?.addEventListener('submit', (e) => handleSaveOffer(e, i)));
    document.getElementById('categoryForm')?.addEventListener('submit', handleCategorySubmit);
    document.getElementById('brandForm')?.addEventListener('submit', handleBrandSubmit);
    document.getElementById('couponForm')?.addEventListener('submit', handleCouponSubmit);
    document.getElementById('adminSecurityForm')?.addEventListener('submit', handleSecurityUpdate);
    document.getElementById('appFeaturesForm')?.addEventListener('submit', handleSaveAppConfig);
}

async function handleSecurityUpdate(e) {
    e.preventDefault();
    const newPassword = document.getElementById('secNewPassword').value;
    const full_name = document.getElementById('secFullName').value;
    const phone = document.getElementById('secPhone').value;
    const security_q1 = document.getElementById('secQ1').value;
    const security_a1 = document.getElementById('secA1').value;
    const security_q2 = document.getElementById('secQ2').value;
    const security_a2 = document.getElementById('secA2').value;

    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Updating...';

    try {
        const payload = {};
        if (newPassword) payload.newPassword = newPassword;
        if (full_name) payload.full_name = full_name;
        if (phone) payload.phone = phone;
        if (security_q1) payload.security_q1 = security_q1;
        if (security_a1) payload.security_a1 = security_a1;
        if (security_q2) payload.security_q2 = security_q2;
        if (security_a2) payload.security_a2 = security_a2;

        const res = await fetch('/api/admin/security', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            Toast.show("Security credentials updated successfully", "success");
            e.target.reset();
        } else {
            Toast.show(data.error || "Update failed", "error");
        }
    } catch (err) {
        Toast.show("Connection error", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Update Security Credentials';
    }
}

window.togglePasswordVisibility = (id, el) => {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text'; el.classList.replace('ph-eye', 'ph-eye-closed');
    } else {
        input.type = 'password'; el.classList.replace('ph-eye-closed', 'ph-eye');
    }
};

// Global Exports
window.showSection = showSection;
window.toggleAdminSidebar = toggleAdminSidebar;
window.adminLogout = adminLogout;
window.fetchDashboardStats = fetchDashboardStats;
window.fetchOrders = fetchOrders; 
window.fetchAdminProducts = fetchAdminProducts;
window.viewMessage = viewMessage;
window.openEditModal = openEditModal;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.fetchMessages = fetchMessages;
window.viewMessage = viewMessage;
window.deleteMessage = deleteMessage;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.deleteReview = deleteReview;
window.deleteCategory = deleteCategory;
window.deleteBrand = deleteBrand;
window.deleteCoupon = deleteCoupon;
window.openAddCategoryModal = openAddCategoryModal;
window.openEditCategoryModal = openEditCategoryModal;
window.openAddBrandModal = openAddBrandModal;
window.openAddCouponModal = () => {
    document.getElementById('couponForm').reset();
    document.getElementById('couponModal').style.display = 'flex';
};
window.loadProductForQuickVariants = loadProductForQuickVariants;

async function checkSystemHealth() {
    try {
        const res = await fetch('/api/admin/system/health');
        const data = await res.json();
        
        const healthStatus = document.getElementById('statHealthStatus');
        const healthBox = document.getElementById('healthWarningBox');
        const healthSql = document.getElementById('healthWarningSql');
        
        if (healthStatus) {
            healthStatus.innerText = data.status === 'healthy' ? 'Healthy' : 'Sync Required';
            healthStatus.style.color = data.status === 'healthy' ? '#10B981' : '#EF4444';
        }
        
        if (data.status === 'degraded') {
            if (healthBox && healthSql) {
                healthBox.style.display = 'block';
                const totalSql = data.missing_columns.map(c => c.sql).join('\n');
                healthSql.innerText = totalSql;
            }
        } else {
            if (healthBox) healthBox.style.display = 'none';
        }
    } catch (err) {
        console.error("Health check failed", err);
    }
}

window.copyHealthSql = () => {
    const sql = document.getElementById('healthWarningSql').innerText;
    navigator.clipboard.writeText(sql).then(() => {
        Toast.show("SQL copied to clipboard", "success");
    });
};

// Update fetchDashboardStats to include health check
const originalFetchDashboardStats = window.fetchDashboardStats;
window.fetchDashboardStats = async function() {
    if (typeof originalFetchDashboardStats === 'function') await originalFetchDashboardStats();
    await checkSystemHealth();
};

// Initial health check
if (getCookie('admin_auth') === 'true') {
    checkSystemHealth();
}