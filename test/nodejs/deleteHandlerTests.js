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

let DeleteHandler;

/* eslint-disable global-require */

describe(('deleteHandler'), () => {
    let bigIpMock;
    const deletedPaths = [];
    const deletedDeviceGroups = [];

    before(() => {
        DeleteHandler = require('../../nodejs/deleteHandler');

        bigIpMock = {
            delete(path) {
                deletedPaths.push(path);
                return Promise.resolve();
            },
            cluster: {
                deleteDeviceGroup(deviceGroup) {
                    deletedDeviceGroups.push(deviceGroup);
                }
            }
        };
    });

    beforeEach(() => {
        deletedPaths.length = 0;
        deletedDeviceGroups.length = 0;
    });

    it('should issue deletes for Routes, SelfIps, and VLANs in that order', () => {
        const declaration = {
            Common: {
                VLAN: {
                    deleteThisVLAN: {}
                },
                Route: {
                    deleteThisRoute: {}
                },
                SelfIp: {
                    deleteThisSelfIp: {}
                }
            }
        };

        return new Promise((resolve, reject) => {
            const deleteHandler = new DeleteHandler(declaration, bigIpMock);
            deleteHandler.process()
                .then(() => {
                    assert.strictEqual(deletedPaths.length, 3);
                    assert.strictEqual(deletedPaths[0], `${PATHS.Route}/~Common~deleteThisRoute`);
                    assert.strictEqual(deletedPaths[1], `${PATHS.SelfIp}/~Common~deleteThisSelfIp`);
                    assert.strictEqual(deletedPaths[2], `${PATHS.VLAN}/~Common~deleteThisVLAN`);
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
        bigIpMock.delete = () => {
            return Promise.reject(new Error(errorMessage));
        };

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
});
