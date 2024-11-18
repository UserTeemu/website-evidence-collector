/**
 * @file Collects evidence from websites on processed data in transit and at
 rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import { Collector, CollectionResult } from "./collector/index.js";
import Inspector from "./inspector/inspector.js";
import { ParsedArgsCollector } from "./lib/argv.js";
import { Reporter, ReporterArguments } from "./reporter/reporter.js";
import { create } from "./lib/logger.js";

async function run(args: ParsedArgsCollector): Promise<any> {
  const logger = create({}, args.output);

  const collector = new Collector(args, logger);
  const collectionResult: CollectionResult = await collector.run();

  const inspector = new Inspector(
    logger,
    collectionResult.pageSession,
    collectionResult.output,
  );

  const inspectionResult: any = await inspector.run();

  let reporterArgs: ReporterArguments = {
    outputPath: args.output,
    json: args.json,
    yaml: args.yaml,
    html: args.html,
    pdf: args.pdf,
    usePandoc: args.usePandoc,
  };

  const reporter = new Reporter(reporterArgs);

  reporter.saveJson(
    inspectionResult.websocketLog,
    "websockets-log.json",
    false,
  );
  reporter.saveJson(inspectionResult, "inspection.json");
  reporter.saveYaml(inspectionResult.cookies, "cookies.yml", false);
  reporter.saveYaml(inspectionResult.localStorage, "local-storage.yml", false);
  reporter.saveYaml(inspectionResult.beacons, "beacons.yml", false);
  reporter.saveYaml(inspectionResult, "inspection.yml");
  reporter.generateHtml(inspectionResult);
  await reporter.generateOfficeDoc(inspectionResult);
  await reporter.convertHtmlToPdf();
  reporter.saveSource(collectionResult.source);

  return inspectionResult;
}

export default run;
