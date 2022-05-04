/**
 * Copyright 2022 F5 Networks, Inc.
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

const doSchema = require('../../../src/schema/latest/do.schema.json');
const remoteSchema = require('../../../src/schema/latest/remote.schema.json');
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
    .addSchema(baseSchema)
    .addSchema(remoteSchema)
    .compile(doSchema);

/* eslint-disable quotes, quote-props */

describe('base.schema.json', () => {
    describe('top level', () => {
        describe('valid', () => {
            it('should validate with Device class', () => {
                const data = {
                    "schemaVersion": "1.0.0",
                    "class": "Device"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate with DO class', () => {
                const data = {
                    "class": "DO",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad class', () => {
                const data = {
                    "class": "BadClass"
                };
                assert.strictEqual(validate(data), false, 'bad class should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'), -1
                );
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
