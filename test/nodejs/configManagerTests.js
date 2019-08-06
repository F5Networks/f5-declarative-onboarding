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
const URL = require('url');

const ConfigManager = require('../../nodejs/configManager');

describe('configManager', () => {
    const hostname = 'myhost.bigip.com';
    const deviceName = 'device1';

    let listResponses;
    let bigIpMock;
    let state;
    let doState;

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

    it('should handle simple string values', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(
                    state.currentConfig.Common.hostname,
                    listResponses['/tm/sys/global-settings'].hostname
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle objects', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.NTP, listResponses['/tm/sys/ntp']);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle arrays', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(
                    state.currentConfig.Common.Route.default,
                    listResponses['/tm/net/route'][0]
                );
                assert.deepEqual(
                    state.currentConfig.Common.Route.route1,
                    listResponses['/tm/net/route'][1]
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle arrays when none are already defined on BIG-IP < 14.x', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.Route, {});
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle arrays when none are already defined on BIG-IP > 14.x', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.currentConfig.Common.Route, {});
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle config items where we to map property name to value', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(
                    state.currentConfig.Common.Provision,
                    { afm: 'none', ltm: 'nominal' }
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle references', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(
                    state.currentConfig.Common.VLAN.external.interfaces.name,
                    listResponses['/tm/net/vlan/~Common~external/interfaces'].name
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle newId property mapping', () => new Promise((resolve, reject) => {
        const configItems = [
            {
                path: '/tm/sys/management-route',
                schemaClass: 'ManagementRoute',
                properties: [
                    { id: 'gateway', newId: 'gw' },
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
                mtu: 0
            }
        ];

        const configManager = new ConfigManager(configItems, bigIpMock);
        configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.gw,
                    listResponses['/tm/sys/management-route'][0].gateway
                );
                assert.strictEqual(
                    state.currentConfig.Common.ManagementRoute.default.gateway,
                    undefined
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    describe('FailoverUnicast oddities', () => {
        // iControl omits the property altogether in some cases
        // Adding this defaultWhenOmitted attr makes the manager recognize that a default value is actually there
        // and that the prop needs to be set back to this value if it's not specified
        const configItems = [
            {
                path: '/tm/cm/device/~Common~{{deviceName}}',
                schemaClass: 'FailoverUnicast',
                properties: [
                    {
                        id: 'unicastAddress',
                        defaultWhenOmitted: 'none',
                        transform: [
                            { id: 'ip', newId: 'address' },
                            { id: 'port' }
                        ]
                    }
                ],
                nameless: true
            }
        ];

        it('should include a default value when missing and defaultWhenOmitted is defined', () => new Promise((resolve, reject) => {
            listResponses[`/tm/cm/device/~Common~${deviceName}`] = { name: deviceName };
            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.FailoverUnicast.unicastAddress,
                        'none'
                    );
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should map correct value with new prop Id when present', () => new Promise((resolve, reject) => {
            listResponses[`/tm/cm/device/~Common~${deviceName}`] = {
                name: deviceName,
                unicastAddress: [
                    {
                        ip: '1.1.1.106',
                        port: 1026
                    }
                ]
            };
            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.FailoverUnicast.address,
                        '1.1.1.106'
                    );
                    assert.deepEqual(
                        state.currentConfig.Common.FailoverUnicast.port,
                        '1026'
                    );
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));
    });

    describe('SelfIp oddities', () => {
        it('should strip /Common from vlan', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.vlan, 'external');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle allowService with ["default"]', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'default');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle allowService none', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
                .then(() => {
                    assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'none');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));
    });

    describe('Authentication oddities', () => {
        it('should merge an auth subclass into a parent auth class', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
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
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should merge multiple auth subclasses into a parent auth class', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
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
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should omit a subclass prop when skipWhenOmitted is set to true', () => new Promise((resolve, reject) => {
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
            configManager.get({}, state, doState)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Authentication,
                        {
                            enabledSourceType: 'authsub',
                            fallback: true
                        }
                    );
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));
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
            configManager.get({}, state, doState)
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

    it('should set original config if missing', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.originalConfig, state.currentConfig);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should not overwrite original config if present', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.deepEqual(state.originalConfig, { foo: 'bar' });
                assert.deepEqual(updatedOriginalConfig, state.originalConfig);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

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

            return new Promise((resolve, reject) => {
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
                configManager.get(declaration, state, doState)
                    .then(() => {
                        assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar1, 'oldfoo');
                        assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar2, 'oldbar');
                        assert.strictEqual(state.currentConfig.Common.DbVariables.dbVar3, undefined);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    });

    it('should ignore ignored properties', () => new Promise((resolve, reject) => {
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
        configManager.get({}, state, doState)
            .then(() => {
                assert.strictEqual(Object.keys(state.currentConfig.Common.DeviceGroup).length, 1);
                assert.deepEqual(
                    state.currentConfig.Common.DeviceGroup.myDeviceGroup,
                    listResponses['/tm/cm/device-group'][0]
                );
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

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
});
