/**
 * Copyright 2023 F5 Networks, Inc.
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

const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;

/**
 * Handles security parts of a declaration.
 *
 * @class
 */
class SecurityHandler {
    /**
     * Constructor
     *
     * @param {Object} declaration - Parsed declaration.
     * @param {Object} bigIp - BigIp object.
     * @param {EventEmitter} - DO event emitter.
     * @param {State} - The doState.
     */
    constructor(declaration, bigIp, eventEmitter, state) {
        this.declaration = declaration;
        this.bigIp = bigIp;
        this.eventEmitter = eventEmitter;
        this.state = state;
        this.logger = new Logger(module, (state || {}).id);
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        this.logger.fine('Processing security declaration.');

        return Promise.resolve()
            .then(() => {
                this.logger.fine('Checking SecurityAnalytics');
                return handleSecurityAnalytics.call(this);
            })
            .catch((err) => {
                this.logger.severe(`Error processing security declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleSecurityAnalytics() {
    if (this.declaration.Common.SecurityAnalytics) {
        return this.bigIp.modify(
            PATHS.SecurityAnalytics,
            this.declaration.Common.SecurityAnalytics
        );
    }
    return Promise.resolve();
}

module.exports = SecurityHandler;
