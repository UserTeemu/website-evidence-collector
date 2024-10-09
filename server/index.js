const collector = require("../collector");
const reporter = require("../reporter");
const inspector = require("../inspector");
const express = require("express");
const bodyParser = require('body-parser')

async function  run(port, logger) {
    const app = express();
    var jsonParser = bodyParser.json()
    let cors= {
      origin: ["localhost:5173","http://localhost:3000"],
      default: "http://localhost:5173"
    }

    app.use(function (req, res, next) {
      const origin = cors.origin.includes(req.header('origin').toLowerCase()) ? req.headers.origin : cors.default;
      res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept",);
      next();
    });

    app.post("/start-collection",jsonParser, async (req, res) => {
      let website_url=req.body.website_url;
      const urlPattern = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;

      if(!urlPattern.test(website_url)) {
        return res.status(400).send({"reason":"malformatted_url"  })
      }

      console.log(`Running collection for: ${website_url}`);

        const collector = require("..");
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
        let output = await runCollection(args, logger.create({}, args));
        res.send(output);

    });

    app.listen(port, () => {
      console.log(`website-evidence-collector awaiting connection on port ${port}`);
    });

    async function runCollection(args, logger) {
      // ########################################################
      // create a new collection instance
      // ########################################################
      const collect = await collector(args, logger);

      // create browser, session, har, pagesession etc to be able to collect
      await collect.createSession();

      //test the ssl and https connection
      await collect.testConnection();

      // go to the target url specified in the args - also possible to overload with a custom url.
      await collect.getPage();

      // ########################################################
      // Collect Links, Forms and Cookies to populate the output
      // ########################################################
      await collect.collectScreenshots();
      await collect.collectLinks();
      await collect.collectForms();
      await collect.collectCookies();
      await collect.collectLocalStorage();
      await collect.collectWebsocketLog();

      // browse sample history and log to localstorage
      let browse_user_set = args.browseLink || [];
      await collect.browseSamples(collect.output.localStorage, browse_user_set);

      // END OF BROWSING - discard the browser and page
      await collect.endSession();

      // ########################################################
      //  inspecting - this will process the collected data and place it in a structured format in the output object
      // ########################################################

      const inspect = await inspector(
          args,
          logger,
          collect.pageSession,
          collect.output
      );

      await inspect.inspectCookies();
      await inspect.inspectLocalStorage();
      await inspect.inspectBeacons();
      await inspect.inspectHosts();

      const report = reporter(args);
      return report.generateHtml(collect.output);
    }

  }

  module.exports = run;