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
        this.tag = 'f5-decon';
        this.filename = path.basename(module.filename);
    }

    silly(message) {
        log.call(this, 'finest', message, arguments.slice(2));
    }

    verbose(message) {
        log.call(this, 'finer', message, arguments.slice(2));
    }

    debug(message) {
        log.call(this, 'fine', message, arguments.slice(2));
    }

    info(message) {
        log.call(this, 'info', message, arguments.slice(2));
    }

    warning(message) {
        log.call(this, 'warning', message, arguments.slice(2));
    }

    error(message) {
        log.call(this, 'severe', message, arguments.slice(2));
    }

    finest(message) {
        log.call(this, 'finest', message, arguments.slice(2));
    }

    finer(message) {
        log.call(this, 'finer', message, arguments.slice(2));
    }

    fine(message) {
        log.call(this, 'fine', message, arguments.slice(2));
    }

    warn(message) {
        log.call(this, 'warning', message, arguments.slice(2));
    }

    severe(message) {
        log.call(this, 'severe', message, arguments.slice(2));
    }
}

function log(level, message, extraArgs) {
    var fullMessage = message;
    extraArgs.forEach((extraArg) => {
        fullMessage = `${fullMessage} ${extraArg}`;
    })
    logger[level](`[${this.tag}: ${this.filename}] ${fullMessage}`);
}

module.exports = Logger;
