document.addEventListener("DOMContentLoaded", async () => {
    const username = getCookie('username');

    if (!username) {
        Toast.show("Please login to view your profile", "error");
        setTimeout(() => location.href = "/", 2000);
        return;
    }

    initDashboard();
});

function initDashboard() {
    setupTabs();
    fetchOverview();
    fetchOrders(); // Default tab content
    setupForms();
    setupModals();
    setupNavMenu();
}

// 1. Tab Switching Logic
function setupTabs() {
    const tabs = document.querySelectorAll('.dash-nav-item[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    // Handle URL Params for deep linking (e.g., profile.html?tab=addresses)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'orders';

    window.switchTab = (tabId) => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        const targetTab = document.querySelector(`.dash-nav-item[data-tab="${tabId}"]`);
        const targetContent = document.getElementById(tabId);

        if (targetTab && targetContent) {
            targetTab.classList.add('active');
            targetContent.classList.add('active');
            
            // Trigger specific fetch if needed
            if (tabId === 'addresses') fetchAddresses();
            if (tabId === 'wishlist') fetchWishlist();
            if (tabId === 'coupons') fetchCoupons();
            if (tabId === 'profile') fetchProfile();
            if (tabId === 'orders') fetchOrders();
            if (tabId === 'inquiries') fetchInquiries();
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            window.switchTab(tab.dataset.tab);
        });
    });

    window.switchTab(initialTab);
}

// 2. Fetch Dashboard Overview Stats
async function fetchOverview() {
    try {
        const [profile, orders, wishlist, addresses, activity] = await Promise.all([
            fetch('/api/user/profile').then(r => r.json()),
            fetch('/api/user/orders').then(r => r.json()),
            fetch('/api/user/wishlist').then(r => r.json()),
            fetch('/api/user/addresses').then(r => r.json()),
            fetch('/api/user/activity').then(r => r.json())
        ]);

        document.getElementById('welcomeName').innerText = `Welcome, ${profile.full_name || profile.username}!`;
        document.getElementById('profileAvatarInitial').innerText = (profile.full_name || profile.username).charAt(0).toUpperCase();
        
        document.getElementById('statOrdersCount').innerText = orders.length || 0;
        document.getElementById('statWishlistCount').innerText = wishlist.length || 0;
        document.getElementById('statAddressCount').innerText = addresses.length || 0;

        // Render Recent Activity
        const actList = document.getElementById('recentActivityList');
        if (actList) {
            if (!activity || activity.length === 0) {
                actList.innerHTML = '<p style="color:var(--text-soft); font-size:0.9rem;">No recent activity.</p>';
            } else {
                actList.innerHTML = activity.slice(0, 5).map(act => {
                    const isReply = act.type === 'support_reply';
                    const icon = isReply ? 'ph ph-chat-circle-dots' : 'ph ph-question';
                    const color = isReply ? 'var(--primary)' : '#6366F1';
                    const title = isReply ? `Admin Reply: ${act.title}` : `Inquiry: ${act.title}`;
                    const msg = act.message;
                    
                    return `
                        <div style="display:flex; gap:1rem; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border);">
                            <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-color); display:flex; align-items:center; justify-content:center; color:${color}; font-size:1.25rem; flex-shrink:0;">
                                <i class="${icon}"></i>
                            </div>
                            <div style="flex:1;">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <strong style="font-size:0.9rem; color:var(--text-main);">${title}</strong>
                                    <small style="font-size:0.75rem; color:var(--text-soft);">${new Date(act.date).toLocaleDateString()}</small>
                                </div>
                                <p style="font-size:0.85rem; color:var(--text-soft); margin-top:0.2rem; line-height:1.4;">${msg}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            reRenderIcons();
        }

        // Auto-fill profile form if it's open
        if (profile) fillProfileForm(profile);

    } catch (e) {
        console.error("Overview error:", e);
    }
}

// 3. Orders Tab
async function fetchOrders() {
    const listEl = document.getElementById('orderList');
    try {
        const res = await fetch('/api/user/orders');
        const orders = await res.json();
        
        if (!orders.length) {
            listEl.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="ph ph-mask-sad" style="font-size:3rem; color:var(--text-soft); margin-bottom:1rem; display:block;"></i><p>No orders placed yet.</p></div>';
            return;
        }

        listEl.innerHTML = orders.map(order => {
            let items = [];
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
            } catch (e) { console.error("Error parsing order items:", e); items = []; }
            
            const orderItems = JSON.stringify(items);
            
            // Timeline mapping
            const status = (order.status || 'pending').toLowerCase();
            const steps = [
                { id: 'pending', label: 'Pending' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'delivered', label: 'Delivered' }
            ];
            
            // Find current index
            let currentIndex = steps.findIndex(s => s.id === status);
            if (currentIndex === -1) currentIndex = 0; // fallback

            return `
                <div class="dash-card">
                    <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
                        <div>
                            <span style="font-size:0.85rem; color:var(--text-soft);">Order ID: #${order.id}</span>
                            <h4 style="margin-top:0.25rem;">${new Date(order.created_at).toLocaleDateString()}</h4>
                        </div>
                        <div style="text-align:right;">
                            <span style="display:inline-block; padding:2px 10px; background:var(--primary-light); color:var(--primary); border-radius:12px; font-size:0.75rem; font-weight:600; margin-bottom:0.5rem; text-transform:uppercase;">${status}</span>
                            <h4 style="color:var(--primary);">₹${order.total}</h4>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
                        ${items.map(i => `<div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                            <span>${i.quantity}x ${i.name}</span>
                            <span>₹${i.price * i.quantity}</span>
                        </div>`).join('')}
                    </div>

                    <!-- Visual Timeline -->
                    <div class="order-timeline">
                        ${steps.map((step, idx) => `
                            <div class="timeline-step ${idx <= currentIndex ? 'active' : ''}">
                                <div class="timeline-dot"></div>
                                <span class="timeline-label">${step.label}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Quick Re-order -->
                    <button class="reorder-btn" onclick='window.reorder(\`${orderItems.replace(/'/g, "&apos;")}\`)'>
                        <i class="ph ph-arrows-counter-clockwise"></i> Re-order This Shipment
                    </button>
                </div>
            `;
        }).join('');
        reRenderIcons();
    } catch (e) { listEl.innerHTML = '<p>Error loading orders.</p>'; }
}

// 4. Addresses Tab
async function fetchAddresses() {
    const grid = document.getElementById('addressGrid');
    try {
        const res = await fetch('/api/user/addresses');
        const addresses = await res.json();

        if (!addresses.length) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:2rem; color:var(--text-soft);">No saved addresses yet.</p>';
            return;
        }

        grid.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.is_default ? 'default' : ''}">
                ${addr.is_default ? '<span class="address-badge">DEFAULT</span>' : ''}
                <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:0.75rem;">
                    <i class="ph ph-${addr.label === 'Home' ? 'house' : (addr.label === 'Work' ? 'briefcase' : 'map-pin')}" style="color:var(--primary); font-size:1.25rem;"></i>
                    <strong style="font-size:1.1rem;">${addr.label}</strong>
                </div>
                <p style="font-size:0.95rem; color:var(--text-main); line-height:1.4; margin-bottom:0.5rem;">${addr.address_line}</p>
                <p style="font-size:0.9rem; color:var(--text-soft);">${addr.city} - ${addr.pincode}</p>
                <div style="margin-top:1.25rem; display:flex; gap:1rem;">
                    <button class="btn-text" onclick="deleteAddress(${addr.id})" style="color:#EF4444; border:none; padding:0; background:none; cursor:pointer; font-weight:600; font-size:0.85rem;"><i class="ph ph-trash"></i> DELETE</button>
                    ${!addr.is_default ? `<button onclick="setDefaultAddress(${addr.id})" class="btn-text" style="color:var(--primary); font-weight:600; font-size:0.85rem; border:none; padding:0; background:none; cursor:pointer;"><i class="ph ph-check-circle"></i> SET AS DEFAULT</button>` : ''}
                </div>
            </div>
        `).join('');
        reRenderIcons();
    } catch (e) { console.error(e); }
}

async function deleteAddress(id) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
        await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
        Toast.show("Address removed", "info");
        fetchAddresses();
        fetchOverview();
    } catch (e) { console.error(e); }
}

// 5. Wishlist Tab
async function fetchWishlist() {
    const grid = document.getElementById('wishlistGrid');
    try {
        const res = await fetch('/api/user/wishlist');
        const wishlist = await res.json();

        if (!wishlist.length) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-soft);">Your wishlist is empty.</p>';
            return;
        }

        grid.innerHTML = wishlist.map(p => {
            const imgUrl = p.imgUrl || p.imgurl || "";
            return `
            <div class="product-card" style="position: relative;">
                <i class="ph-fill ph-heart" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; color: #EF4444; z-index: 2; cursor: pointer;" onclick="removeFromWishlist('${p.id}')"></i>
                <img src="${imgUrl}" alt="${p.name}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&text=Product'">
                <div class="product-info">
                    <h4 class="product-title">${p.name}</h4>
                    <span class="product-weight">${p.weight}</span>
                    <div class="product-bottom">
                        <div class="price">
                            <span class="current-price">₹${p.price}</span>
                            ${p.originalPrice || p.originalprice ? `<span class="old-price">₹${p.originalPrice || p.originalprice}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;}).join('');
        reRenderIcons();
    } catch (e) { console.error(e); }
}

window.removeFromWishlist = async function(pid) {
    try {
        await fetch(`/api/user/wishlist/${pid}`, { method: 'DELETE' });
        Toast.show("Removed from favorites", "info");
        fetchWishlist();
        fetchOverview();
    } catch (e) { console.error(e); }
}

// 6. Coupons Tab
async function fetchCoupons() {
    const list = document.getElementById('couponList');
    if (!list) return;
    try {
        const res = await fetch('/api/user/coupons');
        if (!res.ok) throw new Error("Failed to fetch coupons");
        const coupons = await res.json();

        if (!coupons || coupons.length === 0) {
            list.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No coupons available right now.</p>';
            return;
        }

        list.innerHTML = coupons.map(c => `
            <div class="coupon-card dash-card ${c.used ? 'used' : ''}" style="border: 2px dashed ${c.used ? 'var(--border)' : 'var(--primary)'}; padding:1.25rem; position: relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-weight:700; color:${c.used ? 'var(--text-soft)' : 'var(--primary)'}; font-size:1.1rem; letter-spacing:1px;">${c.code || 'COUPON'}</span>
                    <i class="ph ph-copy" style="cursor:pointer;" onclick="!${c.used} && navigator.clipboard.writeText('${c.code}'); !${c.used} && Toast.show('Coupon Copied!', 'success');"></i>
                </div>
                <h4 style="margin-bottom:0.25rem;">${c.discount_type === 'percent' ? (c.discount_value || 0) + '% OFF' : '₹' + (c.discount_value || 0) + ' Cashback'}</h4>
                <p style="font-size:0.8rem; color:var(--text-soft);">${c.min_amount > 0 ? `Min. spend ₹${c.min_amount} | ` : ''}Valid until ${c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'Forever'}</p>
                ${c.used ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); background: rgba(0,0,0,0.6); color: white; padding: 2px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 800;">ALREADY USED</div>' : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="grid-column:1/-1; text-align:center; color: #EF4444;">Error loading coupons. Please refresh.</p>';
    }
}

// 6b. Inquiries Tab
async function fetchInquiries() {
    const list = document.getElementById('inquiryList');
    try {
        const res = await fetch('/api/user/inquiries');
        const items = await res.json();

        if (!items.length) {
            list.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="ph ph-chat-circle-dots" style="font-size:3rem; color:var(--text-soft); margin-bottom:1rem; display:block;"></i><p>No support history found.</p></div>';
            return;
        }

        list.innerHTML = items.map(item => `
            <div class="dash-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                    <strong style="color:var(--primary);">${item.subject || 'Support Request'}</strong>
                    <small style="color:var(--text-soft);">${new Date(item.created_at).toLocaleDateString()}</small>
                </div>
                <div style="font-size:0.95rem; line-height:1.5; color:var(--text-main);">
                    <p style="margin-bottom:1rem;"><strong>Your Message:</strong><br>${item.message}</p>
                    ${item.reply ? `
                        <div style="background:var(--primary-light); padding:1rem; border-radius:8px; border-left:4px solid var(--primary); margin-top:1rem;">
                            <p style="color:var(--primary); font-weight:600; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                                <i class="ph ph-shield-check"></i> Admin Reply:
                            </p>
                            <p style="color:var(--text-main);">${item.reply}</p>
                        </div>
                    ` : `
                        <p style="font-style:italic; color:var(--text-soft); font-size:0.85rem; margin-top:1rem;">
                            <i class="ph ph-hourglass-simple"></i> Awaiting response from our team...
                        </p>
                    `}
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<p>Error loading inquiries.</p>'; }
}

// 7. Profile Update
async function fetchProfile() {
    try {
        const res = await fetch('/api/user/profile');
        const user = await res.json();
        fillProfileForm(user);
    } catch (e) { console.error(e); }
}

function fillProfileForm(user) {
    const form = document.getElementById('profileForm');
    form.full_name.value = user.full_name || '';
    form.email.value = user.email || '';
    form.phone.value = user.phone || '';
    form.alternate_phone.value = user.alternate_phone || '';
    form.gender.value = user.gender || '';
    form.dob.value = user.dob || '';
    form.profile_pic.value = user.profile_pic || '';
}

function setupForms() {
    // Profile Edit Submit
    const pForm = document.getElementById('profileForm');
    pForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            full_name: pForm.full_name.value,
            email: pForm.email.value,
            phone: pForm.phone.value,
            alternate_phone: pForm.alternate_phone.value,
            gender: pForm.gender.value,
            dob: pForm.dob.value,
            profile_pic: pForm.profile_pic.value
        };

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                Toast.show("Profile updated successfully!", "success");
                // Sync updated data to cookies and localStorage for header greeting
                document.cookie = `full_name=${encodeURIComponent(data.full_name)}; path=/; max-age=31536000`;
                localStorage.setItem('user_full_name', data.full_name);
                
                if (typeof window.updateAuthUI === 'function') {
                    window.updateAuthUI(data.full_name);
                }
                fetchOverview();
            }
        } catch (e) { console.error(e); }
    });

    // Address Modal Submit
    const aForm = document.getElementById('addressForm');
    aForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            label: aForm.label.value,
            address_line: aForm.address_line.value,
            city: aForm.city.value,
            pincode: aForm.pincode.value,
            is_default: aForm.is_default.checked
        };

        try {
            const res = await fetch('/api/user/addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                Toast.show("Address added!", "success");
                toggleModal('addressModalOverlay', false);
                aForm.reset();
                fetchAddresses();
                fetchOverview();
            }
        } catch (e) { console.error(e); }
    });
}

// Sidebar logic (Partial duplicate to avoid index.html dependency)
function setupModals() {
    const overlay = document.getElementById('addressModalOverlay');
    const closeBtn = document.getElementById('closeAddressModal');
    
    closeBtn.onclick = () => toggleModal('addressModalOverlay', false);
    overlay.onclick = (e) => { if(e.target === overlay) toggleModal('addressModalOverlay', false); };
}

function openAddressModal() {
    toggleModal('addressModalOverlay', true);
}

function toggleModal(id, show) {
    const el = document.getElementById(id);
    if(show) el.classList.add('active');
    else el.classList.remove('active');
}

// Global functions
window.openAddressModal = function() {
    const el = document.getElementById('addressModalOverlay');
    if (el) el.classList.add('active');
};

window.setDefaultAddress = async (id) => {
    try {
        const res = await fetch(`/api/user/addresses/${id}/default`, { method: 'PATCH' });
        if (res.ok) {
            Toast.show("Default address updated!", "success");
            fetchAddresses();
        }
    } catch (e) { console.error(e); }
};

// Utilities
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setupNavMenu() {
    const navBtn = document.getElementById('navMenuBtn');
    const closeBtn = document.getElementById('closeNavBtn');
    const overlay = document.getElementById('navOverlay');
    const sidebar = document.getElementById('navSidebar');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarLogout = document.getElementById('sidebarLogout');

    if (!navBtn || !sidebar) return;

    const openNav = () => {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        const name = getCookie('full_name');
        const usernameCookie = getCookie('username');
        const displayName = name && name !== 'undefined' ? decodeURIComponent(name) : (usernameCookie ? decodeURIComponent(usernameCookie) : 'User');

        if (displayName) {
            if (sidebarUsername) sidebarUsername.innerText = displayName;
            if (sidebarLogout) sidebarLogout.style.display = 'flex';
        }
    };

    const closeNav = () => {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    navBtn.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (overlay) overlay.addEventListener('click', closeNav);

    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                await fetch('/api/auth/logout', { method: 'POST' });
                // Clear all auth cookies
                document.cookie = "full_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                // Clear localStorage fallbacks
                localStorage.removeItem('user_full_name');
                localStorage.removeItem('user_username');
                localStorage.removeItem('user_id');
                location.href = "/";
            }
        });
    }

    // Wiring links that change tabs directly
    const navLinks = sidebar.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        if (link.id && link.id.startsWith('nav-')) {
            link.addEventListener('click', (e) => {
                if (link.href.includes('profile.html?tab=')) {
                    e.preventDefault();
                    const tabId = link.href.split('tab=')[1];
                    if (window.switchTab) window.switchTab(tabId);
                    closeNav();
                } else if (link.id !== 'nav-tracking') {
                    closeNav();
                }
            });
        }
    });
}

function reRenderIcons() {
    // Phosphor 2.x uses CSS classes, no replacement script needed.
    // However, if using the JS library version, we check for it.
    if (window.phosphor && typeof window.phosphor.replace === 'function') {
        window.phosphor.replace();
    }
}
