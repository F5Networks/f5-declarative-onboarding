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
    assertClass,
    deProvisionModules,
    provisionModules
} = require('./propertiesCommon');

describe('Security Waf', function testSecurityWafSuite() {
    this.timeout(900000);

    before(() => {
        const modules = ['asm'];
        return provisionModules(modules);
    });

    after(() => {
        const modules = ['asm'];
        return deProvisionModules(modules);
    });

    it('Anti Virus Protection', () => {
        const options = {
            skipIdempotentCheck: true,
            getMcpObject: {
                className: 'AntiVirusProtection'
            }
        };

        const properties = [
            {
                name: 'antiVirusProtection',
                inputValue: [
                    undefined,
                    {
                        guaranteeEnforcementEnabled: false,
                        hostname: 'do.test',
                        port: 123
                    },
                    undefined
                ],
                expectedValue: [
                    {
                        guaranteeEnforcement: true,
                        hostname: '',
                        port: 1344
                    },
                    {
                        guaranteeEnforcement: false,
                        hostname: 'do.test',
                        port: 123
                    },
                    {
                        guaranteeEnforcement: true,
                        hostname: '',
                        port: 1344
                    }
                ],
                extractFunction: (o) => o
            }
        ];

        return assertClass('SecurityWaf', properties, options);
    });

    it('Advanced Settings', () => {
        const options = {
            skipIdempotentCheck: true,
            getMcpObject: {
                className: 'WafAdvancedSettings',
                itemKind: 'tm:asm:advanced-settings:advanced-settingstate',
                skipNameCheck: true
            },
            findAll: true
        };

        const properties = [
            {
                name: 'advancedSettings',
                inputValue: [
                    undefined,
                    [
                        {
                            name: 'max_raw_request_len',
                            value: 25000
                        },
                        {
                            name: 'reporting_search_timeout',
                            value: 100
                        },
                        {
                            name: 'virus_header_name',
                            value: 'X-Virus-Name,X-Infection-Found,X-Virus-ID'
                        }
                    ],
                    undefined
                ],
                expectedValue: [
                    [
                        {
                            name: 'max_raw_request_len',
                            value: 5000
                        },
                        {
                            name: 'reporting_search_timeout',
                            value: 60
                        },
                        {
                            value: 'X-Virus-Name,X-Infection-Found',
                            name: 'virus_header_name'
                        }
                    ],
                    [
                        {
                            name: 'max_raw_request_len',
                            value: 25000
                        },
                        {
                            name: 'reporting_search_timeout',
                            value: 100
                        },
                        {
                            value: 'X-Virus-Name,X-Infection-Found,X-Virus-ID',
                            name: 'virus_header_name'
                        }
                    ],
                    [
                        {
                            name: 'max_raw_request_len',
                            value: 5000
                        },
                        {
                            name: 'reporting_search_timeout',
                            value: 60
                        },
                        {
                            value: 'X-Virus-Name,X-Infection-Found',
                            name: 'virus_header_name'
                        }
                    ]
                ],
                extractFunction: (o) => {
                    const updatedSettings = ['max_raw_request_len', 'reporting_search_timeout', 'virus_header_name'];
                    const settings = o.filter((setting) => updatedSettings.indexOf(setting.name) >= 0)
                        .map((setting) => ({ name: setting.name, value: setting.value }));
                    return settings;
                }
            }
        ];

        return assertClass('SecurityWaf', properties, options);
    });
});
