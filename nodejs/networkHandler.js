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
const isInSubnet = require('is-in-subnet').isInSubnet;
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
     */
    constructor(declaration, bigIp, eventEmitter) {
        this.declaration = declaration;
        this.bigIp = bigIp;
        this.eventEmitter = eventEmitter;
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        logger.fine('Proessing network declaration.');
        logger.fine('Checking VLANs.');
        return handleVlan.call(this)
            .then(() => {
                logger.fine('Checking SelfIps.');
                return handleSelfIp.call(this);
            })
            .then(() => {
                logger.fine('Checking Routes.');
                return handleRoute.call(this);
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
        forEach(this.declaration, 'VLAN', (tenant, vlan) => {
            const interfaces = [];
            vlan.interfaces.forEach((anInterface) => {
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
                partition: tenant
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
        forEach(this.declaration, 'SelfIp', (tenant, selfIp) => {
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

            if (selfIpBody.trafficGroup && !selfIpBody.trafficGroup.endsWith('traffic-group-local-only')) {
                floatingBodies.push(selfIpBody);
            } else {
                nonFloatingBodies.push(selfIpBody);
            }
        });

        let routesToRecreate = [];

        // We can't modify a self IP - we need to delete it and re-add it.
        deleteExistingSelfIps.call(this, floatingBodies.concat(nonFloatingBodies))
            .then((deletedRoutes) => {
                routesToRecreate = deletedRoutes.slice();
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
    return new Promise((resolve, reject) => {
        const promises = [];
        forEach(this.declaration, 'Route', (tenant, route) => {
            const routeBody = {
                name: route.name,
                partition: tenant,
                gw: route.gw,
                network: route.network,
                mtu: route.mtu
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.Route, routeBody, null, cloudUtil.MEDIUM_RETRY)
            );
        });

        Promise.all(promises)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                logger.severe(`Error creating routes: ${err.message}`);
                reject(err);
            });
    });
}

/**
 * Iterates over the tenants in a parsed declaration
 *
 * At this point, Declarative Onboarding only supports the Common partition, but this
 * is written to handle other partitions if they should enter the schema.
 *
 * @param {Object} declaration - The parsed declaration
 * @param {Strint} classToFetch - The name of the class (DNS, VLAN, etc)
 * @param {function} cb - Function to execute for each object. Will be called with 2 parameters
 *                        tenant and object declaration. Object declaration is the declaration
 *                        for just the object in question, not the whole declaration
 */
function forEach(declaration, classToFetch, cb) {
    const tenantNames = Object.keys(declaration);
    tenantNames.forEach((tenantName) => {
        const tenant = declaration[tenantName];
        const classNames = Object.keys(tenant);
        classNames.forEach((className) => {
            if (className === classToFetch) {
                const classObject = tenant[className];
                if (typeof classObject === 'object') {
                    const containerNames = Object.keys(classObject);
                    containerNames.forEach((containerName) => {
                        cb(tenantName, classObject[containerName]);
                    });
                } else {
                    cb(tenantName, classObject);
                }
            }
        });
    });
}

/**
 * Deletes selfIps if they exist.
 *
 * Also deletes any Routes that are in the same subnet as the SelfIp as TMOS
 * will not allow a SelfIp to be deleted if it would leave a route unreachable.
 * A list of deleted Routes will be returned to the caller.
 *
 * @param {Object[]} selfIpBodies - SelfIps to delete if they exist
 *
 * @returns {Promise} A promise which is resolved with the list of Routes that
 *                    were deleted to enable deleting the SeflIps
 */
function deleteExistingSelfIps(selfIpBodies) {
    const existsPromises = [];
    const existingSelfIps = [];
    const deletedRoutes = [];

    selfIpBodies.forEach((selfIpBody) => {
        existsPromises.push(exists.call(this, PATHS.SelfIp, selfIpBody.partition, selfIpBody.name));
    });
    return Promise.all(existsPromises)
        .then((results) => {
            results.forEach((result, index) => {
                if (result) {
                    existingSelfIps.push(selfIpBodies[index]);
                }
            });
            return findMatchingRoutes.call(this, existingSelfIps);
        })
        .then((matchingRoutes) => {
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
        .then(() => {
            const selfIpDeletePromises = [];
            selfIpBodies.forEach((selfIpBody) => {
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
        .then(() => {
            return Promise.resolve(deletedRoutes);
        })
        .catch((err) => {
            logger.severe(`Error deleting SelfIp: ${err.message}`);
            return Promise.reject(err);
        });
}

function findMatchingRoutes(selfIps) {
    function routeMatches(route) {
        return this.name === route.name;
    }
    const matchingRoutes = [];
    return this.bigIp.list(PATHS.Route)
        .then((routes) => {
            const existingRoutes = routes && Array.isArray(routes) ? routes.slice() : [];

            existingRoutes.forEach((route) => {
                selfIps.forEach((selfIp) => {
                    if (isInSubnet(route.gw, selfIp.address)) {
                        if (matchingRoutes.findIndex(routeMatches, route) === -1) {
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

        this.bigIp.list(`${path}/${partitionPath}${name}`)
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

module.exports = NetworkHandler;
