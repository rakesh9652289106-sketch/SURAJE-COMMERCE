const fs = require('fs');
const path = require('path');
const { supabase } = require('./supabaseClient');

const BASE_URL = 'https://snapbasket.com';
const FRONTEND_DIR = path.join(__dirname, '../frontend');

async function generateSitemap() {
    console.log('--- Sitemap Generation Started ---');
    
    const staticPages = [
        '',
        'brands.html',
        'support.html',
        'profile.html',
        'wishlist.html',
        'category.html?name=All'
    ];

    let urls = staticPages.map(page => `${BASE_URL}/${page}`);

    try {
        // Fetch Categories
        console.log('Fetching categories...');
        const { data: categories, error: catErr } = await supabase.from('categories').select('name');
        if (catErr) throw catErr;

        if (categories) {
            categories.forEach(cat => {
                const encodedCat = encodeURIComponent(cat.name);
                urls.push(`${BASE_URL}/category.html?name=${encodedCat}`);
            });
        }

        // Fetch Brands (if table exists)
        console.log('Fetching brands...');
        const { data: brands, error: brandErr } = await supabase.from('brands').select('name');
        // Brands might not exist in a table yet or named differently, we'll check
        if (!brandErr && brands) {
            brands.forEach(brand => {
                // Assuming brands page shows results when filtered by query or similar
                // For now, brand catalog link is enough, but adding individual brand filter links if possible
                const encodedBrand = encodeURIComponent(brand.name);
                // Based on brands-script.js, it seems brand filtering is internal to the page, 
                // but we could support landing pages if needed. Just the catalog for now.
            });
        }

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${url === BASE_URL + '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

        const sitemapPath = path.join(FRONTEND_DIR, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemapXml);
        console.log(`Successfully generated sitemap.xml with ${urls.length} URLs at ${sitemapPath}`);

    } catch (err) {
        console.error('Error generating sitemap:', err.message);
        process.exit(1);
    }
}

generateSitemap();
