const { supabase } = require('./supabaseClient');

async function ensureSchema() {
    console.log("🚀 Syncing Database Schema...");

    // 1. Add variants column to products if missing
    // Since Supabase RPC or SQL injection via API is restricted, 
    // we use a trick: checking if we can select it, if not, we warn.
    // However, as an AI, I should recommend the user to run the SQL or I can try to use a migration script if available.
    
    // Check products columns
    const { data, error } = await supabase.from('products').select('*').limit(1);
    
    if (error) {
        console.error("❌ Error fetching products:", error.message);
        return;
    }

    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    console.log("Current columns in 'products':", columns);

    if (!columns.includes('variants')) {
        console.log("⚠️ Column 'variants' is missing in 'products' table.");
        console.log("👉 Please run the following SQL in Supabase SQL Editor:");
        console.log("ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB;");
    }

    if (!columns.includes('imgUrl') && columns.includes('imgurl')) {
        console.log("⚠️ Case sensitivity issue: 'imgurl' found instead of 'imgUrl'.");
        console.log("👉 Please run:");
        console.log("ALTER TABLE public.products RENAME COLUMN imgurl TO \"imgUrl\";");
    }

    // Check sessions/auth setup
    const { count: adminCount } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    console.log("Total Admin Users:", adminCount);
    
    console.log("Done checking.");
}

ensureSchema();
