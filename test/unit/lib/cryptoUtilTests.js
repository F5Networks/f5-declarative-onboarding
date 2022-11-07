/**
 * Copyright 2022 F5 Networks, Inc.
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

const childProcessMock = require('child_process');
const sinon = require('sinon');

const ENCRYPT_PATH = '/tm/auth/radius-server';

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const cryptoUtil = require('../../../src/lib/cryptoUtil');
const doUtil = require('../../../src/lib/doUtil');
const Logger = require('../../../src/lib/logger');

describe('cryptoUtil', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('decryptValue', () => {
        it('should decrypt values', () => {
            const decrypted = 'decrypted value';
            childProcessMock.exec = (command, callback) => {
                callback(null, decrypted);
            };
            return cryptoUtil.decryptValue('foo')
                .then((result) => {
                    assert.strictEqual(result, 'decrypted value');
                });
        });

        it('should handle errors', () => {
            const error = 'decrypted error';
            childProcessMock.exec = (command, callback) => {
                callback(new Error(error));
            };
            return assert.isRejected(
                cryptoUtil.decryptValue('foo'),
                'decrypted error',
                'Should have caught error'
            );
        });
    });

    describe('decryptStoredValueById', () => {
        it('should decrypt ids', () => {
            const secret = 'mySecret';
            const tmshResponse = `foo {
                    server foo
                    secret ${secret}
                }`;

            let secretSent;

            sinon.stub(cloudUtil, 'runTmshCommand').resolves(tmshResponse);
            sinon.stub(cryptoUtil, 'decryptValue').callsFake((value) => {
                secretSent = value;
            });

            return cryptoUtil.decryptStoredValueById('foo')
                .then(() => {
                    assert.strictEqual(secretSent, 'mySecret');
                });
        });

        it('should handle errors', () => {
            const error = 'tmsh error';
            const logWarningSpy = sinon.spy(Logger.prototype, 'warning');
            sinon.stub(cloudUtil, 'runTmshCommand').rejects(new Error(error));
            return assert.isRejected(
                cryptoUtil.decryptStoredValueById('foo', '123-abc'),
                'tmsh error',
                'should have caught error'
            ).then(() => {
                assert.strictEqual(logWarningSpy.thisValues[0].metadata, 'cryptoUtil.js | 123-abc');
                assert.strictEqual(logWarningSpy.args[0][0], 'Failed to decrypt data with id');
            });
        });
    });

    describe('deleteEncryptedId', () => {
        it('should delete the associated radius server', () => {
            const id = 'foo';
            let pathSent;
            sinon.stub(doUtil, 'getBigIp').resolves({
                delete(path) {
                    pathSent = path;
                    return Promise.resolve();
                }
            });

            return cryptoUtil.deleteEncryptedId(id)
                .then(() => {
                    assert.strictEqual(pathSent, `${ENCRYPT_PATH}/${id}`);
                });
        });

        it('should handle errors', () => {
            const error = 'delete error';
            const logWarningSpy = sinon.spy(Logger.prototype, 'warning');
            sinon.stub(doUtil, 'getBigIp').resolves({
                delete() {
                    return Promise.reject(new Error(error));
                }
            });

            return assert.isRejected(
                cryptoUtil.deleteEncryptedId('foo', '123-abc'),
                'delete error',
                'should have caught error'
            ).then(() => {
                assert.strictEqual(logWarningSpy.thisValues[0].metadata, 'cryptoUtil.js | 123-abc');
                assert.strictEqual(logWarningSpy.args[0][0], 'Failed to delete encrypted data with id');
            });
        });
    });

    describe('encryptAndStoreValue', () => {
        it('should encrypt values and not delete them', () => {
            const value = 'myValue';
            const id = 'myId';

            let deleteCalled = false;
            let bodySent;

            sinon.stub(doUtil, 'getBigIp').resolves({
                create(path, body) {
                    bodySent = body;
                    return Promise.resolve({
                        secret: 'encryptedValue'
                    });
                },
                delete() {
                    deleteCalled = true;
                    return Promise.resolve();
                }
            });

            return cryptoUtil.encryptAndStoreValue(value, id)
                .then(() => {
                    assert.strictEqual(bodySent.secret, 'myValue');
                    assert.strictEqual(bodySent.name, 'myId');
                    assert.strictEqual(deleteCalled, false);
                });
        });

        it('should handle errors', () => {
            const error = 'create error';
            const logWarningSpy = sinon.spy(Logger.prototype, 'warning');
            sinon.stub(doUtil, 'getBigIp').resolves({
                create() {
                    return Promise.reject(new Error(error));
                }
            });

            return assert.isRejected(
                cryptoUtil.encryptAndStoreValue(undefined, undefined, '123-abc'),
                'create error',
                'should have caught error'
            ).then(() => {
                assert.strictEqual(logWarningSpy.thisValues[0].metadata, 'cryptoUtil.js | 123-abc');
                assert.strictEqual(logWarningSpy.args[0][0], 'Failed to encrypt data');
            });
        });
    });

    describe('encryptValue', () => {
        const value = 'myValue';

        it('should encrypt value on BIG-IP', () => {
            let bodySent;

            sinon.stub(doUtil, 'getBigIp').resolves({
                create(path, body) {
                    bodySent = body;
                    return Promise.resolve({
                        secret: 'encryptedValue'
                    });
                }
            });

            sinon.stub(doUtil, 'getCurrentPlatform').resolves('BIG-IP');

            return cryptoUtil.encryptValue(value, undefined)
                .then(() => {
                    assert.strictEqual(bodySent.secret, 'myValue');
                });
        });

        it('should encrypt value on BIG-IQ', () => {
            let bodySent;

            const bigIp = {
                create(path, body) {
                    bodySent = body;
                    return Promise.resolve({
                        secret: 'encryptedValue'
                    });
                }
            };

            sinon.stub(doUtil, 'getCurrentPlatform').resolves('BIG-IQ');

            return cryptoUtil.encryptValue(value, bigIp)
                .then(() => {
                    assert.strictEqual(bodySent.secret, 'myValue');
                });
        });
    });
});
