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

const path = require('path');
const MASK_REGEX = require('./sharedConstants').MASK_REGEX;

let f5Logger;
try {
    /* eslint-disable global-require */
    f5Logger = require('f5-logger'); // eslint-disable-line import/no-unresolved
} catch (err) {
    // f5-logger is only in place on the BIG-IPs, not on local environments. If we fail to
    // get one (in our unit tests, for instance), we will mock it in the constructor
}

/**
 * Logger that works with f5-cloud-libs and restnoded styles.
 *
 * @class
 */
class Logger {
    constructor(module) {
        this.tag = 'f5-declarative-onboarding';
        this.filename = path.basename(module.filename);

        // If we weren't able to get the f5-logger, create a mock (so our unit tests run)
        this.logger = f5Logger
            ? f5Logger.getInstance()
            : {
                silly() {},
                verbose() {},
                debug() {},
                warning() {},
                info() {},
                error() {},
                finest() {},
                finer() {},
                fine() {},
                warn() {},
                severe() {}
            };
    }

    silly(message) {
        log.call(this, 'finest', message, Array.prototype.slice.call(arguments, 1));
    }

    verbose(message) {
        log.call(this, 'finer', message, Array.prototype.slice.call(arguments, 1));
    }

    debug(message) {
        log.call(this, 'fine', message, Array.prototype.slice.call(arguments, 1));
    }

    info(message) {
        log.call(this, 'info', message, Array.prototype.slice.call(arguments, 1));
    }

    warning(message) {
        log.call(this, 'warning', message, Array.prototype.slice.call(arguments, 1));
    }

    error(message) {
        log.call(this, 'severe', message, Array.prototype.slice.call(arguments, 1));
    }

    finest(message) {
        log.call(this, 'finest', message, Array.prototype.slice.call(arguments, 1));
    }

    finer(message) {
        log.call(this, 'finer', message, Array.prototype.slice.call(arguments, 1));
    }

    fine(message) {
        log.call(this, 'fine', message, Array.prototype.slice.call(arguments, 1));
    }

    warn(message) {
        log.call(this, 'warning', message, Array.prototype.slice.call(arguments, 1));
    }

    severe(message) {
        log.call(this, 'severe', message, Array.prototype.slice.call(arguments, 1));
    }
}

function log(level, message, extraArgs) {
    let fullMessage;
    let expandedArg;
    let masked;

    masked = mask(message);
    if (typeof masked === 'object') {
        try {
            fullMessage = JSON.stringify(masked);
        } catch (err) {
            fullMessage = masked;
        }
    } else {
        fullMessage = masked;
    }

    extraArgs.forEach((extraArg) => {
        masked = mask(extraArg);
        if (typeof masked === 'object') {
            try {
                expandedArg = JSON.stringify(masked);
            } catch (err) {
                expandedArg = masked;
            }
        } else {
            expandedArg = masked;
        }
        fullMessage = `${fullMessage} ${expandedArg}`;
    });
    this.logger[level](`[${this.tag}: ${this.filename}] ${fullMessage}`);
}

function mask(message) {
    let masked;
    if (typeof message === 'object') {
        masked = {};
        Object.assign(masked, message);
        Object.keys(masked).forEach((key) => {
            if (MASK_REGEX.test(key)) {
                masked[key] = '********';
            }
        });
    } else {
        masked = message;
    }
    return masked;
}

module.exports = Logger;
