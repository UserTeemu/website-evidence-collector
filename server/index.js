const express = require("express");
const bodyParser = require('body-parser')
const logic = require("./business-logic");
const corsDefault = "http://localhost:5173"


async function run(port, logger) {
  const app = express();
  let jsonParser = bodyParser.json()


  app.use(function (req, res, next) {
    if (req.header('origin')) {
      let requestOrigin = req.header('origin').toLowerCase();
      const origin = requestOrigin.includes('localhost') ? req.headers.origin : corsDefault;
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept",)
    }

    next();
  });

  app.get("/previous-scans", async (req, res) => {
    try {
      logger.log("info", req.url);
      let result = await logic.loadPreviousScans();
      res.send(JSON.stringify(result));
    } catch (e) {
      res.status(500).send({})
    }
  })

  app.get("/load-report", async (req, res) => {
    try {
      let scanId = req.query.scanId;
      logger.log("info", req.url);
      let report = await logic.loadReport(scanId);
      res.send(report);
    } catch (e) {
      res.status(500).send({})
    }
  })

  app.post("/start-collection", jsonParser, async (req, res) => {
    try {
      logger.log("info", req.url);
      let website_url = req.body.website_url;
      const urlPattern = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;

      if (!urlPattern.test(website_url)) {
        return res.status(400).send({"reason": "malformatted_url"})
      }

      logger.log('info',`Running collection for: ${website_url}`);

      let output = await logic.startCollection(website_url);
      res.send(output);
      console.log("Finished serving request")
    } catch (e) {
      res.status(500).send({})
    }
  });

  app.listen(port, () => {
    console.log(`website-evidence-collector awaiting connection on port ${port}`);
  });


}

module.exports = run;