/**
 * Copyright 2018 F5 Networks, Inc.
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

// Variable to force debug log level by default during development
const DEBUG = false; // eslint-disable-line no-unused-vars

// map syslog level values to names
const syslogLevels = [
    'emergency', 'alert', 'critical', 'error',
    'warning', 'notice', 'info', 'debug'
];

// map syslog level values to f5 iLX names
const f5restLevels = [
    'severe', 'severe', 'severe', 'severe',
    'warning', 'config', 'info', 'fine'
];

// map syslog/iLX log-level names to values
const logLevelNames = {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7,
    severe: 3,
    config: 5,
    fine: 7
};

let logger = null;
try {
    logger = require('f5-logger').getInstance(); // eslint-disable-line global-require, import/no-unresolved
} catch (e) {
    logger = {};
    f5restLevels.forEach((level) => {
        logger[level] = function log(msg) {
            // eslint-disable-next-line no-console
            console.log(`${(new Date()).toUTCString()} - ${level}: ${msg}`);
        };
    });
}

// current global log settings
let globalLogLevel = logLevelNames.info;

/**
 * normalize provided info into an AS3 log object,
 * then if level <= current log level, convert
 * that to JSON string and pass it to the framework
 * logging subsystem.  Info may be a simple string,
 * an Error object, or an AS3 log-data object.
 * Return the normalized data (as object, not JSON
 * string).  This function is commonly invoked via
 * log.foo(info) where foo selects the level.  Note
 * that return value is not an Error object.
 *
 * @private
 * @param {string|Error|object} info
 * @param {string} [info.message] - if present, primary message
 * @param {string|number} [level="error"]
 * @param {boolean} [stack=false] - if true, log Error stack trace
 * @returns {object} - log message as object (not string)
 */
const log = function (info, level, stack) {
    let logLevel = level;
    if (typeof logLevel === 'string') {
        if (logLevelNames[logLevel] === undefined) { logLevel = 'error'; }
        logLevel = logLevelNames[logLevel]; // now a number
    } else if (typeof logLevel !== 'number') {
        logLevel = logLevelNames.error;
    } else {
        logLevel = ((logLevel < 0) || (logLevel > syslogLevels.length))
            ? logLevelNames.error : (logLevel || 0);
    }
    const levelName = syslogLevels[logLevel];
    const restLevel = f5restLevels[logLevel];

    let data = {
        message: '' // make message appear first in JSON
    };
    let tmp;

    const infoType = (info === null) ? 'null' : typeof info;
    switch (infoType) {
    case 'string':
        tmp = info;
        if (!tmp.length) {
            tmp = new Error(`log.${levelName}() given empty string`);
            log(tmp, 'error', true);
            tmp = '(empty)';
        }
        data.message = tmp;
        break;

    case 'object':
        if (info instanceof Error) {
            // ignore possibility of malformed Error object
            tmp = info.name + ((info.name.length) ? ':\x20' : '');
            tmp += (info.message.length) ? info.message : '(empty)';
            data.message = tmp;

            if (['string', 'number'].indexOf(typeof info.code) + 1) {
                data.code = info.code.toString();
            }
            if (((typeof stack === 'boolean') && stack) || (globalLogLevel >= logLevelNames.debug)) {
                const s = info.stack;
                if ((typeof s === 'string') && s.length) {
                    data.stack = s.split(/\n +at +/);
                }
            }
        } else if (!Object.keys(info).length) {
            tmp = new Error(`log.${levelName}() given empty object`);
            log(tmp, 'error', true);
            data.message = '(empty object)';
        } else {
            try {
                tmp = JSON.stringify(info);
            } catch (e) {
                tmp = undefined;
            }
            if ((typeof tmp !== 'string') || !tmp.length) {
                tmp = new Error(`log.${levelName
                }() given unstringifiable object`);
                log(tmp, 'error', true);

                if (typeof info.message === 'string') {
                    data.message = (info.message.length) ? info.message : '(empty)';
                } else {
                    data.message = '(cannot stringify log info)';
                }
                break;
            }
            // otherwise
            data = info;
        }
        break;

    case 'undefined':
        tmp = new Error(`log.${levelName}() given undefined`);
        log(tmp, 'error', true);
        data.message = '(undefined)';
        break;

    case 'null':
    default:
        try {
            tmp = info.toString();
        } catch (e) {
            tmp = undefined;
        }
        if ((typeof tmp !== 'string') || !tmp.length) {
            tmp = new Error(`log.${levelName
            }() given unstringifiable ${infoType}`);
            log(tmp, 'error', true);

            tmp = `(unrecognized type ${infoType})`;
        }
        data.message = tmp;
        break;
    }

    if (logLevel <= globalLogLevel) {
        const out = JSON.parse(JSON.stringify(data));
        out.level = levelName;
        logger[restLevel](`[f5-decon] ${JSON.stringify(out)}`);
    }
    return data;
}; // log()


/**
 * These log.foo(info[,stack]) functions alias log(info,foo[,stack])
 *
 * @public
 * @param {string|Error|object} info
 * @returns {object}
 */
const debug = function (x, s) { return log(x, 'debug', s); };
const notice = function (x, s) { return log(x, 'notice', s); };
const info = function (x, s) { return log(x, 'info', s); };
const warning = function (x, s) { return log(x, 'warning', s); };
const error = function (x, s) { return log(x, 'error', s); };
const critical = error;
const alert = error;
const emergency = error;

/**
 * Update the global log settings to match
 * the controls object.
 *
 * @public
 * @param {object} controls - info needed to access BIG-IP
 * @returns {void}
 */
const updateGlobalSettings = function (controls) {
    if (typeof controls !== 'object') {
        return;
    }
    if (typeof controls.logLevel === 'string') {
        globalLogLevel = logLevelNames[controls.logLevel];
    }
}; // updateGlobalSettings()

/**
 * Returns the current global log settings
 * in the form of a controls object
 *
 * @public
 * @returns {object} - the current values
 */
const getGlobalSettings = function () {
    return {
        logLevel: syslogLevels[globalLogLevel]
    };
}; // getGlobalSettings()

module.exports = {
    DEBUG,
    logLevelNames,
    updateGlobalSettings,
    getGlobalSettings,
    debug,
    notice,
    info,
    warning,
    error,
    critical,
    alert,
    emergency
};
