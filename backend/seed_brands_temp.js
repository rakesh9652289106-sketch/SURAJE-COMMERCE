const { supabase } = require('./supabaseClient');

async function seed() {
    console.log("Seeding brands...");
    const brands = [
        { name: "Mother Dairy" },
        { name: "Tata Sampann" },
        { name: "Amul Food" },
        { name: "Nestle" },
        { name: "Reliance Fresh" },
        { name: "Ashirvaad" }
    ];

    const { error: bErr } = await supabase.from('brands').insert(brands);
    if (bErr) console.error("Brand seed error:", bErr);
    else console.log("Brands seeded успешно!");

    console.log("Seeding sample products for brands...");
    const products = [
        { name: "Mother Dairy Full Cream Milk", price: 66, weight: "1L", category: "Dairy", imgurl: "https://images.unsplash.com/photo-1563636619-e9107da5a1bb?w=200", is_available: 1 },
        { name: "Tata Sampann Moong Dal", price: 120, weight: "1kg", category: "Pulses", imgurl: "https://images.unsplash.com/photo-1585994192701-f083a216552b?w=200", is_available: 1 },
        { name: "Amul Salted Butter", price: 54, weight: "100g", category: "Dairy", imgurl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200", is_available: 1 },
        { name: "Nestle Maggi Noodles", price: 15, weight: "70g", category: "Snacks", imgurl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200", is_available: 1 }
    ];

    const { error: pErr } = await supabase.from('products').insert(products);
    if (pErr) console.error("Product seed error:", pErr);
    else console.log("Sample products seeded successfully!");
}

seed();
