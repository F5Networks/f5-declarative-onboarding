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
const Logger = require('./logger');
const Validator = require('./validator');
const DeclarationHandler = require('./declarationHandler');
const State = require('./state');
const response = require('./response');

const logger = new Logger(module);

const STATUS_OK = 'OK';
const STATUS_ERROR = 'ERROR';
const STATUS_RUNNING = 'RUNNING';

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
            logger.severe('Error creating declarative onboarding worker', err);
            error();
        }
    }

    /**
     * Handles Get requests.
     *
     * @public
     * @param {object} restOperation
     * @returns {void}
     */
    onGet(restOperation) {
        restOperation.setBody(this.state);
        this.sendResponse(restOperation);
    }

    /**
     * Handles Post requests.
     *
     * @public
     * @param {object} restOperation
     * @returns {void}
     */
    onPost(restOperation) {
        const declaration = Object.assign({}, restOperation.getBody());
        const validation = this.validator.validate(declaration);
        this.state = new State(declaration);

        if (!validation.isValid) {
            const message = `Bad declaration: ${JSON.stringify(validation.errors)}`;
            this.state.updateState(STATUS_ERROR, message);
            logger.info(message);
            this.sendResponse(restOperation, 400);
        } else {
            this.state.updateState(STATUS_RUNNING);
            const declarationHandler = new DeclarationHandler(declaration);
            declarationHandler.process()
                .then(() => {
                    logger.debug('Declaration processing complete');
                    this.state.updateState(STATUS_OK);
                    this.sendResponse(restOperation, 200);
                })
                .catch((err) => {
                    this.state.updateState(STATUS_ERROR, err.message);
                    this.sendResponse(restOperation, 500);
                });
        }
    }

    /**
     * Returns an exmple of a valid declaration.
     *
     * This is called by WOKER_URI/example
     *
     * @public
     * @returns {object} An example of a valid declaration.
     */
    /* eslint-disable class-methods-use-this */
    getExampleState() {
        let exampleResponse;

        try {
            const example = `${__dirname}/../examples/basic.json`;
            exampleResponse = JSON.parse(fs.readFileSync(example).toString());
        } catch (err) {
            logger.warning(`Error reading example file: ${err}`);
            exampleResponse = {
                message: 'no example available'
            };
        }
        return exampleResponse;
    }
    /* eslint-enable class-methods-use-this */

    /**
     * Sends a response for a restOperation
     *
     * @private
     * @param {object} restOperation - The restOperation to send the response for
     * @param {number} code - The HTTP status code
     */
    sendResponse(restOperation, code) {
        restOperation.setStatusCode(code);
        restOperation.setBody(response.getResponseBody(this.state));
        this.completeRestOperation(restOperation);
    }
}

module.exports = RestWorker;
