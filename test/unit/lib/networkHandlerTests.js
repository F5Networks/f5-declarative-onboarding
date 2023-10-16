/**
 * Copyright 2023 F5, Inc.
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

const NetworkHandler = require('../../../src/lib/networkHandler');

describe('networkHandler', () => {
    let bigIpMock;
    let all;
    let dataSent;
    let deletedPaths;
    let createdFolder;

    beforeEach(() => {
        all = [];
        dataSent = {};
        deletedPaths = [];
        createdFolder = undefined;
        bigIpMock = {
            createOrModify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                all.push(
                    {
                        action: 'createOrModify',
                        path,
                        data
                    }
                );
                return Promise.resolve();
            },
            create(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                all.push(
                    {
                        action: 'create',
                        path,
                        data
                    }
                );
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
            delete(path) {
                deletedPaths.push(path);
                all.push(
                    {
                        action: 'delete',
                        path
                    }
                );
                return Promise.resolve();
            },
            modify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            },
            transaction(commands) {
                let promise = Promise.resolve();
                commands.forEach((command) => {
                    if (command.method === 'create') {
                        promise = promise.then(() => this.create(command.path, command.body));
                    } else if (command.method === 'modify') {
                        promise = promise.then(() => this.modify(command.path, command.body));
                    } else if (command.method === 'delete') {
                        promise = promise.then(() => this.delete(command.path));
                    } else {
                        promise = promise.then(() => {
                            throw new Error(`Unrecognized command method: ${command.method}`);
                        });
                    }
                });
                return promise;
            },
            deviceInfo() {
                return Promise.resolve({
                    hostname: 'bigip.example.com'
                });
            },
            save() {
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
                            answerDefaultZones: 'no',
                            cacheSize: 5767168,
                            forwardZones: [
                                {
                                    name: 'amazonaws.com',
                                    nameservers: [
                                        {
                                            name: '192.0.2.12:53'
                                        },
                                        {
                                            name: '192.0.2.13:53'
                                        }
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        {
                                            name: '192.0.2.11:53'
                                        },
                                        {
                                            name: '192.0.2.14:53'
                                        }
                                    ]
                                }
                            ],
                            randomizeQueryNameCase: 'yes',
                            routeDomain: '0',
                            useIpv4: 'yes',
                            useIpv6: 'no',
                            useTcp: 'yes',
                            useUdp: 'no'
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
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[0].name, '192.0.2.12:53');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[1].name, '192.0.2.13:53');

                    assert.strictEqual(resolverData[0].forwardZones[1].name, 'idservice.net');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[0].name, '192.0.2.11:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[1].name, '192.0.2.14:53');

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
                                            name: '192.0.2.12:53'
                                        },
                                        {
                                            name: '192.0.2.13:53'
                                        }
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        {
                                            name: '192.0.2.11:53'
                                        },
                                        {
                                            name: '192.0.2.14:53'
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
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[0].name, '192.0.2.12:53');
                    assert.strictEqual(resolverData[0].forwardZones[0].nameservers[1].name, '192.0.2.13:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].name, 'idservice.net');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[0].name, '192.0.2.11:53');
                    assert.strictEqual(resolverData[0].forwardZones[1].nameservers[1].name, '192.0.2.14:53');
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
                            lacp: 'enabled',
                            lacpMode: 'active',
                            lacpTimeout: 'long',
                            linkSelectPolicy: 'auto',
                            qinqEthertype: '0xAF09',
                            stp: 'enabled'
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
                            autoLasthop: 'enabled',
                            cmpHash: 'dst-ip',
                            failsafe: 'enabled',
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
                            autoLasthop: 'disabled',
                            cmpHash: 'src-ip',
                            failsafe: 'disabled'
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
                    assert.strictEqual(vlanData[0].autoLasthop, 'enabled');
                    assert.strictEqual(vlanData[0].failsafe, 'enabled');
                    assert.strictEqual(vlanData[0].failsafeAction, 'reboot');
                    assert.strictEqual(vlanData[1].name, 'vlan2');
                    assert.strictEqual(vlanData[1].tag, 4093);
                    assert.strictEqual(vlanData[1].mtu, 1400);
                    assert.strictEqual(vlanData[1].partition, 'Common');
                    assert.strictEqual(vlanData[1].autoLasthop, 'disabled');
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
        beforeEach(() => {
            bigIpMock.list = (path) => {
                if (path === '/tm/sys/provision') {
                    return [
                        {
                            name: 'afm',
                            level: 'nominal'
                        },
                        {
                            name: 'asm',
                            level: 'none'
                        }
                    ];
                }
                return Promise.resolve();
            };
        });

        it('should handle fully specified SelfIps', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: '/Common/vlan1',
                            address: '192.0.2.60',
                            trafficGroup: '/Common/traffic-group-local-only',
                            allowService: ['tcp:1234', 'tcp:5678'],
                            fwEnforcedPolicy: 'firewallPolicy'
                        },
                        selfIp2: {
                            name: 'selfIp2',
                            vlan: '/Common/vlan2',
                            address: '192.0.2.110',
                            trafficGroup: '/Common/traffic-group-local-only',
                            allowService: 'default',
                            fwStagedPolicy: 'firewallPolicy'
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
                    assert.strictEqual(selfIpData[0].address, '192.0.2.60');
                    assert.strictEqual(
                        selfIpData[0].trafficGroup, '/Common/traffic-group-local-only'
                    );
                    assert.deepStrictEqual(
                        selfIpData[0].allowService, ['tcp:1234', 'tcp:5678']
                    );
                    assert.strictEqual(selfIpData[0].partition, 'Common');
                    assert.strictEqual(selfIpData[0].fwEnforcedPolicy, '/Common/firewallPolicy');
                    assert.strictEqual(selfIpData[0].fwStagedPolicy, 'none');
                    assert.strictEqual(selfIpData[1].name, 'selfIp2');
                    assert.strictEqual(selfIpData[1].vlan, '/Common/vlan2');
                    assert.strictEqual(selfIpData[1].address, '192.0.2.110');
                    assert.strictEqual(
                        selfIpData[1].trafficGroup, '/Common/traffic-group-local-only'
                    );
                    assert.strictEqual(
                        selfIpData[1].allowService, 'default'
                    );
                    assert.strictEqual(selfIpData[1].partition, 'Common');
                    assert.strictEqual(selfIpData[1].fwEnforcedPolicy, 'none');
                    assert.strictEqual(selfIpData[1].fwStagedPolicy, '/Common/firewallPolicy');
                });
        });

        it('should issue a warning if SelfIp is modified', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: '/Common/vlan1'
                        },
                        selfIp2: {
                            name: 'selfIp2',
                            vlan: '/Common/vlan2'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then((status) => {
                    assert.strictEqual(status.warnings.length, 1);
                    assert.notStrictEqual(status.warnings[0].indexOf('allowService'), -1);
                });
        });

        it('should not issue a warning if SelfIp is not modified', () => {
            const declaration = {
                Common: {
                    VLAN: {
                        external: {
                            tag: 4094,
                            mtu: 1500,
                            interfaces: [
                                {
                                    name: '1.1',
                                    tagged: false
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then((status) => {
                    assert.strictEqual(status.warnings.length, 0);
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

        it('should skip setting firewall properties to "none" when AFM is not provisioned', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            vlan: 'vlan1',
                            name: 'selfIp1'
                        }
                    }
                }
            };

            bigIpMock.list = () => Promise.resolve();

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const selfIpData = dataSent[PATHS.SelfIp];
                    assert.strictEqual(selfIpData[0].name, 'selfIp1');
                    assert.strictEqual(selfIpData[0].fwEnforcedPolicy, undefined);
                    assert.strictEqual(selfIpData[0].fwStagedPolicy, undefined);
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

        it('should temporarily clear ConfigSync IP when matching SelfIP will be modified', () => {
            const configSyncIpDataSent = [];
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp1: {
                            name: 'selfIp1',
                            vlan: '/Common/vlan1',
                            address: '192.0.2.60/24',
                            trafficGroup: '/Common/traffic-group-local-only'
                        }
                    }
                }
            };
            const device = {
                configsyncIp: '192.0.2.60'
            };

            bigIpMock.list = (path) => {
                if (path === '/tm/cm/device/~Common~bigip.example.com') {
                    return Promise.resolve(device);
                }
                return Promise.resolve();
            };
            bigIpMock.cluster = {
                configSyncIp(ip) {
                    configSyncIpDataSent.push(ip);
                    device.configsyncIp = ip;
                    return Promise.resolve();
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(configSyncIpDataSent[0], 'none');
                    assert.strictEqual(configSyncIpDataSent[1], '192.0.2.60');
                });
        });

        describe('modify self ip', () => {
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
                    allowService: ['default'],
                    fwEnforcedPolicy: '/Common/firewallPolicy'
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
                                allowService: ['default'],
                                fwEnforcedPolicy: '/Common/firewallPolicy',
                                fwStagedPolicy: undefined
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

        it('should retry on ioctl failed: No such device exception', () => {
            const declaration = {
                Common: {
                    SelfIp: {
                        selfIp: {
                            name: 'selfIp',
                            vlan: '/Common/vlan',
                            address: '192.0.2.60',
                            allowService: 'default',
                            trafficGroup: '/Common/traffic-group-local-only'
                        }
                    }
                }
            };

            const bigIpStub = sinon.stub(bigIpMock, 'create');
            bigIpStub.callsFake((path, body, icontrol, retry) => {
                assert.strictEqual(retry.continueOnErrorMessage,
                    'ioctl failed: No such device');
            });

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process();
        });
    });

    describe('Route', () => {
        let declaration = {};
        let state = {};
        let bigIpMockSpy;

        beforeEach(() => {
            bigIpMockSpy = sinon.spy(bigIpMock);

            declaration = {
                Common: {
                    Route: {
                        theRoute: {
                            name: 'theRoute',
                            gw: '10.11.12.13',
                            network: '192.0.2.20',
                            mtu: 1000
                        },
                        localRoute: {
                            name: 'localRoute',
                            tmInterface: 'targetVLAN',
                            network: '192.0.2.21',
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
                                network: '192.0.2.21/32',
                                mtu: 1000
                            },
                            localRoute: {
                                name: 'localRoute',
                                gw: '10.11.12.13',
                                network: '192.0.2.22/32',
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
                            gw: '192.0.2.10',
                            network: '192.0.2.100',
                            mtu: 1400
                        },
                        route3: {
                            name: 'route3',
                            tmInterface: 'targetTunnel',
                            network: '192.0.2.60',
                            mtu: 100,
                            localOnly: false
                        },
                        routeLocalOnly: {
                            name: 'routeLocalOnly',
                            tmInterface: 'targetVLAN',
                            network: 'default-inet6',
                            mtu: 1120,
                            localOnly: true
                        }
                    }
                }
            };

            state = {
                currentConfig: {
                    Common: {
                        Route: {}
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const routeData = dataSent[PATHS.Route];
                    assert.strictEqual(routeData[0].name, 'route1');
                    assert.strictEqual(routeData[0].gw, '0.0.0.0');
                    assert.strictEqual(routeData[0].network, 'default');
                    assert.strictEqual(routeData[0].mtu, 1500);
                    assert.strictEqual(routeData[0].partition, 'Common');
                    assert.strictEqual(routeData[1].name, 'route2');
                    assert.strictEqual(routeData[1].gw, '192.0.2.10');
                    assert.strictEqual(routeData[1].network, '192.0.2.100/32');
                    assert.strictEqual(routeData[1].mtu, 1400);
                    assert.strictEqual(routeData[1].partition, 'Common');
                    assert.strictEqual(routeData[2].name, 'route3');
                    assert.strictEqual(routeData[2].interface, '/Common/targetTunnel');
                    assert.strictEqual(routeData[2].network, '192.0.2.60/32');
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

        it('should have correct transaction command for creating new Route', () => {
            state.currentConfig.Common.Route = {};
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.create.callCount, 2);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                });
        });

        it('should have correct transaction commands for modifying existing Route', () => {
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.create.callCount, 2);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 2);
                });
        });

        it('should correctly update network property with transactions', () => {
            state.currentConfig.Common.Route = {
                localRoute: {
                    name: 'localRoute',
                    gw: '10.11.12.13',
                    network: '192.0.2.32/32',
                    mtu: 1005,
                    localOnly: true
                }
            };
            declaration.Common.Route.localRoute.network = '192.0.2.31/32';
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.create.callCount, 2);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 1);
                    assert.deepStrictEqual(deletedPaths, ['/tm/net/route/~LOCAL_ONLY~localRoute']);
                    assert.strictEqual(dataSent[PATHS.Route][1].network, '192.0.2.31/32');
                });
        });
    });

    describe('RouteDomain', () => {
        let declaration = {};
        let state = {};
        let bigIpMockSpy;

        beforeEach(() => {
            bigIpMockSpy = sinon.spy(bigIpMock);
            declaration = {
                Common: {
                    RouteDomain: {
                        rd1: {
                            name: 'rd1',
                            id: 123,
                            bwcPolicy: 'bandwidthControllerPolicy',
                            connectionLimit: 1000000,
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            fwEnforcedPolicy: 'enforcedFirewallPolicy',
                            fwStagedPolicy: 'stagedFirewallPolicy',
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            strict: 'disabled',
                            routingProtocol: [
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
                            parent: '/Common/rd1',
                            strict: 'enabled'
                        }
                    }
                }
            };
            state = {
                currentConfig: {
                    Common: {}
                }
            };
        });

        it('should handle fully specified RouteDomains', () => {
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
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
                    assert.strictEqual(routeDomainData[1].parent, '/Common/rd1');
                    assert.strictEqual(routeDomainData[1].partition, 'Common');
                    assert.strictEqual(routeDomainData[1].strict, 'enabled');
                });
        });

        it('should have transaction command use create for creating RouteDomains', () => {
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.transaction.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.create.callCount, 2);
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 0);
                });
        });

        it('should have transaction command use modify for modifying RouteDomains', () => {
            state = {
                currentConfig: {
                    Common: {
                        RouteDomain: {
                            rd1: {
                                name: 'rd1',
                                id: 123
                            },
                            rd2: {
                                name: 'rd2',
                                id: 1234
                            }
                        }
                    }
                }
            };
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.transaction.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.create.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 2);
                });
        });

        it('should have transaction command use modify for modifying RouteDomains but not route domain 0', () => {
            declaration.Common.RouteDomain['0'] = {
                name: '0',
                id: 0,
                strict: 'enabled',
                vlans: ['socks-tunnel', 'anotherVLAN']
            };
            state = {
                currentConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                name: '0',
                                id: 0,
                                strict: 'enabled',
                                vlans: ['http-tunnel', 'socks-tunnel']
                            },
                            rd1: {
                                name: 'rd1',
                                id: 123
                            },
                            rd2: {
                                name: 'rd2',
                                id: 1234
                            }
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.transaction.callCount, 1);
                    assert.deepStrictEqual(bigIpMockSpy.transaction.args[0][0],
                        [{
                            method: 'modify',
                            path: '/tm/net/route-domain/~Common~rd1',
                            body: {
                                name: 'rd1',
                                partition: 'Common',
                                id: 123,
                                connectionLimit: 1000000,
                                bwcPolicy: 'bandwidthControllerPolicy',
                                flowEvictionPolicy: 'flowEvictionPolicy',
                                fwEnforcedPolicy: 'enforcedFirewallPolicy',
                                fwStagedPolicy: 'stagedFirewallPolicy',
                                ipIntelligencePolicy: 'ipIntelligencePolicy',
                                securityNatPolicy: 'securityNatPolicy',
                                servicePolicy: 'servicePolicy',
                                strict: 'disabled',
                                parent: undefined,
                                routingProtocol: [
                                    'RIP'
                                ],
                                vlans: [
                                    'vlan1',
                                    'vlan2'
                                ]
                            }
                        },
                        {
                            method: 'modify',
                            path: '/tm/net/route-domain/~Common~rd2',
                            body: {
                                bwcPolicy: undefined,
                                connectionLimit: undefined,
                                flowEvictionPolicy: undefined,
                                fwEnforcedPolicy: undefined,
                                fwStagedPolicy: undefined,
                                name: 'rd2',
                                partition: 'Common',
                                id: 1234,
                                ipIntelligencePolicy: undefined,
                                routingProtocol: undefined,
                                securityNatPolicy: undefined,
                                servicePolicy: undefined,
                                parent: '/Common/rd1',
                                strict: 'enabled',
                                vlans: undefined
                            }
                        }]);
                    assert.strictEqual(bigIpMockSpy.create.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 2);
                    assert.strictEqual(bigIpMockSpy.modify.args[0][0],
                        '/tm/net/route-domain/~Common~rd1');
                    assert.strictEqual(bigIpMockSpy.modify.args[1][0],
                        '/tm/net/route-domain/~Common~rd2'); // Confirm the only modifications are non-default
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.deepStrictEqual(bigIpMockSpy.createOrModify.args[0][1],
                        {
                            name: '0',
                            partition: 'Common',
                            id: 0,
                            connectionLimit: undefined,
                            bwcPolicy: undefined,
                            flowEvictionPolicy: undefined,
                            fwEnforcedPolicy: undefined,
                            fwStagedPolicy: undefined,
                            ipIntelligencePolicy: undefined,
                            securityNatPolicy: undefined,
                            servicePolicy: undefined,
                            strict: 'enabled',
                            parent: undefined,
                            routingProtocol: undefined
                        });
                });
        });

        it('should not restart services a modify occurs but only route domain 0 is present', () => {
            declaration.Common.RouteDomain = {
                0: {
                    name: '0',
                    id: 0,
                    strict: 'enabled'
                }
            };

            state = {
                currentConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                name: '0',
                                id: 0,
                                vlans: ['http-tunnel', 'socks-tunnel']
                            }
                        }
                    }
                }
            };
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 0);
                });
        });

        it('should restart services a modify occurs and a non-default route domain is present', () => {
            declaration.Common.RouteDomain[0] = {
                name: '0',
                id: 0,
                strict: 'enabled'
            };

            state = {
                currentConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                name: '0',
                                id: 0,
                                vlans: ['http-tunnel', 'socks-tunnel']
                            }
                        }
                    }
                }
            };
            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 0);
                });
        });
    });

    describe('DagGlobals', () => {
        it('should handle fully specified DagGlobals', () => {
            const declaration = {
                Common: {
                    DagGlobals: {
                        dagIpv6PrefixLen: 120,
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
                            profile: 'tcp-forward',
                            mtu: 0,
                            usePmtu: 'enabled',
                            tos: 'preserve',
                            autoLasthop: 'default',
                            key: 0,
                            localAddress: '10.10.10.10',
                            remoteAddress: '192.0.2.50',
                            secondaryAddress: '192.0.2.70',
                            mode: 'bidirectional',
                            transparent: 'disabled',
                            trafficGroup: 'traffic-group-local-only'
                        },
                        tunnel2: {
                            name: 'tunnel2',
                            profile: 'tcp-forward',
                            mtu: 1000,
                            usePmtu: 'disabled',
                            tos: 12,
                            autoLasthop: 'enabled',
                            key: 1,
                            localAddress: '10.10.10.20',
                            remoteAddress: '192.0.2.30',
                            secondaryAddress: '192.0.2.80',
                            mode: 'inbound',
                            transparent: 'enabled',
                            trafficGroup: 'none'
                        },
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
                            remoteAddress: '192.0.2.40',
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
            };

            const state = {
                currentConfig: {
                    Common: {
                        TrafficControl: {
                            acceptIpOptions: false
                        },
                        Tunnel: {}
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent[PATHS.VXLAN],
                        [
                            {
                                name: 'tunnelVxlan_vxlan',
                                description: 'none',
                                defaultsFrom: 'vxlan',
                                encapsulationType: 'vxlan',
                                floodingType: 'multicast',
                                partition: 'Common',
                                port: 4789
                            }
                        ]
                    );
                    assert.deepStrictEqual(
                        dataSent[PATHS.TrafficControl],
                        [
                            {
                                acceptIpOptions: false
                            }
                        ]
                    );
                    assert.deepStrictEqual(
                        dataSent[PATHS.Tunnel],
                        [
                            {
                                name: 'tunnel1',
                                description: undefined,
                                partition: 'Common',
                                autoLasthop: 'default',
                                mtu: 0,
                                profile: '/Common/tcp-forward',
                                tos: 'preserve',
                                usePmtu: 'enabled',
                                localAddress: '10.10.10.10',
                                remoteAddress: '192.0.2.50',
                                secondaryAddress: '192.0.2.70',
                                key: 0,
                                mode: 'bidirectional',
                                transparent: 'disabled',
                                trafficGroup: 'traffic-group-local-only'
                            },
                            {
                                name: 'tunnel2',
                                description: undefined,
                                partition: 'Common',
                                autoLasthop: 'enabled',
                                mtu: 1000,
                                profile: '/Common/tcp-forward',
                                tos: 12,
                                usePmtu: 'disabled',
                                localAddress: '10.10.10.20',
                                remoteAddress: '192.0.2.30',
                                secondaryAddress: '192.0.2.80',
                                key: 1,
                                mode: 'inbound',
                                transparent: 'enabled',
                                trafficGroup: 'none'
                            },
                            {
                                name: 'tunnelVxlan',
                                description: 'none',
                                partition: 'Common',
                                autoLasthop: 'default',
                                mtu: 0,
                                profile: '/Common/tunnelVxlan_vxlan',
                                tos: 'preserve',
                                usePmtu: 'enabled',
                                localAddress: '10.10.0.0',
                                remoteAddress: '192.0.2.40',
                                secondaryAddress: 'any6',
                                key: 0,
                                mode: 'bidirectional',
                                transparent: 'disabled',
                                trafficGroup: 'none'
                            }
                        ]
                    );
                });
        });

        describe('setting the acceptIpOptions with vxlan tunnels', () => {
            it('should handle when acceptIpOptions currentConfig is false, but declaration is true', () => {
                const declaration = {
                    Common: {
                        TrafficControl: {
                            acceptIpOptions: true
                        },
                        Tunnel: {
                            tunnelVxlan: {
                                name: 'tunnelVxlan',
                                profile: 'vxlan'
                            }
                        }
                    }
                };

                const state = {
                    currentConfig: {
                        Common: {
                            TrafficControl: {
                                acceptIpOptions: false
                            },
                            Tunnel: {}
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[PATHS.TrafficControl],
                            [
                                {
                                    acceptIpOptions: true
                                }
                            ]
                        );
                        // quick checks that something was sent
                        assert.strictEqual(dataSent[PATHS.VXLAN].length, 1);
                        assert.strictEqual(dataSent[PATHS.Tunnel].length, 1);
                    });
            });

            it('should handle when acceptIpOptions is not in the declaration (e.g. nothing in the diff)', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnelVxlan: {
                                name: 'tunnelVxlan',
                                profile: 'vxlan'
                            }
                        }
                    }
                };

                const state = {
                    currentConfig: {
                        Common: {
                            TrafficControl: {
                                acceptIpOptions: false
                            },
                            Tunnel: {}
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            dataSent[PATHS.TrafficControl],
                            [
                                {
                                    acceptIpOptions: false
                                }
                            ]
                        );

                        // quick checks that something was sent
                        assert.strictEqual(dataSent[PATHS.VXLAN].length, 1);
                        assert.strictEqual(dataSent[PATHS.Tunnel].length, 1);
                    });
            });
        });

        describe('pre-delete', () => {
            const state = {
                currentConfig: {
                    Common: {
                        Tunnel: {
                            tunnel1: {
                                profile: 'originalProfile',
                                trafficGroup: 'originalTrafficGroup'
                            }
                        }
                    }
                }
            };

            it('should delete existing tunnel if changing the trafficGroup', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnel1: {
                                name: 'tunnel1',
                                profile: 'originalProfile',
                                trafficGroup: 'newTrafficGroup'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 1);
                        assert.strictEqual(deletedPaths[0], '/tm/net/tunnels/tunnel/tunnel1');
                    });
            });

            it('should not delete existing tunnel if not changing the trafficGroup', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnel1: {
                                name: 'tunnel1',
                                profile: 'originalProfile',
                                trafficGroup: 'originalTrafficGroup'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 0);
                    });
            });

            it('should delete existing tunnel if changing the profile', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnel1: {
                                name: 'tunnel1',
                                profile: 'newProfile',
                                trafficGroup: 'originalTrafficGroup'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 1);
                        assert.strictEqual(deletedPaths[0], '/tm/net/tunnels/tunnel/tunnel1');
                    });
            });

            it('should delete vxlan profile if the profile changes from vxlan', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnelVxlan: {
                                name: 'tunnelVxlan',
                                profile: 'otherProfile',
                                trafficGroup: 'originalTrafficGroup'
                            }
                        }
                    }
                };

                state.currentConfig.Common.Tunnel = {
                    tunnelVxlan: {
                        name: 'tunnelVxlan',
                        profile: 'vxlan',
                        trafficGroup: 'originalTrafficGroup'
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(
                            deletedPaths,
                            [
                                '/tm/net/tunnels/tunnel/tunnelVxlan',
                                '/tm/net/tunnels/vxlan/tunnelVxlan_vxlan'
                            ]
                        );
                    });
            });

            it('should not delete existing tunnel if not changing the profile', () => {
                const declaration = {
                    Common: {
                        Tunnel: {
                            tunnel1: {
                                name: 'tunnel1',
                                profile: 'originalProfile',
                                trafficGroup: 'originalTrafficGroup'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.strictEqual(deletedPaths.length, 0);
                    });
            });
        });
    });

    describe('handleEnableRouting', () => {
        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RoutingAsPath', () => {
            const declaration = {
                Common: {
                    RoutingAsPath: {
                        RoutingAsPath1: {
                            name: 'RoutingAsPath1',
                            entries: [
                                {
                                    name: 10,
                                    regex: '^$'
                                }
                            ]
                        },
                        RoutingAsPath2: {
                            name: 'RoutingAsPath2',
                            entries: [
                                {
                                    name: 15,
                                    regex: 'funky$'
                                },
                                {
                                    name: 20,
                                    regex: '^$'
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RoutingAccessList', () => {
            const declaration = {
                Common: {
                    RoutingAccessList: {
                        RoutingAccessList1: {
                            name: 'RoutingAccessList1',
                            entries: [
                                {
                                    name: 10
                                }
                            ]
                        },
                        RoutingAccessList2: {
                            name: 'RoutingAccessList2',
                            entries: [
                                {
                                    name: 20
                                },
                                {
                                    name: 30
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RoutingPrefixList', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    prefix: '10.2.2.0/24',
                                    prefixLenRange: 32
                                }
                            ]
                        },
                        RoutingPrefixList2: {
                            name: 'RoutingPrefixList2',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLenRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/23',
                                    prefixLenRange: 24
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RouteMap', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [
                                {
                                    name: 33,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/asPath1',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList1'
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        RouteMap2: {
                            name: 'RouteMap2',
                            entries: [
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/asPath2',
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList2'
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RoutingBGP', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingBGP: {
                        routingBGP1: {
                            name: 'routingBGP1'
                        },
                        routingBGP2: {
                            name: 'routingBGP2'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should send out 1 enable value to the sys/db/...routing endpoint if a declaration includes RoutingAsPath, RoutingAccessList, RoutingPrefixList, RouteMap, and RoutingBGP', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingAsPath: {
                        RoutingAsPath1: {
                            name: 'RoutingAsPath1',
                            entries: [
                                {
                                    name: 10,
                                    regex: '^$'
                                }
                            ]
                        },
                        RoutingAsPath2: {
                            name: 'RoutingAsPath2',
                            entries: [
                                {
                                    name: 15,
                                    regex: 'funky$'
                                },
                                {
                                    name: 20,
                                    regex: '^$'
                                }
                            ]
                        }
                    },
                    RoutingAccessList: {
                        RoutingAccessList1: {
                            name: 20,
                            entries: []
                        }
                    },
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    prefix: '10.2.2.0/24',
                                    prefixLenRange: 32
                                }
                            ]
                        },
                        RoutingPrefixList2: {
                            name: 'RoutingPrefixList2',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLenRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/23',
                                    prefixLenRange: 24
                                }
                            ]
                        }
                    },
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [
                                {
                                    name: 33,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/RoutingAsPath1',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/RoutingPrefixList1'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/RoutingPrefixList2'
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    RoutingBGP: {
                        RoutingBGP1: {
                            name: 'routingBGP1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, [{ value: 'enable' }]);
                });
        });

        it('should not send out an enable value to the sys/db/...routing endpoint if a declaration lacks RoutingAsPath, RoutingPrefixList, RouteMap, and RoutingBGP', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingAsPath: {},
                    RoutingPrefixList: {},
                    RouteMap: {},
                    RoutingBGP: {}
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent['/tm/sys/db/tmrouted.tmos.routing'];
                    assert.deepStrictEqual(data, undefined);
                });
        });
    });

    describe('RoutingAsPath', () => {
        it('should handle a fully specified Routing As Path', () => {
            const declaration = {
                Common: {
                    RoutingAsPath: {
                        RoutingAsPath1: {
                            name: 'RoutingAsPath1',
                            entries: [
                                {
                                    name: 10,
                                    regex: '^$'
                                }
                            ]
                        },
                        RoutingAsPath2: {
                            name: 'RoutingAsPath2',
                            entries: [
                                {
                                    name: 15,
                                    regex: 'funky$'
                                },
                                {
                                    name: 20,
                                    regex: '^$'
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingAsPath];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingAsPath1',
                        partition: 'Common',
                        entries: {
                            10: {
                                action: 'permit',
                                regex: '^$'
                            }
                        }
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RoutingAsPath2',
                        partition: 'Common',
                        entries: {
                            15: {
                                action: 'permit',
                                regex: 'funky$'
                            },
                            20: {
                                action: 'permit',
                                regex: '^$'
                            }
                        }
                    });
                });
        });

        it('should handle empty entries property', () => {
            const declaration = {
                Common: {
                    RoutingAsPath: {
                        RoutingAsPath1: {
                            name: 'RoutingAsPath1',
                            entries: []
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingAsPath];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingAsPath1',
                        partition: 'Common',
                        entries: {}
                    });
                });
        });
    });

    describe('RoutingAccessList', () => {
        it('should handle a fully specified Routing Access List', () => {
            const declaration = {
                Common: {
                    RoutingAccessList: {
                        RoutingAccessList1: {
                            name: 'RoutingAccessList1',
                            description: 'my description 1',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    destination: '10.2.2.0/24',
                                    exactMatch: 'disabled',
                                    source: '10.3.3.0/24'
                                },
                                {
                                    name: 20,
                                    action: 'deny',
                                    destination: '10.4.4.1/32',
                                    exactMatch: 'disabled',
                                    source: '10.4.4.2/32'
                                }
                            ]
                        },
                        RoutingAccessList2: {
                            name: 'RoutingAccessList2',
                            description: 'my description 2',
                            entries: [
                                {
                                    name: 30,
                                    action: 'permit',
                                    destination: '0.0.0.0/0',
                                    exactMatch: 'enabled',
                                    source: '10.5.5.1'
                                }
                            ]
                        },
                        RoutingAccessList3: {
                            name: 'RoutingAccessList3',
                            description: 'my description 3',
                            entries: [
                                {
                                    name: 40,
                                    action: 'permit',
                                    destination: '1111:1111::/64',
                                    exactMatch: 'disabled',
                                    source: '1111:3333::/64'
                                },
                                {
                                    name: 50,
                                    action: 'deny',
                                    destination: '1111:2222::/128',
                                    exactMatch: 'disabled',
                                    source: '1111:3333::/128'
                                }
                            ]
                        },
                        RoutingAccessList4: {
                            name: 'RoutingAccessList4',
                            entries: [
                                {
                                    name: 60,
                                    action: 'permit',
                                    destination: '::',
                                    exactMatch: 'enabled',
                                    source: '1111:3333::/64'
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingAccessList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingAccessList1',
                        partition: 'Common',
                        description: 'my description 1',
                        entries: {
                            10: {
                                action: 'permit',
                                destination: '10.2.2.0/24',
                                exactMatch: 'disabled',
                                source: '10.3.3.0/24'
                            },
                            20: {
                                action: 'deny',
                                destination: '10.4.4.1/32',
                                exactMatch: 'disabled',
                                source: '10.4.4.2/32'
                            }
                        }
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RoutingAccessList2',
                        partition: 'Common',
                        description: 'my description 2',
                        entries: {
                            30: {
                                action: 'permit',
                                destination: '0.0.0.0/0',
                                exactMatch: 'enabled',
                                source: '10.5.5.1'
                            }
                        }
                    });
                    assert.deepStrictEqual(data[2], {
                        name: 'RoutingAccessList3',
                        partition: 'Common',
                        description: 'my description 3',
                        entries: {
                            40: {
                                action: 'permit',
                                destination: '1111:1111::/64',
                                exactMatch: 'disabled',
                                source: '1111:3333::/64'
                            },
                            50: {
                                action: 'deny',
                                destination: '1111:2222::/128',
                                exactMatch: 'disabled',
                                source: '1111:3333::/128'
                            }
                        }
                    });
                    assert.deepStrictEqual(data[3], {
                        name: 'RoutingAccessList4',
                        partition: 'Common',
                        description: undefined,
                        entries: {
                            60: {
                                action: 'permit',
                                destination: '::',
                                exactMatch: 'enabled',
                                source: '1111:3333::/64'
                            }
                        }
                    });
                });
        });

        it('should handle empty entries property', () => {
            const declaration = {
                Common: {
                    RoutingAccessList: {
                        RoutingAccessList1: {
                            name: 'RoutingAccessList1',
                            entries: []
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingAccessList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingAccessList1',
                        partition: 'Common',
                        description: undefined,
                        entries: {}
                    });
                });
        });
    });

    describe('RoutingPrefixList', () => {
        let state;
        let bigIpMockSpy;

        beforeEach(() => {
            bigIpMockSpy = sinon.spy(bigIpMock);
            state = {
                currentConfig: {
                    Common: {}
                }
            };
        });

        it('should handle a fully specified Routing Prefix List', () => {
            const declaration = {
                Common: {
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            routeDomain: 'testRouteDomain',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    prefix: '10.2.2.0/24',
                                    prefixLenRange: 32
                                }
                            ]
                        },
                        RoutingPrefixList2: {
                            name: 'RoutingPrefixList2',
                            routeDomain: 'testRouteDomain2',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLenRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/23',
                                    prefixLenRange: 24
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingPrefixList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingPrefixList1',
                        partition: 'Common',
                        routeDomain: 'testRouteDomain',
                        entries: {
                            10: {
                                action: 'permit',
                                prefix: '10.2.2.0/24',
                                prefixLenRange: 32
                            }
                        }
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RoutingPrefixList2',
                        partition: 'Common',
                        routeDomain: 'testRouteDomain2',
                        entries: {
                            20: {
                                action: 'permit',
                                prefix: '10.3.3.0/24',
                                prefixLenRange: 32
                            },
                            30: {
                                action: 'deny',
                                prefix: '10.4.4.0/23',
                                prefixLenRange: 24
                            }
                        }
                    });
                });
        });

        it('should handle empty entries property', () => {
            const declaration = {
                Common: {
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            routeDomain: '0',
                            entries: []
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingPrefixList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingPrefixList1',
                        partition: 'Common',
                        routeDomain: '0',
                        entries: {}
                    });
                });
        });

        it('should delete first if routeDomain changes', () => {
            state = {
                currentConfig: {
                    Common: {
                        RoutingPrefixList: {
                            RoutingPrefixList1: {
                                name: 'RoutingPrefixList1',
                                entries: [],
                                routeDomain: '0'
                            }
                        }
                    }
                }
            };

            const declaration = {
                Common: {
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            entries: [],
                            routeDomain: '1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingPrefixList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingPrefixList1',
                        partition: 'Common',
                        routeDomain: '1'
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RoutingPrefixList1',
                        partition: 'Common',
                        entries: {}
                    });
                    // modify enables /tm/sys/db/tmrouted.tmos.routing
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 1);
                    assert.strictEqual(bigIpMock.transaction.callCount, 1);
                    // delete comes from the first command in the transaction
                    assert.strictEqual(bigIpMock.delete.callCount, 1);
                    // create comes from the second command in the transaction
                    assert.strictEqual(bigIpMockSpy.create.callCount, 1);
                    // createOrModify comes immediately after the transaction
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                });
        });

        it('should not delete if routeDomain unchanged', () => {
            state = {
                currentConfig: {
                    Common: {
                        RoutingPrefixList: {
                            RoutingPrefixList1: {
                                name: 'RoutingPrefixList1',
                                entries: [],
                                routeDomain: '1'
                            }
                        }
                    }
                }
            };

            const declaration = {
                Common: {
                    RoutingPrefixList: {
                        RoutingPrefixList1: {
                            name: 'RoutingPrefixList1',
                            entries: [],
                            routeDomain: '1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingPrefixList];
                    assert.deepStrictEqual(data[0], {
                        name: 'RoutingPrefixList1',
                        partition: 'Common',
                        entries: {},
                        routeDomain: '1'
                    });
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                });
        });
    });

    describe('RouteMap', () => {
        let bigIpMockSpy;

        beforeEach(() => {
            bigIpMockSpy = sinon.spy(bigIpMock);
        });

        it('should handle a fully specified RouteMap', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [
                                {
                                    name: 33,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/asPath1',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList1'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/routingPrefixList2'
                                            }
                                        },
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList3'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/routingPrefixList4'
                                            }
                                        }
                                    }
                                }
                            ],
                            routeDomain: '1'
                        },
                        RouteMap2: {
                            name: 'RouteMap2',
                            entries: [
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/asPath2',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList5'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/routingPrefixList6'
                                            }
                                        }
                                    }
                                },
                                {
                                    name: 55,
                                    action: 'deny',
                                    match: {
                                        asPath: '/Common/asPath3',
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/routingPrefixList7'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/routingPrefixList8'
                                            }
                                        }
                                    }
                                }
                            ],
                            routeDomain: '2'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RouteMap];
                    assert.deepStrictEqual(data[0], {
                        name: 'RouteMap1',
                        partition: 'Common',
                        entries: {
                            33: {
                                action: 'permit',
                                match: {
                                    asPath: '/Common/asPath1',
                                    ipv4: {
                                        address: {
                                            prefixList: '/Common/routingPrefixList1'
                                        },
                                        nextHop: {
                                            prefixList: '/Common/routingPrefixList2'
                                        }
                                    },
                                    ipv6: {
                                        address: {
                                            prefixList: '/Common/routingPrefixList3'
                                        },
                                        nextHop: {
                                            prefixList: '/Common/routingPrefixList4'
                                        }
                                    }
                                }
                            }
                        },
                        routeDomain: '1'
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RouteMap2',
                        partition: 'Common',
                        entries: {
                            44: {
                                action: 'permit',
                                match: {
                                    asPath: '/Common/asPath2',
                                    ipv4: {
                                        address: {
                                            prefixList: '/Common/routingPrefixList5'
                                        },
                                        nextHop: {
                                            prefixList: '/Common/routingPrefixList6'
                                        }
                                    }
                                }
                            },
                            55: {
                                action: 'deny',
                                match: {
                                    asPath: '/Common/asPath3',
                                    ipv6: {
                                        address: {
                                            prefixList: '/Common/routingPrefixList7'
                                        },
                                        nextHop: {
                                            prefixList: '/Common/routingPrefixList8'
                                        }
                                    }
                                }
                            }
                        },
                        routeDomain: '2'
                    });
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 2);
                });
        });

        it('should handle empty entries property', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [],
                            routeDomain: '0'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RouteMap];
                    assert.deepStrictEqual(data[0], {
                        name: 'RouteMap1',
                        partition: 'Common',
                        entries: {},
                        routeDomain: '0'
                    });
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                });
        });

        it('should delete first if routeDomain changes', () => {
            const state = {
                currentConfig: {
                    Common: {
                        RouteMap: {
                            RouteMap1: {
                                name: 'RouteMap1',
                                entries: [],
                                routeDomain: '0'
                            }
                        }
                    }
                }
            };

            const declaration = {
                Common: {
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [],
                            routeDomain: '1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RouteMap];
                    assert.deepStrictEqual(data[0], {
                        name: 'RouteMap1',
                        partition: 'Common',
                        routeDomain: '1'
                    });
                    assert.deepStrictEqual(data[1], {
                        name: 'RouteMap1',
                        partition: 'Common',
                        entries: {}
                    });
                    // modify enables /tm/sys/db/tmrouted.tmos.routing
                    assert.strictEqual(bigIpMockSpy.modify.callCount, 1);
                    assert.strictEqual(bigIpMock.transaction.callCount, 1);
                    // delete comes from the first command in the transaction
                    assert.strictEqual(bigIpMock.delete.callCount, 1);
                    // create comes from the second command in the transaction
                    assert.strictEqual(bigIpMockSpy.create.callCount, 1);
                    // createOrModify comes immediately after the transaction
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                });
        });

        it('should not delete if routeDomain unchanged', () => {
            const state = {
                currentConfig: {
                    Common: {
                        RouteMap: {
                            RouteMap1: {
                                name: 'RouteMap1',
                                entries: [],
                                routeDomain: '1'
                            }
                        }
                    }
                }
            };

            const declaration = {
                Common: {
                    RouteMap: {
                        RouteMap1: {
                            name: 'RouteMap1',
                            entries: [],
                            routeDomain: '1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RouteMap];
                    assert.deepStrictEqual(data[0], {
                        name: 'RouteMap1',
                        partition: 'Common',
                        entries: {},
                        routeDomain: '1'
                    });
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                });
        });
    });

    describe('RoutingBGP', () => {
        let bigIpMockSpy;

        beforeEach(() => {
            bigIpMockSpy = sinon.spy(bigIpMock);
        });

        it('should handle a fully specified RoutingBGP', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingBGP: {
                        routingBgp: {
                            name: 'routingBgp',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    redistribute: [
                                        {
                                            routingProtocol: 'kernel',
                                            routeMap: '/Common/routeMap1'
                                        },
                                        {
                                            routingProtocol: 'ospf'
                                        }
                                    ]
                                },
                                {
                                    name: 'ipv6',
                                    redistribute: [
                                        {
                                            routingProtocol: 'rip',
                                            routeMap: 'none'
                                        },
                                        {
                                            routingProtocol: 'static',
                                            routeMap: '/Common/routeMap2'
                                        }
                                    ]
                                }
                            ],
                            gracefulRestart: {
                                gracefulReset: 'enabled',
                                restartTime: 120,
                                stalepathTime: 240
                            },
                            holdTime: 35,
                            keepAlive: 10,
                            localAs: 65010,
                            peerGroups: [
                                {
                                    name: 'Neighbor_IN',
                                    addressFamily: [
                                        {
                                            name: 'ipv4',
                                            routeMap: {
                                                in: 'routeMapIn1',
                                                out: 'routeMapOut1'
                                            },
                                            softReconfigurationInbound: 'enabled'
                                        }
                                    ],
                                    remoteAs: 65020
                                },
                                {
                                    name: 'Neighbor_OUT',
                                    addressFamily: [
                                        {
                                            name: 'ipv6',
                                            routeMap: {
                                                in: 'routeMapIn2',
                                                out: 'routeMapOut2'
                                            },
                                            softReconfigurationInbound: 'disabled'
                                        }
                                    ],
                                    remoteAs: 65040
                                }
                            ],
                            neighbors: [
                                {
                                    name: '10.2.2.2',
                                    ebgpMultihop: 1,
                                    peerGroup: 'Neighbor_IN'
                                },
                                {
                                    name: '10.2.2.3',
                                    ebgpMultihop: 2,
                                    peerGroup: 'Neighbor_OUT'
                                }
                            ],
                            routeDomain: '1',
                            routerId: '10.1.1.1'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingBGP];
                    assert.deepStrictEqual(data[0], {
                        name: 'routingBgp',
                        partition: 'Common',
                        addressFamily: [
                            {
                                name: 'ipv4',
                                redistribute: [
                                    {
                                        name: 'kernel',
                                        routeMap: '/Common/routeMap1'
                                    },
                                    {
                                        name: 'ospf',
                                        routeMap: undefined
                                    }
                                ]
                            },
                            {
                                name: 'ipv6',
                                redistribute: [
                                    {
                                        name: 'rip',
                                        routeMap: 'none'
                                    },
                                    {
                                        name: 'static',
                                        routeMap: '/Common/routeMap2'
                                    }
                                ]
                            }
                        ],
                        gracefulRestart: {
                            gracefulReset: 'enabled',
                            restartTime: 120,
                            stalepathTime: 240
                        },
                        holdTime: 35,
                        keepAlive: 10,
                        localAs: 65010,
                        neighbor: [
                            {
                                name: '10.2.2.2',
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            },
                            {
                                name: '10.2.2.3',
                                ebgpMultihop: 2,
                                peerGroup: 'Neighbor_OUT'
                            }
                        ],
                        peerGroup: [
                            {
                                name: 'Neighbor_IN',
                                addressFamily: [
                                    {
                                        name: 'ipv4',
                                        routeMap: {
                                            in: 'routeMapIn1',
                                            out: 'routeMapOut1'
                                        },
                                        softReconfigurationInbound: 'enabled'
                                    }
                                ],
                                remoteAs: 65020
                            },
                            {
                                name: 'Neighbor_OUT',
                                addressFamily: [
                                    {
                                        name: 'ipv6',
                                        routeMap: {
                                            in: 'routeMapIn2',
                                            out: 'routeMapOut2'
                                        },
                                        softReconfigurationInbound: 'disabled'
                                    }
                                ],
                                remoteAs: 65040
                            }
                        ],
                        routeDomain: '1',
                        routerId: '10.1.1.1'
                    });
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                });
        });

        it('should handle renaming a RoutingBGP', () => {
            const state = {
                currentConfig: {
                    Common: {
                        RoutingBGP: {
                            oldName: {
                                name: 'oldName'
                            },
                            keepMe: {
                                name: 'keepMe'
                            }
                        }
                    }
                }
            };

            const declaration = {
                Common: {
                    RoutingBGP: {
                        newName: {
                            name: 'newName'
                        },
                        keepMe: {
                            name: 'keepMe'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    assert.deepStrictEqual(deletedPaths.length, 1);
                    assert.deepStrictEqual(deletedPaths[0], '/tm/net/routing/bgp/~Common~oldName');
                    assert.deepStrictEqual(dataSent[PATHS.RoutingBGP].length, 2);
                    assert.deepStrictEqual(dataSent[PATHS.RoutingBGP][0].name, 'newName');
                    assert.deepStrictEqual(dataSent[PATHS.RoutingBGP][1].name, 'keepMe');
                });
        });

        it('should handle a false gracefulResetEnabled', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingBGP: {
                        routingBgp: {
                            name: 'routingBgp',
                            gracefulRestart: {
                                gracefulReset: 'disabled'
                            }
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingBGP];
                    assert.deepStrictEqual(data[0].gracefulRestart.gracefulReset, 'disabled');
                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                });
        });

        it('should handle an empty peerGroups addressFamily routeMap', () => {
            const state = {
                currentConfig: {
                    Common: {}
                }
            };

            const declaration = {
                Common: {
                    RoutingBGP: {
                        routingBgp: {
                            name: 'routingBgp',
                            gracefulRestart: {
                                gracefulReset: 'disabled',
                                restartTime: 0,
                                stalepathTime: 0
                            },
                            holdTime: 90,
                            keepAlive: 30,
                            localAs: 65010,
                            peerGroups: [
                                {
                                    name: 'Neighbor_IN',
                                    addressFamily: [
                                        {
                                            name: 'ipv4',
                                            routeMap: {},
                                            softReconfigurationInbound: 'enabled'
                                        }
                                    ],
                                    remoteAs: 65020
                                }
                            ],
                            routeDomain: '0',
                            routerId: 'any6'
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
            return networkHandler.process()
                .then(() => {
                    const data = dataSent[PATHS.RoutingBGP];
                    assert.deepStrictEqual(data[0], {
                        name: 'routingBgp',
                        addressFamily: [],
                        gracefulRestart: {
                            gracefulReset: 'disabled',
                            restartTime: 0,
                            stalepathTime: 0
                        },
                        holdTime: 90,
                        keepAlive: 30,
                        localAs: 65010,
                        partition: 'Common',
                        neighbor: [],
                        peerGroup: [
                            {
                                name: 'Neighbor_IN',
                                addressFamily: [
                                    {
                                        name: 'ipv4',
                                        routeMap: {
                                            in: undefined,
                                            out: undefined
                                        },
                                        softReconfigurationInbound: 'enabled'
                                    }
                                ],
                                remoteAs: 65020
                            }
                        ],
                        routeDomain: '0',
                        routerId: 'any6'
                    });

                    assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                    assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                });
        });

        describe('rejections and deletions', () => {
            it('should reject in the delete phase', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp',
                                    peerGroups: [
                                        {
                                            name: 'Neighbor_IN'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp'
                            }
                        }
                    }
                };

                bigIpMock.delete = () => Promise.reject(new Error('Test generated error'));
                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return assert.isRejected(networkHandler.process(), 'Test generated error');
            });

            it('should reject in the create phase', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp',
                                    peerGroups: [
                                        {
                                            name: 'Neighbor_IN'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp'
                            }
                        }
                    }
                };

                bigIpMock.createOrModify = () => Promise.reject(new Error('Test generated error'));
                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return assert.isRejected(networkHandler.process(), 'Test generated error');
            });

            it('should call delete if RoutingBGP is in decl and current config and current has peerGroups members', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp',
                                    peerGroups: [
                                        {
                                            name: 'Neighbor_IN'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(deletedPaths.length, 1);
                        assert.deepStrictEqual(deletedPaths[0], '/tm/net/routing/bgp/~Common~routingBgp');
                        assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                        assert.strictEqual(bigIpMockSpy.delete.callCount, 1);
                    });
            });

            it('should call delete if RoutingBGP has localAs changes', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp',
                                    localAs: 10
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp',
                                localAs: 20
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        const data = dataSent[PATHS.RoutingBGP];
                        assert.deepStrictEqual(data[0].localAs, 20);
                        assert.deepStrictEqual(deletedPaths.length, 1);
                        assert.deepStrictEqual(deletedPaths[0], '/tm/net/routing/bgp/~Common~routingBgp');
                        assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                        assert.strictEqual(bigIpMockSpy.delete.callCount, 1);
                    });
            });

            it('should not call delete if RoutingBGP is in decl and current config and current has no peerGroups members', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp',
                                    peerGroups: []
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(deletedPaths.length, 0);
                        assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                        assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    });
            });

            it('should not call delete if RoutingBGP is in decl and current config and current has no peerGroups', () => {
                const state = {
                    currentConfig: {
                        Common: {
                            RoutingBGP: {
                                routingBgp: {
                                    name: 'routingBgp'
                                }
                            }
                        }
                    }
                };

                const declaration = {
                    Common: {
                        RoutingBGP: {
                            routingBgp: {
                                name: 'routingBgp'
                            }
                        }
                    }
                };

                const networkHandler = new NetworkHandler(declaration, bigIpMock, null, state);
                return networkHandler.process()
                    .then(() => {
                        assert.deepStrictEqual(deletedPaths.length, 0);
                        assert.strictEqual(bigIpMockSpy.createOrModify.callCount, 1);
                        assert.strictEqual(bigIpMockSpy.delete.callCount, 0);
                    });
            });
        });
    });

    describe('FirewallAddressList', () => {
        it('should handle a FirewallAddressList', () => {
            const declaration = {
                Common: {
                    FirewallAddressList: {
                        fwAddressListOne: {
                            name: 'fwAddressListOne',
                            description: 'test firewall address list one description',
                            addresses: ['192.168.0.0/32', '10.0.1.0/24'],
                            fqdns: ['www.example.com', 'example.example.com'],
                            geo: ['US:Washington', 'US:Oregon']
                        },
                        fwAddressListTwo: {
                            name: 'fwAddressListTwo',
                            description: 'test firewall address list two description',
                            addresses: ['192.168.1.0/32', '10.0.2.0/24']
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const firewallAddressLists = dataSent[PATHS.FirewallAddressList];
                    assert.deepStrictEqual(
                        firewallAddressLists[0],
                        {
                            name: 'fwAddressListOne',
                            description: 'test firewall address list one description',
                            addresses: ['192.168.0.0/32', '10.0.1.0/24'],
                            fqdns: ['www.example.com', 'example.example.com'],
                            geo: ['US:Washington', 'US:Oregon']
                        }
                    );
                    assert.deepStrictEqual(
                        firewallAddressLists[1],
                        {
                            name: 'fwAddressListTwo',
                            description: 'test firewall address list two description',
                            addresses: ['192.168.1.0/32', '10.0.2.0/24']
                        }
                    );
                });
        });
    });

    describe('FirewallPortList', () => {
        it('should handle a FirewallPortList', () => {
            const declaration = {
                Common: {
                    FirewallPortList: {
                        fwPortListOne: {
                            name: 'fwPortListOne',
                            description: 'test firewall port list one description',
                            ports: [8080, 8888]
                        },
                        fwPortListTwo: {
                            name: 'fwPortListTwo',
                            description: 'test firewall port list two description',
                            ports: ['8123', '8124']
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const firewallPortLists = dataSent[PATHS.FirewallPortList];
                    assert.deepStrictEqual(
                        firewallPortLists[0],
                        {
                            name: 'fwPortListOne',
                            description: 'test firewall port list one description',
                            ports: ['8080', '8888']
                        }
                    );
                    assert.deepStrictEqual(
                        firewallPortLists[1],
                        {
                            name: 'fwPortListTwo',
                            description: 'test firewall port list two description',
                            ports: ['8123', '8124']
                        }
                    );
                });
        });
    });

    describe('FirewallPolicy', () => {
        it('should handle FirewallPolicy', () => {
            const declaration = {
                Common: {
                    FirewallPolicy: {
                        firewallPolicyOne: {
                            name: 'firewallPolicyOne',
                            rules: []
                        },
                        firewallPolicyTwo: {
                            name: 'firewallPolicyTwo',
                            description: 'test firewall policy description',
                            rules: [
                                {
                                    name: 'firewallRuleOne',
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: 'no',
                                    source: {},
                                    destination: {}
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    description: 'firewall rule two description',
                                    action: 'reject',
                                    ipProtocol: 'tcp',
                                    log: 'yes',
                                    source: {
                                        vlans: [
                                            '/Common/vlan1',
                                            '/Common/vlan2'
                                        ],
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    const firewallPolicy = dataSent[PATHS.FirewallPolicy];
                    assert.deepStrictEqual(
                        firewallPolicy[0],
                        {
                            name: 'firewallPolicyOne',
                            description: undefined,
                            rules: []
                        }
                    );
                    assert.deepStrictEqual(
                        firewallPolicy[1],
                        {
                            name: 'firewallPolicyTwo',
                            description: 'test firewall policy description',
                            rules: [
                                {
                                    name: 'firewallRuleOne',
                                    description: undefined,
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: 'no',
                                    placeAfter: 'first',
                                    source: {
                                        vlans: [],
                                        addressLists: [],
                                        portLists: []
                                    },
                                    destination: {
                                        addressLists: [],
                                        portLists: []
                                    }
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    description: 'firewall rule two description',
                                    action: 'reject',
                                    ipProtocol: 'tcp',
                                    log: 'yes',
                                    placeAfter: 'firewallRuleOne',
                                    source: {
                                        vlans: [
                                            '/Common/vlan1',
                                            '/Common/vlan2'
                                        ],
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    }
                                }
                            ]
                        }
                    );
                });
        });
    });

    describe('ManagementIpFirewall', () => {
        it('should handle ManagementIpFirewall', () => {
            const declaration = {
                Common: {
                    ManagementIpFirewall: {
                        description: 'test management IP firewall description',
                        rules: [
                            {
                                name: 'firewallRuleOne',
                                action: 'accept',
                                ipProtocol: 'any',
                                log: 'no',
                                source: {},
                                destination: {}
                            },
                            {
                                name: 'firewallRuleTwo',
                                description: 'firewall rule two description',
                                action: 'reject',
                                ipProtocol: 'tcp',
                                log: 'yes',
                                source: {
                                    addressLists: [
                                        '/Common/addressList1',
                                        '/Common/addressList2'
                                    ],
                                    portLists: [
                                        '/Common/portList1',
                                        '/Common/portList2'
                                    ]
                                },
                                destination: {
                                    addressLists: [
                                        '/Common/addressList1',
                                        '/Common/addressList2'
                                    ],
                                    portLists: [
                                        '/Common/portList1',
                                        '/Common/portList2'
                                    ]
                                }
                            }
                        ]
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent[PATHS.ManagementIpFirewall][0],
                        {
                            description: 'test management IP firewall description',
                            rules: [
                                {
                                    name: 'firewallRuleOne',
                                    description: undefined,
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: 'no',
                                    placeAfter: 'first',
                                    source: {
                                        addressLists: [],
                                        portLists: []
                                    },
                                    destination: {
                                        addressLists: [],
                                        portLists: []
                                    }
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    description: 'firewall rule two description',
                                    action: 'reject',
                                    ipProtocol: 'tcp',
                                    log: 'yes',
                                    placeAfter: 'firewallRuleOne',
                                    source: {
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/addressList1',
                                            '/Common/addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            '/Common/portList2'
                                        ]
                                    }
                                }
                            ]
                        }
                    );
                });
        });

        it('should handle ManagementIpFirewall with no rules', () => {
            const declaration = {
                Common: {
                    ManagementIpFirewall: {
                        rules: []
                    }
                }
            };

            const networkHandler = new NetworkHandler(declaration, bigIpMock);
            return networkHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent[PATHS.ManagementIpFirewall][0],
                        {
                            description: undefined,
                            rules: []
                        }
                    );
                });
        });

        it('should log error with ManagementIpFirewall specific message', () => {
            const severeLogSpy = sinon.spy(Logger.prototype, 'severe');
            const declaration = {
                Common: {
                    ManagementIpFirewall: {
                        rules: []
                    }
                }
            };

            bigIpMock.modify = () => Promise.reject(new Error('test error'));

            const networkHandler = new NetworkHandler(declaration, bigIpMock, undefined, { id: '123-abc' });
            return assert.isRejected(networkHandler.process(), /test error/, 'should fail')
                .then(() => {
                    assert.strictEqual(severeLogSpy.args[0][0], 'Error creating Management IP Firewall: test error');
                    assert.strictEqual(severeLogSpy.thisValues[0].metadata, 'networkHandler.js | 123-abc');
                });
        });
    });
});
