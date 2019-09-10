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
const Validator = require('../../nodejs/userValidator');

const validator = new Validator();

describe('userValidator', () => {
    describe('valid', () => {
        it('should validate valid root user and 2 valid non-root users', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
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
                targetHost: '1.2.3.4',
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
                targetHost: '1.2.3.4',
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
    });
});
