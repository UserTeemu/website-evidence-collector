import flatten from "lodash/flatten.js";
import groupBy from "lodash/groupBy.js";
import url from "url";
import { isFirstParty } from "../lib/tools.js";
import { PageSession } from "../collector/page-session.js";
import { Logger } from "winston";
import { CollectedCookie } from "../lib/cookie-recorder.js";
import { EnhancedCookie } from "../collector/collector_inspector.js";

class Inspector {
  private eventData: any;
  private logger: Logger;
  private output: any;
  private pageSession: PageSession;

  constructor(logger: any, pageSession: any, output: any) {
    this.eventData = null;
    this.logger = logger;
    this.output = output;
    this.pageSession = pageSession;
  }

  async run(): Promise<any> {
    await this.init();
    await this.inspectCookies();
    await this.inspectLocalStorage();
    await this.inspectBeacons();
    await this.inspectHosts();

    return this.output;
  }

  private async init(): Promise<void> {
    let event_data_all = await new Promise<any[]>((resolve, reject) => {
      this.logger.query(
        {
          start: 0,
          order: "desc",
          limit: Infinity,
          fields: undefined,
        },
        (err: Error | null, results: { file: [] }) => {
          if (err) return reject(err);
          return resolve(results.file);
        },
      );
    });

    this.eventData = event_data_all.filter((event) => !!event.type);
  }

  private async inspectCookies(): Promise<void> {
    let collectedCookies = this.pageSession.cookieRecorder.collectedCookies;
    // we get all cookies from the log, which can be both JS and http cookies
    let cookies_from_events = flatten(
      collectedCookies.map((event) => {
        event.data.forEach((cookie) => {
          cookie.event_meta_data = {
            stack: event.stack,
            type: event.type,
            location: event.location,
          };
        });
        return event.data;
      }),
    ).filter((cookie: any) => cookie.value); // don't consider deletion events with no value defined

    cookies_from_events.forEach((event_cookie: CollectedCookie) => {
      // we compare the eventlog with what was collected
      let matched_cookie = this.output.cookies.find(
        (cookie: EnhancedCookie) => {
          return (
            cookie.name == event_cookie.key &&
            cookie.domain == event_cookie.domain &&
            cookie.path == event_cookie.path
          );
        },
      );

      // if there is a match, we enrich with the log entry
      // else we add a new entry to the output.cookies array
      if (matched_cookie) {
        matched_cookie.log = event_cookie.event_meta_data;
      } else {
        let cookie: any = {
          // TODO use my cookie type
          name: event_cookie.key,
          domain: event_cookie.domain,
          path: event_cookie.path,
          value: event_cookie.value,
          expires: event_cookie.expires,
          log: event_cookie.event_meta_data,
        };
        // ToughCookie library defaults session cookies to infinity
        // https://github.com/salesforce/tough-cookie/blob/master/lib/cookie/cookie.ts#L406
        if (!event_cookie.expires || event_cookie.expires == "Infinity") {
          cookie.expires = -1;
          cookie.session = true;
        } else {
          cookie.expiresDays =
            Math.round(
              (new Date(event_cookie.expires).getTime() -
                new Date(event_cookie.creation).getTime()) /
                (10 * 60 * 60 * 24),
            ) / 100;
          cookie.session = false;
        }
        this.output.cookies.push(cookie);
      }
    });

    this.output.cookies.forEach((cookie) => {
      // after the sync, we determine if its first party or 3rd
      // if a domain is empty, its a JS cookie setup as first party
      if (
        isFirstParty(
          this.pageSession.refs_regexp,
          url.parse(`cookie://${cookie.domain}${cookie.path}`),
        ) ||
        cookie.domain === ""
      ) {
        cookie.firstPartyStorage = true;
        this.pageSession.hosts.cookies.firstParty.add(cookie.domain);
      } else {
        cookie.firstPartyStorage = false;
        this.pageSession.hosts.cookies.thirdParty.add(cookie.domain);
      }
    });

    // finally we sort the cookies based on expire data - because ?
    this.output.cookies = this.output.cookies.sort(
      (a, b) => b.expires - a.expires,
    );
  }

  private async inspectLocalStorage(): Promise<void> {
    let storage_from_events = this.eventData.filter((event) => {
      return event.type.startsWith("Storage");
    });

    Object.keys(this.output.localStorage).forEach((origin) => {
      let hostname = new url.URL(origin).hostname;
      let isFirstPartyStorage = isFirstParty(
        this.pageSession.refs_regexp,
        url.parse(origin),
      );

      if (isFirstPartyStorage) {
        this.pageSession.hosts.localStorage.firstParty.add(hostname);
      } else {
        this.pageSession.hosts.localStorage.thirdParty.add(hostname);
      }

      //
      let originStorage = this.output.localStorage[origin];
      Object.keys(originStorage).forEach((key) => {
        // add if entry is linked to first-party host
        originStorage[key].firstPartyStorage = isFirstPartyStorage;
        // find log for a given key
        let matched_event = storage_from_events.find((event) => {
          return (
            origin == event.origin && Object.keys(event.data).includes(key)
          );
        });

        if (!!matched_event) {
          originStorage[key].log = {
            stack: matched_event.stack,
            type: matched_event.type,
            timestamp: matched_event.timestamp,
            location: matched_event.location,
          };
        }
      });
    });
  }

  private async inspectBeacons() {
    let beacons = this.pageSession.beaconRecorder.collectedBeacons;
    for (const beacon of beacons) {
      const l = url.parse(beacon.url);

      if (beacon.listName === "easyprivacy.txt") {
        if (isFirstParty(this.pageSession.refs_regexp, l)) {
          this.pageSession.hosts.beacons.firstParty.add(l.hostname);
        } else {
          this.pageSession.hosts.beacons.thirdParty.add(l.hostname);
        }
      }
    }

    // make now a summary for the beacons (one of every hostname+pathname and their occurrance)
    let beacons_from_events_grouped = groupBy(beacons, (beacon) => {
      let url_parsed = url.parse(beacon.url);
      return `${url_parsed.hostname}${url_parsed.pathname.replace(/\/$/, "")}`;
    });

    let beacons_summary = [];
    for (const [_, beacon_group] of Object.entries(
      beacons_from_events_grouped,
    )) {
      beacons_summary.push(
        Object.assign({}, beacon_group[0], {
          occurrances: beacon_group.length,
        }),
      );
    }

    beacons_summary.sort((b1, b2) => b2.occurances - b1.occurances);

    this.output.beacons = beacons_summary;
  }

  private async inspectHosts(): Promise<void> {
    // Hosts Inspection
    let arrayFromParties = function (array) {
      return {
        firstParty: Array.from(array.firstParty),
        thirdParty: Array.from(array.thirdParty),
      };
    };

    this.output.hosts = {
      requests: arrayFromParties(this.pageSession.hosts.requests),
      beacons: arrayFromParties(this.pageSession.hosts.beacons),
      cookies: arrayFromParties(this.pageSession.hosts.cookies),
      localStorage: arrayFromParties(this.pageSession.hosts.localStorage),
      links: arrayFromParties(this.pageSession.hosts.links),
      contentSecurityPolicy: arrayFromParties(
        this.pageSession.hosts.contentSecurityPolicy,
      ),
    };
  }
}

export default Inspector;
