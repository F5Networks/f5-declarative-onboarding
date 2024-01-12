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

const {
    assertClass,
    getItemName
} = require('./propertiesCommon');

describe('Tunnel', function testAuthentication() {
    this.timeout(300000);
    let options;

    beforeEach(() => {
        options = {
        };
    });

    it('All properties', () => {
        const properties = [
            {
                name: 'tunnelType',
                inputValue: ['tcp-forward', 'gre', 'tcp-forward'],
                expectedValue: ['tcp-forward', 'gre', 'tcp-forward'],
                extractFunction: ((o) => o.profile.name)
            },
            {
                name: 'mtu',
                inputValue: [undefined, 314, undefined],
                expectedValue: [0, 314, 0]
            },
            {
                name: 'usePmtu',
                inputValue: [undefined, false, undefined],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            {
                name: 'typeOfService',
                inputValue: [undefined, 15, undefined],
                expectedValue: ['preserve', 15, 'preserve']
            },
            {
                name: 'autoLastHop',
                inputValue: [undefined, 'enabled', undefined],
                expectedValue: ['default', 'enabled', 'default']
            },
            {
                name: 'key',
                inputValue: [undefined, 15, undefined],
                expectedValue: [0, 15, 0]
            },
            {
                name: 'localAddress',
                inputValue: [undefined, '10.15.20.15', undefined],
                expectedValue: ['any6', '10.15.20.15', 'any6']
            },
            // Any6 is outside the remote address range of ips
            {
                name: 'remoteAddress',
                inputValue: ['any', '192.0.2.10', 'any'],
                expectedValue: ['any', '192.0.2.10', 'any']
            },
            // Can only be configured with a NVGRE Tunnel
            {
                name: 'secondaryAddress',
                inputValue: [undefined],
                expectedValue: ['any6']
            },
            {
                name: 'mode',
                inputValue: [undefined, 'inbound', undefined],
                expectedValue: ['bidirectional', 'inbound', 'bidirectional']
            },
            // transparent must be enabled to have localAddress be 'any6'
            {
                name: 'transparent',
                inputValue: [true, undefined, true],
                expectedValue: ['enabled', 'disabled', 'enabled']
            },
            // trafficGroup requires a trafficGroup to target
            {
                name: 'trafficGroup',
                inputValue: [undefined, '/Common/traffic-group-1', undefined],
                expectedValue: [undefined, 'traffic-group-1', undefined],
                extractFunction: ((o) => {
                    if (o.trafficGroup) {
                        return o.trafficGroup.name;
                    }
                    return undefined;
                })
            }
        ];

        return assertClass('Tunnel', properties, options);
    });

    it('All VXLAN properties', () => {
        const trafficControl = {
            class: 'TrafficControl',
            acceptIpOptions: true
        };

        options.extraItems = [trafficControl];

        const properties = [
            {
                name: 'tunnelType',
                inputValue: ['vxlan'],
                expectedValue: [`${getItemName({ tenantName: 'Common' })}_vxlan`],
                extractFunction: ((o) => o.profile.name)
            },
            {
                name: 'defaultsFrom',
                inputValue: [undefined, 'vxlan-gpe', undefined],
                expectedValue: ['vxlan', 'vxlan-gpe', 'vxlan'],
                extractFunction: ((o) => {
                    if (o.profile && o.profile.defaultsFrom) {
                        return o.profile.defaultsFrom.name;
                    }
                    return undefined;
                })
            },
            {
                name: 'port',
                inputValue: [undefined, 1234, undefined],
                expectedValue: [4789, 1234, 4789],
                extractFunction: ((o) => {
                    if (o.profile) {
                        return o.profile.port;
                    }
                    return undefined;
                })
            },
            {
                name: 'floodingType',
                inputValue: [undefined, 'multipoint', undefined],
                expectedValue: ['multicast', 'multipoint', 'multicast'],
                extractFunction: ((o) => {
                    if (o.profile) {
                        return o.profile.floodingType;
                    }
                    return undefined;
                })
            },
            {
                name: 'encapsulationType',
                inputValue: [undefined, 'vxlan-gpe', undefined],
                expectedValue: ['vxlan', 'vxlan-gpe', 'vxlan'],
                extractFunction: ((o) => {
                    if (o.profile) {
                        return o.profile.encapsulationType;
                    }
                    return undefined;
                })
            },
            // Any6 is outside the remote address range of ips
            {
                name: 'remoteAddress',
                inputValue: ['233.252.0.10', 'any', '233.252.0.10'],
                skipAssert: true
            },
            {
                name: 'localAddress',
                inputValue: ['192.0.2.11'],
                skipAssert: true
            }
        ];

        return assertClass('Tunnel', properties, options);
    });
});
