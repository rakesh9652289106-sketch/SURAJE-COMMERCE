const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { verifyPassword, hashPassword } = require('./authRoute');

// Admin Auth Middleware
function checkAdminAuth(req, res, next) {
    next();
}

router.get('/check-setup', async (req, res) => {
    // Lock removed: setup is never required
    res.json({ setupRequired: false });
});

router.post('/setup', async (req, res) => {
    const { full_name, phone, password, security_q1, security_a1, security_q2, security_a2 } = req.body;
    if (!full_name || !phone || !password || !security_q1 || !security_a1 || !security_q2 || !security_a2) {
        return res.status(400).json({ error: "All fields are required." });
    }
    
    const { count, error } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    if (error) return res.status(500).json({ error: error.message });
    if (count > 0) return res.status(403).json({ error: "Admin already setup." });
    
    const pwdHash = hashPassword(password);
    const { error: insertError } = await supabase.from('admin_users').insert([{
        phone, full_name, password: pwdHash, security_q1, security_a1, security_q2, security_a2
    }]);

    if (insertError) return res.status(500).json({ error: "Failed to setup admin account" });
    res.cookie('admin_auth', 'true', { httpOnly: false, path: '/' });
    res.json({ message: "Admin account setup successfully." });
});

router.get('/check-session', async (req, res) => {
    // Lock removed: always authenticated
    res.json({ authenticated: true, exists: true });
});

router.post('/login', async (req, res) => {
    const { full_name, phone, password } = req.body;
    if (!full_name || !phone || !password) return res.status(400).json({ error: "Name, Phone and password required." });
    
    const { data: row, error } = await supabase.from('admin_users').select('*').eq('phone', phone).single();
    if (error || !row) return res.status(404).json({ error: "Admin not found." });

    if (row.full_name.toLowerCase().trim() !== full_name.toLowerCase().trim()) {
        return res.status(401).json({ error: "Name and Phone Number combination is incorrect." });
    }
    
    if (verifyPassword(password, row.password)) {
        res.cookie('admin_auth', 'true', { httpOnly: false, path: '/' });
        res.json({ message: "Admin authenticated successfully." });
    } else {
        res.status(401).json({ error: "Invalid password." });
    }
});

router.post('/recovery/initiate', async (req, res) => {
    const { name, phone } = req.body;
    const { data: user, error } = await supabase.from('admin_users').select('full_name, security_q1, security_q2').eq('phone', phone).single();
    
    if (error || !user) return res.status(404).json({ error: "Admin phone not found." });
    
    if (!name || user.full_name.toLowerCase().trim() !== name.toLowerCase().trim()) {
        return res.status(401).json({ error: "Name and Phone combination is incorrect." });
    }
    
    if (!user.security_q1 || !user.security_q2) {
        return res.status(400).json({ error: "No security questions set. Please contact system owner." });
    }
    
    res.json({ questions: [user.security_q1, user.security_q2] });
});

router.post('/verify-security', async (req, res) => {
    const { phone, q1, a1, q2, a2 } = req.body;
    const { data: row, error } = await supabase.from('admin_users').select('id, security_a1, security_a2, security_q1, security_q2').eq('phone', phone).single();
    if (error || !row) return res.status(401).json({ error: "Invalid security answers." });
    
    if (row.security_q1 === q1 && row.security_q2 === q2 && 
        row.security_a1.toLowerCase() === a1.toLowerCase().trim() && 
        row.security_a2.toLowerCase() === a2.toLowerCase().trim()) {
        res.json({ success: true, admin_id: row.id });
    } else {
        res.status(401).json({ error: "Invalid security answers." });
    }
});

router.patch('/reset-password', async (req, res) => {
    const { admin_id, newPassword } = req.body;
    if (!admin_id || !newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Invalid request." });
    }
    
    const hashedPwd = hashPassword(newPassword);
    const { error } = await supabase.from('admin_users').update({ password: hashedPwd }).eq('id', admin_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Password reset successfully!" });
});

router.post('/logout', (req, res) => {
    res.clearCookie('admin_auth', { path: '/' });
    res.json({ message: "Admin logged out successfully." });
});

router.get('/dashboard/stats', checkAdminAuth, async (req, res) => {
    try {
        const stats = { totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalReviews: 0, unreadInquiries: 0, ordersToday: 0, ordersDelivered: 0 };
        const today = new Date().toISOString().split('T')[0];
        const start = `${today}T00:00:00.000Z`;
        const end = `${today}T23:59:59.999Z`;

        const [ordersData, productsCount, reviewsCount, messagesCount, todayStatus, deliveredStatus] = await Promise.all([
            supabase.from('orders').select('total'),
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('*', { count: 'exact', head: true }),
            supabase.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')
        ]);

        stats.totalOrders = ordersData.data?.length || 0;
        stats.totalRevenue = ordersData.data?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;
        stats.totalProducts = productsCount.count || 0;
        stats.totalReviews = reviewsCount.count || 0;
        stats.unreadInquiries = messagesCount.count || 0;
        stats.ordersToday = todayStatus.count || 0;
        stats.ordersDelivered = deliveredStatus.count || 0;

        res.json({ success: true, stats });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- SUPPORT MESSAGES (Moved from server.js) ---
router.get('/support-messages', async (req, res) => {
    const { date, search } = req.query;
    let query = supabase.from('support_messages').select('*');
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%,message.ilike.%${search}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/support-messages/:id', async (req, res) => {
    const { data, error } = await supabase.from('support_messages').select('*').eq('id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/support-messages/:id/read', async (req, res) => {
    const { error } = await supabase.from('support_messages').update({ status: 'read' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Message marked as read" });
});

router.patch('/support-messages/:id/reply', async (req, res) => {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: "Reply content is required." });
    const { error } = await supabase.from('support_messages').update({
        reply, status: 'replied', replied_at: new Date().toISOString()
    }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Reply sent successfully!" });
});

router.delete('/support-messages/:id', async (req, res) => {
    const { error } = await supabase.from('support_messages').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Message deleted successfully." });
});

router.post('/notifications', async (req, res) => {
    const { error } = await supabase.from('notifications').insert([{ message: req.body.message }]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Notification sent to Storefront!" });
});

router.get('/notifications/history', async (req, res) => {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.delete('/notifications/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Notification deleted" });
});

router.delete('/notifications/history', async (req, res) => {
    const { error } = await supabase.from('notifications').delete().neq('id', 0);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "History cleared." });
});

// Protect all below routes with admin auth
router.use(checkAdminAuth);

router.get('/reviews', async (req, res) => {
    const { date, search } = req.query;
    let query = supabase.from('reviews').select(`*, products!inner(name)`);
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    if (search) {
        query = query.or(`comment.ilike.%${search}%,products.name.ilike.%${search}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    // Map data to math old SQLite format
    const formattedData = data.map(r => ({
        ...r, product_name: r.products?.name
    }));
    res.json(formattedData);
});

router.delete('/reviews/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Review deleted successfully." });
});

router.patch('/settings/payments', async (req, res) => {
    const { card, cash, upi } = req.body;
    const { error } = await supabase.from('settings').update({
        pay_card_active: card ? 1 : 0, pay_cash_active: cash ? 1 : 0, pay_upi_active: upi ? 1 : 0
    }).eq('id', 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Payment methods updated!" });
});

router.patch('/settings/password', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
    }
    const hashedPwd = hashPassword(newPassword);
    // Since there's usually only 1 admin according to the flow
    const { error } = await supabase.from('admin_users').update({ password: hashedPwd }).neq('id', 0);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Admin password updated securely!" });
});

router.get('/orders', async (req, res) => {
    const { date, search } = req.query;
    let query = supabase.from('orders').select(`*, users!inner(username, email, phone, full_name)`);
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    if (search) {
        // Search by order ID (convert to string for ilike) or user name/phone
        query = query.or(`id.eq.${!isNaN(search)?search:-1},users.username.ilike.%${search}%,users.phone.ilike.%${search}%,address.ilike.%${search}%`);
    }
    const { data, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    const formattedData = data.map(o => ({
        ...o, 
        username: o.users?.username, 
        full_name: o.users?.full_name || 'Guest User',
        email: o.users?.email, 
        phone: o.users?.phone
    }));
    res.json(formattedData);
});

router.get('/orders/summary', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const start = `${today}T00:00:00.000Z`;
    const end = `${today}T23:59:59.999Z`;

    const [todayCount, deliveredCount] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')
    ]);

    res.json({
        ordersToday: todayCount.count || 0,
        totalDelivered: deliveredCount.count || 0
    });
});

router.patch('/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Order status updated" });
});

router.delete('/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Order deleted successfully" });
});

router.get('/payments', async (req, res) => {
    const { date } = req.query;
    let query = supabase.from('orders').select(`*, users!inner(username, full_name, phone)`);
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    const { data, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    const formatted = data.map(o => ({
        order_id: o.id,
        username: o.users?.username || 'Guest',
        full_name: o.users?.full_name || 'Guest User',
        phone: o.users?.phone || '',
        amount: o.total,
        method: o.payment_method,
        created_at: o.created_at
    }));
    res.json(formatted);
});

router.patch('/orders/:id/payment-status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    let updates = { payment_status: status };
    if (status === 'received') updates.status = 'received';

    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Payment and Order status updated" });
});

router.put('/products/:id', async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };
    const { error } = await supabase.from('products').update(data).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Product updated successfully" });
});

router.post('/products', async (req, res) => {
    const data = { ...req.body };
    const { data: newRow, error } = await supabase.from('products').insert([data]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Product added!", productId: newRow.id });
});

router.patch('/products/:id/:field', async (req, res) => {
    // fields: availability, trending, essential
    const { id, field } = req.params;
    const updateKey = field === 'availability' ? 'is_available' : field === 'trending' ? 'is_trending' : 'is_daily_essential';
    const val = req.body[updateKey];
    
    if (val === undefined) return res.status(400).json({ error: "Invalid field" });

    const { error } = await supabase.from('products').update({ [updateKey]: val }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Product ${field} status updated` });
});

router.get('/settings', async (req, res) => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/settings', async (req, res) => {
    const data = { ...req.body };
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "No fields to update" });
    
    const { error } = await supabase.from('settings').update(data).eq('id', 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Settings updated successfully" });
});

router.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Product deleted successfully" });
});

// Promotion Management
router.put('/banners/:id', async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };
    const { error } = await supabase.from('banners').update(data).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Banner updated successfully" });
});

router.put('/special-offers/:id', async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };
    const { error } = await supabase.from('special_offers').update(data).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Special offer updated successfully" });
});

// Category Management
router.post('/categories', async (req, res) => {
    const { name, iconurl } = req.body;
    if (!name) return res.status(400).json({ error: "Category name required" });
    const { data: newRow, error } = await supabase.from('categories').insert([{ name, iconurl }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Category added!", category: newRow });
});

router.put('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name, iconurl } = req.body;
    const { error } = await supabase.from('categories').update({ name, iconurl }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Category updated successfully" });
});

router.delete('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Category deleted successfully" });
});

// Brand Management
router.get('/brands', async (req, res) => {
    const { data, error } = await supabase.from('brands').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/brands', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Brand name required" });
    const { data: newRow, error } = await supabase.from('brands').insert([{ name }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Brand added!", brand: newRow });
});

router.delete('/brands/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Brand deleted successfully" });
});

// --- COUPON MANAGEMENT ---
router.get('/coupons', async (req, res) => {
    const { date } = req.query;
    let query = supabase.from('coupons').select('*');
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('expiry_date', start).lte('expiry_date', end);
    }
    const { data: coupons, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    // Fetch usage counts
    const { data: usageData } = await supabase.from('coupon_usage').select('coupon_id');
    const usageMap = (usageData || []).reduce((acc, curr) => {
        acc[curr.coupon_id] = (acc[curr.coupon_id] || 0) + 1;
        return acc;
    }, {});

    const formatted = coupons.map(c => ({
        ...c, useCount: usageMap[c.id] || 0
    }));
    res.json(formatted);
});

router.get('/coupons/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const start = `${today}T00:00:00.000Z`;
        const end = `${today}T23:59:59.999Z`;

        const [totalUsage, totalOrders, todayUsage, todayOrders] = await Promise.all([
            supabase.from('coupon_usage').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('discount_amount').gt('discount_amount', 0),
            supabase.from('coupon_usage').select('*', { count: 'exact', head: true }).gte('used_at', start).lte('used_at', end),
            supabase.from('orders').select('discount_amount').gte('created_at', start).lte('created_at', end).gt('discount_amount', 0)
        ]);

        res.json({
            totalUses: totalUsage.count || 0,
            totalSaved: totalOrders.data?.reduce((acc, o) => acc + (o.discount_amount || 0), 0) || 0,
            todayUses: todayUsage.count || 0,
            todaySaved: todayOrders.data?.reduce((acc, o) => acc + (o.discount_amount || 0), 0) || 0
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/coupons', async (req, res) => {
    const { error } = await supabase.from('coupons').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Coupon created successfully" });
});

router.delete('/coupons/:id', async (req, res) => {
    const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Coupon deleted successfully" });
});

// --- SUPPORT MESSAGES ---
router.get('/support-messages', async (req, res) => {
    const { data, error } = await supabase.from('support_messages').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/support-messages/:id', async (req, res) => {
    const { data, error } = await supabase.from('support_messages').select('*').eq('id', req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/support-messages/:id/read', async (req, res) => {
    const { error } = await supabase.from('support_messages').update({ status: 'read' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Marked as read" });
});

router.patch('/support-messages/:id/reply', async (req, res) => {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: "Reply content required" });
    const { error } = await supabase.from('support_messages').update({ reply, status: 'replied' }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Reply sent successfully" });
});

router.delete('/support-messages/:id', async (req, res) => {
    const { error } = await supabase.from('support_messages').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Message deleted" });
});

// --- USER MANAGEMENT ---
router.get('/users', async (req, res) => {
    const { search, date } = req.query;
    let query = supabase.from('users').select('*');
    
    if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    
    const { data: users, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(users);
});

router.patch('/users/:id/status', async (req, res) => {
    const { status } = req.body;
    const { error } = await supabase.from('users').update({ status }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `User status updated to ${status}` });
});

router.delete('/users/:id', async (req, res) => {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "User account deleted permanently" });
});

router.delete('/notifications/:id', async (req, res) => {
    const { error } = await supabase.from('notifications').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Deleted" });
});

module.exports = router;
