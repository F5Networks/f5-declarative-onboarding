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

/**
 * Copies and installs the DO RPM PACKAGE to each deployed BIG-IP
*/

'use strict';

const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const NodeSSH = require('node-ssh').NodeSSH;
const constants = require('./constants');
const common = require('./common');
// directory on the BIG-IPs to copy rpm package to
const REMOTE_DIR = '/var/config/rest/downloads';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/* eslint-disable no-console */

if (!process.env.RPM_PACKAGE) {
    console.log('Must set RPM_PACKAGE environment variable for installation of Declarative'
      + 'Onboarding rpm package on deployed BIG-IPs');
    process.exit(1);
}

const RPM_PACKAGE = process.env.RPM_PACKAGE;

return common.readFile(process.env.TEST_HARNESS_FILE)
    .then(JSON.parse)
    .then((machinesInfo) => setupMachines(machinesInfo))
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });

/* eslint-enable no-undef */

/**
 * waitForDo - wait for DO to respond after install.
 * @host {String} : BIG-IP's ip address
 * @adminUsername {String} : BIG-IP's admin username
 * @adminPassword {String} : BIG-IP's admin password
*/
function waitForDo(host, adminUsername, adminPassword) {
    console.log('Checking for DO');
    return common.testGetStatus(
        600,
        10,
        host,
        { username: adminUsername, password: adminPassword },
        constants.HTTP_SUCCESS
    );
}

/**
 * getMachines - copies the DO rpm package to each deployed machine, and installs package
 * @harnessInfo {Object} : file of BVT-deployed BIG-IPs
 * Returns Promise
*/
function setupMachines(harnessInfo) {
    console.log('Setting up machines');
    console.log(JSON.stringify(harnessInfo, null, 4));
    return new Promise((resolveOuter, rejectOuter) => {
        const installPromises = [];
        harnessInfo.forEach((machine) => {
            installPromises.push(new Promise((resolve, reject) => {
                const username = machine.ssh_user.username;
                const password = machine.ssh_user.password;
                const adminUsername = machine.f5_rest_user.username;
                const adminPassword = machine.f5_rest_user.password;
                const ipAddress = machine.admin_ip;
                scpRpm(ipAddress, username, password)
                    .then(() => installRpm(ipAddress, adminUsername, adminPassword))
                    .then(JSON.parse)
                    .then((response) => {
                        if (response.status === 'CREATED') {
                            waitForDo(ipAddress, adminUsername, adminPassword);
                            resolve();
                        } else {
                            reject(new Error(`failed : ${response.status}`));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            }));
        });
        return Promise.all(installPromises)
            .then(() => {
                resolveOuter();
            })
            .catch((err) => {
                rejectOuter(err);
            });
    });
}

/**
 * installRpm - tries to install the rpm package on the machine until we run out of attempts
 * @host {String} : BIG-IP's ip address
 * @adminUsername {String} : BIG-IP's admin username
 * @adminPassword {String} : BIG-IP's admin password
*/
function installRpm(host, adminUsername, adminPassword) {
    console.log('Installing RPM');
    const installBody = {
        operation: 'INSTALL',
        /* eslint-disable no-undef */
        packageFilePath: `${REMOTE_DIR}/${path.basename(RPM_PACKAGE)}`
        /* eslint-enable no-undef */
    };
    return common.testRequest(
        installBody,
        `${common.hostname(host, constants.PORT)}${constants.ICONTROL_API}`
        + '/shared/iapp/package-management-tasks',
        { username: adminUsername, password: adminPassword },
        constants.HTTP_ACCEPTED,
        'POST',
        60,
        [constants.HTTP_NOTFOUND, constants.HTTP_UNAUTHORIZED]
    );
}

/**
 * waitForMcpd - checks for MCPD to be in running state
 * @ssh {Object} : Passing ssh object
*/
function waitForMcpd(ssh) {
    console.log('Waiting for MCPD');
    return new Promise((resolve, reject) => {
        ssh.execCommand('tmsh -a show sys mcp-state field-fmt | grep -q running')
            .then((result) => {
                if (result.code === null) {
                    resolve();
                } else {
                    reject(new Error('MCPD is not up yet'));
                }
            });
    });
}

/**
 * scpRpm - tries to secure copy the RPM package to a target BIG-IP until we run
 *          out of attempts
 * @host {String} : BIG-IP's ip address
 * @username {String} : BIG-IP's root username
 * @password {String} : BIG-IP's root password
*/
function scpRpm(host, username, password) {
    console.log('Uploading RPM');
    const ssh = new NodeSSH();
    const func = function () {
        return new Promise((resolve, reject) => {
            ssh.connect({
                host,
                username,
                tryKeyboard: true,
                onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
                    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                        finish([password]);
                    }
                }
            })
                .then(() => waitForMcpd(ssh))
                .then(() => ssh.putFile(RPM_PACKAGE, `${REMOTE_DIR}/${path.basename(RPM_PACKAGE)}`))
                .then(() => {
                    resolve('copied');
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                });
        });
    };
    // try 30 times, with 1min for each time, and do not reject on error
    return common.tryOften(func, 30, 60 * 1000, null, false);
}
