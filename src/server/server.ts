import express, {
  Application,
  Request,
  Response,
  NextFunction,
  Router,
} from "express";
import bodyParser from "body-parser";
import { generateHtmlAndPdf, runCollection } from "./runCollection.js";
import path from "path";
import { create } from "../lib/logger.js";
import crypto from "crypto";
import { version } from "../../package.json";

const __dirname = import.meta.dirname;
const corsDefault = "http://localhost:8080";

async function run(port: number, browser_options: any[]) {
  const logger = create({});

  process.on("SIGINT", handleShutdownSignal);
  process.on("SIGTERM", handleShutdownSignal);

  const app: Application = express();

  let basePath = process.env.BASE_PATH;

  if (basePath) {
    logger.info("The basePath is set as:" + basePath);
  } else {
    basePath = "/";
  }

  app.use(function (req, _, next) {
    logger.info(`Received request:`, {
      method: req.method,
      path: req.path,
      url: req.url,
    });
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.header("origin")) {
      let requestOrigin = req.header("origin")?.toLowerCase();
      const origin = requestOrigin ? req.headers.origin : corsDefault;
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept",
      );
    }

    next();
  });

  const router = configureRoutes(browser_options);

  app.use(basePath, router);

  app.listen(port, () => {
    logger.info("Running website-evidence-collector in server mode");
    logger.info(
      "Connect by opening the following url in your browser: http://localhost:" +
        port +
        basePath,
    );
  });
}

function configureRoutes(browser_options: any[]): Router {
  const jsonParser = bodyParser.json();
  const router: Router = express();

  router.use("/", express.static(path.resolve(__dirname, "../../static/")));

  router.post(
    "/start-collection",
    jsonParser,
    async (req: Request<{}, {}, StartCollectionRequestBody>, res: Response) => {
      let requestId = crypto.randomBytes(16).toString("hex");
      let requestLogger = create({}, undefined, { request_id: requestId });

      try {
        const website_url = req.body.website_url;
        requestLogger.info(`Received /start-collection request`, {
          website_url: req.body.website_url,
          max_links_option: req.body.max_option_input,
          sleep_option_input: req.body.sleep_option_input,
          timeout_input_option: req.body.timeout_input_option,
          first_party_uri_option_input: req.body.first_party_uri_option_input,
          browse_link_option_input: req.body.browse_link_option_input,
          seed_option_input: req.body.seed_option_input,
          testssl_input_option: req.body.testssl_input_option,
        });

        if (!URL.canParse(website_url)) {
          res.status(400).send({ reason: "malformatted_url" });
          return;
        }

        requestLogger.log("info", `Running collection for: ${website_url}`);

        let collectionOutput = await runCollection(
          req.body,
          browser_options,
          requestLogger,
        );
        let htmlAndPdf = await generateHtmlAndPdf(collectionOutput);
        res.send(htmlAndPdf);
        requestLogger.info("Finished serving request");
      } catch (e: any) {
        requestLogger.log("error", e.message);
        requestLogger.log("error", e.stack);
        res.status(500).send({ reason: e.message });
      }
    },
  );

  router.get("/health", (_, res: Response) => {
    res.status(200).json({ status: "OK" });
  });

  router.get("/version", (_, res: Response) => {
    try {
      res.status(200).json({ version });
    } catch (error) {
      res.status(500).json({ error: "Unable to retrieve version information" });
    }
  });

  return router;
}

function handleShutdownSignal(signal: string) {
  console.log(`Received ${signal}. Shutting down.`);
  process.exit();
}

export interface StartCollectionRequestBody {
  website_url: string;
  max_option_input: number;
  sleep_option_input: number;
  timeout_input_option: number;
  first_party_uri_option_input: string[];
  browse_link_option_input: string[];
  seed_option_input: string;
  testssl_input_option: boolean;
}

export default run;
