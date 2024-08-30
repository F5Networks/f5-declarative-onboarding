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

const assert = require('assert');
const Ajv = require('ajv');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const gslbSchema = require('../../../src/schema/latest/gslb.schema.json');
const customFormats = require('../../../src/schema/latest/formats');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .compile(gslbSchema);

/* eslint-disable quotes, quote-props */

describe('gslb.schema.json', () => {
    describe('GSLBGlobals class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: "GSLBGlobals"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationEnabled: true,
                        synchronizationGroupName: "newGroupName",
                        synchronizationTimeTolerance: 123,
                        synchronizationTimeout: 100,
                        synchronizeZoneFiles: false
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate synchronizationTimeTolerance value that is out of range', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeTolerance: 601
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeTolerance should be in the 0-600 range');
                assert(getErrorString().includes('should be <= 600'));
            });

            it('should invalidate synchronizationTimeout value that is out of range', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeout: 4294967296
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeout should be in the 0-4294967295 range');
                assert(getErrorString().includes('should be <= 4294967295'));
            });

            it('should invalidate values 0 and 4 for synchronizationTimeTolerance', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeTolerance: 3
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeTolerance should not allow values 1-4');
                assert(getErrorString().includes('should NOT be valid'));
            });
        });
    });

    describe('GSLBDataCenter class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: 'GSLBDataCenter'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    remark: 'description',
                    enabled: false,
                    location: 'dataCenterLocation',
                    contact: 'dataCenterContact',
                    proberPreferred: 'pool',
                    proberFallback: 'any-available',
                    proberPool: '/Common/proberPool'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate invalid proberPreferred value', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberPreferred: 'invalid'
                };
                assert.strictEqual(validate(data), false, '');
                assert(getErrorString().includes(''));
            });

            it('should invalidate invalid proberFallback value', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberFallback: 'invalid'
                };
                assert.strictEqual(validate(data), false, '');
                assert(getErrorString().includes(''));
            });

            it('should invalidate use of proberPool when proberPreferred or proberFallback are not pool', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberFallback: 'outside-datacenter',
                    proberPreferred: 'inside-datacenter',
                    proberPool: '/Common/proberPool'
                };
                assert.strictEqual(validate(data), false, '');
                assert(getErrorString().includes(''));
            });
        });
    });

    describe('GSLBServer class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: 'GSLBServer',
                    dataCenter: '/Common/gslbDataCenter',
                    devices: [
                        {
                            address: '10.0.0.1'
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: 'GSLBServer',
                    label: 'this is a test',
                    remark: 'description',
                    devices: [
                        {
                            address: '10.0.0.1',
                            addressTranslation: '192.0.2.12',
                            remark: 'deviceDescription'
                        },
                        {
                            address: '10.0.0.2',
                            addressTranslation: '192.0.2.13',
                            remark: 'deviceDescription1'
                        }
                    ],
                    dataCenter: '/Common/gslbDataCenter',
                    enabled: false,
                    proberPreferred: 'pool',
                    proberFallback: 'pool',
                    proberPool: '/Common/gslbProberPool',
                    bpsLimit: 50,
                    bpsLimitEnabled: true,
                    ppsLimit: 60,
                    ppsLimitEnabled: true,
                    connectionsLimit: 70,
                    connectionsLimitEnabled: true,
                    serviceCheckProbeEnabled: false,
                    pathProbeEnabled: false,
                    snmpProbeEnabled: false,
                    virtualServerDiscoveryMode: 'enabled',
                    virtualServers: [
                        {
                            name: 'virtualServer1',
                            remark: 'virtual server description one',
                            label: 'virtual server label one',
                            enabled: false,
                            address: '192.0.2.20',
                            port: 443,
                            addressTranslation: '10.10.0.10',
                            addressTranslationPort: 23,
                            monitors: [
                                '/Common/bigip',
                                '/Common/tcp'
                            ]
                        },
                        {
                            address: 'a989:1c34:009c:0000:0000:b099:c1c7:8bfe'
                        }
                    ],
                    exposeRouteDomainsEnabled: true,
                    cpuUsageLimit: 10,
                    cpuUsageLimitEnabled: true,
                    memoryLimit: 12,
                    memoryLimitEnabled: true,
                    serverType: 'generic-host',
                    monitors: [
                        '/Common/GSLBmonitor',
                        '/Common/otherMonitor'
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            let data;

            beforeEach(() => {
                data = {
                    class: 'GSLBServer',
                    dataCenter: '/Common/gslbDataCenter',
                    devices: [
                        {
                            address: '10.0.0.1'
                        }
                    ]
                };
            });

            it('should invalidate invalid proberPreferred value', () => {
                data.proberPreferred = 'badValue';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be equal to one of the allowed values'));
            });

            it('should invalidate invalid proberFallback value', () => {
                data.proberFallback = 'badValue';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be equal to one of the allowed values'));
            });

            it('should invalidate GSLBServer with no devices', () => {
                data.devices = [];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should NOT have fewer than 1 items'));
            });

            it('should invalidate GSLBServer with invalid device address value', () => {
                data.devices[0].address = 'badIP';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should match format \\"f5ip\\"'));
            });

            it('should invalidate GSLBServer with invalid device addressTranslation value', () => {
                data.devices[0].addressTranslation = 'badIP';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should match format \\"f5ip\\"'));
            });

            it('should invalidate invalid virtualServerDiscoveryMode value', () => {
                data.virtualServerDiscoveryMode = 'badValue';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be equal to one of the allowed values'));
            });

            it('should invalidate invalid bpsLimit value of less than 0', () => {
                data.bpsLimit = -1;
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate invalid ppsLimit value of less than 0', () => {
                data.ppsLimit = -1;
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate invalid connectionsLimit value of less than 0', () => {
                data.connectionsLimit = -1;
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate invalid cpuUsageLimit value of less than 0', () => {
                data.cpuUsageLimit = -1;
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate invalid memoryLimit value of less than 0', () => {
                data.memoryLimit = -1;
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate GSLBServer with proberPreferred value as pool and no proberPool', () => {
                data.proberPreferred = 'pool';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should have required property \'.proberPool\''));
            });

            it('should invalidate GSLBServer with proberFallback value as pool and no proberPool', () => {
                data.proberFallback = 'pool';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should have required property \'.proberPool\''));
            });

            it('should invalidate GSLBServer with invalid virtual server address value', () => {
                data.virtualServers = [{ address: 'badIP' }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should match format \\"f5ip\\"'));
            });

            it('should invalidate GSLBServer with invalid virtual server addressTranslation value', () => {
                data.virtualServers = [{ address: '192.0.2.12', addressTranslation: 'badIP' }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should match format \\"f5ip\\"'));
            });

            it('should invalidate GSLBServer with virtual server without address property', () => {
                data.virtualServers = [{ port: 8080 }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should have required property \'address\''));
            });

            it('should invalidate GSLBServer with virtual server with port value of less than 0', () => {
                data.virtualServers = [{ address: '192.0.2.12', port: -1 }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate GSLBServer with virtual server with addressTranslationPort value of less than 0', () => {
                data.virtualServers = [{ address: '192.0.2.12', addressTranslationPort: -1 }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be >= 0'));
            });

            it('should invalidate GSLBServer with virtual server with port value of more than 65535', () => {
                data.virtualServers = [{ address: '192.0.2.12', port: 65536 }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be <= 65535'));
            });

            it('should invalidate GSLBServer with virtual server with addressTranslationPort value of more than 65535', () => {
                data.virtualServers = [{ address: '192.0.2.12', addressTranslationPort: 65536 }];
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be <= 65535'));
            });
        });
    });

    describe('GSLBMonitor class', () => {
        describe('valid', () => {
            it('should validate minimal properties and fill in defaults for monitorType http', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'http'
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(
                    data,
                    {
                        class: 'GSLBMonitor',
                        monitorType: 'http',
                        target: '*:*',
                        interval: 30,
                        timeout: 120,
                        probeTimeout: 5,
                        ignoreDownResponseEnabled: false,
                        transparent: false,
                        reverseEnabled: false,
                        send: 'HEAD / HTTP/1.0\\r\\n\\r\\n',
                        receive: 'HTTP/1.'
                    }
                );
            });

            it('should validate all properties for monitorType http', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'http',
                    target: '10.1.1.2:8080',
                    interval: 100,
                    timeout: 1000,
                    probeTimeout: 50,
                    ignoreDownResponseEnabled: true,
                    transparent: true,
                    reverseEnabled: true,
                    send: 'example send string',
                    receive: 'example receive string'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal properties and fill in defaults for monitorType https', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'https'
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(
                    data,
                    {
                        class: 'GSLBMonitor',
                        monitorType: 'https',
                        target: '*:*',
                        interval: 30,
                        timeout: 120,
                        probeTimeout: 5,
                        ignoreDownResponseEnabled: false,
                        transparent: false,
                        reverseEnabled: false,
                        send: 'HEAD / HTTP/1.0\\r\\n\\r\\n',
                        receive: 'HTTP/1.',
                        ciphers: 'DEFAULT'
                    }
                );
            });

            it('should validate all properties for monitorType https', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'http',
                    target: '10.1.1.2:8080',
                    interval: 100,
                    timeout: 1000,
                    probeTimeout: 50,
                    ignoreDownResponseEnabled: true,
                    transparent: true,
                    reverseEnabled: true,
                    send: 'example send string',
                    receive: 'example receive string',
                    ciphers: 'example ciphers',
                    clientCertificate: '/Common/cert'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal properties and fill in defaults for monitorType gateway-icmp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'gateway-icmp'
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(
                    data,
                    {
                        class: 'GSLBMonitor',
                        monitorType: 'gateway-icmp',
                        target: '*:*',
                        interval: 30,
                        timeout: 120,
                        probeTimeout: 5,
                        ignoreDownResponseEnabled: false,
                        transparent: false,
                        probeInterval: 1,
                        probeAttempts: 3
                    }
                );
            });

            it('should validate all properties for monitorType gateway-icmp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'gateway-icmp',
                    target: '10.1.1.2:8080',
                    interval: 100,
                    timeout: 1000,
                    probeTimeout: 50,
                    ignoreDownResponseEnabled: true,
                    transparent: true,
                    probeInterval: 10,
                    probeAttempts: 15
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal properties and fill in defaults for monitorType tcp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'tcp'
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(
                    data,
                    {
                        class: 'GSLBMonitor',
                        monitorType: 'tcp',
                        target: '*:*',
                        interval: 30,
                        timeout: 120,
                        probeTimeout: 5,
                        ignoreDownResponseEnabled: false,
                        transparent: false,
                        reverseEnabled: false,
                        send: '',
                        receive: ''
                    }
                );
            });

            it('should validate all properties for monitorType tcp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'tcp',
                    target: '10.1.1.2:8080',
                    interval: 100,
                    timeout: 1000,
                    probeTimeout: 50,
                    ignoreDownResponseEnabled: true,
                    transparent: true,
                    reverseEnabled: true,
                    send: 'example send string',
                    receive: 'example receive string'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal properties and fill in defaults for monitorType udp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'udp'
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(
                    data,
                    {
                        class: 'GSLBMonitor',
                        monitorType: 'udp',
                        target: '*:*',
                        interval: 30,
                        timeout: 120,
                        probeTimeout: 5,
                        ignoreDownResponseEnabled: false,
                        transparent: false,
                        reverseEnabled: false,
                        debugEnabled: false,
                        probeInterval: 1,
                        probeAttempts: 3,
                        send: 'default send string',
                        receive: ''
                    }
                );
            });

            it('should validate all properties for monitorType udp', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'udp',
                    target: '10.1.1.2:8080',
                    interval: 100,
                    timeout: 1000,
                    probeTimeout: 50,
                    ignoreDownResponseEnabled: true,
                    transparent: true,
                    reverseEnabled: true,
                    send: 'example send string',
                    receive: 'example receive string',
                    probeInterval: 10,
                    probeAttempts: 5,
                    debugEnabled: true
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate if monitorType is improperly set', () => {
                const data = {
                    class: 'GSLBMonitor',
                    monitorType: 'BAD_TYPE'
                };
                assert.strictEqual(validate(data), false);
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'), -1
                );
            });

            it('should invalidate if monitorType is missing', () => {
                const data = {
                    class: 'GSLBMonitor'
                };
                assert.strictEqual(validate(data), false);
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'monitorType\''), -1
                );
            });
        });
    });

    describe('GSLBProberPool class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: 'GSLBProberPool'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal member properties', () => {
                const data = {
                    class: 'GSLBProberPool',
                    members: [
                        {
                            server: '/Common/gslbServer1'
                        },
                        {
                            server: 'gslbServer2'
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: 'GSLBProberPool',
                    label: 'this is a test',
                    remark: 'description',
                    enabled: false,
                    lbMode: 'round-robin',
                    members: [
                        {
                            server: '/Common/gslbServer1',
                            label: 'this is a member test 1',
                            remark: 'member description 1',
                            enabled: false
                        },
                        {
                            server: 'gslbServer2',
                            label: 'this is a member test 2',
                            remark: 'member description 2',
                            enabled: true
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            let data;

            beforeEach(() => {
                data = {
                    class: 'GSLBProberPool',
                    members: [{
                        server: '/Common/gslbServer1'
                    }]
                };
            });

            it('should invalidate invalid lbMode value', () => {
                data.lbMode = 'badValue';
                assert.strictEqual(validate(data), false);
                assert(getErrorString().includes('should be equal to one of the allowed values'));
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
