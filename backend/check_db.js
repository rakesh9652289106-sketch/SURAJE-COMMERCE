const { supabase } = require('./supabaseClient');

async function check() {
    console.log("🔍 Checking DB Content...");
    
    const { data: cats, error: e1 } = await supabase.from('categories').select('*');
    console.log("Categories count:", cats ? cats.length : 0, e1 || "");
    if (cats) console.log("First Category:", cats[0]);

    const { data: prods, error: e2 } = await supabase.from('products').select('*');
    console.log("Products count:", prods ? prods.length : 0, e2 || "");

    const { data: banners, error: e3 } = await supabase.from('banners').select('*');
    console.log("Banners count:", banners ? banners.length : 0, e3 || "");
}

check();
