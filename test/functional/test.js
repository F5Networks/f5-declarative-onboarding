/* Copyright 2016-2018 F5 Networks, Inc.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   Testing Environment for Declarative Onboarding
   Author: @fonsecayarochewsky

   This is a module to be tested, each function being responsible for a set of tests
   such as Onboarding, Networking, licensing, etc. Functions act on a target BIG-IP in which
   the Declarative Onboarding rpm package has already been installed. Each function takes
   the same 3 parameters. Those are the target BIG-IP's ip address, admin username and admin
   password (last two are the username/password used to call the DO API)
*/

'use strict';

require('colors');
const request = require('request');
const NodeSSH = require('node-ssh');
const path = require('path');
const common = require('./common.js');
/* eslint-disable import/no-absolute-path, import/no-unresolved  */
const vio = require('/var/rpm/auto-vio/vio-lib.js');
/* eslint-enable import/no-absolute-path, import/no-unresolved  */
const ICONTROL_API = '/mgmt';
const DO_API = `${ICONTROL_API}/shared/declarative-onboarding`;
// HTTP status codes
const HTTP_ACCEPTED = 202;
const HTTP_SUCCESS = 200;
const HTTP_UNAVAILABLE = 503;
const HTTP_UNPROCESSABLE = 422;
// DO API port
const PORT = 443;
// location of DO test JSON bodies
const BODIES = 'test/functional/bodies';
// directory on the BIG-IPs to copy rpm package to
const REMOTE_DIR = '/var/config/rest/downloads';
// iControl REST API endpoint
const RPM_PACKAGE = process.env.RPM_PACKAGE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// iControl and DO credentials for deployed BIG-IPs
const bigipAdminUsername = 'admin';
const bigipAdminPassword = 'admin';
// ssh and scp credentials for deployed BIG-IPs
const bigipUsername = 'root';
const bigipPassword = 'default';

(function main() {
    let machines = [];
    let allPassed = 1;

    getMachines(3)
        .then((deployedMachines) => {
            /* eslint-disable no-console */
            console.log('Deployed');
            machines = deployedMachines;
        })
        .catch((error) => {
            console.log('An error occurred on deployment. Exiting.');
            console.log(error);
            process.exit(1);
        })
        .then(() => {
            console.log('Onboarding Tests');
            return testOnboard(machines[0].ip);
        })
        .then((onboardTest) => {
            allPassed = allPassed && onboardTest;
        })
        .catch((error) => {
            allPassed = allPassed && 0;
            console.log(new Error(error));
        })
        .then(() => {
            console.log('Networking Tests');
            return testNetworking(machines[1].ip);
        })
        .then((networkingTest) => {
            allPassed = allPassed && networkingTest;
        })
        .catch((error) => {
            allPassed = allPassed && 0;
            console.log(new Error(error));
        })
        .then(() => {
            console.log('Licensing Tests');
            return testLicensing(machines[2].ip);
        })
        .catch((error) => {
            allPassed = allPassed && 0;
            console.log(new Error(error));
        })
        .then(() => {
            console.log('Rollbacking Tests');
            return testRollbacking(machines[0].ip);
        })
        .then((rollbackingTest) => {
            allPassed = allPassed && rollbackingTest;
        })
        .catch((error) => {
            allPassed = allPassed && 0;
            console.log(new Error(error));
        })
        .then(() => {
            const machineIds = [];
            machines.forEach((machine) => {
                machineIds.push(machine.id);
            });
            return vio.teardown(machineIds);
        })
        .then(() => {
            console.log('Finished');
            // we return a non-zero exit code if any of the tests
            // do not pass
            process.exit(!allPassed);
        })
        .catch((error) => {
            console.log(error);
        });
}());

/**
 * testOnboard - test for an onboard declaration type
 * @bigipAddress {String} : ip addrress of target BIG-IP
 * Returns a Promise which is resolved with 1 if tests pass, or 0 if any test fails, or rejects with an error
*/
function testOnboard(bigipAddress) {
    return new Promise((resolve, reject) => {
        const bodyFile = `${BODIES}/onboard.json`;
        let body;
        const errors = [];
        let passed = 1;

        common.readFile(bodyFile)
            .then(JSON.parse)
            .then((readBody) => {
                body = readBody;
            })
            .then(() => {
                return testRequest(body, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    DO_API, HTTP_ACCEPTED, 'POST', errors);
            })
            .then(() => {
                // we make a single status call (retrying it if it doesn't succeed),
                // and check everything against the response we get from it. Then all
                // of the tests become local
                // try 30 times, for 1min each trial
                return testGetStatus(30, 60 * 1000, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    HTTP_SUCCESS, errors);
            })
            .then((response) => {
                // get the part that interests us
                return response.currentConfig.Common;
            })
            .then((response) => {
                passed = passed && check('hostname matches', testHostname(body.Common, response, errors),
                    errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('dns matches', testDns(body.Common.myDns, response, errors), errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('ntp matches', testNtp(body.Common.myNtp, response, errors), errors);
                return response;
            })
            .then((response) => {
                // we're done; resolve
                const provisionModules = ['ltm'];
                passed = passed && check('provisioning matches', testProvisioning(body.Common.myProvisioning,
                    response, provisionModules, errors), errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('vlan matches', testVlan(body.Common.myVlan, response, errors),
                    errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('route matches', testRoute(body.Common.myRoute, response, errors),
                    errors);
            })
            .then(() => {
                // we're done; resolve
                resolve(passed);
            })
            .catch((error) => {
                reportMismatch(errors);
                reject(error);
            });
    });
}

/**
 * testLicensing - test for licensing, revoking using a BIG-IQ, and relicensing. We revoke at the end so as to
 *                 clean up licenses on BIG-IPs that are going to be killed after the test suite.
 * @bigipAddress {String} : ip addrress of target BIG-IP
 * Returns a Promise which is resolved with 1 if tests pass, or 0 if any test fails, or rejects with an error
*/
function testLicensing(bigipAddress) {
    return new Promise((resolve, reject) => {
        return licensingWorkflow(bigipAddress)
            .then((passed) => {
                if (passed) {
                    return licensingWorkflow(bigipAddress);
                }
                return 0;
            })
            .then((passed) => {
                resolve(passed);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * licensingWorkflow - tests an entire license/revoke workflow
 * @bigipAddress {String} : ip address of target BIG-IP
 * Returns a Promise which is resolved with 1 if tests pass, or 0 if any test fails, or reject with an error
*/
function licensingWorkflow(bigipAddress) {
    return new Promise((resolve, reject) => {
        const bodyFileLicensing = `${BODIES}/licensing_big_iq.json`;
        const bodyFileRevoking = `${BODIES}/license_revoking_big_iq.json`;
        const errors = [];
        let passed = 1;

        common.readFile(bodyFileLicensing)
            .then(JSON.parse)
            .then((body) => {
                // license the BIG-IP through a BIG-IQ
                return testRequest(body, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    DO_API, HTTP_ACCEPTED, 'POST', errors);
            })
            .then(() => {
                // wait until status is 200
                // try 30 times, 60 secs each trial
                return testGetStatus(30, 60 * 1000, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    HTTP_SUCCESS, errors);
            })
            .then(() => {
                // check if device has been licensed with an iControl call
                return testRequest(null, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    `${ICONTROL_API}/tm/sys/license`, HTTP_SUCCESS, 'GET', errors);
            })
            .then(JSON.parse)
            .then((iControlResponse) => {
                passed = passed && check('device was licensed', ('entries' in iControlResponse), errors);
            })
            .then(() => {
                return common.readFile(bodyFileRevoking);
            })
            .then(JSON.parse)
            .then((body) => {
                // revoke license through BIG-IQ
                return testRequest(body, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    DO_API, HTTP_ACCEPTED, 'POST', errors);
            })
            .then(() => {
                // check if device is no longer licensed
                return testRequest(null, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    `${ICONTROL_API}/tm/sys/license`, HTTP_SUCCESS, 'GET', errors);
            })
            .then(JSON.parse)
            .then((iControlResponse) => {
                passed = passed && check('device is no longer licensed', (!('entries' in iControlResponse)),
                    errors);
            })
            .then(() => {
                resolve(passed);
            })
            .catch((error) => {
                reportMismatch(errors);
                reject(error);
            });
    });
}

/**
 * testNetworking - test for a networking declaration type
 * @bigipAddress {String} : ip addrress of target BIG-IP
 * Returns a Promise which is resolved with 1 if tests pass, or 0 if any test fails, or rejects with an error
*/
function testNetworking(bigipAddress) {
    return new Promise((resolve, reject) => {
        const bodyFile = `${BODIES}/network.json`;
        let body;
        const errors = [];
        let passed = 1;

        common.readFile(bodyFile)
            .then((fileRead) => {
                body = JSON.parse(fileRead);
            })
            .then(() => {
                return testRequest(body, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    DO_API, HTTP_ACCEPTED, 'POST', errors);
            })
            .then(() => {
                // try 30 times, 60 secs each trial
                return testGetStatus(30, 60 * 1000, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    HTTP_SUCCESS, errors);
            })
            .then((response) => {
                return response.currentConfig.Common;
            })
            .then((response) => {
                passed = passed && check('self ip matches', testSelfIp(body.Common.mySelfIp, response,
                    errors), errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('vlan matches', testVlan(body.Common.myVlan, response, errors),
                    errors);
                return response;
            })
            .then((response) => {
                passed = passed && check('route matches', testRoute(body.Common.myRoute, response, errors),
                    errors);
            })
            .then(() => {
                resolve(passed);
            })
            .catch((error) => {
                reportMismatch(errors);
                reject(error);
            });
    });
}

/**
 * testRollbacking - test for the rollbacking feature; we issue an initial
 *                   request if invalid configuration for a particular BIG-IP,
 *                   and we get the status later on to see if we have rolled back
 *                   to the previously working configuration
 * @bigipAddress {String} : ip addrress of target BIG-IP
 * Returns a Promise which is resolved with 1 if tests pass, or 0 if any test fails, or rejects with an error
*/
function testRollbacking(bigipAddress) {
    return new Promise((resolve, reject) => {
        const bodyFile = `${BODIES}/bogus.json`;
        let currentConfiguration;
        const errors = [];
        let passed = 1;

        // get current configuration to compare against later
        testGetStatus(1, 1, bigipAddress, bigipAdminUsername, bigipAdminPassword, HTTP_SUCCESS, errors)
            .then((response) => {
                passed = passed && check('test current status is ok', response, errors);
                currentConfiguration = response.currentConfig.Common;
            })
            // send out request with invalid config declaration
            .then(() => {
                return common.readFile(bodyFile);
            })
            .then((fileRead) => {
                const body = JSON.parse(fileRead);
                return testRequest(body, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    DO_API, HTTP_ACCEPTED, 'POST', errors);
            })
            .then(() => {
                return testGetStatus(3, 60 * 1000, bigipAddress, bigipAdminUsername, bigipAdminPassword,
                    HTTP_UNPROCESSABLE, errors);
            })
            .then((response) => {
                passed = passed && check('test new status is rollbacked', response, errors);
                return response.currentConfig.Common;
            })
            // check that configuration is still the same as before
            .then((config) => {
                passed = passed && check('vlan matches', testVlan(currentConfiguration.VLAN.myVlan, config,
                    errors), errors);
                return config;
            })
            .then((config) => {
                passed = passed && check('route matches', testRoute(currentConfiguration.Route.myRoute,
                    config, errors), errors);
            })
            .then(() => {
                resolve(passed);
            })
            .catch((error) => {
                reportMismatch(errors);
                reject(error);
            });
    });
}

/**
 * testProvisioning - test a provisioning configuration patter from an
 *                    iControl call against a target object schemed on a
 *                    declaration
 * @target {Object}: object to be tested against
 * @response {Object} : object from status response to compare with target
 * @provisionModules {Array} : list of modules to be tested
 * @errors {Array}: list of mismatched pairs
 * Returns Promise true/false
 *
*/
function testProvisioning(target, response, provisionModules, errors) {
    return compareSimple(target, response.Provision, provisionModules, errors);
}

/**
 * testSelfIp - test a selfIp configuration pattern from a DO status call
 *              against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testSelfIp(target, response, errors) {
    return compareSimple(target, response.SelfIp.mySelfIp, ['address', 'allowService'], errors);
}

/**
 * testHostname - test a hostname configuration pattern from a DO status call
 *                against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testHostname(target, response, errors) {
    return compareSimple(target, response, ['hostname'], errors);
}

/**
 * testDns - test a dns configuration pattern from a DO status call
 *           against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testDns(target, response, errors) {
    return compareSimple(target, response.DNS, ['search', 'nameServers'], errors);
}

/**
 * testNtp - test a ntp configuration pattern from a DO status call
 *           against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testNtp(target, response, errors) {
    return compareSimple(target, response.NTP, ['servers', 'timezone'], errors);
}

/**
 * testVlan - test a vlan configuration pattern from a DO status call
 *            against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testVlan(target, response, errors) {
    return compareSimple(target, response.VLAN.myVlan, ['tag', 'mtu', 'interfaces'],
        errors);
}

/**
 * testRoute - test a route configuration pattern from a DO status call
 *             against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @errors {Array} : list of mismatched pairs
 * Returns Promise true/false
*/
function testRoute(target, response, errors) {
    return compareSimple(target, response.Route.myRoute, ['gw', 'network', 'mtu'], errors);
}

/**
 * testRequest - sends a request with the body and credentials to the hostname based on the ip provided,
 *               and tests if response was successful and issued the expected HTTP status code.
 * @body {Object} : request body
 * @ipAddress {String} : BIG-IP's ip address
 * @username {String} : BIG-IP's admin username
 * @password {String} : BIG-IP's admin password
 * @endpoint {String} : API endpoint
 * @expectedCode {int} : expected HTTP status code for the request
 * @method {String} : HTTP request method (POST, GET)
 * @errors {Array} : list of mismatched pairs
 * Returns Promise which resolves with response body on success or rejects with error
*/
function testRequest(body, ipAddress, username, password, endpoint, expectedCode, method, errors) {
    const func = function () {
        return new Promise((resolve, reject) => {
            const auth = buildAuthenticationString({ username, password });
            const options = buildBody(hostname(ipAddress), endpoint, body, auth, method);
            sendRequest(options)
                .then((response) => {
                    if (response.response.statusCode === expectedCode) {
                        resolve(response.body);
                    } else {
                        if (errors) {
                            pushError(errors, 'status code', 'status code', response.response.statusCode,
                                expectedCode);
                        }
                        reject(new Error(response.response.statusCode));
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    };
    return common.tryOften(func, 10, 60 * 1000, [HTTP_UNAVAILABLE], true);
}

/**
 * compareSimple - builds a boolean test based on an array of Strings to
 *                 be pairwise-compared among two objects; one coming
 *                 from a status call response, and the other from
 *                 a declaration json schema
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @strings {Array} : list of key strings to be compared on both status call response and target
 * @errors {Array} : list of mismatched pairs
 * Returns true/false
*/
function compareSimple(target, response, strings, errors) {
    return strings.every((str) => {
        return compareObjects(str, str, target, response, errors);
    });
}

/**
 * compareObjects - compares value of source accessed with key
 *                  with value of target accessed with key2
 * @key {String} : key of value on source
 * @key2 {String} : key on value on target
 * source {Object} : first object to be compared
 * target {Object} : second object to be compared
 * errors {Array} : list of pairs that mismatch if any (initially empty)
 * Returns true/false
*/
function compareObjects(key, key2, source, target, errors) {
    if (JSON.stringify(source[key]) !== JSON.stringify(target[key2])) {
        pushError(errors, key, key2, source[key], target[key2]);
        return false;
    }
    return true;
}

/**
 * reportMismatch - prints to the console the output mismatch between the values
 *                  reported in the errors list of pairs
 * @errors {Array} : list of mismatched pairs
 * Clears the errors array after printing mismatched output
*/
function reportMismatch(errors) {
    errors.forEach((error) => {
        console.log(' Mismatch: ');
        console.log(`   ${error.first.name} : ${'+'.bgRed.black} ${error.first.value}`);
        console.log(`   ${error.second.name} : ${'-'.bgGreen.black} ${error.second.value}`);
    });
    // clear the errors for future usage
    errors.length = 0;
}

/**
 * pushError - pushes a pair of mismatched values to an errors list
 * @errors {Array} : list of mismatched pairs
 * @keyActual : name of first field
 * @keyExpected : name of second field
 * @actual : actual value of an evaluated variable
 * @expected : expected value of evaluated variable
*/
function pushError(errors, keyActual, keyExpected, actual, expected) {
    errors.push({
        first: {
            name: keyActual, value: JSON.stringify(actual)
        },
        second: {
            name: keyExpected, value: JSON.stringify(expected)
        }
    });
}

/**
 * testGetStatus - tries for a DO status response given a time interval and number of tries,
 *                 and if ever successful, returns the response
 * @trials {Integer} - number of allowed trials
 * @timeInterval {Integer} - time in ms to wait before trying again
 * @ipAddress {String} - BIG-IP address for DO call
 * @adminUsername {String} - BIG-IP admin username
 * @adminPassword {String} - BIG-IP admin password
 * @expectedCode {String} - expected HTTP status code for when the API responds; typically HTTP_SUCCESS
 * @errors {Array} : list of mismatched pairs
 * Returns a Promise with response/error
*/
function testGetStatus(trials, timeInterval, ipAddress, adminUsername, adminPassword, expectedCode, errors) {
    const func = function () {
        return new Promise((resolve, reject) => {
            const auth = buildAuthenticationString({ username: adminUsername, password: adminPassword });
            const options = buildBody(hostname(ipAddress), `${DO_API}?show=full`, {}, auth, 'GET');
            sendRequest(options)
                .then((response) => {
                    if (response.response.statusCode === expectedCode) {
                        resolve(JSON.parse(response.body));
                    } else {
                        pushError(errors, 'status code', 'status code', response.response.statusCode,
                            expectedCode);
                        reject(new Error(response.response.statusCode));
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    };
    return common.tryOften(func, trials, timeInterval, [HTTP_ACCEPTED, HTTP_UNAVAILABLE], true);
}

/**
 * hostname - prepends https and appends PORT to the ip address
 * @ipAddress {String} : base ip of the hostname
 * Returns full hostname + port string
*/
function hostname(ipAddress) {
    return `https://${ipAddress}:${PORT}`;
}

/**
 * sendRequest - prepares and sends a request with some configuration
 * @options {Object} : configuration options for request
 * Returns Promise with response/error
*/
function sendRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) { reject(error); }
            const responseObj = { response, body };
            resolve(responseObj);
        });
    });
}

/**
 * check - verifies that a value is true, and outputs OK or FAIL with
 *         an optional error message
 * @description {String} : test description
 * @testValue {Boolean} : variable to test for truth
 * @errors {Array} list of errors to be reported if test fails
 * Returns 1 if test passed, 0 otherwise
*/
function check(description, testValue, errors) {
    if (testValue) {
        console.log(`${' OK'.bgGreen.black} ${description.green}`);
        return 1;
    }
    console.log(`${' FAIL'.bgRed.black} ${description.red}`);
    reportMismatch(errors);
    return 0;
}

/**
 * buildAuthenticationString - builds a base64 Basic Auth header
 * @credentials {Object} : username and password dictionary to be encoded
 *                         in the BasicAuth header {username : <user>, password : <pass>}
*/
function buildAuthenticationString(credentials) {
    const username = credentials.username;
    const password = credentials.password;
    return (`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
}

/**
 * buildBody - builds a request body to be sent over the network
 * @ipAddress {String} : host's ip address of the request
 * @endpoint {String} : endpoint to be hit by request
 * @data {Object} : data to be sent on request
 * @auth {Object} : base64-encoded Basic Auth header
 * @method {String} : request's method (POST, GET)
 * Returns fully-formatted body Object
*/
function buildBody(ipAddress, endpoint, data, auth, method) {
    const options = {
        method,
        url: ipAddress + endpoint,
        headers: {
            'Content-Type': 'application/json',
            Authorization: auth
        }
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    return options;
}

/**
 * getMachines - deployed a number of machines, copies the DO rpm package to each
 *               one of them, and installs the package.
 * @numberOfMachines {Integer} : number of BIG-IPs you wish to deploy
 * Retrurns a Promise with an array of deployed machines, each element containing an
 * object with id of deployed machine, and ip address. { id : <machine_id>, ip : <ip_address> }
 * Rejects if a machine couldn't be deployed, or if either the scp or installation failed
*/
function getMachines(numberOfMachines) {
    return new Promise((resolveOuter, rejectOuter) => {
        return vio.deploy(numberOfMachines)
            .then(JSON.parse)
            .then((machines) => {
                const installPromises = [];
                machines.forEach((machine) => {
                    installPromises.push(new Promise((resolve, reject) => {
                        // retrieve ip address and machine id
                        const machineId = machine.id;
                        const ipAddress = machine.networking.AdminNetwork2[0].addr;
                        // need to wait a little bit before machine is up
                        scpRpm(ipAddress)
                            .then(() => {
                                return installRpm(ipAddress);
                            })
                            .then(JSON.parse)
                            .then((response) => {
                                if (response.status === 'CREATED') {
                                    // we're done; the rpm package was installed
                                    // resolve with the machine's ip address for later ref
                                    resolve({ id: machineId, ip: ipAddress });
                                } else {
                                    // oops... we did request to install the rpm, but something failed
                                    reject(new Error(`failed : ${response.status}`));
                                }
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    }));
                });
                return Promise.all(installPromises);
            })
            .then((machines) => {
                resolveOuter(machines);
            })
            .catch((error) => {
                console.log(error);
                rejectOuter(error);
            });
    });
}

/**
 * installRpm - tries to install the rpm package on the machine until we run out of attempts
 * @host {String} : BIG-IP's ip address
*/
function installRpm(host) {
    const installBody = {
        operation: 'INSTALL',
        /* eslint-disable no-undef */
        packageFilePath: `${REMOTE_DIR}/${path.basename(RPM_PACKAGE)}`
        /* eslint-enable no-undef */
    };
    return testRequest(installBody, host, bigipAdminUsername, bigipAdminPassword,
        `${ICONTROL_API}/shared/iapp/package-management-tasks`, HTTP_ACCEPTED, 'POST', null);
}

/**
 * scpRpm - tries to secure copy the RPM package to a target BIG-IP until we run
 *          out of attempts
 * @host {String} : BIG-IP's ip address
*/
function scpRpm(host) {
    const ssh = new NodeSSH();
    const func = function () {
        return new Promise((resolve, reject) => {
            ssh.connect({
                host,
                username: bigipUsername,
                tryKeyboard: true,
                onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
                    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                        finish([bigipPassword]);
                    }
                }
            })
                .then(() => {
                    /* eslint-disable no-undef */
                    return ssh.putFile(RPM_PACKAGE, `${REMOTE_DIR}/${path.basename(RPM_PACKAGE)}`);
                    /* eslint-enable no-undef */
                })
                .then(() => {
                    resolve('copied');
                })
                .catch((err) => {
                    reject(err);
                });
        });
    };
    // try 10 times, with 1min for each time, and do not reject on error
    return common.tryOften(func, 10, 60 * 1000, null, false);
}
