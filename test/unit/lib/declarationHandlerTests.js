/**
 * Copyright 2021 F5 Networks, Inc.
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
const DeclarationParser = require('../../../src/lib/declarationParser');
const DiffHandler = require('../../../src/lib/diffHandler');
const AnalyticsHandler = require('../../../src/lib/analyticsHandler');
const AuthHandler = require('../../../src/lib/authHandler');
const SystemHandler = require('../../../src/lib/systemHandler');
const NetworkHandler = require('../../../src/lib/networkHandler');
const DscHandler = require('../../../src/lib/dscHandler');
const DeleteHandler = require('../../../src/lib/deleteHandler');
const DeclarationHandler = require('../../../src/lib/declarationHandler');
const DeprovisionHandler = require('../../../src/lib/deprovisionHandler');
const ProvisionHandler = require('../../../src/lib/provisionHandler');
const doUtilMock = require('../../../src/lib/doUtil');

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
        let diffHandlerStub;

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

            diffHandlerStub = sinon.stub(DiffHandler.prototype, 'process').callsFake((declaration) => {
                declarationWithDefaults = declaration;
                return Promise.resolve(
                    {
                        toUpdate: { Common: {} },
                        toDelete: { Common: {} }
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

            afterEach(() => {
                diffHandlerStub.restore();
            });
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

        it('should remove empty objects from parsed declaration', () => {
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

            const updatedDeclaration = {
                Common: {
                    RemoveThis: {},
                    DoNotRemoveThis: { property: 'value' },
                    RemoveThisToo: {}
                }
            };

            diffHandlerStub.restore();
            diffHandlerStub = sinon.stub(DiffHandler.prototype, 'process').callsFake((declaration) => {
                declarationWithDefaults = declaration;
                return Promise.resolve(
                    {
                        toUpdate: updatedDeclaration,
                        toDelete: { Common: {} }
                    }
                );
            });

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.deepStrictEqual(
                        updatedDeclaration,
                        {
                            Common: {
                                DoNotRemoveThis: { property: 'value' }
                            }
                        }
                    );
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

        it('should not call handlers if dry run', () => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                controls: {
                    dryRun: true
                },
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

            handlersCalled.length = 0;

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(handlersCalled.length, 0);
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
                },
                Common: {
                    class: 'Tenant',
                    myAuth: {
                        class: 'Authentication',
                        radius: {
                            serviceType: 'call-check'
                        },
                        ldap: {
                            port: 654
                        }
                    }
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

            const isAddClassCountCalled = sinon.spy(TeemRecord.prototype, 'addClassCount');
            const isAddPlatformInfoCalled = sinon.spy(TeemRecord.prototype, 'addPlatformInfo');
            const isAddRegKeyCalled = sinon.spy(TeemRecord.prototype, 'addRegKey');
            const isAddProvisionedModulesCalled = sinon.spy(TeemRecord.prototype, 'addProvisionedModules');
            const isCalculateAssetIdCalled = sinon.spy(TeemRecord.prototype, 'calculateAssetId');
            const isAddJsonObjectCalled = sinon.spy(TeemRecord.prototype, 'addJsonObject');

            // report should not be called
            const isReportCalled = sinon.stub(TeemDevice.prototype, 'report').rejects();

            // check the record sent to reportRecord
            let record;
            sinon.stub(TeemDevice.prototype, 'reportRecord').callsFake((recordIn) => {
                record = recordIn;
            });

            const declarationHandler = new DeclarationHandler(bigIpMock);
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
                            authenticationType: {
                                radius: 1,
                                tacacs: 0,
                                ldap: 1
                            },
                            Authentication: 1,
                            bar: 1,
                            Controls: 1,
                            Tenant: 1,
                            modules: {},
                            nicConfiguration: 'unknown',
                            platform: 'unknown',
                            platformID: 'unknown',
                            platformVersion: 'unknown',
                            regkey: 'unknown',
                            userAgent: 'test userAgent'
                        }
                    );
                });
        });

        it('should count complicated authentication declaration', () => {
            const newDeclaration = {
                name: 'new',
                Common: {
                    class: 'Tenant',
                    myAuth: {
                        class: 'Authentication',
                        radius: { serviceType: 'call-check' },
                        ldap: { port: 654 }
                    },
                    funky: {
                        class: 'Authentication',
                        radius: { serviceType: 'call-check' },
                        monkey: {
                            // Should not count these two
                            ldap: { port: 654 },
                            tacacs: { foo: 'bar' }
                        }
                    }
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

            // check the record sent to reportRecord
            let record;
            sinon.stub(TeemDevice.prototype, 'reportRecord').callsFake((recordIn) => {
                record = recordIn;
            });

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    // Check that the record body object was filled with input
                    assert.deepStrictEqual(
                        record.recordBody,
                        {
                            authenticationType: {
                                ldap: 1,
                                radius: 2,
                                tacacs: 0
                            },
                            Authentication: 2,
                            Tenant: 1,
                            modules: {},
                            nicConfiguration: 'unknown',
                            platform: 'unknown',
                            platformID: 'unknown',
                            platformVersion: 'unknown',
                            regkey: 'unknown'
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

            sinon.stub(TeemDevice.prototype, 'reportRecord').rejects();
            const declarationHandler = new DeclarationHandler(bigIpMock);
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

        describe('ManagementIp fix', () => {
            it('should apply fix for ManagementIp', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        ManagementIp: {
                            myManagementIp: {
                                name: '1.2.3.4/5'
                            }
                        }
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
                const declarationHandler = new DeclarationHandler(bigIpMock);
                return declarationHandler.process(newDeclaration, state)
                    .then(() => {
                        assert.deepStrictEqual(
                            declarationWithDefaults.Common.ManagementIp,
                            {
                                '1.2.3.4/5': {
                                    name: '1.2.3.4/5'
                                }
                            }
                        );
                    });
            });

            it('should leave ManagementIp intact in original but not declaration', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        ManagementIp: {}
                    }
                };
                const state = {
                    currentConfig: {
                        name: 'current'
                    },
                    originalConfig: {
                        Common: {
                            ManagementIp: {
                                '1.2.3.4/5': {
                                    name: '1.2.3.4/5'
                                }
                            }
                        }
                    }
                };
                const declarationHandler = new DeclarationHandler(bigIpMock);
                return declarationHandler.process(newDeclaration, state)
                    .then(() => {
                        assert.deepStrictEqual(
                            declarationWithDefaults.Common.ManagementIp,
                            {
                                '1.2.3.4/5': {
                                    name: '1.2.3.4/5'
                                }
                            }
                        );
                    });
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

        it('should apply Route Domain parent fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    RouteDomain: {
                        rd1: {
                            id: 1
                        },
                        rd2: {
                            id: 2,
                            parent: 'rd1'
                        },
                        rd3: {
                            id: 3,
                            parent: '/Common/rd2'
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
                            },
                            rd1: {
                                id: 1,
                                parent: '/Common/rd1'
                            },
                            rd2: {
                                id: 2,
                                parent: '/Common/rd2'
                            }
                        }
                    }
                },
                originalConfig: {
                    Common: {
                        RouteDomain: {
                            0: {
                                id: 0
                            }
                        }
                    }
                }
            };
            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const routeDomain = declarationWithDefaults.Common.RouteDomain;
                    assert.strictEqual(routeDomain['0'].id, 0);
                    assert.isUndefined(routeDomain['0'].parent);
                    assert.strictEqual(routeDomain.rd1.id, 1);
                    assert.isUndefined(routeDomain.rd1.parent);
                    assert.strictEqual(routeDomain.rd2.id, 2);
                    assert.strictEqual(routeDomain.rd2.parent, '/Common/rd1');
                    assert.strictEqual(routeDomain.rd3.id, 3);
                    assert.strictEqual(routeDomain.rd3.parent, '/Common/rd2');
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

        it('should apply RouteMap path prefix fixes', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    RouteMap: {
                        rm1: {
                            name: 'rm1',
                            entries: [
                                {
                                    name: 33,
                                    action: 'deny',
                                    match: {
                                        asPath: 'asPath1',
                                        ipv4: {
                                            address: {
                                                prefixList: 'prefixList1'
                                            },
                                            nextHop: {
                                                prefixList: 'prefixList1NextHop'
                                            }
                                        }
                                    }
                                },
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: 'asPath2',
                                        ipv6: {
                                            address: {
                                                prefixList: 'prefixList2'
                                            },
                                            nextHop: {
                                                prefixList: 'prefixList2NextHop'
                                            }
                                        }
                                    }
                                }
                            ]
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const routeMap = declarationWithDefaults.Common.RouteMap.rm1;
                    assert.deepStrictEqual(
                        routeMap,
                        {
                            name: 'rm1',
                            entries: [
                                {
                                    name: 33,
                                    action: 'deny',
                                    match: {
                                        asPath: '/Common/asPath1',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/prefixList1'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixList1NextHop'
                                            }
                                        }
                                    }
                                },
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/asPath2',
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/prefixList2'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixList2NextHop'
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    );
                });
        });

        it('should apply GSLB server fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    GSLBServer: {
                        gslbServer: {
                            label: 'testing gslb server',
                            datacenter: '/Common/gslbDataCenter',
                            proberPool: '/Common/gslbProberPool',
                            devices: [
                                {
                                    address: '10.0.0.1',
                                    translationAddress: '192.0.2.12',
                                    description: 'deviceDescription'
                                },
                                {
                                    address: '10.0.0.2'
                                }
                            ],
                            virtualServers: [
                                {
                                    label: 'virtual server with minimal properties',
                                    enabled: true,
                                    address: '10.0.20.1',
                                    port: 0,
                                    translationPort: 0
                                },
                                {
                                    name: 'testVirtualServer',
                                    label: 'virtual server with all properties',
                                    description: 'test virtual server description',
                                    enabled: false,
                                    address: 'a989:1c34:009c:0000:0000:b099:c1c7:8bfe',
                                    port: 8080,
                                    translationAddress: '1:0:1:0:0:0:0:0',
                                    translationPort: 80,
                                    monitor: [
                                        '/Common/tcp',
                                        '/Common/http'
                                    ]
                                }
                            ]
                        },
                        gslbServerBigip: {
                            label: 'testing bigip gslb server',
                            datacenter: '/Common/gslbDataCenter',
                            devices: [
                                {
                                    address: '10.0.0.3'
                                }
                            ],
                            product: 'bigip'
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const gslbServer = declarationWithDefaults.Common.GSLBServer.gslbServer;
                    assert.deepStrictEqual(
                        gslbServer,
                        {
                            datacenter: 'gslbDataCenter',
                            proberPool: 'gslbProberPool',
                            devices: [
                                {
                                    description: 'deviceDescription',
                                    address: '10.0.0.1',
                                    translationAddress: '192.0.2.12'
                                },
                                {
                                    address: '10.0.0.2'
                                }
                            ],
                            monitor: [],
                            virtualServers: [
                                {
                                    name: '0',
                                    enabled: true,
                                    address: '10.0.20.1',
                                    port: 0,
                                    translationPort: 0,
                                    monitor: []
                                },
                                {
                                    name: 'testVirtualServer',
                                    description: 'test virtual server description',
                                    enabled: false,
                                    address: 'a989:1c34:9c::b099:c1c7:8bfe',
                                    port: 8080,
                                    translationAddress: '1:0:1::',
                                    translationPort: 80,
                                    monitor: [
                                        '/Common/tcp',
                                        '/Common/http'
                                    ]
                                }
                            ]
                        }
                    );
                    assert.deepStrictEqual(
                        declarationWithDefaults.Common.GSLBServer.gslbServerBigip,
                        {
                            datacenter: 'gslbDataCenter',
                            devices: [
                                {
                                    address: '10.0.0.3'
                                }
                            ],
                            monitor: [
                                '/Common/bigip'
                            ],
                            product: 'bigip',
                            virtualServers: []
                        }
                    );
                });
        });

        it('should apply GSLB prober pool fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    GSLBProberPool: {
                        gslbProberPool: {
                            label: 'testing gslb prober pool',
                            members: [
                                {
                                    name: '/Common/gslbServerOne',
                                    label: 'testing monitor one'
                                },
                                {
                                    name: 'gslbServerTwo',
                                    label: 'testing monitor two'
                                }
                            ]
                        },
                        gslbProberPoolNoMembers: {
                            label: 'testing gslb prober pool with no members'
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const gslbProberPool = declarationWithDefaults.Common.GSLBProberPool;
                    assert.deepStrictEqual(
                        gslbProberPool,
                        {
                            gslbProberPool: {
                                members: [
                                    {
                                        name: 'gslbServerOne',
                                        description: undefined,
                                        enabled: undefined,
                                        order: 0
                                    },
                                    {
                                        name: 'gslbServerTwo',
                                        description: undefined,
                                        enabled: undefined,
                                        order: 1
                                    }
                                ]
                            },
                            gslbProberPoolNoMembers: {
                                members: []
                            }
                        }
                    );
                });
        });
        it('should apply firewall address list fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    FirewallAddressList: {
                        myFirewallAddressList: {
                            class: 'FirewallAddressList',
                            addresses: ['B', 'A'],
                            fqdns: ['B', 'A'],
                            geo: ['B', 'A']
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const firewallAddressList = declarationWithDefaults.Common.FirewallAddressList;
                    assert.deepStrictEqual(
                        firewallAddressList,
                        {
                            myFirewallAddressList: {
                                class: 'FirewallAddressList',
                                addresses: ['A', 'B'],
                                fqdns: ['A', 'B'],
                                geo: ['A', 'B']
                            }
                        }
                    );
                });
        });

        it('should apply firewall port list fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    FirewallPortList: {
                        myFirewallPortList: {
                            class: 'FirewallPortList',
                            ports: [8080, 8888]
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const firewallPortList = declarationWithDefaults.Common.FirewallPortList;
                    assert.deepStrictEqual(
                        firewallPortList,
                        {
                            myFirewallPortList: {
                                class: 'FirewallPortList',
                                ports: ['8080', '8888']
                            }
                        }
                    );
                });
        });

        it('should apply firewall policy fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    FirewallPolicy: {
                        firewallPolicy: {
                            label: 'testing firewall policy',
                            rules: [
                                {
                                    name: 'firewallPolicyRuleOne',
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: false
                                },
                                {
                                    name: 'firewallPolicyRuleTwo',
                                    label: 'testing firewall policy rule two',
                                    description: 'firewall policy rule two description',
                                    action: 'reject',
                                    ipProtocol: 'tcp',
                                    log: true,
                                    source: {
                                        vlans: [
                                            '/Common/vlan1',
                                            'vlan2'
                                        ],
                                        addressLists: [
                                            '/Common/addressList1',
                                            'addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            'portList2'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/addressList1',
                                            'addressList2'
                                        ],
                                        portLists: [
                                            '/Common/portList1',
                                            'portList2'
                                        ]
                                    }
                                }
                            ]
                        },
                        firewallPolicyNoMembers: {
                            label: 'testing firewall policy with no members'
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const firewallPolicy = declarationWithDefaults.Common.FirewallPolicy;
                    assert.deepStrictEqual(
                        firewallPolicy,
                        {
                            firewallPolicy: {
                                rules: [
                                    {
                                        name: 'firewallPolicyRuleOne',
                                        description: undefined,
                                        action: 'accept',
                                        ipProtocol: 'any',
                                        log: false,
                                        source: {},
                                        destination: {}
                                    },
                                    {
                                        name: 'firewallPolicyRuleTwo',
                                        description: 'firewall policy rule two description',
                                        action: 'reject',
                                        ipProtocol: 'tcp',
                                        log: true,
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
                            },
                            firewallPolicyNoMembers: {
                                rules: []
                            }
                        }
                    );
                });
        });

        it('should apply self IP fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    SelfIp: {
                        selfIpOne: {
                            address: '10.148.75.46/24',
                            vlan: 'myVlan',
                            fwEnforcedPolicy: '/Common/myFirewallPolicy',
                            fwStagedPolicy: '/Common/myFirewallPolicy',
                            allowService: [
                                'tcp:80'
                            ]
                        },
                        selfIpTwo: {
                            address: '192.0.2.10/24',
                            vlan: 'myVlan'
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const selfIp = declarationWithDefaults.Common.SelfIp;
                    assert.deepStrictEqual(
                        selfIp,
                        {
                            selfIpOne: {
                                address: '10.148.75.46/24',
                                vlan: 'myVlan',
                                fwEnforcedPolicy: 'myFirewallPolicy',
                                fwStagedPolicy: 'myFirewallPolicy',
                                allowService: [
                                    'tcp:80'
                                ]
                            },
                            selfIpTwo: {
                                address: '192.0.2.10/24',
                                vlan: 'myVlan'
                            }
                        }
                    );
                });
        });

        describe('RoutingPrefixList fixes', () => {
            let newDeclaration;
            let state;

            beforeEach(() => {
                newDeclaration = {
                    parsed: true,
                    Common: {
                        RoutingPrefixList: {
                            list1: {
                                name: 'list1'
                            }
                        }
                    }
                };

                state = {
                    originalConfig: {
                        Common: {}
                    },
                    currentConfig: {
                        parsed: true,
                        Common: {}
                    }
                };
            });

            describe('prefixLenRange', () => {
                it('should prepend 0 if length greater than 1 and starts with colon', () => {
                    newDeclaration.Common.RoutingPrefixList.list1.entries = [
                        {
                            name: '20',
                            action: 'deny',
                            prefix: '10.3.3.0/24',
                            prefixLenRange: ':25'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.equal(declarationWithDefaults.Common.RoutingPrefixList.list1.entries[0].prefixLenRange, '0:25');
                        });
                });

                it('should append 0 if length greater than 1 and ends with colon', () => {
                    newDeclaration.Common.RoutingPrefixList.list1.entries = [
                        {
                            name: '25',
                            action: 'deny',
                            prefix: '10.4.4.0/24',
                            prefixLenRange: '25:'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.equal(declarationWithDefaults.Common.RoutingPrefixList.list1.entries[0].prefixLenRange, '25:0');
                        });
                });

                it('should not modify if anything else', () => {
                    newDeclaration.Common.RoutingPrefixList.list1.entries = [
                        {
                            name: '35',
                            action: 'deny',
                            prefix: '10.6.6.0/24',
                            prefixLenRange: '25:26'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.equal(declarationWithDefaults.Common.RoutingPrefixList.list1.entries[0].prefixLenRange, '25:26');
                        });
                });
            });
        });

        describe('RoutingBGP fixes', () => {
            let newDeclaration;
            let state;

            beforeEach(() => {
                newDeclaration = {
                    parsed: true,
                    Common: {
                        RoutingBGP: {
                            bgp1: {
                                name: 'bgp1'
                            }
                        }
                    }
                };

                state = {
                    originalConfig: {
                        Common: {}
                    },
                    currentConfig: {
                        parsed: true,
                        Common: {}
                    }
                };
            });

            describe('addressFamilies.name', () => {
                it('should split addressFamilies when internetProtocol (name) is all', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'all',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap1'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap1'
                                            }
                                        ]
                                    },
                                    {
                                        name: 'ipv6',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap1'
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should fill in unspecified addressFamilies ipv6 internetProtocol', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap1'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap1'
                                            }
                                        ]
                                    },
                                    {
                                        name: 'ipv6'
                                    }
                                ]
                            );
                        });
                });

                it('should fill in unspecified addressFamily ipv4 internetProtocol (name)', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'ipv6',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap1'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4'
                                    },
                                    {
                                        name: 'ipv6',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap1'
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with empty addressFamilies', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4'
                                    },
                                    {
                                        name: 'ipv6'
                                    }
                                ]
                            );
                        });
                });

                it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with no addressFamilies', () => {
                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4'
                                    },
                                    {
                                        name: 'ipv6'
                                    }
                                ]
                            );
                        });
                });

                it('should sort addressFamily by internetProtocol (name) ipv4 first', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'ipv6',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap2'
                                }
                            ]
                        },
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap1'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap1'
                                            }
                                        ]
                                    },
                                    {
                                        name: 'ipv6',
                                        redistribute: [
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap2'
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });
            });

            describe('addressFamilies.redistributionList', () => {
                it('should sort redistributionList by routingProtocol', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'ipv6',
                            redistribute: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'routeMap6'
                                },
                                {
                                    routingProtocol: 'rip',
                                    routeMap: 'routeMap5'
                                },
                                {
                                    routingProtocol: 'ospf',
                                    routeMap: 'routeMap4'
                                },
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'routeMap3'
                                },
                                {
                                    routingProtocol: 'isis',
                                    routeMap: 'routeMap2'
                                },
                                {
                                    routingProtocol: 'connected',
                                    routeMap: 'routeMap1'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4'
                                    },
                                    {
                                        name: 'ipv6',
                                        redistribute: [
                                            {
                                                routingProtocol: 'connected',
                                                routeMap: '/Common/routeMap1'
                                            },
                                            {
                                                routingProtocol: 'isis',
                                                routeMap: '/Common/routeMap2'
                                            },
                                            {
                                                routingProtocol: 'kernel',
                                                routeMap: '/Common/routeMap3'
                                            },
                                            {
                                                routingProtocol: 'ospf',
                                                routeMap: '/Common/routeMap4'
                                            },
                                            {
                                                routingProtocol: 'rip',
                                                routeMap: '/Common/routeMap5'
                                            },
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap6'
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should add tenant prefix to redistributionList routeMap only if mising', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.addressFamily = [
                        {
                            name: 'ipv6',
                            redistribute: [
                                {
                                    routingProtocol: 'rip',
                                    routeMap: 'routeMap1'
                                },
                                {
                                    routingProtocol: 'static',
                                    routeMap: '/Common/routeMap2'
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.addressFamily,
                                [
                                    {
                                        name: 'ipv4'
                                    },
                                    {
                                        name: 'ipv6',
                                        redistribute: [
                                            {
                                                routingProtocol: 'rip',
                                                routeMap: '/Common/routeMap1'
                                            },
                                            {
                                                routingProtocol: 'static',
                                                routeMap: '/Common/routeMap2'
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });
            });

            describe('addressFamily.name', () => {
                it('should fill in unspecified addressFamilies ipv6 name', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    routeMap: {},
                                    softReconfigurationInbound: false
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                [
                                    {
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            },
                                            {
                                                name: 'ipv6',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should fill in unspecified addressFamilies ipv4 internetProtocol (name)', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {
                            addressFamily: [
                                {
                                    name: 'ipv6',
                                    routeMap: {},
                                    softReconfigurationInbound: false
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                [
                                    {
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            },
                                            {
                                                name: 'ipv6',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with empty addressFamilies', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {
                            addressFamily: []
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                [
                                    {
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            },
                                            {
                                                name: 'ipv6',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });

                it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with no addressFamilies', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {}
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                [
                                    {
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            },
                                            {
                                                name: 'ipv6',
                                                routeMap: {},
                                                softReconfigurationInbound: false
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });
            });

            describe('peerGroups', () => {
                it('should sort peerGroups by name', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {
                            name: 'Neighbor_IN'
                        },
                        {
                            name: 'Neighbor_OUT'
                        },
                        {
                            name: 'Neighbor_FOO'
                        },
                        {
                            name: 'Neighbor_BAR'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups.length, 4);
                            assert.deepStrictEqual(declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups[0].name, 'Neighbor_BAR');
                            assert.deepStrictEqual(declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups[1].name, 'Neighbor_FOO');
                            assert.deepStrictEqual(declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups[2].name, 'Neighbor_IN');
                            assert.deepStrictEqual(declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups[3].name, 'Neighbor_OUT');
                        });
                });

                it('should add tenant prefix to addressFamily routeMap only if mising', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                        {
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    routeMap: {
                                        in: 'routeMapIn'
                                    }
                                },
                                {
                                    name: 'ipv6',
                                    routeMap: {
                                        in: 'routeMapIn2',
                                        out: 'routeMapOut2'
                                    }
                                }
                            ]
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                [
                                    {
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                routeMap: {
                                                    in: '/Common/routeMapIn'
                                                }
                                            },
                                            {
                                                name: 'ipv6',
                                                routeMap: {
                                                    in: '/Common/routeMapIn2',
                                                    out: '/Common/routeMapOut2'
                                                }
                                            }
                                        ]
                                    }
                                ]
                            );
                        });
                });
            });

            describe('neighbors', () => {
                it('should sort neighbors by ip address', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                        {
                            name: '10.1.1.4',
                            peerGroup: 'Neighbor_IN'
                        },
                        {
                            name: '10.1.1.5',
                            peerGroup: 'Neighbor_OUT'
                        },
                        {
                            name: '10.1.1.2',
                            peerGroup: 'Neighbor_IN'
                        },
                        {
                            name: '10.1.1.3',
                            peerGroup: 'Neighbor_OUT'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock);
                    return declarationHandler.process(newDeclaration, state)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                [
                                    {
                                        name: '10.1.1.2',
                                        peerGroup: 'Neighbor_IN'
                                    },
                                    {
                                        name: '10.1.1.3',
                                        peerGroup: 'Neighbor_OUT'
                                    },
                                    {
                                        name: '10.1.1.4',
                                        peerGroup: 'Neighbor_IN'
                                    },
                                    {
                                        name: '10.1.1.5',
                                        peerGroup: 'Neighbor_OUT'
                                    }
                                ]
                            );
                        });
                });
            });
        });

        describe('should apply fix for HTTPD allow value', () => {
            it('should convert single word all to array', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        HTTPD: {
                            allow: 'all'
                        }
                    }
                };
                const state = {
                    currentConfig: {
                        name: 'current',
                        parsed: true,
                        Common: {}
                    },
                    originalConfig: {
                        Common: {}
                    }
                };
                const declarationHandler = new DeclarationHandler(bigIpMock);
                return declarationHandler.process(newDeclaration, state)
                    .then(() => {
                        const httpd = declarationWithDefaults.Common.HTTPD;
                        assert.deepStrictEqual(httpd, { allow: ['all'] });
                    });
            });

            it('should not convert single word none to array', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        HTTPD: {
                            allow: 'none'
                        }
                    }
                };
                const state = {
                    currentConfig: {
                        name: 'current',
                        parsed: true,
                        Common: {}
                    },
                    originalConfig: {
                        Common: {}
                    }
                };
                const declarationHandler = new DeclarationHandler(bigIpMock);
                return declarationHandler.process(newDeclaration, state)
                    .then(() => {
                        const httpd = declarationWithDefaults.Common.HTTPD;
                        assert.deepStrictEqual(httpd, { allow: 'none' });
                    });
            });

            it('should convert array All to lower case', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        HTTPD: {
                            allow: ['foo', 'All']
                        }
                    }
                };
                const state = {
                    currentConfig: {
                        name: 'current',
                        parsed: true,
                        Common: {}
                    },
                    originalConfig: {
                        Common: {}
                    }
                };
                const declarationHandler = new DeclarationHandler(bigIpMock);
                return declarationHandler.process(newDeclaration, state)
                    .then(() => {
                        const httpd = declarationWithDefaults.Common.HTTPD;
                        assert.deepStrictEqual(httpd, { allow: ['foo', 'all'] });
                    });
            });
        });

        it('should apply LDAP Cert fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    Authentication: {
                        ldap: {
                            sslCaCertFile: {
                                certificate: {
                                    base64: 'ZjVmYWtlY2VydA=='
                                }
                            },
                            sslClientCert: {
                                certificate: {
                                    base64: 'ZjVmYWtlY2VydA=='
                                },
                                privateKey: {
                                    base64: 'ZjVmYWtla2V5'
                                }
                            }
                        }
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

            const declarationHandler = new DeclarationHandler(bigIpMock);
            return declarationHandler.process(newDeclaration, state)
                .then(() => {
                    const ldap = declarationWithDefaults.Common.Authentication.ldap;
                    assert.deepStrictEqual(
                        ldap,
                        {
                            sslCaCertFile: {
                                name: 'do_ldapCaCert.crt',
                                checksum: 'SHA1:10:aeddad55dd9aac6894c94e2abf1f4d8e38cf9b77',
                                partition: 'Common'
                            },
                            sslClientCert: {
                                name: 'do_ldapClientCert.crt',
                                checksum: 'SHA1:10:aeddad55dd9aac6894c94e2abf1f4d8e38cf9b77',
                                partition: 'Common'
                            },
                            sslClientKey: {
                                name: 'do_ldapClientCert.key',
                                checksum: 'SHA1:9:00d57ac7d86af67480852dc1604c8118afc21afc',
                                partition: 'Common'
                            }
                        }
                    );
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
                            avrdInterval: 60
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

        it('should convert the declaration to an array of unicastAddress', () => {
            const declaration = {
                parsed: true,
                Common: {
                    FailoverUnicast: {
                        address: '10.1.1.8',
                        port: 12
                    }
                }
            };
            const state = {
                originalConfig: {
                    Common: { }
                },
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        myFailoverUnicast: {
                            class: 'FailoverUnicast',
                            unicastAddress: [
                                {
                                    ip: '10.0.0.2',
                                    port: 1026
                                },
                                {
                                    ip: '10.1.1.8',
                                    port: 12
                                }
                            ]
                        }
                    }
                }
            };
            const handler = new DeclarationHandler(bigIpMock);
            return handler.process(declaration, state)
                .then(() => {
                    assert.deepStrictEqual(declarationWithDefaults.Common.FailoverUnicast, {
                        unicastAddress: [
                            {
                                ip: '10.1.1.8',
                                port: 12
                            }
                        ]
                    });
                });
        });

        it('should error if the declaration has both address and unicastAddress', () => {
            const declaration = {
                parsed: true,
                Common: {
                    FailoverUnicast: {
                        unicastAddress: [
                            {
                                ip: '10.0.0.2',
                                port: 1026
                            }
                        ],
                        address: '10.1.1.8',
                        port: 12
                    }
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
            const handler = new DeclarationHandler(bigIpMock);
            return assert.isRejected(handler.process(declaration, state), /Error: Cannot have Failover Unicasts with both address and addressPort properties provided. This can happen when multiple Failover Unicast objects are provided in the same declaration. To configure multiple Failover Unicasts, use only addressPort./);
        });

        it('should add DHCP Management Routes when preserveOrigDhcpRoutes is true', () => {
            const declaration = {
                parsed: true,
                Common: {
                    System: {
                        preserveOrigDhcpRoutes: true
                    },
                    ManagementRoute: {
                        newManagementRoute: {
                            name: 'newManagementRoute',
                            network: '1.2.3.4',
                            gw: '4.3.2.1',
                            mtu: 0
                        }
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        ManagementRoute: {
                            default: {
                                name: 'default',
                                description: 'configured-by-dhcp',
                                network: 'default',
                                gw: '10.20.30.40',
                                mtu: 0
                            }
                        }
                    }
                },
                originalConfig: {
                    Common: {
                        ManagementRoute: {
                            default: {
                                name: 'default',
                                description: 'configured-by-dhcp',
                                network: 'default',
                                gw: '10.20.30.40',
                                mtu: 0
                            }
                        }
                    }
                }
            };
            const handler = new DeclarationHandler(bigIpMock);
            return handler.process(declaration, state)
                .then(() => {
                    const actualManagementRoutes = diffHandlerStub.args[0][0].Common.ManagementRoute;
                    assert.deepStrictEqual(Object.keys(actualManagementRoutes), ['newManagementRoute', 'default']);
                });
        });

        it('should not add DHCP Management Routes when preserveOrigDhcpRoutes is false', () => {
            const declaration = {
                parsed: true,
                Common: {
                    System: {
                        preserveOrigDhcpRoutes: false
                    },
                    ManagementRoute: {
                        newManagementRoute: {
                            name: 'newManagementRoute',
                            network: '1.2.3.4',
                            gw: '4.3.2.1',
                            mtu: 0
                        }
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        ManagementRoute: {
                            default: {
                                name: 'default',
                                description: 'configured-by-dhcp',
                                network: 'default',
                                gw: '10.20.30.40',
                                mtu: 0
                            }
                        }
                    }
                },
                originalConfig: {
                    Common: {
                        ManagementRoute: {
                            default: {
                                name: 'default',
                                description: 'configured-by-dhcp',
                                network: 'default',
                                gw: '10.20.30.40',
                                mtu: 0
                            }
                        }
                    }
                }
            };
            const handler = new DeclarationHandler(bigIpMock);
            return handler.process(declaration, state)
                .then(() => {
                    const actualManagementRoutes = diffHandlerStub.args[0][0].Common.ManagementRoute;
                    assert.deepStrictEqual(Object.keys(actualManagementRoutes), ['newManagementRoute']);
                });
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
                        avrdInterval: 60
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
                            avrdInterval: 60
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
