const { supabase } = require('./supabaseClient');

async function seedCategories() {
    console.log("Starting Category Seed...");

    // 1. Clear existing categories
    console.log("Cleaning up old categories...");
    const { error: delErr } = await supabase.from('categories').delete().neq('id', 0);
    if (delErr) {
        console.error("Error deleting categories:", delErr);
        return;
    }

    // 2. Insert new categories
    const newCategories = [
        { name: "Deals", iconurl: "ph-tag" },
        { name: "Snacks", iconurl: "ph-cookie" },
        { name: "Dairy", iconurl: "ph-drop" },
        { name: "Salts & Sugar", iconurl: "ph-grains-fine" },
        { name: "Dry Fruits", iconurl: "ph-nut" },
        { name: "Household", iconurl: "ph-house-line" },
        { name: "Drinks", iconurl: "ph-beer-bottle" },
        { name: "Vegetables", iconurl: "ph-leaf" }
    ];

    console.log("Inserting new categories...");
    const { data, error: insErr } = await supabase.from('categories').insert(newCategories).select();
    if (insErr) {
        console.error("Error inserting categories:", insErr);
        return;
    }
    console.log(`Successfully added ${data.length} categories.`);

    // 3. Re-categorize products
    console.log("Updating products to match new categories...");
    
    // Mapping old categories to new ones
    // Dairy & Bread -> Dairy
    // Fresh Vegetables -> Vegetables
    // Fruits -> Vegetables (or I should have added Fruits? The user didn't mention Fruits but requested vegetables. I'll merge them into Vegetables for now or just keep them as Fruits if they want, but the list was specific).
    // Atta, Rice & Dal -> Salts & Sugar (closest match for grocery staples)
    
    const updates = [
        { old: 'Dairy & Bread', new: 'Dairy' },
        { old: 'Fresh Vegetables', new: 'Vegetables' },
        { old: 'Fruits', new: 'Vegetables' },
        { old: 'Atta, Rice & Dal', new: 'Salts & Sugar' }
    ];

    for (const mapping of updates) {
        const { error: updErr } = await supabase.from('products').update({ category: mapping.new }).eq('category', mapping.old);
        if (updErr) console.warn(`Failed to update ${mapping.old} to ${mapping.new}:`, updErr.message);
        else console.log(`Re-categorized ${mapping.old} -> ${mapping.new}`);
    }

    console.log("Category Seed and Re-categorization Complete!");
}

seedCategories();
