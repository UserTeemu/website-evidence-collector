import express, {Application, Request, Response, NextFunction, RequestHandler} from 'express';
import bodyParser from 'body-parser';
import {startCollection} from './business-logic';

const corsDefault = 'http://localhost:5173';

interface StartCollectionRequestBody {
    website_url: string
    max_option_input: number
}

async function run(port: number, logger: any) {
    const app: Application = express();
    const jsonParser = bodyParser.json();

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.header('origin')) {
            let requestOrigin = req.header('origin')?.toLowerCase();
            const origin = requestOrigin?.includes('localhost') ? req.headers.origin : corsDefault;
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        }

        next();
    });

    app.use('/',express.static('../src/assets/frontend'))


    app.post('/start-collection', jsonParser, async (req: Request<{}, {}, StartCollectionRequestBody>, res: Response) => {

        try {
            const website_url = req.body.website_url;
            const max_links_option = req.body.max_option_input;
            logger.info(`Received request for URL: ${req.url}`, {
                website_url: req.body.website_url,
                max_links_option: req.body.max_option_input
            });
            const urlPattern = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;

            if (!urlPattern.test(website_url)) {
                res.status(400).send({reason: 'malformatted_url'});
                return;
            }

            logger.log('info', `Running collection for: ${website_url}`);

            const output = await startCollection(website_url, max_links_option);
            res.send(output);
            console.log('Finished serving request');
        } catch (e) {
            res.status(500).send({});
        }
    });

    app.listen(port, () => {
        console.log(`website-evidence-collector awaiting connection on port ${port}`);
    });
}

export default run;
