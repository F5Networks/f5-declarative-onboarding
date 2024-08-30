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

const {
    assertClass,
    deProvisionModules,
    provisionModules
} = require('./propertiesCommon');

describe('GSLB Globals', function testGslbGlobalsSuite() {
    this.timeout(600000);

    before(() => {
        const modules = ['gtm'];
        return provisionModules(modules);
    });

    after(() => {
        const modules = ['gtm'];
        return deProvisionModules(modules);
    });

    it('All properties', () => {
        const properties = [
            {
                name: 'synchronizationEnabled',
                inputValue: [false, true, false],
                expectedValue: ['no', 'yes', 'no']
            },
            {
                name: 'synchronizationGroupName',
                inputValue: [undefined, 'myGroupName', undefined],
                expectedValue: ['default', 'myGroupName', 'default']
            },
            {
                name: 'synchronizationTimeTolerance',
                inputValue: [undefined, 20, undefined],
                expectedValue: [10, 20, 10]
            },
            {
                name: 'synchronizationTimeout',
                inputValue: [undefined, 80, undefined],
                expectedValue: [180, 80, 180]
            },
            {
                name: 'synchronizeZoneFiles',
                inputValue: [undefined, true, false, undefined],
                expectedValue: [false, true, false, false]
            }
        ];

        const options = {
            getMcpObject: {
                className: 'GSLBGeneral'
            },
            innerContainer: 'general'
        };

        return assertClass('GSLBGlobals', properties, options);
    });
});
