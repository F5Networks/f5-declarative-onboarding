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
const Validator = require('../../../src/lib/userValidator');

const validator = new Validator();

describe('userValidator', () => {
    describe('valid', () => {
        it('should validate valid root user and 2 valid non-root users', () => {
            const wrapper = {
                targetHost: '192.0.2.10',
                declaration: {
                    Common: {
                        root: {
                            class: 'User',
                            userType: 'root'
                        },
                        user1: {
                            class: 'User',
                            userType: 'regular'
                        },
                        user2: {
                            class: 'User',
                            userType: 'regular'
                        },
                        userWithMaxLengthName_123456789: {
                            class: 'User',
                            userType: 'regular'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });
    });

    describe('invalid', () => {
        it('should invalidate a userType of "root" when user is not "root"', () => {
            const wrapper = {
                targetHost: '192.0.2.10',
                declaration: {
                    Common: {
                        user1: {
                            class: 'User',
                            userType: 'root'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'user1 must have userType regular');
                });
        });

        it('should invalidate a userType of "regular" when user is "root"', () => {
            const wrapper = {
                targetHost: '192.0.2.10',
                declaration: {
                    Common: {
                        root: {
                            class: 'User',
                            userType: 'regular'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'root must have userType root');
                });
        });

        it('should invalidate user names that are too long', () => {
            const wrapper = {
                targetHost: '192.0.2.10',
                declaration: {
                    Common: {
                        userWithTooLongName_123456789012: {
                            class: 'User',
                            userType: 'regular'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'userWithTooLongName_123456789012 is too long. User names must be less than 32 characters');
                });
        });
    });
});
