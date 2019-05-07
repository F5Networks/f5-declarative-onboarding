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
const URL = require('url').URL;

/* eslint-disable global-require, quote-props, quotes */

describe('configManager', () => {
    const hostname = 'myhost.bigip.com';
    const deviceName = 'device1';

    let listResponses;
    let configItems;
    let ConfigManager;
    let bigIpMock;
    let state;

    before(() => {
        ConfigManager = require('../../nodejs/configManager');

        bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname });
            },
            list(path) {
                // The path name here does not have a domain, but does include
                // a query. listResponses are set up with just the pathname part.
                const pathname = new URL(path, 'https://foo').pathname;
                return Promise.resolve(listResponses[pathname] || {});
            }
        };
    });

    beforeEach(() => {
        listResponses = {
            '/tm/cm/device': [
                {
                    hostname,
                    name: deviceName
                }
            ]
        };
        state = {};
    });

    it('should handle simple string values', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/sys/global-settings",
                    "properties": [
                        { "id": "hostname" }
                    ]
                }
            ];

            listResponses['/tm/sys/global-settings'] = { hostname };

            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state)
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
        });
    });

    it('should handle objects', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/sys/ntp",
                    "schemaClass": "NTP",
                    "properties": [
                        { "id": "servers" },
                        { "id": "timezone" }
                    ]
                }
            ];

            listResponses['/tm/sys/ntp'] = {
                servers: ['server1', 'server2'],
                timezone: 'utc'
            };

            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(state.currentConfig.Common.NTP, listResponses['/tm/sys/ntp']);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should handle arrays', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/net/route",
                    "schemaClass": "Route",
                    "properties": [
                        { "id": "gw" },
                        { "id": "network" },
                        { "id": "mtu" }
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
            configManager.get({}, state)
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
        });
    });

    it('should handle arrays when none are already defined on BIG-IP < 14.x', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/net/route",
                    "schemaClass": "Route",
                    "properties": [
                        { "id": "gw" },
                        { "id": "network" },
                        { "id": "mtu" }
                    ]
                }
            ];

            listResponses['/tm/net/route'] = {};

            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(state.currentConfig.Common.Route, {});
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should handle arrays when none are already defined on BIG-IP > 14.x', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/net/route",
                    "schemaClass": "Route",
                    "properties": [
                        { "id": "gw" },
                        { "id": "network" },
                        { "id": "mtu" }
                    ]
                }
            ];

            listResponses['/tm/net/route'] = [];

            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(state.currentConfig.Common.Route, {});
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should handle config items where we to map property name to value', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/sys/provision",
                    "schemaClass": "Provision",
                    "properties": [
                        { "id": "level" }
                    ],
                    "singleValue": true
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
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(
                        state.currentConfig.Common.Provision,
                        { 'afm': 'none', 'ltm': 'nominal' }
                    );
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should handle references', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/net/vlan",
                    "schemaClass": "VLAN",
                    "properties": [
                        { "id": "mtu" },
                        { "id": "tag" },
                        { "id": "interfacesReference" }
                    ],
                    "references": {
                        "interfacesReference": [
                            { "id": "tagged", "truth": true, "falsehood": false }
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
            configManager.get({}, state)
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
        });
    });

    describe('SelfIp oddities', () => {
        it('should strip /Common from vlan', () => {
            return new Promise((resolve, reject) => {
                configItems = [
                    {
                        "path": "/tm/net/self",
                        "schemaClass": "SelfIp",
                        "properties": [
                            { "id": "vlan" }
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
                configManager.get({}, state)
                    .then(() => {
                        assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.vlan, 'external');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle allowService with ["default"]', () => {
            return new Promise((resolve, reject) => {
                configItems = [
                    {
                        "path": "/tm/net/self",
                        "schemaClass": "SelfIp",
                        "properties": [
                            { "id": "allowService" }
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
                configManager.get({}, state)
                    .then(() => {
                        assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'default');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle allowService none', () => {
            return new Promise((resolve, reject) => {
                configItems = [
                    {
                        "path": "/tm/net/self",
                        "schemaClass": "SelfIp",
                        "properties": [
                            { "id": "allowService" }
                        ]
                    }
                ];

                listResponses['/tm/net/self'] = [
                    {
                        name: 'selfIp1'
                    }
                ];

                const configManager = new ConfigManager(configItems, bigIpMock);
                configManager.get({}, state)
                    .then(() => {
                        assert.strictEqual(state.currentConfig.Common.SelfIp.selfIp1.allowService, 'none');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    });

    it('should set original config if missing', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/sys/global-settings",
                    "properties": [
                        { "id": "hostname" }
                    ]
                },
                {
                    "path": "/tm/net/self",
                    "schemaClass": "SelfIp",
                    "properties": [
                        { "id": "allowService" }
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
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(state.originalConfig, state.currentConfig);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should not overwrite original config if present', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/sys/global-settings",
                    "properties": [
                        { "id": "hostname" }
                    ]
                },
                {
                    "path": "/tm/net/self",
                    "schemaClass": "SelfIp",
                    "properties": [
                        { "id": "allowService" }
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

            const configManager = new ConfigManager(configItems, bigIpMock);
            configManager.get({}, state)
                .then(() => {
                    assert.deepEqual(state.originalConfig, { foo: 'bar' });
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    describe('DbVariables', () => {
        it('should get DB variables if in declaration', () => {
            configItems = [
                {
                    "path": "/tm/sys/db",
                    "schemaClass": "DbVariables",
                    "properties": [
                        { "id": "value" }
                    ],
                    "singleValue": true
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
                configManager.get(declaration, state)
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

    it('should ignore ignored properties', () => {
        return new Promise((resolve, reject) => {
            configItems = [
                {
                    "path": "/tm/cm/device-group",
                    "schemaClass": "DeviceGroup",
                    "properties": [
                        { "id": "type" }
                    ],
                    "ignore": [
                        { "name": "^datasync-.+-dg$" },
                        { "name": "^gtm$" }
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
            configManager.get({}, state)
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
        });
    });
});
