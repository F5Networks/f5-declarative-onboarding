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

describe('analytics.schema.json', () => {
    describe('Analytics', () => {
        describe('valid', () => {
            it('should validate analytics data', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.15.30',
                        '10.10.15.31'
                    ],
                    offboxTcpPort: 12345,
                    debugEnabled: true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should also validate analytics data', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8330'
                    ],
                    offboxTcpPort: 12345,
                    debugEnabled: true,
                    interval: 180
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should yet again validate analytics data', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'https',
                    debugEnabled: false
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate analytics data one more time', () => {
                const data = {
                    class: 'Analytics'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate illegal debugEnabled value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    debugEnabled: 'enabled'
                };
                assert.strictEqual(validate(data), false, 'illegal debugEnabled value should not be valied');
            });

            it('should invalidate undersized interval value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'ecm-tm',
                    debugEnabled: true,
                    interval: 19
                };
                assert.strictEqual(validate(data), false, 'undersized interval value should not be valid');
            });

            it('should invalidate oversized interval value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'ecm-tm',
                    debugEnabled: true,
                    interval: 301
                };
                assert.strictEqual(validate(data), false, 'oversized interval value should not be valid');
            });

            it('should invalidate illegal offboxProtocol', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'udp'
                };
                assert.strictEqual(validate(data), false, 'illegal offboxProtocol value should not be valid');
            });

            it('should invalidate illegal offboxTcpAddresses value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.15.256'
                    ],
                    offboxTcpPort: 666
                };
                assert.strictEqual(validate(data), false, 'illegal ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate illegal offboxTcpPort value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.7.7'
                    ],
                    offboxTcpPort: 65536
                };
                assert.strictEqual(validate(data), false, 'out of range offbox port should not be valid');
            });

            it('should invalidate illegal offboxEnabled value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: 'disabled'
                };
                assert.strictEqual(validate(data), false, 'illegal offboxEnabled value should not be valid');
            });

            it('should invalidate missing offboxProtocol value when offboxEnabled true', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true
                };
                assert.strictEqual(validate(data), false, 'missing offboxProtocol value should not be valid');
            });

            it('should invalidate missing offboxTcpPort when offboxProtocol is tcp', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.33.33'
                    ]
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxTcpPort with tcp protocol should not be valid');
            });

            it('should invalidate missing offboxTcpAddresses when offboxProtocol tcp', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpPort: 666
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxTcpAddresses with tcp protocol should not be valid');
            });

            it('should invalidate additional properties', () => {
                const data = {
                    class: 'Analytics',
                    enabled: true
                };
                assert.strictEqual(validate(data), false, 'additional properties hsould not be valid');
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
