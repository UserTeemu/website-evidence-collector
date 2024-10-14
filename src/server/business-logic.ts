    import {Reporter, ReporterArguments} from "../reporter/reporter";
import Collector from "../collector";
import Inspector from "../inspector";
import logger from "../lib/logger";




export async function startCollection(website_url: string,max_links:number): Promise<string> {
    const args = {
        _: [website_url],
        m: 0,
        max: max_links,
        s: 3000,
        sleep: 3000,
        f: [],
        "first-party-uri": [],
        firstPartyUri: [],
        headless: true,
        screenshots: true,
        dnt: false,
        "dnt-js": false,
        dntJs: false,
        output: false,
        overwrite: false,
        y: false,
        yaml: false,
        j: false,
        json: false,
        h: false,
        html: true,
        "use-pandoc": false,
        usePandoc: false,
        pdf: true,
        "task-description": null,
        taskDescription: null,
        q: false,
        quiet: false,
        "browser-options": [],
        browserOptions: [],
        lang: "en",
        "page-timeout": 0,
        pageTimeout: 0,
        $0: "website-evidence-collector",
        url: website_url,
    };

    return await performCollection(args, logger.create({}, args));
}

async function performCollection(args: any, logger: any): Promise<string> {
    // ########################################################
    // create a new collection instance
    // ########################################################
    const collector = new Collector(args, logger);
    const collectionResult = await collector.run();

    const inspector = new Inspector(
        args,
        logger,
        collectionResult.pageSession,
        collectionResult.output
    );

    const inspectionOutput = await inspector.run();


    let reporterArgs: ReporterArguments= {
        html: args.html,
        json: args.json,
        output: args.output,
        pdf: args.pdf,
        usePandoc: args.usePandoc,
        yaml: args.yaml,
    }

    const reporter = new Reporter(reporterArgs);
    return reporter.generateHtml(inspectionOutput, "inspection.html", false);
}



