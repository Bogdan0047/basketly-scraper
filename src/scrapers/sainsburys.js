const { chromium } = require("playwright");
console.log("🔥 SAINSBURYS FILE LOADED");

module.exports.search = async function (query) {
  console.log("🔥 SAINSBURYS SEARCH START:", query);

  const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(query)}`;
  console.log("[SAINSBURYS] SCRAPING URL:", url);

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-GB",
      timezoneId: "Europe/London",
    });

    const page = await context.newPage();

    await page.route("**/*.{png,jpg,jpeg,gif,svg,mp4,webm,woff,woff2,ttf}", (route) =>
      route.abort()
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    try {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (_) {
      console.log("[SAINSBURYS] networkidle timeout, continuing");
    }

    await page.waitForTimeout(3000);

    try {
      await page.click(
        '#onetrust-accept-btn-handler, button:has-text("Accept All"), button:has-text("Accept all cookies"), button:has-text("Accept")',
        { timeout: 4000 }
      );
      console.log("[SAINSBURYS] Cookies accepted");
      await page.waitForTimeout(1500);
    } catch (_) {
      console.log("[SAINSBURYS] No cookie banner found");
    }

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(1200);
    }

    const pageTitle = await page.title().catch(() => "UNKNOWN");
    console.log("[SAINSBURYS] PAGE TITLE:", pageTitle);

    const pageTextPreview = await page
      .evaluate(() => document.body.innerText.slice(0, 1000))
      .catch(() => "FAILED TO READ PAGE TEXT");
    console.log("[SAINSBURYS] PAGE TEXT PREVIEW:", pageTextPreview);

    const lower = String(pageTextPreview || "").toLowerCase();
    if (
      lower.includes("access denied") ||
      lower.includes("captcha") ||
      lower.includes("robot") ||
      lower.includes("blocked") ||
      lower.includes("unusual traffic")
    ) {
      console.log("[SAINSBURYS] POSSIBLE BLOCK DETECTED");
      await browser.close();
      return [];
    }

    const selectorCounts = await page.evaluate(() => {
      const selectors = [
        '[data-testid="product-tile"]',
        '[data-testid="search-product"]',
        '.pt__content',
        '.product-tile',
        'li[class*="pt-grid"]',
        'li[class*="pt__"]',
        'a[href*="/products/"]',
      ];

      const out = {};
      for (const sel of selectors) {
        out[sel] = document.querySelectorAll(sel).length;
      }
      return out;
    });

    console.log("[SAINSBURYS] SELECTOR COUNTS:", JSON.stringify(selectorCounts));

    const products = await page.evaluate(() => {
      const results = [];

      const cards = document.querySelectorAll(
        '[data-testid="product-tile"], [data-testid="search-product"], .pt__content, .product-tile, li[class*="pt-grid"], li[class*="pt__"]'
      );

      cards.forEach((card) => {
        try {
          const titleEl =
            card.querySelector('[data-testid="product-title"]') ||
            card.querySelector('[data-testid="product-title-title"]') ||
            card.querySelector('[data-test-id="product-title-description"] a') ||
            card.querySelector(".pt__info__description a") ||
            card.querySelector("h2 a") ||
            card.querySelector("h3 a") ||
            card.querySelector("h2") ||
            card.querySelector("h3") ||
            card.querySelector('a[href*="/products/"]');

          const title = titleEl?.textContent?.trim();
          if (!title || title.length < 2) return;

          const priceEl =
            card.querySelector('[data-testid="price-per-item"]') ||
            card.querySelector('[data-testid="product-price"]') ||
            card.querySelector('[data-test-id="pt-retail-price"]') ||
            card.querySelector(".pt__cost__retail-price") ||
            card.querySelector(".price") ||
            [...card.querySelectorAll("span, div, p")].find((el) =>
              /£\s*\d/.test(el.textContent || "")
            );

          const priceText = priceEl?.textContent?.trim() || "";
          const match = priceText.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
          const price = match ? parseFloat(match[1]) : null;
          if (!price || Number.isNaN(price)) return;

          const unitEl =
            card.querySelector('[data-test-id="pt-unit-price"]') ||
            card.querySelector('[data-testid="unit-price"]') ||
            card.querySelector(".pt__cost__unit-price");

          const nectarEl =
            card.querySelector('[data-test-id="pt-nectar-price"]') ||
            card.querySelector('[data-testid="nectar-price"]') ||
            card.querySelector(".nectar-price");

          const promoEl =
            card.querySelector('[data-testid="promotion"]') ||
            card.querySelector(".promotion-message") ||
            card.querySelector(".pt__promo");

          const imgEl =
            card.querySelector('img[src*="sainsburys"]') ||
            card.querySelector('img[src*="digitalcontent"]') ||
            card.querySelector("img");

          let imageUrl =
            imgEl?.getAttribute("src") ||
            imgEl?.getAttribute("data-src") ||
            null;

          if (imageUrl && imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
          }

          const linkEl =
            card.querySelector('a[href*="/products/"]') ||
            card.querySelector('a[href*="/gol-ui/"]') ||
            card.querySelector("a");

          let productUrl = linkEl?.getAttribute("href") || null;
          if (productUrl && !productUrl.startsWith("http")) {
            productUrl = "https://www.sainsburys.co.uk" + productUrl;
          }

          results.push({
            title,
            price,
            price_text: priceText,
            unit_price: unitEl?.textContent?.trim() || null,
            promo_text:
              nectarEl?.textContent?.trim() ||
              promoEl?.textContent?.trim() ||
              null,
            brand: null,
            size: null,
            image_url: imageUrl,
            product_url: productUrl,
            in_stock: true,
            retailer: "sainsburys",
          });
        } catch (_) {}
      });

      return results.slice(0, 24);
    });

    console.log("[SAINSBURYS] PRODUCTS FOUND:", products.length);

    await browser.close();
    browser = null;

    return products;
  } catch (err) {
    console.error("[SAINSBURYS] FATAL ERROR:", err.message);
    if (browser) await browser.close().catch(() => {});
    return [];
  }
};
