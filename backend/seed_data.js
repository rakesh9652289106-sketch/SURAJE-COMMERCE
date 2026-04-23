const { supabase } = require('./supabaseClient');

async function seed() {
    console.log("🌱 Starting Final Case-Aligned Seed...");

    // 1. Categories (Schema use lowercase iconurl)
    const categories = [
        { name: "Fresh Vegetables", iconUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100" },
        { name: "Fruits", iconUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=100" },
        { name: "Dairy & Bread", iconUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100" },
        { name: "Snacks", iconUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=100" },
        { name: "Atta, Rice & Dal", iconUrl: "https://images.unsplash.com/photo-1589131649983-4ec35f63d309?w=100" }
    ];

    for (const cat of categories) {
        const { data: exists } = await supabase.from('categories').select('*').eq('name', cat.name);
        if (!exists || exists.length === 0) {
            console.log(`Adding category: ${cat.name}`);
            await supabase.from('categories').insert([cat]);
        }
    }

    // 2. Banners (Schema uses lowercase imgurl, btntext)
    const banners = [
        { 
            badge: "UP TO 50% OFF",
            title: "Farm Fresh Vegetables", 
            description: "Direct from farms to your kitchen within 15 minutes.", 
            btnText: "Shop Now",
            imgUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200", 
            target_category: "Fresh Vegetables"
        },
        { 
            badge: "MORNING FRESH",
            title: "Pure Dairy Products", 
            description: "Milk, Butter & Bread delivered fresh every morning.", 
            btnText: "Order Now",
            imgUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200",
            target_category: "Dairy & Bread"
        }
    ];

    for (const b of banners) {
        const { data: exists } = await supabase.from('banners').select('*').eq('title', b.title);
        if (!exists || exists.length === 0) {
            console.log(`Adding banner: ${b.title}`);
            await supabase.from('banners').insert([b]);
        }
    }

    // 3. Products (Schema: imgurl, originalprice)
    const products = [
        { 
            name: "Fresh Tomato", category: "Fresh Vegetables", weight: "1 kg", price: 40, originalPrice: 60, 
            rating: "4.5", reviews: "2.4k", imgUrl: "https://images.unsplash.com/photo-1518977676601-b53f02bad67b?w=300", 
            discount: "33% OFF", is_available: 1, is_daily_essential: 1 
        },
        { 
            name: "Red Onion", category: "Fresh Vegetables", weight: "1 kg", price: 35, originalPrice: 50, 
            rating: "4.8", reviews: "5.1k", imgUrl: "https://images.unsplash.com/photo-1508747703725-7197771375a0?w=300", 
            discount: "30% OFF", is_available: 1, is_daily_essential: 1 
        },
        { 
            name: "Amul Gold Milk", category: "Dairy & Bread", weight: "500 ml", price: 33, originalPrice: 33, 
            rating: "4.9", reviews: "12k", imgUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300", 
            discount: null, is_available: 1, is_daily_essential: 1,
            variants: [
                { weight: "1 Litre", price: 65, originalprice: 66 },
                { weight: "250 ml", price: 18, originalprice: 18 }
            ]
        },
        { 
            name: "Brown Bread", category: "Dairy & Bread", weight: "400g", price: 45, originalPrice: 55, 
            rating: "4.6", reviews: "1.2k", imgUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300", 
            discount: "18% OFF", is_available: 1, is_daily_essential: 1 
        },
        { 
            name: "Lays Classic Party Pack", category: "Snacks", weight: "120g", price: 50, originalPrice: 60, 
            rating: "4.7", reviews: "8.5k", imgUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300", 
            discount: "16% OFF", is_available: 1, is_trending: 1 
        }
    ];

    for (const p of products) {
        const { data: exists } = await supabase.from('products').select('*').eq('name', p.name);
        if (!exists || exists.length === 0) {
            console.log(`Adding product: ${p.name}`);
            await supabase.from('products').insert([p]);
        }
    }

    console.log("✅ Final Seed Complete!");
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
});
