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
const DiffHandler = require('./diffHandler');
const Logger = require('./logger');
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');

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
     * @param {Object} newDeclaration - The updated declaration to process
     * @param {Object} oldDeclaration - A declaration representing the current configuration on the device
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process(newDeclaration, oldDeclaration) {
        logger.fine('Processing declaration.');
        let parsedOldDeclaration;
        let parsedNewDeclaration;

        if (!oldDeclaration.parsed) {
            const declarationParser = new DeclarationParser(oldDeclaration);
            parsedOldDeclaration = declarationParser.parse().parsedDeclaration;
        } else {
            parsedOldDeclaration = {};
            Object.assign(parsedOldDeclaration, oldDeclaration);
        }

        if (!newDeclaration.parsed) {
            const declarationParser = new DeclarationParser(newDeclaration);
            parsedNewDeclaration = declarationParser.parse().parsedDeclaration;
        } else {
            parsedNewDeclaration = {};
            Object.assign(parsedNewDeclaration, newDeclaration);
        }

        const classesOfInterest = ['DNS', 'NTP', 'Provision', 'VLAN', 'SelfIp', 'Route'];
        const diffHandler = new DiffHandler(classesOfInterest);
        let finalDeclaration;
        return diffHandler.process(parsedNewDeclaration, parsedOldDeclaration)
            .then((declaration) => {
                finalDeclaration = declaration;
                return this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
            })
            .then(() => {
                return new SystemHandler(finalDeclaration, this.bigIp).process();
            })
            .then(() => {
                return new NetworkHandler(finalDeclaration, this.bigIp).process();
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
