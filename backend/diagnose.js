const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    console.log("Launching headless browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', (msg) => {
        console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', (err) => {
        console.error(`[BROWSER EXCEPTION]`, err);
    });

    // Capture failed network requests
    page.on('requestfailed', (req) => {
        console.error(`[BROWSER NET FAIL] ${req.method()} ${req.url()} - ${req.failure().errorText}`);
    });

    try {
        console.log("Navigating to http://localhost:5173/ ...");
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });

        console.log("Waiting 3 seconds for dynamic content...");
        await new Promise(r => setTimeout(r, 3000));

        console.log("Extracting category and trending elements count...");
        const counts = await page.evaluate(() => {
            const categories = document.querySelectorAll('#categoryScroll .category-link');
            const products = document.querySelectorAll('#productGrid .product-card');
            const trending = document.querySelectorAll('#trendingList .product-card');
            const marquee = document.getElementById('notificationText')?.innerText;
            return {
                categories: categories.length,
                products: products.length,
                trending: trending.length,
                marquee
            };
        });

        console.log("UI Elements Count on Page:", counts);

        // Take a screenshot and save it to the backend folder
        console.log("Saving screenshot...");
        await page.screenshot({ path: path.join(__dirname, 'diagnose-screenshot.png'), fullPage: true });
        console.log("Screenshot saved.");

    } catch (e) {
        console.error("Navigation/Test error:", e.message);
    } finally {
        await browser.close();
    }
}

run();
