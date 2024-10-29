/**
 * @file Set predefined cookies in the browser before browsing starts
 * @author BitnessWise <https://www.bitnesswise.com/> and European Data Protection Supervisor
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import fs from 'fs';
// @ts-ignore
import {Page,  SetCookie} from 'puppeteer';
import {Logger} from "winston";

// default cookie expiration time, this should result in a session-cookie
const sessionCookieExpirationTime = -1;


export async function set_cookies(
    page: Page,
    uri_ins: string,
    setCookies: string,
    output,
    logger: Logger
): Promise<void> {
    // check if cookies need to be added
    if (setCookies) {
        // variable that will buffer all the valid cookies that are passed
        let cookieJar: SetCookie[] = [];
        if (fs.existsSync(setCookies)) {
            // passed argument is the location of a file
            logger.log(
                'info',
                `Read cookie parameter from the existing file: ${setCookies}`
            );
            let requestedDomain: string, protocol: string;

            // TODO: isn't uri_ins always starting with http?
            if (uri_ins.startsWith('http')) {
                requestedDomain = uri_ins.split('/')[2];
                protocol = uri_ins.split(':')[0];
            } else {
                requestedDomain = uri_ins.split('/')[0];
                protocol = 'http';
            }
            // cookiefile should be small, so reading it into memory
            const lines = fs
                .readFileSync(setCookies, {encoding:'utf-8'})
                .trim()
                .split(/\r?\n/);

            for (let line of lines) {
                let httpOnly = false;
                if (line.trim().substring(0, 10) === '#HttpOnly_') {
                    // cookie that is flagged as http-only. stripping the flag so we can match the domain later on.
                    line = line.trim().substring(10);
                    httpOnly = true;
                } else if (line.trim().indexOf('#') === 0) {
                    // this line is a comment; not parsing it
                    continue;
                } else if (line.trim() === '') {
                    // this is a blank line; ignoring it
                    continue;
                }

                let cookieArr = line.split('\t');
                if (cookieArr.length === 7) {
                    // valid line, adding cookie
                    cookieJar.push({
                        name: cookieArr[5],
                        value: cookieArr[6],
                        expires:
                            cookieArr[4] === '0'
                                ? sessionCookieExpirationTime
                                : parseInt(cookieArr[4]),
                        domain: cookieArr[0],
                        path: cookieArr[2],
                        secure: cookieArr[3].toLowerCase() == 'true',
                    });
                } else {
                    logger.log('error', 'invalid formatted line - skipping it : ' + line);
                }
            }
        } else {
            logger.log(
                'info',
                'cookie parameter is not an existing file; parsing it as key=value pairs'
            );

            let jarArr = setCookies.split(';');

            for (let cookieStr of jarArr) {
                if (cookieStr.indexOf('=') >= 0) {
                    let [cookieName, cookieValue] = cookieStr.split(/=(.+)/);
                    cookieJar.push({
                        value: cookieValue,
                        expires: sessionCookieExpirationTime,
                        url: uri_ins,
                        name: cookieName,
                    });
                }
            }
        }
        // adding cookies from the buffer if we have them
        if (cookieJar.length > 0) {
            for (let c of cookieJar) {
                logger.log(
                    'info',
                    `adding ${
                        c.expires >= 0 ? 'persistent' : 'session'
                    } cookie ${c.name}`
                );
            }
            output.browser.preset_cookies = cookieJar;
            // https://pptr.dev/#?product=Puppeteer&version=v2.1.1&show=api-pagesetcookiecookies
            await page.setCookie(...cookieJar);
        }
    }
}
