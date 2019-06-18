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

const assert = require('assert');
const constants = require('./constants.js');
const common = require('./common.js');

const configItems = require('../../nodejs/configItems.json');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/* eslint-disable no-console */
/* eslint-disable prefer-arrow-callback */


describe('Declarative Onboarding Functional Test Suite', function performFunctionalTest() {
    // location of DO test JSON bodies
    const BODIES = 'test/functional/bodies';
    const machines = [];
    before(function setup() {
        return common.readFile(process.env.TEST_HARNESS_FILE)
            .then(file => JSON.parse(file))
            .then((deployedMachines) => {
                deployedMachines.forEach((deployedMachine) => {
                    machines.push({
                        ip: deployedMachine.admin_ip,
                        adminUsername: deployedMachine.admin_username,
                        adminPassword: deployedMachine.admin_password
                    });
                });
                return Promise.resolve();
            })
            .then(() => {
                if (!process.env.BIG_IQ_HOST || !process.env.BIG_IQ_USERNAME
                    || !process.env.BIG_IQ_PASSWORD) {
                    return Promise.reject(new Error('At least one of BIG_IQ_HOST, BIG_IQ_USERNAME,'
                        + 'BIG_IQ_PASSWORD not set'));
                }
                return Promise.resolve();
            })
            .catch(error => Promise.reject(error));
    });

    describe('Test Configuration Scope', () => {
        it('should not overlap with config items in the AS3 project', () => {
            const path = '/orchestration-as3-generic/as3-properties-latest.json';
            const options = common.buildBody(process.env.ARTIFACTORY_BASE_URL + path, null, null, 'GET');
            options.rejectUnauthorized = false;
            return common.sendRequest(options)
                .then((res) => {
                    const as3Properties = JSON.parse(res.response.body.replace(/\\n/g, ''));
                    const keyCount = Object.keys(as3Properties).length;
                    if (keyCount === 0) {
                        assert.fail('No properties in AS3 properties.json');
                    }
                    configItems.forEach((item) => {
                        const prop = item.path.replace(/\/tm\//, '').replace(/\//g, ' ');
                        assert.ok(as3Properties[prop] === undefined);
                    });
                })
                .catch((err) => {
                    console.log(JSON.stringify(options));
                    assert.fail(err);
                });
        });
    });

    describe('Test Onboard', function testOnboard() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let currentState;

        before(() => {
            const thisMachine = machines[0];
            const bigipAddress = thisMachine.ip;
            return new Promise((resolve, reject) => {
                const bodyFile = `${BODIES}/onboard.json`;
                const auth = {
                    username: thisMachine.adminUsername,
                    password: thisMachine.adminPassword
                };
                return common.readFile(bodyFile)
                    .then(JSON.parse)
                    .then((readBody) => {
                        body = readBody;
                    })
                    .then(() => common.testRequest(body, `${common.hostname(bigipAddress, constants.PORT)}`
                            + `${constants.DO_API}`, auth,
                    constants.HTTP_ACCEPTED, 'POST'))
                    .then(() => common.testGetStatus(30, 60 * 1000, bigipAddress, auth,
                        constants.HTTP_SUCCESS))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                        resolve();
                    })
                    .catch((error) => {
                        console.log(error);
                        return common.dumpDeclaration(bigipAddress, auth);
                    })
                    .then((declarationStatus) => {
                        reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should match the hostname', () => {
            assert.ok(testHostname(body.Common, currentState));
        });

        it('should match the DNS', () => {
            assert.ok(testDns(body.Common.myDns, currentState));
        });

        it('should match the NTP', () => {
            assert.ok(testNtp(body.Common.myNtp, currentState));
        });

        it('should match provisioning', () => {
            const provisionModules = ['ltm'];
            assert.ok(testProvisioning(body.Common.myProvisioning, currentState, provisionModules));
        });

        it('should match VLAN', () => {
            assert.ok(testVlan(body.Common.myVlan, currentState));
        });

        it('should match routing', () => {
            assert.ok(testRoute(body.Common.myRoute, currentState));
        });
    });

    describe('Test Networking', function testNetworking() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let currentState;

        before(() => {
            const thisMachine = machines[1];
            const bigipAddress = thisMachine.ip;
            const auth = { username: thisMachine.adminUsername, password: thisMachine.adminPassword };
            const bodyFile = `${BODIES}/network.json`;
            return new Promise((resolve, reject) => {
                common.readFile(bodyFile)
                    .then((fileRead) => {
                        body = JSON.parse(fileRead);
                    })
                    .then(() => common.testRequest(body, `${common.hostname(bigipAddress, constants.PORT)}`
                            + `${constants.DO_API}`, auth, constants.HTTP_ACCEPTED, 'POST'))
                    .then(() => common.testGetStatus(30, 60 * 1000, bigipAddress, auth,
                        constants.HTTP_SUCCESS))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                        resolve();
                    })
                    .catch((error) => {
                        console.log(error);
                        return common.dumpDeclaration(bigipAddress, auth);
                    })
                    .then((declarationStatus) => {
                        reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should match self ip', () => {
            assert.ok(testSelfIp(body.Common.mySelfIp, currentState));
        });

        it('should match VLAN', () => {
            assert.ok(testVlan(body.Common.myVlan, currentState));
        });

        it('should match routing', () => {
            assert.ok(testRoute(body.Common.myRoute, currentState));
        });
    });

    describe('Test Licensing', function testLicensing() {
        this.timeout(1000 * 60 * 30); // 30 minutes

        const bigIqAuth = {
            username: process.env.BIG_IQ_USERNAME,
            password: process.env.BIG_IQ_PASSWORD
        };
        const bigIqAddress = process.env.BIG_IQ_HOST;
        const bodyFileLicensing = `${BODIES}/licensing_big_iq.json`;

        let bigipAddress;
        let bigipAuth;
        let oldAuditLink;
        let newAuditLink;

        before(() => {
            const thisMachine = machines[2];
            bigipAddress = thisMachine.ip;
            bigipAuth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return new Promise((resolve, reject) => {
                common.readFile(bodyFileLicensing)
                    .then(JSON.parse)
                    .then((body) => {
                        // need to replace credentials and ip address for BIG-IQ in the
                        // declaration by those we got from environment
                        body.Common.myLicense.bigIqHost = bigIqAddress;
                        body.Common.myLicense.bigIqUsername = bigIqAuth.username;
                        body.Common.myLicense.bigIqPassword = bigIqAuth.password;
                        // also update BIG-IP credentials
                        body.Common.myLicense.bigIpUsername = bigipAuth.username;
                        body.Common.myLicense.bigIpPassword = bigipAuth.password;
                        return body;
                    })
                    .then(body => common.testRequest(body, `${common.hostname(bigipAddress, constants.PORT)}`
                            + `${constants.DO_API}`, bigipAuth, constants.HTTP_ACCEPTED, 'POST'))
                    .then(() => common.testGetStatus(20, 60 * 1000, bigipAddress, bigipAuth,
                        constants.HTTP_SUCCESS))
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        console.log(error);
                        return common.dumpDeclaration(bigipAddress, bigipAuth);
                    })
                    .then((declarationStatus) => {
                        reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should have licensed', () => new Promise((resolve, reject) => getAuditLink(bigIqAddress, bigipAddress, bigIqAuth)
            .then((auditLink) => {
                // save the licensing link to compare against later
                oldAuditLink = auditLink;
                assert.ok(auditLink);
                resolve();
            })
            .catch((error) => {
                console.log(error);
                return common.dumpDeclaration(bigipAddress, bigipAuth);
            })
            .then((declarationStatus) => {
                reject(new Error(JSON.stringify(declarationStatus, null, 2)));
            })
            .catch((err) => {
                reject(err);
            })));

        it('should have re-licensed with new pool', () => new Promise((resolve, reject) => {
            const bodyFileRevokingRelicensing = `${BODIES}/revoking_relicensing_big_iq.json`;
            // now revoke and re-license using another license pool
            return common.readFile(bodyFileRevokingRelicensing)
                .then(JSON.parse)
                .then((body) => {
                    body.Common.myLicense.bigIqHost = bigIqAddress;
                    body.Common.myLicense.bigIqUsername = bigIqAuth.username;
                    body.Common.myLicense.bigIqPassword = bigIqAuth.password;
                    body.Common.myLicense.bigIpUsername = bigipAuth.username;
                    body.Common.myLicense.bigIpPassword = bigipAuth.password;
                    return body;
                })
                .then(body => common.testRequest(body, `${common.hostname(bigipAddress, constants.PORT)}`
                            + `${constants.DO_API}`, bigipAuth, constants.HTTP_ACCEPTED, 'POST'))
                .then(() => common.testGetStatus(20, 60 * 1000, bigipAddress,
                    bigipAuth, constants.HTTP_SUCCESS))
                .then(() => getAuditLink(bigIqAddress, bigipAddress, bigIqAuth))
                .then((auditLink) => {
                    // if the new audit link is equal to the old, it means the old license wasn't
                    // revoked, because an audit link represents a licensed device (see getAuditLink)
                    assert.notStrictEqual(oldAuditLink, auditLink);
                    newAuditLink = auditLink;
                })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    console.log(error);
                    return common.dumpDeclaration(bigipAddress, bigipAuth);
                })
                .then((declarationStatus) => {
                    reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                })
                .catch((err) => {
                    reject(err);
                });
        }));

        it('should have revoked old license', () => new Promise((resolve, reject) => getF5Token(bigIqAddress, bigIqAuth)
            .then((token) => {
                const options = common.buildBody(oldAuditLink, null, { token }, 'GET');
                return common.sendRequest(options);
            })
            .then((response) => {
                if (response.response.statusCode !== constants.HTTP_SUCCESS) {
                    reject(new Error('could not check revoking'));
                }
                return response.body;
            })
            .then(JSON.parse)
            .then((assignment) => {
                assert.strictEqual(assignment.status, 'REVOKED');
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                console.log(error);
                return common.dumpDeclaration(bigipAddress, bigipAuth);
            })
            .then((declarationStatus) => {
                reject(new Error(JSON.stringify(declarationStatus, null, 2)));
            })
            .catch((err) => {
                reject(err);
            })));

        it('should have revoked new license', () => new Promise((resolve, reject) => {
            let body;
            const bodyFileRevoking = `${BODIES}/revoke_from_bigiq.json`;
            return common.readFile(bodyFileRevoking)
                .then(JSON.parse)
                .then((bodyStub) => {
                    body = bodyStub;
                    body.address = bigipAddress;
                    body.user = bigipAuth.username;
                    body.password = bigipAuth.password;
                })
                .then(() => getF5Token(bigIqAddress, bigIqAuth))
                .then((token) => {
                    const options = common.buildBody(`${common.hostname(bigIqAddress, constants.PORT)}`
                            + `${constants.ICONTROL_API}/cm/device/tasks/licensing/pool/member-management`,
                    body, { token }, 'POST');
                    return common.sendRequest(options);
                })
                .then((response) => {
                    if (response.response.statusCode !== constants.HTTP_ACCEPTED) {
                        reject(new Error('could not request to revoke license'));
                    }
                    return response.body;
                })
                .then(JSON.parse)
                .then((response) => {
                    assert.strictEqual(response.status, 'STARTED');
                })
                .then(() => {
                    const func = function () {
                        return new Promise((resolveThis, rejectThis) => getF5Token(bigIqAddress, bigIqAuth)
                            .then((token) => {
                                const options = common.buildBody(newAuditLink, null,
                                    { token }, 'GET');
                                return common.sendRequest(options);
                            })
                            .then((response) => {
                                if (response.response.statusCode === constants.HTTP_SUCCESS) {
                                    if (JSON.parse(response.body).status === 'REVOKED') {
                                        resolveThis();
                                    } else {
                                        rejectThis(new Error(JSON.parse(response.body).status));
                                    }
                                } else {
                                    rejectThis(new Error(response.response.statusCode));
                                }
                            })
                            .catch((err) => {
                                rejectThis(new Error(err));
                            }));
                    };
                    return common.tryOften(func, 5, 30, [constants.HTTP_ACCEPTED, 'GRANTED'], true);
                })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    console.log(error);
                    return common.dumpDeclaration(bigipAddress, bigipAuth);
                })
                .then((declarationStatus) => {
                    reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                })
                .catch((err) => {
                    reject(err);
                });
        }));
    });

    describe('Test Rollbacking', function testRollbacking() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let currentState;

        before(() => {
            const thisMachine = machines[0];
            const bigipAddress = thisMachine.ip;
            const bodyFile = `${BODIES}/bogus.json`;
            const auth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return new Promise((resolve, reject) => {
                // get current configuration to compare against later
                common.testGetStatus(1, 1, bigipAddress, auth, constants.HTTP_SUCCESS)
                    .then((response) => {
                        body = response.currentConfig.Common;
                    })
                    // send out request with invalid config declaration
                    .then(() => common.readFile(bodyFile))
                    .then((fileRead) => {
                        const bodyRequest = JSON.parse(fileRead);
                        return common.testRequest(bodyRequest,
                            `${common.hostname(bigipAddress, constants.PORT)}`
                            + `${constants.DO_API}`, auth, constants.HTTP_ACCEPTED, 'POST');
                    })
                    .then(() => common.testGetStatus(3, 60 * 1000, bigipAddress, auth,
                        constants.HTTP_UNPROCESSABLE))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                        resolve();
                    })
                    .catch((error) => {
                        console.log(error);
                        return common.dumpDeclaration(bigipAddress, auth);
                    })
                    .then((declarationStatus) => {
                        reject(new Error(JSON.stringify(declarationStatus, null, 2)));
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should have rollback status', () => {
            // this is a bit weird, because testGetStatus will resolve if the status we passed in
            // is the one found after the request. Since we asked for HTTP_UNPROCESSABLE, it will actually
            // resolve iff the configuration was indeed rollbacked. At this point then, since before has
            // resolved, we can just assert the response
            assert.ok(currentState);
        });

        it('should match VLAN', () => {
            assert.ok(testVlan(body.VLAN.myVlan, currentState));
        });

        it('should match routing', () => {
            assert.ok(testRoute(body.Route.myRoute, currentState));
        });
    });
});

/**
 * getF5Token - returns a new Promise which resolves with a new authorization token for
 *              iControl calls, or reject with error
 * @deviceIp {String} : ip address of target device
 * @auth {Object} : authorization body to retrieve token (username/password)
*/
function getF5Token(deviceIp, auth) {
    return new Promise((resolve, reject) => {
        const options = common.buildBody(`${common.hostname(deviceIp, constants.PORT)}`
            + `${constants.ICONTROL_API}/shared/authn/login`, auth, auth, 'POST');
        return common.sendRequest(options)
            .then((response) => {
                if (response.response.statusCode !== constants.HTTP_SUCCESS) {
                    reject(new Error('could not get token'));
                }
                return response.body;
            })
            .then(JSON.parse)
            .then((response) => {
                resolve(response.token.token);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

/**
 * getAuditLink - returns a Promise which resolves with link for later query of licensing information,
 *                or rejects if no licensing information was found for that device, or if the device
 *                is not licensed
 * @bigIqAddress {String} : ip address of BIG-IQ license manager
 * @bigIpAddress {String} : ip address of target licensed BIG-IP
 * @auth {Object} : authorization body for BIG-IQ (username/password)
*/
function getAuditLink(bigIqAddress, bigIpAddress, bigIqAuth) {
    return new Promise((resolve, reject) => getF5Token(bigIqAddress, bigIqAuth)
        .then((token) => {
            const options = common.buildBody(`${common.hostname(bigIqAddress, constants.PORT)}`
                    + `${constants.ICONTROL_API}/cm/device/licensing/assignments`,
            null, { token }, 'GET');
            return common.sendRequest(options);
        })
        .then((response) => {
            if (response.response.statusCode !== constants.HTTP_SUCCESS) {
                reject(new Error('could not license'));
            }
            return response.body;
        })
        .then(JSON.parse)
        .then(response => response.items)
        .then((assignments) => {
            assignments.forEach((assignment) => {
                if (assignment.deviceAddress === bigIpAddress) {
                    const licensingStatus = assignment.status;
                    const auditLink = assignment.auditRecordReference.link;
                    // audit links come with the ip address as localhost, we need to
                    // replace it with the address of the BIG-IQ, in order to use it later
                    // to check licensing of a particular device
                    const auditLinkRemote = auditLink.replace(/localhost/gi, bigIqAddress);
                    if (assignment.status === 'LICENSED') resolve(auditLinkRemote);
                    else reject(new Error(`device license status : ${licensingStatus}`));
                }
            });
            reject(new Error('no license match for device address'));
        })
        .catch((error) => {
            reject(error);
        }));
}

/**
 * testProvisioning - test a provisioning configuration patter from an
 *                    iControl call against a target object schemed on a
 *                    declaration
 * @target {Object}: object to be tested against
 * @response {Object} : object from status response to compare with target
 * @provisionModules {Array} : list of modules to be tested
 * Returns Promise true/false
 *
*/
function testProvisioning(target, response, provisionModules) {
    return compareSimple(target, response.Provision, provisionModules);
}

/**
 * testSelfIp - test a selfIp configuration pattern from a DO status call
 *              against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testSelfIp(target, response) {
    return compareSimple(target, response.SelfIp.mySelfIp, ['address', 'allowService']);
}

/**
 * testHostname - test a hostname configuration pattern from a DO status call
 *                against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testHostname(target, response) {
    return compareSimple(target, response, ['hostname']);
}

/**
 * testDns - test a dns configuration pattern from a DO status call
 *           against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testDns(target, response) {
    return compareSimple(target, response.DNS, ['search', 'nameServers']);
}

/**
 * testNtp - test a ntp configuration pattern from a DO status call
 *           against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testNtp(target, response) {
    return compareSimple(target, response.NTP, ['servers', 'timezone']);
}

/**
 * testVlan - test a vlan configuration pattern from a DO status call
 *            against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testVlan(target, response) {
    return compareSimple(target, response.VLAN.myVlan, ['tag', 'mtu', 'interfaces']);
}

/**
 * testRoute - test a route configuration pattern from a DO status call
 *             against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testRoute(target, response) {
    return compareSimple(target, response.Route.myRoute, ['gw', 'network', 'mtu']);
}

/**
 * compareSimple - builds a boolean test based on an array of Strings to
 *                 be pairwise-compared among two objects; one coming
 *                 from a status call response, and the other from
 *                 a declaration json schema
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @strings {Array} : list of key strings to be compared on both status call response and target
 * Returns true/false
*/
function compareSimple(target, response, strings) {
    return strings.every(str => compareObjects(str, str, target, response));
}

/**
 * compareObjects - compares value of source accessed with key
 *                  with value of target accessed with key2
 * @key {String} : key of value on source
 * @key2 {String} : key on value on target
 * source {Object} : first object to be compared
 * target {Object} : second object to be compared
 * Returns true/false
*/
function compareObjects(key, key2, source, target) {
    if (JSON.stringify(source[key]) !== JSON.stringify(target[key2])) {
        return false;
    }
    return true;
}
