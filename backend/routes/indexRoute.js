const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

router.get('/coupons', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .gte('expiry_date', `${today}T00:00:00.000Z`);
        
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/coupons/validate', async (req, res) => {
    const { code, subtotal } = req.body;
    const userId = req.cookies.user_id;

    try {
        if (!code) return res.status(400).json({ error: "Coupon code required" });

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .ilike('code', code) // Case-insensitive
            .single();

        if (error || !coupon) {
            return res.status(404).json({ error: "Invalid coupon code." });
        }

        // 1. Expiry Check
        const now = new Date();
        if (new Date(coupon.expiry_date) < now) {
            return res.status(400).json({ error: "This coupon has expired." });
        }

        // 2. Minimum Amount Check
        if (subtotal < coupon.min_amount) {
            return res.status(400).json({ error: `Minimum purchase of ₹${coupon.min_amount} required for this coupon.` });
        }

        // 3. One-Time Use Check
        if (coupon.is_one_time && userId) {
            const { data: usage, error: usageError } = await supabase
                .from('coupon_usage')
                .select('id')
                .eq('user_id', userId)
                .eq('coupon_id', coupon.id)
                .limit(1);

            if (!usageError && usage && usage.length > 0) {
                return res.status(400).json({ error: "You have already used this coupon once." });
            }
        }

        // Calculate discount for frontend preview
        let discount_value = coupon.discount_value;
        if (coupon.discount_type === 'percent') {
            discount_value = Math.round((subtotal * coupon.discount_value) / 100);
        }
        
        res.json({
            id: coupon.id,
            code: coupon.code,
            discount_value: Math.min(discount_value, subtotal),
            discount_type: coupon.discount_type,
            original_value: coupon.discount_value
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/brands', async (req, res) => {
    const { data, error } = await supabase.from('brands').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/banners', async (req, res) => {
    const { data, error } = await supabase.from('banners').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/special-offers', async (req, res) => {
    const { data, error } = await supabase.from('special_offers').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/settings', async (req, res) => {
    const { data, error } = await supabase.from('settings').select('*').order('id', { ascending: true }).limit(1).single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.json({});
    // Map shop_image -> shop_image (already matches)
    res.json(data);
});

router.post('/support/messages', async (req, res) => {
    const userId = req.cookies.user_id || null;
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    // In node, undefined becomes null for integers in supabase
    const insertData = { name, email, subject: subject || 'No Subject', message, status: 'unread' };
    if (userId) insertData.user_id = userId;

    const { data, error } = await supabase.from('support_messages').insert([insertData]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Message sent! We will get back to you soon.", messageId: data.id });
});

router.post('/reviews', async (req, res) => {
    const username = req.cookies.username;
    if (!username) return res.status(401).json({ error: "Please log in to leave a review." });

    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating || !comment) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const { data, error } = await supabase.from('reviews').insert([{
        product_id, username, rating, comment
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Review submitted successfully!", reviewId: data.id });
});

router.post('/orders', async (req, res) => {
    const userId = req.cookies.user_id || null;
    let { items, paymentMethod, address, couponId, deliveryType } = req.body;

    let subtotal = 0;
    try {
        if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });
        items.forEach(item => {
            subtotal += (item.price * item.quantity);
        });
    } catch (e) { return res.status(400).json({ error: "Invalid items" }); }

    let finalTotal = subtotal;

    if (couponId) {
        const { data: coupon, error } = await supabase.from('coupons').select('*').eq('id', couponId).single();
        if (!error && coupon) {
            let discount = 0;
            if (coupon.discount_type === 'percent') {
                discount = (subtotal * coupon.discount_value) / 100;
            } else {
                discount = coupon.discount_value;
            }
            finalTotal = Math.max(0, subtotal - discount);
            return await saveOrder(finalTotal, coupon.id);
        }
    }
    return await saveOrder(finalTotal);

    async function saveOrder(calculatedTotal, confirmedCouponId = null) {
        const discountAmount = Math.round(subtotal - calculatedTotal);

        const insertData = {
            total: Math.round(calculatedTotal),
            items: items, // Supabase handles JSON arrays directly
            payment_method: paymentMethod,
            address: address,
            discount_amount: discountAmount,
            delivery_type: deliveryType || 'Home Delivery'
        };
        if (userId) insertData.user_id = userId;

        const { data, error } = await supabase.from('orders').insert([insertData]).select().single();
        if (error) return res.status(500).json({ error: error.message });

        if (confirmedCouponId && userId) {
            await supabase.from('coupon_usage').insert([{ user_id: userId, coupon_id: confirmedCouponId }]);
        }
        res.status(201).json({ message: "Order placed successfully!", orderId: data.id });
    }
});

router.get('/reviews/recent', async (req, res) => {
    // Fetch latest 6 reviews with product names
    const { data, error } = await supabase
        .from('reviews')
        .select(`
            *,
            products (name)
        `)
        .order('created_at', { ascending: false })
        .limit(6);
    
    if (error) return res.status(500).json({ error: error.message });
    
    const formatted = data.map(r => ({
        ...r,
        product_name: r.products?.name || 'Product'
    }));
    res.json(formatted);
});

router.get('/notifications/history', async (req, res) => {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) return res.status(500).json({ error: error.message });
    
    if (data.length === 0) {
        return res.json([{
            id: 1,
            message: "Welcome to SURAJ! Enjoy fresh groceries delivered to your doorstep.",
            created_at: new Date().toISOString()
        }]);
    }
    res.json(data);
});



module.exports = router;
