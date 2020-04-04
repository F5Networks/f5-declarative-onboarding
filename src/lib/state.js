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

const uuidv4 = require('uuid/v4');

const MASK_REGEX = require('./sharedConstants').MASK_REGEX;

const TASK_RETENTION_DAYS = 7;

/**
 * Represents the declarative onboarding state
 *
 * @class
 */
class State {
    /**
     * Copy constructor
     *
     * This allows us to re-create a state object with methods from just the data
     *
     * @param {Object} existingState - The existing state data
     */
    constructor(existingState) {
        if (existingState) {
            const state = copyAndUpgradeState(existingState);
            this.originalConfig = state.originalConfig;
            this.tasks = state.tasks;
            this.mostRecentTask = state.mostRecentTask;
        } else {
            this.originalConfig = {};
            this.tasks = {};
            this.mostRecentTask = null;
        }
    }

    /**
     * Adds a task to the current tasks.
     *
     * @returns {Number} - The id of the added task.
     */
    addTask() {
        const taskId = uuidv4();
        this.tasks[taskId] = {
            id: taskId,
            lastUpdate: new Date(),
            result: {},
            internalDeclaration: {}
        };
        this.mostRecentTask = taskId;

        cleanupOldTasks(this.tasks);

        return taskId;
    }

    /**
     * Gets the task state for a task id.
     *
     * @param {String} taskId - The id of the task.
     *
     * @returns {Object} The task state for the given taskId.
     */
    getTask(taskId) {
        return this.tasks[taskId];
    }

    /**
     * Gets all of the task ids
     *
     * @returns {String[]} Array of task ids
     */
    getTaskIds() {
        return Object.keys(this.tasks);
    }

    /**
     * Sets the current configuration of the BIG-IP.
     *
     * @param {String} taskId - The id of the task.
     * @param {Object} currentConfig - Configuration to store. This should be in the format
     *                                 that the {@link DeclarationParser} would create.
     */
    setCurrentConfig(taskId, currentConfig) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].currentConfig = JSON.parse(JSON.stringify(currentConfig));
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the current configuration.
     *
     * @param {String} taskId - The id of the task.
     *
     * @returns {Object} The current configuration in the format
     *                   that the {@link DeclarationParser} would create.
     */
    getCurrentConfig(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].currentConfig;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the original configuration of the BIG-IP by config id.
     *
     * @param {String} id - Unique id for this BIG-IP (machineId, for example).
     * @param {Object} originalConfig - Configuration to store. This should be in the format
     *                                  that the {@link DeclarationParser} would create.
     */
    setOriginalConfigByConfigId(id, originalConfig) {
        this.originalConfig[id] = JSON.parse(JSON.stringify(originalConfig));
    }

    /**
     * Gets the original configuration of BIG-IP by config id.
     *
     * @param {String} id - Unique id for this BIG-IP (machineId, for example).
     *
     * @returns {Object} The original configuration in the format
     *                   that the {@link DeclarationParser} would create.
     */
    getOriginalConfigByConfigId(id) {
        if (this.originalConfig[id]) {
            return this.originalConfig[id];
        }
        return null;
    }

    /**
     * Gets the original configuration of the BIG-IP by taskId.
     *
     * @param {String} taskId - The id of the task.
     *
     * @returns {Object} The original configuration in the format
     *                   that the {@link DeclarationParser} would create.
     */
    getOriginalConfigByTaskId(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].originalConfig;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Deletes original config by config id.
     *
     * @param {String} id - The id of the task.
     */
    deleteOriginalConfigByConfigId(id) {
        delete this.originalConfig[id];
    }

    /**
     * Gets all of the config ids.
     *
     * @returns {String[]} Array of config ids.
     */
    getOriginalConfigIds() {
        return Object.keys(this.originalConfig);
    }

    /**
     * Sets the result code for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {Number} code - The status code to set.
     */
    setCode(taskId, code) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].result.code = code;
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the current result code for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getCode(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].result.code;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the current result message for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {String} result - The result message to set.
     */
    setMessage(taskId, message) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].result.message = message;
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the current result message for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getMessage(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].result.message;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the current status string for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {String} status - The status string to set.
     */
    setStatus(taskId, status) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].result.status = status;
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the current status string for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getStatus(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].result.status;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the current errors for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {String[]} errors - The error array to set.
     */
    setErrors(taskId, errors) {
        if (this.tasks[taskId]) {
            if (errors) {
                this.tasks[taskId].result.errors = errors.slice();
            } else if (this.tasks[taskId].result.errors) {
                this.tasks[taskId].result.errors.length = 0;
            }
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the current result message for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getErrors(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].result.errors;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the declaration for a task, masking certain values
     *
     * @param {String} taskId - The id of the task.
     * @param {Object} declaration - The declaration to set.
     */
    setDeclaration(taskId, declaration) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].internalDeclaration = mask(declaration);
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Sets the rebootRequired flag for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {boolaen} rebootRequired - Whether or not reboot is required
     */
    setRebootRequired(taskId, rebootRequired) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].rebootRequired = rebootRequired;
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the rebootRequired flag for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getRebootRequired(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].rebootRequired;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the request options for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {Object} reqOpts - The request options to set.
     */
    setRequestOptions(taskId, reqOpts) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].requestOptions = reqOpts;
        } else {
            throw new Error('taskId does not exist');
        }
    }

    /**
     * Gets the request options for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getRequestOptions(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].requestOptions;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Sets the rollback info for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {Object} rollbackInfo - Information required during rollback
     */
    setRollbackInfo(taskId, rollbackInfo) {
        if (rollbackInfo) {
            if (this.tasks[taskId]) {
                this.tasks[taskId].rollbackInfo = JSON.parse(JSON.stringify(rollbackInfo));
            } else {
                throw new Error('taskId does not exist');
            }
        }
    }

    /**
     * Gets the rollback info for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getRollbackInfo(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].rollbackInfo;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Gets the declaration for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getDeclaration(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].internalDeclaration;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Gets the last update time for a task
     *
     * @param {String} taskId - The id of the task.
     */
    getLastUpdate(taskId) {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].lastUpdate;
        }
        throw new Error('taskId does not exist');
    }

    /**
     * Updates the result for a task
     *
     * @param {String} taskId - The id of the task.
     * @param {number} code - The f5-declarative-onboarding result code.
     * @param {string} status - The f5-declarative-onboarding status string from sharedConstants.STATUS.
     * @param {string} message - The user friendly error message if there is one.
     * @param {string | array} - An error message or array of messages.
     */
    updateResult(taskId, code, status, message, errors) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].lastUpdate = new Date();
            const result = this.tasks[taskId].result;
            if (code) {
                result.code = code;
            }

            if (status) {
                result.status = status;
            }

            if (message) {
                result.message = message;
            }

            if (errors) {
                if (!result.errors) {
                    result.errors = [];
                }

                if (Array.isArray(errors)) {
                    result.errors = result.errors.concat(errors);
                } else {
                    result.errors.push(errors);
                }
            }
        } else {
            throw new Error('taskId does not exist');
        }
    }
}

/**
 * Upgades the state object from a prior release of DO
 *
 * @param {Object} existingState - The current doState data
 *
 * @returns {Object} A copy of existingState upgraded to match the current data model
 */
function copyAndUpgradeState(existingState) {
    if (!existingState.tasks) {
        const state = {
            tasks: {}
        };
        const taskId = uuidv4();
        state.tasks[taskId] = JSON.parse(JSON.stringify(existingState));
        state.tasks[taskId].lastUpdate = new Date();
        state.tasks[taskId].id = taskId;
        state.mostRecentTask = taskId;
        return state;
    }
    if (!existingState.originalConfig) {
        existingState.originalConfig = {};
    }
    return JSON.parse(JSON.stringify(existingState));
}

function mask(declaration) {
    const masked = JSON.parse(JSON.stringify(declaration));

    Object.keys(masked).forEach((key) => {
        if (MASK_REGEX.test(key)) {
            delete masked[key];
        } else if (!Array.isArray(masked[key]) && typeof masked[key] === 'object') {
            masked[key] = mask(masked[key]);
        } else if (Array.isArray(masked[key])) {
            masked[key].forEach((item, index) => {
                if (!Array.isArray(item) && typeof item === 'object') {
                    masked[key][index] = mask(item);
                }
            });
        } else if (MASK_REGEX.test(key)) {
            delete masked[key];
        }
    });

    return masked;
}

function cleanupOldTasks(tasks) {
    const maxAge = TASK_RETENTION_DAYS * 1000 * 3600 * 24;
    const now = new Date();
    Object.keys(tasks).forEach((taskId) => {
        if (now - tasks[taskId].lastUpdate > maxAge) {
            delete tasks[taskId];
        }
    });
}

module.exports = State;
