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

const doUtil = require('./doUtil');

class RoutingPrefixListValidator {
    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const routingPrefixListWrapper = doUtil.getClassObjects(data.declaration, 'RoutingPrefixList');
        if (!routingPrefixListWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        Object.keys(routingPrefixListWrapper).forEach((name) => {
            if (routingPrefixListWrapper[name].entries) {
                routingPrefixListWrapper[name].entries.forEach((entry) => {
                    if (entry.prefix !== undefined && entry.prefixLengthRange !== undefined) {
                        if (typeof entry.prefix === 'string' && entry.prefix.includes('/')) {
                            if (entry.prefix.includes('.') && entry.prefixLengthRange > 32) {
                                isValid = false;
                                errors.push('RoutingPrefixList prefixLengthRange must be <= 32 for IPv4 prefix');
                            }
                            if (entry.prefixLengthRange !== 0 && entry.prefixLengthRange <= parseInt(entry.prefix.split('/')[1], 10)) {
                                isValid = false;
                                errors.push(`RoutingPrefixList prefixLengthRange (${entry.prefixLengthRange}) must be 0 or greater than prefix (${entry.prefix}) length`);
                            }
                        }
                    }
                });
            }
        });

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = RoutingPrefixListValidator;
