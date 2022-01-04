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

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const analyticsSchema = require('../../../src/schema/latest/analytics.schema.json');
const customFormats = require('../../../src/schema/latest/formats');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv.compile(analyticsSchema);

describe('analytics.schema.json', () => {
    describe('Analytics', () => {
        describe('valid', () => {
            it('should validate analytics data with IPv4 addresses for TCP protocol', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.15.30',
                        '10.10.15.31'
                    ],
                    offboxTcpPort: 12345,
                    debugEnabled: true,
                    interval: 180
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should also validate analytics data with IPv6 addresses for TCP protocol', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8330',
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8331'
                    ],
                    offboxTcpPort: 12345,
                    debugEnabled: true,
                    interval: 180
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should yet again validate analytics data for HTTPS protocol', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'https',
                    offboxTcpPort: 1245,
                    offboxTcpAddresses: [
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8330'
                    ],
                    sourceId: 'testSourceId',
                    debugEnabled: false
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal analytics configuration', () => {
                const data = {
                    class: 'Analytics'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate analytics data without offbox* properties', () => {
                const data = {
                    class: 'Analytics',
                    debugEnabled: true,
                    interval: 180
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate analytics when all properties specified', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    offboxTcpAddresses: [
                        '10.10.15.30',
                        '10.10.15.31',
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8330'
                    ],
                    offboxTcpPort: 12345,
                    sourceId: 'testSourceId',
                    tenantId: 'testTenantId',
                    debugEnabled: true,
                    interval: 180
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate analytics data to disable configuration', () => {
                const data = {
                    class: 'Analytics',
                    offboxTcpAddresses: [],
                    offboxTcpPort: 0
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate illegal debugEnabled value', () => {
                const data = {
                    class: 'Analytics',
                    debugEnabled: 'enabled'
                };
                assert.strictEqual(validate(data), false, 'illegal debugEnabled value should not be valied');
                assert.strictEqual(/debugEnabled/.test(getErrorString(validate)), true);
            });

            it('should invalidate undersized interval value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    debugEnabled: true,
                    interval: 19
                };
                assert.strictEqual(validate(data), false, 'undersized interval value should not be valid');
                assert.strictEqual(/interval/.test(getErrorString(validate)), true);
            });

            it('should invalidate oversized interval value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp',
                    debugEnabled: true,
                    interval: 301
                };
                assert.strictEqual(validate(data), false, 'oversized interval value should not be valid');
                assert.strictEqual(/interval/.test(getErrorString(validate)), true);
            });

            it('should invalidate illegal offboxProtocol', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'udp'
                };
                assert.strictEqual(validate(data), false, 'illegal offboxProtocol value should not be valid');
                assert.strictEqual(/offboxProtocol/.test(getErrorString(validate)), true);
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
                assert.strictEqual(/offboxTcpPort/.test(getErrorString(validate)), true);
            });

            it('should invalidate illegal offboxEnabled value', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: 'disabled'
                };
                assert.strictEqual(validate(data), false, 'illegal offboxEnabled value should not be valid');
                assert.strictEqual(/offboxEnabled/.test(getErrorString(validate)), true);
            });

            it('should invalidate missing offboxProtocol value when offboxEnabled true', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true
                };
                assert.strictEqual(validate(data), false, 'missing offboxProtocol value should not be valid');
                assert.strictEqual(/offboxProtocol/.test(getErrorString(validate)), true);
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
                assert.strictEqual(/offboxTcpPort/.test(getErrorString(validate)), true);
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
                assert.strictEqual(/offboxTcpAddresses/.test(getErrorString(validate)), true);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    class: 'Analytics',
                    enabled: true
                };
                assert.strictEqual(validate(data), false, 'additional properties hsould not be valid');
                assert.strictEqual(/additional/.test(getErrorString(validate)), true);
            });

            it('should invalidate missing offboxTcpAddresses, offboxTcpPort when offboxProtocol tcp', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'tcp'
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxTcpAddresses, offboxTcpPort with tcp protocol should not be valid');

                const errorMsg = getErrorString(validate);
                assert.strictEqual(/offboxTcpAddresses/.test(errorMsg) || /offboxTcpPort/.test(errorMsg), true);
            });

            it('should invalidate missing offboxTcpAddresses, offboxProtocol when offboxTcpPort is not 0', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxTcpPort: 1
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxTcpAddresses, offboxProtocol when offboxTcpPort is not 0 should not be valid');

                const errorMsg = getErrorString(validate);
                assert.strictEqual(/offboxTcpAddresses/.test(errorMsg) || /offboxProtocol/.test(errorMsg), true);
            });

            it('should invalidate missing offboxTcpPort, offboxProtocol when offboxTcpAddresses is not empty', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxTcpAddresses: [
                        '10.0.0.10'
                    ]
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxProtocol, offboxTcpPort when offboxTcpAddresses is not empty should not be valid');

                const errorMsg = getErrorString(validate);
                assert.strictEqual(/offboxTcpPort/.test(errorMsg) || /offboxProtocol/.test(errorMsg), true);
            });

            it('should invalidate missing offboxTcpAddresses, offboxTcpPort when offboxProtocol https', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'https'
                };
                assert.strictEqual(validate(data), false,
                    'missing offboxTcpAddresses, offboxTcpPort with https protocol should not be valid');

                const errorMsg = getErrorString(validate);
                assert.strictEqual(/offboxTcpAddresses/.test(errorMsg) || /offboxTcpPort/.test(errorMsg), true);
            });

            it('should invalidate missing sourceId when offboxProtocol https', () => {
                const data = {
                    class: 'Analytics',
                    offboxEnabled: true,
                    offboxProtocol: 'https',
                    offboxTcpPort: 12345,
                    offboxTcpAddresses: [
                        '10.0.0.10'
                    ]
                };
                assert.strictEqual(validate(data), false, 'missing sourceId with https protocol should not be valid');
                assert.strictEqual(/sourceId/.test(getErrorString(validate)), true);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
