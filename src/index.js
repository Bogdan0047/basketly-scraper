const express = require('express');
const { scrape } = require('./scraper');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || '';

// Auth middleware
function auth(req, res, next) {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// Rate limit: simple in-memory
const requests = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const window = 60000;
  const max = 30;
  const hits = (requests.get(ip) || []).filter(t => t > now - window);
  if (hits.length >= max) return res.status(429).json({ success: false, error: 'Rate limited' });
  hits.push(now);
  requests.set(ip, hits);
  next();
}

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/scrape', auth, rateLimit, async (req, res) => {
  const { retailer, search_term } = req.body;
  const valid = ['sainsburys', 'asda', 'lidl'];
  if (!retailer || !valid.includes(retailer)) {
    return res.status(400).json({ success: false, error: `retailer must be one of: ${valid.join(', ')}` });
  }
  if (!search_term || typeof search_term !== 'string' || search_term.length > 200) {
    return res.status(400).json({ success: false, error: 'search_term required (max 200 chars)' });
  }

  console.log(`[SCRAPE] ${retailer} | "${search_term}"`);
  const start = Date.now();

  try {
    const products = await scrape(retailer, search_term.trim());
    const ms = Date.now() - start;
    console.log(`[SCRAPE] ${retailer} | "${search_term}" → ${products.length} products (${ms}ms)`);
    res.json({ success: true, retailer, search_term, products, duration_ms: ms });
  } catch (err) {
    console.error(`[SCRAPE ERROR] ${retailer} | "${search_term}":`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper service running on port ${PORT}`));
