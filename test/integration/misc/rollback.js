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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const {
    postDeclaration,
    getStatus
} = require('../property/propertiesCommon');

describe('Rollback', function User() {
    this.timeout(600000);
    const logInfo = {
        declarationIndex: 0
    };

    it('should rollback unsuccessful declarations', () => {
        const goodDecl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.24.0',
            Common: {
                class: 'Tenant',
                mySystem: {
                    class: 'System',
                    autoPhonehome: true
                },
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
                    address: '192.0.1.1/32',
                    vlan: 'myVlan',
                    allowService: 'default'
                }
            }
        };
        return postDeclaration(goodDecl, logInfo)
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => {
                logInfo.declarationIndex = 1;

                const badDecl = {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    async: true,
                    Common: {
                        class: 'Tenant',
                        myVlan: {
                            class: 'VLAN',
                            tag: 1234,
                            mtu: 5000,
                            interfaces: [
                                {
                                    name: 'this_is_not_a_valid_name',
                                    tagged: true
                                }
                            ]
                        },
                        myRoute: {
                            class: 'Route',
                            gw: '10.147.75.1',
                            network: '0.0.0.0',
                            mtu: 1500
                        },
                        mySystem: {
                            class: 'System',
                            autoPhonehome: false
                        }
                    }
                };
                return postDeclaration(badDecl, logInfo);
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 422);
                assert.strictEqual(response.result.status, 'ERROR');
                assert.strictEqual(response.result.message, 'invalid config - rolled back');
                return response;
            })
            .then((response) => getStatus(response.id))
            .then((response) => {
                // Make sure the current config has what is in the good declaration (that was rolled-back to)
                assert.strictEqual(response.currentConfig.Common.System.autoPhonehome, 'enabled');
                assert.deepStrictEqual(
                    response.currentConfig.Common.VLAN,
                    {
                        myVlan: {
                            name: 'myVlan',
                            autoLasthop: 'default',
                            cmpHash: 'default',
                            failsafe: 'disabled',
                            failsafeAction: 'failover-restart-tm',
                            failsafeTimeout: 90,
                            mtu: 1500,
                            tag: 4093,
                            interfaces: [
                                {
                                    name: '1.1',
                                    tagged: true
                                }
                            ]
                        }
                    }
                );
            })
            .then(() => {
                const cleanUpDecl = {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    async: true,
                    Common: {
                        class: 'Tenant'
                    }
                };
                return postDeclaration(cleanUpDecl, logInfo);
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            });
    });
});
