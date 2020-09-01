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
const sinon = require('sinon');
const PATHS = require('../../../../src/lib/sharedConstants').PATHS;

const NetworkHandler = require('../../../../src/lib/networkHandler');

describe('networkHandler', () => {
    let bigIpMock;
    let dataSent;
    let createdFolder;

    beforeEach(() => {
        dataSent = {};
        createdFolder = undefined;
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
            createFolder(name, options) {
                createdFolder = {
                    name,
                    options
                };
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

    afterEach(() => {
        sinon.restore();
    });

    describe('DNS_Resolver', () => {
        it('should handle fully specified DNS_Resolver', () => {
            const declaration = {
                Common: {
                    DNS_Resolver: {
                        dnsResolver1: {
                            name: 'dnsResolver1',
                            answerDefaultZones: false,
                            cacheSize: 5767168,
                            forwardZones: [
                                {
                                    name: 'amazonaws.com',
                                    nameservers: [
                                        '8.8.8.8:53',
                                        '8.8.8.7:53'
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        '8.8.4.4:53',
                                        '8.8.4.3:53'
                                    ]
                                }
                            ],
                            randomizeQueryNameCase: true,
                            routeDomain: '0',
                            useIpv4: true,
                            useIpv6: false,
                            useTcp: true,
                            useUdp: false
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const resolverData = dataSent[PATHS.DNS_Resolver];
                    assert.strictEqual(resolverData.length, 1);
                    assert.strictEqual(resolverData[0].name, 'dnsResolver1');
                    assert.strictEqual(resolverData[0].partition, 'Common');
                    assert.strictEqual(resolverData[0].answerDefaultZones, 'no');
                    assert.strictEqual(resolverData[0].cacheSize, 5767168);

                    assert.strictEqual(resolverData[0].forwardZones.length, 2);
                    assert.strictEqual(resolverData[0].forwardZones[0].name, 'amazonaws.com');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[0].name, '8.8.8.8:53');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[1].name, '8.8.8.7:53');

                    assert.strictEqual(resolverData[0].forwardZones[1].name, 'idservice.net');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[0].name, '8.8.4.4:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[1].name, '8.8.4.3:53');

                    assert.strictEqual(resolverData[0].randomizeQueryNameCase, 'yes');
                    assert.strictEqual(resolverData[0].routeDomain, '0');
                    assert.strictEqual(resolverData[0].useIpv4, 'yes');
                    assert.strictEqual(resolverData[0].useIpv6, 'no');
                    assert.strictEqual(resolverData[0].useTcp, 'yes');
                    assert.strictEqual(resolverData[0].useUdp, 'no');
                });
        });

        it('should handle fully specified DNS_Resolver on rollback', () => {
            // nameservers look different on rollback but should produce same result
            const declaration = {
                Common: {
                    DNS_Resolver: {
                        dnsResolver1: {
                            name: 'dnsResolver1',
                            forwardZones: [
                                {
                                    name: 'amazonaws.com',
                                    nameservers: [
                                        {
                                            name: '8.8.8.8:53'
                                        },
                                        {
                                            name: '8.8.8.7:53'
                                        }
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        {
                                            name: '8.8.4.4:53'
                                        },
                                        {
                                            name: '8.8.4.3:53'
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const resolverData = dataSent[PATHS.DNS_Resolver];
                    assert.strictEqual(resolverData.length, 1);
                    assert.strictEqual(resolverData[0].name, 'dnsResolver1');
                    assert.strictEqual(resolverData[0].partition, 'Common');
                    assert.strictEqual(resolverData[0].forwardZones.length, 2);
                    assert.strictEqual(resolverData[0].forwardZones[0].name, 'amazonaws.com');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[0].name, '8.8.8.8:53');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[1].name, '8.8.8.7:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].name, 'idservice.net');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[0].name, '8.8.4.4:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[1].name, '8.8.4.3:53');
                });
        });
    });

    describe('Trunk', () => {
        it('should handle fully specified Trunk', () => {
            const declaration = {
                Common: {
                    Trunk: {
                        trunk1: {
                            name: 'trunk1',
                            distributionHash: 'dst-mac',
                            interfaces: [
                                '1.1',
                                '1.2'
                            ],
                            lacpEnabled: true,
                            lacpMode: 'active',
                            lacpTimeout: 'long',
                            linkSelectPolicy: 'auto',
                            qinqEthertype: '0xAF09',
                            spanningTreeEnabled: true
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const trunkData = dataSent[PATHS.Trunk];
                    assert.strictEqual(trunkData.length, 1);
                    assert.strictEqual(trunkData[0].name, 'trunk1');
                    assert.strictEqual(trunkData[0].distributionHash, 'dst-mac');
                    assert.strictEqual(trunkData[0].interfaces[0], '1.1');
                    assert.strictEqual(trunkData[0].interfaces[1], '1.2');
                    assert.strictEqual(trunkData[0].lacp, 'enabled');
                    assert.strictEqual(trunkData[0].lacpMode, 'active');
                    assert.strictEqual(trunkData[0].lacpTimeout, 'long');
                    assert.strictEqual(trunkData[0].linkSelectPolicy, 'auto');
                    assert.strictEqual(trunkData[0].qinqEthertype, '0xAF09');
                    assert.strictEqual(trunkData[0].stp, 'enabled');
                });
        });
    });

    describe('VLAN', () => {
        it('should handle fully specified VLANs', () => {
            const declaration = {
                Common: {
                    VLAN: {
                        vlan1: {
                            name: 'vlan1',
                            tag: 4094,
                            mtu: 1500,
                            interfaces: [
                                {
                                    name: '1.1',
                                    tagged: true
                                },
                                {
                                    name: '1.2',
                                    tagged: false
                                }
                            ],
                            cmpHash: 'dst-ip',
                            failsafeEnabled: true,
                            failsafeAction: 'reboot',
                            failsafeTimeout: 3600
                        },
                        vlan2: {
                            name: 'vlan2',
                            tag: 4093,
                            mtu: 1400,
                            interfaces: [
                                {
                                    name: '1.0',
                                    tagged: true
                                }
                            ],
                            cmpHash: 'src-ip'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const vlanData = dataSent[PATHS.VLAN];
                    assert.strictEqual(vlanData.length, 2);
                    assert.strictEqual(vlanData[0].name, 'vlan1');
                    assert.strictEqual(vlanData[0].tag, 4094);
                    assert.strictEqual(vlanData[0].mtu, 1500);
                    assert.strictEqual(vlanData[0].interfaces[0].name, '1.1');
                    assert.strictEqual(vlanData[0].interfaces[0].tagged, true);
                    assert.strictEqual(vlanData[0].interfaces[1].name, '1.2');
                    assert.strictEqual(vlanData[0].interfaces[1].tagged, false);
                    assert.strictEqual(vlanData[0].partition, 'Common');
                    assert.strictEqual(vlanData[0].cmpHash, 'dst-ip');
                    assert.strictEqual(vlanData[0].failsafe, 'enabled');
                    assert.strictEqual(vlanData[0].failsafeAction, 'reboot');
                    assert.strictEqual(vlanData[1].name, 'vlan2');
                    assert.strictEqual(vlanData[1].tag, 4093);
                    assert.strictEqual(vlanData[1].mtu, 1400);
                    assert.strictEqual(vlanData[1].partition, 'Common');
                    assert.strictEqual(vlanData[1].cmpHash, 'src-ip');
                    assert.strictEqual(vlanData[1].failsafe, 'disabled');
                });
        });

        it('should set tagged true if VLAN is tagged', () => {
            const declaration = {
                Common: {
                    VLAN: {
                        vlan1: {
                            name: 'vlan1',
                            tag: 4094,
                            interfaces: [
                                {
                                    name: '1.1'
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const vlanData = dataSent[PATHS.VLAN][0];
                    assert.strictEqual(vlanData.interfaces[0].tagged, true);
                });
        });

        it('should set tagged false if VLAN is not tagged', () => {
            const declaration = {
                Common: {
                    VLAN: {
                        vlan1: {
                            name: 'vlan1',
                            interfaces: [
                                {
                                    name: '1.1'
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const vlanData = dataSent[PATHS.VLAN][0];
                    assert.strictEqual(vlanData.interfaces[0].tagged, false);
                });
        });
    });

    describe('SelfIp', () => {
        it('should handle fully specified SelfIps', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: '/Common/vlan1',
                            address: '1.2.3.4',
                            trafficGroup: '/Common/traffic-group-local-only',
                            allowService: ['tcp:1234', 'tcp:5678']
                        },
                        selfIp2: {
                            name: 'selfIp2',
                            vlan: '/Common/vlan2',
                            address: '5.6.7.8',
                            trafficGroup: '/Common/traffic-group-local-only',
                            allowService: 'default'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const selfIpData = dataSent[PATHS.SelfIp];
                    assert.strictEqual(selfIpData[0].name, 'selfIp1');
                    assert.strictEqual(selfIpData[0].vlan, '/Common/vlan1');
                    assert.strictEqual(selfIpData[0].address, '1.2.3.4');
                    assert.strictEqual(
                        selfIpData[0].trafficGroup, '/Common/traffic-group-local-only'
                    );
                    assert.deepStrictEqual(
                        selfIpData[0].allowService, ['tcp:1234', 'tcp:5678']
                    );
                    assert.strictEqual(selfIpData[0].partition, 'Common');
                    assert.strictEqual(selfIpData[1].name, 'selfIp2');
                    assert.strictEqual(selfIpData[1].vlan, '/Common/vlan2');
                    assert.strictEqual(selfIpData[1].address, '5.6.7.8');
                    assert.strictEqual(
                        selfIpData[1].trafficGroup, '/Common/traffic-group-local-only'
                    );
                    assert.strictEqual(
                        selfIpData[1].allowService, 'default'
                    );
                    assert.strictEqual(selfIpData[1].partition, 'Common');
                });
        });

        it('should prepend tenant if missing', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: 'vlan1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const selfIpData = dataSent[PATHS.SelfIp][0];
                    assert.strictEqual(
                        selfIpData.vlan, '/Common/vlan1'
                    );
                });
        });

        it('should send non-floating SelfIps before floating SelfIps', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: '/Common/vlan1',
                            trafficGroup: '/Common/traffic-group-1'
                        },
                        selfIp2: {
                            name: 'selfIp2',
                            vlan: '/Common/vlan2',
                            trafficGroup: '/Common/traffic-group-local-only'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const selfIpData = dataSent[PATHS.SelfIp];
                    assert.strictEqual(selfIpData[0].name, 'selfIp2');
                    assert.strictEqual(selfIpData[1].name, 'selfIp1');
                });
        });

        describe('modify self ip', () => {
            const deletedPaths = [];
            beforeEach(() => {
                deletedPaths.length = 0;
                bigIpMock.delete = (path) => {
                    deletedPaths.push(path);
                    return Promise.resolve();
                };
            });

            it('should delete existing matching self ips', () => {
                const declaration = {
                    Common: {
                        SelfIp: {
                            selfIp1: {
                                name: 'selfIp1',
                                vlan: '/Common/vlan1',
                                trafficGroup: 'traffic-group-local-only'
                            },
                            selfIp2: {
                                name: 'selfIp2',
                                vlan: '/Common/vlan2',
                                trafficGroup: 'traffic-group-local-only'
                            }
                        }
                    }
                };

                bigIpMock.list = (path) => {
                    if (path.startsWith(PATHS.SelfIp)) {
                        if (path === PATHS.SelfIp) {
                            return Promise.resolve(
                                [
                                    declaration.Common.SelfIp.selfIp1,
                                    declaration.Common.SelfIp.selfIp2
                                ]
                            );
                        }
                        if (path === `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`) {
                            return Promise.resolve();
                        }
                        const error404 = new Error();
                        error404.code = 404;
                        return Promise.reject(error404);
                    }
                    return Promise.resolve();
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 1);
                        assert.strictEqual(
                            deletedPaths[0],
                            '/tm/net/self/~Common~selfIp1'
                        );
                    });
            });

            it('should delete and re-add floating self ips in the same subnet', () => {
                const declaration = {
                    Common: {
                        SelfIp: {
                            selfIp1: {
                                name: 'selfIp1',
                                vlan: '/Common/vlan1',
                                address: '10.10.0.100/24',
                                trafficGroup: 'traffic-group-local-only'
                            }
                        }
                    }
                };

                const selfIpToDelete = {
                    name: 'floater',
                    partition: 'Common',
                    vlan: '/Common/vlan1',
                    address: '10.10.0.200/24',
                    trafficGroup: 'traffic-group-1',
                    allowService: ['default']
                };
                const selfIpToKeep = {
                    name: 'non-floater',
                    partition: 'Common',
                    vlan: '/Common/vlan1',
                    address: '10.10.0.200/24',
                    trafficGroup: 'traffic-group-local-only'
                };

                // we need 2 existing self Ips to test that routes are not added to the delete list twice
                bigIpMock.list = (path) => {
                    if (path.startsWith(PATHS.SelfIp)) {
                        if (path === PATHS.SelfIp) {
                            return Promise.resolve([selfIpToDelete, selfIpToKeep]);
                        }
                        if (path === `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`
                        ) {
                            return Promise.resolve();
                        }
                        const error404 = new Error();
                        error404.code = 404;
                        return Promise.reject(error404);
                    }

                    return Promise.resolve();
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 2);
                        assert.strictEqual(deletedPaths[0], '/tm/net/self/~Common~floater');
                        assert.strictEqual(deletedPaths[1], '/tm/net/self/~Common~selfIp1');
                        assert.deepEqual(dataSent[PATHS.SelfIp][1],
                            {
                                name: 'floater',
                                partition: 'Common',
                                vlan: '/Common/vlan1',
                                address: '10.10.0.200/24',
                                trafficGroup: 'traffic-group-1',
                                allowService: ['default']
                            });
                    });
            });

            it('should delete and re-add routes in the same subnet', () => {
                const declaration = {
                    Common: {
                        SelfIp: {
                            selfIp1: {
                                name: 'selfIp1',
                                vlan: '/Common/vlan1',
                                address: '10.10.0.0/24',
                                trafficGroup: 'traffic-group-local-only'
                            },
                            selfIp2: {
                                name: 'selfIp2',
                                vlan: '/Common/vlan2',
                                address: '10.20.0.0/24',
                                trafficGroup: 'traffic-group-local-only'
                            },
                            selfIp3: {
                                name: 'selfIp3',
                                vlan: '/Common/vlan3',
                                address: '10.10.0.0/24',
                                trafficGroup: 'traffic-group-local-only'
                            }
                        }
                    }
                };

                const routeToDelete = {
                    name: 'default',
                    partition: 'Common',
                    gw: '10.10.0.1',
                    network: 'default',
                    mtu: 1500
                };
                const routeToKeep = {
                    name: 'doNotDelete',
                    partition: 'Common',
                    gw: '10.20.0.1',
                    network: 'other',
                    mtu: 1400
                };

                // we need 2 existing self Ips to test that routes are not added to the delete list twice
                bigIpMock.list = (path) => {
                    if (path.startsWith(PATHS.SelfIp)) {
                        if (path === PATHS.SelfIp) {
                            return Promise.resolve(
                                [
                                    declaration.Common.SelfIp.selfIp1,
                                    declaration.Common.SelfIp.selfIp2,
                                    declaration.Common.SelfIp.selfIp3
                                ]
                            );
                        }
                        if (path === `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`
                            || path === `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp3.name}`
                        ) {
                            return Promise.resolve();
                        }
                        const error404 = new Error();
                        error404.code = 404;
                        return Promise.reject(error404);
                    }

                    if (path.startsWith(PATHS.Route)) {
                        return Promise.resolve([routeToDelete, routeToKeep]);
                    }

                    return Promise.resolve();
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 3);
                        assert.strictEqual(deletedPaths[0], '/tm/net/route/~Common~default');
                        assert.strictEqual(deletedPaths[1], '/tm/net/self/~Common~selfIp1');
                        assert.strictEqual(deletedPaths[2], '/tm/net/self/~Common~selfIp3');
                        assert.deepEqual(dataSent[PATHS.Route][0],
                            {
                                name: 'default',
                                partition: 'Common',
                                gw: '10.10.0.1',
                                network: 'default',
                                mtu: 1500
                            });
                    });
            });
        });
    });

    describe('Route', () => {
        const deletedPaths = [];
        let declaration = {};
        let state = {};

        beforeEach(() => {
            deletedPaths.length = 0;
            bigIpMock.delete = (path) => {
                deletedPaths.push(path);
                return Promise.resolve();
            };

            declaration = {
                Common: {
                    Route: {
                        theRoute: {
                            name: 'theRoute',
                            gw: '10.11.12.13',
                            network: '50.60.70.80',
                            mtu: 1000
                        },
                        localRoute: {
                            name: 'localRoute',
                            target: 'targetVLAN',
                            network: '50.60.70.81',
                            mtu: 1120,
                            localOnly: true
                        }
                    }
                }
            };
            state = {
                currentConfig: {
                    Common: {
                        Route: {
                            theRoute: {
                                name: 'theRoute',
                                gw: '10.11.12.13',
                                network: '51.62.73.84/32',
                                mtu: 1000
                            },
                            localRoute: {
                                name: 'localRoute',
                                gw: '10.11.12.13',
                                network: '51.62.73.85/32',
                                mtu: 1005,
                                localOnly: true
                            }
                        }
                    }
                }
            };
        });

        it('should handle fully specified Routes', () => {
            declaration = {
                Common: {
                    Route: {
                        route1: {
                            name: 'route1',
                            gw: '0.0.0.0',
                            network: 'default',
                            mtu: 1500
                        },
                        route2: {
                            name: 'route2',
                            gw: '1.1.1.1',
                            network: '2.2.2.2',
                            mtu: 1400
                        },
                        route3: {
                            name: 'route3',
                            target: 'targetTunnel',
                            network: '1.2.3.4',
                            mtu: 100,
                            localOnly: false
                        },
                        routeLocalOnly: {
                            name: 'routeLocalOnly',
                            target: 'targetVLAN',
                            network: 'default-inet6',
                            mtu: 1120,
                            localOnly: true
                        }
                    }
                }
            };

            state = {
                currentConfig: {
                    Common: {}
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const routeData = dataSent[PATHS.Route];
                    assert.deepEqual(deletedPaths, []);
                    assert.strictEqual(routeData[0].name, 'route1');
                    assert.strictEqual(routeData[0].gw, '0.0.0.0');
                    assert.strictEqual(routeData[0].network, 'default');
                    assert.strictEqual(routeData[0].mtu, 1500);
                    assert.strictEqual(routeData[0].partition, 'Common');
                    assert.strictEqual(routeData[1].name, 'route2');
                    assert.strictEqual(routeData[1].gw, '1.1.1.1');
                    assert.strictEqual(routeData[1].network, '2.2.2.2/32');
                    assert.strictEqual(routeData[1].mtu, 1400);
                    assert.strictEqual(routeData[1].partition, 'Common');
                    assert.strictEqual(routeData[2].name, 'route3');
                    assert.strictEqual(routeData[2].interface, '/Common/targetTunnel');
                    assert.strictEqual(routeData[2].network, '1.2.3.4/32');
                    assert.strictEqual(routeData[2].mtu, 100);
                    assert.strictEqual(routeData[2].partition, 'Common');
                    assert.deepStrictEqual(routeData[3], {
                        interface: '/Common/targetVLAN',
                        mtu: 1120,
                        name: 'routeLocalOnly',
                        network: 'default-inet6',
                        partition: 'LOCAL_ONLY'
                    });
                    assert.deepStrictEqual(createdFolder,
                        {
                            name: 'LOCAL_ONLY',
                            options: { subPath: '/' }
                        });
                });
        });

        it('should delete and recreate both Routes if network updated', () => {
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const routeData = dataSent[PATHS.Route];
                    assert.deepEqual(deletedPaths, [
                        '/tm/net/route/~Common~theRoute',
                        '/tm/net/route/~LOCAL_ONLY~localRoute'
                    ]);
                    assert.deepStrictEqual(routeData[0], {
                        gw: '10.11.12.13',
                        mtu: 1000,
                        name: 'theRoute',
                        network: '50.60.70.80/32',
                        partition: 'Common'
                    });
                    assert.deepStrictEqual(routeData[1], {
                        interface: '/Common/targetVLAN',
                        mtu: 1120,
                        name: 'localRoute',
                        network: '50.60.70.81/32',
                        partition: 'LOCAL_ONLY'
                    });
                });
        });

        it('should delete only Routes that have their network updated', () => {
            state.currentConfig.Common.Route.theRoute.network = '50.60.70.80/32';
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const routeData = dataSent[PATHS.Route];
                    assert.deepEqual(deletedPaths, ['/tm/net/route/~LOCAL_ONLY~localRoute']);
                    assert.deepStrictEqual(routeData, [
                        {
                            gw: '10.11.12.13',
                            mtu: 1000,
                            name: 'theRoute',
                            network: '50.60.70.80/32',
                            partition: 'Common'
                        }, {
                            interface: '/Common/targetVLAN',
                            mtu: 1120,
                            name: 'localRoute',
                            network: '50.60.70.81/32',
                            partition: 'LOCAL_ONLY'
                        }
                    ]);
                });
        });

        it('should not delete the existing Route if network not updated', () => {
            state.currentConfig.Common.Route.theRoute.network = '50.60.70.80/32';
            state.currentConfig.Common.Route.localRoute.network = '50.60.70.81/32';
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const routeData = dataSent[PATHS.Route];
                    assert.deepEqual(deletedPaths, []);
                    assert.deepStrictEqual(routeData, [
                        {
                            gw: '10.11.12.13',
                            mtu: 1000,
                            name: 'theRoute',
                            network: '50.60.70.80/32',
                            partition: 'Common'
                        }, {
                            interface: '/Common/targetVLAN',
                            mtu: 1120,
                            name: 'localRoute',
                            network: '50.60.70.81/32',
                            partition: 'LOCAL_ONLY'
                        }
                    ]);
                });
        });

        it('should not do anything with an empty Route', () => {
            declaration = {
                Common: {
                    Route: {
                        theRoute: {}
                    }
                }
            };
            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    assert.deepEqual(deletedPaths, []);
                    assert.deepEqual(dataSent[PATHS.Route], undefined);
                });
        });

        it('should not create LOCAL_ONLY if none of the Routes need it', () => {
            declaration.Common.Route.localRoute.localOnly = false;

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.deepStrictEqual(createdFolder, undefined);
                });
        });
    });

    describe('RouteDomain', () => {
        it('should handle fully specified RouteDomains', () => {
            const declaration = {
                Common: {
                    RouteDomain: {
                        rd1: {
                            name: 'rd1',
                            id: 123,
                            bandwidthControllerPolicy: 'bandwidthControllerPolicy',
                            connectionLimit: 1000000,
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            enforcedFirewallPolicy: 'enforcedFirewallPolicy',
                            stagedFirewallPolicy: 'stagedFirewallPolicy',
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            strict: false,
                            routingProtocols: [
                                'RIP'
                            ],
                            vlans: [
                                'vlan1',
                                'vlan2'
                            ]
                        },
                        rd2: {
                            name: 'rd2',
                            id: 1234,
                            strict: true
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const routeDomainData = dataSent[PATHS.RouteDomain];
                    assert.strictEqual(routeDomainData[0].name, 'rd1');
                    assert.strictEqual(routeDomainData[0].id, 123);
                    assert.strictEqual(routeDomainData[0].partition, 'Common');
                    assert.strictEqual(routeDomainData[0].bwcPolicy, 'bandwidthControllerPolicy');
                    assert.strictEqual(routeDomainData[0].flowEvictionPolicy, 'flowEvictionPolicy');
                    assert.strictEqual(routeDomainData[0].fwEnforcedPolicy, 'enforcedFirewallPolicy');
                    assert.strictEqual(routeDomainData[0].fwStagedPolicy, 'stagedFirewallPolicy');
                    assert.strictEqual(routeDomainData[0].ipIntelligencePolicy, 'ipIntelligencePolicy');
                    assert.strictEqual(routeDomainData[0].securityNatPolicy, 'securityNatPolicy');
                    assert.strictEqual(routeDomainData[0].servicePolicy, 'servicePolicy');
                    assert.strictEqual(routeDomainData[0].strict, 'disabled');
                    assert.deepStrictEqual(routeDomainData[0].routingProtocol, ['RIP']);
                    assert.deepStrictEqual(routeDomainData[0].vlans, ['vlan1', 'vlan2']);
                    assert.strictEqual(routeDomainData[0].connectionLimit, 1000000);
                    assert.strictEqual(routeDomainData[1].name, 'rd2');
                    assert.strictEqual(routeDomainData[1].id, 1234);
                    assert.strictEqual(routeDomainData[1].partition, 'Common');
                    assert.strictEqual(routeDomainData[1].strict, 'enabled');
                });
        });
    });

    describe('DagGlobals', () => {
        it('should handle fully specified DagGlobals', () => {
            const declaration = {
                Common: {
                    DagGlobals: {
                        ipv6PrefixLength: 120,
                        icmpHash: 'ipicmp',
                        roundRobinMode: 'local'
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const dagGlobalsData = dataSent[PATHS.DagGlobals];
                    assert.strictEqual(dagGlobalsData[0].dagIpv6PrefixLen, 120);
                    assert.strictEqual(dagGlobalsData[0].icmpHash, 'ipicmp');
                    assert.strictEqual(dagGlobalsData[0].roundRobinMode, 'local');
                });
        });
    });

    describe('Tunnel', () => {
        it('should handle fully specified Tunnel', () => {
            const declaration = {
                Common: {
                    Tunnel: {
                        tunnel1: {
                            name: 'tunnel1',
                            tunnelType: 'tcp-forward',
                            mtu: 0,
                            usePmtu: true,
                            typeOfService: 'preserve',
                            autoLastHop: 'default'
                        },
                        tunnel2: {
                            name: 'tunnel2',
                            tunnelType: 'tcp-forward',
                            mtu: 1000,
                            usePmtu: false,
                            typeOfService: 12,
                            autoLastHop: 'enabled'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const tunnels = dataSent[PATHS.Tunnel];
                    assert.strictEqual(tunnels[0].name, 'tunnel1');
                    assert.strictEqual(tunnels[0].profile, '/Common/tcp-forward');
                    assert.strictEqual(tunnels[0].mtu, 0);
                    assert.strictEqual(tunnels[0].usePmtu, 'enabled');
                    assert.strictEqual(tunnels[0].tos, 'preserve');
                    assert.strictEqual(tunnels[0].autoLasthop, 'default');
                    assert.strictEqual(tunnels[1].name, 'tunnel2');
                    assert.strictEqual(tunnels[1].profile, '/Common/tcp-forward');
                    assert.strictEqual(tunnels[1].mtu, 1000);
                    assert.strictEqual(tunnels[1].usePmtu, 'disabled');
                    assert.strictEqual(tunnels[1].tos, 12);
                    assert.strictEqual(tunnels[1].autoLasthop, 'enabled');
                });
        });
    });
});
