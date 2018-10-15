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
const sharedConstants = require('./sharedConstants');

const logger = new Logger(module);

class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/decon';
        this.isPublic = true;
    }

    /**
     * Called by LX framework when rest worker is initialized.
     *
     * @public
     * @param {function} success - Callback to indicate successful startup
     * @param {function} error - Callback to indicate startup failure
     * @returns {undefined}
     */
    onStart(success, error) {
        try {
            this.validator = new Validator();
            logger.info('Created Declarative onboarding worker');
            success();
        } catch (err) {
            const message = `Error creating declarative onboarding worker: ${err}`;
            logger.severe(message);
            error(message);
        }
    }

    /**
     *
     * @param {function} success - Callback to indicate successful startup completed.
     * @param {*} error - Callback to indicate startup completed failure.
     * @param {*} state - State loaded from rest storage.
     * @param {*} errorMsg - Error message from upstream.
     */
    onStartCompleted(success, error, state, errorMsg) {
        if (errorMsg) {
            const message = `error loading state on start: ${errorMsg}`;
            error(message);
            return;
        }

        try {
            this.state = new State(state);
            success();
        } catch (err) {
            const message = `error creating state: ${err.message}`;
            logger.severe(message);
            error(message);
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
        this.loadState(null, (err, state) => {
            if (err) {
                this.logger.warning('error loading state: %s', err.message);
                restOperation.fail(err);
                return;
            }
            this.state = new State(state);
            restOperation.setBody(this.state);
            this.sendResponse(restOperation);
        });
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
            logger.info(message);
            this.state.updateResult(400, sharedConstants.STATUS.STATUS_ERROR, message);
            this.sendResponse(restOperation);
        } else {
            this.state.updateResult(202, sharedConstants.STATUS.STATUS_RUNNING);
            const declarationHandler = new DeclarationHandler(declaration);
            declarationHandler.process()
                .then(() => {
                    logger.debug('Declaration processing complete');
                    this.state.updateResult(200, sharedConstants.STATUS.STATUS_OK);
                    this.save();
                })
                .then(() => {
                    this.sendResponse(restOperation);
                })
                .catch((err) => {
                    this.state.updateResult(500, sharedConstants.STATUS.STATUS_ERROR, err.message);
                    this.sendResponse(restOperation);
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

    save() {
        return new Promise((resolve, reject) => {
            this.saveState(null, this.state, (err) => {
                if (err) {
                    logger.warning(`Error saving state: ${err}`);
                    reject();
                }
                resolve();
            });
        });
    }

    /**
     * Sends a response for a restOperation
     *
     * @private
     * @param {object} restOperation - The restOperation to send the response for
     * @param {number} code - The HTTP status code
     */
    sendResponse(restOperation) {
        restOperation.setStatusCode(this.state.getCode());
        restOperation.setBody(this.state);
        this.completeRestOperation(restOperation);
    }
}

module.exports = RestWorker;
