/**
 * Copyright 2024 F5, Inc.
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
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const securitySchema = require('../../../src/schema/latest/security.schema.json');
const customFormats = require('../../../src/schema/latest/formats');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .compile(securitySchema);

describe('security.schema.json', () => {
    describe('SecurityAnalytics', () => {
        describe('valid', () => {
            it('should validate minimal data', () => {
                const data = {
                    class: 'SecurityAnalytics'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate with all properties', () => {
                const data = {
                    class: 'SecurityAnalytics',
                    aclRules: {
                        collectClientIpEnabled: true,
                        collectClientPortEnabled: false,
                        collectDestinationIpEnabled: true,
                        collectDestinationPortEnabled: true,
                        collectServerSideStatsEnabled: false
                    },
                    collectAllDosStatsEnabled: false,
                    collectedStatsExternalLoggingEnabled: false,
                    collectedStatsInternalLoggingEnabled: false,
                    dns: {
                        collectClientIpEnabled: true,
                        collectDestinationIpEnabled: true
                    },
                    collectDnsStatsEnabled: true,
                    dosL2L4: {
                        collectClientIpEnabled: true,
                        collectDestinationGeoEnabled: true
                    },
                    collectDosL3StatsEnabled: true,
                    collectFirewallAclStatsEnabled: true,
                    collectFirewallDropsStatsEnabled: true,
                    collectIpReputationStatsEnabled: true,
                    l3L4Errors: {
                        collectClientIpEnabled: true,
                        collectDestinationIpEnabled: true
                    },
                    collectSipStatsEnabled: true,
                    collectStaleRulesEnabled: false,
                    publisher: 'none',
                    smtpConfig: 'none'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    class: 'SecurityAnalytics',
                    invalidProperty: ''
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert(getErrorString().includes('"additionalProperty": "invalidProperty"'));
            });
        });
    });

    it('SecurityWaf', () => {
        describe('valid', () => {
            it('should validate minimal data', () => {
                const data = {
                    class: 'SecurityWaf'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties and mutliple advanced settings', () => {
                const data = {
                    antiVirusProtection: {
                        guaranteeenforcementEnabled: true,
                        hostname: 'do.test',
                        port: 123
                    },
                    advancedSettings: [
                        {
                            name: 'long_request_buffer_size',
                            value: 1000
                        },
                        {
                            name: 'send_content_events',
                            value: 1
                        },
                        {
                            name: 'ecard_regexp_decimal',
                            value: 'string'
                        }
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    class: 'SecurityWaf',
                    invalidProperty: ''
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert(getErrorString().includes('"additionalProperty": "invalidProperty"'));
            });

            it('should invalidate a string used for an integer setting', () => {
                const data = {
                    class: 'SecurityWaf',
                    advancedSettings: [
                        {
                            name: 'long_request_buffer_size',
                            value: 'invalid'
                        },
                        {
                            name: 'send_content_events',
                            value: 1
                        }
                    ]
                };
                assert.strictEqual(validate(data), false, 'should be integer');
                assert(getErrorString().includes('should be integer'));
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
