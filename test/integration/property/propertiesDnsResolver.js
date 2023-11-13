/**
 * Copyright 2023 F5, Inc.
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

const {
    assertClass
} = require('./propertiesCommon');

describe('DNS Resolver', function testDnsResolver() {
    this.timeout(300000);

    function assertDnsResolverClass(properties, options) {
        return assertClass('DNS_Resolver', properties, options);
    }

    it('All Properties', () => {
        const bigipItems = [
            {
                endpoint: '/tm/net/route-domain',
                data: { name: '1' }
            }
        ];

        const options = {
            bigipItems
        };

        const properties = [
            {
                name: 'answerDefaultZones',
                inputValue: [undefined, true, undefined],
                expectedValue: ['no', 'yes', 'no']
            },
            {
                name: 'cacheSize',
                inputValue: [undefined, 10, undefined],
                expectedValue: [5767168, 10, 5767168]
            },
            {
                name: 'forwardZones',
                inputValue: [
                    undefined,
                    [{ name: 'test.do.com', nameservers: ['192.0.2.20:8080'] }],
                    undefined
                ],
                expectedValue: [
                    [{ name: 'none' }],
                    [{ name: 'test.do.com', nameservers: [{ name: '192.0.2.20:8080' }] }],
                    [{ name: 'none' }]
                ]
            },
            {
                name: 'randomizeQueryNameCase',
                inputValue: [undefined, false, undefined],
                expectedValue: ['yes', 'no', 'yes']
            },
            {
                name: 'routeDomain',
                inputValue: [undefined, '1', undefined],
                expectedValue: ['/Common/0', '/Common/1', '/Common/0'],
                extractFunction: (o) => o.routeDomain.fullPath
            },
            {
                name: 'useIpv4',
                inputValue: [undefined, false, undefined],
                expectedValue: ['yes', 'no', 'yes']
            },
            {
                // IPv4 or IPv6 has to be enabled
                // Testing order reversed to avoid both being disabled
                name: 'useIpv6',
                inputValue: [false, undefined, false],
                expectedValue: ['no', 'yes', 'no']
            },
            {
                name: 'useTcp',
                inputValue: [undefined, false, undefined],
                expectedValue: ['yes', 'no', 'yes']
            },
            {
                // TCP or UDP has to be enabled
                // Testing order reversed to avoid both being disabled
                name: 'useUdp',
                inputValue: [false, undefined, false],
                expectedValue: ['no', 'yes', 'no']
            }
        ];

        return assertDnsResolverClass(properties, options);
    });
});
