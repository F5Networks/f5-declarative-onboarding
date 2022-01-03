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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');

const PATHS = require('../../../src/lib/sharedConstants').PATHS;
const RADIUS = require('../../../src/lib/sharedConstants').RADIUS;

const AuthHandler = require('../../../src/lib/authHandler');

describe('authHandler', () => {
    let bigIpMock;
    let pathsSent;
    let dataSent;

    beforeEach(() => {
        pathsSent = [];
        dataSent = [];
        bigIpMock = {
            list() {
                return Promise.resolve();
            },
            replace(path, data) {
                dataSent = data;
                return Promise.resolve();
            },
            create(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            },
            createOrModify(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            },
            modify(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            }
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('radius', () => {
        it('should be able to process a radius declaration', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'radius',
                        fallback: true,
                        radius: {
                            serviceType: 'callback-login',
                            servers: {
                                primary: {
                                    server: '1.2.3.4',
                                    port: 1811,
                                    secret: 'something'
                                },
                                secondary: {
                                    server: 'my.second.server',
                                    port: 1822,
                                    secret: 'somethingElse'
                                }
                            }
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    const primary = Object.assign({}, declaration.Common.Authentication.radius.servers.primary);
                    primary.name = RADIUS.PRIMARY_SERVER;
                    primary.partition = 'Common';
                    assert.strictEqual(pathsSent[0], '/tm/auth/radius-server');
                    assert.deepEqual(dataSent[0],
                        {
                            server: '1.2.3.4',
                            port: 1811,
                            secret: 'something',
                            name: 'system_auth_name1',
                            partition: 'Common'
                        });

                    const secondary = Object.assign({}, declaration.Common.Authentication.radius.servers.secondary);
                    secondary.name = RADIUS.SECONDARY_SERVER;
                    secondary.partition = 'Common';
                    assert.strictEqual(pathsSent[1], '/tm/auth/radius-server');
                    assert.deepEqual(dataSent[1],
                        {
                            server: 'my.second.server',
                            port: 1822,
                            secret: 'somethingElse',
                            name: 'system_auth_name2',
                            partition: 'Common'
                        });

                    assert.strictEqual(pathsSent[2], '/tm/auth/radius');
                    assert.deepEqual(dataSent[2], {
                        name: 'system-auth',
                        serviceType: 'callback-login',
                        partition: 'Common',
                        servers: [
                            'system_auth_name1',
                            'system_auth_name2'
                        ]
                    });
                });
        });

        it('should issue delete for radius secondary server when it is abesnt in declaration', () => {
            const deletePath = [];
            bigIpMock.delete = (path) => {
                deletePath.push(path);
                return Promise.resolve();
            };
            bigIpMock.list = () => [{ name: 'system_auth_name2' }];
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'radius',
                        fallback: true,
                        radius: {
                            serviceType: 'callback-login',
                            servers: {
                                primary: {
                                    server: '1.2.3.4',
                                    port: 1811,
                                    secret: 'something'
                                }
                            }
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(deletePath.length, 1);
                    assert.strictEqual(deletePath[0], '/tm/auth/radius-server/~Common~system_auth_name2');
                });
        });

        it('should not issue a delete for radius secondary when it is absent from the declaration and does not exist', () => {
            const deletePath = [];
            bigIpMock.delete = (path) => {
                deletePath.push(path);
                return Promise.resolve();
            };
            bigIpMock.list = () => [];
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'radius',
                        fallback: true,
                        radius: {
                            serviceType: 'callback-login',
                            servers: {
                                primary: {
                                    server: '1.2.3.4',
                                    port: 1811,
                                    secret: 'something'
                                }
                            }
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(deletePath.length, 0);
                });
        });

        it('should ignore non-primary/secondary servers', () => {
            const deletePath = [];
            bigIpMock.delete = (path) => {
                deletePath.push(path);
                return Promise.resolve();
            };
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'radius',
                        fallback: true,
                        radius: {
                            servers: {
                                name: 'foo',
                                server: '1.2.3.4',
                                port: 1811,
                                secret: 'something'
                            }
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return assert.isFulfilled(authHandler.process());
        });
    });

    describe('tacacs', () => {
        it('should be able to process a tacacs with default values', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        fallback: true,
                        tacacs: {
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            secret: 'test',
                            service: 'ppp',
                            debug: 'disabled',
                            encryption: 'enabled'
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], '/tm/auth/tacacs');
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: 'system-auth',
                            partition: 'Common',
                            accounting: undefined,
                            authentication: undefined,
                            debug: 'disabled',
                            encryption: 'enabled',
                            secret: 'test',
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            service: 'ppp'
                        }
                    );
                });
        });

        it('should be able to process a tacacs with custom values', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        fallback: true,
                        tacacs: {
                            accounting: 'send-to-all-servers',
                            authentication: 'use-all-servers',
                            debug: 'enabled',
                            encryption: 'disabled',
                            protocol: 'http',

                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            secret: 'test',
                            service: 'shell'
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], '/tm/auth/tacacs');
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: 'system-auth',
                            partition: 'Common',
                            accounting: 'send-to-all-servers',
                            authentication: 'use-all-servers',
                            debug: 'enabled',
                            encryption: 'disabled',
                            protocol: 'http',
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            secret: 'test',
                            service: 'shell'
                        }
                    );
                });
        });
    });

    describe('ldap', () => {
        it('should be able to process a ldap with default values', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        fallback: true,
                        ldap: {
                            bindDn: 'none',
                            bindPw: 'none',
                            bindTimeout: 30,
                            checkHostAttr: 'disabled',
                            checkRolesGroup: 'disabled',
                            filter: 'none',
                            groupDn: 'none',
                            groupMemberAttribute: 'none',
                            idleTimeout: 3600,
                            ignoreAuthInfoUnavail: 'no',
                            ignoreUnknownUser: 'disabled',
                            loginAttribute: 'none',
                            port: 389,
                            referrals: 'no',
                            scope: 'sub',
                            searchBaseDn: 'none',
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'disabled',
                            sslCheckPeer: 'disabled',
                            sslCaCertFile: 'none',
                            sslClientCert: 'none',
                            sslClientKey: 'none',
                            userTemplate: 'none',
                            version: 3
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], '/tm/auth/ldap');
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: 'system-auth',
                            partition: 'Common',
                            bindDn: 'none',
                            bindPw: 'none',
                            bindTimeout: 30,
                            checkHostAttr: 'disabled',
                            checkRolesGroup: 'disabled',
                            filter: 'none',
                            groupDn: 'none',
                            groupMemberAttribute: 'none',
                            idleTimeout: 3600,
                            ignoreAuthInfoUnavail: 'no',
                            ignoreUnknownUser: 'disabled',
                            loginAttribute: 'none',
                            port: 389,
                            referrals: 'no',
                            scope: 'sub',
                            searchBaseDn: 'none',
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'disabled',
                            sslCaCertFile: 'none',
                            sslCheckPeer: 'disabled',
                            sslCiphers: '',
                            sslClientCert: 'none',
                            sslClientKey: 'none',
                            userTemplate: 'none',
                            version: 3
                        }
                    );
                });
        });

        it('should be able to process a ldap with custom values', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        fallback: true,
                        ldap: {
                            bindDn: 'searchingName',
                            bindPw: 'test',
                            bindTimeout: 40,
                            checkHostAttr: 'enabled',
                            checkRolesGroup: 'enabled',
                            filter: 'filter',
                            groupDn: 'groupName',
                            groupMemberAttribute: 'attribute',
                            idleTimeout: 20,
                            ignoreAuthInfoUnavail: 'yes',
                            ignoreUnknownUser: 'enabled',
                            loginAttribute: 'attributeToLogin',
                            port: 654,
                            referrals: 'yes',
                            scope: 'base',
                            searchBaseDn: 'searchName',
                            searchTimeout: 687,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'tls-start',
                            sslCaCertFile: {
                                name: 'do_ldapCaCert.crt',
                                partition: 'Common',
                                checksum: 'SHA1:1704:a652cb34061c27d5343a742b1587f6211740fe10',
                                base64: 'ZjVmYWtlY2VydA=='
                            },
                            sslCheckPeer: 'enabled',
                            sslCiphers: [
                                'ECDHE-RSA-AES128-GCM-SHA256',
                                'ECDHE-RSA-AES128-CBC-SHA',
                                'ECDHE-RSA-AES128-SHA256'
                            ],
                            sslClientCert: {
                                name: 'do_ldapClientCert.crt',
                                partition: 'Common',
                                checksum: 'SHA1:1704:a652cb34061c27d5343a742b1587f6211740fe10',
                                base64: 'ZjVmYWtlY2VydA=='
                            },
                            sslClientKey: {
                                name: 'do_ldapClientCert.key',
                                partition: 'Common',
                                checksum: 'SHA1:1703:a432012676a43bd8fc85496c9ed442f08e02d6a0',
                                base64: 'ZjVmYWtla2V5'
                            },
                            userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                            version: 2
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(
                        pathsSent[0],
                        '/shared/file-transfer/uploads/do_ldapCaCert.crt'
                    );
                    assert.strictEqual(dataSent[0], 'f5fakecert');
                    assert.strictEqual(
                        pathsSent[1],
                        '/shared/file-transfer/uploads/do_ldapClientCert.crt'
                    );
                    assert.strictEqual(dataSent[1], 'f5fakecert');
                    assert.strictEqual(
                        pathsSent[2],
                        '/shared/file-transfer/uploads/do_ldapClientCert.key'
                    );
                    assert.strictEqual(dataSent[2], 'f5fakekey');
                    assert.strictEqual(pathsSent[3], '/tm/sys/file/ssl-cert');
                    assert.deepStrictEqual(
                        dataSent[3],
                        {
                            name: 'do_ldapCaCert.crt',
                            sourcePath: 'file:/var/config/rest/downloads/do_ldapCaCert.crt'
                        }
                    );
                    assert.strictEqual(pathsSent[4], '/tm/sys/file/ssl-cert');
                    assert.deepStrictEqual(
                        dataSent[4],
                        {
                            name: 'do_ldapClientCert.crt',
                            sourcePath: 'file:/var/config/rest/downloads/do_ldapClientCert.crt'
                        }
                    );
                    assert.strictEqual(pathsSent[5], '/tm/sys/file/ssl-key');
                    assert.deepStrictEqual(
                        dataSent[5],
                        {
                            name: 'do_ldapClientCert.key',
                            sourcePath: 'file:/var/config/rest/downloads/do_ldapClientCert.key'
                        }
                    );
                    assert.strictEqual(pathsSent[6], '/tm/util/unix-rm');
                    assert.deepStrictEqual(
                        dataSent[6],
                        {
                            command: 'run',
                            utilCmdArgs: '/var/config/rest/downloads/do_ldapCaCert.crt'
                        }
                    );
                    assert.strictEqual(pathsSent[7], '/tm/util/unix-rm');
                    assert.deepStrictEqual(
                        dataSent[7],
                        {
                            command: 'run',
                            utilCmdArgs: '/var/config/rest/downloads/do_ldapClientCert.crt'
                        }
                    );
                    assert.strictEqual(pathsSent[8], '/tm/util/unix-rm');
                    assert.deepStrictEqual(
                        dataSent[8],
                        {
                            command: 'run',
                            utilCmdArgs: '/var/config/rest/downloads/do_ldapClientCert.key'
                        }
                    );
                    assert.strictEqual(pathsSent[9], '/tm/auth/ldap');
                    assert.deepStrictEqual(
                        dataSent[9],
                        {
                            name: 'system-auth',
                            partition: 'Common',
                            bindDn: 'searchingName',
                            bindPw: 'test',
                            bindTimeout: 40,
                            checkHostAttr: 'enabled',
                            checkRolesGroup: 'enabled',
                            filter: 'filter',
                            groupDn: 'groupName',
                            groupMemberAttribute: 'attribute',
                            idleTimeout: 20,
                            ignoreAuthInfoUnavail: 'yes',
                            ignoreUnknownUser: 'enabled',
                            loginAttribute: 'attributeToLogin',
                            port: 654,
                            referrals: 'yes',
                            scope: 'base',
                            searchBaseDn: 'searchName',
                            searchTimeout: 687,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'tls-start',
                            sslCaCertFile: '/Common/do_ldapCaCert.crt',
                            sslCheckPeer: 'enabled',
                            sslCiphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-CBC-SHA:ECDHE-RSA-AES128-SHA256',
                            sslClientCert: '/Common/do_ldapClientCert.crt',
                            sslClientKey: '/Common/do_ldapClientCert.key',
                            userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                            version: 2
                        }
                    );
                });
        });

        it('should skip creating ldap certs with missing base64 data', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        fallback: true,
                        ldap: {
                            bindTimeout: 30,
                            checkHostAttr: 'disabled',
                            checkRolesGroup: 'disabled',
                            idleTimeout: 3600,
                            ignoreAuthInfoUnavail: 'no',
                            ignoreUnknownUser: 'disabled',
                            port: 389,
                            referrals: 'yes',
                            scope: 'sub',
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'disabled',
                            sslCaCertFile: {
                                name: 'do_ldapCaCert.crt',
                                partition: 'Common',
                                checksum: 'SHA1:1704:a652cb34061c27d5343a742b1587f6211740fe10'
                            },
                            sslCheckPeer: 'disabled',
                            sslClientCert: {
                                name: 'do_ldapClientCert.crt',
                                partition: 'Common',
                                checksum: 'SHA1:1704:a652cb34061c27d5343a742b1587f6211740fe10'
                            },
                            sslClientKey: {
                                name: 'do_ldapClientCert.key',
                                partition: 'Common',
                                checksum: 'SHA1:1703:a432012676a43bd8fc85496c9ed442f08e02d6a0'
                            },
                            version: 3
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], '/tm/auth/ldap');
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: 'system-auth',
                            partition: 'Common',
                            bindDn: undefined,
                            bindPw: undefined,
                            bindTimeout: 30,
                            checkHostAttr: 'disabled',
                            checkRolesGroup: 'disabled',
                            filter: undefined,
                            groupDn: undefined,
                            groupMemberAttribute: undefined,
                            idleTimeout: 3600,
                            ignoreAuthInfoUnavail: 'no',
                            ignoreUnknownUser: 'disabled',
                            loginAttribute: undefined,
                            port: 389,
                            referrals: 'yes',
                            scope: 'sub',
                            searchBaseDn: undefined,
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            ssl: 'disabled',
                            sslCaCertFile: '/Common/do_ldapCaCert.crt',
                            sslCheckPeer: 'disabled',
                            sslCiphers: '',
                            sslClientCert: '/Common/do_ldapClientCert.crt',
                            sslClientKey: '/Common/do_ldapClientCert.key',
                            userTemplate: undefined,
                            version: 3
                        }
                    );
                });
        });
    });

    describe('remote roles', () => {
        it('should be able to process multiple remote role', () => {
            const declaration = {
                Common: {
                    RemoteAuthRole: {
                        exampleGroupName: {
                            attribute: 'attributeValue',
                            console: 'tmsh',
                            deny: 'disabled',
                            lineOrder: 1050,
                            role: 'guest',
                            userPartition: 'all'
                        },
                        anotherGroupName: {
                            attribute: 'attributeValue',
                            console: false,
                            deny: 'enabled',
                            lineOrder: 984,
                            role: 'admin',
                            userPartition: 'all'
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(dataSent[0].name, 'exampleGroupName');
                    assert.strictEqual(dataSent[0].deny, 'disabled');
                    assert.strictEqual(dataSent[1].name, 'anotherGroupName');
                    assert.strictEqual(dataSent[1].deny, 'enabled');
                });
        });
    });

    describe('remoteUsersDefaults', () => {
        it('should be able to process a declaration with remoteUsersDefaults', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'local',
                        remoteUsersDefaults: {
                            defaultRole: 'operator',
                            defaultPartition: 'Common',
                            remoteConsoleAccess: 'tmsh'
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    const remoteUserIndex = pathsSent.findIndex((p) => p === PATHS.AuthRemoteUser);
                    assert.notStrictEqual(remoteUserIndex, -1, 'RemoteAuthUser should be handled');
                    assert.deepStrictEqual(
                        dataSent[remoteUserIndex],
                        {
                            defaultPartition: 'Common',
                            defaultRole: 'operator',
                            remoteConsoleAccess: 'tmsh'
                        }
                    );
                });
        });
    });
});
