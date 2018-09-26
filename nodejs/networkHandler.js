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
        this.declaration = declarationInfo.parsedDeclaration.Network || {};
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
    logger.fine('Creating VLANs');
    return new Promise((resolve, reject) => {
        if (!this.declaration.VLAN) {
            resolve();
        } else {
            const promises = [];
            const vlanNames = Object.keys(this.declaration.VLAN);
            logger.finest(`got ${vlanNames.length} vlan(s)`);
            vlanNames.forEach((vlanName) => {
                const vlan = this.declaration.VLAN[vlanName];
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
                    partition: vlan.tenant
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
                    logger.fine('Done creating VLANs');
                    resolve();
                })
                .catch((err) => {
                    logger.severe(`Error creating vlans: ${err.message}`);
                    reject(err);
                });
        }
    });
}

function createSelfIps() {
    logger.fine('Creating self IPs');
    return new Promise((resolve, reject) => {
        if (!this.declaration.SelfIp) {
            resolve();
        } else {
            const promises = [];
            const selfIpNames = Object.keys(this.declaration.SelfIp);
            logger.finest(`got ${selfIpNames.length} vlan(s)`);
            selfIpNames.forEach((selfIpName) => {
                const selfIp = this.declaration.SelfIp[selfIpName];

                const selfIpBody = {
                    name: selfIpName,
                    partition: selfIp.tenant,
                    address: selfIp.address,
                    floating: selfIp.floating ? 'enabled' : 'disabled',
                    vlan: selfIp.vlan.startsWith('/') ? selfIp.vlan : `/Common/${selfIp.vlan}`,
                    allowService: [selfIp.allowService]
                };

                promises.push(
                    this.bigIp.createOrModify('/tm/net/self', selfIpBody)
                );
            });

            Promise.all(promises)
                .then(() => {
                    logger.fine('Done creating self IPs');
                    resolve();
                })
                .catch((err) => {
                    logger.severe(`Error creating self IPs: ${err.message}`);
                    reject(err);
                });
        }
    });
}

module.exports = NetworkHandler;
