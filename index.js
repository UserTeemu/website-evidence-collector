// jshint esversion: 8

/**
 * @file Collects evidence from websites on processed data in transit and at rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

//const argv = require('./lib/argv');
const Collector = require("./collector");
const Inspector = require("./inspector");
const Reporter = require("./reporter");

async function run(args, logger) {
  const collector = new Collector(args, logger);
  let collectionResult = await collector.run();

  // ########################################################
  //  inspecting - this will process the collected data and place it in a structured format in the output object
  // ########################################################

  const inspector = new Inspector(
      args,
      logger,
      collectionResult.pageSession,
      collectionResult.output
  );

  let inspectionResult=await inspector.run()

  // ########################################################
  //  Reporting - this will process the output object into different formats, yaml, json, html
  // ########################################################

  // args passed will determine what is stored on disk and what is sent to console
  const reporter = new Reporter(args);
  // args.output - determines if anything is stored on disk
  // args.html - determines if html is sent to console
  // args.json - determines if json is sent to console
  // args.yaml - determines if yaml is sent to console

  //websockets
  reporter.saveJson(inspectionResult.websocketLog, "websockets-log.json", false);

  // all
  reporter.saveJson(inspectionResult, "inspection.json");

  // cookies reporting
  reporter.saveYaml(inspectionResult.cookies, "cookies.yml", false);

  // local storage reporting
  reporter.saveYaml(inspectionResult.localStorage, "local-storage.yml", false);

  // beacons
  reporter.saveYaml(inspectionResult.beacons, "beacons.yml", false);

  // all
  reporter.saveYaml(inspectionResult, "inspection.yml");

  // store html on disk
  reporter.generateHtml(inspectionResult);
  
  // store docx on disk
  await reporter.generateOfficeDoc(inspectionResult);

  // convert html to pdf
  await reporter.convertHtmlToPdf();

  // store source on disk
  reporter.saveSource(collector.source);

  //return final result
  return inspectionResult;
}

module.exports = run;
