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
const Validator = require('../../../src/lib/routingPrefixListValidator');

const validator = new Validator();

describe('routingPrefixListValidator', () => {
    describe('valid', () => {
        it('should validate valid routing prefix lists', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList1: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:8888/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:8888/127',
                                    prefixLengthRange: 128
                                }
                            ]
                        },
                        exampleRoutingPrefixList2: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/23',
                                    prefixLengthRange: 24
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate when there is nothing to validate', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {}
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate when entries property is missing', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList1: {
                            class: 'RoutingPrefixList'
                        }

                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate when entries property is empty', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList1: {
                            class: 'RoutingPrefixList',
                            entries: []
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
        it('should invalidate if prefixLengthRange is equal to or less than ipv4 prefix property length', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 10,
                                    action: 'permit',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:8888/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:8888/128',
                                    prefixLengthRange: 128
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList prefixLengthRange (128) must be 0 or greater than prefix (1111:2222:3333:4444:5555:6666:7777:8888/128) length');
                });
        });

        it('should invalidate if prefixLengthRange is equal to or less than ipv6 prefix property length', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/24',
                                    prefixLengthRange: 24
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList prefixLengthRange (24) must be 0 or greater than prefix (10.4.4.0/24) length');
                });
        });

        it('should invalidate if prefixLengthRange is greater than 32 if prefix is an ipv4 address', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 20,
                                    action: 'permit',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: 32
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/24',
                                    prefixLengthRange: 33
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList prefixLengthRange must be <= 32 for IPv4 prefix');
                });
        });
    });
});
