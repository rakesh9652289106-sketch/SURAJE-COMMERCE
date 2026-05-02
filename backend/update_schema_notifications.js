require('dotenv').config();
const { supabase } = require('./supabaseClient');

async function updateSchema() {
    console.log("🚀 Updating Database Schema for Notifications...");

    console.log("Please ensure you run the following in your Supabase SQL Editor if columns are missing:");
    console.log(`
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_important INTEGER DEFAULT 0;
    `);

    // Check if column exists
    try {
        const { data, error } = await supabase.from('notifications').select('*').limit(1);
        if (!error && data && data.length > 0) {
            const columns = Object.keys(data[0]);
            if (columns.includes('is_important')) {
                console.log("✅ is_important already exists in notifications table.");
            } else {
                console.log("⚠️ is_important column is MISSING. Please run the SQL command above in Supabase.");
            }
        } else if (error) {
            console.error("❌ Error checking schema:", error.message);
        } else {
            console.log("ℹ️ Notifications table is empty, could not verify column existence automatically.");
        }
    } catch (err) {
        console.error("❌ Unexpected error:", err);
    }
}

updateSchema();
