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

const assert = require('assert');
const Ajv = require('ajv');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const networkSchema = require('../../../src/schema/latest/network.schema.json');
const customFormats = require('../../../src/schema/latest/formats');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .compile(networkSchema);

describe('network.schema.json', () => {
    describe('DNS_Resolver', () => {
        describe('valid', () => {
            it('should validate minimal data', () => {
                const data = {
                    class: 'DNS_Resolver'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate dns resolver data', () => {
                const data = {
                    class: 'DNS_Resolver',
                    forwardZones: [
                        {
                            name: 'google.public-dns',
                            nameservers: [
                                '8.8.8.8:53',
                                '8.8.4.4:53'
                            ]
                        }
                    ],
                    routeDomain: 0,
                    cacheSize: 9437184,
                    answerDefaultZones: false,
                    randomizeQueryNameCase: true,
                    useIpv4: true,
                    useIpv6: true,
                    useUdp: true,
                    useTcp: true
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    class: 'DNS_Resolver',
                    rogueProperty: true
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "rogueProperty"'), -1);
            });

            it('should invalidate additional forward zones properties', () => {
                const data = {
                    class: 'DNS_Resolver',
                    forwardZones: [
                        {
                            name: 'google.public.dns',
                            nameservers: [
                                '8.8.8.8:53',
                                '8.8.4.4:53'
                            ],
                            rogueProperty: true
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "rogueProperty"'), -1);
            });

            it('should invalidate missing forward zone name', () => {
                const data = {
                    class: 'DNS_Resolver',
                    forwardZones: [
                        {
                            nameservers: [
                                '8.8.8.8:53',
                                '8.8.4.4:53'
                            ]
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'missing nameserver name should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should have required property \'name\''), -1);
            });

            it('should invalidate bad nameserver name', () => {
                const data = {
                    class: 'DNS_Resolver',
                    forwardZones: [
                        {
                            name: 'google.public_dns'
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'invalid hostname should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"hostname\\"'), -1);
            });

            it('should invalidate service:port that is not in an array', () => {
                const data = {
                    class: 'DNS_Resolver',
                    forwardZones: [
                        {
                            name: 'google.public.dns',
                            nameservers: '8.8.8.8:53'
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'nameservers should be in an array');
                assert.notStrictEqual(getErrorString().indexOf('"dataPath": ".forwardZones[0].nameservers"'), -1);
                assert.notStrictEqual(getErrorString().indexOf('should be array'), -1);
            });
        });
    });

    describe('Trunk', () => {
        describe('valid', () => {
            it('should validate minimal data', () => {
                const data = {
                    class: 'Trunk'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate trunk data', () => {
                const data = {
                    class: 'Trunk',
                    distributionHash: 'dst-mac',
                    interfaces: [
                        'myInterfaceDarryl',
                        'myOtherInterfaceDarryl'
                    ],
                    lacpEnabled: true,
                    lacpMode: 'passive',
                    lacpTimeout: 'long',
                    linkSelectPolicy: 'maximum-bandwidth',
                    qinqEthertype: '0xF5f5',
                    spanningTreeEnabled: false
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    class: 'Trunk',
                    rogueProperty: true
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "rogueProperty"'), -1);
            });

            it('should invalidate improperly formatted qinqEthertype', () => {
                let data = {
                    class: 'Trunk',
                    qinqEthertype: ' 0x8100'
                };
                assert.strictEqual(validate(data), false, 'qinqEthertype should not have leading space');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);

                data = {
                    class: 'Trunk',
                    qinqEthertype: '0x8100 '
                };
                assert.strictEqual(validate(data), false, 'qinqEthertype should not have trailing space');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);

                data = {
                    class: 'Trunk',
                    qinqEthertype: '0xIBAD'
                };
                assert.strictEqual(validate(data), false, 'qinqEthertype should not be invalid hex');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
            });
        });
    });
    describe('VLAN', () => {
        describe('valid', () => {
            it('should validate minimal data', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: []
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate vlan data', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: [
                        {
                            name: 'myInterface',
                            tagged: false
                        }
                    ],
                    mtu: 1500,
                    tag: 1234,
                    cmpHash: 'dst-ip',
                    failsafeEnabled: true,
                    failsafeAction: 'reboot',
                    failsafeTimeout: 3600
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data missing interfaces', () => {
                const data = {
                    class: 'VLAN',
                    mtu: 1500,
                    tag: 1234
                };
                assert.strictEqual(validate(data), false, 'missing interfaces should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "interfaces"'), -1);
            });

            it('should invalidate interfaces missing name', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: [
                        {
                            tagged: false
                        }
                    ],
                    mtu: 1500,
                    tag: 1234
                };
                assert.strictEqual(validate(data), false, 'missing interface name should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "name"'), -1);
            });

            it('should invalidate interfaces with additional prpoerties', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: [
                        {
                            name: 'myInterface',
                            tagged: false,
                            foo: 'bar'
                        }
                    ],
                    mtu: 1500,
                    tag: 1234
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "foo"'), -1);
            });

            it('should invalidate unexpected failsafe action', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: [
                        {
                            name: 'myInterface',
                            tagged: false
                        }
                    ],
                    failsafeAction: 'do-nothing'
                };
                assert.strictEqual(validate(data), false, 'non-enum failsafe action should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate out of range failsafe timeout', () => {
                const data = {
                    class: 'VLAN',
                    interfaces: [
                        {
                            name: 'myInterface',
                            tagged: false
                        }
                    ],
                    failsafeTimeout: 3601
                };
                assert.strictEqual(validate(data), false, 'out of range failsafe timeout should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 3600'), -1);
            });
        });
    });

    describe('SelfIp', () => {
        describe('valid', () => {
            it('should validate network data with IPv4 address', () => {
                const data = {
                    class: 'SelfIp',
                    address: '1.2.3.4/32',
                    vlan: 'myVlan',
                    allowService: 'all',
                    trafficGroup: 'traffic-group-1',
                    enforcedFirewallPolicy: 'myFirewallPolicy'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate network data with IPv6 address', () => {
                const data = {
                    class: 'SelfIp',
                    address: 'FE80:0000:0000:0000:0202:B3FF:FE1E:8329/128',
                    vlan: 'myVlan',
                    allowService: 'all',
                    trafficGroup: 'traffic-group-1',
                    stagedFirewallPolicy: 'myFirewallPolicy'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate network data with allow service:port', () => {
                const data = {
                    class: 'SelfIp',
                    address: '1.2.3.4/32',
                    vlan: 'myVlan',
                    allowService: ['foo:1234'],
                    trafficGroup: 'traffic-group-1'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate self ips with no address', () => {
                const data = {
                    class: 'SelfIp',
                    vlan: 'myVlan'
                };
                assert.strictEqual(validate(data), false, 'missing self ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "address"'), -1);
            });

            it('should invalidate self ips with no vlan', () => {
                const data = {
                    class: 'SelfIp',
                    address: '1.2.3.4'
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "vlan"'), -1);
            });

            it('should invalidate bad selfIp addresses', () => {
                const data = {
                    class: 'SelfIp',
                    address: 'foo',
                    vlan: 'myVlan'
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate IPv4 selfIp with out of range CIDR', () => {
                const data = {
                    class: 'SelfIp',
                    address: '1.2.3.4/33',
                    vlan: 'myVlan'
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate IPv6 selfIp with out of range CIDR', () => {
                const data = {
                    class: 'SelfIp',
                    address: 'FE80:0000:0000:0000:0202:B3FF:FE1E:8329/129',
                    vlan: 'myVlan'
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate bad traffic group', () => {
                const data = {
                    class: 'SelfIp',
                    address: '1.2.3.4',
                    vlan: 'myVlan',
                    trafficGroup: 'traffic-group-foo'
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('allowedValues'), -1);
            });

            describe('allowService', () => {
                it('should invalidate single words that are not all, default, or none', () => {
                    const data = {
                        class: 'SelfIp',
                        address: '1.2.3.4',
                        vlan: 'myVlan',
                        allowService: 'foo'
                    };
                    assert.strictEqual(validate(data), false, 'allow service foo should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('allowedValues'), -1);
                });

                it('should invalidate service:port that is not in an array', () => {
                    const data = {
                        class: 'SelfIp',
                        address: '1.2.3.4',
                        vlan: 'myVlan',
                        allowService: 'tcp:1234'
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'allow service:port not in array should not be valid'
                    );
                    assert.notStrictEqual(getErrorString().indexOf('allowedValues'), -1);
                });

                it('should invalidate invalid port values', () => {
                    const data = {
                        class: 'SelfIp',
                        address: '1.2.3.4',
                        vlan: 'myVlan',
                        allowService: ['foo:bar']
                    };
                    assert.strictEqual(validate(data), false, 'allow service bar should not be valid port');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });
            });
        });
    });

    describe('Route', () => {
        describe('valid', () => {
            it('should validate route data', () => {
                const data = {
                    class: 'Route',
                    gw: '1.2.3.4',
                    network: 'default',
                    mtu: 1234
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should allow route domains', () => {
                const data = {
                    class: 'Route',
                    gw: '1.2.3.4%10/24',
                    network: 'default',
                    mtu: 1234
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate route data to LOCAL_ONLY', () => {
                const data = {
                    class: 'Route',
                    gw: '1.2.3.4',
                    network: 'default',
                    mtu: 1234,
                    localOnly: true
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    class: 'Route',
                    gw: '1.2.3.4',
                    foo: 'bar'
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            });

            it('should invalidate missing gateway and vlanOrTunnel', () => {
                const data = {
                    class: 'Route'
                };
                assert.strictEqual(validate(data), false, 'missing gateway should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match exactly one schema in oneOf'), -1);
            });

            it('should invalidate route data with bad gateway IP address', () => {
                const data = {
                    class: 'Route',
                    gw: 'foo'
                };
                assert.strictEqual(validate(data), false, 'bad gateway IP address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate route data with bad network', () => {
                const data = {
                    class: 'Route',
                    gw: '1.2.3.4',
                    network: 'foo'
                };
                assert.strictEqual(validate(data), false, 'bad gateway IP address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('allowedValues'), -1);
            });
        });
    });

    describe('RouteDomain', () => {
        describe('valid', () => {
            it('should validate route domain data', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 2000,
                    parent: 'rd1000',
                    bandWidthControllerPolicy: 'bwcPolicy',
                    connectionLimit: 1234567,
                    flowEvictionPolicy: 'flowPolicy',
                    ipIntelligencePolicy: 'ipIntell',
                    enforcedFirewallPolicy: 'fwPolicy',
                    stagedFirewallPolicy: 'fwPolicy',
                    securityNatPolicy: 'natSecure',
                    servicePolicy: 'servicePolicy',
                    strict: false,
                    routingProtocols: [
                        'BFD',
                        'BGP'
                    ],
                    vlans: [
                        'vlan1',
                        'vlan2'
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate out of range id', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 123456
                };
                assert.strictEqual(validate(data), false, 'id is out of range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 65534'), -1);
            });

            it('should invalidate out of range connectionLimit', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 100,
                    connectionLimit: 99999999999
                };
                assert.strictEqual(validate(data), false, 'connectionLimit is out of range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 4294967295'), -1);
            });

            it('should invalidate missing id property', () => {
                const data = {
                    class: 'RouteDomain'
                };
                assert.strictEqual(validate(data), false, 'missing id property');
                assert.notStrictEqual(getErrorString().indexOf('should have required property \'id\''), -1);
            });

            it('should invalidate bad routing protocol', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 1,
                    routingProtocols: [
                        'BFD',
                        'newProtocol'
                    ]
                };
                assert.strictEqual(validate(data), false, 'invalid routing protocol');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 123,
                    newProperty: [
                        'newArrayItem'
                    ]
                };
                assert.strictEqual(validate(data), false, 'can\'t have additional properties');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate bad bandWidthControllerPolicy', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 123,
                    bandWidthControllerPolicy: [
                        "uhOhIt'sAnArray"
                    ]
                };
                assert.strictEqual(validate(data), false, 'bandwidthControllerPolicy should be a string');
                assert.notStrictEqual(getErrorString().indexOf('should be string'), -1);
            });

            it('should invalidate incorrect vlans items types', () => {
                const data = {
                    class: 'RouteDomain',
                    id: 123,
                    vlans: [
                        '123',
                        []
                    ]
                };
                assert.strictEqual(validate(data), false, 'vlans items should be string type');
                assert.notStrictEqual(getErrorString().indexOf('should be string'), -1);
            });
        });
    });

    describe('DagGlobals', () => {
        describe('valid', () => {
            it('should validate minimal schema', () => {
                const data = {
                    class: 'DagGlobals'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate DagGlobals data', () => {
                const data = {
                    class: 'DagGlobals',
                    ipv6PrefixLength: 120,
                    icmpHash: 'ipicmp',
                    roundRobinMode: 'local'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate out of range ipv6PrefixLength', () => {
                const data = {
                    class: 'DagGlobals',
                    ipv6PrefixLength: 129
                };
                assert.strictEqual(validate(data), false, 'ipv6PrefixLength should be between 0 and 128');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 128'), -1);
            });

            it('should invalidate invalid icmpHash', () => {
                const data = {
                    class: 'DagGlobals',
                    icmpHash: 'icmp2.0'
                };
                assert.strictEqual(validate(data), false, 'icmpHash should only match values in enum');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate invalid roundRobinMode', () => {
                const data = {
                    class: 'DagGlobals',
                    roundRobinMode: 'newRRMode'
                };
                assert.strictEqual(validate(data), false, 'roundRobinMode should only match values in enum');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });
        });
    });

    describe('Tunnel', () => {
        describe('valid', () => {
            it('should validate minimal schema', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate with all properties', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    mtu: 5,
                    usePmtu: false,
                    typeOfService: 10,
                    autoLastHop: 'enabled'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate invalid tunnelType', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'InvalidTunnelType'
                };
                assert.strictEqual(validate(data), false, 'tunnelType should match one of the enum values');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    newProperty: 'helloThere'
                };
                assert.strictEqual(validate(data), false, 'can\'t have additional properties');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate invalid mtu value', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    mtu: 70000
                };
                assert.strictEqual(validate(data), false, 'mtu is out of range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 65535'), -1);
            });

            it('should invalidate invalid usePmtu value', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    usePmtu: 'yes'
                };
                assert.strictEqual(validate(data), false, 'usePmtu should be a boolean');
                assert.notStrictEqual(getErrorString().indexOf('should be boolean'), -1);
            });

            it('should invalidate invalid enum value for typeOfService', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    typeOfService: 'newType'
                };
                assert.strictEqual(validate(data), false, 'typeOfService should match one of the enum values');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate invalid integer value for typeOfService', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    typeOfService: 300
                };
                assert.strictEqual(validate(data), false, 'typeOfService should be in the 0-255 range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 255'), -1);
            });

            it('should invalidate invalid enum value for autoLastHop', () => {
                const data = {
                    class: 'Tunnel',
                    tunnelType: 'tcp-forward',
                    autoLastHop: 'auto'
                };
                assert.strictEqual(validate(data), false, 'autoLastHop should match one of the enum values');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });
        });
    });

    describe('RoutingAsPath', () => {
        describe('valid', () => {
            it('should validate minimal declaration', () => {
                const data = {
                    class: 'RoutingAsPath'
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Array.isArray(data.entries), 'entries should be an array');
                assert(Object.keys(data.entries.length === 0, 'entries should be empty'));
            });

            it('should validate a full entries declaration', () => {
                const data = {
                    class: 'RoutingAsPath',
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
                };

                assert.ok(validate(data), getErrorString(validate));
            });
        });
        describe('invalid', () => {
            it('should fail if no regex is provided', () => {
                const data = {
                    class: 'RoutingAsPath',
                    entries: [{ name: 30 }]
                };
                assert.strictEqual(validate(data), false, 'This should fail if regex is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'regex\''), -1,
                    `Errored but not because of the missing regex:\n${getErrorString()}`
                );
            });

            it('should fail if no name is provided', () => {
                const data = {
                    class: 'RoutingAsPath',
                    entries: [{ regex: '^$' }]
                };
                assert.strictEqual(validate(data), false, 'This should fail if name is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'name\''), -1,
                    `Errored but not because of the missing name:\n${getErrorString()}`
                );
            });
        });
    });

    describe('RoutingBGP', () => {
        describe('valid', () => {
            it('should validate minimal declaration and populate default values', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1
                };

                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(data, {
                    class: 'RoutingBGP',
                    gracefulRestart: {
                        gracefulResetEnabled: false,
                        restartTime: 0,
                        stalePathTime: 0
                    },
                    holdTime: 90,
                    keepAlive: 30,
                    localAS: 1,
                    neighbors: [],
                    peerGroups: [],
                    routerId: 'any6'
                });
            });

            it('should validate full declaration', () => {
                const data = {
                    class: 'RoutingBGP',
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv4',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap'
                                }
                            ]
                        }
                    ],
                    gracefulRestart: {
                        gracefulResetEnabled: true,
                        restartTime: 120,
                        stalePathTime: 240
                    },
                    holdTime: 35,
                    keepAlive: 10,
                    localAS: 65010,
                    neighbors: [
                        {
                            address: '10.2.2.2',
                            peerGroup: 'Neighbor_IN'
                        }
                    ],
                    peerGroups: [
                        {
                            name: 'Neighbor_IN',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    routeMap: {
                                        in: 'routeMapIn',
                                        out: 'routeMapOut'
                                    },
                                    softReconfigurationInboundEnabled: true
                                }
                            ],
                            remoteAS: 65020
                        }
                    ],
                    routerId: '10.1.1.1'
                };

                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(data, {
                    class: 'RoutingBGP',
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv4',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap'
                                }
                            ]
                        }
                    ],
                    gracefulRestart: {
                        gracefulResetEnabled: true,
                        restartTime: 120,
                        stalePathTime: 240
                    },
                    holdTime: 35,
                    keepAlive: 10,
                    localAS: 65010,
                    neighbors: [
                        {
                            address: '10.2.2.2',
                            peerGroup: 'Neighbor_IN'
                        }
                    ],
                    peerGroups: [
                        {
                            name: 'Neighbor_IN',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    routeMap: {
                                        in: 'routeMapIn',
                                        out: 'routeMapOut'
                                    },
                                    softReconfigurationInboundEnabled: true
                                }
                            ],
                            remoteAS: 65020
                        }
                    ],
                    routerId: '10.1.1.1'
                });
            });

            it('should validate declaration using all internetProtocols in addressFamilies', () => {
                const data = {
                    class: 'RoutingBGP',
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv4',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap1'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'ipv6',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap2'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap3'
                                }
                            ]
                        }
                    ],
                    localAS: 65010
                };

                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(data.addressFamilies, [
                    {
                        internetProtocol: 'ipv4',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'exampleRouteMap1'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'ipv6',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'exampleRouteMap2'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'exampleRouteMap3'
                            }
                        ]
                    }
                ]);
            });

            it('should validate declaration using all routingProtocols in addressFamilies', () => {
                const data = {
                    class: 'RoutingBGP',
                    addressFamilies: [
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'connected',
                                    routeMap: 'exampleRouteMap1'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'isis',
                                    routeMap: 'exampleRouteMap2'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'kernel',
                                    routeMap: 'exampleRouteMap3'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'ospf',
                                    routeMap: 'exampleRouteMap4'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'rip',
                                    routeMap: 'exampleRouteMap5'
                                }
                            ]
                        },
                        {
                            internetProtocol: 'all',
                            redistributionList: [
                                {
                                    routingProtocol: 'static',
                                    routeMap: 'exampleRouteMap6'
                                }
                            ]
                        }
                    ],
                    localAS: 65010
                };

                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(data.addressFamilies, [
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'connected',
                                routeMap: 'exampleRouteMap1'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'isis',
                                routeMap: 'exampleRouteMap2'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'kernel',
                                routeMap: 'exampleRouteMap3'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'ospf',
                                routeMap: 'exampleRouteMap4'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'rip',
                                routeMap: 'exampleRouteMap5'
                            }
                        ]
                    },
                    {
                        internetProtocol: 'all',
                        redistributionList: [
                            {
                                routingProtocol: 'static',
                                routeMap: 'exampleRouteMap6'
                            }
                        ]
                    }
                ]);
            });

            it('should populate empty gracefulRestart with defaults', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    gracefulRestart: {}
                };

                assert.ok(validate(data), getErrorString(validate));
                assert.deepStrictEqual(data.gracefulRestart, {
                    gracefulResetEnabled: false,
                    restartTime: 0,
                    stalePathTime: 0
                });
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties at the top level', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    additionalProp: true
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in addressFamilies', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    addressFamilies: [
                        {
                            additionalProp: true
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in addressFamilies.redistribution', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv4',
                            redistributionList: [
                                {
                                    additionalProperty: true
                                }
                            ]
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties:\n${getErrorString()}`
                );
            });

            it('should invalidate unknown internetProtocol in addressFamilies object', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv5'
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail due to invalid internetProtocol');
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'), -1,
                    `Errored but not because of invalid internetProtocol:\n${getErrorString()}`
                );
            });

            it('should invalidate unknown routerProtocol in addressFamilies object', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    addressFamilies: [
                        {
                            internetProtocol: 'ipv4',
                            redistributionList: [
                                {
                                    routingProtocol: 'dynamic'
                                }
                            ]
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail due to invalid routingProtocol');
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'), -1,
                    `Errored but not because of invalid routingProtocol:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in gracefulRestart object', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    gracefulRestart: {
                        anotherProp: true
                    }
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties in gracefulRestart object:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in neighbors object', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    neighbors: [
                        {
                            additionalProperty: true
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties in neighbors object:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in peerGroups', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    peerGroups: [
                        {
                            additionalProperty: true
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties in peerGroups object:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in peerGroups.addressFamilies', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    peerGroups: [
                        {
                            name: 'Neighbor_IN',
                            addressFamilies: [
                                {
                                    additionalProperty: true
                                }
                            ]
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties in peerGroups object:\n${getErrorString()}`
                );
            });

            it('should invalidate additional properties in peerGroups.addressFamilies.routeMap', () => {
                const data = {
                    class: 'RoutingBGP',
                    localAS: 1,
                    peerGroups: [
                        {
                            name: 'Neighbor_IN',
                            addressFamilies: [
                                {
                                    internetProtocol: 'ipv4',
                                    routeMap: {
                                        additionalProperty: true
                                    }
                                }
                            ]
                        }
                    ]
                };

                assert.strictEqual(validate(data), false, 'This should fail if additional property provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1,
                    `Errored but not because of additional properties in peerGroups object:\n${getErrorString()}`
                );
            });
        });
    });

    describe('RouteMap', () => {
        describe('valid', () => {
            it('should validate minimal declaration', () => {
                const data = {
                    class: 'RouteMap'
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Array.isArray(data.entries), 'entries should be an array');
                assert(Object.keys(data.entries.length === 0, 'entries should be empty'));
            });

            it('should supply default for missing match', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit'
                        }
                    ]
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Object.keys(data.entries[0].match.ipv4.address).length === 0, 'ipv4.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv4.nextHop).length === 0, 'ipv4.nextHop should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.address).length === 0, 'ipv6.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.nextHop).length === 0, 'ipv6.nextHop should be empty object');
            });

            it('should supply defaults for missing ipv4 and ipv6', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {}
                        }
                    ]
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Object.keys(data.entries[0].match.ipv4.address).length === 0, 'ipv4.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv4.nextHop).length === 0, 'ipv4.nextHop should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.address).length === 0, 'ipv6.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.nextHop).length === 0, 'ipv6.nextHop should be empty object');
            });

            it('should supply defaults for empty ipv4 and ipv6', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {
                                ipv4: {},
                                ipv6: {}
                            }
                        }
                    ]
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Object.keys(data.entries[0].match.ipv4.address).length === 0, 'ipv4.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv4.nextHop).length === 0, 'ipv4.nextHop should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.address).length === 0, 'ipv6.address should be empty object');
                assert(Object.keys(data.entries[0].match.ipv6.nextHop).length === 0, 'ipv6.nextHop should be empty object');
            });

            it('should validate a full entries declaration', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {
                                asPath: 'aspath0',
                                ipv4: {
                                    address: {
                                        prefixList: 'aspath1'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath2'
                                    }
                                },
                                ipv6: {
                                    address: {
                                        prefixList: 'aspath3'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath4'
                                    }
                                }
                            }
                        },
                        {
                            name: 30,
                            action: 'deny',
                            match: {
                                asPath: 'aspath5',
                                ipv4: {
                                    address: {
                                        prefixList: 'aspath6'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath7'
                                    }
                                },
                                ipv6: {
                                    address: {
                                        prefixList: 'aspath8'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath9'
                                    }
                                }
                            }
                        }
                    ]
                };

                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate if asPath is not provided', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {
                                ipv4: {
                                    address: {
                                        prefixList: 'aspath1'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath2'
                                    }
                                },
                                ipv6: {
                                    address: {
                                        prefixList: 'aspath3'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath4'
                                    }
                                }
                            }
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate if ipv4 is not provided', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {
                                asPath: 'aspath0',
                                ipv6: {
                                    address: {
                                        prefixList: 'aspath3'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath4'
                                    }
                                }
                            }
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate if ipv6 is not provided', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            match: {
                                asPath: 'aspath0',
                                ipv4: {
                                    address: {
                                        prefixList: 'aspath1'
                                    },
                                    nextHop: {
                                        prefixList: 'aspath2'
                                    }
                                }
                            }
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate empty entries property', () => {
                const data = {
                    class: 'RouteMap',
                    entries: []
                };

                assert.ok(validate(data), getErrorString(validate));
            });
        });
        describe('invalid', () => {
            it('should fail if no name is provided', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            action: 'permit',
                            match: {
                                asPath: 'aspath0',
                                ipv4: {
                                    addressPrefixList: 'aspath1',
                                    nextHopPrefixList: 'aspath2'
                                },
                                ipv6: {
                                    addressPrefixList: 'aspath3',
                                    nextHopPrefixList: 'aspath4'
                                }
                            }
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if name is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'name\''), -1,
                    `Errored but not because of the missing name:\n${getErrorString()}`
                );
            });

            it('should fail if no action is provided', () => {
                const data = {
                    class: 'RouteMap',
                    entries: [
                        {
                            name: 20,
                            match: {
                                asPath: 'aspath0',
                                ipv4: {
                                    addressPrefixList: 'aspath1',
                                    nextHopPrefixList: 'aspath2'
                                },
                                ipv6: {
                                    addressPrefixList: 'aspath3',
                                    nextHopPrefixList: 'aspath4'
                                }
                            }
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if action is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'action\''), -1,
                    `Errored but not because of the missing action:\n${getErrorString()}`
                );
            });
        });
    });

    describe('RoutingPrefixList', () => {
        describe('valid', () => {
            it('should validate minimal declaration', () => {
                const data = {
                    class: 'RoutingPrefixList'
                };

                assert.ok(validate(data), getErrorString(validate));
                assert(Array.isArray(data.entries), 'entries should be an array');
                assert(Object.keys(data.entries.length === 0, 'entries should be empty'));
            });

            it('should validate a full entries declaration', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            prefix: '10.3.3.0/24',
                            prefixLengthRange: 32
                        },
                        {
                            name: 30,
                            action: 'deny',
                            prefix: '1111:2222:3333:4444::/64',
                            prefixLengthRange: 24
                        }
                    ]
                };

                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate if prefix and prefixLengthRange are not provided', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            name: 20,
                            action: 'deny'
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate empty entries property', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: []
                };

                assert.ok(validate(data), getErrorString(validate));
            });
        });
        describe('invalid', () => {
            it('should fail if no name is provided', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            action: 'permit',
                            prefix: '10.4.4.0/23',
                            prefixLengthRange: 24
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if name is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'name\''), -1,
                    `Errored but not because of the missing name:\n${getErrorString()}`
                );
            });

            it('should fail if no action is provided', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            name: 20,
                            prefix: '10.4.4.0/23',
                            prefixLengthRange: 24
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if action is not provided');
                assert.notStrictEqual(
                    getErrorString().indexOf('should have required property \'action\''), -1,
                    `Errored but not because of the missing action:\n${getErrorString()}`
                );
            });

            it('should fail if ipv4 prefix is missing length', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            prefix: '10.4.4.0',
                            prefixLengthRange: 24
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if length is missing from prefix');
                assert.notStrictEqual(
                    getErrorString().indexOf('should match format \\"ipWithRequiredPrefix\\"'), -1,
                    `Errored but not because of the missing prefix length:\n${getErrorString()}`
                );
            });

            it('should fail if ipv6 prefix is missing length', () => {
                const data = {
                    class: 'RoutingPrefixList',
                    entries: [
                        {
                            name: 20,
                            action: 'permit',
                            prefix: '1111:2222:3333:4444:5555:6666::8888',
                            prefixLengthRange: 24
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'This should fail if prefix is missing a length');
                assert.notStrictEqual(
                    getErrorString().indexOf('should match format \\"ipWithRequiredPrefix\\"'), -1,
                    `Errored but not because prefix is missing length:\n${getErrorString()}`
                );
            });
        });
    });

    describe('FirewallPolicy', () => {
        describe('valid', () => {
            it('should validate minimal firewall policy properties', () => {
                const data = {
                    class: 'FirewallPolicy'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal firewall policy rule properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{
                        name: 'firewallRule',
                        action: 'accept'
                    }]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    label: 'this is a firewall policy test',
                    remark: 'firewall policy description',
                    rules: [{
                        name: 'firewallPolicyRule',
                        label: 'this is a firewall policy rule test',
                        remark: 'firewall policy rule description',
                        action: 'reject',
                        protocol: 'tcp',
                        source: {
                            addressLists: [
                                '/Common/myAddressList1',
                                'myAddressList2'
                            ],
                            portLists: [
                                '/Common/myPortList1',
                                'myPortList2'
                            ],
                            vlans: [
                                '/Common/vlan1',
                                'vlan2'
                            ]
                        },
                        destination: {
                            addressLists: [
                                '/Common/myAddressList1',
                                'myAddressList2'
                            ],
                            portLists: [
                                '/Common/myPortList1',
                                'myPortList2'
                            ]
                        },
                        loggingEnabled: true
                    }]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional firewall policy properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    foo: 'bar'
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate additional firewall policy rule properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{
                        name: 'firewallRule',
                        action: 'accept',
                        foo: 'bar'
                    }]
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate additional firewall policy rule source properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{
                        name: 'firewallRule',
                        action: 'accept',
                        source: {
                            foo: 'bar'
                        }
                    }]
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate additional firewall policy rule destination properties', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{
                        name: 'firewallRule',
                        action: 'accept',
                        destination: {
                            foo: 'bar'
                        }
                    }]
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });

            it('should invalidate missing firewall policy rule name property', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{ action: 'accept' }]
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should have required property \'name\''), -1);
            });

            it('should invalidate missing firewall policy rule action property', () => {
                const data = {
                    class: 'FirewallPolicy',
                    rules: [{ name: 'firewallRule' }]
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf('should have required property \'action\''), -1);
            });
        });
    });

    describe('FirewallAddressList', () => {
        describe('valid', () => {
            it('should validate minimal firewall address list properties', () => {
                const data = {
                    class: 'FirewallAddressList',
                    addresses: ['192.168.0.1']
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all firewall address list properties', () => {
                const data = {
                    class: 'FirewallAddressList',
                    label: 'myLabel',
                    remark: 'myRemark',
                    addresses: ['192.168.0.1'],
                    fqdns: ['www.example.com'],
                    geo: ['US:Washington']
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate if no addresses are specified', () => {
                const data = {
                    class: 'FirewallAddressList'
                };
                assert.strictEqual(validate(data), false);
                assert.notStrictEqual(getErrorString().indexOf('should have required property'), -1);
            });
        });
    });

    describe('FirewallPortList', () => {
        describe('valid', () => {
            it('should validate minimal firewall port list properties', () => {
                const data = {
                    class: 'FirewallPortList',
                    ports: [8080]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all firewall port list properties', () => {
                const data = {
                    class: 'FirewallPortList',
                    label: 'myLabel',
                    remark: 'myRemark',
                    ports: [8080]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate firewall port list with string port', () => {
                const data = {
                    class: 'FirewallPortList',
                    label: 'myLabel',
                    remark: 'myRemark',
                    ports: ['8080']
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate if no ports are specified', () => {
                const data = {
                    class: 'FirewallPortList'
                };
                assert.strictEqual(validate(data), false);
                assert.notStrictEqual(getErrorString().indexOf('should have required property'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
