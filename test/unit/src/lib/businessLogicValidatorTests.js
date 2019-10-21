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
const Validator = require('../../../../src/lib/businessLogicValidator');

const validator = new Validator();

describe('businessLogicValidator', () => {
    describe('valid', () => {
        it('should handle Common.hostname', () => {
            const data = {
                class: 'DO',
                declaration: {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    Common: {
                        class: 'Tenant',
                        hostname: 'my.bigip.com'
                    }
                }
            };

            return validator.validate(data)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should handle Common.System.hostname', () => {
            const data = {
                class: 'DO',
                declaration: {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    Common: {
                        class: 'Tenant',
                        mySystem: {
                            class: 'System',
                            hostname: 'my.bigip.com'
                        }
                    }
                }
            };

            return validator.validate(data)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should handle Common.hostname with System defined w/o hostname', () => {
            const data = {
                class: 'DO',
                declaration: {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    Common: {
                        class: 'Tenant',
                        hostname: 'my.bigip.com',
                        mySystem: {
                            class: 'System'
                        }
                    }
                }
            };

            return validator.validate(data)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });
    });

    describe('invalid', () => {
        it('should invalidate redundant hostnames', () => {
            const data = {
                class: 'DO',
                declaration: {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    Common: {
                        hostname: '111.bigip.com',
                        class: 'Tenant',
                        mySystem: {
                            class: 'System',
                            hostname: '222.bigip.com'
                        }
                    }
                }
            };

            return validator.validate(data)
                .then((validation) => {
                    assert.strictEqual(validation.isValid, false);
                    assert.strictEqual(Array.isArray(validation.errors), true);
                    assert.strictEqual(validation.errors[0], 'multiple hostnames in declaration');
                });
        });
    });
});
