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
const dscSchema = require('../../schema/dsc.schema.json');
const customFormats = require('../../schema/formats.js');

Object.keys(customFormats).forEach((customFormat) => {
    ajv.addFormat(customFormat, customFormats[customFormat]);
});

const validate = ajv.compile(dscSchema);

/* eslint-disable quotes, quote-props */

describe('network.schema.json tests', () => {
    describe('toplevel', () => {
        it('should invalidate bad classes', () => {
            const data = {
                "class": "foo"
            };
            assert.strictEqual(validate(data), false, 'additional properties should not be valid');
            assert.notStrictEqual(getErrorString().indexOf('should match exactly one schema in oneOf'), -1);
        });
    });

    describe('ConfigSync', () => {
        describe('valid', () => {
            it('should validate config sync data with IP configsyncIp', () => {
                const data = {
                    "class": "ConfigSync",
                    "configsyncIp": "1.2.3.4"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate config sync data with json-pointer configsyncIp', () => {
                const data = {
                    "class": "ConfigSync",
                    "configsyncIp": "/foo/bar"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate missing configsyncIp', () => {
                const data = {
                    "class": "ConfigSync"
                };
                assert.strictEqual(validate(data), false, 'missing configsyncIp should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "configsyncIp"'), -1);
            });

            it('should invalidate bad configsyncIp', () => {
                const data = {
                    "class": "ConfigSync",
                    "configsyncIp": "foo"
                };
                assert.strictEqual(validate(data), false, 'bad configsyncIp should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should match format'), -1);
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "class": "ConfigSync",
                    "configsyncIp": "1.2.3.4",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('FailoverUnicast', () => {
        describe('valid', () => {
            it('should validate minimal unicast address with ip', () => {
                const data = {
                    "class": "FailoverUnicast",
                    "address": "1.2.3.4"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal unicast address with json-pointer', () => {
                const data = {
                    "class": "FailoverUnicast",
                    "address": "/foo/bar"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate full unicast address', () => {
                const data = {
                    "class": "FailoverUnicast",
                    "address": "1.2.3.4",
                    "port": 8888
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad address', () => {
                const data = {
                    "class": "FailoverUnicast",
                    "address": "foo"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf("should match format"), -1);
            });

            it('should invalidate missing address', () => {
                const data = {
                    "class": "FailoverUnicast"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(
                    getErrorString().indexOf("should have required property 'address'"),
                    -1
                );
            });

            it('should invalidate bad port', () => {
                const data = {
                    "class": "FailoverUnicast",
                    "address": "1.2.3.4",
                    "port": 65536
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf("should be <= 65535"), -1);
            });
        });
    });

    describe('DeviceGroup', () => {
        describe('valid', () => {
            it('should validate minimal device group data', () => {
                const data = {
                    "class": "DeviceGroup",
                    "type": "sync-only"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate minimal device group data with json-pointer', () => {
                const data = {
                    "class": "DeviceGroup",
                    "type": "sync-only",
                    "owner": "/foo/bar/0"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate full device group data', () => {
                const data = {
                    "class": "DeviceGroup",
                    "type": "sync-only",
                    "owner": "bigip1.me.com",
                    "members": ["bigip1.me.com", "bigip2.me.com"],
                    "autoSync": true,
                    "saveOnAutoSync": false,
                    "networkFailover": true,
                    "fullLoadOnSync": false,
                    "asmSync": true
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invalid', () => {
            it('should invalidate bad sync type', () => {
                const data = {
                    "class": "DeviceGroup",
                    "type": "foo"
                };
                assert.strictEqual(validate(data), false, 'bad type should not be valid');
            });

            it('should invalidate additional properties', () => {
                const data = {
                    "class": "DeviceGroup",
                    "type": "sync-only",
                    "foo": "bar"
                };
                assert.strictEqual(validate(data), false, 'additional properties should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('should NOT have additional properties'), -1);
            });
        });
    });

    describe('DeviceTrust', () => {
        describe('valid', () => {
            it('should validate device trust data', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "localPassword": "myPassword",
                    "remoteHost": "1.2.3.4",
                    "remoteUsername": "yourUser",
                    "remotePassword": "yourPassword"
                };
                assert.ok(validate(data), getErrorString(validate));
            });

            it('should validate device trust data with json-pointer', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "localPassword": "myPassword",
                    "remoteHost": "/foo/bar/0",
                    "remoteUsername": "yourUser",
                    "remotePassword": "yourPassword"
                };
                assert.ok(validate(data), getErrorString(validate));
            });
        });

        describe('invlalid', () => {
            it('should invalidate missing localUsername', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localPassword": "myPassword",
                    "remoteHost": "1.2.3.4",
                    "remoteUsername": "yourUser",
                    "remotePassword": "yourPassword"
                };
                assert.strictEqual(validate(data), false, 'missing localUsername should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "localUsername"'), -1);
            });

            it('should invalidate missing localPassword', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "remoteHost": "1.2.3.4",
                    "remoteUsername": "yourUser",
                    "remotePassword": "yourPassword"
                };
                assert.strictEqual(validate(data), false, 'missing localPassword should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "localPassword"'), -1);
            });

            it('should invalidate missing remoteHost', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "localPassword": "myPassword",
                    "remoteUsername": "yourUser",
                    "remotePassword": "yourPassword"
                };
                assert.strictEqual(validate(data), false, 'missing remoteHost should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "remoteHost"'), -1);
            });

            it('should invalidate missing remoteUsername', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "localPassword": "myPassword",
                    "remoteHost": "1.2.3.4",
                    "remotePassword": "yourPassword"
                };
                assert.strictEqual(validate(data), false, 'missing remoteUsername should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "remoteUsername"'), -1);
            });

            it('should invalidate missing remotePassword', () => {
                const data = {
                    "class": "DeviceTrust",
                    "localUsername": "myUser",
                    "localPassword": "myPassword",
                    "remoteHost": "1.2.3.4",
                    "remoteUsername": "yourUser"
                };
                assert.strictEqual(validate(data), false, 'missing remotePassword should not be valid');
                assert.notStrictEqual(getErrorString().indexOf('"missingProperty": "remotePassword"'), -1);
            });
        });
    });
});

function getErrorString() {
    return JSON.stringify(validate.errors, null, 4);
}
