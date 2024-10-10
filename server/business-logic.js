const {MongoClient, ObjectId} = require('mongodb');
const Reporter = require("../reporter");
const Collector = require("../collector");
const Inspector = require("../inspector");
const logger = require("../lib/logger");

const mongoDBUri = 'mongodb://localhost:27017'

// interface PreviousScan{
//     id: ObjectId;
//     timestamp: string;
//     host: string;
// }
async function loadPreviousScans() {
  const client = new MongoClient(mongoDBUri);
  try {
    await client.connect();
    const database = client.db('wec');
    const collected_evidence = database.collection('collected_evidence');
    let searchResult = await collected_evidence.find().sort({start_time: -1}).toArray();
    return searchResult.map(item => ({
      id: item._id,
      timestamp: item.start_time,
      host: item.host,
    }));
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await client.close();
  }
}

async function loadReport(scanId) {
  const client = new MongoClient(mongoDBUri);
  try {
    await client.connect();
    const database = client.db('wec');
    const collected_evidence = database.collection('collected_evidence');
    const result = await collected_evidence.findOne({_id: new ObjectId(scanId)});

    let args = {
      output: false,
      html: true,
    };

    const reporter = new Reporter(args);
    return reporter.generateHtml(result, "inspection.html", false);
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    await client.close();
  }
}

async function startCollection(website_url){
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

  return  await performCollection(args, logger.create({}, args));
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
async function saveOutputToMongoDB(evidence_json) {
  const client = new MongoClient(mongoDBUri);
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

module.exports = {loadPreviousScans,loadReport,startCollection};