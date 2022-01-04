/**
 * Copyright 2022 F5 Networks, Inc.
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

const doUtil = require('./doUtil');

class RoutingBgpValidator {
    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const routingBgpWrapper = doUtil.getClassObjects(data.declaration, 'RoutingBGP');
        if (!routingBgpWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        if (Object.keys(routingBgpWrapper).length > 1) {
            isValid = false;
            errors.push('Only 1 instance of RoutingBGP can be created');
        }

        Object.keys(routingBgpWrapper).forEach((name) => {
            const wrapper = routingBgpWrapper[name];
            if (wrapper.holdTime !== 0 && wrapper.holdTime < 3 * wrapper.keepAlive) {
                isValid = false;
                errors.push('RoutingBGP holdTime must be 0 or at least 3 times keepAlive');
            }
            if (wrapper.addressFamilies) {
                let hasAll = false;
                let hasIpv4 = false;
                let hasIpv6 = false;

                wrapper.addressFamilies.forEach((family) => {
                    hasAll = family.internetProtocol === 'all' ? true : hasAll;
                    hasIpv4 = family.internetProtocol === 'ipv4' ? true : hasIpv4;
                    hasIpv6 = family.internetProtocol === 'ipv6' ? true : hasIpv6;
                });

                if (hasAll && (hasIpv4 || hasIpv6)) {
                    isValid = false;
                    errors.push('RoutingBGP addressFamilies internetProtocol value "all" must not be used with any other internetProtocol value');
                }
            }
        });

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = RoutingBgpValidator;
