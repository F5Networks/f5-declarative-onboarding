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

const baseSchema = require('../../src/schema/latest/base.schema.json');
const systemSchema = require('../../src/schema/latest/system.schema.json');
const networkSchema = require('../../src/schema/latest/network.schema.json');
const dscSchema = require('../../src/schema/latest/dsc.schema.json');
const analyticsSchema = require('../../src/schema/latest/analytics.schema.json');
const authSchema = require('../../src/schema/latest/auth.schema.json');
const customFormats = require('../../src/schema/latest/formats.js');

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
    .addSchema(systemSchema)
    .addSchema(networkSchema)
    .addSchema(dscSchema)
    .addSchema(analyticsSchema)
    .addSchema(authSchema)
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
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
