/**
 * Copyright 2018 F5 Networks, Inc.
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

const assert = require('assert');
const sinon = require('sinon');

const PATHS = require('../../nodejs/sharedConstants').PATHS;
const AUTH = require('../../nodejs/sharedConstants').AUTH;
const RADIUS = require('../../nodejs/sharedConstants').RADIUS;

const AuthHandler = require('../../nodejs/authHandler');

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
                    assert.strictEqual(pathsSent[0], PATHS.AuthRadiusServer);
                    assert.deepEqual(dataSent[0], primary);

                    const secondary = Object.assign({}, declaration.Common.Authentication.radius.servers.secondary);
                    secondary.name = RADIUS.SECONDARY_SERVER;
                    secondary.partition = 'Common';
                    assert.strictEqual(pathsSent[1], PATHS.AuthRadiusServer);
                    assert.deepEqual(dataSent[1], secondary);

                    assert.strictEqual(pathsSent[2], PATHS.AuthRadius);
                    assert.deepEqual(dataSent[2], {
                        name: AUTH.SUBCLASSES_NAME,
                        serviceType: declaration.Common.Authentication.radius.serviceType,
                        partition: 'Common'
                    });
                });
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
                            service: 'ppp'
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], PATHS.AuthTacacs);
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: AUTH.SUBCLASSES_NAME,
                            partition: 'Common',
                            accounting: 'send-to-first-server',
                            authentication: 'use-first-server',
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
                            debug: true,
                            encryption: false,
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
                    assert.strictEqual(pathsSent[0], PATHS.AuthTacacs);
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: AUTH.SUBCLASSES_NAME,
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
                            bindTimeout: 30,
                            checkHostAttr: false,
                            checkRolesGroup: false,
                            idleTimeout: 3600,
                            ignoreAuthInfoUnavailable: false,
                            ignoreUnknownUser: false,
                            port: 389,
                            searchScope: 'sub',
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            version: 3
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], PATHS.AuthLdap);
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: AUTH.SUBCLASSES_NAME,
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
                            scope: 'sub',
                            searchBaseDn: 'none',
                            searchTimeout: 30,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
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
                            bindPassword: 'test',
                            bindTimeout: 40,
                            checkBindPassword: true,
                            checkRemoteRole: true,
                            filter: 'filter',
                            groupDn: 'groupName',
                            groupMemberAttribute: 'attribute',
                            idleTimeout: 20,
                            ignoreAuthInfoUnavailable: true,
                            ignoreUnknownUser: true,
                            loginAttribute: 'attributeToLogin',
                            port: 654,
                            searchScope: 'base',
                            searchBaseDn: 'searchName',
                            searchTimeout: 687,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                            version: 2
                        }
                    }
                }
            };

            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    assert.strictEqual(pathsSent[0], PATHS.AuthLdap);
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            name: AUTH.SUBCLASSES_NAME,
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
                            scope: 'base',
                            searchBaseDn: 'searchName',
                            searchTimeout: 687,
                            servers: [
                                'my.host.com',
                                '1.2.3.4',
                                'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                            ],
                            userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                            version: 2
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
                            remoteAccess: true,
                            lineOrder: 1050,
                            role: 'guest',
                            userPartition: 'all'
                        },
                        anotherGroupName: {
                            attribute: 'attributeValue',
                            console: false,
                            remoteAccess: false,
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
                    assert.strictEqual(dataSent[0].deny, 'enabled');
                    assert.strictEqual(dataSent[1].name, 'anotherGroupName');
                    assert.strictEqual(dataSent[1].deny, 'disabled');
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
                            role: 'operator',
                            partitionAccess: 'Common',
                            terminalAccess: 'tmsh'
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    const remoteUserIndex = pathsSent.findIndex(p => p === PATHS.AuthRemoteUser);
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
