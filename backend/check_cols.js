const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { supabase } = require('./supabaseClient');

async function checkColumns() {
    console.log("🔍 Checking Users, Orders, and Coupons table structures...");
    
    const tables = ['users', 'orders', 'coupons', 'settings', 'products'];
    
    for (const table of tables) {
        console.log(`\nTable: ${table}`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns found:`, Object.keys(data[0]));
        } else {
            console.log(`No data found in ${table}, cannot determine columns via select.`);
        }
    }
}

checkColumns();
