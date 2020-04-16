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

const TeemDevice = require('@f5devcentral/f5-teem').Device;
const TeemRecord = require('@f5devcentral/f5-teem').Record;
const DeclarationParser = require('../../../../src/lib/declarationParser');
const DiffHandler = require('../../../../src/lib/diffHandler');
const AnalyticsHandler = require('../../../../src/lib/analyticsHandler');
const AuthHandler = require('../../../../src/lib/authHandler');
const SystemHandler = require('../../../../src/lib/systemHandler');
const NetworkHandler = require('../../../../src/lib/networkHandler');
const DscHandler = require('../../../../src/lib/dscHandler');
const DeleteHandler = require('../../../../src/lib/deleteHandler');
const DeclarationHandler = require('../../../../src/lib/declarationHandler');
const DeprovisionHandler = require('../../../../src/lib/deprovisionHandler');
const ProvisionHandler = require('../../../../src/lib/provisionHandler');
const doUtilMock = require('../../../../src/lib/doUtil');

let parsedDeclarations;
let declarationWithDefaults;
let systemHandlerStub;
let networkHandlerStub;
let provisionHandlerStub;
let deprovisionHandlerStub;
let bigIpMock;

describe('declarationHandler', () => {
    const handlersCalled = [];
    function handlerCalled(handlerName) {
        handlersCalled.push(handlerName);
    }

    beforeEach(() => {
        sinon.stub(AnalyticsHandler.prototype, 'process').callsFake(() => {
            handlerCalled('AnalyticsHandler');
            return Promise.resolve();
        });
        sinon.stub(AuthHandler.prototype, 'process').callsFake(() => {
            handlerCalled('AuthHandler');
            return Promise.resolve();
        });
        sinon.stub(DeleteHandler.prototype, 'process').callsFake(() => {
            handlerCalled('DeleteHandler');
            return Promise.resolve();
        });
        deprovisionHandlerStub = sinon.stub(DeprovisionHandler.prototype, 'process').callsFake(() => {
            handlerCalled('DeprovisionHandler');
            return Promise.resolve();
        });
        sinon.stub(DscHandler.prototype, 'process').callsFake(() => {
            handlerCalled('DscHandler');
            return Promise.resolve();
        });
        networkHandlerStub = sinon.stub(NetworkHandler.prototype, 'process').callsFake(() => {
            handlerCalled('NetworkHandler');
            return Promise.resolve();
        });
        systemHandlerStub = sinon.stub(SystemHandler.prototype, 'process').callsFake(() => {
            handlerCalled('SystemHandler');
            return Promise.resolve();
        });
        provisionHandlerStub = sinon.stub(ProvisionHandler.prototype, 'process').callsFake(() => {
            handlerCalled('ProvisionHandler');
            return Promise.resolve();
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('General testing', () => {
        beforeEach(() => {
            parsedDeclarations = [];
            declarationWithDefaults = {};

            sinon.stub(DeclarationParser.prototype, 'parse').callsFake(function parse() {
                parsedDeclarations.push(this.declaration);
                return {
                    parsedDeclaration: {
                        Common: {}
                    }
                };
            });

            sinon.stub(DiffHandler.prototype, 'process').callsFake((declaration) => {
                declarationWithDefaults = declaration;
                return Promise.resolve(
                    {
                        toUpdate: {},
                        toDelete: {}
                    }
                );
            });

            bigIpMock = {
                list(path) {
                    if (path === '/tm/sys/provision') {
                        return Promise.resolve([
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'afm',
                                fullPath: 'afm',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/afm?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            },
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'avr',
                                fullPath: 'avr',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/avr?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            },
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'urldb',
                                fullPath: 'urldb',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/urldb?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            }
                        ]);
                    }

                    throw new Error(`Unrecognized path: ${path} is in list`);
                },

                modify() {
                    return Promise.resolve();
                }
            };
        });

        it('should parse declarations if not parsed', () => {
            const newDeclaration = {
                name: 'new'
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(parsedDeclarations.length, 2);
                });
        });

        it('should not parse declarations if parsed', () => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(parsedDeclarations.length, 1);
                    assert.strictEqual(parsedDeclarations[0].name, 'current');
                });
        });

        it('should apply defaults for missing items', () => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {
                    VLAN: {},
                    Authentication: {
                        authKey: true
                    },
                    ConfigSync: {
                        configsyncIp: 'configsyncIp1'
                    }
                }
            };
            // originalConfig is mix of different keys and values
            // just to test different cases and avoid CLASSES_OF_TRUTH modifications
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {
                        System: {
                            hostname: 'my.bigip.com'
                        },
                        DNS: {
                            foo: 'bar'
                        },
                        NTP: ['one', 'two'],
                        VLAN: ['vlan1', 'vlan2'],
                        SelfIp: false,
                        RouteDomain: 0,
                        ManagementRoute: true,
                        Authentication: {
                            authKey: true,
                            remoteUsersDefaults: {
                                user: 'user'
                            }
                        },
                        ConfigSync: {
                            configsyncIp: 'something'
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.deepStrictEqual(declarationWithDefaults.Common,
                        {
                            System: {
                                hostname: 'my.bigip.com'
                            },
                            DNS: {
                                foo: 'bar'
                            },
                            NTP: ['one', 'two'],
                            VLAN: ['vlan1', 'vlan2'],
                            SelfIp: false,
                            RouteDomain: 0,
                            ManagementRoute: true,
                            Authentication: {
                                authKey: true,
                                remoteUsersDefaults: {
                                    user: 'user'
                                }
                            },
                            ConfigSync: {
                                configsyncIp: 'configsyncIp1'
                            }
                        });
                });
        });

        it('should call each handler', () => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };
            const handlerNames = [
                'AnalyticsHandler',
                'AuthHandler',
                'DeleteHandler',
                'DeprovisionHandler',
                'DscHandler',
                'NetworkHandler',
                'ProvisionHandler',
                'SystemHandler'
            ];
            handlersCalled.length = 0;

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(handlersCalled.length, handlerNames.length);
                    handlerNames.forEach((handlerName) => {
                        assert.notStrictEqual(handlersCalled.indexOf(handlerName), -1);
                    });
                });
        });

        it('should send TEEM report', () => {
            const newDeclaration = {
                name: 'new',
                foo: {
                    class: 'bar'
                },
                controls: {
                    class: 'Controls',
                    userAgent: 'test userAgent'
                }
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const assetInfo = {
                name: 'Declarative Onboarding',
                version: '1.2.3'
            };
            const teemDevice = new TeemDevice(assetInfo);

            const isAddClassCountCalled = sinon.spy(TeemRecord.prototype, 'addClassCount');
            const isAddPlatformInfoCalled = sinon.spy(TeemRecord.prototype, 'addPlatformInfo');
            const isAddRegKeyCalled = sinon.spy(TeemRecord.prototype, 'addRegKey');
            const isAddProvisionedModulesCalled = sinon.spy(TeemRecord.prototype, 'addProvisionedModules');
            const isCalculateAssetIdCalled = sinon.spy(TeemRecord.prototype, 'calculateAssetId');
            const isAddJsonObjectCalled = sinon.spy(TeemRecord.prototype, 'addJsonObject');

            // report should not be called
            const isReportCalled = sinon.stub(teemDevice, 'report').rejects();

            // check the record sent to reportRecord
            let record;
            sinon.stub(teemDevice, 'reportRecord').callsFake((recordIn) => {
                record = recordIn;
            });

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.teemDevice = teemDevice;
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    // Check that each class was called
                    assert.strictEqual(isAddClassCountCalled.calledOnce, true,
                        'should call addClassCount() once');
                    assert.strictEqual(isAddPlatformInfoCalled.calledOnce, true,
                        'should call addPlatformInfo() once');
                    assert.strictEqual(isAddRegKeyCalled.calledOnce, true,
                        'should call addRegKey() once');
                    assert.strictEqual(isAddProvisionedModulesCalled.calledOnce, true,
                        'should call addProvisionedModules() once');
                    assert.strictEqual(isCalculateAssetIdCalled.calledOnce, true,
                        'should call calculateAssetId() once');
                    assert.strictEqual(isAddJsonObjectCalled.calledOnce, true,
                        'should call addJsonObject() once');
                    assert.strictEqual(isReportCalled.called, false,
                        'report() should not have been called');

                    // Check that the record body object was filled with input
                    assert.deepStrictEqual(
                        record.recordBody,
                        {
                            bar: 1,
                            Controls: 1,
                            class: 'Controls',
                            modules: {},
                            platform: 'unknown',
                            platformID: 'unknown',
                            platformVersion: 'unknown',
                            regkey: 'unknown',
                            userAgent: 'test userAgent'
                        }
                    );
                });
        });

        it('should succeed even if TEEM report fails', () => {
            const newDeclaration = {
                name: 'new'
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const assetInfo = {
                name: 'Declarative Onboarding',
                version: '1.2.3'
            };
            const teemDevice = new TeemDevice(assetInfo);

            sinon.stub(teemDevice, 'reportRecord').rejects();
            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.teemDevice = teemDevice;
            return declarationHandler.process(newDeclaration, state);
        });

        it('should report processing errors', () => {
            const errorMessage = 'this is a processing error';
            SystemHandler.prototype.process = () => Promise.reject(new Error(errorMessage));

            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return assert.isRejected(declarationHandler.process(newDeclaration, state),
                'this is a processing error',
                'processing error should have been caught');
        });

        it('should update status based on handler status', () => {
            const systemHandlerStatus = {
                rebootRequired: true,
                rollbackInfo: {
                    systemHandler: {
                        propA: {
                            files: [
                                'fileA', 'fileB'
                            ]
                        },
                        propB: 'foo'
                    }
                }
            };
            const networkHandlerStatus = {
                rebootRequired: false,
                rollbackInfo: {
                    networkHandler: {
                        propA: 'hello',
                        propB: 'world'
                    }
                }
            };

            systemHandlerStub.restore();
            sinon.stub(SystemHandler.prototype, 'process').resolves(systemHandlerStatus);
            networkHandlerStub.restore();
            sinon.stub(NetworkHandler.prototype, 'process').resolves(networkHandlerStatus);

            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then((status) => {
                    assert.strictEqual(status.rebootRequired, true);
                    assert.deepEqual(
                        status.rollbackInfo.systemHandler,
                        {
                            propA: { files: ['fileA', 'fileB'] },
                            propB: 'foo'
                        }
                    );
                    assert.deepEqual(
                        status.rollbackInfo.networkHandler,
                        {
                            propA: 'hello',
                            propB: 'world'
                        }
                    );
                });
        });

        it('should not use old System hostname if Common.hostname is specified', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    hostname: 'my.new.hostname'
                }
            };

            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {
                        System: {
                            hostname: 'my.old.hostname'
                        }
                    }
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(declarationWithDefaults.Common.System.hostname, undefined);
                });
        });

        it('should apply fix for Default Route Domain - no Route Domains in declaration', () => {
            const newDeclaration = {
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(declarationWithDefaults.Common.RouteDomain, undefined);
                });
        });

        it('should apply fix for Default Route Domain - rename Default Route Domain', () => {
            // test check also that multiple Default Route Domains will be
            // removed from declaration
            const newDeclaration = {
                parsed: true,
                Common: {
                    RouteDomain: {
                        rd0: {
                            id: 0
                        },
                        rd0_2: {
                            id: 0
                        },
                        rd1: {
                            id: 1
                        }
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                id: 0,
                                vlan: []
                            }
                        }
                    }
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const routeDomain = declarationWithDefaults.Common.RouteDomain;
                    assert.strictEqual(Object.keys(routeDomain).length, 2);
                    assert.strictEqual(routeDomain.rd0, undefined);
                    assert.strictEqual(routeDomain.rd0_2, undefined);
                    assert.strictEqual(routeDomain['0'].id, 0);
                    assert.strictEqual(routeDomain['0'].vlan, undefined);
                    assert.notStrictEqual(routeDomain.rd1, undefined);
                    assert.strictEqual(routeDomain.rd1.id, 1);
                });
        });

        it('should apply fix for Default Route Domain - copy Default Route Domain from Current Configuration', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    RouteDomain: {
                        rd1: {
                            id: 1
                        }
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        RouteDomain: {
                            0: {
                                id: 0
                            }
                        }
                    }
                },
                originalConfig: {
                    Common: {}
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const routeDomain = declarationWithDefaults.Common.RouteDomain;
                    assert.notStrictEqual(routeDomain['0'], undefined);
                    assert.strictEqual(routeDomain['0'].id, 0);
                    assert.notStrictEqual(routeDomain.rd1, undefined);
                    assert.strictEqual(routeDomain.rd1.id, 1);
                });
        });

        it('should apply Route Domain VLANs fix', () => {
            /**
             * ideas of the test are:
             * - remove non-existing VLANs from Route Domains
             * - add VLANs to Route Domain 0 if they don't belong to any other Route Domain
             * - check that VLANs from another partition or subfolder are untouched
             * - should keep default VLANs
             */
            const newDeclaration = {
                parsed: true,
                Common: {
                    RouteDomain: {
                        0: {
                            id: 0,
                            vlans: [
                                'nonExistingVlan', // should remove - non-existing vlan
                                '/Partition/vlan', // should keep - partition !== Common
                                '/Partition/folder/vlan', // should keep - partition !== Common
                                '/Common/vlan', // should keep - exist in current confing
                                '/Common/folder/vlan', // should keep - belongs to folder under Common
                                'vlan1', // should keep - defined in declaration
                                '/Common/vlan2' // should keep - defined in declaration
                            ]
                        },
                        rd1: {
                            id: 1,
                            vlans: [
                                'nonExistingVlan2', // should remove - non-existing vlan
                                '/Partition1/vlan', // should keep - partition !== Common
                                '/Partition1/folder/vlan', // should keep - partition !== Common
                                '/Common/vlan10', // should remove - non-existing vlan
                                '/Common/folder/vlan2', // should keep - belongs to folder under Common
                                'vlan3', // should keep - defined in declaration
                                '/Common/vlan4', // should keep - defined in declaration
                                '/Common/rd1Vlan' // should keep - was attached to RD 2
                            ]
                        },
                        rd2: {
                            id: 2 // should restore /Common/rd2Vlan
                        },
                        rd3: {
                            id: 3 // should keep 'vlans' (undefined) property untouched
                        }
                    },
                    VLAN: {
                        vlan1: {}, // should add to RD 0
                        vlan2: {}, // should add to RD 0
                        vlan3: {}, // should add to RD 1
                        vlan4: {}, // should add to RD 1
                        vlan5: {}, // should add to RD 0
                        vlan6: {} // should add to RD 0
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        RouteDomain: {
                            0: {
                                id: 0,
                                vlans: [
                                    '/Common/http-tunnel', // should keep it  - exist in current confing
                                    '/Common/vlan' // should keep - exist in current confing
                                ]
                            },
                            rd1: {
                                id: 1,
                                vlans: [
                                    '/Common/socks-tunnel' // should keep - exist in current confing
                                ]
                            },
                            rd2: {
                                id: 2,
                                vlans: [
                                    '/Common/rd2Vlan', // should keep - exist in current confing
                                    '/Common/rd1Vlan' // should keep - exist in current confing and attached to RD 1
                                ]
                            }
                        }
                    }
                },
                originalConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                id: 0,
                                vlans: []
                            }
                        }
                    }
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const routeDomain = declarationWithDefaults.Common.RouteDomain;
                    assert.deepStrictEqual(routeDomain['0'].vlans.sort(), [
                        '/Common/http-tunnel',
                        '/Partition/vlan',
                        '/Partition/folder/vlan',
                        '/Common/vlan',
                        '/Common/folder/vlan',
                        'vlan1',
                        '/Common/vlan2',
                        'vlan5',
                        'vlan6'
                    ].sort());
                    assert.deepStrictEqual(routeDomain.rd1.vlans.sort(), [
                        '/Common/socks-tunnel',
                        '/Partition1/vlan',
                        '/Partition1/folder/vlan',
                        '/Common/folder/vlan2',
                        'vlan3',
                        '/Common/vlan4',
                        '/Common/rd1Vlan'
                    ].sort());
                    assert.deepStrictEqual(routeDomain.rd2.vlans, ['/Common/rd2Vlan']);
                    assert.strictEqual(routeDomain.rd3.vlans, undefined);
                });
        });

        it('should error if list returns a failure', () => {
            bigIpMock.list = () => { throw new Error('This is an error'); };

            const declaration = {
                parsed: true,
                Common: {}
            };

            const state = {
                originalConfig: {
                    Common: { }
                },
                currentConfig: {
                    parsed: true,
                    Common: {
                        Analytics: {
                            interval: 60
                        },
                        Provision: {
                            ltm: 'nominal'
                        }
                    }
                }
            };

            const handler = new DeclarationHandler(bigIpMock);
            return assert.isRejected(handler.process(declaration, state), /This is an error/);
        });
    });

    describe('AVR dependencies', () => {
        let isAvrProvisioned;
        function AvrBigIpMock() {
            return {
                modify: () => Promise.resolve(),
                replace: (path) => {
                    if (path === '/tm/analytics/global-settings') {
                        assert(isAvrProvisioned, 'Trying to change AVR settings without AVR provisioned');
                    }
                    return Promise.resolve();
                },
                onboard: {
                    hostname: () => Promise.resolve(),
                    provision: (data) => {
                        isAvrProvisioned = data.avr && data.avr !== 'none';
                        return Promise.resolve([]);
                    }
                },
                list: (path) => {
                    if (path === '/tm/sys/provision') {
                        return Promise.resolve([
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'afm',
                                fullPath: 'afm',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/afm?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            },
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'avr',
                                fullPath: 'avr',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/avr?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            },
                            {
                                kind: 'tm:sys:provision:provisionstate',
                                name: 'urldb',
                                fullPath: 'urldb',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/urldb?ver=12.1.5.1',
                                cpuRatio: 0,
                                diskRatio: 0,
                                level: 'none',
                                memoryRatio: 0
                            }
                        ]);
                    }
                    return Promise.resolve();
                }
            };
        }

        beforeEach(() => {
            provisionHandlerStub.restore();
            deprovisionHandlerStub.restore();
            sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IP');
            isAvrProvisioned = false;
        });

        it('should add analytics and avr provisioning in the same declaration', () => {
            const declaration = {
                parsed: true,
                Common: {
                    Analytics: {
                        interval: 60
                    },
                    Provision: {
                        avr: 'nominal'
                    }
                }
            };

            const state = {
                originalConfig: {
                    Common: {}
                },
                currentConfig: {
                    parsed: true,
                    Common: {}
                }
            };
            const handler = new DeclarationHandler(new AvrBigIpMock());
            return handler.process(declaration, state)
                .then(() => {
                    assert(isAvrProvisioned, 'AVR was not provisioned');
                });
        });

        it('should remove analytics and avr provisioning in the same declaration', () => {
            isAvrProvisioned = true;
            const declaration = {
                parsed: true,
                Common: {}
            };

            const state = {
                originalConfig: {
                    Common: {
                        Provision: {
                            avr: 'none'
                        }
                    }
                },
                currentConfig: {
                    parsed: true,
                    Common: {
                        Analytics: {
                            interval: 60
                        },
                        Provision: {
                            avr: 'nominal'
                        }
                    }
                }
            };
            const handler = new DeclarationHandler(new AvrBigIpMock());
            return handler.process(declaration, state)
                .then(() => {
                    assert(!isAvrProvisioned, 'AVR was not de-provisioned');
                });
        });
    });
});
