/**
 * Copyright 2018-2019 F5 Networks, Inc.
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
const fs = require('fs');
const sinon = require('sinon');
const State = require('../../../../src/lib/state');
const RealValidator = require('../../../../src/lib/validator');
const STATUS = require('../../../../src/lib/sharedConstants').STATUS;
const EVENTS = require('../../../../src/lib/sharedConstants').EVENTS;

/* eslint-disable global-require */

describe('restWorker', () => {
    let DeclarationHandlerMock;
    let ConfigManagerMock;
    let RestWorker;
    let cryptoUtilMock;
    let bigIpMock;
    let declaration;
    let restOperationMock;
    let responseBody;
    let statusCode;
    let SshUtilMock;
    let httpUtilMock;
    let doUtilMock;

    before(() => {
        cryptoUtilMock = require('../../../../src/lib/cryptoUtil');
        ConfigManagerMock = require('../../../../src/lib/configManager');
        DeclarationHandlerMock = require('../../../../src/lib/declarationHandler');
        SshUtilMock = require('../../../../src/lib/sshUtil');
        RestWorker = require('../../../../src/nodejs/restWorker');
        httpUtilMock = require('../../../../node_modules/@f5devcentral/f5-cloud-libs').httpUtil;
        doUtilMock = require('../../../../src/lib/doUtil');
    });

    beforeEach(() => {
        declaration = {};
        responseBody = null;
        statusCode = null;

        restOperationMock = {
            setStatusCode(code) { statusCode = code; },
            setContentType() {},
            getContentType() { return 'application/json'; },
            setBody(body) { responseBody = body; },
            getBody() { return declaration; },
            getUri() {
                return {
                    query: 'foo'
                };
            },
            getMethod() { return 'Get'; }
        };
        sinon.stub(doUtilMock, 'rebootRequired').resolves(false);
    });

    afterEach(() => {
        sinon.restore();
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    describe('onStart', () => {
        let restWorker;
        beforeEach(() => {
            restWorker = new RestWorker();
            restWorker.restHelper = {
                makeRestjavadUri() {}
            };
            restWorker.dependencies = [];
        });

        it('should respond handle success', () => new Promise((resolve, reject) => {
            const success = () => {
                resolve();
            };
            const error = () => {
                reject(new Error('should have called success'));
            };

            try {
                restWorker.onStart(success, error);
            } catch (err) {
                reject(err);
            }
        }));

        it('should handle error', () => new Promise((resolve, reject) => {
            const success = () => {
                throw new Error('should have called error');
            };
            const error = () => {
                resolve();
            };

            try {
                restWorker.onStart(success, error);
            } catch (err) {
                reject(err);
            }
        }));

        it('should set dependencies', () => new Promise((resolve, reject) => {
            restWorker.restHelper.makeRestjavadUri = () => 'https://path/to/deviceInfo';

            const success = () => {
                assert.strictEqual(restWorker.dependencies[0], 'https://path/to/deviceInfo');
                resolve();
            };
            const error = () => {
                reject(new Error('should have called success'));
            };

            try {
                restWorker.onStart(success, error);
            } catch (err) {
                reject(err);
            }
        }));
    });

    describe('onStartCompleted', () => {
        beforeEach(() => {
            sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IP');
        });

        it('should call error if given an error message', () => new Promise((resolve, reject) => {
            const restWorker = new RestWorker();
            const success = () => {
                reject(new Error('should have called error'));
            };
            const error = () => {
                resolve();
            };

            try {
                restWorker.onStartCompleted(success, error, null, 'error message');
            } catch (err) {
                reject(err);
            }
        }));

        it('should load state', () => {
            let loadStateCalled = false;

            RestWorker.prototype.loadState = (foo, callback) => {
                loadStateCalled = true;
                const state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_OK
                                }
                            }
                        }
                    }
                };
                callback(null, state);
            };

            return new Promise((resolve, reject) => {
                const restWorker = new RestWorker();
                const success = () => {
                    assert.ok(loadStateCalled);
                    resolve();
                };
                const error = () => {
                    reject(new Error('Shoud have called success'));
                };
                try {
                    restWorker.onStartCompleted(success, error);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should handle load state errors', () => {
            RestWorker.prototype.loadState = (foo, callback) => {
                const state = {
                    doState: {}
                };
                callback(new Error('foo'), state);
            };
            return new Promise((resolve, reject) => {
                const restWorker = new RestWorker();
                const success = () => {
                    reject(new Error('should have called error'));
                };
                const error = () => {
                    resolve();
                };
                try {
                    restWorker.onStartCompleted(success, error);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should reset status if rebooting', () => new Promise((resolve, reject) => {
            const restWorker = new RestWorker();
            const success = () => {
                assert.strictEqual(restWorker.state.doState.tasks[1234].result.status, 'OK');
                resolve();
            };
            const error = () => {
                reject(new Error('should have called success'));
            };

            RestWorker.prototype.loadState = (foo, callback) => {
                const state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_REBOOTING
                                },
                                internalDeclaration: {},
                                requestOptions: {}
                            }
                        }
                    }
                };
                callback(null, state);
            };
            RestWorker.prototype.saveState = (foo, state, callback) => {
                callback();
            };
            try {
                restWorker.onStartCompleted(success, error);
            } catch (err) {
                reject(err);
            }
        }));

        describe('revoking', () => {
            const bigIpPassword = 'myBigIpPassword';
            const bigIqPassword = 'myBigIqPassword';

            let decryptedIds;
            let restWorker;
            let state;

            beforeEach(() => {
                ConfigManagerMock.prototype.get = () => Promise.resolve();

                DeclarationHandlerMock.prototype.process = () => Promise.resolve();

                decryptedIds = [];

                bigIpMock = {
                    save() {
                        return Promise.resolve();
                    }
                };
                sinon.stub(doUtilMock, 'getBigIp').resolves(bigIpMock);
                doUtilMock.getCurrentPlatform.restore();
                sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IP');
                doUtilMock.rebootRequired.restore();
                sinon.stub(doUtilMock, 'rebootRequired').resolves(true);

                cryptoUtilMock.decryptId = (id) => {
                    let password;
                    if (id === 'doBigIp') {
                        password = bigIpPassword;
                    } else if (id === 'doBigIq') {
                        password = bigIqPassword;
                    }
                    decryptedIds.push(id);
                    return Promise.resolve(password);
                };
                cryptoUtilMock.deleteEncryptedId = () => Promise.resolve();

                RestWorker.prototype.saveState = (foo, theState, callback) => {
                    callback();
                };
                RestWorker.prototype.loadState = (foo, callback) => {
                    callback(null, state);
                };

                restWorker = new RestWorker();
                restWorker.state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_OK
                                }
                            }
                        }
                    }
                };
            });

            it('should remove the revokeFrom property from the license after revoking', () => new Promise((resolve, reject) => {
                const success = () => {};
                const error = () => {
                    reject(new Error('should have called success'));
                };

                state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_REVOKING
                                },
                                internalDeclaration: {
                                    Common: {
                                        myLicense: {
                                            class: 'License',
                                            revokeFrom: 'foo'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                bigIpMock.reboot = () => {
                    assert.strictEqual(
                        restWorker
                            .state.doState.tasks[1234].internalDeclaration.Common.myLicense.revokeFrom,
                        undefined
                    );
                    resolve();
                };

                try {
                    restWorker.onStartCompleted(success, error);
                } catch (err) {
                    reject(err);
                }
            }));

            it('should decrypt ids if neccessary after revoking', () => new Promise((resolve, reject) => {
                const success = () => {};
                const error = () => {
                    reject(new Error('should have called success'));
                };

                state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_REVOKING
                                },
                                internalDeclaration: {
                                    Common: {
                                        myLicense: {
                                            class: 'License',
                                            revokeFrom: 'foo',
                                            bigIpUsername: 'myBigIpUser',
                                            bigIqUsername: 'myBigIqUser'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                bigIpMock.reboot = () => {
                    assert.strictEqual(decryptedIds.length, 2);
                    assert.strictEqual(
                        restWorker
                            .state.doState.tasks[1234].internalDeclaration.Common.myLicense.bigIpPassword,
                        undefined,
                        'Stored state should not save decryptedId'
                    );
                    assert.strictEqual(
                        restWorker
                            .state.doState.tasks[1234].internalDeclaration.Common.myLicense.bigIqPassword,
                        undefined,
                        'Stored state should not save decryptedId'
                    );
                    resolve();
                };

                try {
                    restWorker.onStartCompleted(success, error);
                } catch (err) {
                    reject(err);
                }
            }));

            it('should not decrypt ids if not neccessary after revoking', () => new Promise((resolve, reject) => {
                const success = () => {};
                const error = () => {
                    reject(new Error('should have called success'));
                };

                state = {
                    doState: {
                        mostRecentTask: 1234,
                        tasks: {
                            1234: {
                                result: {
                                    status: STATUS.STATUS_REVOKING
                                },
                                internalDeclaration: {
                                    Common: {
                                        myLicense: {
                                            class: 'License',
                                            revokeFrom: 'foo'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                bigIpMock.reboot = () => {
                    assert.strictEqual(decryptedIds.length, 0);
                    resolve();
                };

                try {
                    restWorker.onStartCompleted(success, error);
                } catch (err) {
                    reject(err);
                }
            }));
        });

        it('should handle LICENSE_WILL_BE_REVOKED event', () => new Promise((resolve, reject) => {
            const bigIpPassword = 'myBigIpPassword';
            const bigIqPassword = 'myBigIqPassword';
            const restWorker = new RestWorker();
            const encryptedValues = [];
            cryptoUtilMock.encryptValue = (value) => {
                encryptedValues.push(value);
                if (encryptedValues.length === 2) {
                    assert.strictEqual(encryptedValues[0], 'myBigIpPassword');
                    assert.strictEqual(encryptedValues[1], 'myBigIqPassword');
                    resolve();
                }
            };

            const success = () => {
                restWorker.eventEmitter.emit(
                    EVENTS.LICENSE_WILL_BE_REVOKED,
                    1234,
                    bigIpPassword,
                    bigIqPassword
                );
            };
            const error = () => {
                reject(new Error('should have called success'));
            };

            try {
                restWorker.platform = 'BIG-IP';
                restWorker.onStartCompleted(success, error);
            } catch (err) {
                reject(err);
            }
        }));

        it('should emit READY_FOR_REVOKE from LICENSE_WILL_BE_REVOKED event', () => new Promise((resolve, reject) => {
            const restWorker = new RestWorker();
            const taskId = 1234;

            bigIpMock = {
                save() {
                    return Promise.resolve();
                }
            };
            restWorker.bigIps[taskId] = bigIpMock;

            cryptoUtilMock.encryptValue = () => Promise.resolve();
            restWorker.eventEmitter.on(EVENTS.READY_FOR_REVOKE, () => {
                resolve();
            });

            const success = () => {
                restWorker.eventEmitter.emit(
                    EVENTS.LICENSE_WILL_BE_REVOKED,
                    taskId,
                    'foo',
                    'foofoo'
                );
            };
            const error = () => {
                reject(new Error('should have called success'));
            };

            try {
                restWorker.platform = 'BIG-IP';
                restWorker.onStartCompleted(success, error);
            } catch (err) {
                reject(err);
            }
        }));
    });

    describe('onGet', () => {
        let restWorker;

        const code1234 = 200;
        const code5678 = 300;
        const code8888 = 422;
        const declaration1234 = {
            foo: 'bar'
        };
        const declaration5678 = {
            hello: 'world'
        };

        beforeEach(() => {
            restWorker = new RestWorker();
            restWorker.state = {
                doState: {
                    tasks: {
                        1234: {
                            internalDeclaration: declaration1234,
                            result: {
                                code: code1234
                            }
                        },
                        5678: {
                            internalDeclaration: declaration5678,
                            result: {
                                code: code5678
                            }
                        },
                        8888: {
                            result: {
                                code: code8888
                            }
                        },
                        9999: {
                            result: {
                                code: 'this is non-numeric'
                            }
                        }
                    }
                }
            };
        });

        it('should return state for most recent task if no path is specified', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(Array.isArray(responseBody), false);
                assert.deepEqual(responseBody.declaration, { foo: 'bar' });
                assert.strictEqual(responseBody.result.code, 200);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding'
            });

            restWorker.state.doState.mostRecentTask = 1234;

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should return state for all tasks if tasks path is specified with no task', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.ok(Array.isArray(responseBody));
                assert.deepEqual(responseBody[0].declaration, { foo: 'bar' });
                assert.strictEqual(responseBody[0].result.code, 200);
                assert.deepEqual(responseBody[1].declaration, { hello: 'world' });
                assert.strictEqual(responseBody[1].result.code, 300);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/task'
            });

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should return state for specified task if tasks path is specified with a task', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(Array.isArray(responseBody), false);
                assert.deepEqual(responseBody.declaration, { foo: 'bar' });
                assert.strictEqual(responseBody.result.code, 200);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/task/1234'
            });

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should return 200 for an invalid task using experimental statusCodes', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(Array.isArray(responseBody), false);
                assert.strictEqual(responseBody.result.code, 422);
                assert.strictEqual(statusCode, 200);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/task/8888',
                query: { statusCodes: 'experimental' }
            });

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should return 422 for an invalid task using legacy statusCodes', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(Array.isArray(responseBody), false);
                assert.strictEqual(responseBody.result.code, 422);
                assert.strictEqual(statusCode, 422);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/task/8888',
                query: { statusCodes: 'legacy' }
            });

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should not set non-numeric status code', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(statusCode, 500);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/task/9999',
                query: { statusCodes: 'legacy' }
            });

            try {
                restWorker.onGet(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));
    });

    describe('getExampleState', () => {
        let restWorker;

        beforeEach(() => {
            restWorker = new RestWorker();
        });

        it('should return contents of onboard.json', () => {
            sinon.stub(fs, 'readFileSync').callsFake(() => (JSON.stringify({ hello: 'world' })));
            const response = restWorker.getExampleState();
            assert.deepEqual(response, { hello: 'world' });
        });

        it('should handle errors gracefully', () => {
            sinon.stub(fs, 'readFileSync').throws();
            const response = restWorker.getExampleState();
            assert.deepEqual(response, { message: 'no example available' });
        });
    });

    describe('onDelete', () => {
        let restWorker;
        let deletedId;

        const config1234 = {
            foo: 'bar'
        };
        const config5678 = {
            hello: 'world'
        };

        beforeEach(() => {
            deletedId = null;
            restWorker = new RestWorker();
            restWorker.state = {
                doState: {
                    originalConfig: {
                        1234: config1234,
                        5678: config5678
                    },
                    getOriginalConfigByConfigId(id) {
                        return this.originalConfig[id];
                    },
                    deleteOriginalConfigByConfigId(id) {
                        deletedId = id;
                    }
                }
            };

            RestWorker.prototype.saveState = (foo, state, callback) => {
                callback();
            };
        });

        it('should delete original config', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(deletedId, '1234');
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/config/1234'
            });

            try {
                restWorker.onDelete(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should return 404 for non-existing id', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(statusCode, 404);
                resolve();
            };
            restOperationMock.getUri = () => ({
                pathname: '/shared/declarative-onboarding/config/9999'
            });

            try {
                restWorker.onDelete(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));
    });

    describe('onPost', () => {
        const validatorMock = {};
        let updateResultSpy;

        let restWorker;
        let bigIpOptionsCalled;
        let saveCalled;
        let saveStateCalled;

        beforeEach(() => {
            restOperationMock.getMethod = () => 'Post';
            ConfigManagerMock.prototype.get = () => Promise.resolve();

            DeclarationHandlerMock.prototype.process = () => Promise.resolve();

            bigIpOptionsCalled = {};
            saveCalled = false;
            saveStateCalled = false;
            bigIpMock = {
                save() {
                    saveCalled = true;
                    return Promise.resolve();
                },
                reboot() {}
            };

            sinon.stub(doUtilMock, 'getBigIp').callsFake((logger, bigIpOptions) => {
                bigIpOptionsCalled = bigIpOptions;
                return Promise.resolve(bigIpMock);
            });
            sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IP');

            validatorMock.validate = () => Promise.resolve({
                isValid: true
            });

            RestWorker.prototype.saveState = (foo, state, callback) => {
                saveStateCalled = true;
                callback();
            };

            restWorker = new RestWorker();
            restWorker.validator = validatorMock;
            const doState = new State();
            const origUpdateResult = doState.updateResult;
            updateResultSpy = sinon.stub(doState, 'updateResult').callsFake((taskId, code, status, message, errors) => {
                saveStateCalled = false;
                return origUpdateResult.call(doState, taskId, code, status, message, errors);
            });
            restWorker.state = {
                doState
            };
            restWorker.platform = 'BIG-IP';
        });

        it('should pass off auth token if provided', () => new Promise((resolve, reject) => {
            const authToken = '1234ABCD';
            declaration = {
                class: 'DO',
                targetTokens: {
                    'X-F5-Auth-Token': authToken
                },
                declaration: {}
            };

            restOperationMock.complete = () => {
                assert.strictEqual(bigIpOptionsCalled.authToken, '1234ABCD');
                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should dereference json-pointers in the DO wrapper', () => new Promise((resolve, reject) => {
            declaration = {
                class: 'DO',
                targetUsername: '/declaration/Credentials/0/username',
                targetPassphrase: '/declaration/Credentials/1/password',
                declaration: {
                    Credentials: [
                        { username: 'my user' },
                        { password: 'my password' }
                    ]
                }
            };

            restOperationMock.complete = () => {
                assert.strictEqual(bigIpOptionsCalled.user, 'my user');
                assert.strictEqual(bigIpOptionsCalled.password, 'my password');
                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should handle validation errors', () => new Promise((resolve, reject) => {
            validatorMock.validate = () => Promise.resolve({
                isValid: false
            });

            restOperationMock.complete = () => {
                assert.strictEqual(responseBody.result.code, 400);
                assert.strictEqual(responseBody.result.status, 'ERROR');
                assert.notStrictEqual(responseBody.result.message.indexOf('bad declaration'), -1);
                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should handle missing content header with valid content', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                resolve();
            };

            restOperationMock.getContentType = () => {};

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should handle missing content header with invalid content', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.strictEqual(responseBody.result.code, 400);
                assert.strictEqual(responseBody.result.status, 'ERROR');
                assert.notStrictEqual(responseBody.result.message.indexOf('bad declaration'), -1);
                assert.notStrictEqual(responseBody.result.errors[0].indexOf('Should be JSON format'), -1);
                resolve();
            };

            restOperationMock.getContentType = () => {};
            restOperationMock.getBody = () => 'foobar';

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should add defaults to the declaration', () => new Promise((resolve, reject) => {
            declaration = {
                schemaVersion: '1.0.0',
                class: 'Device',
                Common: {
                    mySelfIp: {
                        class: 'SelfIp',
                        address: '1.2.3.4',
                        vlan: 'foo'
                    }
                }
            };
            restWorker.validator = new RealValidator();

            restOperationMock.complete = () => {
                const state = restWorker.state.doState;
                const taskId = Object.keys(state.tasks)[0];
                assert.strictEqual(
                    state.tasks[taskId].internalDeclaration.Common.mySelfIp.trafficGroup,
                    'traffic-group-local-only'
                );
                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should save sys config', () => new Promise((resolve, reject) => {
            restOperationMock.complete = () => {
                assert.ok(saveCalled);
                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should set status to rebooting if reboot is required', () => new Promise((resolve, reject) => {
            doUtilMock.rebootRequired.restore();
            sinon.stub(doUtilMock, 'rebootRequired').resolves(true);
            restOperationMock.complete = () => {
                try {
                    assert.strictEqual(responseBody.result.status, 'REBOOTING');
                    assert.ok(saveStateCalled, 'State should have been saved after updating');
                } catch (err) {
                    reject(err);
                }

                resolve();
            };

            try {
                restWorker.onPost(restOperationMock);
            } catch (err) {
                reject(err);
            }
        }));

        it('should set status to rolled back if an error occurs', () => {
            const rollbackReason = 'this it the rollback reason';
            let processCallCount = 0;
            return new Promise((resolve, reject) => {
                DeclarationHandlerMock.prototype.process = () => {
                    // For this test, we want to reject the first call to simulate
                    // an error but resolve the second call to simulate successful
                    // rollback
                    processCallCount += 1;
                    if (processCallCount === 1) {
                        return Promise.reject(new Error(rollbackReason));
                    }
                    return Promise.resolve();
                };

                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.status, 'ERROR');
                    assert.notStrictEqual(responseBody.result.message.indexOf('rolled back'), -1);
                    assert.strictEqual(responseBody.result.errors[0], 'this it the rollback reason');
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should set task status to [running -> rolling back -> error] if an error occurs', () => {
            const rollbackReason = 'verify rollback in progress';
            let processCallCount = 0;

            return new Promise((resolve, reject) => {
                DeclarationHandlerMock.prototype.process = () => {
                    // For this test, we want to reject the first call to simulate
                    // an error but resolve the second call to simulate successful
                    // rollback
                    processCallCount += 1;
                    if (processCallCount === 1) {
                        return Promise.reject(new Error(rollbackReason));
                    }
                    return Promise.resolve();
                };

                restOperationMock.complete = () => {
                    const runningArgs = updateResultSpy.getCall(0).args;
                    assert.deepStrictEqual(runningArgs[1], 202);
                    assert.deepStrictEqual(runningArgs[2], 'RUNNING');

                    const rollingBackArgs = updateResultSpy.getCall(1).args;
                    assert.deepStrictEqual(rollingBackArgs[1], 202);
                    assert.deepStrictEqual(rollingBackArgs[2], 'ROLLING_BACK');

                    const rolledBackArgs = updateResultSpy.getCall(2).args;
                    assert.deepStrictEqual(rolledBackArgs[1], 500);
                    assert.deepStrictEqual(rolledBackArgs[2], 'ERROR');

                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should report that rollback failed', () => {
            const rollbackReason = 'this it the rollback reason';
            const rollbackFailReason = 'this is the rollback fail reason';
            let proccessCallCount = 0;
            return new Promise((resolve, reject) => {
                DeclarationHandlerMock.prototype.process = () => {
                    // For this test, we want to reject the first call to simulate
                    // an error but resolve the second call to simulate successful
                    // rollback
                    proccessCallCount += 1;
                    if (proccessCallCount === 1) {
                        return Promise.reject(new Error(rollbackReason));
                    }
                    return Promise.reject(new Error(rollbackFailReason));
                };

                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.status, 'ERROR');
                    assert.notStrictEqual(responseBody.result.message.indexOf('rollback failed'), -1);
                    assert.strictEqual(responseBody.result.errors[0], 'this it the rollback reason');
                    assert.strictEqual(responseBody.result.errors[1], 'this is the rollback fail reason');
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        describe('POST to webhook', () => {
            let stubHttpUtil;
            let webhook;
            let webhookSaved = null;
            let opstionsSaved = null;

            beforeEach(() => {
                doUtilMock.getCurrentPlatform.restore();
                sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IQ');
            });

            before(() => {
                stubHttpUtil = sinon.stub(httpUtilMock, 'post').callsFake((webhookReceived, options) => {
                    webhookSaved = webhookReceived;
                    opstionsSaved = options.body.declaration.webhook;
                    return Promise.resolve();
                });
            });

            after(() => {
                restWorker.platform = null;
                sinon.assert.calledOnce(stubHttpUtil);
                assert.strictEqual(webhookSaved, 'http://some.place.test');
                assert.strictEqual(opstionsSaved, 'http://some.place.test');
            });

            it('should call postWebhook', () => new Promise((resolve, reject) => {
                webhook = 'http://some.place.test';
                declaration = {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    webhook
                };
                restOperationMock.getUri = () => ({
                    query: {
                        internal: true
                    }
                });
                restOperationMock.complete = () => {
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            }));
        });

        describe('running on BIG-IQ', () => {
            let taskId;
            let realSetTimeout;
            let bodySet;

            beforeEach(() => {
                realSetTimeout = setTimeout;
                bodySet = null;

                doUtilMock.getCurrentPlatform.restore();
                sinon.stub(doUtilMock, 'getCurrentPlatform').resolves('BIG-IQ');

                restWorker.restOperationFactory = {
                    createRestOperationInstance() {
                        return {
                            setUri() { return this; },
                            setContentType() { return this; },
                            setBody(body) {
                                this.body = body;
                                bodySet = body;
                                taskId = body.id;
                                return this;
                            },
                            getBody() {
                                return this.body;
                            },
                            setIsSetBasicAuthHeader() { return this; },
                            setBasicAuthorization() { return this; },
                            setReferer() { return this; }
                        };
                    }
                };
                restWorker.restRequestSender = {
                    sendPost() {
                        return Promise.resolve({
                            getBody() { return {}; }
                        });
                    },
                    sendGet() {
                        return Promise.resolve({
                            getBody() {
                                return { status: 'FINISHED' };
                            }
                        });
                    }
                };
                restWorker.restHelper = {
                    makeRestjavadUri() {}
                };
                restWorker.retryInterval = 1;
            });

            afterEach(() => {
                setTimeout = realSetTimeout; // eslint-disable-line no-global-assign
                restWorker.platform = null;
            });

            it('should pass initial request to TCW if running on BIG-IQ', () => new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.notStrictEqual(taskId, undefined);
                    // the responseBody.id is randomized
                    assert.strictEqual(taskId, responseBody.id);
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            }));

            it('should poll TCW until FINISHED and report success', () => {
                let pollRequests = 0;
                restWorker.restRequestSender.sendGet = () => {
                    let status = 'STARTED';
                    pollRequests += 1;
                    if (pollRequests === 2) {
                        status = 'FINISHED';
                    }
                    return Promise.resolve({
                        getBody() {
                            return { status };
                        }
                    });
                };

                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.strictEqual(pollRequests, 2);
                        assert.strictEqual(responseBody.result.status, 'OK');
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should poll TCW until FAILED and report error', () => {
                let pollRequests = 0;
                restWorker.restRequestSender.sendGet = () => {
                    let status = 'STARTED';
                    pollRequests += 1;
                    if (pollRequests === 2) {
                        status = 'FAILED';
                    }
                    return Promise.resolve({
                        getBody() {
                            return { status };
                        }
                    });
                };

                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.strictEqual(pollRequests, 2);
                        assert.strictEqual(responseBody.result.status, 'ERROR');
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should handle TCW fail before onboard complete', () => {
                let numCalls = 0;
                let timerId;
                const externalId = '1234';
                restWorker.restRequestSender.sendGet = () => {
                    // Fake a second call to onboard as though it is coming from TCW
                    if (numCalls === 0) {
                        restOperationMock.getUri = () => ({
                            query: {
                                externalId,
                                internal: true
                            }
                        });

                        restWorker.onPost(restOperationMock);
                    }
                    numCalls += 1;
                    return Promise.resolve({
                        // Fail on the second call so that we have a chance to call onboard again
                        getBody() {
                            return { status: numCalls > 1 ? 'FAILED' : 'STARTED' };
                        }
                    });
                };

                DeclarationHandlerMock.prototype.process = () => new Promise((resolve, reject) => {
                    timerId = setTimeout(() => {
                        reject(new Error('declaration process failure'));
                    }, 5000);
                });
                restWorker.retryInterval = 100;

                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.strictEqual(Object.keys(restWorker.bigIps).length, 2);
                        assert.notStrictEqual(restWorker.bigIps[externalId], undefined);
                        clearTimeout(timerId);
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should act normally if this is an internal request', () => {
                restOperationMock.getUri = () => ({
                    query: {
                        internal: true
                    }
                });

                let pollRequests = 0;
                restWorker.restRequestSender.sendGet = () => {
                    pollRequests += 1;
                    return Promise.resolve({
                        getBody() {
                            return {};
                        }
                    });
                };

                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.ok(saveCalled);
                        assert.strictEqual(pollRequests, 0);
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should save bigIp object if externalId is sent', () => {
                restOperationMock.getUri = () => ({
                    query: {
                        internal: true,
                        externalId: 'myExternalId'
                    }
                });

                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.ok(saveCalled);
                        assert.notStrictEqual(restWorker.bigIps.myExternalId, undefined);
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should poll for ready if reboot is required', () => {
                let readyCalled;

                const tid = 1234;

                return new Promise((resolve, reject) => {
                    setTimeout = (cb) => { // eslint-disable-line no-global-assign
                        const context = restWorker;
                        context.bigIps[tid] = bigIpMock;
                        cb(context, tid);
                    };

                    restOperationMock.complete = () => {};

                    bigIpMock.ready = () => {
                        readyCalled = true;
                        return Promise.resolve();
                    };

                    restOperationMock.getUri = () => ({
                        query: { internal: true }
                    });

                    restWorker.saveState = (dummy, state, callback) => {
                        callback();
                    };

                    restWorker.state.doState.updateResult = (id, code, status) => {
                        if (status === STATUS.STATUS_OK) {
                            assert.strictEqual(readyCalled, true);
                            resolve();
                        }
                    };

                    doUtilMock.rebootRequired.restore();
                    sinon.stub(doUtilMock, 'rebootRequired').resolves(true);

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            describe('initial account setup', () => {
                let sshCommand;

                beforeEach(() => {
                    sshCommand = null;
                    SshUtilMock.prototype.executeCommand = (command) => {
                        sshCommand = command;
                        return Promise.resolve();
                    };
                });

                it('should handle initial password set if user/password is admin/admin', () => new Promise((resolve, reject) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetPort: 443,
                        targetUsername: 'admin',
                        targetPassphrase: 'admin',
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'foofoo'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {};
                    restWorker.restRequestSender.sendPatch = (restOperation) => {
                        assert.strictEqual(restOperation.getBody().password, 'foofoo');
                        resolve();
                        return Promise.resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                }));

                it('should ssh to BIG-IP if an ssh key is provided and shell is bash', (done) => {
                    let executeCount = 0;
                    SshUtilMock.prototype.executeCommand = (command) => {
                        executeCount += 1;
                        sshCommand = command;
                        if (executeCount === 1) { // first attempt tries tmsh
                            return Promise.reject(new Error('command not found'));
                        }
                        return Promise.resolve(); // second attempt tries bash
                    };

                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'foofoo'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {
                        assert.strictEqual(sshCommand, 'tmsh modify auth user admin password foofoo');
                        done();
                    };

                    restWorker.onPost(restOperationMock);
                });

                it('should ssh to BIG-IP if an ssh key is provided and shell is tmsh', (done) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'foofoo'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {
                        assert.strictEqual(sshCommand, 'modify auth user admin password foofoo');
                        done();
                    };

                    restWorker.onPost(restOperationMock);
                });

                it('should dereference user password if it is a pointer', () => new Promise((resolve, reject) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Credentials: {
                                foo: {
                                    bar: 'foofoo'
                                }
                            },
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: '/Credentials/foo/bar'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {
                        assert.strictEqual(sshCommand, 'modify auth user admin password foofoo');
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                }));

                it('should delete targetSshKey when setting targetPassphrase', () => new Promise((resolve, reject) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Credentials: {
                                foo: {
                                    bar: 'foofoo'
                                }
                            },
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: '/Credentials/foo/bar'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {
                        assert.strictEqual(bodySet.declaration.targetPassphrase, 'foofoo');
                        assert.strictEqual(bodySet.declaration.targetSshKey, undefined);
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                }));

                it('should update password used to create bigIp', () => new Promise((resolve, reject) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Credentials: {
                                foo: {
                                    bar: 'foofoo'
                                }
                            },
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: '/Credentials/foo/bar'
                                }
                            }
                        }
                    };

                    restOperationMock.getUri = () => ({
                        query: { internal: true }
                    });

                    restOperationMock.complete = () => {
                        assert.strictEqual(bigIpOptionsCalled.password, 'foofoo');
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                }));

                it('should use password value if it is not really a pointer', () => new Promise((resolve, reject) => {
                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Credentials: {
                                foo: {
                                    notMyPassword: 'foofoo'
                                }
                            },
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: '/Credentials/foo/bar'
                                }
                            }
                        }
                    };

                    restOperationMock.complete = () => {
                        assert.strictEqual(
                            sshCommand,
                            'modify auth user admin password /Credentials/foo/bar'
                        );
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                }));
            });

            describe('root account setup', () => {
                // When on 14+ the bigip will change the root password to the new admin password when the admin password
                // changes for the first time.  If the user doesn't account for this the declaration root oldPassword
                // will fail.
                //
                // DO helps the user by checking the root password if the admin password changes and updating
                // the declaration that is moving through the code if needed.

                let patchCalled;

                beforeEach(() => {
                    patchCalled = false;
                    SshUtilMock.prototype.executeCommand = () => Promise.resolve();
                });

                it('should not change root.oldPassword if targetPassphrase and admin password are same', (done) => {
                    // In this scenario targetUsername is 'admin' and targetPassphrase matches the admin password.
                    // DO will not change the admin password.  DO does not need to bother checking the root password.
                    // See the comments for the 'describe' for more info.

                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetPort: 443,
                        targetUsername: 'admin',
                        targetPassphrase: 'admin',
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'admin'
                                },
                                root: {
                                    class: 'User',
                                    userType: 'root',
                                    oldPassword: 'default',
                                    newPassword: 'barbar'
                                }
                            }
                        }
                    };

                    // This is normally called by initialPasswordSet.  This is not called because the admin password
                    // will not change.  Let's make sure it doesn't get called.
                    restWorker.restRequestSender.sendPatch = () => {
                        patchCalled = true;
                    };

                    restWorker.restRequestSender.sendPost = (restOperation) => {
                        // This is not called for the root password check.
                        // This is called later in the code for passToTcw and will have body.id which the password check
                        // POST doesn't.
                        assert.ok(!patchCalled);
                        assert.notStrictEqual(restOperation.body.id, undefined);
                        done();
                    };

                    restWorker.onPost(restOperationMock);
                });

                it('should check the root password when admin password changes when targetPassphrase is set', (done) => {
                    // In this scenario targetUsername is 'admin' but targetPassphrase doesn't match the admin password.
                    // DO will change the admin password.  DO will check to see if changing the admin password caused
                    // the bigip to change the root 'oldPassword' to match.
                    // See the comments for the 'describe' for more info.

                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetPort: 443,
                        targetUsername: 'admin',
                        targetPassphrase: 'admin',
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'foofoo'
                                },
                                root: {
                                    class: 'User',
                                    userType: 'root',
                                    oldPassword: 'default',
                                    newPassword: 'barbar'
                                }
                            }
                        }
                    };

                    restWorker.restRequestSender.sendPatch = (restOperation) => {
                        // This is called by initialPasswordSet because the admin password is changing.
                        assert.strictEqual(restOperation.body.oldPassword, 'admin');
                        assert.strictEqual(restOperation.body.password, 'foofoo');
                    };

                    restWorker.restRequestSender.sendPost = (restOperation) => {
                        // This is a POST from rootAccountSetup.  This is called to test if the root password is now
                        // the admin's new password.  This POST tries to change the root password from the admin's new
                        // passowrd to the admin's new password. (yes both values are the same).  This is a trick to
                        // test the root password.  It will respond with an error if the oldPassword is wrong that is
                        // caught.
                        assert.strictEqual(restOperation.body.oldPassword, 'foofoo');
                        assert.strictEqual(restOperation.body.newPassword, 'foofoo');
                        done();
                    };

                    restWorker.onPost(restOperationMock);
                });

                it('should check the root password when admin password changes when targetSshKey is set', (done) => {
                    // In this scenario there is a targetSshKey instead of a targetPassphrase.  DO will change the
                    // admin password to the value in Common.  DO will check to see if changing the admin password
                    // caused the bigip to change the root 'oldPassword' to match.
                    // See the comments for the 'describe' for more info.

                    declaration = {
                        class: 'DO',
                        targetHost: '1.2.3.4',
                        targetPort: 443,
                        targetUsername: 'admin',
                        targetSshKey: {
                            path: '~/.ssh/id_rsa'
                        },
                        declaration: {
                            Common: {
                                admin: {
                                    class: 'User',
                                    password: 'foofoo'
                                },
                                root: {
                                    class: 'User',
                                    userType: 'root',
                                    oldPassword: 'default',
                                    newPassword: 'barbar'
                                }
                            }
                        }
                    };

                    restWorker.restRequestSender.sendPatch = () => {
                        // This is not called.  This is not called by initialPasswordSet because the password is set by
                        // initialPassworSetViaSsh instead which doesn't use it.  Let's make sure it doesn't get
                        // called.
                        patchCalled = true;
                    };

                    restWorker.restRequestSender.sendPost = (restOperation) => {
                        // This is a POST from rootAccountSetup.  This is called to test if the root password is now
                        // the admin's new password.  This POST tries to change the root password from the admin's new
                        // passowrd to the admin's new password. (yes both values are the same).  This is a trick to
                        // test the root password.  It will respond with an error if the oldPassword is wrong that is
                        // caught.
                        assert.ok(!patchCalled);
                        assert.strictEqual(restOperation.body.oldPassword, 'foofoo');
                        assert.strictEqual(restOperation.body.newPassword, 'foofoo');
                        done();
                    };

                    restWorker.onPost(restOperationMock);
                });
            });
        });
    });
});
