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

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');
const URL = require('url');

const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const SCHEMA_VERSION = require('../../../src/schema/latest/base.schema.json').properties.schemaVersion.enum[0];

const configItems = require('../../../src/lib/configItems.json');
const ConfigManagerMock = require('../../../src/lib/configManager');
const doUtilMock = require('../../../src/lib/doUtil');
const InspectHandler = require('../../../src/lib/inspectHandler');
const Logger = require('../../../src/lib/logger');

describe('inspectHandler', () => {
    let expectedDeclaration;
    let inspectHandler;

    const basicInspectHandlerAsserts = (data, code, status, message, errors) => {
        if (typeof errors !== 'undefined') {
            if (Array.isArray(errors)) {
                assert.deepStrictEqual(inspectHandler.getErrors(), errors);
            }
            if (typeof errors === 'function') {
                errors = inspectHandler.getErrors().filter(errors);
                assert.ok(errors.length > 0, 'Should find expected errors');
            }
        }
        assert.strictEqual(inspectHandler.getCode(), code);
        assert.strictEqual(inspectHandler.getStatus(), status);
        assert.strictEqual(inspectHandler.getMessage(), message);

        if (typeof expectedDeclaration !== 'undefined') {
            assert.deepStrictEqual(data, expectedDeclaration);
        }
    };

    afterEach(() => {
        sinon.restore();
    });

    describe('validate basics', () => {
        beforeEach(() => {
            inspectHandler = new InspectHandler();
        });

        it('should return the a code of 200', () => {
            assert.strictEqual(inspectHandler.getCode(), 200);
        });

        it('should return the custom code 400', () => {
            inspectHandler.code = 400;
            assert.strictEqual(inspectHandler.getCode(), 400);
        });

        it('should return the code of 500', () => {
            inspectHandler.errors = ['error'];
            assert.strictEqual(inspectHandler.getCode(), 500);
        });

        it('should return a status of OK', () => {
            assert.strictEqual(inspectHandler.getStatus(), 'OK');
        });

        it('should return a status of ERROR', () => {
            inspectHandler.errors = ['error'];
            assert.strictEqual(inspectHandler.getStatus(), 'ERROR');
        });

        it('should return empty message', () => {
            assert.strictEqual(inspectHandler.getMessage(), '');
        });

        it('should return failed message', () => {
            inspectHandler.errors = ['error'];
            assert.strictEqual(inspectHandler.getMessage(), 'failed');
        });

        it('should return custom message', () => {
            inspectHandler.message = 'expectedMessage';
            assert.strictEqual(inspectHandler.getMessage(), 'expectedMessage');
        });

        it('should return empty errors', () => {
            assert.deepEqual(inspectHandler.getErrors(), []);
        });
    });

    describe('response tests', () => {
        let customEndpointTimeout;
        let customPlatform;
        let customState;
        let raiseUnhandledException;
        let targetHost;
        let targetPort;
        let targetUsername;
        let targetPassword;

        beforeEach(() => {
            sinon.stub(ConfigManagerMock.prototype, 'get').callsFake(function get() {
                if (customState) {
                    Object.assign(this.state, customState);
                }
                return Promise.resolve({});
            });
            sinon.stub(doUtilMock, 'getPrimaryAdminUser').resolves('admin');
            sinon.stub(doUtilMock, 'getCurrentPlatform').callsFake(() => Promise.resolve(customPlatform || PRODUCTS.BIGIP));
            sinon.stub(doUtilMock, 'getBigIp').callsFake((callingLogger, options) => new Promise((resolve, reject) => {
                if (raiseUnhandledException) {
                    reject(new Error(raiseUnhandledException));
                } else {
                    const timeout = typeof customEndpointTimeout === 'undefined' ? 0 : (customEndpointTimeout + 1000);
                    setTimeout(resolve, timeout);
                }
            })
                .then(() => {
                    if (typeof targetHost !== 'undefined') {
                        assert.strictEqual(targetHost, options.host, 'targetHost should match options.host');
                    }
                    if (typeof targetPort !== 'undefined') {
                        assert.strictEqual(targetPort, options.port.toString(), 'targetPort should match options.port');
                    }
                    if (typeof targetUsername !== 'undefined') {
                        assert.strictEqual(targetUsername, options.user, 'targetUsername should match options.username');
                    }
                    if (typeof targetPassword !== 'undefined') {
                        assert.strictEqual(targetPassword, options.password, 'targetPassword should match options.password');
                    }
                    return Promise.resolve({});
                }));
            inspectHandler = new InspectHandler(undefined, '123-abc');
            customEndpointTimeout = undefined;
            customPlatform = undefined;
            customState = undefined;
            targetHost = undefined;
            targetPort = undefined;
            targetUsername = undefined;
            targetPassword = undefined;
            raiseUnhandledException = undefined;
        });

        describe('success response', () => {
            const basicAssertsForSuccessResponse = (data) => {
                basicInspectHandlerAsserts(data, 200, 'OK', '', []);
            };

            before(() => {
                expectedDeclaration = {
                    declaration: {
                        class: 'DO',
                        declaration: {
                            class: 'Device',
                            schemaVersion: SCHEMA_VERSION
                        }
                    }
                };
            });

            it('should get data', () => inspectHandler.process()
                .then((data) => basicAssertsForSuccessResponse(data)));

            it('should get data when targetHost specified', () => {
                targetHost = 'targethost';
                inspectHandler.queryParams = { targetHost };
                return inspectHandler.process()
                    .then((data) => basicAssertsForSuccessResponse(data));
            });

            it('should convert targetHost value to lower case', () => {
                inspectHandler.queryParams = { targetHost: 'targetHost' };
                targetHost = 'targethost';
                return inspectHandler.process()
                    .then((data) => basicAssertsForSuccessResponse(data));
            });

            it('should get data when platform is not BIGIP and target* specified', () => {
                customPlatform = PRODUCTS.BIGIQ;
                targetHost = 'targethost';
                targetPort = '12345';
                targetUsername = 'targetUsername';
                targetPassword = 'targetPassword';
                inspectHandler.queryParams = {
                    targetHost,
                    targetPort,
                    targetUsername,
                    targetPassword
                };
                return inspectHandler.process()
                    .then((data) => basicAssertsForSuccessResponse(data));
            });

            it('should get data when all target* params specified', () => {
                targetHost = 'targethost';
                targetPort = '12345';
                targetUsername = 'targetUsername';
                targetPassword = 'targetPassword';
                inspectHandler.queryParams = {
                    targetHost,
                    targetPort,
                    targetUsername,
                    targetPassword
                };
                return inspectHandler.process()
                    .then((data) => basicAssertsForSuccessResponse(data));
            });
        });

        describe('error response', () => {
            const basicAssertsForFailedResponse = (data, code, message, errors) => {
                basicInspectHandlerAsserts(data, code, 'ERROR', message, errors);
            };

            before(() => {
                expectedDeclaration = {};
            });

            /* eslint-disable-next-line func-names */
            it('should fail when request timeout exceeded', function () {
                const logSevereSpy = sinon.spy(Logger.prototype, 'severe');

                this.retries(0);
                this.timeout('2s');

                customEndpointTimeout = 500;
                inspectHandler.processTimeout = customEndpointTimeout;

                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            408,
                            'Request Timeout',
                            (errMsg) => errMsg.indexOf('Unable to complete request within specified timeout') !== -1
                        );
                        assert.strictEqual(
                            logSevereSpy.args[0][0],
                            'Error processing Inspect request: Unable to complete request within specified timeout (0.5s.)'
                        );
                        assert.strictEqual(logSevereSpy.thisValues[0].metadata, 'inspectHandler.js | 123-abc');
                    });
            });

            it('should fail when caught unhandled exception', () => {
                raiseUnhandledException = 'raiseUnhandledException';
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 500, 'failed', (errMsg) => errMsg === raiseUnhandledException);
                    });
            });

            it('should fail when invalid type of query parameter', () => {
                const invalidParam = 'targetHost';
                inspectHandler.queryParams = {
                    [invalidParam]: [invalidParam]
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('Invalid value for parameter') !== -1
                                        && errMsg.indexOf('targetHost') !== -1
                        );
                    });
            });

            it('should fail when targetPort is not a valid number', () => {
                inspectHandler.queryParams = {
                    targetPort: 'notNumber'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('should be in range') !== -1
                                && errMsg.indexOf('targetPort') !== -1
                        );
                    });
            });

            it('should fail when targetPort is out of allowed range', () => {
                inspectHandler.queryParams = {
                    targetPort: '-10'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('should be in range') !== -1
                                && errMsg.indexOf('targetPort') !== -1
                        );
                    });
            });

            it('should fail when targetPort is out of allowed range one more time', () => {
                inspectHandler.queryParams = {
                    targetPort: '999999'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('should be in range') !== -1
                                && errMsg.indexOf('targetPort') !== -1
                        );
                    });
            });

            it('should fail when targetHost is not specified', () => {
                inspectHandler.queryParams = {
                    targetPort: '12345',
                    targetUsername: 'targetUsername',
                    targetPassword: 'targetPassword'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('should be specified') !== -1
                                && errMsg.indexOf('targetHost') !== -1
                        );
                    });
            });

            it('should contain errors for all invalid parameters', () => {
                inspectHandler.queryParams = {
                    targetPort: '-1',
                    targetUsername: ['targetUsername'],
                    targetPassword: 'targetPassword'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            400,
                            'Bad Request',
                            (errMsg) => errMsg.indexOf('Invalid value for parameter') !== -1
                                && errMsg.indexOf('should be in range') !== -1
                                && errMsg.indexOf('should be specified') !== -1
                        );
                    });
            });

            it('should fail when platform is not BIG-IP and target* is not specified', () => {
                customPlatform = PRODUCTS.BIGIQ;
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            403,
                            'Forbidden',
                            (errMsg) => errMsg === 'Should be executed on BIG-IP or should specify "target*" parameters.'
                        );
                    });
            });

            it('should fail when declaration is invalid', () => {
                customState = {
                    originalConfig: {
                        parsed: true,
                        Common: {
                            RouteDomain: {
                                0: {}
                            }
                        }
                    }
                };
                expectedDeclaration = {
                    declaration: {
                        class: 'DO',
                        declaration: {
                            class: 'Device',
                            schemaVersion: SCHEMA_VERSION,
                            Common: {
                                class: 'Tenant',
                                0: {
                                    class: 'RouteDomain'
                                }
                            }
                        }
                    }
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(
                            data,
                            412,
                            'Precondition failed',
                            (errMsg) => errMsg === 'Unable to verify declaration from existing state.'
                        );
                    });
            });
        });
    });

    describe('declaration verification', () => {
        let listResponses;
        let failWhenNoPropertyInResponse;
        let missedProperties;

        const addMissedProperty = function (uri, property) {
            missedProperties[uri] = missedProperties[uri] || {};
            if (missedProperties[uri][property] !== false) {
                missedProperties[uri][property] = true;
            }
        };
        const removeMissedProperty = function (uri, property) {
            missedProperties[uri] = missedProperties[uri] || {};
            missedProperties[uri][property] = false;
        };
        const verifyMissedProperties = function () {
            const missed = [];
            Object.keys(missedProperties).forEach((uri) => {
                const props = missedProperties[uri];
                Object.keys(props).forEach((prop) => {
                    if (props[prop]) {
                        missed.push(`${uri}::${prop}`);
                    }
                });
            });

            if (missed.length > 0) {
                throw new Error(`These properties have no response data: ${JSON.stringify(missed)}`);
            }
        };

        const pathsToIgnore = configItems.filter((item) => item.declaration === false).map((item) => item.path);
        const deviceName = 'device1';
        const hostname = 'myhost.bigip.com';
        const version = '15.1';
        const bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname, version });
            },
            list(path) {
                if (!path) {
                    return Promise.resolve();
                }

                // The path name here does not have a domain, but does include
                // a query. listResponses are set up with just the pathname part.
                const parsedURL = URL.parse(path, 'https://foo');
                const response = listResponses[parsedURL.pathname];
                let $select = parsedURL.query ? parsedURL.query.$select : undefined;

                if (pathsToIgnore.indexOf(parsedURL.pathname) === -1) {
                    assert.notStrictEqual(response, undefined, `Should have response data for '${parsedURL.pathname}' in listResponses`);
                }
                if (typeof response === 'undefined' || typeof $select === 'undefined') {
                    return Promise.resolve(response || {});
                }
                // ideally 'select' should contain all configItem.properties
                $select = $select.split(',');
                const selectData = (data) => {
                    // copy to avoid modifications
                    data = JSON.parse(JSON.stringify(data));
                    const ret = {};
                    if (typeof data.name !== 'undefined') {
                        ret.name = data.name;
                    }
                    $select.forEach((key) => {
                        if (key !== 'name' && failWhenNoPropertyInResponse) {
                            if (typeof data[key] === 'undefined') {
                                addMissedProperty(parsedURL.pathname, key);
                            } else {
                                removeMissedProperty(parsedURL.pathname, key);
                            }
                        }
                        ret[key] = data[key];
                    });
                    return ret;
                };
                return Promise.resolve(Array.isArray(response) ? response.map(selectData) : selectData(response));
            }
        };

        // NOTE: should be updated everytime when configItems.json changed
        const defaultResponses = () => ({
            '/tm/sys/global-settings': {
                hostname,
                consoleInactivityTimeout: 0,
                guiAudit: 'disabled',
                mgmtDhcp: 'enabled',
                guiSecurityBanner: 'enabled',
                guiSecurityBannerText: 'This is the gui security banner text.',
                usernamePrompt: 'Username',
                passwordPrompt: 'Password'
            },
            '/tm/cli/global-settings': {
                idleTimeout: 'disabled',
                audit: 'enabled'
            },
            '/tm/sys/software/update': {
                autoCheck: 'enabled',
                autoPhonehome: 'disabled'
            },
            '/tm/sys/provision': [
                { name: 'afm', level: 'nominal' },
                { name: 'am', level: 'minimum' },
                { name: 'apm', level: 'nominal' },
                { name: 'asm', level: 'minimum' },
                { name: 'avr', level: 'nominal' },
                { name: 'cgnat', level: 'minimum' },
                { name: 'dos', level: 'minimum' },
                { name: 'fps', level: 'nominal' },
                { name: 'gtm', level: 'minimum' },
                { name: 'ilx', level: 'nominal' },
                { name: 'lc', level: 'minimum' },
                { name: 'ltm', level: 'nominal' },
                { name: 'pem', level: 'minimum' },
                { name: 'swg', level: 'nominal' },
                { name: 'sslo', level: 'minimum' },
                { name: 'urldb', level: 'minimum' }
            ],
            '/tm/sys/ntp': {
                servers: ['server1', 'server2'],
                timezone: 'utc'
            },
            '/tm/sys/dns': {
                nameServers: ['172.27.1.1'],
                search: ['localhost']
            },
            '/tm/net/dns-resolver': [
                {
                    name: 'testDnsResolver',
                    answerDefaultZones: 'no',
                    cacheSize: 5767168,
                    forwardZones: [
                        {
                            name: 'amazonaws.com',
                            nameservers: [
                                {
                                    name: '192.0.2.13:53'
                                },
                                {
                                    name: '192.0.2.14:53'
                                }
                            ]
                        },
                        {
                            name: 'idservice.net',
                            nameservers: [
                                {
                                    name: '192.0.2.12:53'
                                },
                                {
                                    name: '192.0.2.15:53'
                                }
                            ]
                        }
                    ],
                    randomizeQueryNameCase: 'yes',
                    routeDomain: 0,
                    useIpv4: 'yes',
                    useIpv6: 'yes',
                    useTcp: 'yes',
                    useUdp: 'yes'
                }
            ],
            '/tm/net/trunk': [
                {
                    name: 'testTrunk',
                    distributionHash: 'dst-mac',
                    interfaces: [],
                    lacp: 'disabled',
                    lacpMode: 'active',
                    lacpTimeout: 'long',
                    linkSelectPolicy: 'auto',
                    qinqEthertype: '0x8100',
                    stp: 'enabled'
                }
            ],
            '/tm/net/vlan': [
                {
                    name: 'internalVlan',
                    mtu: 1500,
                    tag: 4094,
                    interfacesReference: {
                        link: 'https://localhost/mgmt/tm/net/vlan/~Common~internalVlan/interfaces'
                    },
                    autoLasthop: 'disabled',
                    cmpHash: 'default',
                    failsafe: 'enabled',
                    failsafeAction: 'reboot',
                    failsafeTimeout: 3600
                },
                {
                    name: 'externalVlan',
                    mtu: 1500,
                    tag: 4094,
                    interfacesReference: {
                        link: 'https://localhost/mgmt/tm/net/vlan/~Common~externalVlan/interfaces'
                    },
                    autoLasthop: 'default',
                    cmpHash: 'src-ip',
                    failsafe: 'disabled',
                    failsafeAction: 'failover-restart-tm',
                    failsafeTimeout: 90
                }
            ],
            '/tm/net/vlan/~Common~externalVlan/interfaces': [
                { name: '1.1', tagged: true },
                { name: '1.2', tagged: false }
            ],
            '/tm/net/vlan/~Common~internalVlan/interfaces': [
                { name: '2.1', tagged: true },
                { name: '2.2', tagged: false }
            ],
            '/tm/net/self': [
                {
                    name: 'internalSelfIp',
                    address: '10.0.0.2/24',
                    vlan: '/Common/internalVlan',
                    trafficGroup: '/Common/traffic-group-local-only',
                    allowService: 'none',
                    fwEnforcedPolicy: '/Common/currentFirewallPolicy'
                },
                {
                    name: 'externalSelfIp',
                    address: '192.0.2.30/24',
                    vlan: '/Common/externalVlan',
                    trafficGroup: '/Common/traffic-group-local-only',
                    allowService: 'none',
                    fwStagedPolicy: '/Common/currentFirewallPolicy'
                }
            ],
            '/tm/net/route': [
                {
                    name: 'testRoute1',
                    gw: '10.0.0.11',
                    network: '20.0.0.0/24',
                    mtu: 0,
                    partition: 'Common'
                },
                {
                    name: 'testRoute2',
                    gw: '192.0.2.11',
                    network: '30.0.0.0/24',
                    mtu: 0,
                    partition: 'Common'
                },
                {
                    name: 'testRoute3',
                    tmInterface: '/Common/tunnel',
                    network: '192.0.2.16/32',
                    mtu: 0,
                    partition: 'LOCAL_ONLY'
                }
            ],
            '/tm/net/routing/as-path': [
                {
                    name: 'exampleAsPath',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/as-path/~Common~exampleAsPath/entries?ver=14.1.2'
                    }
                }
            ],
            '/tm/net/routing/access-list': [
                {
                    name: 'exampleAccessList',
                    description: 'my description',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/access-list/~Common~exampleAccessList/entries?ver=14.1.2'
                    }
                }
            ],
            '/tm/net/routing/access-list/~Common~exampleAccessList/entries': [
                {
                    name: 20,
                    action: 'permit',
                    source: '10.3.3.0/24',
                    exactMatch: 'disabled',
                    destination: '10.4.4.0/24'
                },
                {
                    name: 30,
                    action: 'deny',
                    source: '1111:2222:3333:4444::/64',
                    exactMatch: 'enabled',
                    destination: '1111:2222:3333:5555::/64'
                }
            ],
            '/tm/net/routing/as-path/~Common~exampleAsPath/entries': [
                {
                    name: '10',
                    action: 'permit',
                    regex: '^$'
                },
                {
                    name: '15',
                    action: 'permit',
                    regex: '^123'
                }
            ],
            '/tm/net/routing/prefix-list': [
                {
                    name: 'examplePrefixList',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/prefix-list/~Common~examplePrefixList/entries?ver=14.1.2'
                    },
                    routeDomain: 'testRouteDomain'
                }
            ],
            '/tm/net/routing/prefix-list/~Common~examplePrefixList/entries': [
                {
                    name: '20',
                    action: 'permit',
                    prefix: '10.3.3.0/24',
                    prefixLenRange: '30:32'
                },
                {
                    name: '30',
                    action: 'deny',
                    prefix: '1111:2222:3333:4444::/64',
                    prefixLenRange: '24:28'
                }
            ],
            '/tm/net/routing/route-map': [
                {
                    name: 'exampleRouteMap',
                    routeDomain: '/Common/one',
                    entriesReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~exampleRouteMap/entries?ver=14.1.2'
                    }
                }
            ],
            '/tm/net/routing/route-map/~Common~exampleRouteMap/entries': [
                {
                    name: 44,
                    action: 'permit',
                    match: {
                        asPath: '/Common/aspath',
                        ipv4: {
                            address: {
                                prefixList: '/Common/prefixlist1'
                            },
                            nextHop: {
                                prefixList: '/Common/prefixlist2'
                            }
                        },
                        ipv6: {
                            address: {
                                prefixList: '/Common/prefixlist3'
                            },
                            nextHop: {
                                prefixList: '/Common/prefixlist4'
                            }
                        }
                    }
                }
            ],
            '/tm/net/routing/bgp': [
                {
                    name: 'exampleBGP',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            redistribute: [
                                {
                                    name: 'kernel',
                                    routeMap: '/Common/routeMap1',
                                    routeMapReference: {
                                        link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~exampleBGP?ver=14.1.2'
                                    }
                                }
                            ]
                        }
                    ],
                    gracefulRestart: {
                        gracefulReset: 'enabled',
                        restartTime: 120,
                        stalepathTime: 0
                    },
                    holdTime: 35,
                    keepAlive: 10,
                    localAs: 65010,
                    neighborReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/bgp/~Common~exampleBGP/neighbor?ver=14.1.2'
                    },
                    peerGroupReference: {
                        link: 'https://localhost/mgmt/tm/net/routing/bgp/~Common~exampleBGP/peer-group?ver=14.1.2'
                    },
                    routerId: '10.1.1.1',
                    routeDomain: '/Common/4'
                }
            ],
            '/tm/net/routing/bgp/~Common~exampleBGP/neighbor': [
                {
                    name: '10.1.1.2',
                    addressFamily: [
                        {
                            name: 'ipv4',
                            asOverride: 'enabled'
                        }
                    ],
                    ebgpMultihop: 2,
                    peerGroup: 'Neighbor_IN',
                    unwanted: 1
                }
            ],
            '/tm/net/routing/bgp/~Common~exampleBGP/peer-group': [
                {
                    name: 'Neighbor_IN',
                    remoteAs: 65020,
                    addressFamily: [
                        {
                            name: 'ipv4',
                            routeMap: {
                                in: '/Common/routeMapIn',
                                inReference: {
                                    link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMapIn?ver=14.1.2'
                                },
                                out: '/Common/routeMapOut',
                                outReference: {
                                    link: 'https://localhost/mgmt/tm/net/routing/route-map/~Common~routeMapOut?ver=14.1.2'
                                }
                            },
                            softReconfigurationInbound: 'enabled',
                            unwantedProperty: 2
                        },
                        {
                            name: 'ipv6',
                            routeMap: {},
                            unwantedProperty: 3
                        }
                    ],
                    unwantedProperty: 4
                }
            ],
            '/tm/cm/device': [{ name: deviceName, hostname, version }],
            [`/tm/cm/device/~Common~${deviceName}`]: {
                configsyncIp: '10.0.0.2',
                mirrorIp: '10.0.0.2',
                mirrorSecondaryIp: '192.0.2.30',
                unicastAddress: [{ ip: '10.0.0.2', port: 1026 }],
                multicastInterface: 'exampleInterface',
                multicastIp: '192.0.2.16',
                multicastPort: 12
            },
            '/tm/analytics/global-settings': {
                avrdDebugMode: 'disabled',
                avrdInterval: 300,
                offboxTcpAddresses: ['127.0.0.1'],
                offboxProtocol: 'tcp',
                offboxTcpPort: 6514,
                useOffbox: 'enabled',
                sourceId: 'souceId',
                tenantId: 'tenantId'
            },
            '/tm/sys/management-ip': [
                {
                    name: '192.0.2.16/5',
                    description: 'configured-statically by DO'
                }
            ],
            '/tm/sys/management-route': [
                {
                    name: 'mgmt-route-forward',
                    fullPath: '/Common/mgmt-route-forward',
                    description: 'Example description 0',
                    network: '255.255.255.254/32',
                    mtu: 0,
                    type: 'interface'
                },
                {
                    name: 'default-mgmt-route',
                    fullPath: '/Common/default-mgmt-route',
                    description: 'Example description 1',
                    gateway: '192.168.1.1',
                    network: 'default',
                    mtu: 0
                }
            ],
            '/tm/net/route-domain': [
                {
                    name: '0',
                    id: 0,
                    bwcPolicy: 'bwcPolicy',
                    connectionLimit: 0,
                    flowEvictionPolicy: 'flowEvictionPolicy',
                    fwEnforcedPolicy: 'fwEnforcedPolicy',
                    fwStagedPolicy: 'fwStagedPolicy',
                    ipIntelligencePolicy: 'ipIntelligencePolicy',
                    securityNatPolicy: 'securityNatPolicy',
                    servicePolicy: 'servicePolicy',
                    strict: 'enabled',
                    routingProtocol: ['BFD'],
                    vlans: ['/Common/http-tunnel', '/Common/socks-tunnel', '/Common/internal']
                },
                {
                    name: 'rd1',
                    id: 1,
                    parent: '/Common/rd0',
                    bwcPolicy: 'bwcPolicy',
                    connectionLimit: 0,
                    flowEvictionPolicy: 'flowEvictionPolicy',
                    fwEnforcedPolicy: 'fwEnforcedPolicy',
                    fwStagedPolicy: 'fwStagedPolicy',
                    ipIntelligencePolicy: 'ipIntelligencePolicy',
                    securityNatPolicy: 'securityNatPolicy',
                    servicePolicy: 'servicePolicy',
                    strict: 'enabled',
                    routingProtocol: ['BFD'],
                    vlans: ['/Common/http-tunnel', '/Common/socks-tunnel', '/Common/internal']
                }
            ],
            '/tm/sys/syslog': {
                remoteServers: [
                    {
                        name: '/Common/remotesyslog1',
                        host: '255.255.255.254',
                        localIp: 'none',
                        remotePort: 5146
                    },
                    {
                        name: '/Common/remotesyslog2',
                        host: '255.255.255.254',
                        localIp: '127.0.0.1',
                        remotePort: 5146
                    }
                ]
            },
            '/tm/sys/snmp': {
                sysContact: 'me@me.com',
                sysLocation: 'F5 Tower',
                allowedAddresses: [
                    '192.0.2.16/32'
                ],
                bigipTraps: 'enabled',
                authTrap: 'disabled',
                agentTrap: 'enabled',
                snmpv1: 'enable',
                snmpv2c: 'enable'
            },
            '/tm/sys/snmp/users': [
                {
                    name: '/Common/mySnmpUser',
                    username: 'my!SnmpUser',
                    access: 'ro',
                    oidSubset: 'oidSubset',
                    authPassword: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                    authProtocol: 'sha',
                    privacyPassword: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                    privacyProtocol: 'aes'
                }
            ],
            '/tm/sys/snmp/communities': [
                {
                    name: '/Common/mySnmpCommunity',
                    ipv6: 'enabled',
                    communityName: 'my!community',
                    access: 'ro',
                    source: 'my community source',
                    oidSubset: '.2'
                }
            ],
            '/tm/sys/snmp/traps': [
                {
                    name: '/Common/otherTrapDestination',
                    version: '3',
                    host: '192.0.2.16',
                    port: 8080,
                    authPassword: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                    authProtocol: 'sha',
                    privacyPassword: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                    privacyProtocol: 'aes',
                    network: 'other',
                    community: 'communityName',
                    securityName: 'someSnmpUser',
                    engineId: '0x80001f8880c6b6067fdacfb558'
                },
                {
                    name: '/Common/other256ProtocolSnmpTrapDestination',
                    version: '3',
                    host: '192.0.2.16',
                    port: 8080,
                    authPassword: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                    authProtocol: 'sha256',
                    privacyPassword: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                    privacyProtocol: 'aes256',
                    network: 'other',
                    community: 'communityName',
                    securityName: 'someSnmpUser256',
                    engineId: '0x80001f8880c6b6067fdacfb558'
                },
                {
                    name: '/Common/mgmtTrapDestination',
                    version: '3',
                    host: '192.0.2.16',
                    port: 8080,
                    authPassword: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                    authProtocol: 'sha',
                    privacyPassword: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                    privacyProtocol: 'aes',
                    network: 'mgmt',
                    community: 'communityName',
                    securityName: 'someSnmpUser',
                    engineId: '0x80001f8880c6b6067fdacfb558'
                }

            ],
            '/tm/auth/remote-user': {
                defaultPartition: 'Common',
                defaultRole: 'no-access',
                remoteConsoleAccess: 'disabled'
            },
            '/tm/auth/source': {
                fallback: 'false',
                type: 'local'
            },
            '/tm/auth/remote-role/role-info': [
                {
                    name: '/Common/remoteAuthRoleTest',
                    attribute: 'testAttrString',
                    console: 'tmsh',
                    deny: 'disabled',
                    lineOrder: 999,
                    role: 'operator',
                    userPartition: 'All'
                }
            ],
            '/tm/auth/password-policy': {
                expirationWarning: 7,
                lockoutDuration: 99999,
                maxDuration: 99999,
                maxLoginFailures: 0,
                minDuration: 0,
                minimumLength: 6,
                passwordMemory: 0,
                policyEnforcement: 'enabled',
                requiredLowercase: 0,
                requiredNumeric: 0,
                requiredSpecial: 0,
                requiredUppercase: 0
            },
            '/tm/auth/radius': {
                name: 'system-auth',
                serviceType: 'authenticate-only'
            },
            '/tm/auth/radius-server': [
                {
                    name: 'system_auth_name1',
                    port: 1812,
                    server: '127.0.0.1',
                    secret: 'secret'
                },
                {
                    name: 'system_auth_name2',
                    port: 1812,
                    server: '192.0.2.32',
                    secret: 'secret'
                }
            ],
            '/tm/auth/ldap': {
                name: 'system-auth',
                bindDn: 'testDn',
                bindPw: 'binSecret',
                bindTimeout: 30,
                checkHostAttr: 'disabled',
                checkRolesGroup: 'disabled',
                filter: 'filterString',
                groupDn: 'groupDn',
                groupMemberAttribute: 'groupMemberAttribute',
                idleTimeout: 3600,
                ignoreAuthInfoUnavail: 'no',
                ignoreUnknownUser: 'disabled',
                loginAttribute: 'loginAttribute',
                port: 636,
                referrals: 'no',
                scope: 'sub',
                searchBaseDn: 'testTree',
                searchTimeout: 30,
                servers: [
                    '127.0.0.1'
                ],
                ssl: 'enabled',
                sslCaCertFile: '/Common/do_ldapCaCert.crt',
                sslCaCertFileReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~do_ldapCaCert.crt'
                },
                sslCheckPeer: true,
                sslCiphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-CBC-SHA',
                    'ECDHE-RSA-AES128-SHA256'
                ],
                sslClientCert: '/Common/do_ldapClientCert.crt',
                sslClientCertReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.crt'
                },
                sslClientKey: '/Common/do_ldapClientCert.crt',
                sslClientKeyReference: {
                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~do_ldapClientCert.key'
                },
                userTemplate: '%s',
                version: 3
            },
            '/tm/sys/file/ssl-cert/~Common~externalVlan/~Common~do_ldapCaCert.crt': {
                name: 'do_ldapCaCert.crt',
                partition: 'Common',
                checksum: 'SHA1:1704:a652cb34061c27d5343a742b1587f6211740fe10'
            },
            '/tm/sys/file/ssl-cert/~Common~externalVlan/~Common~do_ldapClientCert.crt': {
                name: 'do_ldapClientCert.crt',
                partition: 'Common',
                checksum: 'SHA1:1912:794e6068c6ef2c289ff33c694d1dae29a2c762df'
            },
            '/tm/sys/file/ssl-cert/~Common~externalVlan/~Common~do_ldapClientCert.key': {
                name: 'do_ldapClientCert.key',
                partition: 'Common',
                checksum: 'SHA1:1338:476e9a0bb565da46935a96d26e02ee13ca99c455'
            },
            '/tm/auth/tacacs': [
                {
                    name: 'system-auth',
                    accounting: 'send-to-first-server',
                    authentication: 'use-first-server',
                    debug: 'disabled',
                    encryption: 'enabled',
                    protocol: 'http',
                    secret: 'secret',
                    servers: [
                        'test.test',
                        'test.test2'
                    ],
                    service: 'system'
                }
            ],
            '/tm/net/dag-globals': {
                dagIpv6PrefixLen: 100,
                icmpHash: 'ipicmp',
                roundRobinMode: 'local'
            },
            '/tm/ltm/global-settings/traffic-control': {
                acceptIpOptions: 'disabled',
                acceptIpSourceRoute: 'disabled',
                allowIpSourceRoute: 'disabled',
                continueMatching: 'disabled',
                maxIcmpRate: 100,
                maxRejectRate: 250,
                maxRejectRateTimeout: 30,
                minPathMtu: 296,
                pathMtuDiscovery: 'enabled',
                portFindLinear: 16,
                portFindRandom: 16,
                portFindThresholdWarning: 'enabled',
                portFindThresholdTrigger: 8,
                portFindThresholdTimeout: 30,
                rejectUnmatched: 'enabled'
            },
            '/tm/sys/httpd': {
                allow: ['All'],
                authPamIdleTimeout: 1200,
                maxClients: 10,
                sslCiphersuite: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA:AES128-SHA256:AES256-SHA256',
                sslProtocol: 'all -SSLv2 -SSLv3 -TLSv1'
            },
            '/tm/sys/sshd': {
                allow: ['All'],
                banner: 'enabled',
                bannerText: 'This is the banner text',
                inactivityTimeout: 10000,
                include: 'Ciphers aes128-ctr,aes256-ctr\nLoginGraceTime 10\nMACs hmac-sha1\nMaxAuthTries 5\nMaxStartups 3\nProtocol 1\n'
            },
            '/tm/net/tunnels/tunnel': [
                {
                    name: 'tunnel',
                    description: 'this is my tunnel',
                    mtu: 0,
                    profile: '/Common/tcp-forward',
                    tos: 'preserve',
                    usePmtu: 'enabled',
                    autoLasthop: 'default',
                    localAddress: 'any6',
                    remoteAddress: 'any6',
                    secondaryAddress: 'any6',
                    key: 0,
                    mode: 'bidirectional',
                    transparent: 'disabled',
                    trafficGroup: 'none'
                },
                {
                    name: 'tunnelVxlan',
                    description: 'this is my vxlan tunnel',
                    mtu: 0,
                    profile: '/Common/tunnelVxlan_vxlan',
                    tos: 'preserve',
                    usePmtu: 'enabled',
                    autoLasthop: 'default',
                    localAddress: 'any6',
                    remoteAddress: 'any6',
                    secondaryAddress: '192.0.2.31',
                    key: 0,
                    mode: 'bidirectional',
                    transparent: 'disabled',
                    trafficGroup: 'none'
                }
            ],
            '/tm/net/tunnels/vxlan': [
                {
                    name: 'tunnelVxlan_vxlan',
                    description: 'this is a vxlan tunnel profile',
                    appService: 'none',
                    defaultsFrom: '/Common/vxlan-ovsdb',
                    encapsulationType: 'vxlan',
                    floodingType: 'replicator',
                    port: 256
                },
                {
                    name: 'vxlan',
                    encapsulationType: 'vxlan',
                    floodingType: 'multicast',
                    port: 4789
                }
            ],
            '/tm/sys/disk/directory': {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        130985984       -               \n\n'
                }
            },
            '/tm/gtm/global-settings/general': {
                synchronization: 'no',
                synchronizationGroupName: 'newGroup',
                synchronizationTimeTolerance: 123,
                synchronizationTimeout: 12345,
                synchronizeZoneFiles: 'yes'
            },
            '/tm/gtm/datacenter': [
                {
                    name: 'currentDataCenter',
                    description: 'description',
                    contact: 'contact',
                    enabled: true,
                    location: 'location',
                    proberFallback: 'any-available',
                    proberPool: '/Common/proberPool',
                    proberPreference: 'pool'
                }
            ],
            '/tm/gtm/server': [
                {
                    name: 'currentGSLBServer',
                    description: 'description',
                    disabled: true,
                    enabled: false,
                    product: 'generic-host',
                    proberPreference: 'pool',
                    proberFallback: 'outside-datacenter',
                    proberPool: '/Common/testProberPool',
                    limitMaxBps: 1,
                    limitMaxBpsStatus: 'enabled',
                    limitMaxPps: 10,
                    limitMaxPpsStatus: 'enabled',
                    limitMaxConnections: 100,
                    limitMaxConnectionsStatus: 'enabled',
                    limitCpuUsage: 1000,
                    limitCpuUsageStatus: 'enabled',
                    limitMemAvail: 10000,
                    limitMemAvailStatus: 'enabled',
                    iqAllowServiceCheck: 'no',
                    iqAllowPath: 'no',
                    iqAllowSnmp: 'no',
                    datacenter: '/Common/testDataCenter',
                    devicesReference: {
                        link: 'https://localhost/mgmt/tm/gtm/server/~Common~currentGSLBServer/devices'
                    },
                    virtualServersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/server/~Common~currentGSLBServer/virtual-servers'
                    },
                    exposeRouteDomains: 'yes',
                    virtualServerDiscovery: 'enabled',
                    monitor: '/Common/http and /Common/http_head_f5'
                }
            ],
            '/tm/gtm/server/~Common~currentGSLBServer/devices': [
                {
                    name: '0',
                    description: 'deviceDescription1',
                    addresses: [
                        {
                            name: '10.0.0.1',
                            translation: '192.0.2.12'
                        }
                    ]
                },
                {
                    name: '1',
                    description: 'deviceDescription2',
                    addresses: [
                        {
                            name: '10.0.0.2',
                            translation: '192.0.2.13'
                        }
                    ]
                }
            ],
            '/tm/gtm/server/~Common~currentGSLBServer/virtual-servers': [
                {
                    name: 'virtualServer1',
                    description: 'virtual server description one',
                    destination: '192.0.2.20:443',
                    enabled: false,
                    disabled: true,
                    translationAddress: '10.10.0.10',
                    translationPort: 23,
                    monitor: '/Common/bigip and /Common/tcp'
                },
                {
                    name: 'virtualServer2',
                    destination: 'a989:1c34:9c::b099:c1c7:8bfe.0',
                    enabled: true,
                    translationAddress: 'none',
                    translationPort: 0
                }
            ],
            '/tm/gtm/monitor/http': [
                {
                    kind: 'tm:gtm:monitor:http:httpstate',
                    name: 'currentGSLBMonitorHTTP',
                    partition: 'Common',
                    fullPath: '/Common/currentGSLBMonitorHTTP',
                    generation: 0,
                    selfLink: 'https://localhost/mgmt/tm/gtm/monitor/http/~Common~currentGSLBMonitorHTTP?ver=15.1.2',
                    defaultsFrom: '/Common/http',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    interval: 100,
                    probeTimeout: 110,
                    recv: 'HTTP',
                    reverse: 'enabled',
                    send: 'HEAD / HTTP/1.0\\r\\n',
                    timeout: 1000,
                    transparent: 'enabled'
                }
            ],
            '/tm/gtm/monitor/https': [
                {
                    kind: 'tm:gtm:monitor:https:httpsstate',
                    name: 'currentGSLBMonitorHTTPS',
                    partition: 'Common',
                    fullPath: '/Common/currentGSLBMonitorHTTPS',
                    generation: 0,
                    selfLink: 'https://localhost/mgmt/tm/gtm/monitor/https/~Common~currentGSLBMonitorHTTPS?ver=15.1.2',
                    cipherlist: 'DEFAULT',
                    cert: '/Common/cert',
                    defaultsFrom: '/Common/https',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    interval: 100,
                    probeTimeout: 110,
                    recv: 'HTTP',
                    reverse: 'enabled',
                    send: 'HEAD / HTTP/1.0\\r\\n',
                    timeout: 1000,
                    transparent: 'enabled'
                }
            ],
            '/tm/gtm/monitor/gateway-icmp': [
                {
                    kind: 'tm:gtm:monitor:gateway-icmp:gateway-icmpstate',
                    name: 'currentGSLBMonitorICMP',
                    partition: 'Common',
                    fullPath: '/Common/currentGSLBMonitorICMP',
                    generation: 0,
                    selfLink: 'https://localhost/mgmt/tm/gtm/monitor/gateway-icmp/~Common~currentGSLBMonitorICMP?ver=15.1.2',
                    defaultsFrom: '/Common/gateway-icmp',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    interval: 100,
                    probeAttempts: 3,
                    probeInterval: 1,
                    probeTimeout: 110,
                    timeout: 1000,
                    transparent: 'enabled'
                }
            ],
            '/tm/gtm/monitor/tcp': [
                {
                    kind: 'tm:gtm:monitor:tcp:tcpstate',
                    name: 'currentGSLBMonitorTCP',
                    partition: 'Common',
                    fullPath: '/Common/currentGSLBMonitorTCP',
                    generation: 0,
                    selfLink: 'https://localhost/mgmt/tm/gtm/monitor/tcp/~Common~currentGSLBMonitorTCP?ver=15.1.2',
                    defaultsFrom: '/Common/tcp',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    interval: 100,
                    probeTimeout: 110,
                    recv: '',
                    reverse: 'enabled',
                    send: '',
                    timeout: 1000,
                    transparent: 'enabled'
                }
            ],
            '/tm/gtm/monitor/udp': [
                {
                    kind: 'tm:gtm:monitor:udp:udpstate',
                    name: 'currentGSLBMonitorUDP',
                    partition: 'Common',
                    fullPath: '/Common/currentGSLBMonitorUDP',
                    generation: 0,
                    selfLink: 'https://localhost/mgmt/tm/gtm/monitor/udp/~Common~currentGSLBMonitorUDP?ver=15.1.2',
                    debug: 'no',
                    defaultsFrom: '/Common/udp',
                    description: 'description',
                    destination: '192.0.2.10:80',
                    ignoreDownResponse: 'enabled',
                    interval: 100,
                    probeAttempts: 3,
                    probeInterval: 1,
                    probeTimeout: 110,
                    recv: '',
                    reverse: 'enabled',
                    send: 'default send string',
                    timeout: 1000,
                    transparent: 'enabled'
                }
            ],
            '/tm/gtm/prober-pool': [
                {
                    name: 'currentGSLBProberPool',
                    description: 'description',
                    disabled: true,
                    enabled: false,
                    loadBalancingMode: 'round-robin',
                    membersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/prober-pool/~Common~currentGSLBProberPool/members'
                    }
                },
                {
                    name: 'currentGSLBProberPoolNoMembers',
                    loadBalancingMode: 'global-availability',
                    membersReference: {
                        link: 'https://localhost/mgmt/tm/gtm/prober-pool/~Common~currentGSLBProberPoolNoMembers/members'
                    }
                }
            ],
            '/tm/gtm/prober-pool/~Common~currentGSLBProberPool/members': [
                {
                    name: '/Common/serverOne',
                    description: 'member description one',
                    disabled: true,
                    enabled: false,
                    order: 0
                },
                {
                    name: '/Common/serverTwo',
                    description: 'member description two',
                    disabled: false,
                    enabled: true,
                    order: 1
                }
            ],
            '/tm/gtm/prober-pool/~Common~currentGSLBProberPoolNoMembers/members': [],
            '/tm/security/firewall/address-list': [
                {
                    name: 'currentFirewallAddressList',
                    description: 'firewall address list description',
                    fullPath: '/Common/currentFirewallAddressList',
                    addresses: [
                        {
                            name: '10.1.0.1'
                        },
                        {
                            name: '10.2.0.0/24'
                        }
                    ],
                    fqdns: [
                        {
                            name: 'www.example.com'
                        }
                    ],
                    geo: [
                        {
                            name: 'US:Washington'
                        }
                    ]
                }
            ],
            '/tm/security/firewall/port-list': [
                {
                    name: '_sys_self_allow_tcp_defaults',
                    fullPath: '/Common/_sys_self_allow_tcp_defaults',
                    port: [
                        {
                            name: '22'
                        },
                        {
                            name: '53'
                        },
                        {
                            name: '161'
                        },
                        {
                            name: '443'
                        },
                        {
                            name: '1029-1043'
                        },
                        {
                            name: '4353'
                        }
                    ]
                },
                {
                    name: '_sys_self_allow_udp_defaults',
                    fullPath: '/Common/_sys_self_allow_udp_defaults',
                    ports: [
                        {
                            name: '53'
                        },
                        {
                            name: '161'
                        },
                        {
                            name: '520'
                        },
                        {
                            name: '1026'
                        },
                        {
                            name: '4353'
                        }
                    ]
                },
                {
                    name: 'currentFirewallPortList',
                    description: 'firewall port list description',
                    fullPath: '/Common/currentFirewallPortList',
                    ports: [
                        {
                            name: '8080'
                        },
                        {
                            name: '8888'
                        }
                    ]
                }
            ],
            '/tm/security/firewall/policy': [
                {
                    name: 'currentFirewallPolicy',
                    description: 'firewall policy description',
                    fullPath: '/Common/currentFirewallPolicy',
                    rulesReference: {
                        link: 'https://localhost/mgmt/tm/security/firewall/policy/~Common~currentFirewallPolicy/rules'
                    }
                },
                {
                    name: 'currentFirewallPolicyNoRules',
                    fullPath: '/Common/currentFirewallPolicyNoRules',
                    rulesReference: {
                        link: 'https://localhost/mgmt/tm/security/firewall/policy/~Common~currentFirewallPolicyNoRules/rules'
                    }
                }
            ],
            '/tm/security/firewall/policy/~Common~currentFirewallPolicy/rules': [
                {
                    name: 'firewallPolicyRuleOne',
                    description: 'firewall policy rule one description',
                    action: 'accept',
                    ipProtocol: 'any',
                    log: 'no',
                    source: {
                        identity: {}
                    },
                    destination: {}
                },
                {
                    name: 'firewallPolicyRuleTwo',
                    description: 'firewall policy rule two description',
                    action: 'reject',
                    ipProtocol: 'tcp',
                    log: 'yes',
                    source: {
                        identity: {},
                        vlans: [
                            '/Common/vlan1',
                            '/Common/vlan2'
                        ],
                        addressLists: [
                            '/Common/myAddressList1',
                            '/Common/myAddressList2'
                        ],
                        portLists: [
                            '/Common/myPortList1',
                            '/Common/myPortList2'
                        ]
                    },
                    destination: {
                        addressLists: [
                            '/Common/myAddressList1',
                            '/Common/myAddressList2'
                        ],
                        portLists: [
                            '/Common/myPortList1',
                            '/Common/myPortList2'
                        ]
                    }
                }
            ],
            '/tm/security/firewall/policy/~Common~currentFirewallPolicyNoRules/rules': [],
            '/tm/security/firewall/management-ip-rules': {
                description: 'management IP firewall description',
                rulesReference: {
                    link: 'https://localhost/mgmt/tm/security/firewall/management-ip-rules/rules'
                }
            },
            '/tm/net/address-list': [
                {
                    name: 'currentNetAddressList',
                    description: 'net address list description',
                    fullPath: '/Common/currentNetAddressList',
                    addresses: [
                        {
                            name: '10.1.1.1'
                        },
                        {
                            name: '10.2.1.0/24'
                        }
                    ]
                }
            ],
            '/tm/net/port-list': [
                {
                    name: 'currentNetPortList',
                    description: 'net port list description',
                    fullPath: '/Common/currentNetPortList',
                    ports: [
                        {
                            name: '8081'
                        },
                        {
                            name: '8889'
                        }
                    ]
                }
            ],
            '/tm/security/firewall/management-ip-rules/rules': [
                {
                    name: 'firewallRuleOne',
                    description: 'firewall rule one description',
                    action: 'accept',
                    ipProtocol: 'any',
                    log: 'no',
                    source: {
                        identity: {}
                    },
                    destination: {}
                },
                {
                    name: 'firewallRuleTwo',
                    description: 'firewall rule two description',
                    action: 'reject',
                    ipProtocol: 'tcp',
                    log: 'yes',
                    source: {
                        identity: {},
                        addressLists: [
                            '/Common/currentNetAddressList',
                            '/Common/currentNetAddressList1'
                        ],
                        portLists: [
                            '/Common/currentNetPortList',
                            '/Common/currentNetPortList1'
                        ]
                    },
                    destination: {
                        addressLists: [
                            '/Common/currentNetAddressList',
                            '/Common/currentNetAddressList1'
                        ],
                        portLists: [
                            '/Common/currentNetPortList',
                            '/Common/currentNetPortList1'
                        ]
                    }
                }
            ],
            '/tm/security/analytics/settings': {
                aclRules: {
                    collectClientIp: 'enabled',
                    collectClientPort: 'disabled',
                    collectDestIp: 'enabled',
                    collectDestPort: 'enabled',
                    collectServerSideStats: 'disabled'
                },
                collectAllDosStatistic: 'disabled',
                collectedStatsExternalLogging: 'disabled',
                collectedStatsInternalLogging: 'disabled',
                dns: {
                    collectClientIp: 'enabled',
                    collectDestinationIp: 'enabled'
                },
                dnsCollectStats: 'enabled',
                dosL2L4: {
                    collectClientIp: 'enabled',
                    collectDestGeo: 'enabled'
                },
                dosl3CollectStats: 'enabled',
                fwAclCollectStats: 'enabled',
                fwDropsCollectStats: 'enabled',
                ipReputationCollectStats: 'enabled',
                l3L4Errors: {
                    collectClientIp: 'enabled',
                    collectDestIp: 'enabled'
                },
                sipCollectStats: 'enabled',
                staleRules: {
                    collect: 'disabled'
                },
                publisher: 'none',
                smtpConfig: 'none'
            },
            '/tm/asm/virus-detection-server': {
                guaranteeEnforcement: false,
                hostname: 'do.test',
                port: 123
            },
            '/tm/asm/advanced-settings': [
                {
                    id: 'id0',
                    name: 'policy_history_max_total_size',
                    value: 1000,
                    format: 'integer'
                },
                {
                    id: 'id1',
                    name: 'max_json_policy_size',
                    value: 1000,
                    format: 'integer'
                }
            ]
        });

        // PURPOSE: to be sure that all properties (we are expecting) are here
        // NOTE: should be updated everytime when configItems.json changed
        const referenceDeclaration = {
            declaration: {
                class: 'DO',
                declaration: {
                    class: 'Device',
                    schemaVersion: SCHEMA_VERSION,
                    Common: {
                        class: 'Tenant',
                        currentProvision: {
                            afm: 'nominal',
                            am: 'minimum',
                            apm: 'nominal',
                            asm: 'minimum',
                            avr: 'nominal',
                            cgnat: 'minimum',
                            dos: 'minimum',
                            fps: 'nominal',
                            gtm: 'minimum',
                            ilx: 'nominal',
                            lc: 'minimum',
                            ltm: 'nominal',
                            pem: 'minimum',
                            swg: 'nominal',
                            urldb: 'minimum',
                            class: 'Provision'
                        },
                        currentNTP: {
                            servers: ['server1', 'server2'],
                            timezone: 'utc',
                            class: 'NTP'
                        },
                        currentDagGlobals: {
                            class: 'DagGlobals',
                            ipv6PrefixLength: 100,
                            icmpHash: 'ipicmp',
                            roundRobinMode: 'local'
                        },
                        currentDNS: {
                            nameServers: ['172.27.1.1'],
                            search: ['localhost'],
                            class: 'DNS'
                        },
                        testDnsResolver: {
                            answerDefaultZones: false,
                            cacheSize: 5767168,
                            forwardZones: [
                                {
                                    name: 'amazonaws.com',
                                    nameservers: [
                                        '192.0.2.13:53',
                                        '192.0.2.14:53'
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        '192.0.2.12:53',
                                        '192.0.2.15:53'
                                    ]
                                }
                            ],
                            randomizeQueryNameCase: true,
                            routeDomain: 0,
                            useIpv4: true,
                            useIpv6: true,
                            useTcp: true,
                            useUdp: true,
                            class: 'DNS_Resolver'
                        },
                        testTrunk: {
                            distributionHash: 'dst-mac',
                            interfaces: [],
                            lacpMode: 'active',
                            lacpTimeout: 'long',
                            linkSelectPolicy: 'auto',
                            lacpEnabled: false,
                            qinqEthertype: '0x8100',
                            spanningTreeEnabled: true,
                            class: 'Trunk'
                        },
                        internalVlan: {
                            mtu: 1500,
                            tag: 4094,
                            interfaces: [
                                { name: '2.1', tagged: true },
                                { name: '2.2', tagged: false }
                            ],
                            class: 'VLAN',
                            autoLastHop: 'disabled',
                            cmpHash: 'default',
                            failsafeEnabled: true,
                            failsafeAction: 'reboot',
                            failsafeTimeout: 3600
                        },
                        externalVlan: {
                            mtu: 1500,
                            tag: 4094,
                            interfaces: [
                                { name: '1.1', tagged: true },
                                { name: '1.2', tagged: false }
                            ],
                            class: 'VLAN',
                            autoLastHop: 'default',
                            cmpHash: 'src-ip',
                            failsafeEnabled: false,
                            failsafeAction: 'failover-restart-tm',
                            failsafeTimeout: 90
                        },
                        internalSelfIp: {
                            enforcedFirewallPolicy: 'currentFirewallPolicy',
                            address: '10.0.0.2/24',
                            vlan: 'internalVlan',
                            trafficGroup: 'traffic-group-local-only',
                            allowService: 'none',
                            class: 'SelfIp'
                        },
                        externalSelfIp: {
                            stagedFirewallPolicy: 'currentFirewallPolicy',
                            address: '192.0.2.30/24',
                            vlan: 'externalVlan',
                            trafficGroup: 'traffic-group-local-only',
                            allowService: 'none',
                            class: 'SelfIp'
                        },
                        testRoute1: {
                            gw: '10.0.0.11',
                            network: '20.0.0.0/24',
                            mtu: 0,
                            class: 'Route'
                        },
                        testRoute2: {
                            gw: '192.0.2.11',
                            network: '30.0.0.0/24',
                            mtu: 0,
                            class: 'Route'
                        },
                        testRoute3: {
                            target: 'tunnel',
                            network: '192.0.2.16/32',
                            mtu: 0,
                            class: 'Route',
                            localOnly: true
                        },
                        exampleAccessList: {
                            class: 'RoutingAccessList',
                            remark: 'my description',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    source: '10.3.3.0/24',
                                    exactMatchEnabled: false,
                                    destination: '10.4.4.0/24'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    source: '1111:2222:3333:4444::/64',
                                    exactMatchEnabled: true,
                                    destination: '1111:2222:3333:5555::/64'
                                }
                            ]
                        },
                        exampleAsPath: {
                            class: 'RoutingAsPath',
                            entries: [
                                {
                                    name: 10,
                                    regex: '^$'
                                },
                                {
                                    name: 15,
                                    regex: '^123'
                                }
                            ]
                        },
                        examplePrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: '30:32'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444::/64',
                                    prefixLengthRange: '24:28'
                                }
                            ],
                            routeDomain: 'testRouteDomain'
                        },
                        exampleRouteMap: {
                            class: 'RouteMap',
                            entries: [
                                {
                                    name: 44,
                                    action: 'permit',
                                    match: {
                                        asPath: '/Common/aspath',
                                        ipv4: {
                                            address: {
                                                prefixList: '/Common/prefixlist1'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixlist2'
                                            }
                                        },
                                        ipv6: {
                                            address: {
                                                prefixList: '/Common/prefixlist3'
                                            },
                                            nextHop: {
                                                prefixList: '/Common/prefixlist4'
                                            }
                                        }
                                    }
                                }
                            ],
                            routeDomain: 'one'
                        },
                        exampleBGP: {
                            class: 'RoutingBGP',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    redistributionList: [
                                        {
                                            routingProtocol: 'kernel',
                                            routeMap: '/Common/routeMap1'
                                        }
                                    ]
                                }
                            ],
                            gracefulRestart: {
                                gracefulResetEnabled: true,
                                restartTime: 120,
                                stalePathTime: 0
                            },
                            holdTime: 35,
                            keepAlive: 10,
                            localAS: 65010,
                            neighbors: [
                                {
                                    address: '10.1.1.2',
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            asOverrideEnabled: true
                                        }
                                    ],
                                    ebgpMultihop: 2,
                                    peerGroup: 'Neighbor_IN'
                                }
                            ],
                            peerGroups: [
                                {
                                    name: 'Neighbor_IN',
                                    remoteAS: 65020,
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            routeMap: {
                                                in: '/Common/routeMapIn',
                                                out: '/Common/routeMapOut'
                                            },
                                            softReconfigurationInboundEnabled: true
                                        },
                                        {
                                            internetProtocol: 'ipv6',
                                            routeMap: {},
                                            softReconfigurationInboundEnabled: false
                                        }
                                    ]
                                }
                            ],
                            routerId: '10.1.1.1',
                            routeDomain: '4'
                        },
                        currentConfigSync: {
                            configsyncIp: '10.0.0.2',
                            class: 'ConfigSync'
                        },
                        currentFailoverUnicast: {
                            addressPorts: [
                                {
                                    address: '10.0.0.2',
                                    port: 1026
                                }
                            ],
                            class: 'FailoverUnicast'
                        },
                        currentFailoverMulticast: {
                            interface: 'exampleInterface',
                            address: '192.0.2.16',
                            port: 12,
                            class: 'FailoverMulticast'
                        },
                        currentAnalytics: {
                            offboxProtocol: 'tcp',
                            offboxTcpAddresses: ['127.0.0.1'],
                            offboxTcpPort: 6514,
                            sourceId: 'souceId',
                            tenantId: 'tenantId',
                            class: 'Analytics',
                            debugEnabled: false,
                            interval: 300,
                            offboxEnabled: true
                        },
                        currentManagementIp: {
                            class: 'ManagementIp',
                            address: '192.0.2.16/5',
                            remark: 'configured-statically by DO'
                        },
                        'default-mgmt-route': {
                            class: 'ManagementRoute',
                            remark: 'Example description 1',
                            gw: '192.168.1.1',
                            mtu: 0,
                            network: 'default'
                        },
                        'mgmt-route-forward': {
                            class: 'ManagementRoute',
                            remark: 'Example description 0',
                            mtu: 0,
                            network: '255.255.255.254/32',
                            type: 'interface'
                        },
                        rd0: {
                            bandWidthControllerPolicy: 'bwcPolicy',
                            class: 'RouteDomain',
                            connectionLimit: 0,
                            enforcedFirewallPolicy: 'fwEnforcedPolicy',
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            id: 0,
                            parent: 'none',
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            routingProtocols: ['BFD'],
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            stagedFirewallPolicy: 'fwStagedPolicy',
                            strict: true,
                            vlans: ['/Common/http-tunnel', '/Common/internal', '/Common/socks-tunnel']
                        },
                        rd1: {
                            bandWidthControllerPolicy: 'bwcPolicy',
                            class: 'RouteDomain',
                            connectionLimit: 0,
                            enforcedFirewallPolicy: 'fwEnforcedPolicy',
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            id: 1,
                            parent: 'rd0',
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            routingProtocols: ['BFD'],
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            stagedFirewallPolicy: 'fwStagedPolicy',
                            strict: true,
                            vlans: ['/Common/http-tunnel', '/Common/internal', '/Common/socks-tunnel']
                        },
                        mySnmpUser: {
                            class: 'SnmpUser',
                            name: 'my!SnmpUser',
                            access: 'ro',
                            oid: 'oidSubset',
                            authentication: {
                                password: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                                protocol: 'sha'
                            },
                            privacy: {
                                password: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                                protocol: 'aes'
                            }
                        },
                        currentSnmpAgent: {
                            class: 'SnmpAgent',
                            contact: 'me@me.com',
                            location: 'F5 Tower',
                            allowList: [
                                '192.0.2.16/32'
                            ],
                            snmpV1: true,
                            snmpV2c: true
                        },
                        currentSnmpTrapEvents: {
                            class: 'SnmpTrapEvents',
                            agentStartStop: true,
                            authentication: false,
                            device: true
                        },
                        otherTrapDestination: {
                            class: 'SnmpTrapDestination',
                            version: '3',
                            destination: '192.0.2.16',
                            community: 'communityName',
                            port: 8080,
                            network: 'other',
                            securityName: 'someSnmpUser',
                            authentication: {
                                password: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                                protocol: 'sha'
                            },
                            privacy: {
                                password: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                                protocol: 'aes'
                            },
                            engineId: '0x80001f8880c6b6067fdacfb558'
                        },
                        other256ProtocolSnmpTrapDestination: {
                            class: 'SnmpTrapDestination',
                            version: '3',
                            destination: '192.0.2.16',
                            community: 'communityName',
                            port: 8080,
                            network: 'other',
                            securityName: 'someSnmpUser256',
                            authentication: {
                                password: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                                protocol: 'sha256'
                            },
                            privacy: {
                                password: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                                protocol: 'aes256'
                            },
                            engineId: '0x80001f8880c6b6067fdacfb558'
                        },
                        mgmtTrapDestination: {
                            class: 'SnmpTrapDestination',
                            version: '3',
                            destination: '192.0.2.16',
                            community: 'communityName',
                            port: 8080,
                            network: 'management',
                            securityName: 'someSnmpUser',
                            authentication: {
                                password: '$M$4H$PXdpZO3Xd65xnMkC+F+mdQ==',
                                protocol: 'sha'
                            },
                            privacy: {
                                password: '$M$4H$PXdpZO5Ye44yzBkC+F+seH==',
                                protocol: 'aes'
                            },
                            engineId: '0x80001f8880c6b6067fdacfb558'
                        },
                        mySnmpCommunity: {
                            class: 'SnmpCommunity',
                            name: 'my!community',
                            ipv6: true,
                            oid: '.2',
                            source: 'my community source',
                            access: 'ro'
                        },
                        remotesyslog1: {
                            class: 'SyslogRemoteServer',
                            host: '255.255.255.254',
                            remotePort: 5146
                        },
                        remotesyslog2: {
                            class: 'SyslogRemoteServer',
                            host: '255.255.255.254',
                            localIp: '127.0.0.1',
                            remotePort: 5146
                        },
                        remoteAuthRoleTest: {
                            class: 'RemoteAuthRole',
                            attribute: 'testAttrString',
                            console: 'tmsh',
                            remoteAccess: true,
                            lineOrder: 999,
                            role: 'operator',
                            userPartition: 'all'
                        },
                        currentPasswordPolicy: {
                            class: 'PasswordPolicy',
                            expirationWarningDays: 7,
                            lockoutDurationSeconds: 99999,
                            maxDurationDays: 99999,
                            maxLoginFailures: 0,
                            minDurationDays: 0,
                            minLength: 6,
                            passwordMemory: 0,
                            policyEnforcementEnabled: true,
                            requiredLowercase: 0,
                            requiredNumeric: 0,
                            requiredSpecial: 0,
                            requiredUppercase: 0
                        },
                        currentAuthentication: {
                            class: 'Authentication',
                            enabledSourceType: 'local',
                            fallback: false,
                            remoteUsersDefaults: {
                                role: 'no-access',
                                partitionAccess: 'Common',
                                terminalAccess: 'disabled'
                            },
                            radius: {
                                serviceType: 'authenticate-only',
                                servers: {
                                    primary: {
                                        port: 1812,
                                        server: '127.0.0.1',
                                        secret: 'secret'
                                    },
                                    secondary: {
                                        port: 1812,
                                        server: '192.0.2.32',
                                        secret: 'secret'
                                    }
                                }
                            },
                            ldap: {
                                bindDn: 'testDn',
                                bindPassword: 'binSecret',
                                bindTimeout: 30,
                                checkBindPassword: false,
                                checkRemoteRole: false,
                                filter: 'filterString',
                                groupDn: 'groupDn',
                                groupMemberAttribute: 'groupMemberAttribute',
                                idleTimeout: 3600,
                                ignoreAuthInfoUnavailable: false,
                                ignoreUnknownUser: false,
                                loginAttribute: 'loginAttribute',
                                port: 636,
                                referrals: false,
                                searchScope: 'sub',
                                searchBaseDn: 'testTree',
                                searchTimeout: 30,
                                servers: [
                                    '127.0.0.1'
                                ],
                                ssl: 'enabled',
                                sslCheckPeer: false,
                                sslCiphers: [
                                    'ECDHE-RSA-AES128-GCM-SHA256',
                                    'ECDHE-RSA-AES128-CBC-SHA',
                                    'ECDHE-RSA-AES128-SHA256'
                                ],
                                userTemplate: '%s',
                                version: 3
                            },
                            tacacs: {
                                accounting: 'send-to-first-server',
                                authentication: 'use-first-server',
                                debug: false,
                                encryption: true,
                                protocol: 'http',
                                secret: 'secret',
                                servers: [
                                    'test.test',
                                    'test.test2'
                                ],
                                service: 'system'
                            }
                        },
                        currentSystem: {
                            class: 'System',
                            hostname: 'myhost.bigip.com',
                            consoleInactivityTimeout: 0,
                            cliInactivityTimeout: 0,
                            autoCheck: true,
                            autoPhonehome: false,
                            tmshAuditLog: true,
                            guiAuditLog: false,
                            preserveOrigDhcpRoutes: true,
                            mgmtDhcpEnabled: true,
                            guiSecurityBanner: true,
                            guiSecurityBannerText: 'This is the gui security banner text.',
                            usernamePrompt: 'Username',
                            passwordPrompt: 'Password'
                        },
                        currentTrafficControl: {
                            class: 'TrafficControl',
                            acceptIpOptions: false,
                            acceptIpSourceRoute: false,
                            allowIpSourceRoute: false,
                            continueMatching: false,
                            maxIcmpRate: 100,
                            maxPortFindLinear: 16,
                            maxPortFindRandom: 16,
                            maxRejectRate: 250,
                            maxRejectRateTimeout: 30,
                            minPathMtu: 296,
                            pathMtuDiscovery: true,
                            portFindThresholdWarning: true,
                            portFindThresholdTrigger: 8,
                            portFindThresholdTimeout: 30,
                            rejectUnmatched: true
                        },
                        currentHTTPD: {
                            class: 'HTTPD',
                            allow: ['all'],
                            authPamIdleTimeout: 1200,
                            maxClients: 10,
                            sslCiphersuite: [
                                'ECDHE-RSA-AES128-GCM-SHA256',
                                'ECDHE-RSA-AES256-GCM-SHA384',
                                'ECDHE-RSA-AES128-SHA',
                                'ECDHE-RSA-AES256-SHA',
                                'ECDHE-RSA-AES128-SHA256',
                                'ECDHE-RSA-AES256-SHA384',
                                'ECDHE-ECDSA-AES128-GCM-SHA256',
                                'ECDHE-ECDSA-AES256-GCM-SHA384',
                                'ECDHE-ECDSA-AES128-SHA',
                                'ECDHE-ECDSA-AES256-SHA',
                                'ECDHE-ECDSA-AES128-SHA256',
                                'ECDHE-ECDSA-AES256-SHA384',
                                'AES128-GCM-SHA256',
                                'AES256-GCM-SHA384',
                                'AES128-SHA',
                                'AES256-SHA',
                                'AES128-SHA256',
                                'AES256-SHA256'
                            ],
                            sslProtocol: 'all -SSLv2 -SSLv3 -TLSv1'
                        },
                        currentSSHD: {
                            class: 'SSHD',
                            allow: ['All'],
                            banner: 'This is the banner text',
                            inactivityTimeout: 10000,
                            ciphers: [
                                'aes128-ctr',
                                'aes256-ctr'
                            ],
                            MACS: [
                                'hmac-sha1'
                            ],
                            loginGraceTime: 10,
                            maxAuthTries: 5,
                            maxStartups: '3',
                            protocol: 1
                        },
                        tunnel: {
                            class: 'Tunnel',
                            remark: 'this is my tunnel',
                            tunnelType: 'tcp-forward',
                            mtu: 0,
                            usePmtu: true,
                            typeOfService: 'preserve',
                            autoLastHop: 'default',
                            transparent: false,
                            localAddress: 'any6',
                            remoteAddress: 'any6',
                            secondaryAddress: 'any6',
                            key: 0,
                            mode: 'bidirectional',
                            trafficGroup: 'none'
                        },
                        tunnelVxlan: {
                            class: 'Tunnel',
                            remark: 'this is my vxlan tunnel',
                            tunnelType: 'vxlan',
                            mtu: 0,
                            usePmtu: true,
                            typeOfService: 'preserve',
                            autoLastHop: 'default',
                            transparent: false,
                            localAddress: 'any6',
                            remoteAddress: 'any6',
                            secondaryAddress: '192.0.2.31',
                            key: 0,
                            mode: 'bidirectional',
                            trafficGroup: 'none',
                            defaultsFrom: 'vxlan-ovsdb',
                            port: 256,
                            floodingType: 'replicator',
                            encapsulationType: 'vxlan'
                        },
                        currentDisk: {
                            class: 'Disk',
                            applicationData: 130985984
                        },
                        currentMirrorIp: {
                            class: 'MirrorIp',
                            primaryIp: '10.0.0.2',
                            secondaryIp: '192.0.2.30'
                        },
                        currentGSLBGlobals: {
                            class: 'GSLBGlobals',
                            general: {
                                synchronizationEnabled: false,
                                synchronizationGroupName: 'newGroup',
                                synchronizationTimeTolerance: 123,
                                synchronizationTimeout: 12345,
                                synchronizeZoneFiles: true
                            }
                        },
                        currentDataCenter: {
                            class: 'GSLBDataCenter',
                            remark: 'description',
                            contact: 'contact',
                            enabled: true,
                            location: 'location',
                            proberFallback: 'any-available',
                            proberPool: 'proberPool',
                            proberPreferred: 'pool'
                        },
                        currentGSLBServer: {
                            class: 'GSLBServer',
                            remark: 'description',
                            enabled: false,
                            serverType: 'generic-host',
                            proberPreferred: 'pool',
                            proberFallback: 'outside-datacenter',
                            proberPool: 'testProberPool',
                            bpsLimit: 1,
                            bpsLimitEnabled: true,
                            ppsLimit: 10,
                            ppsLimitEnabled: true,
                            connectionsLimit: 100,
                            connectionsLimitEnabled: true,
                            cpuUsageLimit: 1000,
                            cpuUsageLimitEnabled: true,
                            memoryLimit: 10000,
                            memoryLimitEnabled: true,
                            serviceCheckProbeEnabled: false,
                            pathProbeEnabled: false,
                            snmpProbeEnabled: false,
                            dataCenter: 'testDataCenter',
                            devices: [
                                {
                                    address: '10.0.0.1',
                                    addressTranslation: '192.0.2.12',
                                    remark: 'deviceDescription1'
                                },
                                {
                                    address: '10.0.0.2',
                                    addressTranslation: '192.0.2.13',
                                    remark: 'deviceDescription2'
                                }
                            ],
                            exposeRouteDomainsEnabled: true,
                            virtualServerDiscoveryMode: 'enabled',
                            virtualServers: [
                                {
                                    name: 'virtualServer1',
                                    remark: 'virtual server description one',
                                    enabled: false,
                                    address: '192.0.2.20',
                                    port: 443,
                                    addressTranslation: '10.10.0.10',
                                    addressTranslationPort: 23,
                                    monitors: [
                                        '/Common/bigip',
                                        '/Common/tcp'
                                    ]
                                },
                                {
                                    name: 'virtualServer2',
                                    remark: 'none',
                                    enabled: true,
                                    address: 'a989:1c34:9c::b099:c1c7:8bfe',
                                    port: 0,
                                    addressTranslationPort: 0,
                                    monitors: []
                                }
                            ],
                            monitors: [
                                '/Common/http',
                                '/Common/http_head_f5'
                            ]
                        },
                        currentGSLBMonitorHTTP: {
                            class: 'GSLBMonitor',
                            remark: 'description',
                            monitorType: 'http',
                            target: '192.0.2.10:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true,
                            reverseEnabled: true,
                            send: 'HEAD / HTTP/1.0\\r\\n',
                            receive: 'HTTP'
                        },
                        currentGSLBMonitorHTTPS: {
                            class: 'GSLBMonitor',
                            remark: 'description',
                            monitorType: 'https',
                            target: '192.0.2.10:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true,
                            reverseEnabled: true,
                            send: 'HEAD / HTTP/1.0\\r\\n',
                            receive: 'HTTP',
                            ciphers: 'DEFAULT',
                            clientCertificate: 'cert'
                        },
                        currentGSLBMonitorICMP: {
                            class: 'GSLBMonitor',
                            remark: 'description',
                            monitorType: 'gateway-icmp',
                            target: '192.0.2.10:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true,
                            probeInterval: 1,
                            probeAttempts: 3
                        },
                        currentGSLBMonitorTCP: {
                            class: 'GSLBMonitor',
                            remark: 'description',
                            monitorType: 'tcp',
                            target: '192.0.2.10:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true,
                            reverseEnabled: true,
                            send: '',
                            receive: ''
                        },
                        currentGSLBMonitorUDP: {
                            class: 'GSLBMonitor',
                            remark: 'description',
                            monitorType: 'udp',
                            target: '192.0.2.10:80',
                            interval: 100,
                            timeout: 1000,
                            probeTimeout: 110,
                            ignoreDownResponseEnabled: true,
                            transparent: true,
                            reverseEnabled: true,
                            send: 'default send string',
                            receive: '',
                            probeInterval: 1,
                            probeAttempts: 3,
                            debugEnabled: false
                        },
                        currentGSLBProberPool: {
                            class: 'GSLBProberPool',
                            remark: 'description',
                            enabled: false,
                            lbMode: 'round-robin',
                            members: [
                                {
                                    server: 'serverOne',
                                    remark: 'member description one',
                                    enabled: false
                                },
                                {
                                    server: 'serverTwo',
                                    remark: 'member description two',
                                    enabled: true
                                }
                            ]
                        },
                        currentGSLBProberPoolNoMembers: {
                            class: 'GSLBProberPool',
                            remark: 'none',
                            enabled: true,
                            lbMode: 'global-availability',
                            members: []
                        },
                        currentFirewallAddressList: {
                            class: 'FirewallAddressList',
                            remark: 'firewall address list description',
                            addresses: ['10.1.0.1', '10.2.0.0/24'],
                            fqdns: ['www.example.com'],
                            geo: ['US:Washington']
                        },
                        currentFirewallPortList: {
                            class: 'FirewallPortList',
                            remark: 'firewall port list description',
                            ports: ['8080', '8888']
                        },
                        currentFirewallPolicy: {
                            class: 'FirewallPolicy',
                            remark: 'firewall policy description',
                            rules: [
                                {
                                    name: 'firewallPolicyRuleOne',
                                    remark: 'firewall policy rule one description',
                                    action: 'accept',
                                    protocol: 'any',
                                    loggingEnabled: false,
                                    source: {},
                                    destination: {}
                                },
                                {
                                    name: 'firewallPolicyRuleTwo',
                                    remark: 'firewall policy rule two description',
                                    action: 'reject',
                                    protocol: 'tcp',
                                    loggingEnabled: true,
                                    source: {
                                        vlans: [
                                            '/Common/vlan1',
                                            '/Common/vlan2'
                                        ],
                                        addressLists: [
                                            '/Common/myAddressList1',
                                            '/Common/myAddressList2'
                                        ],
                                        portLists: [
                                            '/Common/myPortList1',
                                            '/Common/myPortList2'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/myAddressList1',
                                            '/Common/myAddressList2'
                                        ],
                                        portLists: [
                                            '/Common/myPortList1',
                                            '/Common/myPortList2'
                                        ]
                                    }
                                }
                            ]
                        },
                        currentFirewallPolicyNoRules: {
                            class: 'FirewallPolicy',
                            remark: 'none',
                            rules: []
                        },
                        currentNetAddressList: {
                            class: 'NetAddressList',
                            remark: 'net address list description',
                            addresses: ['10.1.1.1', '10.2.1.0/24']
                        },
                        currentNetPortList: {
                            class: 'NetPortList',
                            remark: 'net port list description',
                            ports: ['8081', '8889']
                        },
                        currentManagementIpFirewall: {
                            class: 'ManagementIpFirewall',
                            remark: 'management IP firewall description',
                            rules: [
                                {
                                    name: 'firewallRuleOne',
                                    remark: 'firewall rule one description',
                                    action: 'accept',
                                    protocol: 'any',
                                    loggingEnabled: false,
                                    source: {},
                                    destination: {}
                                },
                                {
                                    name: 'firewallRuleTwo',
                                    remark: 'firewall rule two description',
                                    action: 'reject',
                                    protocol: 'tcp',
                                    loggingEnabled: true,
                                    source: {
                                        addressLists: [
                                            '/Common/currentNetAddressList',
                                            '/Common/currentNetAddressList1'
                                        ],
                                        portLists: [
                                            '/Common/currentNetPortList',
                                            '/Common/currentNetPortList1'
                                        ]
                                    },
                                    destination: {
                                        addressLists: [
                                            '/Common/currentNetAddressList',
                                            '/Common/currentNetAddressList1'
                                        ],
                                        portLists: [
                                            '/Common/currentNetPortList',
                                            '/Common/currentNetPortList1'
                                        ]
                                    }
                                }
                            ]
                        },
                        currentSecurityAnalytics: {
                            class: 'SecurityAnalytics',
                            aclRules: {
                                collectClientIpEnabled: true,
                                collectClientPortEnabled: false,
                                collectDestinationIpEnabled: true,
                                collectDestinationPortEnabled: true,
                                collectServerSideStatsEnabled: false
                            },
                            collectAllDosStatsEnabled: false,
                            collectedStatsExternalLoggingEnabled: false,
                            collectedStatsInternalLoggingEnabled: false,
                            dns: {
                                collectClientIpEnabled: true,
                                collectDestinationIpEnabled: true
                            },
                            collectDnsStatsEnabled: true,
                            dosL2L4: {
                                collectClientIpEnabled: true,
                                collectDestinationGeoEnabled: true
                            },
                            collectDosL3StatsEnabled: true,
                            collectFirewallAclStatsEnabled: true,
                            collectFirewallDropsStatsEnabled: true,
                            collectIpReputationStatsEnabled: true,
                            l3L4Errors: {
                                collectClientIpEnabled: true,
                                collectDestinationIpEnabled: true
                            },
                            collectSipStatsEnabled: true,
                            collectStaleRulesEnabled: false,
                            publisher: 'none',
                            smtpConfig: 'none'
                        },
                        currentSecurityWaf: {
                            class: 'SecurityWaf',
                            antiVirusProtection: {
                                guaranteeEnforcementEnabled: false,
                                hostname: 'do.test',
                                port: 123
                            },
                            advancedSettings: [
                                {
                                    name: 'policy_history_max_total_size',
                                    value: 1000
                                },
                                {
                                    name: 'max_json_policy_size',
                                    value: 1000
                                }
                            ]
                        }
                    }
                }
            }
        };

        beforeEach(() => {
            sinon.stub(doUtilMock, 'getPrimaryAdminUser').resolves('admin');
            sinon.stub(doUtilMock, 'getBigIp').callsFake(() => Promise.resolve(bigIpMock));
            sinon.stub(doUtilMock, 'getCurrentPlatform').callsFake(() => Promise.resolve(PRODUCTS.BIGIP));
            // skip data asserts
            missedProperties = {};
            expectedDeclaration = undefined;
            failWhenNoPropertyInResponse = false;
            inspectHandler = new InspectHandler();
            listResponses = defaultResponses();
        });

        afterEach(() => {
            verifyMissedProperties();
        });

        it('should verify that all items from configItems.json are covered', () => {
            // this test is needed just to be sure we are not missing something fron configItems.json
            const nameless = {};
            const classes = {};
            const subProps = {};
            const missing = []; // array of arrays (paths)
            const declaration = referenceDeclaration.declaration.declaration.Common;

            configItems.forEach((item) => {
                if (item.declaration !== false) {
                    if (typeof item.schemaClass !== 'undefined' && item.properties.length > 0) {
                        classes[item.schemaClass] = true;
                        if (typeof item.schemaMerge !== 'undefined') {
                            subProps[item.schemaClass] = subProps[item.schemaClass] || [];
                            if (typeof item.schemaMerge.path !== 'undefined') {
                                subProps[item.schemaClass].push(item.schemaMerge.path);
                            }
                        }
                    }
                    if (typeof item.declaration !== 'undefined' && typeof item.declaration.name !== 'undefined') {
                        nameless[item.declaration.name] = true;
                    }
                }
            });
            Object.keys(nameless).forEach((key) => {
                if (typeof declaration[key] === 'undefined') {
                    missing.push(key);
                }
            });
            Object.keys(declaration).forEach((key) => {
                const item = declaration[key];
                if (typeof item.class === 'undefined') {
                    return;
                }
                if (classes[item.class] === true) {
                    delete classes[item.class];
                    if (Array.isArray(subProps[item.class])) {
                        subProps[item.class].forEach((path) => {
                            let tmpItem = item;
                            let fullPath = `${item.class}`;

                            for (let i = 0; i < path.length; i += 1) {
                                tmpItem = tmpItem[path[i]];
                                fullPath = `${fullPath}.${path[i]}`;
                                if (typeof tmpItem === 'undefined') {
                                    missing.push(fullPath);
                                    break;
                                }
                            }
                        });
                    }
                }
            });
            Object.keys(classes).forEach((key) => missing.push(key));
            assert.deepStrictEqual(missing, [], `Should have coverage for following classes/properties - ${missing.join(', ')}`);
        });

        it('should verify declaration from response', () => {
            failWhenNoPropertyInResponse = true;
            return inspectHandler.process()
                .then((data) => {
                    expectedDeclaration = referenceDeclaration;
                    basicInspectHandlerAsserts(data, 200, 'OK', '', []);
                });
        });

        it('should fail when several objects share the same name', () => {
            const sharedName = 'sharedName';
            listResponses['/tm/net/self'].push({
                name: sharedName,
                address: '192.0.2.30/24',
                vlan: '/Common/externalVlan',
                trafficGroup: '/Common/traffic-group-local-only',
                allowService: 'none'
            });
            listResponses['/tm/net/route'].push({
                name: sharedName,
                gw: '10.0.0.2',
                network: '255.255.255.254/32',
                mtu: 0,
                partition: 'Common'
            });
            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 409, 'ERROR', 'Conflict', (errMsg) => /contains INVALID items/.test(errMsg));

                    assert.notStrictEqual(data.declaration, undefined, 'Should have "declaration" key');
                    const commonTenant = data.declaration.declaration.Common;
                    assert.notStrictEqual(commonTenant, undefined, 'Should have Common tenant');
                    [1, 2].forEach((idx) => {
                        const key = `${sharedName}_INVALID_${idx}`;
                        assert.notStrictEqual(commonTenant[key], undefined, `Should have key ${key}`);
                    });
                });
        });

        it('should remove "none" from Analytics', () => {
            listResponses['/tm/analytics/global-settings'] = {
                avrdDebugMode: 'disabled',
                avrdInterval: 300,
                offboxProtocol: 'none',
                useOffbox: 'false'
            };
            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 200, 'OK', '', []);
                    // check Analytics data
                    assert.strictEqual(data.declaration.declaration.Common.currentAnalytics.offboxProtocol, undefined, 'Should have no "offboxProtocol" property');
                });
        });

        it('should convert System cliInactivityTimeout to seconds (int)', () => {
            listResponses['/tm/cli/global-settings'] = {
                idleTimeout: 60
            };
            listResponses['/tm/sys/global-settings'] = {
                hostname,
                consoleInactivityTimeout: 60
            };
            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 200, 'OK', '', []);
                    // check System data
                    assert.strictEqual(data.declaration.declaration.Common.currentSystem.cliInactivityTimeout, 3600);
                    assert.strictEqual(data.declaration.declaration.Common.currentSystem.consoleInactivityTimeout, 60);
                });
        });

        it('should convert System cliInactivityTimeout to seconds (string)', () => {
            listResponses['/tm/cli/global-settings'] = {
                idleTimeout: '60'
            };
            listResponses['/tm/sys/global-settings'] = {
                hostname,
                consoleInactivityTimeout: 60
            };
            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 200, 'OK', '', []);
                    // check System data
                    assert.strictEqual(data.declaration.declaration.Common.currentSystem.cliInactivityTimeout, 3600);
                    assert.strictEqual(data.declaration.declaration.Common.currentSystem.consoleInactivityTimeout, 60);
                });
        });

        it('should return valid declaration when API returns almost empty config', () => {
            // API response almost similar to what freshly deployed BIG-IP returns
            // in addition test also checks customFunctions
            // erase all endpoints
            Object.keys(listResponses).forEach((key) => {
                listResponses[key] = Array.isArray(listResponses[key]) ? [] : {};
            });
            // set endpoints which returns info in any case
            Object.assign(listResponses, {
                '/tm/sys/global-settings': { hostname },
                '/tm/sys/provision': [
                    { name: 'avr', level: 'nominal' }
                ],
                '/tm/cm/device': [{ name: deviceName, hostname }],
                [`/tm/cm/device/~Common~${deviceName}`]: {
                    configsyncIp: 'none'
                },
                '/tm/auth/radius': {
                    type: 'local'
                },
                '/tm/security/firewall/management-ip-rules': {
                    rulesReference: {
                        link: 'https://localhost/mgmt/tm/security/firewall/management-ip-rules/rules'
                    }
                }
            });

            expectedDeclaration = {
                declaration: {
                    class: 'DO',
                    declaration: {
                        class: 'Device',
                        schemaVersion: SCHEMA_VERSION,
                        Common: {
                            class: 'Tenant',
                            currentProvision: {
                                avr: 'nominal',
                                class: 'Provision'
                            },
                            currentNTP: {
                                class: 'NTP'
                            },
                            currentDagGlobals: {
                                class: 'DagGlobals'
                            },
                            currentDNS: {
                                class: 'DNS'
                            },
                            currentConfigSync: {
                                configsyncIp: 'none',
                                class: 'ConfigSync'
                            },
                            currentAnalytics: {
                                class: 'Analytics',
                                debugEnabled: false,
                                offboxEnabled: false,
                                offboxTcpAddresses: [],
                                offboxTcpPort: 0,
                                sourceId: 'none',
                                tenantId: 'default'
                            },
                            currentPasswordPolicy: {
                                class: 'PasswordPolicy',
                                policyEnforcementEnabled: false
                            },
                            currentAuthentication: {
                                class: 'Authentication',
                                fallback: false,
                                remoteUsersDefaults: {}
                            },
                            currentSnmpAgent: {
                                class: 'SnmpAgent',
                                allowList: [],
                                contact: '',
                                location: '',
                                snmpV1: false,
                                snmpV2c: false
                            },
                            currentSnmpTrapEvents: {
                                class: 'SnmpTrapEvents',
                                agentStartStop: false,
                                authentication: false,
                                device: false
                            },
                            currentTrafficControl: {
                                class: 'TrafficControl',
                                acceptIpOptions: false,
                                acceptIpSourceRoute: false,
                                allowIpSourceRoute: false,
                                continueMatching: false,
                                pathMtuDiscovery: false,
                                portFindThresholdWarning: false,
                                rejectUnmatched: false
                            },
                            currentSystem: {
                                class: 'System',
                                hostname: 'myhost.bigip.com',
                                preserveOrigDhcpRoutes: false
                            },
                            currentHTTPD: {
                                class: 'HTTPD',
                                allow: 'none'
                            },
                            currentSSHD: {
                                class: 'SSHD'
                            },
                            currentDisk: {
                                class: 'Disk'
                            },
                            currentMirrorIp: {
                                class: 'MirrorIp'
                            },
                            currentFailoverMulticast: {
                                class: 'FailoverMulticast',
                                address: 'any6',
                                interface: 'none',
                                port: 0
                            },
                            currentManagementIpFirewall: {
                                class: 'ManagementIpFirewall',
                                remark: 'none',
                                rules: []
                            }
                        }
                    }
                }
            };

            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 200, 'OK', '', []);
                });
        });
    });
});
