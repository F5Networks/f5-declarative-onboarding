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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const RADIUS = require('./sharedConstants').RADIUS;
const LDAP = require('./sharedConstants').LDAP;
const AUTH = require('./sharedConstants').AUTH;

const logger = new Logger(module);

// This is an ordered list - objects will be deleted in this order
const DELETABLE_CLASSES = [
    'DeviceGroup',
    'DNS_Resolver',
    'Route',
    'SelfIp',
    'FirewallPolicy',
    'FirewallAddressList',
    'FirewallPortList',
    'NetAddressList',
    'NetPortList',
    'VLAN',
    'Trunk',
    'RouteMap',
    'RouteDomain',
    'RemoteAuthRole',
    'ManagementRoute',
    'Tunnel',
    'RoutingAccessList',
    'RoutingAsPath',
    'RoutingPrefixList',
    'GSLBMonitor',
    'SnmpTrapDestination',
    'SnmpCommunity',
    'SnmpUser'
];
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
                    http_head_f5: {},
                    https: {},
                    https_head_f5: {},
                    gateway_icmp: {},
                    tcp: {},
                    udp: {}
                }
            };

            return items[aClass] && items[aClass][item];
        }

        const deleteClass = (deletableClass) => {
            const classPromises = [];
            const transactionCommands = [];

            if (!this.declaration.Common[deletableClass]) {
                return Promise.resolve();
            }

            let itemNames = Object.keys(this.declaration.Common[deletableClass]);

            // If we get an empty class, that means we are deleting all of the items for that class
            if (itemNames.length === 0) {
                itemNames = Object.keys(this.state.currentConfig.Common[deletableClass]);
            }

            itemNames.forEach((itemToDelete) => {
                // Special case for device groups
                if (deletableClass === 'DeviceGroup') {
                    if (READ_ONLY_DEVICE_GROUPS.indexOf(itemToDelete) === -1) {
                        classPromises.push(this.bigIp.cluster.deleteDeviceGroup(itemToDelete));
                    }
                } else if (deletableClass === 'RemoteAuthRole') {
                    const path = `${PATHS.AuthRemoteRole}/${itemToDelete}`;
                    classPromises.push(getDeletePromise(this.bigIp, path));
                } else if (deletableClass === 'Route') {
                    const partition = this.state.currentConfig.Common.Route[itemToDelete].localOnly
                        ? 'LOCAL_ONLY' : 'Common';
                    const path = `${PATHS.Route}/~${partition}~${itemToDelete}`;
                    classPromises.push(getDeletePromise(this.bigIp, path));
                } else if (deletableClass === 'RoutingAsPath' || deletableClass === 'RoutingPrefixList') {
                    const path = `${PATHS[deletableClass]}/~Common~${itemToDelete}`;
                    const retryOptions = { continueOnError: true };
                    Object.assign(retryOptions, cloudUtil.SHORT_RETRY);
                    classPromises.push(getDeletePromise(this.bigIp, path, retryOptions));
                } else if (deletableClass === 'GSLBMonitor'
                    && !isRetainedItem(deletableClass, itemToDelete)) {
                    // GSLB Monitors have their monitor type as part of the path instead of a property
                    const currMon = this.state.currentConfig.Common.GSLBMonitor[itemToDelete];
                    const path = `${PATHS.GSLBMonitor}/${currMon.monitorType}/~Common~${itemToDelete}`;
                    classPromises.push(getDeletePromise(this.bigIp, path));
                } else if (deletableClass === 'Tunnel'
                    && !isRetainedItem(deletableClass, itemToDelete)) {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    const path = `${PATHS.Tunnel}/${commonPrefix}${itemToDelete}`;
                    const tunnelPromise = getDeletePromise(this.bigIp, path);
                    if (this.state.currentConfig.Common.Tunnel[itemToDelete].profile === 'vxlan') {
                        // Check if the itemToDelete has a vxlan profile if so that must be deleted
                        // too vxlan profiles need deleted AFTER the tunnel deletion
                        const pathVxlan = `${PATHS.VXLAN}/${commonPrefix}${itemToDelete}_vxlan`;
                        tunnelPromise.then(() => getDeletePromise(this.bigIp, pathVxlan));
                    }
                    classPromises.push(tunnelPromise);
                // Special cases for NetAddressList/FirewallAddressList: On BIGIP with provisioned AFM module
                // if you create NetAddressList then FirewallAddressList will be created and vice versa.
                // By deleting one of them second will delete automatically, so let's delete only one of them.
                } else if (deletableClass === 'NetAddressList') {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    if (this.state.currentConfig.Common.FirewallAddressList
                     && this.state.currentConfig.Common.FirewallAddressList[itemToDelete]) {
                        const path = `${PATHS.FirewallAddressList}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                        delete this.state.currentConfig.Common.FirewallAddressList[itemToDelete];
                    } else {
                        const path = `${PATHS[deletableClass]}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                    }
                } else if (deletableClass === 'FirewallAddressList') {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    if (this.state.currentConfig.Common.NetAddressList
                     && this.state.currentConfig.Common.NetAddressList[itemToDelete]) {
                        const path = `${PATHS.NetAddressList}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                        delete this.state.currentConfig.Common.NetAddressList[itemToDelete];
                    } else {
                        const path = `${PATHS[deletableClass]}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                    }
                // Special cases for NetPortList/FirewallPortList: On BIGIP with provisioned AFM module
                // if you create NetPortList then FirewallPortList will be created and vice versa.
                // By deleting one of them second will delete automatically, so let's delete only one of them.
                } else if (deletableClass === 'NetPortList') {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    if (this.state.currentConfig.Common.FirewallPortList
                     && this.state.currentConfig.Common.FirewallPortList[itemToDelete]) {
                        const path = `${PATHS.FirewallPortList}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                        delete this.state.currentConfig.Common.FirewallPortList[itemToDelete];
                    } else {
                        const path = `${PATHS[deletableClass]}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                    }
                } else if (deletableClass === 'FirewallPortList') {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    if (this.state.currentConfig.Common.NetPortList
                     && this.state.currentConfig.Common.NetPortList[itemToDelete]) {
                        const path = `${PATHS.NetPortList}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                        delete this.state.currentConfig.Common.NetPortList[itemToDelete];
                    } else {
                        const path = `${PATHS[deletableClass]}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                        classPromises.push(getDeletePromise(this.bigIp, path));
                    }
                } else if (!isRetainedItem(deletableClass, itemToDelete)) {
                    const commonPrefix = deletableClass === 'Trunk' ? '' : '~Common~';
                    const path = `${PATHS[deletableClass]}/${commonPrefix}${itemToDelete.replace(/\//g, '~')}`;
                    if (deletableClass === 'RouteDomain') {
                        transactionCommands.push({
                            method: 'delete',
                            path
                        });
                    } else {
                        classPromises.push(getDeletePromise(this.bigIp, path));
                    }
                }
            });
            if (transactionCommands.length > 0) {
                classPromises.push(this.bigIp.transaction(transactionCommands));
            }
            return Promise.all(classPromises);
        };

        return Promise.resolve()
            // Delete special GSLB item items first so that references to other items, such as
            // GSLB Monitor, are not prematurely deleted
            .then(() => getGSLBClassTransaction.call(this))
            .then(() => cloudUtil.callInSerial(this, DELETABLE_CLASSES.map((deletableClass) => ({
                promise: deleteClass,
                arguments: [deletableClass]
            }))))
            .then(() => Promise.all(getAuthClassPromises.call(this)))
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
        return Promise.resolve();
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
                    const shouldDelete = items.some((item) => item.fullPath === `/Common/${name}`);

                    if (shouldDelete) {
                        return getDeletePromise(this.bigIp, `${path}/~Common~${name}`);
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
                    const shouldDelete = items.some((item) => item.fullPath === `/Common/${AUTH.SUBCLASSES_NAME}`);

                    if (shouldDelete) {
                        return getDeletePromise(this.bigIp, `/tm/auth/${authItem}/${AUTH.SUBCLASSES_NAME}`);
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
                                    (item) => item.fullPath === `/Common/${AUTH.SUBCLASSES_NAME}`
                                );

                                if (shouldDelete) {
                                    return getDeletePromise(this.bigIp, `${PATHS.AuthRadiusServer}/~Common~${server}`);
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

function getDeletePromise(bigIp, path, options) {
    const retryOptions = options || cloudUtil.SHORT_RETRY;
    return bigIp.delete(path, null, null, retryOptions)
        .catch((err) => {
            if (err.code === 404) {
                return Promise.resolve();
            }
            throw err;
        });
}

module.exports = DeleteHandler;
