#!/usr/bin/env node
/**
 * @file Setup command line arguments
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import yargs from "yargs";
import serverCommand from "../src/commands/serverCommand.js";
import reporterCommand from "../src/commands/reporterCommand.js";
import collectorCommand from "../src/commands/collectorCommand.js";

await yargs(process.argv.slice(2))
  .parserConfiguration({ "populate--": true })
  .scriptName("website-evidence-collector")
  .usage("Usage: $0 <URI> [options] [-- [browser options]]")
  .example([
    [
      "$0 http://example.com/about -f http://example.com -f http://cdn.ex.com -l http://example.com/contact",
    ],
  ])
  // allow for shell variables such as WEC_DNT=true
  .env("WEC")
  .command([collectorCommand, serverCommand, reporterCommand])
  .help("help")
  .epilog(
    "Copyright European Union 2019, licensed under EUPL-1.2 (see LICENSE.txt)",
  )
  .parseAsync();
