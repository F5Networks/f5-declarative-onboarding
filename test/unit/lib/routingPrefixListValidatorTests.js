/**
 * Copyright 2021 F5 Networks, Inc.
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
        it('should validate single-value prefixLengthRange', () => {
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
                                    prefixLengthRange: '32'
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:8888/127',
                                    prefixLengthRange: '128'
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
                                    prefixLengthRange: '32'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/23',
                                    prefixLengthRange: '24'
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

        it('should validate multi-value prefixLengthRange', () => {
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
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:aaaa/24',
                                    prefixLengthRange: '25:32'
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:bbbb/64',
                                    prefixLengthRange: '65:65'
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
                                    prefixLengthRange: '25:32'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/16',
                                    prefixLengthRange: '17:17'
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

        it('should validate when prefixLength range is 0', () => {
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
                                    prefixLengthRange: '0'
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
                                    prefixLengthRange: '0'
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

        it('should validate prefixLengthRange if start or end is 0', () => {
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
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:aaaa/24',
                                    prefixLengthRange: '0:32'
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:bbbb/64',
                                    prefixLengthRange: '65:0'
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
                                    prefixLengthRange: '0:32'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/16',
                                    prefixLengthRange: '17:0'
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

        it('should validate prefixLengthRange if start or end is missing', () => {
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
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:aaaa/24',
                                    prefixLengthRange: ':32'
                                },
                                {
                                    name: 15,
                                    action: 'deny',
                                    prefix: '1111:2222:3333:4444:5555:6666:7777:bbbb/64',
                                    prefixLengthRange: '65:'
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
                                    prefixLengthRange: ':32'
                                },
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/16',
                                    prefixLengthRange: '17:'
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
        it('should invalidate if prefixLengthRange is only a colon', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/24',
                                    prefixLengthRange: ':'
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid, 'should be invalid declaration with prefixLengthRange that is just a colon');
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'30\' prefixLengthRange cannot be \':\' or \'\'');
                    assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                });
        });

        it('should invalidate if prefixLengthRange is only empty string', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/24',
                                    prefixLengthRange: ''
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid, 'should be invalid declaration with prefixLengthRange that is empty string');
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'30\' prefixLengthRange cannot be \':\' or \'\'');
                    assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                });
        });

        it('should invalidate if range start greater than end unless end is 0', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingPrefixList: {
                            class: 'RoutingPrefixList',
                            entries: [
                                {
                                    // valid
                                    name: 15,
                                    action: 'deny',
                                    prefix: '10.3.3.0/24',
                                    prefixLengthRange: '30:0'
                                },
                                {
                                    // invalid
                                    name: 30,
                                    action: 'deny',
                                    prefix: '10.4.4.0/24',
                                    prefixLengthRange: '30:29'
                                }
                            ]
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid, 'should be invalid declaration with prefixLengthRange start greater than end');
                    assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'30\' prefixLengthRange start value must not be greater than end value');
                    assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                });
        });

        describe('hard range limit exceeded', () => {
            it('should invalidate if prefixLengthRange is greater than 32 if prefix is an ipv4 address', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingPrefixList: {
                                class: 'RoutingPrefixList',
                                entries: [
                                    {
                                        // valid
                                        name: 20,
                                        action: 'permit',
                                        prefix: '10.3.3.0/24',
                                        prefixLengthRange: '32'
                                    },
                                    {
                                        // invalid
                                        name: 30,
                                        action: 'deny',
                                        prefix: '10.4.4.0/24',
                                        prefixLengthRange: '33'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid declaration with out of range prefixLengthRange');
                        assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'30\' prefixLengthRange must be <= 32 for IPv4 prefix');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });

            it('should invalidate if prefixLengthRange is greater than 128 if prefix is an ipv6 address', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingPrefixList: {
                                class: 'RoutingPrefixList',
                                entries: [
                                    {
                                        // valid
                                        name: 10,
                                        action: 'permit',
                                        prefix: '1111:2222:3333:4444:5555:6666:7777:8888/24',
                                        prefixLengthRange: '128'
                                    },
                                    {
                                        // invalid
                                        name: 15,
                                        action: 'deny',
                                        prefix: '1111:2222:3333:4444:5555:6666:7777:8888/64',
                                        prefixLengthRange: '129'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid declaration with out of range prefixLengthRange');
                        assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'15\' prefixLengthRange must be <= 128 for IPv6 prefix');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });
        });

        describe('prefix length limit exceeded', () => {
            it('should invalidate if prefixLengthRange is equal to or less than ipv6 prefix property length', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingPrefixList: {
                                class: 'RoutingPrefixList',
                                entries: [
                                    {
                                        // valid
                                        name: 10,
                                        action: 'permit',
                                        prefix: '1111:2222:3333:4444:5555:6666:7777:8888/64',
                                        prefixLengthRange: '65'
                                    },
                                    {
                                        // invalid
                                        name: 15,
                                        action: 'deny',
                                        prefix: '1111:2222:3333:4444:5555:6666:7777:8888/64',
                                        prefixLengthRange: '64'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid declaration with prefixLengthRange that exceeds prefix length');
                        assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'15\' prefixLengthRange must be 0 or greater than prefix (1111:2222:3333:4444:5555:6666:7777:8888/64) length of 64');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });

            it('should invalidate if prefixLengthRange is equal to or less than ipv4 prefix property length', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingPrefixList: {
                                class: 'RoutingPrefixList',
                                entries: [
                                    {
                                        // valid
                                        name: 20,
                                        action: 'permit',
                                        prefix: '10.3.3.0/24',
                                        prefixLengthRange: '25'
                                    },
                                    {
                                        // invalid
                                        name: 30,
                                        action: 'deny',
                                        prefix: '10.4.4.0/24',
                                        prefixLengthRange: '24'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid declaration with prefixLengthRange that exceeds prefix length');
                        assert.strictEqual(validation.errors[0], 'RoutingPrefixList \'exampleRoutingPrefixList\' entry \'30\' prefixLengthRange must be 0 or greater than prefix (10.4.4.0/24) length of 24');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });
        });
    });
});
