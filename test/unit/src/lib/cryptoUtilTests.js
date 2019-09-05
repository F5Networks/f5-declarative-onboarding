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
const childProcessMock = require('child_process');

const sinon = require('sinon');

const ENCRYPT_PATH = '/tm/auth/radius-server';


const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const cryptoUtil = require('../../../../src/lib/cryptoUtil');
const doUtil = require('../../../../src/lib/doUtil');

describe('cryptoUtil', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('decryptValue', () => {
        it('should decrypt values', () => new Promise((resolve, reject) => {
            const decrypted = 'decrypted value';
            childProcessMock.exec = (command, callback) => {
                callback(null, decrypted);
            };
            cryptoUtil.decryptValue('foo')
                .then((result) => {
                    assert.strictEqual(result, decrypted);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle errors', () => new Promise((resolve, reject) => {
            const error = 'decrypted error';
            childProcessMock.exec = (command, callback) => {
                callback(new Error(error));
            };
            cryptoUtil.decryptValue('foo')
                .then(() => {
                    reject(new Error('should have caught error'));
                })
                .catch((err) => {
                    assert.strictEqual(err.message, error);
                    resolve();
                });
        }));
    });

    describe('decryptId', () => {
        it('should decrypt ids', () => new Promise((resolve, reject) => {
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

            cryptoUtil.decryptId('foo')
                .then(() => {
                    assert.strictEqual(secretSent, secret);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle errors', () => {
            const error = 'tmsh error';
            sinon.stub(cloudUtil, 'runTmshCommand').rejects(new Error(error));
            return cryptoUtil.decryptId('foo')
                .then(() => {
                    throw new Error('should have caught error');
                })
                .catch((err) => {
                    assert.strictEqual(err.message, error);
                });
        });
    });

    describe('deleteEncryptedId', () => {
        it('should delete the associated radius server', () => new Promise((resolve, reject) => {
            const id = 'foo';
            let pathSent;
            sinon.stub(doUtil, 'getBigIp').resolves({
                delete(path) {
                    pathSent = path;
                    return Promise.resolve();
                }
            });

            cryptoUtil.deleteEncryptedId(id)
                .then(() => {
                    assert.strictEqual(pathSent, `${ENCRYPT_PATH}/${id}`);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle errors', () => new Promise((resolve, reject) => {
            const error = 'delete error';
            sinon.stub(doUtil, 'getBigIp').resolves({
                delete() {
                    return Promise.reject(new Error(error));
                }
            });

            cryptoUtil.deleteEncryptedId('foo')
                .then(() => {
                    reject(new Error('should have caught error'));
                })
                .catch((err) => {
                    assert.strictEqual(err.message, error);
                    resolve();
                });
        }));
    });

    describe('encryptValue', () => {
        it('should encrypt values', () => new Promise((resolve, reject) => {
            const value = 'myValue';
            const id = 'myId';

            let bodySent;
            sinon.stub(doUtil, 'getBigIp').resolves({
                create(path, body) {
                    bodySent = body;
                    return Promise.resolve();
                }
            });

            cryptoUtil.encryptValue(value, id)
                .then(() => {
                    assert.strictEqual(bodySent.secret, value);
                    assert.strictEqual(bodySent.name, id);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should handle errors', () => new Promise((resolve, reject) => {
            const error = 'create error';
            sinon.stub(doUtil, 'getBigIp').resolves({
                create() {
                    return Promise.reject(new Error(error));
                }
            });

            cryptoUtil.encryptValue()
                .then(() => {
                    reject(new Error('should have caught error'));
                })
                .catch((err) => {
                    assert.strictEqual(err.message, error);
                    resolve();
                });
        }));
    });
});
