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
const PATHS = require('../../nodejs/sharedConstants').PATHS;
const AUTH = require('../../nodejs/sharedConstants').AUTH;
const RADIUS = require('../../nodejs/sharedConstants').RADIUS;


let DeleteHandler;

/* eslint-disable global-require */

describe(('deleteHandler'), function testDeleteHandler() {
    this.timeout(10 * 1000);
    let bigIpMock;
    const deletedPaths = [];
    const deletedDeviceGroups = [];

    before(() => {
        DeleteHandler = require('../../nodejs/deleteHandler');

        bigIpMock = {
            cluster: {
                deleteDeviceGroup(deviceGroup) {
                    deletedDeviceGroups.push(deviceGroup);
                }
            }
        };
    });

    beforeEach(() => {
        bigIpMock.delete = (path) => {
            deletedPaths.push(path);
            return Promise.resolve();
        };
        deletedPaths.length = 0;
        deletedDeviceGroups.length = 0;
    });

    it('should issue deletes for Routes, SelfIps, and VLANs in that order', () => {
        bigIpMock.delete = path => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes(PATHS.Route) ? 50 : 0);
        });

        const declaration = {
            Common: {
                VLAN: {
                    deleteThisVLAN1: {},
                    deleteThisVLAN2: {}
                },
                Route: {
                    deleteThisRoute: {}
                },
                SelfIp: {
                    deleteThisSelfIp1: {},
                    deleteThisSelfIp2: {},
                    deleteThisSelfIp3: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedPaths.length, 6);
                    assert.strictEqual(deletedPaths[0], `${PATHS.Route}/~Common~deleteThisRoute`);
                    assert.strictEqual(deletedPaths[1], `${PATHS.SelfIp}/~Common~deleteThisSelfIp1`);
                    assert.strictEqual(deletedPaths[2], `${PATHS.SelfIp}/~Common~deleteThisSelfIp2`);
                    assert.strictEqual(deletedPaths[3], `${PATHS.SelfIp}/~Common~deleteThisSelfIp3`);
                    assert.strictEqual(deletedPaths[4], `${PATHS.VLAN}/~Common~deleteThisVLAN1`);
                    assert.strictEqual(deletedPaths[5], `${PATHS.VLAN}/~Common~deleteThisVLAN2`);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should issue deletes for Authentication subclasses', () => {
        bigIpMock.delete = path => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes(PATHS.Route) ? 50 : 0);
        });

        const declaration = {
            Common: {
                Authentication: {
                    radius: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedPaths[0], `/tm/auth/radius/${AUTH.SUBCLASSES_NAME}`);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should issue deletes for Authentication radius servers', () => {
        bigIpMock.delete = path => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes(PATHS.Route) ? 50 : 0);
        });

        const declaration = {
            Common: {
                Authentication: {
                    radius: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedPaths.length, 3);
                    assert.strictEqual(deletedPaths[0], `/tm/auth/radius/${AUTH.SUBCLASSES_NAME}`);
                    assert.strictEqual(deletedPaths[1], `${PATHS.AuthRadiusServer}/~Common~${RADIUS.PRIMARY_SERVER}`);
                    assert.strictEqual(deletedPaths[2], `${PATHS.AuthRadiusServer}/~Common~${RADIUS.SECONDARY_SERVER}`);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should not issue deletes for non-deletable classes', () => {
        const declaration = {
            Common: {
                NTP: {
                    doNotDeleteMe: {}
                },
                DNS: {
                    doNotDeleteMe: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedPaths.length, 0);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should issue deletes for normal device groups', () => {
        const declaration = {
            Common: {
                DeviceGroup: {
                    deleteThisGroup: {},
                    deleteThisGroupToo: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedDeviceGroups.length, 2);
                    assert.strictEqual(deletedDeviceGroups[0], 'deleteThisGroup');
                    assert.strictEqual(deletedDeviceGroups[1], 'deleteThisGroupToo');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should not issue deletes for read-only device groups', () => {
        const declaration = {
            Common: {
                DeviceGroup: {
                    device_trust_group: {},
                    gtm: {},
                    'datasync-global-dg': {},
                    deleteThisGroup: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedDeviceGroups.length, 1);
                    assert.strictEqual(deletedDeviceGroups[0], 'deleteThisGroup');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should report processing errors', () => {
        const errorMessage = 'this is a processing error';
        bigIpMock.delete = () => Promise.reject(new Error(errorMessage));

        return new Promise((resolve, reject) => {
            const declaration = {
                Common: {
                    VLAN: {
                        deleteThisVLAN: {}
                    }
                }
            };

            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    reject(new Error('processing error should have been caught'));
                })
                .catch((err) => {
                    assert.strictEqual(err.message, errorMessage);
                    resolve();
                });
        });
    });

    it('should properly set the path for Remote Roles', () => {
        const declaration = {
            Common: {
                RemoteAuthRole: {
                    test: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths[0], '/tm/auth/remote-role/role-info/test');
            });
    });
});
