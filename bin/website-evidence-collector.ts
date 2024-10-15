#!/usr/bin/env node

/**
 * @file Collects evidence from websites on processed data in transit and at
 rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 *
 * @example ./bin/website-evidence-collector.ts http://example.com
 */

import server from '../src/server/server';
import argv from "../src/lib/argv";
import logger from "../src/lib/logger";
import localCollector from "../src/collectorCommand";
import { reporterCommand ,ReporterCommandOptions} from "../src/reporter/reporterCommand";
(async () => {
  const args:any = argv.parse();
  const command = args._[0];
  const loggerInstance = logger.create({}, args);

  switch (command) {
    case 'serve':
      await server(args.port, loggerInstance);
      break;
    case 'reporter':
      const reporterOptions: ReporterCommandOptions = {
        inspectionJsonPath: args._[1],
        outputFile: args.outputFile,
        htmlTemplate: args.htmlTemplate,
        officeTemplate: args.officeTemplate,
        extraFile: args.extraFile,
        usePandoc: args.usePandoc,
      };
      await reporterCommand(reporterOptions);
      break;
    default:
      await localCollector(args, loggerInstance);
  }
})();
