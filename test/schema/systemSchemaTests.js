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

const ajv = new Ajv({ allErrors: true });
const systemSchema = require('../../schema/system.schema.json');

const validate = ajv.compile(systemSchema);

/* eslint-disable quotes, quote-props */

describe('system.schema.json tests', () => {
    describe('toplevel', () => {
        it('should invalidate bad classes', () => {
            const data = {
                "class": "foo"
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should match exactly one schema in oneOf'), -1);
        });
    });

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
        describe('valid', () => {
            it('should validate license data', () => {
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
            });
        });

        describe('invalid', () => {
            it('should invalidate missing license type', () => {
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
                assert.notStrictEqual(
                    getErrorString().indexOf('should be equal to one of the allowed values'),
                    -1
                );
            });

            it('should invalidate bad license type', () => {
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

            it('should invalidate bad regKeys', () => {
                const data = {
                    "licenseType": "regKey",
                    "regKey": "ABCD-FGHIJ-KLMNO-PQRST-UVWXYZZ"
                };
                assert.strictEqual(validate(data), false, 'bad reg keys should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
            });

            it('should invalidate bad addOnKeys', () => {
                const data = {
                    "licenseType": "regKey",
                    "addOnKeys": [
                        "ABCDEF-HIJKLMN"
                    ]
                };
                assert.strictEqual(validate(data), false, 'bad add on keys should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
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

    describe('User', () => {
        describe('valid', () => {
            it('should validate password data for non-root users', () => {
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
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "role"'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
