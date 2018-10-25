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

/**
 * Format a response to rest request
 *
 * @class
 *
 * @param {Object} state - The current [doState]{@link State}
 * @param {Object} [options] - Query options
 * @param {String} [options.show] - What to show of the state. Only current option is 'full'
 */
class Response {
    constructor(state, options) {
        if (state.code < 300) {
            this.result = {
                class: 'Result',
                code: state.code,
                status: state.status,
                message: state.message,
                errors: state.errors
            };
        } else {
            this.code = state.code;
            this.status = state.status;
            this.message = state.message;
            this.errors = state.errors;
        }

        this.declaration = state.declaration;

        if (options && options.show && options.show === 'full') {
            this.currentConfig = state.currentConfig;
            this.originalConfig = state.originalConfig;
        }
    }
}

module.exports = Response;
