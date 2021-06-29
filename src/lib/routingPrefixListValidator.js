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
                    if (typeof entry.prefixLengthRange === 'string') {
                        let start;
                        let end;
                        if (entry.prefixLengthRange === ':' || entry.prefixLengthRange === '') {
                            // should not be just ':' or ''
                            isValid = false;
                            errors.push(`RoutingPrefixList '${name}' entry '${entry.name}' prefixLengthRange cannot be ':' or ''`);
                        } else {
                            const splitString = entry.prefixLengthRange.split(':');
                            start = parseInt(splitString[0], 10);
                            end = splitString.length === 2 ? parseInt(splitString[1], 10) : end;
                            const startIsInteger = Number.isInteger(start);
                            const endIsInteger = Number.isInteger(end);
                            if (startIsInteger && endIsInteger && end !== 0 && start > end) {
                                // if start and end present then start cannot be greater than end unless end is 0
                                isValid = false;
                                errors.push(`RoutingPrefixList '${name}' entry '${entry.name}' prefixLengthRange start value must not be greater than end value`);
                            }

                            if (entry.prefix !== undefined) {
                                if (typeof entry.prefix === 'string' && entry.prefix.includes('/')) {
                                    if (entry.prefix.includes('.') && ((startIsInteger && start > 32) || (endIsInteger && end > 32))) {
                                        // ipv4 start and end cannot be greater than 32 if present
                                        isValid = false;
                                        errors.push(`RoutingPrefixList '${name}' entry '${entry.name}' prefixLengthRange must be <= 32 for IPv4 prefix`);
                                    }
                                    if (entry.prefix.includes(':') && ((startIsInteger && start > 128) || (endIsInteger && end > 128))) {
                                        // ipv6 start and end cannot be greater than 128 if present
                                        isValid = false;
                                        errors.push(`RoutingPrefixList '${name}' entry '${entry.name}' prefixLengthRange must be <= 128 for IPv6 prefix`);
                                    }
                                    const prefix = parseInt(entry.prefix.split('/')[1], 10);
                                    if ((startIsInteger && start !== 0 && start <= prefix)
                                        || (endIsInteger && end !== 0 && end <= prefix)) {
                                        // start and end must be 0 or greater than the prefix if present
                                        isValid = false;
                                        errors.push(`RoutingPrefixList '${name}' entry '${entry.name}' prefixLengthRange must be 0 or greater than prefix (${entry.prefix}) length of ${prefix}`);
                                    }
                                }
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
