/**
 * Copyright 2022 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Based on the Winston logger
 * Returns a singleton logger
 * The format each log entry is : Timestamp Level Message
 * file log levels are :
 *   { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
 * syslog log levels are :
 *   { emerg: 0, alert: 1, crit: 2, error: 3, warning: 4, notice: 5, info: 6, debug: 7}
 *
 * Syslog transports are also supported.
 */

const winston = require('winston');
const mkdirp = require('mkdirp');

const filename = `${__dirname}/../logs/integrationTest.log`;

class Logger {
    static getInstance(loggerOptions) {
        mkdirp.sync(filename.substring(0, filename.lastIndexOf('/')));
        const transports = [
            new (winston.transports.File)({
                filename,
                level: 'debug',
                maxFiles: 3,
                maxsize: 10000000,
                json: false,
                timestamp() {
                    const d = new Date();
                    return d.toUTCString(Date.now());
                },
                formatter(options) {
                    return `${options.timestamp()} ${options.level.toUpperCase()} ${
                        options.message ? options.message : ''
                    }${options.meta && Object.keys(options.meta).length ? `\n\t${
                        JSON.stringify(options.meta)}` : ''}`;
                }
            })
        ];

        if (loggerOptions && loggerOptions.console) {
            transports.push(
                new winston.transports.Console({
                    name: 'console_log',
                    level: 'debug',
                    json: false,
                    timestamp() {
                        const d = new Date();
                        return d.toUTCString(Date.now());
                    },
                    formatter(options) {
                        return `${options.timestamp()} ${options.level.toUpperCase()} ${
                            options.message ? options.message : ''
                        }${options.meta && Object.keys(options.meta).length ? `\n\t${
                            JSON.stringify(options.meta)}` : ''}`;
                    }
                })
            );
        }

        return new (winston.Logger)({ transports });
    }
}

module.exports = Logger;
