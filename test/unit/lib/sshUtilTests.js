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

        SshUtil = require('../../../src/lib/sshUtil');
    });

    afterEach(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should send the command', () => {
        const commandToSend = 'foo';
        sshUtil = new SshUtil();
        sshUtil.executeCommand(commandToSend)
            .then(() => {
                assert.strictEqual(commandReceived, 'foo');
            });
    });

    it('should use ssh key if appropriate', () => {
        const sshKeyPath = 'path to my ssh key';
        sshUtil = new SshUtil('user', 'host', { sshKeyPath });
        sshUtil.executeCommand('foo')
            .then(() => {
                const iIndex = argsReceived.indexOf('-i');
                assert.notStrictEqual(iIndex, -1);
                assert.strictEqual(argsReceived[iIndex + 1], 'path to my ssh key');
            });
    });

    it('should send ignore host key options if appropriate', () => {
        sshUtil = new SshUtil('user', 'host', { ignoreHostKeyVerification: true });
        sshUtil.executeCommand('foo')
            .then(() => {
                assert.notStrictEqual(argsReceived.indexOf('UserKnownHostsFile=/dev/null'), -1);
                assert.notStrictEqual(argsReceived.indexOf('StrictHostKeyChecking=no'), -1);
            });
    });

    it('should handle stderr errors', () => {
        stdErrorData = 'this is my error';
        sshUtil = new SshUtil();
        return assert.isRejected(sshUtil.executeCommand(),
            'ssh got error on stderr: this is my error', 'executeCommand should have rejected');
    });

    it('should send stdout response', () => {
        stdOutData = 'this is the command response';
        return sshUtil.executeCommand()
            .then((data) => {
                assert.strictEqual(data, stdOutData);
            });
    });

    it('should handle child process errors', () => {
        errorData = 'this is my error';
        sshUtil = new SshUtil();
        return assert.isRejected(sshUtil.executeCommand(),
            'ssh received error: this is my error', 'executeCommand should have rejected');
    });

    it('should handle non-zero exit codes', () => {
        exitCode = 123;
        return assert.isRejected(sshUtil.executeCommand(),
            'ssh failed with code 123', 'executeCommand should have rejected');
    });
});
