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

const observableDiff = require('deep-diff').observableDiff;
const applyChange = require('deep-diff').applyChange;

class DiffHandler {
    /**
     * Constructor
     * @param {String[]} classesOfTruth - Array of classes that we are the source of truth for. All
     *                                    other classes will be left alone.
     */
    constructor(classesOfTruth) {
        this.classesOfTruth = classesOfTruth.slice();
    }

    /**
     * Calculates updates and deletions in declarations
     *
     * @param {Object} toDeclaration - The declaration we are updating to
     * @param {Object} fromDeclaration - The declaration we are updating from
     *
     * @param {Promise} A promise which is resolved with the declarations to delete
     *                  and update.
     *     {
     *         toDelete: <delete_declaration>
     *         toUpdate: <update_declaration>
     *     }
     */
    process(toDeclaration, fromDeclaration) {
        // Clone these to make sure we do not modify them via observableDiff
        const to = JSON.parse(JSON.stringify(toDeclaration));
        const from = JSON.parse(JSON.stringify(fromDeclaration));

        // Start off with the stuff that we do not diff (we are not the source of truth for
        // these - they will always be applied as given to us).
        const final = {
            Common: populateNonTruthClasses(to.Common, this.classesOfTruth)
        };
        const updatedPaths = [];

        const toDelete = {
            Common: {}
        };

        // let deep-diff update the from declaration so we don't have to figure out how
        // to apply the changes. Collect updated paths on the way so we can copy just
        // the changed data
        observableDiff(from, to, (diff) => {
            // diff.path looks like ['Common', 'VLAN', 'myVlan'], for example
            if (this.classesOfTruth.indexOf(diff.path[1]) !== -1) {
                applyChange(from, to, diff);

                // we're only interesed in one layer down (/Common/DNS, for example)
                if (updatedPaths.indexOf(diff.path[1]) === -1) {
                    updatedPaths.push(diff.path[1]);
                }

                // keep track of deletes since they require special handling
                if (diff.kind === 'D') {
                    if (!toDelete.Common[diff.path[1]]) {
                        toDelete.Common[diff.path[1]] = {};
                    }

                    // we are creating a declaration that looks like a parsed
                    // declaration with empty bodies for things to delete
                    // {
                    //         Common: {
                    //             VLAN: {
                    //                 myVlan: {}
                    //             }
                    //         }
                    // }
                    toDelete.Common[diff.path[1]][diff.path[2]] = {};
                }
            }
        });

        // copy in anything that was updated and keep track of what whas deleted
        updatedPaths.forEach((path) => {
            if (typeof from.Common[path] === 'string') {
                final.Common[path] = from.Common[path];
            } else if (Array.isArray(from.Common[path])) {
                final.Common[path] = from.Common[path].slice();
            } else {
                final.Common[path] = {};
                Object.assign(final.Common[path], from.Common[path]);
            }

            if (!final.Common[path] || Object.keys(final.Common[path]).length === 0) {
                if (!toDelete.Common[path]) {
                    toDelete.Common[path] = {};
                }
                toDelete.Common[path][fromDeclaration.Common[path]] = {};
            }
        });

        return Promise.resolve(
            {
                toDelete,
                toUpdate: final
            }
        );
    }
}

/**
 * Copies all classes that we are not the source of truth for (we don't want to diff these)
 *
 * @param {Object} declaration - Common section of parsed declaration
 * @param {String[]} classesOfTruth - Classes that we are the source of truth for
 */
function populateNonTruthClasses(declaration, classesOfTruth) {
    const uninteresting = {};
    Object.keys(declaration).forEach((key) => {
        if (classesOfTruth.indexOf(key) === -1) {
            if (typeof declaration[key] === 'string') {
                uninteresting[key] = declaration[key];
            } else if (typeof declaration[key] === 'object') {
                uninteresting[key] = {};
                Object.assign(uninteresting[key], declaration[key]);
            } else if (Array.isArray(declaration[key])) {
                uninteresting[key] = declaration[key].slice();
            }
        }
    });

    return uninteresting;
}

module.exports = DiffHandler;
