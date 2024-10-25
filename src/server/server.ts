import express, {Application, Request, Response, NextFunction, Router} from 'express';
import bodyParser from 'body-parser';
import {startCollection} from './startCollection';
import path from "path";

const corsDefault = 'http://localhost:8080';


async function run(port: number, logger: any) {
    const app: Application = express();
    const jsonParser = bodyParser.json();
    const router: Router = express();

    let basePath = process.env.BASE_PATH;

    if (basePath) {
        logger.info("The basePath is set as:" + basePath);
        app.use(basePath,)
    }

    app.use(function (req, _, next) {
        logger.info(`Received request:`, {
            "method": req.method,
            "path": req.path,
            "url": req.url,
        });
        next();
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.header('origin')) {
            let requestOrigin = req.header('origin')?.toLowerCase();
            const origin = requestOrigin?.includes('localhost') ? req.headers.origin : corsDefault;
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        }

        next();
    });

    app.use('/', express.static(path.resolve(__dirname, '../assets/frontend')))

    app.post('/start-collection', jsonParser, async (req: Request<{}, {}, StartCollectionRequestBody>, res: Response) => {

        try {
            const website_url = req.body.website_url;
            logger.info(`Received /start-collection request`, {
                website_url: req.body.website_url,
                max_links_option: req.body.max_option_input,
                sleep_option_input: req.body.sleep_option_input,
                timeout_input_option: req.body.timeout_input_option,
                first_party_uri_option_input: req.body.first_party_uri_option_input,
                browse_link_option_input: req.body.browse_link_option_input,
                seed_option_input: req.body.seed_option_input,
            });

            if (!URL.canParse(website_url)) {
                res.status(400).send({reason: 'malformatted_url'});
                return;
            }

            logger.log('info', `Running collection for: ${website_url}`);

            const output = await startCollection(req.body, logger);
            res.send(output);
            console.log('Finished serving request');
        } catch (e: any) {
            logger.log('error', e.message);
            logger.log('error', e.stack);
            res.status(500).send({reason: e.message});
        }
    });

    app.listen(port, () => {
        logger.info("Running website-evidence-collector in server mode");
        logger.info("Connect by opening the following url in your browser: http://localhost:" + port);
    });
}

export interface StartCollectionRequestBody {
    website_url: string
    max_option_input: number
    sleep_option_input: number,
    timeout_input_option: number,
    first_party_uri_option_input: string,
    browse_link_option_input: string,
    seed_option_input: string,
}

export default run;
