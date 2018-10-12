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

const assert = require('assert');
const declarationHandler = require('./declarationHandler');

class Response {
    static getResponseBody(state) {
        assert.strictEqual(typeof state.status, 'object', 'No status found in state');

        let body = Object.assign({}, state);
        const code = body.status ? body.status.code : 500;
        const message = body.status ? body.status.message : 'No status in response';
        delete body.status;

        // the current state should already be masked, but just to be sure nothing
        // sneaks in...
        body = declarationHandler.getMasked(body);

        return {
            result: {
                code,
                message,
                class: 'Result'
            },
            declaration: body
        };
    }
}

module.exports = Response;
