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

const {
    assertClass
} = require('./propertiesCommon');
const doUtil = require('../../../src/lib/doUtil');

function assertUserClass(properties, options) {
    return assertClass('User', properties, options);
}

describe('User', function testAuthentication() {
    this.timeout(600000);

    it('userType regular', () => {
        const options = {
            maxPathLength: 31,
            mcpPath: ''
        };

        const guestRole = {
            'all-partitions': {
                role: 'guest'
            }
        };

        const adminRole = {
            'all-partitions': {
                role: 'admin'
            }
        };

        const key1 = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwHJLJY+/U/ioAAAADAQABAAACAQCwHJLJY+z0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+1hx9wlSogXN6Co5zrtqlN8/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLz9/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== key1';
        const key2 = 'ssh-rsa AAAAB3NzaC1yc2EAu2Gr14xRiVLnG8KxNp2fO1/U/ioAz0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLzu2Gr14xRiVLnG8KxNp2fO19/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== key2';

        function getKeys(username) {
            const sshPath = `/home/${username}/.ssh`;
            const catCmd = `cat ${sshPath}/authorized_keys`;
            return doUtil.getBigIp(
                undefined,
                {
                    host: process.env.DO_HOST,
                    user: process.env.DO_USERNAME,
                    password: process.env.DO_PASSWORD
                }
            )
                .then((bigIp) => doUtil.executeBashCommandIControl(bigIp, catCmd))
                .then((keyFile) => keyFile.trim());
        }

        const properties = [
            {
                name: 'userType',
                inputValue: ['regular'],
                skipAssert: true
            },
            {
                name: 'password',
                inputValue: [process.env.DO_PASSWORD],
                skipAssert: true
            },
            {
                // Note: 'shell' and 'partitionAccess' are coupled here. Only admins can have 'bash'
                name: 'shell',
                inputValue: [undefined, 'bash', undefined],
                expectedValue: ['tmsh', 'bash', 'tmsh'],
                extractFunction: (o) => o.shell
            },
            {
                // Note: 'shell' and 'partitionAccess' are coupled here. Only admins can have 'bash'
                name: 'partitionAccess',
                inputValue: [guestRole, adminRole, guestRole],
                expectedValue: ['guest', 'admin', 'guest'],
                extractFunction: (o) => o.partitionAccess[0].role
            },
            {
                name: 'keys',
                inputValue: [[key1], [key2], undefined],
                expectedValue: [key1, key2, key2],
                extractFunction: (o) => getKeys(o.fullPath)
            }
        ];

        return assertUserClass(properties, options);
    });
});
