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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const dns = require('dns');
const netMock = require('net');
const sinon = require('sinon');

const BigIpMock = require('@f5devcentral/f5-cloud-libs').bigIp;
const httpUtilMock = require('@f5devcentral/f5-cloud-libs').httpUtil;
const cloudUtilMock = require('@f5devcentral/f5-cloud-libs').util;

const doUtil = require('../../../../src/lib/doUtil');

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

    describe('getBigIp', () => {
        it('should not set the auth token flag if not appropriate', () => doUtil.getBigIp(null, {})
            .then(() => {
                assert.strictEqual(bigIpInitOptions.passwordIsToken, false);
            }));

        it('should set the auth token flag if appropriate', () => doUtil.getBigIp(null, { authToken: 'foo' })
            .then(() => {
                assert.strictEqual(bigIpInitOptions.passwordIsToken, true);
            }));

        it('should get a BIG-IP with the first port it tries to discover', () => doUtil.getBigIp()
            .then(() => {
                assert.strictEqual(bigIpInitOptions.port, 8443);
                assert.strictEqual(createConnectionCalled, true);
            }));

        it('should get a BIG-IP with the second port it tries to discover', () => {
            socket.numConnectsToFail = 1;
            return doUtil.getBigIp()
                .then(() => {
                    assert.strictEqual(bigIpInitOptions.port, 443);
                    assert.strictEqual(createConnectionCalled, true);
                });
        });

        it('should handle failures on all discovery ports', () => {
            socket.numConnectsToFail = 2;
            return assert.isRejected(doUtil.getBigIp(),
                'Could not determine device port',
                'should have failed to discover a port');
        });

        it('should get a BIG-IP with the provided port', () => doUtil.getBigIp(null, { port })
            .then(() => {
                assert.strictEqual(bigIpInitOptions.port, port);
                assert.strictEqual(createConnectionCalled, false);
            }));

        it('should raise initialization errors', () => {
            const initErr = new Error('my init error');
            BigIpMock.prototype.init = (host, user, password, options) => {
                bigIpInitOptions = options;
                return Promise.reject(initErr);
            };

            return assert.isRejected(doUtil.getBigIp(null, { port: 443 }),
                'my init error',
                'should have raised initialization error');
        });
    });

    describe('getCurrentPlatform', () => {
        it('should work on BIG-IP/BIG-IQ', () => {
            const platform = 'my product';
            httpUtilMock.get = () => Promise.resolve(
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

            return doUtil.getCurrentPlatform()
                .then((resolvedPlatform) => {
                    assert.strictEqual(resolvedPlatform, 'my product');
                });
        });

        it('should work in a container', () => {
            httpUtilMock.get = () => Promise.resolve({});

            return doUtil.getCurrentPlatform()
                .then((resolvedPlatform) => {
                    assert.strictEqual(resolvedPlatform, 'CONTAINER');
                });
        });

        it('should handle errors', () => {
            const error = 'http error';
            httpUtilMock.get = () => Promise.reject(new Error(error));

            return assert.isRejected(doUtil.getCurrentPlatform(),
                'http error',
                'should have rejected');
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
            bigIpMock.list = () => Promise.resolve({
                value: 'none'
            });
        });

        afterEach(() => {
            doUtil.executeBashCommandExec = executeBashCommandExec;
            doUtil.getCurrentPlatform = getCurrentPlatform;
        });

        describe('running on BIG-IP', () => {
            beforeEach(() => {
                doUtil.getCurrentPlatform = () => Promise.resolve('BIG-IP');
            });

            it('should return true if the prompt is REBOOT REQUIRED', () => {
                doUtil.executeBashCommandLocal = () => Promise.resolve('REBOOT REQUIRED');

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, true);
                    });
            });

            it('should return false if the prompt is not REBOOT REQUIRED', () => {
                doUtil.executeBashCommandLocal = () => Promise.resolve('Active');

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, false);
                    });
            });

            it('should return true if the prompt is not REBOOT REQUIRED but the db var is true', () => {
                doUtil.executeBashCommandLocal = () => Promise.resolve('Active');

                bigIpMock.list = () => Promise.resolve({
                    value: 'reboot'
                });

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, true);
                    });
            });
        });

        describe('not running on BIG-IP', () => {
            beforeEach(() => {
                doUtil.getCurrentPlatform = () => Promise.resolve('BIG-IQ');
            });

            it('should return true if the prompt is REBOOT REQUIRED', () => {
                doUtil.executeBashCommandRemote = () => Promise.resolve('REBOOT REQUIRED');

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, true);
                    });
            });

            it('should return false if the prompt is REBOOT REQUIRED', () => {
                doUtil.executeBashCommandRemote = () => Promise.resolve('Active');

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, false);
                    });
            });
        });
    });

    describe('getClassObject', () => {
        it('should find matching classes', () => {
            const classToMatch = 'matchMe';
            const declaration = {
                Common: {
                    match1: {
                        class: classToMatch,
                        foo: {
                            bar: 'x'
                        }
                    },
                    noMatch1: {
                        class: 'notAMatch',
                        hello: 'world'
                    },
                    match2: {
                        class: classToMatch,
                        okie: 'dokie'
                    },
                    noMatch2: 'qwerty'
                }
            };
            const matches = doUtil.getClassObjects(declaration, classToMatch);
            assert.strictEqual(Object.keys(matches).length, 2);
            assert.deepEqual(matches.match1, { class: classToMatch, foo: { bar: 'x' } });
            assert.deepEqual(matches.match2, { class: classToMatch, okie: 'dokie' });
        });

        it('should return null if no matching classes are found', () => {
            const declaration = {
                Common: {
                    noMatch: {
                        class: 'notAMatch',
                        hello: 'world'
                    }
                }
            };
            const matches = doUtil.getClassObjects(declaration, 'matchMe');
            assert.strictEqual(matches, null);
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
            assert.strictEqual(dereferenced.stringValue, '123');
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
            assert.strictEqual(dereferenced.objectValue, '/blue/green');
        });
    });

    describe('checkDnsResolution', () => {
        beforeEach(() => {
            sinon.stub(dns, 'lookup').callsArg(1);
            sinon.stub(cloudUtilMock, 'MEDIUM_RETRY').value(cloudUtilMock.NO_RETRY);
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should reject if undefined, invalid ip, or hostname does not exist', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').callsArgWith(1, new Error());

            return assert.isRejected(
                doUtil.checkDnsResolution(undefined), 'Cannot read property \'toLowerCase\' of undefined'
            )
                .then(() => assert.isRejected(
                    doUtil.checkDnsResolution('260.84.18.2'), 'Unable to resolve host 260.84.18.2'
                ))
                .then(() => assert.isRejected(
                    doUtil.checkDnsResolution('example.cant'), 'Unable to resolve host example.cant'
                ));
        });

        it('should resolve true if dns.lookup returns the address', () => assert.isFulfilled(
            doUtil.checkDnsResolution('www.google.com', true)
        ));

        it('should provide a better error message on uncaught exceptions', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').throws(new Error('Hello world!'));

            return assert.isRejected(doUtil.checkDnsResolution('test'), 'Unable to resolve host test: Hello world!');
        });

        it('should retry if an error occurs', () => {
            dns.lookup.restore();
            sinon.stub(dns, 'lookup').callsFake(() => {
                // Set dns lookup to work the next time it is called
                dns.lookup.restore();
                sinon.stub(dns, 'lookup').callsArg(1);
                const errorMessage = 'Hello world!';
                throw new Error(errorMessage);
            });

            sinon.stub(cloudUtilMock, 'MEDIUM_RETRY').value({ maxRetries: 1, retryIntervalMs: 10 });

            return assert.becomes(doUtil.checkDnsResolution('test'), true,
                'This test should have errored only once and then succeeded returning true');
        });
    });
});
