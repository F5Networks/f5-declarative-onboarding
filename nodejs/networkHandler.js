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

const Logger = require('./logger');

const logger = new Logger(module);
const DEFAULT_CIDR = '/24';

class NetworkHandler {
    constructor(declarationInfo, bigIp) {
        this.declaration = declarationInfo.parsedDeclaration;
        this.bigIp = bigIp;
    }

    process() {
        logger.fine('Proessing network components');
        logger.fine('Checking VLANs');
        return createVlans.call(this)
            .then(() => {
                logger.fine('Checking SelfIps');
                return createSelfIps.call(this);
            })
            .then(() => {
                logger.fine('Checking Routes');
                return createRoutes.call(this);
            })
            .then(() => {
                logger.info('Done processing network declartion');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function createVlans() {
    return new Promise((resolve, reject) => {
        const promises = [];
        forEach(this.declaration, 'VLAN', (tenant, name, vlan) => {
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
                name,
                interfaces,
                partition: tenant
            };

            if (vlan.mtu) {
                vlanBody.mtu = vlan.mtu;
            }

            if (vlan.tag) {
                vlanBody.tag = vlan.tag;
            }

            promises.push(
                this.bigIp.createOrModify('/tm/net/vlan', vlanBody)
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

function createSelfIps() {
    return new Promise((resolve, reject) => {
        const promises = [];
        forEach(this.declaration, 'SelfIp', (tenant, name, selfIp) => {
            let vlan;

            // If the vlan does not start with '/', assume it is in this tenant
            if (selfIp.vlan.startsWith('/')) {
                vlan = selfIp.vlan;
            } else {
                vlan = `/${tenant}/${selfIp.vlan}`;
            }

            const selfIpBody = {
                name,
                vlan,
                partition: tenant,
                address: selfIp.address,
                floating: selfIp.floating ? 'enabled' : 'disabled',
                allowService: [selfIp.allowService]
            };

            promises.push(
                this.bigIp.createOrModify('/tm/net/self', selfIpBody)
            );
        });

        Promise.all(promises)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                logger.severe(`Error creating self IPs: ${err.message}`);
                reject(err);
            });
    });
}

function createRoutes() {
    return new Promise((resolve, reject) => {
        const promises = [];
        forEach(this.declaration, 'Route', (tenant, name, route) => {
            let network = route.network;
            if (network.indexOf('/') === -1) {
                network += DEFAULT_CIDR;
            }

            const routeBody = {
                name,
                network,
                partition: tenant,
                gw: route.gw
            };

            promises.push(
                this.bigIp.createOrModify('/tm/net/route', routeBody)
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
                        cb(tenantName, containerName, classObject[containerName]);
                    });
                } else {
                    cb(tenantName, className, classObject);
                }
            }
        });
    });
}

module.exports = NetworkHandler;
