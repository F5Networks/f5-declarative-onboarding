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

const fs = require('fs');
const assert = require('assert');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });
const systemSchema = JSON.parse(fs.readFileSync(`${__dirname}/../../schema/system.schema.json`).toString());

const validate = ajv.compile(systemSchema);

/* eslint-disable quotes, quote-props */

describe('toplevel', () => {
    it('should invalidate additional properties', () => {
        const data = {
            "system": {
                "foo": "bar"
            }
        };
        assert.strictEqual(validate(data), false, 'additional properties should not be valid');
        assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
    });
});

describe('dns', () => {
    describe('valid', () => {
        it('should validate dns data', () => {
            const data = {
                "dns": {
                    "nameServers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                    ],
                    "search": [
                        "f5.com"
                    ]
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });

    describe('invalid', () => {
        it('should invalidate name servers that are not ipv4 or ipv6', () => {
            const data = {
                "dns": {
                    "nameServers": ["foo"]
                }
            };
            assert.strictEqual(validate(data), false, 'non ip address should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
        });

        it('should invalidate search domains that are not hostnames', () => {
            const data = {
                "dns": {
                    "search": ["foo@bar"]
                }
            };
            assert.strictEqual(validate(data), false, 'non ip address should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"format": "hostname"'), -1);
        });

        it('should invalidate additional properties', () => {
            const data = {
                "dns": {
                    "foo": "bar"
                }
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
        });
    });
});

describe('hostname', () => {
    describe('valid', () => {
        it('should validate hostname', () => {
            const data = {
                "hostname": "my.foo.com"
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });

    describe('invalid', () => {
        it('should invalidate bad hostname', () => {
            const data = {
                "hostname": "foo@bar"
            };
            assert.strictEqual(validate(data), false, 'bad hostname should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"format": "hostname"'), -1);
        });
    });
});

describe('license', () => {
    describe('valid', () => {
        it('should validate license data', () => {
            const data = {
                "license": {
                    "regKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZZ",
                    "addOnKeys": [
                        "ABCDEFG-HIJKLMN",
                        "OPQRSTU-VWXYZAB"
                    ]
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });

    describe('invalid', () => {
        it('should invalidate bad regKeys', () => {
            const data = {
                "license": {
                    "regKey": "ABCD-FGHIJ-KLMNO-PQRST-UVWXYZZ"
                }
            };
            assert.strictEqual(validate(data), false, 'bad reg keys should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
        });

        it('should invalidate bad addOnKeys', () => {
            const data = {
                "license": {
                    "addOnKeys": [
                        "ABCDEF-HIJKLMN"
                    ]
                }
            };
            assert.strictEqual(validate(data), false, 'bad add on keys should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should match pattern'), -1);
        });
    });
});

describe('ntp', () => {
    describe('valid', () => {
        it('should validate ntp data', () => {
            const data = {
                "ntp": {
                    "servers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329",
                        "0.pool.ntp.org"
                    ],
                    "timezone": "UTC"
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });

    describe('invalid', () => {
        it('should invalidate ntp servers that are not ipv4, ipv6, or hostname', () => {
            const data = {
                "ntp": {
                    "servers": ["foo@bar"]
                }
            };
            assert.strictEqual(validate(data), false, 'non ip address should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"format": "ipv4"'), -1);
        });

        it('should invalidate additional properties', () => {
            const data = {
                "ntp": {
                    "foo": "bar"
                }
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
        });
    });
});

describe('passwords', () => {
    describe('valid', () => {
        it('should validate password data for both users', () => {
            const data = {
                "users": {
                    "admin": {
                        "password": "this_is_my_new_admin_password",
                        "shell": "bash"
                    },
                    "root": {
                        "oldPassword": "this_is_the_current_password",
                        "newPassword": "this_is_my_new_root_password"
                    }
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });

        it('should validate password data for one user', () => {
            const data = {
                "users": {
                    "admin": {
                        "password": "this_is_my_new_admin_password",
                        "shell": "bash"
                    },
                }
            };
            assert.ok(validate(data), getErrorString(validate));
        });
    });

    describe('invalid', () => {
        it('should invalidate bad admin password data', () => {
            const data = {
                "users": {
                    "admin": {
                        "oldPassword": "this_is_the_current_password",
                        "newPassword": "this_is_my_new_root_password"
                    }
                }
            };
            assert.strictEqual(validate(data), false, 'object password for admin should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "oldPassword"'), -1);
        });

        it('should invalidate bad root password data', () => {
            const data = {
                "users": {
                    "root": {
                        "oldPasswordx": "this_is_the_current_password",
                        "newPassword": "this_is_my_new_root_password"
                    }
                }
            };
            assert.strictEqual(validate(data), false, 'object password for admin should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "oldPassword"'), -1);
            assert.notStrictEqual(getErrorString().indexOf('"additionalProperty": "oldPasswordx"'), -1);
        });

        it('should invalidate additional properties', () => {
            const data = {
                "users": {
                    "foo": "bar"
                }
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
