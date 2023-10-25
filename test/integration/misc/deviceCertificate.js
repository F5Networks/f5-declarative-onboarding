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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const constants = require('../constants');
const common = require('../common');
const {
    postDeclaration
} = require('../property/propertiesCommon');

describe('DeviceCertificate', function RouteDomain() {
    this.timeout(1200000);

    it('should update device and trust certificates', () => {
        const bigIpAddress = process.env.DO_HOST;
        const bigIpAuth = { username: process.env.DO_USERNAME, password: process.env.DO_PASSWORD };
        const bash = `${common.hostname(bigIpAddress, constants.PORT)}/mgmt/tm/util/bash`;
        const body = {
            command: 'run',
            utilCmdArgs: '-c "cat /config/httpd/conf/ssl.crt/server.crt"'
        };
        const decl = {
            async: true,
            class: 'Device',
            schemaVersion: '1.0.0',
            Common: {
                class: 'Tenant',
                deviceCertificate: {
                    class: 'DeviceCertificate',
                    certificate: {
                        base64: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUVOakNDQXg2Z0F3SUJBZ0lKQU8yL01wWk9HVWVjTUEwR0NTcUdTSWIzRFFFQkN3VUFNSUdiTVFzd0NRWUQKVlFRR0V3SXRMVEVMTUFrR0ExVUVDQXdDVjBFeEVEQU9CZ05WQkFjTUIxTmxZWFIwYkdVeEVqQVFCZ05WQkFvTQpDVTE1UTI5dGNHRnVlVEVPTUF3R0ExVUVDd3dGVFhsUGNtY3hIakFjQmdOVkJBTU1GV3h2WTJGc2FHOXpkQzVzCmIyTmhiR1J2YldGcGJqRXBNQ2NHQ1NxR1NJYjNEUUVKQVJZYWNtOXZkRUJzYjJOaGJHaHZjM1F1Ykc5allXeGsKYjIxaGFXNHdIaGNOTWpNeE1EQTFNakEwT0RJeFdoY05Nek14TURBeU1qQTBPREl4V2pDQm16RUxNQWtHQTFVRQpCaE1DTFMweEN6QUpCZ05WQkFnTUFsZEJNUkF3RGdZRFZRUUhEQWRUWldGMGRHeGxNUkl3RUFZRFZRUUtEQWxOCmVVTnZiWEJoYm5reERqQU1CZ05WQkFzTUJVMTVUM0puTVI0d0hBWURWUVFEREJWc2IyTmhiR2h2YzNRdWJHOWoKWVd4a2IyMWhhVzR4S1RBbkJna3Foa2lHOXcwQkNRRVdHbkp2YjNSQWJHOWpZV3hvYjNOMExteHZZMkZzWkc5dApZV2x1TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF6T1dnQXBvSEROcTd4UWhtCjNNaUkxUUlBZ3g4RzRnOEVQcTcwQnFwVU9SUDNSa1V1M09udkdYUktRMExiSU9CMEtGVjJwaUpZTmRDWEVnM3MKMnVlRmtNTUt3YkRuMEI3VUhzTXRyQVR4TkwySjhia1hUQ1FVbE80dHdZU2lNNEN1SVAxT0lMYnlNZmVCaXFNaworTk13NURPVVFMTlI2S1p0VlRuK0hqTWRtRnIrS1VyWndYRFNMRkVUY29jc082UXBQTDdGSjJFOFZaK3E5UVh0CnM0dThhSzhJaHdqUzZ1SDJpaENReGFhemw2OEVoVndWMEpjNVF6NE9Yc3BaNGh2TnVWRHkweHpmdFpNOEdyWXYKbE5jTnU0RGoyWFhvYVN1czRBQ0JtUFA4UE4rb203aFk4d3VOZWswQzdLNVE1QVFjZnNhdFpKYVNDS1BrWmZMeQpFVHJGVFFJREFRQUJvM3N3ZVRBSkJnTlZIUk1FQWpBQU1Dd0dDV0NHU0FHRytFSUJEUVFmRmgxUGNHVnVVMU5NCklFZGxibVZ5WVhSbFpDQkRaWEowYVdacFkyRjBaVEFkQmdOVkhRNEVGZ1FVWGFEUVFmRVV6dmpzT1BGbVFkMWgKU1ZpYjJIWXdId1lEVlIwakJCZ3dGb0FVWGFEUVFmRVV6dmpzT1BGbVFkMWhTVmliMkhZd0RRWUpLb1pJaHZjTgpBUUVMQlFBRGdnRUJBRG9xRERxWk1EcGdJSjBxeEFWaWN2WmM5dHVDRitLRDMraFhOQmRtSDc1TCsyNmE5KzlXCk9kczlwN0tXWXNhczd6cWhnVGdwTHJoaUYraW9SL1JKY0IyZ1RMTmtWcjd0ZFNuK3IvVkcwbEVxeUtvTlJBY24KK0xKSDVnZlV4UjJVTVRNT2ZBTHRFZzM4RlFmazJkSzBmaW5VVTdLQU1oU2REWDhpemRnbFRNZ0t0YUlMZzh3cgpyL0hrZFVRNTVPMURKeWFYcm56b3Rxa05LbUdGU1VvK0FWMTRDYk9HYjY3Zm0rd08wZDBaRXpUN1FvR2diaHA3CmZWcUxObEpWUmhaOVh3MWVzMEREMDIzcjNNcytQZ0E0ODd5T0FVTGdGUzFnRk1ISmRQV2YvdGx5dlRwNjc4RksKdFhCd1ZyV3ZKR0crczNCSHpubURPNE4rRDJjRlFnRUk1MGs9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0='
                    },
                    privateKey: {
                        base64: process.env.DEVICE_KEY
                    },
                    updateTrustCerts: true
                }
            }
        };
        const options = {
            logInfo: {
                declarationIndex: 0
            },
            retryOptions: {
                trials: 240,
                timeInterval: 10000,
                acceptErrors: ['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH']
            }
        };

        return postDeclaration(decl, options)
            .then((response) => assert.strictEqual(response.result.code, 200))
            .then(() => common.testRequest(body, bash, bigIpAuth, constants.HTTP_SUCCESS, 'POST'))
            .then((result) => {
                assert.strictEqual(
                    result.commandResult.trim(),
                    Buffer.from(decl.Common.deviceCertificate.certificate.base64, 'base64').toString().trim()
                );
                body.utilCmdArgs = '-c "cat /config/httpd/conf/ssl.key/server.key"';
                return common.testRequest(body, bash, bigIpAuth, constants.HTTP_SUCCESS, 'POST');
            })
            .then((result) => {
                assert.strictEqual(
                    result.commandResult.trim(),
                    Buffer.from(decl.Common.deviceCertificate.privateKey.base64, 'base64').toString().trim()
                );
                body.utilCmdArgs = '-c "cat /config/gtm/server.crt"';
                return common.testRequest(body, bash, bigIpAuth, constants.HTTP_SUCCESS, 'POST');
            })
            .then((result) => {
                assert.include(
                    result.commandResult.trim(),
                    Buffer.from(decl.Common.deviceCertificate.certificate.base64, 'base64').toString().trim()
                );
                body.utilCmdArgs = '-c "cat /config/big3d/client.crt"';
                return common.testRequest(body, bash, bigIpAuth, constants.HTTP_SUCCESS, 'POST');
            })
            .then((result) => {
                assert.include(
                    result.commandResult.trim(),
                    Buffer.from(decl.Common.deviceCertificate.certificate.base64, 'base64').toString().trim()
                );
                options.logInfo.declarationIndex = 1;
                delete decl.Common.deviceCertificate;
                return postDeclaration(decl, options);
            })
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            });
    });
});
