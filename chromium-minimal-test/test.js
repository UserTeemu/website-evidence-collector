// podman build -t chromium-minimal -f Containerfile && podman  run -e WEBSITE="http://example.com/" -it chromium-minimal:latest


console.log("Starting minimal chromium test script:");


const puppeteer = require("puppeteer");
const proxyChain = require('proxy-chain');
(async () => {

  const website = process.env.WEBSITE;
  const oldProxyUrl = process.env.http_proxy;
  const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);

  if (website) {
    console.log(`Read ${website} from the ENV.`);
  }


  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [`--proxy-server=${newProxyUrl}`, `--disable-gpu`, `--disable-dev-shm-usage`],
    });
    const page = await browser.newPage();

    await page.goto(website || "http://networkcheck.kde.org/", {
      waitUntil: "networkidle0",
    });

    const content = await page.content();

    console.log(content);

    await browser.close();

    console.log("Stopping minimal chromium test script");
  } catch (e) {
    console.log("An error occured!");
    console.log(e);
  } finally {
    // Clean up, forcibly close all pending connections
    await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
    process.exit();
  }
})();
