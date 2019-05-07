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
const EventEmitter = require('events');
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const doUtil = require('./doUtil');
const cryptoUtil = require('./cryptoUtil');
const ConfigManager = require('./configManager');
const DeclarationHandler = require('./declarationHandler');
const Logger = require('./logger');
const Response = require('./response');
const State = require('./state');
const Validator = require('./validator');

const STATUS = require('./sharedConstants').STATUS;
const EVENTS = require('./sharedConstants').EVENTS;

const logger = new Logger(module);

const BIG_IP_ENCRYPTION_ID = 'doBigIp';
const BIG_IQ_ENCRYPTION_ID = 'doBigIq';

/**
 * API handler
 *
 * @class
 */
class RestWorker {
    constructor() {
        this.WORKER_URI_PATH = 'shared/declarative-onboarding';
        this.isPublic = true;

        this.eventEmitter = new EventEmitter();
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

        // If this device's license is going to be revoked, services will
        // restart and we need to know that's what happened when this worker is restarted.
        this.eventEmitter.on(EVENTS.DO_LICENSE_REVOKED, (bigIpPassword, bigIqPassword) => {
            if (this.platform === PRODUCTS.BIGIP) {
                // if we need to relicense after we restart, so store passwords
                cryptoUtil.encryptValue(bigIpPassword, BIG_IP_ENCRYPTION_ID);
                cryptoUtil.encryptValue(bigIqPassword, BIG_IQ_ENCRYPTION_ID);

                this.state.doState.updateResult(202, STATUS.STATUS_REVOKING, 'revoking license');
                save.call(this);
            }
        });

        // The framework is supposed to pass in our state, but does not.
        load.call(this)
            .then(() => {
                switch (this.state.doState.status) {
                case STATUS.STATUS_REBOOTING:
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
                    break;
                case STATUS.STATUS_REVOKING:
                    // If our status is REVOKING, restnoded was just restarted
                    // and we need to finish processing the declaration.
                    // This should only be the case when we are running on a BIG-IP.

                    // call success then start onboarding
                    setImmediate(success);
                    setImmediate(() => {
                        // In this case, we should be running locally on a BIG-IP since
                        // revoking the BIG-IP license will not restart our restnoded in
                        // other environments (ASG, for example)
                        logger.fine('Onboard resuming.');
                        this.state.doState.updateResult(202, STATUS.STATUS_RUNNING, 'processing');
                        save.call(this);

                        // Make sure we don't try to revoke again and if we need to relicense,
                        // fill in the BIG-IQ and BIG-IP passwords
                        const declaration = Object.assign({}, this.state.doState.declaration);
                        const deletePromises = [];
                        let licenseName;
                        let hasBigIpUser = false;
                        let hasBigIqUser = false;

                        Object.keys(declaration.Common).forEach((key) => {
                            if (declaration.Common[key].class === 'License') {
                                licenseName = key;
                                delete declaration.Common[licenseName].revokeFrom;

                                if (declaration.Common[licenseName].bigIpUsername) {
                                    hasBigIpUser = true;
                                }
                                if (declaration.Common[licenseName].bigIqUsername) {
                                    hasBigIqUser = true;
                                }
                            }
                        });

                        Promise.resolve()
                            .then(() => {
                                if (hasBigIpUser) {
                                    return cryptoUtil.decryptId(BIG_IP_ENCRYPTION_ID);
                                }
                                return Promise.resolve();
                            })
                            .then((password) => {
                                if (password) {
                                    declaration.Common[licenseName].bigIpPassword = password;
                                    deletePromises.push(cryptoUtil.deleteEncryptedId(BIG_IP_ENCRYPTION_ID));
                                }
                                if (hasBigIqUser) {
                                    return cryptoUtil.decryptId(BIG_IQ_ENCRYPTION_ID);
                                }
                                return Promise.resolve();
                            })
                            .then((password) => {
                                if (password) {
                                    declaration.Common[licenseName].bigIqPassword = password;
                                    deletePromises.push(cryptoUtil.deleteEncryptedId(BIG_IQ_ENCRYPTION_ID));
                                }
                                return Promise.all(deletePromises);
                            })
                            .then(() => {
                                return onboard.call(this, declaration, {});
                            })
                            .then(() => {
                                logger.fine('Onboard configuration complete. Saving sys config.');
                                return this.bigIp.save();
                            })
                            .then(() => {
                                return setPostOnboardStatus.call(this, this.bigIp, declaration);
                            })
                            .then(() => {
                                return rebootIfRequired.call(this, this.bigIp);
                            })
                            .then(() => {
                                logger.fine('Onboard complete.');
                            })
                            .catch((err) => {
                                logger.severe(`Error during onboarding: ${err.message}`);
                                this.state.doState.updateResult(
                                    500,
                                    STATUS.STATUS_ERROR,
                                    'failed',
                                    err.message
                                );
                            });
                    });

                    break;
                default:
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

        const contentType = restOperation.getContentType() || '';
        let body = restOperation.getBody();
        if (contentType.toLowerCase() !== 'application/json') {
            try {
                body = JSON.parse(body);
            } catch (err) {
                const message = 'Unable to parse request body. Should be JSON format.';
                logger.info(message);
                this.state.doState.declaration = {};
                this.state.doState.errors = null;
                this.state.doState.updateResult(400, STATUS.STATUS_ERROR, 'bad declaration', message);
                sendResponse.call(this, restOperation);
                return;
            }
        }

        // Set the declaration to the base request (no remote info)
        // and the wrapper to a remote request
        let declaration = Object.assign({}, body);
        let wrapper;
        if (declaration.class !== 'DO') {
            wrapper = {
                declaration,
                class: 'DO'
            };
        } else {
            wrapper = declaration;
            declaration = wrapper.declaration;
        }

        const validation = this.validator.validate(wrapper);
        this.state.doState.declaration = declaration;
        this.state.doState.errors = null;

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

            // Fill in anything in the wrapper that is a json-pointer
            const bigIpOptions = doUtil.dereference(
                wrapper,
                {
                    host: wrapper.targetHost,
                    port: wrapper.targetPort,
                    user: wrapper.targetUsername,
                    password: wrapper.targetPassphrase
                }
            );

            const targetTokens = wrapper.targetTokens || {};
            Object.keys(targetTokens).forEach((key) => {
                if (key.toLowerCase() === 'x-f5-auth-token') {
                    bigIpOptions.authToken = targetTokens[key];
                }
            });

            onboard.call(this, declaration, bigIpOptions)
                .then(() => {
                    logger.fine('Onboard configuration complete. Saving sys config.');
                    return this.bigIp.save();
                })
                .then(() => {
                    return setPostOnboardStatus.call(this, this.bigIp, declaration);
                })
                .then(() => {
                    if (!declaration.async) {
                        logger.fine('Sending response.');
                        sendResponse.call(this, restOperation);
                    }
                    return rebootIfRequired.call(this, this.bigIp);
                })
                .then(() => {
                    logger.fine('Onboard complete.');
                })
                .catch((err) => {
                    logger.severe(`Error during onboarding: ${err.message}`);
                    this.state.doState.updateResult(
                        500,
                        STATUS.STATUS_ERROR,
                        'failed',
                        err.message
                    );
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
            const example = `${__dirname}/../examples/onboard.json`;
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

function onboard(declaration, bigIpOptions) {
    return doUtil.getBigIp(logger, bigIpOptions)
        .then((bigIp) => {
            this.bigIp = bigIp;
            this.declarationHandler = new DeclarationHandler(this.bigIp, this.eventEmitter);
            logger.fine('Determining platform');
            return doUtil.getCurrentPlatform(bigIpOptions);
        })
        .then((platform) => {
            logger.fine('Running in a', platform);
            this.platform = platform;

            logger.fine('Getting and saving current configuration');
            return getAndSaveCurrentConfig.call(this, this.bigIp, declaration);
        })
        .then(() => {
            return this.declarationHandler.process(declaration, this.state.doState);
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
                    return getAndSaveCurrentConfig.call(this, this.bigIp, declaration)
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
            this.state.doState.updateResult(
                500,
                STATUS.STATUS_ERROR,
                'rollback failed',
                err.message
            );
        })
        .then(() => {
            return Promise.resolve();
        });
}

function setPostOnboardStatus(bigIp, declaration) {
    let promise = Promise.resolve();
    // Don't overwrite the error state if it's there
    if (this.state.doState.status !== STATUS.STATUS_ERROR) {
        promise = promise.then(() => {
            return doUtil.rebootRequired(bigIp)
                .then((rebootRequired) => {
                    if (!rebootRequired) {
                        logger.fine('No reboot required');
                        this.state.doState.updateResult(200, STATUS.STATUS_OK, 'success');
                    } else {
                        logger.fine('Reboot required.');
                        this.state.doState.updateResult(202, STATUS.STATUS_REBOOTING, 'reboot required');
                    }
                    return Promise.resolve();
                });
        });
    }

    return promise
        .then(() => {
            logger.fine('Getting and saving current configuration');
            return getAndSaveCurrentConfig.call(this, bigIp, declaration);
        });
}

function rebootIfRequired(bigIp) {
    return doUtil.rebootRequired(bigIp)
        .then((rebootRequired) => {
            if (rebootRequired) {
                logger.info('Reboot required. Rebooting...');
                bigIp.reboot();
            } else {
                logger.fine('No reboot required.');
            }
        });
}

function getAndSaveCurrentConfig(bigIp, declaration) {
    const configManager = new ConfigManager(`${__dirname}/configItems.json`, bigIp);
    return configManager.get(declaration, this.state.doState)
        .then(() => {
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
    restOperation.setContentType('application/json');
    restOperation.setStatusCode(doState.code);
    restOperation.setBody(new Response(doState, restOperation.getUri().query));
    restOperation.complete();
}

module.exports = RestWorker;
