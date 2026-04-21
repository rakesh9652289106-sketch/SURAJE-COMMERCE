const { supabase } = require('./supabaseClient');
const { hashPassword } = require('./routes/authRoute');

async function resetAdmin() {
    const newPassword = 'admin123';
    console.log(`🔐 Resetting Admin password to: ${newPassword}`);
    
    try {
        const hashedPassword = hashPassword(newPassword);
        
        const { data, error } = await supabase
            .from('admin_users')
            .update({ password: hashedPassword })
            .eq('phone', '1234567890')
            .select();

        if (error) {
            console.error("❌ Error resetting password:", error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log("✅ Admin password reset successfully!");
            console.log("👉 Login with:");
            console.log(`   Name: Admin User`);
            console.log(`   Phone: 1234567890`);
            console.log(`   Password: ${newPassword}`);
        } else {
            console.log("⚠️ Admin user not found.");
        }
    } catch (e) {
        console.error("❌ Execution error:", e.message);
    }
}

resetAdmin();
