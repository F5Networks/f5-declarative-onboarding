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

const sinon = require('sinon');

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

const PATHS = require('../../../src/lib/sharedConstants').PATHS;

const doUtil = require('../../../src/lib/doUtil');
const DscHandler = require('../../../src/lib/dscHandler');

describe('dscHandler', () => {
    const hostname = 'my.bigip.com';

    let bigIpMock;

    beforeEach(() => {
        sinon.stub(doUtil, 'checkDnsResolution').resolves();
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

    describe('FailoverUnicast', () => {
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

        it('should process a FailoverUnicast with unicastAddress', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        unicastAddress: [
                            { ip: `${address}/24`, port },
                            { ip: '5.6.7.8', port: 3456 }
                        ]
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.deepStrictEqual(bodySent.unicastAddress,
                        [
                            { ip: '1.2.3.4', port: 1234 },
                            { ip: '5.6.7.8', port: 3456 }
                        ]);
                });
        });

        it('should strip CIDR from unicastAddress.address', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        unicastAddress: [
                            {
                                ip: `${address}/24`,
                                port
                            }
                        ]
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(bodySent.unicastAddress[0].ip, '1.2.3.4');
                });
        });


        it('should return none if no address is provided', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(bodySent.unicastAddress, 'none');
                });
        });

        it('should return none if unicastAddress is none', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        unicastAddress: 'none'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(bodySent.unicastAddress, 'none');
                });
        });

        it('should handle a single unicast address', () => {
            const declaration = {
                Common: {
                    FailoverUnicast: {
                        unicastAddress: [
                            {
                                ip: '224.0.0.100',
                                port: 1026
                            }
                        ]
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        bodySent.unicastAddress,
                        [
                            {
                                port: 1026,
                                ip: '224.0.0.100'
                            }
                        ]
                    );
                });
        });
    });

    describe('FailoverMulticast', () => {
        let pathSent;
        let bodySent;

        beforeEach(() => {
            bigIpMock.modify = (path, body) => {
                pathSent = path;
                bodySent = body;
            };
        });

        it('should handle a FailoverMulticast', () => {
            const declaration = {
                Common: {
                    FailoverMulticast: {
                        multicastInterface: 'exampleInterface',
                        multicastIp: '1.2.3.4',
                        multicastPort: 765
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(bodySent, {
                        multicastInterface: 'exampleInterface',
                        multicastIp: '1.2.3.4',
                        multicastPort: 765
                    });
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                });
        });

        it('should apply FailoverMulticast defaults', () => {
            const declaration = {
                Common: {
                    FailoverMulticast: {
                        multicastInterface: 'none'
                    }
                }
            };
            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        bodySent,
                        {
                            multicastInterface: 'none',
                            multicastIp: undefined,
                            multicastPort: undefined
                        }
                    );
                });
        });
    });

    describe('MirrorIp', () => {
        let pathSent;
        let bodySent;
        beforeEach(() => {
            bigIpMock.modify = (path, body) => {
                bodySent = body;
                pathSent = path;
            };
        });

        it('should set mirror ip with defaults', () => {
            const declaration = {
                Common: {
                    MirrorIp: {
                        mirrorIp: 'any6',
                        mirrorSecondaryIp: 'any6'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.mirrorIp, 'any6');
                    assert.strictEqual(bodySent.mirrorSecondaryIp, 'any6');
                });
        });

        it('should set a primary mirror ip', () => {
            const declaration = {
                Common: {
                    MirrorIp: {
                        mirrorIp: '1.0.0.0',
                        mirrorSecondaryIp: 'any6'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.mirrorIp, '1.0.0.0');
                    assert.strictEqual(bodySent.mirrorSecondaryIp, 'any6');
                });
        });

        it('should set a secondary mirror ip', () => {
            const declaration = {
                Common: {
                    MirrorIp: {
                        mirrorIp: 'any6',
                        mirrorSecondaryIp: '1.0.0.0'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.mirrorIp, 'any6');
                    assert.strictEqual(bodySent.mirrorSecondaryIp, '1.0.0.0');
                });
        });

        it('should set both primary and secondary ip', () => {
            const declaration = {
                Common: {
                    MirrorIp: {
                        mirrorIp: '1.0.0.0',
                        mirrorSecondaryIp: '2.0.0.0'
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.mirrorIp, '1.0.0.0');
                    assert.strictEqual(bodySent.mirrorSecondaryIp, '2.0.0.0');
                });
        });

        it('should send "any6" when undefined', () => {
            const declaration = {
                Common: {
                    MirrorIp: {}
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(pathSent, '/tm/cm/device/~Common~my.bigip.com');
                    assert.strictEqual(bodySent.mirrorIp, 'any6');
                    assert.strictEqual(bodySent.mirrorSecondaryIp, 'any6');
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
            doUtil.checkDnsResolution.restore();
            sinon.stub(doUtil, 'checkDnsResolution')
                .callsFake((bigIp, address) => Promise.reject(new Error(`Unable to resolve host ${address}`)));
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
        let joinClusterMembers;
        let syncCalled;
        let syncCompleteCalled;
        let removeDeviceNames;
        let removeDeviceGroup;
        let removeFromDeviceGroupCalled;
        let syncCompleteConnectedDevices;
        let deviceList;

        beforeEach(() => {
            joinClusterMembers = [];
            deviceGroupNameSent = undefined;
            addToDeviceGroupNameSent = [];
            joinClusterCalled = false;
            syncCalled = false;
            syncCompleteCalled = false;
            removeDeviceNames = [];
            removeDeviceGroup = [];
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
                    addToDeviceGroupNameSent.push(deviceGroupName);
                    return Promise.resolve();
                },
                joinCluster(deviceGroupName, remoteHost, remoteUsername, remotePassword, isLocal, options) {
                    addToDeviceGroupNameSent.push(deviceGroupName);
                    joinClusterCalled = true;
                    joinClusterMembers.push(options.syncCompDevices);
                    return Promise.resolve();
                },
                removeFromDeviceGroup(deviceNames, deviceGroup) {
                    removeDeviceNames.push(deviceNames);
                    removeDeviceGroup.push(deviceGroup);
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
                    assert.deepStrictEqual(removeDeviceNames, [['remove.example.com']],
                        'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup'],
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
                    assert.deepStrictEqual(removeDeviceNames, [['remove.example.com']],
                        'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup'],
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
            doUtil.checkDnsResolution.restore();
            sinon.stub(doUtil, 'checkDnsResolution')
                .callsFake((bigIp, address) => Promise.reject(new Error(`Unable to resolve host ${address}`)));
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
                    assert.deepStrictEqual(addToDeviceGroupNameSent, ['failoverGroup']);
                    assert.strictEqual(joinClusterCalled, true);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, [['remove.example.com']],
                        'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup'],
                        'Should remove old device from device group');
                });
        });

        it('should join the device group when using ip addresses if we have DeviceGroup and DeviceTrust', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['10.1.2.3', '10.7.8.9', 'bigip1.example.com'],
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
                if (path === '/tm/cm/device') {
                    return Promise.resolve([
                        {
                            name: 'do.test.1',
                            configsyncIp: '10.1.2.3',
                            managementIp: '10.1.2.4'
                        },
                        {
                            name: 'do.test.2',
                            configsyncIp: '10.4.5.6',
                            managementIp: '10.7.8.9'
                        }
                    ]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(addToDeviceGroupNameSent, ['failoverGroup']);
                    assert.strictEqual(joinClusterCalled, true);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, [['bigip2.example.com',
                        'remove.example.com']], 'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup'],
                        'Should remove old device from device group');
                    assert.deepStrictEqual(joinClusterMembers,
                        [['do.test.1', 'do.test.2', 'bigip1.example.com']]);
                });
        });

        it('should remove IP addresses not found in the trust', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['10.1.2.4', '10.1.2.2'],
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
                if (path === '/tm/cm/device') {
                    return Promise.resolve([
                        {
                            name: 'do.test.1',
                            configsyncIp: '10.1.2.3',
                            managementIp: '10.1.2.4'
                        },
                        {
                            name: 'do.test.2',
                            configsyncIp: '10.4.5.6',
                            managementIp: '10.7.8.9'
                        }
                    ]);
                }
                return Promise.reject(new Error('Unexpected path'));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return assert.isFulfilled(dscHandler.process())
                .then(() => assert.deepStrictEqual(joinClusterMembers, [['do.test.1']]));
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
                    assert.deepStrictEqual(addToDeviceGroupNameSent, ['failoverGroup']);
                    assert.strictEqual(joinClusterCalled, false);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, [['remove.example.com']],
                        'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup'],
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

        it('should join the device groups when using ip addresses if we have DeviceGroup and DeviceTrust', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['10.1.2.3', '10.7.8.9', 'bigip1.example.com'],
                            owner: 'someOtherHost'
                        },
                        otherGroup: {
                            type: 'sync-failover',
                            members: ['10.7.8.9', '10.64.0.1'],
                            owner: 'someOtherHost'
                        },
                        finalGroup: {
                            type: 'sync-failover',
                            members: [],
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
                if (path === `${PATHS.DeviceGroup}/~Common~failoverGroup/devices`
                    || path === `${PATHS.DeviceGroup}/~Common~otherGroup/devices`) {
                    return Promise.resolve(deviceList);
                }
                if (path === '/tm/cm/device') {
                    return Promise.resolve([
                        {
                            name: 'do.test.1',
                            configsyncIp: '10.1.2.3',
                            managementIp: '10.1.2.4'
                        },
                        {
                            name: 'do.test.2',
                            configsyncIp: '10.4.5.6',
                            managementIp: '10.7.8.9'
                        },
                        {
                            name: 'do.test.3',
                            configsyncIp: '10.64.0.1',
                            managementIp: '10.64.0.2'
                        }
                    ]);
                }
                return Promise.reject(new Error(`Unexpected path: ${path}`));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(addToDeviceGroupNameSent,
                        ['failoverGroup', 'otherGroup', 'finalGroup']);
                    assert.strictEqual(joinClusterCalled, true);
                    assert.strictEqual(removeFromDeviceGroupCalled, true,
                        'Should call removeFromDeviceGroup');
                    assert.deepStrictEqual(removeDeviceNames, [
                        ['bigip2.example.com', 'remove.example.com'],
                        ['bigip1.example.com', 'bigip2.example.com', 'remove.example.com']
                    ], 'Should remove old device');
                    assert.deepStrictEqual(removeDeviceGroup, ['failoverGroup', 'otherGroup'],
                        'Should remove old device from device group');
                    assert.deepStrictEqual(joinClusterMembers,
                        [['do.test.1', 'do.test.2', 'bigip1.example.com'], ['do.test.2', 'do.test.3'], []]);
                });
        });

        it('should handle minimizing IP when converting to hostname', () => {
            sinon.stub(doUtil, 'getBigIp').resolves(bigIpMock);

            const declaration = {
                Common: {
                    DeviceGroup: {
                        failoverGroup: {
                            type: 'sync-failover',
                            members: ['fdc3:eaf2:d8b9:123a:0000:0000:0000:0001', 'fdc3:eaf2:d8b9:123a:0000:0000:0000:0002'],
                            owner: 'fdc3:eaf2:d8b9:123a:0000:0000:0000:0001'
                        }
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === `${PATHS.DeviceGroup}/~Common~failoverGroup/devices`) {
                    return Promise.resolve(deviceList);
                }
                if (path === '/tm/cm/device') {
                    return Promise.resolve([
                        {
                            name: 'my.bigip.com',
                            configsyncIp: 'fdc3:eaf2:d8b9:123a::1',
                            managementIp: '1.2.3.4'
                        }
                    ]);
                }
                return Promise.reject(new Error(`Unexpected path: ${path}`));
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(deviceGroupNameSent, 'failoverGroup');
                });
        });
    });

    describe('MAC_Masquerade', () => {
        let dataSent = {};
        beforeEach(() => {
            dataSent = {};
            bigIpMock = {
                createOrModify(path, data) {
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
                list() {
                    return Promise.resolve();
                },
                delete() {
                    return Promise.resolve();
                },
                modify(path, data) {
                    if (!dataSent) {
                        dataSent = {};
                    }
                    if (!dataSent[path]) {
                        dataSent[path] = [];
                    }
                    dataSent[path].push(data);
                    return Promise.resolve();
                }
            };
        });

        it('should set masquerade to algorithm when source specified', () => {
            const declaration = {
                Common: {
                    MAC_Masquerade: {
                        myMac: {
                            source: {
                                interface: '1.1'
                            },
                            trafficGroup: 'traffic-group-1'
                        }
                    }
                }
            };

            bigIpMock.list = (path) => {
                if (path === '/tm/sys/mac-address') {
                    return Promise.resolve(
                        {
                            kind: 'tm:sys:mac-address:mac-addressstats',
                            selfLink: 'https://localhost/mgmt/tm/sys/mac-address?ver=13.1.0',
                            entries: {
                                'https://localhost/mgmt/tm/sys/mac-address/fa:16:3e:4b:44:99': {
                                    nestedStats: {
                                        entries: {
                                            macAddress: {
                                                description: 'fa:16:3e:4b:44:99'
                                            },
                                            objectId: {
                                                description: '1.1'
                                            }
                                        }
                                    }
                                },
                                'https://localhost/mgmt/tm/sys/mac-address/fa:16:3e:c2:27:09': {
                                    nestedStats: {
                                        entries: {
                                            macAddress: {
                                                description: 'fa:16:3e:c2:27:09'
                                            },
                                            objectId: {
                                                description: '1.2'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    );
                }
                return Promise.resolve();
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(dataSent['/tm/cm/traffic-group/~Common~traffic-group-1'][0].mac, 'f8:16:3e:4b:44:99');
                });
        });

        it('should set masquerade to none when source not specified', () => {
            const declaration = {
                Common: {
                    MAC_Masquerade: {
                        myMac: {
                            trafficGroup: 'traffic-group-1'
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(dataSent['/tm/cm/traffic-group/~Common~traffic-group-1'][0].mac, 'none');
                });
        });

        it('should reuse masquerade on rollback when source not specified', () => {
            const declaration = {
                Common: {
                    MAC_Masquerade: {
                        myMac: {
                            trafficGroup: 'traffic-group-1',
                            mac: '0f:a0:98:f1:5f:55'
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.strictEqual(dataSent['/tm/cm/traffic-group/~Common~traffic-group-1'][0].mac, '0f:a0:98:f1:5f:55');
                });
        });
    });

    describe('TrafficGroup', () => {
        let dataSent = {};
        beforeEach(() => {
            dataSent = {};
            bigIpMock = {
                createOrModify(path, data) {
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
                list() {
                    return Promise.resolve();
                },
                delete() {
                    return Promise.resolve();
                },
                modify(path, data) {
                    if (!dataSent) {
                        dataSent = {};
                    }
                    if (!dataSent[path]) {
                        dataSent[path] = [];
                    }
                    dataSent[path].push(data);
                    return Promise.resolve();
                }
            };
        });

        it('should set a traffic group with defaults', () => {
            const declaration = {
                Common: {
                    TrafficGroup: {
                        testTrafficGroup: {
                            name: 'testTrafficGroup',
                            autoFailbackEnabled: false,
                            autoFailbackTime: 60,
                            failoverMethod: 'ha-order',
                            haLoadFactor: 1
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent['/tm/cm/traffic-group'][0],
                        {
                            name: 'testTrafficGroup',
                            partition: 'Common',
                            autoFailbackEnabled: false,
                            autoFailbackTime: 60,
                            failoverMethod: 'ha-order',
                            haLoadFactor: 1
                        });
                });
        });

        it('should set a traffic group with provided values', () => {
            const declaration = {
                Common: {
                    TrafficGroup: {
                        testTrafficGroup: {
                            name: 'testTrafficGroup',
                            autoFailbackEnabled: false,
                            autoFailbackTime: 500,
                            failoverMethod: 'ha-order',
                            haLoadFactor: 2
                        }
                    }
                }
            };

            const dscHandler = new DscHandler(declaration, bigIpMock);
            return dscHandler.process()
                .then(() => {
                    assert.deepStrictEqual(dataSent['/tm/cm/traffic-group'][0],
                        {
                            name: 'testTrafficGroup',
                            partition: 'Common',
                            autoFailbackEnabled: false,
                            autoFailbackTime: 500,
                            failoverMethod: 'ha-order',
                            haLoadFactor: 2
                        });
                });
        });
    });
});
