const express = require("express");

const app = express();
app.use(express.json());

// ROOT
app.get("/", (req, res) => {
  res.json({ message: "Basketly scraper running" });
});

// HEALTH
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// SCRAPE (THIS IS WHAT YOU NEED)
app.get("/scrape", (req, res) => {
  const query = req.query.query || "";

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  res.json({
    ok: true,
    query,
    results: [
      {
        title: `${query} test product`,
        price: 1.99,
        currency: "GBP",
        supermarket: "Tesco"
      }
    ]
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
