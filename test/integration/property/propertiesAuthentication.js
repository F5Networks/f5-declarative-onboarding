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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

const {
    assertClass
} = require('./propertiesCommon');

describe('Authentication', function testAuthentication() {
    this.timeout(300000);

    describe('Authentication', () => {
        function assertAuthClass(properties, options) {
            return assertClass('Authentication', properties, options);
        }

        it('radius', () => {
            const options = {
                skipIdempotentCheck: true, // items with secrets are not idempotent
                getMcpObject: {
                    className: 'AuthRadius',
                    itemKind: 'tm:auth:radius:radiusstate',
                    refItemKind: 'tm:auth:radius-server:radius-serverstate',
                    skipNameCheck: true
                }
            };

            const radiusDefA = {
                servers: {
                    primary: {
                        server: '10.10.10.10',
                        port: 80,
                        secret: 'mySecret'
                    },
                    secondary: {
                        server: '10.10.10.20',
                        port: 443,
                        secret: 'mySecret'
                    }
                }
            };
            const radiusDefB = {
                servers: {
                    primary: {
                        server: '10.20.20.20',
                        port: 8080,
                        secret: 'mySecret'
                    },
                    secondary: {
                        server: '10.20.20.30',
                        port: 4433,
                        secret: 'mySecret'
                    }
                }
            };

            const expectedResponseA = [
                {
                    name: 'system_auth_name1',
                    server: '10.10.10.10',
                    port: 80
                },
                {
                    name: 'system_auth_name2',
                    server: '10.10.10.20',
                    port: 443
                }
            ];
            const expectedResponseB = [
                {
                    name: 'system_auth_name1',
                    server: '10.20.20.20',
                    port: 8080
                },
                {
                    name: 'system_auth_name2',
                    server: '10.20.20.30',
                    port: 4433
                }
            ];

            const properties = [
                {
                    name: 'enabledSourceType',
                    inputValue: ['radius'],
                    skipAssert: true
                },
                {
                    name: 'radius',
                    inputValue: [radiusDefA, radiusDefB, radiusDefA],
                    expectedValue: [expectedResponseA, expectedResponseB, expectedResponseA],
                    extractFunction: (o) => o.servers.map((server) => ({
                        name: server.name,
                        server: server.server,
                        port: server.port
                    }))
                }
            ];

            return assertAuthClass(properties, options);
        });

        it('radius - only primary server', () => {
            const options = {
                skipIdempotentCheck: true, // items with secrets are not idempotent
                getMcpObject: {
                    className: 'AuthRadius',
                    itemKind: 'tm:auth:radius:radiusstate',
                    refItemKind: 'tm:auth:radius-server:radius-serverstate',
                    skipNameCheck: true
                }
            };

            const radiusDef = {
                servers: {
                    primary: {
                        server: '10.10.10.10',
                        port: 80,
                        secret: 'mySecret'
                    }
                }
            };

            const expectedResponse = [
                {
                    name: 'system_auth_name1',
                    server: '10.10.10.10',
                    port: 80
                }
            ];

            const properties = [
                {
                    name: 'enabledSourceType',
                    inputValue: ['radius'],
                    skipAssert: true
                },
                {
                    name: 'radius',
                    inputValue: [radiusDef],
                    expectedValue: [expectedResponse],
                    extractFunction: (o) => o.servers.map((server) => ({
                        name: server.name,
                        server: server.server,
                        port: server.port
                    }))
                }
            ];

            return assertAuthClass(properties, options);
        });

        describe('ldap', () => {
            const ldapDefB = {
                bindDn: 'bindDnNameB',
                bindPassword: 'shhhhhh',
                bindTimeout: 50,
                checkBindPassword: false,
                checkRemoteRole: false,
                filter: 'filterB',
                groupDn: 'groupNameB',
                groupMemberAttribute: 'attributeB',
                idleTimeout: 40,
                ignoreAuthInfoUnavailable: false,
                ignoreUnknownUser: false,
                loginAttribute: 'attributeToLoginB',
                port: 754,
                searchScope: 'one',
                searchBaseDn: 'searchNameB',
                searchTimeout: 888,
                servers: [
                    'b.host.com',
                    '192.0.2.20',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:1111'
                ],
                ssl: 'disabled',
                sslCaCert: {
                    certificate: {
                        base64: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUQ5RENDQXR3Q0NRQ0x2QUZoZVJaRlNqQU5CZ2txaGtpRzl3MEJBUXNGQURDQnV6RUxNQWtHQTFVRUJoTUMKVlZNeEV6QVJCZ05WQkFnTUNsZGhjMmhwYm1kMGIyNHhFREFPQmdOVkJBY01CMU5sWVhSMGJHVXhDekFKQmdOVgpCQW9NQWtZMU1SOHdIUVlEVlFRTERCWkVaV05zWVhKaGRHbDJaU0JQYm1KdllYSmthVzVuTVNZd0pBWURWUVFECkRCMW1OUzFrWldOc1lYSmhkR2wyWlMxdmJtSnZjbUZrYVc1bkxtTnZiVEV2TUMwR0NTcUdTSWIzRFFFSkFSWWcKYldWQVpqVXRaR1ZqYkdGeVlYUnBkbVV0YjI1aWIyRnlaR2x1Wnk1amIyMHdIaGNOTVRrd01UQTBNakV3T1RRNApXaGNOTWpBd01UQTBNakV3T1RRNFdqQ0J1ekVMTUFrR0ExVUVCaE1DVlZNeEV6QVJCZ05WQkFnTUNsZGhjMmhwCmJtZDBiMjR4RURBT0JnTlZCQWNNQjFObFlYUjBiR1V4Q3pBSkJnTlZCQW9NQWtZMU1SOHdIUVlEVlFRTERCWkUKWldOc1lYSmhkR2wyWlNCUGJtSnZZWEprYVc1bk1TWXdKQVlEVlFRRERCMW1OUzFrWldOc1lYSmhkR2wyWlMxdgpibUp2Y21Ga2FXNW5MbU52YlRFdk1DMEdDU3FHU0liM0RRRUpBUllnYldWQVpqVXRaR1ZqYkdGeVlYUnBkbVV0CmIyNWliMkZ5WkdsdVp5NWpiMjB3Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRRG0KZGUxQkRKOEdReWhqSHZTTjJ5TThDOTZjT1VuS0NRVWs2d2JKRFRQME1RNEJYUnhFVUJFTjhwOHFTN3FSaDdQcQpvVWt2enVBYVl0cGlxcjZLb0tSWXRobVFwYlBIVXFmckZDVUs0TjB0L29YdjdhY0x1SEVuYW1OZmlrYU5VVTZDClh0TlZFUmZwZTlmU21kRTlzVCtKTDRPNWNpc1RCcWlESGIwaWpOa1lSMHE2cHEwdEpkZGtGNTZ1bGo2WUtOazUKb3EzTVBUeENGQzJCVFRIcmc1N0tMeTdwZjZUL0NjUHk5ZDBSUC81K2NyK1o0NjVTMitEYVBZR3dvQzdKd1RZQgo1L0doelpwc1ovQVN0ZjdwYnJuSVFLVW5pSk1pNjhVZURZWXpyYjhYYjAzeHVNMHE5bXhhS01Hd0VCd2ZKWmZ1CjhZaDFXL1VFYS9Ic3pYNklDSFhqQWdNQkFBRXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBQ1o4NzNYcHdJaHIKd0dVTGZTYWpqeWdvUXZzOFRPQ2N5YWUwTnl3emw0NEE5VVZsUTVJZVpWVzdyYk1BUDhTMkh4RnJzSmk2VCthNQphSFFsc09jeWZGZ3Q1MHoyRXhvekJIcFY3eHNUb3JMTGx4RUpqMk55RnA1OXIrZXhEVnhPMHUwbTRjR2xiVUVKCndZZEQ5VkFTWTZlZ1QrWXkzaVlMK0NWdmpJQk9wRC8zaDBmOHB2TjJlek02MGE3L0FNWnRyRzNuSXlUZkJZMkcKOG5NdUY1Qk5vTFAzNFVQOUJDeE5LMi8zR2YwNHFyNDk2MnVCbHQ0UjJNR3N4enZGS1JIb2JJRm9XbkpQMWVXbApzQVhzajlUVit1UVFPb2xXdG1xUE5qVGNIc2V2am9EdUpUMjRudzU0TUs0bVg4eXlJbEkyNERvYlhFMEJNK2hoCkhWS0xmT1o0TWYwPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo='
                    }
                },
                sslCheckPeer: false,
                sslCiphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-CBC-SHA'
                ],
                userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=gov',
                version: 3
            };
            const expectedResponseB = {
                name: 'system-auth',
                bindDn: 'bindDnNameB',
                bindTimeout: 50,
                checkHostAttr: 'disabled',
                checkRolesGroup: 'disabled',
                filter: 'filterB',
                groupDn: 'groupNameB',
                groupMemberAttribute: 'attributeB',
                idleTimeout: 40,
                ignoreAuthInfoUnavail: 'no',
                ignoreUnknownUser: 'disabled',
                loginAttribute: 'attributeToLoginB',
                port: 754,
                scope: 'one',
                searchBaseDn: 'searchNameB',
                searchTimeout: 888,
                servers: [
                    'b.host.com',
                    '192.0.2.20',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:1111'
                ],
                ssl: 'disabled',
                sslCaCertFile: '/Common/do_ldapCaCert.crt',
                sslCheckPeer: 'disabled',
                sslCiphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-CBC-SHA',
                userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=gov',
                version: 3
            };
            const options = {
                skipIdempotentCheck: true, // items with passwords are not idempotent
                getMcpObject: {
                    className: 'AuthLdap',
                    itemKind: 'tm:auth:ldap:ldapstate',
                    skipNameCheck: true
                }
            };

            it('ldap', () => {
                const ldapDefA = {
                    bindDn: undefined,
                    bindPassword: undefined,
                    bindTimeout: 40,
                    checkBindPassword: true,
                    checkRemoteRole: true,
                    filter: undefined,
                    groupDn: undefined,
                    groupMemberAttribute: undefined,
                    idleTimeout: 20,
                    ignoreAuthInfoUnavailable: true,
                    ignoreUnknownUser: true,
                    loginAttribute: undefined,
                    port: 654,
                    searchScope: 'base',
                    searchBaseDn: undefined,
                    searchTimeout: 687,
                    servers: [
                        'a.host.com',
                        '192.0.2.10',
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                    ],
                    ssl: 'enabled',
                    sslCaCert: undefined,
                    sslCheckPeer: true,
                    sslCiphers: [
                        'ECDHE-RSA-AES128-CBC-SHA',
                        'ECDHE-RSA-AES128-SHA256'
                    ],
                    userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                    version: 2
                };
                const expectedResponseA = {
                    name: 'system-auth',
                    bindDn: undefined,
                    bindTimeout: 40,
                    checkHostAttr: 'enabled',
                    checkRolesGroup: 'enabled',
                    filter: undefined,
                    groupDn: undefined,
                    groupMemberAttribute: undefined,
                    idleTimeout: 20,
                    ignoreAuthInfoUnavail: 'yes',
                    ignoreUnknownUser: 'enabled',
                    loginAttribute: undefined,
                    port: 654,
                    scope: 'base',
                    searchBaseDn: undefined,
                    searchTimeout: 687,
                    servers: [
                        'a.host.com',
                        '192.0.2.10',
                        'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                    ],
                    ssl: 'enabled',
                    sslCaCertFile: undefined,
                    sslCheckPeer: 'enabled',
                    sslCiphers: 'ECDHE-RSA-AES128-CBC-SHA:ECDHE-RSA-AES128-SHA256',
                    userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                    version: 2
                };

                // grab major/minor
                const currentBigIpVersion = process.env.BIGIP_IMAGE.split('-')[1].split('.').slice(0, 2).join('.');
                if (cloudUtil.versionCompare(currentBigIpVersion, '15.1') >= 0) {
                    ldapDefA.referrals = true;
                    ldapDefB.referrals = false;
                    expectedResponseA.referrals = 'yes';
                    expectedResponseB.referrals = 'no';
                }

                const properties = [
                    {
                        name: 'enabledSourceType',
                        inputValue: ['ldap'],
                        skipAssert: true
                    },
                    {
                        name: 'ldap',
                        inputValue: [ldapDefA, ldapDefB, ldapDefA],
                        expectedValue: [expectedResponseA, expectedResponseB, expectedResponseA],
                        extractFunction: (o) => {
                            o.sslCaCertFile = o.sslCaCertFile ? o.sslCaCertFile.fullPath : o.sslCaCertFile;
                            return o;
                        }
                    }
                ];

                return assertAuthClass(properties, options);
            });

            it('ldap - sslCaCertFile https url ref', () => {
                ldapDefB.sslCaCert = {
                    certificate: {
                        url: `${process.env.ARTIFACTORY_BASE_URL}/orchestration-as3-test/resources/certs/cert`
                    }
                };
                const properties = [
                    {
                        name: 'enabledSourceType',
                        inputValue: ['ldap'],
                        skipAssert: true
                    },
                    {
                        name: 'ldap',
                        inputValue: [ldapDefB],
                        expectedValue: [expectedResponseB],
                        extractFunction: (o) => {
                            o.sslCaCertFile = o.sslCaCertFile ? o.sslCaCertFile.fullPath : o.sslCaCertFile;
                            return o;
                        }
                    }
                ];

                return assertAuthClass(properties, options);
            });

            it('ldap - sslCaCertFile file url ref', () => {
                ldapDefB.sslCaCert = {
                    certificate: {
                        url: 'file:/config/ssl/ssl.crt/default.crt'
                    }
                };
                const properties = [
                    {
                        name: 'enabledSourceType',
                        inputValue: ['ldap'],
                        skipAssert: true
                    },
                    {
                        name: 'ldap',
                        inputValue: [ldapDefB],
                        expectedValue: [expectedResponseB],
                        extractFunction: (o) => {
                            o.sslCaCertFile = o.sslCaCertFile ? o.sslCaCertFile.fullPath : o.sslCaCertFile;
                            return o;
                        }
                    }
                ];

                return assertAuthClass(properties, options);
            });
        });

        it('tacacs', () => {
            const options = {
                skipIdempotentCheck: true, // items with secrets are not idempotent
                getMcpObject: {
                    className: 'AuthTacacs',
                    itemKind: 'tm:auth:tacacs:tacacsstate',
                    skipNameCheck: true
                }
            };

            const tacacsDefA = {
                accounting: 'send-to-first-server',
                authentication: 'use-first-server',
                debug: false,
                encryption: true,
                protocol: 'ip',
                secret: 'test',
                servers: [
                    'a.host.com',
                    '192.0.2.10',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                ],
                service: 'ppp'
            };

            const tacacsDefB = {
                accounting: 'send-to-all-servers',
                authentication: 'use-all-servers',
                debug: true,
                encryption: false,
                protocol: 'ipx',
                secret: 'test',
                servers: [
                    'b.host.com',
                    '192.0.2.20',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:1111'
                ],
                service: 'shell'
            };

            const expectedResponseA = {
                accounting: 'send-to-first-server',
                authentication: 'use-first-server',
                debug: 'disabled',
                encryption: 'enabled',
                protocol: 'ip',
                servers: [
                    'a.host.com',
                    '192.0.2.10',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                ],
                service: 'ppp'
            };

            const expectedResponseB = {
                accounting: 'send-to-all-servers',
                authentication: 'use-all-servers',
                debug: 'enabled',
                encryption: 'disabled',
                protocol: 'ipx',
                servers: [
                    'b.host.com',
                    '192.0.2.20',
                    'FE80:0000:0000:0000:0202:B3FF:FE1E:1111'
                ],
                service: 'shell'
            };

            const properties = [
                {
                    name: 'enabledSourceType',
                    inputValue: ['tacacs'],
                    skipAssert: true
                },
                {
                    name: 'tacacs',
                    inputValue: [tacacsDefA, tacacsDefB, tacacsDefA],
                    expectedValue: [expectedResponseA, expectedResponseB, expectedResponseA],
                    extractFunction: (o) => o
                }
            ];

            return assertAuthClass(properties, options);
        });
    });

    it('RemoteAuthRole', () => {
        function assertRemoteAuthRoleClass(properties, options) {
            return assertClass('RemoteAuthRole', properties, options);
        }

        const options = {
            getMcpObject: {
                className: 'AuthRemoteRole',
                itemKind: 'tm:auth:remote-role:role-info:role-infostate',
                skipNameCheck: true
            }
        };

        const properties = [
            {
                name: 'attribute',
                inputValue: ['F5-LTM-User-Info-1=some_admins', 'F5-LTM-User-Info-1=other-admins', 'F5-LTM-User-Info-1=some-admins'],
                expectedValue: ['F5-LTM-User-Info-1=some_admins', 'F5-LTM-User-Info-1=other-admins', 'F5-LTM-User-Info-1=some-admins']
            },
            {
                name: 'console',
                inputValue: ['disabled', 'tmsh', 'disabled'],
                expectedValue: ['disable', 'tmsh', 'disable']
            },
            {
                name: 'lineOrder',
                inputValue: [500, 1001, 500],
                expectedValue: [500, 1001, 500]
            },
            {
                name: 'remoteAccess',
                inputValue: [false, true, false],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'role',
                inputValue: ['application-editor', 'admin', 'application-editor'],
                expectedValue: ['application-editor', 'admin', 'application-editor']
            },
            {
                name: 'userPartition',
                inputValue: ['Common', 'all', 'Common'],
                expectedValue: ['Common', undefined, 'Common'],
                extractFunction: (o) => o.userPartition.name
            }
        ];

        return assertRemoteAuthRoleClass(properties, options);
    });
});
