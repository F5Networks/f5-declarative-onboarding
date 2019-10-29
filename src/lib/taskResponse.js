/**
 * Copyright 2019 F5 Networks, Inc.
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

const HTTP = require('http');

const BASE_URL = require('./sharedConstants').BASE_URL;
const ENDPOINTS = require('./sharedConstants').ENDPOINTS;

class TaskResponse {
    constructor(state, method) {
        this.state = state;
        this.method = method;
    }

    // can't be a static method because the caller does not know the class type
    getSelfLink(id) {
        return `${BASE_URL}/${ENDPOINTS.TASK}/${id}`;
    }

    exists(id) {
        return !!this.state.getTask(id);
    }

    getIds() {
        return this.state.getTaskIds();
    }

    getCode(id) {
        return this.state.getCode(id);
    }

    getStatus(id) {
        return this.state.getStatus(id);
    }

    getMessage(id) {
        return this.state.getMessage(id);
    }

    getErrors(id) {
        return this.state.getErrors(id);
    }

    getData(id, options) {
        if (!this.exists(id)) {
            return { httpStatus: 404 };
        }

        const data = {
            declaration: this.state.getDeclaration(id)
        };

        if (HTTP.METHODS.indexOf(this.method) > -1) {
            data.httpStatus = 200;
        }

        if (options && options.show && options.show === 'full') {
            data.currentConfig = this.state.getCurrentConfig(id);
            data.originalConfig = this.state.getOriginalConfigByTaskId(id);
            data.lastUpdate = this.state.getLastUpdate(id);
        }
        return data;
    }
}

module.exports = TaskResponse;
