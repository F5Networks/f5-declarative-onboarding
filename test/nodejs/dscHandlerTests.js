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

/* eslint-disable global-require */

describe('dscHandler', () => {
    const hostname = 'my.bigip.com';

    let doUtilMock;
    let bigIpMock;
    let DscHandler;

    before(() => {
        doUtilMock = require('../../nodejs/doUtil');
        DscHandler = require('../../nodejs/dscHandler');
    });

    beforeEach(() => {
        bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname });
            }
        };
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
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
            const configSyncIp = '1.2.3.4';
            const declaration = {
                Common: {
                    ConfigSync: {
                        configsyncIp: `${configSyncIp}`
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(configSyncIpSent, configSyncIp);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should strip CIDR', () => {
            const configSyncIp = '1.2.3.4';
            const declaration = {
                Common: {
                    ConfigSync: {
                        configsyncIp: `${configSyncIp}/24`
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(configSyncIpSent, configSyncIp);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(pathSent, `/tm/cm/device/~Common~${hostname}`);
                        assert.strictEqual(bodySent.unicastAddress[0].ip, address);
                        assert.strictEqual(bodySent.unicastAddress[0].port, port);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(bodySent.unicastAddress[0].ip, address);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    });

    describe('deviceTrust', () => {
        let getBigIpOptions;
        let addToTrustHost;
        let syncCompleteCalled;

        beforeEach(() => {
            getBigIpOptions = undefined;
            doUtilMock.getBigIp = (logger, options) => {
                getBigIpOptions = options;
                return Promise.resolve(bigIpMock);
            };

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
                        remoteHost: 'otherHostname',
                        remoteUsername: 'admin',
                        remotePassword: 'pass2word'
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(getBigIpOptions.host, declaration.Common.DeviceTrust.remoteHost);
                        assert.strictEqual(
                            getBigIpOptions.user,
                            declaration.Common.DeviceTrust.remoteUsername
                        );
                        assert.strictEqual(
                            getBigIpOptions.password,
                            declaration.Common.DeviceTrust.remotePassword
                        );
                        assert.strictEqual(addToTrustHost, hostname);
                        assert.strictEqual(syncCompleteCalled, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should not request remote big ip to add to trust if we are the remote', () => {
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

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(getBigIpOptions, undefined);
                        assert.strictEqual(addToTrustHost, undefined);
                        assert.strictEqual(syncCompleteCalled, false);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    });

    describe('deviceGroup', () => {
        const devices = ['device1'];

        let deviceGroupNameSent;
        let addToDeviceGroupNameSent;
        let devicesSent;
        let addToTrustCalled;
        let syncCalled;
        let syncCompleteCalled;

        beforeEach(() => {
            deviceGroupNameSent = undefined;
            addToDeviceGroupNameSent = undefined;
            addToTrustCalled = false;
            syncCalled = false;
            syncCompleteCalled = false;
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
                syncComplete() {
                    syncCompleteCalled = true;
                    return Promise.resolve();
                },
                hasDeviceGroup(deviceGroup) {
                    return Promise.resolve(deviceGroup === 'failoverGroup');
                },
                addToDeviceGroup(aHostname, deviceGroupName) {
                    addToDeviceGroupNameSent = deviceGroupName;
                    return Promise.resolve();
                },
                addToTrust() {
                    addToTrustCalled = true;
                    return Promise.resolve();
                }
            };
        });

        it('should create the device group if we are the owner', () => {
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

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(deviceGroupNameSent, 'failoverGroup');
                        assert.deepEqual(devicesSent, devices);
                        assert.strictEqual(syncCalled, true);
                        assert.strictEqual(syncCompleteCalled, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should not call sync if no devices are in the device trust', () => {
            bigIpMock.cluster.areInTrustGroup = () => { return Promise.resolve([]); };

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

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(syncCalled, false);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should join device group if we are not the owner', () => {
            doUtilMock.getBigIp = () => {
                return Promise.resolve(bigIpMock);
            };

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

                    }
                }
            };

            return new Promise((resolve, reject) => {
                const dscHandler = new DscHandler(declaration, bigIpMock);
                dscHandler.process()
                    .then(() => {
                        assert.strictEqual(addToDeviceGroupNameSent, 'failoverGroup');
                        assert.strictEqual(addToTrustCalled, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });
    });
});
