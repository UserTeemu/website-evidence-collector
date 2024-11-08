/**
 * @file Setup logger
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import path from 'path';
import tmp from 'tmp';
import { createLogger, format, transports, Logger,Logform } from 'winston';

tmp.setGracefulCleanup();

// Levels:
// {
//   error: 0,
//   warn: 1,
//   info: 2,
//   verbose: 3,
//   debug: 4,
//   silly: 5
// }


interface CreateLoggerOptions {
  console?:{
    silent:boolean;
    level:string;
    stderrLevels:string[];
    format: Logform.Format;
  }
  file?: {
    enabled:boolean;
    level: string;
    format: Logform.Format;
  }
}


const create = (options:CreateLoggerOptions, outputFilePath?:string,defaultMeta?:{}): Logger => {
  const defaults:CreateLoggerOptions = {
    console: {
      silent: false,
      level: 'debug',
      stderrLevels: ['error', 'debug', 'info', 'warn'],
      format: process.stdout.isTTY ? format.combine(format.colorize(), format.simple(),format.metadata()) : format.combine(format.json(),format.metadata())
    },
    file: {
      enabled: true,
      level: 'silly',
      format: format.combine(format.json(),format.metadata())
    },
  };

  const config = { ...defaults, ...options };

  const logger = createLogger({
    format: format.combine(format.timestamp()),
    defaultMeta: defaultMeta,
    transports: [
      new transports.Console({
        level: config.console?.level,
        silent: config.console?.silent,
        stderrLevels: config.console?.stderrLevels,
        format: config.console?.format,
      }),
    ],
  });

  if (config.file?.enabled) {
    let filename: string;
    if (outputFilePath) {
      filename = path.join(outputFilePath, 'inspection-log.ndjson');
    } else {
      filename = tmp.tmpNameSync({ postfix: '-log.ndjson' });
    }
    logger.add(
        new transports.File({
          filename: filename,
          level: config.file.level,
          format: config.file.format,
        })
    );
  }

  return logger;
};

export { create };
