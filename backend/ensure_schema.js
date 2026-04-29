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

    // 2. Check orders columns
    const { data: orderData, error: orderError } = await supabase.from('orders').select('*').limit(1);
    const orderColumns = orderData && orderData.length > 0 ? Object.keys(orderData[0]) : [];
    console.log("Current columns in 'orders':", orderColumns);

    if (!orderColumns.includes('delivery_type')) {
        console.log("❌ Column 'delivery_type' is missing in 'orders' table!");
        console.log("👉 PLEASE RUN THIS SQL IN YOUR SUPABASE SQL EDITOR:");
        console.log("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'Home Delivery';");
    }

    if (!orderColumns.includes('discount_amount')) {
        console.log("⚠️ Column 'discount_amount' is missing in 'orders' table.");
        console.log("👉 PLEASE RUN THIS SQL:");
        console.log("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;");
    }

    if (!orderColumns.includes('daily_seq')) {
        console.log("⚠️ Column 'daily_seq' is missing in 'orders' table.");
        console.log("👉 PLEASE RUN THIS SQL:");
        console.log("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS daily_seq INTEGER DEFAULT 1;");
    }

    if (!orderColumns.includes('coupon_id')) {
        console.log("❌ Column 'coupon_id' is missing in 'orders' table!");
        console.log("👉 PLEASE RUN THIS SQL IN YOUR SUPABASE SQL EDITOR:");
        console.log("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES public.coupons(id);");
    }

    // Check sessions/auth setup
    const { count: adminCount } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    console.log("Total Admin Users:", adminCount);
    
    console.log("✅ Schema check complete. Please ensure you have run the suggested SQL commands if warnings appeared.");
}

ensureSchema();
