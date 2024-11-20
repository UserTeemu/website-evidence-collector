import url from "url";
import {
  PuppeteerBlocker,
  fromPuppeteerDetails,
} from "@ghostery/adblocker-puppeteer";
import path from "path";
import fs from "fs";
import { Page } from "puppeteer";
import { Logger } from "winston";
import { safeJSONParse } from "../../lib/tools.js";

const __dirname = import.meta.dirname;

export interface CollectedBeacon {
  url: string;
  query: string;
  filter: string;
  listName: string;
  stack: {}[];
  timestamp: string;
}

export class BeaconRecorder {
  public collectedBeacons: CollectedBeacon[] = [];
  private blockers: { [key: string]: PuppeteerBlocker };

  constructor(
    private page: Page,
    private logger: Logger,
  ) {
    this.blockers = this.loadBlockers();
  }

  async setup_beacon_recording() {
    // prepare easyprivacy list matching
    // requires to call somewhere: await page.setRequestInterception(true);
    this.page.on("request", (request) => {
      Object.entries(this.blockers).forEach(([listName, blocker]) => {
        const {
          match, // `true` if there is a match
          filter, // instance of NetworkFilter which matched
        } = blocker.match(fromPuppeteerDetails(request));

        if (match) {
          let stack = [
            {
              fileName: request.frame()?.url(),
              source: `requested from ${
                request.frame()?.url() || "undefined source"
              } and matched with ${listName} filter ${filter}`,
            },
          ];

          const parsedUrl = url.parse(request.url());
          let query = null;
          if (parsedUrl.query) {
            query = this.decodeURLParams(parsedUrl.query);
            for (let param in query) {
              query[param] = safeJSONParse(query[param]);
            }
          }
          this.collectedBeacons.push({
            url: request.url(),
            query: query,
            filter: filter.toString(),
            listName: listName,
            timestamp: new Date().toUTCString(),
            stack: stack,
          });
          let message = `Potential Tracking Beacon captured via ${listName} with endpoint ${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}.`;
          this.logger.debug(message, {
            type: "Request.Tracking",
            stack: stack,
            data: {
              url: request.url(),
              query: query,
              filter: filter.toString(),
              listName: listName,
            },
          });
        }
      });
    });
  }

  // source: https://gist.github.com/pirate/9298155edda679510723#gistcomment-2734349
  decodeURLParams(search: string) {
    const hashes = search.slice(search.indexOf("?") + 1).split("&");
    return hashes.reduce((params, hash) => {
      const split = hash.indexOf("=");

      if (split < 0) {
        return Object.assign(params, {
          [hash]: null,
        });
      }

      const key = hash.slice(0, split);
      const val = hash.slice(split + 1);

      try {
        return Object.assign(params, { [key]: decodeURIComponent(val) });
      } catch {
        return Object.assign(params, { [key]: val });
      }
    }, {});
  }

  loadBlockers() {
    // The following options make sure that blocker will behave optimally for the
    // use-case of identifying blocked network requests as well as the rule which
    // triggered blocking in the first place.
    let blockerOptions = {
      // This makes sure that the instance of `PuppeteerBlocker` keeps track of the
      // exact original rule form (from easylist or easyprivacy). Otherwise some
      // information might be lost and calling `toString(...)` will only give back
      // an approximate version.
      debug: true,

      // By default, instance of `PuppeteerBlocker` will perform some dynamic
      // optimizations on rules to increase speed. As a result, it might not always
      // be possible to get back the original rule which triggered a 'match' for
      // a specific request. Disabling these optimizations will always ensure we
      // can know which rule triggered blocking.
      enableOptimizations: false,

      // We are only interested in "network rules" to identify requests which would
      // be blocked. Disabling "cosmetic rules" allows to resources.
      loadCosmeticFilters: false,
    };

    // setup easyprivacy matching
    // https://github.com/cliqz-oss/adblocker/issues/123
    return {
      "easyprivacy.txt": PuppeteerBlocker.parse(
        fs.readFileSync(
          path.join(__dirname, "../../assets/easyprivacy.txt"),
          "utf8",
        ),
        blockerOptions,
      ),
      "fanboy-annoyance.txt": PuppeteerBlocker.parse(
        fs.readFileSync(
          path.join(__dirname, "../../assets/fanboy-annoyance.txt"),
          "utf8",
        ),
        blockerOptions,
      ),
    };
  }
}
