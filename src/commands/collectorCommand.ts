/**
 * @file Collects evidence from websites on processed data in transit and at
 rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import { create } from "../lib/logger.js";
import { CollectionResult, Collector } from "../collector/index.js";
import Inspector from "../inspector/inspector.js";
import { Reporter, ReporterArguments } from "../reporter/reporter.js";
import {Logger} from "winston";

let collectorCommand = "collect";

export default {
  command: [collectorCommand, "$0"],
  desc: "Run collection for the websites",
  builder: (yargs) => {
    return yargs
      .demandCommand(
        1,
        "An URI for inspection or the server command is mandatory.",
      )
      .alias("m", "max")
      .nargs("m", 1)
      .describe("m", "Sets maximum number of extra links for browsing")
      .default("m", 0)
      .number("m")
      .alias("s", "sleep")
      .describe("s", "Time to sleep after every page load in ms")
      .default("s", 3000)
      .coerce("s", (arg) => {
        return arg === false ? 0 : Number(arg);
      })
      .alias("f", "first-party-uri")
      .nargs("f", 1)
      .describe("f", "First-party URIs for links and pages")
      .array("f")
      .default("f", [])
      .alias("l", "browse-link")
      .nargs("l", 1)
      .describe("l", "Adds URI to list of links for browsing")
      .array("l")
      .alias("c", "set-cookie")
      .describe(
        "c",
        "<name=string/file> Cookie string or file to read cookies from",
      )
      .describe("headless", "Hides the browser window")
      .boolean("headless")
      .default("headless", true)
      .describe("screenshots", "Save website screenshots")
      .boolean("screenshots")
      .default("screenshots", true)
      .describe("dnt", "Send Do-Not-Track Header")
      .boolean("dnt")
      .default("dnt", false)
      .describe("dnt-js", "Set navigator.doNotTrack JS property, implies --dnt")
      .boolean("dnt-js")
      .default("dnt-js", false)
      .alias("o", "output")
      .describe("o", "Output folder")
      .default("o", "./output")
      .describe(
        "overwrite",
        "Overwrite potentially existing output folder without warning",
      )
      .boolean("overwrite")
      .default("overwrite", false)
      .alias("y", "yaml")
      .describe("y", "Output YAML to STDOUT")
      .boolean("y")
      .default("y", false)
      .alias("j", "json")
      .describe("j", "Output JSON to STDOUT")
      .boolean("j")
      .default("j", false)
      .alias("h", "html")
      .describe("h", "Ouput HTML to STDOUT")
      .boolean("h")
      .default("h", false)
      .describe("html-template", "Custom pug template to generate HTML")
      .nargs("html-template", 1)
      .string("html-template")
      .describe(
        "office-template",
        "Custom pug template to generate DOCX with NPM html-to-docx or DOCX/ODT with pandoc",
      )
      .nargs("office-template", 1)
      .string("office-template")
      .describe(
        "use-pandoc",
        "Conversion to DOCX/ODT with pandoc instead of NPM",
      )
      .boolean("use-pandoc")
      .default("use-pandoc", false)
      .describe("pdf", "Convert HTML to PDF")
      .boolean("pdf")
      .default("pdf", true)
      .alias("t", "title")
      .describe("t", "Title of the collection for display in output")
      .nargs("t", 1)
      .describe(
        "task-description",
        "Plain text or JSON for inclusion in output files",
      )
      .nargs("task-description", 1)
      .default("task-description", null)
      .alias("q", "quiet")
      .describe("q", "supress new line-determined JSON log to STDOUT")
      .boolean("q")
      .default("q", false)
      .deprecateOption("q", "use on Linux/Mac `2> /dev/null` instead")
      .describe(
        "browser-options",
        "Arguments passed over to the browser (Chrome)",
      )
      .nargs("browser-options", 1)
      .array("browser-options")
      .default("browser-options", [])
      .describe(
        "browser-profile",
        "Directory containing a custom browser profile",
      )
      .alias("p", "browser-profile")
      .nargs("browser-profile", 1)
      .describe(
        "testssl",
        "call of testssl.sh executable and integrate its output",
      )
      .boolean("testssl")
      .default("testssl", false)
      .conflicts("testssl", "testssl-file")
      .describe(
        "testssl-executable",
        "set location of the testssl.sh executable",
      )
      .nargs("testssl-executable", 1)
      .string("testssl-executable")
      .describe(
          "testssl-os",
          "Override the OS for which the testssl.sh arguments containing file paths will be formatted. " +
          "This option is not applied if there is no output directory. " +
          "Useful when testssl.sh is ran in a different environment than WEC."
      )
      .nargs("testssl-os", 1)
      .choices("testssl-os", ["system", "posix", "win32"])
      .default("testssl-os", "system")
      .describe("testssl-extra-args", "a string of extra arguments (delimited by spaces) that will be passed to testssl.sh")
      .nargs("testssl-extra-args", 1)
      .string("testssl-extra-args") // TODO: maybe `array` should be used here instead?
      .default("testssl-extra-args", "")
      .describe("testssl-file", "include [JSON FILE] from TestSSL.sh in output")
      .string("testssl-file")
      .nargs("testssl-file", 1)
      .conflicts("testssl-file", "testssl")
      .conflicts("testssl-file", "testssl-executable")
      .conflicts("testssl-file", "testssl-fs-platform")
      .describe("lang", "Change the browser language")
      .default("lang", "en")
      .describe(
        "seed",
        "Provide a seed to initialize randomness for link selection. Useful for ensuring reproducability.",
      )
      .describe("page-timeout", "page load timeout in ms (0 to disable)")
      .number("page-timeout")
      .default("page-timeout", 0)
      .nargs("page-timeout", 1)
      .boolean("skip-head-request")
      .describe(
        "skip-head-request",
        "Skip the initial HEAD request and directly attempt to access the resource. Useful when HEAD requests are blocked but the resource is still accessible.",
      )
      .default("skip-head-request", false)
      .check((argv) => {
        let invokedAsDefaultCommand = argv._[0] !== collectorCommand;
        let urlPosition = invokedAsDefaultCommand ? 0 : 1;
        if (argv._[urlPosition] && URL.canParse(argv._[urlPosition])) {
          const url = new URL(argv._[urlPosition]);
          if (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "file:") {
            argv.url = url.toString();
            return true;
          }
        }
        return "Error: You must provide a valid URI with protocol HTTP, HTTPS or FILE.";
      });
  },
  handler: async (argv) => await runCollector(argv, create({}, argv.output)),
};

export async function runCollector(args: CollectorCommandArguments, logger: Logger): Promise<any> {
  const collector = new Collector(args, logger);
  const collectionResult: CollectionResult = await collector.run();

  const inspector = new Inspector(
    collectionResult.pageSession,
    collectionResult.output,
  );

  const inspectionResult: any = inspector.run();

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

interface CollectorCommandArguments {
  _: (string | number)[];
  command: string;
  max: number;
  sleep: number;
  firstPartyUri: string[];
  headless: boolean;
  screenshots: boolean;
  dnt: boolean;
  dntJs: boolean;
  output: string;
  overwrite: boolean;
  yaml: boolean;
  json: boolean;
  html: boolean;
  usePandoc: boolean;
  pdf: boolean;
  taskDescription?: string;
  quiet: boolean;
  testssl: boolean;
  browserOptions: any[];
  lang: string;
  pageTimeout: number;
  url: string;
  seed?: string;
}
