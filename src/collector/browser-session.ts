import puppeteer, { Browser, Page } from "puppeteer";
import PuppeteerHar from "puppeteer-har";
import path from "path";
import { getChromiumProxyConfiguration } from "../lib/proxy_config.js";
import { Logger } from "winston";
import { PageSession } from "./page-session.js";

const UserAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/126.0.6478.126 Safari/537.36";
const WindowSize = { width: 1680, height: 927 };

export interface Hosts {
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
  public logger: Logger;
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
    let proxyConfig = getChromiumProxyConfiguration(this.logger);

    this.logger.info(
      `Chromium called  with following options: ${this.browserArgs.browserOptions}`,
    );

    this.browser = await puppeteer.launch({
      headless: this.browserArgs.headless,
      defaultViewport: WindowSize,
      userDataDir:
        this.browserArgs.browserProfile ||
        (this.browserArgs.outputPath
          ? path.join(this.browserArgs.outputPath, "browser-profile")
          : undefined),
      args: [
        ...(proxyConfig != null ? [proxyConfig] : []),
        `--user-agent=${UserAgent}`,
        `--disable-dev-shm-usage`,
        "--disable-gpu",
        `--window-size=${WindowSize.width},${WindowSize.height}`,
      ].concat(this.browserArgs.browserOptions, this.browserArgs["--"] || []),
    });
  }

  async start(output) {
    let session = new PageSession(this, output);
    await session.initialize();
    return session;
  }

  async end() {
    if (this.har) {
      await this.har.stop();
    }
    await this.page.close();
    await this.browser.close();
  }
}
