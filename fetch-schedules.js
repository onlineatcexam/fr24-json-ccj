const puppeteer = require('puppeteer');
const fs = require('fs');


// =====================================
// AIRPORTS
// =====================================
//
// Schedule-only airports, fetched sequentially in one browser session.
// 'code' is the IATA code the FR24 airport.json endpoint expects;
// 'dir' is the folder the pages are written to, relative to the repo root.
//
// CCJ is deliberately absent: it is the home airport and has its own
// script (fetch.js), which also pulls per-flight playback tracks.
//
// To add an airport, add a line here. Nothing else needs to change.

const AIRPORTS = [
  { code: 'COK', dir: 'cok' },   // VOCI - Kochi
  { code: 'TRV', dir: 'trv' }    // VOTV - Thiruvananthapuram
];

(async () => {

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
    code,
    mode,
    pageNo,
    filename
  ) {

    const url =
      `https://api.flightradar24.com/common/v1/airport.json?code=${code}&plugin[]=&plugin-setting[schedule][mode]=${mode}&plugin-setting[schedule][timestamp]=${ts}&page=${pageNo}&limit=100&fleet=`;

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

    // Cloudflare serves an interstitial instead of JSON when it
    // decides to challenge us. Fail loudly rather than saving HTML
    // over a good page from the previous run.

    if (
      text.includes('Just a moment') ||
      text.includes('<html')
    ) {

      throw new Error(
        `Blocked by Cloudflare while fetching ${filename}`
      );

    }

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
  // ONE AIRPORT
  // =====================================

  async function fetchAirport(airport) {

    const { code, dir } = airport;

    console.log(
      `=== ${code} ===`
    );

    // Create folders

    const folders = [
      dir,
      `${dir}/arrivals`,
      `${dir}/departures`
    ];

    folders.forEach(folder => {

      if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder, { recursive: true });

      }

    });

    // Arrivals

    await fetchAndSave(
      code,
      'arrivals',
      1,
      `${dir}/arrivals/page1.json`
    );

    await fetchAndSave(
      code,
      'arrivals',
      -1,
      `${dir}/arrivals/page2.json`
    );

    // Departures

    await fetchAndSave(
      code,
      'departures',
      1,
      `${dir}/departures/page1.json`
    );

    await fetchAndSave(
      code,
      'departures',
      -1,
      `${dir}/departures/page2.json`
    );

  }

  // =====================================
  // RUN
  // =====================================
  //
  // One airport's failure must not cost us the others' data, so each
  // is caught separately and the run reports at the end.

  const failed = [];

  for (const airport of AIRPORTS) {

    try {

      await fetchAirport(airport);

    } catch (err) {

      console.error(
        `FAILED ${airport.code}`
      );

      console.error(err);

      failed.push(airport.code);

    }

  }

  await browser.close();

  if (failed.length) {

    console.error(
      `DONE WITH FAILURES: ${failed.join(', ')}`
    );

    process.exit(1);

  }

  console.log('DONE');

})();
