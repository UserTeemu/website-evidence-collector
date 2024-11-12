import {Reporter, ReporterArguments} from "../reporter/reporter.js";
import {Collector} from "../collector/index.js";
import Inspector from "../inspector/inspector.js";
import {StartCollectionRequestBody} from "./server.js";
import {Logger} from "winston";

export async function runCollection(args: StartCollectionRequestBody, browser_options: any[], logger: Logger): Promise<{}> {
    let collectionArgs = sanitizeInputAndConstructCollectionArgs(args, browser_options);

    const collector = new Collector(collectionArgs, logger);
    const collectionResult = await collector.run();

    const inspector = new Inspector(
        logger,
        collectionResult.pageSession,
        collectionResult.output
    );

    return await inspector.run();
}

export async function generateHtmlAndPdf(inspectionOutput) {
    let reporterArgs: ReporterArguments = {
        html: true,
        pdf: true,
        json: false,
        outputPath: undefined,
        usePandoc: false,
        yaml: false,
    }

    const reporter = new Reporter(reporterArgs);
    let html = reporter.generateHtml(inspectionOutput, "inspection.html", false);
    let pdfBuffer = await reporter.convertHtmlToPdfInMemory(html)
    return {
        html: html,
        pdf: Buffer.from(pdfBuffer.buffer).toString('base64'),
    }
}

function sanitizeInputAndConstructCollectionArgs(args: StartCollectionRequestBody, browser_options: any[],): {} {
    let sleepOption = isEmptyNumber(args.sleep_option_input) ? 3000 : args.sleep_option_input
    let pageTimeout = isEmptyNumber(args.timeout_input_option) ? 0 : args.timeout_input_option
    let maxLinks = isEmptyNumber(args.max_option_input) ? 0 : args.max_option_input

    // Links and URIs can be null when send by the backend. Therefore, we filter.
    let browseLinks = args.browse_link_option_input.filter(value => value != null)
    let firstPartyUris = args.first_party_uri_option_input.filter(value => value != null)

    // Check that Links are URLs and FirstPartyUris only consist of domains.
    let areAllExtraLinksUrls = browseLinks.every((link: string) => URL.canParse(link))
    let areAllFirstPartyUrisUrls = firstPartyUris.every((link) => URL.canParse(link))

    if (!areAllFirstPartyUrisUrls) {
        throw new Error("Not all firstPartyURIs are valid.")
    }
    if (!areAllExtraLinksUrls) {
        throw new Error("Not all extra links are invalid.")
    }

    return {
        _: [args.website_url],
        url: args.website_url,
        max: maxLinks,
        browseLink: browseLinks,
        sleep: sleepOption,
        firstPartyUri: firstPartyUris,
        pageTimeout: pageTimeout,
        testssl: args.testssl_input_option,
        seed: args.seed_option_input,
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
        browserOptions: browser_options,
        lang: "en",
        $0: "website-evidence-collector",
    };
}


function isEmptyNumber(input: number | null | undefined): boolean {
    return input === null || input === undefined || isNaN(input) || input === 0;
}

