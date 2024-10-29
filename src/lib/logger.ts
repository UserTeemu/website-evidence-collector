/**
 * @file Setup logger
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 */

import path from 'path';
import tmp from 'tmp';
import { createLogger, format, transports, Logger } from 'winston';

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

const create = (options, args): Logger => {
  const defaults = {
    console: {
      silent: false,
      level: 'debug',
      stderrLevels: ['error', 'debug', 'info', 'warn'],
      format: process.stdout.isTTY ? format.combine(format.colorize(), format.simple()) : format.json(),
    },
    file: {
      enabled: true,
      level: 'silly',
      format: format.json(),
    },
  };

  const config = { ...defaults, ...options };

  const logger = createLogger({
    format: format.combine(format.timestamp()),
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
    if (args.output) {
      filename = path.join(args.output, 'inspection-log.ndjson');
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
