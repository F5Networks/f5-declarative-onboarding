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
const Validator = require('../../../src/lib/routingBgpValidator');

const validator = new Validator();

describe('routingBgpValidator', () => {
    describe('addressFamilies', () => {
        let wrapper;

        beforeEach(() => {
            wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingBgp: {
                            class: 'RoutingBGP',
                            localAS: 1
                        }
                    }
                }
            };
        });

        describe('valid', () => {
            it('should validate when internetProtocol is set to all', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { interpetProtocol: 'all' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when internetProtocol is set to ipv4', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { interpetProtocol: 'ipv4' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when internetProtocol is set to ipv6', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { interpetProtocol: 'ipv6' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when internetProtocol is set to ipv4 and ipv6', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { internetProtocol: 'ipv4' },
                    { internetProtocol: 'ipv6' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });
        });
        describe('invalid', () => {
            it('should invalidate when internetProtocol is set to ipv4 and all', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { internetProtocol: 'ipv4' },
                    { internetProtocol: 'all' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid);
                        assert.strictEqual(validation.errors[0], 'RoutingBGP addressFamilies internetProtocol value "all" must not be used with any other internetProtocol value');
                    });
            });

            it('should invalidate when internetProtocol is set to ipv6 and all', () => {
                wrapper.declaration.Common.exampleRoutingBgp.addressFamilies = [
                    { internetProtocol: 'ipv6' },
                    { internetProtocol: 'all' }
                ];
                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid);
                        assert.strictEqual(validation.errors[0], 'RoutingBGP addressFamilies internetProtocol value "all" must not be used with any other internetProtocol value');
                    });
            });
        });
    });

    describe('holdTime and keepAlive', () => {
        let wrapper;

        beforeEach(() => {
            wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRoutingBgp: {
                            class: 'RoutingBGP',
                            localAS: 1
                        }
                    }
                }
            };
        });

        describe('valid', () => {
            it('should validate when holdTime and keepAlive are 0', () => {
                wrapper.declaration.Common.exampleRoutingBgp.holdTime = 0;
                wrapper.declaration.Common.exampleRoutingBgp.keepAlive = 0;

                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when holdTime is 0 and keepAlive is not 0', () => {
                wrapper.declaration.Common.exampleRoutingBgp.holdTime = 0;
                wrapper.declaration.Common.exampleRoutingBgp.keepAlive = 60;

                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when holdTime is 3 times greater than keepAlive', () => {
                wrapper.declaration.Common.exampleRoutingBgp.holdTime = 180;
                wrapper.declaration.Common.exampleRoutingBgp.keepAlive = 60;

                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(validation.isValid);
                    });
            });

            it('should validate when holdTime and keepAlive are missing', () => validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                }));

            it('should validate when there is nothing to validate', () => {
                wrapper = {
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
        });

        describe('invalid', () => {
            it('should invalidate if more than 1 RoutingBGP', () => {
                wrapper.declaration.Common.exampleRoutingBgp2 = JSON.parse(
                    JSON.stringify(wrapper.declaration.Common.exampleRoutingBgp)
                );

                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid);
                        assert.strictEqual(validation.errors[0], 'Only 1 instance of RoutingBGP can be created');
                    });
            });

            it('should invalidate when holdTime is less than 3 times keepAlive', () => {
                wrapper.declaration.Common.exampleRoutingBgp.holdTime = 179;
                wrapper.declaration.Common.exampleRoutingBgp.keepAlive = 60;

                return validator.validate(wrapper)
                    .then((validation) => {
                        assert.ok(!validation.isValid);
                        assert.strictEqual(validation.errors[0], 'RoutingBGP holdTime must be 0 or at least 3 times keepAlive');
                    });
            });
        });
    });

    describe('routeMaps in peerGroups', () => {
        let wrapper;

        beforeEach(() => {
            wrapper = {
                targetHost: '1.2.3.4',
                declaration: {
                    Common: {
                        exampleRouteMap1: {
                            class: 'RouteMap',
                            routeDomain: 'one'
                        },
                        exampleRouteMap2: {
                            class: 'RouteMap',
                            routeDomain: 'one'
                        },
                        exampleRouteMap3: {
                            class: 'RouteMap',
                            routeDomain: 'one'
                        },
                        exampleRouteMap4: {
                            class: 'RouteMap',
                            routeDomain: 'one'
                        },
                        exampleRoutingBgp: {
                            class: 'RoutingBGP',
                            localAS: 1,
                            peerGroups: [
                                {
                                    name: 'Neighbor1',
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            routeMap: {
                                                in: 'exampleRouteMap1',
                                                out: 'exampleRouteMap2'
                                            }
                                        },
                                        {
                                            internetProtocol: 'ipv6',
                                            routeMap: {
                                                in: 'exampleRouteMap1',
                                                out: 'exampleRouteMap3'
                                            }
                                        }
                                    ]
                                },
                                {
                                    name: 'Neighbor2',
                                    addressFamilies: [
                                        {
                                            internetProtocol: 'ipv4',
                                            routeMap: {
                                                in: 'exampleRouteMap2',
                                                out: 'exampleRouteMap4'
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };
        });

        it('should validate if all peer group address families route domains match bgp', () => {
            wrapper.declaration.Common.exampleRoutingBgp.routeDomain = 'one';
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should invalidate if peer group address families route domains do not match bgp', () => {
            wrapper.declaration.Common.exampleRoutingBgp.routeDomain = 'two';
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    [0, 1, 2, 3].forEach((i) => {
                        assert.strictEqual(validation.errors[i], `RoutingBGP peerGroups addressFamilies routeMap exampleRouteMap${i + 1} must use the same routeDomain as RoutingBGP (two)`);
                    });
                });
        });
    });
});
