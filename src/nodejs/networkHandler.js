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
        this.declaration = declaration;
        this.bigIp = bigIp;
    }

    process() {
        return createVlans.call(this)
            .then(() => {

            })
            .catch((err) => {
                logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function createVlans() {
    return new Promise((resolve, reject) => {
        if (this.declaration.vlans) {
            const vlans = Object.keys(this.declaration.vlans);
            vlans.forEach((vlan) => {
                vlanBody = {
                    name: vlan.name,
                    interfaces: [
                        {
                            name: vlan.nic,
                            tagged: !!vlan.tag
                        }
                    ]
                };

                if (vlan.mtu) {
                    vlanBody.mtu = vlan.mtu;
                }

                if (vlan.tag) {
                    vlanBody.tag = vlan.tag;
                }

                promises.push(
                    {
                        promise: bigIp.create,
                        arguments: [
                            '/tm/net/vlan',
                            vlanBody
                        ],
                        // eslint-disable-next-line max-len
                        message: `Creating vlan ${vlan.name} on interface ${vlan.nic} ${(vlan.mtu ? ` mtu ${vlan.mtu}` : '')} ${(vlan.tag ? ` with tag ${vlan.tag}` : ' untagged')}`
                    }
                );
            });
        }

        resolve();
    });
}

module.exports = NetworkHandler;
