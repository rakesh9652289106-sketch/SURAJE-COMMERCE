// Data structures for our grocery shop

const BANNER_URL = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200';
const DAL_URL = 'https://images.unsplash.com/photo-1589131649983-4ec35f63d309?w=300';
const APPLE_URL = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300';
const SNACKS_URL = 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300';
const DAIRY_URL = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300';
const HONEY_URL = 'https://images.unsplash.com/photo-1587049352847-4d4b1437145b?w=300';

let categories = [];
let products = [];
let brands = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let activeFilter = { type: null, value: null };

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM Content Loaded - Initializing SURAJ...");
    try {
        console.log("Fetching products...");
        const prodRes = await fetch('/api/products');
        products = await prodRes.json();
        console.log(`Loaded ${products.length} products.`);
        
        console.log("Fetching categories...");
        const catRes = await fetch('/api/categories');
        categories = await catRes.json();
        console.log(`Loaded ${categories.length} categories.`);
        
        console.log("Fetching brands...");
        const brandRes = await fetch('/api/brands');
        brands = await brandRes.json();
        console.log(`Loaded ${brands.length} brands.`);
    } catch(e) {
        console.error("CRITICAL: Failed fetching data from API", e);
    }

    console.log("Initializing UI components...");
    fetchBanners();
    fetchSpecialOffers();
    populateCategories();
    
    console.log("Populating main product grid (Daily Essentials)...");
    const dailyEssentials = products.filter(p => p.is_daily_essential !== 0);
    populateProducts("productGrid", dailyEssentials);
    

    // Populate Trending: Use is_trending flag, fallback to top 5 if none
    const trendingProducts = products.filter(p => p.is_trending === 1);
    console.log(`Populating trending list with ${trendingProducts.length} items...`);
    populateProducts("trendingList", trendingProducts.length ? trendingProducts : products.slice(0, 5));
    
    // Populate Brands using the harmonized grid format
    console.log("Populating brands grid...");
    populateBrands();

    setupCartInteractions();
    updateCartSidebar(); 
    setupThemeToggle();
    setupSearchFunctionality();
    setupAuth();
    setupNotifications();
    fetchDynamicNotification(); 
    setInterval(fetchDynamicNotification, 30000); // Poll marquee every 30 seconds
    checkOrderStatus();
    setInterval(checkOrderStatus, 60000); // Check every minute
    setupLocation();
    setupReviews();
    updateWishlistBadge();
    fetchUserWishlist(); // Sync with backend if logged in
    setupCarousels();
    setupCustomerService();
    populateTestimonials();
    setupNavMenu();
    
    // Initialize Translation
    const savedLang = localStorage.getItem('language') || 'en';
    if (window.applyTranslations) {
        window.applyTranslations(savedLang);
    }
    
    // Check for brand filter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const brandFilter = urlParams.get('brand');
    if (brandFilter) {
        console.log(`Applying URL Brand Filter: ${brandFilter}`);
        applyFilter('brand', brandFilter);
    }

    console.log("SURAJ Initialization Complete.");
});

// Sticky Header Logic
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('sticky');
    } else {
        header.classList.remove('sticky');
    }
});

// Re-order Functionality
window.reorder = async function(itemsJson) {
    try {
        const items = JSON.parse(itemsJson);
        const originalCartCount = cart.length;
        
        // Fetch current product availability
        const res = await fetch('/api/products');
        const allProducts = await res.json();
        
        let addedCount = 0;
        let skippedCount = 0;

        items.forEach(oldItem => {
            const currentItem = allProducts.find(p => p.name === oldItem.name);
            
            if (currentItem && currentItem.is_available !== 0) {
                // Check if already in cart
                const existing = cart.find(c => c.name === oldItem.name);
                if (existing) {
                    existing.quantity += oldItem.quantity;
                } else {
                    cart.push({
                        ...currentItem,
                        quantity: oldItem.quantity
                    });
                }
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        updateCartSidebar();
        
        if (skippedCount > 0) {
            Toast.show(`Added ${addedCount} items. ${skippedCount} items were unavailable.`, "warning");
        } else {
            Toast.show(`Successfully re-ordered ${addedCount} items!`, "success");
        }
        
        // Auto-open cart
        openCart();

    } catch(e) {
        console.error("Reorder failed:", e);
        Toast.show("Failed to re-order items.", "error");
    }
};

async function setupCustomerService() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        
        if (settings) {
            const csEmail = document.getElementById('csEmail');
            const csPhone = document.getElementById('csPhone');
            const csAddress = document.getElementById('csAddress');
            
            if (csEmail) csEmail.innerText = settings.shop_email || 'support@suraj.com';
            if (csPhone) csPhone.innerText = settings.shop_phone || 'Customer Care';
            if (csAddress) csAddress.innerText = settings.shop_address || 'Online Only';
        }
    } catch(err) {
        console.error("Failed to load customer service details", err);
    }
}

function setupCarousels() {
    const wrappers = document.querySelectorAll('.carousel-wrapper');
    wrappers.forEach(wrapper => {
        const content = wrapper.querySelector('.carousel-content');
        const leftArrow = wrapper.querySelector('.left-arrow');
        const rightArrow = wrapper.querySelector('.right-arrow');
        
        if (!content) return;

        const updateArrows = () => {
            const scrollLeft = Math.ceil(content.scrollLeft);
            const maxScroll = content.scrollWidth - content.clientWidth;
            
            if (leftArrow) {
                if (scrollLeft <= 5) leftArrow.classList.add('hidden');
                else leftArrow.classList.remove('hidden');
            }
            if (rightArrow) {
                if (scrollLeft >= maxScroll - 5) rightArrow.classList.add('hidden');
                else rightArrow.classList.remove('hidden');
            }
        };

        // Initial check and after content/images might have loaded
        updateArrows();
        setTimeout(updateArrows, 100);
        setTimeout(updateArrows, 500);
        setTimeout(updateArrows, 2000);

        content.addEventListener('scroll', updateArrows);
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateArrows, 150);
        });

        // Add intersection observer to retry if it starts hidden
        if (window.IntersectionObserver) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    updateArrows();
                    observer.disconnect();
                }
            });
            observer.observe(wrapper);
        }
    });
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
        // User requested removing notification numbering for wishlist
        badge.style.display = 'none'; 
    }
}

window.toggleWishlist = async function(e, productId) {
    e.stopPropagation();
    const isLogged = !!getCookie('user_id');
    const pid = Number(productId);
    
    // Normalize existing wishlist to numbers
    wishlist = wishlist.map(id => Number(id));
    const isActive = wishlist.includes(pid);

    if (isActive) {
        const index = wishlist.indexOf(pid);
        if (index > -1) wishlist.splice(index, 1);
        if (isLogged) {
            try { await fetch(`/api/user/wishlist/${pid}`, { method: 'DELETE' }); } catch(err) {}
        }
    } else {
        wishlist.push(pid);
        if (isLogged) {
            try {
                await fetch('/api/user/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: pid })
                });
            } catch(err) {}
        }
    }

    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
    refreshWishlistIcons(); // This ensures ALL hearts for this product update
    
    if (window.Toast) {
        window.Toast.show(isActive ? "Removed from wishlist" : "Added to wishlist", isActive ? "info" : "success");
    }
}

async function fetchUserWishlist() {
    if (!getCookie('user_id')) return;
    try {
        const res = await fetch('/api/user/wishlist');
        if (res.ok) {
            const data = await res.json();
            // Store as array of IDs (Numbers)
            const backendIds = data.map(item => Number(item.id || item.product_id));
            
            // Merge with local if needed, or just overwrite (overwrite is safer for sync)
            wishlist = backendIds;
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            updateWishlistBadge();
            // If we are on the homepage, we might need to refresh heart icons
            refreshWishlistIcons();
        }
    } catch(err) { console.error("Wishlist sync failed", err); }
}

function refreshWishlistIcons() {
    const hearts = document.querySelectorAll('.ph-heart');
    hearts.forEach(heart => {
        // Need to find the product ID associated with this heart
        // Usually it's in the onclick handler: toggleWishlist(event, 'ID')
        const onclickStr = heart.getAttribute('onclick');
        if (onclickStr) {
            const match = onclickStr.match(/['"](\d+)['"]/);
            if (match) {
                const pid = Number(match[1]);
                if (wishlist.includes(pid)) {
                    heart.classList.replace('ph', 'ph-fill');
                } else {
                    heart.classList.replace('ph-fill', 'ph');
                }
            }
        }
    });
}

function setupNotifications() {
    const toggle = document.getElementById('notificationsToggle');
    const dropdown = document.getElementById('notificationsDropdown');
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    const totalText = document.getElementById('notifTotalText');

    if (!toggle || !dropdown) return;

    // Request native notification permission on first interaction or meaningful moment
    if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) fetchNotifs();
    });

    document.getElementById('clearNotifsBtn')?.addEventListener('click', () => {
        const lastId = list?.dataset?.lastId;
        if (!lastId || lastId === "0") {
            Toast.show("No notifications to clear", "info");
            return;
        }

        if (!confirm("Are you sure you want to clear all your notification alerts?")) return;
        
        localStorage.setItem('lastClearedNotifId', lastId);
        fetchNotifs();
        Toast.show("Notifications cleared", "info");
    });

    document.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
    });

    dropdown.addEventListener('click', e => e.stopPropagation());

    async function fetchNotifs() {
        try {
            const res = await fetch('/api/notifications/history');
            const history = await res.json();
            
            // Fix: Store the highest ID from history before filtering
            if (list && history.length > 0) {
                const latestId = history[0].id;
                const prevLastId = list.dataset.lastId;
                list.dataset.lastId = latestId;

                // Push Notification Logic: If there is a NEW notification that we haven't seen in this session
                if (prevLastId && latestId > parseInt(prevLastId)) {
                    const newMsg = history[0].message;
                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification("SnapBasket Alert", {
                            body: newMsg,
                            icon: "/assets/logo-small.png" // Fallback if available
                        });
                    }
                    if (window.Toast) Toast.show("New Store Message Received!", "info");
                }
            }

            const lastClearedId = parseInt(localStorage.getItem('lastClearedNotifId') || '0');
            const activeNotifs = history.filter(n => n.id > lastClearedId);
            
            if (badge) {
                badge.innerText = activeNotifs.length;
                badge.style.display = activeNotifs.length > 0 ? 'flex' : 'none';
            }
            if (totalText) totalText.innerText = `Total: ${activeNotifs.length}`;
            
            if (list) {
                if (activeNotifs.length === 0) {
                    list.innerHTML = '<li style="text-align: center; padding: 1.5rem; color: var(--text-soft); font-size: 0.8rem;">No new notifications</li>';
                } else {
                    const newListHtml = activeNotifs.map(n => `
                        <li style="padding: 0.75rem; border-bottom: 1px solid var(--border); transition: background 0.2s; cursor: default;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">
                            <div style="font-weight: 500; color: var(--text-main); line-height: 1.4; display: flex; gap: 0.5rem; align-items: flex-start;">
                                <i class="ph ph-info" style="color: var(--primary); margin-top: 0.2rem;"></i>
                                ${n.message}
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-soft); margin-top: 0.3rem; margin-left: 1.5rem;">${new Date(n.created_at).toLocaleString()}</div>
                        </li>
                    `).join('');
                    
                    if (list.innerHTML !== newListHtml) {
                        list.innerHTML = newListHtml;
                    }
                }
            }
        } catch(e) { console.error("Error fetching notification history:", e); }
    }
    
    fetchNotifs(); 
    // Poll for updates every 30 seconds
    setInterval(fetchNotifs, 30000);
}

async function fetchDynamicNotification() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        const marqueeText = settings.marquee_text;
        
        const banner = document.getElementById('dynamicNotificationBanner');
        const textEl = document.getElementById('notificationText');
        
        if (marqueeText) {
            if (banner && textEl) {
                // Only update if message changed to avoid marquee restart
                const formattedMsg = "📣 " + marqueeText;
                if (textEl.innerText !== formattedMsg) {
                    textEl.innerText = formattedMsg;
                    banner.style.display = 'block';
                }
            }
        } else {
            if (banner) banner.style.display = 'none';
        }
    } catch(err) {
        console.error('Failed fetching dynamic marquee settings', err);
    }
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
        const username = getCookie('username');
        const displayName = name && name !== 'undefined' ? decodeURIComponent(name) : (username ? decodeURIComponent(username) : null);
        
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
        sidebarLogout.addEventListener('click', (e) => {
            e.preventDefault();
            fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
        });
    }

    // Feature Modal & Dashboard Wiring
    const featureLinks = {
        'nav-language': 'language',
        'nav-notifications': 'notifications',
        'nav-privacy': 'privacy',
        'nav-activity': 'activity',
        'nav-orders': 'orders',
        'nav-wishlist': 'wishlist',
        'nav-coupons': 'coupons',
        'nav-addresses': 'addresses',
        'nav-profile': 'profile'
    };

    const dashboardTabs = ['orders', 'wishlist', 'coupons', 'addresses', 'profile'];

    Object.entries(featureLinks).forEach(([id, cat]) => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                closeNav();
                
                if (dashboardTabs.includes(cat)) {
                    location.href = `profile.html?tab=${cat}`;
                } else {
                    openFeatureModal(cat);
                }
            });
        }
    });
}

function openFeatureModal(category) {
    const overlay = document.getElementById('featureModalOverlay');
    const title = document.getElementById('featureModalTitle');
    const content = document.getElementById('featureModalContent');
    const closeBtn = document.getElementById('closeFeatureModal');

    if (!overlay || !content) return;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    closeBtn.onclick = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) closeBtn.onclick();
    };

    // Helper for Settings
    const updateSetting = async (key, value) => {
        try {
            const resp = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: value ? 1 : 0 })
            });
            const data = await resp.json();
            if (data.error) Toast.show(data.error, 'error');
            else Toast.show('Settings updated!', 'success');
        } catch (e) { console.error(e); }
    };

    switch(category) {
        case 'language':
            title.innerText = "Select App Language";
            const langs = [
                { name: "English", code: "en" },
                { name: "Hindi", code: "hi" },
                { name: "Telugu", code: "te" },
                { name: "Tamil", code: "ta" },
                { name: "Kannada", code: "kn" },
                { name: "Marathi", code: "mr" },
                { name: "Gujarati", code: "gu" },
                { name: "Bengali", code: "bn" },
                { name: "Malayalam", code: "ml" }
            ];
            content.innerHTML = `<div class="language-grid">
                ${langs.map(l => `<div class="language-card ${l.code === (localStorage.getItem('language') || 'en') ? 'active' : ''}" onclick="window.changeLanguage('${l.code}', true); this.parentElement.querySelectorAll('.language-card').forEach(c => c.classList.remove('active')); this.classList.add('active');">
                    <i class="ph ph-translate" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block; color: var(--primary);"></i>
                    ${l.name}
                </div>`).join('')}
            </div>`;
            break;

        case 'notifications':
            title.innerText = "Notification Settings";
            content.innerHTML = `<div class="settings-loader" style="text-align:center; padding: 2rem;"><i class="ph ph-spinner-gap ph-spin" style="font-size: 2rem; color: var(--primary);"></i></div>`;
            
            fetch('/api/user/settings')
                .then(r => r.json())
                .then(s => {
                    content.innerHTML = `<div class="settings-list">
                        <div class="setting-item">
                            <div class="setting-info">
                                <strong>Order Reminders</strong>
                                <span>Get notified about your cart and pending orders</span>
                            </div>
                            <div class="switch ${s.order_reminders ? 'on' : ''}" onclick="this.classList.toggle('on'); window.updateUserSetting('order_reminders', this.classList.contains('on'))"><div class="toggle"></div></div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <strong>SMS Permissions</strong>
                                <span>Receive offers and alerts via SMS</span>
                            </div>
                            <div class="switch ${s.sms_permissions ? 'on' : ''}" onclick="this.classList.toggle('on'); window.updateUserSetting('sms_permissions', this.classList.contains('on'))"><div class="toggle"></div></div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <strong>Flash Sale Alerts</strong>
                                <span>Instant updates on daily deals</span>
                            </div>
                            <div class="switch ${s.flash_sale_alerts ? 'on' : ''}" onclick="this.classList.toggle('on'); window.updateUserSetting('flash_sale_alerts', this.classList.contains('on'))"><div class="toggle"></div></div>
                        </div>
                    </div>`;
                });
            break;

        case 'activity':
            title.innerText = "My Activity";
            content.innerHTML = `<div class="settings-loader" style="text-align:center; padding: 2rem;"><i class="ph ph-spinner-gap ph-spin" style="font-size: 2rem; color: var(--primary);"></i></div>`;
            
            Promise.all([
                fetch('/api/user/activity').then(r => r.json()),
                fetch('/api/user/inquiries').then(r => r.json())
            ]).then(([reviews, inquiries]) => {
                if ((!reviews || reviews.length === 0) && (!inquiries || inquiries.length === 0)) {
                    content.innerHTML = `<div class="empty-state" style="text-align:center; padding: 3rem;">
                        <i class="ph ph-clock-counter-clockwise" style="font-size: 3rem; color: var(--text-soft); margin-bottom: 1rem; display:block;"></i>
                        <p>No recent activity found.</p>
                    </div>`;
                    return;
                }

                content.innerHTML = `
                    <div class="activity-feed" style="display: flex; flex-direction: column; gap: 2rem;">
                        <!-- Review Section -->
                        ${reviews.length > 0 ? `
                        <div class="activity-section">
                            <h4 style="margin-bottom: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;"><i class="ph ph-star" style="color: #F59E0B;"></i> My Reviews (${reviews.length})</h4>
                            ${reviews.map(item => `
                                <div class="activity-item" style="background: var(--bg-color); border: 1px solid var(--border); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                                    <div class="activity-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <strong>${item.product_name || 'Product'}</strong>
                                        <span style="font-size: 0.75rem; color: var(--text-soft);">${new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p style="font-size: 0.9rem; margin-top: 0.25rem;">"${item.comment}"</p>
                                    <div style="margin-top: 0.5rem; color: #F59E0B;">
                                        ${Array(5).fill(0).map((_, i) => i < item.rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}

                        <!-- Inquiry Section -->
                        ${inquiries.length > 0 ? `
                        <div class="activity-section">
                            <h4 style="margin-bottom: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;"><i class="ph ph-chat-circle-text" style="color: var(--primary);"></i> Support Inquiries (${inquiries.length})</h4>
                            ${inquiries.map(item => `
                                <div class="activity-item" style="background: var(--bg-color); border: 1px solid var(--border); padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem;">
                                    <div class="activity-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                        <strong>Ref #${item.id}: ${item.subject}</strong>
                                        <span class="status-badge" style="font-size: 0.7rem; color: ${item.status === 'replied' ? '#10B981' : '#F59E0B'}; background: ${item.status === 'replied' ? '#D1FAE5' : '#FEF3C7'}; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${item.status}</span>
                                    </div>
                                    <p style="font-size: 0.85rem; color: var(--text-soft); line-height: 1.4;">" ${item.message} "</p>
                                    
                                    ${item.reply ? `
                                        <div class="admin-reply-box" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border);">
                                            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary); font-weight: 700; font-size: 0.8rem; margin-bottom: 0.4rem;">
                                                <i class="ph ph-arrow-u-up-left"></i> Official Support Reply
                                            </div>
                                            <p style="font-size: 0.9rem; color: var(--text-main); font-style: italic;">${item.reply}</p>
                                            <div style="font-size: 0.7rem; color: var(--text-soft); margin-top: 0.4rem;">Answered on ${new Date(item.replied_at).toLocaleDateString()}</div>
                                        </div>
                                    ` : `
                                        <div style="margin-top: 0.8rem; font-size: 0.75rem; color: var(--text-soft); font-style: italic;">Our team is reviewing your inquiry. We'll get back to you soon!</div>
                                    `}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>`;
            }).catch(e => {
                console.error(e);
                content.innerHTML = `<p style="color: red; text-align: center;">Failed to load activity.</p>`;
            });
            break;

        case 'privacy':
            title.innerText = "Privacy Center";
            content.innerHTML = `<div class="settings-list">
                <div class="setting-item">
                    <div class="setting-info">
                        <strong>Personalized Ads</strong>
                        <span>Show ads based on your interests</span>
                    </div>
                    <div class="switch on" onclick="this.classList.toggle('on')"><div class="toggle"></div></div>
                </div>
                <div class="danger-section" style="margin-top: 2rem; background: #FEF2F2; padding: 1.5rem; border-radius: 12px; border: 1px solid #FEE2E2;">
                    <h5 style="color: #EF4444; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="ph ph-warning-circle"></i> Danger Zone
                    </h5>
                    <p style="font-size: 0.85rem; color: var(--text-soft); margin-bottom: 1.25rem;">Actions taken here affect your entire account data.</p>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <button class="btn btn-outline" style="color: #6B7280; border-color: #D1D5DB; width: 100%; text-align: left; padding: 0.75rem 1rem;" 
                            onclick="if(confirm('Are you sure you want to deactivate your account? You will be logged out.')) window.deactivateAccount();">
                            <i class="ph ph-user-minus"></i> De-activate My Account
                        </button>
                        <button class="btn" style="background: #EF4444; color: white; width: 100%; text-align: left; padding: 0.75rem 1rem;" 
                            onclick="if(prompt('Type DELETE to confirm permanent account deletion') === 'DELETE') window.deleteAccount();">
                            <i class="ph ph-trash"></i> Delete My Account Permanently
                        </button>
                    </div>
                </div>
            </div>`;
            break;
    }
}

window.updateUserSetting = async (key, value) => {
    try {
        const resp = await fetch('/api/user/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: value ? 1 : 0 })
        });
        const data = await resp.json();
        if (data.error) {
            Toast.show(data.error, 'error');
            return false;
        }
        Toast.show('Settings updated!', 'success');
        return true;
    } catch (e) { 
        console.error(e); 
        return false;
    }
};

window.deactivateAccount = async () => {
    try {
        const resp = await fetch('/api/user/privacy/deactivate', { method: 'POST' });
        const data = await resp.json();
        if (data.error) Toast.show(data.error, 'error');
        else {
            Toast.show('Account deactivated. Redirecting...', 'info');
            setTimeout(() => location.reload(), 1500);
        }
    } catch (e) { console.error(e); }
};

window.deleteAccount = async () => {
    try {
        const resp = await fetch('/api/user/privacy/delete', { method: 'POST' });
        const data = await resp.json();
        if (data.error) Toast.show(data.error, 'error');
        else {
            Toast.show('Account deleted permanently.', 'error');
            setTimeout(() => location.reload(), 1500);
        }
    } catch (e) { console.error(e); }
};

// Override original changeLanguage to include server sync
const originalChangeLanguage = window.changeLanguage;
window.changeLanguage = (lang, syncToServer = false) => {
    originalChangeLanguage(lang);
    if (syncToServer) {
        fetch('/api/user/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang })
        }).then(r => r.json()).then(d => {
             Toast.show('Language preference saved!', 'success');
             setTimeout(() => location.reload(), 1000);
        });
    } else {
        location.reload();
    }
};



// Start polling for dynamic notification marquee
setInterval(fetchDynamicNotification, 30000);

function setupLocation() {
    const locSelector = document.querySelector('.location-selector');
    const locModal = document.getElementById('locationModal');
    const closeLocBtn = document.getElementById('closeLocationBtn');
    const saveLocBtn = document.getElementById('saveLocationBtn');
    const pincodeInput = document.getElementById('pincodeInput');

    // Check for saved location on load
    const savedPin = localStorage.getItem('userPincode');
    if (savedPin && locSelector) {
        const strong = locSelector.querySelector('strong');
        strong.innerHTML = `Nellore ${savedPin} <i class="ph ph-caret-down"></i>`;
    }

    if (locSelector && locModal) {
        locSelector.addEventListener('click', () => {
            locModal.classList.add('active');
        });
    }

    if (closeLocBtn) {
        closeLocBtn.addEventListener('click', () => {
            locModal.classList.remove('active');
        });
    }

    if (saveLocBtn) {
        saveLocBtn.addEventListener('click', async () => {
            const pin = pincodeInput.value.trim();
            if (pin.length === 6 && !isNaN(pin)) {
                try {
                    const saveLocBtnElem = document.getElementById('saveLocationBtn');
                    const originalText = saveLocBtnElem.innerText;
                    saveLocBtnElem.innerText = "Verifying...";
                    saveLocBtnElem.disabled = true;

                    const res = await fetch('/api/settings');
                    const settings = await res.json();
                    
                    if (settings && settings.pincode_restriction_active === 1 && settings.allowed_pincodes) {
                        const allowedArray = settings.allowed_pincodes.split(',').map(p => p.trim());
                        if (!allowedArray.includes(pin)) {
                            Toast.show(`Delivery not available in your area (Pincode: ${pin}).`, "error");
                            saveLocBtnElem.innerText = originalText;
                            saveLocBtnElem.disabled = false;
                            return;
                        }
                    }

                    localStorage.setItem('userPincode', pin);
                    if (locSelector) {
                        const strong = locSelector.querySelector('strong');
                        if (strong) strong.innerHTML = `Nellore ${pin} <i class="ph ph-caret-down"></i>`;
                    }
                    locModal.classList.remove('active');
                    Toast.show(`Location updated to ${pin}`, 'success');
                    
                    saveLocBtnElem.innerText = originalText;
                    saveLocBtnElem.disabled = false;
                } catch(e) {
                    console.error(e);
                    Toast.show("Connection error verifying location.", "error");
                    document.getElementById('saveLocationBtn').disabled = false;
                    document.getElementById('saveLocationBtn').innerText = "Set Location";
                }
            } else {
                Toast.show("Please enter a valid 6-digit pincode.", "error");
            }
        });
    }
}

function setupReviews() {
    const closeReviewsBtn = document.getElementById('closeReviewsBtn');
    const reviewsModal = document.getElementById('reviewsModal');
    if (closeReviewsBtn && reviewsModal) {
        closeReviewsBtn.addEventListener('click', () => {
            reviewsModal.classList.remove('active');
        });
    }

    const reviewForm = document.getElementById('addReviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prodId = document.getElementById('reviewProdId').value;
            const rating = document.getElementById('reviewRating').value;
            const comment = document.getElementById('reviewComment').value;
            const successMsg = document.getElementById('reviewSuccessMsg');

            if (!comment.trim()) return;

            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: prodId, rating: Number(rating), comment })
                });

                if (res.ok) {
                    successMsg.style.display = 'block';
                    document.getElementById('reviewComment').value = '';
                    Toast.show("Review posted successfully!", "success");
                    setTimeout(() => {
                        successMsg.style.display = 'none';
                        // Refresh reviews list
                        openReviews(null, null, null, prodId); 
                    }, 1500);
                } else {
                    const data = await res.json();
                    Toast.show(data.error || "Failed to post review.", "error");
                }
            } catch(err) {
                console.error("Failed to submit review", err);
            }
        });
    }
}

window.openReviews = async function(rating, revCount, prodName, prodId) {
    const reviewsModal = document.getElementById('reviewsModal');
    if (!reviewsModal) return;

    if (prodName) document.getElementById('reviewsTitle').innerText = `Reviews for ${prodName}`;
    if (rating && revCount) document.getElementById('reviewsAverage').innerText = `${rating} (${revCount} reviews)`;
    
    const reviewProdIdInput = document.getElementById('reviewProdId');
    if (prodId) reviewProdIdInput.value = prodId;

    const list = document.getElementById('reviewsList');
    const form = document.getElementById('addReviewForm');
    const authMsg = document.getElementById('reviewAuthMessage');

    // Check auth for form visibility
    const username = getCookie('username');
    if (username) {
        form.style.display = 'block';
        authMsg.style.display = 'none';
    } else {
        form.style.display = 'none';
        authMsg.style.display = 'block';
    }

    reviewsModal.classList.add('active');

    // Fetch real reviews
    try {
        const res = await fetch(`/api/products/${prodId || reviewProdIdInput.value}/reviews`);
        const reviews = await res.json();
        
        if (reviews.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-soft); padding: 1rem;">No reviews yet. Be the first to review!</p>';
        } else {
            list.innerHTML = reviews.map(r => `
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                        <strong>${r.username}</strong>
                        <span style="color: var(--secondary);"><i class="ph-fill ph-star"></i> ${r.rating}.0</span>
                    </div>
                    <p style="font-size: 0.9rem; color: var(--text-soft);">${r.comment}</p>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">${new Date(r.created_at).toLocaleDateString()}</small>
                </div>
            `).join('');
        }
    } catch(err) {
        console.error("Failed to fetch reviews", err);
        list.innerHTML = '<p style="color: red;">Failed to load reviews.</p>';
    }
}

function setupAuth() {
    // Check if user is logged in via cookies
    let username = getCookie('username');
    updateAuthUI(username);

    const authModal = document.getElementById('authModal');
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const forgotPassBtn = document.getElementById('forgotPassBtn');
    
    const authTitle = document.getElementById('authTitle');
    const authDesc = document.getElementById('authDesc');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const phoneInput = document.getElementById('phoneInput');
    const fullNameInput = document.getElementById('fullNameInput');
    const otpInput = document.getElementById('otpInput');
    const authErrorMsg = document.getElementById('authErrorMsg');

    const regSecurityFields = document.getElementById('regSecurityFields');
    const securityQ1 = document.getElementById('securityQ1');
    const securityA1 = document.getElementById('securityA1');
    const securityQ2 = document.getElementById('securityQ2');
    const securityA2 = document.getElementById('securityA2');
    const recoverySection = document.getElementById('recoverySection');
    const recoveryStepLabel = document.getElementById('recoveryStepLabel');
    const recoveryQ1Label = document.getElementById('recoveryQ1Label');
    const recoveryA1Input = document.getElementById('recoveryA1Input');
    const recoveryQ2Label = document.getElementById('recoveryQ2Label');
    const recoveryA2Input = document.getElementById('recoveryA2Input');

    let currMode = 'login'; // 'login', 'register', 'forgot'
    let recoveryQuestions = [];
    let currentRecoveryStep = 0; // 0: Initiate, 1: Q1, 2: Q2, 3: Reset
    let userRecoveryAnswers = [];

    // Prevent duplicate security question selection
    function updateSecurityOptions() {
        const q1Val = securityQ1.value;
        const q2Val = securityQ2.value;

        Array.from(securityQ1.options).forEach(opt => {
            if (opt.value && opt.value === q2Val) opt.disabled = true;
            else opt.disabled = false;
        });
        Array.from(securityQ2.options).forEach(opt => {
            if (opt.value && opt.value === q1Val) opt.disabled = true;
            else opt.disabled = false;
        });
    }

    securityQ1?.addEventListener('change', updateSecurityOptions);
    securityQ2?.addEventListener('change', updateSecurityOptions);

    // Handle Header Clicks (Event delegation)
    document.querySelector('.auth-links')?.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;

        const action = link.innerText.trim();
        if (action === 'Log Out' || link.classList.contains('logout-trigger')) {
            e.preventDefault();
            window.logoutUser();
            return;
        }
        
        if (action === 'Sign Up' || action === 'Sign In' || action === 'Log In') {
            e.preventDefault();
            currMode = (action === 'Sign Up') ? 'register' : 'login';
            updateModalState();
            authModal.classList.add('active');
        }
    });

    closeAuthBtn?.addEventListener('click', () => authModal.classList.remove('active'));

    toggleAuthMode?.addEventListener('click', (e) => {
        e.preventDefault();
        currMode = (currMode === 'register') ? 'login' : 'register';
        updateModalState();
    });

    forgotPassBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        currMode = 'forgot';
        updateModalState();
    });

    sendOtpBtn?.addEventListener('click', async () => {
        const phone = phoneInput.value;
        const name = fullNameInput.value;
        if (!isValidIndianPhone(phone)) {
            showAuthError("Please enter a valid 10-digit Indian mobile number.");
            return;
        }

        if (currMode === 'forgot') {
            if (!name) {
                showAuthError("Please enter your registered full name.");
                return;
            }
            try {
                const res = await fetch('/api/auth/recovery/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone })
                });
                const data = await res.json();
                if (res.ok) {
                    recoveryQuestions = data.questions;
                    currentRecoveryStep = 1;
                    updateModalState();
                } else {
                    showAuthError(data.error);
                }
            } catch(e) { showAuthError("Connection failed"); }
        } else {
            // For registration, we just verify the phone format locally
            Toast.show("Phone number format verified.", "success");
        }
    });

    submitAuthBtn?.addEventListener('click', async () => {
        authErrorMsg.style.display = 'none';
        
        if (currMode === 'login') {
            handleLogin();
        } else if (currMode === 'register') {
            handleRegister();
        } else {
            handleReset();
        }
    });

    async function handleLogin() {
        const name = fullNameInput.value.trim();
        const user = usernameInput.value.trim();
        const pass = passwordInput.value;
        if (!name || !user || !pass) return showAuthError("Full Name, Mobile Number and Password are required.");
        if (!isValidIndianPhone(user)) return showAuthError("Please enter a valid 10-digit mobile number.");

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: name, username: user, password: pass })
            });
            const data = await res.json();
            if (res.ok) {
                // Return data contains .token which is the user ID
                const actualId = data.user_id || data.token || data.id;
                if (actualId) localStorage.setItem('token', actualId);
                
                // Set localStorage fallback for persistence
                localStorage.setItem('user_full_name', data.full_name || name);
                localStorage.setItem('user_username', data.username || user);
                localStorage.setItem('user_id', actualId);

                Toast.show(`Welcome back, ${data.full_name || data.username}!`, "success");
                authModal.classList.remove('active');
                updateAuthUI(data.full_name || data.username);
                location.reload();
            } else {
                showAuthError(data.error);
            }
        } catch(e) { showAuthError("Login failed"); }
    }

    async function handleRegister() {
        const phone = phoneInput.value;
        const name = fullNameInput.value;
        const pass = passwordInput.value;
        const confirmPass = document.getElementById('confirmPasswordInput')?.value;
        if (pass !== confirmPass) {
            return showAuthError("Passwords do not match.");
        }
        const q1 = securityQ1.value;
        const a1 = securityA1.value;
        const q2 = securityQ2.value;
        const a2 = securityA2.value;

        if (!name || !phone || !pass || !q1 || !a1 || !q2 || !a2) {
            return showAuthError("All fields including security questions are required.");
        }

        if (q1 === q2) {
            return showAuthError("Please select two different security questions.");
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    full_name: name, phone, password: pass, 
                    security_q1: q1, security_a1: a1, 
                    security_q2: q2, security_a2: a2 
                })
            });
            const data = await res.json();
            if (res.ok) {
                const actualId = data.user_id || data.token || data.id;
                if (actualId) localStorage.setItem('token', actualId);
                
                // Set localStorage fallback for persistence
                localStorage.setItem('user_full_name', data.full_name || name);
                localStorage.setItem('user_username', data.username || phone);
                localStorage.setItem('user_id', actualId);

                Toast.show("Registration successful! Welcome to SURAJ.", "success");
                authModal.classList.remove('active');
                updateAuthUI(data.full_name || data.username);
                setTimeout(() => location.reload(), 1500);
            } else {
                showAuthError(data.error);
            }
        } catch(e) { showAuthError("Registration failed"); }
    }


    async function handleReset() {
        const phone = phoneInput.value;
        const pass = passwordInput.value;
        const confirmPass = document.getElementById('confirmPasswordInput')?.value;
        const a1 = recoveryA1Input.value.trim();
        const a2 = recoveryA2Input.value.trim();

        if (currentRecoveryStep === 1) {
            if (!a1 || !a2) return showAuthError("Please provide answers to both security questions.");
            
            try {
                const res = await fetch('/api/auth/recovery/verify-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, security_a1: a1, security_a2: a2 })
                });
                
                if (res.ok) {
                    userRecoveryAnswers = [a1, a2];
                    Toast.show("Verification successful! Set your new password now.", "success");
                    currentRecoveryStep = 2;
                    updateModalState();
                } else {
                    const data = await res.json();
                    showAuthError(data.error || "Incorrect security answers.");
                }
            } catch(e) { showAuthError("Verification failed"); }
        } else if (currentRecoveryStep === 2) {

            if (!pass) return showAuthError("New password required.");
            if (pass !== confirmPass) return showAuthError("Passwords do not match.");

            try {
                const res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        phone, password: pass, 
                        security_a1: userRecoveryAnswers[0],
                        security_a2: userRecoveryAnswers[1]
                    })
                });
                if (res.ok) {
                    Toast.show("Password updated successfully! Please log in.", "success");
                    currMode = 'login';
                    currentRecoveryStep = 0;
                    userRecoveryAnswers = [];
                    updateModalState();
                } else {
                    const data = await res.json();
                    showAuthError(data.error);
                }
            } catch(e) { showAuthError("Reset failed"); }
        }
    }

    function showAuthError(msg) {
        authErrorMsg.innerText = msg;
        authErrorMsg.style.display = 'block';
    }

    function updateModalState() {
        authErrorMsg.style.display = 'none';
        regSecurityFields.style.display = 'none';
        recoverySection.style.display = 'none';
        passwordInput.style.display = 'block';
        
        // Ensure password fields are cleared when switching modes or opening to prevent admin pre-fills
        passwordInput.value = '';
        const confirmPass = document.getElementById('confirmPasswordInput');
        if (confirmPass) confirmPass.value = '';
        
        if (currMode === 'register') {
            authTitle.innerText = "Register Account";
            authDesc.innerText = "Create your SURAJ profile";
            submitAuthBtn.innerText = "Register";
            submitAuthBtn.style.display = 'block';
            toggleAuthMode.innerText = "Back to Login";
            if (document.getElementById('nameField')) document.getElementById('nameField').style.display = 'block';
            if (document.getElementById('phoneField')) document.getElementById('phoneField').style.display = 'block';
            if (document.getElementById('loginIdentifierField')) document.getElementById('loginIdentifierField').style.display = 'none';
            if (document.getElementById('confirmPasswordInput')) document.getElementById('confirmPasswordInput').parentElement.style.display = 'block';
            sendOtpBtn.style.display = 'none';
            regSecurityFields.style.display = 'block';
            passwordInput.placeholder = "Set Password";
            updateSecurityOptions();
        } else if (currMode === 'forgot') {
            authTitle.innerText = "Reset Password";
            toggleAuthMode.innerText = "Back to Login";
            loginIdentifierField.style.display = 'none';
            regSecurityFields.style.display = 'none';

            if (currentRecoveryStep === 0) {
                authDesc.innerText = "Enter your name and mobile number to begin recovery";
                if (fullNameInput.parentElement) fullNameInput.parentElement.style.display = 'block';
                if (document.getElementById('phoneField')) document.getElementById('phoneField').style.display = 'block';
                passwordInput.style.display = 'none';
                if (document.getElementById('confirmPasswordInput')) document.getElementById('confirmPasswordInput').parentElement.style.display = 'none';
                sendOtpBtn.style.display = 'block';
                sendOtpBtn.innerText = "Fetch Security Challenge";
                submitAuthBtn.style.display = 'none';
                recoverySection.style.display = 'none';
            } else if (currentRecoveryStep === 1) {
                authDesc.innerText = "Answer your security question to verify your identity";
                if (fullNameInput.parentElement) fullNameInput.parentElement.style.display = 'none';
                if (document.getElementById('phoneField')) document.getElementById('phoneField').style.display = 'none';
                passwordInput.style.display = 'none';
                if (document.getElementById('confirmPasswordInput')) document.getElementById('confirmPasswordInput').parentElement.style.display = 'none';
                sendOtpBtn.style.display = 'none';
                submitAuthBtn.style.display = 'block';
                submitAuthBtn.innerText = "Verify Answer";
                recoverySection.style.display = 'block';
                recoveryStepLabel.innerText = `Identity Challenge`;
                recoveryQ1Label.innerText = recoveryQuestions[0] || "Security Question 1";
                recoveryQ2Label.innerText = recoveryQuestions[1] || "Security Question 2";
            } else if (currentRecoveryStep === 2) {
                authDesc.innerText = "Verification complete! Set your new account password";
                if (fullNameInput.parentElement) fullNameInput.parentElement.style.display = 'none';
                if (document.getElementById('phoneField')) document.getElementById('phoneField').style.display = 'none';
                passwordInput.style.display = 'block';
                passwordInput.placeholder = "New Password";
                if (document.getElementById('confirmPasswordInput')) document.getElementById('confirmPasswordInput').parentElement.style.display = 'block';
                sendOtpBtn.style.display = 'none';
                submitAuthBtn.style.display = 'block';
                submitAuthBtn.innerText = "Update Password";
                recoverySection.style.display = 'none';
            }
        } else {
            authTitle.innerText = "Sign In";
            authDesc.innerText = "Welcome back to SURAJ";
            submitAuthBtn.innerText = "Sign In";
            submitAuthBtn.style.display = 'block';
            toggleAuthMode.innerText = "Register Account";
            
            // For login, we now show Full Name, Mobile Number, and Password
            if (fullNameInput.parentElement) fullNameInput.parentElement.style.display = 'block';
            if (usernameInput.parentElement) usernameInput.parentElement.style.display = 'block';
            if (document.getElementById('confirmPasswordInput')) document.getElementById('confirmPasswordInput').parentElement.style.display = 'none';
            
            // Hide other fields
            if (document.getElementById('phoneField')) document.getElementById('phoneField').style.display = 'none';
            sendOtpBtn.style.display = 'none';
            passwordInput.placeholder = "Password";
            currentRecoveryStep = 0; // Reset recovery state when returning to login
            userRecoveryAnswers = [];
        }
    }
}
    
function isValidIndianPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

function setupSearchFunctionality() {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    // Create a results count element if it doesn't exist
    let resultCountEl = document.getElementById('searchResultCount');
    if (!resultCountEl) {
        resultCountEl = document.createElement('div');
        resultCountEl.id = 'searchResultCount';
        resultCountEl.style.padding = '0.5rem 0';
        resultCountEl.style.fontSize = '0.85rem';
        resultCountEl.style.color = 'var(--text-soft)';
        resultCountEl.style.display = 'none';
        const productGrid = document.getElementById("productGrid");
        productGrid.parentNode.insertBefore(resultCountEl, productGrid);
    }

    searchInput.setAttribute('autocomplete', 'off'); // Force off
    
    // Fix: In some cases browser fills the first input with login name
    // Clear it if it matches the current username upon load
    const username = getCookie('username');
    if (username && searchInput.value === username) {
        searchInput.value = '';
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const grid = document.getElementById("productGrid");
        
        if (query === "") {
            resultCountEl.style.display = 'none';
            toggleHomeSections(true); // Show everything again
            populateProducts("productGrid", products);
            return;
        }

        // Hide home sections to focus on results
        toggleHomeSections(false);

        // Filter products based on search query
        const filteredProducts = products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const discount = (product.discount || '').toLowerCase();
            const weight = (product.weight || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const brand = (product.brand_name || '').toLowerCase();

            return name.includes(query) || 
                   discount.includes(query) ||
                   weight.includes(query) ||
                   category.includes(query) ||
                   description.includes(query) ||
                   brand.includes(query);
        });

        resultCountEl.style.display = 'block';
        resultCountEl.innerText = `Showing ${filteredProducts.length} results for "${e.target.value}"`;

        if (filteredProducts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                    <i class="ph ph-magnifying-glass" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--border);"></i>
                    <h4 style="color: var(--text-main); margin-bottom: 0.5rem;">No products found</h4>
                    <p>We couldn't find anything matching "${e.target.value}"</p>
                    <button class="btn btn-outline" style="margin-top: 1.5rem;" onclick="document.querySelector('.search-bar input').value=''; document.querySelector('.search-bar input').dispatchEvent(new Event('input'));">Clear Search</button>
                </div>`;
        } else {
            populateProducts("productGrid", filteredProducts);
        }
    });
}

function setupThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    const icon = toggleBtn.querySelector('i');
    
    // Check local storage for theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        icon.classList.replace('ph-moon', 'ph-sun');
    }

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            icon.classList.replace('ph-moon', 'ph-sun');
        } else {
            localStorage.setItem('theme', 'light');
            icon.classList.replace('ph-sun', 'ph-moon');
        }
    });
}

async function setupCartInteractions() {
    const cartOverlay = document.getElementById('cartOverlay');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeBtn = document.getElementById('closeCartBtn');
    const cartBtn = document.querySelector('.cart-btn');
    const startShoppingBtn = document.getElementById('startShoppingBtn');

    // Checkout UI Refs
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    const addressNextBtn = document.getElementById('addressNextBtn');
    const paymentBackBtn = document.getElementById('paymentBackBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    const openCart = () => {
        if (cartSidebar) cartSidebar.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
        const supportSymbol = document.getElementById('supportSymbol');
        if (supportSymbol) supportSymbol.style.display = 'none';
        document.body.style.overflow = 'hidden'; 
    };

    const closeCart = () => {
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
        const supportSymbol = document.getElementById('supportSymbol');
        if (supportSymbol) supportSymbol.style.display = 'flex';
        document.body.style.overflow = '';
    };

    const backToCart = () => {
        if (checkoutModal) checkoutModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
        openCart();
        updateCartTotal(); // Ensure totals are fresh
    };

    window.backToCart = backToCart;

    if (cartBtn) cartBtn.onclick = (e) => { e.preventDefault(); openCart(); };
    if (closeBtn) closeBtn.onclick = closeCart;
    if (cartOverlay) cartOverlay.onclick = closeCart;
    if (startShoppingBtn) startShoppingBtn.onclick = closeCart;

    // Delivery Selection Functionality
    window.selectedDeliveryType = 'Home Delivery';
    window.selectDeliveryType = function(type, el) {
        window.selectedDeliveryType = type;
        document.querySelectorAll('.delivery-option-card').forEach(card => {
            card.classList.remove('active');
            card.style.border = '2px solid #E2E8F0';
            card.style.background = 'transparent';
            card.querySelector('i').style.color = '#64748B';
        });
        el.classList.add('active');
        el.style.border = '2px solid var(--primary)';
        el.style.background = '#EEF2FF';
        el.querySelector('i').style.color = 'var(--primary)';
        
        const btn = document.getElementById('deliveryNextBtn');
        if (type === 'Pickup from Shop') {
            btn.innerText = "Continue to Payment";
        } else {
            btn.innerText = "Continue to Details";
        }
    };

    window.showCheckoutStep = function(stepId) {
        const steps = ['checkoutStepDelivery', 'checkoutStepAddress', 'checkoutStepPayment', 'checkoutStepSuccess'];
        steps.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });
        
        const targetMap = {
            'delivery': 'checkoutStepDelivery',
            'address': 'checkoutStepAddress',
            'payment': 'checkoutStepPayment',
            'success': 'checkoutStepSuccess'
        };
        
        const target = targetMap[stepId];
        if (target && document.getElementById(target)) {
            document.getElementById(target).style.display = (target === 'checkoutStepSuccess' ? 'flex' : 'block');
        }
    };

    // Coupon Logic (Shared)
    async function applyCoupon(code, messageEl) {
        // Fix: Use a more robust check for user session
        const userId = getCookie('user_id');
        if (!userId || userId === 'undefined') {
            Toast.show("Please login to use coupons!", "warning");
            openAuthModal();
            return;
        }
        if (!code) return;
        const parsePrice = (p) => typeof p === 'string' ? parseFloat(p.replace(/[^0-9.]/g, '')) : Number(p);
        let subtotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code, subtotal })
            });
            const data = await res.json();
            if (res.ok) {
                window.appliedCoupon = data;
                const discountVal = data.discount_value;
                messageEl.innerText = `Success! -₹${discountVal} Applied`;
                messageEl.style.color = "#10B981";
                updateCartSidebar();
                if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
            } else {
                window.appliedCoupon = null;
                messageEl.innerText = data.error || "Invalid coupon.";
                messageEl.style.color = "#EF4444";
                updateCartSidebar();
                if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
            }
        } catch(e) {
            messageEl.innerText = "Error validating coupon.";
            messageEl.style.color = "#EF4444";
        }
    }

    const cartCouponBtn = document.getElementById('applyCouponBtn');
    if (cartCouponBtn) {
        cartCouponBtn.onclick = () => {
            const code = document.getElementById('couponCodeInput').value.trim();
            const msgEl = document.getElementById('couponMessage');
            applyCoupon(code, msgEl);
        };
    }

    window.updateCheckoutTotals = function() {
        const modalSubtotal = document.getElementById('modalSubtotal');
        const modalDiscountRow = document.getElementById('modalDiscountRow');
        const modalDiscount = document.getElementById('modalDiscount');
        const modalFinalTotal = document.getElementById('modalFinalTotal');
        
        const parsePrice = (p) => typeof p === 'string' ? parseFloat(p.replace(/[^0-9.]/g, '')) : Number(p);
        const subtotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
        let finalTotal = subtotal;
        
        if (modalSubtotal) modalSubtotal.innerText = `₹${subtotal}`;
        
        if (window.appliedCoupon) {
            let discountValue = window.appliedCoupon.discount_value;
            if (window.appliedCoupon.discount_type === 'percent') {
                // Use original_value (e.g. 20) for the percentage calculation, not the already calculated discount_value
                const percent = window.appliedCoupon.original_value || window.appliedCoupon.discount_value;
                discountValue = Math.round((subtotal * percent) / 100);
            }
            // Ensure discount doesn't exceed subtotal
            discountValue = Math.min(discountValue, subtotal);
            finalTotal = subtotal - discountValue;
            
            if (modalDiscountRow) modalDiscountRow.style.display = 'flex';
            if (modalDiscount) modalDiscount.innerText = `-₹${Math.round(discountValue)}`;
        } else {
            if (modalDiscountRow) modalDiscountRow.style.display = 'none';
        }
        
        if (modalFinalTotal) modalFinalTotal.innerText = `₹${Math.round(finalTotal)}`;
    };


    const checkoutCouponBtn = document.getElementById('checkoutCouponBtn');
    if (checkoutCouponBtn) {
        checkoutCouponBtn.onclick = () => {
            const code = document.getElementById('checkoutCouponInput').value.trim();
            const msgEl = document.getElementById('checkoutCouponMsg');
            applyCoupon(code, msgEl).then(() => {
                updateCheckoutTotals();
            });
        };
    }

    const backToCartBtn = document.getElementById('backToCartBtn');
    if (backToCartBtn) backToCartBtn.onclick = backToCart;

    async function fetchCouponsForCheckout() {
        const listCheckout = document.getElementById('couponsListCheckout');
        const containerCheckout = document.getElementById('availableCouponsCheckout');
        
        try {
            const res = await fetch('/api/products/coupons/active');
            const coupons = await res.json();
            
            if (coupons && coupons.length > 0) {
                const couponHTML = coupons.map(c => `
                    <div onclick="document.getElementById('checkoutCouponInput').value='${c.code}'; document.getElementById('checkoutCouponBtn').click();" 
                         style="background: white; border: 1px solid var(--secondary); color: var(--secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border-style: dashed; transition: all 0.2s;"
                         onmouseover="this.style.background='var(--secondary-light-alpha)'" 
                         onmouseout="this.style.background='white'">
                        ${c.code}
                    </div>
                `).join('');

                if (listCheckout) {
                    containerCheckout.style.display = 'block';
                    listCheckout.innerHTML = couponHTML;
                }
            } else {
                if (containerCheckout) containerCheckout.style.display = 'none';
            }
        } catch(e) { console.error("Error fetching coupons:", e); }
    }

    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cart.length === 0) return;
            closeCart();
            document.body.classList.add('no-scroll');
            
            const supportSymbol = document.getElementById('supportSymbol');
            if (supportSymbol) supportSymbol.style.display = 'none';
            
            // Show Delivery Step first
            showCheckoutStep('delivery');
            if (checkoutModal) checkoutModal.classList.add('active');
            updateCheckoutTotals();
            fetchCouponsForCheckout();

            // Pre-fill Name & Phone if available
            const name = getCookie('full_name');
            const phone = getCookie('username');
            if (name) document.getElementById('checkoutName').value = decodeURIComponent(name);
            if (phone) document.getElementById('checkoutPhone').value = phone;
        };
    }

    const deliveryNextBtn = document.getElementById('deliveryNextBtn');
    if (deliveryNextBtn) {
        deliveryNextBtn.onclick = () => {
            if (window.selectedDeliveryType === 'Pickup from Shop') {
                showCheckoutStep('payment');
            } else {
                showCheckoutStep('address');
            }
        };
    }

    if (addressNextBtn) {
        addressNextBtn.onclick = async () => {
            const name = document.getElementById('checkoutName').value.trim();
            const phone = document.getElementById('checkoutPhone').value.trim();
            const house = document.getElementById('checkoutHouse').value.trim();
            const street = document.getElementById('checkoutStreet').value.trim();
            const pincode = document.getElementById('checkoutPincode') ? document.getElementById('checkoutPincode').value.trim() : '';

            if (!name || !phone || !house || !street || !pincode) {
                Toast.show("Please enter full delivery details including Pincode.", "error");
                return;
            }

            if (!/^\d{10}$/.test(phone)) {
                Toast.show("Please enter a valid 10-digit mobile number.", "error");
                return;
            }

            try {
                // Fetch latest settings for Pincode + Payments
                const res = await fetch('/api/settings');
                const settings = await res.json();

                // Pincode validation
                if (settings && settings.pincode_restriction_active === 1 && settings.allowed_pincodes) {
                    const allowedArray = settings.allowed_pincodes.split(',').map(p => p.trim());
                    if (!allowedArray.includes(pincode)) {
                        Toast.show(`Delivery not available in your area (Pincode: ${pincode}).`, "error");
                        return;
                    }
                }

                // Detect active payment methods
                const methodMap = { 'card': settings.pay_card_active, 'cash': settings.pay_cash_active, 'upi': settings.pay_upi_active };
                const options = document.querySelectorAll('.payment-option');
                options.forEach(opt => {
                    const method = opt.getAttribute('onclick').match(/'([^']+)'/)[1];
                    opt.style.display = (methodMap[method] !== 0) ? 'flex' : 'none';
                });
            } catch(e) { 
                console.error("Settings fetch failed for checkout:", e);
                Toast.show("Connection error. Try again.", "error");
                return; 
            }

            document.getElementById('checkoutStepAddress').style.display = 'none';
            document.getElementById('checkoutStepPayment').style.display = 'block';
        };
    }

    if (paymentBackBtn) {
        paymentBackBtn.onclick = () => {
            document.getElementById('checkoutStepPayment').style.display = 'none';
            document.getElementById('checkoutStepAddress').style.display = 'block';
        };
    }

    let selectedPaymentMethod = null;
    window.selectPayment = function(method, element) {
        selectedPaymentMethod = method;
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        element.classList.add('active');
        if (confirmOrderBtn) confirmOrderBtn.disabled = false;
    }

    if (confirmOrderBtn) {
        confirmOrderBtn.onclick = async () => {
            if (!getCookie('user_id')) {
                Toast.show("Please login to place an order!", "warning");
                openAuthModal();
                return;
            }
            if (!selectedPaymentMethod) return;
            confirmOrderBtn.innerText = "Processing...";
            confirmOrderBtn.disabled = true;

            const orderData = {
                name: document.getElementById('checkoutName').value.trim() || 'Pickup Order',
                phone: document.getElementById('checkoutPhone').value.trim() || 'N/A',
                address: window.selectedDeliveryType === 'Pickup from Shop' ? 'Store Pickup' : `${house}, ${street}`,
                paymentMethod: selectedPaymentMethod,
                items: cart,
                couponId: window.appliedCoupon ? window.appliedCoupon.id : null,
                deliveryType: window.selectedDeliveryType
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(orderData)
                });
                
                const data = await res.json().catch(() => ({ error: "Server returned an invalid response." }));
                
                if (res.ok) {
                    Toast.show("Order placed successfully!", "success");
                    showCheckoutStep('success');
                    
                    if (document.getElementById('successOrderId')) document.getElementById('successOrderId').innerText = `#${data.orderId || '0000'}`;
                    if (document.getElementById('successMethod')) document.getElementById('successMethod').innerText = selectedPaymentMethod === 'cash' ? 'Cash on Delivery' : selectedPaymentMethod.toUpperCase();
                    if (document.getElementById('successTotalAmount')) document.getElementById('successTotalAmount').innerText = document.getElementById('modalFinalTotal').innerText;

                    cart = [];
                    localStorage.removeItem('cart');
                    updateCartSidebar();
                } else {
                    Toast.show(data.error || "Order failed.", "error");
                }
            } catch(e) { 
                console.error(e); 
                Toast.show("Connection error. Please try again.", "error"); 
            }
            finally {
                confirmOrderBtn.innerText = "Confirm Order";
                confirmOrderBtn.disabled = false;
            }
        };
    }

    // Unified Checkout Close/Cancel - takes user back to viewing their cart
    const checkoutCloseBtns = document.querySelectorAll('#closeModalBtn, .close-checkout-btn');
    checkoutCloseBtns.forEach(btn => {
        btn.onclick = () => {
            if (checkoutModal) checkoutModal.classList.remove('active');
            document.body.classList.remove('no-scroll');
            openCart();
        };
    });
    if (closeSuccessBtn) closeSuccessBtn.onclick = () => {
        if (checkoutModal) checkoutModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
        const supportSymbol = document.getElementById('supportSymbol');
        if (supportSymbol) supportSymbol.style.display = 'flex';
        location.reload();
    };
}

async function fetchBanners() {
    try {
        const res = await fetch('/api/banners');
        const banners = await res.json();
        
        // Exclude banner id 2 (Farm Fresh) to remove it entirely from UI
        const sliderBanners = banners.filter(b => b.id !== 2);

        const slider = document.getElementById('bannerSlider');
        if (slider && sliderBanners.length > 0) {
            slider.innerHTML = '';
            sliderBanners.forEach(b => {
                const slide = document.createElement('div');
                slide.className = 'banner-slide slide-1';
                slide.innerHTML = `
                    <div class="banner-content">
                        <span class="badge">${b.badge || ''}</span>
                        <h2>${b.title || ''}</h2>
                        <p>${b.description || ''}</p>
                        <button class="btn btn-primary" onclick="navigateToBannerCategory('${b.target_category || 'All'}')">${b.btnText || b.btntext || 'Shop Now'}</button>
                    </div>
                    <img src="${b.imgurl || b.imgurl}" alt="Promo Banner" class="banner-image" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200'">
                `;
                slider.appendChild(slide);
            });
        }


    } catch(err) { console.error(err); }
}

async function fetchSpecialOffers() {
    try {
        const res = await fetch('/api/special-offers');
        const offers = await res.json();
        const grid = document.getElementById('specialOffersGrid');
        if (grid && offers.length > 0) {
            grid.innerHTML = '';
            offers.forEach((o, index) => {
                const card = document.createElement('div');
                const defaultColor = index % 2 === 0 ? 'bg-orange' : 'bg-purple';
                const colorClass = o.colorClass || defaultColor;
                card.className = `offer-card ${colorClass}`;
                card.style.cursor = 'pointer';
                card.onclick = () => navigateToBannerCategory(o.target_category || 'All');
                card.innerHTML = `
                    <div class="offer-content">
                        <h4>${o.title}</h4>
                        <p>${o.description}</p>
                        <span class="btn btn-sm">Shop Now</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch(err) { console.error(err); }
}

function populateCategories() {
    const grid = document.getElementById('categoryScroll');
    if (!grid) return;
    grid.innerHTML = '';
    categories.forEach(cat => {
        const html = `
            <div class="category-link" style="cursor: pointer;" onclick="window.filterByCategory('${cat.name}')">
                <div class="category-card ${activeFilter.type === 'category' && activeFilter.value === cat.name ? 'active' : ''}">
                    <i class="ph ${cat.iconUrl || 'ph-package'}"></i>
                    <span class="category-name">${cat.name}</span>
                </div>
            </div>
        `;
        grid.innerHTML += html;
    });
    
    // Re-run arrow check since content changed
    setupCarousels();
}

/**
 * Toggle visibility of homepage-only sections to focus on results
 */
function toggleHomeSections(show) {
    const isSearching = document.getElementById('mainSearchInput')?.value.trim() !== '';
    
    const sections = [
        '.banner-section',
        '.special-offers',
        '.trending-section',
        '.brands-section',
        '.testimonials-section'
    ];
    
    sections.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    });

    // Handle .product-listing (Daily Essentials / Search Results)
    const productListing = document.querySelector('.product-listing');
    if (productListing) {
        // If we are showing everything, show it.
        // If we are hiding home sections but searching, KEEP productListing visible for results!
        if (show || isSearching) {
            productListing.style.display = 'block';
            
            // Hide the 'Daily Essentials' header when searching to keep focus on results
            const sectionHeader = productListing.querySelector('.section-header');
            if (sectionHeader) {
                sectionHeader.style.display = isSearching ? 'none' : 'flex';
            }
        } else {
            productListing.style.display = 'none';
        }
    }

    // Handle scroll to top when hiding home sections to focus on results
    if (!show) {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
}

window.filterByCategory = function(catName) {
    const resultsSection = document.getElementById('categoryResultsSection');
    const resultsGrid = document.getElementById('categoryProductGrid');
    const resultsTitle = document.getElementById('selectedCategoryTitle');
    const viewAllBtn = document.getElementById('viewAllInCat');

    if (!resultsSection || !resultsGrid) return;

    // Filter products
    const filtered = products.filter(p => p.category === catName);
    
    // Toggle Homepage Sections OFF
    toggleHomeSections(false);
    
    // Update UI
    resultsTitle.innerText = `Results for "${catName}"`;
    resultsSection.style.display = 'block';
    if (viewAllBtn) viewAllBtn.href = `category.html?name=${encodeURIComponent(catName)}`;
    
    populateProducts("categoryProductGrid", filtered);

    // Scroll to results header
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.clearCategoryFilter = function() {
    const resultsSection = document.getElementById('categoryResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    
    // Toggle Homepage Sections BACK ON
    toggleHomeSections(true);
    
    // Clear active card states
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function populateProducts(containerId, items) {
    console.log(`Populating container: ${containerId} with ${items.length} items.`);
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container not found: ${containerId}`);
        return;
    }
    container.innerHTML = "";
    items.forEach((prod, i) => {
        const cartItem = cart.find(c => c.name === prod.name);
        const qty = cartItem ? cartItem.quantity : 0;
        const isWishlisted = wishlist.map(id => Number(id)).includes(Number(prod.id));
        const isAvailable = prod.is_available !== 0; 
        
        const safeName = prod.name.replace(/'/g, "\\'");
        
        // Variant Check
        const hasVariants = prod.variants && Array.isArray(prod.variants) && prod.variants.length > 0;
        const imgurl = prod.imgurl || prod.imgUrl || "";
        const originalprice = prod.originalprice || prod.originalPrice || 0;

        let weightDisplay = `<span class="product-weight" id="weight-${prod.id}">${prod.weight}</span>`;
        let priceDisplay = `
            <span class="current-price" id="currPrice-${prod.id}">₹${prod.price}</span>
            <span class="old-price" id="oldPrice-${prod.id}">${originalprice ? '₹' + originalprice : ''}</span>
        `;

        if (hasVariants) {
            weightDisplay = `
                <select class="variant-select" onchange="window.updateVariantPrice(this, '${prod.id}', '${safeName}')" style="width: 100%; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.8rem; background: var(--bg-color); color: var(--text-main); margin-bottom: 0.5rem; cursor: pointer;">
                    ${prod.variants.map((v, idx) => `<option value="${idx}" data-price="${v.price}" data-old-price="${v.originalprice || v.originalPrice || v.price}" data-weight="${v.weight}">${v.weight}</option>`).join('')}
                </select>
            `;
            // Set initial price to first variant
            priceDisplay = `
                <span class="current-price" id="currPrice-${prod.id}">₹${prod.variants[0].price}</span>
                <span class="old-price" id="oldPrice-${prod.id}">${(prod.variants[0].originalprice || prod.variants[0].originalprice) ? '₹' + (prod.variants[0].originalprice || prod.variants[0].originalprice) : ''}</span>
            `;
        }

        let btnHtml = '';
        if (!isAvailable) {
            btnHtml = `<span style="color: #EF4444; font-weight: 600; font-size: 0.9rem;">Out of Stock</span>`;
        } else if (qty > 0 && !hasVariants) { // Qty buttons only for non-variant or pre-selected
            btnHtml = `<div style="display: flex; align-items: center; background: var(--primary); border-radius: var(--radius-sm); overflow: hidden; height: 32px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                <button onclick="gridChangeQty('${safeName}', -1)" style="border: none; background: transparent; color: white; padding: 0 10px; cursor: pointer; height: 100%;"><i class="ph ph-minus" style="font-weight: bold"></i></button>
                <span style="font-size: 0.85rem; padding: 0 8px; font-weight: bold; color: white;">${qty}</span>
                <button onclick="gridChangeQty('${safeName}', 1)" style="border: none; background: transparent; color: white; padding: 0 10px; cursor: pointer; height: 100%;"><i class="ph ph-plus" style="font-weight: bold"></i></button>
            </div>`;
        } else {
            btnHtml = `<button class="btn btn-outline btn-sm add-to-cart-btn" onclick="addToCartByGrid('${safeName}', '${prod.id}')" style="display: flex; align-items: center; gap: 0.3rem;"><i class="ph ph-shopping-cart"></i> Add</button>`;
        }

        const html = `
            <div class="product-card" style="${!isAvailable ? 'opacity: 0.6; filter: grayscale(1);' : ''}">
                <i class="${isWishlisted ? 'ph-fill' : 'ph'} ph-heart" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; color: #EF4444; z-index: 2; cursor: pointer;" onclick="toggleWishlist(event, '${prod.id}')"></i>
                ${prod.discount ? `<span class="discount-badge">${prod.discount}</span>` : ''}
                <img src="${imgurl}" alt="${prod.name}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&text=Product'">
                <div class="product-info">
                    ${weightDisplay}
                    <h4 class="product-title">${prod.name}</h4>
                    <div class="product-rating" style="cursor: pointer;" onclick="openReviews('${prod.rating}', '${prod.reviews}', '${prod.name}', '${prod.id}')">
                        <i class="ph-fill ph-star"></i>
                        <span style="text-decoration: underline;">${prod.rating} (${prod.reviews})</span>
                    </div>
                    <div class="product-bottom">
                        <div class="price">
                            ${priceDisplay}
                        </div>
                        <div class="product-action-container" data-product-id="${prod.id}" data-product-name="${safeName}" data-product-index="${i}" data-product-source="${containerId}">
                            ${btnHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (isAvailable) {
            container.innerHTML += html;
        } else {
            // Keep out of stock items at the end
            container.insertAdjacentHTML('beforeend', html);
        }
    });

    // Final check: if container is still empty (e.g. all filtered out), show empty message
    if (!container.innerHTML.trim()) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-soft);">No items available in this category.</div>`;
    }
}

window.updateVariantPrice = function(select, prodId, productName) {
    const option = select.options[select.selectedIndex];
    const price = option.getAttribute('data-price');
    const oldPrice = option.getAttribute('data-old-price');
    
    document.getElementById(`currPrice-${prodId}`).innerText = `₹${price}`;
    document.getElementById(`oldPrice-${prodId}`).innerText = `₹${oldPrice}`;
}

function addToCart(product, selectedVariant = null) {
    console.log("Adding to cart:", product.name, "Variant:", selectedVariant?.weight);
    
    const weight = selectedVariant ? selectedVariant.weight : product.weight;
    const price = selectedVariant ? selectedVariant.price : product.price;
    const originalprice = selectedVariant ? selectedVariant.originalprice : product.originalprice;

    // check if it exists in cart with same weight
    const existing = cart.find(item => item.id === product.id && item.weight === weight);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ 
            ...product, 
            weight: weight,
            price: price,
            originalprice: originalprice,
            quantity: 1, 
            category: product.category || 'General' 
        });
    }
    updateCartSidebar();
}

function updateCartSidebar() {
    const emptyState = document.getElementById('emptyCartMessage');
    const itemsContainer = document.querySelector('.cart-items');
    const badge = document.getElementById('cartBadge');
    const totalEl = document.querySelector('.cart-total');
    const summaryTotalEl = document.querySelector('.cart-summary-line strong');
    
    // Remove old rendered items but keep the empty state div
    const existingItems = itemsContainer.querySelectorAll('.cart-item-row');
    existingItems.forEach(item => item.remove());

    let subtotal = 0;
    let totalItems = 0;

    if (cart.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        
        cart.forEach((item, index) => {
            // Robust numeric extraction
            const itemPrice = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : Number(item.price);
            const itemQty = Number(item.quantity) || 0;
            
            subtotal += (itemPrice || 0) * itemQty;
            totalItems += itemQty;
            
            const itemHTML = document.createElement('div');
            itemHTML.className = 'cart-item-row';
            itemHTML.style.display = 'flex';
            itemHTML.style.gap = '1rem';
            itemHTML.style.marginBottom = '1rem';
            itemHTML.style.paddingBottom = '1rem';
            itemHTML.style.borderBottom = '1px solid var(--border)';
            
            itemHTML.innerHTML = `
                <img src="${item.imgurl}" style="width: 50px; height: 50px; object-fit: contain; background: var(--bg-color); border-radius: 8px;">
                <div style="flex: 1;">
                    <h5 style="font-size: 0.9rem; margin-bottom: 0.2rem;">${item.name}</h5>
                    <span style="font-size: 0.8rem; color: var(--text-soft);">${item.weight}</span>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; align-items: center;">
                        <span style="font-weight: 600;">₹${itemPrice}</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--border); border-radius: 4px; overflow: hidden;">
                            <button onclick="changeQuantity(${index}, -1)" style="border: none; padding: 2px 8px; cursor: pointer; background: #f1f5f9;">-</button>
                            <span style="font-size: 0.85rem; padding: 0 4px; min-width: 20px; text-align: center;">${itemQty}</span>
                            <button onclick="changeQuantity(${index}, 1)" style="border: none; padding: 2px 8px; cursor: pointer; background: #f1f5f9;">+</button>
                        </div>
                    </div>
                </div>
            `;
            itemsContainer.appendChild(itemHTML);
        });
    }

    if (badge) badge.innerText = totalItems;
    if (totalEl) totalEl.innerText = '₹' + subtotal;
    
    // Coupon Logic
    const subtotalEl = document.getElementById('cartSubtotalEl');
    const discountLine = document.getElementById('discountLine');
    const discountTag = document.getElementById('discountTag');
    const discountAmountEl = document.getElementById('discountAmountEl');
    const finalTotalEl = document.getElementById('finalTotalEl');

    if (subtotalEl) subtotalEl.innerText = '₹' + subtotal;

    let finalTotal = subtotal;
    if (window.appliedCoupon) {
        let discount = 0;
        if (window.appliedCoupon.discount_type === 'percent') {
            const percent = window.appliedCoupon.original_value || window.appliedCoupon.discount_value;
            discount = Math.round(subtotal * (percent / 100));
        } else {
            discount = window.appliedCoupon.discount_value;
        }
        
        // Ensure discount doesn't exceed subtotal
        discount = Math.min(discount, subtotal);
        finalTotal = subtotal - discount;

        if (discountLine) {
            discountLine.style.display = 'flex';
            discountTag.innerText = window.appliedCoupon.discount_type === 'percent' ? window.appliedCoupon.discount_value + '%' : 'Fixed';
            discountAmountEl.innerText = '-₹' + discount;
        }
    } else {
        if (discountLine) discountLine.style.display = 'none';
    }

    if (finalTotalEl) finalTotalEl.innerText = '₹' + finalTotal;
    
    console.log(`Cart UI Updated: ${totalItems} items, Total: ₹${finalTotal}`);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Refresh all product grid buttons to match cart state
    refreshProductButtons();
}

function refreshProductButtons() {
    const containers = document.querySelectorAll('.product-action-container');
    containers.forEach(container => {
        const name = container.dataset.productName;
        const index = Number(container.dataset.productIndex);
        const source = container.dataset.productSource;
        
        // Find product in global list
        const prod = products.find(p => p.name === name);
        if (!prod) return;

        const cartItem = cart.find(c => c.name === name);
        const qty = cartItem ? cartItem.quantity : 0;
        const isAvailable = prod.is_available !== 0;

        const safeName = prod.name.replace(/'/g, "\\'");
        let btnHtml = '';
        if (!isAvailable) {
            btnHtml = `<span style="color: #EF4444; font-weight: 600; font-size: 0.9rem;">Out of Stock</span>`;
        } else if (qty > 0 && !prod.variants?.length) {
            btnHtml = `<div style="display: flex; align-items: center; background: var(--primary); border-radius: var(--radius-sm); overflow: hidden; height: 32px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                <button onclick="gridChangeQty('${safeName}', -1)" style="border: none; background: transparent; color: white; padding: 0 10px; cursor: pointer; height: 100%;"><i class="ph ph-minus" style="font-weight: bold"></i></button>
                <span style="font-size: 0.85rem; padding: 0 8px; font-weight: bold; color: white;">${qty}</span>
                <button onclick="gridChangeQty('${safeName}', 1)" style="border: none; background: transparent; color: white; padding: 0 10px; cursor: pointer; height: 100%;"><i class="ph ph-plus" style="font-weight: bold"></i></button>
            </div>`;
        } else {
            btnHtml = `<button class="btn btn-outline btn-sm add-to-cart-btn" onclick="addToCartByGrid('${safeName}', '${prod.id}')" style="display: flex; align-items: center; gap: 0.3rem;"><i class="ph ph-shopping-cart"></i> Add</button>`;
        }

        container.innerHTML = btnHtml;
    });
}

window.addToCartByGrid = function(productName, prodId) {
    const prod = products.find(p => p.id == prodId || p.name === productName);
    if(prod) {
        // Check if there's a variant selected in the UI
        const card = document.querySelector(`.product-action-container[data-product-id="${prod.id}"]`)?.closest('.product-card');
        const select = card?.querySelector('.variant-select');
        
        let selectedVariant = null;
        if (select) {
            const opt = select.options[select.selectedIndex];
            selectedVariant = {
                weight: opt.getAttribute('data-weight'),
                price: Number(opt.getAttribute('data-price')),
                originalprice: Number(opt.getAttribute('data-old-price'))
            };
        }
        
        addToCart(prod, selectedVariant);
    }
}


window.gridChangeQty = function(productName, delta) {
    const existing = cart.find(item => item.name === productName);
    if (existing) {
        existing.quantity += delta;
        if (existing.quantity <= 0) {
            cart = cart.filter(item => item.name !== productName);
        }
    }
    updateCartSidebar();
}

window.changeQuantity = function(index, delta) {
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
    }
    updateCartSidebar();
}

function populateBrands() {
    const grid = document.getElementById("brandsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    brands.forEach(brand => {
        const isActive = activeFilter.type === 'brand' && activeFilter.value === brand.name;
        
        const html = `
            <div class="brand-card ${isActive ? 'active' : ''}" onclick="applyBrandFilter('${brand.name}')">
                <div class="brand-icon-box">
                    <i class="ph ph-storefront"></i>
                </div>
                <h4>${brand.name}</h4>
                <p>Explore Products</p>
            </div>
        `;
        grid.innerHTML += html;
    });
}

window.applyBrandFilter = function(brandName) {
    const section = document.getElementById('brandResultsSection');
    const grid = document.getElementById('brandProductGrid');
    const title = document.getElementById('brandResultsTitle');

    if (!section || !grid || !title) return;

    if (activeFilter.type === 'brand' && activeFilter.value === brandName) {
        clearBrandFilter();
        return;
    }

    activeFilter = { type: 'brand', value: brandName };
    
    // Improved matching logic: 
    // 1. Exact match in brand (if field exists, though it doesn't in schema yet)
    // 2. Inclusion of brand name in product name or category
    const query = brandName.toLowerCase();
    const primaryWord = query.split(' ')[0];
    
    let filtered = products.filter(p => {
        const prodName = (p.name || '').toLowerCase();
        const prodCat = (p.category || '').toLowerCase();
        
        return prodName.includes(query) || 
               prodCat.includes(query) || 
               (primaryWord.length > 3 && prodName.includes(primaryWord));
    });

    title.innerHTML = `Products from <strong>${brandName}</strong> <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-soft); margin-left: 0.5rem;">(${filtered.length} items found)</span>`;
    populateProducts("brandProductGrid", filtered);
    
    section.style.display = 'block';
    populateBrands(); // Refresh active state in carousel
    
    // Smooth scroll with a slight offset for header
    setTimeout(() => {
        const headerOffset = 100;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }, 100);
}

window.clearBrandFilter = function() {
    activeFilter = { type: null, value: null };
    const section = document.getElementById('brandResultsSection');
    if (section) section.style.display = 'none';
    populateBrands();
}

window.navigateToBannerCategory = function(categoryName) {
    if (!categoryName || categoryName === 'All') {
        window.location.href = 'category.html?name=All';
    } else {
        window.location.href = `category.html?name=${encodeURIComponent(categoryName)}`;
    }
}

async function populateTestimonials() {
    const grid = document.getElementById("testimonialsGrid");
    if (!grid) return;
    
    try {
        // Fetch a sample of recent reviews for the homepage
        // We'll fetch for a few popular products or all if needed
        const res = await fetch('/api/reviews/recent');
        const reviews = await res.json();
        
        if (reviews.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-soft); padding: 2rem;">Be the first to share your experience!</p>';
            return;
        }
        
        grid.innerHTML = reviews.map(r => `
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <span class="testimonial-user">${r.username}</span>
                    <div class="testimonial-rating">
                        ${'<i class="ph-fill ph-star"></i>'.repeat(r.rating)}
                    </div>
                </div>
                <p class="testimonial-text">"${r.comment}"</p>
                <div class="testimonial-product">Verified Purchase: ${r.product_name}</div>
            </div>
        `).join('');
    } catch(err) {
        console.error("Failed to populate testimonials", err);
    }
}

window.applyFilter = function(type, value) {
    if (activeFilter.type === type && activeFilter.value === value) {
        // Toggle off if clicking the same filter
        activeFilter = { type: null, value: null };
    } else {
        activeFilter = { type, value };
        // Scroll to product grid for better visibility when a filter is applied
        const gridSection = document.querySelector('.product-listing');
        if (gridSection) {
            const offset = 80;
            const top = gridSection.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }

    // Update UI
    populateCategories();
    populateBrands();
    
    let filtered = products;
    if (activeFilter.type === 'category') {
        filtered = products.filter(p => p.category === activeFilter.value);
    } else if (activeFilter.type === 'brand') {
        filtered = products.filter(p => p.name.includes(value));
    }

    const grid = document.getElementById("productGrid");
    const resultCountEl = document.getElementById('searchResultCount');
    
    if (activeFilter.type) {
        resultCountEl.style.display = 'block';
        resultCountEl.innerHTML = `Showing products for <strong>${activeFilter.value}</strong> <button class="btn btn-sm btn-outline" style="margin-left: 10px; padding: 2px 8px;" onclick="applyFilter(null, null)">Clear</button>`;
        populateProducts("productGrid", filtered);
    } else {
        resultCountEl.style.display = 'none';
        populateProducts("productGrid", products);
    }
}

async function checkOrderStatus() {
    const userId = getCookie('user_id');
    if (!userId) return;

    try {
        const res = await fetch('/api/user/orders');
        if (res.ok) {
            const orders = await res.json();
            // Check if any recent order is 'confirmed'
            const confirmedOrder = orders.find(o => o.status === 'confirmed');
            
            const widget = document.getElementById('liveOrderStatus');
            const orderIdEl = document.getElementById('confirmedOrderId');

            if (confirmedOrder && widget && orderIdEl) {
                // Show if it's not already dismissed in this session
                const dismissedId = sessionStorage.getItem('dismissedOrderId');
                if (dismissedId !== String(confirmedOrder.id)) {
                    orderIdEl.innerText = confirmedOrder.id;
                    widget.style.display = 'flex';
                }
            } else if (widget) {
                widget.style.display = 'none';
            }
        }
    } catch(err) {
        console.error("Order status check failed", err);
    }
}

// Add dismiss function to global
window.dismissOrderStatus = function() {
    const widget = document.getElementById('liveOrderStatus');
    const orderId = document.getElementById('confirmedOrderId').innerText;
    if (widget) {
        widget.style.display = 'none';
        sessionStorage.setItem('dismissedOrderId', orderId);
    }
}
// Utilities
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

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

function updateAuthUI(name) {
    const authContent = document.getElementById('dynamicAuthContent');
    if (!authContent) return;
    
    const userFullName = name || getCookie('full_name') || localStorage.getItem('user_full_name');
    const isMobile = window.innerWidth <= 768;

    if (userFullName && userFullName !== 'undefined' && userFullName !== 'null') {
        const displayName = decodeURIComponent(userFullName).toUpperCase();
        const firstName = displayName.split(' ')[0];
        
        // Premium Dropdown Layout
        authContent.innerHTML = `
            <div class="user-profile-wrapper">
                <div class="premium-user-badge" id="userMenuTrigger" style="display: flex; align-items: center; gap: 0.8rem; background: rgba(255,255,255,0.8); padding: 6px 14px; border-radius: 30px; border: 1.5px solid var(--primary); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);">
                    <div class="avatar-circle" style="width: 28px; height: 28px; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 900; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);">
                        ${displayName.charAt(0)}
                    </div>
                    <span style="font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--primary); font-size: 0.9rem; letter-spacing: 0.5px;">HI, ${isMobile ? firstName : displayName}</span>
                    <i class="ph ph-caret-down" style="font-size: 0.8rem; color: var(--primary);"></i>
                </div>

                <div class="user-dropdown" id="userDropdownMenu">
                    <a href="profile.html" class="user-dropdown-item">
                        <i class="ph ph-user-circle"></i> My Profile
                    </a>
                    <a href="profile.html?tab=orders" class="user-dropdown-item">
                        <i class="ph ph-shopping-bag"></i> My Orders
                    </a>
                    <a href="wishlist.html" class="user-dropdown-item">
                        <i class="ph ph-heart"></i> Wishlist
                    </a>
                    <div class="user-dropdown-footer">
                        <a href="#" class="user-dropdown-item logout logout-trigger">
                            <i class="ph ph-sign-out"></i> Log Out
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // Re-attach dropdown toggle logic
        const trigger = document.getElementById('userMenuTrigger');
        const dropdown = document.getElementById('userDropdownMenu');
        
        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
        }

        // Re-attach logout listener - Use the centralized function
        authContent.querySelector('.logout-trigger')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.logoutUser();
        });
    } else {
        authContent.innerHTML = `
            <a href="#" class="nav-link" onclick="openAuthModal('login')" data-i18n="nav_sign_in">Sign In</a>
            <span class="divider">|</span>
            <a href="#" class="nav-link" onclick="openAuthModal('login')" data-i18n="nav_log_in">Log In</a>
        `;
    }
}
// Initialize Auth UI on load
updateAuthUI();

// Global Logout Function
window.logoutUser = async function() {
    try {
        const username = localStorage.getItem('user_full_name') || 'Friend';
        const displayName = decodeURIComponent(username).split(' ')[0];

        if (window.Toast) {
            Toast.show(`Good bye, ${displayName}! See you soon. ✨`, "premium", 2500);
        }
        
        // 1. Immediately update UI to prevent flicker
        if (window.updateAuthUI) updateAuthUI(null);
        
        // 2. Add full screen fade out for premium feel
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0); z-index: 9999;
            pointer-events: none; transition: background 0.8s ease;
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.background = 'rgba(255,255,255,0.8)');

        // 3. Attempt backend logout
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch(e) { console.warn("Backend logout failed, continuing client purge."); }
        
        // 4. NUCLEAR PURGE
        const purgeKeys = ['full_name', 'username', 'user_id', 'auth_token', 'token', 'user_full_name', 'user_username', 'user_id', 'user_data', 'cart', 'wishlist'];
        const paths = ['/', '/api', '/frontend', window.location.pathname];
        
        purgeKeys.forEach(ck => {
            paths.forEach(p => {
                document.cookie = `${ck}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p};`;
                document.cookie = `${ck}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}; domain=${window.location.hostname};`;
            });
            document.cookie = `${ck}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        });
        
        purgeKeys.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
        
        localStorage.clear();

        // 5. Final redirect with delay to show the nice notification
        setTimeout(() => {
            window.location.href = "/?logout=success";
        }, 1200);
    } catch(err) {
        console.error("Logout critical failure", err);
        window.location.href = "/";
    }
};

// Update sidebar logout listener to use the global function
document.addEventListener('DOMContentLoaded', () => {
    const sidebarLogout = document.getElementById('sidebarLogout');
    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', (e) => {
            e.preventDefault();
            window.logoutUser();
        });
    }
});
