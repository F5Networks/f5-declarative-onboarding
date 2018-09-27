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
        it('should invalidate non-Network classes', () => {
            const data = {
                "class": "foo"
            };
            assert.strictEqual(validate(data), false, 'non-Network classes should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"allowedValue": "Network"'), -1);
        });

        it('should invalidate additional properties', () => {
            const data = {
                "class": "Network",
                "foo": "bar"
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
        });

        it('should invalidate contained classes defined in the schema', () => {
            const data = {
                "class": "Network",
                "myFoo": {
                    "class": "foo"
                }
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
        });
    });

    describe('vlans', () => {
        describe('valid', () => {
            it('should validate vlan data', () => {
                const data = {
                    "class": "Network",
                    "myVlan": {
                        "class": "VLAN",
                        "interfaces": [
                            {
                                "name": "myInterface",
                                "tagged": false
                            }
                        ],
                        "mtu": 1500,
                        "tag": 1234
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data missing interfaces', () => {
                const data = {
                    "class": "Network",
                    "myVlan": {
                        "class": "VLAN",
                        "mtu": 1500,
                        "tag": 1234
                    }
                };
                assert.strictEqual(validate(data), false, 'missing interfaces should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "interfaces"'), -1);
            });

            it('should invalidate interfaces missing name', () => {
                const data = {
                    "class": "Network",
                    "myVlan": {
                        "class": "VLAN",
                        "interfaces": [
                            {
                                "tagged": false
                            }
                        ],
                        "mtu": 1500,
                        "tag": 1234
                    }
                };
                assert.strictEqual(validate(data), false, 'missing interface name should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "name"'), -1);
            });

            it('should invalidate interfaces with additional prpoerties', () => {
                const data = {
                    "class": "Network",
                    "myVlan": {
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
                    }
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "foo"'), -1);
            });
        });
    });

    describe('selfIps', () => {
        describe('valid', () => {
            it('should validate network data', () => {
                const data = {
                    "class": "Network",
                    "mySelfIp": {
                        "class": "SelfIp",
                        "address": "1.2.3.4",
                        "vlan": "myVlan",
                        "allowService": "all",
                        "trafficGroup": "myTrafficGroup",
                        "floating": true
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate network data with allow service:port', () => {
                const data = {
                    "class": "Network",
                    "mySelfIp": {
                        "class": "SelfIp",
                        "address": "1.2.3.4",
                        "vlan": "myVlan",
                        "allowService": "foo:1234",
                        "trafficGroup": "myTrafficGroup",
                        "floating": true
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate self ips with no address', () => {
                const data = {
                    "class": "Network",
                    "mySelf": {
                        "class": "SelfIp",
                        "vlan": "myVlan"
                    }
                };
                assert.strictEqual(validate(data), false, 'missing self ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "address"'), -1);
            });

            it('should invalidate self ips with no vlan', () => {
                const data = {
                    "class": "Network",
                    "mySelf": {
                        "class": "SelfIp",
                        "address": "1.2.3.4"
                    }
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "vlan"'), -1);
            });

            it('should invlalidate selfIp addresses that are not ipv4 or ipv6', () => {
                const data = {
                    "class": "Network",
                    "mySelfIp": {
                        "class": "SelfIp",
                        "address": "foo",
                        "vlan": "myVlan"
                    }
                };
                assert.strictEqual(validate(data), false, 'missing self ip vlan should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format'), -1);
            });

            describe('allowService', () => {
                it('should invalidate single words that are not all, default, or none', () => {
                    const data = {
                        "class": "Network",
                        "mySelf": {
                            "class": "SelfIp",
                            "address": "1.2.3.4",
                            "vlan": "myVlan",
                            "allowService": "foo"
                        }
                    };
                    assert.strictEqual(validate(data), false, 'allow service foo should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });

                it('should invalidate invalid service:port words', () => {
                    const data = {
                        "class": "Network",
                        "mySelf": {
                            "class": "SelfIp",
                            "address": "1.2.3.4",
                            "vlan": "myVlan",
                            "allowService": "foo:bar"
                        }
                    };
                    assert.strictEqual(validate(data), false, 'allow service foo should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
