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

// Remove the .skip once AUTOTOOL-3700 has been resolved.
describe('Security Analytics', function testSecurityAnalyticsSuite() {
    this.timeout(900000);

    before(() => {
        const modules = ['afm'];
        return provisionModules(modules);
    });

    after(() => {
        const modules = ['afm'];
        return deProvisionModules(modules);
    });

    it('All properties', () => {
        const properties = [
            {
                name: 'aclRules',
                inputValue: [
                    {},
                    {
                        collectClientIpEnabled: false,
                        collectClientPortEnabled: true,
                        collectDestinationIpEnabled: false,
                        collectDestinationPortEnabled: false,
                        collectServerSideStatsEnabled: true
                    },
                    {}
                ],
                expectedValue: [
                    {
                        collectClientIp: 'enabled',
                        collectClientPort: 'disabled',
                        collectDestIp: 'enabled',
                        collectDestPort: 'enabled',
                        collectServerSideStats: 'disabled'
                    },
                    {
                        collectClientIp: 'disabled',
                        collectClientPort: 'enabled',
                        collectDestIp: 'disabled',
                        collectDestPort: 'disabled',
                        collectServerSideStats: 'enabled'
                    },
                    {
                        collectClientIp: 'enabled',
                        collectClientPort: 'disabled',
                        collectDestIp: 'enabled',
                        collectDestPort: 'enabled',
                        collectServerSideStats: 'disabled'
                    }
                ]
            },
            {
                name: 'collectAllDosStatsEnabled',
                inputValue: [undefined, true, undefined],
                expectedValue: ['disabled', 'enabled', 'disabled']
            },
            {
                name: 'collectedStatsExternalLoggingEnabled',
                inputValue: [undefined, true, undefined],
                expectedValue: ['disabled', 'enabled', 'disabled']
            },
            {
                name: 'collectedStatsInternalLoggingEnabled',
                inputValue: [undefined, true, undefined],
                expectedValue: ['disabled', 'enabled', 'disabled']
            },
            {
                name: 'dns',
                inputValue: [
                    {},
                    {
                        collectClientIpEnabled: false,
                        collectDestinationIpEnabled: false
                    },
                    {}
                ],
                expectedValue: [
                    {
                        collectClientIp: 'enabled',
                        collectDestinationIp: 'enabled'
                    },
                    {
                        collectClientIp: 'disabled',
                        collectDestinationIp: 'disabled'
                    },
                    {
                        collectClientIp: 'enabled',
                        collectDestinationIp: 'enabled'
                    }
                ]
            },
            {
                name: 'collectDnsStatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'dosL2L4',
                inputValue: [
                    {},
                    {
                        collectClientIpEnabled: false,
                        collectDestinationGeoEnabled: false
                    },
                    {}
                ],
                expectedValue: [
                    {
                        collectClientIp: 'enabled',
                        collectDestGeo: 'enabled'
                    },
                    {
                        collectClientIp: 'disabled',
                        collectDestGeo: 'disabled'
                    },
                    {
                        collectClientIp: 'enabled',
                        collectDestGeo: 'enabled'
                    }
                ]
            },
            {
                name: 'collectDosL3StatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'collectFirewallAclStatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'collectFirewallDropsStatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'collectIpReputationStatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'l3L4Errors',
                inputValue: [
                    {},
                    {
                        collectClientIpEnabled: false,
                        collectDestinationIpEnabled: false
                    },
                    {}
                ],
                expectedValue: [
                    {
                        collectClientIp: 'enabled',
                        collectDestIp: 'enabled'
                    },
                    {
                        collectClientIp: 'disabled',
                        collectDestIp: 'disabled'
                    },
                    {
                        collectClientIp: 'enabled',
                        collectDestIp: 'enabled'
                    }
                ]
            },
            {
                name: 'collectSipStatsEnabled',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'collectStaleRulesEnabled',
                inputValue: [
                    undefined,
                    true,
                    undefined
                ],
                expectedValue: [
                    {
                        collect: 'disabled'
                    },
                    {
                        collect: 'enabled'
                    },
                    {
                        collect: 'disabled'
                    }
                ],
                extractFunction: (o) => o.staleRules
            },
            {
                name: 'publisher',
                inputValue: [undefined, 'default-ipsec-log-publisher', undefined],
                expectedValue: [undefined, 'default-ipsec-log-publisher', undefined],
                extractFunction: (o) => (o.publisher ? o.publisher.name : undefined)
            },
            {
                name: 'smtpConfig',
                inputValue: [undefined, 'testSmtpServer', undefined],
                expectedValue: [undefined, 'testSmtpServer', undefined],
                extractFunction: (o) => (o.smtpConfig ? o.smtpConfig.name : undefined)
            }
        ];

        const options = {
            bigipItems: [
                {
                    endpoint: '/tm/sys/smtp-server',
                    data: {
                        name: 'testSmtpServer',
                        smtpServerHostName: 'test.hostname',
                        localHostName: 'local.hostname',
                        fromAddress: 'example@example.com'
                    }
                }
            ]
        };

        return assertClass('SecurityAnalytics', properties, options);
    });
});
