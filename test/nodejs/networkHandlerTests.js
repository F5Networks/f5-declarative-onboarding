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

const NetworkHandler = require('../../nodejs/networkHandler');

describe('networkHandler', () => {
    let bigIpMock;
    let dataSent;

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
            }
        };
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
                            ]
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
                            ]
                        }
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const vlanData = dataSent[PATHS.VLAN];
                        assert.strictEqual(vlanData.length, 2);
                        assert.strictEqual(vlanData[0].name, declaration.Common.VLAN.vlan1.name);
                        assert.strictEqual(vlanData[0].tag, declaration.Common.VLAN.vlan1.tag);
                        assert.strictEqual(vlanData[0].mtu, declaration.Common.VLAN.vlan1.mtu);
                        assert.strictEqual(vlanData[0].interfaces[0].name, '1.1');
                        assert.strictEqual(vlanData[0].interfaces[0].tagged, true);
                        assert.strictEqual(vlanData[0].interfaces[1].name, '1.2');
                        assert.strictEqual(vlanData[0].interfaces[1].tagged, false);
                        assert.strictEqual(vlanData[0].partition, 'Common');
                        assert.strictEqual(vlanData[1].name, declaration.Common.VLAN.vlan2.name);
                        assert.strictEqual(vlanData[1].tag, declaration.Common.VLAN.vlan2.tag);
                        assert.strictEqual(vlanData[1].mtu, declaration.Common.VLAN.vlan2.mtu);
                        assert.strictEqual(vlanData[1].partition, 'Common');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const vlanData = dataSent[PATHS.VLAN][0];
                        assert.strictEqual(vlanData.interfaces[0].tagged, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const vlanData = dataSent[PATHS.VLAN][0];
                        assert.strictEqual(vlanData.interfaces[0].tagged, false);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const selfIpdata = dataSent[PATHS.SelfIp];
                        assert.strictEqual(selfIpdata[0].name, declaration.Common.SelfIp.selfIp1.name);
                        assert.strictEqual(selfIpdata[0].vlan, declaration.Common.SelfIp.selfIp1.vlan);
                        assert.strictEqual(selfIpdata[0].address, declaration.Common.SelfIp.selfIp1.address);
                        assert.strictEqual(
                            selfIpdata[0].trafficGroup, declaration.Common.SelfIp.selfIp1.trafficGroup
                        );
                        assert.strictEqual(
                            selfIpdata[0].allowService, declaration.Common.SelfIp.selfIp1.allowService
                        );
                        assert.strictEqual(selfIpdata[0].partition, 'Common');
                        assert.strictEqual(selfIpdata[1].name, declaration.Common.SelfIp.selfIp2.name);
                        assert.strictEqual(selfIpdata[1].vlan, declaration.Common.SelfIp.selfIp2.vlan);
                        assert.strictEqual(selfIpdata[1].address, declaration.Common.SelfIp.selfIp2.address);
                        assert.strictEqual(
                            selfIpdata[1].trafficGroup, declaration.Common.SelfIp.selfIp2.trafficGroup
                        );
                        assert.strictEqual(
                            selfIpdata[1].allowService, declaration.Common.SelfIp.selfIp2.allowService
                        );
                        assert.strictEqual(selfIpdata[1].partition, 'Common');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const selfIpdata = dataSent[PATHS.SelfIp][0];
                        assert.strictEqual(
                            selfIpdata.vlan, `/Common/${declaration.Common.SelfIp.selfIp1.vlan}`
                        );
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const selfIpdata = dataSent[PATHS.SelfIp];
                        assert.strictEqual(selfIpdata[0].name, declaration.Common.SelfIp.selfIp2.name);
                        assert.strictEqual(selfIpdata[1].name, declaration.Common.SelfIp.selfIp1.name);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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

                return new Promise((resolve, reject) => {
                    const networkHandler = new NetworkHandler(declaration, bigIpMock);
                    networkHandler.process()
                        .then(() => {
                            assert.strictEqual(deletedPaths.length, 1);
                            assert.strictEqual(
                                deletedPaths[0],
                                `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`
                            );
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
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

                return new Promise((resolve, reject) => {
                    const networkHandler = new NetworkHandler(declaration, bigIpMock);
                    networkHandler.process()
                        .then(() => {
                            assert.strictEqual(deletedPaths.length, 2);
                            assert.strictEqual(
                                deletedPaths[0],
                                `${PATHS.SelfIp}/~Common~${selfIpToDelete.name}`
                            );
                            assert.strictEqual(
                                deletedPaths[1],
                                `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`
                            );
                            assert.deepEqual(
                                dataSent[PATHS.SelfIp][1],
                                selfIpToDelete
                            );
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
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

                return new Promise((resolve, reject) => {
                    const networkHandler = new NetworkHandler(declaration, bigIpMock);
                    networkHandler.process()
                        .then(() => {
                            assert.strictEqual(deletedPaths.length, 3);
                            assert.strictEqual(
                                deletedPaths[0],
                                `${PATHS.Route}/~Common~default`
                            );
                            assert.strictEqual(
                                deletedPaths[1],
                                `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp1.name}`
                            );
                            assert.strictEqual(
                                deletedPaths[2],
                                `${PATHS.SelfIp}/~Common~${declaration.Common.SelfIp.selfIp3.name}`
                            );
                            assert.deepEqual(
                                dataSent[PATHS.Route][0],
                                routeToDelete
                            );
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });
        });
    });

    describe('Route', () => {
        it('should handle fully specified Routes', () => {
            const declaration = {
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
                        }
                    }
                }
            };

            return new Promise((resolve, reject) => {
                const networkHandler = new NetworkHandler(declaration, bigIpMock);
                networkHandler.process()
                    .then(() => {
                        const routeData = dataSent[PATHS.Route];
                        assert.strictEqual(routeData[0].name, declaration.Common.Route.route1.name);
                        assert.strictEqual(routeData[0].gw, declaration.Common.Route.route1.gw);
                        assert.strictEqual(routeData[0].network, declaration.Common.Route.route1.network);
                        assert.strictEqual(routeData[0].mtu, declaration.Common.Route.route1.mtu);
                        assert.strictEqual(routeData[0].partition, 'Common');
                        assert.strictEqual(routeData[1].name, declaration.Common.Route.route2.name);
                        assert.strictEqual(routeData[1].gw, declaration.Common.Route.route2.gw);
                        assert.strictEqual(routeData[1].network, declaration.Common.Route.route2.network);
                        assert.strictEqual(routeData[1].mtu, declaration.Common.Route.route2.mtu);
                        assert.strictEqual(routeData[1].partition, 'Common');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
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
});
