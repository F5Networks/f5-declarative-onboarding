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

module.exports = {
    /**
     * Updates IDs in an object from a declaration so that property names in the object
     * match the 'id' from configItems.json (for config items that have 'newId')
     *
     * @param {String | Object} configItems - Description of config items that we are interested in.
     *                                        If a String, should be the path to a file containing
     *                                        the items. See configItems.json
     * @param {String} schemaClass - The schama class
     * @param {Object} declarationItem - The object to update
     * @param {String} propertyName - The property's name
     *
     * @returns {Object} Updated property
     */
    updateIds(configItems, schemaClass, declarationItem, propertyName) {
        const matchingConfigItems = configItems.filter(item => item.schemaClass === schemaClass);
        if (matchingConfigItems.length === 0) {
            return declarationItem;
        }
        const itemToUpdate = JSON.parse(JSON.stringify(declarationItem));

        const idsToDelete = [];
        matchingConfigItems.forEach((configItem) => {
            configItem.properties.forEach((property) => {
                updateProperty(
                    property,
                    itemToUpdate,
                    propertyName,
                    declarationItem,
                    idsToDelete,
                    configItem
                );
            });
        });

        idsToDelete.forEach((id) => {
            const topLevelId = id.split('.')[0];
            delete itemToUpdate[topLevelId];
        });

        return itemToUpdate;
    }
};

function handleMappings(value, property) {
    if (value === true && property.truth) {
        return property.truth;
    }

    if (value === false && property.falsehood) {
        return property.falsehood;
    }

    if (typeof value === 'undefined' || value === null) {
        if (property.falsehood && !property.skipWhenOmitted) {
            return property.falsehood;
        }
    }

    return value;
}

function updateValue(property, itemToUpdate, dottedId, dottedNewId) {
    let value = doUtil.getDeepValue(itemToUpdate, dottedNewId || dottedId);
    value = handleMappings(value, property);
    if (typeof value !== 'undefined' && value !== null) {
        doUtil.setDeepValue(itemToUpdate, dottedId, value);
        if (dottedId !== dottedNewId) {
            doUtil.deleteKey(itemToUpdate, dottedNewId);
        }
    }
}

function updateProperty(property, itemToUpdate, propertyName, declarationItem, idsToDelete, configItem) {
    const hasSchemaMergePath = configItem.schemaMerge
        && configItem.schemaMerge.path
        && configItem.schemaMerge.path.length > 0;

    // Simple newId translation
    if (!configItem.schemaMerge || !hasSchemaMergePath) {
        let value = doUtil.getDeepValue(itemToUpdate, property.newId || property.id);
        value = handleMappings(value, property);

        if (typeof value !== 'undefined' && value !== null) {
            itemToUpdate[property.id] = value;
        }

        // We need special handling for the name property. Some classes allow you to specify a name
        // to allow for special characters. In this case, the newId is 'name'. We copy the name
        // value to the correct location, and then set the 'name' property to what was in the
        // declaration as the object's name. For an example, look at SnmpCommunity.
        if (property.newId && property.newId === 'name') {
            itemToUpdate.name = propertyName || declarationItem.name;
        }

        // Delete at the end of processing so that we can handle multiple nested ids
        // where we need to delete the container of the nested ids after they are all
        // updated
        if (property.newId && property.newId !== 'name' && idsToDelete.indexOf(property.newId) === -1) {
            idsToDelete.push(property.newId);
        }
    }

    // newId translation that is in a schemaMerge
    if (hasSchemaMergePath) {
        const dottedId = [configItem.schemaMerge.path.join('.'), property.id].join('.');
        const dottedNewId = [configItem.schemaMerge.path.join('.'), property.newId || property.id].join('.');
        updateValue(property, itemToUpdate, dottedId, dottedNewId);
    }

    // newId translation that is in a transform
    if (property.transform) {
        property.transform.forEach((trans) => {
            if (Array.isArray(itemToUpdate[property.id])) {
                itemToUpdate[property.id].forEach((subObject) => {
                    updateValue(trans, subObject, trans.id, trans.newId);
                });
            } else {
                let dottedId = [property.id, trans.id].join('.');
                let dottedNewId = [property.id, trans.newId || trans.id].join('.');

                // In some cases, the declaration only supports one item of an array
                // and moves it up one or more levels of what is a named property in mcp.
                // For example, GSLBServer devices.addresses[0].translation in mcp is
                // GSLBServer devices.addressTranslation
                if (property.upLevel) {
                    dottedId = dottedId.split('.').slice(property.upLevel).join('.');
                    dottedNewId = (dottedNewId || dottedId).split('.').slice(property.upLevel).join('.');
                }
                updateValue(trans, itemToUpdate, dottedId, dottedNewId);
            }
        });
    }

    // handle things that are references in MCPD
    if (property.dereferenceId) {
        if (itemToUpdate[property.dereferenceId]) {
            const referencedProperties = configItem.references[property.id];
            referencedProperties.forEach((referencedProperty) => {
                if (Array.isArray(itemToUpdate[property.dereferenceId])) {
                    const subIdsToDelete = [];
                    itemToUpdate[property.dereferenceId].forEach((subObject) => {
                        updateProperty(
                            referencedProperty,
                            subObject,
                            propertyName,
                            declarationItem,
                            subIdsToDelete,
                            configItem
                        );
                        subIdsToDelete.forEach((id) => {
                            const topLevelId = id.split('.')[0];
                            delete subObject[topLevelId];
                        });
                    });
                } else {
                    updateProperty(
                        referencedProperty,
                        itemToUpdate[property.dereferenceId],
                        propertyName,
                        declarationItem,
                        idsToDelete,
                        configItem
                    );
                }
            });
        }
    }
}
