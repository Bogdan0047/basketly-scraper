const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 }, { width: 1536, height: 864 },
  { width: 1440, height: 900 }, { width: 1366, height: 768 },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function delay(ms) { return new Promise(r => setTimeout(r, ms + Math.random() * ms * 0.5)); }

function parsePrice(text) {
  if (!text) return null;
  const m = text.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
  return m ? parseFloat(m[1]) : null;
}

function clean(s) {
  return s ? s.replace(/\s+/g, ' ').trim() : null;
}

// ── Sainsbury's ─────────────────────────────────────────────

async function scrapeSainsburys(page, term) {
  const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(term)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Cookie consent
  try {
    const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all"), #onetrust-accept-btn-handler');
    await cookieBtn.click({ timeout: 5000 });
    await delay(1000);
  } catch {}

  // Wait for products
  await Promise.race([
    page.waitForSelector('[data-testid="product-tile"], .pt__content, .product-tile', { timeout: 15000 }),
    page.waitForSelector('.search-results', { timeout: 15000 }),
    delay(12000),
  ]);
  await delay(2000);

  return page.evaluate(() => {
    const products = [];
    const cards = document.querySelectorAll(
      '[data-testid="product-tile"], .pt__content, .product-tile, li[data-testid="search-product"]'
    );

    cards.forEach(card => {
      try {
        const titleEl = card.querySelector(
          '[data-testid="product-tile-title"], .pt__title a, h2 a, .product-title a, a[data-testid*="title"]'
        );
        const title = titleEl?.textContent?.trim();
        if (!title) return;

        // Regular price
        const priceEl = card.querySelector(
          '[data-testid="price-per-item"], .pt__cost__retail-price, .price-per-unit, [data-testid="product-price"]'
        );
        const priceText = priceEl?.textContent?.trim();

        // Nectar price
        const nectarEl = card.querySelector(
          '[data-testid="nectar-price"], .nectar-price, [class*="nectar"], [aria-label*="Nectar"]'
        );
        const nectarText = nectarEl?.textContent?.trim();

        const priceMatch = (priceText || '').replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;
        const nectarMatch = (nectarText || '').replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
        const nectarPrice = nectarMatch ? parseFloat(nectarMatch[1]) : null;

        const imgEl = card.querySelector('img[src*="sainsburys"], img[data-testid*="image"], img.product-image');
        const linkEl = card.querySelector('a[href*="/product/"], a[href*="/gol-ui/"]');

        // Unit price
        const unitEl = card.querySelector('[data-testid="unit-price"], .pt__cost__unit-price, .price-per-measure');
        const unitPrice = unitEl?.textContent?.trim() || null;

        // Promo
        const promoEl = card.querySelector('[data-testid="promotion"], .promotion-message, .pt__promo, [class*="offer"]');
        const promoText = promoEl?.textContent?.trim() || null;

        if (price || nectarPrice) {
          products.push({
            title,
            price: nectarPrice || price,
            price_text: priceText || '',
            regular_price: price,
            nectar_price: nectarPrice,
            unit_price: unitPrice,
            promo_text: nectarPrice ? `Nectar Price: £${nectarPrice.toFixed(2)}` : promoText,
            brand: null,
            size: null,
            image_url: imgEl?.src || null,
            product_url: linkEl?.href || null,
            in_stock: true,
            retailer: 'sainsburys',
          });
        }
      } catch {}
    });
    return products;
  });
}

// ── Asda ────────────────────────────────────────────────────

async function scrapeAsda(page, term) {
  const url = `https://groceries.asda.com/search/${encodeURIComponent(term)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Cookie
  try {
    const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all"), #onetrust-accept-btn-handler');
    await cookieBtn.click({ timeout: 5000 });
    await delay(1000);
  } catch {}

  // Wait for products
  await Promise.race([
    page.waitForSelector('[data-auto-id="linkProductTitle"], .co-product, .search-page-content', { timeout: 15000 }),
    delay(12000),
  ]);

  // Scroll to trigger lazy load
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await delay(1500);
  }

  return page.evaluate(() => {
    const products = [];
    const cards = document.querySelectorAll(
      '[data-auto-id="productTile"], .co-product, li[class*="search-page-content__product"]'
    );

    cards.forEach(card => {
      try {
        const titleEl = card.querySelector(
          '[data-auto-id="linkProductTitle"], .co-product__title, h3 a, [class*="product-title"]'
        );
        const title = titleEl?.textContent?.trim();
        if (!title) return;

        const priceEl = card.querySelector(
          '[data-auto-id="productTilePrice"] strong, .co-product__price, [class*="product-price"]'
        );
        const priceText = priceEl?.textContent?.trim();
        const priceMatch = (priceText || '').replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        const imgEl = card.querySelector('img[src*="asda"], img[data-auto-id*="image"], .co-product__image img');
        const linkEl = card.querySelector('a[href*="/product/"]');

        const unitEl = card.querySelector('[class*="unit-price"], [data-auto-id*="unitPrice"], .co-product__price-per-unit');
        const promoEl = card.querySelector('[class*="promo"], [data-auto-id*="promotion"], .co-product__offer, [class*="rollback"]');

        if (price) {
          products.push({
            title,
            price,
            price_text: priceText || '',
            unit_price: unitEl?.textContent?.trim() || null,
            promo_text: promoEl?.textContent?.trim() || null,
            brand: null,
            size: null,
            image_url: imgEl?.src || null,
            product_url: linkEl ? `https://groceries.asda.com${linkEl.getAttribute('href')}` : null,
            in_stock: true,
            retailer: 'asda',
          });
        }
      } catch {}
    });
    return products;
  });
}

// ── Lidl ────────────────────────────────────────────────────

async function scrapeLidl(page, term) {
  const url = `https://www.lidl.co.uk/search?query=${encodeURIComponent(term)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Cookie
  try {
    const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all"), #onetrust-accept-btn-handler, button[class*="cookie"]');
    await cookieBtn.click({ timeout: 5000 });
    await delay(1000);
  } catch {}

  await Promise.race([
    page.waitForSelector('.product-grid-box, .product-item, [data-testid="product-card"]', { timeout: 15000 }),
    delay(12000),
  ]);
  await delay(2000);

  return page.evaluate(() => {
    const products = [];
    const cards = document.querySelectorAll(
      '.product-grid-box, .product-item, [data-testid="product-card"], .s-result-item'
    );

    cards.forEach(card => {
      try {
        // Filter out recipes/blog
        const href = card.querySelector('a')?.href || '';
        if (href.includes('/recipe') || href.includes('/blog') || href.includes('/ideas')) return;
        const cardText = card.textContent || '';
        if (cardText.includes('recipe') && cardText.includes('minutes')) return;

        const titleEl = card.querySelector(
          '.product-grid-box__title, .product-item__title, h3, [data-testid="product-title"]'
        );
        const title = titleEl?.textContent?.trim();
        if (!title) return;

        const priceEl = card.querySelector(
          '.pricefield__price, .product-grid-box__price, [data-testid="product-price"], .price'
        );
        const priceText = priceEl?.textContent?.trim();
        const priceMatch = (priceText || '').replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        const imgEl = card.querySelector('img[src*="lidl"], img[data-src], img');
        const linkEl = card.querySelector('a[href*="/p/"], a[href*="lidl.co.uk"]');

        const sizeEl = card.querySelector('.product-grid-box__desc, .keyfacts__text, [class*="quantity"]');

        if (price && price > 0.05 && price < 200) {
          products.push({
            title,
            price,
            price_text: priceText || '',
            unit_price: null,
            promo_text: null,
            brand: null,
            size: sizeEl?.textContent?.trim() || null,
            image_url: imgEl?.src || imgEl?.dataset?.src || null,
            product_url: linkEl?.href || null,
            in_stock: true,
            retailer: 'lidl',
          });
        }
      } catch {}
    });
    return products;
  });
}

// ── Main scrape function with retry ─────────────────────────

const scrapers = { sainsburys: scrapeSainsburys, asda: scrapeAsda, lidl: scrapeLidl };

async function scrape(retailer, searchTerm) {
  const scraperFn = scrapers[retailer];
  if (!scraperFn) throw new Error(`Unknown retailer: ${retailer}`);

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let browser;
    try {
      const ua = pick(USER_AGENTS);
      const vp = pick(VIEWPORTS);

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const context = await browser.newContext({
        userAgent: ua,
        viewport: vp,
        locale: 'en-GB',
        timezoneId: 'Europe/London',
        geolocation: { latitude: 51.5074, longitude: -0.1278 },
        permissions: ['geolocation'],
      });

      const page = await context.newPage();
      
      // Block heavy resources
      await page.route('**/*.{mp4,webm,avi,flv}', r => r.abort());
      await page.route('**/analytics**', r => r.abort());
      await page.route('**/tracking**', r => r.abort());

      const products = await scraperFn(page, searchTerm);
      await browser.close();

      if (products.length > 0) return products;

      console.log(`[RETRY] ${retailer} attempt ${attempt}: 0 products, retrying...`);
      lastError = new Error('No products found');
      await delay(2000 * attempt);
    } catch (err) {
      lastError = err;
      console.error(`[RETRY] ${retailer} attempt ${attempt} failed:`, err.message);
      if (browser) await browser.close().catch(() => {});
      await delay(2000 * attempt);
    }
  }

  throw lastError || new Error('Scraping failed after 3 attempts');
}

module.exports = { scrape };
