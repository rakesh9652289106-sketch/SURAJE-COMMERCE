const { supabase } = require('./supabaseClient');

async function debug() {
    console.log("🕵️ Schema Discovery...");
    
    // Check tables in public schema
    const { data: tables, error } = await supabase.from('categories').select('*').limit(0);
    if (error) {
        console.error("Categories Table Error:", error);
    } else {
        console.log("Categories table exists.");
    }

    // Try to get column names by selecting a non-existent column to see the suggestions
    const { error: colError } = await supabase.from('categories').select('non_existent_column');
    console.log("Hint from error:", colError?.hint || colError?.message);
}

debug();
