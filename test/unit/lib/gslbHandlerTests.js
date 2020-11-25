/**
 * Copyright 2020 F5 Networks, Inc.
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

const GSLBHandler = require('../../../src/lib/gslbHandler');
const PATHS = require('../../../src/lib/sharedConstants').PATHS;

describe('gslbHandler', () => {
    let bigIpMock;
    let pathsSent;
    let dataSent;

    beforeEach(() => {
        pathsSent = [];
        dataSent = [];
        bigIpMock = {
            modify(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            },
            createOrModify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            }
        };
    });

    describe('GSLB global-settings', () => {
        it('should handle GSLB global-settings', () => {
            const declaration = {
                Common: {
                    GSLBGlobals: {
                        general: {
                            synchronizationEnabled: true,
                            synchronizationGroupName: 'newGroupName',
                            synchronizationTimeTolerance: 123,
                            synchronizationTimeout: 100
                        }
                    }
                }
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock);
            return gslbHandler.process()
                .then(() => {
                    assert.deepStrictEqual(
                        dataSent[0],
                        {
                            synchronization: 'yes',
                            synchronizationGroupName: 'newGroupName',
                            synchronizationTimeTolerance: 123,
                            synchronizationTimeout: 100
                        }
                    );
                });
        });
    });

    describe('GSLBDataCenter', () => {
        it('should handle GSLBDataCenter', () => {
            const declaration = {
                Common: {
                    GSLBDataCenter: {
                        dataCenter0: {
                            name: 'dataCenter0',
                            contact: 'contact0',
                            enabled: true,
                            location: 'location0',
                            proberFallback: 'pool',
                            proberPool: '/Common/proberPool',
                            proberPreferred: 'pool'
                        },
                        dataCenter1: {
                            name: 'dataCenter1',
                            contact: 'contact1',
                            enabled: false,
                            location: 'location1',
                            proberFallback: 'outside-datacenter',
                            proberPreferred: 'any-available'
                        }
                    }
                }
            };

            const gslbHandler = new GSLBHandler(declaration, bigIpMock);
            return gslbHandler.process()
                .then(() => {
                    const dataCenter = dataSent[PATHS.GSLBDataCenter];
                    assert.deepStrictEqual(
                        dataCenter[0],
                        {
                            name: 'dataCenter0',
                            partition: 'Common',
                            contact: 'contact0',
                            enabled: true,
                            location: 'location0',
                            proberFallback: 'pool',
                            proberPool: '/Common/proberPool',
                            proberPreference: 'pool'
                        }
                    );
                    assert.deepStrictEqual(
                        dataCenter[1],
                        {
                            name: 'dataCenter1',
                            partition: 'Common',
                            contact: 'contact1',
                            enabled: false,
                            location: 'location1',
                            proberFallback: 'outside-datacenter',
                            proberPreference: 'any-available'
                        }
                    );
                });
        });
    });
});
