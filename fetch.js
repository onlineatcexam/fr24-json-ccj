const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');


if (!fs.existsSync('tracks')) {
  fs.mkdirSync('tracks');
}

if (!fs.existsSync('tracks/arrivals')) {
  fs.mkdirSync('tracks/arrivals');
}


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
/*
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
*/
    
// Process landed arrivals

const arrivals1 =
  JSON.parse(
    fs.readFileSync('arrivals_page1.json')
  );

const arrivals2 =
  JSON.parse(
    fs.readFileSync('arrivals_page2.json')
  );

const combinedArrivals = [

  ...arrivals1.result.response.airport.pluginData.schedule.arrivals.data,

  ...arrivals2.result.response.airport.pluginData.schedule.arrivals.data

];

// Only landed flights

for (const obj of combinedArrivals) {

  const status =
    obj.flight.status.text || '';

  if (status.startsWith('Landed')) {

    const flightId =
      obj.flight.identification.id;

    if (flightId) {

      await fetchTrack(flightId);

    }

  }

}


    
  async function fetchTrack(flightId) {

  const filePath =
    `tracks/arrivals/${flightId}.json`;

  // Skip if already exists

  if (fs.existsSync(filePath)) {

    console.log(`Track exists: ${flightId}`);

    return;

  }

  console.log(`Fetching track: ${flightId}`);

  const trackUrl =
    `https://api.flightradar24.com/common/v1/flight-playback.json?flightId=${flightId}&timestamp=${ts}`;

  await page.goto(trackUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  const text =
    await page.evaluate(() => document.body.innerText);

  // Validate JSON

  JSON.parse(text);

  fs.writeFileSync(filePath, text);

  console.log(`Saved: ${flightId}`);

  // Small delay

  await new Promise(r => setTimeout(r, 3000));

}
    await browser.close();

    console.log("Done");

  } catch (err) {

    console.error(err);

    process.exit(1);

  }

})();
