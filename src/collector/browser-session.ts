import puppeteer, {Browser, Page} from "puppeteer";
import PuppeteerHar from "puppeteer-har";
import path from "path";
import url from "url";
import escapeRegExp from "lodash/escapeRegExp.js";
import got from "got";
import sampleSize from "lodash/sampleSize.js";
import parseContentSecurityPolicy from "content-security-policy-parser";
import {setup_cookie_recording} from "../lib/setup-cookie-recording.js";
import {setup_beacon_recording} from "../lib/setup-beacon-recording.js";
import {setup_websocket_recording} from "../lib/setup-websocket-recording.js";
import {set_cookies} from "../lib/set-cookies.js";
import {isFirstParty, getLocalStorage, sampleSizeSeeded} from "../lib/tools.js";

const UserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/126.0.6478.126 Safari/537.36";
const WindowSize = {width: 1680, height: 927};

interface Hosts {
    requests: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
    beacons: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
    cookies: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
    localStorage: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
    links: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
    contentSecurityPolicy: {
        firstParty: Set<any>;
        thirdParty: Set<any>;
    };
}


export interface BrowserArgs {
    headless: boolean;
    browserProfile?: string;
    outputPath?: string;
    browserOptions: string[];
    "--"?: string[];
    doNotTrackJs?: boolean;
    doNotTrack?: boolean;
    pageLoadTimeout: number;
    linkLimit: number;
    sleep: number;
    cookies: string;
    seed?: string;
}

export class BrowserSession {
    public browser: Browser;
    public logger: any;
    public page: Page;
    public har: PuppeteerHar;
    public webSocketLog: any;
    public hosts: Hosts;
    public browserArgs: BrowserArgs;


    constructor(browserArgs: BrowserArgs, logger) {
        this.browserArgs = browserArgs;
        this.logger = logger;
        this.browser = null;
        this.page = null;
        this.har = null;
        this.hosts = null;
        this.webSocketLog = null;
    }

    async create() {
        this.browser = await puppeteer.launch({
            headless: this.browserArgs.headless,
            defaultViewport: WindowSize,
            userDataDir: this.browserArgs.browserProfile || (this.browserArgs.outputPath ? path.join(this.browserArgs.outputPath, "browser-profile") : undefined),
            args: [
                `--proxy-auto-detect`,
                `--enable-logging`,
                `--v=1  `,
                `--user-agent=${UserAgent}`,
                `--window-size=${WindowSize.width},${WindowSize.height}`,
            ].concat(this.browserArgs.browserOptions, this.browserArgs["--"] || []),
        });

    }

    async start(output) {
        let session = new PageSession(this, output);
        await session.initialize()
        return session
    }

    async end() {
        if (this.har) {
            await this.har.stop();
        }
        await this.page.close();
        await this.browser.close();
    }
}


export class PageSession {
    private browserSession: BrowserSession;
    private output: any;
    public refs_regexp: RegExp;

    constructor(browserSession: BrowserSession, output) {
        this.browserSession = browserSession;
        this.output = output;
        this.refs_regexp = null;
    }

    get page(): Page {
        return this.browserSession.page;
    }

    get hosts(): Hosts {
        return this.browserSession.hosts;
    }

    get webSocketLog(): any {
        return this.browserSession.webSocketLog;
    }

    async initialize() {
        let uri_refs_stripped = this.output.uri_refs.map((uri_ref) => {
            let uri_ref_parsed = url.parse(uri_ref);
            return escapeRegExp(`${uri_ref_parsed.hostname}${uri_ref_parsed.pathname.replace(/\/$/, "")}`);
        });

        this.refs_regexp = new RegExp(`^(${uri_refs_stripped.join("|")})\\b`, "i");

        this.browserSession.page = (await this.browserSession.browser.pages())[0];

        if (this.browserSession.browserArgs.doNotTrackJs) {
            this.browserSession.browserArgs.doNotTrack = true;
        }

        if (this.browserSession.browserArgs.doNotTrack) {
            this.output.browser.extra_headers.dnt = 1;
            await this.page.setExtraHTTPHeaders({dnt: "1"});

            if (this.browserSession.browserArgs.doNotTrackJs) {
                await this.page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, "doNotTrack", {value: "1"});
                });
            }
        }

        this.page.on("console", (msg) =>
            this.browserSession.logger.log("debug", msg.text(), {
                type: "Browser.Console"
            })
        );

        await setup_cookie_recording(this.page, this.browserSession.logger);
        await setup_beacon_recording(this.page, this.browserSession.logger);

        this.browserSession.webSocketLog = setup_websocket_recording(this.page, this.browserSession.logger);

        this.browserSession.hosts = {
            requests: {firstParty: new Set(), thirdParty: new Set()},
            beacons: {firstParty: new Set(), thirdParty: new Set()},
            cookies: {firstParty: new Set(), thirdParty: new Set()},
            localStorage: {firstParty: new Set(), thirdParty: new Set()},
            links: {firstParty: new Set(), thirdParty: new Set()},
            contentSecurityPolicy: {firstParty: new Set(), thirdParty: new Set()}
        };

        this.setupEventListeners();

        await set_cookies(this.page, this.output.uri_ins, this.browserSession.browserArgs.cookies, this.output, this.browserSession.logger);

        this.browserSession.har = new PuppeteerHar(this.page);

        await this.browserSession.har.start({
            path: this.browserSession.browserArgs.outputPath ? path.join(this.browserSession.browserArgs.outputPath, "requests.har") : undefined,
        });
    }

    setupEventListeners() {
        this.page.on("request", (request) => {
            const l = url.parse(request.url());
            if (isFirstParty(this.refs_regexp, l)) {
                this.browserSession.hosts.requests.firstParty.add(l.hostname);
            } else {
                if (l.protocol != "data:") {
                    this.browserSession.hosts.requests.thirdParty.add(l.hostname);
                }
            }
        });

        this.page.on("response", (response) => {
            const l = url.parse(response.url());
            if (isFirstParty(this.refs_regexp, l)) {
                const csp = response.headers()['content-security-policy'];
                if (csp) {
                    parseContentSecurityPolicy(csp).forEach((hostnames) => {
                        hostnames.forEach((hostname) => {
                            let match = hostname.match(/[^:\/']+$/);
                            if (match == null || match.length == 0 || match[0].match(this.refs_regexp)) {
                                if (hostname.startsWith('\'nonce-')) {
                                    this.browserSession.hosts.contentSecurityPolicy.firstParty.add('\'nonce-...\'');
                                } else if (hostname.startsWith('\'sha256-')) {
                                    this.browserSession.hosts.contentSecurityPolicy.firstParty.add('\'sha256-...\'');
                                } else {
                                    this.browserSession.hosts.contentSecurityPolicy.firstParty.add(hostname);
                                }
                            } else {
                                this.browserSession.hosts.contentSecurityPolicy.thirdParty.add(hostname);
                            }
                        });
                    });
                }
            }
        });
    }

    async gotoPage(u) {
        this.browserSession.logger.log("info", `browsing now to ${u}`, {
            type: "Browser"
        });


        try {
            let page_response = await this.page.goto(u, {
                timeout: this.browserSession.browserArgs.pageLoadTimeout,
                waitUntil: "networkidle2",
            });

            if (page_response === null) {
                page_response = await this.page.waitForResponse(() =>
                    true);
            }

            return page_response;
        } catch (error) {
            this.browserSession.logger.log("error", error.message, {
                type: "Browser"
            });
            process.exit(2);
        }


    }

    async browseSamples(
        page: Page,
        localStorage,
        root_uri,
        firstPartyLinks,
        userSet
    ) {
        const preset_links = [page.url(), ...userSet];
        const extra_links = (firstPartyLinks.map(l => l.href)).filter(l => !preset_links.includes(l));
        const random_links = this.browserSession.browserArgs.seed ?
            sampleSizeSeeded(extra_links, this.browserSession.browserArgs.linkLimit - preset_links.length, this.browserSession.browserArgs.seed) :
            sampleSize(extra_links, this.browserSession.browserArgs.linkLimit - preset_links.length) // can be empty!

        const browsing_history = [root_uri, ...userSet, ...random_links];

        for (const link of browsing_history.slice(1)) { // can have zero iterations!
            try {
                // check mime-type and skip if not html
                const head = await got(link, {
                    method: "HEAD",
                    // ignore Error: unable to verify the first certificate (https://stackoverflow.com/a/36194483)
                    // certificate errors should be checked in the context of the browsing and not during the mime-type check
                    https: {
                        rejectUnauthorized: false,
                    },
                });

                if (!head.headers["content-type"].startsWith("text/html")) {
                    this.browserSession.logger.log(
                        "info",
                        `skipping now ${link} of mime-type ${head["content-type"]}`,
                        {type: "Browser"}
                    );
                    continue;
                }

                this.browserSession.logger.log("info", `browsing now to ${link}`, {type: "Browser"});

                await page.goto(link, {
                    timeout: this.browserSession.browserArgs.pageLoadTimeout,
                    waitUntil: "networkidle2",
                });
            } catch (error) {
                this.browserSession.logger.log("warn", error.message, {type: "Browser"});
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, this.browserSession.browserArgs.sleep)); // in ms
            localStorage = await getLocalStorage(page, this.browserSession.logger, localStorage);
        }

        return browsing_history;
    }

    async screenshot() {
        // record screenshots
        try {
            let screenshot_top = await this.page.screenshot({
                path: this.browserSession.browserArgs.outputPath ? path.join(this.browserSession.browserArgs.outputPath, "screenshot-top.png") : undefined,
            });
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            let screenshot_bottom = await this.page.screenshot({
                path: this.browserSession.browserArgs.outputPath ? path.join(this.browserSession.browserArgs.outputPath, "screenshot-bottom.png") : undefined,
            });
            let screenshot_full = await this.page.screenshot({
                path: this.browserSession.browserArgs.outputPath ? path.join(this.browserSession.browserArgs.outputPath, "screenshot-full.png") : undefined,
                fullPage: true,
            });

            return {
                screenshot_top: Buffer.from(screenshot_top.buffer).toString('base64'),
                screenshot_bottom: Buffer.from(screenshot_bottom.buffer).toString('base64'),
                screenshot_full: Buffer.from(screenshot_full.buffer).toString('base64'),
            };

        } catch (error) {
            // see: https://github.com/EU-EDPS/website-evidence-collector/issues/21 and https://github.com/puppeteer/puppeteer/issues/2569
            this.browserSession.logger.log(
                "info",
                `not saving some screenshots due to software limitations`,
                {type: "Browser"}
            );
        }
    }
}