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
const KEYS_TO_MASK = require('./sharedConstants').KEYS_TO_MASK;

let logger;
try {
    /* eslint-disable global-require */
    logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved
} catch (err) {
    // f5-logger is only in place on the BIG-IPs, not on local environments, so mock it here
    logger = {
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

class Logger {
    constructor(module) {
        this.tag = 'f5-declarative-onboarding';
        this.filename = path.basename(module.filename);
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
    logger[level](`[${this.tag}: ${this.filename}] ${fullMessage}`);
}

function mask(message) {
    let masked;
    if (typeof message === 'object') {
        masked = {};
        Object.assign(masked, message);
        KEYS_TO_MASK.forEach((key) => {
            if (masked[key]) {
                masked[key] = '********';
            }
        });
    } else {
        masked = message;
    }
    return masked;
}

module.exports = Logger;
