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
const DeclarationParser = require('../../nodejs/declarationParser');

/* eslint-disable quote-props, quotes */

it('should transform declaration', () => {
    const declaration = {
        "schemaVersion": "0.1.0",
        "class": "Device",
        "Common": {
            "class": "Tenant",
            "mySystem": {
                "class": "System",
                "hostname": "bigip.example.com",
                "myLicense": {
                    "class": "License",
                    "licenseType": "regKey",
                    "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
                },
                "myDns": {
                    "class": "DNS",
                    "nameServers": [
                        "1.2.3.4",
                        "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
                    ],
                    "search": [
                        "f5.com"
                    ]
                },
                "myNtp": {
                    "class": "NTP",
                    "servers": [
                        "0.pool.ntp.org",
                        "1.pool.ntp.org"
                    ],
                    "timezone": "UTC"
                },
                "root": {
                    "class": "User",
                    "userType": "root",
                    "oldPassword": "foo",
                    "newPassword": "bar"
                },
                "admin": {
                    "class": "User",
                    "userType": "regular",
                    "password": "asdfjkl",
                    "shell": "bash"
                },
                "anotherUser": {
                    "class": "User",
                    "userType": "regular",
                    "password": "foobar",
                    "partitionAccess": {
                        "Common": {
                            "role": "guest"
                        }
                    }
                }
            }
        }
    };

    const declarationParser = new DeclarationParser(declaration);
    const parsed = declarationParser.parse();
    assert.strictEqual(parsed.System.hostname, declaration.Common.mySystem.hostname);
    assert.strictEqual(parsed.System.License.myLicense.regKey, declaration.Common.mySystem.myLicense.regKey);
    assert.strictEqual(parsed.System.License.myLicense.tenant, 'Common');
    assert.strictEqual(parsed.System.NTP.myNtp.servers[0], declaration.Common.mySystem.myNtp.servers[0]);
});
