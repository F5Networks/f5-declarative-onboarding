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

const validate = ajv.compile(networkSchema);

/* eslint-disable quotes, quote-props */

describe('network schema tests', () => {
    describe('toplevel', () => {
        it('should invalidate additional properties', () => {
            const data = {
                "foo": "bar"
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
        });
    });

    describe('vlans', () => {
        describe('valid', () => {
            it('should validate vlan data', () => {
                const data = {
                    "vlans": {
                        "myVlan": {
                            "interfaces": [
                                {
                                    "name": "myInterface",
                                    "tagged": false
                                }
                            ],
                            "mtu": 1500,
                            "tag": 1234
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data missing interfaces', () => {
                const data = {
                    "vlans": {
                        "myVlan": {
                            "mtu": 1500,
                            "tag": 1234
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'missing interfaces should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "interfaces"'), -1);
            });

            it('should invalidate interfaces missing name', () => {
                const data = {
                    "vlans": {
                        "myVlan": {
                            "interfaces": [
                                {
                                    "tagged": false
                                }
                            ],
                            "mtu": 1500,
                            "tag": 1234
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'missing interface name should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "name"'), -1);
            });

            it('should invalidate interfaces with additional prpoerties', () => {
                const data = {
                    "vlans": {
                        "myVlan": {
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
                    "selfIps": {
                        "mySelf": {
                            "address": "1.2.3.4",
                            "vlan": "myVlan",
                            "allowService": "all",
                            "trafficGroup": "myTrafficGroup",
                            "floating": true
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
