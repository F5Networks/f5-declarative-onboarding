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

const assert = require('assert');
const Ajv = require('ajv');

const baseSchema = require('../../../src/schema/latest/base.schema.json');
const systemSchema = require('../../../src/schema/latest/system.schema.json');
const networkSchema = require('../../../src/schema/latest/network.schema.json');
const dscSchema = require('../../../src/schema/latest/dsc.schema.json');
const analyticsSchema = require('../../../src/schema/latest/analytics.schema.json');
const authSchema = require('../../../src/schema/latest/auth.schema.json');
const requestSchema = require('../../../src/schema/latest/remote.schema.json');
const customFormats = require('../../../src/schema/latest/formats');
const defSchema = require('../../../src/schema/latest/definitions.schema.json');
const gslbSchema = require('../../../src/schema/latest/gslb.schema.json');
const securitySchema = require('../../../src/schema/latest/security.schema.json');

const ajv = new Ajv(
    {
        allErrors: false,
        useDefaults: true,
        coerceTypes: true,
        extendRefs: 'fail'
    }
);

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv
    .addSchema(defSchema)
    .addSchema(systemSchema)
    .addSchema(networkSchema)
    .addSchema(dscSchema)
    .addSchema(analyticsSchema)
    .addSchema(authSchema)
    .addSchema(gslbSchema)
    .addSchema(securitySchema)
    .addSchema(baseSchema)
    .compile(requestSchema);

/* eslint-disable quotes, quote-props */

describe('remote.schema.json', () => {
    describe('declaration', () => {
        describe('valid', () => {
            it('should validate remote declaration', () => {
                const data = {
                    "class": "DO",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate missing declaration', () => {
                const data = {
                    "class": "DO"
                };
                assert.strictEqual(validate(data), false, 'missing declaration should not be valid');
                assert(getErrorString().includes('"missingProperty": "declaration"'));
            });

            it('should invalidate declaration that does not match base schema', () => {
                const data = {
                    "class": "DO",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device",
                        "Common": {
                            "class": "foo"
                        }
                    }
                };
                assert.strictEqual(validate(data), false, 'bad declaration should not be valid');
                assert(getErrorString().includes('"allowedValue": "Tenant"'));
            });
        });
    });

    describe('targetHost', () => {
        describe('valid', () => {
            it('should validate targetHost', () => {
                const data = {
                    "class": "DO",
                    "targetHost": "192.0.2.10",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bogus targetHost', () => {
                const data = {
                    "class": "DO",
                    "targetHost": -1,
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(validate(data), false, 'bogus targetHost should not be valid');
                assert(getErrorString().includes('should match format \\"hostname\\"'));
            });
        });
    });

    describe('targetPort', () => {
        describe('valid', () => {
            it('should validate targetPort', () => {
                const data = {
                    "class": "DO",
                    "targetHost": 123,
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bogus targetPort', () => {
                const data = {
                    "class": "DO",
                    "targetPort": "abc",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(validate(data), false, 'bogus targetPort should not be valid');
                assert(getErrorString().includes('should be integer'));
            });
        });
    });

    describe('targetUsername', () => {
        describe('valid', () => {
            it('should validate targetUsername', () => {
                const data = {
                    "class": "DO",
                    "targetUsername": "foo",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate targetUsername json-pointer', () => {
                const data = {
                    "class": "DO",
                    "targetUsername": "/foo/bar",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad targetUsername', () => {
                const data = {
                    "class": "DO",
                    "targetUsername": ":me",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(validate(data), false, 'bogus targetUsername should not be valid');
                assert(getErrorString().includes('should match pattern'));
            });
        });
    });

    describe('targetPassphrase', () => {
        describe('valid', () => {
            it('should validate targetPassphrase', () => {
                const data = {
                    "class": "DO",
                    "targetPassphrase": "foo",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate targetPassphrase json-pointer', () => {
                const data = {
                    "class": "DO",
                    "targetPassphrase": "/foo/bar",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should not allow both targetPassphrase and targetSshKey', () => {
                const data = {
                    "class": "DO",
                    "targetPassphrase": "foofoo",
                    "targetSshKey": {
                        "path": "barbar"
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(
                    validate(data),
                    false,
                    'including targetPassphrase and targetSshKey should not be valid'
                );
                assert(getErrorString().includes('dependencies/targetSshKey/not'));
            });
        });
    });

    describe('targetSshKey', () => {
        describe('valid', () => {
            it('should validate targetSshKey', () => {
                const data = {
                    "class": "DO",
                    "targetSshKey": {
                        "path": "foo"
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });
    });

    describe('targetTokens', () => {
        describe('valid', () => {
            it('should validate targetTokens', () => {
                const data = {
                    "class": "DO",
                    "targetTokens": {
                        "foo": "bar"
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate targetTokens json-pointer', () => {
                const data = {
                    "class": "DO",
                    "targetTokens": {
                        "foo": "bar"
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad targetTokens', () => {
                const data = {
                    "class": "DO",
                    "targetTokens": [
                        "foo"
                    ],
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(validate(data), false, 'bogus targetTokens should not be valid');
                assert(getErrorString().includes('should be object'));
            });
        });
    });

    describe('targetTimeout', () => {
        describe('valid', () => {
            it('should validate targetTimeout', () => {
                const data = {
                    "class": "DO",
                    "targetTimeout": "123",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad targetTimeout', () => {
                const data = {
                    "class": "DO",
                    "targetTimeout": "abc",
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(validate(data), false, 'bogus targetTimeout should not be valid');
                assert(getErrorString().includes('should be integer'));
            });
        });
    });

    describe('bigIqSettings', () => {
        describe('valid', () => {
            it('should validate bigIqSettings', () => {
                const data = {
                    "class": "DO",
                    "bigIqSettings": {
                        "snapshotWorkingConfig": true,
                        "accessModuleProperties": {
                            "cm:access:import-shared": true
                        },
                        "failImportOnConflict": true,
                        "conflictPolicy": "USE_BIGIP",
                        "deviceConflictPolicy": "USE_BIGIQ",
                        "versionedConflictPolicy": "KEEP_VERSION",
                        "clusterName": "foo",
                        "useBigIqSync": true,
                        "deployWhenDscChangesPending": true,
                        "statsConfig": {
                            "enabled": true,
                            "zone": "bar"
                        }
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate bigIqSettings with failImportOnConflict true and no conflictPolicy', () => {
                const data = {
                    "class": "DO",
                    "bigIqSettings": {
                        "failImportOnConflict": true
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should should invalidate failOnImportConflict with no conflictPolicy', () => {
                const data = {
                    "class": "DO",
                    "bigIqSettings": {
                        "failImportOnConflict": false
                    },
                    "declaration": {
                        "schemaVersion": "1.0.0",
                        "class": "Device"
                    }
                };
                assert.strictEqual(
                    validate(data),
                    false,
                    'failOnImportConflict with no conflictPolicy should not be valid'
                );
                assert.notStrictEqual(
                    getErrorString().indexOf("should have required property '.conflictPolicy'"),
                    -1
                );
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
