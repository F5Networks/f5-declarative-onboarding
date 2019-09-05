/**
 * Copyright 2019 F5 Networks, Inc.
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

let SshUtil;
let sshUtil;
let argsReceived;
let commandReceived;
let closeCb;
let errorCb;
let stdOutCb;
let stdErrorCb;
let errorData;
let stdOutData;
let stdErrorData;
let exitCode = 0;

/* eslint-disable global-require */

describe('sshUtil', () => {
    beforeEach(() => {
        commandReceived = null;
        argsReceived = null;
        errorData = null;
        stdOutData = null;
        stdErrorData = null;
        childProcessMock.spawn = (file, args) => {
            argsReceived = args;
            return {
                on(event, cb) {
                    switch (event) {
                    case 'close':
                        closeCb = cb;
                        break;
                    case 'error':
                        errorCb = cb;
                        break;
                    default:
                    }
                },
                stdin: {
                    write(command) {
                        commandReceived = command;
                        if (errorData) {
                            errorCb(new Error(errorData));
                        }
                    },
                    end() {
                        if (stdOutData) {
                            stdOutCb(stdOutData);
                            closeCb(0);
                        } else if (stdErrorData) {
                            stdErrorCb(stdErrorData);
                        } else {
                            closeCb(exitCode);
                        }
                    }
                },
                stdout: {
                    on(event, cb) {
                        stdOutCb = cb;
                    }
                },
                stderr: {
                    on(event, cb) {
                        stdErrorCb = cb;
                    }
                }
            };
        };

        SshUtil = require('../../../../src/lib/sshUtil');
    });

    afterEach(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should send the command', () => new Promise((resolve, reject) => {
        const commandToSend = 'foo';
        sshUtil = new SshUtil();
        sshUtil.executeCommand(commandToSend)
            .then(() => {
                assert.strictEqual(commandReceived, 'foo');
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should use ssh key if appropriate', () => new Promise((resolve, reject) => {
        const sshKeyPath = 'path to my ssh key';
        sshUtil = new SshUtil('user', 'host', { sshKeyPath });
        sshUtil.executeCommand('foo')
            .then(() => {
                const iIndex = argsReceived.indexOf('-i');
                assert.notStrictEqual(iIndex, -1);
                assert.strictEqual(argsReceived[iIndex + 1], sshKeyPath);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should send ignore host key options if appropriate', () => new Promise((resolve, reject) => {
        sshUtil = new SshUtil('user', 'host', { ignoreHostKeyVerification: true });
        sshUtil.executeCommand('foo')
            .then(() => {
                assert.notStrictEqual(argsReceived.indexOf('UserKnownHostsFile=/dev/null'), -1);
                assert.notStrictEqual(argsReceived.indexOf('StrictHostKeyChecking=no'), -1);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle stderr errors', () => new Promise((resolve, reject) => {
        stdErrorData = 'this is my error';
        sshUtil = new SshUtil();
        sshUtil.executeCommand()
            .then(() => {
                reject(new Error('executeCommand should have rejected'));
            })
            .catch((err) => {
                assert.notStrictEqual(err.message.indexOf(stdErrorData), -1);
                resolve();
            });
    }));

    it('should send stdout response', () => new Promise((resolve, reject) => {
        stdOutData = 'this is the command response';
        sshUtil.executeCommand()
            .then((data) => {
                assert.strictEqual(data, stdOutData);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    }));

    it('should handle child process errors', () => new Promise((resolve, reject) => {
        errorData = 'this is my error';
        sshUtil = new SshUtil();
        sshUtil.executeCommand()
            .then(() => {
                reject(new Error('executeCommand should have rejected'));
            })
            .catch((err) => {
                assert.notStrictEqual(err.message.indexOf(errorData), -1);
                resolve();
            });
    }));

    it('should handle non-zero exit codes', () => new Promise((resolve, reject) => {
        exitCode = 123;
        sshUtil.executeCommand()
            .then(() => {
                reject(new Error('executeCommand should have rejected'));
            })
            .catch((err) => {
                assert.notStrictEqual(err.message.indexOf(exitCode), -1);
                resolve();
            });
    }));
});
