/**
 * Copyright 2021 F5 Networks, Inc.
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

const logger = new Logger(module);

/**
 * Handles system parts of a declaration.
 *
 * @class
 */
class AnalyticsHandler {
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
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        logger.fine('Processing analytics declaration.');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }
        return handleAnalytics.call(this)
            .catch((err) => {
                logger.severe(`Error processing analytics declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleAnalytics() {
    if (this.declaration.Common.Analytics) {
        const analytics = this.declaration.Common.Analytics;
        return this.bigIp.replace(
            PATHS.Analytics,
            {
                'avrd-debug-mode': analytics.avrdDebugMode,
                'avrd-interval': analytics.avrdInterval,
                'offbox-protocol': analytics.offboxProtocol,
                'offbox-tcp-addresses': analytics.offboxTcpAddresses,
                'offbox-tcp-port': analytics.offboxTcpPort,
                'use-offbox': analytics.useOffbox,
                'source-id': analytics.sourceId,
                'tenant-id': analytics.tenantId
            }
        );
    }
    return Promise.resolve();
}

module.exports = AnalyticsHandler;
