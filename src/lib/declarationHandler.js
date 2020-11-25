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

const crypto = require('crypto');
const TeemDevice = require('@f5devcentral/f5-teem').Device;
const TeemRecord = require('@f5devcentral/f5-teem').Record;
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
const GSLBHandler = require('./gslbHandler');
const TraceManager = require('./traceManager');
const doUtil = require('./doUtil');

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
    'DNS_Resolver',
    'Trunk',
    'SelfIp',
    'Route',
    'ConfigSync',
    'DeviceGroup',
    'FailoverUnicast',
    'FailoverMulticast',
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
    'System',
    'TrafficControl',
    'HTTPD',
    'SSHD',
    'Tunnel',
    'TrafficGroup',
    'Disk',
    'MirrorIp',
    'RoutingAsPath',
    'GSLBGlobals',
    'GSLBDataCenter'
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
        const assetInfo = {
            name: 'Declarative Onboarding',
            version: doUtil.getDoVersion().VERSION
        };
        this.teemDevice = new TeemDevice(assetInfo);
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
        let parsedNewDeclaration;
        let parsedOldDeclaration;
        let origLdapCertData;

        const newDeclaration = JSON.parse(JSON.stringify(declaration));
        const oldDeclaration = {};
        Object.assign(oldDeclaration, state.currentConfig);
        let updateDeclaration;
        let deleteDeclaration;

        // modules available on the target BIG-IP
        const modules = [];

        return Promise.resolve()
            .then(() => this.bigIp.list('/tm/sys/provision'))
            .then((provisionModules) => {
                provisionModules.forEach((module) => {
                    modules.push(module.name);
                });
            })
            .then(() => {
                if (oldDeclaration.parsed) {
                    return Object.assign({}, oldDeclaration);
                }
                const declarationParser = new DeclarationParser(oldDeclaration, modules);
                return declarationParser.parse().parsedDeclaration;
            })
            .then((parsedDeclaration) => {
                parsedOldDeclaration = parsedDeclaration;
            })
            .then(() => {
                if (newDeclaration.parsed) {
                    return Object.assign({}, newDeclaration);
                }
                const declarationParser = new DeclarationParser(newDeclaration, modules);
                return declarationParser.parse().parsedDeclaration;
            })
            .then((parsedDeclaration) => {
                parsedNewDeclaration = parsedDeclaration;
            })
            .then(() => {
                applyDefaults(parsedNewDeclaration, state);
                applyRouteDomainFixes(parsedNewDeclaration, parsedOldDeclaration);
                applyFailoverUnicastFixes(parsedNewDeclaration, parsedOldDeclaration);
                applyHttpdFixes(parsedNewDeclaration);
                origLdapCertData = applyLdapCertFixes(parsedNewDeclaration);

                const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES, this.eventEmitter, state);
                return diffHandler.process(parsedNewDeclaration, parsedOldDeclaration, declaration);
            })
            .then((declarationDiffs) => {
                updateDeclaration = declarationDiffs.toUpdate;
                deleteDeclaration = declarationDiffs.toDelete;

                applyLdapCertOrigData(updateDeclaration, origLdapCertData);

                const traceManager = new TraceManager(declaration, this.eventEmitter, state);
                return traceManager.traceConfigs(parsedOldDeclaration, parsedNewDeclaration);
            })
            .then(() => this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' }))
            .then(() => {
                const handlers = [
                    [SystemHandler, updateDeclaration],
                    [AuthHandler, updateDeclaration],
                    [ProvisionHandler, updateDeclaration],
                    [NetworkHandler, updateDeclaration],
                    [DscHandler, updateDeclaration],
                    [AnalyticsHandler, updateDeclaration],
                    [GSLBHandler, updateDeclaration],
                    [DeleteHandler, deleteDeclaration],
                    [DeprovisionHandler, updateDeclaration]
                ];

                const handlerStatuses = [];
                return processHandlers(
                    handlers,
                    handlerStatuses,
                    this.bigIp,
                    this.eventEmitter,
                    state
                );
            })
            .then((handlerStatuses) => {
                const status = {
                    rollbackInfo: {}
                };
                handlerStatuses.forEach((handlerStatus) => {
                    if (handlerStatus.rebootRequired === true) {
                        status.rebootRequired = true;
                    }
                    if (handlerStatus.rollbackInfo) {
                        Object.keys(handlerStatus.rollbackInfo).forEach((key) => {
                            status.rollbackInfo[key] = JSON.parse(JSON.stringify(handlerStatus.rollbackInfo[key]));
                        });
                    }
                });
                logger.info('Done processing declaration.');
                if (!declaration.parsed) {
                    // gather/calculate extra fields
                    const extraFields = {};
                    if (declaration.controls) {
                        extraFields.userAgent = declaration.controls.userAgent;
                    }
                    if (declaration.Common) {
                        extraFields.authenticationType = countAuthenticationTypes(
                            declaration.Common,
                            { ldap: 0, radius: 0, tacacs: 0 }
                        );
                    }

                    const record = new TeemRecord('Declarative Onboarding Telemetry Data', '1');
                    return Promise.resolve()
                        .then(() => record.calculateAssetId())
                        .then(() => record.addRegKey())
                        .then(() => record.addPlatformInfo())
                        .then(() => record.addProvisionedModules())
                        .then(() => record.addClassCount(declaration))
                        .then(() => record.addJsonObject(extraFields))
                        .then(() => this.teemDevice.reportRecord(record))
                        .catch((err) => {
                            logger.warning(`Unable to send device report: ${err.message}`);
                        })
                        .then(() => status);
                }
                return Promise.resolve(status);
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
            if (key === 'System' && commonDeclaration.hostname) {
                delete commonDeclaration[key].hostname;
            }
        } else if (key === 'Authentication') {
            // some more auth oddities
            if (typeof item.remoteUsersDefaults === 'undefined') {
                item.remoteUsersDefaults = original.remoteUsersDefaults;
            }
        }
    });
}

/**
 * Route Domain Fixes:
 *
 * @param {Object} declaration    - declaration
 * @param {Object} currentConfig  - current configuration
 */
function applyRouteDomainFixes(declaration, currentConfig) {
    applyDefaultRouteDomainFix(declaration, currentConfig);
    applyRouteDomainVlansFix(declaration, currentConfig);
    applyRouteDomainParentFix(declaration);
}

/**
 * Convert FailoverUnicasts to use addressPorts immediately
 *
 * @param {Object} declaration - User provided declaration
 */
function applyFailoverUnicastFixes(declaration) {
    if (declaration.Common.FailoverUnicast && declaration.Common.FailoverUnicast.address) {
        if (declaration.Common.FailoverUnicast.addressPorts) {
            // If there is both and address and addressPorts at this point
            // then the user supplied two different Failover Unicast objects.
            // DO cannot guarantee which to use, thus we need to throw an error.
            const message = 'Error: Cannot have Failover Unicasts with both address and addressPort properties provided. This can happen when multiple Failover Unicast objects are provided in the same declaration. To configure multiple Failover Unicasts, use only addressPort.';
            logger.severe(message);
            throw new Error(message);
        }

        declaration.Common.FailoverUnicast.addressPorts = [
            {
                address: declaration.Common.FailoverUnicast.address,
                port: declaration.Common.FailoverUnicast.port
            }
        ];
        delete declaration.Common.FailoverUnicast.address;
        delete declaration.Common.FailoverUnicast.port;
    }
}

/**
 * Default Route Domain fix.
 *
 * Schema doesn't allow to submit declaration with object name '0'.
 * DO should rename RD with ID 0 to '0'.
 *
 * - If Route Domain with ID 0 exists in the declaration
 *   then it should be renamed to '0'.
 * - If Route Domain with ID 0 doesn't exists in the declaration
 *   then it should be copied from original configuration if exists (if not
 *   yet done by applyDefaults).
 *
 * @param {Object} declaration    - declaration to fix
 * @param {Object} currentConfig  - current configuration
 */
function applyDefaultRouteDomainFix(declaration, currentConfig) {
    const routeDomains = declaration.Common.RouteDomain || {};
    const defaultRdName = '0';

    // if there are multiple RD with ID 0 then only the last one will be used.
    // ideally schema should not allow multiple RD to share same ID.
    Object.keys(routeDomains).forEach((rdName) => {
        const rd = routeDomains[rdName];
        // rd.id can be integer or string but still numeric only
        if (rd.id.toString() === defaultRdName && rdName !== defaultRdName) {
            routeDomains[defaultRdName] = rd;
            routeDomains[defaultRdName].name = defaultRdName;
            delete routeDomains[rdName];
        }
    });
    // Default Route Domain 0 is persistent on BIG-IP. There are 3 possible situations:
    // - Route Domain 0 defined in declaration - cool!
    // - Route Domain 0 not defined in declaration but there are other RDs then
    //   copy Route Domain 0 from current configuration (as most up-to-date configuration)
    //   to avoid out-dated data from original configuration.
    // - no Route Domains at all in declaration - Route Domains from original config
    //   should be copied by applyDefaults already earlier.
    const currentRouteDomains = (currentConfig.Common && currentConfig.Common.RouteDomain) || {};
    if (!(defaultRdName in routeDomains) && defaultRdName in currentRouteDomains) {
        // deep copy to avoid modifications to original config data
        routeDomains[defaultRdName] = JSON.parse(JSON.stringify(currentRouteDomains[defaultRdName]));
    }
    if (Object.keys(routeDomains).length > 0) {
        declaration.Common.RouteDomain = routeDomains;
    }
}

/**
 *  Prepend the tenant to the parent property if it is missing.
 *
 * @param {*} declaration - declaration to fix
 */
function applyRouteDomainParentFix(declaration) {
    const decalrationRDs = (declaration.Common && declaration.Common.RouteDomain) || {};
    // nothing to fix if no Route Domains in declaration
    if (Object.keys(decalrationRDs).length === 0) {
        return;
    }

    doUtil.forEach(declaration, 'RouteDomain', (tenant, routeDomain) => {
        // If the parent does not start with '/', assume it is in this tenant
        if (routeDomain.parent && !routeDomain.parent.startsWith('/')) {
            routeDomain.parent = `/${tenant}/${routeDomain.parent}`;
        }
    });
}

/**
 * Add all VLANs that don't belong to any Route Domain to Route Domain 0.
 * Remove all VLANs (only VLANs that belongs to /Common/ partition)
 * from Route Domains that are not listed in Declaration (e.g. configuration is out-dated) -
 * those VLANs will be removed from RDs after deleteHandler removed them.
 *
 * NOTE: user responsible for VLANs from partitions other than Common.
 * If VLAN from another partition attached to the Route Domain from Common partition (current configuration)
 * and this VLAN not in Route Domain 'vlans' property (declaration) - it is user's choice, DO do not care.
 *
 * @param {Object} declaration   - declaration to fix
 * @param {Object} currentConfig - current configuration
 */
function applyRouteDomainVlansFix(declaration, currentConfig) {
    const decalrationRDs = (declaration.Common && declaration.Common.RouteDomain) || {};
    // nothing to fix if no Route Domains in declaration
    if (Object.keys(decalrationRDs).length === 0) {
        return;
    }
    const commonPartition = 'Common';
    const defaultRdName = '0';
    const parseTmosName = (tmosName) => {
        const result = {
            name: tmosName,
            folder: '',
            partition: commonPartition
        };
        if (tmosName.startsWith('/')) {
            const tmosNameParts = tmosName.split('/');
            // ignore empty string at idx === 0
            result.partition = tmosNameParts[1];
            result.name = tmosNameParts[3] || tmosNameParts[2];
            result.folder = tmosNameParts[3] ? tmosNameParts[2] : result.folder;
        }
        return result;
    };
    const getTmosName = parsedName => `/${parsedName.partition}/${parsedName.folder}${parsedName.folder ? '/' : ''}${parsedName.name}`;

    // create list of VLAN names from declaration
    // NOTE: this line should be slightly updated when DO will support VLAN groups and tunnels.
    // 'VLAN' in comments below === VLAN or VLAN group or tunnel.
    // Fact: Name for 'VLAN' is unique wthin partition.
    const declarationVlans = Object.keys((declaration.Common && declaration.Common.VLAN) || {});

    // iterate over Route Domains from current configuration and build mapping VLAN <-> Route Domain.
    // Route Domain can have multiple VLANs, but VLAN belongs only to one Route Domain.
    // Route Domain 'vlans' property contains full names only (partition, folder)
    const currentVlan2rd = {};
    if (currentConfig.Common && currentConfig.Common.RouteDomain) {
        const routeDomains = currentConfig.Common.RouteDomain;
        Object.keys(routeDomains).forEach((rdName) => {
            if (routeDomains[rdName].vlans) {
                routeDomains[rdName].vlans.forEach((vlan) => {
                    const parsedName = parseTmosName(vlan);
                    // collect VLANs only when:
                    // - partitions is Common
                    // - no folder
                    // - not in the declaration (otherwise it might attached to RD already or
                    //   will be added to RD 0)
                    if (parsedName.partition === commonPartition && !parsedName.folder
                        && declarationVlans.indexOf(parsedName.name) === -1) {
                        currentVlan2rd[vlan] = routeDomains[rdName].id;
                    }
                });
            }
        });
    }
    // will be used to restore VLANs from current configuration
    const rdMapping = {};
    // at that point DO has information about VLANs for current configuration
    // and information about VLANs from declaration.
    Object.keys(decalrationRDs).forEach((rdName) => {
        const rd = decalrationRDs[rdName];
        rdMapping[rd.id] = rd;
        // if no 'vlans' property defined then skip RD because the user want keep it untouched
        if (!rd.vlans) {
            return;
        }
        // filter VLANs to remove non-existing in case if config is out-dated
        rd.vlans = (rd.vlans || []).filter((rdVlan) => {
            const parsedName = parseTmosName(rdVlan);
            let keepVlan = true;
            // process only 'vlan' or '/Common/vlan'
            if (parsedName.partition === commonPartition && !parsedName.folder) {
                const fullName = getTmosName(parsedName);
                // declarationVlans contains VLAN name only (no partition, no folder).
                const idx = declarationVlans.indexOf(parsedName.name);
                if (idx !== -1) {
                    // if VLAN belongs to RD already then remove it from list.
                    declarationVlans.splice(idx, 1);
                } else if (fullName in currentVlan2rd) {
                    // remove it from mapping because it attached to this RD already
                    delete currentVlan2rd[fullName];
                } else {
                    keepVlan = false;
                }
            }
            return keepVlan;
        });
    });
    // at that point declarationVlans contains VLANs that should be added to RD 0
    if (declarationVlans.length > 0 && defaultRdName in decalrationRDs) {
        const rd0 = decalrationRDs[defaultRdName];
        rd0.vlans = rd0.vlans || [];
        /* eslint-disable-next-line prefer-spread */
        rd0.vlans.push.apply(rd0.vlans, declarationVlans);
    }
    // DO is not respoinsble for VLANs from partitions other than Common and
    // should attach them back to appropriate Route Domains.
    // Reasons:
    // 1) Possible corner cases - 'vlans' property can be:
    // - undefined - it was intentionally omitted by the user to keep RDs current state.
    // - empty array - it was intentionally set by the user to erase RD 'vlans' list.
    // In both cases DO should assign VLANs back to appropriate Route Domains otherwise
    // TMOS will return eror because VLAN should be attached.
    Object.keys(currentVlan2rd).forEach((vlanName) => {
        const rd = rdMapping[currentVlan2rd[vlanName]];
        if (typeof rd !== 'undefined') {
            rd.vlans = rd.vlans || [];
            rd.vlans.push(vlanName);
        }
    });
}

/**
 * Normalizes the HTTPD section of a declaration
 *
 * @param {Object} declaration - declaration to fix
 */
function applyHttpdFixes(declaration) {
    const httpdDeclaration = declaration.Common.HTTPD;
    if (httpdDeclaration && httpdDeclaration.allow) {
        // Schema can handle 'all' as either a single word or in an array. Normalize
        // to an array since that's what BIG-IP uses
        if (httpdDeclaration.allow === 'all') {
            httpdDeclaration.allow = [httpdDeclaration.allow];
        }
    }
}

/**
 * Convert LDAP SSL cert data to SHA1 checksum, name, and partition.
 *
 * @param {Object} declaration - User provided declaration
 *
 * @returns {Object} - Original LDAP SSL cert data
 */
function applyLdapCertFixes(declaration) {
    const origData = {};
    const auth = declaration.Common.Authentication;

    const patchItem = (key, subKey, targetKey, ext) => {
        let data = (auth.ldap[key][subKey] || {}).base64;

        if (typeof data === 'undefined') { return; }

        const hash = crypto.createHash('sha1');

        origData[targetKey] = { base64: data };
        data = Buffer.from(data, 'base64').toString().trim();
        hash.update(data);
        auth.ldap[targetKey] = {
            name: `${key.replace(/^ssl/, 'do_ldap')}.${ext}`,
            partition: 'Common',
            checksum: `SHA1:${data.length}:${hash.digest('hex')}`
        };
    };

    if (auth && auth.ldap) {
        ['sslCaCert', 'sslClientCert'].forEach((key) => {
            if (!auth.ldap[key]) { return; }

            // privateKey needs to be patched before certificate to avoid overwriting orig data
            patchItem(key, 'privateKey', key.replace(/Cert$/, 'Key'), 'key');
            patchItem(key, 'certificate', key, 'crt');
        });
    }
    return origData;
}

/**
 * Combine new LDAP SSL cert properties with original data from user declaration.
 *
 * @param {Object} declaration - Update declaration
 * @param {Object} origData - LDAP SSL cert data
 */
function applyLdapCertOrigData(declaration, origData) {
    const auth = declaration.Common.Authentication;

    if (auth && auth.ldap) {
        Object.keys(origData).forEach((key) => {
            Object.assign(auth.ldap[key], origData[key]);
        });
    }
}

function processHandler(Handler, declaration, bigIp, eventEmitter, state) {
    return new Handler(declaration, bigIp, eventEmitter, state).process();
}

/**
 *
 * @param {Object[]} handlers - Array of handlers and declaration for the handler. Each element is
 *                              [handler, declaration]
 * @param {Object} handlerStatuses - Array in which to store handlerStatus information. If present, handler status
 *                                   must be an object that has any post processing directives required.
 *                                   Directives can be
 *     {
 *         rebootRequired: true if a reboot should be forced at end of declaration processing,
 *         rollbackInfo: {
 *             handlerName: {
 *                 handler_specific_rollback_data
 *             }
 *         }
 *     }
 * @param {BigIp} bigIp - BigIp used for processing
 * @param {EventEmitter} eventEmitter - EventEmitter to which events should be sent
 * @param {Object} state - The [doState]{@link State} object
 * @param {*} index - Index of handler in handlers array. Used for recursion.
 */
function processHandlers(handlers, handlerStatuses, bigIp, eventEmitter, state, index) {
    const i = index || 0;

    if (i < handlers.length) {
        const handler = handlers[i][0];
        const declaration = handlers[i][1];
        return processHandler(handler, declaration, bigIp, eventEmitter, state)
            .then((status) => {
                handlerStatuses.push(status || {});
                return processHandlers(handlers, handlerStatuses, bigIp, eventEmitter, state, i + 1);
            });
    }
    return handlerStatuses;
}

/**
 * Recursively counts the number of types in Authentication classes in the provided declaration.
 *
 * Assumption: Authentication classes will not be inside of an array
 *
 * @param {Object} declaration - declaration to count
 *
 * @returns {Object} - An object with integers: ldap, radius, and tacas
 */
function countAuthenticationTypes(declaration, count) {
    // iterate through the declaration
    Object.keys(declaration).forEach((key) => {
        if (declaration[key].class === 'Authentication') {
            count.ldap += (declaration[key].ldap) ? 1 : 0;
            count.radius += (declaration[key].radius) ? 1 : 0;
            count.tacacs += (declaration[key].tacacs) ? 1 : 0;
        }

        if (typeof declaration[key] === 'object') {
            countAuthenticationTypes(declaration[key], count);
        }
    });

    return count;
}

module.exports = DeclarationHandler;
