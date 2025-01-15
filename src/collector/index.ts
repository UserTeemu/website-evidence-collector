import { createOutputDirectory } from "./io.js";
import { CreateOutputArgs, createOutputObject } from "./output.js";

import { testSSL, testHttps } from "./connection.js";
import {
  filterKeywords,
  filterSocialPlatforms,
  mapLinksToParties,
  collectLinks,
  collectCookies,
  unsafeWebforms,
} from "./collector_inspector.js";

import { BrowserArgs, BrowserSession } from "./browser-session.js";
import { getLocalStorage } from "../lib/tools.js";
import { Logger } from "winston";
import { PageSession } from "./page-session.js";

export interface CollectionResult {
  output: any;
  pageSession: PageSession;
  source: string;
}

export class Collector {
  private output: any;
  private browserSession: BrowserSession;
  private pageSession: PageSession;
  private logger: Logger;
  private args: any;
  private source?: string;

  constructor(args, logger) {
    // create the root folder structure
    createOutputDirectory(args.output, args.overwrite);

    let createOutputArgs: CreateOutputArgs = {
      firstPartyUri: args.firstPartyUri,
      taskDescription: args.taskDescription,
      title: args.title,
      url: args.url,
      screenshots: args.screenshots,
    };

    // create the output hash...
    this.output = createOutputObject(createOutputArgs);

    this.browserSession = null;
    this.pageSession = null;
    this.logger = logger;

    this.args = args;
  }

  async run(): Promise<CollectionResult> {
    // create browser, session, har, pagesession etc to be able to collect
    await this.createSession();
    this.logger.info("Done: Creating puppeteer chrome session");
    //test the ssl and https connection
    await this.testConnection();
    this.logger.info("Done: Testing connection using testHttps and testSSL");
    // go to the target url specified in the args - also possible to overload with a custom url.
    await this.getPage();
    this.logger.info("Done: Loading page");
    // ########################################################
    // Collect Links, Forms and Cookies to populate the output
    // ########################################################
    await this.collectScreenshots();
    this.logger.info("Done: Collecting screenshots");
    await this.collectLinks();
    this.logger.info("Done: Collecting links");
    await this.collectForms();
    this.logger.info("Done: Collecting forms");
    await this.collectCookies();
    this.logger.info("Done: Collecting cookies");
    await this.collectLocalStorage();
    this.logger.info("Done: Collecting local storage");
    await this.collectWebsocketLog();
    this.logger.info("Done: Collecting websocket log");

    // browse sample history and log to localstorage
    let browse_user_set = this.args.browseLink || [];
    await this.browseSamples(this.output.localStorage, browse_user_set);
    this.logger.info("Done: Browsing samples");
    // END OF BROWSING - discard the browser and page
    await this.endSession();
    this.logger.info("Done: Ending session");

    return {
      output: this.output,
      pageSession: this.pageSession,
      source: this.source,
    };
  }

  private async createSession(): Promise<void> {
    let browserArgs: BrowserArgs = {
      "--": this.args["--"],
      browserOptions: this.args.browserOptions,
      browserProfile: this.args.browserProfile,
      doNotTrack: this.args.dnt,
      doNotTrackJs: this.args.dntJs,
      headless: this.args.headless,
      linkLimit: this.args.max,
      outputPath: this.args.output,
      pageLoadTimeout: this.args.pageTimeout,
      sleep: this.args.sleep,
      cookies: this.args.setCookie,
      seed: this.args.seed,
      skipHeadRequest: this.args.skipHeadRequest,
    };
    this.browserSession = new BrowserSession(browserArgs, this.logger);

    await this.browserSession.create();

    this.output.browser.version = await this.browserSession.browser.version();
    this.output.browser.user_agent =
      await this.browserSession.browser.userAgent();
    this.pageSession = await this.browserSession.start(this.output);
  }

  private async testConnection(): Promise<void> {
    await testHttps(this.output.uri_ins, this.output, this.logger);
    await testSSL(this.output.uri_ins, this.args, this.logger, this.output);
  }

  private async getPage(url = null) {
    if (!url) {
      url = this.output.uri_ins;
    }

    const response = await this.pageSession.gotoPage(url);

    if (response == null) {
      process.exit(2);
    }

    // log redirects
    this.output.uri_redirects = response
      .request()
      .redirectChain()
      .map((req) => req.url());

    // log the destination uri after redirections
    this.output.uri_dest = this.pageSession.page.url();
    this.source = await this.pageSession.page.content();

    await new Promise((resolve) => setTimeout(resolve, this.args.sleep)); // in ms

    return response;
  }

  private async collectScreenshots(): Promise<void> {
    // record screenshots
    if (this.args.screenshots) {
      this.output.screenshots = await this.pageSession.takeScreenshots();
    }
  }

  private async collectLinks(): Promise<void> {
    // get all links from page
    const links = await collectLinks(this.pageSession.page, this.logger);

    let mappedLinks = await mapLinksToParties(
      links,
      this.pageSession.hosts,
      this.pageSession.refs_regexp,
    );

    this.output.links.firstParty = mappedLinks.firstParty;
    this.output.links.thirdParty = mappedLinks.thirdParty;

    this.output.links.social = await filterSocialPlatforms(links);

    // prepare regexp to match links by their href or their caption
    this.output.links.keywords = await filterKeywords(links);
  }

  private async collectCookies(): Promise<void> {
    this.output.cookies = await collectCookies(
      this.pageSession.page,
      this.output.start_time,
    );
  }

  private async collectForms(): Promise<void> {
    // unsafe webforms
    this.output.unsafeForms = await unsafeWebforms(this.pageSession.page);
  }

  private async collectLocalStorage(): Promise<void> {
    this.output.localStorage = await getLocalStorage(
      this.pageSession.page,
      this.logger,
      {},
    );
  }

  private async collectWebsocketLog(): Promise<void> {
    this.output.websocketLog = this.pageSession.webSocketLog;
  }

  private async browseSamples(localStorage, user_set = []): Promise<void> {
    this.output.browsing_history = await this.pageSession.browseSamples(
      this.pageSession.page,
      localStorage,
      this.output.uri_dest,
      this.output.links.firstParty,
      user_set,
    );
  }

  private async endSession(): Promise<void> {
    if (this.browserSession) {
      await this.browserSession.end();
      this.browserSession = null;
    }

    this.output.end_time = new Date();
  }

  endPageSession(): void {
    this.pageSession = null;
  }
}
