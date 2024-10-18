import {createOutputDirectory} from "./io";
import {CreateOutputArgs, CollectorOutput, createOutputObject} from "./output";

import {testSSL,testHttps} from './connection';
import collector_inspect from './inspector';

import {BrowserArgs, BrowserSession, PageSession} from './browser-session';
import {  getLocalStorage } from '../lib/tools';


export interface CollectionResult {
    output: any;
    pageSession: any;
    source: string,
}

export class Collector {
    private output: any;
    private browserSession: BrowserSession;
    private pageSession: PageSession;
    private logger: any;
    private args: any;
    private source?: string;

    constructor(args, logger) {
        // create the root folder structure
       createOutputDirectory(args.output,args.overwrite)

        let createOutputArgs: CreateOutputArgs = {
            firstPartyUri: args.firstPartyUri,
            taskDescription: args.taskDescription,
            title: args.title,
            url: args.url,
            screenshots:args.screenshots,
        }

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

        //test the ssl and https connection
        await this.testConnection();

        // go to the target url specified in the args - also possible to overload with a custom url.
        await this.getPage();

        // ########################################################
        // Collect Links, Forms and Cookies to populate the output
        // ########################################################
        await this.collectScreenshots();
        await this.collectLinks();
        await this.collectForms();
        await this.collectCookies();
        await this.collectLocalStorage();
        await this.collectWebsocketLog();

        // browse sample history and log to localstorage
        let browse_user_set = this.args.browseLink || [];
        await this.browseSamples(this.output.localStorage, browse_user_set);

        // END OF BROWSING - discard the browser and page
        await this.endSession();

        return {
            output: this.output,
            pageSession: this.pageSession,
            source: this.source,
        }
    }

    private async createSession(): Promise<void> {
        let browserArgs:BrowserArgs={
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
            cookies:this.args.setCookie,
            seed:this.args.seed,
        }
        this.browserSession=new BrowserSession(browserArgs,this.logger)

        await this.browserSession.create()

        this.output.browser.version = await this.browserSession.browser.version();
        this.output.browser.user_agent = await this.browserSession.browser.userAgent();
        this.pageSession = await this.browserSession.start(this.output);
    }

    private async testConnection(): Promise<void> {
        await testHttps(this.output.uri_ins, this.output);
        await testSSL(
            this.output.uri_ins,
            this.args,
            this.logger,
            this.output
        );
    }

    private async getPage(url = null) {
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

    private async collectScreenshots(): Promise<void> {
        // record screenshots
        if (this.args.screenshots) {
            this.output.screenshots = await this.pageSession.screenshot();
        }
    }

    private async collectLinks(): Promise<void> {
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

    private async collectCookies(): Promise<void> {
        this.output.cookies = await collector_inspect.collectCookies(
            this.pageSession.page,
            this.output.start_time
        );
    }

    private async collectForms(): Promise<void> {
        // unsafe webforms
        this.output.unsafeForms = await collector_inspect.unsafeWebforms(
            this.pageSession.page
        );
    }

    private async collectLocalStorage(): Promise<void> {
        this.output.localStorage = await getLocalStorage(
            this.pageSession.page,
            this.logger,
            {}
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
            user_set
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

