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

const {
    assertClass
} = require('./propertiesCommon');

describe('Management Route', function testDnsResolver() {
    this.timeout(300000);

    let systemItem;
    let options;

    this.beforeEach(() => {
        systemItem = {
            class: 'System',
            preserveOrigDhcpRoutes: true
        };

        options = {
            extraItems: [systemItem]
        };
    });

    function assertManagementRouteClass(properties) {
        return assertClass('ManagementRoute', properties, options);
    }

    it('Regular routes', () => {
        const properties = [
            {
                name: 'remark',
                inputValue: [undefined, 'my remark', undefined],
                expectedValue: [undefined, 'my remark', undefined]
            },
            {
                name: 'gw',
                inputValue: ['10.10.0.1', '10.10.0.2', '10.10.0.1'],
                expectedValue: ['10.10.0.1', '10.10.0.2', '10.10.0.1']
            },
            {
                name: 'network',
                inputValue: ['10.10.200.0/24', '10.10.100.0/24', '10.10.200.0/24'],
                expectedValue: ['10.10.200.0/24', '10.10.100.0/24', '10.10.200.0/24']
            },
            {
                name: 'mtu',
                inputValue: [undefined, 1500, undefined],
                expectedValue: [0, 1500, 0]
            }
        ];

        return assertManagementRouteClass(properties, options);
    });

    it('Interface routes', () => {
        const properties = [
            {
                name: 'type',
                inputValue: ['interface'],
                expectedValue: ['interface']
            },
            {
                name: 'network',
                inputValue: ['10.10.10.1/32', '10.10.100.0/24', '10.10.10.1/32'],
                expectedValue: ['10.10.10.1/32', '10.10.100.0/24', '10.10.10.1/32']
            }
        ];

        return assertManagementRouteClass(properties, options);
    });

    it('should work with a pre-existing route with a / in the name', () => {
        const bigipItems = [
            {
                endpoint: '/tm/sys/management-route',
                data: {
                    name: '10.10.1.0/24',
                    gateway: '10.10.2.1',
                    network: '10.10.1.0/24'
                },
                skipDelete: true
            }
        ];

        options.bigipItems = bigipItems;

        const properties = [
            {
                name: 'gw',
                inputValue: ['10.10.0.1', '10.10.0.2', '10.10.0.1'],
                expectedValue: ['10.10.0.1', '10.10.0.2', '10.10.0.1']
            },
            {
                name: 'network',
                inputValue: ['10.10.200.0/24', '10.10.100.0/24', '10.10.200.0/24'],
                expectedValue: ['10.10.200.0/24', '10.10.100.0/24', '10.10.200.0/24']
            }
        ];

        return assertManagementRouteClass(properties, options);
    });
});
