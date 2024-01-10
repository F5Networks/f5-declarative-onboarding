/**
 * Copyright 2024 F5, Inc.
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

// We need a misc test because we need to test route domains with vlans, which are
// separate classes. As well as the default Route Domain vlan issues (see AUTOTOOL-3498)
describe('Route Domain', function RouteDomain() {
    this.timeout(600000);

    it('should create route domains', () => {
        const decl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.0.0',
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
                Default: {
                    class: 'RouteDomain',
                    id: 0,
                    strict: true,
                    vlans: [
                        'http-tunnel',
                        'socks-tunnel'
                    ]
                },
                myRouteDomain: {
                    class: 'RouteDomain',
                    id: 1,
                    strict: true,
                    vlans: ['/Common/myVlan']
                }
            }
        };

        const logInfo = {
            declarationIndex: 0
        };

        const getRd1McpOptions = {
            tenantName: 'Common',
            getMcpObject: {
                itemName: 'myRouteDomain'
            }
        };
        const getRd0McpOptions = {
            tenantName: 'Common',
            getMcpObject: {
                itemName: '0'
            }
        };
        return Promise.resolve()
            .then(() => postDeclaration(decl, { logInfo }))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => getMcpObject('RouteDomain', getRd1McpOptions))
            .then((routeDomain) => {
                assert.strictEqual(routeDomain.vlans.length, 1);
                assert.deepStrictEqual(routeDomain.vlans, ['/Common/myVlan']);
            })
            .then(() => getMcpObject('RouteDomain', getRd0McpOptions))
            .then((routeDomain) => {
                assert.strictEqual(routeDomain.vlans.length, 2);
                assert.deepStrictEqual(routeDomain.vlans, ['/Common/http-tunnel', '/Common/socks-tunnel']);
            })
            .then(() => {
                logInfo.declarationIndex = 1;
                delete decl.Common.myRouteDomain;
                delete decl.Common.myVlan;
                return postDeclaration(decl, { logInfo });
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            });
    });
});
