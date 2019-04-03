/**
 * Copyright 2018-2019 F5 Networks, Inc.
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
 * @param {Object} doState - The current [doState]{@link State}
 * @param {String} [taskId] - The id of the task to send the response for. Default is to send
 *                            result for all tasks.
 * @param {Object} [options] - Query options
 * @param {String} [options.show] - What to show of the state. Only current option is 'full'
 */
class Response {
    constructor(itemId, responder, options) {
        if (itemId) {
            this.response = getResponse(itemId, responder, options);
        } else {
            const ids = responder.getIds() || [];
            this.response = ids.map((id) => {
                return getResponse(id, responder, options);
            });
        }
    }

    getResponse() {
        return this.response;
    }
}

function getResponse(id, responder, options) {
    if (!responder.exists(id)) {
        return {
            id,
            result: {
                code: 404,
                message: 'item does not exist',
                errors: ['item does not exist']
            }
        };
    }

    const response = {
        id,
        selfLink: responder.getSelfLink(id)
    };

    // For error statuses, restnoded requires message at the top level
    // Other items at the top level for backwards compatibility
    if (responder.getCode(id) >= 300) {
        response.code = responder.getCode(id);
        response.status = responder.getStatus(id);
        response.message = responder.getMessage(id);
        response.errors = responder.getErrors(id);
    }

    response.result = {
        class: 'Result',
        code: responder.getCode(id),
        status: responder.getStatus(id),
        message: responder.getMessage(id),
        errors: responder.getErrors(id)
    };

    const data = responder.getData(id, options);
    Object.keys(data).forEach((key) => {
        response[key] = data[key];
    });

    return response;
}

module.exports = Response;
