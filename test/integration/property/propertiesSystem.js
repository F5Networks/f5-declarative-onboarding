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
    assertClass
} = require('./propertiesCommon');

describe('System', function testSystem() {
    this.timeout(300000);

    it('Global settings', () => {
        const options = {
            getMcpObject: {
                className: 'SysGlobalSettings',
                refItemKind: 'tm:sys:global-settings:global-settingsstate',
                skipNameCheck: true
            }
        };

        const properties = [
            {
                name: 'preserveOrigDhcpRoutes',
                inputValue: [undefined, true, undefined],
                skipAssert: true
            },
            {
                name: 'mgmtDhcpEnabled',
                inputValue: [false, true, false],
                expectedValue: ['disabled', 'enabled', 'disabled']
            },
            {
                name: 'guiSecurityBanner',
                inputValue: [true, false, true],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'guiSecurityBannerText',
                inputValue: [undefined, 'Sunday\nMonday\nTuesday', undefined],
                expectedValue: [
                    'Welcome to the BIG-IP Configuration Utility.\n\nLog in with your username and password using the fields on the left.',
                    'Sunday\nMonday\nTuesday',
                    'Welcome to the BIG-IP Configuration Utility.\n\nLog in with your username and password using the fields on the left.'
                ]
            },
            {
                name: 'usernamePrompt',
                inputValue: [undefined, 'Your username:', undefined],
                expectedValue: ['Username', 'Your username:', 'Username']
            },
            {
                name: 'passwordPrompt',
                inputValue: [undefined, 'Your password:', undefined],
                expectedValue: ['Password', 'Your password:', 'Password']
            }
        ];

        return assertClass('System', properties, options);
    });
});
