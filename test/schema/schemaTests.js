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

const fs = require('fs');
const assert = require('assert');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });
const baseSchema = JSON.parse(fs.readFileSync(`${__dirname}/../../schema/base.schema.json`).toString());
const systemSchema = JSON.parse(fs.readFileSync(`${__dirname}/../../schema/system.schema.json`).toString());
const networkSchema = JSON.parse(fs.readFileSync(`${__dirname}/../../schema/network.schema.json`).toString());

const validate = ajv
    .addSchema(systemSchema)
    .addSchema(networkSchema)
    .compile(baseSchema);

/* eslint-disable quotes, quote-props */

describe('valid', () => {
    describe('system', () => {
        describe('dns', () => {
            it('should validate dns data', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "dns": {
                            "nameServers": [
                                "1.2.3.4",
                                "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                            ],
                            "search": [
                                "f5.com"
                            ]
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        it('should validate ntp data', () => {
            const data = {
                "schemaVersion": "0.1.0",
                "system": {
                    "ntp": {
                        "servers": [
                            "1.2.3.4",
                            "FE80:0000:0000:0000:0202:B3FF:FE1E:8329",
                            "0.pool.ntp.org"
                        ],
                        "timezone": "UTC"
                    }
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });
});

describe('invalid', () => {
    describe('system', () => {
        it('should invalidate additional properties', () => {
            const data = {
                "schemaVersion": "0.1.0",
                "system": {
                    "foo": "bar"
                }
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notDeepStrictEqual(
                getErrorString().indexOf('should NOT have additional properties'), -1
            );
        });

        describe('dns', () => {
            it('should invalidate name servers that are not ipv4 or ipv6', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "dns": {
                            "nameServers": ["foo"]
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate search domains that are not hostnames', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "dns": {
                            "search": ["foo@bar"]
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "hostname"'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "dns": {
                            "foo": "bar"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notDeepStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1
                );
            });
        });

        describe('ntp', () => {
            it('should invalidate ntp servers that are not ipv4, ipv6, or hostname', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "ntp": {
                            "servers": ["foo@bar"]
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "schemaVersion": "0.1.0",
                    "system": {
                        "ntp": {
                            "foo": "bar"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notDeepStrictEqual(
                    getErrorString().indexOf('should NOT have additional properties'), -1
                );
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
