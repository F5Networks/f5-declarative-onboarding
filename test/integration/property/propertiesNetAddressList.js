/**
 * Copyright 2023 F5 Networks, Inc.
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
    getBigIpVersion
} = require('./propertiesCommon');

describe('Net Address List', function testNetAddressListClass() {
    this.timeout(480000);

    it('All properties', function testNetAddressList() {
        if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') < 0) {
            this.skip();
        }

        const addresses = [
            '10.0.0.10',
            '10.0.1.10-10.0.2.10',
            '10.0.2.0/24',
            'fd00:4153:3300::a',
            'fd00:4153:3300::b-fd00:4153:3300::f',
            'fd00:4153:6600::/54'
        ];

        const properties = [
            {
                name: 'remark',
                inputValue: [undefined, 'description', undefined],
                expectedValue: ['none', 'description', 'none'],
                extractFunction: (o) => o.description || 'none'
            },
            {
                name: 'addresses',
                inputValue: [['10.0.0.10'], addresses, ['10.0.0.10']],
                expectedValue: [
                    [{ name: '10.0.0.10' }],
                    addresses.map((a) => ({ name: a })),
                    [{ name: '10.0.0.10' }]
                ]
            }
        ];

        return assertClass('NetAddressList', properties, {});
    });
});
