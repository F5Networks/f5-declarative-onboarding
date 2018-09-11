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

const fs = require('fs');
const Ajv = require('ajv');
const Logger = require('f5-logger');

class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/decon';
        this.isPublic = true;
        this.logger = Logger.getInstance();
    }

    /**
     * Called by LX framework when rest worker is initialized.
     *
     * @public
     * @param {function} success - callback to indicate successful startup
     * @param {function} error - callback to indicate startup failure
     * @returns {undefined}
     */
    onStart(success, error) {
        try {
            const ajv = new Ajv({ allErrors: true });
            const baseSchema = JSON.parse(fs.readFileSync('../../schema/base.schema.json').toString());
            const systemSchema = JSON.parse(fs.readFileSync('../../schema/system.schema.json').toString());
            const networkSchema = JSON.parse(fs.readFileSync('../../schema/network.schema.json').toString());

            this.state = {};

            this.validate = ajv
                .addSchema(systemSchema)
                .addSchema(networkSchema)
                .compile(baseSchema);
        } catch (err) {
            this.logger.severe('Error creating declarative onboarding worker', err);
            error();
        }
        this.logger.info('Created Declarative onboarding worker');
        success();
    }

    /**
     * Handles Get requests
     * @param {object} restOperation
     * @returns {void}
     */
    onGet(restOperation) {
        const path = restOperation.getUri().pathname.split('/');
        const urlpath = restOperation.getUri().href;

        this.logger.info(`path: ${path}`);
        this.logger.info(`urlPath: ${urlpath}`);
        restOperation.setBody(this.state);
        this.completeRestOperation(restOperation);
    }


    /**
     * Handles Post requests.
     * @param {object} restOperation
     * @returns {void}
     */
    onPost(restOperation) {
        this.state = restOperation.getBody();
        restOperation.setBody(this.state);
        this.completeRestOperation(restOperation);
    }
}

module.exports = RestWorker;
