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

const querystring = require('querystring');

const InspectHandler = require('./inspectHandler');
const BASE_URL = require('./sharedConstants').BASE_URL;
const ENDPOINTS = require('./sharedConstants').ENDPOINTS;

/**
 * Inspect Response Class
 *
 * @class
 *
 * @param {Object} queryParams - query params
 */
class InspectResponse {
    constructor(queryParams) {
        this.queryParams = queryParams || {};
        this.inspectHandler = new InspectHandler(this.queryParams);
    }

    getSelfLink() {
        const query = querystring.stringify(this.queryParams);
        return `${BASE_URL}/${ENDPOINTS.INSPECT}${query ? '?' : ''}${query}`;
    }

    exists() {
        return true;
    }

    getIds() {
        return [0];
    }

    getCode() {
        return this.inspectHandler.getCode();
    }

    getStatus() {
        return this.inspectHandler.getStatus();
    }

    getMessage() {
        return this.inspectHandler.getMessage();
    }

    getErrors() {
        return this.inspectHandler.getErrors();
    }

    getData() {
        return this.inspectHandler.process();
    }
}

module.exports = InspectResponse;
