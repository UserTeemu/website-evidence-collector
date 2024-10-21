/**
 * @file Setup command line arguments
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */
import yaml from "js-yaml";
import fs from "fs";
import yargs, {ArgumentsCamelCase} from "yargs";

export type ParsedArgs = ParsedArgsReporter | ParsedArgsCollector |
    ParsedArgsServe;

export interface ParsedArgsReporter {
    _: (string | number)[];
    command: string;
    inspectionJsonPath: string;
    outputFile?: string;
    htmlTemplate?: string;
    officeTemplate?: string;
    extraFile?: string;
    usePandoc?: boolean;
}

export interface ParsedArgsCollector {
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
    browserOptions: any[];
    lang: string;
    pageTimeout: number;
    url: string;
    seed?: string;
}

export interface ParsedArgsServe {
    _: (string | number)[];
    command: string;
    port: number;
}

export async function parse(): Promise<ParsedArgs> {
    let argv = yargs
        .parserConfiguration({"populate--": true})
        .scriptName("website-evidence-collector")
        .usage("Usage: $0 <URI> [options] [-- [browser options]]")
        .example([["$0 http://example.com/about -f http://example.com -f http://cdn.ex.com -l http://example.com/contact"]])
        // allow for shell variables such as WEC_DNT=true
        .env("WEC")
        .command('serve', 'Start in server mode and connect using a web browser', configureServerCommand, () => {
        })
        .command('reporter', 'Generate reports from collected data', configureReporterCommand, () => {
        })
        .command(['collect', '$0'], 'Run collection for the websites', configureCollectorCommand, () => {
        })
        .help("help")
        .epilog("Copyright European Union 2019, licensed under EUPL-1.2 (see LICENSE.txt)");

    let parsingResult: ArgumentsCamelCase = await argv.parse()

    if (parsingResult.command === 'collector') {
        return {
            _: parsingResult._,
            max: parsingResult["max"] as number,
            sleep: parsingResult["sleep"] as number,
            firstPartyUri: parsingResult["firstPartyUri"] as string[],
            headless: parsingResult["headless"] as boolean,
            screenshots: parsingResult["screenshots"] as boolean,
            dnt: parsingResult["dnt"] as boolean,
            dntJs: parsingResult["dntJs"] as boolean,
            output: parsingResult["output"] as string,
            overwrite: parsingResult["overwrite"] as boolean,
            yaml: parsingResult["yaml"] as boolean,
            json: parsingResult["json"] as boolean,
            html: parsingResult["html"] as boolean,
            usePandoc: parsingResult["usePandoc"] as boolean,
            pdf: parsingResult["pdf"] as boolean,
            quiet: parsingResult["quiet"] as boolean,
            browserOptions: parsingResult["browserOptions"] as string[],
            lang: parsingResult["lang"] as string,
            pageTimeout: parsingResult["pageTimeout"] as number,
            command: parsingResult["command"] as string,
            url: parsingResult["url"] as string,
            seed: parsingResult["seed"] as string,
        }
    }


    if (parsingResult.command === 'reporter') {
        return {
            _: parsingResult._ as string[],
            inspectionJsonPath: parsingResult._[1] as string,
            outputFile: parsingResult["output"] as string,
            htmlTemplate: parsingResult["htmlTemplate"] as string | undefined,
            officeTemplate: parsingResult["officeTemplate"] as string | undefined,
            extraFile: parsingResult["extraFile"] as string | undefined,
            usePandoc: parsingResult["usePandoc"] as boolean | undefined,
            command: parsingResult["command"] as string,
        };

    }

    if (parsingResult.command === 'serve') {
        return {
            _: parsingResult._ as string[],
            port: parsingResult["port"] as number,
            command: parsingResult["command"] as string,
        };
    }

}

function configureReporterCommand(yargs: yargs.Argv) {
    return yargs.usage("Usage: $0 [options] <JSON file>")
        .example([["$0 /home/user/inspection.json"]])
        .describe("html-template", "Custom pug template to generate HTML output")
        .nargs("html-template", 1)
        .alias("html-template", "t")
        .string("html-template")

        .describe("office-template", "Custom pug template to generate DOCX with NPM html-to-docx or DOCX/ODT with pandoc")
        .nargs("office-template", 1)
        .string("office-template")

        .describe("use-pandoc", "Conversion to DOCX/ODT with pandoc instead of NPM")
        .boolean("use-pandoc")
        .default("use-pandoc", false)

        .describe("extra-file", "Loads other JSON/YAML files in the template array 'extra'")
        .nargs("extra-file", 1)
        .alias("extra-file", "e")
        .array("extra-file")
        .coerce("extra-file", (files) => {
            return files.map((file) => {
                if (file.toLowerCase().endsWith('.yaml') || file.toLowerCase().endsWith('.yml')) {
                    return yaml.load(
                        fs.readFileSync(file, "utf8")
                    );
                } else {
                    return JSON.parse(fs.readFileSync(file, "utf8"));
                }
            });
        })

        .describe("output-file", "Write HTML/PDF/DOCX/ODT output to file according to file extension")
        .nargs("output-file", 1)
        .alias("output-file", "o")
        .string("output-file")
        .check((parsedArgs, _) => {
            parsedArgs.command = 'reporter'
            if (!parsedArgs._[1]) {
                return "Error: You must provide a file name or path     ";
            }
            return true;
        })
}

function configureCollectorCommand(yargs: yargs.Argv) {
    return yargs
        .demandCommand(1, "An URI for inspection or the server command is mandatory.") // ask for command and for inspection url
        .alias("m", "max")
        .nargs("m", 1)
        .describe("m", "Sets maximum number of extra links for browsing")
        .default("m", 0)
        .number("m")

        .alias("s", "sleep")
        .describe("s", "Time to sleep after every page load in ms")
        .default("s", 3000) // 3 seconds default sleep
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

        // this argument behaves the same as curl -b
        .alias("c", "set-cookie")
        .describe(
            "c",
            "<name=string/file> Cookie string or file to read cookies from"
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
        // .nargs('o', 1)
        .default("o", "./output")

        .describe(
            "overwrite",
            "Overwrite potentially existing output folder without warning"
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

        .describe("office-template", "Custom pug template to generate DOCX with NPM html-to-docx or DOCX/ODT with pandoc")
        .nargs("office-template", 1)
        .string("office-template")

        .describe("use-pandoc", "Conversion to DOCX/ODT with pandoc instead of NPM")
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
            "Plain text or JSON for inclusion in output files"
        )
        .nargs("task-description", 1)
        .default("task-description", null)

        .alias("q", "quiet")
        .describe("q", "supress new line-determined JSON log to STDOUT")
        .boolean("q")
        .default("q", false)
        .deprecateOption("q", "use on Linux/Mac `2> /dev/null` instead")

        .describe("browser-options", "Arguments passed over to the browser (Chrome)")
        .nargs("browser-options", 1)
        .array("browser-options")
        .default("browser-options", [])

        .describe("browser-profile", "Directory containing a custom browser profile")
        .alias("p", "browser-profile")
        .nargs("browser-profile", 1)

        .describe("testssl", "call of testssl.sh executable and integrate its output")
        .boolean("testssl")
        .conflicts("testssl", "testssl-file")

        .describe("testssl-executable", "set location of the testssl.sh executable")
        .nargs("testssl-executable", 1)
        .string("testssl-executable")

        .describe("testssl-file", "include [JSON FILE] from TestSSL.sh in output")
        .string("testssl-file")
        .nargs("testssl-file", 1)
        .conflicts("testssl-file", "testssl")
        .conflicts("testssl-file", "testssl-executable")

        // .describe('mime-check', 'Excludes non-HTML pages from browsing')
        // .boolean('mime-check')
        // .default('mime-check', true)

        .describe("lang", "Change the browser language")
        .default("lang", "en")

        .describe("seed","Provide a seed to initialize randomness for link selection. Useful for ensuring reproducability.")

        .describe("page-timeout", "page load timeout in ms (0 to disable)")
        .number("page-timeout")
        .default("page-timeout", 0)
        .nargs("page-timeout", 1)
        .check((parsedArgs, _) => {
            parsedArgs.command = 'collector'

            let invokedAsDefaultCommand = parsedArgs._[0] !== parsedArgs.command
            let urlPosition = invokedAsDefaultCommand ? 0 : 1
            if (parsedArgs._[urlPosition] && (parsedArgs._[urlPosition] as string).startsWith("http")) {
                parsedArgs.url = parsedArgs._[urlPosition];
                return true;
            } else {
                return "Error: You must provide an HTTP(S) URI.";
            }
        })

}

function configureServerCommand(yargs: yargs.Argv) {
    return yargs.alias('p', 'port')
        .default('p', 8080)
        .strict()
        .check((parsedArgs, _) => {
            parsedArgs.command = 'serve'
            return true;
        });
}

