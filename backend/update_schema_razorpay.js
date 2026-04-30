require('dotenv').config();
const { supabase } = require('./supabaseClient');

async function updateSchema() {
    console.log("🚀 Updating Database Schema for Razorpay...");

    // Instead of using rpc, we'll try inserting dummy data into a new row to let PostgREST reflect the new schema 
    // or tell the user to manually run if this fails, but wait, Supabase REST API doesn't alter schema directly.
    // We should use an RPC if available, otherwise just log the SQL they must run.

    console.log("Since Supabase REST API cannot directly execute DDL commands securely, please ensure you run the following in your Supabase SQL Editor:");
    console.log(`
    ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT;
    ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS razorpay_secret TEXT;
    `);

    // Let's check if the columns exist
    const { data, error } = await supabase.from('settings').select('*').limit(1);
    if (!error && data && data.length > 0) {
        const columns = Object.keys(data[0]);
        if (columns.includes('razorpay_key_id') && columns.includes('razorpay_secret')) {
            console.log("✅ razorpay_key_id and razorpay_secret already exist in settings table.");
        } else {
            console.log("❌ columns missing. You MUST run the SQL above.");
        }
    }
}

updateSchema();
