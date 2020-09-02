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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const isInSubnet = require('is-in-subnet').isInSubnet;
const doUtil = require('./doUtil');
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;

const logger = new Logger(module);

/**
 * Handles network parts of a declaration.
 *
 * @class
 */
class NetworkHandler {
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
        logger.fine('Proessing network declaration.');
        logger.fine('Checking Trunks.');
        return handleTrunk.call(this)
            .then(() => {
                logger.fine('Checking VLANs.');
                return handleVlan.call(this);
            })
            .then(() => {
                logger.fine('Checking RouteDomains.');
                return handleRouteDomain.call(this);
            })
            .then(() => {
                logger.fine('Checking DNS_Resolvers');
                return handleDnsResolver.call(this);
            })
            .then(() => {
                logger.fine('Checking Tunnels');
                return handleTunnel.call(this);
            })
            .then(() => {
                logger.fine('Checking SelfIps.');
                return handleSelfIp.call(this);
            })
            .then(() => {
                logger.fine('Checking Routes.');
                return handleRoute.call(this);
            })
            .then(() => {
                logger.fine('Checking DagGlobals');
                return handleDagGlobals.call(this);
            })
            .then(() => {
                logger.info('Checking RoutingAsPath');
                return handleRoutingAsPath.call(this);
            })
            .then(() => {
                logger.info('Done processing network declartion.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleVlan() {
    return new Promise((resolve, reject) => {
        const promises = [];
        doUtil.forEach(this.declaration, 'VLAN', (tenant, vlan) => {
            if (vlan && vlan.name) {
                const vlanInterfaces = vlan && Array.isArray(vlan.interfaces) ? vlan.interfaces.slice() : [];
                const interfaces = [];
                vlanInterfaces.forEach((anInterface) => {
                    // Use the tagged property if it is there, otherwise, set tagged if the vlan has a tag
                    let tagged;
                    if (typeof anInterface.tagged === 'undefined') {
                        tagged = !!vlan.tag;
                    } else {
                        tagged = anInterface.tagged;
                    }

                    interfaces.push(
                        {
                            tagged,
                            name: anInterface.name
                        }
                    );
                });

                const vlanBody = {
                    interfaces,
                    name: vlan.name,
                    partition: tenant,
                    cmpHash: vlan.cmpHash,
                    failsafe: vlan.failsafeEnabled ? 'enabled' : 'disabled',
                    failsafeAction: vlan.failsafeAction,
                    failsafeTimeout: vlan.failsafeTimeout
                };

                if (vlan.mtu) {
                    vlanBody.mtu = vlan.mtu;
                }

                if (vlan.tag) {
                    vlanBody.tag = vlan.tag;
                }

                promises.push(
                    this.bigIp.createOrModify(PATHS.VLAN, vlanBody, null, cloudUtil.MEDIUM_RETRY)
                );
            }
        });

        Promise.all(promises)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                logger.severe(`Error creating vlans: ${err.message}`);
                reject(err);
            });
    });
}

function handleSelfIp() {
    return new Promise((resolve, reject) => {
        const nonFloatingBodies = [];
        const floatingBodies = [];
        doUtil.forEach(this.declaration, 'SelfIp', (tenant, selfIp) => {
            if (selfIp && selfIp.name) {
                let vlan;

                // If the vlan does not start with '/', assume it is in this tenant
                if (selfIp.vlan.startsWith('/')) {
                    vlan = selfIp.vlan;
                } else {
                    vlan = `/${tenant}/${selfIp.vlan}`;
                }

                const selfIpBody = {
                    vlan,
                    name: selfIp.name,
                    partition: tenant,
                    address: selfIp.address,
                    trafficGroup: selfIp.trafficGroup,
                    allowService: selfIp.allowService
                };

                if (selfIpBody.trafficGroup
                    && !selfIpBody.trafficGroup.endsWith('traffic-group-local-only')) {
                    floatingBodies.push(selfIpBody);
                } else {
                    nonFloatingBodies.push(selfIpBody);
                }
            }
        });

        let selfIpsToRecreate = [];
        let routesToRecreate = [];

        // We can't modify a self IP - we need to delete it and re-add it.
        // We have to delete floating self IPs before non-floating self IPs
        deleteExistingSelfIps.call(this, floatingBodies)
            .then((deletedObjects) => {
                if (deletedObjects) {
                    selfIpsToRecreate = deletedObjects.deletedFloatingSelfIps.slice();
                    routesToRecreate = deletedObjects.deletedRoutes.slice();
                }
                return deleteExistingSelfIps.call(this, nonFloatingBodies);
            })
            .then((deletedObjects) => {
                selfIpsToRecreate = selfIpsToRecreate.concat(deletedObjects.deletedFloatingSelfIps);
                routesToRecreate = routesToRecreate.concat(deletedObjects.deletedRoutes);

                // We have to create non floating self IPs before floating self IPs
                const createPromises = [];
                nonFloatingBodies.forEach((selfIpBody) => {
                    createPromises.push(
                        this.bigIp.create(PATHS.SelfIp, selfIpBody, null, cloudUtil.MEDIUM_RETRY)
                    );
                });

                return Promise.all(createPromises);
            })
            .then(() => {
                const createPromises = [];
                floatingBodies.forEach((selfIpBody) => {
                    createPromises.push(
                        this.bigIp.create(PATHS.SelfIp, selfIpBody, null, cloudUtil.MEDIUM_RETRY)
                    );
                });
                return Promise.all(createPromises);
            })
            .then(() => {
                const createPromises = [];
                selfIpsToRecreate.forEach((selfIp) => {
                    const selfIpBody = {
                        name: selfIp.name,
                        partition: selfIp.partition,
                        vlan: selfIp.vlan,
                        address: selfIp.address,
                        trafficGroup: selfIp.trafficGroup,
                        allowService: selfIp.allowService
                    };
                    createPromises.push(
                        this.bigIp.create(PATHS.SelfIp, selfIpBody, null, cloudUtil.MEDIUM_RETRY)
                    );
                });
                return Promise.all(createPromises);
            })
            .then(() => {
                const createPromises = [];
                routesToRecreate.forEach((route) => {
                    const routeBody = {
                        name: route.name,
                        partition: route.partition,
                        gw: route.gw,
                        network: route.network,
                        mtu: route.mtu
                    };
                    createPromises.push(
                        this.bigIp.create(PATHS.Route, routeBody, null, cloudUtil.MEDIUM_RETRY)
                    );
                });
                return Promise.all(createPromises);
            })
            .then(() => {
                resolve();
            })
            .catch((err) => {
                logger.severe(`Error creating self IPs: ${err.message}`);
                reject(err);
            });
    });
}

function handleRoute() {
    if (!this.declaration.Common.Route) {
        return Promise.resolve();
    }

    return Promise.resolve()
        .then(() => {
            let createLocalOnly = false;

            // Must check if the declaration requires LOCAL_ONLY before creating different routes
            doUtil.forEach(this.declaration, 'Route', (tenant, route) => {
                if (!createLocalOnly) {
                    createLocalOnly = route.localOnly;
                }
            });

            if (createLocalOnly) {
                return this.bigIp.createFolder('LOCAL_ONLY', { subPath: '/' });
            }
            return Promise.resolve();
        })
        .then(() => {
            const promises = [];
            doUtil.forEach(this.declaration, 'Route', (tenant, route) => {
                let promise = Promise.resolve();
                if (route && route.name) {
                    const mask = route.network.includes(':') ? 128 : 32;
                    route.network = route.network !== 'default' && route.network !== 'default-inet6'
                        && !route.network.includes('/') ? `${route.network}/${mask}` : route.network;

                    let targetPartition = tenant;
                    if (route.localOnly) {
                        targetPartition = 'LOCAL_ONLY';
                    }

                    // Need to do a delete if the network property is updated
                    if (this.state.currentConfig.Common.Route
                        && this.state.currentConfig.Common.Route[route.name]
                        && this.state.currentConfig.Common.Route[route.name].network !== route.network) {
                        promise = promise.then(() => this.bigIp.delete(
                            `${PATHS.Route}/~${targetPartition}~${route.name}`,
                            null,
                            null,
                            cloudUtil.NO_RETRY
                        ));
                    }

                    const routeBody = {
                        name: route.name,
                        partition: targetPartition,
                        network: route.network,
                        mtu: route.mtu
                    };

                    if (route.target) {
                        if (route.target.startsWith('/')) {
                            routeBody.interface = route.target;
                        } else {
                            routeBody.interface = `/${tenant}/${route.target}`;
                        }
                    } else {
                        routeBody.gw = route.gw;
                    }

                    promise = promise.then(() => this.bigIp.createOrModify(
                        PATHS.Route, routeBody, null, cloudUtil.MEDIUM_RETRY
                    ));
                }

                promises.push(promise);
            });

            return Promise.all(promises)
                .catch((err) => {
                    logger.severe(`Error creating routes: ${err.message}`);
                    throw err;
                });
        });
}

function handleDnsResolver() {
    const promises = [];
    doUtil.forEach(this.declaration, 'DNS_Resolver', (tenant, resolver) => {
        if (resolver && resolver.name) {
            let forwardZones;
            if (resolver.forwardZones) {
                forwardZones = resolver.forwardZones.map(zone => ({
                    name: zone.name,
                    nameservers: zone.nameservers.map(nameserver => (typeof nameserver === 'object' ? nameserver : ({ name: nameserver })))
                }));
            }
            const resolverBody = {
                name: resolver.name,
                partition: tenant,
                answerDefaultZones: resolver.answerDefaultZones ? 'yes' : 'no',
                cacheSize: resolver.cacheSize,
                forwardZones: forwardZones || 'none',
                randomizeQueryNameCase: resolver.randomizeQueryNameCase ? 'yes' : 'no',
                routeDomain: resolver.routeDomain,
                useIpv4: resolver.useIpv4 ? 'yes' : 'no',
                useIpv6: resolver.useIpv6 ? 'yes' : 'no',
                useTcp: resolver.useTcp ? 'yes' : 'no',
                useUdp: resolver.useUdp ? 'yes' : 'no'
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.DNS_Resolver, resolverBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating DNS_Resolvers: ${err.message}`);
            throw err;
        });
}

function handleTrunk() {
    const promises = [];
    doUtil.forEach(this.declaration, 'Trunk', (tenant, trunk) => {
        if (trunk && trunk.name) {
            const trunkBody = {
                name: trunk.name,
                distributionHash: trunk.distributionHash,
                interfaces: trunk.interfaces,
                lacp: trunk.lacpEnabled ? 'enabled' : 'disabled',
                lacpMode: trunk.lacpMode,
                lacpTimeout: trunk.lacpTimeout,
                linkSelectPolicy: trunk.linkSelectPolicy,
                qinqEthertype: trunk.qinqEthertype,
                stp: trunk.spanningTreeEnabled ? 'enabled' : 'disabled'
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.Trunk, trunkBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating Trunks: ${err.message}`);
            throw err;
        });
}
function handleRouteDomain() {
    const promises = [];
    doUtil.forEach(this.declaration, 'RouteDomain', (tenant, routeDomain) => {
        if (routeDomain && routeDomain.name) {
            const routeDomainBody = {
                name: routeDomain.name,
                partition: tenant,
                id: routeDomain.id,
                connectionLimit: routeDomain.connectionLimit,
                bwcPolicy: routeDomain.bandwidthControllerPolicy,
                flowEvictionPolicy: routeDomain.flowEvictionPolicy,
                fwEnforcedPolicy: routeDomain.enforcedFirewallPolicy,
                fwStagedPolicy: routeDomain.stagedFirewallPolicy,
                ipIntelligencePolicy: routeDomain.ipIntelligencePolicy,
                securityNatPolicy: routeDomain.securityNatPolicy,
                servicePolicy: routeDomain.servicePolicy,
                strict: routeDomain.strict ? 'enabled' : 'disabled',
                routingProtocol: routeDomain.routingProtocols,
                vlans: routeDomain.vlans
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.RouteDomain, routeDomainBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating RouteDomains: ${err.message}`);
            throw err;
        });
}

function handleDagGlobals() {
    if (this.declaration.Common && this.declaration.Common.DagGlobals) {
        const body = {
            dagIpv6PrefixLen: this.declaration.Common.DagGlobals.ipv6PrefixLength,
            icmpHash: this.declaration.Common.DagGlobals.icmpHash,
            roundRobinMode: this.declaration.Common.DagGlobals.roundRobinMode
        };
        this.bigIp.modify(PATHS.DagGlobals, body);
    }
    return Promise.resolve();
}

function handleTunnel() {
    const promises = [];
    doUtil.forEach(this.declaration, 'Tunnel', (tenant, tunnel) => {
        if (tunnel && tunnel.name && tunnel.tunnelType) {
            const tunnelBody = {
                name: tunnel.name,
                partition: tenant,
                autoLasthop: tunnel.autoLastHop,
                mtu: tunnel.mtu,
                profile: `/Common/${tunnel.tunnelType}`,
                tos: tunnel.typeOfService,
                usePmtu: tunnel.usePmtu ? 'enabled' : 'disabled'
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.Tunnel, tunnelBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating Tunnels: ${err.message}`);
            throw err;
        });
}

function handleRoutingAsPath() {
    const promises = [];
    let enabledRouting = false;
    doUtil.forEach(this.declaration, 'RoutingAsPath', (tenant, routing) => {
        if (routing && routing.entries) {
            const entries = {};

            if (!enabledRouting) {
                // Enable routing on the BIG-IP
                enabledRouting = true;

                this.bigIp.modify(
                    '/tm/sys/db/tmrouted.tmos.routing',
                    { value: 'enable' },
                    null,
                    cloudUtil.SHORT_RETRY
                );
            }

            routing.entries.forEach((entry) => {
                entries[entry.name] = {
                    action: 'permit',
                    regex: entry.regex
                };
            });

            const body = {
                name: routing.name,
                partition: tenant,
                entries
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.RoutingAsPath, body, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating RoutingAsPath: ${err.message}`);
            throw err;
        });
}

/**
 * Deletes selfIps if they exist.
 *
 * Also deletes:
 *     + Floating SelfIps that are in the same subnet as the SelfIp as TMOS
 *       will not allow a non-floating SelfIp to be deleted if it would leave a
 *       floating SelfIp route unreachable.
 *       A list of deleted SelfIps will be returned to the caller.
 *     + Routes that are in the same subnet as the SelfIp as TMOS
 *       will not allow a SelfIp to be deleted if it would leave a route unreachable.
 *       A list of deleted Routes will be returned to the caller.
 *
 * @param {Object[]} selfIpBodies - SelfIps to delete if they exist
 *
 * @returns {Promise} A promise which is resolved with the list of SelfIps and Routes that
 *                    were deleted to enable deleting the SeflIps
 *
 *      {
 *          deletedFloatingSelfIps: [],
 *          deletedRouted: []
 *      }
 */
function deleteExistingSelfIps(selfIpBodies) {
    const existsPromises = [];
    const existingSelfIps = [];
    const deletedFloatingSelfIps = [];
    const deletedRoutes = [];

    if (!selfIpBodies || !Array.isArray(selfIpBodies)) {
        return Promise.resolve({ deletedRoutes, deletedFloatingSelfIps });
    }

    selfIpBodies.forEach((selfIpBody) => {
        existsPromises.push(exists.call(this, PATHS.SelfIp, selfIpBody.partition, selfIpBody.name));
    });
    return Promise.all(existsPromises)
        .then((results) => {
            const existsResults = results && Array.isArray(results) ? results.slice() : [];
            existsResults.forEach((result, index) => {
                if (result) {
                    existingSelfIps.push(selfIpBodies[index]);
                }
            });
            return findMatchingRoutes.call(this, existingSelfIps);
        })
        .then((results) => {
            const matchingRoutes = results && Array.isArray(results) ? results.slice() : [];
            const routeDeletePromises = [];
            matchingRoutes.forEach((matchingRoute) => {
                routeDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.Route}/~${matchingRoute.partition}~${matchingRoute.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );
                deletedRoutes.push(matchingRoute);
            });
            return Promise.all(routeDeletePromises);
        })
        .then(() => findMatchingFloatingSelfIps.call(this, existingSelfIps))
        .then((results) => {
            const matchingSelfIps = results && Array.isArray(results) ? results.slice() : [];
            const selfIpDeletePromises = [];

            matchingSelfIps.forEach((selfIp) => {
                selfIpDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.SelfIp}/~${selfIp.partition}~${selfIp.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );

                // Keep track of any floating self IPs we are deleting because they are on the
                // same subnet as a non-floating self ip (but not if we were going to delete it
                // anyway)
                let alreadyDeleting = false;
                selfIpBodies.forEach((selfIpWereDeletingAlready) => {
                    if (selfIpWereDeletingAlready.address === selfIp.address
                        && selfIpWereDeletingAlready.trafficGroup === selfIp.trafficGroup) {
                        alreadyDeleting = true;
                    }
                });
                if (!alreadyDeleting) {
                    deletedFloatingSelfIps.push(selfIp);
                }
            });

            return Promise.all(selfIpDeletePromises);
        })
        .then(() => {
            const selfIpDeletePromises = [];
            existingSelfIps.forEach((selfIpBody) => {
                selfIpDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.SelfIp}/~${selfIpBody.partition}~${selfIpBody.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );
            });

            return Promise.all(selfIpDeletePromises);
        })
        .then(() => Promise.resolve(
            { deletedRoutes, deletedFloatingSelfIps }
        ))
        .catch((err) => {
            logger.severe(`Error deleting SelfIp: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Finds all floating self IPs that are in the same subnet as the self ips we are about to delete
 *
 * @param {Object[]} selfIpsToDelete - Self IPs we are going to delete
 */
function findMatchingFloatingSelfIps(selfIpsToDelete) {
    const matchingSelfIps = [];

    if (selfIpsToDelete.length === 0) {
        return Promise.resolve(matchingSelfIps);
    }

    return this.bigIp.list(PATHS.SelfIp, null, cloudUtil.SHORT_RETRY)
        .then((selfIps) => {
            const existingSelfIps = selfIps && Array.isArray(selfIps) ? selfIps.slice() : [];

            existingSelfIps.forEach((existingSelfIp) => {
                if (!existingSelfIp.trafficGroup.endsWith('traffic-group-local-only')) {
                    selfIpsToDelete.forEach((selfIp) => {
                        if (selfIp.trafficGroup.endsWith('traffic-group-local-only')) {
                            if (isInSubnet(doUtil.stripCidr(existingSelfIp.address), selfIp.address)) {
                                if (matchingSelfIps.findIndex(elementMatches, existingSelfIp) === -1) {
                                    matchingSelfIps.push(existingSelfIp);
                                }
                            }
                        }
                    });
                }
            });

            return Promise.resolve(matchingSelfIps);
        })
        .catch((err) => {
            logger.severe(`Error finding matching floating self ips: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Finds all reoutes that are in the same subnet as the self ips we are about to delete
 *
 * @param {Object[]} selfIpsToDelete - Self IPs we are going to delete
 */
function findMatchingRoutes(selfIpsToDelete) {
    const matchingRoutes = [];

    if (selfIpsToDelete.length === 0) {
        return Promise.resolve(matchingRoutes);
    }

    return this.bigIp.list(PATHS.Route, null, cloudUtil.SHORT_RETRY)
        .then((routes) => {
            const existingRoutes = routes && Array.isArray(routes) ? routes.slice() : [];

            existingRoutes.forEach((route) => {
                selfIpsToDelete.forEach((selfIp) => {
                    if (isInSubnet(route.gw, selfIp.address)) {
                        if (matchingRoutes.findIndex(elementMatches, route) === -1) {
                            matchingRoutes.push(route);
                        }
                    }
                });
            });

            return Promise.resolve(matchingRoutes);
        })
        .catch((err) => {
            logger.severe(`Error finding matching routes: ${err.message}`);
            return Promise.reject(err);
        });
}

function exists(path, partition, name) {
    return new Promise((resolve, reject) => {
        const partitionPath = `~${partition}~`;

        this.bigIp.list(`${path}/${partitionPath}${name}`, null, cloudUtil.SHORT_RETRY)
            .then(() => {
                resolve(true);
            })
            .catch((err) => {
                if (err.code === 404) {
                    resolve(false);
                } else {
                    reject(err);
                }
            });
    });
}

function elementMatches(element) {
    return this.name === element.name;
}

module.exports = NetworkHandler;
