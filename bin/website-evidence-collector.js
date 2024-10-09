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


const argv = require("../lib/argv");
const logger = require("../lib/logger");

(async () => {
  let args = argv.parse();
  if (args._[0] === 'serve') {
    const server = require('../server')
    await server(args.port, logger.create({}, args))
  } else {
    const collector = require("..");
    await collector(args, logger.create({}, args));
  }
})();
