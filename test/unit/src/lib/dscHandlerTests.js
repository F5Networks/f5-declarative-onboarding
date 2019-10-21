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

const dns = require('dns');
const sinon = require('sinon');

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

const PATHS = require('../../../../src/lib/sharedConstants').PATHS;

const doUtil = require('../../../../src/lib/doUtil');
const DscHandler = require('../../../../src/lib/dscHandler');

describe('dscHandler', () => {
    const hostname = 'my.bigip.com';

    let bigIpMock;

    beforeEach(() => {
        sinon.stub(dns, 'lookup').callsArg(1);
        bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname });
            }
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('configSyncIp', () => {
        let configSyncIpSent;

        beforeEach(() => {
            bigIpMock.cluster = {
                configSyncIp(configSyncIp) {
                    configSyncIpSent = configSyncIp;
                    return Promise.resolve();
                }
            };
        });

        it('should send config sync IP', () => {
            const declaration = {
                Common: {
                    ConfigSync: {
                        configsyncIp: '1.2.3.4'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(configSyncIpSent, '1.2.3.4');
                });
        });

        it('should strip CIDR', () => {
            const declaration = {
                Common: {
                    ConfigSync: {
                        configsyncIp: '1.2.3.4/24'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(configSyncIpSent, '1.2.3.4');
                });
        });

        it('should send "none" to disable config sync', () => {
            const declaration = {
                Common: {
                    ConfigSync: {
                        configsyncIp: 'none'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(configSyncIpSent, 'none');
                });
        });

        it('should send "none" when configsyncIp not defined', () => {
            const declaration = {
                Common: {
                    ConfigSync: {}
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(configSyncIpSent, 'none');
                });
        });
    });

    describe('failoverUnicast', () => {
        const address = '1.2.3.4';
        const port = 1234;

        let pathSent;
        let bodySent;

        beforeEach(() => {
            bigIpMock.modify = (path, body) => {
                pathSent = path;
                bodySent = body;
            };
        });

        it('should send unicast data to device name', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        address,
                        port
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.unicastAddress[0].ip, '1.2.3.4');
                    assert.strictEqual(bodySent.unicastAddress[0].port, 1234);
                });
        });

        it('should strip CIDR from address', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        address: `${address}/24`,
                        port
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(bodySent.unicastAddress[0].ip, '1.2.3.4');
                });
        });
    });

    describe('deviceTrust', () => {
        let getBigIpOptions;
        let addToTrustHost;
        let syncCompleteCalled;

        beforeEach(() => {
            getBigIpOptions = undefined;
            sinon.stub(cloudUtil, 'MEDIUM_RETRY').value(cloudUtil.NO_RETRY);
            sinon.stub(doUtil, 'getBigIp').callsFake((logger, options) => {
                getBigIpOptions = options;
                return Promise.resolve(bigIpMock);
            });

            addToTrustHost = undefined;
            syncCompleteCalled = false;
            bigIpMock.cluster = {
                addToTrust(host) {
                    addToTrustHost = host;
                    return Promise.resolve();
                },
                syncComplete() {
                    syncCompleteCalled = true;
                    return Promise.resolve();
                }
            };
        });

        it('should request remote big ip to add to trust if we are not the remote', () => {
            const declaration = {
                Common: {
                    DeviceTrust: {
                        localUsername: 'admin',
                        localPassword: 'pass1word',
                        remoteHost: 'someOtherHost',
                        remoteUsername: 'admin',
                        remotePassword: 'pass2word'
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve([]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(getBigIpOptions.host, 'someOtherHost');
                    assert.strictEqual(getBigIpOptions.user, 'admin');
                    assert.strictEqual(getBigIpOptions.password, 'pass2word');
                    assert.strictEqual(addToTrustHost, 'my.bigip.com');
                    assert.strictEqual(syncCompleteCalled, true);
                });
        });

        it('should not request remote big ip to add to trust if we are the remote based on hostname', () => {
            const declaration = {
                Common: {
                    DeviceTrust: {
                        localUsername: 'admin',
                        localPassword: 'pass1word',
                        remoteHost: hostname,
                        remoteUsername: 'admin',
                        remotePassword: 'pass2word'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(getBigIpOptions, undefined);
                    assert.strictEqual(addToTrustHost, undefined);
                    assert.strictEqual(syncCompleteCalled, false);
                });
        });

        it('should not request remote big ip to add to trust if we are the remote based on self ip', () => {
            const declaration = {
                Common: {
                    DeviceTrust: {
                        localUsername: 'admin',
                        localPassword: 'pass1word',
                        remoteHost: '10.10.0.1',
                        remoteUsername: 'admin',
                        remotePassword: 'pass2word'
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve(
                        [
                            {
                                address: `${declaration.Common.DeviceTrust.remoteHost}/24`
                            }
                        ]
                    );
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(getBigIpOptions, undefined);
                    assert.strictEqual(addToTrustHost, undefined);
                    assert.strictEqual(syncCompleteCalled, false);
                });
        });

        it('should reject with an invalid remoteHost and we are not the remote', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').callsArgWith(1, new Error());
            const testCase = 'example.cant';
            const declaration = {
                Common: {
                    DeviceTrust: {
                        localUsername: 'admin',
                        localPassword: 'pass1word',
                        remoteHost: testCase,
                        remoteUsername: 'admin',
                        remotePassword: 'pass2word'
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve([]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return assert.isRejected(dscHandler.process(), 'Unable to resolve host example.cant');
        });
    });

    describe('deviceGroup', () => {
        const devices = ['device1'];

        let deviceGroupNameSent;
        let addToDeviceGroupNameSent;
        let devicesSent;
        let joinClusterCalled;
        let syncCalled;
        let syncCompleteCalled;
        let removeDeviceNames;
        let removeDeviceGroup;
        let removeFromDeviceGroupCalled;
        let syncCompleteConnectedDevices;
        let deviceList;

        beforeEach(() => {
            deviceGroupNameSent = undefined;
            addToDeviceGroupNameSent = undefined;
            joinClusterCalled = false;
            syncCalled = false;
            syncCompleteCalled = false;
            removeDeviceNames = undefined;
            removeDeviceGroup = undefined;
            removeFromDeviceGroupCalled = false;
            syncCompleteConnectedDevices = undefined;
            deviceList = [
                { name: 'bigip1.example.com' },
                { name: 'bigip2.example.com' },
                { name: 'remove.example.com' }
            ];
            bigIpMock.cluster = {
                areInTrustGroup() {
                    return Promise.resolve(devices);
                },
                createDeviceGroup(deviceGroup, type, devicesToAdd) {
                    devicesSent = devicesToAdd.slice();
                    deviceGroupNameSent = deviceGroup;
                    return Promise.resolve();
                },
                sync() {
                    syncCalled = true;
                    return Promise.resolve();
                },
                syncComplete(retryOptions, options) {
                    syncCompleteCalled = true;
                    syncCompleteConnectedDevices = options.connectedDevices;
                    return Promise.resolve();
                },
                hasDeviceGroup(deviceGroup) {
                    return Promise.resolve(deviceGroup === 'failoverGroup');
                },
                addToDeviceGroup(aHostname, deviceGroupName) {
                    addToDeviceGroupNameSent = deviceGroupName;
                    return Promise.resolve();
                },
                joinCluster(deviceGroupName) {
                    addToDeviceGroupNameSent = deviceGroupName;
                    joinClusterCalled = true;
                    return Promise.resolve();
                },
                removeFromDeviceGroup(deviceNames, deviceGroup) {
                    removeDeviceNames = deviceNames;
                    removeDeviceGroup = deviceGroup;
                    removeFromDeviceGroupCalled = true;
                    return Promise.resolve();
                },
                getCmSyncStatus() {
                    return Promise.resolve({ connected: [], disconnected: [] });
                }
            };
            bigIpMock.list = (path) => {
                if (path === `${PATHS.DeviceGroup}/~Common~failoverGroup/devices`) {
                    return Promise.resolve(deviceList);
                }
                return Promise.reject(new Error('Unexpected path'));
            };
            sinon.stub(cloudUtil, 'MEDIUM_RETRY').value(cloudUtil.NO_RETRY);
        });

        it('should handle device groups with no members', () => {
            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            owner: hostname
                        }
                    }
                }
            };
            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(removeFromDeviceGroupCalled, false,
                        'Should not call removeFromDeviceGroup');
                });
        });

        it('should create the device group if we are the owner with no device trust section', () => {
            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: hostname
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(deviceGroupNameSent, 'failoverGroup');
                    assert.deepEqual(devicesSent, ['device1']);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, ['remove.example.com'],
                        'Should remove old device');
                    assert.strictEqual(removeDeviceGroup, 'failoverGroup',
                        'Should remove old device from device group');
                    assert.strictEqual(syncCalled, true);
                    assert.strictEqual(syncCompleteCalled, true);
                    assert.deepStrictEqual(syncCompleteConnectedDevices,
                        ['bigip1.example.com', 'bigip2.example.com']);
                });
        });

        it('should create the device group if we are the owner with device trust section', () => {
            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: hostname
                        }
                    },
                    DeviceTrust: {
                        remoteHost: hostname
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(deviceGroupNameSent, 'failoverGroup');
                    assert.deepEqual(devicesSent, ['device1']);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, ['remove.example.com'],
                        'Should remove old device');
                    assert.strictEqual(removeDeviceGroup, 'failoverGroup',
                        'Should remove old device from device group');
                    assert.strictEqual(syncCalled, true);
                    assert.strictEqual(syncCompleteCalled, true);
                    assert.deepStrictEqual(syncCompleteConnectedDevices,
                        ['bigip1.example.com', 'bigip2.example.com']);
                });
        });

        it('should not call sync if no devices are in the device trust or need to be pruned', () => {
            bigIpMock.cluster.areInTrustGroup = () => Promise.resolve([]);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: hostname
                        }
                    }
                }
            };

            deviceList = [];

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(removeFromDeviceGroupCalled, false,
                        'Should not call removeFromDeviceGroup');
                    assert.strictEqual(syncCalled, false);
                });
        });

        it('should reject if the remoteHost has an invalid hostname', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').callsArgWith(1, new Error());
            const testCase = 'example.cant';

            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: '10.20.30.40'
                        }
                    },
                    DeviceTrust: {
                        remoteHost: testCase
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve([]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return assert.isRejected(dscHandler.process(), 'Unable to resolve host example.cant');
        });

        it('should join device group if we are not the owner and we have DeviceGroup and DeviceTrust', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: 'someOtherHost'
                        }
                    },
                    DeviceTrust: {
                        remoteHost: 'someOtherHost'
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve([]);
                }
                if (path === `${PATHS.DeviceGroup}/~Common~failoverGroup/devices`) {
                    return Promise.resolve(deviceList);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(addToDeviceGroupNameSent, 'failoverGroup');
                    assert.strictEqual(joinClusterCalled, true);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, ['remove.example.com'],
                        'Should remove old device');
                    assert.strictEqual(removeDeviceGroup, 'failoverGroup',
                        'Should remove old device from device group');
                });
        });

        it('should join device group if we are not the owner and we only have DeviceGroup', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: 'someOtherHost'
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(addToDeviceGroupNameSent, 'failoverGroup');
                    assert.strictEqual(joinClusterCalled, false);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, ['remove.example.com'],
                        'Should remove old device');
                    assert.strictEqual(removeDeviceGroup, 'failoverGroup',
                        'Should remove old device from device group');
                });
        });

        it('should handle device group not existing on remote', () => {
            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['bigip1.example.com', 'bigip2.example.com'],
                            owner: 'someOtherHost'
                        }
                    },
                    DeviceTrust: {
                        remoteHost: 'someOtherHost'
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === PATHS.SelfIp) {
                    return Promise.resolve([]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const errorMessage = 'group does not exist';
            bigIpMock.cluster.joinCluster = () => Promise.reject(new Error(errorMessage));

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return assert.isRejected(dscHandler.process(), 'group does not exist');
        });
    });
});
