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
     * The goal here is to create an object with the current config that we are interested
     * in and in a format that matches what our parsed declaration looks like.
     *
     * What we retrieve is controlled by this.configItems.
     *
     * this.config items should be in the format:
     * [
     *     {
     *         path: <iControl_rest_path>,
     *         properties: ['properties', 'that', 'we', 'are', 'interested', 'in'],
     *         references: {
     *             <name_of_reference>: ['properties', 'that', 'we', 'are', 'interested', 'in']
     *         }
     *     }
     * ]
     *
     * @returns {Promise} A promise which is resolved with the config as returned by
     *                    iControl REST and filtered as defined in configItems.
     */
    get() {
        const currentConfig = {};
        const promises = [];
        const referencePromises = [];
        const referenceInfo = []; // info needed to tie reference result to config item

        // get a list of iControl Rest queries asking for the config items and selecting the
        // properties we want
        this.configItems.forEach((configItem) => {
            const query = { $filter: 'partition eq Common' };
            const selectProperties = getPropertiesOfInterest(configItem.properties);
            if (selectProperties.length > 0) {
                query.$select = selectProperties.join(',');
            }
            const encodedQuery = querystring.stringify(query);
            const path = `${configItem.path}?${encodedQuery}`;
            promises.push(this.bigIp.list(path, null, cloudUtil.SHORT_RETRY));
        });

        return Promise.all(promises)
            .then((results) => {
                results.forEach((currentItem, index) => {
                    if (Array.isArray(currentItem)) {
                        const kind = currentItem[0].kind; // all items should be the same kind
                        currentConfig[kind] = {};
                        currentItem.forEach((item) => {
                            currentConfig[kind][item.name] = removeUnusedKeys(item);
                            getReferencedPaths.call(this, item, index, referencePromises, referenceInfo);
                        });
                    } else {
                        currentConfig[currentItem.kind] = removeUnusedKeys(currentItem);
                        getReferencedPaths.call(this, currentItem, index, referencePromises, referenceInfo);
                    }
                });
                return Promise.all(referencePromises);
            })
            .then((referencesResults) => {
                referencesResults.forEach((referenceResult, index) => {
                    const property = referenceInfo[index].property;
                    const kind = referenceInfo[index].kind;
                    const name = referenceInfo[index].name;
                    const configItem = currentConfig[kind][name];

                    configItem[property] = [];
                    // references refer to arrays, so each referenceResult should be an array
                    referenceResult.forEach((reference) => {
                        configItem[property].push(removeUnusedKeys(reference));
                    });
                });
                logger.info('currentConfig', JSON.stringify(currentConfig, null, 4));
            })
            .catch((err) => {
                logger.severe(`Error getting current config: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

// Remove keys we don't want from a config item
function removeUnusedKeys(item) {
    const filtered = {};
    Object.assign(filtered, item);
    Object.keys(filtered).forEach((key) => {
        if (key === 'kind' || key.endsWith('Reference')) {
            delete filtered[key];
        }
    });
    return filtered;
}

function getPropertiesOfInterest(initialProperties) {
    const requiredProperties = ['kind', 'name'];
    const properties = initialProperties ? initialProperties.slice() : [];
    requiredProperties.forEach((requiredProp) => {
        if (properties.indexOf(requiredProp) === -1) {
            properties.push(requiredProp);
        }
    });
    return properties;
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
                    kind: item.kind,
                    name: item.name
                }
            );
        }
    });
}

module.exports = ConfigManager;
