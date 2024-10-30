import {Reporter, ReporterArguments} from "../reporter/reporter.js";
import {Collector} from "../collector/index.js";
import Inspector from "../inspector/inspector.js";
import {StartCollectionRequestBody} from "./server.js";


function isEmptyString(input: string | null | undefined): boolean {
    return !input || input.trim().length === 0;
}

function isEmptyNumber(input: number | null | undefined): boolean {
    return input === null || input === undefined || isNaN(input) || input === 0;
}

export async function startCollection(args: StartCollectionRequestBody, logger: any): Promise<{  }> {
    let sleepOption = isEmptyNumber(args.sleep_option_input) ? 3000 : args.sleep_option_input
    let pageTimeout = isEmptyNumber(args.timeout_input_option) ? 0 : args.timeout_input_option
    let maxLinks = isEmptyNumber(args.max_option_input) ? 0 : args.max_option_input

    let browseLinks = isEmptyString(args.browse_link_option_input) ? [] : args.browse_link_option_input.trim().split('\n')
    let firstPartyUris = isEmptyString(args.first_party_uri_option_input) ? [] : args.first_party_uri_option_input.trim().split('\n')

    // Check that Links are URLs and FirstPartyUris only consist of domains.
    let allExtraLinksUrls = browseLinks.every((link: string) => URL.canParse(link))
    let allFirstPartyUrisUrls = firstPartyUris.every((link) => {
        try {
            new URL(link)
            return true;
        } catch (e) {
            return false;
        }
    })

    if (!allFirstPartyUrisUrls) {
        throw new Error("Not all firstPartyURIs are valid.")
    }
    if (!allExtraLinksUrls) {
        throw new Error("Not all extra links are invalid.")
    }

    const collectionArgs = {
        _: [args.website_url],
        url: args.website_url,
        max: maxLinks,
        browseLink: browseLinks,
        sleep: sleepOption,
        firstPartyUri: firstPartyUris,
        pageTimeout: pageTimeout,
        testssl:args.testssl_input_option,
        seed:args.seed_option_input,
        headless: true,
        screenshots: true,
        dnt: false,
        dntJs: false,
        output: undefined,
        overwrite: false,
        yaml: false,
        json: false,
        html: true,
        usePandoc: false,
        pdf: true,
        taskDescription: null,
        quiet: false,
        browserOptions: [],
        lang: "en",
        $0: "website-evidence-collector",
    };

    // ########################################################
    // create a new collection instance
    // ########################################################
    const collector = new Collector(collectionArgs, logger);
    const collectionResult = await collector.run();

    const inspector = new Inspector(
        collectionArgs,
        logger,
        collectionResult.pageSession,
        collectionResult.output
    );

    const inspectionOutput = await inspector.run();

    let reporterArgs: ReporterArguments = {
        html: collectionArgs.html,
        json: collectionArgs.json,
        outputPath: collectionArgs.output,
        pdf: collectionArgs.pdf,
        usePandoc: collectionArgs.usePandoc,
        yaml: collectionArgs.yaml,
    }

    const reporter = new Reporter(reporterArgs);
    let html= reporter.generateHtml(inspectionOutput, "inspection.html", false);
    let pdfBuffer = await reporter.convertHtmlToPdfWithoutDisk(html)
    return {
        html:html,
        pdf:Buffer.from(pdfBuffer.buffer).toString('base64'),
    }
}




