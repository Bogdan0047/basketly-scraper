const express = require("express");
const sainsburys = require("./scrapers/sainsburys");

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
    console.log("[INDEX] retailer =", retailer, "| query =", query);

    let results = [];

    if (retailer === "sainsburys") {
      console.log("[INDEX] calling sainsburys.search()");
      results = await sainsburys.search(query);
      console.log(
        "[INDEX] sainsburys returned",
        Array.isArray(results) ? results.length : "not-array"
      );
    } else {
      console.log("[INDEX] retailer not supported yet:", retailer);
    }

    return res.json({
      ok: true,
      retailer,
      query,
      count: Array.isArray(results) ? results.length : 0,
      results: Array.isArray(results) ? results : [],
    });
  } catch (err) {
    console.error("[INDEX] scrape route error:", err.message);
    return res.status(500).json({
      ok: false,
      retailer,
      query,
      error: err.message,
      results: [],
    });
  }
});
