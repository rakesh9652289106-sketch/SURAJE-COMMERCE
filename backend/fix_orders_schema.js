const { supabase } = require('./supabaseClient');

async function fixSchema() {
    console.log("🚀 Fixing orders table schema...");

    const queries = [
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id);",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS daily_seq INTEGER DEFAULT 1;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'Home Delivery';"
    ];

    for (const sql of queries) {
        console.log(`Running: ${sql}`);
        const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
        if (error) {
            console.error(`❌ Error running query: ${error.message}`);
        } else {
            console.log(`✅ Success`);
        }
    }

    console.log("✅ Schema fix complete.");
}

fixSchema();
