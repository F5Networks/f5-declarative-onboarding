/**
 * Copyright 2023 F5 Networks, Inc.
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
const PATHS = require('../../../src/lib/sharedConstants').PATHS;
const Logger = require('../../../src/lib/logger');

let DeleteHandler;

/* eslint-disable global-require */

describe(('deleteHandler'), function testDeleteHandler() {
    this.timeout(10 * 1000);
    let bigIpMock;
    const deletedPaths = [];
    const transactionDeletedPaths = [];
    const fetchedPaths = [];
    const deletedDeviceGroups = [];

    before(() => {
        DeleteHandler = require('../../../src/lib/deleteHandler');

        bigIpMock = {
            cluster: {
                deleteDeviceGroup(deviceGroup) {
                    deletedDeviceGroups.push(deviceGroup);
                }
            }
        };
    });

    let bigIpMockSpy;
    beforeEach(() => {
        bigIpMock.delete = (path) => {
            deletedPaths.push(path);
            return Promise.resolve();
        };
        bigIpMock.list = (path) => new Promise((resolve) => {
            fetchedPaths.push(path);
            resolve([
                { fullPath: '/Common/system-auth' }
            ]);
        });
        bigIpMock.transaction = (transactions) => {
            if (Array.isArray(transactions)) {
                transactions.forEach((transaction) => {
                    deletedPaths.push(transaction.path);
                    transactionDeletedPaths.push(transaction.path);
                });
            }
            return Promise.resolve();
        };

        bigIpMockSpy = sinon.spy(bigIpMock);
        deletedPaths.length = 0;
        transactionDeletedPaths.length = 0;
        deletedDeviceGroups.length = 0;
        fetchedPaths.length = 0;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should issue deletes for Routes, SelfIps, and VLANs in that order', () => {
        bigIpMock.delete = (path) => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes(PATHS.Route) ? 50 : 0);
        });

        const state = {
            currentConfig: {
                Common: {
                    SelfIp: {
                        deleteThisSelfIp1: {},
                        deleteThisSelfIp2: {}
                    }
                }
            }
        };

        const declaration = {
            Common: {
                SelfIp: {}
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 2);
                assert.strictEqual(deletedPaths[0], '/tm/net/self/~Common~deleteThisSelfIp1');
                assert.strictEqual(deletedPaths[1], '/tm/net/self/~Common~deleteThisSelfIp2');
            });
    });

    it('should delete all items if there is an empty schema class', () => {
        bigIpMock.delete = (path) => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes(PATHS.Route) ? 50 : 0);
        });

        const state = {
            currentConfig: {
                Common: {
                    Route: {
                        deleteThisRoute: {
                            name: 'deleteThisRoute',
                            mtu: 0,
                            network: '1.2.3.5'
                        }
                    }
                }
            }
        };

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

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
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

    it('should replace forward slash with ~ in names', () => {
        const state = {};

        const declaration = {
            Common: {
                ManagementRoute: {
                    'this/has/slashes': {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 1);
                assert.strictEqual(deletedPaths[0], '/tm/sys/management-route/~Common~this~has~slashes');
            });
    });

    it('should issue deletes for Authentication subclasses', () => {
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
                assert.strictEqual(fetchedPaths.length, 6);
                assert.strictEqual(fetchedPaths[0], '/tm/auth/radius');
                assert.strictEqual(fetchedPaths[1], '/tm/auth/tacacs');
                assert.strictEqual(fetchedPaths[2], '/tm/auth/ldap');
                assert.strictEqual(fetchedPaths[3], '/tm/auth/radius-server');
                assert.strictEqual(deletedPaths.length, 5);
                assert.strictEqual(deletedPaths[0], '/tm/auth/radius/system-auth');
                assert.strictEqual(deletedPaths[1], '/tm/auth/tacacs/system-auth');
                assert.strictEqual(deletedPaths[2], '/tm/auth/ldap/system-auth');
                assert.strictEqual(deletedPaths[3], '/tm/auth/radius-server/~Common~system_auth_name1');
                assert.strictEqual(deletedPaths[4], '/tm/auth/radius-server/~Common~system_auth_name2');
            });
    });

    it('should issue deletes for Authentication radius servers', () => {
        /*
            /tm/auth/radius/system-auth should be deleted at first, that why
            its 'delete' promise will be resolved with delay.
            Expected result: order of issued deletes should be preserved.
         */
        bigIpMock.delete = (path) => new Promise((resolve) => {
            deletedPaths.push(path);
            setTimeout(() => {
                resolve();
            }, path.includes('/tm/auth/radius/system-auth') ? 50 : 0);
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
                assert.strictEqual(fetchedPaths.length, 2);
                assert.strictEqual(fetchedPaths[0], '/tm/auth/radius');
                assert.strictEqual(fetchedPaths[1], '/tm/auth/radius-server');
                assert.strictEqual(deletedPaths.length, 3);
                assert.strictEqual(deletedPaths[0], '/tm/auth/radius/system-auth');
                assert.strictEqual(deletedPaths[1], '/tm/auth/radius-server/~Common~system_auth_name1');
                assert.strictEqual(deletedPaths[2], '/tm/auth/radius-server/~Common~system_auth_name2');
            });
    });

    it('should have no unhandled promises rejection when issue deletes for Authentication radius servers', () => {
        const errorMsg = 'this is a processing error';
        bigIpMock.delete = (path) => new Promise((resolve, reject) => {
            if (path.indexOf('system_auth_name1') !== -1) {
                reject(new Error(errorMsg));
            } else {
                resolve();
            }
        });

        const declaration = {
            Common: {
                Authentication: {
                    radius: {}
                }
            }
        };

        const logSevereSpy = sinon.spy(Logger.prototype, 'severe');
        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, { id: '123-abc' });
        return assert.isRejected(
            deleteHandler.process(),
            'this is a processing error',
            'processing error should have been caught'
        ).then(() => {
            assert.strictEqual(logSevereSpy.thisValues[0].metadata, 'deleteHandler.js | 123-abc');
            assert.strictEqual(logSevereSpy.args[0][0], 'Error processing deletes: this is a processing error');
        });
    });

    it('should not issue deletes for missing Authentication items', () => {
        bigIpMock.list = (path) => new Promise((resolve) => {
            fetchedPaths.push(path);
            resolve([]);
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
                assert.strictEqual(fetchedPaths.length, 6);
                assert.strictEqual(fetchedPaths[0], '/tm/auth/radius');
                assert.strictEqual(fetchedPaths[1], '/tm/auth/tacacs');
                assert.strictEqual(fetchedPaths[2], '/tm/auth/ldap');
                assert.strictEqual(fetchedPaths[3], '/tm/auth/radius-server');
                assert.strictEqual(deletedPaths.length, 0);
            });
    });

    it('should issue deletes for Authentication LDAP certificates', () => {
        bigIpMock.list = (path) => new Promise((resolve) => {
            fetchedPaths.push(path);
            if (path === '/tm/sys/file/ssl-cert') {
                resolve([
                    { fullPath: '/Common/do_ldapCaCert.crt' },
                    { fullPath: '/Common/do_ldapClientCert.crt' }
                ]);
            } else if (path === '/tm/sys/file/ssl-key') {
                resolve([
                    { fullPath: '/Common/do_ldapClientCert.key' }
                ]);
            } else {
                resolve([
                    { fullPath: '/Common/system-auth' }
                ]);
            }
        });

        const declaration = {
            Common: {
                Authentication: {
                    ldap: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(fetchedPaths.length, 3);
                assert.strictEqual(fetchedPaths[0], '/tm/auth/ldap');
                assert.strictEqual(fetchedPaths[1], '/tm/sys/file/ssl-cert');
                assert.strictEqual(fetchedPaths[2], '/tm/sys/file/ssl-key');
                assert.strictEqual(deletedPaths.length, 4);
                assert.strictEqual(deletedPaths[0], '/tm/auth/ldap/system-auth');
                assert.strictEqual(deletedPaths[1], '/tm/sys/file/ssl-cert/~Common~do_ldapCaCert.crt');
                assert.strictEqual(deletedPaths[2], '/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.crt');
                assert.strictEqual(deletedPaths[3], '/tm/sys/file/ssl-key/~Common~do_ldapClientCert.key');
            });
    });

    it('should handle non-array response from bigIp.list', () => {
        bigIpMock.list = (path) => new Promise((resolve) => {
            fetchedPaths.push(path);
            resolve({});
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
                assert.strictEqual(fetchedPaths.length, 6);
                assert.strictEqual(fetchedPaths[0], '/tm/auth/radius');
                assert.strictEqual(fetchedPaths[1], '/tm/auth/tacacs');
                assert.strictEqual(fetchedPaths[2], '/tm/auth/ldap');
                assert.strictEqual(fetchedPaths[3], '/tm/auth/radius-server');
                assert.strictEqual(deletedPaths.length, 0);
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
                    'dos-global-dg': {},
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
        return assert.isRejected(
            deleteHandler.process(),
            'this is a processing error',
            'processing error should have been caught'
        );
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
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths[0], '/tm/auth/remote-role/role-info/test');
            });
    });

    it('should delete route domains separately with a transaction', () => {
        const state = {
            currentConfig: {
                Common: {
                    Route: {
                        deleteThisRoute: {
                            name: 'deleteThisRoute',
                            mtu: 0,
                            network: '1.2.3.5'
                        }
                    }
                }
            }
        };

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
                },
                RouteDomain: {
                    deleteThisRouteDomain1: {},
                    deleteThisRouteDomain2: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(bigIpMockSpy.delete.callCount, 3);
                assert.strictEqual(bigIpMockSpy.transaction.callCount, 1);
                assert.strictEqual(deletedPaths.length, 5);
                assert.strictEqual(deletedPaths[0], '/tm/net/route/~Common~deleteThisRoute');
                assert.strictEqual(deletedPaths[1], '/tm/net/self/~Common~deleteThisSelfIp');
                assert.strictEqual(deletedPaths[2], '/tm/net/vlan/~Common~deleteThisVLAN');
                assert.strictEqual(deletedPaths[3], '/tm/net/route-domain/~Common~deleteThisRouteDomain1');
                assert.strictEqual(deletedPaths[4], '/tm/net/route-domain/~Common~deleteThisRouteDomain2');
                assert.strictEqual(transactionDeletedPaths.length, 2);
                assert.strictEqual(transactionDeletedPaths[0], '/tm/net/route-domain/~Common~deleteThisRouteDomain1');
                assert.strictEqual(transactionDeletedPaths[1], '/tm/net/route-domain/~Common~deleteThisRouteDomain2');
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

    it('should skip tunnel socks-tunnel and http-tunnel on attempt to delete it', () => {
        const state = {
            currentConfig: {
                Common: {
                    Tunnel: {
                        tunnel: {
                            name: 'tunnel',
                            partition: 'Common',
                            profile: 'tcp-forward',
                            mtu: 0,
                            usePmtu: 'enabled',
                            tos: 'preserve',
                            autoLasthop: 'default',
                            description: 'none',
                            key: 0,
                            localAddress: 'any6',
                            remoteAddress: 'any6',
                            secondaryAddress: 'any6',
                            mode: 'bidirectional',
                            transparent: 'disabled',
                            trafficGroup: 'none'
                        }
                    }
                }
            }
        };
        const declaration = {
            Common: {
                Tunnel: {
                    'socks-tunnel': {},
                    'http-tunnel': {},
                    tunnel: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.indexOf('/tm/net/tunnels/tunnel/~Common~socks-tunnel'), -1);
                assert.strictEqual(deletedPaths.indexOf('/tm/net/tunnels/tunnel/~Common~http-tunnel'), -1);
                assert.notStrictEqual(deletedPaths.indexOf('/tm/net/tunnels/tunnel/~Common~tunnel'), -1);
                assert.strictEqual(
                    deletedPaths.indexOf('/tm/net/tunnels/vxlan/~Common~tunnel_vxlan'),
                    -1,
                    'Should not have deleted non-existant tunnel_vxlan profile'
                );
            });
    });

    it('should delete vxlan tunnel if it was in the currentConfig', () => {
        const state = {
            currentConfig: {
                Common: {
                    Tunnel: {
                        tunnelVxlan: {
                            name: 'tunnelVxlan',
                            profile: 'vxlan',
                            mtu: 0,
                            usePmtu: 'enabled',
                            tos: 'preserve',
                            autoLasthop: 'default',
                            description: 'none',
                            key: 0,
                            localAddress: '10.10.0.0',
                            remoteAddress: '20.20.0.0',
                            secondaryAddress: 'any6',
                            mode: 'bidirectional',
                            transparent: 'disabled',
                            trafficGroup: 'none',
                            defaultsFrom: 'vxlan',
                            encapsulationType: 'vxlan',
                            floodingType: 'multicast',
                            port: 4789
                        }
                    }
                }
            }
        };
        const declaration = {
            Common: {
                Tunnel: {
                    tunnelVxlan: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.notStrictEqual(
                    deletedPaths.indexOf('/tm/net/tunnels/tunnel/~Common~tunnelVxlan'),
                    -1,
                    'Should have deleted tunnelVxlan'
                );
                assert.notStrictEqual(
                    deletedPaths.indexOf('/tm/net/tunnels/vxlan/~Common~tunnelVxlan_vxlan'),
                    -1,
                    'Should have deleted tunnelVxlan_vxlan'
                );
            });
    });

    it('should skip dns resolver f5-aws-dns on attempt to delete it', () => {
        const declaration = {
            Common: {
                DNS_Resolver: {
                    'f5-aws-dns': {},
                    resolver: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.indexOf('/tm/net/dns-resolver/~Common~f5-aws-dns'), -1);
                assert.notStrictEqual(deletedPaths.indexOf('/tm/net/dns-resolver/~Common~resolver'), -1);
            });
    });

    it('should delete a Route on LOCAL_ONLY', () => {
        const state = {
            currentConfig: {
                Common: {
                    Route: {
                        route: {
                            name: 'route',
                            mtu: 0,
                            netowrk: '1.2.3.5'
                        },
                        localRoute: {
                            name: 'localRoute',
                            mtu: 0,
                            netowrk: '1.2.3.4',
                            localOnly: true
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                Route: {
                    route: {},
                    localRoute: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, [
                    '/tm/net/route/~Common~route',
                    '/tm/net/route/~LOCAL_ONLY~localRoute'
                ]);
            });
    });

    it('should delete a RoutingAsPath', () => {
        const state = {
            currentConfig: {
                Common: {
                    RoutingAsPath: {
                        routingAsPathTest: {
                            name: 'routingAsPathTest',
                            entries: [
                                {
                                    name: 36,
                                    regex: 'bar'
                                }
                            ]
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                RoutingAsPath: {
                    routingAsPathTest: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/routing/as-path/~Common~routingAsPathTest']);
            });
    });

    it('should delete a RoutingAccessList', () => {
        const state = {
            currentConfig: {
                Common: {
                    RoutingAccessList: {
                        routingAccessListTest: {
                            name: 'routingAccessListTest',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    source: '::',
                                    exactMatchEnabled: false,
                                    destination: '::'
                                }
                            ]
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                RoutingAccessList: {
                    routingAccessListTest: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/routing/access-list/~Common~routingAccessListTest']);
            });
    });

    it('should delete a RoutingPrefixList', () => {
        const state = {
            currentConfig: {
                Common: {
                    RoutingPrefixList: {
                        routingPrefixListTest: {
                            name: 'routingPrefixListTest',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLenRange: 32
                                }
                            ]
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                RoutingPrefixList: {
                    routingPrefixListTest: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/routing/prefix-list/~Common~routingPrefixListTest']);
            });
    });

    it('should delete RouteMap, RoutingAccessList, RoutingAsPath, and RoutePrefixList in that order', () => {
        const state = {
            currentConfig: {
                Common: {
                    RoutingBGP: {
                        routinBgpTest: {
                            asLocal: 1
                        }
                    },
                    RouteMap: {
                        routeMapTest: {
                            name: 44,
                            action: 'permit',
                            match: {
                                asPath: '/Common/aspath',
                                ipv4: {
                                    address: {
                                        prefixList: '/Common/prefixlist1'
                                    },
                                    nextHop: {
                                        prefixList: '/Common/prefixlist2'
                                    }
                                },
                                ipv6: {
                                    address: {
                                        prefixList: '/Common/prefixlist3'
                                    },
                                    nextHop: {
                                        prefixList: '/Common/prefixlist4'
                                    }
                                }
                            }
                        }
                    },
                    RoutingAccessList: {
                        routingAccessListTest: {
                            name: 'routingAccessList',
                            entries: []
                        }
                    },
                    RoutingAsPath: {
                        routingAsPathTest: {
                            name: 'routingAsPathTest',
                            entries: [
                                {
                                    name: 36,
                                    regex: 'bar'
                                }
                            ]
                        }
                    },
                    RoutingPrefixList: {
                        routingPrefixListTest: {
                            name: 'routingPrefixListTest',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLenRange: 32
                                }
                            ]
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                RoutingAccessList: {
                    routingAccessListTest: {}
                },
                RoutingBGP: {
                    routingBgpTest: {}
                },
                RoutingAsPath: {
                    routingAsPathTest: {}
                },
                RouteMap: {
                    routeMapTest: {}
                },
                RoutingPrefixList: {
                    routingPrefixListTest: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 4);
                assert.strictEqual(deletedPaths[0], '/tm/net/routing/route-map/~Common~routeMapTest');
                assert.strictEqual(deletedPaths[1], '/tm/net/routing/access-list/~Common~routingAccessListTest');
                assert.strictEqual(deletedPaths[2], '/tm/net/routing/as-path/~Common~routingAsPathTest');
                assert.strictEqual(deletedPaths[3], '/tm/net/routing/prefix-list/~Common~routingPrefixListTest');
            });
    });

    it('should delete GSLBProberPool, GSLBDataCenter, GSLBServer, and GSLBMonitor', () => {
        const state = {
            currentConfig: {
                Common: {
                    GSLBProberPool: {
                        gslbProberPool: {
                            name: 'gslbProberPool',
                            members: [{
                                server: 'gslbServer'
                            }]
                        }
                    },
                    GSLBServer: {
                        gslbServer: {
                            name: 'gslbServer',
                            datacenter: '/Common/gslbDataCenter',
                            devices: [{
                                address: '10.0.0.1'
                            }]
                        }
                    },
                    GSLBDataCenter: {
                        gslbDataCenter: {
                            name: 'gslbDataCenter'
                        }
                    },
                    GSLBMonitor: {
                        gslbMonitor: {
                            name: 'gslbMonitor',
                            monitorType: 'http'
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                GSLBProberPool: {
                    gslbProberPool: {}
                },
                GSLBServer: {
                    gslbServer: {}
                },
                GSLBDataCenter: {
                    gslbDataCenter: {}
                },
                GSLBMonitor: {
                    gslbMonitor: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 4);
                assert.strictEqual(deletedPaths[0], '/tm/gtm/prober-pool/~Common~gslbProberPool');
                assert.strictEqual(deletedPaths[1], '/tm/gtm/server/~Common~gslbServer');
                assert.strictEqual(deletedPaths[2], '/tm/gtm/datacenter/~Common~gslbDataCenter');
                assert.strictEqual(deletedPaths[3], '/tm/gtm/monitor/http/~Common~gslbMonitor');
                assert.strictEqual(transactionDeletedPaths.length, 3);
                assert.strictEqual(transactionDeletedPaths[0], '/tm/gtm/prober-pool/~Common~gslbProberPool');
                assert.strictEqual(transactionDeletedPaths[1], '/tm/gtm/server/~Common~gslbServer');
                assert.strictEqual(transactionDeletedPaths[2], '/tm/gtm/datacenter/~Common~gslbDataCenter');
            });
    });

    it('should delete a GSLBMonitor via updating its path with its monitorType and not delete default monitors', () => {
        const state = {
            currentConfig: {
                Common: {
                    GSLBMonitor: {
                        gslbMonitor: {
                            name: 'gslbMonitor',
                            monitorType: 'http'
                        },
                        http: {
                            name: 'http',
                            monitorType: 'http'
                        },
                        https: {
                            name: 'https',
                            monitorType: 'https'
                        },
                        gateway_icmp: {
                            name: 'gateway-icmp',
                            monitorType: 'gateway-icmp'
                        },
                        tcp: {
                            name: 'tcp',
                            monitorType: 'tcp'
                        },
                        udp: {
                            name: 'udp',
                            monitorType: 'udp'
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                GSLBMonitor: {
                    gslbMonitor: {},
                    http: {},
                    https: {},
                    gateway_icmp: {},
                    tcp: {},
                    udp: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.strictEqual(deletedPaths.length, 1);
                assert.strictEqual(deletedPaths[0], '/tm/gtm/monitor/http/~Common~gslbMonitor');
            });
    });

    it('should delete a FirewallPolicy', () => {
        const state = {
            currentConfig: {
                Common: {
                    FirewallPolicy: {
                        firewallPolicy: {
                            name: 'firewallPolicy',
                            rules: [
                                {
                                    name: 'firewallPolicyRule',
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: false
                                }
                            ]
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                FirewallPolicy: {
                    firewallPolicy: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/security/firewall/policy/~Common~firewallPolicy']);
            });
    });

    it('should delete a NetAddressList', () => {
        const state = {
            currentConfig: {
                Common: {
                    NetAddressList: {
                        netAddressList: {
                            name: 'netAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                NetAddressList: {
                    netAddressList: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/address-list/~Common~netAddressList']);
            });
    });

    it('should delete a NetAddressList from state if FirewallAddressList is posted', () => {
        const state = {
            currentConfig: {
                Common: {
                    NetAddressList: {
                        netAddressList: {
                            name: 'netAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    },
                    FirewallAddressList: {
                        netAddressList: {
                            name: 'netAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                FirewallAddressList: {}
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/address-list/~Common~netAddressList']);
                assert.deepStrictEqual(state.currentConfig.Common.NetAddressList, {});
            });
    });

    it('should delete a NetPortList', () => {
        const state = {
            currentConfig: {
                Common: {
                    NetPortList: {
                        netPortList: {
                            name: 'netPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                NetPortList: {
                    netPortList: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/port-list/~Common~netPortList']);
            });
    });

    it('should delete a NetPortList from state if FirewallPortList is posted', () => {
        const state = {
            currentConfig: {
                Common: {
                    NetPortList: {
                        netPortList: {
                            name: 'netPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    },
                    FirewallPortList: {
                        netPortList: {
                            name: 'netPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                FirewallPortList: {}
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/net/port-list/~Common~netPortList']);
                assert.deepStrictEqual(state.currentConfig.Common.NetPortList, {});
            });
    });

    it('should delete a FirewallAddressList', () => {
        const state = {
            currentConfig: {
                Common: {
                    FirewallAddressList: {
                        firewallAddressList: {
                            name: 'firewallAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                FirewallAddressList: {
                    firewallAddressList: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/security/firewall/address-list/~Common~firewallAddressList']);
            });
    });

    it('should delete a FirewallAddressList from state if NetAddressList is posted', () => {
        const state = {
            currentConfig: {
                Common: {
                    NetAddressList: {
                        netAddressList: {
                            name: 'netAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    },
                    FirewallAddressList: {
                        netAddressList: {
                            name: 'netAddressList',
                            addresses: ['192.0.2.10', '192.1.2.0/24']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                NetAddressList: {}
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/security/firewall/address-list/~Common~netAddressList']);
                assert.deepStrictEqual(state.currentConfig.Common.FirewallAddressList, {});
            });
    });

    it('should delete a FirewallPortList', () => {
        const state = {
            currentConfig: {
                Common: {
                    FirewallPortList: {
                        firewallPortList: {
                            name: 'firewallPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                FirewallPortList: {
                    firewallPortList: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/security/firewall/port-list/~Common~firewallPortList']);
            });
    });

    it('should delete a FirewallPortList from state if NetPortList is posted', () => {
        const state = {
            currentConfig: {
                Common: {
                    FirewallPortList: {
                        netPortList: {
                            name: 'netPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    },
                    NetPortList: {
                        netPortList: {
                            name: 'netPortList',
                            ports: ['8123', '8234', '8300-8350']
                        }
                    }
                }
            }
        };

        const declaration = {
            Common: {
                NetPortList: {}
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, ['/tm/security/firewall/port-list/~Common~netPortList']);
                assert.deepStrictEqual(state.currentConfig.Common.FirewallPortList, {});
            });
    });

    it('should ignore 404 error when deleting', () => {
        const errorMsg = 'The requested Management Route (/Common/managementRoute) was not found';
        bigIpMock.delete = (path) => new Promise((resolve, reject) => {
            if (path.indexOf('managementRoute') !== -1) {
                const err = new Error(errorMsg);
                err.code = 404;
                reject(err);
            } else {
                deletedPaths.push(path);
                resolve();
            }
        });
        const declaration = {
            Common: {
                ManagementRoute: {
                    managementRoute: {}
                }
            }
        };
        const state = {
            currentConfig: {
                Common: {
                    ManagementRoute: {}
                }
            }
        };

        const deleteHandler = new DeleteHandler(declaration, bigIpMock, undefined, state);
        return deleteHandler.process()
            .then(() => {
                assert.deepStrictEqual(deletedPaths, []);
            });
    });
});
