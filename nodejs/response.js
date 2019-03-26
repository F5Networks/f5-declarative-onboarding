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
    constructor(doState, taskId, options) {
        if (taskId) {
            return getResponse(doState, taskId, options);
        }

        const taskIds = doState.getTaskIds();
        return taskIds.map((id) => {
            return getResponse(doState, id, options);
        });
    }
}

function getResponse(doState, taskId, options) {
    const task = doState.getTask(taskId);
    if (!task) {
        return {
            id: taskId,
            result: {
                code: 404,
                message: 'Task does not exist',
                errors: ['Task does not exist']
            }
        };
    }
    const response = {
        id: taskId,
        selfLink: `https://localhost/mgmt/shared/declarative-onboarding/task/${taskId}`,
        result: {
            class: 'Result',
            code: doState.getCode(taskId),
            status: doState.getStatus(taskId),
            message: doState.getMessage(taskId),
            errors: doState.getErrors(taskId)
        },
        declaration: doState.getDeclaration(taskId)
    };

    if (options && options.show && options.show === 'full') {
        response.currentConfig = doState.getCurrentConfig(taskId);
        response.originalConfig = doState.getOriginalConfigByTaskId(taskId);
        response.lastUpdate = doState.getLastUpdate(taskId);
    }

    return response;
}

module.exports = Response;
