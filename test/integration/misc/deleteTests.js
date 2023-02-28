/**
 * Copyright 2023 F5 Networks, Inc.
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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const {
    postDeclaration,
    getMcpObject
} = require('../property/propertiesCommon');

describe('Delete items', function DeleteItems() {
    this.timeout(600000);

    it('should delete created items', () => {
        const decl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.24.0',
            Common: {
                class: 'Tenant',
                myVlan: {
                    class: 'VLAN',
                    tag: 4093,
                    mtu: 1500,
                    interfaces: [
                        {
                            name: '1.1',
                            tagged: true
                        }
                    ]
                },
                mySelfIp: {
                    class: 'SelfIp',
                    address: '192.0.2.10/32',
                    vlan: 'myVlan',
                    allowService: 'default'
                }
            }
        };

        const logInfo = {
            declarationIndex: 0
        };

        return Promise.resolve()
            .then(() => postDeclaration(decl, logInfo))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => {
                const getMcpOptions = {
                    tenantName: 'Common',
                    getMcpObject: {
                        itemName: 'mySelfIp'
                    }
                };
                return getMcpObject('SelfIp', getMcpOptions);
            })
            .then((selfIps) => {
                assert.strictEqual(selfIps.name, 'mySelfIp');
            })
            .then(() => {
                logInfo.declarationIndex = 1;
                delete decl.Common.mySelfIp;
                delete decl.Common.myVlan;
                return postDeclaration(decl, logInfo);
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => {
                const getMcpOptions = {
                    tenantName: 'Common',
                    getMcpObject: {
                        itemName: 'mySelfIp'
                    }
                };
                return getMcpObject('SelfIp', getMcpOptions);
            })
            .catch((err) => {
                assert.strictEqual(err.message, 'Unable to find /Common/mySelfIp on BIG-IP. Found: []');
            })
            .then(() => {
                const getMcpOptions = {
                    tenantName: 'Common',
                    getMcpObject: {
                        itemName: 'myVlan'
                    }
                };
                return getMcpObject('VLAN', getMcpOptions);
            })
            .catch((err) => {
                assert.strictEqual(err.message, 'Unable to find /Common/myVlan on BIG-IP. Found: []');
            });
    });
});
