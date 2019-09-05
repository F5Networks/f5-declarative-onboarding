/**
 * Copyright 2019 F5 Networks, Inc.
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

const ConfigResponse = require('../../../../src/lib/configResponse');
const state = require('./stateMock');

let configResponse;

state.originalConfig = {
    1234: {
        Common: {
            hostname: 'bigip1.example.com',
            Provision: {
                afm: 'none',
                ltm: 'nominal',
                urldb: 'none'
            },
            NTP: {
                timezone: 'UTC'
            },
            DNS: {
                nameServers: [
                    '8.8.8.8'
                ]
            },
            VLAN: {
                foo: '1234 vlan'
            }
        },
        lastUpdate: 'last update 1234'
    },
    5678: {
        Common: {
            hostname: 'bigip2.example.com',
            Provision: {
                afm: 'nominal',
                ltm: 'none',
                urldb: 'none'
            },
            NTP: {
                timezone: 'America/Los_Angeles'
            },
            DNS: {
                nameServers: [
                    '127.0.1.1'
                ]
            },
            VLAN: {
                foo: '5678 vlan'
            }
        },
        lastUpdate: 'last update 5678'
    }
};

describe('configResponse', () => {
    beforeEach(() => {
        configResponse = new ConfigResponse(state);
    });

    it('should return the proper selfLink', () => {
        assert.strictEqual(
            configResponse.getSelfLink(1234),
            'https://localhost/mgmt/shared/declarative-onboarding/config/1234'
        );
    });

    it('should return true if machineId exists', () => {
        assert.strictEqual(configResponse.exists(1234), true);
    });

    it('should return false if machineId does not exist', () => {
        assert.strictEqual(configResponse.exists(9999), false);
    });

    it('should return all config ids', () => {
        const configIds = Object.keys(state.originalConfig);
        const retrievedIds = configResponse.getIds();
        assert.strictEqual(retrievedIds.length, configIds.length);
        configIds.forEach((taskId) => {
            assert.notStrictEqual(retrievedIds.indexOf(taskId), -1);
        });
    });

    it('should return the a code of 200', () => {
        assert.strictEqual(configResponse.getCode(1234), 200);
    });

    it('should return a status of OK', () => {
        assert.strictEqual(configResponse.getStatus(1234), 'OK');
    });

    it('should return and empty message', () => {
        assert.strictEqual(configResponse.getMessage(1234), '');
    });

    it('should return empty errors', () => {
        assert.deepEqual(configResponse.getErrors(1234), []);
    });

    it('should return the proper data', () => {
        assert.deepEqual(configResponse.getData(1234), state.originalConfig[1234]);
        assert.deepEqual(configResponse.getData(5678), state.originalConfig[5678]);
    });
});
