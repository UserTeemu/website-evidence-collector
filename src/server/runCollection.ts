import { Reporter, ReporterArguments } from "../reporter/reporter.js";
import { Collector } from "../collector/index.js";
import Inspector from "../inspector/inspector.js";
import { Cookie } from "./server.js";
import { Logger } from "winston";

export interface RunCollectionArguments {
  website_url: string;
  max_additional_links: number;
  post_page_load_delay_milliseconds: number;
  timeout_milliseconds: number;
  first_party_uris: string[];
  links_to_include: string[];
  link_selection_seed: string;
  run_testSSL: boolean;
  cookies: Cookie[];
  use_DNT: boolean;
}

export async function runCollection(
  args: RunCollectionArguments,
  browser_options: any[],
  logger: Logger,
): Promise<{}> {
  let collectionArgs = sanitizeInputAndConstructCollectionArgs(
    args,
    browser_options,
  );

  const collector = new Collector(collectionArgs, logger);
  const collectionResult = await collector.run();

  const inspector = new Inspector(
    collectionResult.pageSession,
    collectionResult.output,
  );

  return inspector.run();
}

export async function generateHtmlAndPdf(inspectionOutput, extraOuptut?) {
  let reporterArgs: ReporterArguments = {
    html: true,
    pdf: true,
    json: false,
    outputPath: undefined,
    usePandoc: false,
    yaml: false,
  };

  const reporter = new Reporter(reporterArgs);
  let html = reporter.generateHtml(
    inspectionOutput,
    "inspection.html",
    false,
    extraOuptut ? "path/to/alternative/template" : undefined,
    extraOuptut,
  );
  let pdfBuffer = await reporter.convertHtmlToPdfInMemory(html);
  return {
    html: html,
    pdf: Buffer.from(pdfBuffer.buffer).toString("base64"),
  };
}

/**
 * Constructs a JSON object containing all Arguments as it is expected by the underlying implementation.
 */
function sanitizeInputAndConstructCollectionArgs(
  args: RunCollectionArguments,
  browser_options: any[],
): {} {
  let sleepOption = isEmptyNumber(args.post_page_load_delay_milliseconds)
    ? 3000
    : args.post_page_load_delay_milliseconds;
  let pageTimeout = isEmptyNumber(args.timeout_milliseconds)
    ? 0
    : args.timeout_milliseconds;
  let maxLinks = isEmptyNumber(args.max_additional_links)
    ? 0
    : args.max_additional_links;

  // Links and URIs can be null when send by the backend. Therefore, we filter.
  let browseLinks = args.links_to_include.filter((value) => value != null);
  let firstPartyUris = args.first_party_uris.filter((value) => value != null);

  // Check that Links are URLs and FirstPartyUris only consist of domains.
  let areAllExtraLinksUrls = browseLinks.every((link: string) =>
    URL.canParse(link),
  );
  let areAllFirstPartyUrisUrls = firstPartyUris.every((link) =>
    URL.canParse(link),
  );

  if (!areAllFirstPartyUrisUrls) {
    throw new Error("Not all firstPartyURIs are valid.");
  }
  if (!areAllExtraLinksUrls) {
    throw new Error("Not all extra links are invalid.");
  }

  let sanitizedCookies = args.cookies
    .filter((cookie: Cookie) => cookie.value != null && cookie.key != null)
    .filter(
      (cookie: Cookie) =>
        !cookie.value.includes(";") &&
        !cookie.value.includes(",") &&
        !cookie.value.includes(" "),
    )
    .filter(
      (cookie: Cookie) =>
        !cookie.key.includes(";") &&
        !cookie.key.includes(",") &&
        !cookie.key.includes(" "),
    );

  /*
  [set-cookies.ts] expects a string of cookies in the form of
    key1=value1;key2=value2;
  */

  let cookieString =
    sanitizedCookies.length >= 1
      ? sanitizedCookies
          .map((cookie: Cookie) => `${cookie.key}=${cookie.value}`)
          .join(";")
      : "";

  return {
    _: [args.website_url],
    url: args.website_url,
    max: maxLinks,
    browseLink: browseLinks,
    sleep: sleepOption,
    firstPartyUri: firstPartyUris,
    pageTimeout: pageTimeout,
    testssl: args.run_testSSL,
    seed: args.link_selection_seed,
    setCookie: cookieString,
    headless: true,
    screenshots: true,
    dnt: args.use_DNT,
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
