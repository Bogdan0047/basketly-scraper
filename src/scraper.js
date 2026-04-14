const scrapeSainsburys = require('./scrapers/sainsburys');

async function scrape(retailer, query) {
  console.log("SCRAPE CALLED:", retailer, query);

  if (retailer === 'sainsburys') {
    return await scrapeSainsburys(query);
  }

  console.log("Retailer not supported:", retailer);
  return [];
}

module.exports = { scrape };
