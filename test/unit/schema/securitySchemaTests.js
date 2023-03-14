/**
 * Copyright 2023 F5 Networks, Inc.
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
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
