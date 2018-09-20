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

const logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved

class NetworkHandler {
    constructor(declaration, bigIp) {
        this.declaration = declaration || {};
        this.bigIp = bigIp;
    }

    process() {
        logger.info('Proessing network declaration');
        return createVlans.call(this)
            .catch((err) => {
                logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function createVlans() {
    logger.fine('creating vlans');
    return new Promise((resolve, reject) => {
        if (!this.declaration.vlans) {
            resolve();
        } else {
            const promises = [];
            const vlanNames = Object.keys(this.declaration.vlans);
            logger.finest(`got ${vlanNames.length} vlan(s)`);
            vlanNames.forEach((vlanName) => {
                const vlan = this.declaration.vlans[vlanName];
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
                    name: vlanName
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
        }
    });
}

module.exports = NetworkHandler;
