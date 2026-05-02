const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { supabase } = require('./supabaseClient');

async function seedVariants() {
    console.log("🚀 Seeding Product Variants...");

    const variantProducts = [
        {
            name: "Toor Dal",
            variants: [
                { weight: "500g", price: 85, originalprice: 100 },
                { weight: "1kg", price: 160, originalprice: 180 },
                { weight: "2kg", price: 310, originalprice: 350 },
                { weight: "5kg", price: 750, originalprice: 850 }
            ]
        },
        {
            name: "Basmati Rice (Long Grain)",
            variants: [
                { weight: "1kg", price: 140, originalprice: 160 },
                { weight: "5kg", price: 650, originalprice: 800 },
                { weight: "10kg", price: 1250, originalprice: 1500 }
            ]
        },
        {
            name: "Pure Cow Ghee",
            variants: [
                { weight: "200ml", price: 150, originalprice: 180 },
                { weight: "500ml", price: 340, originalprice: 400 },
                { weight: "1L", price: 650, originalprice: 750 }
            ]
        },
        {
            name: "Refined White Sugar",
            variants: [
                { weight: "1kg", price: 45, originalprice: 50 },
                { weight: "5kg", price: 210, originalprice: 240 }
            ]
        }
    ];

    for (const vp of variantProducts) {
        console.log(`Updating ${vp.name} with ${vp.variants.length} variants...`);
        const { error } = await supabase
            .from('products')
            .update({ variants: vp.variants })
            .eq('name', vp.name);
        
        if (error) {
            console.error(`Error updating ${vp.name}:`, error.message);
        }
    }

    console.log("✅ Variants Seeding Complete!");
}

seedVariants().catch(console.error);
