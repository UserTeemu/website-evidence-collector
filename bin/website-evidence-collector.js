#!/usr/bin/env node
// jshint esversion: 8

/**
 * @file Collects evidence from websites on processed data in transit and at rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 *
 * @example ./bin/website-evidence-collector.js http://example.com
 */

import server from '../src/server/index';
import argv from "../src/lib/argv";
import logger from "../src/lib/logger";


(async () => {
  let args = argv.parse();
  if (args._[0] === 'serve') {
    await server(args.port, logger.create({}, args))
  } else {
    const localCollector = require("../src");
    await localCollector(args, logger.create({}, args));
  }
})();
