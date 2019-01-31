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

const ENCRYPT_PATH = '/tm/auth/radius-server';

let cloudUtilMock;
let cryptoUtil;
let doUtilMock;

/* eslint-disable global-require */

describe('doUtil', () => {
    beforeEach(() => {
        cloudUtilMock = require('@f5devcentral/f5-cloud-libs').util;
        doUtilMock = require('../../nodejs/doUtil');
        cryptoUtil = require('../../nodejs/cryptoUtil');
    });
    afterEach(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    describe('decryptValue', () => {
        it('should decrypt values', () => {
            return new Promise((resolve, reject) => {
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
            });
        });

        it('should handle errors', () => {
            return new Promise((resolve, reject) => {
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
            });
        });
    });

    describe('decryptId', () => {
        it('should decrypt ids', () => {
            return new Promise((resolve, reject) => {
                const secret = 'mySecret';
                const tmshResponse = `foo {
                    server foo
                    secret ${secret}
                }`;

                let secretSent;

                cloudUtilMock.runTmshCommand = () => {
                    return Promise.resolve(tmshResponse);
                };
                cryptoUtil.decryptValue = (value) => {
                    secretSent = value;
                };

                cryptoUtil.decryptId('foo')
                    .then(() => {
                        assert.strictEqual(secretSent, secret);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle errors', () => {
            return new Promise((resolve, reject) => {
                const error = 'tmsh error';
                cloudUtilMock.runTmshCommand = () => {
                    return Promise.reject(new Error(error));
                };

                cryptoUtil.decryptId('foo')
                    .then(() => {
                        reject(new Error('should have caught error'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, error);
                        resolve();
                    });
            });
        });
    });

    describe('deleteEncryptedId', () => {
        it('should delete the associated radius server', () => {
            return new Promise((resolve, reject) => {
                const id = 'foo';
                let pathSent;
                doUtilMock.getBigIp = () => {
                    return Promise.resolve({
                        delete(path) {
                            pathSent = path;
                            return Promise.resolve();
                        }
                    });
                };

                cryptoUtil.deleteEncryptedId(id)
                    .then(() => {
                        assert.strictEqual(pathSent, `${ENCRYPT_PATH}/${id}`);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle errors', () => {
            return new Promise((resolve, reject) => {
                const error = 'delete error';
                doUtilMock.getBigIp = () => {
                    return Promise.resolve({
                        delete() {
                            return Promise.reject(new Error(error));
                        }
                    });
                };

                cryptoUtil.deleteEncryptedId('foo')
                    .then(() => {
                        reject(new Error('should have caught error'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, error);
                        resolve();
                    });
            });
        });
    });

    describe('encryptValue', () => {
        it('should encrypt values', () => {
            return new Promise((resolve, reject) => {
                const value = 'myValue';
                const id = 'myId';

                let bodySent;
                doUtilMock.getBigIp = () => {
                    return Promise.resolve({
                        create(path, body) {
                            bodySent = body;
                            return Promise.resolve();
                        }
                    });
                };

                cryptoUtil.encryptValue(value, id)
                    .then(() => {
                        assert.strictEqual(bodySent.secret, value);
                        assert.strictEqual(bodySent.name, id);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should handle errors', () => {
            return new Promise((resolve, reject) => {
                const error = 'create error';
                doUtilMock.getBigIp = () => {
                    return Promise.resolve({
                        create() {
                            return Promise.reject(new Error(error));
                        }
                    });
                };

                cryptoUtil.encryptValue()
                    .then(() => {
                        reject(new Error('should have caught error'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, error);
                        resolve();
                    });
            });
        });
    });
});
