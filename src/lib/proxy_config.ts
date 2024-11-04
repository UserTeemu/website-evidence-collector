/**
 * @file Set predefined cookies in the browser before browsing starts
 * @author European Data Protection Supervisor
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */
import {Logger} from "winston";
import {HttpProxyAgent, HttpsProxyAgent} from "hpagent";


interface ProxyConfig {
    http_proxy?: string;
    https_proxy?: string;
}

/// Singleton instance of the proxy configuration.
/// undefined = Config was not yet tried to load
/// null = no config is present
/// ProxyConfig = at least one variable of http_proxy or https_proxy is set
let proxyConfigInstance: ProxyConfig | null | undefined = undefined;


export function loadProxyConfiguration(logger: Logger): ProxyConfig {
    if (proxyConfigInstance !== undefined) {
        return proxyConfigInstance;
    }

    let proxyConfig: ProxyConfig = {
        http_proxy: process.env.http_proxy,
        https_proxy: process.env.https_proxy,
    }

    if (!proxyConfig.http_proxy && !proxyConfig.https_proxy) {
        logger.info("No proxy configuration found.")
        proxyConfigInstance = null;
        return proxyConfigInstance;
    }

    let foundProxyConfig = [
        proxyConfig.https_proxy ? "https_proxy" : "",
        proxyConfig.http_proxy ? "http_proxy" : "",
    ]
    logger.info(`Proxy configuration found for ${foundProxyConfig}`)

    proxyConfigInstance = proxyConfig;

    return proxyConfigInstance;
}

export function getChromiumProxyConfiguration(logger: Logger): string | null {
    loadProxyConfiguration(logger);

    if(proxyConfigInstance==null) {
        return null;
    }

    let chromiumProxyConfiguration = "--proxy-server=";

    if (proxyConfigInstance.http_proxy) {
        chromiumProxyConfiguration += `http=${proxyConfigInstance.http_proxy};`
    }

    if (proxyConfigInstance.https_proxy) {
        chromiumProxyConfiguration += `https=${proxyConfigInstance.https_proxy};`;
    }

    chromiumProxyConfiguration=chromiumProxyConfiguration.slice(0, -1)

    logger.info(`Chromium Proxy Configuration found. ${chromiumProxyConfiguration}`)

    return chromiumProxyConfiguration;
}

export function getGotProxyConfiguration(logger: Logger): undefined | {
    http: HttpProxyAgent | undefined,
    https: HttpsProxyAgent | undefined
} {
    loadProxyConfiguration(logger);

    if(proxyConfigInstance==null) {
        return null;
    }

    const httpAgent = proxyConfigInstance.http_proxy
        ? new HttpProxyAgent({proxy: proxyConfigInstance.http_proxy})
        : undefined;

    const httpsAgent = proxyConfigInstance.https_proxy
        ? new HttpsProxyAgent({proxy: proxyConfigInstance.https_proxy})
        : undefined;

    if (!httpAgent && !httpsAgent) {
        return undefined;
    }

    return {
        ...(httpAgent ? {http: httpAgent} : {http: undefined}),
        ...(httpsAgent ? {https: httpsAgent} : {https: undefined}),
    };

}
