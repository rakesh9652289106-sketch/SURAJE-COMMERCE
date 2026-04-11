const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const crypto = require('crypto');

// Password Hashing Helpers
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === verifyHash;
}

// Basic Auth Endpoints
router.post('/register', async (req, res) => {
    const { full_name, phone, password, security_q1, security_a1, security_q2, security_a2 } = req.body;
    
    if (!full_name || !phone || !password || !security_q1 || !security_a1 || !security_q2 || !security_a2) {
        return res.status(400).json({ error: "All fields including security questions are required." });
    }

    const hashedPassword = hashPassword(password);
    
    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (existingUser) {
        return res.status(400).json({ error: "This mobile number is already registered." });
    }

    const { data, error } = await supabase.from('users').insert([{
        username: phone, full_name, phone, password: hashedPassword,
        security_q1, security_a1: security_a1.toLowerCase(),
        security_q2, security_a2: security_a2.toLowerCase()
    }]).select().single();

    if (error) {
        console.error("Registration error:", error);
        return res.status(400).json({ error: "Failed to register. " + error.message });
    }
    res.status(201).json({ id: data.id, username: phone, full_name: data.full_name });
});

router.post('/recovery/initiate', async (req, res) => {
    const { name, phone } = req.body;
    const { data: user, error } = await supabase.from('users').select('full_name, security_q1, security_q2').eq('phone', phone).single();
    
    if (error || !user) return res.status(404).json({ error: "Mobile number not found." });
    
    if (!name || user.full_name.toLowerCase() !== name.toLowerCase()) {
        return res.status(401).json({ error: "Name and Mobile Number combination is incorrect." });
    }
    
    if (!user.security_q1 || !user.security_q2) {
        return res.status(400).json({ error: "No security questions set for this account. Please contact support." });
    }
    
    res.json({ questions: [user.security_q1, user.security_q2] });
});

router.post('/recovery/verify-answer', async (req, res) => {
    const { phone, questionIndex, answer } = req.body;
    const answerCol = questionIndex === 0 ? 'security_a1' : 'security_a2';
    
    const { data: user, error } = await supabase.from('users').select(answerCol).eq('phone', phone).single();
    if (error || !user) return res.status(404).json({ error: "User not found." });
    
    if (user[answerCol] === answer.toLowerCase()) {
        res.json({ message: "Answer correct." });
    } else {
        res.status(401).json({ error: "Incorrect answer." });
    }
});

router.post('/reset-password', async (req, res) => {
    const { phone, password, security_a1, security_a2 } = req.body;

    const { data: user, error } = await supabase.from('users').select('security_a1, security_a2').eq('phone', phone).single();
    if (error || !user) return res.status(404).json({ error: "User not found." });
    
    const providedA1 = security_a1 ? security_a1.toLowerCase() : null;
    const providedA2 = security_a2 ? security_a2.toLowerCase() : null;

    const isA1Correct = providedA1 && user.security_a1 === providedA1;
    const isA2Correct = providedA2 && user.security_a2 === providedA2;

    if (!isA1Correct && !isA2Correct) {
        return res.status(401).json({ error: "Identity verification failed. Correct answers are required." });
    }

    const hashedPassword = hashPassword(password);
    const { error: updateError } = await supabase.from('users').update({ password: hashedPassword }).eq('phone', phone);
    
    if (updateError) return res.status(500).json({ error: "Update failed." });
    res.json({ message: "Password reset successful!" });
});

router.post('/login', async (req, res) => {
    const { full_name, username, password } = req.body;
    
    if (!full_name || !username || !password) {
        return res.status(400).json({ error: "Full Name, Mobile Number, and Password are required." });
    }
    
    const { data: user, error } = await supabase.from('users').select('*').or(`username.eq.${username},phone.eq.${username}`).single();
    
    if (error || !user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials." });
    }

    // Verify Full Name
    if (user.full_name.toLowerCase().trim() !== full_name.toLowerCase().trim()) {
        return res.status(401).json({ error: "Name and Mobile Number combination is incorrect." });
    }
    
    if (user.status !== 'active') {
        return res.status(403).json({ error: "Account is inactive. Please contact support." });
    }

    res.cookie('user_id', user.id, { httpOnly: true });
    res.cookie('username', user.username);
    res.cookie('full_name', user.full_name);
    res.json({ message: "Login successful", username: user.username, full_name: user.full_name, language: user.language });
});

router.post('/logout', (req, res) => {
    res.clearCookie('user_id');
    res.clearCookie('username');
    res.clearCookie('full_name');
    res.json({ message: "Logged out" });
});

module.exports = { router, verifyPassword, hashPassword };
