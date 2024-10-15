import pickBy from 'lodash/pickBy';
import { safeJSONParse } from '../lib/tools';
import os from 'os';
import url from 'url';
import { gitDescribeSync } from 'git-describe';

export interface CreateOutputArgs {
  url: string;
  firstPartyUri: string[];
  title?: string;
  taskDescription?: string;
}

export interface CollectorOutput {
  title: string;
  task_description: string;
  uri_ins: string;
  uri_refs: string[];
  uri_dest: string | null;
  uri_redirects: any;
  secure_connection: {
    https_redirect: boolean;
    redirects: any[];
    https_support: boolean;
    https_error: any;
    http_error: any;
  };
  testSSLError: any;
  testSSLErrorOutput: any;
  testSSLErrorCode: any;
  testSSL: any;
  host: string;
  script: {
    host: string;
    version: {
      npm: string;
      commit: string | null;
    };
    config: any;
    cmd_args: string;
    environment: any;
    node_version: string;
  };
  localStorage: any;
  cookies: any[];
  beacons: any[];
  links: {
    firstParty: any[];
    thirdParty: any[];
    social: any[];
    keywords: any[];
  };
  unsafeForms: any[];
  browser: {
    name: string;
    version: string;
    user_agent: string;
    platform: {
      name: string;
      version: string;
    };
    extra_headers: { dnt: number };
    preset_cookies: any;
  };
  browsing_history: any[];
  hosts: any;
  websockets: any;
  start_time: Date;
  end_time: Date | null;
}

export function createOutputObject(args:CreateOutputArgs):CollectorOutput {
  const uri_ins = args.url;
  const uri_ins_host = url.parse(uri_ins).hostname;

  const uri_refs = [uri_ins].concat(args.firstPartyUri);

  let output: CollectorOutput = {
    title: args.title || `Website Evidence Collection`,
    task_description: safeJSONParse(args.taskDescription),
    uri_ins: uri_ins,
    uri_refs: uri_refs,
    uri_dest: null,
    uri_redirects: null,
    secure_connection: {
      https_redirect: false,
      redirects: [],
      https_support: false,
      https_error: null,
      http_error: null,
    },
    testSSLError: null,
    testSSLErrorOutput: null,
    testSSLErrorCode: null,
    testSSL: null,
    host: uri_ins_host,
    script: {
      host: os.hostname(),
      version: {
        npm: require('../../package.json').version,
        commit: null,
      },
      config: pickBy(args, (_value, key) => key === '_' || (key.length > 1 &&
          !key.includes('-'))),
      cmd_args: process.argv.slice(2).join(' '),
      environment: pickBy(process.env, (_value, key) => {
        return (
            key.startsWith('WEC') ||
            key.startsWith('PUPPETEER') ||
            key.startsWith('CHROM')
        );
      }),
      node_version: process.version,
    },
    localStorage: null,
    cookies: [],
    beacons: [],
    links: {
      firstParty: [],
      thirdParty: [],
      social: [],
      keywords: [],
    },
    unsafeForms: [],
    browser: {
      name: 'Chromium',
      version: '',
      user_agent: '',
      platform: {
        name: os.type(),
        version: os.release(),
      },
      extra_headers: { dnt: 0 },
      preset_cookies: {},
    },
    browsing_history: [],
    hosts: {},
    websockets: {},
    start_time: new Date(),
    end_time: null,
  };

  try {
    const gitInfo = gitDescribeSync(__dirname);
    output.script.version.commit = gitInfo.raw;
  } catch (e) {}

  return output;
}

