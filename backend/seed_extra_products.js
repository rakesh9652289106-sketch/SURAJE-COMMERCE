const { supabase } = require('./supabaseClient');

async function expandCatalog() {
    console.log("🚀 Starting Catalog Expansion...");

    // 1. Harmonize Categories to match UI icons & expectations
    const targetCategories = [
        { name: 'Fresh Vegetables', iconUrl: 'ph-leaf' },
        { name: 'Fruits', iconUrl: 'ph-orange' },
        { name: 'Snacks & Drinks', iconUrl: 'ph-cookie' },
        { name: 'Household Care', iconUrl: 'ph-house-line' },
        { name: 'Dairy & Bakery', iconUrl: 'ph-cheese' },
        { name: 'Atta, Rice & Dal', iconUrl: 'ph-bowl-food' },
        { name: 'Oil, Ghee & Masala', iconUrl: 'ph-flask' },
        { name: 'Salts & Sugar', iconUrl: 'ph-bowl-food' }, // fallback icon
        { name: 'Deals', iconUrl: 'ph-tag' },
        { name: 'Dry Fruits', iconUrl: 'ph-nut' }
    ];

    console.log("Updating categories...");
    for (const cat of targetCategories) {
        const { data: exists } = await supabase.from('categories').select('*').eq('name', cat.name).single();
        if (!exists) {
            await supabase.from('categories').insert([cat]);
        } else {
            await supabase.from('categories').update({ iconUrl: cat.iconUrl }).eq('name', cat.name);
        }
    }

    // 2. Prepare expanded product list
    const products = [
        // Fresh Vegetables
        { name: "Organic Broccoli", category: "Fresh Vegetables", weight: "250g", price: 45, originalprice: 60, rating: "4.7", reviews: "1.2k", imgurl: "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=600", is_available: 1 },
        { name: "Sweet Corn", category: "Fresh Vegetables", weight: "2 units", price: 35, originalprice: 40, rating: "4.5", reviews: "800", imgurl: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600", is_available: 1 },
        { name: "Red Bell Pepper", category: "Fresh Vegetables", weight: "1 unit", price: 40, originalprice: 55, rating: "4.8", reviews: "2.1k", imgurl: "https://images.unsplash.com/photo-1563513307168-a51052f447f5?w=600", is_available: 1 },
        
        // Fruits
        { name: "Premium Bananas", category: "Fruits", weight: "6 units", price: 40, originalprice: 50, rating: "4.9", reviews: "15k", imgurl: "https://images.unsplash.com/photo-1571771894821-ad99026.jpg?w=600", imgurl: "https://plus.unsplash.com/premium_photo-1675731118330-08c71253af17?w=600", is_available: 1 },
        { name: "Red Delicious Apple", category: "Fruits", weight: "4 units", price: 120, originalprice: 150, rating: "4.6", reviews: "3.4k", imgurl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?w=600", is_available: 1 },
        { name: "Green Grapes", category: "Fruits", weight: "500g", price: 80, originalprice: 100, rating: "4.5", reviews: "1.1k", imgurl: "https://images.unsplash.com/photo-1537084642907-629340c7e59c?w=600", is_available: 1 },
        
        // Snacks & Drinks
        { name: "Coca Cola Classic", category: "Snacks & Drinks", weight: "750ml", price: 45, originalprice: 45, rating: "4.9", reviews: "20k", imgurl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600", is_available: 1 },
        { name: "Potato Chips - Blue", category: "Snacks & Drinks", weight: "100g", price: 30, originalprice: 35, rating: "4.7", reviews: "5.2k", imgurl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600", is_available: 1 },
        { name: "Orange Juice", category: "Snacks & Drinks", weight: "1L", price: 110, originalprice: 130, rating: "4.4", reviews: "2.3k", imgurl: "https://images.unsplash.com/photo-1557800636-894a64c1696f?w=600", is_available: 1 },

        // Dairy & Bakery
        { name: "Amul Butter", category: "Dairy & Bakery", weight: "100g", price: 56, originalprice: 56, rating: "5.0", reviews: "30k", imgurl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600", is_available: 1 },
        { name: "Greek Yogurt", category: "Dairy & Bakery", weight: "200g", price: 50, originalprice: 60, rating: "4.8", reviews: "4.5k", imgurl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600", is_available: 1 },
        { name: "Mozzarella Cheese", category: "Dairy & Bakery", weight: "200g", price: 180, originalprice: 200, rating: "4.7", reviews: "1.8k", imgurl: "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=600", is_available: 1 },

        // Atta, Rice & Dal
        { name: "Basmati Rice (Long Grain)", category: "Atta, Rice & Dal", weight: "5kg", price: 650, originalprice: 800, rating: "4.8", reviews: "6.7k", imgurl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600", is_available: 1 },
        { name: "Toor Dal", category: "Atta, Rice & Dal", weight: "1kg", price: 160, originalprice: 180, rating: "4.6", reviews: "2.4k", imgurl: "https://images.unsplash.com/photo-1585996853874-0570f80bc81d?w=600", is_available: 1 },
        { name: "Wheat Flour (Atta)", category: "Atta, Rice & Dal", weight: "10kg", price: 420, originalprice: 480, rating: "4.9", reviews: "15k", imgurl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600", is_available: 1 },

        // Household Care
        { name: "Liquid Detergent", category: "Household Care", weight: "1L", price: 210, originalprice: 250, rating: "4.7", reviews: "3.2k", imgurl: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600", is_available: 1 },
        { name: "Floor Cleaner", category: "Household Care", weight: "1L", price: 145, originalprice: 180, rating: "4.5", reviews: "1.5k", imgurl: "https://images.unsplash.com/photo-1581578731548-c64695ce6958?w=600", is_available: 1 },
        { name: "Kitchen Towels", category: "Household Care", weight: "2 units", price: 99, originalprice: 120, rating: "4.6", reviews: "4k", imgurl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600", is_available: 1 },
        
        // Oil, Ghee & Masala
        { name: "Pure Cow Ghee", category: "Oil, Ghee & Masala", weight: "500ml", price: 340, originalprice: 400, rating: "4.9", reviews: "10k", imgurl: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600", is_available: 1 },
        { name: "Sunflower Oil", category: "Oil, Ghee & Masala", weight: "1L", price: 140, originalprice: 170, rating: "4.5", reviews: "5.1k", imgurl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600", is_available: 1 },
        { name: "Turmeric Powder", category: "Oil, Ghee & Masala", weight: "200g", price: 45, originalprice: 60, rating: "4.8", reviews: "2.3k", imgurl: "https://images.unsplash.com/photo-1615485500704-8e990f3900f1?w=600", is_available: 1 },

        // Salts & Sugar
        { name: "Refined White Sugar", category: "Salts & Sugar", weight: "1kg", price: 45, originalprice: 50, rating: "4.7", reviews: "4.2k", imgurl: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600", is_available: 1 },
        { name: "Iodized Salt", category: "Salts & Sugar", weight: "1kg", price: 22, originalprice: 25, rating: "4.9", reviews: "11k", imgurl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600", is_available: 1 }
    ];

    console.log(`Inserting ${products.length} products...`);
    for (const p of products) {
        const { data: exists } = await supabase.from('products').select('*').eq('name', p.name).single();
        if (!exists) {
            console.log(`+ Adding: ${p.name}`);
            await supabase.from('products').insert([p]);
        } else {
            console.log(`~ Updating: ${p.name}`);
            await supabase.from('products').update(p).eq('name', p.name);
        }
    }

    console.log("✅ Catalog Expansion Complete!");
}

expandCatalog().catch(console.error);
