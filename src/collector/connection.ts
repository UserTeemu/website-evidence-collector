import url from "url";
import got from "got";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { Logger } from "winston";
import {
  getGotProxyConfiguration,
  loadProxyConfiguration,
} from "../lib/proxy_config.js";

interface TestSslArgs {
  testssl?: boolean;
  testsslExecutable?: string;
  testsslOs: "system" | "posix" | "win32";
  output?: string;
  testsslFile?: string;
}

interface Output {
  testSSLError?: string;
  testSSLErrorOutput?: string;
  testSSLErrorCode?: number;
  testSSL?: any;
  secure_connection: {
    https_support?: boolean;
    https_error?: string;
    redirects?: URL[];
    https_redirect?: boolean;
    http_error?: string;
  };
}

export async function testSSL(
  uri: string,
  args: TestSslArgs,
  logger: Logger,
  output: Output,
): Promise<void> {
  if (args.testssl) {
    logger.info("Run testssl.sh");
    let uri_ins_https = new url.URL(uri);
    uri_ins_https.protocol = "https:";

    let pathOS = getPathOS(args);

    let testsslExecutable = args.testsslExecutable || "testssl.sh";
    let testsslArgs = [
      "--ip one",
      "--quiet",
      "--hints",
      "--fast",
      "--vulnerable",
      "--headers",
      "--protocols",
      "--standard",
      "--server-defaults",
      "--server-preference",
    ];

    // testSSL only uses HTTP proxy.
    if (loadProxyConfiguration(logger)?.http_proxy) {
      testsslArgs.push("--proxy=auto");
      logger.info(
        "testssl: Proxy config found. Calling with automatic proxy settings",
      );
    }

    let outputDir = args.output;
    if (args.testsslOs !== "system" && outputDir) {
      // If testssl.sh should be formatted for some other system,
      // the path is made relative (mainly just to remove any Windows drive letters causing issues on Linux)
      // and the directory separators are changed.
      // A simple .replace won't work here because all occurrences need to be changed and we aren't yet using ES2021 so there is no .replaceAll.
      outputDir = path.relative(process.cwd(), outputDir).split(path.sep).join(pathOS.sep);
    }

    let json_file: string;

    if (outputDir) {
      let output_testssl = pathOS.join(outputDir, "testssl");
      fs.mkdirSync(output_testssl);

      json_file = pathOS.join(output_testssl, "testssl.json");
      testsslArgs.push(`--htmlfile "${pathOS.join(output_testssl, "testssl.html")}"`);
      testsslArgs.push(`--logfile "${pathOS.join(output_testssl, "testssl.log")}"`);
    } else {
      json_file = path.join(os.tmpdir(), `testssl.${Date.now()}.json`);
    }

    testsslArgs.push(`--jsonfile-pretty "${json_file}"`);
    testsslArgs.push(uri_ins_https.toString());

    try {
      let cmd = `${testsslExecutable} ${testsslArgs.join(" ")}`;
      logger.log("info", `launching testSSL: ${cmd}`, { type: "testSSL" });
      execSync(cmd);
    } catch (e: any) {
      if (e.status > 200) {
        logger.log("warn", e.message.toString(), { type: "testSSL" });
        output.testSSLError = e.message.toString();
        output.testSSLErrorOutput = e.stderr.toString();
      }
      output.testSSLErrorCode = e.status;
    }

    if (fs.existsSync(json_file)) {
      output.testSSL = JSON.parse(fs.readFileSync(json_file, "utf8"));
    }

    if (!args.output) {
      fs.removeSync(json_file);
    }
  } else if (args.testsslFile) {
    output.testSSL = JSON.parse(fs.readFileSync(args.testsslFile, "utf8"));
  }
}

export async function testHttps(
  uri: string,
  output: Output,
  logger: Logger,
): Promise<void> {
  logger.info("Run testHttps");

  let uri_ins_https: url.URL;
  let proxyConfig = getGotProxyConfiguration(logger);

  try {
    uri_ins_https = new url.URL(uri);
    uri_ins_https.protocol = "https:";

    await got(uri_ins_https.toString(), {
      followRedirect: false,
      ...(proxyConfig && { agent: proxyConfig }),
    });

    output.secure_connection.https_support = true;
  } catch (error: any) {
    // Log the full error object
    logger.error(`testHttps: ${error.toString()}`);
    logger.error("testHttps:", { error });
    output.secure_connection.https_support = false;
    output.secure_connection.https_error = error.toString();
  }

  try {
    let uri_ins_http = new url.URL(uri);
    uri_ins_http.protocol = "http:";

    let res = await got(uri_ins_http.toString(), {
      followRedirect: true,
      https: {
        rejectUnauthorized: false,
      },
      ...(proxyConfig && { agent: proxyConfig }),
    });

    output.secure_connection.redirects = res.redirectUrls;

    if (output.secure_connection.redirects.length <= 0) {
      output.secure_connection.https_redirect = false;
      return;
    }

    let final_redirect_url = res.redirectUrls[res.redirectUrls.length - 1];

    output.secure_connection.https_redirect =
      final_redirect_url.protocol.includes("https");
  } catch (error: any) {
    logger.error(`testHttps: ${error.toString()}`);
    logger.error("testHttps:", { error });
    output.secure_connection.http_error = error.toString();
  }
}

function getPathOS(args: TestSslArgs) {
  switch (args.testsslOs) {
    case "posix":
      return path.posix;
    case "win32":
      return path.win32;
    case "system":
      return path;
  }
}