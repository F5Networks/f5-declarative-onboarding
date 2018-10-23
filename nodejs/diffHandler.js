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

class DiffManager {
    /**
     * Constructor
     * @param {String[]} classesOfInterest - Array of classes that we want to diff. All
     *                                       other classes will be left alone.
     */
    constructor(classesOfInterest) {
        this.classesOfInterest = classesOfInterest.slice();
    }

    /**
     *
     * @param {Object} to - The declaration we are updating to
     * @param {Object} from - The declaration we are updating from
     *
     * @param {Promise} A promise which is resolved with the declaration to apply
     */
    process(to, from) {
        // start off with the stuff that we do not diff (we always attempt to apply these items)
        const final = {
            Common: populateUninterestingClasses(to.Common, this.classesOfInterest)
        };
        const updatedPaths = [];

        // let deep-diff update the from declaration so we don't have to figure out how
        // to apply the changes. Collect updated paths on the way so we can copy just
        // the changed data
        observableDiff(from, to, (diff) => {
            // diff.path looks like ['Common', 'DNS'], for example
            if (this.classesOfInterest.indexOf(diff.path[1]) !== -1) {
                applyChange(from, to, diff);

                // we're only interesed in on layer down (/Common/DNS, for example)
                if (updatedPaths.indexOf(diff.path[1]) === -1) {
                    updatedPaths.push(diff.path[1]);
                }
            }
        });

        // copy in anything that was updated
        updatedPaths.forEach((path) => {
            if (typeof from.Common[path] === 'string') {
                final.Common[path] = from.Common[path];
            } else if (Array.isArray(from.Common[path])) {
                final.Common[path] = from.Common[path].slice();
            } else {
                final.Common[path] = {};
                Object.assign(final.Common[path], from.Common[path]);
            }
        });

        return Promise.resolve(final);
    }
}

/**
 * Copies all classes that we do not want to diff
 *
 * @param {Object} declaration - Common section of parsed declaration
 * @param {String[]} classesOfInterest - Classes that we are interested in
 */
function populateUninterestingClasses(declaration, classesOfInterest) {
    const uninteresting = {};
    Object.keys(declaration).forEach((key) => {
        if (classesOfInterest.indexOf(key) === -1) {
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

module.exports = DiffManager;
