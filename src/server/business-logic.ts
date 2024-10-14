import {MongoClient, ObjectId} from 'mongodb';
import {Reporter, ReporterArguments} from "../reporter/reporter";
import Collector from "../collector";
import Inspector from "../inspector";
import logger from "../lib/logger";

const mongoDBUri = 'mongodb://localhost:27017';

interface PreviousScan {
    id: ObjectId;
    timestamp: string;
    host: string;
}

export async function loadPreviousScans(): Promise<PreviousScan[]> {
    const client = new MongoClient(mongoDBUri);
    try {
        await client.connect();
        const database = client.db('wec');
        const collected_evidence = database.collection('collected_evidence');
        const searchResult = await collected_evidence.find().sort({start_time: -1}).toArray();
        return searchResult.map(item => ({
            id: item._id,
            timestamp: item.start_time,
            host: item.host,
        }));
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        await client.close();
    }
}

export async function loadReport(scanId: string): Promise<string> {
    const client = new MongoClient(mongoDBUri);
    try {
        await client.connect();
        const database = client.db('wec');
        const collected_evidence = database.collection('collected_evidence');
        const result = await collected_evidence.findOne({_id: new ObjectId(scanId)});

        const args: ReporterArguments = {
            json: false,
            pdf: false,
            usePandoc: false,
            yaml: false,
            output: false,
            html: true
        };

        const reporter = new Reporter(args);
        return reporter.generateHtml(result, "inspection.html", false);
    } catch (e) {
        console.error(e);
        throw e;
    } finally {
        await client.close();
    }
}

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

    await saveOutputToMongoDB(inspectionOutput);

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

async function saveOutputToMongoDB(evidence_json: any) {
    const client = new MongoClient(mongoDBUri);
    try {
        await client.connect();
        const database = client.db('wec');
        const collected_evidence = database.collection('collected_evidence');
        const result = await collected_evidence.insertOne(evidence_json);
        console.log(`Evidence inserted with _id: ${result.insertedId}`);
    } catch (e) {
        console.error(e);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

