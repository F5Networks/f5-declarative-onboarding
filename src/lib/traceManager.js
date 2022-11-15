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

const fs = require('fs');

const doUtil = require('./doUtil');
const Logger = require('./logger');
const EVENTS = require('./sharedConstants').EVENTS;

const currentConfigFile = '/tmp/DO_current.json';
const desiredConfigFile = '/tmp/DO_desired.json';
const diffFile = '/tmp/DO_diff.json';

/**
 * Handles tracing for debugging.
 *
 * @class
 */
class TraceManager {
    /**
     * Constructor
     *
     * @param {Object} declaration - Parsed declaration.
     * @param {EventEmitter} eventEmitter - DO event emitter.
     * @param {State} state - The doState.
     */
    constructor(declaration, eventEmitter, state) {
        this.trace = declaration.controls ? declaration.controls.trace : false;
        this.traceResponse = declaration.controls ? declaration.controls.traceResponse : false;
        this.eventEmitter = eventEmitter;
        this.state = state;
        this.logger = new Logger(module, (state || {}).id);
    }

    /**
     * Writes configuration to trace locations
     *
     * @param {Object} currentConfig - The current config
     * @param {Object} desiredConfig - The desired config
     */
    traceConfigs(currentConfig, desiredConfig) {
        const maskedCurrent = doUtil.mask(currentConfig);
        const maskedDesired = doUtil.mask(desiredConfig);

        if (this.traceResponse) {
            this.eventEmitter.emit(EVENTS.TRACE_CONFIG, this.state.id, maskedCurrent, maskedDesired);
        }

        if (this.trace) {
            return Promise.resolve()
                .then(() => writeFile.call(this, currentConfigFile, maskedCurrent))
                .then(() => writeFile.call(this, desiredConfigFile, maskedDesired));
        }
        return Promise.resolve();
    }

    /**
     * Writes diff to trace locations
     *
     * @param {Object} diff - The diff between current config and desired config
     */
    traceDiff(diff) {
        const maskedDiff = doUtil.mask(diff);

        if (this.traceResponse) {
            this.eventEmitter.emit(EVENTS.TRACE_DIFF, this.state.id, maskedDiff);
        }

        if (this.trace) {
            return writeFile.call(this, diffFile, maskedDiff);
        }
        return Promise.resolve();
    }
}

function writeFile(fileName, contents) {
    return new Promise((resolve) => {
        fs.writeFile(fileName, JSON.stringify(contents, undefined, 2), (err) => {
            if (err) {
                this.logger.error(`Error writing trace file ${err.message}`);
            }
            resolve();
        });
    });
}

module.exports = TraceManager;
