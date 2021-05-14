/**
 * Copyright 2021 F5 Networks, Inc.
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

const URL = require('url');

const ConfigManager = require('../../../src/lib/configManager');
const ConfigItems = require('../../../src/lib/configItems.json');

describe('configManager', () => {
    const hostname = 'myhost.bigip.com';
    const deviceName = 'device1';
    const version = '15.1';

    let listResponses;
    let bigIpMock;
    let state;
    let doState;
    let optionsReceived;

    const getConfigItems = function (schemaClass) {
        if (typeof schemaClass === 'undefined' || schemaClass === '') {
            return undefined;
        }

        // Return a copy of the configItem
        return JSON.parse(JSON.stringify(
            [ConfigItems.find(configItem => configItem.schemaClass === schemaClass)]
        ));
    };

    beforeEach(() => {
        optionsReceived = {};
        listResponses = {
            '/tm/cm/device': [
                {
                    hostname,
                    name: deviceName
                }
            ],
            '/tm/sys/provision': []
        };
        state = {};
        doState = {
            getOriginalConfigByConfigId() {},
            setOriginalConfigByConfigId() {}
        };
        bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname, version });
            },
            list(path, iControlOptions, retryOptions, options) {
                // The path name here does not have a domain, but does include
                // a query. listResponses are set up with just the pathname part.
                const pathname = URL.parse(path, 'https://foo').pathname;
                optionsReceived[path] = {};
                Object.assign(optionsReceived[path], options);
                return Promise.resolve(listResponses[pathname] || {});
            }
        };
    });

    it('should handle pulling multiple partitions', () => {
        const configItem = getConfigItems('Route');
        const declaration = {
        };

        listResponses['/tm/net/route'] = [
            {
                name: 'default',
                partition: 'Common',
                gw: '1.2.3.4',
                network: 'default',
                mtu: 0
            },
            {
                name: 'route1',
                partition: 'LOCAL_ONLY',
                tmInterface: '/Common/myVlan',
                network: '5.5.5.5',
                mtu: 1500
            },
            {
                name: 'outsideDoRoute',
                partition: 'otherPartition',
                gw: '3.3.3.5',
                network: 'default',
                mtu: 12
            }
        ];

        const configManager = new ConfigManager(configItem, bigIpMock);
        return configManager.get(declaration, state, doState)
            .then(() => {
                assert.deepStrictEqual(
                    state.currentConfig.Common.Route,
                    {
                        default: {
                            gw: '1.2.3.4',
                            mtu: 0,
                            name: 'default',
                            network: 'default'
                        },
                        route1: {
                            target: 'myVlan',
                            mtu: 1500,
                            name: 'route1',
                            network: '5.5.5.5',
                            localOnly: true
                        }
                    }
                );
            });
    });

    it('should handle simple string values', () => {
        const configItems = [
            {
                path: '/tm/sys/global-settings',
                properties: [
                    { id: 'hostname' }
                ]
            }
        ];

        listResponses['/tm/sys/global-settings'] = { hostname };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(
                    state.currentConfig.Common.hostname,
                    'myhost.bigip.com'
                );
            });
    });

    it('should handle objects', () => {
        const configItems = [
            {
                path: '/tm/sys/ntp',
                schemaClass: 'NTP',
                properties: [
                    { id: 'servers' },
                    { id: 'timezone' }
                ]
            }
        ];

        listResponses['/tm/sys/ntp'] = {
            servers: ['server1', 'server2'],
            timezone: 'utc'
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.NTP,
                    {
                        servers: ['server1', 'server2'],
                        timezone: 'utc'
                    });
            });
    });

    it('should strip /Common/ from names', () => {
        const configItems = [
            {
                path: '/tm/sys/namedProperty',
                schemaClass: 'RemoveCommon',
                properties: [
                    { id: 'name' }
                ]
            }
        ];

        listResponses['/tm/sys/namedProperty'] = {
            name: '/Common/someName'
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.RemoveCommon.name, 'someName');
            });
    });

    it('should handle arrays', () => {
        const configItems = [
            {
                path: '/tm/net/route',
                schemaClass: 'Route',
                properties: [
                    { id: 'gw' },
                    { id: 'network' },
                    { id: 'mtu' }
                ]
            }
        ];

        listResponses['/tm/net/route'] = [
            {
                name: 'default',
                gw: '1.2.3.4',
                network: 'default',
                mtu: 0
            },
            {
                name: 'route1',
                gw: '5.6.7.8',
                network: '5.5.5.5',
                mtu: 1500
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(
                    state.currentConfig.Common.Route.default,
                    {
                        name: 'default',
                        gw: '1.2.3.4',
                        network: 'default',
                        mtu: 0
                    }
                );
                assert.deepEqual(
                    state.currentConfig.Common.Route.route1,
                    {
                        name: 'route1',
                        gw: '5.6.7.8',
                        network: '5.5.5.5',
                        mtu: 1500
                    }
                );
            });
    });

    it('should handle arrays when none are already defined on BIG-IP < 14.x', () => {
        const configItems = [
            {
                path: '/tm/net/route',
                schemaClass: 'Route',
                properties: [
                    { id: 'gw' },
                    { id: 'network' },
                    { id: 'mtu' }
                ]
            }
        ];

        listResponses['/tm/net/route'] = {};

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.Route, {});
            });
    });

    it('should handle arrays when none are already defined on BIG-IP > 14.x', () => {
        const configItems = [
            {
                path: '/tm/net/route',
                schemaClass: 'Route',
                properties: [
                    { id: 'gw' },
                    { id: 'network' },
                    { id: 'mtu' }
                ]
            }
        ];

        listResponses['/tm/net/route'] = [];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.Route, {});
            });
    });

    it('should handle config items where we to map property name to value', () => {
        const configItems = [
            {
                path: '/tm/sys/provision',
                schemaClass: 'Provision',
                properties: [
                    { id: 'level' }
                ],
                singleValue: true
            }
        ];

        listResponses['/tm/sys/provision'] = [
            {
                name: 'afm',
                level: 'none'
            },
            {
                name: 'ltm',
                level: 'nominal'
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(
                    state.currentConfig.Common.Provision,
                    { afm: 'none', ltm: 'nominal' }
                );
            });
    });

    it('should handle references', () => {
        const configItems = [
            {
                path: '/tm/net/vlan',
                schemaClass: 'VLAN',
                properties: [
                    { id: 'mtu' },
                    { id: 'tag' },
                    { id: 'interfacesReference' }
                ],
                references: {
                    interfacesReference: [
                        { id: 'tagged', truth: true, falsehood: false }
                    ]
                }
            }
        ];

        listResponses['/tm/net/vlan'] = [
            {
                name: 'external',
                tag: 1234,
                mtu: 1500,
                interfacesReference: {
                    link: 'https://localhost/mgmt/tm/net/vlan/~Common~external/interfaces?ver=13.1.1'
                }
            }
        ];
        listResponses['/tm/net/vlan/~Common~external/interfaces'] = [
            {
                name: '1.1'
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(state.currentConfig.Common.VLAN.external.interfaces[0].name, '1.1');
            });
    });

    it('should handle references with schemaMerge, newId, and non-array responses', () => {
        const configItems = [
            {
                path: '/tm/auth/ldap',
                schemaClass: 'Authentication',
                schemaMerge: {
                    path: ['ldap'],
                    skipWhenOmitted: true
                },
                properties: [
                    { id: 'sslCaCertFile', newId: 'sslCaCert' },
                    { id: 'sslClientCert' },
                    { id: 'sslClientKey' }
                ],
                references: {
                    sslCaCertFileReference: [
                        { id: 'checksum' },
                        { id: 'partition' }
                    ],
                    sslClientCertReference: [
                        { id: 'checksum' },
                        { id: 'partition' }
                    ],
                    sslClientKeyReference: [
                        { id: 'checksum' },
                        { id: 'partition' }
                    ]
                }
            }
        ];

        listResponses['/tm/auth/ldap'] = [
            {
                name: 'system-auth',
                sslCaCertFileReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.crt?=13.1.1'
                },
                sslClientCertReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.crt?=13.1.1'
                },
                sslClientKeyReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-key/~Common~do_ldapClientCert.key?=13.1.1'
                }
            }
        ];
        listResponses['/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.crt'] = {
            name: 'do_ldapClientCert.crt',
            checksum: 'SHA1:1431:ad6c15a66e4386a2fd82bc1e156f3b1650eb9762',
            partition: 'Common'
        };
        listResponses['/tm/sys/file/ssl-key/~Common~do_ldapClientCert.key'] = {
            name: 'do_ldapClientCert.key',
            checksum: 'SHA1:1703:a432012676a43bd8fc85496c9ed442f08e02d6a0',
            partition: 'Common'
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepStrictEqual(
                    state.currentConfig.Common.Authentication,
                    {
                        ldap: {
                            name: 'system-auth',
                            sslCaCert: {
                                name: 'do_ldapClientCert.crt',
                                checksum: 'SHA1:1431:ad6c15a66e4386a2fd82bc1e156f3b1650eb9762',
                                partition: 'Common'
                            },
                            sslClientCert: {
                                name: 'do_ldapClientCert.crt',
                                checksum: 'SHA1:1431:ad6c15a66e4386a2fd82bc1e156f3b1650eb9762',
                                partition: 'Common'
                            },
                            sslClientKey: {
                                name: 'do_ldapClientCert.key',
                                checksum: 'SHA1:1703:a432012676a43bd8fc85496c9ed442f08e02d6a0',
                                partition: 'Common'
                            }
                        }
                    }
                );
            });
    });

    it('should handle newId property mapping', () => {
        const configItems = [
            {
                path: '/tm/sys/management-route',
                schemaClass: 'ManagementRoute',
                properties: [
                    { id: 'gateway', newId: 'gw' },
                    { id: 'myProp1', newId: 'myObject.prop1' },
                    { id: 'myProp2', newId: 'myObject.prop2.prop' },
                    { id: 'network' },
                    { id: 'mtu' },
                    { id: 'type' }
                ]
            }
        ];

        listResponses['/tm/sys/management-route'] = [
            {
                name: 'default',
                gateway: '8.8.8.8',
                network: 'default',
                mtu: 0,
                myProp1: 'my property 1',
                myProp2: 'my property 2'
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.gw,
                    '8.8.8.8'
                );
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.gateway,
                    undefined
                );
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.myObject.prop1,
                    'my property 1'
                );
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.myObject.prop2.prop,
                    'my property 2'
                );
            });
    });

    it('should handle references containing stringToInt and newId property mappings', () => {
        const configItems = [
            {
                path: '/tm/net/routing/prefix-list',
                schemaClass: 'RoutingPrefixList',
                properties: [
                    { id: 'name' },
                    { id: 'entriesReference' }
                ],
                references: {
                    entriesReference: [
                        { id: 'name', stringToInt: true },
                        { id: 'prefixLenRange', newId: 'prefixLengthRange', stringToInt: true },
                        { id: 'myProp1', newId: 'myObject.prop1' },
                        { id: 'myProp2', newId: 'myObject.prop2.prop' }
                    ]
                }
            }
        ];

        listResponses['/tm/net/routing/prefix-list'] = [
            {
                name: 'examplePrefixList',
                entriesReference: {
                    link: 'https://localhost/mgmt/tm/net/routing/prefix-list/~Common~examplePrefixList/entries?ver=14.1.2.7'
                }
            }
        ];
        listResponses['/tm/net/routing/prefix-list/~Common~examplePrefixList/entries'] = [
            {
                name: '20',
                prefixLenRange: '16',
                myProp1: 'my property 1',
                myProp2: 'my property 2'
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepStrictEqual(
                    state.currentConfig.Common.RoutingPrefixList,
                    {
                        examplePrefixList: {
                            name: 'examplePrefixList',
                            entries: [
                                {
                                    name: 20,
                                    prefixLengthRange: 16,
                                    myObject: {
                                        prop1: 'my property 1',
                                        prop2: {
                                            prop: 'my property 2'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                );
            });
    });

    it('should pass on required fields property', () => {
        const configItems = [
            {
                path: '/tm/sys/disk/directory',
                schemaClass: 'Disk',
                properties: [
                    {
                        id: 'apiRawValues',
                        transform: [
                            {
                                id: 'applicationData',
                                capture: 'appdata\\s+([0-9]+)',
                                captureProperty: 'apiAnonymous'
                            }
                        ],
                        required: true
                    }
                ],
                nameless: true
            },
            {
                path: '/tm/net/tunnels/tunnel',
                schemaClass: 'Tunnel',
                properties: [
                    { id: 'autoLasthop', newId: 'autoLastHop' },
                    { id: 'mtu' },
                    { id: 'profile', newId: 'tunnelType' },
                    { id: 'tos', newId: 'typeOfService' },
                    { id: 'usePmtu', truth: 'enabled', falsehood: 'disabled' }
                ]
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                const diskPath = '/tm/sys/disk/directory?%24filter=partition%20eq%20Common&%24select=apiRawValues%2Cname';
                assert.deepStrictEqual(
                    optionsReceived[diskPath],
                    {
                        requiredFields: ['apiRawValues']
                    }
                );
                assert.deepStrictEqual(
                    optionsReceived['/tm/net/tunnels/tunnel?%24filter=partition%20eq%20Common&%24select=autoLasthop%2Cmtu%2Cprofile%2Ctos%2CusePmtu%2Cname'],
                    {}
                );
            });
    });

    describe('FailoverUnicast oddities', () => {
        // iControl omits the property altogether in some cases
        // Adding this defaultWhenOmitted attr makes the manager recognize that a default value is actually there
        // and that the prop needs to be set back to this value if it's not specified
        const configItems = getConfigItems('FailoverUnicast');

        it('should include a default value when missing and defaultWhenOmitted is defined', () => {
            listResponses[`/tm/cm/device/~Common~${deviceName}`] = { name: deviceName };
            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.FailoverUnicast.addressPorts,
                        'none'
                    );
                });
        });

        it('should map to the correct value when using addressPorts', () => {
            listResponses[`/tm/cm/device/~Common~${deviceName}`] = {
                name: deviceName,
                unicastAddress: [
                    {
                        effectiveIp: '1.1.1.106',
                        effectivePort: 1026,
                        ip: '1.1.1.106',
                        port: 1026
                    },
                    {
                        effectiveIp: '1.1.1.2',
                        effectivePort: 777,
                        ip: '1.1.1.2',
                        port: 777
                    }
                ]
            };
            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.FailoverUnicast,
                        {
                            addressPorts: [
                                {
                                    address: '1.1.1.106',
                                    port: 1026
                                },
                                {
                                    address: '1.1.1.2',
                                    port: 777
                                }
                            ]
                        }
                    );
                });
        });
    });

    describe('SelfIp oddities', () => {
        it('should strip /Common from vlan', () => {
            const configItems = [
                {
                    path: '/tm/net/self',
                    schemaClass: 'SelfIp',
                    properties: [
                        { id: 'vlan' }
                    ]
                }
            ];

            listResponses['/tm/net/self'] = [
                {
                    name: 'selfIp1',
                    vlan: '/Common/external'
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.vlan, 'external');
                });
        });

        it('should handle allowService with ["default"]', () => {
            const configItems = [
                {
                    path: '/tm/net/self',
                    schemaClass: 'SelfIp',
                    properties: [
                        { id: 'allowService' }
                    ]
                }
            ];

            listResponses['/tm/net/self'] = [
                {
                    name: 'selfIp1',
                    allowService: ['default']
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'default');
                });
        });

        it('should handle allowService none', () => {
            const configItems = [
                {
                    path: '/tm/net/self',
                    schemaClass: 'SelfIp',
                    properties: [
                        { id: 'allowService' }
                    ]
                }
            ];

            listResponses['/tm/net/self'] = [
                {
                    name: 'selfIp1'
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'none');
                });
        });
    });

    describe('System oddities', () => {
        it('should merge cli settings into System class', () => {
            const configItems = [
                {
                    path: '/tm/sys/global-settings',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'consoleInactivityTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/cli/global-settings',
                    schemaClass: 'System',
                    schemaMerge: {
                        action: 'add'
                    },
                    properties: [
                        { id: 'idleTimeout', newId: 'cliInactivityTimeout' }
                    ]
                }
            ];

            listResponses['/tm/sys/global-settings'] = { hostname: 'host.org', consoleInactivityTimeout: 60 };
            listResponses['/tm/cli/global-settings'] = { idleTimeout: 30 };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.System,
                        {
                            hostname: 'host.org',
                            consoleInactivityTimeout: 60,
                            cliInactivityTimeout: 1800 // minutes converted to seconds
                        }
                    );
                });
        });

        it('should map cliInactivityTimeout to 0 if disabled', () => {
            const configItems = [
                {
                    path: '/tm/sys/global-settings',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'consoleInactivityTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/cli/global-settings',
                    schemaClass: 'System',
                    schemaMerge: {
                        action: 'add'
                    },
                    properties: [
                        { id: 'idleTimeout', newId: 'cliInactivityTimeout' }
                    ]
                }
            ];

            listResponses['/tm/sys/global-settings'] = { hostname: 'host.org', consoleInactivityTimeout: 60 };
            listResponses['/tm/cli/global-settings'] = { idleTimeout: 'disabled' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.System,
                        {
                            hostname: 'host.org',
                            consoleInactivityTimeout: 60,
                            cliInactivityTimeout: 0
                        }
                    );
                });
        });

        it('default action should replace', () => {
            // empty path with replace is not currently used and I do not foresee a use case for it
            // implementing for completeness just in case
            const configItems = [
                {
                    path: '/tm/sys/global-settings',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'consoleInactivityTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/cli/global-settings',
                    schemaClass: 'System',
                    schemaMerge: {
                    },
                    properties: [
                        { id: 'idleTimeout', newId: 'cliInactivityTimeout' }
                    ]
                }
            ];

            listResponses['/tm/sys/global-settings'] = { hostname: 'host.org', consoleInactivityTimeout: 60 };
            listResponses['/tm/cli/global-settings'] = { idleTimeout: 30 };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.System,
                        {
                            cliInactivityTimeout: 1800 // minutes converted to seconds
                        }
                    );
                });
        });

        it('should merge multiple subclasses into a parent class', () => {
            const configItems = [
                {
                    path: '/tm/sys/source',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'consoleInactivityTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/sys/syssub1',
                    schemaClass: 'System',
                    schemaMerge: {
                        action: 'add'
                    },
                    properties: [
                        { id: 'subProp1' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/sys/syssub2',
                    schemaClass: 'System',
                    schemaMerge: {
                        action: 'add'
                    },
                    properties: [
                        { id: 'subProp2' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/sys/syssub3',
                    schemaClass: 'System',
                    schemaMerge: {
                        path: ['sysSub3']
                    },
                    properties: [
                        { id: 'subProp3' }
                    ],
                    nameless: true
                }
            ];
            listResponses['/tm/sys/source'] = { hostname: 'host.org', consoleInactivityTimeout: 45 };
            listResponses['/tm/sys/syssub1'] = { subProp1: 'subPropVal1' };
            listResponses['/tm/sys/syssub2'] = { subProp2: true };
            listResponses['/tm/sys/syssub3'] = { subProp3: true };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.System,
                        {
                            hostname: 'host.org',
                            consoleInactivityTimeout: 45,
                            subProp1: 'subPropVal1',
                            subProp2: true,
                            sysSub3: {
                                subProp3: true
                            }
                        }
                    );
                });
        });

        it('should error if merging same property names', () => {
            const configItems = [
                {
                    path: '/tm/sys/source',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'idleTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/sys/elsewhere',
                    schemaClass: 'System',
                    schemaMerge: {
                        action: 'add'
                    },
                    properties: [
                        { id: 'idleTimeout' }
                    ],
                    nameless: true
                }
            ];
            listResponses['/tm/sys/source'] = { hostname: 'host.org', idleTimeout: 45 };
            listResponses['/tm/sys/elsewhere'] = { idleTimeout: 30 };

            const configManager = new ConfigManager(configItems, bigIpMock);
            assert.isRejected(configManager.get({}, state, doState), "Cannot overwrite property in a schema merge 'idleTimeout'");
        });

        it('should omit a subclass prop when skipWhenOmitted is set to true', () => {
            const configItems = [
                {
                    path: '/tm/sys/source',
                    schemaClass: 'System',
                    properties: [
                        { id: 'hostname' },
                        { id: 'consoleInactivityTimeout' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/sys/syssub',
                    schemaClass: 'System',
                    schemaMerge: {
                        path: ['sysSub'],
                        skipWhenOmitted: true
                    },
                    properties: [
                        { id: 'requiredField' }
                    ],
                    nameless: true
                }
            ];

            listResponses['/tm/sys/source'] = { hostname: 'host.org', consoleInactivityTimeout: 45 };
            listResponses['/tm/sys/syssub'] = { name: 'namelessClass without the required field' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.System,
                        {
                            hostname: 'host.org',
                            consoleInactivityTimeout: 45
                        }
                    );
                });
        });
    });

    describe('Authentication oddities', () => {
        it('should handle LDAP sslCiphers', () => {
            const configItems = [
                {
                    path: '/tm/auth/source',
                    schemaClass: 'Authentication',
                    properties: [
                        { id: 'type' },
                        { id: 'fallback' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/auth/ldap',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['ldap']
                    },
                    properties: [
                        { id: 'sslCiphers' }
                    ]
                }
            ];

            listResponses['/tm/auth/source'] = { type: 'ldap', fallback: true };
            listResponses['/tm/auth/ldap'] = { sslCiphers: '123:456:7890' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            enabledSourceType: 'ldap',
                            fallback: true,
                            ldap: {
                                sslCiphers: [
                                    '123',
                                    '456',
                                    '7890'
                                ]
                            }
                        }
                    );
                });
        });

        it('should merge an auth subclass into a parent auth class', () => {
            const configItems = [
                {
                    path: '/tm/auth/source',
                    schemaClass: 'Authentication',
                    properties: [
                        { id: 'type' },
                        { id: 'fallback' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/auth/authsub',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['authSub']
                    },
                    properties: [
                        { id: 'subProp1' }
                    ]
                }
            ];

            listResponses['/tm/auth/source'] = { type: 'authsub', fallback: true };
            listResponses['/tm/auth/authsub'] = { subProp1: 'subPropVal1' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            enabledSourceType: 'authsub',
                            fallback: true,
                            authSub: {
                                subProp1: 'subPropVal1'
                            }
                        }
                    );
                });
        });

        it('should merge multiple auth subclasses into a parent auth class', () => {
            const configItems = [
                {
                    path: '/tm/auth/source',
                    schemaClass: 'Authentication',
                    properties: [
                        { id: 'type' },
                        { id: 'fallback' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/auth/authsub1',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['authSub1']
                    },
                    properties: [
                        { id: 'subProp1' }
                    ]
                },
                {
                    path: '/tm/auth/authsub2',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['authSub2']
                    },
                    properties: [
                        { id: 'subProp2' }
                    ],
                    nameless: true
                }
            ];
            listResponses['/tm/auth/source'] = { type: 'authsub', fallback: true };
            listResponses['/tm/auth/authsub1'] = { subProp1: 'subPropVal1' };
            listResponses['/tm/auth/authsub2'] = { subProp2: true };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            enabledSourceType: 'authsub',
                            fallback: true,
                            authSub1: {
                                subProp1: 'subPropVal1'
                            },
                            authSub2: {
                                subProp2: true
                            }
                        }
                    );
                });
        });

        it('should omit a subclass prop when skipWhenOmitted is set to true', () => {
            const configItems = [
                {
                    path: '/tm/auth/source',
                    schemaClass: 'Authentication',
                    properties: [
                        { id: 'type' },
                        { id: 'fallback' }
                    ],
                    nameless: true
                },
                {
                    path: '/tm/auth/authsub',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['authSub'],
                        skipWhenOmitted: true
                    },
                    properties: [
                        { id: 'requiredField' }
                    ],
                    nameless: true
                }
            ];

            listResponses['/tm/auth/source'] = { type: 'authsub', fallback: true };
            listResponses['/tm/auth/authsub'] = { name: 'namelessClass without the required field' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            enabledSourceType: 'authsub',
                            fallback: true
                        }
                    );
                });
        });
    });

    describe('SyslogRemoteServer oddities', () => {
        it('should merge remoteServers into the parent object', () => {
            const configItems = [
                {
                    path: '/tm/sys/syslog',
                    schemaClass: 'SyslogRemoteServer',
                    properties: [
                        { id: 'remoteServers' }
                    ]
                }
            ];

            listResponses['/tm/sys/syslog'] = {
                remoteServers: [
                    {
                        name: '/Common/DRDCSyslog',
                        host: 'dr-ip',
                        localIp: '172.28.68.42',
                        remotePort: 519
                    },
                    {
                        name: '/Common/LocalDCSyslog',
                        host: 'local-ip',
                        localIp: '172.28.68.42',
                        remotePort: 30
                    }
                ]
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.SyslogRemoteServer,
                        {
                            DRDCSyslog: {
                                name: 'DRDCSyslog',
                                host: 'dr-ip',
                                localIp: '172.28.68.42',
                                remotePort: 519
                            },
                            LocalDCSyslog: {
                                name: 'LocalDCSyslog',
                                host: 'local-ip',
                                localIp: '172.28.68.42',
                                remotePort: 30
                            }
                        }
                    );
                });
        });
    });

    describe('HTTPD patches', () => {
        it('Should set allow value of All to lower case', () => {
            const configItems = [
                {
                    path: '/tm/sys/httpd',
                    schemaClass: 'HTTPD',
                    properties: [
                        { id: 'allow' }
                    ]
                }
            ];

            listResponses['/tm/sys/httpd'] = {
                allow: ['All']
            };

            const configManager = new ConfigManager(configItems, bigIpMock);

            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(state.originalConfig,
                        {
                            parsed: true,
                            Common: {
                                HTTPD: {
                                    allow: ['all']
                                }
                            }
                        });
                });
        });

        it('Should set missing allow value to none', () => {
            const configItems = [
                {
                    path: '/tm/sys/httpd',
                    schemaClass: 'HTTPD',
                    properties: [
                        { id: 'allow' }
                    ]
                }
            ];

            listResponses['/tm/sys/httpd'] = {};

            const configManager = new ConfigManager(configItems, bigIpMock);

            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(state.originalConfig,
                        {
                            parsed: true,
                            Common: {
                                HTTPD: {
                                    allow: 'none'
                                }
                            }
                        });
                });
        });
    });

    it('should set original config if missing', () => {
        const configItems = [
            {
                path: '/tm/sys/global-settings',
                properties: [
                    { id: 'hostname' }
                ]
            },
            {
                path: '/tm/net/self',
                schemaClass: 'SelfIp',
                properties: [
                    { id: 'allowService' }
                ]
            }
        ];

        listResponses['/tm/sys/global-settings'] = { hostname };
        listResponses['/tm/net/self'] = [
            {
                name: 'selfIp1'
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.originalConfig,
                    {
                        parsed: true,
                        Common: {
                            hostname: 'myhost.bigip.com',
                            SelfIp: {
                                selfIp1: {
                                    name: 'selfIp1',
                                    allowService: 'none'
                                }
                            }
                        }
                    });
            });
    });

    it('should not overwrite original config if present', () => {
        const configItems = [
            {
                path: '/tm/sys/global-settings',
                properties: [
                    { id: 'hostname' }
                ]
            },
            {
                path: '/tm/net/self',
                schemaClass: 'SelfIp',
                properties: [
                    { id: 'allowService' }
                ]
            }
        ];

        listResponses['/tm/sys/global-settings'] = { hostname };
        listResponses['/tm/net/self'] = [
            {
                name: 'selfIp1'
            }
        ];

        state.originalConfig = {
            foo: 'bar'
        };

        let updatedOriginalConfig;
        doState.getOriginalConfigByConfigId = () => state.originalConfig;
        doState.setOriginalConfigByConfigId = (id, config) => {
            updatedOriginalConfig = config;
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.originalConfig, { foo: 'bar' });
                assert.deepEqual(updatedOriginalConfig, { foo: 'bar' });
            });
    });

    describe('DbVariables', () => {
        it('should get DB variables if in declaration', () => {
            const configItems = [
                {
                    path: '/tm/sys/db',
                    schemaClass: 'DbVariables',
                    properties: [
                        { id: 'value' }
                    ],
                    singleValue: true
                }
            ];

            listResponses['/tm/sys/db'] = [
                {
                    name: 'dbVar1',
                    value: 'oldfoo'
                },
                {
                    name: 'dbVar2',
                    value: 'oldbar'
                },
                {
                    name: 'dbVar3',
                    value: 'no, not me'
                }
            ];

            const declaration = {
                Common: {
                    dbVars: {
                        class: 'DbVariables',
                        dbVar1: 'foo',
                        dbVar2: 'bar'
                    }
                }
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get(declaration, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar1, 'oldfoo');
                    assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar2, 'oldbar');
                    assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar3, undefined);
                });
        });
    });

    describe('should ignore', () => {
        it('should ignore ignored properties', () => {
            const configItems = [
                {
                    path: '/tm/cm/device-group',
                    schemaClass: 'DeviceGroup',
                    properties: [
                        { id: 'type' }
                    ],
                    ignore: [
                        { name: '^datasync-.+-dg$' },
                        { name: '^gtm$' }
                    ]
                }
            ];

            listResponses['/tm/cm/device-group'] = [
                {
                    name: 'myDeviceGroup',
                    members: []
                },
                {
                    name: 'datasync-foo-dg',
                    members: []
                },
                {
                    name: 'gtm',
                    members: []
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(Object.keys(state.currentConfig.Common.DeviceGroup).length, 1);
                    assert.deepEqual(
                        state.currentConfig.Common.DeviceGroup.myDeviceGroup,
                        { name: 'myDeviceGroup', members: [] }
                    );
                });
        });

        it('should create empty config items for ignored properties', () => {
            const configItems = [
                {
                    path: '/tm/security/firewall/port-list',
                    schemaClass: 'FirewallPortList',
                    requiredModule: 'afm',
                    properties: [
                        {
                            id: 'ports',
                            transformAsArray: true,
                            transform: [
                                { id: 'ports', extract: 'name' }
                            ]
                        }
                    ],
                    ignore: [
                        { name: '^_sys_self_allow_tcp_defaults$' },
                        { name: '^_sys_self_allow_udp_defaults$' }
                    ]
                }
            ];

            listResponses['/tm/security/firewall/port-list'] = [
                {
                    name: '_sys_self_allow_tcp_defaults',
                    ports: []
                },
                {
                    name: '_sys_self_allow_udp_defaults',
                    ports: []
                }
            ];

            const declaration = {
                Common: {
                    myPortList: {
                        class: 'FirewallPortList',
                        ports: [1234]
                    }
                }
            };
            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get(declaration, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common.FirewallPortList, {});
                    assert.deepStrictEqual(state.originalConfig.Common.FirewallPortList, {});
                });
        });
    });
    it('should skip unprovisioned modules', () => {
        const configItems = [
            {
                path: '/tm/analytics/global-settings',
                requiredModule: 'avr',
                schemaClass: 'Analytics',
                properties: []
            }
        ];

        let skipped = true;

        bigIpMock.list = (path) => {
            const pathname = URL.parse(path, 'https://foo').pathname;
            if (pathname === '/tm/analytics/global-settings') {
                skipped = false;
            }
            return Promise.resolve(listResponses[pathname] || {});
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.ok(skipped, 'Analytics was checked but AVR not provisioned');
            });
    });

    it('should not skip provisioned modules', () => {
        const configItems = [
            {
                path: '/tm/analytics/global-settings',
                requiredModule: 'avr',
                schemaClass: 'Analytics',
                properties: []
            }
        ];
        listResponses['/tm/sys/provision'] = [
            { name: 'avr', level: 'nominal' }
        ];

        let notSkipped = false;

        bigIpMock.list = (path) => {
            const pathname = URL.parse(path, 'https://foo').pathname;
            if (pathname === '/tm/analytics/global-settings') {
                notSkipped = true;
            }
            return Promise.resolve(listResponses[pathname] || {});
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.ok(notSkipped, 'Should check Analytics when provisioned');
            });
    });

    it('should add empty object for unprovisioned modules when a class is in the delcaration', () => {
        const configItems = [
            {
                path: '/tm/gtm/monitor/http',
                schemaClass: 'GSLBMonitor',
                requiredModule: 'gtm',
                properties: []
            }
        ];
        const declaration = {
            Common: {
                gslbMonitor: {
                    class: 'GSLBMonitor'
                }
            }
        };

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get(declaration, state, doState)
            .then(() => {
                assert.deepStrictEqual(
                    state.currentConfig.Common,
                    {
                        GSLBMonitor: {}
                    }
                );
            });
    });

    it('should update originalConfig with default empty classes based on provisioned modules', () => {
        let configItems = [];
        const expectedConfig = {
            Analytics: {},
            FirewallPolicy: {},
            Provision: {},
            GSLBServer: {
                myGSLBServer: {}
            }
        };

        state.originalConfig = {
            Common: {
                GSLBGlobals: {},
                GSLBDataCenter: {},
                GSLBMonitor: {},
                GSLBProberPool: {},
                GSLBServer: {
                    myGSLBServer: {}
                }
            }
        };

        doState.getOriginalConfigByConfigId = () => state.originalConfig;

        listResponses['/tm/sys/provision'] = [
            { name: 'afm', level: 'nominal' },
            { name: 'gtm', level: 'none' },
            { name: 'avr', level: 'nominal' }
        ];

        configItems = configItems.concat(
            getConfigItems('GSLBGlobals'),
            getConfigItems('GSLBDataCenter'),
            getConfigItems('GSLBMonitor'),
            getConfigItems('GSLBProberPool'),
            getConfigItems('GSLBServer'),
            getConfigItems('FirewallPolicy'),
            getConfigItems('Analytics'),
            getConfigItems('Provision')
        );

        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepStrictEqual(state.originalConfig.Common, expectedConfig);
            });
    });

    it('should keep the right order for response items when configItem was skipped', () => {
        const configItems = [
            {
                path: '/tm/sys/ntp',
                schemaClass: 'NTP',
                properties: [
                    { id: 'servers' },
                    { id: 'timezone' }
                ]
            },
            {
                path: '/tm/analytics/global-settings',
                requiredModule: 'avr',
                schemaClass: 'Analytics',
                properties: []
            },
            {
                path: '/tm/sys/dns',
                schemaClass: 'DNS',
                properties: [
                    { id: 'nameServers' },
                    { id: 'search' }
                ]
            }
        ];
        listResponses['/tm/sys/ntp'] = {
            servers: ['server1', 'server2'],
            timezone: 'utc'
        };
        listResponses['/tm/sys/dns'] = {
            nameServers: ['172.27.1.1'],
            search: ['localhost']
        };

        const expectedConfig = {
            NTP: {
                servers: [
                    'server1',
                    'server2'
                ],
                timezone: 'utc'
            },
            DNS: {
                nameServers: [
                    '172.27.1.1'
                ],
                search: [
                    'localhost'
                ]
            }
        };

        bigIpMock.list = (path) => {
            const pathname = URL.parse(path, 'https://foo').pathname;
            return Promise.resolve(listResponses[pathname] || {});
        };
        const configManager = new ConfigManager(configItems, bigIpMock);
        return configManager.get({}, state, doState)
            .then(() => {
                assert.deepStrictEqual(state.currentConfig.Common, expectedConfig, 'Should match expected config');
            });
    });

    describe('capture plus transform', () => {
        const configItems = getConfigItems('Disk');

        it('should get current config for Disk', () => {
            listResponses['/tm/sys/disk/directory'] = {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        26128384       -               \n\n'
                }
            };

            const expectedConfig = {
                Disk: {
                    applicationData: 26128384
                }
            };

            bigIpMock.list = (path) => {
                const pathname = URL.parse(path, 'https://foo').pathname;
                return Promise.resolve(listResponses[pathname] || {});
            };
            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common, expectedConfig);
                });
        });

        it('should get empty current config for Disk without target directory', () => {
            listResponses['/tm/sys/disk/directory'] = {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n\n'
                }
            };

            const expectedConfig = {
                Disk: {}
            };

            bigIpMock.list = (path) => {
                const pathname = URL.parse(path, 'https://foo').pathname;
                return Promise.resolve(listResponses[pathname] || {});
            };
            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common, expectedConfig);
                });
        });
    });

    describe('extractTransform', () => {
        it('should transform objects', () => {
            const configItems = [
                {
                    path: '/tm/security/firewall/address-list',
                    schemaClass: 'FirewallAddressList',
                    properties: [
                        {
                            id: 'addresses',
                            transform: [
                                { id: 'addresses', extract: 'name' }
                            ]
                        }
                    ]
                }
            ];

            listResponses['/tm/security/firewall/address-list'] = [
                {
                    name: 'myFirewallAddressList',
                    addresses: {
                        name: '10.1.0.1'
                    }
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common,
                        {
                            FirewallAddressList: {
                                myFirewallAddressList: {
                                    name: 'myFirewallAddressList',
                                    addresses: {
                                        addresses: '10.1.0.1'
                                    }
                                }
                            }
                        }
                    );
                });
        });

        it('should transform arrays', () => {
            const configItems = [
                {
                    path: '/tm/security/firewall/address-list',
                    schemaClass: 'FirewallAddressList',
                    properties: [
                        {
                            id: 'addresses',
                            transformAsArray: true,
                            transform: [
                                { id: 'addresses', extract: 'name' }
                            ]
                        }
                    ]
                }
            ];

            listResponses['/tm/security/firewall/address-list'] = [
                {
                    name: 'myFirewallAddressList',
                    addresses: [
                        {
                            name: '10.1.0.1'
                        },
                        {
                            name: '10.2.0.0/24'
                        }
                    ]
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common,
                        {
                            FirewallAddressList: {
                                myFirewallAddressList: {
                                    name: 'myFirewallAddressList',
                                    addresses: [
                                        '10.1.0.1',
                                        '10.2.0.0/24'
                                    ]
                                }
                            }
                        }
                    );
                });
        });
    });

    describe('RoutingBGP', () => {
        it('should handle RoutingBGP', () => {
            const configItems = getConfigItems('RoutingBGP');

            listResponses['/tm/net/routing/bgp'] = [
                {
                    name: 'exampleBGP',
                    gracefulRestart: {
                        gracefulReset: 'enabled',
                        restartTime: 120,
                        stalepathTime: 0
                    },
                    holdTime: 35,
                    keepAlive: 10,
                    localAS: 65010,
                    routerId: '10.1.1.1',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            autoSummary: 'disabled',
                            distance: {
                                external: 20,
                                internal: 200,
                                local: 200
                            },
                            networkSynchronization: 'disabled',
                            redistribute: [
                                {
                                    name: 'kernel',
                                    routeMap: '/Common/routeMap1',
                                    routeMapReference: {
                                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                    }
                                },
                                {
                                    name: 'static',
                                    routeMap: '/Common/routeMap1',
                                    routeMapReference: {
                                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                    }
                                }
                            ]
                        },
                        {
                            name: 'ipv6',
                            autoSummary: 'disabled',
                            distance: {
                                external: 20,
                                internal: 200,
                                local: 200
                            },
                            networkSynchronization: 'disabled',
                            redistribute: [
                                {
                                    name: 'kernel',
                                    routeMap: '/Common/routeMap1',
                                    routeMapReference: {
                                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                    }
                                },
                                {
                                    name: 'static',
                                    routeMap: '/Common/routeMap1',
                                    routeMapReference: {
                                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                    }
                                }
                            ]
                        }
                    ],
                    neighborReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/bgp/~Common~peerGroup/neighbor?ver=14.1.2.8'
                    },
                    peerGroupReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/bgp/~Common~peerGroup/peer-group?ver=14.1.2.8'
                    }
                }
            ];

            listResponses['/tm/net/routing/bgp/~Common~peerGroup/neighbor'] = [
                {
                    name: '10.1.1.4',
                    peerGroup: 'Neighbor_IN'
                },
                {
                    name: '10.1.1.5',
                    peerGroup: 'Neighbor_OUT'
                },
                {
                    name: '10.1.1.2',
                    peerGroup: 'Neighbor_IN'
                },
                {
                    name: '10.1.1.3',
                    peerGroup: 'Neighbor_OUT'
                }
            ];

            listResponses['/tm/net/routing/bgp/~Common~peerGroup/peer-group'] = [
                {
                    name: 'Neighbor_IN',
                    remoteAS: 65020,
                    addressFamily: [
                        {
                            name: 'ipv4',
                            routeMap: {
                                in: '/Common/routeMap1',
                                inReference: {
                                    link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                },
                                out: '/Common/routeMap1',
                                outReference: {
                                    link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMap1?ver=14.1.2.8'
                                }
                            },
                            softReconfigurationInbound: 'enabled'
                        },
                        {
                            name: 'ipv6',
                            routeMap: {},
                            softReconfigurationInbound: 'disabled'
                        }
                    ]
                },
                {
                    name: 'Neighbor_OUT',
                    remoteAs: 65030,
                    addressFamily: [
                        {
                            name: 'ipv4',
                            routeMap: {}
                        }
                    ]
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common.RoutingBGP, {
                        exampleBGP: {
                            name: 'exampleBGP',
                            gracefulRestart: {
                                gracefulResetEnabled: true,
                                restartTime: 120,
                                stalePathTime: 0
                            },
                            holdTime: 35,
                            keepAlive: 10,
                            localAS: 65010,
                            routerId: '10.1.1.1',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    redistributionList: [
                                        {
                                            routeMap: '/Common/routeMap1',
                                            routingProtocol: 'kernel'
                                        },
                                        {
                                            routeMap: '/Common/routeMap1',
                                            routingProtocol: 'static'
                                        }
                                    ]
                                },
                                {
                                    internetProtocol: 'ipv6',
                                    redistributionList: [
                                        {
                                            routeMap: '/Common/routeMap1',
                                            routingProtocol: 'kernel'
                                        },
                                        {
                                            routeMap: '/Common/routeMap1',
                                            routingProtocol: 'static'
                                        }
                                    ]
                                }
                            ],
                            neighbors: [
                                {
                                    address: '10.1.1.2',
                                    peerGroup: 'Neighbor_IN'
                                },
                                {
                                    address: '10.1.1.3',
                                    peerGroup: 'Neighbor_OUT'
                                },
                                {
                                    address: '10.1.1.4',
                                    peerGroup: 'Neighbor_IN'
                                },
                                {
                                    address: '10.1.1.5',
                                    peerGroup: 'Neighbor_OUT'
                                }
                            ],
                            peerGroups: [
                                {
                                    name: 'Neighbor_IN',
                                    remoteAS: 65020,
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            routeMap: {
                                                in: '/Common/routeMap1',
                                                out: '/Common/routeMap1'
                                            },
                                            softReconfigurationInboundEnabled: true
                                        },
                                        {
                                            internetProtocol: 'ipv6',
                                            routeMap: {},
                                            softReconfigurationInboundEnabled: false
                                        }
                                    ]
                                },
                                {
                                    name: 'Neighbor_OUT',
                                    remoteAS: 65030,
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            routeMap: {},
                                            softReconfigurationInboundEnabled: false
                                        }
                                    ]
                                }
                            ]
                        }
                    });
                });
        });
    });

    describe('RoutingAsPath', () => {
        it('should handle RoutingAsPath with references', () => {
            const configItems = getConfigItems('RoutingAsPath');

            listResponses['/tm/net/routing/as-path'] = [
                {
                    name: 'exampleAsPath',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/as-path/~Common~exampleAsPath/entries?ver=14.1.2.7'
                    }
                }
            ];
            listResponses['/tm/net/routing/as-path/~Common~exampleAsPath/entries'] = [
                {
                    name: '10',
                    action: 'permit',
                    regex: '^$'
                },
                {
                    name: '15',
                    action: 'permit',
                    regex: '^123'
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common.RoutingAsPath, {
                        exampleAsPath: {
                            name: 'exampleAsPath',
                            entries: [
                                {
                                    action: 'permit',
                                    name: 10,
                                    regex: '^$'
                                },
                                {
                                    action: 'permit',
                                    name: 15,
                                    regex: '^123'
                                }
                            ]
                        }
                    });
                });
        });
    });

    describe('RouteMap', () => {
        it('should handle RouteMap', () => {
            const configItems = getConfigItems('RouteMap');

            listResponses['/tm/net/routing/route-map'] = [
                {
                    name: 'exampleRouteMap',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~exampleRouteMap/entries?ver=14.1.2.8'
                    }
                }
            ];
            listResponses['/tm/net/routing/route-map/~Common~exampleRouteMap/entries'] = [
                {
                    name: 44,
                    action: 'permit',
                    match: {
                        asPath: '/Common/aspath',
                        asPathReference: {
                            link: 'https://some/link/here'
                        },
                        community: {
                            exactMatch: 'unset'
                        },
                        ipv4: {
                            address: {
                                prefixList: '/Common/prefixlist1',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            },
                            nextHop: {
                                prefixList: '/Common/prefixlist2',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            },
                            peer: {
                                prefixList: '/Common/prefixlist3',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            }
                        },
                        ipv6: {
                            address: {
                                prefixList: '/Common/prefixlist4',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            },
                            nextHop: {
                                prefixList: '/Common/prefixlist5',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            },
                            peer: {
                                prefixList: '/Common/prefixlist6',
                                prefixListReference: {
                                    link: 'https://some/link/here'
                                }
                            }
                        },
                        unwantedProperty: 'value'
                    }
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common.RouteMap, {
                        exampleRouteMap: {
                            name: 'exampleRouteMap',
                            entries: [
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/aspath',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/prefixlist1'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixlist2'
                                            }
                                        },
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/prefixlist4'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixlist5'
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    });
                });
        });
    });

    describe('RoutingPrefixList', () => {
        it('should handle RoutingPrefixList with references', () => {
            const configItems = getConfigItems('RoutingPrefixList');

            listResponses['/tm/net/routing/prefix-list'] = [
                {
                    name: 'examplePrefixList',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/prefix-list/~Common~examplePrefixList/entries?ver=14.1.2.7'
                    }
                }
            ];
            listResponses['/tm/net/routing/prefix-list/~Common~examplePrefixList/entries'] = [
                {
                    name: '20',
                    action: 'permit',
                    prefix: '10.3.3.0/24',
                    prefixLenRange: '32'
                },
                {
                    name: '30',
                    action: 'deny',
                    prefix: '1111:2222:3333:4444::/64',
                    prefixLenRange: '24'
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.currentConfig.Common.RoutingPrefixList, {
                        examplePrefixList: {
                            name: 'examplePrefixList',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444::/64',
                                    prefixLengthRange: 24
                                }
                            ]
                        }
                    });
                });
        });
    });

    describe('Disk', () => {
        const configItems = getConfigItems('Disk');

        beforeEach(() => {
            doState.getOriginalConfigByConfigId = () => state.originalConfig;
            bigIpMock.list = (path) => {
                const pathname = URL.parse(path, 'https://foo').pathname;
                return Promise.resolve(listResponses[pathname] || {});
            };
        });

        it('should update original disk size to match current when current is greater', () => {
            listResponses['/tm/sys/disk/directory'] = {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        26128384       -               \n\n'
                }
            };

            const expectedConfig = {
                Disk: {
                    applicationData: 26128384
                }
            };

            state.originalConfig = {
                Common: {
                    Disk: {
                        applicationData: 12345
                    }
                }
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.originalConfig.Common, expectedConfig);
                });
        });

        it('should not update original disk size to match current when original is greater', () => {
            listResponses['/tm/sys/disk/directory'] = {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        12345       -               \n\n'
                }
            };

            const expectedConfig = {
                Disk: {
                    applicationData: 26128384
                }
            };

            state.originalConfig = {
                Common: {
                    Disk: {
                        applicationData: 26128384
                    }
                }
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.originalConfig.Common, expectedConfig);
                });
        });

        it('should update originalConfig, if it lacks disk information', () => {
            listResponses['/tm/sys/disk/directory'] = {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        12345       -               \n\n'
                }
            };

            const expectedConfig = {
                ExistingClass: {
                    foo: 'bar'
                },
                Disk: {
                    applicationData: 12345
                }
            };

            state.originalConfig = {
                Common: {
                    ExistingClass: {
                        foo: 'bar'
                    }
                }
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(state.originalConfig.Common, expectedConfig);
                });
        });
    });

    describe('GSLBGlobals', () => {
        it('should handle GSLBGlobals', () => {
            const configItems = getConfigItems('GSLBGlobals');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/global-settings/general'] = {
                synchronization: 'yes',
                synchronizationGroupName: 'syncGroup',
                synchronizationTimeTolerance: 123,
                synchronizationTimeout: 100
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBGlobals,
                        {
                            general: {
                                synchronizationEnabled: true,
                                synchronizationGroupName: 'syncGroup',
                                synchronizationTimeTolerance: 123,
                                synchronizationTimeout: 100
                            }
                        }
                    );
                });
        });
    });

    describe('GSLBServer', () => {
        it('should handle GSLBServer', () => {
            const configItems = getConfigItems('GSLBServer');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/server'] = [
                {
                    name: 'gslbServer',
                    datacenter: '/Common/gslbDataCenter',
                    description: 'description',
                    disabled: true,
                    exposeRouteDomains: 'yes',
                    iqAllowPath: 'no',
                    iqAllowServiceCheck: 'no',
                    iqAllowSnmp: 'no',
                    limitCpuUsage: 10,
                    limitCpuUsageStatus: 'enabled',
                    limitMaxBps: 50,
                    limitMaxBpsStatus: 'enabled',
                    limitMaxConnections: 70,
                    limitMaxConnectionsStatus: 'enabled',
                    limitMaxPps: 60,
                    limitMaxPpsStatus: 'enabled',
                    limitMemAvail: 12,
                    limitMemAvailStatus: 'enabled',
                    proberFallback: 'any-available',
                    proberPreference: 'pool',
                    proberPool: '/Common/gslbProberPool',
                    product: 'generic-host',
                    virtualServerDiscovery: 'enabled',
                    devicesReference: {
                        link: 'https://localhost/mgmt/tm/gtm/server/~Common~gslbServer/devices'
                    },
                    virtualServersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/server/~Common~gslbServer/virtual-servers'
                    },
                    monitor: '/Common/http and /Common/http_head_f5'
                }
            ];
            listResponses['/tm/gtm/server/~Common~gslbServer/devices'] = [
                {
                    name: '0',
                    description: 'deviceDescription1',
                    addresses: [{ name: '10.0.0.1', translation: '192.0.2.12' }]
                },
                {
                    name: '1',
                    description: 'deviceDescription2',
                    addresses: [{ name: '10.0.0.2', translation: '192.0.2.13' }]
                }
            ];
            listResponses['/tm/gtm/server/~Common~gslbServer/virtual-servers'] = [
                {
                    name: 'virtualServer1',
                    description: 'virtual server description one',
                    destination: '192.0.10.20:443',
                    enabled: false,
                    disabled: true,
                    translationAddress: '10.10.0.10',
                    translationPort: 23,
                    monitor: '/Common/bigip and /Common/tcp'
                },
                {
                    name: 'virtualServer2',
                    destination: 'a989:1c34:9c::b099:c1c7:8bfe.0',
                    enabled: true,
                    translationAddress: 'none',
                    translationPort: 0
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBServer,
                        {
                            gslbServer: {
                                name: 'gslbServer',
                                remark: 'description',
                                enabled: false,
                                serverType: 'generic-host',
                                proberPreferred: 'pool',
                                proberFallback: 'any-available',
                                proberPool: 'gslbProberPool',
                                bpsLimit: 50,
                                bpsLimitEnabled: true,
                                ppsLimit: 60,
                                ppsLimitEnabled: true,
                                connectionsLimit: 70,
                                connectionsLimitEnabled: true,
                                cpuUsageLimit: 10,
                                cpuUsageLimitEnabled: true,
                                memoryLimit: 12,
                                memoryLimitEnabled: true,
                                serviceCheckProbeEnabled: false,
                                pathProbeEnabled: false,
                                snmpProbeEnabled: false,
                                dataCenter: 'gslbDataCenter',
                                devices: [
                                    {
                                        remark: 'deviceDescription1',
                                        address: '10.0.0.1',
                                        addressTranslation: '192.0.2.12'
                                    },
                                    {
                                        remark: 'deviceDescription2',
                                        address: '10.0.0.2',
                                        addressTranslation: '192.0.2.13'
                                    }
                                ],
                                virtualServers: [
                                    {
                                        name: 'virtualServer1',
                                        remark: 'virtual server description one',
                                        enabled: false,
                                        address: '192.0.10.20',
                                        port: 443,
                                        addressTranslation: '10.10.0.10',
                                        addressTranslationPort: 23,
                                        monitors: [
                                            '/Common/bigip',
                                            '/Common/tcp'
                                        ]
                                    },
                                    {
                                        name: 'virtualServer2',
                                        enabled: true,
                                        address: 'a989:1c34:9c::b099:c1c7:8bfe',
                                        port: 0,
                                        addressTranslationPort: 0,
                                        monitors: []
                                    }
                                ],
                                exposeRouteDomainsEnabled: true,
                                virtualServerDiscoveryMode: 'enabled',
                                monitors: [
                                    '/Common/http',
                                    '/Common/http_head_f5'
                                ]
                            }
                        }
                    );
                });
        });

        it('should handle GSLBServer when there are no items', () => {
            const configItems = getConfigItems('GSLBServer');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/server'] = undefined;

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBServer,
                        {}
                    );
                });
        });

        it('should handle alternative GSLBServer enable/disable values', () => {
            const configItems = getConfigItems('GSLBServer');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/server'] = [
                {
                    name: 'serverEnabledStringVal',
                    enabled: 'True',
                    monitor: ''
                },
                {
                    name: 'serverDisabledStringVal',
                    disabled: 'False',
                    monitor: ''
                },
                {
                    name: 'serverNoVal',
                    monitor: ''
                }
            ];

            const getExpected = name => ({
                name,
                enabled: true,
                bpsLimitEnabled: false,
                connectionsLimitEnabled: false,
                cpuUsageLimitEnabled: false,
                exposeRouteDomainsEnabled: false,
                memoryLimitEnabled: false,
                pathProbeEnabled: false,
                ppsLimitEnabled: false,
                serviceCheckProbeEnabled: false,
                snmpProbeEnabled: false,
                monitors: [],
                devices: []
            });

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBServer,
                        {
                            serverEnabledStringVal: getExpected('serverEnabledStringVal'),
                            serverDisabledStringVal: getExpected('serverDisabledStringVal'),
                            serverNoVal: getExpected('serverNoVal')
                        }
                    );
                });
        });
    });

    describe('GSLBMonitor', () => {
        describe('http', () => {
            const configItems = getConfigItems('GSLBMonitor');

            it('should handle HTTP GSLB Monitors', () => {
                listResponses['/tm/sys/provision'] = [
                    { name: 'gtm', level: 'nominal' }
                ];
                listResponses['/tm/gtm/monitor/http'] = [
                    {
                        kind: 'tm:gtm:monitor:http:httpstate',
                        name: 'GSLBmonitor',
                        partition: 'Common',
                        fullPath: '/Common/GSLBmonitor',
                        generation: 0,
                        selfLink: 'https://localhost/mgmt/tm/gtm/monitor/http/~Common~GSLBmonitor?ver=15.1.2',
                        defaultsFrom: '/Common/http',
                        description: 'description',
                        destination: '1.1.1.1:80',
                        ignoreDownResponse: 'enabled',
                        interval: 100,
                        probeTimeout: 110,
                        recv: 'HTTP',
                        reverse: 'enabled',
                        send: 'HEAD / HTTP/1.0\\r\\n',
                        timeout: 1000,
                        transparent: 'enabled'
                    }
                ];

                const configManager = new ConfigManager(configItems, bigIpMock);
                return configManager.get({}, state, doState)
                    .then(() => {
                        assert.deepStrictEqual(
                            state.currentConfig.Common.GSLBMonitor,
                            {
                                GSLBmonitor: {
                                    name: 'GSLBmonitor',
                                    defaultsFrom: '/Common/http',
                                    fullPath: '/Common/GSLBmonitor',
                                    generation: 0,
                                    ignoreDownResponseEnabled: true,
                                    interval: 100,
                                    monitorType: 'http',
                                    probeTimeout: 110,
                                    receive: 'HTTP',
                                    remark: 'description',
                                    reverseEnabled: true,
                                    send: 'HEAD / HTTP/1.0\\r\\n',
                                    target: '1.1.1.1:80',
                                    timeout: 1000,
                                    transparent: true
                                }
                            }
                        );
                    });
            });
        });
    });

    describe('GSLBProberPool', () => {
        it('should handle GSLBProberPool', () => {
            const configItems = getConfigItems('GSLBProberPool');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/prober-pool'] = [
                {
                    name: 'gslbProberPool',
                    description: 'description',
                    disabled: true,
                    loadBalancingMode: 'round-robin',
                    membersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/prober-pool/~Common~gslbProberPool/members'
                    }
                }
            ];
            listResponses['/tm/gtm/prober-pool/~Common~gslbProberPool/members'] = [
                {
                    name: '/Common/serverOne',
                    description: 'member description one',
                    disabled: true,
                    enabled: false,
                    order: 1
                },
                {
                    name: '/Common/serverTwo',
                    description: 'member description two',
                    disabled: false,
                    enabled: true,
                    order: 0
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBProberPool,
                        {
                            gslbProberPool: {
                                name: 'gslbProberPool',
                                remark: 'description',
                                enabled: false,
                                lbMode: 'round-robin',
                                members: [
                                    {
                                        server: 'serverTwo',
                                        remark: 'member description two',
                                        enabled: true,
                                        order: 0
                                    },
                                    {
                                        server: 'serverOne',
                                        remark: 'member description one',
                                        enabled: false,
                                        order: 1
                                    }
                                ]
                            }
                        }
                    );
                });
        });

        it('should handle alternative GSLBProberPool enable/disable values', () => {
            const configItems = getConfigItems('GSLBProberPool');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/prober-pool'] = [
                {
                    name: 'proberPoolEnabledStringVal',
                    enabled: 'True'
                },
                {
                    name: 'proberPoolDisabledStringVal',
                    disabled: 'False'
                },
                {
                    name: 'proberPoolNoVal'
                }
            ];

            const getExpected = name => ({
                name,
                enabled: true
            });

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBProberPool,
                        {
                            proberPoolEnabledStringVal: getExpected('proberPoolEnabledStringVal'),
                            proberPoolDisabledStringVal: getExpected('proberPoolDisabledStringVal'),
                            proberPoolNoVal: getExpected('proberPoolNoVal')
                        }
                    );
                });
        });

        it('should handle alternative GSLBProberPool member enable/disable values', () => {
            const configItems = getConfigItems('GSLBProberPool');

            listResponses['/tm/sys/provision'] = [
                { name: 'gtm', level: 'nominal' }
            ];
            listResponses['/tm/gtm/prober-pool'] = [
                {
                    name: 'gslbProberPool',
                    membersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/prober-pool/~Common~gslbProberPool/members'
                    }
                }
            ];
            listResponses['/tm/gtm/prober-pool/~Common~gslbProberPool/members'] = [
                {
                    name: '/Common/memberEnabledStringVal',
                    enabled: 'True'
                },
                {
                    name: '/Common/memberDisabledStringVal',
                    disabled: 'False'
                },
                {
                    name: '/Common/memberNoVal'
                }
            ];

            const getExpected = server => ({
                server,
                enabled: true
            });

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.GSLBProberPool,
                        {
                            gslbProberPool: {
                                name: 'gslbProberPool',
                                enabled: true,
                                members: [
                                    getExpected('memberEnabledStringVal'),
                                    getExpected('memberDisabledStringVal'),
                                    getExpected('memberNoVal')
                                ]
                            }
                        }
                    );
                });
        });
    });

    describe('FirewallPolicy', () => {
        it('should handle FirewallPolicy', () => {
            const configItems = getConfigItems('FirewallPolicy');

            listResponses['/tm/sys/provision'] = [
                { name: 'afm', level: 'nominal' }
            ];
            listResponses['/tm/security/firewall/policy'] = [
                {
                    name: 'firewallPolicy',
                    description: 'firewall policy description',
                    rulesReference: {
                        link: 'https://localhost/mgmt/tm/security/firewall/policy/~Common~firewallPolicy/rules'
                    }
                }
            ];
            listResponses['/tm/security/firewall/policy/~Common~firewallPolicy/rules'] = [
                {
                    name: 'firewallPolicyRuleOne',
                    description: 'firewall policy rule one description',
                    action: 'accept',
                    ipProtocol: 'any',
                    log: 'no',
                    source: {
                        identity: {}
                    },
                    destination: {}
                },
                {
                    name: 'firewallPolicyRuleTwo',
                    description: 'firewall policy rule two description',
                    action: 'reject',
                    ipProtocol: 'tcp',
                    log: 'yes',
                    source: {
                        identity: {},
                        vlans: [
                            '/Common/vlan1',
                            '/Common/vlan2'
                        ],
                        addressLists: [
                            '/Common/myAddressList1',
                            '/Common/myAddressList2'
                        ],
                        portLists: [
                            '/Common/myPortList1',
                            '/Common/myPortList2'
                        ]
                    },
                    destination: {
                        addressLists: [
                            '/Common/myAddressList1',
                            '/Common/myAddressList2'
                        ],
                        portLists: [
                            '/Common/myPortList1',
                            '/Common/myPortList2'
                        ]
                    }
                }
            ];

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.FirewallPolicy,
                        {
                            firewallPolicy: {
                                name: 'firewallPolicy',
                                remark: 'firewall policy description',
                                rules: [
                                    {
                                        name: 'firewallPolicyRuleOne',
                                        remark: 'firewall policy rule one description',
                                        action: 'accept',
                                        protocol: 'any',
                                        loggingEnabled: false,
                                        source: {},
                                        destination: {}
                                    },
                                    {
                                        name: 'firewallPolicyRuleTwo',
                                        remark: 'firewall policy rule two description',
                                        action: 'reject',
                                        protocol: 'tcp',
                                        loggingEnabled: true,
                                        source: {
                                            vlans: [
                                                '/Common/vlan1',
                                                '/Common/vlan2'
                                            ],
                                            addressLists: [
                                                '/Common/myAddressList1',
                                                '/Common/myAddressList2'
                                            ],
                                            portLists: [
                                                '/Common/myPortList1',
                                                '/Common/myPortList2'
                                            ]
                                        },
                                        destination: {
                                            addressLists: [
                                                '/Common/myAddressList1',
                                                '/Common/myAddressList2'
                                            ],
                                            portLists: [
                                                '/Common/myPortList1',
                                                '/Common/myPortList2'
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    );
                });
        });
    });

    describe('minVersion', () => {
        it('should add to currentConfig if minVersion is met', () => {
            const configItems = [
                {
                    path: '/tm/auth/ldap',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['ldap'],
                        skipWhenOmitted: true
                    },
                    properties: [
                        {
                            id: 'referrals',
                            truth: 'yes',
                            falsehood: 'no',
                            minVersion: '15.1'
                        }
                    ]
                }
            ];

            listResponses['/tm/auth/ldap'] = { referrals: 'yes' };

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            ldap: {
                                referrals: true
                            }
                        }
                    );
                });
        });

        it('should not add to currentConfig if minVersion is greater', () => {
            const configItems = [
                {
                    path: '/tm/auth/ldap',
                    schemaClass: 'Authentication',
                    schemaMerge: {
                        path: ['ldap'],
                        skipWhenOmitted: true
                    },
                    properties: [
                        {
                            id: 'referrals',
                            truth: 'yes',
                            falsehood: 'no',
                            minVersion: '15.1'
                        }
                    ]
                }
            ];

            listResponses['/tm/auth/ldap'] = {};
            bigIpMock.deviceInfo = () => Promise.resolve({ hostname, version: '13.1' });

            const configManager = new ConfigManager(configItems, bigIpMock);
            return configManager.get({}, state, doState)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig.Common.Authentication,
                        {}
                    );
                });
        });
    });
});
