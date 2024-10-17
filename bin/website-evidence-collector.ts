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
import {parse,ParsedArgs,ParsedArgsCollector,ParsedArgsReporter,ParsedArgsServe} from "../src/lib/argv";
import logger from "../src/lib/logger";
import localCollector from "../src/collectorCommand";
import { reporterCommand } from "../src/reporter/reporterCommand";


(async () => {
  let args:ParsedArgs =await parse();

  const loggerInstance = logger.create({}, args);

  switch (args.command) { 
    case 'serve':
      args=args as ParsedArgsServe;
      await server(args.port, loggerInstance);
      break;
    case 'reporter':
      args=args as ParsedArgsReporter;
      await reporterCommand(args);
      break;
    default:
      args=args as ParsedArgsCollector;
      await localCollector(args, loggerInstance);
  }
})();
