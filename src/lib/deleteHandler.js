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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const RADIUS = require('./sharedConstants').RADIUS;
const LDAP = require('./sharedConstants').LDAP;
const AUTH = require('./sharedConstants').AUTH;

const logger = new Logger(module);

// This is an ordered list - objects will be deleted in this order
const DELETABLE_CLASSES = ['DeviceGroup', 'DNS_Resolver', 'Route', 'SelfIp', 'VLAN', 'Trunk', 'RouteDomain', 'RemoteAuthRole', 'ManagementRoute', 'Tunnel', 'RouteMap', 'RoutingAsPath', 'RoutingPrefixList', 'GSLBMonitor'];
const READ_ONLY_DEVICE_GROUPS = ['device_trust_group', 'gtm', 'datasync-global-dg', 'dos-global-dg'];

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
     * Deletes items in the declaration
     *
     * this.declaration should look like:
     * {
     *     Common: {
     *         VLAN: {
     *             myVlan1: {},
     *             myVlan2: {}
     *         }
     *     }
     * }
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        logger.fine('Processing deletes.');

        function isRetainedItem(aClass, item) {
            const items = {
                RouteDomain: {
                    0: {} // Route Domain 0 can't be deleted
                },
                Tunnel: {
                    'http-tunnel': {}, // referenced by http-tunnel profile
                    'socks-tunnel': {} // referenced by socks profile
                },
                DNS_Resolver: {
                    'f5-aws-dns': {} // referenced by Security Offbox Service f5-tap-ingress-aws-global
                },
                GSLBMonitor: { // BIG-IP has a number of default monitors, that cannot be removed
                    http: {},
                    http_head_f5: {}
                }
            };

            return items[aClass] && items[aClass][item];
        }

        const promises = [];

        // Delete special GSLB item items first so that references to other items, such as
        // GSLB Monitor, are not prematurely deleted
        const gslbTransaction = getGSLBClassTransaction.call(this);
        if (gslbTransaction) {
            promises.push([gslbTransaction]);
        }

        DELETABLE_CLASSES.forEach((deleteableClass) => {
            if (this.declaration.Common[deleteableClass]) {
                const classPromises = [];
                const transactionCommands = [];
                Object.keys(this.declaration.Common[deleteableClass]).forEach((itemToDelete) => {
                    // Special case for device groups
                    if (deleteableClass === 'DeviceGroup') {
                        if (READ_ONLY_DEVICE_GROUPS.indexOf(itemToDelete) === -1) {
                            classPromises.push(this.bigIp.cluster.deleteDeviceGroup(itemToDelete));
                        }
                    } else if (deleteableClass === 'RemoteAuthRole') {
                        const path = `${PATHS.AuthRemoteRole}/${itemToDelete}`;
                        classPromises.push(this.bigIp.delete(path, null, null, cloudUtil.NO_RETRY));
                    } else if (deleteableClass === 'Route') {
                        const partition = this.state.currentConfig.Common.Route[itemToDelete].localOnly
                            ? 'LOCAL_ONLY' : 'Common';
                        const path = `${PATHS.Route}/~${partition}~${itemToDelete}`;
                        classPromises.push(this.bigIp.delete(path, null, null, cloudUtil.NO_RETRY));
                    } else if (deleteableClass === 'GSLBMonitor'
                        && !isRetainedItem(deleteableClass, itemToDelete)) {
                        // GSLB Monitors have their monitor type as part of the path instead of a property
                        const currMon = this.state.currentConfig.Common.GSLBMonitor[itemToDelete];
                        const path = `${PATHS.GSLBMonitor}/${currMon.monitorType}/~Common~${itemToDelete}`;
                        classPromises.push(this.bigIp.delete(path, null, null, cloudUtil.NO_RETRY));
                    } else if (!isRetainedItem(deleteableClass, itemToDelete)) {
                        const commonPrefix = deleteableClass === 'Trunk' ? '' : '~Common~';
                        const path = `${PATHS[deleteableClass]}/${commonPrefix}${itemToDelete}`;
                        if (deleteableClass === 'RouteDomain') {
                            transactionCommands.push({
                                method: 'delete',
                                path
                            });
                        } else {
                            classPromises.push(this.bigIp.delete(path, null, null, cloudUtil.NO_RETRY));
                        }
                    }
                });
                if (transactionCommands.length > 0) {
                    classPromises.push(this.bigIp.transaction(transactionCommands));
                }
                if (classPromises.length > 0) {
                    promises.push(classPromises);
                }
            }
        });

        const authPromises = getAuthClassPromises.call(this);
        if (authPromises.length > 0) {
            promises.push(authPromises);
        }
        function runInSerial(promiseArr) {
            return promiseArr.reduce((chain, curr) => chain.then(() => Promise.all(curr)), Promise.resolve());
        }

        return runInSerial(promises)
            .catch((err) => {
                logger.severe(`Error processing deletes: ${err.message}`);
                return Promise.reject(err);
            })
            .then(() => {
                logger.fine('Done processing deletes.');
                return Promise.resolve();
            });
    }
}

// Special handling for GSLB items that can reference one another in any order.
function getGSLBClassTransaction() {
    const GSLB_CLASSES = ['GSLBProberPool', 'GSLBServer', 'GSLBDataCenter'];
    const transactionCommands = [];

    GSLB_CLASSES.forEach((gslbClass) => {
        if (this.declaration.Common[gslbClass]) {
            Object.keys(this.declaration.Common[gslbClass]).forEach((itemToDelete) => {
                transactionCommands.push({
                    method: 'delete',
                    path: `${PATHS[gslbClass]}/~Common~${itemToDelete}`
                });
            });
        }
    });

    if (transactionCommands.length === 0) {
        return null;
    }

    return this.bigIp.transaction(transactionCommands);
}

function getAuthClassPromises() {
    // special handling for auth items
    // mcp names each auth component system-auth, e.g. /tm/auth/radius/system-auth
    const auth = this.declaration.Common.Authentication;
    const authPromises = [];
    if (auth) {
        const authToDelete = ['radius', 'ldap', 'tacacs'];
        const deleteAuthItems = (path, names) => this.bigIp.list(path, null, null, cloudUtil.NO_RETRY)
            .then((authItems) => {
                const items = authItems && Array.isArray(authItems) ? authItems : [];
                return Promise.all(names.map((name) => {
                    const shouldDelete = items.some(item => item.fullPath === `/Common/${name}`);

                    if (shouldDelete) {
                        return this.bigIp.delete(
                            `${path}/~Common~${name}`,
                            null, null, cloudUtil.NO_RETRY
                        );
                    }
                    return Promise.resolve();
                }));
            });

        Object.keys(auth).forEach((authItem) => {
            if (authToDelete.indexOf(authItem) === -1) {
                return;
            }

            let promise = this.bigIp.list(`/tm/auth/${authItem}`, null, null, cloudUtil.NO_RETRY)
                .then((authItems) => {
                    const items = authItems && Array.isArray(authItems) ? authItems : [];
                    const shouldDelete = items.some(item => item.fullPath === `/Common/${AUTH.SUBCLASSES_NAME}`);

                    if (shouldDelete) {
                        return this.bigIp.delete(
                            `/tm/auth/${authItem}/${AUTH.SUBCLASSES_NAME}`,
                            null, null, cloudUtil.NO_RETRY
                        );
                    }
                    return Promise.resolve();
                });

            if (authItem === 'radius') {
                // quirk with radius-servers:
                // 1) needing separate DELETEs and they also have name constants
                // 2) should be deleted only when /tm/auth/radius/system-auth object was deleted
                promise = promise.then(() => this.bigIp.list(PATHS.AuthRadiusServer, null, null, cloudUtil.NO_RETRY))
                    .then((authItems) => {
                        const items = authItems && Array.isArray(authItems) ? authItems : [];
                        return Promise.all(
                            [RADIUS.PRIMARY_SERVER, RADIUS.SECONDARY_SERVER].map((server) => {
                                const shouldDelete = items.some(
                                    item => item.fullPath === `/Common/${AUTH.SUBCLASSES_NAME}`
                                );

                                if (shouldDelete) {
                                    return this.bigIp.delete(
                                        `${PATHS.AuthRadiusServer}/~Common~${server}`,
                                        null, null, cloudUtil.NO_RETRY
                                    );
                                }
                                return Promise.resolve();
                            })
                        );
                    });
            }

            if (authItem === 'ldap') {
                // quirk with ldap SSL certificates and keys:
                // 1) needing separate DELETEs and they also have name constants
                // 2) should be deleted only when /tm/auth/ldap/system-auth object was deleted
                promise = promise
                    .then(() => deleteAuthItems(PATHS.SSLCert, [LDAP.CA_CERT, LDAP.CLIENT_CERT]))
                    .then(() => deleteAuthItems(PATHS.SSLKey, [LDAP.CLIENT_KEY]));
            }

            authPromises.push(promise);
        });
    }
    return authPromises;
}

module.exports = DeleteHandler;
