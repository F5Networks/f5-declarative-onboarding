/**
 * Copyright 2020 F5 Networks, Inc.
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
const gslbSchema = require('../../../src/schema/latest/gslb.schema.json');
const customFormats = require('../../../src/schema/latest/formats.js');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv.compile(gslbSchema);

/* eslint-disable quotes, quote-props */

describe('gslb.schema.json', () => {
    describe('GSLBGlobals class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: "GSLBGlobals"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationEnabled: true,
                        synchronizationGroupName: "newGroupName",
                        synchronizationTimeTolerance: 123,
                        synchronizationTimeout: 100
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate synchronizationTimeTolerance value that is out of range', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeTolerance: 601
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeTolerance should be in the 0-600 range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 600'), -1);
            });

            it('should invalidate synchronizationTimeout value that is out of range', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeout: 4294967296
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeout should be in the 0-4294967295 range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 4294967295'), -1);
            });

            it('should invalidate values 0 and 4 for synchronizationTimeTolerance', () => {
                const data = {
                    class: "GSLBGlobals",
                    general: {
                        synchronizationTimeTolerance: 3
                    }
                };
                assert.strictEqual(validate(data), false, 'synchronizationTimeTolerance should not allow values 1-4');
                assert.notStrictEqual(getErrorString().indexOf('should NOT be valid'), -1);
            });
        });
    });

    describe('GSLBDataCenter class', () => {
        describe('valid', () => {
            it('should validate minimal properties', () => {
                const data = {
                    class: 'GSLBDataCenter'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate all properties', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    enabled: false,
                    location: 'dataCenterLocation',
                    contact: 'dataCenterContact',
                    proberPreferred: 'pool',
                    proberFallback: 'any-available',
                    proberPool: '/Common/proberPool'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate invalid proberPreferred value', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberPreferred: 'invalid'
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf(''), -1);
            });

            it('should invalidate invalid proberFallback value', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberFallback: 'invalid'
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf(''), -1);
            });

            it('should invalidate use of proberPool when proberPreferred or proberFallback are not pool', () => {
                const data = {
                    class: 'GSLBDataCenter',
                    proberFallback: 'outside-datacenter',
                    proberPreferred: 'inside-datacenter',
                    proberPool: '/Common/proberPool'
                };
                assert.strictEqual(validate(data), false, '');
                assert.notStrictEqual(getErrorString().indexOf(''), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
