/**
 * Copyright 2018-2019 F5 Networks, Inc.
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
const httpUtil = require('@f5devcentral/f5-cloud-libs').httpUtil;
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const doUtil = require('../lib/doUtil');
const cryptoUtil = require('../lib/cryptoUtil');
const ConfigManager = require('../lib/configManager');
const DeclarationHandler = require('../lib/declarationHandler');
const Logger = require('../lib/logger');
const Response = require('../lib/response');
const ConfigResponse = require('../lib/configResponse');
const InfoResponse = require('../lib/infoResponse');
const InspectResponse = require('../lib/inspectResponse');
const TaskResponse = require('../lib/taskResponse');
const State = require('../lib/state');
const SshUtil = require('../lib/sshUtil');
const Validator = require('../lib/validator');

const STATUS = require('../lib/sharedConstants').STATUS;
const EVENTS = require('../lib/sharedConstants').EVENTS;
const ENDPOINTS = require('../lib/sharedConstants').ENDPOINTS;

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
        this.isPassThrough = true;
        this.eventEmitter = new EventEmitter();
        this.bigIps = {}; // map of task ID -> big IP
    }

    /**
     * Called by LX framework when rest worker is initialized.
     *
     * @param {function} success - Callback to indicate successful startup.
     * @param {function} error - Callback to indicate startup failure.
     */
    onStart(success, error) {
        try {
            const deviceInfo = this.restHelper.makeRestjavadUri(
                '/shared/identified-devices/config/device-info'
            );
            this.dependencies.push(deviceInfo);

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
        this.eventEmitter.on(EVENTS.DO_LICENSE_REVOKED, (taskId, bigIpPassword, bigIqPassword) => {
            doUtil.getCurrentPlatform()
                .then((platform) => {
                    if (platform === PRODUCTS.BIGIP) {
                        // if we need to relicense after we restart, so store passwords
                        cryptoUtil.encryptValue(bigIpPassword, BIG_IP_ENCRYPTION_ID);
                        cryptoUtil.encryptValue(bigIqPassword, BIG_IQ_ENCRYPTION_ID);

                        this.state.doState.updateResult(
                            taskId,
                            202,
                            STATUS.STATUS_REVOKING,
                            'revoking license'
                        );
                        save.call(this);
                    }
                })
                .catch((err) => {
                    logger.warning(`Error handling onStartCompleted: ${err.message}`);
                });
        });

        // The framework is supposed to pass in our state, but does not.
        load.call(this)
            .then(() => handleStartupState.call(this, success, error))
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
        const pathInfo = getPathInfo(restOperation.getUri());
        if (!pathInfo.path) {
            // Just a GET to our base URI - return most recent task for backwards compatibility
            sendResponse.call(this, restOperation, ENDPOINTS.TASK, this.state.doState.mostRecentTask);
        } else {
            sendResponse.call(this, restOperation, pathInfo.path, pathInfo.id);
        }
    }

    /**
     * Handles Post requests.
     *
     * @param {Object} restOperation
     */
    onPost(restOperation) {
        logger.finest('Got onboarding request.');

        const taskId = this.state.doState.addTask();

        const contentType = restOperation.getContentType() || '';
        let body = restOperation.getBody();
        let isFromTcw = false;
        let bigIpOptions;
        let platform;

        if (contentType.toLowerCase() !== 'application/json') {
            try {
                body = JSON.parse(body);
            } catch (err) {
                const message = 'Unable to parse request body. Should be JSON format.';
                logger.info(message);
                this.state.doState.setDeclaration(taskId, {});
                this.state.doState.setErrors(taskId, null);
                this.state.doState.updateResult(taskId, 400, STATUS.STATUS_ERROR, 'bad declaration', message);
                sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
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

        this.state.doState.setErrors(taskId, null);

        this.validator.validate(wrapper)
            .then((validation) => {
                this.state.doState.setDeclaration(taskId, declaration);
                if (!validation.isValid) {
                    const message = `Bad declaration: ${JSON.stringify(validation.errors)}`;
                    logger.info(message);
                    this.state.doState.updateResult(
                        taskId,
                        400,
                        STATUS.STATUS_ERROR,
                        'bad declaration',
                        validation.errors
                    );
                    save.call(this)
                        .then(() => {
                            sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                        });
                } else {
                    logger.fine(`Onboard starting for task ${taskId}`);
                    this.state.doState.updateResult(taskId, 202, STATUS.STATUS_RUNNING, 'processing');

                    // Get case insensitive query parameters
                    const query = restOperation.getUri().query;
                    const insensitiveQuery = {};
                    Object.keys(query).forEach((key) => {
                        insensitiveQuery[key.toLowerCase()] = query[key];
                    });

                    save.call(this)
                        .then(() => doUtil.getCurrentPlatform())
                        .then((currentPlatform) => {
                            platform = currentPlatform;

                            // Determine if this is an internal task (coming back to us
                            // from the TCW on BIG-IQ)
                            if (platform === PRODUCTS.BIGIQ && insensitiveQuery.internal) {
                                isFromTcw = true;
                            }

                            if (declaration.async) {
                                sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                            }

                            // Fill in anything in the wrapper that is a json-pointer
                            bigIpOptions = doUtil.dereference(
                                wrapper,
                                {
                                    host: wrapper.targetHost,
                                    port: wrapper.targetPort,
                                    user: wrapper.targetUsername,
                                    password: wrapper.targetPassphrase
                                }
                            );
                            wrapper.targetHost = bigIpOptions.host;
                            wrapper.targetPort = bigIpOptions.port;
                            wrapper.targetUsername = bigIpOptions.user;
                            wrapper.targetPassphrase = bigIpOptions.password;

                            return initialAccountSetup.call(this, wrapper);
                        })
                        .then((updatedPassword) => {
                            if (updatedPassword) {
                                wrapper.targetPassphrase = updatedPassword;
                                bigIpOptions.password = updatedPassword;
                                delete wrapper.targetSshKey;
                            }

                            // Determine if this is an internal task (coming back to us
                            // from the TCW on BIG-IQ)
                            if (platform === PRODUCTS.BIGIQ && !isFromTcw) {
                                logger.finest('Passing to TCW');
                                passToTcw.call(this, wrapper, taskId, restOperation)
                                    .then(tcwId => pollTcw.call(this, tcwId, taskId, restOperation))
                                    .then(() => {
                                        logger.finest('TCW is done');
                                        if (!declaration.async) {
                                            logger.fine('Sending response.');
                                            sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                                        }
                                    })
                                    .then(() => getAndSaveCurrentConfig.call(
                                        this,
                                        this.bigIps[taskId],
                                        declaration,
                                        taskId
                                    ))
                                    .catch((err) => {
                                        logger.info(`TCW task failed: ${err.message}`);
                                        return getAndSaveCurrentConfig.call(
                                            this,
                                            this.bigIps[taskId],
                                            declaration,
                                            taskId
                                        );
                                    });
                            } else {
                                const originalDoId = insensitiveQuery.externalid;
                                const targetTokens = wrapper.targetTokens || {};
                                Object.keys(targetTokens).forEach((key) => {
                                    if (key.toLowerCase() === 'x-f5-auth-token') {
                                        bigIpOptions.authToken = targetTokens[key];
                                    }
                                });

                                onboard.call(this, declaration, bigIpOptions, taskId, originalDoId)
                                    .then(() => {
                                        logger.fine('Onboard configuration complete. Saving sys config.');
                                        return this.bigIps[taskId].save();
                                    })
                                    .then(() => setPostOnboardStatus.call(
                                        this,
                                        this.bigIps[taskId],
                                        taskId,
                                        declaration
                                    ))
                                    .then(() => {
                                        if (!declaration.async) {
                                            logger.fine('Sending response.');
                                            sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                                        }
                                        return rebootIfRequired.call(this, this.bigIps[taskId], taskId);
                                    })
                                    .catch((err) => {
                                        logger.severe(`Error during onboarding: ${err.message}`);
                                        this.state.doState.updateResult(
                                            taskId,
                                            500,
                                            STATUS.STATUS_ERROR,
                                            'failed',
                                            err.message
                                        );
                                    })
                                    .then(() => {
                                        logger.fine('Onboard complete.');
                                        postWebhook.call(this, restOperation, ENDPOINTS.TASK, taskId,
                                            declaration.webhook);
                                    });
                            }
                        })
                        .catch((err) => {
                            this.state.doState.updateResult(
                                taskId,
                                500,
                                STATUS.STATUS_ERROR,
                                'error during onboarding',
                                err.message
                            );
                        });
                }
            });
    }

    onDelete(restOperation) {
        const pathInfo = getPathInfo(restOperation.getUri());
        if (pathInfo.path !== ENDPOINTS.CONFIG) {
            sendError(restOperation, 400, `DELETE is only supported for the ${ENDPOINTS.CONFIG} endpoint`);
        } else if (!pathInfo.id) {
            sendError(restOperation, 400, 'id must be specified for DELETE');
        } else if (this.state.doState.getOriginalConfigByConfigId(pathInfo.id)) {
            this.state.doState.deleteOriginalConfigByConfigId(pathInfo.id);
            save.call(this)
                .then(() => {
                    sendResponse.call(this, restOperation, ENDPOINTS.CONFIG);
                })
                .catch((err) => {
                    sendError(restOperation, 500, err.message);
                });
        } else {
            sendError(restOperation, 404, `${pathInfo.id} does not exist`);
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

function onboard(declaration, bigIpOptions, taskId, originalDoId) {
    let declarationHandler;

    return doUtil.getBigIp(logger, bigIpOptions)
        .then((bigIp) => {
            this.bigIps[taskId] = bigIp;

            // We store the bigIp object under the original ID so the polling
            // task knows which state to update. This is only sent by the TCW.
            if (originalDoId) {
                this.bigIps[originalDoId] = this.bigIps[taskId];
            }

            logger.fine('Getting and saving current configuration');
            return getAndSaveCurrentConfig.call(this, this.bigIps[taskId], declaration, taskId);
        })
        .then(() => {
            declarationHandler = new DeclarationHandler(this.bigIps[taskId], this.eventEmitter);
            return declarationHandler.process(declaration, this.state.doState.getTask(taskId));
        })
        .then(() => {
            logger.fine('Saving sys config.');
            return this.bigIps[taskId].save();
        })
        .then(() => {
            logger.fine('Onboard configuration complete. Checking for reboot.');
            return doUtil.rebootRequired(this.bigIps[taskId]);
        })
        .catch((err) => {
            logger.severe(`Error onboarding: ${err.message}`);
            logger.info('Rolling back configuration');
            this.state.doState.updateResult(
                taskId,
                202,
                STATUS.STATUS_ROLLING_BACK,
                'invalid config - rolling back',
                err.message
            );
            return save.call(this)
                .then(() => {
                    const rollbackTo = {};
                    Object.assign(rollbackTo, this.state.doState.getTask(taskId).currentConfig);
                    return getAndSaveCurrentConfig.call(this, this.bigIps[taskId], declaration, taskId)
                        .then(() => declarationHandler.process(
                            rollbackTo,
                            this.state.doState.getTask(taskId)
                        ))
                        .then(() => {
                            const deconCode = err.code === 400 ? 422 : (err.code || 500);
                            this.state.doState.updateResult(
                                taskId,
                                deconCode,
                                STATUS.STATUS_ERROR,
                                'invalid config - rolled back',
                                err.message
                            );
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
                taskId,
                500,
                STATUS.STATUS_ERROR,
                'rollback failed',
                err.message
            );
        })
        .then(() => Promise.resolve());
}

function setPostOnboardStatus(bigIp, taskId, declaration) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    let promise = Promise.resolve();
    // Don't overwrite the error state if it's there
    if (this.state.doState.getStatus(taskId) !== STATUS.STATUS_ERROR) {
        promise = promise.then(() => doUtil.rebootRequired(bigIp)
            .then((rebootRequired) => {
                if (!rebootRequired) {
                    logger.fine('No reboot required');
                    this.state.doState.updateResult(taskId, 200, STATUS.STATUS_OK, 'success');
                } else {
                    logger.fine('Reboot required.');
                    this.state.doState.updateResult(
                        taskId,
                        202,
                        STATUS.STATUS_REBOOTING,
                        'reboot required'
                    );
                }
                return Promise.resolve();
            }));
    }

    return promise
        .then(() => {
            logger.fine('Getting and saving current configuration');
            return getAndSaveCurrentConfig.call(this, bigIp, declaration, taskId);
        });
}

function rebootIfRequired(bigIp, taskId) {
    return new Promise((resolve, reject) => {
        doUtil.rebootRequired(bigIp)
            .then((rebootRequired) => {
                if (rebootRequired) {
                    logger.info('Reboot required. Rebooting...');
                    bigIp.reboot();

                    // If we're running on BIG-IP, recovering from reboot will be handled
                    // by the startup code (onStartCompleted). Otherwise, wait
                    // until the BIG-IP is ready again (after a slight delay to make sure
                    // the reboot has started).
                    doUtil.getCurrentPlatform()
                        .then((platform) => {
                            if (platform !== PRODUCTS.BIGIP) {
                                setTimeout(waitForRebootComplete, 10000, this, taskId, resolve, reject);
                            } else {
                                resolve();
                            }
                        });
                } else {
                    logger.fine('No reboot required.');
                    resolve();
                }
            });
    });
}

/**
 * Sends a task to the TCW for processing before DO does its work.
 *
 * @param {Object} wrapper - The wrapped declaration.
 * @param {String} taskId - ID of the external task created by DO.
 * @param {Object} incomingRestOp - RestOperation that created this task.
 *
 * @returns {Promise} A promise that is resolved with the ID of the TCW task to poll.
 */
function passToTcw(wrapper, taskId, incomingRestOp) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const restOperation = this.restOperationFactory.createRestOperationInstance()
        .setUri(this.restHelper.makeRestjavadUri('/cm/global/tasks/declarative-onboarding'))
        .setIsSetBasicAuthHeader(true)
        .setReferer(incomingRestOp.getUri().href)
        .setContentType('application/json')
        .setBody({
            id: taskId,
            declaration: wrapper
        });
    return this.restRequestSender.sendPost(restOperation)
        .then(response => response.getBody().id);
}

/**
 * Polls TCW until its task either finishes or fails.
 *
 * @param {String} tcwId - ID of the TCW task.
 * @param {String} taskId - ID of the external task created by DO.
 * @param {Object} incomingRestOp - RestOperation that created this task.
 *
 * @returns {Promise} A promise that is resolved when the TCW task either
 *                    finishes or fails.
 */
function pollTcw(tcwId, taskId, incomingRestOp) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const restOperation = this.restOperationFactory.createRestOperationInstance()
        .setUri(this.restHelper.makeRestjavadUri(`/cm/global/tasks/declarative-onboarding/${tcwId}`))
        .setIsSetBasicAuthHeader(true)
        .setReferer(incomingRestOp.getUri().href);

    const retryFunc = () => this.restRequestSender.sendGet(restOperation)
        .then((response) => {
            const body = response.getBody();
            if (body.status === 'FAILED' || body.status === 'FINISHED') {
                return Promise.resolve(body);
            }
            return Promise.reject();
        })
        .catch(() => Promise.reject());

    // retry interval:
    //   - this.retryInterval for testing
    //   - we want to poll for more than 30 minutes because that is the TCW -> DO timeout so DO should be longer
    return cloudUtil.tryUntil(
        this,
        { retryIntervalMs: this.retryInterval || 5000, maxRetries: 384 },
        retryFunc
    )
        .then((response) => {
            switch (response.status) {
            case 'FINISHED':
                this.state.doState.updateResult(taskId, 200, STATUS.STATUS_OK, 'success');
                break;
            case 'FAILED':
                this.state.doState.updateResult(
                    taskId,
                    422,
                    STATUS.STATUS_ERROR,
                    'failed',
                    response.errorMessage
                );
                break;
            default:
                this.state.updateResult(
                    taskId,
                    500,
                    STATUS.STATUS_ERROR,
                    'internal server error',
                    `unexpected status: ${response.status}`
                );
            }
            return Promise.resolve();
        })
        .catch(() => {
            const message = 'TCW task failed to finish or fail';
            logger.info(message);
            return Promise.reject(new Error(message));
        });
}
function getAndSaveCurrentConfig(bigIp, declaration, taskId) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const configManager = new ConfigManager(`${__dirname}/../lib/configItems.json`, bigIp);
    return configManager.get(declaration, this.state.doState.getTask(taskId), this.state.doState)
        .then(() => save.call(this));
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

function handleStartupState(success, error) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    doUtil.getCurrentPlatform()
        .then((platform) => {
            if (platform !== PRODUCTS.BIGIP) {
                success();
                return;
            }

            const currentTaskId = this.state.doState.mostRecentTask;
            if (!currentTaskId) {
                logger.info('Initial startup');
                success();
                return;
            }

            switch (this.state.doState.getStatus(currentTaskId)) {
            case STATUS.STATUS_REBOOTING:
                updateStateAfterReboot.call(this, currentTaskId, success, error);
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
                    this.state.doState.updateResult(currentTaskId, 202, STATUS.STATUS_RUNNING, 'processing');
                    save.call(this);

                    // Make sure we don't try to revoke again and if we need to relicense,
                    // fill in the BIG-IQ and BIG-IP passwords
                    const stateDecRef = this.state.doState.getDeclaration(currentTaskId);
                    const declaration = JSON.parse(JSON.stringify(stateDecRef));
                    const deletePromises = [];
                    let licenseName;
                    let hasBigIpUser = false;
                    let hasBigIqUser = false;

                    Object.keys(declaration.Common).forEach((key) => {
                        if (declaration.Common[key].class === 'License') {
                            licenseName = key;
                            delete declaration.Common[licenseName].revokeFrom;
                            // Remove revokeFrom from the stored state as well
                            delete stateDecRef.Common[licenseName].revokeFrom;

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
                        .then(() => onboard.call(this, declaration, {}, currentTaskId))
                        .then(() => {
                            logger.fine('Onboard configuration complete. Saving sys config.');
                            return this.bigIps[currentTaskId].save();
                        })
                        .then(() => setPostOnboardStatus.call(
                            this,
                            this.bigIps[currentTaskId],
                            currentTaskId,
                            declaration
                        ))
                        .then(() => rebootIfRequired.call(this, this.bigIps[currentTaskId], currentTaskId))
                        .then(() => {
                            logger.fine('Onboard complete.');
                        })
                        .catch((err) => {
                            logger.severe(`Error during onboarding: ${err.message}`);
                            this.state.doState.updateResult(
                                currentTaskId,
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
            const message = `Error handling startup state: ${err.message}`;
            logger.warning(message);
            error(message);
        });
}

function initialAccountSetup(wrapper) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    let promise = Promise.resolve();
    let adminPasswordUpdated = false;
    if (needsPasswordReset(wrapper)) {
        promise = initialPasswordSet.call(this, wrapper);
        adminPasswordUpdated = wrapper.targetUsername === 'admin';
    } else if (needsPasswordSetViaSsh(wrapper)) {
        promise = initialPasswordSetViaSsh.call(this, wrapper);
        adminPasswordUpdated = wrapper.targetUsername === 'admin';
    }

    return promise
        .then((updatedPassword) => {
            logger.finest('done w/ initial account setup');
            let p = Promise.resolve();
            if (adminPasswordUpdated) {
                p = p.then(rootAccountSetup.call(this, wrapper, updatedPassword));
            }
            return p.then(() => Promise.resolve(updatedPassword));
        })
        .catch((err) => {
            logger.warning(`Error during initial account setup: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Resets the root old password if needed
 *
 * On 14.0 and above the admin user is forced to change the password on first login.  When the admin password is
 * changed on first login it also changes the root password to the same value.  If the root password is changed the
 * oldPassword for the root user in the declaration could need to be updated.
 *
 * @param {Object} wrapper - Remote declaration wrapper
 * @param {string} updatedPassword - New password for admin
 */
function rootAccountSetup(wrapper, updatedPassword) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const rootUser = getUserFromDeclaration('root', wrapper.declaration);
    if (!rootUser) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        getPort(wrapper)
            .then((port) => {
                const credentials = cloudUtil.createBufferFrom(
                    `${wrapper.targetUsername}:${updatedPassword}`,
                    'ascii'
                ).toString('base64');
                const auth = `Basic ${credentials}`;
                const restOperation = this.restOperationFactory.createRestOperationInstance()
                    .setUri(
                        `https://${wrapper.targetHost}:${port}/mgmt/shared/authn/root`
                    )
                    .setIsSetBasicAuthHeader(true)
                    .setBasicAuthorization(auth)
                    .setContentType('application/json')
                    .setBody(
                        {
                            oldPassword: updatedPassword,
                            newPassword: updatedPassword
                        }
                    );
                return this.restRequestSender.sendPost(restOperation);
            })
            .then(() => {
                rootUser.oldPassword = updatedPassword;
                logger.finest('root oldPassword updated.');
                resolve();
            })
            .catch((err) => {
                if (err.message === 'Old password is incorrect.') {
                    resolve();
                    return;
                }
                logger.warning(`Error during rootAccountSetup: ${err.message}`);
                reject(err);
            });
    });
}

/**
 * Determines if we need to reset the password
 *
 * Any time the wrapper user's password is different from that user's password in the
 * declaration, we need to update the password before forwarding the declaration anywhere.
 * We do this so that we can forward the updated password to other code that needs it
 * (BIG-IQ TCW, for example)
 *
 * @param {Object} wrapper - Remote declaration wrapper
 */
function needsPasswordReset(wrapper) {
    if (wrapper.targetUsername && wrapper.targetPassphrase) {
        const user = getUserFromDeclaration(wrapper.targetUsername, wrapper.declaration);
        if (user && user.password && user.password !== wrapper.targetPassphrase) {
            return true;
        }
        return false;
    }
    return false;
}

/**
 * Determines if we need to reset the password
 *
 * Any time the wrapper has an ssh key and the the wrapper's user in the declaration has
 * a password, we need to update the password before forwarding the declaration anywhere.
 * We do this so that we can forward the updated password to other code that needs it
 * (BIG-IQ TCW, for example)
 *
 * @param {Object} wrapper - Remote declaration wrapper
 */
function needsPasswordSetViaSsh(wrapper) {
    if (wrapper.targetUsername && wrapper.targetSshKey) {
        const user = getUserFromDeclaration(wrapper.targetUsername, wrapper.declaration);
        if (user && user.password) {
            return true;
        }
        return false;
    }
    return false;
}

function initialPasswordSet(wrapper) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    return new Promise((resolve, reject) => {
        let updatedPassword;
        const user = getUserFromDeclaration(wrapper.targetUsername, wrapper.declaration);
        if (user && user.password) {
            getPort(wrapper)
                .then((port) => {
                    // Check to see if the password can be dereferenced
                    const dereferenced = doUtil.dereferencePointer(
                        wrapper.declaration,
                        user.password
                    );
                    if (typeof dereferenced === 'string') {
                        updatedPassword = dereferenced;
                    } else {
                        updatedPassword = user.password;
                    }
                    const credentials = cloudUtil.createBufferFrom(
                        `${wrapper.targetUsername}:${wrapper.targetPassphrase}`,
                        'ascii'
                    ).toString('base64');
                    const auth = `Basic ${credentials}`;
                    const restOperation = this.restOperationFactory.createRestOperationInstance()
                        .setUri(
                            `https://${wrapper.targetHost}:${port}/mgmt/shared/authz/users/admin`
                        )
                        .setIsSetBasicAuthHeader(true)
                        .setBasicAuthorization(auth)
                        .setContentType('application/json')
                        .setBody(
                            {
                                oldPassword: wrapper.targetPassphrase,
                                password: updatedPassword
                            }
                        );
                    return this.restRequestSender.sendPatch(restOperation);
                })
                .then(() => {
                    resolve(updatedPassword);
                })
                .catch((err) => {
                    logger.warning(`Error during initial password reset: ${err.message}`);
                    reject(err);
                });
        } else {
            resolve();
        }
    });
}

function initialPasswordSetViaSsh(wrapper) {
    return new Promise((resolve, reject) => {
        const user = getUserFromDeclaration(wrapper.targetUsername, wrapper.declaration);
        if (user && user.password) {
            const sshOptions = {
                ignoreHostKeyVerification: true,
                sshKeyPath: wrapper.targetSshKey.path
            };
            const sshUtil = new SshUtil(wrapper.targetUsername, wrapper.targetHost, sshOptions);

            // Check to see if the password can be dereferenced
            const dereferenced = doUtil.dereferencePointer(wrapper.declaration, user.password);
            if (typeof dereferenced === 'string') {
                user.password = dereferenced;
            }

            let command = `modify auth user ${wrapper.targetUsername} password ${user.password}`;
            sshUtil.executeCommand(command)
                .then(() => {
                    resolve(user.password);
                })
                .catch((err) => {
                    if (typeof err.message === 'string' && err.message.includes('command not found')) {
                        command = `tmsh ${command}`;
                        sshUtil.executeCommand(command)
                            .then(() => {
                                resolve(user.password);
                            })
                            .catch((er) => {
                                reject(er);
                            });
                    } else {
                        reject(err);
                    }
                });
        } else {
            resolve();
        }
    });
}

function getPort(wrapper) {
    if (wrapper.targetPort) {
        return Promise.resolve(wrapper.targetPort);
    }

    return doUtil.getPort(wrapper.targetHost);
}

function getUserFromDeclaration(username, declaration) {
    const commonDeclaration = declaration.Common || {};
    const users = Object.keys(commonDeclaration).filter(key => commonDeclaration[key].class === 'User');
    let user;
    if (users.indexOf(username) !== -1) {
        user = commonDeclaration[username];
    }
    return user;
}

function updateStateAfterReboot(taskId, success, error) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    // If we were rebooting and are now in this function, all should be well
    this.state.doState.updateResult(taskId, 200, STATUS.STATUS_OK, 'success');
    save.call(this)
        .then(() => {
            logger.fine('Rebooting complete. Onboarding complete.');
            if (success) {
                success();
            }
        })
        .catch((saveErr) => {
            const message = `error saving state after reboot: ${saveErr.message}`;
            logger.severe(message);
            if (error) {
                error(message);
            }
        });
}

function waitForRebootComplete(context, taskId, resolve, reject) {
    logger.info('Waiting for BIG-IP to reboot to complete onboarding.');
    context.bigIps[taskId].ready()
        .then(() => updateStateAfterReboot.call(context, taskId))
        .then(() => {
            resolve();
        })
        .catch((err) => {
            context.state.doState.updateResult(
                taskId,
                500,
                STATUS.STATUS_ERROR,
                'reboot failed',
                err.message
            );
            save.call(this)
                .then(() => {
                    logger.fine(`Error onboarding: reboot failed. ${err.message}`);
                    reject(err);
                });
        });
}

/**
 * Sends a response for a restOperation.
 *
 * @param {Object} restOperation - The restOperation to send the response for.
 * @param {String} endpoint - The endpoint that we are responding to (task, config, etc.)
 * @param {String} [itemId] - The id of the item to send the response for. Default is to send
 *                            result for all items at the endpoint.
 */
function sendResponse(restOperation, endpoint, itemId) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const response = forgeResponse.call(this, restOperation, endpoint, itemId);
    response.getResponse()
        .then((body) => {
            restOperation.setBody(body);
            if (body && body.httpStatus) {
                restOperation.setStatusCode(body.httpStatus);
                delete body.httpStatus;
            } else if (Array.isArray(response)) {
                restOperation.setStatusCode(200);
            } else if (body && body.result && body.result.code) {
                restOperation.setStatusCode(body.result.code);
            } else {
                restOperation.setStatusCode(200);
            }

            restOperation.complete();
        })
        .catch((err) => {
            logger.error(`sendResponse failed: ${JSON.stringify(err)}`);
            sendError(restOperation, 500, err.message);
        });
}

/**
 * Creates a response for a restOperation.
 *
 * @param {Object} restOperation - The restOperation to send the response for.
 * @param {String} endpoint - The endpoint that we are responding to (task, config, etc.)
 * @param {String} [itemId] - The id of the item to send the response for. Default is to send
 *                            result for all items at the endpoint.
 */
function forgeResponse(restOperation, endpoint, itemId) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    const doState = new State(this.state.doState);
    let responder;
    const method = restOperation.getMethod().toUpperCase();
    switch (endpoint) {
    case ENDPOINTS.CONFIG:
        responder = new ConfigResponse(doState, method);
        break;
    case ENDPOINTS.INFO:
        responder = new InfoResponse(method);
        break;
    case ENDPOINTS.INSPECT:
        responder = new InspectResponse(restOperation.getUri().query, method);
        break;
    case ENDPOINTS.TASK: {
        responder = new TaskResponse(doState, method);
        break;
    }
    default:
        logger.warning(`No responder for endpoint: ${endpoint}`);
        throw new Error(`No responder for endpoint: ${endpoint}`);
    }

    restOperation.setContentType('application/json');
    const response = new Response(itemId, responder, restOperation.getUri().query);
    return response;
}

/**
 * Posts a response to a webhook.
 *
 * @param {Object} restOperation - The restOperation to send the response for.
 * @param {String} endpoint - The endpoint that we are responding to (task, config, etc.)
 * @param {String} [itemId] - The id of the item to send the response for. Default is to send
 *                            result for all items at the endpoint.
 * @param {String} webhook - url to post to
 */
function postWebhook(restOperation, endpoint, itemId, webhook) {
    if (webhook === undefined) {
        return;
    }
    if (endpoint === ENDPOINTS.TASK) {
        const response = forgeResponse.call(this, restOperation, endpoint, itemId);
        response.getResponse()
            .then((body) => {
                const options = {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body
                };
                return httpUtil.post(webhook, options)
                    .catch((err) => {
                        logger.fine(`Webhook failed POST: ${JSON.stringify(err)}`);
                    });
            })
            .catch((err) => {
                logger.error(`postWebhook failed: ${JSON.stringify(err)}`);
            });
    }
}

function sendError(restOperation, code, message) {
    restOperation.setContentType('application/json');
    restOperation.setStatusCode(code);
    restOperation.setBody(message);
    restOperation.complete();
}

/**
 *
 * @param {URL} uri - The uri in the request
 *
 * @returns {Object} Object describing the path
 *
 *     {
 *         path: <path_that_was_requested_not_including_base_uri_or_id>,
 *         id: <id_that_was_requested>
 *     }
 */
function getPathInfo(uri) {
    const pathParts = uri.pathname.split('/');
    const pathInfo = {};
    if (pathParts.length > 3 && pathParts[3] !== '') {
        pathInfo.path = pathParts[3];
        if (pathParts.length > 4 && pathParts[4] !== '') {
            pathInfo.id = pathParts[4];
        }
    }
    return pathInfo;
}

module.exports = RestWorker;
