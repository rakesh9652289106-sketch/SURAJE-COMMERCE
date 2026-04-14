const { supabase } = require('./supabaseClient');

async function checkAdmins() {
    const { data, error } = await supabase.from('admins').select('*');
    if (error) {
        console.error('Error fetching admins:', error);
    } else {
        console.log('Admins:', data);
    }
}

checkAdmins();
