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
const dns = require('dns');
const netMock = require('net');

const sinon = require('sinon');
const BigIpMock = require('@f5devcentral/f5-cloud-libs').bigIp;
const httpUtilMock = require('@f5devcentral/f5-cloud-libs').httpUtil;

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

    describe('getCurrentPlatform', () => {
        it('should work on BIG-IP/BIG-IQ', () => {
            return new Promise((resolve, reject) => {
                const platform = 'my product';
                httpUtilMock.get = () => {
                    return Promise.resolve(
                        {
                            slots: [
                                {
                                    product: 'foo',
                                    isActive: false
                                },
                                {
                                    product: platform,
                                    isActive: true
                                }
                            ]
                        }
                    );
                };

                doUtil.getCurrentPlatform()
                    .then((resolvedPlatform) => {
                        assert.strictEqual(resolvedPlatform, platform);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should work in a container', () => {
            return new Promise((resolve, reject) => {
                httpUtilMock.get = () => {
                    return Promise.resolve({});
                };

                doUtil.getCurrentPlatform()
                    .then((resolvedPlatform) => {
                        assert.strictEqual(resolvedPlatform, 'CONTAINER');
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle errors', () => {
            return new Promise((resolve, reject) => {
                const error = 'http error';
                httpUtilMock.get = () => {
                    return Promise.reject(new Error(error));
                };

                doUtil.getCurrentPlatform()
                    .then(() => {
                        reject(new Error('should have rejected'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, error);
                        resolve();
                    });
            });
        });
    });

    describe('rebootRequired', () => {
        let getCurrentPlatform;
        let executeBashCommandExec;
        let bigIpMock;

        beforeEach(() => {
            executeBashCommandExec = doUtil.executeBashCommandExec;
            getCurrentPlatform = doUtil.getCurrentPlatform;
            bigIpMock = new BigIpMock();
            bigIpMock.list = () => {
                return Promise.resolve({
                    value: 'none'
                });
            };
        });

        afterEach(() => {
            doUtil.executeBashCommandExec = executeBashCommandExec;
            doUtil.getCurrentPlatform = getCurrentPlatform;
        });

        describe('running on BIG-IP', () => {
            beforeEach(() => {
                doUtil.getCurrentPlatform = () => {
                    return Promise.resolve('BIG-IP');
                };
            });

            it('should return true if the prompt is REBOOT REQUIRED', () => {
                return new Promise((resolve, reject) => {
                    doUtil.executeBashCommandLocal = () => {
                        return Promise.resolve('REBOOT REQUIRED');
                    };

                    doUtil.rebootRequired(bigIpMock)
                        .then((rebootRequired) => {
                            assert.strictEqual(rebootRequired, true);
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });

            it('should return false if the prompt is not REBOOT REQUIRED', () => {
                return new Promise((resolve, reject) => {
                    doUtil.executeBashCommandLocal = () => {
                        return Promise.resolve('Active');
                    };

                    doUtil.rebootRequired(bigIpMock)
                        .then((rebootRequired) => {
                            assert.strictEqual(rebootRequired, false);
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });

            it('should return true if the prompt is not REBOOT REQUIRED but the db var is true', () => {
                return new Promise((resolve, reject) => {
                    doUtil.executeBashCommandLocal = () => {
                        return Promise.resolve('Active');
                    };

                    bigIpMock.list = () => {
                        return Promise.resolve({
                            value: 'reboot'
                        });
                    };

                    doUtil.rebootRequired(bigIpMock)
                        .then((rebootRequired) => {
                            assert.strictEqual(rebootRequired, true);
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });
        });

        describe('not running on BIG-IP', () => {
            beforeEach(() => {
                doUtil.getCurrentPlatform = () => {
                    return Promise.resolve('BIG-IQ');
                };
            });

            it('should return true if the prompt is REBOOT REQUIRED', () => {
                return new Promise((resolve, reject) => {
                    doUtil.executeBashCommandRemote = () => {
                        return Promise.resolve('REBOOT REQUIRED');
                    };

                    doUtil.rebootRequired(bigIpMock)
                        .then((rebootRequired) => {
                            assert.strictEqual(rebootRequired, true);
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });

            it('should return false if the prompt is REBOOT REQUIRED', () => {
                return new Promise((resolve, reject) => {
                    doUtil.executeBashCommandRemote = () => {
                        return Promise.resolve('Active');
                    };

                    doUtil.rebootRequired(bigIpMock)
                        .then((rebootRequired) => {
                            assert.strictEqual(rebootRequired, false);
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                });
            });
        });
    });

    describe('dereference', () => {
        it('should dereference json-pointers to strings in an object', () => {
            const declaration = {
                foo: {
                    bar: {
                        item: '123'
                    }
                }
            };

            const container = {
                stringValue: '/foo/bar/item'
            };

            const dereferenced = doUtil.dereference(declaration, container);
            assert.strictEqual(dereferenced.stringValue, declaration.foo.bar.item);
        });

        it('should not dereference json-pointer to objects in an object', () => {
            const declaration = {
                blue: {
                    green: {
                        yellow: 'yellow'
                    }
                }
            };

            const container = {
                objectValue: '/blue/green'
            };

            const dereferenced = doUtil.dereference(declaration, container);
            assert.strictEqual(dereferenced.objectValue, container.objectValue);
        });
    });

    describe('checkDnsResolution', () => {
        beforeEach(() => {
            sinon.stub(dns, 'lookup').callsArg(1);
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should reject if undefined, invalid ip, or hostname does not exist', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').callsArgWith(1, new Error());

            const testCases = [
                undefined,
                '260.84.18.2',
                'example.cant'
            ];

            const promises = testCases.map((testCase) => {
                let didFail = false;
                return doUtil.checkDnsResolution(testCase)
                    .catch(() => {
                        didFail = true;
                    })
                    .then(() => {
                        if (!didFail) {
                            assert.fail(`testCase: ${testCase} does exist, and it should NOT`);
                        }
                    });
            });
            return Promise.all(promises);
        });

        it('should resolve true if a valid ip, empty string, or valid hostname is given', () => {
            const testCases = [
                '',
                '::',
                '10.10.10.10',
                'www.google.com'
            ];

            const promises = testCases.map((testCase) => {
                return doUtil.checkDnsResolution(testCase)
                    .catch((e) => { return e; })
                    .then((res) => {
                        if (res === true) {
                            assert.ok(res);
                            return;
                        }
                        assert.fail(`testCase: ${testCase} does NOT exist, and it should`);
                    });
            });
            return Promise.all(promises);
        });

        it('should provide a better error message on uncaught exceptions', () => {
            dns.lookup.restore();
            const errorMessage = 'Hello world!';
            sinon.stub(dns, 'lookup').throws(new Error(errorMessage));

            return doUtil.checkDnsResolution('test')
                .catch((error) => {
                    assert.notEqual(error.message, errorMessage);
                });
        });
    });
});
