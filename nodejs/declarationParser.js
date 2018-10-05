/**
 * Copyright 2018 F5 Networks, Inc.
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

const Logger = require('./logger');

const logger = new Logger(module);

/**
 * Parses a declaration into a more usable object.
 *
 *    + Splits out components (System, Network, etc)
 *    + Each component is split into tenants
 *    + Spits out sub-components (DNS, License, etc)
 *    + For non-System components reates name properties based on the container names
 *
 * For example, given the declaration
 *
 *     {
 *         "schemaVersion": "0.1.0",
 *         "class": "Device",
 *         "Common": {
 *             "class": "Tenant",
 *             "hostname": "bigip.example.com",
 *             "myLicense": {
 *                 "class": "License",
 *                 "licenseType": "regKey",
 *                 "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
 *             },
 *             "myDns": {
 *                 "class": "DNS",
 *                 "nameServers": [
 *                     "1.2.3.4",
 *                     "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
 *                 ],
 *                 "search": [
 *                     "f5.com"
 *                 ]
 *             },
 *             "commonVlan": {
 *                 "class": "VLAN",
 *                 "tag": 2345,
 *                 "mtu": 1400,
 *                 "1.1": {
 *                     "class": "Interface",
 *                     "tagged": true
 *                 }
 *             }
 *         },
 *         "Tenant1": {
 *             "class": "Tenant",
 *             "app1Vlan": {
 *                 "class": "VLAN",
 *                 "tag": 1234,
 *                 "mtu": 1500,
 *                 "1.1": {
 *                     "class": "Interface",
 *                     "tagged": true
 *                 }
 *             },
 *             "app1SelfIp": {
 *                 "class": "SelfIp",
 *                 "vlan": "app1Vlan",
 *                 "address": "1.2.3.4/24"
 *             }
 *         }
 *     }
 *
 * Returns a parsed delcaration
 *
 *     {
 *         "Common": {
 *             "hostname": "bigip.example.com",
 *             "License": {
 *                 "myLicense": {
 *                     "licenseType": "regKey",
 *                     "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
 *                 }
 *             },
 *             "DNS": {
 *                 "myDns": {
 *                     "nameServers": [
 *                         "1.2.3.4",
 *                         "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
 *                     ],
 *                     "search": [
 *                         "f5.com"
 *                     ]
 *                 }
 *             },
 *             "VLAN": {
 *                 "myNetwork_commonVlan": {
 *                     "tag": 2345,
 *                     "mtu": 1400,
 *                     "1.1": {
 *                         "class": "Interface",
 *                         "tagged": true
 *                     }
 *                 }
 *             }
 *         },
 *         "Tenant1": {
 *             "VLAN": {
 *                 "myNetwork_app1Vlan": {
 *                     "tag": 1234,
 *                     "mtu": 1500,
 *                     "1.1": {
 *                         "class": "Interface",
 *                         "tagged": true
 *                     }
 *                 }
 *             },
 *             "SelfIp": {
 *                 "myNetwork_app1SelfIp": {
 *                     "vlan": "app1Vlan",
 *                     "address": "1.2.3.4/24"
 *                 }
 *             }
 *         }
 *     }
 */
class DeclarationParser {
    constructor(declaration) {
        this.declaration = {};
        Object.assign(this.declaration, declaration);
    }

    /**
     * Parses the declaration
     *
     * @returns {object} A parsed declaration and list of tenants in the form
     *
     *     {
     *         tenants: <array of tenant names>,
     *         parsedDeclaration: <the parsed declaration>
     *     }
     */
    parse() {
        const KEYS_TO_IGNORE = ['schemaVersion', 'class'];

        function isKeyOfInterest(key) {
            return KEYS_TO_IGNORE.indexOf(key) === -1;
        }

        function getTenants(declaration) {
            return Object.keys(declaration).filter((possibleTenant) => {
                if (isKeyOfInterest(possibleTenant) && declaration[possibleTenant].class) {
                    return declaration[possibleTenant].class === 'Tenant';
                }
                return false;
            });
        }

        function getKeysOfInterest(declaration) {
            return Object.keys(declaration).filter((key) => {
                return isKeyOfInterest(key);
            });
        }

        try {
            const parsed = {};

            const tenants = getTenants(this.declaration);
            tenants.forEach((tenantName) => {
                if (!parsed[tenantName]) {
                    parsed[tenantName] = {};
                }

                const tenant = this.declaration[tenantName];
                const properties = getKeysOfInterest(tenant);
                properties.forEach((propertyName) => {
                    const property = tenant[propertyName];

                    if (typeof property !== 'object') {
                        parsed[tenantName][propertyName] = property;
                    } else {
                        const propertyClass = property.class;
                        delete property.class;

                        if (!parsed[tenantName][propertyClass]) {
                            parsed[tenantName][propertyClass] = {};
                        }

                        parsed[tenantName][propertyClass][propertyName] = {};
                        Object.assign(parsed[tenantName][propertyClass][propertyName], property);
                    }
                });
            });

            return {
                tenants,
                parsedDeclaration: parsed
            };
        } catch (err) {
            logger.error(`Error parsing delcaration ${err.message}`);
            throw err;
        }
    }
}

module.exports = DeclarationParser;
