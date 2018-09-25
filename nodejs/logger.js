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
        this.tag = module.name;
    }

    silly(message) {
        log.call(this, 'finest', message);
    }

    verbose(message) {
        log.call(this, 'finer', message);
    }

    debug(message) {
        log.call(this, 'fine', message);
    }

    warning(message) {
        log.call(this, 'warning', message);
    }

    error(message) {
        log.call(this, 'severe', message);
    }

    finest(message) {
        log.call(this, 'finest', message);
    }

    finer(message) {
        log.call(this, 'finer', message);
    }

    fine(message) {
        log.call(this, 'fine', message);
    }

    warn(message) {
        log.call(this, 'warning', message);
    }

    severe(message) {
        log.call(this, 'severe', message);
    }
}

function log(level, message) {
    logger[level](`[${this.tag}] ${message}`);
}

module.exports = Logger;
