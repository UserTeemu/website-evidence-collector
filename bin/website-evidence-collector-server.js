const express = require("express");
const formidable = require("express-formidable");
const app = express();
const port = 8080;

app.use(formidable());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.post("/start-collection", async (req , res) => {
  let website_url = req.fields.website_url;
  console.log(`website_url=${website_url}`);

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
  let output = await collector(args, logger.create({}, args));
  res.send(output);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
