const collector_io = require("./io");
const output_lib = require("./output");
const collector_connection = require("./connection");
const collector_inspect = require("./inspector");

const browsersession = require("./browser-session");
const { isFirstParty, getLocalStorage } = require("../lib/tools");

class Collector {
  constructor(args, logger) {
    // create the root folder structure
    collector_io.init(args);

    // create the output hash...
    this.output = output_lib.createOutput(args);

    this.browserSession = null;
    this.pageSession = null;
    this.logger = logger;

    this.args = args;
    this.source = null;
  }

  async run() {
    // create browser, session, har, pagesession etc to be able to collect
    await this.#createSession();

    //test the ssl and https connection
    await this.#testConnection();

    // go to the target url specified in the args - also possible to overload with a custom url.
    await this.#getPage();

    // ########################################################
    // Collect Links, Forms and Cookies to populate the output
    // ########################################################
    await this.#collectScreenshots();
    await this.#collectLinks();
    await this.#collectForms();
    await this.#collectCookies();
    await this.#collectLocalStorage();
    await this.#collectWebsocketLog();

    // browse sample history and log to localstorage
    let browse_user_set = this.args.browseLink || [];
    await this.#browseSamples(this.output.localStorage, browse_user_set);

    // END OF BROWSING - discard the browser and page
    await this.#endSession();

    return {
      output:this.output,
      pageSession:this.pageSession,
    }
  }

  async #createSession() {
    this.browserSession = await browsersession.createBrowserSession(
        this.args,
        this.logger
    );

    this.output.browser.version = await this.browserSession.browser.version();
    this.output.browser.user_agent = await this.browserSession.browser.userAgent();
    this.pageSession = await this.browserSession.start(this.output);
  }

  async #testConnection() {
    await collector_connection.testHttps(this.output.uri_ins, this.output);
    await collector_connection.testSSL(
        this.output.uri_ins,
        this.args,
        this.logger,
        this.output
    );
  }

  async #getPage(url = null) {
    if (!url) {
      url = this.output.uri_ins;
    }

    const response = await this.pageSession.gotoPage(url);

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

  async #collectScreenshots() {
    // record screenshots
    if (this.args.screenshots) {
      this.output.screenshots = await this.pageSession.screenshot();
    }
  }

  async #collectLinks() {
    // get all links from page
    const links = await collector_inspect.collectLinks(
        this.pageSession.page,
        this.logger
    );

    let mappedLinks = await collector_inspect.mapLinksToParties(
        links,
        this.pageSession.hosts,
        this.pageSession.refs_regexp
    );

    this.output.links.firstParty = mappedLinks.firstParty;
    this.output.links.thirdParty = mappedLinks.thirdParty;

    this.output.links.social = await collector_inspect.filterSocialPlatforms(
        links
    );

    // prepare regexp to match links by their href or their caption
    this.output.links.keywords = await collector_inspect.filterKeywords(links);
  }

  async #collectCookies() {
    this.output.cookies = await collector_inspect.collectCookies(
        this.pageSession.page,
        this.output.start_time
    );
  }

  async #collectForms() {
    // unsafe webforms
    this.output.unsafeForms = await collector_inspect.unsafeWebforms(
        this.pageSession.page
    );
  }

  async #collectLocalStorage() {
    this.output.localStorage = await getLocalStorage(
        this.pageSession.page,
        this.logger
    );
  }

  async #collectWebsocketLog() {
    this.output.websocketLog = this.pageSession.webSocketLog;
  }

  async #browseSamples(localStorage, user_set = []) {
    this.output.browsing_history = await this.pageSession.browseSamples(
        this.pageSession.page,
        localStorage,
        this.output.uri_dest,
        this.output.links.firstParty,
        user_set
    );
  }

  async #endSession() {
    if (this.browserSession) {
      await this.browserSession.end();
      this.browserSession = null;
    }

    this.output.end_time = new Date();
  }

  endPageSession() {
    this.pageSession = null;
  }
}

module.exports = Collector;
