const sainsburys = require("./scrapers/sainsburys");

async function scrape(retailer, query) {
  console.log("SCRAPE CALLED:", retailer, query);

  if (retailer === "sainsburys") {
    return await sainsburys.search(query);
  }

  return [];
}

module.exports = { scrape };

console.log("SCRAPE CALLED:", retailer, query);
console.log("USING SAINSBURYS ROUTE");
