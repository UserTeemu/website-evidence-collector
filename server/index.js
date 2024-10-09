const Inspector = require("../inspector");
const express = require("express");
const bodyParser = require('body-parser')
const Collector = require("../collector");
const Reporter = require("../reporter");

const corsDefault= "http://localhost:5173"

async function run(port, logger) {
  const app = express();
  let jsonParser = bodyParser.json()


  app.use(function (req, res, next) {
    console.log('Origin')
    console.log(req.header('origin'))
    const origin = cors.origin.includes('localhost') ? req.headers.origin : corsDefault;
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept",);
    console.log(res.headers)
    next();
  });

  app.post("/start-collection", jsonParser, async (req, res) => {
    let website_url = req.body.website_url;
    const urlPattern = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;

    if (!urlPattern.test(website_url)) {
      return res.status(400).send({"reason": "malformatted_url"})
    }

    console.log(`Running collection for: ${website_url}`);

    const logger = require("../lib/logger");
    args = {
      _: [website_url],
      m: 0,
      max: 0,
      s: 3000,
      sleep: 3000,
      f: [],
      "first-party-uri": [],
      firstPartyUri: [],
      headless: true,
      screenshots: true,
      dnt: false,
      "dnt-js": false,
      dntJs: false,
      output: false,
      overwrite: false,
      y: false,
      yaml: false,
      j: false,
      json: false,
      h: false,
      html: true,
      "use-pandoc": false,
      usePandoc: false,
      pdf: true,
      "task-description": null,
      taskDescription: null,
      q: false,
      quiet: false,
      "browser-options": [],
      browserOptions: [],
      lang: "en",
      "page-timeout": 0,
      pageTimeout: 0,
      $0: "website-evidence-collector",
      url: website_url,
    };
    let output = await performCollection(args, logger.create({}, args));
    res.send(output);

  });

  app.listen(port, () => {
    console.log(`website-evidence-collector awaiting connection on port ${port}`);
  });

  async function performCollection(args, logger) {
    // ########################################################
    // create a new collection instance
    // ########################################################
    const collector = new Collector(args, logger);
    let collectionResult = await collector.run();

    const inspector = new Inspector(
        args,
        logger,
        collectionResult.pageSession,
        collectionResult.output
    );

    let inspectionOutput = await inspector.run();

    const reporter = new Reporter(args);
    return reporter.generateHtml(inspectionOutput);
  }

}

module.exports = run;