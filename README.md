# Savvy Shopper Scraper Service

trigger redeploy

Production-grade browser-rendered scraping for JS-heavy UK supermarkets.

## Supported Retailers
- **Sainsbury's** — Nectar + regular price extraction
- **Asda** — Lazy-loaded product grid
- **Lidl** — Product-only (filters recipes/blog)

## Local Setup
```bash
cd scraper-service
npm install
npx playwright install chromium
PORT=3000 API_KEY=test123 node src/index.js
```

## Test
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -H "x-api-key: test123" \
  -d '{"retailer": "sainsburys", "search_term": "milk 2 pints"}'
```

## Deploy to Railway
1. Push `scraper-service/` to a GitHub repo
2. Connect to Railway
3. Set env vars: `API_KEY`, `PORT=3000`
4. Railway auto-detects the Dockerfile
5. Uses Microsoft Playwright Docker image (browsers pre-installed)

## API

### POST /scrape
```json
{
  "retailer": "sainsburys" | "asda" | "lidl",
  "search_term": "milk 2 pints"
}
```

Response:
```json
{
  "success": true,
  "retailer": "sainsburys",
  "products": [
    {
      "title": "Sainsbury's British Semi Skimmed Milk 1.13L/2 Pints",
      "price": 1.25,
      "price_text": "£1.25",
      "nectar_price": 1.10,
      "regular_price": 1.25,
      "unit_price": "£0.55/pint",
      "promo_text": "Nectar Price: £1.10",
      "image_url": "https://...",
      "product_url": "https://...",
      "in_stock": true,
      "retailer": "sainsburys"
    }
  ],
  "duration_ms": 4500
}
```

### GET /health
Returns `{ "status": "ok" }`
