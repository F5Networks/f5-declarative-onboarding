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
const Validator = require('../../../src/lib/routingAccessListValidator');

const validator = new Validator();

describe('routingAccessListValidator', () => {
    describe('isAnyAddress', () => {
        ['0.0.0.0', '0.0.0.0/0', '0.0.0.0/32', '::', '::/0', '::/128'].forEach((address) => {
            it(`should return true when address is ${address}`, () => {
                assert(validator.isAnyAddress(address), `${address} should of returned true`);
            });
        });
        ['10.10.10.10', '10.10.10.10/32', '1111:2222::', '1111:2222::/128', 6].forEach((address) => {
            it(`should return false when address is ${address}`, () => {
                assert(!validator.isAnyAddress(address), `${address} should of returned false`);
            });
        });
    });

    describe('validate', () => {
        describe('valid', () => {
            it('should validate single item entries', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingAccessList1: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 10,
                                        action: 'permit',
                                        source: '10.10.10.10',
                                        exactMatchEnabled: false,
                                        destination: '10.10.11.11'
                                    }
                                ]
                            },
                            exampleRoutingAccessList2: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 20,
                                        action: 'permit',
                                        source: '1111:2222:3333::/48',
                                        exactMatchEnabled: false,
                                        destination: '1111:2222:4444::/48'
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

            it('should validate multiple item entries with a single exactMatch true', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingAccessList1: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 10,
                                        action: 'permit',
                                        source: '10.10.10.10',
                                        exactMatchEnabled: true,
                                        destination: '0.0.0.0'
                                    },
                                    {
                                        name: 20,
                                        action: 'permit',
                                        source: '10.10.10.12',
                                        exactMatchEnabled: false,
                                        destination: '0.0.0.0/0'
                                    },
                                    {
                                        name: 30,
                                        action: 'permit',
                                        source: '10.10.10.13',
                                        exactMatchEnabled: false,
                                        destination: '0.0.0.0/128'
                                    }
                                ]
                            },
                            exampleRoutingAccessList2: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 15,
                                        action: 'permit',
                                        source: '1111:2222:3333::/48',
                                        exactMatchEnabled: true,
                                        destination: '::'
                                    },
                                    {
                                        name: 25,
                                        action: 'permit',
                                        source: '1111:2222:4444::/48',
                                        exactMatchEnabled: false,
                                        destination: '::/0'
                                    },
                                    {
                                        name: 35,
                                        action: 'permit',
                                        source: '1111:2222:5555::/48',
                                        exactMatchEnabled: false,
                                        destination: '::/128'
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
        });

        describe('invalid', () => {
            it('should invalidate any non-any-address destination when any 1 entry has exactMatch true', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingAccessList: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 10,
                                        action: 'permit',
                                        source: '10.10.10.10',
                                        exactMatchEnabled: true,
                                        destination: '::'
                                    },
                                    {
                                        name: 20,
                                        action: 'permit',
                                        source: '10.10.10.11',
                                        exactMatchEnabled: false,
                                        destination: '10.10.10.12'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid declaration when exactMatchEnabled is set anywhere and destination is non-default value anywhere');
                        assert.strictEqual(validation.errors[0], 'RoutingAccessList \'exampleRoutingAccessList\': if any entry has exactMatchEnabled true then no entries can have a destination set');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });

            it('should invalidate mixing address families in the same entry', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingAccessList: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 10,
                                        action: 'permit',
                                        source: '10.10.10.10',
                                        exactMatchEnabled: false,
                                        destination: '1111::'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid because the entries array mixes address families');
                        assert.strictEqual(validation.errors[0], 'RoutingAccessList \'exampleRoutingAccessList\': entries cannot mix address families');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });

            it('should invalidate mixing address families across entries', () => {
                const wrapper = {
                    targetHost: '1.2.3.4',
                    declaration: {
                        Common: {
                            exampleRoutingAccessList: {
                                class: 'RoutingAccessList',
                                entries: [
                                    {
                                        name: 10,
                                        action: 'permit',
                                        source: '10.10.10.10',
                                        exactMatchEnabled: false,
                                        destination: '20.20.20.20'
                                    },
                                    {
                                        name: 20,
                                        action: 'permit',
                                        source: '1111::',
                                        exactMatchEnabled: false,
                                        destination: '2222::'
                                    }
                                ]
                            }
                        }
                    }
                };
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid, 'should be invalid because the entries array mixes address families');
                        assert.strictEqual(validation.errors[0], 'RoutingAccessList \'exampleRoutingAccessList\': entries cannot mix address families');
                        assert.strictEqual(validation.errors.length, 1, 'should only report 1 error');
                    });
            });
        });
    });
});
