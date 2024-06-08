// jshint esversion: 8

const fs = require("fs-extra");
const yaml = require("js-yaml");
const path = require("path");
const url = require("url");
const escapeRegExp = require("lodash/escapeRegExp");

const {
  isFirstParty,
  getLocalStorage,
  safeJSONParse,
} = require("../lib/tools");

async function collectLinks(page, logger) {
  // get all links from page
  const elements = await page.$$("a[href]");

  const links_with_duplicates = await Promise.all(elements.map(async element => {
    const remoteElement = await element.remoteObject();
    if (remoteElement.className !== 'HTMLAnchorElement') {
      logger.log('warn', 'Unsupported link detected and discarded', remoteElement);
      return [];
    }

    const outObject = {
      href: await getElementProperty(element, "href"),
      inner_text: await getElementProperty(element, "innerText"),
      inner_html: (await getElementProperty(element, "innerHTML")).trim()
    };

    const contentFrame = await element.contentFrame();
    const parentURL = (contentFrame ?? page).url();

    // Parse URL
    let href;
    try {
      href = new URL(outObject.href, parentURL);
    } catch (e) {
      return []; // Skip invalid URLs.
    }
    href.fragment = ""; // link without fragment

    if (href.protocol !== "http:" && href.protocol !== "https:") {
      return []; // Skip non-HTTP(S) links.
    }

    outObject.href = href.toString();
    return outObject;
  })).then(array => array.flat());

  const links_without_duplicates = Array.from(new Set(links_with_duplicates));

  return links_without_duplicates;
}

async function getElementProperty(element, propertyName) {
  const property = await element.getProperty(propertyName);
  const propertyObject = await property.remoteObject();
  return propertyObject.value;
}

async function mapLinksToParties(links, hosts, refs_regexp) {
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

async function filterSocialPlatforms(links) {
  // prepare regexp to match social media platforms
  let social_platforms = yaml
    .load(
      fs.readFileSync(
        path.join(__dirname, "../assets/social-media-platforms.yml"),
        "utf8"
      )
    )
    .map((platform) => {
      return escapeRegExp(platform);
    });
  let social_platforms_regexp = new RegExp(
    `\\b(${social_platforms.join("|")})\\b`,
    "i"
  );

  return links.filter((link) => {
    return link.href.match(social_platforms_regexp);
  });
}

async function filterKeywords(links) {
  let keywords = yaml
    .load(
      fs.readFileSync(path.join(__dirname, "../assets/keywords.yml"), "utf8")
    )
    .map((keyword) => {
      return escapeRegExp(keyword);
    });
  let keywords_regexp = new RegExp(keywords.join("|"), "i");

  return links.filter((link) => {
    return (
      link.href.match(keywords_regexp) || link.inner_html.match(keywords_regexp)
    );
  });
}

async function unsafeWebforms(page) {
  const forms = await page.$$("form");

  return Promise.all(forms.map(async form => {
    const outObject = {};

    for (const propertyName of ["id", "action", "method"]) {
      outObject[propertyName] = await getElementProperty(form, propertyName);
    }

    const contentFrame = await form.contentFrame();
    const parentURL = (contentFrame ?? page).url();
    const actionURL = new URL(outObject.action, parentURL);

    if (actionURL.protocol === "http:") {
      // The form is insecure
      return outObject;
    } else {
      // The form is using a secure protocol (HTTPS), so it does not need to be collected.
      return [];
    }
  })).then(array => array.flat());
}

async function collectCookies(page, start_time) {
  // example from https://stackoverflow.com/a/50290081/1407622
  const cookies = (await page._client().send("Network.getAllCookies")).cookies
    .filter((cookie) => {
      // work-around: Chromium retains cookies with empty name and value
      // if web servers send empty HTTP Cookie Header, i.e. "Set-Cookie: "
      return cookie.name != "";
    })
    .map((cookie) => {
      if (cookie.expires > -1) {
        // add derived attributes for convenience
        cookie.expiresUTC = new Date(cookie.expires * 1000);
        cookie.expiresDays =
          Math.round((cookie.expiresUTC - start_time) / (10 * 60 * 60 * 24)) /
          100;
      }

      cookie.domain = cookie.domain.replace(/^\./, ""); // normalise domain value

      return cookie;
    });

  return cookies;
}

async function beacons() {}

module.exports = {
  collectLinks,
  collectCookies,
  filterSocialPlatforms,
  filterKeywords,
  unsafeWebforms,
  mapLinksToParties,
};
