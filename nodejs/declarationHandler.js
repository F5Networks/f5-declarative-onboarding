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

const DeclarationParser = require('./declarationParser');
const Logger = require('./logger');
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');
const TenantHandler = require('./tenantHandler');

const logger = new Logger(module);

/**
 * Main processing for a parsed declaration.
 *
 * @class
 */
class DeclarationHandler {
    constructor(bigIp) {
        this.bigIp = bigIp;
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process(newDeclaration, oldDeclaration) {
        logger.fine('Processing declaration.');
        let declarationInfo = {};

        // We may have already parsed this (if we are rolling back, for example)
        if (!newDeclaration.parsed) {
            const declarationParser = new DeclarationParser(newDeclaration);
            declarationInfo = declarationParser.parse();
        } else {
            Object.assign(declarationInfo, newDeclaration);
        }

        return this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' })
            .then(() => {
                return new TenantHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                return new SystemHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                return new NetworkHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                logger.info('Done processing declartion.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

module.exports = DeclarationHandler;
