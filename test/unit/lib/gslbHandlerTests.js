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

const GSLBHandler = require('../../../src/lib/gslbHandler');
const PATHS = require('../../../src/lib/sharedConstants').PATHS;

describe('gslbHandler', () => {
    let bigIpMock;
    let dataSent;
    let state;
    let transactionCount;

    beforeEach(() => {
        dataSent = [];
        transactionCount = 0;
        bigIpMock = {
            modify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            create(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            createOrModify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            transaction(commands) {
                let promise = Promise.resolve();
                transactionCount += 1;
                commands.forEach((command) => {
                    if (command.method === 'create') {
                        promise = promise.then(() => this.create(command.path, command.body));
                    } else if (command.method === 'modify') {
                        promise = promise.then(() => this.modify(command.path, command.body));
                    } else if (command.method === 'delete') {
                        promise = promise.then(() => this.delete(command.path));
                    } else {
                        promise = promise.then(() => {
                            throw new Error(`Unrecognized command method: ${command.method}`);
                        });
                    }
                });
                return promise;
            }
        };

        state = {
            currentConfig: {
                Common: {}
            }
        };
    });

    describe('GSLB global-settings', () => {
        it('should handle GSLB global-settings', () => {
            const declaration = {
                Common: {
                    GSLBGlobals: {
                        general: {
                            synchronizationEnabled: true,
                            synchronizationGroupName: 'newGroupName',
                            synchronizationTimeTolerance: 123,
                            synchronizationTimeout: 100
                        }
                    }
                }
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock);
            return gslbHandler.process()
                .then(() => {
                    const general = dataSent[PATHS.GSLBGeneral];
                    assert.strictEqual(transactionCount, 0, 'should not have used a transaction');
                    assert.deepStrictEqual(
                        general[0],
                        {
                            synchronization: 'yes',
                            synchronizationGroupName: 'newGroupName',
                            synchronizationTimeTolerance: 123,
                            synchronizationTimeout: 100
                        }
                    );
                });
        });
    });

    describe('GSLBDataCenter', () => {
        it('should handle GSLBDataCenter', () => {
            const declaration = {
                Common: {
                    GSLBDataCenter: {
                        dataCenter0: {
                            name: 'dataCenter0',
                            contact: 'contact0',
                            enabled: true,
                            location: 'location0',
                            proberFallback: 'pool',
                            proberPool: '/Common/proberPool',
                            proberPreferred: 'pool'
                        },
                        dataCenter1: {
                            name: 'dataCenter1',
                            contact: 'contact1',
                            enabled: false,
                            location: 'location1',
                            proberFallback: 'outside-datacenter',
                            proberPreferred: 'any-available'
                        }
                    }
                }
            };

            state.currentConfig.Common.GSLBDataCenter = {
                dataCenter1: {}
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock, null, state);
            return gslbHandler.process()
                .then(() => {
                    assert.strictEqual(transactionCount, 1, 'should have used a transaction');
                    assert.deepStrictEqual(
                        dataSent[PATHS.GSLBDataCenter][0],
                        {
                            name: 'dataCenter0',
                            partition: 'Common',
                            contact: 'contact0',
                            enabled: true,
                            location: 'location0',
                            proberFallback: 'pool',
                            proberPool: '/Common/proberPool',
                            proberPreference: 'pool'
                        }
                    );
                    assert.deepStrictEqual(
                        dataSent[`${PATHS.GSLBDataCenter}/~Common~dataCenter1`][0],
                        {
                            name: 'dataCenter1',
                            partition: 'Common',
                            contact: 'contact1',
                            enabled: false,
                            location: 'location1',
                            proberFallback: 'outside-datacenter',
                            proberPreference: 'any-available'
                        }
                    );
                });
        });
    });

    describe('GSLBServer', () => {
        it('should handle GSLBServer', () => {
            const declaration = {
                Common: {
                    GSLBServer: {
                        gslbServer1: {
                            name: 'gslbServer1',
                            enabled: true,
                            serverType: 'bigip',
                            proberPreferred: 'inherit',
                            proberFallback: 'inherit',
                            bpsLimit: 0,
                            bpsLimitEnabled: false,
                            ppsLimit: 0,
                            ppsLimitEnabled: false,
                            connectionsLimit: 0,
                            connectionsLimitEnabled: false,
                            cpuUsageLimit: 0,
                            cpuUsageLimitEnabled: false,
                            memoryLimit: 0,
                            memoryLimitEnabled: false,
                            serviceCheckProbeEnabled: true,
                            pathProbeEnabled: true,
                            snmpProbeEnabled: true,
                            dataCenter: 'gslbDataCenter',
                            devices: [
                                {
                                    address: '10.0.0.1',
                                    addressTranslation: 'none'
                                }
                            ],
                            exposeRouteDomainsEnabled: false,
                            virtualServerDiscoveryMode: 'disabled',
                            monitors: [
                                '/Common/GSLBmonitor',
                                '/Common/otherMonitor'
                            ],
                            virtualServers: [
                                {
                                    name: '0',
                                    enabled: true,
                                    address: '10.0.20.1',
                                    port: 0,
                                    addressTranslationPort: 0,
                                    monitors: []
                                }
                            ]
                        },
                        gslbServer2: {
                            name: 'gslbServer2',
                            remark: 'test description',
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
                                    remark: 'test device description',
                                    address: '10.0.0.1',
                                    addressTranslation: '192.0.2.12'
                                }
                            ],
                            exposeRouteDomainsEnabled: true,
                            virtualServerDiscoveryMode: 'enabled',
                            monitors: [],
                            virtualServers: [
                                {
                                    name: 'testVirtualServer',
                                    remark: 'test virtual server description',
                                    enabled: false,
                                    address: 'a989:1c34:9c::b099:c1c7:8bfe',
                                    port: 8080,
                                    addressTranslation: '1:0:1::',
                                    addressTranslationPort: 80,
                                    monitors: [
                                        '/Common/tcp',
                                        '/Common/http'
                                    ]
                                }
                            ]
                        },
                        gslbServer3: {
                            name: 'gslbServer3',
                            enabled: true,
                            serverType: 'bigip',
                            proberPreferred: 'inherit',
                            proberFallback: 'inherit',
                            proberPool: 'none',
                            bpsLimit: 0,
                            bpsLimitEnabled: false,
                            ppsLimit: 0,
                            ppsLimitEnabled: false,
                            connectionsLimit: 0,
                            connectionsLimitEnabled: false,
                            cpuUsageLimit: 0,
                            cpuUsageLimitEnabled: false,
                            memoryLimit: 0,
                            memoryLimitEnabled: false,
                            serviceCheckProbeEnabled: true,
                            pathProbeEnabled: true,
                            snmpProbeEnabled: true,
                            dataCenter: 'gslbDataCenter',
                            devices: [
                                {
                                    address: '10.0.0.1',
                                    addressTranslation: 'none'
                                }
                            ],
                            exposeRouteDomainsEnabled: false,
                            virtualServerDiscoveryMode: 'disabled',
                            monitors: ['/Common/bigip'],
                            virtualServers: []
                        }
                    }
                }
            };

            state.currentConfig.Common.GSLBServer = {
                gslbServer2: {}
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock, null, state);
            return gslbHandler.process()
                .then(() => {
                    assert.strictEqual(transactionCount, 1, 'should have used a transaction');
                    assert.deepStrictEqual(
                        dataSent[PATHS.GSLBServer][0],
                        {
                            name: 'gslbServer1',
                            description: 'none',
                            enabled: true,
                            disabled: false,
                            product: 'bigip',
                            proberPreference: 'inherit',
                            proberFallback: 'inherit',
                            proberPool: 'none',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitCpuUsage: 0,
                            limitCpuUsageStatus: 'disabled',
                            limitMemAvail: 0,
                            limitMemAvailStatus: 'disabled',
                            iqAllowServiceCheck: 'yes',
                            iqAllowPath: 'yes',
                            iqAllowSnmp: 'yes',
                            datacenter: 'gslbDataCenter',
                            devices: [
                                {
                                    name: '0',
                                    description: 'none',
                                    addresses: [{
                                        name: '10.0.0.1',
                                        translation: 'none'
                                    }]
                                }
                            ],
                            exposeRouteDomains: 'no',
                            virtualServerDiscovery: 'disabled',
                            monitor: '/Common/GSLBmonitor and /Common/otherMonitor',
                            virtualServers: [
                                {
                                    name: '0',
                                    description: 'none',
                                    enabled: true,
                                    disabled: false,
                                    destination: '10.0.20.1:0',
                                    translationAddress: 'none',
                                    translationPort: 0,
                                    monitor: ''
                                }
                            ]
                        }
                    );
                    assert.deepStrictEqual(
                        dataSent[`${PATHS.GSLBServer}/~Common~gslbServer2`][0],
                        {
                            name: 'gslbServer2',
                            description: 'test description',
                            enabled: false,
                            disabled: true,
                            product: 'generic-host',
                            proberPreference: 'pool',
                            proberFallback: 'any-available',
                            proberPool: 'gslbProberPool',
                            limitMaxBps: 50,
                            limitMaxBpsStatus: 'enabled',
                            limitMaxPps: 60,
                            limitMaxPpsStatus: 'enabled',
                            limitMaxConnections: 70,
                            limitMaxConnectionsStatus: 'enabled',
                            limitCpuUsage: 10,
                            limitCpuUsageStatus: 'enabled',
                            limitMemAvail: 12,
                            limitMemAvailStatus: 'enabled',
                            iqAllowServiceCheck: 'no',
                            iqAllowPath: 'no',
                            iqAllowSnmp: 'no',
                            datacenter: 'gslbDataCenter',
                            devices: [
                                {
                                    name: '0',
                                    description: 'test device description',
                                    addresses: [{
                                        name: '10.0.0.1',
                                        translation: '192.0.2.12'
                                    }]
                                }
                            ],
                            exposeRouteDomains: 'yes',
                            virtualServerDiscovery: 'enabled',
                            monitor: '',
                            virtualServers: [
                                {
                                    name: 'testVirtualServer',
                                    description: 'test virtual server description',
                                    enabled: false,
                                    disabled: true,
                                    destination: 'a989:1c34:9c::b099:c1c7:8bfe.8080',
                                    translationAddress: '1:0:1::',
                                    translationPort: 80,
                                    monitor: '/Common/tcp and /Common/http'
                                }
                            ]
                        }
                    );
                    assert.deepStrictEqual(
                        dataSent[PATHS.GSLBServer][1],
                        {
                            name: 'gslbServer3',
                            description: 'none',
                            enabled: true,
                            disabled: false,
                            product: 'bigip',
                            proberPreference: 'inherit',
                            proberFallback: 'inherit',
                            proberPool: 'none',
                            limitMaxBps: 0,
                            limitMaxBpsStatus: 'disabled',
                            limitMaxPps: 0,
                            limitMaxPpsStatus: 'disabled',
                            limitMaxConnections: 0,
                            limitMaxConnectionsStatus: 'disabled',
                            limitCpuUsage: 0,
                            limitCpuUsageStatus: 'disabled',
                            limitMemAvail: 0,
                            limitMemAvailStatus: 'disabled',
                            iqAllowServiceCheck: 'yes',
                            iqAllowPath: 'yes',
                            iqAllowSnmp: 'yes',
                            datacenter: 'gslbDataCenter',
                            devices: [
                                {
                                    name: '0',
                                    description: 'none',
                                    addresses: [{
                                        name: '10.0.0.1',
                                        translation: 'none'
                                    }]
                                }
                            ],
                            exposeRouteDomains: 'no',
                            virtualServerDiscovery: 'disabled',
                            monitor: '/Common/bigip',
                            virtualServers: []
                        }
                    );
                });
        });
    });

    describe('GSLB monitor', () => {
        let declaration;

        beforeEach(() => {
            declaration = {
                Common: {
                    GSLBMonitor: {
                        gslbMonitor1: {
                            name: 'gslbMonitor1',
                            remark: 'description',
                            target: '1.1.1.1:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true
                        },
                        gslbMonitor2: {
                            name: 'gslbMonitor2',
                            target: '*:*',
                            interval: 30,
                            timeout: 120,
                            probeTimeout: 5,
                            ignoreDownResponseEnabled: false,
                            transparent: false
                        }
                    }
                }
            };
        });

        describe('http', () => {
            it('should handle GSLB monitor http', () => {
                declaration.Common.GSLBMonitor.gslbMonitor1.monitorType = 'http';
                declaration.Common.GSLBMonitor.gslbMonitor2.monitorType = 'http';
                declaration.Common.GSLBMonitor.gslbMonitor1.reverseEnabled = true;
                declaration.Common.GSLBMonitor.gslbMonitor1.send = 'HEAD / HTTP/1.0\\r\\n';
                declaration.Common.GSLBMonitor.gslbMonitor1.receive = 'HTTP';
                const gslbHandler = new GSLBHandler(declaration, bigIpMock);
                return gslbHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/http`][0],
                            {
                                name: 'gslbMonitor1',
                                description: 'description',
                                destination: '1.1.1.1:80',
                                interval: 100,
                                timeout: 1000,
                                probeTimeout: 110,
                                ignoreDownResponse: 'enabled',
                                transparent: 'enabled',
                                reverse: 'enabled',
                                send: 'HEAD / HTTP/1.0\\r\\n',
                                recv: 'HTTP'
                            }
                        );
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/http`][1],
                            {
                                name: 'gslbMonitor2',
                                description: 'none',
                                destination: '*:*',
                                interval: 30,
                                timeout: 120,
                                probeTimeout: 5,
                                ignoreDownResponse: 'disabled',
                                transparent: 'disabled',
                                reverse: 'disabled',
                                send: 'none',
                                recv: 'none'
                            }
                        );
                    });
            });
        });

        describe('https', () => {
            it('should handle GSLB monitor https', () => {
                declaration.Common.GSLBMonitor.gslbMonitor1.monitorType = 'https';
                declaration.Common.GSLBMonitor.gslbMonitor2.monitorType = 'https';
                declaration.Common.GSLBMonitor.gslbMonitor1.ciphers = 'DEFAULT';
                declaration.Common.GSLBMonitor.gslbMonitor1.clientCertificate = '/Common/default.crt';
                declaration.Common.GSLBMonitor.gslbMonitor1.send = 'HEAD / HTTP/1.0\\r\\n';
                declaration.Common.GSLBMonitor.gslbMonitor1.receive = 'HTTP';
                declaration.Common.GSLBMonitor.gslbMonitor1.reverseEnabled = true;
                const gslbHandler = new GSLBHandler(declaration, bigIpMock);
                return gslbHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/https`][0],
                            {
                                name: 'gslbMonitor1',
                                description: 'description',
                                destination: '1.1.1.1:80',
                                interval: 100,
                                timeout: 1000,
                                probeTimeout: 110,
                                ignoreDownResponse: 'enabled',
                                transparent: 'enabled',
                                cipherlist: 'DEFAULT',
                                cert: '/Common/default.crt',
                                reverse: 'enabled',
                                send: 'HEAD / HTTP/1.0\\r\\n',
                                recv: 'HTTP'
                            }
                        );
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/https`][1],
                            {
                                name: 'gslbMonitor2',
                                description: 'none',
                                destination: '*:*',
                                interval: 30,
                                timeout: 120,
                                probeTimeout: 5,
                                ignoreDownResponse: 'disabled',
                                transparent: 'disabled',
                                cipherlist: 'none',
                                cert: 'none',
                                reverse: 'disabled',
                                send: 'none',
                                recv: 'none'
                            }
                        );
                    });
            });
        });

        describe('gateway-icmp', () => {
            it('should handle GSLB monitor gateway-icmp', () => {
                declaration.Common.GSLBMonitor.gslbMonitor1.monitorType = 'gateway-icmp';
                declaration.Common.GSLBMonitor.gslbMonitor2.monitorType = 'gateway-icmp';
                declaration.Common.GSLBMonitor.gslbMonitor1.probeInterval = 5;
                declaration.Common.GSLBMonitor.gslbMonitor1.probeAttempts = 3;
                declaration.Common.GSLBMonitor.gslbMonitor2.probeInterval = 15;
                declaration.Common.GSLBMonitor.gslbMonitor2.probeAttempts = 5;
                const gslbHandler = new GSLBHandler(declaration, bigIpMock);
                return gslbHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/gateway-icmp`][0],
                            {
                                name: 'gslbMonitor1',
                                description: 'description',
                                destination: '1.1.1.1:80',
                                interval: 100,
                                timeout: 1000,
                                probeTimeout: 110,
                                ignoreDownResponse: 'enabled',
                                transparent: 'enabled',
                                probeInterval: 5,
                                probeAttempts: 3
                            }
                        );
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/gateway-icmp`][1],
                            {
                                name: 'gslbMonitor2',
                                description: 'none',
                                destination: '*:*',
                                interval: 30,
                                timeout: 120,
                                probeTimeout: 5,
                                ignoreDownResponse: 'disabled',
                                transparent: 'disabled',
                                probeInterval: 15,
                                probeAttempts: 5
                            }
                        );
                    });
            });
        });

        describe('tcp', () => {
            it('should handle GSLB monitor tcp', () => {
                declaration.Common.GSLBMonitor.gslbMonitor1.monitorType = 'tcp';
                declaration.Common.GSLBMonitor.gslbMonitor2.monitorType = 'tcp';
                declaration.Common.GSLBMonitor.gslbMonitor1.reverseEnabled = true;
                declaration.Common.GSLBMonitor.gslbMonitor1.send = 'example send';
                declaration.Common.GSLBMonitor.gslbMonitor1.receive = 'example receive';
                const gslbHandler = new GSLBHandler(declaration, bigIpMock);
                return gslbHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/tcp`][0],
                            {
                                name: 'gslbMonitor1',
                                description: 'description',
                                destination: '1.1.1.1:80',
                                interval: 100,
                                timeout: 1000,
                                probeTimeout: 110,
                                ignoreDownResponse: 'enabled',
                                transparent: 'enabled',
                                reverse: 'enabled',
                                send: 'example send',
                                recv: 'example receive'
                            }
                        );
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/tcp`][1],
                            {
                                name: 'gslbMonitor2',
                                description: 'none',
                                destination: '*:*',
                                interval: 30,
                                timeout: 120,
                                probeTimeout: 5,
                                ignoreDownResponse: 'disabled',
                                transparent: 'disabled',
                                reverse: 'disabled',
                                send: 'none',
                                recv: 'none'
                            }
                        );
                    });
            });
        });

        describe('udp', () => {
            it('should handle GSLB monitor udp', () => {
                declaration.Common.GSLBMonitor.gslbMonitor1.monitorType = 'udp';
                declaration.Common.GSLBMonitor.gslbMonitor2.monitorType = 'udp';
                declaration.Common.GSLBMonitor.gslbMonitor1.debugEnabled = true;
                declaration.Common.GSLBMonitor.gslbMonitor1.probeInterval = 5;
                declaration.Common.GSLBMonitor.gslbMonitor1.probeAttempts = 3;
                declaration.Common.GSLBMonitor.gslbMonitor1.send = 'default send string';
                declaration.Common.GSLBMonitor.gslbMonitor1.receive = 'example receive';
                declaration.Common.GSLBMonitor.gslbMonitor1.reverseEnabled = true;
                declaration.Common.GSLBMonitor.gslbMonitor2.probeInterval = 15;
                declaration.Common.GSLBMonitor.gslbMonitor2.probeAttempts = 5;
                const gslbHandler = new GSLBHandler(declaration, bigIpMock);
                return gslbHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/udp`][0],
                            {
                                name: 'gslbMonitor1',
                                description: 'description',
                                destination: '1.1.1.1:80',
                                interval: 100,
                                timeout: 1000,
                                probeTimeout: 110,
                                ignoreDownResponse: 'enabled',
                                transparent: 'enabled',
                                probeInterval: 5,
                                probeAttempts: 3,
                                debug: 'yes',
                                send: 'default send string',
                                recv: 'example receive',
                                reverse: 'enabled'
                            }
                        );
                        assert.deepStrictEqual(
                            dataSent[`${PATHS.GSLBMonitor}/udp`][1],
                            {
                                name: 'gslbMonitor2',
                                description: 'none',
                                destination: '*:*',
                                interval: 30,
                                timeout: 120,
                                probeTimeout: 5,
                                ignoreDownResponse: 'disabled',
                                transparent: 'disabled',
                                probeInterval: 15,
                                probeAttempts: 5,
                                debug: 'no',
                                send: 'none',
                                recv: 'none',
                                reverse: 'disabled'
                            }
                        );
                    });
            });
        });
    });

    describe('GSLBProberPool', () => {
        it('should handle GSLBProberPool', () => {
            const declaration = {
                Common: {
                    GSLBProberPool: {
                        gslbProberPool1: {
                            name: 'gslbProberPool1',
                            enabled: true,
                            lbMode: 'global-availability',
                            members: []
                        },
                        gslbProberPool2: {
                            name: 'gslbProberPool2',
                            enabled: true,
                            lbMode: 'global-availability',
                            members: [
                                {
                                    server: 'gslbServer1',
                                    enabled: true,
                                    order: 0
                                },
                                {
                                    server: 'gslbServer2',
                                    enabled: true,
                                    order: 1
                                }
                            ]
                        },
                        gslbProberPool3: {
                            name: 'gslbProberPool3',
                            remark: 'test description',
                            enabled: false,
                            lbMode: 'round-robin',
                            members: [{
                                server: 'gslbServer1',
                                remark: 'test member description',
                                enabled: false,
                                order: 0
                            }]
                        }
                    }
                }
            };

            state.currentConfig.Common.GSLBProberPool = {
                gslbProberPool3: {}
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock, null, state);
            return gslbHandler.process()
                .then(() => {
                    assert.strictEqual(transactionCount, 1, 'should have used a transaction');
                    assert.deepStrictEqual(
                        dataSent[PATHS.GSLBProberPool][0],
                        {
                            name: 'gslbProberPool1',
                            description: 'none',
                            enabled: true,
                            disabled: false,
                            loadBalancingMode: 'global-availability',
                            members: []
                        }
                    );
                    assert.deepStrictEqual(
                        dataSent[PATHS.GSLBProberPool][1],
                        {
                            name: 'gslbProberPool2',
                            description: 'none',
                            enabled: true,
                            disabled: false,
                            loadBalancingMode: 'global-availability',
                            members: [
                                {
                                    name: 'gslbServer1',
                                    description: 'none',
                                    enabled: true,
                                    disabled: false,
                                    order: 0
                                },
                                {
                                    name: 'gslbServer2',
                                    description: 'none',
                                    enabled: true,
                                    disabled: false,
                                    order: 1
                                }
                            ]
                        }
                    );
                    assert.deepStrictEqual(
                        dataSent[`${PATHS.GSLBProberPool}/~Common~gslbProberPool3`][0],
                        {
                            name: 'gslbProberPool3',
                            description: 'test description',
                            enabled: false,
                            disabled: true,
                            loadBalancingMode: 'round-robin',
                            members: [{
                                name: 'gslbServer1',
                                description: 'test member description',
                                enabled: false,
                                disabled: true,
                                order: 0
                            }]
                        }
                    );
                });
        });
    });
});
