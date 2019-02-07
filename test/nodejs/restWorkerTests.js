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

    before(() => {
        doUtilMock = require('../../nodejs/doUtil');
        cryptoUtilMock = require('../../nodejs/cryptoUtil');
        ConfigManagerMock = require('../../nodejs/configManager');
        DeclarationHandlerMock = require('../../nodejs/declarationHandler');
        RestWorker = require('../../nodejs/restWorker');
    });

    beforeEach(() => {
        declaration = {};
        restOperationMock = {
            setStatusCode() {},
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
                    doState: {}
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
                    assert.strictEqual(restWorker.state.doState.result.status, STATUS.STATUS_OK);
                    resolve();
                };
                const error = () => {
                    reject(new Error('should have called success'));
                };

                RestWorker.prototype.loadState = (foo, callback) => {
                    const state = {
                        doState: {
                            result: {
                                status: STATUS.STATUS_REBOOTING
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
                    },
                    rebootRequired() {
                        return Promise.resolve(true);
                    }
                };
                doUtilMock.getBigIp = () => {
                    return Promise.resolve(bigIpMock);
                };
                doUtilMock.getCurrentPlatform = () => {
                    return Promise.resolve('BIG-IP');
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
                    doState: new State()
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
                    };

                    bigIpMock.reboot = () => {
                        assert.strictEqual(
                            restWorker.state.doState.internalDeclaration.Common.myLicense.revokeFrom,
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
                    };

                    bigIpMock.reboot = () => {
                        assert.strictEqual(decryptedIds.length, 2);
                        assert.strictEqual(restWorker.state.doState.result.status, STATUS.STATUS_REBOOTING);
                        assert.strictEqual(
                            restWorker.state.doState.internalDeclaration.Common.myLicense.bigIpPassword,
                            bigIpPassword
                        );
                        assert.strictEqual(
                            restWorker.state.doState.internalDeclaration.Common.myLicense.bigIqPassword,
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
                    };

                    bigIpMock.reboot = () => {
                        assert.strictEqual(decryptedIds.length, 0);
                        assert.strictEqual(restWorker.state.doState.result.status, STATUS.STATUS_REBOOTING);
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
        it('should return current state', () => {
            return new Promise((resolve, reject) => {
                declaration = {
                    foo: 'bar'
                };

                restOperationMock.complete = () => {
                    assert.deepEqual(responseBody.declaration, declaration);
                    resolve();
                };

                const restWorker = new RestWorker();
                restWorker.state = {
                    doState: {
                        internalDeclaration: declaration
                    }
                };

                try {
                    restWorker.onGet(restOperationMock);
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
                rebootRequired() {
                    return Promise.resolve(false);
                },
                reboot() {}
            };
            doUtilMock.getBigIp = (logger, bigIpOptions) => {
                bigIpOptionsCalled = bigIpOptions;
                return Promise.resolve(bigIpMock);
            };
            doUtilMock.getCurrentPlatform = () => {
                return Promise.resolve('BIG-IP');
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
                    assert.strictEqual(responseBody.code, 400);
                    assert.strictEqual(responseBody.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.message.indexOf('bad declaration'), -1);
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
                    assert.strictEqual(responseBody.code, 400);
                    assert.strictEqual(responseBody.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.message.indexOf('bad declaration'), -1);
                    assert.notStrictEqual(responseBody.errors[0].indexOf('Should be JSON format'), -1);
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

                bigIpMock.rebootRequired = () => {
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
            const rollbackReason = 'this it the rollback reason';
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
                    assert.strictEqual(responseBody.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.message.indexOf('rolled back'), -1);
                    assert.strictEqual(responseBody.errors[0], rollbackReason);
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
                    assert.strictEqual(responseBody.status, STATUS.STATUS_ERROR);
                    assert.notStrictEqual(responseBody.message.indexOf('rollback failed'), -1);
                    assert.strictEqual(responseBody.errors[0], rollbackReason);
                    assert.strictEqual(responseBody.errors[1], rollbackFailReason);
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
