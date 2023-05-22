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

const {
    assertClass
} = require('./propertiesCommon');

describe('PasswordPolicy', function testPasswordPolicySuite() {
    this.timeout(600000);

    it('All properties', () => {
        const properties = [
            {
                name: 'expirationWarningDays',
                inputValue: [undefined, 10, undefined],
                expectedValue: [7, 10, 7]
            },
            {
                name: 'minLength',
                inputValue: [undefined, 11, undefined],
                expectedValue: [6, 11, 6]
            },
            {
                name: 'minDurationDays',
                inputValue: [undefined, 12, undefined],
                expectedValue: [0, 12, 0]
            },
            {
                name: 'maxDurationDays',
                inputValue: [undefined, 13, undefined],
                expectedValue: [99999, 13, 99999]
            },
            {
                name: 'lockoutDurationSeconds',
                inputValue: [undefined, 14, undefined],
                expectedValue: [0, 14, 0],
                minVersion: '15.1'
            },
            {
                name: 'maxLoginFailures',
                inputValue: [undefined, 15, undefined],
                expectedValue: [0, 15, 0]
            },
            {
                name: 'passwordMemory',
                inputValue: [undefined, 16, undefined],
                expectedValue: [0, 16, 0]
            },
            {
                name: 'policyEnforcementEnabled',
                inputValue: [true, false, true],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'requiredUppercase',
                inputValue: [undefined, 1, undefined],
                expectedValue: [0, 1, 0]
            },
            {
                name: 'requiredLowercase',
                inputValue: [undefined, 2, undefined],
                expectedValue: [0, 2, 0]
            },
            {
                name: 'requiredNumeric',
                inputValue: [undefined, 3, undefined],
                expectedValue: [0, 3, 0]
            },
            {
                name: 'requiredSpecial',
                inputValue: [undefined, 4, undefined],
                expectedValue: [0, 4, 0]
            }
        ];

        return assertClass('PasswordPolicy', properties);
    });
});
