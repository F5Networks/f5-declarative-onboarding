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
const netMock = require('net');
const BigIpMock = require('@f5devcentral/f5-cloud-libs').bigIp;

const doUtil = require('../../nodejs/doUtil');

describe('doUtil', () => {
    const port = '1234';
    const socket = {
        connectCalls: 0,
        numConnectsToFail: 0,
        on(event, cb) {
            if (event === 'connect') {
                this.connectCalls += 1;
                if (this.connectCalls > this.numConnectsToFail) {
                    cb();
                }
            }
            if (event === 'error') {
                if (this.connectCalls <= this.numConnectsToFail) {
                    cb();
                }
            }
        },
        end() {},
        destroy() {}
    };
    let bigIpInitOptions;
    let createConnectionCalled;

    before(() => {
        BigIpMock.prototype.init = (host, user, password, options) => {
            bigIpInitOptions = options;
            return Promise.resolve();
        };

        netMock.createConnection = () => {
            createConnectionCalled = true;
            return socket;
        };
    });

    beforeEach(() => {
        socket.connectCalls = 0;
        createConnectionCalled = false;
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    describe('getBigIp', () => {
        it('should not set the auth token flag if not appropriate', () => {
            return new Promise((resolve, reject) => {
                doUtil.getBigIp(null, {})
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.passwordIsToken, false);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should set the auth token flag if appropriate', () => {
            return new Promise((resolve, reject) => {
                doUtil.getBigIp(null, { authToken: 'foo' })
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.passwordIsToken, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should get a BIG-IP with the first port it tries to discover', () => {
            return new Promise((resolve, reject) => {
                doUtil.getBigIp()
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.port, 8443);
                        assert.strictEqual(createConnectionCalled, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should get a BIG-IP with the second port it tries to discover', () => {
            return new Promise((resolve, reject) => {
                socket.numConnectsToFail = 1;
                doUtil.getBigIp()
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.port, 443);
                        assert.strictEqual(createConnectionCalled, true);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle failures on all discovery ports', () => {
            return new Promise((resolve, reject) => {
                socket.numConnectsToFail = 2;
                doUtil.getBigIp()
                    .then(() => {
                        reject(new Error('should have failed to discover a port'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, 'Could not determine device port');
                        resolve();
                    });
            });
        });

        it('should get a BIG-IP with the provided port', () => {
            return new Promise((resolve, reject) => {
                doUtil.getBigIp(null, { port })
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.port, port);
                        assert.strictEqual(createConnectionCalled, false);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should raise initialization errors', () => {
            const initErr = new Error('my init error');
            BigIpMock.prototype.init = (host, user, password, options) => {
                bigIpInitOptions = options;
                return Promise.reject(initErr);
            };

            return new Promise((resolve, reject) => {
                doUtil.getBigIp(null, { port: 443 })
                    .then(() => {
                        reject(new Error('should have raised initialization error'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, initErr.message);
                        resolve();
                    });
            });
        });
    });
});
