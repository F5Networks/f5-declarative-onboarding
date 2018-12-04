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

let NetworkHandler;

/* eslint-disable global-require */

describe('networkHandler', () => {
    let bigIpMock;
    let dataSent;

    before(() => {
        NetworkHandler = require('../../nodejs/networkHandler');
    });

    beforeEach(() => {
        dataSent = {};
        bigIpMock = {
            createOrModify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            }
        };
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
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
});
