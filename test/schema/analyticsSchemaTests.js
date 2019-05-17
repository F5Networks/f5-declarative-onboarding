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

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const analyticsSchema = require('../../schema/analytics.schema.json');
const customFormats = require('../../schema/formats.js');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv.compile(analyticsSchema);

/* eslint-disable quotes, quote-props */

describe('analytics.schema.json', () => {
    describe('Analytics', () => {
        describe('valid', () => {
            it('should validate analytics data', () => {
                const data = {
                    "class": "Analytics",
                    "offboxProtocol": "tcp",
                    "offboxTcpAddresses": [
                        "10.10.15.30",
                        "10.10.15.31"
                    ],
                    "offboxTcpPort": 12345,
                    "offboxEnabled": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should also validate analytics data', () => {
                const data = {
                    "class": "Analytics",
                    "offboxProtocol": "tcp",
                    "offboxTcpAddresses": [
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8330"
                    ],
                    "offboxTcpPort": 12345,
                    "offboxEnabled": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should yet again validate analytics data', () => {
                const data = {
                    "class": "Analytics",
                    "offboxProtocol": "https",
                    "offboxEnabled": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it.only('should validate analytics data one more time', () => {
                const data = {
                    "class": "Analytics",
                    "offboxEnabled": false
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate illegal offboxProtocol', () => {
                const data = {
                    "class": "Analytics",
                    "offboxProtocol": "udp"
                };
                assert.strictEqual(validate(data), false, 'illegal offboxProtocol should not be valid');
            });

            it('should invalidate illegal offboxTcpAddresses', () => {
                const data = {
                    "class": "Analytics",
                    "offboxTcpAddresses": [
                        "10.10.15.256"
                    ]
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate illegal offboxTcpPort', () => {
                const data = {
                    "class": "Analytics",
                    "ecmPort": 65536
                };
                assert.strictEqual(validate(data), false, 'out of range offbox port should not be valid');
            });

            it('should invalidate illegal useEcm', () => {
                const data = {
                    "class": "Analytics",
                    "elasticComputeManagementEnabled": "enabled"
                };
                assert.strictEqual(validate(data), false, 'illegal useEcm value should not be valid');
            });

            it('should invalidate illegal useOffbox', () => {
                const data = {
                    "class": "Analytics",
                    "offboxEnabled": "disabled"
                };
                assert.strictEqual(validate(data), false, 'illegal useOffbox value should not be valid');
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
