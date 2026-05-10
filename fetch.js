const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {

  try {

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    );

    const ts = Math.floor(Date.now() / 1000);

    async function fetchAndSave(mode, pageNo, filename) {

      const url =
        `https://api.flightradar24.com/common/v1/airport.json?code=CCJ&plugin[]=&plugin-setting[schedule][mode]=${mode}&plugin-setting[schedule][timestamp]=${ts}&page=${pageNo}&limit=100&fleet=&token=`;

      console.log("Fetching:", filename);

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      const text =
        await page.evaluate(() => document.body.innerText);

      JSON.parse(text);

      fs.writeFileSync(filename, text);

    }

    // ARRIVALS

    await fetchAndSave(
      'arrivals',
      1,
      'arrivals_page1.json'
    );

    await fetchAndSave(
      'arrivals',
      -1,
      'arrivals_page2.json'
    );

    // DEPARTURES

    await fetchAndSave(
      'departures',
      1,
      'departures_page1.json'
    );

    await fetchAndSave(
      'departures',
      -1,
      'departures_page2.json'
    );

    await browser.close();

    console.log("Done");

  } catch (err) {

    console.error(err);

    process.exit(1);

  }

})();
