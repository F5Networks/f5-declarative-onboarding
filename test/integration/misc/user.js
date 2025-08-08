/**
 * Copyright 2025 F5, Inc.
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

const {
    postDeclaration
} = require('../property/propertiesCommon');
const doUtil = require('../../../src/lib/doUtil');

describe('User', function User() {
    this.timeout(600000);
    let bigIPInstance;

    const key1 = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwHJLJY+/U/ioAAAADAQABAAACAQCwHJLJY+z0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+1hx9wlSogXN6Co5zrtqlN8/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLz9/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== key1';
    const key2 = 'ssh-rsa AAAAB3NzaC1yc2EAu2Gr14xRiVLnG8KxNp2fO1/U/ioAz0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLzu2Gr14xRiVLnG8KxNp2fO19/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== key2';

    function getCommandResult(cmd) {
        return Promise.resolve()
            .then(() => {
                if (!bigIPInstance) {
                    bigIPInstance = doUtil.getBigIp(
                        undefined,
                        {
                            host: process.env.DO_HOST,
                            user: process.env.DO_USERNAME,
                            password: process.env.DO_PASSWORD
                        }
                    );
                }
                return bigIPInstance;
            })
            .then((bigIp) => doUtil.executeBashCommandIControl(bigIp, cmd))
            .then((keyFile) => keyFile.trim());
    }

    function getRootKeys() {
        return getCommandResult('cat /root/.ssh/authorized_keys');
    }

    function getDisableRootLogin() {
        return getCommandResult('tmsh list sys db systemauth.disablerootlogin')
            .then((response) => {
                const keyVals = response.split(/\s+/);
                const disableRootLoginValue = keyVals[keyVals.indexOf('{') + 2];
                return disableRootLoginValue.trim();
            });
    }

    it('userType root', () => {
        const decl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.24.0',
            Common: {
                class: 'Tenant',
                root: {
                    class: 'User',
                    userType: 'root',
                    oldPassword: process.env.DO_PASSWORD,
                    newPassword: process.env.DO_PASSWORD,
                    keys: [key1, key2]
                }
            }
        };

        const logInfo = {
            declarationIndex: 0
        };

        return Promise.resolve()
            .then(() => assert.isFulfilled(
                postDeclaration(decl, { logInfo })
            ))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => getRootKeys())
            .then((keyFile) => {
                const keys = keyFile.split('\n');
                assert.strictEqual(keys.length, 3);
                assert.ok(keys[0].endsWith, 'Host Processor Superuser');
                assert.strictEqual(keys[1], key1);
                assert.strictEqual(keys[2], key2);
            })
            .then(() => {
                logInfo.declarationIndex = 1;
                decl.Common.root.keys = [];
                return postDeclaration(decl, { logInfo });
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => getRootKeys())
            .then((keyFile) => {
                const keys = keyFile.split('\n');
                assert.strictEqual(keys.length, 1);
                assert.ok(keys[0].endsWith, 'Host Processor Superuser');
            });
    });

    it('disableRootLogin for root user', () => {
        const decl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.24.0',
            Common: {
                class: 'Tenant',
                root: {
                    class: 'User',
                    userType: 'root',
                    disableRootLogin: true
                }
            }
        };

        const decl1 = {
            async: true,
            class: 'Device',
            schemaVersion: '1.24.0',
            Common: {
                class: 'Tenant',
                root: {
                    class: 'User',
                    userType: 'root',
                    oldPassword: process.env.DO_PASSWORD,
                    newPassword: process.env.DO_PASSWORD,
                    disableRootLogin: false
                }
            }
        };

        const logInfo = {
            declarationIndex: 0
        };

        return Promise.resolve()
            .then(() => getDisableRootLogin())
            .then((disableRootLogin) => {
                assert.strictEqual(disableRootLogin, '"false"');
            })
            .then(() => assert.isFulfilled(
                postDeclaration(decl, { logInfo })
            ))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => getDisableRootLogin())
            .then((disableRootLogin) => {
                assert.strictEqual(disableRootLogin, '"true"');
            })
            .catch((error) => {
                console.log(`Error ${JSON.stringify(error)}`);
            })
            .then(() => assert.isFulfilled(
                postDeclaration(decl1, { logInfo })
            ))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => getDisableRootLogin())
            .then((disableRootLogin) => {
                assert.strictEqual(disableRootLogin, '"false"');
            })
            .finally(() => postDeclaration(decl1, { logInfo }));
    });
});
