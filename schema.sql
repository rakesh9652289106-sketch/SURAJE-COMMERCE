-- Supabase Schema Translation for SnapBasket

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    profile_pic TEXT,
    language TEXT DEFAULT 'en',
    order_reminders INTEGER DEFAULT 1,
    sms_permissions INTEGER DEFAULT 0,
    flash_sale_alerts INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    security_q1 TEXT,
    security_a1 TEXT,
    security_q2 TEXT,
    security_a2 TEXT,
    gender TEXT,
    dob TEXT,
    alternate_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT UNIQUE,
    full_name TEXT,
    password TEXT,
    security_q1 TEXT,
    security_a1 TEXT,
    security_q2 TEXT,
    security_a2 TEXT
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id BIGSERIAL PRIMARY KEY,
    shop_email TEXT,
    shop_phone TEXT,
    shop_address TEXT,
    shop_image TEXT,
    marquee_text TEXT,
    pay_card_active INTEGER DEFAULT 1,
    pay_cash_active INTEGER DEFAULT 1,
    pay_upi_active INTEGER DEFAULT 1,
    allowed_pincodes TEXT,
    pincode_restriction_active INTEGER DEFAULT 1
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    iconurl TEXT
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    category TEXT,
    weight TEXT,
    price INTEGER,
    originalprice INTEGER,
    rating TEXT,
    reviews TEXT,
    imgurl TEXT,
    discount TEXT,
    stock_quantity INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    is_trending INTEGER DEFAULT 0,
    is_daily_essential INTEGER DEFAULT 1,
    description TEXT
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name TEXT
);

-- Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id BIGSERIAL PRIMARY KEY,
    badge TEXT,
    title TEXT,
    description TEXT,
    btntext TEXT,
    imgurl TEXT,
    target_category TEXT
);

-- Special Offers Table
CREATE TABLE IF NOT EXISTS special_offers (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    colorclass TEXT,
    target_category TEXT
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    total INTEGER,
    items TEXT,
    payment_method TEXT,
    address TEXT,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    discount_amount INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    reply TEXT,
    replied_at TIMESTAMPTZ,
    status TEXT DEFAULT 'unread',
    user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id),
    username TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    label TEXT,
    address_line TEXT,
    city TEXT,
    pincode TEXT,
    is_default INTEGER DEFAULT 0
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    discount_value INTEGER,
    discount_type TEXT,
    min_amount INTEGER DEFAULT 0,
    is_one_time INTEGER DEFAULT 0,
    expiry_date TIMESTAMPTZ
);

-- Coupon Usage Table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    coupon_id BIGINT REFERENCES coupons(id),
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist Items Table
CREATE TABLE IF NOT EXISTS wishlist_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    product_id BIGINT REFERENCES products(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Initial Data Seeds
INSERT INTO settings (shop_email, shop_phone, shop_address, shop_image, marquee_text, allowed_pincodes, pincode_restriction_active) 
VALUES ('support@snapbasket.com', '+91 98765 43210', '123 Grocery Avenue, Mumbai, MH', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200', '⚡ FREE Delivery on orders above ₹500 | 🍎 Fresh Groceries delivered in 15-45 minutes! | 🎁 Use code WELCOME10 for 10% OFF!', '524004,524003,524002,524001', 1);

-- We leave out users to let the application handle password hashing upon creation or you can insert a default one.

