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

   const url =
  `https://api.flightradar24.com/common/v1/airport.json?code=CCJ&plugin[]=&plugin-setting[schedule][mode]=arrivals&plugin-setting[schedule][timestamp]=${ts}&page=-1&limit=100&fleet=&token=`;
    console.log("Opening URL...");
    console.log(url);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const text = await page.evaluate(() => document.body.innerText);

    console.log(text.substring(0, 500));

    fs.writeFileSync('data.json', text);

    await browser.close();

    console.log("Done");

  } catch (err) {

    console.error(err);
    process.exit(1);

  }

})();
