/**
 * Copyright 2023 F5 Networks, Inc.
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
const sinon = require('sinon');
const PATHS = require('../../../src/lib/sharedConstants').PATHS;
const Logger = require('../../../src/lib/logger');

const doUtil = require('../../../src/lib/doUtil');
const SecurityHandler = require('../../../src/lib/securityHandler');

describe('SecurityHandler', () => {
    let dataSent;
    let bigIpMock;

    beforeEach(() => {
        dataSent = [];
        bigIpMock = {
            modify(path, data) {
                if (!dataSent[path]) {
                    dataSent[path] = [];
                }
                dataSent[path].push(data);
                return Promise.resolve();
            }
        };
    });

    it('should reject and log error when there is an error processing security options', () => {
        const severeLogSpy = sinon.spy(Logger.prototype, 'severe');
        bigIpMock.modify = () => Promise.reject(new Error('Error!'));
        const declaration = {
            Common: {
                SecurityAnalytics: {}
            }
        };
        const securityHandler = new SecurityHandler(declaration, bigIpMock);
        return assert.isRejected(securityHandler.process(), /Error!/)
            .then(() => {
                assert.strictEqual(severeLogSpy.args[0][0], 'Error processing security declaration: Error!');
                assert.strictEqual(severeLogSpy.thisValues[0].metadata, 'securityHandler.js');
            });
    });

    describe('SecurityAnalytics', () => {
        it('should handle fully specified SecurityAnalytics', () => {
            const declaration = {
                Common: {
                    SecurityAnalytics: {
                        aclRules: {
                            collectClientIp: 'enabled',
                            collectClientPort: 'disabled',
                            collectDestIp: 'enabled',
                            collectDestPort: 'enabled',
                            collectServerSideStats: 'disabled'
                        },
                        collectAllDosStatistic: 'disabled',
                        collectedStatsExternalLogging: 'disabled',
                        collectedStatsInternalLogging: 'disabled',
                        dns: {
                            collectClientIp: 'enabled',
                            collectDestinationIp: 'enabled'
                        },
                        dnsCollectStats: 'enabled',
                        dosL2L4: {
                            collectClientIp: 'enabled',
                            collectDestGeo: 'enabled'
                        },
                        dosL3CollectStats: 'enabled',
                        fwAclCollectStats: 'enabled',
                        fwDropsCollectStats: 'enabled',
                        ipReputationCollectStats: 'enabled',
                        l3L4Errors: {
                            collectClientIp: 'enabled',
                            collectDestIp: 'enabled'
                        },
                        sipCollectStats: 'enabled',
                        staleRules: {
                            collect: 'disabled'
                        },
                        publisher: 'none',
                        smtpConfig: 'none'
                    }
                }
            };

            const securityHandler = new SecurityHandler(declaration, bigIpMock);
            return securityHandler.process()
                .then(() => {
                    const securityAnalyticsData = dataSent[PATHS.SecurityAnalytics];
                    assert.deepStrictEqual(
                        securityAnalyticsData,
                        [
                            {
                                aclRules: {
                                    collectClientIp: 'enabled',
                                    collectClientPort: 'disabled',
                                    collectDestIp: 'enabled',
                                    collectDestPort: 'enabled',
                                    collectServerSideStats: 'disabled'
                                },
                                collectAllDosStatistic: 'disabled',
                                collectedStatsExternalLogging: 'disabled',
                                collectedStatsInternalLogging: 'disabled',
                                dns: {
                                    collectClientIp: 'enabled',
                                    collectDestinationIp: 'enabled'
                                },
                                dnsCollectStats: 'enabled',
                                dosL2L4: {
                                    collectClientIp: 'enabled',
                                    collectDestGeo: 'enabled'
                                },
                                dosL3CollectStats: 'enabled',
                                fwAclCollectStats: 'enabled',
                                fwDropsCollectStats: 'enabled',
                                ipReputationCollectStats: 'enabled',
                                l3L4Errors: {
                                    collectClientIp: 'enabled',
                                    collectDestIp: 'enabled'
                                },
                                sipCollectStats: 'enabled',
                                staleRules: {
                                    collect: 'disabled'
                                },
                                publisher: 'none',
                                smtpConfig: 'none'
                            }
                        ]
                    );
                });
        });
    });

    describe('SecurityWaf', () => {
        it('should handle SecurityWaf', () => {
            sinon.stub(doUtil, 'restartService').resolves();
            const declaration = {
                Common: {
                    SecurityWaf: {
                        antiVirusProtection: {
                            guarenteeEnforcement: true,
                            hostname: 'do.test',
                            port: 123
                        },
                        advancedSettings: {
                            cookie_expiration_time_out: {
                                value: '1000'
                            },
                            max_json_policy_size: {
                                value: '10000'
                            },
                            single_page_application: {
                                value: '1'
                            }
                        }
                    }
                }
            };
            const state = {
                id: 'stateId'
            };

            const securityHandler = new SecurityHandler(declaration, bigIpMock, undefined, state);
            return securityHandler.process()
                .then(() => {
                    const antivirusProtection = dataSent[PATHS.AntiVirusProtection];
                    const setting0 = dataSent[`${PATHS.WafAdvancedSettings}/Bo68NqP9roUE8Vv2NO-29Q`];
                    const setting1 = dataSent[`${PATHS.WafAdvancedSettings}/4NRiSGFR-qvXsN8VM7oKiw`];
                    const setting2 = dataSent[`${PATHS.WafAdvancedSettings}/GqhjvcKleDusK8-xl1lC4w`];
                    assert.deepStrictEqual(
                        antivirusProtection,
                        [
                            {
                                guarenteeEnforcement: true,
                                hostname: 'do.test',
                                port: 123
                            }
                        ]
                    );
                    assert.deepStrictEqual(
                        setting0,
                        [
                            {
                                value: '1000'
                            }
                        ]
                    );
                    assert.deepStrictEqual(
                        setting1,
                        [
                            {
                                value: '10000'
                            }
                        ]
                    );
                    assert.deepStrictEqual(
                        setting2,
                        [
                            {
                                value: '1'
                            }
                        ]
                    );
                });
        });
    });
});
