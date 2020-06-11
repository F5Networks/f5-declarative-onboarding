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
const Ajv = require('ajv');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);
const definitionsSchema = require('../../src/schema/latest/definitions.schema.json');
const systemSchema = require('../../src/schema/latest/system.schema.json');
const customFormats = require('../../src/schema/latest/formats.js');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(definitionsSchema)
    .compile(systemSchema);

/* eslint-disable quotes, quote-props */

describe('system.schema.json', () => {
    describe('DNS', () => {
        describe('valid', () => {
            it('should validate dns data', () => {
                const data = {
                    "class": "DNS",
                    "nameServers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                    ],
                    "search": [
                        "f5.com"
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate name servers that are not ipv4 or ipv6', () => {
                const data = {
                    "class": "DNS",
                    "nameServers": ["foo"]
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate search domains that are not hostnames', () => {
                const data = {
                    "class": "DNS",
                    "search": ["foo@bar"]
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "hostname"'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "class": "DNS",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('License', () => {
        describe('common', () => {
            describe('invalid', () => {
                it('should invalidate bad license type', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "foo",
                        "regKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZZ",
                        "addOnKeys": [
                            "ABCDEFG-HIJKLMN",
                            "OPQRSTU-VWXYZAB"
                        ]
                    };
                    assert.strictEqual(validate(data), false, 'bad license type not be valid');
                });

                it('should invalidate missing license type', () => {
                    const data = {
                        "class": "License",
                        "regKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZZ",
                        "addOnKeys": [
                            "ABCDEFG-HIJKLMN",
                            "OPQRSTU-VWXYZAB"
                        ]
                    };
                    assert.strictEqual(validate(data), false, 'missing license type not be valid');
                });
            });
        });

        describe('regKey', () => {
            describe('valid', () => {
                it('should validate eval keys', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "regKey",
                        "regKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZZ",
                        "addOnKeys": [
                            "ABCDEFG-HIJKLMN",
                            "OPQRSTU-VWXYZAB"
                        ]
                    };
                    assert.ok(validate(data), getErrorString(validate));
                    assert.strictEqual(
                        data.unitOfMeasure,
                        undefined,
                        'unitOfMeasure should not have default when licenseType regKey'
                    );
                });

                it('should validate dev keys', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "regKey",
                        "regKey": "A1234-56789-12345-66890-1234567"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                    assert.strictEqual(
                        data.unitOfMeasure,
                        undefined,
                        'unitOfMeasure should not have default when licenseType regKey'
                    );
                });
            });

            describe('invalid', () => {
                it('should invalidate bad regKeys', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "regKey",
                        "regKey": "ABCD-FGHIJ-KLMNO-PQRST-UVWXYZZ"
                    };
                    assert.strictEqual(validate(data), false, 'bad reg keys should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });

                it('should invalidate bad addOnKeys', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "regKey",
                        "regKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZZ",
                        "addOnKeys": [
                            "ABCDEF-HIJKLMN"
                        ]
                    };
                    assert.strictEqual(validate(data), false, 'bad add on keys should not be valid');
                    assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
                });
            });
        });

        describe('licensePool', () => {
            describe('valid', () => {
                it('should validate with bigIqPassword', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "licensePool": "myPool",
                        "bigIpUsername": "admin",
                        "bigIpPassword": "barbar"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                    assert.strictEqual(
                        data.unitOfMeasure,
                        'monthly',
                        'unitOfMeasure should default to monthly when licenseType licensePool'
                    );
                });

                it('should validate with bigIqPasswordUri', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPasswordUri": "https://my.passwordscom/bigIq",
                        "licensePool": "myPool",
                        "bigIpUsername": "admin",
                        "bigIpPassword": "barbar"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate full unreachable data', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "licensePool": "myPool",
                        "skuKeyword1": "key1",
                        "skuKeyword2": "key2",
                        "unitOfMeasure": "hourly",
                        "reachable": false,
                        "hypervisor": "vmware"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate full reachable data', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "licensePool": "myPool",
                        "skuKeyword1": "key1",
                        "skuKeyword2": "key2",
                        "unitOfMeasure": "hourly",
                        "reachable": true,
                        "bigIpUsername": "admine",
                        "bigIpPassword": "barbar"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate reachable without bigIp user if not getting new license', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "reachable": true
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate unreachable without hypervisor if not getting new license', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "reachable": false
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate revokeFrom as a string', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "reachable": false,
                        "revokeFrom": "foo"
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });

                it('should validate revokeFrom as an object', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "reachable": false,
                        "revokeFrom": {
                            "bigIqHost": "1.2.3.4",
                            "bigIqUsername": "admin",
                            "bigIqPassword": "foofoo",
                            "licensePool": "barbar"
                        }
                    };
                    assert.ok(validate(data), getErrorString(validate));
                });
            });

            describe('invalid', () => {
                it('should invalidate using both bigIqPassword and bigIqPasswordUri', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "bigIqPasswordUri": "https://my.passwordscom/bigIq",
                        "licensePool": "myPool",
                        "bigIpUsername": "admin",
                        "bigIpPassword": "barbar"
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'using bigIqPassword and bigIqPasswordUri should be invalid'
                    );
                    assert.notStrictEqual(
                        getErrorString().indexOf('should match exactly one schema in oneOf'),
                        -1
                    );
                });

                it('should invalidate reachable false without hypervisor', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "bigIqPasswordUri": "https://my.passwordscom/bigIq",
                        "licensePool": "myPool",
                        "reachable": false
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'if reachable is false, hypervisor should be required'
                    );
                });

                it('should invalidate reachable true without bigIpUsername and bigIpPassword', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "bigIqPasswordUri": "https://my.passwordscom/bigIq",
                        "licensePool": "myPool",
                        "reachable": true
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'if reachable is false, bigIpUsername and bigIpPassword should be required'
                    );
                });

                it('should invalidate revokeFrom with missing licensePool', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "bigIqPassword": "foofoo",
                        "reachable": false,
                        "revokeFrom": {
                            "bigIqHost": "1.2.3.4",
                            "bigIqUsername": "admin",
                            "bigIqPassword": "foofoo"
                        }
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'if revokeFrom is an object, licensePool is required'
                    );
                    assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "licensePool"'), -1);
                });

                it('should invalidate bigIqHost !== localhost with no bigIqUsername', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqPassword": "foofoo",
                        "licensePool": "barbar",
                        "reachable": false,
                        "hypervisor": "aws"
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'if bigIqHost is not localhost, bigIqUsername is required'
                    );
                    assert.notStrictEqual(
                        getErrorString().indexOf('"missingProperty": ".bigIqUsername"'),
                        -1
                    );
                });

                it('should invalidate bigIqHost !== localhost with no password or password URI', () => {
                    const data = {
                        "class": "License",
                        "licenseType": "licensePool",
                        "bigIqHost": "1.2.3.4",
                        "bigIqUsername": "admin",
                        "licensePool": "barbar",
                        "reachable": false,
                        "hypervisor": "aws"
                    };
                    assert.strictEqual(
                        validate(data),
                        false,
                        'if bigIqHost is not localhost, bigIqPassword is required'
                    );
                    assert.notStrictEqual(
                        getErrorString().indexOf("should have required property '.bigIqPassword'"),
                        -1
                    );
                });
            });
        });
    });

    describe('DbVariables', () => {
        describe('valid', () => {
            it('should validate db variable data', () => {
                const data = {
                    "class": "DbVariables",
                    "foo": "bar",
                    "some.number": 3
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });
    });

    describe('NTP', () => {
        describe('valid', () => {
            it('should validate ntp data', () => {
                const data = {
                    "class": "NTP",
                    "servers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329",
                        "0.pool.ntp.org"
                    ],
                    "timezone": "UTC"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate ntp servers that are not ipv4, ipv6, or hostname', () => {
                const data = {
                    "class": "NTP",
                    "servers": ["foo@bar"]
                };
                assert.strictEqual(validate(data), false, 'non ip address should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "class": "NTP",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('Snmp', () => {
        describe('valid', () => {
            it('should validate SnmpAgent data', () => {
                const data = {
                    "class": "SnmpAgent",
                    "contact": "Op Center <ops@example.com>",
                    "location": "Seattle, WA",
                    "allowList": [
                        "10.30.100.0/23",
                        "10.40.100.0/23",
                        "10.8.100.0/32",
                        "10.30.10.100",
                        "10.30.10.200"
                    ]
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal SnmpAgent', () => {
                const data = {
                    "class": "SnmpAgent"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate SnmpUser data', () => {
                const data = {
                    "class": "SnmpUser",
                    "authentication": {
                        "protocol": "sha",
                        "password": "pass1W0rd!"
                    },
                    "privacy": {
                        "protocol": "aes",
                        "password": "P@ssW0rd"
                    },
                    "oid": ".1",
                    "access": "rw"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal SnmpUser', () => {
                const data = {
                    "class": "SnmpUser"
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.oid, '.1', 'wrong oid applied');
                assert.strictEqual(data.access, 'ro', 'wrong access level applied');
            });

            it('should validate minimal SnmpUser auth data', () => {
                const data = {
                    "class": "SnmpUser",
                    "authentication": {
                        "password": "foo"
                    },
                    "privacy": {
                        "password": "foo"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.authentication.protocol, 'sha', 'wrong authentication protocol applied');
                assert.strictEqual(data.privacy.protocol, 'aes', 'wrong privacy protocol applied');
            });

            it('should validate SnmpCommunity data', () => {
                const data = {
                    "class": "SnmpCommunity",
                    "name": "special!community",
                    "ipv6": false,
                    "source": "all",
                    "oid": ".1",
                    "access": "ro"
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.ipv6, false, 'wrong ipv6 default applied');
                assert.strictEqual(data.access, 'ro', 'wrong access default applied');
            });

            it('should validate minimal SnmpCommunity', () => {
                const data = {
                    "class": "SnmpCommunity",
                    "name": "special!community",
                    "ipv6": false,
                    "source": "all",
                    "oid": ".1",
                    "access": "ro"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate SnmpTrapEvents data', () => {
                const data = {
                    "class": "SnmpTrapEvents",
                    "agentStartStop": true,
                    "authentication": true,
                    "device": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal SnmpTrapEvents', () => {
                const data = {
                    "class": "SnmpTrapEvents"
                };
                assert.ok(validate(data), getErrorString(validate));
                assert.strictEqual(data.agentStartStop, true, 'wrong agentStartStop default applied');
                assert.strictEqual(data.authentication, false, 'wrong authentication default applied');
                assert.strictEqual(data.device, true, 'wrong device default applied');
            });

            it('should validate SnmpTrapDestination data', () => {
                const data = {
                    "class": "SnmpTrapDestination",
                    "version": "3",
                    "destination": "10.0.10.1",
                    "port": 80,
                    "network": "other",
                    "securityName": "someSnmpUser",
                    "authentication": {
                        "protocol": "sha",
                        "password": "P@ssW0rd"
                    },
                    "privacy": {
                        "protocol": "aes",
                        "password": "P@ssW0rd"
                    },
                    "engineId": "0x80001f8880c6b6067fdacfb558"
                };
                assert.ok(validate(data), getErrorString(validate));
            });


            it('should validate minimal SnmpTrapDestination', () => {
                const data = {
                    "class": "SnmpTrapDestination",
                    "version": "1",
                    "destination": "1.2.3.4",
                    "port": 80,
                    "network": "management",
                    "community": "myCommunity"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate SnmpCommunity with oid but no source', () => {
                const data = {
                    "class": "SnmpCommunity",
                    "name": "special!community",
                    "ipv6": false,
                    "oid": ".1",
                    "access": "ro"
                };
                assert.strictEqual(validate(data), false, 'SnmpCommunity with oid but no source should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf('"missingProperty": ".source"'),
                    -1
                );
            });

            it('should invalidate SnmpUser with privacy but no authentication', () => {
                const data = {
                    "class": "SnmpUser",
                    "privacy": {
                        "protocol": "aes",
                        "password": "P@ssW0rd"
                    },
                    "oid": ".1",
                    "access": "rw"
                };
                assert.strictEqual(validate(data), false, 'SnmpCommunity with oid but no source should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf('"missingProperty": ".authentication"'),
                    -1
                );
            });
        });
    });

    describe('Provision', () => {
        describe('valid', () => {
            it('should validate provisioning data', () => {
                const data = {
                    "class": "Provision",
                    "ltm": "nominal",
                    "afm": "none",
                    "cgnat": "minimum"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should allow sslo', () => {
                const data = {
                    "class": "Provision",
                    "sslo": "nominal"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad module names', () => {
                const data = {
                    "class": "Provision",
                    "foo": "none"
                };
                assert.strictEqual(validate(data), false, 'bad module names should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'),
                    -1
                );
            });

            it('should invalidate bad level names', () => {
                const data = {
                    "class": "Provision",
                    "ltm": "foo"
                };
                assert.strictEqual(validate(data), false, 'bad module names should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'),
                    -1
                );
            });
        });
    });

    describe('User', () => {
        describe('valid', () => {
            it('should validate password data for non-root users Common partition', () => {
                const data = {
                    "class": "User",
                    "userType": "regular",
                    "password": "this_is_my_new_admin_password",
                    "shell": "bash",
                    "partitionAccess": {
                        "Common": {
                            "role": "guest"
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate password data for non-root users all-partitions', () => {
                const data = {
                    "class": "User",
                    "userType": "regular",
                    "password": "this_is_my_new_admin_password",
                    "shell": "bash",
                    "partitionAccess": {
                        "all-partitions": {
                            "role": "guest"
                        }
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate password data for root users', () => {
                const data = {
                    "class": "User",
                    "userType": "root",
                    "oldPassword": "this_is_the_current_password",
                    "newPassword": "this_is_my_new_root_password"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad root password data', () => {
                const data = {
                    "class": "User",
                    "userType": "root",
                    "password": "this_is_my_new_admin_password",
                    "shell": "bash"
                };
                assert.strictEqual(validate(data), false, 'password property for root should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "password"'), -1);
            });

            it('should invalidate missing role in partition access', () => {
                const data = {
                    "class": "User",
                    "userType": "regular",
                    "password": "this_is_my_new_admin_password",
                    "shell": "bash",
                    "partitionAccess": {
                        "Common": {
                            "roles": "guest"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'partitionAccess missing role should not be valid');
                assert.notStrictEqual(getErrorString().indexOf("should NOT have additional properties"), -1);
            });

            it('should invalidate bad partition value', () => {
                const data = {
                    "class": "User",
                    "userType": "regular",
                    "password": "this_is_my_new_admin_password",
                    "shell": "bash",
                    "partitionAccess": {
                        "foo": {
                            "role": "guest"
                        }
                    }
                };
                assert.strictEqual(
                    validate(data),
                    false,
                    'partitionAccess bad partition should not be valid'
                );
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('ManagementRoute', () => {
        describe('valid', () => {
            it('should validate management route with network and gw', () => {
                const data = {
                    "class": "ManagementRoute",
                    "gw": "1.2.3.4",
                    "network": "4.3.2.1",
                    "mtu": 1000,
                    "type": "interface"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate with only network while set to default', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "default"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate without network', () => {
                const data = {
                    "class": "ManagementRoute",
                    "gw": "10.10.10.10",
                    "mtu": 10000,
                    "type": "blackhole"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate when only network and not default or default-inet6', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "9.9.9.9"
                };
                assert.strictEqual(validate(data), false, 'Missing required property gw');
                assert.notStrictEqual(getErrorString().indexOf('should have required property \'.gw\''), -1);
            });

            it('should invalidate when mtu is out of range', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "default-inet6",
                    "mtu": 65536
                };
                assert.strictEqual(validate(data), false, 'mtu is out of range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 65535'), -1);
            });

            it('should invalidate when invalid type', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "default-inet6",
                    "type": "New Type"
                };
                assert.strictEqual(validate(data), false, 'not a valid type');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate incorrect gw format', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "100.100.200.200",
                    "gw": "theGateway"
                };
                assert.strictEqual(validate(data), false, 'must be ipv4 or ipv6');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"ipv4\\"'), -1);
            });

            it('should invalidate incorrect format or value for network', () => {
                const data = {
                    "class": "ManagementRoute",
                    "network": "theNetwork"
                };
                assert.strictEqual(validate(data), false, 'must be f5ip, \'default\', or \'default-inet6\'');
                assert.notStrictEqual(getErrorString().indexOf('should match format \\"f5ip\\"'), -1);
            });
        });
    });

    describe('SyslogRemoteServers', () => {
        it('should be able to validate a correct format', () => {
            const data = {
                "class": "SyslogRemoteServer",
                "host": "10.12.15.20",
                "localIp": "10.1.1.10",
                "remotePort": 686
            };

            assert.ok(validate(data), getErrorString(validate));
        });

        it('should fail when "host" not specified ', () => {
            const data = {
                "class": "SyslogRemoteServer"
            };

            assert.strictEqual(validate(data), false, 'host should be required');
            assert.notStrictEqual(getErrorString().indexOf('should have required property \'host\''), -1);
        });
    });

    describe('System', () => {
        describe('valid', () => {
            it('should validate default values', () => {
                const data = {
                    "class": "System"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate system settings', () => {
                const data = {
                    "class": "System",
                    "hostname": "bigip.example.com",
                    "consoleInactivityTimeout": 50,
                    "cliInactivityTimeout": 60
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate when console timeout is out of range', () => {
                const data = {
                    "class": "System",
                    "consoleInactivityTimeout": 2147483648
                };

                assert.strictEqual(validate(data), false, 'consoleInactivityTimeout is out of range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 2147483647'), -1);
            });

            it('should invalidate when invalid type', () => {
                const data = {
                    "class": "System",
                    "consoleInactivityTimeout": "five"
                };
                assert.strictEqual(validate(data), false, 'not a valid type');
                assert.notStrictEqual(getErrorString().indexOf('should be integer'), -1);
            });

            it('should invalidate when consoleInactivity is not a multple of 60', () => {
                const data = {
                    "class": "System",
                    "cliInactivityTimeout": 121
                };
                assert.strictEqual(validate(data), false, 'not a valid value');
                assert.notStrictEqual(getErrorString().indexOf('should be multiple of 60'), -1);
            });
        });
    });

    describe('TrafficControl', () => {
        describe('valid', () => {
            it('should validate default traffic control', () => {
                const data = {
                    "class": "TrafficControl"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate traffic control', () => {
                const data = {
                    "class": "TrafficControl",
                    "acceptIpOptions": true,
                    "acceptIpSourceRoute": true,
                    "allowIpSourceRoute": true,
                    "continueMatching": true,
                    "maxIcmpRate": 867,
                    "maxPortFindLinear": 867,
                    "maxPortFindRandom": 867,
                    "maxRejectRate": 867,
                    "maxRejectRateTimeout": 200,
                    "minPathMtu": 867,
                    "pathMtuDiscovery": false,
                    "portFindThresholdWarning": false,
                    "portFindThresholdTrigger": 10,
                    "portFindThresholdTimeout": 200,
                    "rejectUnmatched": false
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate when acceptIpSourceRoute is true and acceptIpOptions is false', () => {
                const data = {
                    "class": "TrafficControl",
                    "acceptIpOptions": false,
                    "acceptIpSourceRoute": true
                };
                assert.strictEqual(validate(data), false, 'acceptIpSourceRoute should require acceptIpOptions to be enabled');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to constant'), -1);
            });

            it('should invalidate when allowIpSourceRoute is true and acceptIpOptions is false', () => {
                const data = {
                    "class": "TrafficControl",
                    "acceptIpOptions": false,
                    "allowIpSourceRoute": true
                };
                assert.strictEqual(validate(data), false, 'allowIpSourceRoute should require acceptIpOptions to be enabled');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to constant'), -1);
            });
        });
    });

    describe('HTTPD', () => {
        describe('valid', () => {
            it('should validate default system httpd', () => {
                const data = {
                    class: 'HTTPD'
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate system httpd', () => {
                const data = {
                    class: 'HTTPD',
                    allow: [
                        'all',
                        '10.10.0.0/24',
                        '10.11.0.0/24',
                        '10.12.1.2'
                    ],
                    authPamIdleTimeout: 43200,
                    maxClients: 12,
                    sslCiphersuite: ['ECDHE-RSA-AES128-GCM-SHA256'],
                    sslProtocol: 'all -SSLv3 -TLSv1'
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate a route domain in allow', () => {
                const data = {
                    class: 'HTTPD',
                    allow: [
                        '10.10.0.0%1'
                    ]
                };
                assert.strictEqual(validate(data), false, 'allow should not contain route domains');
                assert.notStrictEqual(getErrorString().indexOf('should match exactly one schema in oneOf'), -1);
            });
        });
    });

    describe('SSHD', () => {
        describe('valid', () => {
            it('should validate declaration with minimal properties', () => {
                const data = {
                    "class": "SSHD"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate declaration with all properties', () => {
                const data = {
                    "class": "SSHD",
                    "banner": "Hello there",
                    "ciphers": [
                        "aes128-ctr",
                        "aes192-ctr"
                    ],
                    "inactivityTimeout": 10000,
                    "loginGraceTime": 30,
                    "MACS": [
                        "hmac-sha1"
                    ],
                    "maxAuthTries": 100,
                    "maxStartups": "4",
                    "protocol": 2
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate out of range inactivityTimeout', () => {
                const data = {
                    "class": "SSHD",
                    "inactivityTimeout": 9999999999999
                };
                assert.strictEqual(validate(data), false, 'inactivityTimeout should be within the range');
                assert.notStrictEqual(getErrorString().indexOf('should be <= 2147483647'), -1);
            });

            it('should invalidate invalid cipher', () => {
                const data = {
                    "class": "SSHD",
                    "ciphers": [
                        "I'm invalid"
                    ]
                };
                assert.strictEqual(validate(data), false, 'ciphers should only contain one of the allowed values');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate invalid MAC', () => {
                const data = {
                    "class": "SSHD",
                    "MACS": [
                        "Also invalid"
                    ]
                };
                assert.strictEqual(validate(data), false, 'MACS should only contain one of the allowed values');
                assert.notStrictEqual(getErrorString().indexOf('should be equal to one of the allowed values'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "class": "SSHD",
                    "newProp": "value"
                };
                assert.strictEqual(validate(data), false, 'there should not be additional properties');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
