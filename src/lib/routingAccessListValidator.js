/**
 * Copyright 2023 F5, Inc.
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

class RoutingAccessListValidator {
    /**
     * There are several expressions that can be used as inputs that represent all of the addresses such as any, any/#,
     * any6, any6/#, ::, ::/#, 0.0.0.0, and 0.0.0.0/#.  TMSH will treat all of these the same for the access list
     * properties destination and source.  TMSH will change these values according to a logic that is mimicked in the
     * declaration handler.  We do not need to worry about the any and any6 variations because our schema format does
     * not accept them and they are redundant anyway.
     *
     * @param {String} address source or destination value from entry
     * @returns {Boolean} - true if the address is one of these all of the addresses on the network values
     */
    isAnyAddress(address) {
        if (typeof address === 'string') {
            address = address.trim();
            return (address === '::' || address.startsWith('::/') || address === '0.0.0.0' || address.startsWith('0.0.0.0/'));
        }
        return false;
    }

    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const routingAccessListWrapper = doUtil.getClassObjects(data.declaration, 'RoutingAccessList');
        if (!routingAccessListWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        Object.keys(routingAccessListWrapper).forEach((name) => {
            let nonDefaultDestinationFound = false;
            let exactMatchEnabledTrueFound = false;
            let ipv4Count = 0;
            let ipv6Count = 0;
            if (routingAccessListWrapper[name].entries) {
                routingAccessListWrapper[name].entries.forEach((entry) => {
                    // a single entry with exactMatchEnabled true disallows ANY entry with non-any-address destination
                    exactMatchEnabledTrueFound = entry.exactMatchEnabled ? true : exactMatchEnabledTrueFound;
                    nonDefaultDestinationFound = !this.isAnyAddress(entry.destination) ? true
                        : nonDefaultDestinationFound;

                    // all non-any-address values in the entries array must be from the same address family
                    if (typeof entry.destination === 'string') {
                        ipv4Count = !this.isAnyAddress(entry.destination) && entry.destination.includes('.') ? ipv4Count + 1 : ipv4Count;
                        ipv6Count = !this.isAnyAddress(entry.destination) && entry.destination.includes(':') ? ipv6Count + 1 : ipv6Count;
                        ipv4Count = !this.isAnyAddress(entry.source) && entry.source.includes('.') ? ipv4Count + 1 : ipv4Count;
                        ipv6Count = !this.isAnyAddress(entry.source) && entry.source.includes(':') ? ipv6Count + 1 : ipv6Count;
                    }
                });

                if (exactMatchEnabledTrueFound && nonDefaultDestinationFound) {
                    isValid = false;
                    errors.push(`RoutingAccessList '${name}': if any entry has exactMatchEnabled true then no entries can have a destination set`);
                }

                if (ipv4Count > 0 && ipv6Count > 0) {
                    isValid = false;
                    errors.push(`RoutingAccessList '${name}': entries cannot mix address families`);
                }
            }
        });

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = RoutingAccessListValidator;
