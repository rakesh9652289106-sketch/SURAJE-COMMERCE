const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    const count = await page.evaluate(() => {
        const grid = document.getElementById('productGrid');
        return grid ? grid.children.length : -1;
    });
    console.log('PRODUCTS RENDERED:', count);
    
    await browser.close();
})();
