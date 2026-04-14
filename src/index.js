const express = require("express");
const { scrape } = require("./scraper");

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Basketly scraper running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/scrape", async (req, res) => {
  const retailer = String(req.query.retailer || "").toLowerCase().trim();
  const query = String(req.query.query || "").trim();

  if (!retailer || !query) {
    return res.status(400).json({
      ok: false,
      error: "Missing retailer or query",
    });
  }

  try {
    const results = await scrape(retailer, query);

    return res.json({
      ok: true,
      retailer,
      query,
      count: Array.isArray(results) ? results.length : 0,
      results: Array.isArray(results) ? results : [],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      retailer,
      query,
      error: error.message || "Unknown scrape error",
    });
  }
});

app.post("/scrape", async (req, res) => {
  const retailer = String(req.body?.retailer || "").toLowerCase().trim();
  const query = String(req.body?.query || req.body?.search_term || "").trim();

  if (!retailer || !query) {
    return res.status(400).json({
      ok: false,
      error: "Missing retailer or query",
    });
  }

  try {
    const results = await scrape(retailer, query);

    return res.json({
      ok: true,
      retailer,
      query,
      count: Array.isArray(results) ? results.length : 0,
      results: Array.isArray(results) ? results : [],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      retailer,
      query,
      error: error.message || "Unknown scrape error",
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
