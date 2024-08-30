/**
 * Copyright 2024 F5, Inc.
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

/*
   This is a module to be tested, each function being responsible for a set of tests
   such as Onboarding, Networking, licensing, etc. Functions act on a target BIG-IP in which
   the Declarative Onboarding rpm package has already been installed. Each function takes
   the same 3 parameters. Those are the target BIG-IP's ip address, admin username and admin
   password (last two are the username/password used to call the DO API)
 */

'use strict';

const assert = require('assert');
const constants = require('./constants');
const common = require('./common');
const logger = require('./logger').getInstance();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/* eslint-disable no-console */
/* eslint-disable prefer-arrow-callback */

describe('Declarative Onboarding Integration Test Suite', function performIntegrationTest() {
    // location of DO test JSON bodies
    const BODIES = 'test/integration/bodies';
    const machines = [];
    before(function setup() {
        return common.readFile(process.env.TEST_HARNESS_FILE)
            .then((file) => JSON.parse(file))
            .then((deployedMachines) => {
                deployedMachines.forEach((deployedMachine) => {
                    machines.push({
                        ip: deployedMachine.admin_ip,
                        adminUsername: deployedMachine.f5_rest_user.username,
                        adminPassword: deployedMachine.f5_rest_user.password
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
            .catch((error) => Promise.reject(error));
    });

    describe('Test Onboard', function testOnboard() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let currentState;

        before(() => {
            const thisMachine = machines[0];
            const bigIpAddress = thisMachine.ip;
            const bodyFile = `${BODIES}/onboard.json`;
            const bigIpAuth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return common.readFile(bodyFile)
                .then(JSON.parse)
                .then((readBody) => {
                    body = readBody;
                })
                .then(() => common.testRequest(
                    body,
                    `${common.hostname(bigIpAddress, constants.PORT)}${constants.DO_API}`,
                    bigIpAuth,
                    constants.HTTP_ACCEPTED,
                    'POST'
                ))
                .then(() => common.testGetStatus(60, 30 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                .then((response) => {
                    currentState = response.currentConfig.Common;
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        after(() => {
            const thisMachine = machines[0];
            const bigIpAddress = thisMachine.ip;
            const bigIpAuth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return common.testOriginalConfig(bigIpAddress, bigIpAuth)
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
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
            const provisionModules = ['ltm', 'gtm'];
            assert.ok(testProvisioning(body.Common.myProvisioning, currentState, provisionModules));
        });

        it('should match VLAN', () => {
            assert.ok(testVlan(body.Common.myVlan, currentState, 'myVlan'));
            assert.ok(testVlan(body.Common.internal, currentState, 'internal'));
        });

        it('should match routing', () => {
            assert.ok(testRoute(body.Common.myRoute, currentState, 'myRoute'));
        });

        it('should match failover unicast address', () => assert.deepStrictEqual(
            currentState.FailoverUnicast,
            {
                unicastAddress: [
                    {
                        ip: '10.148.75.46',
                        port: 1026
                    },
                    {
                        ip: '10.148.75.46',
                        port: 126
                    }
                ]
            }
        ));

        it('should match failover multicast', () => assert.deepStrictEqual(
            currentState.FailoverMulticast,
            {
                multicastInterface: 'eth0',
                multicastIp: '233.252.0.10',
                multicastPort: 123
            }
        ));

        it('should match configsync ip address', () => {
            assert.ok(testConfigSyncIp(body.Common, currentState));
        });

        it('should have created the DeviceGroup', () => assert.deepStrictEqual(
            currentState.DeviceGroup.myFailoverGroup,
            {
                name: 'myFailoverGroup',
                asmSync: 'disabled',
                autoSync: 'enabled',
                fullLoadOnSync: 'false',
                networkFailover: 'enabled',
                saveOnAutoSync: 'false',
                type: 'sync-failover'
            }
        ));

        it('should have created the TrafficGroup', () => assert.deepStrictEqual(
            currentState.TrafficGroup.myTrafficGroup,
            {
                name: 'myTrafficGroup',
                autoFailbackEnabled: 'false',
                autoFailbackTime: 50,
                failoverMethod: 'ha-order',
                haLoadFactor: 1,
                haOrder: ['/Common/f5.example.com']
            }
        ));

        it('should match SnmpCommunity without special character', () => assert.deepStrictEqual(
            currentState.SnmpCommunity.mySnmpCommunityWithoutSpecialCharacter,
            {
                name: 'mySnmpCommunityWithoutSpecialCharacter',
                access: 'ro',
                communityName: 'mySnmpCommunityWithoutSpecialCharacter',
                ipv6: 'disabled',
                oidSubset: '.1',
                source: 'all'
            }
        ));

        it('should match SnmpCommunity with special character', () => assert.deepStrictEqual(
            currentState.SnmpCommunity.mySnmpCommunityWithSpecialCharacter,
            {
                name: 'mySnmpCommunityWithSpecialCharacter',
                access: 'ro',
                communityName: 'special!community',
                ipv6: 'disabled',
                oidSubset: '.1',
                source: 'all'
            }
        ));

        it('should match DO ManagementRoute', () => assert.deepStrictEqual(
            currentState.ManagementRoute.myManagementRoute,
            {
                name: 'myManagementRoute',
                description: 'not-configured-by-dhcp',
                gateway: '192.0.2.14',
                mtu: 0,
                network: '192.0.2.13/32'
            }
        ));

        it('should have preserved DHCP ManagementRoutes', () => {
            const dhcpManagementRoutes = Object.keys(currentState.ManagementRoute)
                .filter((managementRoute) => currentState.ManagementRoute[managementRoute].description === 'configured-by-dhcp');
            assert(dhcpManagementRoutes.length > 0);
        });
    });

    describe('Test dry run', function testDryRun() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let originalDns;
        let currentState;
        let result;

        before(() => {
            const thisMachine = machines[0];
            const bigIpAddress = thisMachine.ip;
            const bodyFile = `${BODIES}/onboard.json`;
            const bigIpAuth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return common.readFile(bodyFile)
                .then(JSON.parse)
                .then((readBody) => {
                    body = readBody;
                    body.controls = {
                        dryRun: true
                    };
                })
                .then(() => {
                    const url = `${common.hostname(bigIpAddress, constants.PORT)}${constants.ICONTROL_API}/tm/sys/dns`;
                    const options = common.buildBody(url, null, bigIpAuth, 'GET');
                    const retryOptions = {
                        trials: 3,
                        timeInterval: 1000
                    };
                    return common.sendRequest(options, retryOptions);
                })
                .then((response) => {
                    const dns = response.body;
                    originalDns = {
                        nameServers: dns.nameServers,
                        search: dns.search
                    };
                    body.Common.myDns.nameServers = ['10.10.10.10'];
                    body.Common.myDns.search = ['example.com'];
                    assert.notDeepStrictEqual(body.Common.myDns.nameServers, originalDns.nameServers, 'Original and updated nameServers should not match');
                    assert.notDeepStrictEqual(body.Common.myDns.search, originalDns.search, 'Original and updated search should not match');
                })
                .then(() => common.testRequest(
                    body,
                    `${common.hostname(bigIpAddress, constants.PORT)}${constants.DO_API}`,
                    bigIpAuth,
                    constants.HTTP_ACCEPTED,
                    'POST'
                ))
                .then(() => common.testGetStatus(60, 30 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                .then((response) => {
                    result = response.result;
                    currentState = response.currentConfig.Common;
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        it('should indicate that it was a dry run', () => {
            assert.ok(result.dryRun);
        });

        it('should not have changed the DNS nameServers', () => {
            assert.ok(testDns(originalDns, currentState));
        });
    });

    describe('Test Networking', function testNetworking() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        let body;
        let currentState;

        before(() => {
            const thisMachine = machines[1];
            const bigIpAddress = thisMachine.ip;
            const bigIpAuth = { username: thisMachine.adminUsername, password: thisMachine.adminPassword };
            const bodyFile = `${BODIES}/network.json`;
            return common.readFile(bodyFile)
                .then((fileRead) => {
                    body = JSON.parse(fileRead);
                })
                .then(() => common.testRequest(body, `${common.hostname(bigIpAddress, constants.PORT)}`
                    + `${constants.DO_API}`, bigIpAuth, constants.HTTP_ACCEPTED, 'POST'))
                .then(() => common.testGetStatus(60, 30 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                .then((response) => {
                    currentState = response.currentConfig.Common;
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        after(() => {
            const thisMachine = machines[1];
            const bigIpAddress = thisMachine.ip;
            const bigIpAuth = { username: thisMachine.adminUsername, password: thisMachine.adminPassword };
            return common.testOriginalConfig(bigIpAddress, bigIpAuth)
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        it('should match tunnel', () => {
            assert.ok(testTunnel(body.Common.myGreTunnel, currentState, 'myGreTunnel'));
        });

        it('should match self ip', () => {
            assert.ok(testSelfIp(body.Common.mySelfIp, currentState, 'mySelfIp'));
        });

        it('should match ipv6 self ip', () => {
            const expected = Object.assign({}, body.Common.myIpv6SelfIp);
            expected.address = '2002:a94:552e::/32';
            assert.ok(testSelfIp(expected, currentState, 'myIpv6SelfIp'));
        });

        it('should match self ip on tunnel', () => {
            assert.ok(testSelfIp(body.Common.myGreTunnelSelf, currentState, 'myGreTunnelSelf'));
        });

        it('should match VLAN', () => {
            assert.ok(testVlan(body.Common.myVlan, currentState, 'myVlan'));
            const expected = JSON.parse(JSON.stringify(body.Common.internal));
            expected.mtu = 1500;
            assert.ok(testVlan(expected, currentState, 'internal'));
        });

        it('should match routing', () => {
            assert.ok(testRoute(body.Common.myRoute, currentState, 'myRoute'));
        });

        it('should match routing that needs created in order', () => {
            assert.ok(testRoute(body.Common.int_rt, currentState, 'int_rt'));
            assert.ok(testRoute(body.Common.int_gw_interface, currentState, 'int_gw_interface'));
        });

        it('should match localOnly routing', () => {
            assert.deepStrictEqual(
                currentState.Route.myLocalOnlyRoute,
                {
                    name: 'myLocalOnlyRoute',
                    mtu: 0,
                    network: 'default',
                    localOnly: true,
                    tmInterface: 'myVlan'
                }
            );
        });

        it('should match routing with tunnel', () => {
            assert.ok(testRoute(body.Common.myGreTunnelRoute, currentState, 'myGreTunnelRoute'));
        });

        it('should match dns resolver', () => {
            assert.ok(testDnsResolver(body.Common.myResolver, currentState));
        });

        it('should match ip mirroring', () => {
            assert.strictEqual(currentState.MirrorIp.mirrorIp, '2002:a94:552e::');
            assert.strictEqual(currentState.MirrorIp.mirrorSecondaryIp, 'any6');
        });

        it('should match RoutingAccessList', () => assert.deepStrictEqual(
            currentState.RoutingAccessList,
            {
                testRoutingAccessList1: {
                    name: 'testRoutingAccessList1',
                    description: 'none',
                    entries: [
                        {
                            name: 11,
                            action: 'permit',
                            destination: '10.10.0.0/16',
                            exactMatch: 'disabled',
                            source: '10.11.0.0/16'
                        },
                        {
                            name: 22,
                            action: 'deny',
                            destination: '10.12.13.14/32',
                            exactMatch: 'disabled',
                            source: '10.13.14.15/32'
                        }
                    ]
                },
                testRoutingAccessList2: {
                    name: 'testRoutingAccessList2',
                    description: 'none',
                    entries: [
                        {
                            name: 33,
                            action: 'permit',
                            destination: '::/0',
                            exactMatch: 'enabled',
                            source: '1111:2222::/64'
                        },
                        {
                            name: 44,
                            action: 'permit',
                            destination: '::/0',
                            exactMatch: 'disabled',
                            source: '1111:3333::/64'
                        }
                    ]
                }
            }
        ));

        it('should match RoutingAsPath', () => assert.deepStrictEqual(
            currentState.RoutingAsPath,
            {
                testRoutingAsPath1: {
                    name: 'testRoutingAsPath1',
                    entries: [
                        {
                            name: 10,
                            regex: '^65001 *'
                        }
                    ]
                },
                testRoutingAsPath2: {
                    name: 'testRoutingAsPath2',
                    entries: [
                        {
                            name: 10,
                            regex: '^$'
                        },
                        {
                            name: 20,
                            regex: '^65005$'
                        }
                    ]
                }
            }
        ));

        it('should match RoutingPrefixList', () => assert.deepStrictEqual(
            currentState.RoutingPrefixList,
            {
                testRoutingPrefixList1: {
                    name: 'testRoutingPrefixList1',
                    entries: [
                        {
                            name: 10,
                            action: 'permit',
                            prefix: '1111:2222::/127',
                            prefixLenRange: '128'
                        }
                    ],
                    routeDomain: '0'
                },
                testRoutingPrefixList2: {
                    name: 'testRoutingPrefixList2',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            prefix: '10.3.3.0/24',
                            prefixLenRange: '30:32'
                        }
                    ],
                    routeDomain: '0'
                }
            }
        ));

        it('should match RouteMap', () => assert.deepStrictEqual(
            currentState.RouteMap,
            {
                testRouteMap: {
                    name: 'testRouteMap',
                    entries: [
                        {
                            name: 33,
                            action: 'permit',
                            match: {
                                asPath: '/Common/testRoutingAsPath1',
                                ipv4: {
                                    address: {
                                        prefixList: '/Common/testRoutingPrefixList2'
                                    },
                                    nextHop: {}
                                },
                                ipv6: {
                                    address: {
                                        prefixList: '/Common/testRoutingPrefixList1'
                                    },
                                    nextHop: {}
                                }
                            }
                        }
                    ],
                    routeDomain: '0'
                }
            }
        ));

        it('should match RoutingBGP', () => assert.deepStrictEqual(
            currentState.RoutingBGP,
            {
                testRoutingBGP: {
                    name: 'testRoutingBGP',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: '/Common/testRouteMap'
                                }
                            ]
                        },
                        {
                            name: 'ipv6'
                        }
                    ],
                    gracefulRestart: {
                        gracefulReset: 'enabled',
                        restartTime: 120,
                        stalepathTime: 0
                    },
                    holdTime: 35,
                    keepAlive: 10,
                    localAs: 50208,
                    neighbors: [
                        {
                            name: '10.1.1.2',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    asOverride: 'enabled'
                                },
                                {
                                    name: 'ipv6',
                                    asOverride: 'enabled'
                                }
                            ],
                            ebgpMultihop: 2,
                            peerGroup: 'Neighbor'
                        }
                    ],
                    peerGroups: [
                        {
                            name: 'Neighbor',
                            addressFamily: [
                                {
                                    name: 'ipv4',
                                    routeMap: {
                                        out: '/Common/testRouteMap'
                                    },
                                    softReconfigurationInbound: 'enabled'
                                },
                                {
                                    name: 'ipv6',
                                    routeMap: {},
                                    softReconfigurationInbound: 'disabled'
                                }
                            ],
                            remoteAs: 65020
                        }
                    ],
                    routeDomain: '0',
                    routerId: '10.1.1.1'
                }
            }
        ));
    });

    describe('Test Experimental Status Codes', function testExperimentalStatusCodes() {
        this.timeout(1000 * 60 * 30); // 30 minutes

        function testStatusCode(query, expectedCode) {
            const thisMachine = machines[1];
            const bigIpAddress = thisMachine.ip;
            const auth = { username: thisMachine.adminUsername, password: thisMachine.adminPassword };
            const bodyFile = `${BODIES}/bogus.json`;
            const url = `${common.hostname(bigIpAddress, constants.PORT)}${constants.DO_API}`;

            return common.readFile(bodyFile)
                .then((fileRead) => JSON.parse(fileRead))
                .then((body) => common.testRequest(body, url, auth, constants.HTTP_ACCEPTED, 'POST'))
                .then(() => common.testGetStatus(60, 30 * 1000, bigIpAddress, auth, expectedCode, query))
                .then((responseBody) => {
                    // on 14+ this will be a string because of the messed up response
                    if (typeof responseBody === 'string') {
                        assert.notStrictEqual(responseBody.indexOf(constants.HTTP_UNPROCESSABLE.toString()), -1);
                    } else {
                        assert.strictEqual(responseBody.code, constants.HTTP_UNPROCESSABLE);
                        assert.strictEqual(responseBody.result.code, constants.HTTP_UNPROCESSABLE);
                        assert.strictEqual(responseBody.status, 'ERROR');
                    }
                })
                .catch((error) => {
                    logger.info(`got error ${error}`);
                    assert.fail(error);
                });
        }

        it('should return 422 without using a query parameter',
            () => testStatusCode({}, constants.HTTP_UNPROCESSABLE));

        it('should return 422 using legacy statusCodes',
            () => testStatusCode({ statusCodes: 'legacy' }, constants.HTTP_UNPROCESSABLE));

        it('should return 200 using experimental statusCodes',
            () => testStatusCode({ statusCodes: 'experimental' }, constants.HTTP_SUCCESS));
    });

    describe('Test Licensing and properties requiring a license', function testLicensing() {
        this.timeout(1000 * 60 * 30); // 30 minutes

        const bigIqAuth = {
            username: process.env.BIG_IQ_USERNAME,
            password: process.env.BIG_IQ_PASSWORD
        };
        const bigIqAddress = process.env.BIG_IQ_HOST;
        const bodyFileLicensing = `${BODIES}/licensing_big_iq.json`;

        let thisMachine;
        let bigIpAddress;
        let bigIpAuth;
        let oldAuditLink;
        let newAuditLink;
        let currentState;

        before(() => {
            thisMachine = machines[2];
            bigIpAddress = thisMachine.ip;
            bigIpAuth = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
            return common.readFile(bodyFileLicensing)
                .then(JSON.parse)
                .then((body) => {
                    // need to replace credentials and ip address for BIG-IQ in the
                    // declaration by those we got from environment
                    body.Common.myLicense.bigIqHost = bigIqAddress;
                    body.Common.myLicense.bigIqUsername = bigIqAuth.username;
                    body.Common.myLicense.bigIqPassword = bigIqAuth.password;
                    // also update BIG-IP credentials
                    body.Common.myLicense.bigIpUsername = bigIpAuth.username;
                    body.Common.myLicense.bigIpPassword = bigIpAuth.password;
                    return body;
                })
                .then((body) => common.testRequest(body, `${common.hostname(bigIpAddress, constants.PORT)}`
                    + `${constants.DO_API}`, bigIpAuth, constants.HTTP_ACCEPTED, 'POST'))
                .then(() => common.testGetStatus(20, 60 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                .then((response) => {
                    currentState = response.currentConfig.Common;
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        after(() => common.testOriginalConfig(bigIpAddress, bigIpAuth)
            .catch((error) => logError(error, bigIpAddress, bigIpAuth)));

        it('should have licensed', () => {
            logTestTitle(this.ctx.test.title);
            return getAuditLink(bigIqAddress, bigIpAddress, bigIqAuth)
                .then((auditLink) => {
                    logger.info(`auditLink: ${auditLink}`);
                    // save the licensing link to compare against later
                    oldAuditLink = auditLink;
                    assert.ok(auditLink);
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        it('should have hostname set', () => {
            assert.deepStrictEqual(currentState.System.hostname, 'do-integration-test.local');
        });

        it('should have re-licensed with new pool', () => {
            logTestTitle(this.ctx.test.title);
            const bodyFileRevokingRelicensing = `${BODIES}/revoking_relicensing_big_iq.json`;
            // now revoke and re-license using another license pool
            return common.readFile(bodyFileRevokingRelicensing)
                .then(JSON.parse)
                .then((body) => {
                    body.Common.myLicense.bigIqHost = bigIqAddress;
                    body.Common.myLicense.bigIqUsername = bigIqAuth.username;
                    body.Common.myLicense.bigIqPassword = bigIqAuth.password;
                    body.Common.myLicense.bigIpUsername = bigIpAuth.username;
                    body.Common.myLicense.bigIpPassword = bigIpAuth.password;
                    return body;
                })
                .then((body) => common.testRequest(body, `${common.hostname(bigIpAddress, constants.PORT)}`
                    + `${constants.DO_API}`, bigIpAuth, constants.HTTP_ACCEPTED, 'POST'))
                .then(() => common.testGetStatus(20, 60 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                .then(() => getAuditLink(bigIqAddress, bigIpAddress, bigIqAuth))
                .then((auditLink) => {
                    logger.info(`auditLink: ${auditLink}`);
                    // if the new audit link is equal to the old, it means the old license wasn't
                    // revoked, because an audit link represents a licensed device (see getAuditLink)
                    assert.notStrictEqual(oldAuditLink, auditLink);
                    newAuditLink = auditLink;
                })
                .catch((error) => logError(error, bigIpAddress, bigIpAuth));
        });

        describe('Test Firewall', function testFirewall() {
            this.timeout(1000 * 60 * 30); // 30 minutes
            let body;

            before(() => {
                const bodyFile = `${BODIES}/firewall.json`;
                return common.readFile(bodyFile)
                    .then((fileRead) => {
                        body = JSON.parse(fileRead);
                    })
                    .then(() => common.testRequest(body, `${common.hostname(bigIpAddress, constants.PORT)}`
                        + `${constants.DO_API}`, bigIpAuth, constants.HTTP_ACCEPTED, 'POST'))
                    .then(() => common.testGetStatus(60, 30 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                    })
                    .catch((error) => logError(error, bigIpAddress, bigIpAuth));
            });

            after(() => common.testOriginalConfig(bigIpAddress, bigIpAuth)
                .catch((error) => logError(error, bigIpAddress, bigIpAuth)));

            it('should match self ip', () => {
                assert.deepStrictEqual(
                    currentState.SelfIp,
                    {
                        mySelfIp: {
                            name: 'mySelfIp',
                            address: '10.148.75.46/24',
                            vlan: 'myVlan',
                            trafficGroup: 'traffic-group-local-only',
                            allowService: [
                                'tcp:80'
                            ],
                            fwEnforcedPolicy: 'myFirewallPolicy',
                            fwStagedPolicy: 'myFirewallPolicy'
                        }
                    }
                );
            });

            it('should match VLAN', () => {
                assert.ok(testVlan(body.Common.myVlan, currentState, 'myVlan'));
            });

            it('should match FirewallPortList', () => assert.deepStrictEqual(
                currentState.FirewallPortList,
                {
                    myFirewallPortList: {
                        name: 'myFirewallPortList',
                        description: 'firewall port list description',
                        ports: ['8080', '8888']
                    }
                }
            ));

            it('should match FirwallAddressList', () => assert.deepStrictEqual(
                currentState.FirewallAddressList,
                {
                    myFirewallAddressList: {
                        name: 'myFirewallAddressList',
                        description: 'firewall address list description',
                        addresses: ['10.1.0.1', '10.2.0.0/24']
                    }
                }
            ));

            it('should match FirewallPolicy', () => assert.deepStrictEqual(
                currentState.FirewallPolicy,
                {
                    myFirewallPolicy: {
                        name: 'myFirewallPolicy',
                        description: 'firewall policy description',
                        rules: [
                            {
                                name: 'firewallPolicyRuleOne',
                                description: 'firewall policy rule description',
                                action: 'reject',
                                ipProtocol: 'tcp',
                                log: 'yes',
                                source: {
                                    vlans: [
                                        '/Common/myVlan'
                                    ],
                                    addressLists: [
                                        '/Common/myFirewallAddressList'
                                    ],
                                    portLists: [
                                        '/Common/myFirewallPortList'
                                    ]
                                },
                                destination: {
                                    addressLists: [
                                        '/Common/myFirewallAddressList'
                                    ],
                                    portLists: [
                                        '/Common/myFirewallPortList'
                                    ]
                                }
                            },
                            {
                                name: 'firewallPolicyRuleTwo',
                                description: 'none',
                                action: 'accept',
                                ipProtocol: 'any',
                                log: 'no',
                                source: {},
                                destination: {}
                            }
                        ]
                    }
                }
            ));

            it('should match ManagementIpFirewall', () => assert.deepStrictEqual(
                currentState.ManagementIpFirewall,
                {
                    description: 'management IP firewall description',
                    rules: [
                        {
                            name: 'firewallRuleOne',
                            description: 'firewall rule description',
                            action: 'reject',
                            ipProtocol: 'tcp',
                            log: 'yes',
                            source: {
                                addressLists: [
                                    '/Common/myFirewallAddressList'
                                ],
                                portLists: [
                                    '/Common/myFirewallPortList'
                                ]
                            },
                            destination: {
                                addressLists: [
                                    '/Common/myFirewallAddressList'
                                ],
                                portLists: [
                                    '/Common/myFirewallPortList'
                                ]
                            }
                        },
                        {
                            name: 'firewallRuleTwo',
                            description: 'none',
                            action: 'accept',
                            ipProtocol: 'any',
                            log: 'no',
                            source: {},
                            destination: {}
                        }
                    ]
                }
            ));
        });

        describe('Test GSLB', function testGslb() {
            let body;

            before(() => {
                const bodyFile = `${BODIES}/gslb.json`;
                // send out gslb declaration
                return common.readFile(bodyFile)
                    .then(JSON.parse)
                    .then((readBody) => {
                        body = readBody;
                    })
                    .then(() => common.testRequest(
                        body,
                        `${common.hostname(bigIpAddress, constants.PORT)}${constants.DO_API}`,
                        bigIpAuth,
                        constants.HTTP_ACCEPTED,
                        'POST'
                    ))
                    .then(() => common.testGetStatus(60, 15 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                    })
                    .catch((error) => logError(error, bigIpAddress, bigIpAuth));
            });

            after(() => common.testOriginalConfig(bigIpAddress, bigIpAuth)
                .catch((error) => logError(error, bigIpAddress, bigIpAuth)));

            it('should have updated GSLB global-settings', () => assert.deepStrictEqual(
                currentState.GSLBGlobals,
                {
                    general: {
                        synchronization: 'yes',
                        synchronizationGroupName: 'newGroup',
                        synchronizationTimeTolerance: 123,
                        synchronizationTimeout: 12345,
                        synchronizeZoneFiles: 'no'
                    }
                }
            ));

            it('should have created GSLB data center', () => assert.deepStrictEqual(
                currentState.GSLBDataCenter.myDataCenter,
                {
                    name: 'myDataCenter',
                    description: 'GSLB DataCenter description',
                    enabled: true,
                    contact: 'dataCenterContact',
                    location: 'dataCenterLocation',
                    proberFallback: 'outside-datacenter',
                    proberPreference: 'inside-datacenter'
                }
            ));

            it('should have created GSLB server', () => assert.deepStrictEqual(
                currentState.GSLBServer.myGSLBServer,
                {
                    name: 'myGSLBServer',
                    description: 'GSLB server description',
                    devices: [
                        {
                            description: 'GSLB server device description',
                            name: '10.10.10.10',
                            translation: '192.0.2.12'
                        }
                    ],
                    datacenter: 'myDataCenter',
                    product: 'bigip',
                    enabled: false,
                    proberPreference: 'pool',
                    proberFallback: 'any-available',
                    proberPool: 'myGSLBProberPool',
                    limitMaxBps: 10,
                    limitMaxBpsStatus: 'enabled',
                    limitMaxPps: 10,
                    limitMaxPpsStatus: 'enabled',
                    limitMaxConnections: 10,
                    limitMaxConnectionsStatus: 'enabled',
                    iqAllowServiceCheck: 'no',
                    iqAllowPath: 'no',
                    iqAllowSnmp: 'no',
                    virtualServerDiscovery: 'enabled',
                    exposeRouteDomains: 'yes',
                    limitCpuUsage: 10,
                    limitCpuUsageStatus: 'enabled',
                    limitMemAvail: 10,
                    limitMemAvailStatus: 'enabled',
                    monitor: [
                        '/Common/http',
                        '/Common/myGSLBMonitorHTTP',
                        '/Common/myGSLBMonitorHTTPS',
                        '/Common/myGSLBMonitorICMP',
                        '/Common/myGSLBMonitorTCP',
                        '/Common/myGSLBMonitorUDP'
                    ],
                    virtualServers: [
                        {
                            name: '0',
                            description: 'none',
                            address: '10.0.20.1',
                            port: 80,
                            enabled: true,
                            translationPort: 0,
                            monitor: []
                        },
                        {
                            name: 'virtualServer',
                            description: 'GSLB server virtual server description',
                            enabled: false,
                            address: 'a989:1c34:9c::b099:c1c7:8bfe',
                            port: 8080,
                            translationAddress: '1:0:1::',
                            translationPort: 80,
                            monitor: [
                                '/Common/tcp',
                                '/Common/http'
                            ]
                        }
                    ]
                }
            ));

            it('should have created GSLB prober pool', () => assert.deepStrictEqual(
                currentState.GSLBProberPool.myGSLBProberPool,
                {
                    name: 'myGSLBProberPool',
                    description: 'GSLB prober pool description',
                    loadBalancingMode: 'round-robin',
                    enabled: false,
                    members: [
                        {
                            order: 0,
                            name: 'myGSLBServer',
                            description: 'GSLB prober pool member description',
                            enabled: false
                        }
                    ]
                }
            ));

            it('should have created a GSLB monitor of type http', () => assert.deepStrictEqual(
                currentState.GSLBMonitor.myGSLBMonitorHTTP,
                {
                    name: 'myGSLBMonitorHTTP',
                    interval: 100,
                    probeTimeout: 110,
                    send: 'HEAD / HTTP/1.0\\r\\n',
                    timeout: 1000,
                    transparent: 'enabled',
                    monitorType: 'http',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    reverse: 'enabled',
                    recv: 'HTTP'
                }
            ));

            it('should have created a GSLB monitor of type https', () => assert.deepStrictEqual(
                currentState.GSLBMonitor.myGSLBMonitorHTTPS,
                {
                    name: 'myGSLBMonitorHTTPS',
                    interval: 100,
                    probeTimeout: 110,
                    send: 'HEAD / HTTP/1.0\\r\\n',
                    timeout: 1000,
                    transparent: 'enabled',
                    monitorType: 'https',
                    description: 'description',
                    destination: '192.0.2.16:80',
                    ignoreDownResponse: 'enabled',
                    reverse: 'enabled',
                    recv: 'HTTP',
                    cipherlist: 'DEFAULT',
                    cert: 'default.crt'
                }
            ));

            it('should have created a GSLB monitor of type gateway-icmp', () => assert.deepStrictEqual(
                currentState.GSLBMonitor.myGSLBMonitorICMP,
                {
                    name: 'myGSLBMonitorICMP',
                    interval: 100,
                    probeTimeout: 110,
                    timeout: 1000,
                    transparent: 'enabled',
                    monitorType: 'gateway-icmp',
                    description: 'description',
                    destination: '192.0.2.15:80',
                    ignoreDownResponse: 'enabled',
                    probeInterval: 1,
                    probeAttempts: 3
                }
            ));

            it('should have created a GSLB monitor of type tcp', () => assert.deepStrictEqual(
                currentState.GSLBMonitor.myGSLBMonitorTCP,
                {
                    name: 'myGSLBMonitorTCP',
                    interval: 100,
                    probeTimeout: 110,
                    timeout: 1000,
                    transparent: 'enabled',
                    monitorType: 'tcp',
                    description: 'description',
                    destination: '192.0.2.12:80',
                    ignoreDownResponse: 'enabled',
                    reverse: 'enabled',
                    recv: 'example receive',
                    send: 'example send'
                }
            ));

            it('should have created a GSLB monitor of type udp', () => assert.deepStrictEqual(
                currentState.GSLBMonitor.myGSLBMonitorUDP,
                {
                    name: 'myGSLBMonitorUDP',
                    interval: 100,
                    probeTimeout: 110,
                    send: 'default send string',
                    timeout: 1000,
                    transparent: 'enabled',
                    monitorType: 'udp',
                    description: 'description',
                    destination: '192.0.2.18:80',
                    ignoreDownResponse: 'enabled',
                    reverse: 'enabled',
                    recv: 'udp receive',
                    debug: 'yes',
                    probeInterval: 1,
                    probeAttempts: 3
                }
            ));
        });

        describe('Test GSLB Global Settings', function testGslb() {
            let body;

            before(() => {
                const bodyFile = `${BODIES}/gslb_global_settings.json`;
                // send out gslb declaration
                return common.readFile(bodyFile)
                    .then(JSON.parse)
                    .then((readBody) => {
                        body = readBody;
                    })
                    .then(() => common.testRequest(
                        body,
                        `${common.hostname(bigIpAddress, constants.PORT)}${constants.DO_API}`,
                        bigIpAuth,
                        constants.HTTP_ACCEPTED,
                        'POST'
                    ))
                    .then(() => common.testGetStatus(60, 15 * 1000, bigIpAddress, bigIpAuth, constants.HTTP_SUCCESS))
                    .then((response) => {
                        currentState = response.currentConfig.Common;
                    })
                    .catch((error) => logError(error, bigIpAddress, bigIpAuth));
            });

            after(() => common.testOriginalConfig(bigIpAddress, bigIpAuth)
                .catch((error) => logError(error, bigIpAddress, bigIpAuth)));

            it('should have updated GSLB global-settings with sync zone files property', () => assert.deepStrictEqual(
                currentState.GSLBGlobals,
                {
                    general: {
                        synchronization: 'yes',
                        synchronizationGroupName: 'newGroup',
                        synchronizationTimeTolerance: 123,
                        synchronizationTimeout: 12345,
                        synchronizeZoneFiles: 'yes'
                    }
                }
            ));
        });

        describe('further license testing', () => {
            it('should have revoked old license', () => {
                logTestTitle(this.ctx.test.title);
                const retryOptions = {
                    trials: 100,
                    timeInterval: 1000
                };
                return Promise.resolve()
                    .then(() => getF5Token(bigIqAddress, bigIqAuth))
                    .then((token) => {
                        logger.debug(`oldAuditLink: ${oldAuditLink}`);
                        logger.debug(`token: ${token}`);
                        const options = common.buildBody(oldAuditLink, null, { token }, 'GET');
                        return common.sendRequest(options, retryOptions);
                    })
                    .then((response) => {
                        if (response.statusCode !== constants.HTTP_SUCCESS) {
                            throw new Error('could not check revoking');
                        }
                        return response.body;
                    })
                    .then((assignment) => {
                        assert.strictEqual(assignment.status, 'REVOKED');
                    })
                    .catch((error) => logError(error, bigIpAddress, bigIpAuth));
            });

            it('cleanup by revoking new license', () => Promise.resolve().then(() => {
                logTestTitle(this.ctx.test.title);
                let body;
                const bodyFileRevoking = `${BODIES}/revoke_from_bigiq.json`;
                const retryOptions = {
                    trials: 100,
                    timeInterval: 1000
                };
                return common.readFile(bodyFileRevoking)
                    .then(JSON.parse)
                    .then((bodyStub) => {
                        body = bodyStub;
                        body.address = bigIpAddress;
                        body.user = bigIpAuth.username;
                        body.password = bigIpAuth.password;
                    })
                    .then(() => getF5Token(bigIqAddress, bigIqAuth))
                    .then((token) => {
                        const options = common.buildBody(
                            `${common.hostname(bigIqAddress, constants.PORT)}`
                            + `${constants.ICONTROL_API}/cm/device/tasks/licensing/pool/member-management`,
                            body,
                            { token },
                            'POST'
                        );
                        return common.sendRequest(options, retryOptions);
                    })
                    .then((response) => {
                        if (response.statusCode !== constants.HTTP_ACCEPTED) {
                            throw new Error('could not request to revoke license');
                        }
                        return response.body;
                    })
                    .then((response) => {
                        logger.info(`Expecting STARTED. Got ${response.status}`);
                        assert.strictEqual(response.status, 'STARTED');
                    })
                    .then(() => {
                        const func = function () {
                            logger.debug('In retry func');
                            return Promise.resolve()
                                .then(() => getF5Token(bigIqAddress, bigIqAuth))
                                .then((token) => {
                                    const options = common.buildBody(newAuditLink, null, { token }, 'GET');
                                    return common.sendRequest(options, retryOptions);
                                })
                                .then((response) => {
                                    logger.debug(`Audit status code ${response.statusCode}`);
                                    if (response.statusCode === constants.HTTP_SUCCESS) {
                                        logger.debug('Got success status for GET request');
                                        logger.debug(`Looking for REVOKED. Got ${response.body.status}`);
                                        if (response.body.status === 'REVOKED') {
                                            logger.debug('resolving retry func');
                                            return Promise.resolve();
                                        }
                                        logger.debug('rejecting retry func for status');
                                        throw new Error(response.body.status);
                                    } else {
                                        logger.debug('rejecting retry func for status code');
                                        throw new Error(response.statusCode);
                                    }
                                })
                                .catch((err) => {
                                    logger.debug(`Retry func caught ${err.message}`);
                                    throw err;
                                });
                        };
                        return common.tryOften(func, 10, 30 * 1000, [constants.HTTP_ACCEPTED, 'GRANTED']);
                    })
                    .catch((error) => logError(error, bigIpAddress, bigIpAuth));
            }));
        });
    });

    describe('Test Inspect Endpoint', function testAuth() {
        this.timeout(1000 * 60 * 30); // 30 minutes
        const inspectEndpoint = `${constants.DO_API}/inspect`;

        let thisMachine;
        let authData;

        before(() => {
            thisMachine = machines[1];
            authData = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
        });

        /**
         * REST API returns every time different encrypted string for the same secret value.
         * Better to remove secrets from declaration.
         * Ideally it would be better to decrypt every secret which starts with $M.
         */
        const removeSecrets = (declaration) => {
            const currentAuth = declaration.declaration.Common.currentAuthentication;
            if (typeof currentAuth !== 'undefined') {
                if (typeof currentAuth.ldap !== 'undefined') {
                    currentAuth.ldap.bindPw = '';
                }
                if (typeof currentAuth.radius !== 'undefined'
                    && typeof currentAuth.radius.servers !== 'undefined') {
                    const radiusServers = currentAuth.radius.servers;
                    Object.keys(radiusServers).forEach((rsName) => {
                        radiusServers[rsName].secret = '';
                    });
                }
            }
        };

        it('should get declaration with current device\'s configuration', () => {
            logTestTitle(this.ctx.test.title);
            return common.testRequest(
                null, `${common.hostname(thisMachine.ip, constants.PORT)}${inspectEndpoint}`, authData, constants.HTTP_SUCCESS, 'GET'
            )
                .then((body) => {
                    assert.notStrictEqual(body[0].declaration, undefined, 'Should have "declaration" property');
                });
        });

        it('should post declaration with current device\'s configuration', () => {
            logTestTitle(this.ctx.test.title);

            let originDeclaration;

            return common.testRequest(
                null, `${common.hostname(thisMachine.ip, constants.PORT)}${inspectEndpoint}`, authData, constants.HTTP_SUCCESS, 'GET'
            )
                .then((body) => {
                    originDeclaration = body[0].declaration;
                    originDeclaration.declaration.async = true; // Timing issue without async
                    assert.notStrictEqual(originDeclaration, undefined, 'Should have "declaration" property');
                    // apply declaration
                    return common.testRequest(
                        originDeclaration, `${common.hostname(thisMachine.ip, constants.PORT)}${constants.DO_API}`, authData, constants.HTTP_ACCEPTED, 'POST'
                    );
                })
                .then(() => common.testGetStatus(60, 30 * 1000, thisMachine.ip, authData, constants.HTTP_SUCCESS))
                // fetch declaration again
                .then(() => common.testRequest(
                    null, `${common.hostname(thisMachine.ip, constants.PORT)}${inspectEndpoint}`, authData, constants.HTTP_SUCCESS, 'GET'
                ))
                .then((body) => {
                    // declaration should be the same
                    const declaration = body[0].declaration;
                    delete originDeclaration.declaration.async; // Must remove for the comparison
                    removeSecrets(declaration);
                    removeSecrets(originDeclaration);
                    assert.deepStrictEqual(declaration, originDeclaration, 'Should match original declaration');
                });
        });
    });

    describe('Test Example Endpoint', function testExample() {
        this.timeout(5000);
        const exampleEndpoint = `${constants.DO_API}/example`;
        let thisMachine;
        let authData;

        before(() => {
            thisMachine = machines[0];
            authData = {
                username: thisMachine.adminUsername,
                password: thisMachine.adminPassword
            };
        });

        it('should retrieve an example', () => {
            logTestTitle(this.ctx.test.title);

            return common.testRequest(
                null,
                `${common.hostname(thisMachine.ip, constants.PORT)}${exampleEndpoint}`,
                authData,
                constants.HTTP_SUCCESS,
                'GET',
                1
            )
                .then((body) => {
                    logger.debug(`Got example ${JSON.stringify(body)}`);
                    assert.notStrictEqual(body.Common, undefined);
                });
        });
    });
});

function logTestTitle(testTitle) {
    logger.info(`Starting test: ${testTitle}`);
}

function logError(error, bigIpAddress, bigIpAuth) {
    console.log(error);
    logger.info(error);
    return common.dumpDeclaration(bigIpAddress, bigIpAuth)
        .then((declarationStatus) => Promise.reject(new Error(JSON.stringify(declarationStatus, null, 2))));
}

/**
 * getF5Token - returns a new Promise which resolves with a new authorization token for
 *              iControl calls, or reject with error
 * @deviceIp {String} : ip address of target device
 * @auth {Object} : authorization body to retrieve token (username/password)
*/
function getF5Token(deviceIp, auth) {
    return Promise.resolve()
        .then(() => {
            const options = common.buildBody(`${common.hostname(deviceIp, constants.PORT)}`
                + `${constants.ICONTROL_API}/shared/authn/login`, auth, auth, 'POST');
            const retryOptions = {
                trials: 100,
                timeInterval: 1000
            };
            return common.sendRequest(options, retryOptions);
        })
        .then((response) => {
            if (response.statusCode !== constants.HTTP_SUCCESS) {
                throw new Error('could not get token');
            }
            return response.body;
        })
        .then((response) => Promise.resolve(response.token.token));
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
    return getF5Token(bigIqAddress, bigIqAuth)
        .then((token) => {
            const func = function () {
                const options = common.buildBody(
                    `${common.hostname(bigIqAddress, constants.PORT)}`
                    + `${constants.ICONTROL_API}/cm/device/licensing/assignments`,
                    null,
                    { token },
                    'GET'
                );
                const retryOptions = {
                    trials: 10,
                    timeInterval: 1000
                };
                return common.sendRequest(options, retryOptions)
                    .then((response) => {
                        logger.info(`get assignments response ${JSON.stringify(response)}`);
                        if (response.statusCode !== constants.HTTP_SUCCESS) {
                            return Promise.reject(new Error('could not license'));
                        }
                        return response.body;
                    })
                    .then((response) => response.items)
                    .then((assignments) => {
                        logger.debug(`current assignments: ${JSON.stringify(
                            assignments.map(
                                (assignment) => ({
                                    deviceAddress: assignment.deviceAddress,
                                    status: assignment.status,
                                    id: assignment.id
                                })
                            ),
                            null,
                            4
                        )}`);
                        const bigIpAssignments = assignments
                            .filter((current) => current.deviceAddress === bigIpAddress);
                        if (bigIpAssignments.length > 0) {
                            const assignment = bigIpAssignments.find((current) => current.status === 'LICENSED');
                            if (assignment) {
                                const auditLink = assignment.auditRecordReference.link;
                                // audit links come with the ip address as localhost, we need to
                                // replace it with the address of the BIG-IQ, in order to use it later
                                // to check licensing of a particular device
                                const auditLinkRemote = auditLink.replace(/localhost/gi, bigIqAddress);
                                return auditLinkRemote;
                            }
                            return Promise.reject(new Error(`device license status : ${bigIpAssignments[0].status}`));
                        }
                        return Promise.reject(new Error('no license match for device address'));
                    });
            };
            return common.tryOften(func, 5, 30 * 1000);
        });
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
 * @param {Object} target - object to be tested against
 * @param {Object} response - object from status response to compare with target
 * @param {String} name - name of the selfIp
 * Returns Promise true/false
*/
function testTunnel(target, response, name) {
    const mappedTarget = JSON.parse(JSON.stringify(target));
    mappedTarget.profile = mappedTarget.tunnelType;
    delete mappedTarget.tunnelType;
    return compareSimple(mappedTarget, response.Tunnel[name], ['profile', 'localAddress', 'mode']);
}

/**
 * testSelfIp - test a selfIp configuration pattern from a DO status call
 *              against a target object schemed on a declaration
 * @param {Object} target - object to be tested against
 * @param {Object} response - object from status response to compare with target
 * @param {String} name - name of the selfIp
 * Returns Promise true/false
*/
function testSelfIp(target, response, name) {
    return compareSimple(target, response.SelfIp[name], ['vlan', 'address', 'allowService']);
}

/**
 * testHostname - test a hostname configuration pattern from a DO status call
 *                against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * Returns Promise true/false
*/
function testHostname(target, response) {
    return compareSimple(target, response.System, ['hostname']);
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
 * @param {Object} target : object to be tested against
 * @param {Object} response : object from status response to compare with target
 * @param {String} name - name of the VLAN
 * Returns Promise true/false
*/
function testVlan(target, response, name) {
    // map any autoLasthop to autoLastHop
    const testResponse = JSON.parse(JSON.stringify(response));
    if (testResponse.VLAN[name].autoLasthop) {
        testResponse.VLAN[name].autoLastHop = testResponse.VLAN[name].autoLasthop;
        delete testResponse.VLAN[name].autoLasthop;
    }
    const testTarget = JSON.parse(JSON.stringify(target));
    if (testTarget.autoLasthop) {
        testTarget.autoLastHop = testTarget.autoLasthop;
        delete testTarget.autoLasthop;
    }

    return compareSimple(testTarget, testResponse.VLAN[name], ['tag', 'mtu', 'interfaces', 'autoLastHop']);
}

/**
 * testRoute - test a route configuration pattern from a DO status call
 *             against a target object schemed on a declaration
 * @target {Object} : object to be tested against
 * @response {Object} : object from status response to compare with target
 * @targetName {string} : name of the route to get in response
 * Returns Promise true/false
*/
function testRoute(target, response, targetName) {
    return compareSimple(target, response.Route[targetName], ['gw', 'network', 'mtu']);
}

/**
 * testDnsResolver - test a DNS resolver configuration pattern from a DO status call
 *                   against a target object schemed on a declaration
 * @param {Object} target - object to be tested against
 * @param {Object} response - object from status response to compare with target
 * Returns Promise true/false
*/
function testDnsResolver(target, response) {
    const responseResolver = response.DNS_Resolver.myResolver;
    const responseForwardZone = responseResolver.forwardZones[0];
    const validName = responseForwardZone.name === 'forward.net';
    const validNameserver = responseForwardZone.nameservers[0].name === '10.10.10.10:53';
    const validIpv6Nameserver = responseForwardZone.nameservers[1].name === '192.0.2.11:53';
    return validName
        && validNameserver
        && validIpv6Nameserver
        && compareSimple(target, responseResolver, ['routeDomain']);
}

function testConfigSyncIp(target, response) {
    const validRef = target.myConfigSync.configsyncIp === '/Common/mySelfIp/address';
    const validAddr = target.mySelfIp.address.indexOf(response.ConfigSync.configsyncIp) === 0;
    return validRef && validAddr;
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
    return strings.every((str) => compareObjects(str, str, target, response));
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
