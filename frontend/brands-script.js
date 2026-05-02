let brands = [];
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let activeBrand = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("Loading Brands and Products...");
        const brandRes = await fetch('/api/brands');
        brands = await brandRes.json();
        
        const prodRes = await fetch('/api/products');
        products = await prodRes.json();
        
        // Static promo handling from index.html approach? 
        // No, brands.html has a dynamicNotificationBanner div at line 14. 
        // I'll update it to match the static style or just keep it simple.
    } catch(e) {
        console.error("Failed fetching initial data", e);
    }

    setupNavMenu();
    populateAllBrands();
    checkOrderStatus();
    setInterval(checkOrderStatus, 60000);

    // Initialize Translation
    const savedLang = localStorage.getItem('language') || 'en';
    if (window.applyTranslations) {
        window.applyTranslations(savedLang);
    }
});

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
        document.body.classList.add('sidebar-active');
        const username = getCookie('username');
        if (username) {
            if (sidebarUsername) sidebarUsername.innerText = decodeURIComponent(username);
            if (sidebarLogout) sidebarLogout.style.display = 'flex';
        }
    };
    const closeNav = () => {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        document.body.classList.remove('sidebar-active');
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
                window.location.reload();
            }
        });
    }
}

function populateAllBrands() {
    const grid = document.getElementById("allBrandsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    brands.forEach(brand => {
        const html = `
            <div class="product-card" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 1.5rem 1rem; border: 1px solid var(--border); transition: transform 0.2s, box-shadow 0.2s;" onclick="filterByBrand('${brand.name}')" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                <i class="ph ph-storefront" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
                <h4 style="font-size: 1.1rem; text-align: center; color: var(--text-main); font-weight: 700;">${brand.name}</h4>
                <p style="font-size: 0.85rem; color: var(--text-soft); text-align: center; margin-top: 0.5rem; font-weight: 500;">Official Partner</p>
            </div>
        `;
        grid.innerHTML += html;
    });
}

function filterByBrand(brandName) {
    const section = document.getElementById('brandProductsSection');
    const grid = document.getElementById('brandProductGrid');
    const title = document.getElementById('brandResultsTitle');

    if (!section || !grid) return;

    // Filter logic same as index.html
    const primaryWord = brandName.toLowerCase().split(' ')[0];
    const filtered = products.filter(p => {
        const searchText = (p.name + ' ' + p.category).toLowerCase();
        return searchText.includes(brandName.toLowerCase()) || searchText.includes(primaryWord);
    });

    title.innerHTML = `Products from <strong>${brandName}</strong>`;
    populateProducts("brandProductGrid", filtered);
    
    section.style.display = 'block';
    // Scroll to results
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.updateVariantPrice = function(select, prodId) {
    const option = select.options[select.selectedIndex];
    const price = option.getAttribute('data-price');
    const oldPrice = option.getAttribute('data-old-price');
    const img = option.getAttribute('data-img');
    
    const currPriceEl = document.getElementById(`currPrice-${prodId}`);
    const oldPriceEl = document.getElementById(`oldPrice-${prodId}`);
    const productCard = select.closest('.product-card');
    const productImg = productCard?.querySelector('.product-img');

    if (currPriceEl) currPriceEl.innerText = `₹${price}`;
    if (oldPriceEl) oldPriceEl.innerText = oldPrice && oldPrice !== price ? `₹${oldPrice}` : '';
    if (productImg && img) productImg.src = img;
    
    // Refresh buttons by re-filtering (slightly heavy but ensures consistency)
    const section = document.getElementById('brandProductsSection');
    if (section && section.style.display !== 'none') {
        const brandName = section.querySelector('strong').innerText;
        filterByBrand(brandName);
    }
};

function populateProducts(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    if (items.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-soft);">No items found for this brand.</div>`;
        return;
    }

    items.forEach((prod, i) => {
        const cartItem = cart.find(c => c.name === prod.name);
        const qty = cartItem ? cartItem.quantity : 0;
        const isWishlisted = wishlist.includes(prod.name);
        const isAvailable = prod.is_available !== 0;
        
        const imgurl = prod.imgUrl || prod.imgurl || "";
        const originalprice = prod.originalPrice || prod.originalprice || 0;

        let btnHtml = '';
        if (!isAvailable) {
            btnHtml = `<span style="color: #EF4444; font-weight: 600; font-size: 0.9rem;">Out of Stock</span>`;
        } else if (qty > 0 && (!prod.variants || prod.variants.length === 0)) {
            btnHtml = `<div style="display: flex; align-items: center; background: var(--primary-light); border-radius: var(--radius-sm); overflow: hidden; height: 32px; border: 1px solid var(--primary);">
                <button onclick="changeInCart('${prod.name}', -1)" style="border: none; background: transparent; color: var(--primary); padding: 0 10px; cursor: pointer; height: 100%; font-weight: bold;">-</button>
                <span style="font-size: 0.85rem; padding: 0 8px; font-weight: bold; color: var(--primary);">${qty}</span>
                <button onclick="changeInCart('${prod.name}', 1)" style="border: none; background: transparent; color: var(--primary); padding: 0 10px; cursor: pointer; height: 100%; font-weight: bold;">+</button>
            </div>`;
        } else {
            const escapedName = prod.name.replace(/'/g, "&apos;");
            btnHtml = `<button class="btn btn-outline btn-sm" onclick="addToCartByBrand('${escapedName}', '${prod.id}')">Add to Cart</button>`;
        }

        const html = `
            <div class="product-card" style="${!isAvailable ? 'opacity: 0.6; filter: grayscale(1);' : ''}" data-product-id="${prod.id}">
                <i class="${isWishlisted ? 'ph-fill' : 'ph'} ph-heart" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; color: #EF4444; z-index: 2; cursor: pointer;" onclick="toggleWishlist(event, '${prod.name}')"></i>
                <img src="${imgurl}" alt="${prod.name}" class="product-img" onerror="this.src='https://via.placeholder.com/200/F8FAFC/94A3B8?text=Product'">
                <div class="product-info">
                    ${prod.variants && prod.variants.length > 0 ? `
                        <select class="variant-select-inline" onchange="updateVariantPrice(this, '${prod.id}')">
                            <option data-weight="${prod.weight}" data-price="${prod.price}" data-old-price="${originalprice}">${prod.weight}</option>
                            ${prod.variants.map(v => `<option data-weight="${v.weight}" data-price="${v.price}" data-old-price="${v.originalprice || v.originalPrice || v.price}">${v.weight}</option>`).join('')}
                        </select>
                    ` : `<span class="product-weight" id="weight-${prod.id}">${prod.weight}</span>`}
                    
                    <h4 class="product-title">${prod.name}</h4>
                    <div class="product-rating">
                        <i class="ph-fill ph-star"></i>
                        <span>${prod.rating || 4.5} (${prod.reviews || '10+'})</span>
                    </div>
                    <div class="product-bottom">
                        <div class="price">
                            <div style="display: flex; flex-direction: column;">
                                <span class="current-price" id="currPrice-${prod.id}">₹${prod.price}</span>
                                <span class="old-price" id="oldPrice-${prod.id}">${originalprice ? '₹' + originalprice : ''}</span>
                            </div>
                        </div>
                        <div class="product-action-container">
                            ${btnHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

window.addToCartByBrand = function(productName, prodId) {
    const prod = products.find(p => p.id == prodId || p.name === productName);
    if(prod) {
        const card = document.querySelector(`.product-card[data-product-id="${prod.id}"]`);
        const select = card?.querySelector('.variant-select-inline');
        
        let selectedVariant = null;
        if (select) {
            const opt = select.options[select.selectedIndex];
            selectedVariant = {
                weight: opt.getAttribute('data-weight'),
                price: Number(opt.getAttribute('data-price')),
                originalprice: Number(opt.getAttribute('data-old-price'))
            };
        }

        const weight = selectedVariant ? selectedVariant.weight : prod.weight;
        const price = selectedVariant ? selectedVariant.price : prod.price;
        const originalprice = selectedVariant ? selectedVariant.originalprice : (prod.originalPrice || prod.originalprice);

        const existing = cart.find(item => Number(item.id) === Number(prod.id) && String(item.weight) === String(weight));
        if (existing) existing.quantity += 1;
        else cart.push({ ...prod, weight, price, originalprice, quantity: 1 });
        syncCart();
        Toast.show(`${productName} added to cart!`, "success");
    }
};

window.changeInCart = function(prodName, delta) {
    const idx = cart.findIndex(item => Number(item.id) === Number(cart.find(c => c.name === prodName)?.id));
    // Actually, since this is for simple products, we can use id if we pass it, but name is fine too.
    // However, for consistency:
    const existing = cart.find(item => item.name === prodName);
    if (idx > -1) {
        cart[idx].quantity += delta;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
        syncCart();
    }
};

function syncCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    // Re-render current results if visible
    const section = document.getElementById('brandProductsSection');
    if (section && section.style.display !== 'none') {
        const brandName = section.querySelector('strong').innerText;
        filterByBrand(brandName);
    }
}

window.toggleWishlist = async function(e, prodName) {
    e.stopPropagation();
    const idx = wishlist.indexOf(prodName);
    if (idx > -1) wishlist.splice(idx, 1);
    else wishlist.push(prodName);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    syncCart(); // Re-render results
    Toast.show(idx > -1 ? "Removed from wishlist" : "Added to wishlist", "info");
};

async function checkOrderStatus() {
    const userId = getCookie('user_id');
    if (!userId) return;
    try {
        const res = await fetch('/api/user/orders');
        if (res.ok) {
            const orders = await res.json();
            const hasConfirmed = orders.some(o => o.status === 'confirmed');
            // If they have confirmed orders on Brands page, we can alert them or just keep quiet as Brands.html doesn't have the widget by default.
            // But let's stay consistent.
        }
    } catch(err) { console.error(err); }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

window.changeLanguage = (lang) => {
    localStorage.setItem('language', lang);
    location.reload();
};
