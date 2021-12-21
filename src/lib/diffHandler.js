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

const observableDiff = require('deep-diff').observableDiff;
const applyChange = require('deep-diff').applyChange;

const TraceManager = require('./traceManager');

class DiffHandler {
    /**
     * Constructor
     * @param {String[]} classesOfTruth   - Array of classes that we are the source of truth for. All
     *                                      other classes will be left alone.
     * @param {String[]} namelessClasses  - Array of classes which do not have a name property
     *                                      (DNS, for example)
     * @param {EventEmitter} eventEmitter - DO event emitter.
     * @param {State}        state        - The doState.
     */
    constructor(classesOfTruth, namelessClasses, eventEmitter, state) {
        this.classesOfTruth = classesOfTruth.slice();
        this.namelessClasses = namelessClasses.slice();
        this.eventEmitter = eventEmitter;
        this.state = state;

        // Although we may be the source of truth for 'hostname', we do not want
        // to diff it because hostname is set in 2 different places. Better
        // to let f5-cloud-libs handle checking it.
        for (let i = 0; i < this.classesOfTruth.length; i += 1) {
            if (this.classesOfTruth[i] === 'hostname') {
                this.classesOfTruth.splice(i, 1);
            }
        }
    }

    /**
     * Calculates updates and deletions in declarations
     *
     * @param {Object} toDeclaration - The parsed declaration we are updating to
     * @param {Object} fromDeclaration - The parsed declaration we are updating from
     * @param {Object} originalDeclaration - The original declaration
     *
     * @param {Promise} A promise which is resolved with the declarations to delete
     *                  and update.
     *     {
     *         toDelete: <delete_declaration>
     *         toUpdate: <update_declaration>
     *     }
     */
    process(toDeclaration, fromDeclaration, originalDeclaration) {
        // Clone these to make sure we do not modify them via observableDiff
        const to = JSON.parse(JSON.stringify(toDeclaration));
        const from = JSON.parse(JSON.stringify(fromDeclaration));

        // Start off with the stuff that we do not diff (we are not the source of truth for
        // these - they will always be applied as given to us).
        const final = {
            Common: populateNonTruthClasses(to.Common, this.classesOfTruth)
        };
        const updatedClasses = [];
        const updatedNames = {};

        const toDelete = {
            Common: {}
        };

        const accumulatedDiffs = [];

        // let deep-diff update the from declaration so we don't have to figure out how
        // to apply the changes. Collect updated paths on the way so we can copy just
        // the changed data
        observableDiff(from, to, (diff) => {
            // diff.path looks like ['Common', 'VLAN', 'myVlan'], for example
            if (this.classesOfTruth.indexOf(diff.path[1]) !== -1) {
                accumulatedDiffs.push(diff);

                applyChange(from, to, diff);

                // the item at index 1 is the name of the class in the schema
                // if these are named objects (vlans, for example) the name is at
                // index 2
                const schemaClass = diff.path[1];
                let objectNames;
                if (this.namelessClasses.indexOf(schemaClass) === -1) {
                    objectNames = diff.path[2];
                }
                // For additions of named classes, the object name will be in the rhs object
                if (!objectNames && diff.rhs) {
                    objectNames = Object.keys(diff.rhs);
                }

                if (updatedClasses.indexOf(schemaClass) === -1) {
                    updatedClasses.push(schemaClass);
                }
                if (objectNames) {
                    if (!updatedNames[schemaClass]) {
                        updatedNames[schemaClass] = [];
                    }
                    updatedNames[schemaClass] = updatedNames[schemaClass].concat(objectNames);
                } else {
                    updatedNames[schemaClass] = [];
                }

                // keep track of objects to delete since they require special handling
                // diff.path looks like ['Common', 'SelfIp', 'external', 'trafficGroup']
                // so if diff.path is longer than 3, it's just a property being deleted
                // and this will be handled by the applyChange
                if (diff.kind === 'D' && diff.path.length === 3) {
                    if (!toDelete.Common[schemaClass]) {
                        toDelete.Common[schemaClass] = {};
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
                    toDelete.Common[schemaClass][diff.path[2]] = {};
                }
            }
        });

        // copy in anything that was updated
        updatedClasses.forEach((schemaClass) => {
            if (typeof from.Common[schemaClass] === 'string') {
                final.Common[schemaClass] = from.Common[schemaClass];
            } else if (Array.isArray(from.Common[schemaClass])) {
                final.Common[schemaClass] = from.Common[schemaClass].slice();
            } else {
                final.Common[schemaClass] = {};
                if (this.namelessClasses.indexOf(schemaClass) === -1) {
                    // for named classes, just update the objects that changed
                    updatedNames[schemaClass].forEach((updatedName) => {
                        final.Common[schemaClass][updatedName] = {};
                        Object.assign(
                            final.Common[schemaClass][updatedName],
                            from.Common[schemaClass][updatedName]
                        );
                    });
                } else {
                    Object.assign(final.Common[schemaClass], from.Common[schemaClass]);
                }
            }
        });

        const traceManager = new TraceManager(originalDeclaration, this.eventEmitter, this.state);
        return traceManager.traceDiff(accumulatedDiffs)
            .then(() => Promise.resolve(
                {
                    toDelete,
                    toUpdate: final
                }
            ));
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
