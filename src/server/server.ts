import express, {
  Application,
  Request,
  Response,
  NextFunction,
  Router,
} from "express";
import bodyParser from "body-parser";
import {
  generateHtmlAndPdf,
  runCollection,
  RunCollectionArguments,
} from "./runCollection.js";
import path from "path";
import { create } from "../lib/logger.js";
import crypto from "crypto";
import packageConfig from "../../package.json" with { type: "json" };

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

      const runCollectionArgs: RunCollectionArguments = {
        website_url: req.body.website_url,
        max_additional_links: req.body.max_additional_links,
        post_page_load_delay_milliseconds: Math.floor(
          req.body.post_page_load_delay_seconds / 1000,
        ),
        timeout_milliseconds: Math.floor(req.body.timeout_seconds / 1000),
        first_party_uris: req.body.first_party_uris,
        links_to_include: req.body.links_to_include,
        link_selection_seed: req.body.link_selection_seed,
        run_testSSL: req.body.run_testSSL,
        cookies: req.body.cookies,
        use_DNT: false,
      };

      try {
        requestLogger.info(`Received /start-collection request`, {
          ...runCollectionArgs,
        });

        if (!URL.canParse(runCollectionArgs.website_url)) {
          res.status(400).send({ reason: "malformatted_url" });
          return;
        }

        requestLogger.log(
          "info",
          `Running collection for: ${runCollectionArgs.website_url}`,
        );

        let collectionOutput = await runCollection(
          runCollectionArgs,
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
      const version = packageConfig.version;
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
  max_additional_links: number;
  post_page_load_delay_seconds: number;
  timeout_seconds: number;
  first_party_uris: string[];
  links_to_include: string[];
  link_selection_seed: string;
  run_testSSL: boolean;
  cookies: Cookie[];
}

export interface Cookie {
  key: string;
  value: string;
}

export default run;
