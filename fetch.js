const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {

  try {

    // -----------------------------
    // CREATE FOLDERS IF NOT EXIST
    // -----------------------------

    const folders = [
      'arrivals',
      'departures',
      'tracks',
      'tracks/arrivals',
      'tracks/departures'
    ];

    folders.forEach(folder => {

      if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder);

      }

    });

    // -----------------------------
    // STATS
    // -----------------------------

    let fetchedCount = 0;
    let skippedCount = 0;

    // -----------------------------
    // START BROWSER
    // -----------------------------

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    );

    const ts = Math.floor(Date.now() / 1000);

    // -----------------------------
    // FETCH AND SAVE SCHEDULE JSON
    // -----------------------------

    async function fetchAndSave(mode, pageNo, filename) {

      const url =
        `https://api.flightradar24.com/common/v1/airport.json?code=CCJ&plugin[]=&plugin-setting[schedule][mode]=${mode}&plugin-setting[schedule][timestamp]=${ts}&page=${pageNo}&limit=100&fleet=&token=`;

      console.log(`Fetching ${filename}`);

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      const text =
        await page.evaluate(() => document.body.innerText);

      // Validate JSON

      JSON.parse(text);

      fs.writeFileSync(filename, text);

      console.log(`Saved ${filename}`);

      await new Promise(r => setTimeout(r, 2000));

    }

    // -----------------------------
    // FETCH TRACK
    // -----------------------------

    async function fetchTrack(flightId, type) {

      const filePath =
        `tracks/${flightId}.json`;

      // Skip if already exists

      if (fs.existsSync(filePath)) {

        console.log(`SKIP ${type}: ${flightId}`);

        skippedCount++;

        return;

      }

      console.log(`FETCH ${type}: ${flightId}`);

      const trackUrl =
        `https://api.flightradar24.com/common/v1/flight-playback.json?flightId=${flightId}&timestamp=${ts}`;

      await page.goto(trackUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      const text =
        await page.evaluate(() => document.body.innerText);

      // Detect Cloudflare block

      if (
        text.includes('Just a moment') ||
        text.includes('<html')
      ) {

        console.log(`BLOCKED ${flightId}`);

        return;

      }

      // Validate JSON

      JSON.parse(text);

      fs.writeFileSync(filePath, text);

      console.log(`SAVED ${type}: ${flightId}`);

      fetchedCount++;

      // Delay between track requests

      await new Promise(r => setTimeout(r, 3000));

    }

    // =========================================================
    // FETCH ARRIVALS SCHEDULES
    // =========================================================

    await fetchAndSave(
      'arrivals',
      1,
      'arrivals/page1.json'
    );

    await fetchAndSave(
      'arrivals',
      -1,
      'arrivals/page2.json'
    );

    // =========================================================
    // FETCH DEPARTURES SCHEDULES
    // =========================================================

    await fetchAndSave(
      'departures',
      1,
      'departures/page1.json'
    );

    await fetchAndSave(
      'departures',
      -1,
      'departures/page2.json'
    );

    // =========================================================
    // PROCESS ARRIVALS
    // =========================================================

    console.log('PROCESSING ARRIVALS');

    const arrivals1 =
      JSON.parse(
        fs.readFileSync('arrivals/page1.json')
      );

    const arrivals2 =
      JSON.parse(
        fs.readFileSync('arrivals/page2.json')
      );

    const combinedArrivals = [

      ...arrivals1.result.response.airport.pluginData.schedule.arrivals.data,

      ...arrivals2.result.response.airport.pluginData.schedule.arrivals.data

    ];

    for (const obj of combinedArrivals) {

      const status =
        obj.flight.status.text || '';

      // Only landed flights

      if (status.startsWith('Landed')) {

        const flightId =
          obj.flight.identification.id;

        if (!flightId) continue;

        await fetchTrack(
          flightId,
          'arrivals'
        );

      }

    }

    // =========================================================
    // PROCESS DEPARTURES
    // =========================================================

    console.log('PROCESSING DEPARTURES');

    const departures1 =
      JSON.parse(
        fs.readFileSync('departures/page1.json')
      );

    const departures2 =
      JSON.parse(
        fs.readFileSync('departures/page2.json')
      );

    const combinedDepartures = [

      ...departures1.result.response.airport.pluginData.schedule.departures.data,

      ...departures2.result.response.airport.pluginData.schedule.departures.data

    ];

    for (const obj of combinedDepartures) {

      const genericStatus =
        obj.flight.status.generic.status.text || '';

      // Only departed flights

      if (genericStatus === 'departed') {

        const flightId =
          obj.flight.identification.id;

        if (!flightId) continue;

        await fetchTrack(
          flightId,
          'departures'
        );

      }

    }

    // =========================================================
    // SUMMARY
    // =========================================================

    console.log('========================');
    console.log(`FETCHED : ${fetchedCount}`);
    console.log(`SKIPPED : ${skippedCount}`);
    console.log('========================');

    await browser.close();

    console.log('DONE');

  } catch (err) {

    console.error('SCRIPT FAILED');
    console.error(err);

    process.exit(1);

  }

})();
