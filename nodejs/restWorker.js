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
     * @param {function} success - Callback to indicate successful startup completed.
     * @param {function} error - Callback to indicate startup completed failure.
     * @param {object} nullState - State loaded from rest storage. Except it is null.
     * @param {string} errorMsg - Error message from upstream.
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

                this.state = state || {};
                this.state.doState = new State(this.state.doState);

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
     * @param {object} restOperation - The restOperation containing request info.
     */
    onGet(restOperation) {
        this.loadState(null, (err, state) => {
            if (err) {
                this.logger.warning(`error loading state: ${err.message}`);
                restOperation.fail(err);
                return;
            }
            const doState = new State(state.doState);
            restOperation.setBody(doState);
            sendResponse.call(this, restOperation);
        });
    }

    /**
     * Handles Post requests.
     *
     * @param {object} restOperation
     */
    onPost(restOperation) {
        logger.finest('Got onboarding request.');
        const declaration = Object.assign({}, restOperation.getBody());
        const validation = this.validator.validate(declaration);
        this.state.doState = new State(declaration);

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

            const bigIp = new BigIp({ logger });
            const declarationHandler = new DeclarationHandler(bigIp);

            if (declaration.async) {
                sendResponse.call(this, restOperation);
            }

            initializeBigIp(bigIp)
                .then(() => {
                    return getAndSaveCurrentConfig.call(this, bigIp);
                })
                .then(() => {
                    return declarationHandler.process(declaration, this.state.doState.currentConfig);
                })
                .then(() => {
                    logger.fine('Onboard configuration complete. Checking for reboot.');
                    return bigIp.rebootRequired();
                })
                .then((needsReboot) => {
                    rebootRequired = needsReboot;
                    if (!rebootRequired) {
                        logger.fine('No reboot required');
                        return getAndSaveCurrentConfig.call(this, bigIp);
                    }

                    logger.fine('Reboot required. Rebooting.');
                    this.state.doState.updateResult(202, STATUS.STATUS_REBOOTING, 'reboot required');
                    return save.call(this);
                })
                .then(() => {
                    if (!rebootRequired) {
                        logger.fine('Onboard complete.');
                        this.state.doState.updateResult(200, STATUS.STATUS_OK, 'success');
                    }
                })
                .catch((err) => {
                    logger.severe(`Error onboarding: ${err.message}`);
                    const deconCode = err.code === 400 ? 422 : 500;
                    this.state.doState.updateResult(
                        deconCode,
                        STATUS.STATUS_ERROR,
                        'invalid config',
                        err.message
                    );
                    logger.info('Rolling back configuration');
                    return save.call(this)
                        .then(() => {
                            return declarationHandler.process(this.state.doState.currentConfig, declaration);
                        });
                })
                .finally(() => {
                    if (!declaration.async) {
                        logger.fine('Sending response.');
                        sendResponse.call(this, restOperation);
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
     * This is called by WOKER_URI/example.
     *
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
}

function initializeBigIp(bigIp) {
    return cloudUtil.runTmshCommand('list sys httpd ssl-port')
        .then((response) => {
            const regex = /(\s+ssl-port\s+)(\S+)\s+/;
            const port = regex.exec(response)[2];
            return bigIp.init(
                'localhost',
                'admin',
                'admin',
                {
                    port,
                    product: 'BIG-IP'
                }
            );
        });
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

/**
 * Sends a response for a restOperation.
 *
 * @param {object} restOperation - The restOperation to send the response for.
 * @param {number} code - The HTTP status code.
 */
function sendResponse(restOperation) {
    /* jshint validthis: true */
    restOperation.setStatusCode(this.state.doState.code);
    restOperation.setBody(new Response(this.state.doState));
    restOperation.complete();
}

module.exports = RestWorker;
