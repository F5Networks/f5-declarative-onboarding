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

const PATHS = require('../../../../src/lib/sharedConstants').PATHS;


let DeleteHandler;

/* eslint-disable global-require */

describe(('deleteHandler'), function testDeleteHandler() {
    this.timeout(10 * 1000);
    let bigIpMock;
    const deletedPaths = [];
    const deletedDeviceGroups = [];

    before(() => {
        DeleteHandler = require('../../../../src/lib/deleteHandler');

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

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 6);
                assert.strictEqual(deletedPaths[0], '/tm/net/route/~Common~deleteThisRoute');
                assert.strictEqual(deletedPaths[1], '/tm/net/self/~Common~deleteThisSelfIp1');
                assert.strictEqual(deletedPaths[2], '/tm/net/self/~Common~deleteThisSelfIp2');
                assert.strictEqual(deletedPaths[3], '/tm/net/self/~Common~deleteThisSelfIp3');
                assert.strictEqual(deletedPaths[4], '/tm/net/vlan/~Common~deleteThisVLAN1');
                assert.strictEqual(deletedPaths[5], '/tm/net/vlan/~Common~deleteThisVLAN2');
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
                    radius: {},
                    tacacs: {},
                    ldap: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 5);
                assert.strictEqual(deletedPaths[0], '/tm/auth/radius/system-auth');
                assert.strictEqual(deletedPaths[1], '/tm/auth/radius-server/~Common~system_auth_name1');
                assert.strictEqual(deletedPaths[2], '/tm/auth/radius-server/~Common~system_auth_name2');
                assert.strictEqual(deletedPaths[3], '/tm/auth/tacacs/system-auth');
                assert.strictEqual(deletedPaths[4], '/tm/auth/ldap/system-auth');
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

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 3);
                assert.strictEqual(deletedPaths[0], '/tm/auth/radius/system-auth');
                assert.strictEqual(deletedPaths[1], '/tm/auth/radius-server/~Common~system_auth_name1');
                assert.strictEqual(deletedPaths[2], '/tm/auth/radius-server/~Common~system_auth_name2');
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
                },
                Analytics: {
                    doNotDeleteMe: {}
                },
                HTTPD: {
                    doNotDeleteMe: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 0);
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

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedDeviceGroups.length, 2);
                assert.strictEqual(deletedDeviceGroups[0], 'deleteThisGroup');
                assert.strictEqual(deletedDeviceGroups[1], 'deleteThisGroupToo');
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

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedDeviceGroups.length, 1);
                assert.strictEqual(deletedDeviceGroups[0], 'deleteThisGroup');
            });
    });

    it('should report processing errors', () => {
        const errorMessage = 'this is a processing error';
        bigIpMock.delete = () => Promise.reject(new Error(errorMessage));

        const declaration = {
            Common: {
                VLAN: {
                    deleteThisVLAN: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return assert.isRejected(deleteHandler.process(), 'this is a processing error',
            'processing error should have been caught');
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

    it('should skip route domain 0 on attempt to delete it', () => {
        const declaration = {
            Common: {
                RouteDomain: {
                    0: {},
                    rd99: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.indexOf('/tm/net/route-domain/~Common~0'), -1);
                assert.notStrictEqual(deletedPaths.indexOf('/tm/net/route-domain/~Common~rd99'), -1);
            });
    });
});
