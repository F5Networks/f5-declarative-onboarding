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

const baseSchema = require('../../../src/schema/latest/base.schema.json');
const systemSchema = require('../../../src/schema/latest/system.schema.json');
const networkSchema = require('../../../src/schema/latest/network.schema.json');
const dscSchema = require('../../../src/schema/latest/dsc.schema.json');
const analyticsSchema = require('../../../src/schema/latest/analytics.schema.json');
const authSchema = require('../../../src/schema/latest/auth.schema.json');
const customFormats = require('../../../src/schema/latest/formats');
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const gslbSchema = require('../../../src/schema/latest/gslb.schema.json');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .addSchema(systemSchema)
    .addSchema(networkSchema)
    .addSchema(dscSchema)
    .addSchema(analyticsSchema)
    .addSchema(authSchema)
    .addSchema(gslbSchema)
    .compile(baseSchema);

/* eslint-disable quotes, quote-props */

describe('base.schema.json', () => {
    describe('top level', () => {
        describe('valid', () => {
            it('should validate top level declaration', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate missing schemaVersion', () => {
                const data = {
                    "class": "Device"
                };
                assert.strictEqual(validate(data), false, 'missing schemaVersion should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf("should have required property 'schemaVersion'"), -1
                );
            });

            it('should invalidate missing class', () => {
                const data = {
                    "schemaVersion": "1.0.0"
                };
                assert.strictEqual(validate(data), false, 'missing class should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf("should have required property 'class'"), -1
                );
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('Credentials', () => {
        describe('valid', () => {
            it('should validate credentials with username and password', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Credentials": [
                        {
                            "username": "foo",
                            "password": "bar"
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate credentials with tokens', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Credentials": [
                        {
                            "tokens": {
                                "X-F5-Auth-Token": "foofoo"
                            }
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate credentials with both username/password and tokens', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Credentials": [
                        {
                            "username": "foo",
                            "password": "bar",
                            "tokens": {
                                "X-F5-Auth-Token": "foofoo"
                            }
                        }
                    ]
                };
                assert.strictEqual(
                    validate(data), false, 'username/password with tokens should not be valid'
                );
                assert.notStrictEqual(getErrorString().indexOf('dependencies/username/not'), -1);
            });

            it('should invalidate credentials with long values', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Credentials": [
                        {
                            "tokens": {
                                "X-F5-Auth-Token": 'a'.repeat(8193)
                            }
                        }
                    ]
                };
                assert.strictEqual(
                    validate(data), false, 'long token should not be valid'
                );
                assert.notStrictEqual(getErrorString().indexOf('Credentials/items/properties/tokens/patternProperties'), -1);
            });
        });
    });

    describe('Common', () => {
        describe('valid', () => {
            it('should validate basic Common tenant', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should accept a class-less hostname', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "hostname": 'my.bigip.com'
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should accept property names that are not too long', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "myLongItem_1234567890123456789012345678901234567": {
                            "class": "System"
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should accept property names that have dots, dashes, underscores', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "my-item.with_ALL_possible_characters0": {
                            "class": "System"
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad class names', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "provisioning": {
                            "class": "Provisioning",
                            "ltm": "nominal"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'Bad classes should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate item names that are too long', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "myLongItem_12345678901234567890123456789012345678": {
                            "class": "System"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'Item names that are too long should not be valid');
                assert.notStrictEqual(getErrorString().indexOf(`property name 'myLongItem_12345678901234567890123456789012345678' is invalid`), -1);
            });

            it('should invalidate item names that invalid characters', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device",
                    "Common": {
                        "class": "Tenant",
                        "invalidCharacters!": {
                            "class": "System"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'Item names that are too long should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
