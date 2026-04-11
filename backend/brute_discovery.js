const { supabase } = require('./supabaseClient');

async function discover() {
    console.log("🕵️ Brute Force Column Discovery...");

    // 1. Fetch one row (if any) or check metadata
    const { data, error } = await supabase.from('categories').select('*').limit(1);
    
    if (error) {
        console.error("Fetch Error:", error);
    } else if (data && data.length > 0) {
        console.log("Found a row! Keys:", Object.keys(data[0]));
    } else {
        console.log("Categories table is empty. Trying to guess column names...");
        
        const guesses = ['icon_url', 'icon', 'iconurl', 'image', 'img'];
        for (const g of guesses) {
            const { error: gErr } = await supabase.from('categories').select(g).limit(0);
            if (!gErr) {
                console.log(`✅ Column found: ${g}`);
            } else {
                console.log(`❌ Column NOT found: ${g}`);
            }
        }
    }

    // 2. Check Products
    const { data: pData, error: pError } = await supabase.from('products').select('*').limit(1);
    if (pData && pData.length > 0) {
        console.log("Found product! Keys:", Object.keys(pData[0]));
    } else {
        console.log("Products table is empty. Guessing product image column...");
        const pGuesses = ['img_url', 'image_url', 'imgurl', 'image', 'img'];
        for (const g of pGuesses) {
            const { error: gErr } = await supabase.from('products').select(g).limit(0);
            if (!gErr) console.log(`✅ Product Column found: ${g}`);
        }
    }
}

discover();
