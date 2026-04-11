const { supabase } = require('./supabaseClient');
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

async function setupSuresh() {
    const phone = '9490229108';
    const name = 'SURESH';
    const pass = 'SURAJ524004';
    const q1 = 'What is your birthplace?';
    const a1 = 'amma'; // as requested
    const q2 = 'What was the name of your first school?';
    const a2 = 'nanna'; // as requested

    const hashedPassword = hashPassword(pass);

    console.log(`Setting up user ${name} (${phone})...`);

    // Check if user exists
    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();

    if (existingUser) {
        console.log("User already exists, updating...");
        const { error } = await supabase.from('users').update({
            full_name: name,
            password: hashedPassword,
            security_q1: q1,
            security_a1: a1,
            security_q2: q2,
            security_a2: a2,
            status: 'active'
        }).eq('id', existingUser.id);
        if (error) console.error("Update Error:", error);
        else console.log("User Suresh updated successfully.");
    } else {
        console.log("Creating new user Suresh...");
        const { error } = await supabase.from('users').insert([{
            username: phone,
            full_name: name,
            phone,
            password: hashedPassword,
            security_q1: q1,
            security_a1: a1,
            security_q2: q2,
            security_a2: a2,
            status: 'active'
        }]);
        if (error) console.error("Insert Error:", error);
        else console.log("User Suresh created successfully.");
    }
}

setupSuresh();
