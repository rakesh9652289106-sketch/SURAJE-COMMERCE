const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Middleware to check if user is logged in
const checkUserAuth = (req, res, next) => {
    const userId = req.cookies.user_id;
    if (!userId) {
        return res.status(401).json({ error: "Please log in to continue." });
    }
    req.userId = userId;
    next();
};

router.use(checkUserAuth);

// 1. Profile Details
router.get('/profile', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if (error) return res.status(500).json({ error: error.message });
    delete data.password;
    res.json(data);
});

router.put('/profile', async (req, res) => {
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.password;
    delete updateData.username;
    delete updateData.created_at;

    const { error } = await supabase.from('users').update(updateData).eq('id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Profile updated successfully" });
});

// 2. Orders History
router.get('/orders', async (req, res) => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 3. Address Management
router.get('/addresses', async (req, res) => {
    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', req.userId)
        .order('is_default', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/addresses', async (req, res) => {
    try {
        const addr = { ...req.body, user_id: req.userId };
        
        // Ensure is_default is treated as an integer if it's not already
        if (typeof addr.is_default === 'boolean') {
            addr.is_default = addr.is_default ? 1 : 0;
        }

        // If setting as default, unset others first
        if (addr.is_default === 1) {
            await supabase.from('addresses').update({ is_default: 0 }).eq('user_id', req.userId);
        }

        const { data, error } = await supabase.from('addresses').insert([addr]).select().single();
        
        if (error) {
            console.error("Address save error:", error);
            return res.status(500).json({ error: "Database error: " + error.message });
        }
        
        res.status(201).json(data);
    } catch (err) {
        console.error("Address route error:", err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

router.patch('/addresses/:id/default', async (req, res) => {
    const { id } = req.params;
    // Unset current default
    await supabase.from('addresses').update({ is_default: 0 }).eq('user_id', req.userId);
    // Set this one as default
    const { error } = await supabase.from('addresses').update({ is_default: 1 }).eq('id', id).eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Default address updated" });
});

router.delete('/addresses/:id', async (req, res) => {
    const { error } = await supabase.from('addresses').delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Address deleted" });
});

// 4. Wishlist
router.get('/wishlist', async (req, res) => {
    const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
            id,
            product_id,
            products (*)
        `)
        .eq('user_id', req.userId);
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Flatten result to match products list
    const products = data.map(item => ({
        ...item.products,
        wishlist_id: item.id
    }));
    res.json(products);
});

router.post('/wishlist', async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: "Product ID required." });

    // Check if already in wishlist
    const { data: existing } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', req.userId)
        .eq('product_id', product_id)
        .single();
    
    if (existing) return res.json({ message: "Already in wishlist" });

    const { error } = await supabase
        .from('wishlist_items')
        .insert([{ user_id: req.userId, product_id }]);
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Added to wishlist" });
});

router.delete('/wishlist/:pid', async (req, res) => {
    const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('product_id', req.params.pid)
        .eq('user_id', req.userId);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Removed from wishlist" });
});

// 5. Inquiries & Activity
router.get('/inquiries', async (req, res) => {
    const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/activity', async (req, res) => {
    try {
        const { data: inquiries, error: inqError } = await supabase
            .from('support_messages')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (inqError) throw inqError;

        const combined = [];
        inquiries.forEach(i => {
            // Add the inquiry itself
            combined.push({
                ...i,
                type: 'support_inquiry',
                title: i.subject || 'Support Inquiry',
                message: i.message,
                date: i.created_at
            });

            // If there's a reply, add the reply as a separate activity item
            if (i.reply) {
                combined.push({
                    ...i,
                    type: 'support_reply',
                    title: i.subject || 'Support Reply',
                    message: i.reply,
                    date: i.replied_at || i.created_at
                });
            }
        });

        // Sort by date descending
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/coupons', async (req, res) => {
    // Return all valid coupons for now
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .gte('expiry_date', `${today}T00:00:00.000Z`);
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Check usage
    const { data: usage } = await supabase.from('coupon_usage').select('coupon_id').eq('user_id', req.userId);
    const usedIds = usage?.map(u => u.coupon_id) || [];

    const processed = data.map(c => ({
        ...c,
        used: usedIds.includes(c.id)
    }));

    res.json(processed);
});

router.get('/settings', async (req, res) => {
    const { data, error } = await supabase.from('users').select('language, order_reminders, sms_permissions, flash_sale_alerts').eq('id', req.userId).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/settings', async (req, res) => {
    const { error } = await supabase.from('users').update(req.body).eq('id', req.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Settings updated" });
});

module.exports = router;
