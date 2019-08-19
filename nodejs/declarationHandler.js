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
const ProvisionHandler = require('./provisionHandler');
const DeprovisionHandler = require('./deprovisionHandler');
const AuthHandler = require('./authHandler');

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
    'Analytics',
    'ManagementRoute',
    'RouteDomain',
    'Authentication',
    'RemoteAuthRole',
    'SnmpAgent',
    'SnmpTrapEvents',
    'SnmpUser',
    'SnmpCommunity',
    'SnmpTrapDestination',
    'DagGlobals',
    'TrafficControl'
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

        // apply fix to parsedNewDeclaration only, because
        // parsedOldDeclaration (created by ConfigManager) has no such issue
        applyRouteDomainNameFix(parsedNewDeclaration);
        applyDefaults(parsedNewDeclaration, state);
        applyRouteDomainVlansFix(parsedNewDeclaration);

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        let updateDeclaration;
        let deleteDeclaration;
        return diffHandler.process(parsedNewDeclaration, parsedOldDeclaration)
            .then((declarationDiffs) => {
                updateDeclaration = declarationDiffs.toUpdate;
                deleteDeclaration = declarationDiffs.toDelete;
                return this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
            })
            .then(() => new SystemHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process())
            .then(() => new AuthHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process())
            .then(() => new ProvisionHandler(
                updateDeclaration,
                this.bigIp,
                this.eventEmitter,
                state
            ).process())
            .then(() => new NetworkHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process())
            .then(() => new DscHandler(updateDeclaration, this.bigIp, this.eventEmitter, state).process())
            .then(() => new AnalyticsHandler(updateDeclaration, this.bigIp, this.eventEmitter, state)
                .process())
            .then(() => new DeleteHandler(deleteDeclaration, this.bigIp, this.eventEmitter, state).process())
            .then(() => new DeprovisionHandler(
                updateDeclaration,
                this.bigIp,
                this.eventEmitter,
                state
            ).process())
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
    // deep copy original item to avoid modifications of originalConfig.Common in handlers
    const commonOriginal = JSON.parse(JSON.stringify(state.originalConfig.Common || {}));

    CLASSES_OF_TRUTH.forEach((key) => {
        if (!(key in commonOriginal)) {
            return;
        }
        const original = commonOriginal[key];
        const item = commonDeclaration[key];
        // if the missing or empty, fill in the original
        if (!(key in commonDeclaration) || (typeof item === 'object' && Object.keys(item).length === 0)) {
            commonDeclaration[key] = original;
        } else if (key === 'Authentication') {
            // some more auth oddities
            if (typeof item.remoteUsersDefaults === 'undefined') {
                item.remoteUsersDefaults = original.remoteUsersDefaults;
            }
        }
    });
}

/**
 * Update name of Route Domain 0 in declarations
 *
 * Schema doesn't allow to submit declaration with object name '0' but
 * but if we want to modify RD '0' via REST API we need to set name '0' for RD with id '0'.
 *
 * @param {Object} declaration - declaration to fix
 */
function applyRouteDomainNameFix(declaration) {
    if (declaration.Common.RouteDomain) {
        const routeDomains = declaration.Common.RouteDomain;
        Object.keys(routeDomains).forEach((rdName) => {
            const rd = routeDomains[rdName];
            // rd.id can be integer or string but still numeric only
            if (rd.id.toString() === '0') {
                // assume that there is only one RD with ID 0
                // and we know already that rdName can't be a number in declaration
                routeDomains['0'] = rd;
                routeDomains['0'].name = '0';
                delete routeDomains[rdName];
            }
        });
    }
}

/**
 * Add all VLANs that don't belong to any Route Domain to Route Domain 0.
 * Remove all VLANs (only VLANs that belongs to /Common/ partition)
 * from Route Domains that are not listed in Declaration
 *
 * @param {Object} declaration - declaration to fix
 */
function applyRouteDomainVlansFix(declaration) {
    const vlans = Object.keys(declaration.Common.VLAN || {});
    const routeDomains = declaration.Common.RouteDomain || {};
    if (vlans.length === 0 || !('0' in routeDomains)) {
        return;
    }

    const parseTmosName = function (tmosName) {
        const result = {
            name: tmosName,
            folder: '',
            partition: 'Common'
        };
        if (tmosName.startsWith('/')) {
            const tmosNameParts = tmosName.split('/');
            // ignore empty string at idx === 0
            result.partition = tmosNameParts[1];
            result.name = tmosNameParts[3] || tmosNameParts[2];
            result.folder = tmosNameParts[3] ? tmosNameParts[2] : '';
        }
        return result;
    };
    const defaultVlans = ['http-tunnel', 'socks-tunnel'];

    Object.keys(routeDomains).forEach((rdName) => {
        const rdVlans = routeDomains[rdName].vlans || [];
        routeDomains[rdName].vlans = rdVlans.filter((rdVlan) => {
            const parsedName = parseTmosName(rdVlan);
            let shouldKeep = true;
            // ignore every object that is not under /Common/
            if (parsedName.partition === 'Common' && !parsedName.folder) {
                const idx = vlans.indexOf(parsedName.name);
                if (idx !== -1) {
                    // if VLAN belongs to RD already then remove it from list
                    vlans.splice(idx, 1);
                } else if (defaultVlans.indexOf(parsedName.name) === -1) {
                    // if VLAN not in declaration or defaultVlans then it probably don't exist
                    // and should be removed from RD VLANs list
                    shouldKeep = false;
                }
            }
            return shouldKeep;
        });
    });
    // add all VLANs (if left) to Route Domain 0
    // for now we assume that default RD for Common partition is 0
    if (vlans.length > 0) {
        const rd0 = routeDomains['0'];
        rd0.vlans = rd0.vlans || [];
        /* eslint-disable-next-line prefer-spread */
        rd0.vlans.push.apply(rd0.vlans, vlans);
    }
}

module.exports = DeclarationHandler;
