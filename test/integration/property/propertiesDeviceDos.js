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

const {
    assertClass,
    deProvisionModules,
    provisionModules
} = require('./propertiesCommon');

// Remove the .skip once AUTOTOOL-3700 has been resolved.
describe('Device DOS', function testDeviceDos() {
    this.timeout(1200000);

    before(() => {
        const modules = ['afm'];
        return provisionModules(modules);
    });

    after(() => {
        const modules = ['afm'];
        return deProvisionModules(modules);
    });

    it('All properties', () => {
        const getMcpOptions = {
            tenantName: 'Common',
            getMcpObject: {
                itemName: 'dos-device-config'
            }
        };
        const properties = [
            {
                name: 'networkDosMitigationPercentage',
                inputValue: [undefined, 600, undefined],
                expectedValue: [500, 600, 500],
                extractFunction: (o) => o.networkDosMitigationPercentage
            },
            {
                name: 'sipDosMitigationPercentage',
                inputValue: [undefined, 600, undefined],
                expectedValue: [500, 600, 500],
                extractFunction: (o) => o.sipDosMitigationPercentage
            },
            {
                name: 'synCookieDsrFlowResetBy',
                inputValue: [undefined, 'bigip', undefined],
                expectedValue: ['none', 'bigip', 'none'],
                extractFunction: (o) => o.synCookieDsrFlowResetBy
            },
            {
                name: 'autoThresholdSensitivity',
                inputValue: [undefined, 60, undefined],
                expectedValue: [50, 60, 50],
                extractFunction: (o) => o.autoThresholdSensitivity
            },
            {
                name: 'logPublisher',
                inputValue: [undefined, 'local-db-publisher', undefined],
                expectedValue: [undefined, '/Common/local-db-publisher', undefined],
                extractFunction: (o) => (o.logPublisher ? o.logPublisher.fullPath : undefined)
            },
            {
                name: 'thresholdSensitivity',
                inputValue: [undefined, 'low', undefined],
                expectedValue: ['medium', 'low', 'medium'],
                extractFunction: (o) => o.thresholdSensitivity
            },
            {
                name: 'synCookieWhitelist',
                inputValue: [undefined, 'enabled', undefined],
                expectedValue: ['disabled', 'enabled', 'disabled'],
                extractFunction: (o) => o.synCookieWhitelist
            },
            {
                name: 'dynamicSignatures',
                inputValue: [undefined, {
                    dns: {
                        detection: 'enabled',
                        mitigation: 'medium'
                    },
                    network: {
                        detection: 'enabled',
                        mitigation: 'medium',
                        scrubberAdvertisementPeriod: 500,
                        scrubberEnable: 'yes'
                    }
                }, undefined],
                expectedValue: [{
                    dns: {
                        detection: 'disabled',
                        mitigation: 'none'
                    },
                    network: {
                        detection: 'disabled',
                        mitigation: 'none',
                        scrubberAdvertisementPeriod: 300,
                        scrubberEnable: 'no'
                    }
                }, {
                    dns: {
                        detection: 'enabled',
                        mitigation: 'medium'
                    },
                    network: {
                        detection: 'enabled',
                        mitigation: 'medium',
                        scrubberAdvertisementPeriod: 500,
                        scrubberEnable: 'yes',
                        scrubberCategory: '/Common/attacked_ips'
                    }
                }, {
                    dns: {
                        detection: 'disabled',
                        mitigation: 'none'
                    },
                    network: {
                        detection: 'disabled',
                        mitigation: 'none',
                        scrubberAdvertisementPeriod: 300,
                        scrubberEnable: 'no'
                    }
                }],
                extractFunction: (o) => {
                    const dynamicSignatures = {
                        dns: o.dynamicSignatures.dns,
                        network: o.dynamicSignatures.network
                    };
                    delete dynamicSignatures.network.scrubberCategoryReference;
                    return dynamicSignatures;
                }
            },
            {
                name: 'dosDeviceVector',
                inputValue: [undefined, [{
                    name: 'arp-flood',
                    allowAdvertisement: 'disabled',
                    allowUpstreamScrubbing: 'disabled',
                    attackedDst: 'disabled',
                    autoBlacklisting: 'disabled',
                    autoScrubbing: 'disabled',
                    autoThreshold: 'disabled',
                    badActor: 'disabled',
                    blacklistDetectionSeconds: 61,
                    blacklistDuration: 14401,
                    detectionThresholdPercent: '500',
                    detectionThresholdPps: '10000',
                    enforce: 'enabled',
                    floor: '5000',
                    multiplierMitigationPercentage: 'inherited-default',
                    perDstIpDetectionPps: 'infinite',
                    perDstIpLimitPps: 'infinite',
                    perSourceIpDetectionPps: 'infinite',
                    perSourceIpLimitPps: 'infinite',
                    scrubbingDetectionSeconds: '10',
                    scrubbingDuration: '900',
                    simulateAutoThreshold: 'disabled',
                    state: 'mitigate',
                    suspicious: 'false',
                    thresholdMode: 'manual'
                }], undefined],
                expectedValue: [{
                    name: 'arp-flood',
                    allowAdvertisement: 'disabled',
                    allowUpstreamScrubbing: 'disabled',
                    attackedDst: 'disabled',
                    autoBlacklisting: 'disabled',
                    autoScrubbing: 'disabled',
                    autoThreshold: 'disabled',
                    badActor: 'disabled',
                    blacklistDetectionSeconds: 60,
                    blacklistDuration: 14400,
                    ceiling: '200000',
                    defaultInternalRateLimit: '100000',
                    detectionThresholdPercent: '500',
                    detectionThresholdPps: '10000',
                    enforce: 'enabled',
                    floor: '5000',
                    multiplierMitigationPercentage: 'inherited-default',
                    perDstIpDetectionPps: 'infinite',
                    perDstIpLimitPps: 'infinite',
                    perSourceIpDetectionPps: 'infinite',
                    perSourceIpLimitPps: 'infinite',
                    scrubbingDetectionSeconds: '10',
                    scrubbingDuration: '900',
                    simulateAutoThreshold: 'disabled',
                    state: 'mitigate',
                    suspicious: 'false',
                    thresholdMode: 'manual'
                }, {
                    name: 'arp-flood',
                    allowAdvertisement: 'disabled',
                    allowUpstreamScrubbing: 'disabled',
                    attackedDst: 'disabled',
                    autoBlacklisting: 'disabled',
                    autoScrubbing: 'disabled',
                    autoThreshold: 'disabled',
                    badActor: 'disabled',
                    blacklistDetectionSeconds: 61,
                    blacklistDuration: 14401,
                    defaultInternalRateLimit: '100000',
                    detectionThresholdPercent: '500',
                    detectionThresholdPps: '10000',
                    enforce: 'enabled',
                    floor: '5000',
                    multiplierMitigationPercentage: 'inherited-default',
                    perDstIpDetectionPps: 'infinite',
                    perDstIpLimitPps: 'infinite',
                    perSourceIpDetectionPps: 'infinite',
                    perSourceIpLimitPps: 'infinite',
                    scrubbingDetectionSeconds: '10',
                    scrubbingDuration: '900',
                    simulateAutoThreshold: 'disabled',
                    state: 'mitigate',
                    suspicious: 'false',
                    thresholdMode: 'manual'
                }, {
                    name: 'arp-flood',
                    allowAdvertisement: 'disabled',
                    allowUpstreamScrubbing: 'disabled',
                    attackedDst: 'disabled',
                    autoBlacklisting: 'disabled',
                    autoScrubbing: 'disabled',
                    autoThreshold: 'disabled',
                    badActor: 'disabled',
                    blacklistDetectionSeconds: 60,
                    blacklistDuration: 14400,
                    ceiling: '200000',
                    defaultInternalRateLimit: '100000',
                    detectionThresholdPercent: '500',
                    detectionThresholdPps: '10000',
                    enforce: 'enabled',
                    floor: '5000',
                    multiplierMitigationPercentage: 'inherited-default',
                    perDstIpDetectionPps: 'infinite',
                    perDstIpLimitPps: 'infinite',
                    perSourceIpDetectionPps: 'infinite',
                    perSourceIpLimitPps: 'infinite',
                    scrubbingDetectionSeconds: '10',
                    scrubbingDuration: '900',
                    simulateAutoThreshold: 'disabled',
                    state: 'mitigate',
                    suspicious: 'false',
                    thresholdMode: 'manual'
                }],
                extractFunction: (o) => {
                    const vectors = o.dosDeviceVector;
                    const vector = vectors.find((item) => item.name === 'arp-flood');
                    return vector;
                }
            }
        ];

        return assertClass('DeviceDOS', properties, getMcpOptions);
    });
});
