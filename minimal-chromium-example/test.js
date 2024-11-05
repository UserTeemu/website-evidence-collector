console.log("Starting minimal chromium test script:");

var website = process.env.WEBSITE;

if (website) {
  console.log(`Read ${website} from the ENV.`);
}

const puppeteer = require("puppeteer");

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--headless",
        `--proxy-sever="http=http://localhost:8888;https=http://localhost:8888"`,
        `--disable-gpu`,
        `--disable-dev-shm-usage`,
      ],
    });
    const page = await browser.newPage();

    await page.goto(website || "http://networkcheck.kde.org/", {waitUntil: "networkidle0"});

    const content = await page.content();

    console.log(content);

    await browser.close();

    console.log("Stopping minimal chromium test script");
  } catch (e) {
    console.log("An error occured!");
    console.log(e);
    process.exit();
  }
})();
