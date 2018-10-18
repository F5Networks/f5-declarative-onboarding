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

                this.state = new State(state);

                if (this.state.status === STATUS.STATUS_REBOOTING) {
                    // If we were rebooting and are now in this function, all should be well
                    this.state.updateResult(200, STATUS.STATUS_OK);
                    this.save()
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
            this.state = new State(state);
            restOperation.setBody(this.state);
            this.sendResponse(restOperation);
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
            logger.fine('Onboard starting.');
            this.state.updateResult(202, STATUS.STATUS_RUNNING);
            this.save();

            const bigIp = new BigIp({ logger });
            const configManager = new ConfigManager(`${__dirname}/configItems.json`, bigIp);
            const declarationHandler = new DeclarationHandler(declaration, bigIp);

            if (declaration.async) {
                this.sendResponse(restOperation);
            }

            initializeBigIp(bigIp)
                .then(() => {
                    return configManager.get();
                })
                .then((currentConfig) => {
                    logger.info('current config', currentConfig);
                    return declarationHandler.process();
                })
                .then(() => {
                    logger.fine('Onboard configuration complete. Checking for reboot.');
                    return bigIp.rebootRequired();
                })
                .then((needsReboot) => {
                    rebootRequired = needsReboot;
                    if (!rebootRequired) {
                        logger.fine('Onboard complete. No reboot required.');
                        this.state.updateResult(200, STATUS.STATUS_OK);
                    } else {
                        logger.fine('Reboot required. Rebooting.');
                        this.state.updateResult(202, STATUS.STATUS_REBOOTING);
                    }
                    return this.save();
                })
                .catch((err) => {
                    logger.severe(`Error onboarding: ${err.message}`);
                    const deconCode = err.code === 400 ? 422 : 500;
                    this.state.updateResult(deconCode, STATUS.STATUS_ERROR, err.message);
                    return this.save();
                })
                .finally(() => {
                    if (!declaration.async) {
                        logger.fine('Sending response.');
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

    /**
     * Saves current state.
     */
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
     * Sends a response for a restOperation.
     *
     * @param {object} restOperation - The restOperation to send the response for.
     * @param {number} code - The HTTP status code.
     */
    sendResponse(restOperation) {
        restOperation.setStatusCode(this.state.code);
        if (this.state.code < 300) {
            restOperation.setBody(this.state);
        } else {
            // When the status code is an error, the rest framework sets
            // up the response differently. Fix that by overwriting here.
            restOperation.setBody(
                {
                    code: this.state.code,
                    status: this.state.status,
                    errors: this.state.errors,
                    declaration: this.state.declaration
                }
            );
        }
        restOperation.complete();
    }
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

module.exports = RestWorker;
