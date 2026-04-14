const { supabase } = require('./supabaseClient');
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

async function ensureAdmin() {
    console.log("🛠️  Ensuring Permanent Admin 'Suresh'...");

    const adminData = {
        full_name: "SURESH",
        phone: "9490229108",
        username: "9490229108",
        password: hashPassword("SURAJ524004"),
        security_q1: "Birth related question",
        security_a1: "AMMA".toLowerCase(),
        security_q2: "School related question",
        security_a2: "NANNA".toLowerCase(),
        status: "active",
        language: "en"
    };

    // Check if user exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', adminData.phone)
        .single();

    if (existingUser) {
        console.log("Updating existing Admin Suresh...");
        const { error } = await supabase
            .from('users')
            .update(adminData)
            .eq('id', existingUser.id);
        
        if (error) console.error("Update failed:", error);
        else console.log("✅ Admin Suresh updated successfully.");
    } else {
        console.log("Creating Admin Suresh...");
        const { error } = await supabase
            .from('users')
            .insert([adminData]);
        
        if (error) console.error("Creation failed:", error);
        else console.log("✅ Admin Suresh created successfully.");
    }
}

ensureAdmin().catch(console.error);
