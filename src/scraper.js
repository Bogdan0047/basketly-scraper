const sainsburys = require("./scrapers/sainsburys");

async function scrape(retailer, query) {
  console.log("SCRAPE CALLED:", retailer, query);

  switch (retailer) {
    case "sainsburys":
      return await sainsburys.search(query);

    default:
      console.log("Unknown retailer:", retailer);
      return [];
  }
}

module.exports = { scrape };
