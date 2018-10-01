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

class NetworkHandler {
    constructor(declarationInfo, bigIp) {
        if (declarationInfo.parsedDeclaration.Network) {
            this.declaration = declarationInfo.parsedDeclaration.Network || {};
        } else {
            this.declaration = {};
        }
        this.tenants = declarationInfo.tenants;
        this.bigIp = bigIp;
    }

    process() {
        logger.fine('Proessing network declaration');
        return createVlans.call(this)
            .then(() => {
                return createSelfIps.call(this);
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

        logger.fine('Checking VLANs');
        this.tenants.forEach((tenantName) => {
            const tenant = this.declaration[tenantName] || {};
            if (tenant.VLAN) {
                const vlanNames = Object.keys(tenant.VLAN);

                vlanNames.forEach((vlanName) => {
                    const vlan = tenant.VLAN[vlanName];
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
                        name: vlanName,
                        partition: tenantName
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

function createSelfIps() {
    return new Promise((resolve, reject) => {
        const promises = [];

        logger.finest('Checking self IPs');
        this.tenants.forEach((tenantName) => {
            const tenant = this.declaration[tenantName] || {};
            if (tenant.SelfIp) {
                const selfIpNames = Object.keys(tenant.SelfIp);

                selfIpNames.forEach((selfIpName) => {
                    const selfIp = tenant.SelfIp[selfIpName];
                    let vlan;

                    // If the vlan does not start with '/', assume it is in this network
                    if (selfIp.vlan.startsWith('/')) {
                        vlan = selfIp.vlan;
                    } else {
                        const networkName = getNetworkName(selfIpName);
                        vlan = `/${tenantName}/${networkName}_${selfIp.vlan}`;
                    }

                    const selfIpBody = {
                        vlan,
                        name: selfIpName,
                        partition: tenantName,
                        address: selfIp.address,
                        floating: selfIp.floating ? 'enabled' : 'disabled',
                        allowService: [selfIp.allowService]
                    };

                    promises.push(
                        this.bigIp.createOrModify('/tm/net/self', selfIpBody)
                    );
                });
            }
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

function getNetworkName(selfIpName) {
    const index = selfIpName.indexOf('_');
    return selfIpName.substring(0, index);
}

module.exports = NetworkHandler;
