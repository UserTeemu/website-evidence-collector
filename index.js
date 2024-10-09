// jshint esversion: 8

/**
 * @file Collects evidence from websites on processed data in transit and at rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

//const argv = require('./lib/argv');
  const reporter = require("./reporter/index");
const Collector = require("./collector");
const Inspector = require("./inspector");

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

  await inspector.init();

  await inspector.inspectCookies();
  await inspector.inspectLocalStorage();
  await inspector.inspectBeacons();
  await inspector.inspectHosts();

  // ########################################################
  //  Reporting - this will process the output object into different formats, yaml, json, html
  // ########################################################

  // args passed will determine what is stored on disk and what is sent to console
  const report = reporter(args);
  // args.output - determines if anything is stored on disk
  // args.html - determines if html is sent to console
  // args.json - determins if json is sent to console
  // args.yaml - determins if yaml is sent to console

  //websockets
  report.saveJson(inspector.output.websocketLog, "websockets-log.json", false);

  // all
  report.saveJson(inspector.output, "inspection.json");

  // cookies reporting
  report.saveYaml(inspector.output.cookies, "cookies.yml", false);

  // local storage reporting
  report.saveYaml(inspector.output.localStorage, "local-storage.yml", false);

  // beacons
  report.saveYaml(inspector.output.beacons, "beacons.yml", false);

  // all
  report.saveYaml(inspector.output, "inspection.yml");

  // store html on disk
  let html_output=report.generateHtml(inspector.output);
  
  // store docx on disk
  await report.generateOfficeDoc(inspector.output);

  // convert html to pdf
  await report.convertHtmlToPdf();

  // store source on disk
  report.saveSource(collector.source);

  //return collector.output;
  return inspector.output;
}

module.exports = run;
