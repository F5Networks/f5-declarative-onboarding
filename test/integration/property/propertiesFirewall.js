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

describe('Management IP Firewall', function testManagementIpFirewallClass() {
    this.timeout(480000);

    it('All properties', function testManagementIpFirewall() {
        if (cloudUtil.versionCompare(getBigIpVersion(), '14.0') < 0) {
            this.skip();
        }

        const options = {
            getMcpObject: {
                className: 'ManagementIpFirewall',
                itemKind: 'tm:security:firewall:management-ip-rules',
                refItemKind: 'tm:security:firewall:management-ip-rules:management-ip-rulesstate',
                skipNameCheck: false
            }
        };

        const properties = [
            {
                name: 'remark',
                inputValue: [undefined, 'description', undefined],
                expectedValue: ['none', 'description', 'none'],
                extractFunction: (o) => o.description || 'none'
            },
            {
                name: 'rules',
                inputValue: [
                    [],
                    [
                        {
                            remark: 'description',
                            name: 'testRule',
                            action: 'accept',
                            protocol: 'tcp',
                            source: {
                                addressLists: [
                                    'addList'
                                ],
                                portLists: [
                                    'portList'
                                ]
                            },
                            destination: {
                                addressLists: [
                                    'addList'
                                ],
                                portLists: [
                                    'portList'
                                ]
                            },
                            loggingEnabled: true
                        }
                    ],
                    []
                ],
                expectedValue: [
                    [],
                    [
                        {
                            name: 'testRule',
                            action: 'accept',
                            description: 'description',
                            ipProtocol: 'tcp',
                            log: 'yes',
                            status: 'enabled',
                            destination: {
                                addressLists: [
                                    '/Common/addList'
                                ],
                                portLists: [
                                    '/Common/portList'
                                ]
                            },
                            source: {
                                addressLists: [
                                    '/Common/addList'
                                ],
                                portLists: [
                                    '/Common/portList'
                                ]
                            }
                        }
                    ],
                    []
                ],
                referenceObjects: {
                    addList: {
                        class: 'NetAddressList',
                        addresses: [
                            '10.0.0.1'
                        ]
                    },
                    portList: {
                        class: 'NetPortList',
                        ports: [
                            '8888'
                        ]
                    }
                },
                extractFunction: (o) => {
                    const rules = o.rules;
                    rules.forEach((rule) => {
                        if (rule.destination && rule.destination.addressLists) {
                            delete rule.destination.addressListsReference;
                        }
                        if (rule.destination && rule.destination.portLists) {
                            delete rule.destination.portListsReference;
                        }
                        delete rule.fullPath;
                        delete rule.kind;
                        delete rule.generation;
                        delete rule.selfLink;
                        delete rule.ruleNumber;
                        if (rule.source && rule.source.addressLists) {
                            delete rule.source.addressListsReference;
                        }
                        if (rule.source && rule.source.portLists) {
                            delete rule.source.portListsReference;
                        }
                    });
                    return rules;
                }
            }
        ];

        return assertClass('ManagementIpFirewall', properties, options);
    });
});
