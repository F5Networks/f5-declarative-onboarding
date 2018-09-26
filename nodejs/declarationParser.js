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

const KEYS_TO_IGNORE = ['schemaVersion', 'class'];

/**
 * Parses a declaration into a more usable object.
 *
 *    + Splits out components (System, Network, etc)
 *    + Spits out sub-components (DNS, License, etc)
 *    + Assigns a tenant to each object
 *
 * For example, given the declaration
 *
 *     {
 *         "schemaVersion": "0.1.0",
 *         "class": "Device",
 *         "Common": {
 *             "class": "Tenant",
 *             "mySystem": {
 *                 "class": "System",
 *                 "hostname": "bigip.example.com",
 *                 "myLicense": {
 *                     "class": "License",
 *                     "licenseType": "regKey",
 *                     "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
 *                 },
 *                 "myDns": {
 *                     "class": "DNS",
 *                     "nameServers": [
 *                         "1.2.3.4",
 *                         "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
 *                     ],
 *                     "search": [
 *                         "f5.com"
 *                     ]
 *                 }
 *             }
 *         },
 *         "Tenant1": {
 *             "class": "Tenant",
 *             "myNetwork": {
 *                 "class": "Network",
 *                 "app1Vlan": {
 *                     "class": "VLAN",
 *                     "tag": 1234,
 *                     "mtu": 1500,
 *                     "1.1": {
 *                         "class": "Interface",
 *                         "tagged": true
 *                     }
 *                 }
 *             }
 *         }
 *     }
 *
 * Returns a parsed delcaration
 *
 *     {
 *         "System": {
 *             "hostname": "bigip.example.com",
 *             "License": {
 *                 "myLicense": {
 *                     "tenant": "Common",
 *                     "licenseType": "regKey",
 *                     "regKey": "MMKGX-UPVPI-YIEMK-OAZIS-KQHSNAZ"
 *                 }
 *             },
 *             "DNS": {
 *                 "myDns": {
 *                     "tenant": "Common",
 *                     "nameServers": [
 *                         "1.2.3.4",
 *                         "FE80:0000:0000:0000:0202:B3FF:FE1E:8329"
 *                     ],
 *                     "search": [
 *                         "f5.com"
 *                     ]
 *                 }
 *             }
 *         },
 *         "Network": {
 *             "VLAN": {
 *                 "app1Vlan": {
 *                     "tenant": "Tenant1",
 *                     "tag": 1234,
 *                     "mtu": 1500,
 *                     "1.1": {
 *                         "class": "Interface",
 *                         "tagged": true
 *                     }
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
                const tenant = this.declaration[tenantName];
                const containers = getKeysOfInterest(tenant);
                containers.forEach((containerName) => {
                    const container = tenant[containerName];
                    const containerType = container.class; // System, Network, etc

                    parsed[containerType] = {};

                    Object.keys(container).forEach((key) => {
                        if (isKeyOfInterest(key)) {
                            const property = container[key];
                            if (typeof property === 'object' && property.class) {
                                const propertyClass = property.class;
                                delete property.class;
                                property.tenant = tenantName;
                                if (!parsed[containerType][propertyClass]) {
                                    parsed[containerType][propertyClass] = {};
                                }
                                parsed[containerType][propertyClass][key] = {};
                                Object.assign(parsed[containerType][propertyClass][key], property);
                            } else {
                                parsed[containerType][key] = property;
                            }
                        }
                    });
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
