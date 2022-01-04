/**
 * Copyright 2022 F5 Networks, Inc.
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

module.exports = {
    getTask(taskId) {
        return this.tasks[taskId];
    },
    getTaskIds() {
        return Object.keys(this.tasks);
    },
    getCode(taskId) {
        return this.tasks[taskId].result.code;
    },
    getStatus(taskId) {
        return this.tasks[taskId].result.status;
    },
    getMessage(taskId) {
        return this.tasks[taskId].result.message;
    },
    getErrors(taskId) {
        return this.tasks[taskId].result.errors;
    },
    getDeclaration(taskId) {
        return this.tasks[taskId].declaration;
    },
    getRequestOptions(taskId) {
        return this.tasks[taskId].requestOptions;
    },
    getCurrentConfig(taskId) {
        return this.tasks[taskId].currentConfig;
    },
    getOriginalConfig(taskId) {
        return this.tasks[taskId].originalConfig;
    },
    getLastUpdate(taskId) {
        return this.tasks[taskId].lastUpdate;
    },
    getOriginalConfigByTaskId(taskId) {
        return this.tasks[taskId].originalConfig;
    },
    getOriginalConfigByConfigId(machineId) {
        return this.originalConfig[machineId];
    },
    getOriginalConfigIds() {
        return Object.keys(this.originalConfig);
    },
    getTraceCurrent(taskId) {
        return this.tasks[taskId].traceCurrent;
    },
    getTraceDesired(taskId) {
        return this.tasks[taskId].traceDesired;
    },
    getTraceDiff(taskId) {
        return this.tasks[taskId].traceDiff;
    },
    hasTrace() {
        return true;
    }
};
