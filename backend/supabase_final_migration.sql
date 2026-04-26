-- Consolidated SQL Migration Script for SnapBasket (Supabase)
-- Instructions: Copy and run this entire script in your Supabase SQL Editor.

--------------------------------------------------------------------------------
-- 1. Base Tables Creation
--------------------------------------------------------------------------------

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
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
    coins BIGINT DEFAULT 0, -- Suraj Coins Loyalty System
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id SERIAL PRIMARY KEY,
    phone TEXT UNIQUE,
    full_name TEXT,
    password TEXT,
    security_q1 TEXT,
    security_a1 TEXT,
    security_q2 TEXT,
    security_a2 TEXT
);

-- Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id SERIAL PRIMARY KEY,
    shop_email TEXT,
    shop_phone TEXT,
    shop_address TEXT,
    shop_image TEXT,
    marquee_text TEXT,
    pay_card_active INTEGER DEFAULT 1,
    pay_cash_active INTEGER DEFAULT 1,
    pay_upi_active INTEGER DEFAULT 1,
    allowed_pincodes TEXT,
    pincode_restriction_active INTEGER DEFAULT 1,
    -- Loyalty System Settings
    coin_reward_rate INTEGER DEFAULT 1000,
    coin_reward_amount INTEGER DEFAULT 30,
    coin_value_per_rupee INTEGER DEFAULT 10,
    coins_system_active INTEGER DEFAULT 1
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT,
    iconurl TEXT
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
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
    variants JSONB,
    description TEXT
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id SERIAL PRIMARY KEY,
    name TEXT
);

-- Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
    id SERIAL PRIMARY KEY,
    badge TEXT,
    title TEXT,
    description TEXT,
    btntext TEXT,
    imgurl TEXT,
    target_category TEXT
);

-- Special Offers Table
CREATE TABLE IF NOT EXISTS public.special_offers (
    id SERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    colorclass TEXT,
    target_category TEXT
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    total INTEGER,
    items JSONB,
    payment_method TEXT,
    address TEXT,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    discount_amount INTEGER DEFAULT 0,
    delivery_type TEXT DEFAULT 'Home Delivery',
    coins_earned INTEGER DEFAULT 0, -- Coins earned from this order
    coins_used INTEGER DEFAULT 0,   -- Coins redeemed for this order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES public.products(id),
    username TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    label TEXT,
    address_line TEXT,
    city TEXT,
    pincode TEXT,
    is_default INTEGER DEFAULT 0
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    discount_value INTEGER,
    discount_type TEXT,
    min_amount INTEGER DEFAULT 0,
    is_one_time INTEGER DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE
);

-- Coupon Usage Table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    coupon_id INTEGER REFERENCES public.coupons(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Wishlist Items Table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    product_id INTEGER REFERENCES public.products(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id)
);

--------------------------------------------------------------------------------
-- 2. Migration: Add columns if they don't exist (Safety for existing DBs)
--------------------------------------------------------------------------------

DO $$ 
BEGIN
    -- Users columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='coins') THEN
        ALTER TABLE public.users ADD COLUMN coins BIGINT DEFAULT 0;
    END IF;

    -- Settings columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='coin_reward_rate') THEN
        ALTER TABLE public.settings ADD COLUMN coin_reward_rate INTEGER DEFAULT 1000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='coin_reward_amount') THEN
        ALTER TABLE public.settings ADD COLUMN coin_reward_amount INTEGER DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='coin_value_per_rupee') THEN
        ALTER TABLE public.settings ADD COLUMN coin_value_per_rupee INTEGER DEFAULT 10;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='coins_system_active') THEN
        ALTER TABLE public.settings ADD COLUMN coins_system_active INTEGER DEFAULT 1;
    END IF;

    -- Orders columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='coins_earned') THEN
        ALTER TABLE public.orders ADD COLUMN coins_earned INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='coins_used') THEN
        ALTER TABLE public.orders ADD COLUMN coins_used INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'Home Delivery';
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. Initial Data Seeding
--------------------------------------------------------------------------------

-- Seed Settings (Only if empty)
INSERT INTO public.settings (
    shop_email, shop_phone, shop_address, shop_image, marquee_text, allowed_pincodes, pincode_restriction_active,
    coin_reward_rate, coin_reward_amount, coin_value_per_rupee, coins_system_active
) 
SELECT 
    'support@suraj.com', 
    '+91 98765 43210', 
    '123 Grocery Avenue, Mumbai, MH',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
    '⚡ FREE Delivery on orders above ₹500 | 🍎 Fresh Groceries delivered in 15-45 minutes! | 🎁 Use code WELCOME10 for 10% OFF!',
    '524004,524003,524002,524001',
    1,
    1000, 30, 10, 1
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
