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

const fs = require('fs');
const url = require('url');
const querystring = require('querystring');
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');

const logger = new Logger(module);

/**
 * Manages config on a device.
 *
 * @param {String | Object} configItems - Description of config items that we are interested in.
 *                                        If a String, should be the path to a file containing
 *                                        the items.
 * @param {Object} bigIp - BigIp object.
 *
 * @class
 */
class ConfigManager {
    constructor(configItems, bigIp) {
        if (typeof configItems === 'string') {
            this.configItems = JSON.parse(fs.readFileSync(configItems));
        } else {
            this.configItems = {};
            Object.assign(this.configItems, configItems);
        }
        this.bigIp = bigIp;
    }

    /**
     * Gets the configuration items we are interested in.
     *
     * The goal here is to create an object with the current BIG-IP config objects
     * that we are interested in and in a format that matches what our parsed declaration looks like.
     *
     * What we retrieve is controlled by this.configItems.
     *
     * this.config items should be in the format:
     * [
     *     {
     *         path: <iControl_rest_path>,
     *         schemaClass: <schema_class_name>
     *         properties: [
     *             {
     *                 id: <property_name>,
     *                 "truth": <mcp_truth_value_if_this_is_boolean>,
     *                 "falsehood": <mcp_false_value_if_this_is_boolean>
     *             }
     *         ]
     *         references: {
     *             <name_of_reference>: ['properties', 'that', 'we', 'are', 'interested', 'in']
     *         },
     *         singleValue: <true_if_we_want_single_key_value_vs_whole_object_(Provision, for example)>,
     *         nameless: <true_if_we_do_not_want_the_name_property_in_the_result>
     *     }
     * ]
     *
     * 'path' can contain tokens which will be replaced as follows:
     *     {{hostName}} - The current hostname
     *     {{deviceName}} - The current cm device name for the host
     *
     * @returns {Promise} A promise which is resolved with the config as returned by
     *                    iControl REST and filtered as defined in configItems.
     */
    get() {
        const currentConfig = {};
        const promises = [];
        const referencePromises = [];
        const referenceInfo = []; // info needed to tie reference result to config item

        // get this token replacements
        return getTokenMap.call(this)
            .then((tokenMap) => {
                const hostNameRegex = /{{hostName}}/;
                const deviceNameRegex = /{{deviceName}}/;

                // get a list of iControl Rest queries asking for the config items and selecting the
                // properties we want
                this.configItems.forEach((configItem) => {
                    const query = { $filter: 'partition eq Common' };
                    const selectProperties = getPropertiesOfInterest(configItem.properties);
                    if (selectProperties.length > 0) {
                        query.$select = selectProperties.join(',');
                    }
                    const encodedQuery = querystring.stringify(query);
                    let path = `${configItem.path}?${encodedQuery}`;

                    // do any replacements
                    path = path.replace(hostNameRegex, tokenMap.hostName);
                    path = path.replace(deviceNameRegex, tokenMap.deviceName);

                    promises.push(this.bigIp.list(path, null, cloudUtil.SHORT_RETRY));
                });

                return Promise.all(promises);
            })
            .then((results) => {
                let patchedItem;
                results.forEach((currentItem, index) => {
                    const schemaClass = this.configItems[index].schemaClass;
                    if (!schemaClass) {
                        // Simple item that is just key:value - not a larger object
                        Object.keys(currentItem).forEach((key) => {
                            currentConfig[key] = currentItem[key];
                        });
                    } else if (Array.isArray(currentItem)) {
                        currentConfig[schemaClass] = {};
                        currentItem.forEach((item) => {
                            patchedItem = removeUnusedKeys.call(this, item);
                            patchedItem = mapProperties.call(this, patchedItem, index);

                            // Self IPs are so odd that I don't see a generic way to handle this
                            if (schemaClass === 'SelfIp') {
                                patchedItem = patchSelfIp.call(this, patchedItem);
                            }

                            currentConfig[schemaClass][item.name] = patchedItem;
                            getReferencedPaths.call(this, item, index, referencePromises, referenceInfo);
                        });
                    } else {
                        currentConfig[schemaClass] = {};
                        patchedItem = removeUnusedKeys.call(
                            this,
                            currentItem,
                            this.configItems[index].nameless
                        );
                        patchedItem = mapProperties.call(this, patchedItem, index);
                        currentConfig[schemaClass] = patchedItem;
                        getReferencedPaths.call(this, currentItem, index, referencePromises, referenceInfo);
                    }
                });

                // get any objects that were referenced from the ones we already got
                return Promise.all(referencePromises);
            })
            .then((referencesResults) => {
                referencesResults.forEach((referenceResult, index) => {
                    const property = referenceInfo[index].property;
                    const schemaClass = referenceInfo[index].schemaClass;
                    const name = referenceInfo[index].name;
                    const configItem = currentConfig[schemaClass][name];

                    configItem[property] = [];
                    let patchedItem;
                    // references refer to arrays, so each referenceResult should be an array
                    referenceResult.forEach((reference) => {
                        patchedItem = removeUnusedKeys.call(this, reference);
                        referenceInfo[index].properties.forEach((refProperty) => {
                            if (refProperty.truth !== undefined) {
                                patchedItem[refProperty.id] = mapTruth(patchedItem, refProperty);
                            }
                        });
                        configItem[property].push(patchedItem);
                    });
                });

                return Promise.resolve(
                    {
                        parsed: true,
                        Common: currentConfig
                    }
                );
            })
            .catch((err) => {
                logger.severe(`Error getting current config: ${err.message}`);
                return Promise.reject(err);
            });
    }
}


/**
 * Removes keys we don't want from a config item
 *
 * We get some things we don't ask for
 *
 * @param {Object} item - The item to clean up
 * @param {Boolean} nameless - Whether or not to also remove the name property
 */
function removeUnusedKeys(item, nameless) {
    const filtered = {};

    const keysToRemove = ['kind', 'selfLink'];

    if (nameless) {
        keysToRemove.push('name');
    }

    Object.assign(filtered, item);
    Object.keys(filtered).forEach((key) => {
        if (key.endsWith('Reference')) {
            delete filtered[key];
        }

        if (keysToRemove.indexOf(key) !== -1) {
            delete filtered[key];
        }
    });
    return filtered;
}

/**
 * Gets the property names we want to ask iControl REST to select in our queries
 *
 * @param {Object[]} initialProperties - Array of configItem properties to select
 */
function getPropertiesOfInterest(initialProperties) {
    const requiredProperties = ['name'];
    const properties = initialProperties ? initialProperties.slice() : [];
    const propertyNames = properties.reduce((acc, curr) => {
        acc.push(curr.id);
        return acc;
    }, []);

    // make sure we're getting properties we always need
    requiredProperties.forEach((requiredProp) => {
        if (propertyNames.indexOf(requiredProp) === -1) {
            propertyNames.push(requiredProp);
        }
    });
    return propertyNames;
}

/**
 * Map what needs to be mapped.
 *
 * For example, map 'enabled' to true, and fix references if isRef is true
 *
 * @param {Object} item - The item whose properties to map
 * @param {Object} index - The index into configItems for this property
 */
function mapProperties(item, index) {
    const mappedItem = {};
    Object.assign(mappedItem, item);

    // If we're just interested in one value, return that (Provision values, for example)
    if (this.configItems[index].singleValue) {
        return mappedItem[this.configItems[index].properties[0].id];
    }

    this.configItems[index].properties.forEach((property) => {
        // map truth/falsehood (enabled/disabled, for example) to booleans
        if (property.truth !== undefined) {
            mappedItem[property.id] = mapTruth(mappedItem, property);
        }

        if (mappedItem[property.id]) {
            // If property is a reference, strip the /Common if it is there
            // Either the user specified it without /Commmon in their declaration
            // or we replaced the user value with just the last part because it looks
            // like a json pointer
            if (typeof mappedItem[property.id] === 'string'
                && mappedItem[property.id].startsWith('/Common/')) {
                mappedItem[property.id] = mappedItem[property.id].substring('/Common/'.length);
            }
        }
    });
    return mappedItem;
}

/**
 * Maps things like 'enabled/disabled' to true/false
 *
 * @param {Object} item - The config item
 * @param {Object} property - The property to map
 *
 * @returns {Boolean} Whether or not the property value represents truth
 */
function mapTruth(item, property) {
    if (!item[property.id]) {
        return false;
    }
    return item[property.id] === property.truth;
}

// given an item and its index in configItems, construct a path based the properties we want
// and on the link given to us in the reference in the iControl REST object
function getReferencedPaths(item, index, referencePromises, referenceInfo) {
    Object.keys(item).forEach((property) => {
        if (this.configItems[index].references
            && this.configItems[index].references[property]
            && item[property].link) {
            const parsed = url.parse(item[property].link);
            const query = querystring.parse(parsed.query);
            const selectProperties = getPropertiesOfInterest(
                this.configItems[index].references[property]
            );
            if (selectProperties.length > 0) {
                query.$select = selectProperties.join(',');
            }
            const encodedQuery = querystring.stringify(query);
            let path = `${parsed.pathname}?${encodedQuery}`;
            if (path.startsWith('/mgmt')) {
                path = path.substring('/mgmt'.length);
            }

            // trim off 'Reference' from the property name to get the name for the unreferenced property
            const regex = /^(.+)Reference$/;
            const trimmedPropertyName = regex.exec(property)[1];
            referencePromises.push(this.bigIp.list(path, null, cloudUtil.SHORT_RETRY));
            referenceInfo.push(
                {
                    property: trimmedPropertyName,
                    schemaClass: this.configItems[index].schemaClass,
                    name: item.name,
                    properties: this.configItems[index].references[property]
                }
            );
        }
    });
}

/**
 * Gets values we use to replace tokens in configItems.json
 *
 * @returns {Promise} A promise which is resolved with the replacement
 *                    map
 *     {
 *         hostName: hostname from global settings
 *         deviceName: device name for the host
 *     }
 */
function getTokenMap() {
    let hostName;
    return this.bigIp.deviceInfo()
        .then((deviceInfo) => {
            hostName = deviceInfo.hostname;
            return this.bigIp.list('/tm/cm/device');
        })
        .then((cmDeviceInfo) => {
            const devices = cmDeviceInfo.filter((device) => {
                return device.hostname === hostName;
            });

            if (devices.length === 1) {
                const deviceName = devices[0].name;
                return Promise.resolve(
                    {
                        hostName,
                        deviceName
                    }
                );
            }

            const message = 'Too many devices match our name';
            logger.severe(message);
            return Promise.reject(new Error(message));
        })
        .catch((err) => {
            logger.severe(`Error getting device info for tokens: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Self IPs have a couple oddities that are hard to deal with in a generic fashion
 *
 * - allowService is typically an array. However, if allowService is "default", you can
 * specify either "default" or ["default"] when creating but always get back ["default"]
 * - If allowService is "none", you specify "none" when creating but the returned object
 * just doesn't have the allowService property.
 * - If allowService is "all", you must specify "all" when creating and get back "all".
 *
 * @param {Object} selfIp - Self IP config item
 *
 * @returns A consistent self IP config item
 */
function patchSelfIp(selfIp) {
    const patched = {};
    Object.assign(patched, selfIp);
    if (!patched.allowService) {
        patched.allowService = 'none';
    } else if (Array.isArray(patched.allowService)) {
        if (patched.allowService.length === 1 && patched.allowService[0] === 'default') {
            patched.allowService = 'default';
        }
    }

    return patched;
}

module.exports = ConfigManager;
