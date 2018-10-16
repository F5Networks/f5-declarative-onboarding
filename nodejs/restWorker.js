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
const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');
const Validator = require('./validator');
const DeclarationHandler = require('./declarationHandler');
const State = require('./state');
const STATUS = require('./sharedConstants').STATUS;

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
     * @param {*} nullState - State loaded from rest storage. Except it is null.
     * @param {*} errorMsg - Error message from upstream.
     */
    onStartCompleted(success, error, nullState, errorMsg) {
        if (errorMsg) {
            const message = `error loading state on start: ${errorMsg}`;
            error(message);
            return;
        }

        try {
            // The framework is supposed to pass in our state, but does not.
            this.loadState(null, (err, state) => {
                if (err) {
                    const message = `error loading state: ${err.message}`;
                    this.logger.warning(message);
                    error(message);
                    return;
                }

                this.state = new State(state);

                if (this.state.status === STATUS.STATUS_REBOOTING) {
                    // If we were rebooting and are now in this function, all should be well
                    this.state.updateResult(200, STATUS.STATUS_OK);
                    this.save()
                        .then(() => {
                            logger.fine('Reboot complete.');
                            success();
                        })
                        .catch((saveErr) => {
                            const message = `error saving state after reboot: ${saveErr.message}`;
                            logger.severe(message);
                            error(message);
                        });
                } else {
                    success();
                }
            });
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
                this.logger.warning(`error loading state: ${err.message}`);
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

        let rebootRequired = false;

        if (!validation.isValid) {
            const message = `Bad declaration: ${JSON.stringify(validation.errors)}`;
            logger.info(message);
            this.state.updateResult(400, STATUS.STATUS_ERROR, message);
            this.save()
                .then(() => {
                    this.sendResponse(restOperation);
                });
        } else {
            this.state.updateResult(202, STATUS.STATUS_RUNNING);
            this.save();

            const bigIp = new BigIp({ logger });
            const declarationHandler = new DeclarationHandler(declaration, bigIp);

            if (declaration.async) {
                this.sendResponse(restOperation);
            }

            declarationHandler.process()
                .then(() => {
                    return bigIp.rebootRequired();
                })
                .then((needsReboot) => {
                    rebootRequired = needsReboot;
                    if (!rebootRequired) {
                        logger.debug('Declaration processing complete.');
                        this.state.updateResult(200, STATUS.STATUS_OK);
                    } else {
                        logger.debug('Declaration processing complete. Rebooting.');
                        this.state.updateResult(200, STATUS.STATUS_REBOOTING);
                    }
                    return this.save();
                })
                .catch((err) => {
                    this.state.updateResult(500, STATUS.STATUS_ERROR, err.message);
                    return this.save();
                })
                .finally(() => {
                    if (!declaration.async) {
                        this.sendResponse(restOperation);
                    }
                    if (rebootRequired) {
                        bigIp.reboot();
                    }
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
        function retryFunc() {
            return new Promise((resolve, reject) => {
                this.saveState(null, this.state, (err) => {
                    if (err) {
                        reject();
                    }
                    resolve();
                });
            });
        }

        return new Promise((resolve, reject) => {
            const retryOptions = {};
            Object.assign(retryOptions, cloudUtil.QUICK_BUT_LONG_RETRY);
            retryOptions.continueOnError = true;

            cloudUtil.tryUntil(this, retryOptions, retryFunc)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    logger.warning(`Error saving state: ${err}`);
                    reject(err);
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
        restOperation.setStatusCode(this.state.code);
        restOperation.setBody(this.state);
        this.completeRestOperation(restOperation);
    }
}

module.exports = RestWorker;
