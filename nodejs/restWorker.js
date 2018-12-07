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
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const doUtil = require('./doUtil');
const ConfigManager = require('./configManager');
const DeclarationHandler = require('./declarationHandler');
const Logger = require('./logger');
const Response = require('./response');
const State = require('./state');
const Validator = require('./validator');

const STATUS = require('./sharedConstants').STATUS;

const logger = new Logger(module);

/**
 * API handler
 *
 * @class
 */
class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/declarative-onboarding';
        this.isPublic = true;
    }

    /**
     * Called by LX framework when rest worker is initialized.
     *
     * @param {function} success - Callback to indicate successful startup.
     * @param {function} error - Callback to indicate startup failure.
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
     * Called by LX framework when rest worker is loaded.
     *
     * @param {Function} success - Callback to indicate successful startup completed.
     * @param {Function} error - Callback to indicate startup completed failure.
     * @param {Object} nullState - State loaded from rest storage. Except it is null.
     * @param {String} errorMsg - Error message from upstream.
     */
    onStartCompleted(success, error, nullState, errorMsg) {
        if (errorMsg) {
            const message = `error loading state on start: ${errorMsg}`;
            error(message);
            return;
        }

        // The framework is supposed to pass in our state, but does not.
        load.call(this)
            .then(() => {
                if (this.state.doState.status === STATUS.STATUS_REBOOTING) {
                    // If we were rebooting and are now in this function, all should be well
                    this.state.doState.updateResult(200, STATUS.STATUS_OK, 'success');
                    save.call(this)
                        .then(() => {
                            logger.fine('Rebooting complete. Onboarding complete.');
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
            })
            .catch((err) => {
                const message = `error creating state: ${err.message}`;
                logger.severe(message);
                error(message);
            });
    }

    /**
     * Handles Get requests.
     *
     * For query options see {@link Response}
     *
     * @param {Object} restOperation - The restOperation containing request info.
     */
    onGet(restOperation) {
        sendResponse.call(this, restOperation);
    }

    /**
     * Handles Post requests.
     *
     * @param {Object} restOperation
     */
    onPost(restOperation) {
        logger.finest('Got onboarding request.');
        const declaration = Object.assign({}, restOperation.getBody());
        const validation = this.validator.validate(declaration);
        this.state.doState.declaration = declaration;
        this.state.doState.errors = null;

        let rebootRequired = false;

        if (!validation.isValid) {
            const message = `Bad declaration: ${JSON.stringify(validation.errors)}`;
            logger.info(message);
            this.state.doState.updateResult(400, STATUS.STATUS_ERROR, 'bad declaration', validation.errors);
            save.call(this)
                .then(() => {
                    sendResponse.call(this, restOperation);
                });
        } else {
            logger.fine('Onboard starting.');
            this.state.doState.updateResult(202, STATUS.STATUS_RUNNING, 'processing');
            save.call(this);

            if (declaration.async) {
                sendResponse.call(this, restOperation);
            }

            doUtil.getBigIp(logger)
                .then((bigIp) => {
                    this.bigIp = bigIp;
                    this.declarationHandler = new DeclarationHandler(this.bigIp);
                    logger.fine('Getting and saving current configuration');
                    return getAndSaveCurrentConfig.call(this, this.bigIp);
                })
                .then(() => {
                    return this.declarationHandler.process(declaration, this.state.doState);
                })
                .then(() => {
                    logger.fine('Saving sys config.');
                    return this.bigIp.save();
                })
                .then(() => {
                    logger.fine('Onboard configuration complete. Checking for reboot.');
                    return this.bigIp.rebootRequired();
                })
                .then((needsReboot) => {
                    rebootRequired = needsReboot;
                    if (!rebootRequired) {
                        logger.fine('No reboot required');
                        this.state.doState.updateResult(200, STATUS.STATUS_OK, 'success');
                    } else {
                        logger.fine('Reboot required. Rebooting.');
                        this.state.doState.updateResult(202, STATUS.STATUS_REBOOTING, 'reboot required');
                    }
                    logger.fine('Getting and saving current configuration');
                    return getAndSaveCurrentConfig.call(this, this.bigIp);
                })
                .then(() => {
                    if (!rebootRequired) {
                        logger.fine('Onboard complete.');
                    }
                    return Promise.resolve();
                })
                .catch((err) => {
                    logger.severe(`Error onboarding: ${err.message}`);
                    logger.info('Rolling back configuration');
                    const deconCode = err.code === 400 ? 422 : 500;
                    this.state.doState.updateResult(
                        deconCode,
                        STATUS.STATUS_ROLLING_BACK,
                        'invalid config - rolling back',
                        err.message
                    );
                    return save.call(this)
                        .then(() => {
                            const rollbackTo = {};
                            Object.assign(rollbackTo, this.state.doState.currentConfig);
                            return getAndSaveCurrentConfig.call(this, this.bigIp)
                                .then(() => {
                                    return this.declarationHandler.process(rollbackTo, this.state.doState);
                                })
                                .then(() => {
                                    this.state.doState.status = STATUS.STATUS_ERROR;
                                    this.state.doState.message = 'invalid config - rolled back';
                                    return save.call(this);
                                })
                                .catch((rollbackError) => {
                                    logger.severe(`Error rolling back: ${rollbackError.message}`);
                                    return Promise.reject(rollbackError);
                                });
                        });
                })
                .catch((err) => {
                    logger.severe(`Error rolling back configuration: ${err.message}`);
                    const deconCode = 500;
                    this.state.doState.updateResult(
                        deconCode,
                        STATUS.STATUS_ERROR,
                        'rollback failed',
                        err.message
                    );
                })
                .then(() => {
                    if (!declaration.async) {
                        logger.fine('Sending response.');
                        sendResponse.call(this, restOperation);
                    }
                    if (rebootRequired) {
                        this.bigIp.reboot();
                    }
                });
        }
    }

    /**
     * Returns an exmple of a valid declaration.
     *
     * This is called by WOKER_URI/example.
     *
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
}

function getAndSaveCurrentConfig(bigIp) {
    const configManager = new ConfigManager(`${__dirname}/configItems.json`, bigIp);
    return configManager.get()
        .then((currentConfig) => {
            this.state.doState.currentConfig = currentConfig;

            // Also save an original config which we will use for putting
            // objects back to their defaults
            if (!this.state.doState.originalConfig) {
                this.state.doState.originalConfig = currentConfig;
            }
            return save.call(this);
        });
}

/**
 * Saves current state.
 */
function save() {
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

function load() {
    return new Promise((resolve, reject) => {
        this.loadState(null, (err, state) => {
            if (err) {
                const message = `error loading state: ${err.message}`;
                logger.warning(message);
                reject(err);
            }

            this.state = state || {};

            // This gives us our state methods, rather than just the data
            this.state.doState = new State(this.state.doState);
            resolve();
        });
    });
}

/**
 * Sends a response for a restOperation.
 *
 * @param {Object} restOperation - The restOperation to send the response for.
 * @param {Number} code - The HTTP status code.
 */
function sendResponse(restOperation) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */
    const doState = new State(this.state.doState);
    restOperation.setStatusCode(doState.code);
    restOperation.setBody(new Response(doState, restOperation.getUri().query));
    restOperation.complete();
}

module.exports = RestWorker;
