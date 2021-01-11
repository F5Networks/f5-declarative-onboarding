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

const sinon = require('sinon');

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

const ProvisionHandler = require('../../../src/lib/provisionHandler');

describe('provisionHandler', () => {
    let provisioningSent;
    const bigIpMock = {
        onboard: {
            provision(provisioning) {
                provisioningSent = provisioning;
                return Promise.resolve([{}]);
            }
        }
    };

    beforeEach(() => {
        provisioningSent = [];
        sinon.stub(cloudUtil, 'callInSerial').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should handle provisioning', () => {
        const declaration = {
            Common: {
                Provision: {
                    module1: 'level 1',
                    module2: 'level 2'
                }
            }
        };

        const state = {
            currentConfig: {
                Common: { }
            }
        };

        let numActiveRequests = 0;
        cloudUtil.callInSerial.restore();
        sinon.stub(cloudUtil, 'callInSerial').callsFake((bigIp, activeRequests) => {
            numActiveRequests = activeRequests.length;
            return Promise.resolve();
        });

        const handler = new ProvisionHandler(declaration, bigIpMock, null, state);
        return handler.process()
            .then(() => {
                assert.strictEqual(provisioningSent.module1, 'level 1');
                assert.strictEqual(provisioningSent.module2, 'level 2');
                assert.ok(numActiveRequests > 0);
            });
    });

    it('should not de-provision', () => {
        const declaration = {
            Common: {
                Provision: {
                    module1: 'nominal',
                    module2: 'none',
                    module3: 'nominal'
                }
            }
        };

        const state = {
            currentConfig: {
                Common: {
                    Provision: {
                        module1: 'nominal',
                        module2: 'nominal',
                        module3: 'nominal',
                        module4: 'nominal'
                    }
                }
            }
        };

        const handler = new ProvisionHandler(declaration, bigIpMock, null, state);
        return handler.process()
            .then(() => {
                assert.deepEqual(
                    provisioningSent,
                    {
                        module1: 'nominal',
                        module2: 'nominal',
                        module3: 'nominal',
                        module4: 'nominal'
                    }
                );
            });
    });
});
