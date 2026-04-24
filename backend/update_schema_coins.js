const { supabase } = require('./supabaseClient');

async function updateSchema() {
    console.log("🚀 Updating database schema for Suraj Coins...");

    // 1. Add coins column to users
    const { error: e1 } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE users ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 0;"
    });
    if (e1) console.error("Error adding coins to users:", e1.message);

    // 2. Add coin settings to settings table
    const { error: e2 } = await supabase.rpc('execute_sql', {
        sql_query: `
            ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_reward_rate INTEGER DEFAULT 1000;
            ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_reward_amount INTEGER DEFAULT 30;
            ALTER TABLE settings ADD COLUMN IF NOT EXISTS coin_value_per_rupee INTEGER DEFAULT 10;
            ALTER TABLE settings ADD COLUMN IF NOT EXISTS coins_system_active INTEGER DEFAULT 1;
        `
    });
    if (e2) console.error("Error adding coin settings:", e2.message);

    // 3. Add coin tracking to orders
    const { error: e3 } = await supabase.rpc('execute_sql', {
        sql_query: `
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_earned INTEGER DEFAULT 0;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_used INTEGER DEFAULT 0;
        `
    });
    if (e3) console.error("Error adding coin tracking to orders:", e3.message);

    console.log("✅ Schema update finished (check errors above if any).");
}

updateSchema();
