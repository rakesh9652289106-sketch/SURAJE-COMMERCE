const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { verifyPassword, hashPassword } = require('./authRoute');

// Admin Auth Middleware
function checkAdminAuth(req, res, next) {
    if (req.cookies.admin_auth === 'true') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
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
    const { count, error } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    const exists = !error && count > 0;
    const authenticated = req.cookies.admin_auth === 'true';
    
    res.json({ authenticated, exists });
});

router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required." });
    
    // There is only one master admin, so we just check the password against the first admin record.
    // The unified form sends full_name and phone, but we ignore them for admin login to make it a true single login.
    const { data: adminList, error } = await supabase.from('admin_users').select('*').limit(1);
    
    if (error || !adminList || adminList.length === 0) return res.status(404).json({ error: "Admin not found." });

    const row = adminList[0];
    
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
        const { date } = req.query;
        const stats = { totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalReviews: 0, unreadInquiries: 0, ordersToday: 0, ordersDelivered: 0 };
        
        const filterDate = date || new Date().toISOString().split('T')[0];
        const start = `${filterDate}T00:00:00.000Z`;
        const end = `${filterDate}T23:59:59.999Z`;

        const orderFilter = 'payment_method.ilike.cash,payment_status.ilike.paid';
        const [ordersData, productsCount, reviewsCount, messagesCount, todayStatus, deliveredStatus] = await Promise.all([
            supabase.from('orders').select('total').or(orderFilter),
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('*', { count: 'exact', head: true }),
            supabase.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
            supabase.from('orders').select('*', { count: 'exact', head: true }).or(orderFilter).gte('created_at', start).lte('created_at', end),
            supabase.from('orders').select('*', { count: 'exact', head: true }).or(orderFilter).eq('status', 'delivered')
        ]);

        stats.totalOrders = ordersData.data?.length || 0;
        stats.totalRevenue = ordersData.data?.reduce((acc, o) => acc + (Number(o.total) || 0), 0) || 0;
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
    const { message, is_important } = req.body;
    let { error } = await supabase.from('notifications').insert([{ 
        message, 
        is_important: is_important ? 1 : 0 
    }]);

    // Defensive: If column is missing, retry without is_important
    if (error && (error.message.includes('is_important') || error.code === '42703')) {
        console.warn("Retrying notification without is_important column...");
        const retry = await supabase.from('notifications').insert([{ message }]);
        error = retry.error;
    }

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

router.patch('/security', checkAdminAuth, async (req, res) => {
    const { newPassword, full_name, phone, security_q1, security_a1, security_q2, security_a2 } = req.body;
    
    const updates = {};
    if (newPassword) {
        if (newPassword.length < 4) return res.status(400).json({ error: "Password too short" });
        updates.password = hashPassword(newPassword);
    }
    if (full_name) updates.full_name = full_name;
    if (phone) updates.phone = phone;
    if (security_q1) updates.security_q1 = security_q1;
    if (security_a1) updates.security_a1 = security_a1.toLowerCase().trim();
    if (security_q2) updates.security_q2 = security_q2;
    if (security_a2) updates.security_a2 = security_a2.toLowerCase().trim();

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No updates provided" });

    const { error } = await supabase.from('admin_users').update(updates).neq('id', 0);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Admin security credentials updated successfully!" });
});

router.get('/info', checkAdminAuth, async (req, res) => {
    const { data, error } = await supabase.from('admin_users').select('full_name, phone').limit(1);
    if (error || !data || data.length === 0) return res.status(404).json({ error: "Admin info not found." });
    res.json(data[0]);
});

router.get('/orders', async (req, res) => {
    const { date, search } = req.query;
    // By default, exclude cancelled orders from recent orders
    let query = supabase.from('orders').select(`*, users!inner(username, email, phone, full_name)`);
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    // Fetch all matching by date (or all if no date)
    const { data, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    // Only show successful online payments (Card, UPI, Wallet, etc.). Keep all Cash on Delivery.
    const validOrders = (data || []).filter(o => {
        const method = (o.payment_method || '').toLowerCase();
        const pStatus = (o.payment_status || '').toLowerCase();
        if (method === 'cash') return true;
        return pStatus === 'paid';
    });

    let formattedData = validOrders.map(o => ({
        ...o, 
        username: o.users?.username, 
        full_name: o.users?.full_name || 'Guest User',
        email: o.users?.email, 
        phone: o.users?.phone
    }));

    // Filter by search in Javascript to avoid complex PostgREST cross-table OR limitations
    if (search) {
        const s = search.toLowerCase();
        formattedData = formattedData.filter(o => 
            o.id.toString().includes(s) ||
            (o.full_name && o.full_name.toLowerCase().includes(s)) ||
            (o.username && o.username.toLowerCase().includes(s)) ||
            (o.phone && o.phone.includes(s)) ||
            (o.address && o.address.toLowerCase().includes(s))
        );
    }

    // Group by date to assign daily sequence numbers (1, 2, 3...)
    const dateGroups = {};
    const sorted = [...formattedData].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : 0;
        const dateB = b.created_at ? new Date(b.created_at) : 0;
        return dateA - dateB;
    });
    
    sorted.forEach(o => {
        try {
            const dateKey = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : 'unknown';
            if (!dateGroups[dateKey]) dateGroups[dateKey] = 0;
            dateGroups[dateKey]++;
            o.daily_seq = dateGroups[dateKey]; 
            o.display_id = dateGroups[dateKey]; // Keep for frontend compatibility
        } catch (e) {
            o.daily_seq = 1;
            o.display_id = 1;
        }
    });

    res.json(formattedData);
});

router.get('/orders/cancelled', async (req, res) => {
    const { date, search } = req.query;
    let query = supabase.from('orders').select(`*, users!inner(username, email, phone, full_name)`).eq('status', 'cancelled');
    
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    
    const { data, error } = await query.order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    let formattedData = data.map(o => ({
        ...o, 
        username: o.users?.username, 
        full_name: o.users?.full_name || 'Guest User',
        email: o.users?.email, 
        phone: o.users?.phone
    }));

    if (search) {
        const s = search.toLowerCase();
        formattedData = formattedData.filter(o => 
            o.id.toString().includes(s) ||
            (o.full_name && o.full_name.toLowerCase().includes(s)) ||
            (o.username && o.username.toLowerCase().includes(s)) ||
            (o.phone && o.phone.includes(s)) ||
            (o.address && o.address.toLowerCase().includes(s))
        );
    }

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
    try {
        const id = Number(req.params.id);
        const data = { ...req.body };
        const { error } = await supabase.from('products').update(data).eq('id', id);
        if (error) throw error;
        res.json({ message: "Product updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/products', async (req, res) => {
    try {
        const data = { ...req.body };
        const { data: newRow, error } = await supabase.from('products').insert(data).select();
        if (error) throw error;
        res.status(201).json({ message: "Product added!", productId: newRow?.[0]?.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
    // Order by ID to ensure we always get the same primary settings record
    const { data, error } = await supabase.from('settings').select('*').order('id', { ascending: true }).limit(1).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/settings', async (req, res) => {
    const data = { ...req.body };
    try {
        if (Object.keys(data).length === 0) return res.status(400).json({ error: "No fields to update" });

        // First, get the ID of the settings record we are managing
        const { data: sData, error: sErr } = await supabase.from('settings').select('id').order('id', { ascending: true }).limit(1).single();
        if (sErr) throw sErr;

        const { error } = await supabase.from('settings').update(data).eq('id', sData.id);
        if (error) throw error;
        res.json({ message: "Settings updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
    const { name, iconUrl, iconurl } = req.body;
    if (!name) return res.status(400).json({ error: "Category name required" });
    const finalIcon = iconUrl || iconurl;
    const { data: newRow, error } = await supabase.from('categories').insert([{ name, iconUrl: finalIcon }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: "Category added!", category: newRow });
});

router.put('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name, iconUrl, iconurl } = req.body;
    const finalIcon = iconUrl || iconurl;
    const { error } = await supabase.from('categories').update({ name, iconUrl: finalIcon }).eq('id', id);
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
    
    // Fetch usage counts and total saved per coupon
    const { data: usageData } = await supabase.from('orders').select('coupon_id, discount_amount').not('coupon_id', 'is', null);
    const usageStats = (usageData || []).reduce((acc, curr) => {
        if (!acc[curr.coupon_id]) acc[curr.coupon_id] = { count: 0, saved: 0 };
        acc[curr.coupon_id].count += 1;
        acc[curr.coupon_id].saved += (curr.discount_amount || 0);
        return acc;
    }, {});

    const formatted = coupons.map(c => ({
        ...c, 
        useCount: usageStats[c.id]?.count || 0,
        totalSaved: usageStats[c.id]?.saved || 0
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
    const { date, search } = req.query;
    let query = supabase.from('support_messages').select('*');
    if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('created_at', start).lte('created_at', end);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
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
        query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,alternate_phone.ilike.%${search}%`);
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

// --- SYSTEM HEALTH ---
router.get('/system/health', async (req, res) => {
    try {
        const health = {
            status: "healthy",
            missing_columns: []
        };

        // Check products table
        const { data: pData, error: pErr } = await supabase.from('products').select('*').limit(1);
        if (pErr) throw pErr;
        
        const pCols = pData.length > 0 ? Object.keys(pData[0]) : [];
        if (!pCols.includes('variants')) health.missing_columns.push({ table: 'products', column: 'variants', sql: "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB;" });
        
        // Check users table
        const { data: uData, error: uErr } = await supabase.from('users').select('*').limit(1);
        if (uErr) throw uErr;

        // Check settings table
        const { data: sData, error: sErr } = await supabase.from('settings').select('*').limit(1);
        if (sErr) throw sErr;
        const sCols = sData.length > 0 ? Object.keys(sData[0]) : [];
        if (sCols.length > 0) {
            if (!sCols.includes('razorpay_key_id')) health.missing_columns.push({ table: 'settings', column: 'razorpay_key_id', sql: "ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT;" });
            if (!sCols.includes('razorpay_secret')) health.missing_columns.push({ table: 'settings', column: 'razorpay_secret', sql: "ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS razorpay_secret TEXT;" });
        }

        // Check orders table
        const { data: oData, error: oErr } = await supabase.from('orders').select('*').limit(1);
        if (oErr) throw oErr;
        const oCols = oData.length > 0 ? Object.keys(oData[0]) : [];
        if (!oCols.includes('delivery_type')) health.missing_columns.push({ table: 'orders', column: 'delivery_type', sql: "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'Home Delivery';" });
        if (!oCols.includes('discount_amount')) health.missing_columns.push({ table: 'orders', column: 'discount_amount', sql: "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;" });
        if (!oCols.includes('coupon_id')) health.missing_columns.push({ table: 'orders', column: 'coupon_id', sql: "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES public.coupons(id);" });

        if (health.missing_columns.length > 0) health.status = "degraded";

        res.json(health);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

