/**
 * Copyright 2020 F5 Networks, Inc.
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
    let pathsSent;
    let dataSent;

    beforeEach(() => {
        pathsSent = [];
        dataSent = [];
        bigIpMock = {
            modify(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            },
            createOrModify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
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
                    assert.deepStrictEqual(
                        dataSent[0],
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

            const gslbHandler = new GSLBHandler(declaration, bigIpMock);
            return gslbHandler.process()
                .then(() => {
                    const dataCenter = dataSent[PATHS.GSLBDataCenter];
                    assert.deepStrictEqual(
                        dataCenter[0],
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
                        dataCenter[1],
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
                                    name: '0',
                                    addresses: [{
                                        name: '10.0.0.1',
                                        translation: 'none'
                                    }]
                                }
                            ],
                            exposeRouteDomainsEnabled: false,
                            virtualServerDiscoveryMode: 'disabled'
                        },
                        gslbServer2: {
                            name: 'gslbServer2',
                            remark: 'test description',
                            enabled: false,
                            serverType: 'generic-host',
                            proberPreferred: 'inside-datacenter',
                            proberFallback: 'any-available',
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
                                    name: '0',
                                    remark: 'test device description',
                                    addresses: [{
                                        name: '10.0.0.1',
                                        translation: '192.0.2.12'
                                    }]
                                }
                            ],
                            exposeRouteDomainsEnabled: true,
                            virtualServerDiscoveryMode: 'enabled'
                        }
                    }
                }
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock);
            return gslbHandler.process()
                .then(() => {
                    const gslbServer = dataSent[PATHS.GSLBServer];
                    assert.deepStrictEqual(
                        gslbServer[0],
                        {
                            name: 'gslbServer1',
                            description: 'none',
                            enabled: true,
                            disabled: false,
                            product: 'bigip',
                            proberPreference: 'inherit',
                            proberFallback: 'inherit',
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
                            virtualServerDiscovery: 'disabled'
                        }
                    );
                    assert.deepStrictEqual(
                        gslbServer[1],
                        {
                            name: 'gslbServer2',
                            description: 'test description',
                            enabled: false,
                            disabled: true,
                            product: 'generic-host',
                            proberPreference: 'inside-datacenter',
                            proberFallback: 'any-available',
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
                            virtualServerDiscovery: 'enabled'
                        }
                    );
                });
        });
    });
});
