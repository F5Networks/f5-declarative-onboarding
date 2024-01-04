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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const {
    assertClass,
    getBigIpVersion
} = require('./propertiesCommon');

describe('Net Port List', function testNetPortListClass() {
    this.timeout(480000);

    it('All properties', function testNetPortList() {
        if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') < 0) {
            this.skip();
        }
        const ports = [81, '90', '8080-8090'];

        const properties = [
            {
                name: 'remark',
                inputValue: [undefined, 'description', undefined],
                expectedValue: ['none', 'description', 'none'],
                extractFunction: (o) => o.description || 'none'
            },
            {
                name: 'ports',
                inputValue: [[80], ports, [80]],
                expectedValue: [
                    [{ name: '80' }],
                    ports.map((p) => ({ name: p.toString() })),
                    [{ name: '80' }]
                ]
            }
        ];

        return assertClass('NetPortList', properties, {});
    });
});
