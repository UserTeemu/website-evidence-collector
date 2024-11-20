/**
 * @file Setup recording of Cookie and LocalStorage API use
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

// The code contained in the functions like 'Object.defineProperty(window, localStorage' is passed to the browser and needs to be plain JS.
// @ts-nocheck
import { safeJSONParse } from "./tools.js";
import { Cookie as cookieParser, defaultPath } from "tough-cookie";
import fs from "fs";
import groupBy from "lodash/groupBy.js";
import url from "url";

import { createRequire } from "module";
import { Page } from "puppeteer";
import { Logger } from "winston";
import { cookieLogger, localStorageLogger } from "./web-api-logger.js";
import { safeJSONParse } from "../../lib/tools.js";

const require = createRequire(import.meta.url);

export interface CollectedCookieEvent {
  type: "Cookie.HTTP" | "Cookie.JS";
  location: string;
  raw: string;
  stack: {}[];
  data: CollectedCookie[];
}

export interface CollectedCookie {
  key: string;
  value: string;
  expires: string;
  domain: string;
  path: string;
  creation: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "none" | "lax" | "strict";
  event_meta_data?: {};
}

export class CookieRecorder {
  constructor(
    private page: Page,
    private logger: Logger,
  ) {}
  public collectedCookies: CollectedCookieEvent[] = [];

  async setup_cookie_recording() {
    // inject stacktraceJS https://www.stacktracejs.com/
    const stackTraceHelper = fs.readFileSync(
      require.resolve("stacktrace-js/dist/stacktrace.js"),
      "utf8",
    );

    // https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
    await this.page.evaluateOnNewDocument(stackTraceHelper);

    await this.page.evaluateOnNewDocument(cookieLogger);
    await this.page.evaluateOnNewDocument(localStorageLogger);

    // we modify the browser window and expose the function reportEvent on window
    // this is used to pull out browser-context data and sending it our logger
    await this.page.exposeFunction(
      "reportEvent",
      (type, stack, data, location) => {
        // determine actual browsed page
        let browsedLocation = location.href;
        if (location.ancestorOrigins && location.ancestorOrigins[0]) {
          // apparently, this is a chrome-specific API
          browsedLocation = location.ancestorOrigins[0];
        }

        // construct the event object to log
        // include the stack
        let event = {
          type: type,
          stack: stack.slice(1, 3), // remove reference to Document.set (0) and keep two more elements (until 3)
          origin: location.origin,
          location: browsedLocation,
        };

        // set the log entry message - this depends on what type of event is being logged
        // only js cookies and localstorage events should be logged here
        let message;
        switch (type) {
          case "Cookie.JS":
            event.raw = data;
            let cookie = cookieParser.parse(data);

            // what is the domain if not set explicitly?
            // https://stackoverflow.com/a/5258477/1407622
            cookie.domain = cookie.domain || location.hostname;

            // what if the path is not set explicitly?
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes
            // https://github.com/salesforce/tough-cookie#defaultpathpath
            // TODO How can be sure that browsedLocation corresponds to the JS execution context when cookie is set?
            cookie.path =
              cookie.path || defaultPath(url.parse(browsedLocation).pathname);

            event.data = [cookie];

            message = `${
              event.data[0].expires == "Infinity" ? "Session" : "Persistant"
            } Cookie (JS) set for host ${event.data[0].domain} with key ${
              event.data[0].key
            }.`;
            this.collectedCookies.push(event);
            break;

          case "Storage.LocalStorage":
            message = `LocalStorage filled with key(s) ${Object.keys(
              data,
            )} for origin ${location.origin}.`;

            event.raw = data;

            event.data = {};
            for (const key of Object.keys(data)) {
              event.data[key] = safeJSONParse(data[key]);
            }
            break;

          default:
            message = "";

            event.data = data;
        }

        this.logger.debug(message, event);
      },
    );

    // track incoming traffic for HTTP cookies
    // this creates an event handler - should be disposed
    this.page.on("response", (response) => {
      const req = response.request();
      // console.log(req.method(), response.status(), req.url());

      let cookieHTTP = response.headers()["set-cookie"];
      if (cookieHTTP) {
        let stack = [
          {
            fileName: req.url(),
            source: `set in Set-Cookie HTTP response header for ${req.url()}`,
          },
        ];
        const domain = new url.URL(response.url()).hostname;
        const data = cookieHTTP
          .split("\n")
          .map((c) => {
            return (
              cookieParser.parse(c) || {
                value: c,
                domain: undefined,
                path: undefined,
                key: undefined,
              }
            );
          })
          .map((cookie) => {
            // what is the domain if not set explicitly?
            // https://stackoverflow.com/a/5258477/1407622
            cookie.domain = cookie.domain || domain;

            // what if the path is not set explicitly?
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes
            // https://github.com/salesforce/tough-cookie#defaultpathpath
            cookie.path =
              cookie.path || defaultPath(new url.URL(response.url()).pathname);
            return cookie;
          });

        const dataHasKey = groupBy(data, (cookie) => {
          return !!cookie.key;
        });
        const valid = dataHasKey["true"] || [];
        const invalid = dataHasKey["false"] || [];

        const messages = [
          `${valid.length} Cookie(s) (HTTP) set for host ${domain}${
            valid.length ? " with key(s) " : ""
          }${valid.map((c) => c.key).join(", ")}.`,
        ];
        if (invalid.length) {
          messages.push(
            `${
              invalid.length
            } invalid cookie header(s) set for host ${domain}: "${invalid
              .map((c) => c.value)
              .join(", ")}".`,
          );
        }

        // find mainframe
        let location;
        let frame = response.frame();
        if (frame) {
          while (frame.parentFrame()) {
            frame = frame.parentFrame();
          }
          location = frame.url();
        } else {
          // default to response.url() if frame() is undefined. Unclear when this happens #todo.
          location = response.url();
        }

        messages.forEach((message) => {
          this.collectedCookies.push({
            type: "Cookie.HTTP",
            stack: stack,
            location: location,
            raw: cookieHTTP,
            data: valid,
          });
          this.logger.debug(message, {
            type: "Cookie.HTTP",
            stack: stack,
            location: location,
            raw: cookieHTTP,
            data: valid,
          });
        });
      }
    });
  }
}
