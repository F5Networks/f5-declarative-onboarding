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
const response = require('./response');

const logger = new Logger(module);

const STATUS_OK = 'OK';
const STATUS_ERROR = 'ERROR';

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
        const isValid = this.validator.isValid(declaration);
        this.state = declaration;

        if (!isValid.valid) {
            const message = `Bad declaration: ${JSON.stringify(isValid.errors)}`;
            this.updateState(STATUS_ERROR, message);
            logger.info(message);
            this.sendResponse(restOperation, 400);
        } else {
            const declarationHandler = new DeclarationHandler(declaration);
            declarationHandler.process()
                .then(() => {
                    logger.debug('Declaration processing complete');
                    this.updateState(STATUS_OK);
                    this.sendResponse(restOperation, 200);
                })
                .catch((err) => {
                    this.updateState(STATUS_ERROR, err.message);
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
     * @returns {Object} An example of a valid declaration.
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
     * @param {Object} restOperation - The restOperation to send the response for
     * @param {Number} code - The HTTP status code
     */
    sendResponse(restOperation, code) {
        restOperation.setStatusCode(code);
        restOperation.setBody(response.getResponseBody(this.state));
        this.completeRestOperation(restOperation);
    }

    /**
     * Updates the current persisted state
     *
     * @private
     * @param {String} status - The f5-decon status code
     * @param {String} message - The user friendly message if there is one. This should
     *                           be the error message if the code does not indicate success.
     */
    updateState(status, message) {
        this.state.status = {
            message,
            code: status
        };
    }
}

module.exports = RestWorker;
