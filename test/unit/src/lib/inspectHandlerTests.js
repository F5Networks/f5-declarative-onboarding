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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');
const URL = require('url');

const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const SCHEMA_VERSION = require('../../../../src/schema/latest/base.schema.json').properties.schemaVersion.enum[0];

const configItems = require('../../../../src/lib/configItems.json');
const ConfigManagerMock = require('../../../../src/lib/configManager');
const doUtilMock = require('../../../../src/lib/doUtil');
const InspectHandler = require('../../../../src/lib/inspectHandler');


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

    after(() => {
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

        before(() => {
            sinon.stub(ConfigManagerMock.prototype, 'get').callsFake((decl, state) => {
                if (customState) {
                    Object.assign(state, customState);
                }
                return Promise.resolve({});
            });
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
                        assert.strictEqual(targetUsername, options.username, 'targetUsername should match options.username');
                    }
                    if (typeof targetPassword !== 'undefined') {
                        assert.strictEqual(targetPassword, options.password, 'targetPassword should match options.password');
                    }
                    return Promise.resolve({});
                }));
        });

        beforeEach(() => {
            inspectHandler = new InspectHandler();
            customEndpointTimeout = undefined;
            customPlatform = undefined;
            customState = undefined;
            targetHost = undefined;
            targetPort = undefined;
            targetUsername = undefined;
            targetPassword = undefined;
            raiseUnhandledException = undefined;
        });

        after(() => {
            sinon.restore();
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
                .then(data => basicAssertsForSuccessResponse(data)));

            it('should get data when targetHost specified', () => {
                targetHost = 'targethost';
                inspectHandler.queryParams = { targetHost };
                return inspectHandler.process()
                    .then(data => basicAssertsForSuccessResponse(data));
            });

            it('should convert targetHost value to lower case', () => {
                inspectHandler.queryParams = { targetHost: 'targetHost' };
                targetHost = 'targethost';
                return inspectHandler.process()
                    .then(data => basicAssertsForSuccessResponse(data));
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
                    .then(data => basicAssertsForSuccessResponse(data));
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
                    .then(data => basicAssertsForSuccessResponse(data));
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
                this.retries(0);
                this.timeout('2s');

                customEndpointTimeout = 500;
                inspectHandler.processTimeout = customEndpointTimeout;

                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 408, 'Request Timeout',
                            errMsg => errMsg.indexOf('Unable to complete request within specified timeout') !== -1);
                    });
            });

            it('should fail when caught unhandled exception', () => {
                raiseUnhandledException = 'raiseUnhandledException';
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 500, 'failed', errMsg => errMsg === raiseUnhandledException);
                    });
            });

            it('should fail when invalid type of query parameter', () => {
                const invalidParam = 'targetHost';
                inspectHandler.queryParams = {
                    [invalidParam]: [invalidParam]
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('Invalid value for parameter') !== -1
                                        && errMsg.indexOf('targetHost') !== -1);
                    });
            });

            it('should fail when targetPort is not a valid number', () => {
                inspectHandler.queryParams = {
                    targetPort: 'notNumber'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('should be in range') !== -1
                                        && errMsg.indexOf('targetPort') !== -1);
                    });
            });

            it('should fail when targetPort is out of allowed range', () => {
                inspectHandler.queryParams = {
                    targetPort: '-10'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('should be in range') !== -1
                                        && errMsg.indexOf('targetPort') !== -1);
                    });
            });

            it('should fail when targetPort is out of allowed range one more time', () => {
                inspectHandler.queryParams = {
                    targetPort: '999999'
                };
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('should be in range') !== -1
                                        && errMsg.indexOf('targetPort') !== -1);
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
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('should be specified') !== -1
                                    && errMsg.indexOf('targetHost') !== -1);
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
                        basicAssertsForFailedResponse(data, 400, 'Bad Request',
                            errMsg => errMsg.indexOf('Invalid value for parameter') !== -1
                                        && errMsg.indexOf('should be in range') !== -1
                                        && errMsg.indexOf('should be specified') !== -1);
                    });
            });

            it('should fail when platform is not BIG-IP and target* is not specified', () => {
                customPlatform = PRODUCTS.BIGIQ;
                return inspectHandler.process()
                    .then((data) => {
                        basicAssertsForFailedResponse(data, 403, 'Forbidden',
                            errMsg => errMsg === 'Should be executed on BIG-IP or should specify "target*" parameters.');
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
                        basicAssertsForFailedResponse(data, 412, 'Precondition failed',
                            errMsg => errMsg === 'Unable to verify declaration from existing state.');
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

        const pathsToIgnore = configItems.filter(item => item.declaration === false).map(item => item.path);
        const deviceName = 'device1';
        const hostname = 'myhost.bigip.com';
        const bigIpMock = {
            deviceInfo() {
                return Promise.resolve({ hostname });
            },
            list(path) {
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
                guiAudit: 'disabled'
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
                                    name: '8.8.8.8:53'
                                },
                                {
                                    name: '8.8.8.7:53'
                                }
                            ]
                        },
                        {
                            name: 'idservice.net',
                            nameservers: [
                                {
                                    name: '8.8.4.4:53'
                                },
                                {
                                    name: '8.8.4.3:53'
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
                    allowService: 'none'
                },
                {
                    name: 'externalSelfIp',
                    address: '11.0.0.2/24',
                    vlan: '/Common/externalVlan',
                    trafficGroup: '/Common/traffic-group-local-only',
                    allowService: 'none'
                }
            ],
            '/tm/net/route': [
                {
                    name: 'testRoute1',
                    gw: '10.0.0.11',
                    network: '20.0.0.0/24',
                    mtu: 0
                },
                {
                    name: 'testRoute2',
                    gw: '11.0.0.11',
                    network: '30.0.0.0/24',
                    mtu: 0
                },
                {
                    name: 'testRoute3',
                    interface: '/Common/tunnel',
                    network: '1.2.3.4/32',
                    mtu: 0
                }
            ],
            '/tm/cm/device': [{ name: deviceName, hostname }],
            [`/tm/cm/device/~Common~${deviceName}`]: {
                configsyncIp: '10.0.0.2',
                unicastAddress: [{ ip: '10.0.0.2', port: 1026 }]
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
            '/tm/sys/management-route': [
                {
                    name: 'mgmt-route-forward',
                    gateway: '10.0.0.2',
                    network: '255.255.255.254/32',
                    type: 'blackhole',
                    mtu: 0
                },
                {
                    name: 'default-mgmt-route',
                    gateway: '192.168.1.1',
                    network: 'default',
                    type: 'interface',
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
                    '1.2.3.4/32'
                ],
                bigipTraps: 'enabled',
                authTrap: 'disabled',
                agentTrap: 'enabled'
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
                    host: '1.2.3.4',
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
                    name: '/Common/mgmtTrapDestination',
                    version: '3',
                    host: '1.2.3.4',
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
                    server: '127.0.0.2',
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
                scope: 'sub',
                searchBaseDn: 'testTree',
                searchTimeout: 30,
                servers: [
                    '127.0.0.1'
                ],
                ssl: 'enabled',
                sslCheckPeer: true,
                sslCiphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-CBC-SHA',
                    'ECDHE-RSA-AES128-SHA256'
                ],
                userTemplate: '%s',
                version: 3
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
                    mtu: 0,
                    profile: '/Common/tcp-forward',
                    tos: 'preserve',
                    usePmtu: 'enabled',
                    autoLasthop: 'default'
                }
            ],
            '/tm/sys/disk/directory': {
                apiRawValues: {
                    apiAnonymous: '\nDirectory Name                  Current Size    New Size        \n--------------                  ------------    --------        \n/config                         3321856         -               \n/shared                         20971520        -               \n/var                            3145728         -               \n/var/log                        3072000         -               \n/appdata                        130985984       -               \n\n'
                }
            }
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
                                        '8.8.8.8:53',
                                        '8.8.8.7:53'
                                    ]
                                },
                                {
                                    name: 'idservice.net',
                                    nameservers: [
                                        '8.8.4.4:53',
                                        '8.8.4.3:53'
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
                            cmpHash: 'src-ip',
                            failsafeEnabled: false,
                            failsafeAction: 'failover-restart-tm',
                            failsafeTimeout: 90
                        },
                        internalSelfIp: {
                            address: '10.0.0.2/24',
                            vlan: 'internalVlan',
                            trafficGroup: 'traffic-group-local-only',
                            allowService: 'none',
                            class: 'SelfIp'
                        },
                        externalSelfIp: {
                            address: '11.0.0.2/24',
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
                            gw: '11.0.0.11',
                            network: '30.0.0.0/24',
                            mtu: 0,
                            class: 'Route'
                        },
                        testRoute3: {
                            target: 'tunnel',
                            network: '1.2.3.4/32',
                            mtu: 0,
                            class: 'Route'
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
                        'default-mgmt-route': {
                            class: 'ManagementRoute',
                            gw: '192.168.1.1',
                            mtu: 0,
                            network: 'default',
                            type: 'interface'
                        },
                        'mgmt-route-forward': {
                            class: 'ManagementRoute',
                            gw: '10.0.0.2',
                            mtu: 0,
                            network: '255.255.255.254/32',
                            type: 'blackhole'
                        },
                        rd0: {
                            bandWidthControllerPolicy: 'bwcPolicy',
                            class: 'RouteDomain',
                            connectionLimit: 0,
                            enforcedFirewallPolicy: 'fwEnforcedPolicy',
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            id: 0,
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            routingProtocols: ['BFD'],
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            stagedFirewallPolicy: 'fwStagedPolicy',
                            strict: true,
                            vlans: ['/Common/http-tunnel', '/Common/socks-tunnel', '/Common/internal']
                        },
                        rd1: {
                            bandWidthControllerPolicy: 'bwcPolicy',
                            class: 'RouteDomain',
                            connectionLimit: 0,
                            enforcedFirewallPolicy: 'fwEnforcedPolicy',
                            flowEvictionPolicy: 'flowEvictionPolicy',
                            id: 1,
                            ipIntelligencePolicy: 'ipIntelligencePolicy',
                            routingProtocols: ['BFD'],
                            securityNatPolicy: 'securityNatPolicy',
                            servicePolicy: 'servicePolicy',
                            stagedFirewallPolicy: 'fwStagedPolicy',
                            strict: true,
                            vlans: ['/Common/http-tunnel', '/Common/socks-tunnel', '/Common/internal']
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
                                '1.2.3.4/32'
                            ]
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
                            destination: '1.2.3.4',
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
                        mgmtTrapDestination: {
                            class: 'SnmpTrapDestination',
                            version: '3',
                            destination: '1.2.3.4',
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
                            remoteAccess: false,
                            lineOrder: 999,
                            role: 'operator',
                            userPartition: 'all'
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
                                        server: '127.0.0.2',
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
                            guiAuditLog: false
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
                            tunnelType: 'tcp-forward',
                            mtu: 0,
                            usePmtu: true,
                            typeOfService: 'preserve',
                            autoLastHop: 'default'
                        },
                        currentDisk: {
                            class: 'Disk',
                            applicationData: 130985984
                        }
                    }
                }
            }
        };

        before(() => {
            sinon.stub(doUtilMock, 'getBigIp').callsFake(() => Promise.resolve(bigIpMock));
            sinon.stub(doUtilMock, 'getCurrentPlatform').callsFake(() => Promise.resolve(PRODUCTS.BIGIP));
        });

        beforeEach(() => {
            // skip data asserts
            missedProperties = {};
            expectedDeclaration = undefined;
            failWhenNoPropertyInResponse = false;
            inspectHandler = new InspectHandler();
            listResponses = defaultResponses();
        });

        after(() => {
            sinon.restore();
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
                    if (typeof item.schemaClass !== 'undefined') {
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
            Object.keys(classes).forEach(key => missing.push(key));
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
                address: '11.0.0.2/24',
                vlan: '/Common/externalVlan',
                trafficGroup: '/Common/traffic-group-local-only',
                allowService: 'none'
            });
            listResponses['/tm/net/route'].push({
                name: sharedName,
                gw: '10.0.0.2',
                network: '255.255.255.254/32',
                mtu: 0
            });
            return inspectHandler.process()
                .then((data) => {
                    basicInspectHandlerAsserts(data, 409, 'ERROR', 'Conflict', errMsg => /contains INVALID items/.test(errMsg));

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
                                offboxEnabled: false
                            },
                            currentAuthentication: {
                                class: 'Authentication',
                                fallback: false,
                                remoteUsersDefaults: {}
                            },
                            currentSnmpAgent: {
                                class: 'SnmpAgent'
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
                                hostname: 'myhost.bigip.com'
                            },
                            currentHTTPD: {
                                class: 'HTTPD'
                            },
                            currentSSHD: {
                                class: 'SSHD'
                            },
                            currentDisk: {
                                class: 'Disk'
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
