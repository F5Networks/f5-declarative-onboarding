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

const assert = require('assert');
const DeclarationParser = require('../../nodejs/declarationParser');

/* eslint-disable quote-props, quotes */

describe('declarationParser tests', () => {
    it('should transform declaration', () => {
        const declaration = {
            "schemaVersion": "1.0.0",
            "class": "Device",
            "Common": {
                "class": "Tenant",
                "hostname": "bigip.example.com",
                "myLicense": {
                    "class": "License",
                    "licenseType": "regKey",
                    "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
                },
                "myDns": {
                    "class": "DNS",
                    "nameServers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                    ],
                    "search": [
                        "f5.com"
                    ]
                },
                "myNtp": {
                    "class": "NTP",
                    "servers": [
                        "0.pool.ntp.org",
                        "1.pool.ntp.org"
                    ],
                    "timezone": "UTC"
                },
                "root": {
                    "class": "User",
                    "userType": "root",
                    "oldPassword": "foo",
                    "newPassword": "bar"
                },
                "admin": {
                    "class": "User",
                    "userType": "regular",
                    "password": "asdfjkl",
                    "shell": "bash"
                },
                "anotherUser": {
                    "class": "User",
                    "userType": "regular",
                    "password": "foobar",
                    "partitionAccess": {
                        "Common": {
                            "role": "guest"
                        }
                    }
                },
                "commonVlan": {
                    "class": "VLAN",
                    "tag": 1111,
                    "mtu": 2222,
                    "1.3": {
                        "class": "Interface",
                        "tagged": true
                    }
                }
            },
            "Tenant1": {
                "class": "Tenant",
                "app1Vlan": {
                    "class": "VLAN",
                    "tag": 1234,
                    "mtu": 1500,
                    "1.1": {
                        "class": "Interface",
                        "tagged": true
                    }
                },
                "app2Vlan": {
                    "class": "VLAN",
                    "tag": 3456,
                    "1.1": {
                        "class": "Interface",
                        "tagged": true
                    }
                },
                "app1SelfIp": {
                    "class": "SelfIp",
                    "vlan": "app1Vlan"
                }
            }
        };

        const declarationParser = new DeclarationParser(declaration);
        const parsed = declarationParser.parse();
        const parsedDeclaration = parsed.parsedDeclaration;
        const tenants = parsed.tenants;

        // tenants
        assert.strictEqual(tenants.length, 2);
        assert.notStrictEqual(tenants.indexOf('Common'), -1);
        assert.notStrictEqual(tenants.indexOf('Tenant1'), -1);

        // system
        assert.strictEqual(parsedDeclaration.Common.hostname, declaration.Common.hostname);
        assert.strictEqual(
            parsedDeclaration.Common.License.regKey,
            declaration.Common.myLicense.regKey
        );
        assert.strictEqual(
            parsedDeclaration.Common.NTP.servers[0],
            declaration.Common.myNtp.servers[0]
        );

        // network
        assert.strictEqual(parsedDeclaration.Common.VLAN.commonVlan.name, 'commonVlan');
        assert.strictEqual(parsedDeclaration.Common.VLAN.commonVlan.tag, declaration.Common.commonVlan.tag);
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app1Vlan.name, 'app1Vlan');
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app1Vlan.tag, declaration.Tenant1.app1Vlan.tag);
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app2Vlan.tag, declaration.Tenant1.app2Vlan.tag);

        assert.strictEqual(
            parsedDeclaration.Tenant1.SelfIp.app1SelfIp.vlan,
            declaration.Tenant1.app1SelfIp.vlan
        );
    });

    it('should dereference pointers', () => {
        const declaration = {
            "Common": {
                "class": "Tenant",
                "myVlan": {
                    "class": "VLAN",
                    "tag": 1111,
                    "mtu": 2222
                },
                "mySelfIp": {
                    "class": "SelfIp",
                    "address": "1.2.3.4",
                    "vlan": "/Common/myVlan"
                },
                "myConfigSync": {
                    "class": "ConfigSync",
                    "configsyncIp": "/Common/mySelfIp/address"
                }
            }
        };
        const declarationParser = new DeclarationParser(declaration);
        const parsedDeclaration = declarationParser.parse().parsedDeclaration;
        assert.strictEqual(parsedDeclaration.Common.SelfIp.mySelfIp.vlan, '/Common/myVlan');
        assert.strictEqual(
            parsedDeclaration.Common.ConfigSync.configsyncIp,
            declaration.Common.mySelfIp.address
        );
    });
});
