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

let DeclarationParser;

/* eslint-disable quote-props, quotes, global-require */

describe('declarationParser', () => {
    before(() => {
        DeclarationParser = require('../../../src/lib/declarationParser');
    });

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
                "mySystem": {
                    "class": "System"
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
                "myHTTPD": {
                    "class": "HTTPD",
                    "allow": [
                        "10.10.0.0/24"
                    ]
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
                },
                "commonMac": {
                    "class": "MAC_Masquerade",
                    "source": {
                        "interface": "1.1"
                    }
                },
                "commonMac2": {
                    "class": "MAC_Masquerade",
                    "source": {
                        "interface": "1.2"
                    },
                    "trafficGroup": "traffic-group-local-only"
                },
                "commonDNS": {
                    "class": "DNS_Resolver",
                    "forwardZones": [
                        {
                            "name": "google.public.dns",
                            "nameservers": [
                                "8.8.8.8:53"
                            ]
                        }
                    ]
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
        assert.strictEqual(parsedDeclaration.Common.hostname, 'bigip.example.com');
        assert.strictEqual(
            parsedDeclaration.Common.License.regKey,
            'MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ'
        );
        assert.strictEqual(
            parsedDeclaration.Common.NTP.servers[0],
            '0.pool.ntp.org'
        );
        assert.strictEqual(
            parsedDeclaration.Common.HTTPD.allow[0],
            '10.10.0.0/24'
        );

        // network
        assert.strictEqual(parsedDeclaration.Common.VLAN.commonVlan.name, 'commonVlan');
        assert.strictEqual(parsedDeclaration.Common.VLAN.commonVlan.tag, 1111);
        assert.strictEqual(parsedDeclaration.Common.MAC_Masquerade.commonMac.name, 'commonMac');
        assert.strictEqual(parsedDeclaration.Common.MAC_Masquerade.commonMac.source.interface, '1.1');
        assert.strictEqual(parsedDeclaration.Common.MAC_Masquerade.commonMac2.name, 'commonMac2');
        assert.strictEqual(parsedDeclaration.Common.MAC_Masquerade.commonMac2.source.interface, '1.2');
        assert.strictEqual(parsedDeclaration.Common.MAC_Masquerade.commonMac2.trafficGroup, 'traffic-group-local-only');
        assert.strictEqual(parsedDeclaration.Common.DNS_Resolver.commonDNS.name, 'commonDNS');
        assert.strictEqual(parsedDeclaration.Common.DNS_Resolver.commonDNS.forwardZones[0].name, 'google.public.dns');
        assert.strictEqual(parsedDeclaration.Common.DNS_Resolver.commonDNS.forwardZones[0].nameservers[0], '8.8.8.8:53');
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app1Vlan.name, 'app1Vlan');
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app1Vlan.tag, 1234);
        assert.strictEqual(parsedDeclaration.Tenant1.VLAN.app2Vlan.tag, 3456);

        assert.strictEqual(
            parsedDeclaration.Tenant1.SelfIp.app1SelfIp.vlan,
            'app1Vlan'
        );
    });

    it('should not overwrite name property if provided', () => {
        const declaration = {
            "schemaVersion": "1.0.0",
            "class": "Device",
            "Common": {
                "class": "Tenant",
                "commonVlan": {
                    "class": "VLAN",
                    "name": "my provided name"
                }
            }
        };

        const declarationParser = new DeclarationParser(declaration);
        const parsed = declarationParser.parse();
        const parsedDeclaration = parsed.parsedDeclaration;

        assert.strictEqual(parsedDeclaration.Common.VLAN.commonVlan.name, 'my provided name');
    });

    it('should dereference pointers', () => {
        const declaration = {
            "Credentials": [
                {
                    "username": "myUser",
                    "password": "myPassword"
                },
                {
                    "username": "myOtherUser",
                    "password": "myOtherPassword"
                }
            ],
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
                },
                "myLicense": {
                    "class": "License",
                    "bigIpUsername": "/Credentials/0/username",
                    "bigIqUsername": "/Credentials/1/username",
                    "notAPointer": "/foo/bar"
                },
                "myFailoverUnicast": {
                    "class": "FailoverUnicast",
                    "addressPorts": [
                        {
                            "address": "/Common/mySelfIp/address"
                        }
                    ]
                }
            }
        };
        const declarationParser = new DeclarationParser(declaration);
        const parsedDeclaration = declarationParser.parse().parsedDeclaration;
        assert.strictEqual(parsedDeclaration.Common.SelfIp.mySelfIp.vlan, '/Common/myVlan');
        assert.strictEqual(parsedDeclaration.Common.ConfigSync.configsyncIp, '1.2.3.4');
        assert.strictEqual(parsedDeclaration.Common.License.bigIpUsername, 'myUser');
        assert.strictEqual(parsedDeclaration.Common.License.bigIqUsername, 'myOtherUser');
        assert.strictEqual(parsedDeclaration.Common.FailoverUnicast.addressPorts[0].address, '1.2.3.4');

        // If we get a pointer that does not de-reference, we should just get back the
        // original pointer
        assert.strictEqual(parsedDeclaration.Common.License.notAPointer, '/foo/bar');
    });

    it('should not change an array to an object when parsing and dereferencing', () => {
        const declaration = {
            "Common": {
                "class": "Tenant",
                "myNtp": {
                    "class": "NTP",
                    "servers": [
                        "0.pool.ntp.org",
                        "1.pool.ntp.org"
                    ],
                    "timezone": "UTC"
                }
            }
        };
        const declarationParser = new DeclarationParser(declaration);
        const parsedDeclaration = declarationParser.parse().parsedDeclaration;

        assert.deepStrictEqual(
            parsedDeclaration.Common.NTP,
            {
                servers: [
                    '0.pool.ntp.org',
                    '1.pool.ntp.org'
                ],
                timezone: 'UTC'
            }
        );
    });

    it('should return default modules and user modules', () => {
        const declaration = {
            class: 'Device',
            Common: {
                class: 'Tenant',
                provisioning: {
                    class: 'Provision',
                    ltm: 'nominal'
                }
            }
        };

        const declarationParser = new DeclarationParser(declaration, ['afm', 'swg']);
        const parsedDeclaration = declarationParser.parse().parsedDeclaration;
        return assert.deepStrictEqual(parsedDeclaration.Common.Provision,
            {
                afm: 'none',
                ltm: 'nominal',
                swg: 'none'
            });
    });
});
