/**
 * Copyright 2024 F5, Inc.
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
const sandbox = require('sinon').createSandbox();

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
        sandbox.stub(TeemRecord.prototype, 'calculateAssetId').resolves();
        sandbox.stub(TeemRecord.prototype, 'addRegKey').resolves();
        sandbox.stub(TeemRecord.prototype, 'addPlatformInfo').resolves();
        sandbox.stub(TeemRecord.prototype, 'addProvisionedModules').resolves();
        sandbox.stub(TeemRecord.prototype, 'addClassCount').resolves();
        sandbox.stub(TeemRecord.prototype, 'addJsonObject').resolves();
        sandbox.stub(TeemDevice.prototype, 'reportRecord').resolves();
    });

    afterEach(() => {
        sinon.restore();
        sandbox.restore();
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/afm?ver=12.1.5',
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/avr?ver=12.1.5',
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/urldb?ver=12.1.5',
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

        afterEach(() => {
            diffHandlerStub.restore();
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            declarationHandler.process(newDeclaration)
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.deepStrictEqual(declarationWithDefaults.Common,
                        {
                            InternalUse: {
                                deviceNames: {
                                    deviceName: 'my.bigip.com',
                                    hostName: 'my.bigip.com'
                                }
                            },
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
            DeclarationParser.prototype.parse.restore();
            sinon.stub(DeclarationParser.prototype, 'parse').callsFake(function parse() {
                parsedDeclarations.push(this.declaration);
                return {
                    parsedDeclaration: {
                        Common: this.declaration
                    }
                };
            });

            const newDeclaration = {
                parsed: true,
                Common: {
                    RemoveThis: {},
                    Route: { property: 'value' },
                    RemoveThisToo: {}
                }
            };
            const state = {
                currentConfig: {
                    Common: {}
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.deepStrictEqual(
                        declarationWithDefaults.Common,
                        {
                            Route: { property: 'value' }
                        }
                    );
                });
        });

        it('should move Common.hostname to System class', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    hostname: 'my.host.name'
                }
            };

            const state = {
                currentConfig: {
                    Common: {}
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.deepStrictEqual(
                        declarationWithDefaults.Common.System.hostname,
                        'my.host.name'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.strictEqual(handlersCalled.length, 0);
                });
        });

        it('should send TEEM report', (done) => {
            sandbox.restore();
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
            sinon.stub(TeemDevice.prototype, 'reportRecord').callsFake((recordIn) => {
                try {
                    // Check that each class was called
                    assert.strictEqual(
                        isAddClassCountCalled.calledOnce,
                        true,
                        'should call addClassCount() once'
                    );
                    assert.strictEqual(
                        isAddPlatformInfoCalled.calledOnce,
                        true,
                        'should call addPlatformInfo() once'
                    );
                    assert.strictEqual(
                        isAddRegKeyCalled.calledOnce,
                        true,
                        'should call addRegKey() once'
                    );
                    assert.strictEqual(
                        isAddProvisionedModulesCalled.calledOnce,
                        true,
                        'should call addProvisionedModules() once'
                    );
                    assert.strictEqual(
                        isCalculateAssetIdCalled.calledOnce,
                        true,
                        'should call calculateAssetId() once'
                    );
                    assert.strictEqual(
                        isAddJsonObjectCalled.calledOnce,
                        true,
                        'should call addJsonObject() once'
                    );
                    assert.strictEqual(
                        isReportCalled.called,
                        false,
                        'report() should not have been called'
                    );

                    // Check that the record body object was filled with input
                    assert.deepStrictEqual(
                        recordIn.recordBody,
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
                    done();
                } catch (err) {
                    done(err);
                }
            });

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            declarationHandler.process(newDeclaration);
        });

        it('should count complicated authentication declaration', (done) => {
            sandbox.restore();
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
            sinon.stub(TeemDevice.prototype, 'reportRecord').callsFake((recordIn) => {
                try {
                    // Check that the record body object was filled with input
                    assert.deepStrictEqual(
                        recordIn.recordBody,
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
                    done();
                } catch (err) {
                    done(err);
                }
            });

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            declarationHandler.process(newDeclaration);
        });

        it('should succeed even if TEEM report fails', () => {
            sandbox.restore();
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
            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration);
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return assert.isRejected(declarationHandler.process(newDeclaration),
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
                },
                warnings: ['something bad happened', 'this happened too']
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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
                    assert.deepStrictEqual(
                        status.warnings,
                        ['something bad happened', 'this happened too']
                    );
                });
        });

        describe('DNS Resolver fix', () => {
            it('should reformat DNS Resolver nameservers', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        DNS_Resolver: {
                            myResolver: {
                                name: 'myResolver',
                                forwardZones: [
                                    {
                                        nameservers: [
                                            'zone1',
                                            'zone2',
                                            {
                                                name: 'zone3'
                                            }
                                        ]
                                    }
                                ]
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
                    .then(() => {
                        assert.deepStrictEqual(
                            declarationWithDefaults.Common.DNS_Resolver,
                            {
                                myResolver: {
                                    name: 'myResolver',
                                    forwardZones: [
                                        {
                                            nameservers: [
                                                {
                                                    name: 'zone1'
                                                },
                                                {
                                                    name: 'zone2'
                                                },
                                                {
                                                    name: 'zone3'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        );
                    });
            });
        });

        describe('ManagementIp fix', () => {
            it('should apply fix for ManagementIp', () => {
                const newDeclaration = {
                    parsed: true,
                    Common: {
                        ManagementIp: {
                            myManagementIp: {
                                name: '192.0.2.10/5'
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
                    .then(() => {
                        assert.deepStrictEqual(
                            declarationWithDefaults.Common.ManagementIp,
                            {
                                '192.0.2.10/5': {
                                    name: '192.0.2.10/5'
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
                                '192.0.2.10/5': {
                                    name: '192.0.2.10/5'
                                }
                            }
                        }
                    }
                };
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
                    .then(() => {
                        assert.deepStrictEqual(
                            declarationWithDefaults.Common.ManagementIp,
                            {
                                '192.0.2.10/5': {
                                    name: '192.0.2.10/5'
                                }
                            }
                        );
                    });
            });
        });

        describe('RouteDomain fixes', () => {
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
                    .then(() => {
                        const routeDomain = declarationWithDefaults.Common.RouteDomain;
                        assert.deepStrictEqual(routeDomain['0'].vlans, [
                            '/Common/http-tunnel',
                            '/Partition/vlan',
                            '/Partition/folder/vlan',
                            '/Common/vlan',
                            '/Common/folder/vlan',
                            '/Common/vlan1',
                            '/Common/vlan2',
                            '/Common/vlan5',
                            '/Common/vlan6'
                        ].sort());
                        assert.deepStrictEqual(routeDomain.rd1.vlans, [
                            '/Common/socks-tunnel',
                            '/Partition1/vlan',
                            '/Partition1/folder/vlan',
                            '/Common/folder/vlan2',
                            '/Common/vlan3',
                            '/Common/vlan4',
                            '/Common/rd1Vlan'
                        ].sort());
                        assert.deepStrictEqual(routeDomain.rd2.vlans, ['/Common/rd2Vlan']);
                        assert.strictEqual(routeDomain.rd3.vlans, undefined);
                    });
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
                            ],
                            routeDomain: 'one'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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
                            ],
                            routeDomain: 'one'
                        }
                    );
                });
        });

        it('should apply GSLB globals fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    GSLBGlobals: {
                        existing: {
                            foo: 'bar'
                        }
                    }
                }
            };
            const state = {
                originalConfig: {
                    Common: {
                        GSLBGlobals: {
                            missingSection: {
                                hello: 'goodbye'
                            },
                            existing: {
                                foo: 'baz',
                                missingKey: 'ok'
                            }
                        }
                    }
                },
                currentConfig: {
                    parsed: true,
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const gslbGlobals = declarationWithDefaults.Common.GSLBGlobals;
                    assert.deepStrictEqual(
                        gslbGlobals,
                        {
                            existing: {
                                foo: 'bar',
                                missingKey: 'ok'
                            },
                            missingSection: {
                                hello: 'goodbye'
                            }
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

        it('should apply remote auth role fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    RemoteAuthRole: {
                        myRemoteAuthRole: {
                            class: 'RemoteAuthRole',
                            console: 'disabled'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const remoteAuthRole = declarationWithDefaults.Common.RemoteAuthRole;
                    assert.deepStrictEqual(
                        remoteAuthRole,
                        {
                            myRemoteAuthRole: {
                                class: 'RemoteAuthRole',
                                console: 'disable'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

        it('should ignore NetAddressList in original config if processing FirewallAddressList', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    FirewallAddressList: {
                        myNetAddressList: {
                            class: 'FirewallAddressList',
                            addresses: ['192.168.10.10', '192.168.11.11']
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
                    Common: {
                        NetAddressList: {
                            myNetAddressList: {
                                class: 'NetAddressList',
                                addresses: ['192.168.10.10', '192.168.11.11']
                            }
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const firewallAddressList = declarationWithDefaults.Common.FirewallAddressList;
                    assert.deepStrictEqual(
                        firewallAddressList,
                        {
                            myNetAddressList: {
                                class: 'FirewallAddressList',
                                addresses: ['192.168.10.10', '192.168.11.11']
                            }
                        }
                    );
                    assert.deepStrictEqual(state.currentConfig.Common.NetAddressList, undefined);
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

        it('should ignore NetPortList in original config if processing FirewallPortList', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    FirewallPortList: {
                        myNetPortList: {
                            class: 'FirewallPortList',
                            ports: ['8080', '8081']
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
                    Common: {
                        NetPortList: {
                            myNetPortList: {
                                class: 'NetPortList',
                                ports: ['8080', '8081']
                            }
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const firewallPortList = declarationWithDefaults.Common.FirewallPortList;
                    assert.deepStrictEqual(
                        firewallPortList,
                        {
                            myNetPortList: {
                                class: 'FirewallPortList',
                                ports: ['8080', '8081']
                            }
                        }
                    );
                    assert.deepStrictEqual(state.currentConfig.Common.NetPortList, undefined);
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
                                    name: 'firewallRuleOne',
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: false
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    label: 'testing firewall rule two',
                                    description: 'firewall rule two description',
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const firewallPolicy = declarationWithDefaults.Common.FirewallPolicy;
                    assert.deepStrictEqual(
                        firewallPolicy,
                        {
                            firewallPolicy: {
                                rules: [
                                    {
                                        name: 'firewallRuleOne',
                                        description: undefined,
                                        action: 'accept',
                                        ipProtocol: 'any',
                                        log: false,
                                        source: {},
                                        destination: {}
                                    },
                                    {
                                        name: 'firewallRuleTwo',
                                        description: 'firewall rule two description',
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

        it('should handle case where there are no firewall policies', () => {
            const newDeclaration = {
                Common: {}
            };

            const state = {
                originalConfig: {
                    Common: {
                        FirewallPolicy: {
                            description: 'none'
                        }
                    }
                },
                currentConfig: {
                    parsed: true,
                    Common: {
                        FirewallPolicy: {
                            description: 'none'
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.deepStrictEqual(
                        declarationWithDefaults,
                        {
                            Common: {
                                FirewallPolicy: {
                                    description: 'none'
                                }
                            }
                        }
                    );
                });
        });

        it('should apply management IP firewall fix with rules', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    ManagementIpFirewall: {
                        label: 'testing management IP firewall',
                        description: 'management IP firewall description',
                        rules: [
                            {
                                name: 'firewallRuleOne',
                                action: 'accept',
                                ipProtocol: 'any',
                                log: false
                            },
                            {
                                name: 'firewallRuleTwo',
                                label: 'testing firewall rule two',
                                description: 'firewall rule two description',
                                action: 'reject',
                                ipProtocol: 'tcp',
                                log: true,
                                source: {
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const managementIpFirewall = declarationWithDefaults.Common.ManagementIpFirewall;
                    assert.deepStrictEqual(
                        managementIpFirewall,
                        {
                            description: 'management IP firewall description',
                            rules: [
                                {
                                    name: 'firewallRuleOne',
                                    description: undefined,
                                    action: 'accept',
                                    ipProtocol: 'any',
                                    log: false,
                                    source: {},
                                    destination: {}
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    description: 'firewall rule two description',
                                    action: 'reject',
                                    ipProtocol: 'tcp',
                                    log: true,
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

        it('should apply management IP firewall fix with no rules', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    ManagementIpFirewall: {
                        label: 'testing management IP firewall',
                        description: 'management IP firewall description'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const managementIpFirewall = declarationWithDefaults.Common.ManagementIpFirewall;
                    assert.deepStrictEqual(
                        managementIpFirewall,
                        {
                            description: 'management IP firewall description',
                            rules: []
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

        describe('RoutingAccessList fixes', () => {
            let newDeclaration;
            let state;

            beforeEach(() => {
                newDeclaration = {
                    parsed: true,
                    Common: {
                        RoutingAccessList: {
                            list: {
                                name: 'list'
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

            describe('entries destination and source', () => {
                it('should replace 0.0.0.0 or 0.0.0.0 slash CIDR address with ipv4 default', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0',
                            action: 'deny',
                            source: '0.0.0.0/10'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '0.0.0.0/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '0.0.0.0/0');
                        });
                });

                it('should leave double colon addresses alone in destination and source', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '::',
                            action: 'deny',
                            source: '::'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '::');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '::');
                        });
                });

                it('should leave 0.0.0.0 slash 0 alone in destination and source', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0/0',
                            action: 'deny',
                            source: '0.0.0.0/0'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '0.0.0.0/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '0.0.0.0/0');
                        });
                });

                it('should replace source 0.0.0.0 address with 0.0.0.0 slash 0 when destination is ipv4', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '10.10.10.10/32',
                            action: 'deny',
                            source: '0.0.0.0'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '10.10.10.10/32');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '0.0.0.0/0');
                        });
                });

                it('should replace source 0.0.0.0 slash CIDR address with 0.0.0.0 slash 0 when destination is ipv4', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '10.10.10.10/32',
                            action: 'deny',
                            source: '0.0.0.0/10'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '10.10.10.10/32');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '0.0.0.0/0');
                        });
                });

                it('should replace source 0.0.0.0 address with :: slash 0 when destination is ipv6', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '1111::/32',
                            action: 'deny',
                            source: '0.0.0.0'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '1111::/32');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '::/0');
                        });
                });

                it('should replace source 0.0.0.0 slash CIDR address with :: slash 0 when destination is ipv6', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '1111::/32',
                            action: 'deny',
                            source: '0.0.0.0/6'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '1111::/32');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '::/0');
                        });
                });

                it('should replace destination 0.0.0.0 address with 0.0.0.0 slash 0 when source is ipv4', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0',
                            action: 'deny',
                            source: '10.10.10.10/32'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '0.0.0.0/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '10.10.10.10/32');
                        });
                });

                it('should replace destination 0.0.0.0 slash CIDR address with 0.0.0.0 slash 0 when source is ipv4', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0/10',
                            action: 'deny',
                            source: '10.10.10.10/32'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '0.0.0.0/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '10.10.10.10/32');
                        });
                });

                it('should replace destination 0.0.0.0 address with :: slash 0 when source is ipv6', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0',
                            action: 'deny',
                            source: '1111::/32'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '::/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '1111::/32');
                        });
                });

                it('should replace destination 0.0.0.0 slash CIDR address with :: slash 0 when source is ipv6', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '0.0.0.0/10',
                            action: 'deny',
                            source: '1111::/32'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '::/0');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '1111::/32');
                        });
                });

                it('should append slash 32 to fixed ipv4 address', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '10.10.10.10',
                            action: 'deny',
                            source: '192.0.2.20'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '10.10.10.10/32');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '192.0.2.20/32');
                        });
                });

                it('should append slash 128 to fixed ipv6 address', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '1111:2222:3333::',
                            action: 'deny',
                            source: '1111:2222:4444::'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '1111:2222:3333::/128');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '1111:2222:4444::/128');
                        });
                });

                it('should not modify an ipv4 network address', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '10.10.0.0/16',
                            action: 'deny',
                            source: '192.0.2.20/16'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '10.10.0.0/16');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '192.0.2.20/16');
                        });
                });

                it('should not modify an ipv6 network address', () => {
                    newDeclaration.Common.RoutingAccessList.list.entries = [
                        {
                            name: '20',
                            destination: '1111:2222:3333::/64',
                            action: 'deny',
                            source: '1111:2222:4444::/64'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].destination, '1111:2222:3333::/64');
                            assert.strictEqual(declarationWithDefaults.Common.RoutingAccessList.list.entries[0].source, '1111:2222:4444::/64');
                        });
                });
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

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
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

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
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

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
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

            describe('top level addressFamily', () => {
                describe('addressFamily name', () => {
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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
                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                describe('addressFamily redistributionList', () => {
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
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
            });

            describe('neighbors', () => {
                it('should sort neighbors by ip address', () => {
                    newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                        {
                            name: '10.1.1.4',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    asOverride: 'disabled'
                                },
                                {
                                    name: 'ipv6',
                                    asOverride: 'disabled'
                                }
                            ],
                            ebgpMultihop: 1,
                            peerGroup: 'Neighbor_IN'
                        },
                        {
                            name: '10.1.1.5',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    asOverride: 'enabled'
                                },
                                {
                                    name: 'ipv6',
                                    asOverride: 'enabled'
                                }
                            ],
                            ebgpMultihop: 2,
                            peerGroup: 'Neighbor_OUT'
                        },
                        {
                            name: '10.1.1.2',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    asOverride: 'disabled'
                                },
                                {
                                    name: 'ipv6',
                                    asOverride: 'disabled'
                                }
                            ],
                            ebgpMultihop: 3,
                            peerGroup: 'Neighbor_IN'
                        },
                        {
                            name: '10.1.1.3',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    asOverride: 'enabled'
                                },
                                {
                                    name: 'ipv6',
                                    asOverride: 'enabled'
                                }
                            ],
                            ebgpMultihop: 4,
                            peerGroup: 'Neighbor_OUT'
                        }
                    ];

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
                        .then(() => {
                            assert.deepStrictEqual(
                                declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                [
                                    {
                                        name: '10.1.1.2',
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                asOverride: 'disabled'
                                            },
                                            {
                                                name: 'ipv6',
                                                asOverride: 'disabled'
                                            }
                                        ],
                                        ebgpMultihop: 3,
                                        peerGroup: 'Neighbor_IN'
                                    },
                                    {
                                        name: '10.1.1.3',
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                asOverride: 'enabled'
                                            },
                                            {
                                                name: 'ipv6',
                                                asOverride: 'enabled'
                                            }
                                        ],
                                        ebgpMultihop: 4,
                                        peerGroup: 'Neighbor_OUT'
                                    },
                                    {
                                        name: '10.1.1.4',
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                asOverride: 'disabled'
                                            },
                                            {
                                                name: 'ipv6',
                                                asOverride: 'disabled'
                                            }
                                        ],
                                        ebgpMultihop: 1,
                                        peerGroup: 'Neighbor_IN'
                                    },
                                    {
                                        name: '10.1.1.5',
                                        addressFamily: [
                                            {
                                                name: 'ipv4',
                                                asOverride: 'enabled'
                                            },
                                            {
                                                name: 'ipv6',
                                                asOverride: 'enabled'
                                            }
                                        ],
                                        ebgpMultihop: 2,
                                        peerGroup: 'Neighbor_OUT'
                                    }
                                ]
                            );
                        });
                });

                describe('addressFamily name', () => {
                    it('should split addressFamilies when internetProtocol (name) is all', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                addressFamily: [
                                    {
                                        name: 'all',
                                        asOverride: 'disabled'
                                    }
                                ],
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors[0].addressFamily,
                                    [
                                        {
                                            name: 'ipv4',
                                            asOverride: 'disabled'
                                        },
                                        {
                                            name: 'ipv6',
                                            asOverride: 'disabled'
                                        }
                                    ]
                                );
                            });
                    });

                    it('should fill in unspecified addressFamilies ipv4 internetProtocol (name)', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                addressFamily: [
                                    {
                                        name: 'ipv6',
                                        asOverride: 'enabled'
                                    }
                                ],
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                    [
                                        {
                                            name: '10.1.1.4',
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    asOverride: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    asOverride: 'enabled'
                                                }
                                            ],
                                            ebgpMultihop: 1,
                                            peerGroup: 'Neighbor_IN'
                                        }
                                    ]
                                );
                            });
                    });

                    it('should fill in unspecified addressFamilies ipv6 internetProtocol (name)', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                addressFamily: [
                                    {
                                        name: 'ipv4',
                                        asOverride: 'enabled'
                                    }
                                ],
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                    [
                                        {
                                            name: '10.1.1.4',
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    asOverride: 'enabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    asOverride: 'disabled'
                                                }
                                            ],
                                            ebgpMultihop: 1,
                                            peerGroup: 'Neighbor_IN'
                                        }
                                    ]
                                );
                            });
                    });

                    it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with empty addressFamilies', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                addressFamily: [],
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                    [
                                        {
                                            name: '10.1.1.4',
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    asOverride: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    asOverride: 'disabled'
                                                }
                                            ],
                                            ebgpMultihop: 1,
                                            peerGroup: 'Neighbor_IN'
                                        }
                                    ]
                                );
                            });
                    });

                    it('should fill in both unspecified ipv4 and ipv6 internetProtocol (name) with no addressFamilies', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                    [
                                        {
                                            name: '10.1.1.4',
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    asOverride: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    asOverride: 'disabled'
                                                }
                                            ],
                                            ebgpMultihop: 1,
                                            peerGroup: 'Neighbor_IN'
                                        }
                                    ]
                                );
                            });
                    });

                    it('should sort addressFamily by internetProtocol (name) ipv4 first', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.neighbors = [
                            {
                                name: '10.1.1.4',
                                addressFamily: [
                                    {
                                        name: 'ipv6',
                                        asOverride: 'enabled'
                                    },
                                    {
                                        name: 'ipv4',
                                        asOverride: 'disabled'
                                    }
                                ],
                                ebgpMultihop: 1,
                                peerGroup: 'Neighbor_IN'
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.neighbors,
                                    [
                                        {
                                            name: '10.1.1.4',
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    asOverride: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    asOverride: 'enabled'
                                                }
                                            ],
                                            ebgpMultihop: 1,
                                            peerGroup: 'Neighbor_IN'
                                        }
                                    ]
                                );
                            });
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

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
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

                    const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                    return declarationHandler.process(newDeclaration)
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

                describe('addressFamily name', () => {
                    it('should fill in unspecified addressFamilies ipv4 internetProtocol (name)', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                            {
                                addressFamily: [
                                    {
                                        name: 'ipv6',
                                        routeMap: {},
                                        softReconfigurationInbound: 'disabled'
                                    }
                                ]
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                    [
                                        {
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                }
                                            ]
                                        }
                                    ]
                                );
                            });
                    });

                    it('should fill in unspecified addressFamilies ipv6 internetProtocol (name)', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                            {
                                addressFamily: [
                                    {
                                        name: 'ipv4',
                                        routeMap: {},
                                        softReconfigurationInbound: 'disabled'
                                    }
                                ]
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                    [
                                        {
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                    [
                                        {
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
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

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                    [
                                        {
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                }
                                            ]
                                        }
                                    ]
                                );
                            });
                    });

                    it('should sort addressFamily by internetProtocol (name) ipv4 first', () => {
                        newDeclaration.Common.RoutingBGP.bgp1.peerGroups = [
                            {
                                addressFamily: [
                                    {
                                        name: 'ipv6',
                                        routeMap: {},
                                        softReconfigurationInbound: 'enabled'
                                    },
                                    {
                                        name: 'ipv4',
                                        routeMap: {},
                                        softReconfigurationInbound: 'disabled'
                                    }
                                ]
                            }
                        ];

                        const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                        return declarationHandler.process(newDeclaration)
                            .then(() => {
                                assert.deepStrictEqual(
                                    declarationWithDefaults.Common.RoutingBGP.bgp1.peerGroups,
                                    [
                                        {
                                            addressFamily: [
                                                {
                                                    name: 'ipv4',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'disabled'
                                                },
                                                {
                                                    name: 'ipv6',
                                                    routeMap: {},
                                                    softReconfigurationInbound: 'enabled'
                                                }
                                            ]
                                        }
                                    ]
                                );
                            });
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
                return declarationHandler.process(newDeclaration)
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
                                certificate: 'f5fakecert'
                            },
                            sslClientCert: {
                                certificate: 'f5fakecert',
                                privateKey: 'f5fakekey'
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
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

            const handler = new DeclarationHandler(bigIpMock, null, state);
            return assert.isRejected(handler.process(declaration), /This is an error/);
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
            const handler = new DeclarationHandler(bigIpMock, null, state);
            return handler.process(declaration)
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
            const handler = new DeclarationHandler(bigIpMock, null, state);
            return assert.isRejected(handler.process(declaration), /Error: Cannot have Failover Unicasts with both address and addressPort properties provided. This can happen when multiple Failover Unicast objects are provided in the same declaration. To configure multiple Failover Unicasts, use only addressPort./);
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
                            network: '192.0.2.10',
                            gw: '192.0.2.30',
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
                        },
                        System: {}
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
            const handler = new DeclarationHandler(bigIpMock, null, state);
            return handler.process(declaration)
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
                            network: '192.0.2.10',
                            gw: '192.0.2.30',
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
                        },
                        System: {}
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
            const handler = new DeclarationHandler(bigIpMock, null, state);
            return handler.process(declaration)
                .then(() => {
                    const actualManagementRoutes = diffHandlerStub.args[0][0].Common.ManagementRoute;
                    assert.deepStrictEqual(Object.keys(actualManagementRoutes), ['newManagementRoute']);
                });
        });

        it('should remove mgmtDhcp from currentConfig when it is not in the declaration', () => {
            const declaration = {
                parsed: true,
                Common: {
                    System: {
                        preserveOrigDhcpRoutes: false
                    }
                }
            };
            const state = {
                currentConfig: {
                    name: 'current',
                    parsed: true,
                    Common: {
                        System: {
                            mgmtDhcp: 'enabled'
                        }
                    }
                },
                originalConfig: {
                    Common: {
                        System: {
                            mgmtDhcp: 'disabled'
                        }
                    }
                }
            };
            const handler = new DeclarationHandler(bigIpMock, null, state);
            return handler.process(declaration)
                .then(() => {
                    assert.deepStrictEqual(
                        state.currentConfig,
                        {
                            Common: {},
                            name: 'current',
                            parsed: true
                        }
                    );
                });
        });

        it('should apply net address list fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    NetAddressList: {
                        myNetAddressList: {
                            class: 'NetAddressList',
                            addresses: ['B', 'A']
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const netAddressList = declarationWithDefaults.Common.NetAddressList;
                    assert.deepStrictEqual(
                        netAddressList,
                        {
                            myNetAddressList: {
                                class: 'NetAddressList',
                                addresses: ['A', 'B']
                            }
                        }
                    );
                });
        });

        it('should ignore FirewallAddressList in original config if processing NetAddressList', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    NetAddressList: {
                        myNetAddressList: {
                            class: 'NetAddressList',
                            addresses: ['192.168.10.10', '192.168.11.11']
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
                    Common: {
                        FirewallAddressList: {
                            myNetAddressList: {
                                class: 'FirewallAddressList',
                                addresses: ['192.168.10.10', '192.168.11.11']
                            }
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const netAddressList = declarationWithDefaults.Common.NetAddressList;
                    assert.deepStrictEqual(
                        netAddressList,
                        {
                            myNetAddressList: {
                                class: 'NetAddressList',
                                addresses: ['192.168.10.10', '192.168.11.11']
                            }
                        }
                    );
                    assert.deepStrictEqual(state.currentConfig.Common.FirewallAddressList, undefined);
                });
        });

        it('should apply net port list fix', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    NetPortList: {
                        myNetPortList: {
                            class: 'NetPortList',
                            ports: [8081, 8889]
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

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const netPortList = declarationWithDefaults.Common.NetPortList;
                    assert.deepStrictEqual(
                        netPortList,
                        {
                            myNetPortList: {
                                class: 'NetPortList',
                                ports: ['8081', '8889']
                            }
                        }
                    );
                });
        });

        it('should ignore FirewallPortList in original config if processing NetPortList', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    NetPortList: {
                        myNetPortList: {
                            class: 'NetPortList',
                            ports: ['8080', '8081']
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
                    Common: {
                        FirewallPortList: {
                            myNetPortList: {
                                class: 'FirewallPortList',
                                ports: ['8080', '8081']
                            }
                        }
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    const netPortList = declarationWithDefaults.Common.NetPortList;
                    assert.deepStrictEqual(
                        netPortList,
                        {
                            myNetPortList: {
                                class: 'NetPortList',
                                ports: ['8080', '8081']
                            }
                        }
                    );
                    assert.deepStrictEqual(state.currentConfig.Common.FirewallPortList, undefined);
                });
        });

        it('should apply SecurityWaf fixes', () => {
            const newDeclaration = {
                parsed: true,
                Common: {
                    SecurityWaf: {
                        antiVirusProtection: {
                            guaranteeEnforcement: true,
                            hostname: 'do.test',
                            port: 123
                        },
                        advancedSettings: [
                            {
                                name: 'max_raw_request_len',
                                value: '1000'
                            },
                            {
                                name: 'ignore_cookies_msg_key',
                                value: 1
                            }
                        ]
                    }
                }
            };
            const state = {
                originalConfig: {
                    Common: {
                        SecurityWaf: {
                            antiVirusProtection: {
                                guaranteeEnforcement: true,
                                hostname: '',
                                port: 1344
                            },
                            advancedSettings: {
                                cookie_max_age: {
                                    id: '1XJcDTbBxqP0GtOcdQzF0g',
                                    value: '0'
                                },
                                max_raw_request_len: {
                                    id: 'AG4WUXljvu9lM6AH8dAKXg',
                                    value: '10000'
                                },
                                ignore_cookies_msg_key: {
                                    id: 'USER_DEFINED',
                                    value: '0'
                                },
                                single_page_application: {
                                    id: 'GqhjvcKleDusK8-xl1lC4w',
                                    value: '0'
                                }
                            }
                        }
                    }
                },
                currentConfig: {
                    parsed: true,
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock, null, state);
            return declarationHandler.process(newDeclaration)
                .then(() => {
                    assert.deepStrictEqual(
                        declarationWithDefaults.Common.SecurityWaf,
                        {
                            antiVirusProtection: {
                                guaranteeEnforcement: true,
                                hostname: 'do.test',
                                port: 123
                            },
                            advancedSettings: {
                                cookie_max_age: {
                                    id: '1XJcDTbBxqP0GtOcdQzF0g',
                                    value: '0'
                                },
                                max_raw_request_len: {
                                    id: 'AG4WUXljvu9lM6AH8dAKXg',
                                    value: '1000'
                                },
                                ignore_cookies_msg_key: {
                                    id: 'USER_DEFINED',
                                    value: '1'
                                },
                                single_page_application: {
                                    id: 'GqhjvcKleDusK8-xl1lC4w',
                                    value: '0'
                                }
                            }
                        }
                    );
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/afm?ver=12.1.5',
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/avr?ver=12.1.5',
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
                                selfLink: 'https://localhost/mgmt/tm/sys/provision/urldb?ver=12.1.5',
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
            const handler = new DeclarationHandler(new AvrBigIpMock(), null, state);
            return handler.process(declaration)
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
            const handler = new DeclarationHandler(new AvrBigIpMock(), null, state);
            return handler.process(declaration)
                .then(() => {
                    assert(!isAvrProvisioned, 'AVR was not de-provisioned');
                });
        });
    });
});
