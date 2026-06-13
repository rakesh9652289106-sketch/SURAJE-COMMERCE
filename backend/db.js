const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const crypto = require('crypto');

// Password Hashing Helpers (Duplicate for DB init)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function initDb() {
    db.serialize(() => {
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);


        // Migration: Add new columns if they don't exist for existing users
        const userMigrations = [
            "ALTER TABLE users ADD COLUMN full_name TEXT",
            "ALTER TABLE users ADD COLUMN email TEXT",
            "ALTER TABLE users ADD COLUMN phone TEXT",
            "ALTER TABLE users ADD COLUMN profile_pic TEXT",
            "ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'",
            "ALTER TABLE users ADD COLUMN order_reminders INTEGER DEFAULT 1",
            "ALTER TABLE users ADD COLUMN sms_permissions INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN flash_sale_alerts INTEGER DEFAULT 1",
            "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'",
            "ALTER TABLE users ADD COLUMN security_q1 TEXT",
            "ALTER TABLE users ADD COLUMN security_a1 TEXT",
            "ALTER TABLE users ADD COLUMN security_q2 TEXT",
            "ALTER TABLE users ADD COLUMN security_a2 TEXT",
            "ALTER TABLE users ADD COLUMN gender TEXT",
            "ALTER TABLE users ADD COLUMN dob TEXT",
            "ALTER TABLE users ADD COLUMN alternate_phone TEXT",
            "ALTER TABLE users ADD COLUMN created_at DATETIME"
        ];
        userMigrations.forEach(query => db.run(query, (err) => { 
            if (!err && query.includes("created_at")) {
                db.run("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
            }
        }));


        // Create Admin Users Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            full_name TEXT,
            password TEXT,
            security_q1 TEXT,
            security_a1 TEXT,
            security_q2 TEXT,
            security_a2 TEXT
        )`);

        // Drop existing to re-seed cleanly
        db.run('DROP TABLE IF EXISTS categories');
        db.run('DROP TABLE IF EXISTS products');
        db.run('DROP TABLE IF EXISTS orders');
        db.run('DROP TABLE IF EXISTS banners');
        db.run('DROP TABLE IF EXISTS special_offers');
        db.run('DROP TABLE IF EXISTS brands');
        db.run('DROP TABLE IF EXISTS reviews');

        // Settings Table (Standardized Flat Schema)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            razorpay_key_id TEXT,
            razorpay_secret TEXT
        )`);

        // Migrations: Add marquee_text if it doesn't exist
        db.run("ALTER TABLE settings ADD COLUMN marquee_text TEXT", (err) => {});
        // Migration: Add shop_image if it doesn't exist (for existing databases)
        db.run("ALTER TABLE settings ADD COLUMN shop_image TEXT", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN allowed_pincodes TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN pincode_restriction_active INTEGER DEFAULT 1", (err) => {});

        // Seed default setting if empty
        db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO settings (shop_email, shop_phone, shop_address, shop_image, marquee_text, allowed_pincodes, pincode_restriction_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        'support@snapbasket.com', 
                        '+91 98765 43210', 
                        '123 Grocery Avenue, Mumbai, MH',
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
                        '⚡ FREE Delivery on orders above ₹500 | 🍎 Fresh Groceries delivered in 15-45 minutes! | 🎁 Use code WELCOME10 for 10% OFF!',
                        '524004,524003,524002,524001',
                        1
                    ]
                );
            } else {
                // Ensure existing settings get the default pincodes if empty initially
                db.run("UPDATE settings SET allowed_pincodes = '524004,524003,524002,524001', pincode_restriction_active = 1 WHERE allowed_pincodes IS NULL", (err) => {});
            }
        });

        // Seed Default User if empty
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding default user...");
                db.run("INSERT INTO users (username, password, full_name, email, phone, status) VALUES (?, ?, ?, ?, ?, ?)",
                    ['rakesh', hashPassword('rakesh123'), 'Rakesh Kumar', 'rakesh@example.com', '9876543210', 'active']
                );
            }
        });

        // Seed Default Admin if empty
        db.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding default admin...");
                db.run("INSERT INTO admin_users (phone, full_name, password, security_q1, security_a1, security_q2, security_a2) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        '9490229108',
                        'SURESH',
                        hashPassword('SURAJ524004'),
                        'Birth related question',
                        'amma',
                        'School related question',
                        'nanna'
                    ]
                );
            }
        });

        // 2. For Users
        db.all("SELECT id, password FROM users", (err, rows) => {
            if (rows) {
                rows.forEach(user => {
                    if (user.password && !user.password.includes(':')) {
                        console.log(`Migrating user ${user.id} password to hashed...`);
                        db.run("UPDATE users SET password = ? WHERE id = ?", [hashPassword(user.password), user.id]);
                    }
                });
            }
        });


        // Create Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            iconUrl TEXT
        )`);

        // Create Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            weight TEXT,
            price INTEGER,
            originalPrice INTEGER,
            rating TEXT,
            reviews TEXT,
            imgUrl TEXT,
            discount TEXT,
            stock_quantity INTEGER DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            is_trending INTEGER DEFAULT 0,
            is_daily_essential INTEGER DEFAULT 1,
            description TEXT
        )`);



        // Migration: Add necessary product status columns if they don't exist
        db.run("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE products ADD COLUMN is_available INTEGER DEFAULT 1", (err) => {});
        db.run("ALTER TABLE products ADD COLUMN is_trending INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE products ADD COLUMN is_daily_essential INTEGER DEFAULT 1", (err) => {});
        db.run("ALTER TABLE products ADD COLUMN description TEXT", (err) => {});


        // Create Notifications Table
        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Brands Table
        db.run(`CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);

        // Create Banners Table
        db.run(`CREATE TABLE IF NOT EXISTS banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            badge TEXT,
            title TEXT,
            description TEXT,
            btnText TEXT,
            imgUrl TEXT,
            target_category TEXT
        )`);

        // Create Special Offers Table
        db.run(`CREATE TABLE IF NOT EXISTS special_offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            colorClass TEXT,
            target_category TEXT
        )`);

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total INTEGER,
            items TEXT,
            payment_method TEXT,
            address TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add status and payment_status columns if they don't exist
        db.run("ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN discount_amount INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'Home Delivery'", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN coupon_id INTEGER", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN daily_seq INTEGER DEFAULT 1", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN coins_earned INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE orders ADD COLUMN coins_used INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN created_at DATETIME", (err) => {
            if (!err) db.run("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
        });
        db.run("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN coin_reward_rate INTEGER DEFAULT 1000", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN coin_reward_amount INTEGER DEFAULT 30", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN coin_value_per_rupee INTEGER DEFAULT 10", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN coins_system_active INTEGER DEFAULT 1", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN razorpay_key_id TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN razorpay_secret TEXT", (err) => {});



        // Create Support Messages Table

        db.run(`CREATE TABLE IF NOT EXISTS support_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            subject TEXT,
            message TEXT,
            reply TEXT,
            replied_at DATETIME,
            status TEXT DEFAULT 'unread',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add user_id, reply and replied_at columns to support_messages
        db.run("ALTER TABLE support_messages ADD COLUMN user_id INTEGER", (err) => {});
        db.run("ALTER TABLE support_messages ADD COLUMN reply TEXT", (err) => {});
        db.run("ALTER TABLE support_messages ADD COLUMN replied_at DATETIME", (err) => {});

        // Create Reviews Table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            username TEXT,
            rating INTEGER,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Create Addresses Table
        db.run(`CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            label TEXT,
            address_line TEXT,
            city TEXT,
            pincode TEXT,
            is_default INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create Coupons Table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            discount_value INTEGER,
            discount_type TEXT,
            min_amount INTEGER DEFAULT 0,
            expiry_date DATETIME
        )`);

        // Migration: Add min_amount and is_one_time to coupons if they don't exist
        db.run("ALTER TABLE coupons ADD COLUMN min_amount INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE coupons ADD COLUMN is_one_time INTEGER DEFAULT 0", (err) => {});

        // Create Coupon Usage Table
        db.run(`CREATE TABLE IF NOT EXISTS coupon_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            coupon_id INTEGER,
            used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (coupon_id) REFERENCES coupons(id)
        )`);


        // Create Wishlist Items Table
        db.run(`CREATE TABLE IF NOT EXISTS wishlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Force seed data by skipping the IF check for products and categories since we drop them
        console.log("Seeding Database...");

        
        const banner_url = 'file:///C:/Users/RAKESH%20KUMAR/.gemini/antigravity/brain/92924b03-a69a-4135-88ca-1fc6a0c096e1/promo_banner_1775136840249.png';

        const categories = [
            { name: "Dals & Pulses", iconUrl: "ph-bowl-food" },
            { name: "Snacks", iconUrl: "ph-cookie" },
            { name: "Dairy & Bakery", iconUrl: "ph-drop" },
            { name: "Fresh Fruits", iconUrl: "ph-apple-logo" },
            { name: "Dry Fruits", iconUrl: "ph-plant" },
            { name: "Household", iconUrl: "ph-house-line" },
            { name: "Drinks", iconUrl: "ph-brandy" },
            { name: "Vegetables", iconUrl: "ph-leaf" }
        ];

        const products = [
            { name: "Premium Toor Dal", category: "Dals & Pulses", weight: "1 kg", price: 180, originalPrice: 220, rating: "4.8", reviews: "120", imgUrl: "https://images.unsplash.com/photo-1589131649983-4ec35f63d309?w=300&h=300&fit=crop", discount: "18% OFF", is_trending: 1 },
            { name: "Fresh Red Apples", category: "Fresh Fruits", weight: "1 kg", price: 150, originalPrice: 180, rating: "4.9", reviews: "340", imgUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&h=300&fit=crop", discount: "16% OFF", is_trending: 1 },
            { name: "Organic Honey", category: "Household", weight: "500 g", price: 199, originalPrice: 250, rating: "4.7", reviews: "89", imgUrl: "https://images.unsplash.com/photo-1587049352847-4d4b1437145b?w=300&h=300&fit=crop", discount: "20% OFF", is_trending: 1 },
            { name: "Aashirvaad Salt", category: "Dals & Pulses", weight: "1 kg", price: 25, originalPrice: 28, rating: "4.5", reviews: "210", imgUrl: "https://images.unsplash.com/photo-1622484211148-525c34cb2e65?w=300&h=300&fit=crop", discount: "10% OFF", is_trending: 1 },
            { name: "Cashews (Kaju)", category: "Dry Fruits", weight: "250 g", price: 290, originalPrice: 350, rating: "4.6", reviews: "156", imgUrl: "https://images.unsplash.com/photo-1599587428807-6ad0c7ec44da?w=300&h=300&fit=crop", discount: "17% OFF", is_trending: 1 },
            { name: "Coca Cola Family Pack", category: "Drinks", weight: "2 L", price: 90, originalPrice: 95, rating: "4.2", reviews: "500", imgUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop", discount: "5% OFF" },
            { name: "Surf Excel Detergent", category: "Household", weight: "1 kg", price: 125, originalPrice: 140, rating: "4.8", reviews: "450", imgUrl: "https://images.unsplash.com/photo-1584820927498-cafe2c174360?w=300&h=300&fit=crop", discount: "10% OFF", is_trending: 1 },
            { name: "Lay's Classic", category: "Snacks", weight: "50 g", price: 20, originalPrice: 20, rating: "4.4", reviews: "100", imgUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=300&fit=crop", discount: "0% OFF" },
            { name: "Amul Taaza Milk", category: "Dairy & Bakery", weight: "1 L", price: 68, originalPrice: 70, rating: "4.9", reviews: "1200", imgUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=300&fit=crop", discount: "2% OFF" },
            { name: "Britannia Good Day", category: "Snacks", weight: "200 g", price: 30, originalPrice: 35, rating: "4.6", reviews: "890", imgUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop", discount: "14% OFF", is_trending: 1 },
            { name: "Tata Tea Gold", category: "Drinks", weight: "500 g", price: 290, originalPrice: 330, rating: "4.7", reviews: "600", imgUrl: "https://images.unsplash.com/photo-1594910243552-8700ab43e74a?w=300&h=300&fit=crop", discount: "12% OFF", is_trending: 1 },
            { name: "Fresh Onions", category: "Vegetables", weight: "1 kg", price: 40, originalPrice: 60, rating: "4.1", reviews: "300", imgUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&h=300&fit=crop", discount: "33% OFF" },
            { name: "Fresh Red Tomato", category: "Vegetables", weight: "1 kg", price: 50, originalPrice: 70, rating: "4.9", reviews: "850", imgUrl: "https://images.unsplash.com/photo-1590665416245-129683944414?w=300&h=300&fit=crop", discount: "28% OFF", is_trending: 1 },
            { name: "Green Chillies", category: "Vegetables", weight: "250 g", price: 20, originalPrice: 30, rating: "4.6", reviews: "120", imgUrl: "https://images.unsplash.com/photo-1588252210219-c9c31b21bc56?w=300&h=300&fit=crop", discount: "33% OFF" },
            { name: "Ginger (Adrak)", category: "Vegetables", weight: "250 g", price: 45, originalPrice: 60, rating: "4.8", reviews: "95", imgUrl: "https://images.unsplash.com/photo-1599940824399-b87987cb96a5?w=300&h=300&fit=crop", discount: "25% OFF" },
            { name: "Garlic (Lehsun)", category: "Vegetables", weight: "250 g", price: 60, originalPrice: 80, rating: "4.7", reviews: "110", imgUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", discount: "25% OFF" },
            { name: "Fresh Cauliflower", category: "Vegetables", weight: "1 pc", price: 40, originalPrice: 60, rating: "4.5", reviews: "200", imgUrl: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300&h=300&fit=crop", discount: "33% OFF" },
            { name: "Maggi 2-Minute Noodles", category: "Snacks", weight: "140 g", price: 28, originalPrice: 30, rating: "4.8", reviews: "4500", imgUrl: "https://via.placeholder.com/300/F8FAFC/FF0000?text=Maggi", discount: "6% OFF", is_trending: 1 },
            { name: "Farm Fresh Eggs", category: "Dairy & Bakery", weight: "6 pcs", price: 55, originalPrice: 60, rating: "4.6", reviews: "215", imgUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop", discount: "8% OFF" },
            { name: "Aashirvaad Atta", category: "Dals & Pulses", weight: "5 kg", price: 210, originalPrice: 240, rating: "4.7", reviews: "890", imgUrl: "https://via.placeholder.com/300/F8FAFC/F59E0B?text=Atta", discount: "12% OFF" },
            { name: "Haldiram's Bhujia", category: "Snacks", weight: "400 g", price: 95, originalPrice: 105, rating: "4.8", reviews: "750", imgUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=300&fit=crop", discount: "9% OFF", is_trending: 1 },
            { name: "Pampers Baby Wipes", category: "Household", weight: "72 pcs", price: 140, originalPrice: 180, rating: "4.9", reviews: "1020", imgUrl: "https://via.placeholder.com/300/F8FAFC/38BDF8?text=Wipes", discount: "22% OFF", is_trending: 1 },

            { name: "Dhara Mustard Oil", category: "Household", weight: "1 L", price: 135, originalPrice: 150, rating: "4.5", reviews: "320", imgUrl: "https://via.placeholder.com/300/F8FAFC/FBBF24?text=Oil", discount: "10% OFF", is_trending: 0 }
        ];
        
        const brands = ["Amul Food", "Tata Sampann", "Nestle", "Britannia", "Aashirvaad", "Maggi"];

        const insertCat = db.prepare('INSERT INTO categories (name, iconUrl) VALUES (?, ?)');
        categories.forEach(c => insertCat.run(c.name, c.iconUrl));
        insertCat.finalize();

        const insertProd = db.prepare('INSERT INTO products (name, category, weight, price, originalPrice, rating, reviews, imgUrl, discount, is_available, is_trending, is_daily_essential, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        products.forEach(p => insertProd.run(p.name, p.category, p.weight, p.price, p.originalPrice, p.rating, p.reviews, p.imgUrl, p.discount, 1, p.is_trending || 0, p.is_daily_essential ?? 1, p.description || `High quality ${p.name} for your daily needs.`));
        insertProd.finalize();


        // Seed product reviews
        db.run("INSERT INTO reviews (product_id, username, rating, comment) VALUES (?, ?, ?, ?)",
            [2, 'Rakesh Kumar', 5, 'Absolutely fresh! The best apples I have had in a long time.']
        );
        db.run("INSERT INTO reviews (product_id, username, rating, comment) VALUES (?, ?, ?, ?)",
            [9, 'Suman Sharma', 4, 'Very creamy and fresh milk. Delivery was super fast!']
        );

        const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)');
        brands.forEach(b => insertBrand.run(b));
        insertBrand.finalize();

        // Seed Banner
        db.run("INSERT INTO banners (badge, title, description, btnText, imgUrl, target_category) VALUES (?, ?, ?, ?, ?, ?)",
            ["Super Deal!", "Fresh Organic Veggies", "Get up to 40% OFF on farm-fresh vegetables and fruits today.", "Shop Now", "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200", "Vegetables"]
        );

        // Seed Special Offers
        const insertOffer = db.prepare('INSERT INTO special_offers (title, description, colorClass, target_category) VALUES (?, ?, ?, ?)');
        [
            { title: "Festive Dhamaka", description: "Buy 1 Get 1 Free on Sweets", colorClass: "bg-orange", target_category: "Dairy & Bakery" },
            { title: "Health is Wealth", description: "Flat 20% Off on Dry Fruits", colorClass: "bg-purple", target_category: "Snacks" }
        ].forEach(o => insertOffer.run(o.title, o.description, o.colorClass, o.target_category));
        insertOffer.finalize();

        // Seed Default Coupons
        db.run("INSERT OR IGNORE INTO coupons (code, discount_value, discount_type, expiry_date) VALUES (?, ?, ?, ?)",
            ['WELCOME10', 10, 'percent', '2026-12-31']
        );
        db.run("INSERT OR IGNORE INTO coupons (code, discount_value, discount_type, expiry_date) VALUES (?, ?, ?, ?)",
            ['FIRSTSAVE100', 100, 'fixed', '2026-12-31']
        );
        db.run("INSERT OR IGNORE INTO coupons (code, discount_value, discount_type, expiry_date) VALUES (?, ?, ?, ?)",
            ['SURAJ10', 10, 'percent', '2026-12-31']
        );

        // Seed Sample Order
        db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
            if (row && row.count === 0) {
                const sampleItems = JSON.stringify([
                    { name: "Premium Toor Dal", price: 180, quantity: 2 },
                    { name: "Fresh Red Apples", price: 150, quantity: 1 }
                ]);
                db.run("INSERT INTO orders (user_id, total, items, payment_method, address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [1, 510, sampleItems, 'COD', '402, 4th Floor, Skyline Residency, Mumbai', 'confirmed', new Date().toISOString()]
                );
            }
        });
    });
}

module.exports = { db, initDb };
