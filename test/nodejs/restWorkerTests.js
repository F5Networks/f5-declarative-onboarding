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
const State = require('../../nodejs/state');
const STATUS = require('../../nodejs/sharedConstants').STATUS;
const EVENTS = require('../../nodejs/sharedConstants').EVENTS;

/* eslint-disable global-require */

describe('restWorker', () => {
    let DeclarationHandlerMock;
    let ConfigManagerMock;
    let RestWorker;
    let doUtilMock;
    let cryptoUtilMock;
    let bigIpMock;
    let declaration;
    let restOperationMock;
    let responseBody;
    let statusCode;
    let SshUtilMock;

    before(() => {
        doUtilMock = require('../../nodejs/doUtil');
        cryptoUtilMock = require('../../nodejs/cryptoUtil');
        ConfigManagerMock = require('../../nodejs/configManager');
        DeclarationHandlerMock = require('../../nodejs/declarationHandler');
        SshUtilMock = require('../../nodejs/sshUtil');
        RestWorker = require('../../nodejs/restWorker');
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
            }
        };
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    describe('onStart', () => {
        beforeEach(() => {
        });

        it('should respond handle success', () => {
            return new Promise((resolve, reject) => {
                const success = () => {
                    resolve();
                };
                const error = () => {
                    reject(new Error('should have called success'));
                };

                const restWorker = new RestWorker();
                try {
                    restWorker.onStart(success, error);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should handle error', () => {
            return new Promise((resolve, reject) => {
                const success = () => {
                    throw new Error('should have called error');
                };
                const error = () => {
                    resolve();
                };

                const restWorker = new RestWorker();
                try {
                    restWorker.onStart(success, error);
                } catch (err) {
                    reject(err);
                }
            });
        });
    });

    describe('onStartCompleted', () => {
        beforeEach(() => {
            doUtilMock.getCurrentPlatform = () => {
                return Promise.resolve('BIG-IP');
            };
        });

        it('should call error if given an error message', () => {
            return new Promise((resolve, reject) => {
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
            });
        });

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

        it('should reset status if rebooting', () => {
            return new Promise((resolve, reject) => {
                const restWorker = new RestWorker();
                const success = () => {
                    assert.strictEqual(restWorker.state.doState.tasks[1234].result.status, STATUS.STATUS_OK);
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
                                    }
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
            });
        });

        describe('revoking', () => {
            const bigIpPassword = 'myBigIpPassword';
            const bigIqPassword = 'myBigIqPassword';

            let decryptedIds;
            let restWorker;
            let state;

            beforeEach(() => {
                ConfigManagerMock.prototype.get = () => {
                    return Promise.resolve();
                };

                DeclarationHandlerMock.prototype.process = () => {
                    return Promise.resolve();
                };

                decryptedIds = [];

                bigIpMock = {
                    save() {
                        return Promise.resolve();
                    }
                };
                doUtilMock.getBigIp = () => {
                    return Promise.resolve(bigIpMock);
                };
                doUtilMock.getCurrentPlatform = () => {
                    return Promise.resolve('BIG-IP');
                };
                doUtilMock.rebootRequired = () => {
                    return Promise.resolve(true);
                };
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
                cryptoUtilMock.deleteEncryptedId = () => {
                    return Promise.resolve();
                };

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

            it('should remove the revokeFrom property from the license after revoking', () => {
                return new Promise((resolve, reject) => {
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
                });
            });

            it('should decrypt ids if neccessary after revoking', () => {
                return new Promise((resolve, reject) => {
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
                            bigIpPassword
                        );
                        assert.strictEqual(
                            restWorker
                                .state.doState.tasks[1234].internalDeclaration.Common.myLicense.bigIqPassword,
                            bigIqPassword
                        );
                        resolve();
                    };

                    try {
                        restWorker.onStartCompleted(success, error);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            it('should not decrypt ids if not neccessary after revoking', () => {
                return new Promise((resolve, reject) => {
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
                });
            });
        });

        it('should handle DO_LICENSE_REVOKED event', () => {
            return new Promise((resolve, reject) => {
                const bigIpPassword = 'myBigIpPassword';
                const bigIqPassword = 'myBigIqPassword';
                const restWorker = new RestWorker();
                const encryptedValues = [];
                cryptoUtilMock.encryptValue = (value) => {
                    encryptedValues.push(value);
                    if (encryptedValues.length === 2) {
                        assert.strictEqual(encryptedValues[0], bigIpPassword);
                        assert.strictEqual(encryptedValues[1], bigIqPassword);
                        resolve();
                    }
                };

                const success = () => {
                    restWorker.eventEmitter.emit(
                        EVENTS.DO_LICENSE_REVOKED,
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
            });
        });
    });

    describe('onGet', () => {
        let restWorker;

        const code1234 = 200;
        const code5678 = 300;
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
                        }
                    }
                }
            };
        });

        it('should return state for most recent task if no path is specified', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(Array.isArray(responseBody), false);
                    assert.deepEqual(responseBody.declaration, declaration1234);
                    assert.strictEqual(responseBody.result.code, code1234);
                    resolve();
                };
                restOperationMock.getUri = () => {
                    return {
                        pathname: '/shared/declarative-onboarding'
                    };
                };

                restWorker.state.doState.mostRecentTask = 1234;

                try {
                    restWorker.onGet(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should return state for all tasks if tasks path is specified with no task', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.ok(Array.isArray(responseBody));
                    assert.deepEqual(responseBody[0].declaration, declaration1234);
                    assert.strictEqual(responseBody[0].result.code, code1234);
                    assert.deepEqual(responseBody[1].declaration, declaration5678);
                    assert.strictEqual(responseBody[1].result.code, code5678);
                    resolve();
                };
                restOperationMock.getUri = () => {
                    return {
                        pathname: '/shared/declarative-onboarding/task'
                    };
                };

                try {
                    restWorker.onGet(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should return state for specified task if tasks path is specified with a task', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(Array.isArray(responseBody), false);
                    assert.deepEqual(responseBody.declaration, declaration1234);
                    assert.strictEqual(responseBody.result.code, code1234);
                    resolve();
                };
                restOperationMock.getUri = () => {
                    return {
                        pathname: '/shared/declarative-onboarding/task/1234'
                    };
                };

                try {
                    restWorker.onGet(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
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

        it('should delete original config', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(deletedId, '1234');
                    resolve();
                };
                restOperationMock.getUri = () => {
                    return {
                        pathname: '/shared/declarative-onboarding/config/1234'
                    };
                };

                try {
                    restWorker.onDelete(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should return 404 for non-existing id', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(statusCode, 404);
                    resolve();
                };
                restOperationMock.getUri = () => {
                    return {
                        pathname: '/shared/declarative-onboarding/config/9999'
                    };
                };

                try {
                    restWorker.onDelete(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });
    });

    describe('onPost', () => {
        const validatorMock = {};
        let restWorker;
        let bigIpOptionsCalled;
        let saveCalled;

        beforeEach(() => {
            ConfigManagerMock.prototype.get = () => {
                return Promise.resolve();
            };

            DeclarationHandlerMock.prototype.process = () => {
                return Promise.resolve();
            };

            bigIpOptionsCalled = {};
            saveCalled = false;
            bigIpMock = {
                save() {
                    saveCalled = true;
                    return Promise.resolve();
                },
                reboot() {}
            };

            doUtilMock.getBigIp = (logger, bigIpOptions) => {
                bigIpOptionsCalled = bigIpOptions;
                return Promise.resolve(bigIpMock);
            };
            doUtilMock.rebootRequired = () => {
                return Promise.resolve(false);
            };
            doUtilMock.rebootRequired = () => {
                return Promise.resolve(false);
            };

            validatorMock.validate = () => {
                return {
                    isValid: true
                };
            };

            RestWorker.prototype.saveState = (foo, state, callback) => {
                callback();
            };

            restWorker = new RestWorker();
            restWorker.validator = validatorMock;
            restWorker.state = {
                doState: new State()
            };
            restWorker.platform = 'BIG-IP';
        });

        it('should pass off auth token if provided', () => {
            return new Promise((resolve, reject) => {
                const authToken = '1234ABCD';
                declaration = {
                    class: 'DO',
                    targetTokens: {
                        'X-F5-Auth-Token': authToken
                    },
                    declaration: {}
                };

                restOperationMock.complete = () => {
                    assert.strictEqual(bigIpOptionsCalled.authToken, authToken);
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should dereference json-pointers in the DO wrapper', () => {
            return new Promise((resolve, reject) => {
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
                    assert.strictEqual(
                        bigIpOptionsCalled.user, declaration.declaration.Credentials[0].username
                    );
                    assert.strictEqual(
                        bigIpOptionsCalled.password, declaration.declaration.Credentials[1].password
                    );
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should handle validation errors', () => {
            return new Promise((resolve, reject) => {
                validatorMock.validate = () => {
                    return {
                        isValid: false
                    };
                };

                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.code, 400);
                    assert.strictEqual(responseBody.result.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.result.message.indexOf('bad declaration'), -1);
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should handle missing content header with valid content', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    resolve();
                };

                restOperationMock.getContentType = () => {};

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should handle missing content header with invalid content', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.code, 400);
                    assert.strictEqual(responseBody.result.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.result.message.indexOf('bad declaration'), -1);
                    assert.notStrictEqual(responseBody.result.errors[0].indexOf('Should be JSON format'), -1);
                    resolve();
                };

                restOperationMock.getContentType = () => {};
                restOperationMock.getBody = () => { return 'foobar'; };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should save sys config', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.ok(saveCalled);
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should set status to rebooting if reboot is required', () => {
            return new Promise((resolve, reject) => {
                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.status, STATUS.STATUS_REBOOTING);
                    resolve();
                };

                doUtilMock.rebootRequired = () => {
                    return Promise.resolve(true);
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        it('should set status to rolling back if an error occurs', () => {
            const rollbackReason = 'this is the rollback reason';
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
                    return Promise.resolve();
                };

                restOperationMock.complete = () => {
                    assert.strictEqual(responseBody.result.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.result.message.indexOf('rolled back'), -1);
                    assert.strictEqual(responseBody.result.errors[0], rollbackReason);
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
                    assert.strictEqual(responseBody.result.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.result.message.indexOf('rollback failed'), -1);
                    assert.strictEqual(responseBody.result.errors[0], rollbackReason);
                    assert.strictEqual(responseBody.result.errors[1], rollbackFailReason);
                    resolve();
                };

                try {
                    restWorker.onPost(restOperationMock);
                } catch (err) {
                    reject(err);
                }
            });
        });

        describe('running on BIG-IQ', () => {
            let taskId;
            let realSetTimeout;

            beforeEach(() => {
                realSetTimeout = setTimeout;

                doUtilMock.getCurrentPlatform = () => {
                    return Promise.resolve('BIG-IQ');
                };

                restWorker.restOperationFactory = {
                    createRestOperationInstance() {
                        return {
                            setUri() { return this; },
                            setContentType() { return this; },
                            setBody(body) {
                                this.body = body;
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

            it('should pass initial request to TCW if running on BIG-IQ', () => {
                return new Promise((resolve, reject) => {
                    restOperationMock.complete = () => {
                        assert.notStrictEqual(taskId, undefined);
                        assert.strictEqual(taskId, responseBody.id);
                        resolve();
                    };

                    try {
                        restWorker.onPost(restOperationMock);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

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

            it('should act normally if this is an internal request', () => {
                restOperationMock.getUri = () => {
                    return {
                        query: {
                            internal: true
                        }
                    };
                };

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
                restOperationMock.getUri = () => {
                    return {
                        query: {
                            internal: true,
                            externalId: 'myExternalId'
                        }
                    };
                };

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

                    doUtilMock.rebootRequired = () => {
                        return Promise.resolve(true);
                    };

                    restOperationMock.getUri = () => {
                        return {
                            query: { internal: true }
                        };
                    };

                    restWorker.saveState = (dummy, state, callback) => {
                        callback();
                    };

                    restWorker.state.doState.updateResult = (id, code, status) => {
                        if (status === STATUS.STATUS_OK) {
                            assert.strictEqual(readyCalled, true);
                            resolve();
                        }
                    };

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

                it('should handle initial password set if user/password is admin/admin', () => {
                    return new Promise((resolve, reject) => {
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

                        restWorker.restRequestSender.sendPatch = (restOperation) => {
                            assert.strictEqual(
                                restOperation.getBody().password,
                                declaration.declaration.Common.admin.password
                            );
                            resolve();
                            return Promise.resolve();
                        };

                        try {
                            restWorker.onPost(restOperationMock);
                        } catch (err) {
                            reject(err);
                        }
                    });
                });

                it('should ssh to BIG-IP if an ssh key is provided', () => {
                    return new Promise((resolve, reject) => {
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
                            resolve();
                        };

                        try {
                            restWorker.onPost(restOperationMock);
                        } catch (err) {
                            reject(err);
                        }
                    });
                });

                it('should dereference user password if it is a pointer', () => {
                    return new Promise((resolve, reject) => {
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
                    });
                });

                it('should use password value if it is not really a pointer', () => {
                    return new Promise((resolve, reject) => {
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
                    });
                });
            });
        });
    });
});
