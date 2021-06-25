/**
 * Copyright 2021 F5 Networks, Inc.
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
const Ajv = require('ajv');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const authSchema = require('../../../src/schema/latest/auth.schema.json');
const customFormats = require('../../../src/schema/latest/formats');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .compile(authSchema);

/* eslint-disable quotes, quote-props */

describe('auth.schema.json', () => {
    describe('Auth class', () => {
        describe('valid', () => {
            it('should validate minimum and enabledSourceType defaults to local)', () => {
                const data = {
                    "class": "Authentication",
                    "fallback": true
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.enabledSourceType, 'local');
            });
        });
        describe('invalid', () => {
            it('should invalidate additional properties', () => {
                const data = {
                    "class": "Authentication",
                    "extraProp": "yep",
                    "fallback": true
                };
                assert.strictEqual(validate(data), false, 'addtl properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "extraProp"'), -1);
            });
        });
    });

    describe('Remote - Users Defaults', () => {
        describe('valid', () => {
            it('should validate remoteUsersDefaults', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "local",
                    "remoteUsersDefaults": {
                        "partitionAccess": "Common",
                        "terminalAccess": "tmsh",
                        "role": "auditor"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should populate default prop values for remoteUsersDefaults', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "local",
                    "remoteUsersDefaults": {
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.remoteUsersDefaults.partitionAccess, 'all');
                assert.strictEqual(data.remoteUsersDefaults.terminalAccess, 'disabled');
                assert.strictEqual(data.remoteUsersDefaults.role, 'no-access');
            });
        });
        describe('invalid', () => {
            it('should ivalidate remoteUsersDefaults with partition other than Common or all', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "local",
                    "remoteUsersDefaults": {
                        "partitionAccess": "myPartition",
                        "terminalAccess": "disabled",
                        "role": "operator"
                    }
                };
                assert.strictEqual(validate(data), false);
                assert.notStrictEqual(
                    getErrorString().indexOf(
                        '"schemaPath": "#/properties/remoteUsersDefaults/properties/partitionAccess/enum",'
                    ),
                    -1
                );
            });
        });
    });

    describe('Remote - RADIUS', () => {
        describe('valid', () => {
            it('should validate remote RADIUS', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius",
                    "radius": {
                        "servers": {
                            "primary": {
                                "server": "1.2.3.4",
                                "secret": "mumble"
                            },
                            "secondary": {
                                "server": "second.sever",
                                "secret": "mumble"
                            }
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data with missing radius', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius"
                };
                assert.strictEqual(validate(data), false, 'missing radius should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": ".radius"'), -1);
            });

            it('should invalidate data with missing servers', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius",
                    "radius": {
                    }
                };
                assert.strictEqual(validate(data), false, 'missing servers should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "servers"'), -1);
            });

            it('should invalidate data without primary server', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius",
                    "radius": {
                        "servers": {
                            "secondary": {
                                "server": "5.6.7.8",
                                "secret": "mumble"
                            }
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'missing primary server should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "primary"'), -1);
            });


            it('should invalidate data with extra server item', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius",
                    "radius": {
                        "servers": {
                            "primary": {
                                "server": "1200:0000:AB00:1234:0000:2552:7777:1313",
                                "secret": "mumble"
                            },
                            "secondary": {
                                "server": "second.server",
                                "secret": "mumble"
                            },
                            "tertiary": {
                                "server": "third.server",
                                "secret": "mumble"
                            }
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'servers should only have primary and secondary');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "tertiary"'), -1);
            });

            it('should invalidate data with missing secret', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "radius",
                    "radius": {
                        "servers": {
                            "primary": {
                                "server": "1200:0000:AB00:1234:0000:2552:7777:1313",
                                "port": 1888
                            }
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'missing secret should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "secret"'), -1);
            });
        });
    });

    describe('Remote - Roles', () => {
        const data = {
            "class": "RemoteAuthRole",
            "attribute": "attributeValue",
            "console": "tmsh",
            "remoteAccess": true,
            "lineOrder": 1050,
            "userPartition": "Common"
        };
        describe('valid', () => {
            const roles = [
                'admin',
                'resource-admin',
                'user-manager',
                'auditor',
                'manager',
                'application-editor',
                'operator',
                'firewall-manager',
                'fraud-protection-manager',
                'certificate-manager',
                'irule-manager',
                'guest',
                'web-application-security-administrator',
                'web-application-security-editor',
                'no-access'
            ];
            roles.forEach((role) => {
                it(`should validate ${role} remote role`, () => {
                    const dataCopy = JSON.parse(JSON.stringify(data));
                    dataCopy.role = role;
                    assert.ok(dataCopy, getErrorString(validate));
                });
            });

            it('should allow variables', () => {
                const dataCopy = JSON.parse(JSON.stringify(data));
                dataCopy.role = '%F5-LTM-User-Role';
                dataCopy.console = '%F5-LTM-User-Shell';
                dataCopy.userPartition = '%F5-LTM-User-Partition';
                assert.ok(dataCopy, getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it(`should invalidate RemoteAuthRole when invalid role value`, () => {
                const dataCopy = JSON.parse(JSON.stringify(data));
                dataCopy.role = 'root';
                assert.strictEqual(validate(dataCopy), false, 'incorrect RemoteAuthRole role should fail');
            });

            it(`should invalidate RemoteAuthRole when invalid console value`, () => {
                const dataCopy = JSON.parse(JSON.stringify(data));
                dataCopy.console = 'enabled';
                assert.strictEqual(validate(dataCopy), false, 'incorrect RemoteAuthRole console should fail');
            });

            it(`should invalidate RemoteAuthRole when invalid userPartition value`, () => {
                const dataCopy = JSON.parse(JSON.stringify(data));
                dataCopy.userPartition = 'partition1';
                assert.strictEqual(validate(dataCopy), false, 'incorrect RemoteAuthRole userPartition should fail');
            });
        });
    });

    describe('Remote - TACACS', () => {
        describe('valid', () => {
            it('should validate remote TACACS', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs",
                    "tacacs": {
                        "servers": [
                            "my.host.com",
                            "1.2.3.4",
                            "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                        ],
                        "accounting": "send-to-all-servers",
                        "authentication": "use-all-servers",
                        "debug": true,
                        "encryption": true,
                        "protocol": "ip",
                        "secret": "test",
                        "service": "ppp"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should fail if no tacacs is provided', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs"
                };

                assert.strictEqual(validate(data), false, 'tacacs property should be mandatory for tacacs authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": ".tacacs"'), -1);
            });

            it('should fail if empty servers array', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs",
                    "tacacs": {
                        "servers": [],
                        "secret": "test",
                        "service": "ppp"
                    }
                };

                assert.strictEqual(validate(data), false, 'servers property should be mandatory for tacacs authentication');
            });

            it('should fail if no servers are provided', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs",
                    "tacacs": {
                        "secret": "test",
                        "service": "ppp"
                    }
                };

                assert.strictEqual(validate(data), false, 'servers property should be mandatory for tacacs authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "servers"'), -1);
            });

            it('should fail if no secret are provided', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs",
                    "tacacs": {
                        "servers": ["1.1.1.1"],
                        "service": "ppp"
                    }
                };

                assert.strictEqual(validate(data), false, 'secret property should be mandatory for tacacs authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "secret"'), -1);
            });

            it('should fail if no service are provided', () => {
                const data = {
                    "class": "Authentication",
                    "enabledSourceType": "tacacs",
                    "tacacs": {
                        "servers": ["1.1.1.1"],
                        "secret": "test"
                    }
                };

                assert.strictEqual(validate(data), false, 'service property should be mandatory for tacacs authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "service"'), -1);
            });
        });
    });

    describe('Remote - LDAP', () => {
        describe('valid', () => {
            it('should validate remote LDAP', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap',
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
                        referrals: true,
                        searchScope: 'base',
                        searchBaseDn: 'searchName',
                        searchTimeout: 687,
                        servers: [
                            'my.host.com',
                            '1.2.3.4',
                            'FE80:0000:0000:0000:0202:B3FF:FE1E:8329'
                        ],
                        ssl: "enabled",
                        sslCheckPeer: true,
                        sslCiphers: [
                            "ECDHE-RSA-AES128-GCM-SHA256",
                            "ECDHE-RSA-AES128-CBC-SHA",
                            "ECDHE-RSA-AES128-SHA256"
                        ],
                        userTemplate: 'uid=%s,ou=people,dc=siterequest,dc=com',
                        version: 2
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate data with missing ldap when enabling ldap', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap'
                };

                assert.strictEqual(validate(data), false, 'ldap should be mandatory for ldap authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": ".ldap"'), -1);
            });

            it('should invalidate data with missing ldap when enabling activeDirectory', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'activeDirectory'
                };

                assert.strictEqual(validate(data), false, 'ldap should be mandatory for ldap authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": ".ldap"'), -1);
            });

            it('should invalidate data with missing servers', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap',
                    ldap: {
                    }
                };

                assert.strictEqual(validate(data), false, 'servers should be mandatory for ldap authentication');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "servers"'), -1);
            });

            it('should invalidate data with less than one server', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap',
                    ldap: {
                        servers: []
                    }
                };

                assert.strictEqual(validate(data), false, 'at least one server in servers array should be mandatory for ldap authentication');
                assert.notStrictEqual(getErrorString().indexOf('"limit": 1'), -1);
            });

            it('should invalidate data with unexpected ssl value', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap',
                    ldap: {
                        servers: [
                            'my.host.com'
                        ],
                        ssl: 'blah'
                    }
                };

                assert.strictEqual(validate(data), false, 'expected values for ssl should be mandatory for ldap authentication');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate data with unknown cipher', () => {
                const data = {
                    class: 'Authentication',
                    enabledSourceType: 'ldap',
                    ldap: {
                        servers: [
                            'my.host.com'
                        ],
                        sslCiphers: [
                            'mycipher'
                        ]
                    }
                };

                assert.strictEqual(validate(data), false, 'contents should match');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
