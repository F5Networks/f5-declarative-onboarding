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

const logger = require('./logger');
const Validator = require('./validator');

class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/decon';
        this.isPublic = true;
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
            this.state = {};
            this.validator = new Validator();
            logger.info('Created Declarative onboarding worker');
            success();
        } catch (err) {
            logger.error('Error creating declarative onboarding worker', err);
            error();
        }
    }

    /**
     * Handles Get requests
     * @param {object} restOperation
     * @returns {void}
     */
    onGet(restOperation) {
        restOperation.setBody(this.state);
        this.completeRestOperation(restOperation);
    }

    /**
     * Handles Post requests.
     * @param {object} restOperation
     * @returns {void}
     */
    onPost(restOperation) {
        const declaration = restOperation.getBody();
        const isValid = this.validator.isValid(declaration);
        if (!isValid.valid) {
            const message = `Bad declaration: ${JSON.stringify(isValid.errors)}`;
            logger.info(message);
            restOperation.setStatusCode(400);
            restOperation.setBody({ message });
        } else {
            this.state = declaration;
            restOperation.setBody(this.state);
        }

        this.completeRestOperation(restOperation);
    }
}

module.exports = RestWorker;
