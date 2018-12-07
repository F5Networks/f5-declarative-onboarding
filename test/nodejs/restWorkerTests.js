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

/* eslint-disable global-require */

describe('restWorker', () => {
    let DeclarationHandlerMock;
    let ConfigManagerMock;
    let RestWorker;
    let doUtilMock;
    let bigIpMock;
    let restOperationMock;
    let responseBody;

    before(() => {
        doUtilMock = require('../../nodejs/doUtil');
        ConfigManagerMock = require('../../nodejs/configManager');
        DeclarationHandlerMock = require('../../nodejs/declarationHandler');
        RestWorker = require('../../nodejs/restWorker');
    });

    beforeEach(() => {
        restOperationMock = {
            setStatusCode() {},
            setBody(body) { responseBody = body; },
            getBody() { return {}; },
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
    });

    describe('onGet', () => {
        it('should return current state', () => {
            return new Promise((resolve, reject) => {
                const declaration = {
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
        let saveCalled;

        beforeEach(() => {
            ConfigManagerMock.prototype.get = () => {
                return Promise.resolve();
            };

            DeclarationHandlerMock.prototype.process = () => {
                return Promise.resolve();
            };

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
            doUtilMock.getBigIp = () => {
                return Promise.resolve(bigIpMock);
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
