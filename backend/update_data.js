const { supabase } = require('./supabaseClient');

async function updateDB() {
    console.log("Updating Banners...");
    // Update Banner 1
    await supabase.from('banners').update({
        badge: "Super Deal!",
        title: "Fresh Organic Veggies",
        description: "Get up to 40% OFF on farm-fresh vegetables and fruits today.",
        btntext: "Shop Now"
    }).eq('id', 1).or('title.eq.Farm Fresh Vegetables'); // Best effort to update first one

    console.log("Updating Products...");
    // 1. Premium Toor Dal
    const { data: p1 } = await supabase.from('products').select('*').eq('name', 'Premium Toor Dal');
    if (!p1 || p1.length === 0) {
        await supabase.from('products').insert([{
            name: "Premium Toor Dal", category: "Atta, Rice & Dal", weight: "1 kg", 
            price: 180, originalprice: 220, rating: "4.8", reviews: "120", 
            imgurl: "https://images.unsplash.com/photo-1589131649983-4ec35f63d309?w=300", 
            discount: "18% OFF", is_available: 1, is_daily_essential: 1
        }]);
    } else {
         await supabase.from('products').update({
             discount: "18% OFF", originalprice: 220, price: 180, weight: "1 kg",
             variants: [
                 { weight: "500g", price: 95, originalprice: 115 },
                 { weight: "2kg", price: 350, originalprice: 430 }
             ]
         }).eq('name', 'Premium Toor Dal');
    }

    // 2. Fresh Red Apples
    const { data: p2 } = await supabase.from('products').select('*').eq('name', 'Fresh Red Apples');
    if (!p2 || p2.length === 0) {
        await supabase.from('products').insert([{
            name: "Fresh Red Apples", category: "Fruits", weight: "1 kg", 
            price: 150, originalprice: 180, rating: "4.9", reviews: "340", 
            imgurl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300", 
            discount: "16% OFF", is_available: 1, is_daily_essential: 1
        }]);
    }

    // 3. Organic Honey
    const { data: p3 } = await supabase.from('products').select('*').eq('name', 'Organic Honey');
    if (!p3 || p3.length === 0) {
        await supabase.from('products').insert([{
            name: "Organic Honey", category: "Daily Essentials", weight: "500 g", 
            price: 199, originalprice: 250, rating: "4.7", reviews: "89", 
            imgurl: "https://images.unsplash.com/photo-1587049352847-4d4b1437145b?w=300", 
            discount: "20% OFF", is_available: 1, is_daily_essential: 1
        }]);
    }

    // 4. Cashews (Kaju)
    const { data: p4 } = await supabase.from('products').select('*').eq('name', 'Cashews (Kaju)');
    if (!p4 || p4.length === 0) {
        await supabase.from('products').insert([{
            name: "Cashews (Kaju)", category: "Snacks", weight: "250 g", 
            price: 290, originalprice: 350, rating: "4.6", reviews: "156", 
            imgurl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300", 
            discount: "17% OFF", is_available: 1, is_daily_essential: 1
        }]);
    }

    // 5. Haldiram's Bhujia
    const { data: p5 } = await supabase.from('products').select('*').eq('name', "Haldiram's Bhujia");
    if (!p5 || p5.length === 0) {
        await supabase.from('products').insert([{
            name: "Haldiram's Bhujia", category: "Snacks", weight: "400 g", 
            price: 95, originalprice: 105, rating: "4.8", reviews: "750", 
            imgurl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300", 
            discount: "10% OFF", is_available: 1, is_trending: 1, is_daily_essential: 0
        }]);
    }

    // 6. Pampers Baby Wipes
    const { data: p6 } = await supabase.from('products').select('*').eq('name', "Pampers Baby Wipes");
    if (!p6 || p6.length === 0) {
        await supabase.from('products').insert([{
            name: "Pampers Baby Wipes", category: "Household Care", weight: "72 pcs", 
            price: 140, originalprice: 180, rating: "4.9", reviews: "1020", 
            imgurl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300", 
            discount: "22% OFF", is_available: 1, is_trending: 1, is_daily_essential: 0
        }]);
    }

    // Update Special Offers
     await supabase.from('special_offers').delete().neq('id', 0); // Delete existing
     await supabase.from('special_offers').insert([
        { title: "Festive Dhamaka", description: "Buy 1 Get 1 Free on Sweets", colorclass: "bg-orange", target_category: "Snacks" },
        { title: "Health is Wealth", description: "Flat 20% Off on Dry Fruits", colorclass: "bg-purple", target_category: "Fresh Vegetables" }
    ]);

    console.log("DB Updated Successfully!");
}
updateDB();
