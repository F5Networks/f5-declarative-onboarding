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

    let listResponses;
    let bigIpMock;
    let state;
    let doState;

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
                return Promise.resolve({ hostname });
            },
            list(path) {
                // The path name here does not have a domain, but does include
                // a query. listResponses are set up with just the pathname part.
                const pathname = URL.parse(path, 'https://foo').pathname;
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
});
