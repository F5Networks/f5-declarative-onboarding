/**
 * Copies and installs the DO RPM PACKAGE to each deployed BIG-IP
*/

'use strict';

const path = require('path');
const NodeSSH = require('node-ssh').NodeSSH;
const constants = require('./constants.js');
const common = require('./common.js');
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
    .then(machinesInfo => setupMachines(machinesInfo))
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });

/* eslint-enable no-undef */


/**
 * getMachines - copies the DO rpm package to each deployed machine, and installs package
 * @harnessInfo {Object} : file of BVT-deployed BIG-IPs
 * Returns Promise
*/
function setupMachines(harnessInfo) {
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
    const installBody = {
        operation: 'INSTALL',
        /* eslint-disable no-undef */
        packageFilePath: `${REMOTE_DIR}/${path.basename(RPM_PACKAGE)}`
        /* eslint-enable no-undef */
    };
    return common.testRequest(installBody, `${common.hostname(host, constants.PORT)}${constants.ICONTROL_API}`
        + '/shared/iapp/package-management-tasks',
    { username: adminUsername, password: adminPassword },
    constants.HTTP_ACCEPTED, 'POST');
}

/**
 * scpRpm - tries to secure copy the RPM package to a target BIG-IP until we run
 *          out of attempts
 * @host {String} : BIG-IP's ip address
 * @username {String} : BIG-IP's root username
 * @password {String} : BIG-IP's root password
*/
function scpRpm(host, username, password) {
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
