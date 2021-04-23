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

const fs = require('fs');
const netMock = require('net');
const sinon = require('sinon');

const BigIpMock = require('@f5devcentral/f5-cloud-libs').bigIp;
const httpUtilMock = require('@f5devcentral/f5-cloud-libs').httpUtil;
const cloudUtilMock = require('@f5devcentral/f5-cloud-libs').util;

const doUtil = require('../../../src/lib/doUtil');

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

    afterEach(() => {
        sinon.restore();
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
            sinon.stub(cloudUtilMock, 'MEDIUM_RETRY').value(cloudUtilMock.NO_RETRY);

            httpUtilMock.get = () => Promise.reject(new Error(error));

            return assert.isRejected(doUtil.getCurrentPlatform(),
                'http error',
                'should have rejected');
        });
    });

    describe('getDoVersion', () => {
        it('should return default if no version file is found', () => {
            sinon.stub(fs, 'readFileSync').throws();
            assert.deepEqual(doUtil.getDoVersion(), { VERSION: '0.0.0', RELEASE: '0' });
        });

        it('should return real version if version file is found', () => {
            sinon.stub(fs, 'readFileSync').returns('1.2.3-4');
            assert.deepEqual(doUtil.getDoVersion(), { VERSION: '1.2.3', RELEASE: '4' });
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
                doUtil.executeBashCommandIControl = () => Promise.resolve('REBOOT REQUIRED');

                return doUtil.rebootRequired(bigIpMock)
                    .then((rebootRequired) => {
                        assert.strictEqual(rebootRequired, true);
                    });
            });

            it('should return false if the prompt is REBOOT REQUIRED', () => {
                doUtil.executeBashCommandIControl = () => Promise.resolve('Active');

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

    describe('mask', () => {
        it('should mask passwords', () => {
            const data = {
                foo: {
                    bar: {
                        hello: 'world',
                        password: '1234'
                    }
                },
                fooArray: [
                    {
                        okie: 'dokie',
                        password: '5678'
                    }
                ]
            };

            const masked = doUtil.mask(data);

            assert.strictEqual(masked.foo.bar.hello, 'world');
            assert.strictEqual(masked.foo.bar.password, undefined);
            assert.strictEqual(masked.fooArray[0].okie, 'dokie');
            assert.strictEqual(masked.fooArray[0].password, undefined);

            // make sure we are not altering the passed in data
            assert.notStrictEqual(data.fooArray[0].password, undefined);
            assert.notStrictEqual(data.foo.bar.password, undefined);
        });
    });

    describe('checkDnsResolution', () => {
        let bigIpMock;

        beforeEach(() => {
            bigIpMock = new BigIpMock();
            sinon.stub(cloudUtilMock, 'MEDIUM_RETRY').value(cloudUtilMock.NO_RETRY);
        });

        it('should reject if invalid ip is given', () => {
            bigIpMock.create = () => Promise.resolve({
                commandResult: 'status: NXDOMAIN'
            });

            return assert.isRejected(doUtil.checkDnsResolution(bigIpMock, '260.84.18.2'), 'Unable to resolve host 260.84.18.2');
        });

        it('should resolve true if a valid ip is given', () => {
            bigIpMock.create = () => Promise.resolve({
                commandResult: 'status: NOERROR'
            });
            return assert.isFulfilled(doUtil.checkDnsResolution(bigIpMock, '160.84.18.2', true));
        });

        it('should resolve true if dig returns the address', () => {
            bigIpMock.create = () => Promise.resolve({
                commandResult: 'status: NOERROR'
            });
            return assert.isFulfilled(doUtil.checkDnsResolution(bigIpMock, 'www.google.com', true));
        });

        it('should provide a better error message on uncaught exceptions', () => {
            bigIpMock.create = () => Promise.resolve({
                commandResult: 'status: NXDOMAIN'
            });
            return assert.isRejected(doUtil.checkDnsResolution(bigIpMock, 'test'), 'Unable to resolve host test');
        });
    });

    describe('waitForReboot', () => {
        let bigIpMock;

        beforeEach(() => {
            bigIpMock = new BigIpMock();
            bigIpMock.ready = () => Promise.resolve();
        });

        it('should not resolve when running on BIG-IP', () => {
            sinon.stub(doUtil, 'getCurrentPlatform').resolves('BIG-IP');
            const clock = sinon.useFakeTimers();

            return new Promise((resolve, reject) => {
                doUtil.waitForReboot(bigIpMock)
                    .then(() => {
                        reject(assert.fail());
                    });
                return Promise.resolve()
                    .then(() => {
                        clock.tick(10000);
                        clock.restore();
                        resolve();
                    });
            });
        });

        it('should resolve when running on BIG-IQ', () => {
            const clock = sinon.useFakeTimers();
            sinon.stub(doUtil, 'getCurrentPlatform').resolves('BIG-IQ');
            let promiseResolved = false;

            doUtil.waitForReboot(bigIpMock)
                .then(() => {
                    promiseResolved = true;
                });

            return Promise.resolve()
                .then(() => {
                    clock.tick(10000);
                    clock.restore();
                })
                .then(() => new Promise((resolve) => {
                    setImmediate(() => {
                        assert.strictEqual(promiseResolved, true);
                        resolve();
                    });
                }));
        });
    });

    describe('deleteKey and deleteKeys', () => {
        let data;

        beforeEach(() => {
            data = {
                key1: {
                    subKey1: {
                        subSubKey1: {
                            subSubKey1Value1: 'subSubKey1Value1'
                        },
                        subSubValue1: 'subSubValue1',
                        subSubValue2: 'subSubValue2'
                    },
                    subKey2: {
                        subKey2Value: 'subKey2Value'
                    },
                    subValue: 'subValue'
                },
                key2: 'key2Value'
            };
        });

        it('should remove a deeply nested key from an object', () => {
            doUtil.deleteKey(data, 'key1.subKey1.subSubValue1');
            assert.deepStrictEqual(data,
                {
                    key1: {
                        subKey1: {
                            subSubKey1: {
                                subSubKey1Value1: 'subSubKey1Value1'
                            },
                            subSubValue2: 'subSubValue2'
                        },
                        subKey2: {
                            subKey2Value: 'subKey2Value'
                        },
                        subValue: 'subValue'
                    },
                    key2: 'key2Value'
                });
        });

        it('should remove multiple deeply nested keys from an object', () => {
            doUtil.deleteKeys(data, [
                'key1.subKey1.subSubKey1',
                'key1.subKey1.subSubValue1',
                'key2'
            ]);

            assert.deepStrictEqual(data,
                {
                    key1: {
                        subKey1: {
                            subSubValue2: 'subSubValue2'
                        },
                        subKey2: {
                            subKey2Value: 'subKey2Value'
                        },
                        subValue: 'subValue'
                    }
                });
        });

        it('should handle removing a key that does not exist', () => {
            doUtil.deleteKey(data, 'a.b.c');
            assert.deepStrictEqual(data,
                {
                    key1: {
                        subKey1: {
                            subSubKey1: {
                                subSubKey1Value1: 'subSubKey1Value1'
                            },
                            subSubValue1: 'subSubValue1',
                            subSubValue2: 'subSubValue2'
                        },
                        subKey2: {
                            subKey2Value: 'subKey2Value'
                        },
                        subValue: 'subValue'
                    },
                    key2: 'key2Value'
                });
        });

        it('should handle undefined data', () => {
            data = undefined;
            doUtil.deleteKey(data, 'a.b.c');
            assert.deepStrictEqual(data, undefined);
        });

        it('should handle undefined key', () => {
            doUtil.deleteKey(data, undefined);
            assert.deepStrictEqual(data,
                {
                    key1: {
                        subKey1: {
                            subSubKey1: {
                                subSubKey1Value1: 'subSubKey1Value1'
                            },
                            subSubValue1: 'subSubValue1',
                            subSubValue2: 'subSubValue2'
                        },
                        subKey2: {
                            subKey2Value: 'subKey2Value'
                        },
                        subValue: 'subValue'
                    },
                    key2: 'key2Value'
                });
        });
    });

    describe('minimizeIP', () => {
        it('should return an undefined when nothing is sent in', () => {
            assert.strictEqual(doUtil.minimizeIP(), undefined);
        });

        it('should return an empty string when an empty is sent in', () => {
            assert.strictEqual(doUtil.minimizeIP(''), '');
        });

        it('should return valid IPv4 addresses', () => {
            assert.strictEqual(doUtil.minimizeIP('0.0.0.0/24'), '0.0.0.0/24');
        });

        it('should return valid shortened IPv6 addresses', () => {
            assert.strictEqual(doUtil.minimizeIP('0:0:0:0:0:0:0:0'), '::');
            assert.strictEqual(doUtil.minimizeIP('1:0:0:0:0:0:0:0'), '1::');
            assert.strictEqual(doUtil.minimizeIP('0:0:0:0:0:0:0:1'), '::1');
            assert.strictEqual(doUtil.minimizeIP('1:0:0:0:0:0:0:1'), '1::1');
            assert.strictEqual(doUtil.minimizeIP('1:0:1:0:0:0:0:0'), '1:0:1::');
            assert.strictEqual(doUtil.minimizeIP('1:0:0:1:0:0:0:1'), '1:0:0:1::1');
        });

        it('should return valid IPv6 address from IPv4-Mapped address', () => {
            assert.strictEqual(doUtil.minimizeIP('::ffff:192.0.3.47'), '::ffff:c000:32f');
        });
    });

    describe('sortArrayByValueString', () => {
        const data = [
            {
                key1: 'cherry',
                key2: 'pie'
            },
            {
                key1: 'apple',
                key2: true
            },
            {
                key1: 'lime',
                key2: 'tart'
            },
            {
                key1: 'pear',
                key2: 'croissant'
            },
            {
                key1: 'apple',
                key2: 'sauce'
            }
        ];

        doUtil.sortArrayByValueString(data, 'key1');
        assert.deepStrictEqual(data.length, 5);
        assert.deepStrictEqual(data[0].key1, 'apple');
        assert.isTrue(data[0].key2 === true || data[0].key2 === 'sauce');
        assert.deepStrictEqual(data[1].key1, 'apple');
        assert.isTrue(data[1].key2 === true || data[1].key2 === 'sauce');
        assert.isTrue(data[0].key2 !== data[1].key2);
        assert.deepStrictEqual(data[2], {
            key1: 'cherry',
            key2: 'pie'
        });
        assert.deepStrictEqual(data[3], {
            key1: 'lime',
            key2: 'tart'
        });
        assert.deepStrictEqual(data[4], {
            key1: 'pear',
            key2: 'croissant'
        });
    });
});
