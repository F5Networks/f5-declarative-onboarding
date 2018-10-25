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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;

const logger = new Logger(module);

/**
 * Handles deleting objects.
 *
 * @class
 */
class DeleteHandler {
    /**
     * Constructor
     *
     * @param {Object} declaration - Parsed declaration of objects to delete.
     * @param {Object} bigIp - BigIp object.
     */
    constructor(declaration, bigIp) {
        this.declaration = declaration;
        this.bigIp = bigIp;
    }

    /**
     * Deletes items in the declaration
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        logger.fine('Processing deletes.');
        const promises = [];
        Object.keys(this.declaration.Common).forEach((classKey) => {
            Object.keys(this.declaration.Common[classKey]).forEach((itemKey) => {
                const path = `${PATHS[classKey]}/~Common~${itemKey}`;
                promises.push(this.bigIp.delete(path, null, null, cloudUtil.NO_RETRY));
            });
        });

        return Promise.all(promises)
            .then(() => {
                logger.fine('Done processing deletes.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing deletes: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

module.exports = DeleteHandler;
