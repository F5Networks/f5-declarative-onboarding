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

class DeclarationParser {
    constructor(declaration) {
        this.declaration = {};
        Object.assign(this.declaration, declaration);
    }

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

            return parsed;
        } catch (err) {
            logger.error(`Error parsing delcaration ${err.message}`);
            throw err;
        }
    }
}

module.exports = DeclarationParser;
