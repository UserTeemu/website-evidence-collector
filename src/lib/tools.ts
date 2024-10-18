/**
 * @file Tooling functions
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import * as url from 'url';
import { Page } from 'puppeteer';
import {Logger} from "winston";
import seedrandom from 'seedrandom';
import _lodash from 'lodash';
import {UrlWithStringQuery} from "node:url";

// lodash's sampleSize() function, seeded. https://github.com/lodash/lodash/issues/3289
export function sampleSizeSeeded<T>(array: T[], sampleSize:number, seed?: string): T[] {
  // Sets a global seed for the random number generator and initializes lodash instance using this seed.
  seedrandom(seed, { global: true });
  const _ = _lodash.runInContext();
  return _.sampleSize(array,sampleSize);
}

export function safeJSONParse(obj: string): any {
  try {
    return JSON.parse(obj);
  } catch (e) {
    return obj;
  }
}

export function isFirstParty(refs_regexp: RegExp, uri_test: UrlWithStringQuery): boolean {
  // is first party if uri_test starts with any uri_ref ignoring, parameters,protocol and port
  let test_stripped = `${uri_test.hostname}${uri_test.pathname}`;

  return !!test_stripped.match(refs_regexp);
}

export async function getLocalStorage(page: Page, logger: Logger, data:
     {}): Promise<{}> {
  // based on https://stackoverflow.com/a/54355801/1407622
  const client = page['_client']();
  for (const frame of page.frames()) {
    // it is unclear when the following url values occur:
    // potentially about:blank is the frame before the very first page is browsed
    if (!frame.url().startsWith("http")) continue; // filters chrome-error://,about:blank and empty url

    const securityOrigin = new url.URL(frame.url()).origin;
    let response;
    try {
      response = await client.send("DOMStorage.getDOMStorageItems", {
        storageId: { isLocalStorage: true, securityOrigin },
      });
    } catch (error) {
      // ignore error if no localStorage for given origin can be
      // returned, see also: https://stackoverflow.com/q/62356783/1407622
      logger.log("warn", (error as Error).message, { type: "Browser" });
    }
    if (response && response.entries.length > 0) {
      let entries: { [key: string]: { value: any } } = {};
      for (const [key, val] of response.entries) {
        entries[key] = {
          value: safeJSONParse(val),
        };
      }
      // console.log(response.entries);
      data[securityOrigin] = Object.assign({}, data[securityOrigin], entries);
    }
  }
  return data;
}
