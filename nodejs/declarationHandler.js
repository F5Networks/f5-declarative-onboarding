/**
 * Copyright 2018-2019 F5 Networks, Inc.
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
const DscHandler = require('./dscHandler');
const AnalyticsHandler = require('./analyticsHandler');
const DeleteHandler = require('./deleteHandler');

const NAMELESS_CLASSES = require('./sharedConstants').NAMELESS_CLASSES;

const logger = new Logger(module);

// They are the classes for which we are the source of truth. We will
// run a diff against these classes and also apply defaults for them if they
// are missing from the declaration
const CLASSES_OF_TRUTH = [
    'hostname',
    'DbVariables',
    'DNS',
    'NTP',
    'Provision',
    'VLAN',
    'SelfIp',
    'Route',
    'ConfigSync',
    'DeviceGroup',
    'FailoverUnicast',
    'Analytics'
];

/**
 * Main processing for a parsed declaration.
 *
 * @class
 *
 * @param {Object} bigIp - BigIp object.
 * @param {EventEmitter} - Restnoded event channel.
 */
class DeclarationHandler {
    constructor(bigIp, eventEmitter) {
        this.bigIp = bigIp;
        this.eventEmitter = eventEmitter;
    }

    /**
     * Starts processing.
     *
     * @param {Object} declaration - The declaration to process
     * @param {Object} state - The [doState]{@link State} object
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process(declaration, state) {
        logger.fine('Processing declaration.');
        let parsedOldDeclaration;
        let parsedNewDeclaration;

        const newDeclaration = JSON.parse(JSON.stringify(declaration));

        const oldDeclaration = {};
        Object.assign(oldDeclaration, state.currentConfig);

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

        applyDefaults(parsedNewDeclaration, state);

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        let updateDeclaration;
        let deleteDeclaration;
        return diffHandler.process(parsedNewDeclaration, parsedOldDeclaration)
            .then((declarationDiffs) => {
                updateDeclaration = declarationDiffs.toUpdate;
                deleteDeclaration = declarationDiffs.toDelete;
                return this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
            })
            .then(() => {
                return new SystemHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process();
            })
            .then(() => {
                return new NetworkHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process();
            })
            .then(() => {
                return new DscHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process();
            })
            .then(() => {
                return new AnalyticsHandler(updateDeclaration, this.bigIp, this.eventEmitter, state)
                    .process();
            })
            .then(() => {
                return new DeleteHandler(deleteDeclaration, this.bigIp, this.eventEmitter, state).process();
            })
            .then(() => {
                logger.info('Done processing declaration.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

/**
 * Apply defaults to a declaration
 *
 * Anything that is not mentioned that we are the source
 * of truth for will be set back to its original state.
 *
 * @param {Object} declaration - The new declation to apply
 * @param {Object} state - The [doState]{@link State} object
 */
function applyDefaults(declaration, state) {
    const commonDeclaration = declaration.Common;
    CLASSES_OF_TRUTH.forEach((key) => {
        const item = commonDeclaration[key];

        // if the missing or empty, fill in the original
        if (!item || (typeof item === 'object' && Object.keys(item).length === 0)) {
            const original = state.originalConfig.Common[key];
            if (original) {
                if (typeof original === 'string') {
                    commonDeclaration[key] = original;
                } else if (Array.isArray(original)) {
                    commonDeclaration[key] = original.slice();
                } else {
                    commonDeclaration[key] = {};
                    Object.assign(commonDeclaration[key], original);
                }
            }
        }
    });
}

module.exports = DeclarationHandler;
