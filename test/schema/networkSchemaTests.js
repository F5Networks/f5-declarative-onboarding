/**
 * Copyright 2018 F5 Networks, Inc.
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

const ajv = new Ajv({ allErrors: true });
const networkSchema = require('../../schema/network.schema.json');
const customFormats = require('../../schema/formats.js');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv.compile(networkSchema);

/* eslint-disable quotes, quote-props */

describe('network.schema.json tests', () => {
    describe('toplevel', () => {
        it('should invalidate bad classes', () => {
            const data = {
                "class": "foo"
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should match exactly one schema in oneOf'), -1);
        });
    });

    describe('VLAN', () => {
        describe('valid', () => {
            it('should validate vlan data', () => {
                const data = {
                    "class": "VLAN",
                    "interfaces": [
                        {
                            "name": "myInterface",
                            "tagged": false
                        }
                    ],
                    "mtu": 1500,
                    "tag": 1234
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data missing interfaces', () => {
                const data = {
                    "class": "VLAN",
                    "mtu": 1500,
                    "tag": 1234
                };
                assert.strictEqual(validate(data), false, 'missing interfaces should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "interfaces"'), -1);
            });

            it('should invalidate interfaces missing name', () => {
                const data = {
                    "class": "VLAN",
                    "interfaces": [
                        {
                            "tagged": false
                        }
                    ],
                    "mtu": 1500,
                    "tag": 1234
                };
                assert.strictEqual(validate(data), false, 'missing interface name should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "name"'), -1);
            });

            it('should invalidate interfaces with additional prpoerties', () => {
                const data = {
                    "class": "VLAN",
                    "interfaces": [
                        {
                            "name": "myInterface",
                            "tagged": false,
                            "foo": "bar"
                        }
                    ],
                    "mtu": 1500,
                    "tag": 1234
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "foo"'), -1);
            });
        });
    });

    describe('SelfIp', () => {
        describe('valid', () => {
            it('should validate network data with IPv4 address', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "1.2.3.4/32",
                    "vlan": "myVlan",
                    "allowService": "all",
                    "trafficGroup": "myTrafficGroup",
                    "floating": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate network data with IPv6 address', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "FE80:0000:0000:0000:0202:B3FF:FE1E:8329/128",
                    "vlan": "myVlan",
                    "allowService": "all",
                    "trafficGroup": "myTrafficGroup",
                    "floating": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate network data with allow service:port', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "1.2.3.4/32",
                    "vlan": "myVlan",
                    "allowService": "foo:1234",
                    "trafficGroup": "myTrafficGroup",
                    "floating": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate self ips with no address', () => {
                const data = {
                    "class": "SelfIp",
                    "vlan": "myVlan"
                };
                assert.strictEqual(validate(data), false, 'missing self ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "address"'), -1);
            });

            it('should invalidate self ips with no vlan', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "1.2.3.4"
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "vlan"'), -1);
            });

            it('should invlalidate bad selfIp addresses', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "foo",
                    "vlan": "myVlan"
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate IPv4 selfIp with out of range CIDR', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "1.2.3.4/33",
                    "vlan": "myVlan",
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            it('should invalidate IPv6 selfIp with out of range CIDR', () => {
                const data = {
                    "class": "SelfIp",
                    "address": "FE80:0000:0000:0000:0202:B3FF:FE1E:8329/129",
                    "vlan": "myVlan",
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });

            describe('allowService', () => {
                it('should invalidate single words that are not all, default, or none', () => {
                    const data = {
                        "class": "SelfIp",
                        "address": "1.2.3.4",
                        "vlan": "myVlan",
                        "allowService": "foo"
                    };
                    assert.strictEqual(validate(data), false, 'allow service foo should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });

                it('should invalidate invalid service:port words', () => {
                    const data = {
                        "class": "SelfIp",
                        "address": "1.2.3.4",
                        "vlan": "myVlan",
                        "allowService": "foo:bar"
                    };
                    assert.strictEqual(validate(data), false, 'allow service foo should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });
            });
        });
    });

    describe('Route', () => {
        describe('valid', () => {
            it('should validate route data', () => {
                const data = {
                    "class": "Route",
                    "gw": "1.2.3.4",
                    "network": "5.6.7.8"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    "class": "Route",
                    "gw": "1.2.3.4",
                    "network": "5.6.7.8",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            });

            it('should invalidate missing gateway', () => {
                const data = {
                    "class": "Route",
                    "network": "5.6.7.8"
                };
                assert.strictEqual(validate(data), false, 'missing gateway should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "gw"'), -1);
            });

            it('should invalidate missing network', () => {
                const data = {
                    "class": "Route",
                    "gw": "1.2.3.4"
                };
                assert.strictEqual(validate(data), false, 'missing network should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "network"'), -1);
            });

            it('should invalidate route data with bad gateway IP address', () => {
                const data = {
                    "class": "Route",
                    "gw": "foo",
                    "network": "5.6.7.8"
                };
                assert.strictEqual(validate(data), false, 'bad gateway IP address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"ipv4\\"'), -1);
            });

            it('should invalidate route data with bad network IP address', () => {
                const data = {
                    "class": "Route",
                    "gw": "1.2.3.4",
                    "network": "foo"
                };
                assert.strictEqual(validate(data), false, 'bad network IP address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
