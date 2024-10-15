/**
 * @file Collects evidence from websites on processed data in transit and at
 rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import {Collector, CollectionResult} from './collector';
import Inspector from './inspector';
import {Reporter, ReporterArguments} from './reporter/reporter';

interface CollectorCommandOptions {
    output: undefined | string;
    html: boolean;
    json: boolean;
    yaml: boolean;
    usePandoc: boolean;
    pdf: boolean;
}


async function run(args: CollectorCommandOptions, logger: any): Promise<any> {
    const collector = new Collector(args, logger);
    const collectionResult: CollectionResult = await collector.run();

    const inspector = new Inspector(
        args,
        logger,
        collectionResult.pageSession,
        collectionResult.output
    );

    const inspectionResult: any = await inspector.run();

    let reporterArgs: ReporterArguments = {
        output: args.output,
        json: args.json,
        yaml: args.yaml,
        html: args.html,
        pdf: args.pdf,
        usePandoc: args.usePandoc,
    }

    const reporter = new Reporter(reporterArgs);

    reporter.saveJson(inspectionResult.websocketLog, "websockets-log.json", false);
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

export default run;