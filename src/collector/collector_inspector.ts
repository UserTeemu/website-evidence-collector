// jshint esversion: 8

import fs from "fs-extra";
import yaml from "js-yaml";
import path from "path";
import url from "url";
import escapeRegExp from "lodash/escapeRegExp.js";
import { isFirstParty } from "../lib/tools.js";
import { Cookie, Page } from "puppeteer";

const __dirname = import.meta.dirname;

export interface EnhancedCookie extends Cookie {
  expiresUTC?: Date;
  expiresDays?: number;
  event_meta_data?: {};
}

export async function collectLinks(page, logger) {
  // get all links from page
  const links_all_with_duplicates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]")).map(
      (a: HTMLAnchorElement) => {
        return {
          href: a.href.toString().split("#").shift(), // link without fragment
          inner_text: a.innerText,
          inner_html: a.innerHTML.trim(),
        };
      },
    );
  });

  const links_http_with_duplicates = links_all_with_duplicates.filter(
    (link) => {
      if (link.href === "[object SVGAnimatedString]") {
        logger.log("warn", "Unsupported SVG link detected and discarded", link);
      }
      return link.href.startsWith("http");
    },
  );

  // https://stackoverflow.com/a/70406623/1407622
  return Array.from(
    new Map(links_http_with_duplicates.map((v) => [v.href, v])).values(),
  );
}

export async function mapLinksToParties(links, hosts, refs_regexp) {
  const output = { thirdParty: [], firstParty: [] };

  for (const li of links) {
    const l = url.parse(li.href);

    if (isFirstParty(refs_regexp, l)) {
      output.firstParty.push(li);
      hosts.links.firstParty.add(l.hostname);
    } else {
      output.thirdParty.push(li);
      hosts.links.thirdParty.add(l.hostname);
    }
  }

  return output;
}

export async function filterSocialPlatforms(links) {
  // prepare regexp to match social media platforms
  let social_platforms_raw = yaml.load(
    fs.readFileSync(
      path.join(__dirname, "../assets/social-media-platforms.yml"),
      "utf8",
    ),
  ) as string[];
  let social_platforms = social_platforms_raw.map(escapeRegExp);
  let social_platforms_regexp = new RegExp(
    `\\b(${social_platforms.join("|")})\\b`,
    "i",
  );

  return links.filter((link) => link.href.match(social_platforms_regexp));
}

export async function filterKeywords(links) {
  let rawKeywords = yaml.load(
    fs.readFileSync(path.join(__dirname, "../assets/keywords.yml"), "utf8"),
  ) as string[];
  let keywords = rawKeywords.map(escapeRegExp);
  let keywords_regexp = new RegExp(keywords.join("|"), "i");

  return links.filter(
    (link) =>
      link.href.match(keywords_regexp) ||
      link.inner_html.match(keywords_regexp),
  );
}

export async function unsafeWebforms(page) {
  return await page.evaluate(() => {
    return [].map
      .call(Array.from(document.querySelectorAll("form")), (form) => ({
        id: form.id,
        action: new URL(form.getAttribute("action"), form.baseURI).toString(),
        method: form.method,
      }))
      .filter((form) => form.action.startsWith("http:"));
  });
}

export async function collectCookies(
  page,
  start_time,
): Promise<EnhancedCookie[]> {
  let rawCookies: EnhancedCookie[] = (
    await page._client().send("Network.getAllCookies")
  ).cookies;
  // work-around: Chromium retains cookies with empty name and value
  // if web servers send empty HTTP Cookie Header, i.e. "Set-Cookie: "
  // example from https://stackoverflow.com/a/50290081/1407622

  return rawCookies
    .filter((cookie) => cookie.name !== "")
    .map((cookie) => {
      if (cookie.expires > -1) {
        // add derived attributes for convenience
        cookie.expiresUTC = new Date(cookie.expires * 1000);
        cookie.expiresDays =
          Math.round(
            (cookie.expiresUTC.getTime() - start_time.getTime()) /
              (10 * 60 * 60 * 24),
          ) / 100;
      }

      cookie.domain = cookie.domain.replace(/^\./, ""); // normalise domain value

      return cookie;
    });
}
