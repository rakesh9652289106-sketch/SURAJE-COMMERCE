require('dotenv').config({ path: './backend/.env' });
const { supabase } = require('./backend/supabaseClient');

async function checkSchema() {
    console.log("Checking database schema for Loyalty System...");
    
    const { data: users, error: uErr } = await supabase.from('users').select('*').limit(1);
    if (uErr) console.error("Users table error:", uErr.message);
    else console.log("Users table columns:", Object.keys(users[0] || {}));

    const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(1);
    if (oErr) console.error("Orders table error:", oErr.message);
    else console.log("Orders table columns:", Object.keys(orders[0] || {}));

    const { data: settings, error: sErr } = await supabase.from('settings').select('*').limit(1);
    if (sErr) console.error("Settings table error:", sErr.message);
    else console.log("Settings table columns:", Object.keys(settings[0] || {}));
}

checkSchema();
