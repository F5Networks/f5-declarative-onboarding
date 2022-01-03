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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const {
    assertClass,
    getBigIpVersion,
    getItemName
} = require('./propertiesCommon');

describe('Snmp', function testSnmp() {
    this.timeout(600000);

    describe('Snmp Community', () => {
        function assertSnmpCommunityClass(properties, options) {
            return assertClass('SnmpCommunity', properties, options);
        }

        const options = {};

        it('All Properties', () => {
            const properties = [
                {
                    name: 'ipv6',
                    inputValue: [undefined, 'true', undefined],
                    expectedValue: ['disabled', 'enabled', 'disabled']
                },
                {
                    name: 'source',
                    inputValue: [undefined, 'all', undefined],
                    expectedValue: [undefined, 'all', undefined]
                },
                {
                    name: 'oid',
                    inputValue: [undefined, '.1', undefined],
                    expectedValue: [undefined, '.1', undefined]
                },
                {
                    name: 'access',
                    inputValue: [undefined, 'rw', undefined],
                    expectedValue: ['ro', 'rw', 'ro']
                },
                {
                    name: 'name',
                    inputValue: [undefined, 'special!community', undefined],
                    expectedValue: [
                        getItemName({ tenantName: 'Common' }),
                        'special!community',
                        getItemName({ tenantName: 'Common' })
                    ]
                }
            ];

            return assertSnmpCommunityClass(properties, options);
        });
    });

    describe('Snmp User', () => {
        function assertSnmpUserClass(properties, options) {
            return assertClass('SnmpUser', properties, options);
        }

        const options = {
            skipIdempotentCheck: true // items with passwords are not idempotent
        };

        it('All Properties 14.0+', function snmpUserTest() {
            if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') < 0) {
                this.skip();
            }

            const properties = [
                {
                    name: 'authentication',
                    inputValue: [undefined, { protocol: 'sha', password: 'pass1W0rd!' }, undefined],
                    expectedValue: [
                        { authProtocol: undefined, authPasswordExists: false },
                        { authProtocol: 'sha', authPasswordExists: true },
                        { authProtocol: undefined, authPasswordExists: false }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.authPasswordEncrypted;
                        return {
                            authProtocol: o.authProtocol,
                            authPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'privacy',
                    inputValue: [undefined, { protocol: 'aes', password: 'P@ssW0rd' }, undefined],
                    expectedValue: [
                        { privacyProtocol: undefined, privacyPasswordExists: false },
                        { privacyProtocol: 'aes', privacyPasswordExists: true },
                        { privacyProtocol: undefined, privacyPasswordExists: false }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.privacyPasswordEncrypted;
                        return {
                            privacyProtocol: o.privacyProtocol,
                            privacyPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'oid',
                    inputValue: [undefined, '.5', undefined],
                    expectedValue: ['.1', '.5', '.1']
                },
                {
                    name: 'access',
                    inputValue: [undefined, 'rw', undefined],
                    expectedValue: ['ro', 'rw', 'ro']
                },
                {
                    name: 'name',
                    inputValue: [undefined, 'special!user', undefined],
                    expectedValue: [
                        getItemName({ tenantName: 'Common' }),
                        'special!user',
                        getItemName({ tenantName: 'Common' })
                    ]
                }
            ];

            return assertSnmpUserClass(properties, options);
        });

        /*
         * On 13.1, passwords cannot be cleared once set. This means we cannot test
         * transitioning from a password to no password.
         */
        it('All Properties 13.1', function snmpUserTest() {
            if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') >= 0) {
                this.skip();
            }

            const properties = [
                {
                    name: 'authentication',
                    inputValue: [undefined, { protocol: 'sha', password: 'pass1W0rd!' }],
                    expectedValue: [
                        { authProtocol: undefined, authPasswordExists: false },
                        { authProtocol: 'sha', authPasswordExists: true }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.authPasswordEncrypted;
                        return {
                            authProtocol: o.authProtocol,
                            authPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'privacy',
                    inputValue: [undefined, { protocol: 'aes', password: 'P@ssW0rd' }],
                    expectedValue: [
                        { privacyProtocol: undefined, privacyPasswordExists: false },
                        { privacyProtocol: 'aes', privacyPasswordExists: true }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.privacyPasswordEncrypted;
                        return {
                            privacyProtocol: o.privacyProtocol,
                            privacyPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'oid',
                    inputValue: [undefined, '.5', undefined],
                    expectedValue: ['.1', '.5', '.1']
                },
                {
                    name: 'access',
                    inputValue: [undefined, 'rw', undefined],
                    expectedValue: ['ro', 'rw', 'ro']
                },
                {
                    name: 'name',
                    inputValue: [undefined, 'special!user', undefined],
                    expectedValue: [
                        getItemName({ tenantName: 'Common' }),
                        'special!user',
                        getItemName({ tenantName: 'Common' })
                    ]
                }
            ];

            return assertSnmpUserClass(properties, options);
        });
    });

    describe('Snmp Trap Destination', () => {
        function assertSnmpTrapDestinationClass(properties, options) {
            return assertClass('SnmpTrapDestination', properties, options);
        }

        const options = {
            skipIdempotentCheck: true // items with passwords are not idempotent
        };

        it('All Properties 14.0+', function snmpTrapDestinationTest() {
            if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') < 0) {
                this.skip();
            }

            const properties = [
                {
                    name: 'version',
                    inputValue: [undefined, '3', undefined],
                    expectedValue: ['2c', '3', '2c']
                },
                {
                    name: 'destination',
                    inputValue: ['10.0.10.100', 'fdf5:4153:3300::a', '10.0.10.100'],
                    expectedValue: ['10.0.10.100', 'fdf5:4153:3300::a', '10.0.10.100']
                },
                {
                    name: 'port',
                    inputValue: [80, 8443, 80],
                    expectedValue: [80, 8443, 80]
                },
                {
                    name: 'network',
                    inputValue: [undefined, 'other', undefined],
                    expectedValue: ['mgmt', 'other', 'mgmt']
                },
                {
                    name: 'community',
                    inputValue: ['public', undefined, 'public'],
                    expectedValue: ['public', undefined, 'public']
                },
                {
                    name: 'securityName',
                    inputValue: [undefined, 'someSnmpUser', undefined],
                    expectedValue: [undefined, 'someSnmpUser', undefined]
                },
                {
                    name: 'engineId',
                    inputValue: [undefined, '0x80001f8880c6b6067fdacfb558', undefined],
                    expectedValue: [undefined, '0x80001f8880c6b6067fdacfb558', undefined]
                },
                {
                    name: 'authentication',
                    inputValue: [undefined, { protocol: 'sha', password: 'pass1W0rd!' }, undefined],
                    expectedValue: [
                        { authProtocol: undefined, authPasswordExists: false },
                        { authProtocol: 'sha', authPasswordExists: true },
                        { authProtocol: undefined, authPasswordExists: false }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.authPasswordEncrypted;
                        return {
                            authProtocol: o.authProtocol,
                            authPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'privacy',
                    inputValue: [undefined, { protocol: 'aes', password: 'P@ssW0rd' }, undefined],
                    expectedValue: [
                        { privacyProtocol: undefined, privacyPasswordExists: false },
                        { privacyProtocol: 'aes', privacyPasswordExists: true },
                        { privacyProtocol: undefined, privacyPasswordExists: false }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.privacyPasswordEncrypted;
                        return {
                            privacyProtocol: o.privacyProtocol,
                            privacyPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                }
            ];

            return assertSnmpTrapDestinationClass(properties, options);
        });

        /*
         * On 13.1, passwords cannot be cleared once set. This means we cannot test
         * transitioning from a password to no password, from version 3 to either 1 or 2c,
         * from security name to no security name, or from no community to community.
         */
        it('All Properties 13.1', function snmpTrapDestinationTest() {
            if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') >= 0) {
                this.skip();
            }

            const properties = [
                {
                    name: 'version',
                    inputValue: [undefined, '3'],
                    expectedValue: ['2c', '3']
                },
                {
                    name: 'destination',
                    inputValue: ['10.0.10.100', 'fdf5:4153:3300::a', '10.0.10.100'],
                    expectedValue: ['10.0.10.100', 'fdf5:4153:3300::a', '10.0.10.100']
                },
                {
                    name: 'port',
                    inputValue: [80, 8443, 80],
                    expectedValue: [80, 8443, 80]
                },
                {
                    name: 'network',
                    inputValue: [undefined, 'other', undefined],
                    expectedValue: ['mgmt', 'other', 'mgmt']
                },
                {
                    name: 'community',
                    inputValue: ['public', undefined],
                    expectedValue: ['public', undefined]
                },
                {
                    name: 'securityName',
                    inputValue: [undefined, 'someSnmpUser'],
                    expectedValue: [undefined, 'someSnmpUser']
                },
                {
                    name: 'authentication',
                    inputValue: [undefined, { protocol: 'sha', password: 'pass1W0rd!' }],
                    expectedValue: [
                        { authProtocol: undefined, authPasswordExists: false },
                        { authProtocol: 'sha', authPasswordExists: true }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.authPasswordEncrypted;
                        return {
                            authProtocol: o.authProtocol,
                            authPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                },
                {
                    name: 'privacy',
                    inputValue: [undefined, { protocol: 'aes', password: 'P@ssW0rd' }],
                    expectedValue: [
                        { privacyProtocol: undefined, privacyPasswordExists: false },
                        { privacyProtocol: 'aes', privacyPasswordExists: true }
                    ],
                    extractFunction: (o) => {
                        const pEncrypted = o.privacyPasswordEncrypted;
                        return {
                            privacyProtocol: o.privacyProtocol,
                            privacyPasswordExists: typeof pEncrypted === 'string'
                            && pEncrypted.length > 0
                        };
                    }
                }
            ];

            return assertSnmpTrapDestinationClass(properties, options);
        });
    });
});
