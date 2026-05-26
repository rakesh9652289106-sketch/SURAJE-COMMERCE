-- Consolidated SQL Setup & Seeding Script for SnapBasket (Supabase)
-- Instructions: Copy and run this ENTIRE script in your Supabase SQL Editor.

--------------------------------------------------------------------------------
-- 1. Base Tables Creation (Ordered by Dependencies)
-- WARNING: We create coupons BEFORE orders to avoid foreign key reference errors.
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
    coins BIGINT DEFAULT 0,
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
    coupon_id INTEGER REFERENCES public.coupons(id),
    daily_seq INTEGER DEFAULT 1,
    coins_earned INTEGER DEFAULT 0,
    coins_used INTEGER DEFAULT 0,
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
-- 2. Initial Data Seeding
--------------------------------------------------------------------------------

-- Seed Settings
INSERT INTO public.settings (
    shop_email, shop_phone, shop_address, shop_image, marquee_text, allowed_pincodes, pincode_restriction_active,
    coin_reward_rate, coin_reward_amount, coin_value_per_rupee, coins_system_active
) VALUES (
    'support@snapbasket.com', 
    '+91 98765 43210', 
    '123 Grocery Avenue, Mumbai, MH',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
    '⚡ FREE Delivery on orders above ₹500 | 🍎 Fresh Groceries delivered in 15-45 minutes! | 🎁 Use code WELCOME10 for 10% OFF!',
    '524004,524003,524002,524001',
    1,
    1000, 30, 10, 1
) ON CONFLICT DO NOTHING;

-- Seed Default Admin
INSERT INTO public.admin_users (phone, full_name, password) VALUES (
    '9490229108',
    'SURESH',
    'SURAJ524004'
) ON CONFLICT DO NOTHING;

-- Seed Default User
INSERT INTO public.users (username, password, full_name, email, phone, status) VALUES (
    'rakesh',
    '513b1940989f664a781fa049d5cd83ee:f4e41416fb9a98efcc23fb770e08f51a2f9602e1b12b5e27a6e1f0e2617f698e54734898de8be19ef16ef009d07fe08e8b2fb9882200445d4e21a221f4be12ee',
    'Rakesh Kumar',
    'rakesh@example.com',
    '9876543210',
    'active'
) ON CONFLICT DO NOTHING;

-- Seed Categories
TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE;
INSERT INTO public.categories (name, iconurl) VALUES 
('Dals & Pulses', 'ph-bowl-food'),
('Snacks', 'ph-cookie'),
('Dairy & Bakery', 'ph-drop'),
('Fresh Fruits', 'ph-apple-logo'),
('Dry Fruits', 'ph-plant'),
('Household', 'ph-house-line'),
('Drinks', 'ph-brandy'),
('Vegetables', 'ph-leaf');

-- Seed Products
TRUNCATE TABLE public.products RESTART IDENTITY CASCADE;
INSERT INTO public.products (name, category, weight, price, originalprice, rating, reviews, imgurl, discount, is_trending, is_daily_essential, description) VALUES 
('Premium Toor Dal', 'Dals & Pulses', '1 kg', 180, 220, '4.8', '120', 'https://images.unsplash.com/photo-1589131649983-4ec35f63d309?w=300&h=300&fit=crop', '18% OFF', 1, 1, 'High quality Premium Toor Dal for your daily needs.'),
('Fresh Red Apples', 'Fresh Fruits', '1 kg', 150, 180, '4.9', '340', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&h=300&fit=crop', '16% OFF', 1, 1, 'High quality Fresh Red Apples for your daily needs.'),
('Organic Honey', 'Household', '500 g', 199, 250, '4.7', '89', 'https://images.unsplash.com/photo-1587049352847-4d4b1437145b?w=300&h=300&fit=crop', '20% OFF', 1, 1, 'High quality Organic Honey for your daily needs.'),
('Aashirvaad Salt', 'Dals & Pulses', '1 kg', 25, 28, '4.5', '210', 'https://images.unsplash.com/photo-1622484211148-525c34cb2e65?w=300&h=300&fit=crop', '10% OFF', 1, 1, 'High quality Aashirvaad Salt for your daily needs.'),
('Cashews (Kaju)', 'Dry Fruits', '250 g', 290, 350, '4.6', '156', 'https://images.unsplash.com/photo-1599587428807-6ad0c7ec44da?w=300&h=300&fit=crop', '17% OFF', 1, 1, 'High quality Cashews (Kaju) for your daily needs.'),
('Coca Cola Family Pack', 'Drinks', '2 L', 90, 95, '4.2', '500', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop', '5% OFF', 0, 1, 'High quality Coca Cola Family Pack for your daily needs.'),
('Surf Excel Detergent', 'Household', '1 kg', 125, 140, '4.8', '450', 'https://images.unsplash.com/photo-1584820927498-cafe2c174360?w=300&h=300&fit=crop', '10% OFF', 1, 1, 'High quality Surf Excel Detergent for your daily needs.'),
('Lay''s Classic', 'Snacks', '50 g', 20, 20, '4.4', '100', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=300&fit=crop', '0% OFF', 0, 1, 'High quality Lays Classic for your daily needs.'),
('Amul Taaza Milk', 'Dairy & Bakery', '1 L', 68, 70, '4.9', '1200', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop', '2% OFF', 0, 1, 'High quality Amul Taaza Milk for your daily needs.'),
('Britannia Good Day', 'Snacks', '200 g', 30, 35, '4.6', '890', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop', '14% OFF', 1, 1, 'High quality Britannia Good Day for your daily needs.'),
('Tata Tea Gold', 'Drinks', '500 g', 290, 330, '4.7', '600', 'https://images.unsplash.com/photo-1594910243552-8700ab43e74a?w=300&h=300&fit=crop', '12% OFF', 1, 1, 'High quality Tata Tea Gold for your daily needs.'),
('Fresh Onions', 'Vegetables', '1 kg', 40, 60, '4.1', '300', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&h=300&fit=crop', '33% OFF', 0, 1, 'High quality Fresh Onions for your daily needs.'),
('Fresh Red Tomato', 'Vegetables', '1 kg', 50, 70, '4.9', '850', 'https://images.unsplash.com/photo-1590665416245-129683944414?w=300&h=300&fit=crop', '28% OFF', 1, 1, 'High quality Fresh Red Tomato for your daily needs.'),
('Green Chillies', 'Vegetables', '250 g', 20, 30, '4.6', '120', 'https://images.unsplash.com/photo-1588252210219-c9c31b21bc56?w=300&h=300&fit=crop', '33% OFF', 0, 1, 'High quality Green Chillies for your daily needs.'),
('Ginger (Adrak)', 'Vegetables', '250 g', 45, 60, '4.8', '95', 'https://images.unsplash.com/photo-1599940824399-b87987cb96a5?w=300&h=300&fit=crop', '25% OFF', 0, 1, 'High quality Ginger (Adrak) for your daily needs.'),
('Garlic (Lehsun)', 'Vegetables', '250 g', 60, 80, '4.7', '110', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop', '25% OFF', 0, 1, 'High quality Garlic (Lehsun) for your daily needs.'),
('Fresh Cauliflower', 'Vegetables', '1 pc', 40, 60, '4.5', '200', 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300&h=300&fit=crop', '33% OFF', 0, 1, 'High quality Fresh Cauliflower for your daily needs.'),
('Maggi 2-Minute Noodles', 'Snacks', '140 g', 28, 30, '4.8', '4500', 'https://images.unsplash.com/photo-1612966608967-302a632c02f0?w=300&h=300&fit=crop', '6% OFF', 1, 1, 'High quality Maggi 2-Minute Noodles for your daily needs.'),
('Farm Fresh Eggs', 'Dairy & Bakery', '6 pcs', 55, 60, '4.6', '215', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop', '8% OFF', 0, 1, 'High quality Farm Fresh Eggs for your daily needs.'),
('Aashirvaad Atta', 'Dals & Pulses', '5 kg', 210, 240, '4.7', '890', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop', '12% OFF', 0, 1, 'High quality Aashirvaad Atta for your daily needs.'),
('Haldiram''s Bhujia', 'Snacks', '400 g', 95, 105, '4.8', '750', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=300&fit=crop', '9% OFF', 1, 1, 'High quality Haldirams Bhujia for your daily needs.'),
('Pampers Baby Wipes', 'Household', '72 pcs', 140, 180, '4.9', '1020', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop', '22% OFF', 1, 1, 'High quality Pampers Baby Wipes for your daily needs.'),
('Dhara Mustard Oil', 'Household', '1 L', 135, 150, '4.5', '320', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop', '10% OFF', 0, 1, 'High quality Dhara Mustard Oil for your daily needs.');

-- Seed Brands
TRUNCATE TABLE public.brands RESTART IDENTITY CASCADE;
INSERT INTO public.brands (name) VALUES 
('Amul Food'), 
('Tata Sampann'), 
('Nestle'), 
('Britannia'), 
('Aashirvaad'), 
('Maggi');

-- Seed Banners
TRUNCATE TABLE public.banners RESTART IDENTITY CASCADE;
INSERT INTO public.banners (badge, title, description, btntext, imgurl, target_category) VALUES 
('Super Deal!', 'Fresh Organic Veggies', 'Get up to 40% OFF on farm-fresh vegetables and fruits today.', 'Shop Now', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200', 'Vegetables'),
('Mega Offer!', 'Morning Fresh Milk', 'Pure and fresh milk delivered directly from local organic farms every morning.', 'Shop Now', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200', 'Dairy & Bakery');

-- Seed Special Offers
TRUNCATE TABLE public.special_offers RESTART IDENTITY CASCADE;
INSERT INTO public.special_offers (title, description, colorclass, target_category) VALUES 
('Festive Dhamaka', 'Buy 1 Get 1 Free on Sweets', 'bg-orange', 'Dairy & Bakery'),
('Health is Wealth', 'Flat 20% Off on Dry Fruits', 'bg-purple', 'Snacks');

-- Seed Coupons
TRUNCATE TABLE public.coupons RESTART IDENTITY CASCADE;
INSERT INTO public.coupons (code, discount_value, discount_type, min_amount, is_one_time, expiry_date) VALUES 
('WELCOME10', 10, 'percent', 0, 0, '2026-12-31 23:59:59+00'),
('FIRSTSAVE100', 100, 'fixed', 500, 1, '2026-12-31 23:59:59+00'),
('SURAJ10', 10, 'percent', 0, 0, '2026-12-31 23:59:59+00');
