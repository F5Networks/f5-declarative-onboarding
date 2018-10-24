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

const KEYS_TO_MASK = require('./sharedConstants').KEYS_TO_MASK;

/**
 * Represents the declarative onboarding state
 *
 * @class
 */
class State {
    constructor(declarationOrState) {
        this.currentConfig = null;
        this.originalConfig = null;
        if (declarationOrState && declarationOrState.result) {
            // If we were passed a state object, just copy
            this.result = {};
            this.declaration = {};
            Object.assign(this.result, declarationOrState.result);
            Object.assign(this.declaration, declarationOrState.declaration);
        } else {
            // otherwise, create a new state
            this.result = {
                class: 'Result'
            };
            this.declaration = mask(declarationOrState);
        }
    }

    /**
     * Gets the current result code
     */
    get code() {
        return this.result.code;
    }

    /**
     * Gets the current result message
     */
    get message() {
        return this.result.message;
    }

    /**
     * Gets the current status string
     */
    get status() {
        return this.result.status;
    }

    /**
     * Gets the current result message
     */
    get errors() {
        return this.result.errors;
    }

    /**
     * Updates the result
     *
     * @param {number} code - The f5-declarative-onboarding result code.
     * @param {string} status - The f5-declarative-onboarding status string from sharedConstants.STATUS.
     * @param {string} message - The user friendly error message if there is one.
     * @param {string | array} - An error message or array of messages
     */
    updateResult(code, status, message, errors) {
        if (code) {
            this.result.code = code;
        }

        if (status) {
            this.result.status = status;
        }

        if (message) {
            this.result.message = message;
        }

        if (errors) {
            if (!this.result.errors) {
                this.result.errors = [];
            }

            if (Array.isArray(errors)) {
                this.result.errors = this.result.errors.concat(errors);
            } else {
                this.result.errors.push(errors);
            }
        }
    }
}

function mask(declaration) {
    const masked = {};
    Object.assign(masked, declaration);

    Object.keys(masked).forEach((key) => {
        if (typeof masked[key] === 'object') {
            masked[key] = mask(masked[key]);
        } else if (KEYS_TO_MASK.indexOf(key) !== -1) {
            delete masked[key];
        }
    });

    return masked;
}

module.exports = State;
