/**
 * Copyright 2025 F5, Inc.
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

const {
    postDeclaration,
    getMcpObject,
    deProvisionModules,
    provisionModules
} = require('../property/propertiesCommon');

const common = require('../common');

describe('Verify DDOS Vectors', function DeleteItems() {
    this.timeout(1200000);
    before(() => {
        const modules = ['afm'];
        return provisionModules(modules);
    });

    after(() => {
        const modules = ['afm'];
        return deProvisionModules(modules);
    });

    const logInfo = {
        declarationIndex: 0
    };

    it('should update DDOS Config', () => {
        const BODIES = 'test/integration/bodies';
        return common.readFile(`${BODIES}/ddos.json`)
            .then((file) => JSON.parse(file))
            .then((decl) => postDeclaration(decl, { logInfo }))
            .then((response) => {
                assert.strictEqual(response.result.code, 200);
            })
            .then(() => {
                const getMcpOptions = {
                    tenantName: 'Common',
                    getMcpObject: {
                        itemName: 'dos-device-config'
                    }
                };
                return getMcpObject('DeviceDOS', getMcpOptions);
            })
            .then((response) => {
                assert.strictEqual(response.autoThresholdSensitivity, 90);
                const vector = response.dosDeviceVector.find((item) => item.name === 'arp-flood');
                assert.strictEqual(vector.blacklistDetectionSeconds, 61);
                const vector2 = response.dosDeviceVector.find((item) => item.name === 'sweep');
                assert.strictEqual(vector2.packetTypes[0], 'ipv4-icmp');
            })
            .then(() => {
                logInfo.declarationIndex = 1;
                const emptyDec = {
                    async: true,
                    class: 'Device',
                    schemaVersion: '1.47.0',
                    Common: {
                        class: 'Tenant'
                    }
                };
                return postDeclaration(emptyDec, { logInfo });
            })
            .then(() => {
                const getMcpOptions = {
                    tenantName: 'Common',
                    getMcpObject: {
                        itemName: 'dos-device-config'
                    }
                };
                return getMcpObject('DeviceDOS', getMcpOptions);
            })
            .then((response) => {
                assert.strictEqual(response.autoThresholdSensitivity, 50);
                const vector = response.dosDeviceVector.find((item) => item.name === 'arp-flood');
                assert.strictEqual(vector.blacklistDetectionSeconds, 60);
                const vector2 = response.dosDeviceVector.find((item) => item.name === 'sweep');
                assert.strictEqual(vector2.packetTypes, undefined);
            })
            .catch((err) => {
                assert.fail(err);
            });
    });
});
