/**
 * Copyright 2024 F5, Inc.
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
 * @param {String} [options.statusCodes] - Which set of status codes to use.
 *                                         Options are 'legacy' (default) and 'experimental'
 */
class Response {
    constructor(itemId, responder, options) {
        this.itemId = itemId;
        this.responder = responder;
        this.options = options;
    }

    getResponse() {
        let response;
        if (this.itemId) {
            response = getResponse(this.itemId, this.responder, this.options);
        } else {
            const ids = this.responder.getIds() || [];
            response = Promise.all(ids.map((id) => getResponse(id, this.responder, this.options)));
        }
        return response;
    }
}

function getResponse(id, responder, options) {
    if (!responder.exists(id)) {
        return Promise.resolve({
            id,
            httpStatus: 404,
            result: {
                code: 404,
                message: 'item does not exist',
                errors: ['item does not exist']
            }
        });
    }

    return Promise.resolve(responder.getData(id, options))
        .then((data) => {
            const response = {
                id,
                selfLink: responder.getSelfLink(id)
            };

            // mandatory methods
            const code = responder.getCode(id);
            const status = responder.getStatus(id);
            const message = responder.getMessage(id);
            const errors = responder.getErrors(id);

            // optional methods
            const dryRun = responder.getDryRun && responder.getDryRun(id);
            const warnings = responder.getWarnings && responder.getWarnings(id);

            // For error statuses, restnoded requires message at the top level
            // Other items at the top level for backwards compatibility
            if (code >= 300) {
                Object.assign(response, {
                    code, status, message, errors, warnings
                });
            }
            response.result = {
                class: 'Result', code, status, dryRun, message, errors, warnings
            };
            Object.assign(response, data);
            return Promise.resolve(response);
        })
        .catch((err) => Promise.resolve({
            id,
            result: {
                code: 500,
                message: 'internal error',
                errors: [err.message]
            }
        }));
}

module.exports = Response;
