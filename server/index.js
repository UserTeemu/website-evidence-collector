const Inspector = require("../inspector");
const express = require("express");
const bodyParser = require('body-parser')
const Collector = require("../collector");
const Reporter = require("../reporter");
const {MongoClient,ObjectId} = require("mongodb");

const corsDefault = "http://localhost:5173"
const uri = 'mongodb://localhost:27017'

async function run(port, logger) {
  const app = express();
  let jsonParser = bodyParser.json()


  app.use(function (req, res, next) {
    if(req.header('origin')){
      let requestOrigin = req.header('origin').toLowerCase();
      const origin = requestOrigin.includes('localhost') ? req.headers.origin : corsDefault;
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept",)
    }

    next();
  });

  app.get("/previous-scans", async (req, res) => {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db('wec');
      const collected_evidence = database.collection('collected_evidence');
      let result = await collected_evidence.find().sort({start_time: -1}).toArray();
      result = result.map(item => ({
        id: item._id,
        timestamp: item.start_time,
        host: item.host,
        // Add other properties you want to include
      }));
      console.log(`Fetched ${result.length} scans`);
      res.send(JSON.stringify(result));
    } catch (e) {
      console.error(e);
      res.status(500).send({})
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }

  })

  app.get("/load-report",async (req, res) => {
    let scanId = req.query.scanId;
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db('wec');
      const collected_evidence = database.collection('collected_evidence');
      const result = await collected_evidence.findOne({_id:new ObjectId(scanId)});
      console.log(`Scan found!`);

      let args = {
        output: false,
        html: true,
      };

      const reporter = new Reporter(args);
      let report= reporter.generateHtml(result, "inspection.html", false);
      res.send(report);
    } catch (e) {
      res.status(500).send({})
      console.error(e);
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  })

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
    console.log("Finished serving request")
  });

  app.listen(port, () => {
    console.log(`website-evidence-collector awaiting connection on port ${port}`);
  });

  async function saveOutputToMongoDB(evidence_json) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db('wec');
      const collected_evidence = database.collection('collected_evidence');
      const result = await collected_evidence.insertOne(evidence_json);
      console.log(`Evidence inserted with _id: ${result.insertedId}`);
    } catch (e) {
      console.error(e);
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }

  }

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

    await saveOutputToMongoDB(inspectionOutput);

    const reporter = new Reporter(args);
    return reporter.generateHtml(inspectionOutput, "inspection.html", false);
  }

}

module.exports = run;