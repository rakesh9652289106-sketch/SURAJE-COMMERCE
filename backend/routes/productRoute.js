const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

router.get('/coupons/active', async (req, res) => {
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

// Get all products
router.get('/', async (req, res) => {
    const { search, category } = req.query;
    let query = supabase.from('products').select('*');

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    query = query.order('id', { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    
    // Map imgurl -> imgUrl, originalprice -> originalPrice
    const mapped = data.map(p => ({
        ...p,
        imgUrl: p.imgurl,
        originalPrice: p.originalprice
    }));
    res.json(mapped);
});

// Get Reviews for a specific product
router.get('/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get specific product by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product ID" });
    
    const { data: row, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: "Product not found" });
    
    // Map imgurl -> imgUrl, originalprice -> originalPrice
    const mapped = {
        ...row,
        imgUrl: row.imgurl,
        originalPrice: row.originalprice
    };
    res.json(mapped);
});

// Get products by Category
router.get('/category/:categoryName', async (req, res) => {
    const { categoryName } = req.params;
    let query = supabase.from('products').select('*');
    if (categoryName !== 'All') {
        query = query.eq('category', categoryName);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    
    const mapped = data.map(p => ({
        ...p,
        imgUrl: p.imgurl,
        originalPrice: p.originalprice
    }));
    res.json(mapped);
});

module.exports = router;
