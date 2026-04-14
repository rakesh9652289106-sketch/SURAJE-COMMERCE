require('dotenv').config();
const { supabase } = require('./supabaseClient');

async function getAdminCreds() {
    const { data, error } = await supabase.from('admin_users').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Admin Users:', data);
    }
}

getAdminCreds();
