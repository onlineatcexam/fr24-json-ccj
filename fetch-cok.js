const puppeteer = require('puppeteer');
const fs = require('fs');

const ACCESS_TOKEN =
  process.env.FR24_TOKEN;

(async () => {

  try {

    // =====================================
    // CREATE FOLDERS
    // =====================================

    const folders = [
      'cok',
      'cok/arrivals',
      'cok/departures'
    ];

    folders.forEach(folder => {

      if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder);

      }

    });

    // =====================================
    // START BROWSER
    // =====================================

    const browser =
      await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
      });

    const page =
      await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    );

    const ts =
      Math.floor(Date.now() / 1000);

    // =====================================
    // FETCH FUNCTION
    // =====================================

    async function fetchAndSave(
      mode,
      pageNo,
      filename
    ) {

      const url =
        `https://api.flightradar24.com/common/v1/airport.json?code=COK&plugin[]=&plugin-setting[schedule][mode]=${mode}&plugin-setting[schedule][timestamp]=${ts}&page=${pageNo}&limit=100&fleet=&token=${ACCESS_TOKEN}`;

      console.log(
        `Fetching ${filename}`
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      const text =
        await page.evaluate(
          () => document.body.innerText
        );

      // Validate JSON

      JSON.parse(text);

      fs.writeFileSync(
        filename,
        text
      );

      console.log(
        `Saved ${filename}`
      );

      await new Promise(r =>
        setTimeout(r, 2000)
      );

    }

    // =====================================
    // ARRIVALS
    // =====================================

    await fetchAndSave(
      'arrivals',
      1,
      'cok/arrivals/page1.json'
    );

    await fetchAndSave(
      'arrivals',
      -1,
      'cok/arrivals/page2.json'
    );

    // =====================================
    // DEPARTURES
    // =====================================

    await fetchAndSave(
      'departures',
      1,
      'cok/departures/page1.json'
    );

    await fetchAndSave(
      'departures',
      -1,
      'cok/departures/page2.json'
    );

    await browser.close();

    console.log('DONE');

  } catch (err) {

    console.error(err);

    process.exit(1);

  }

})();
