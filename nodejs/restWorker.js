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
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const doUtil = require('./doUtil');
const cryptoUtil = require('./cryptoUtil');
const ConfigManager = require('./configManager');
const DeclarationHandler = require('./declarationHandler');
const Logger = require('./logger');
const Response = require('./response');
const ConfigResponse = require('./configResponse');
const InfoResponse = require('./infoResponse');
const TaskResponse = require('./taskResponse');
const State = require('./state');
const SshUtil = require('./sshUtil');
const Validator = require('./validator');

const STATUS = require('./sharedConstants').STATUS;
const EVENTS = require('./sharedConstants').EVENTS;
const ENDPOINTS = require('./sharedConstants').ENDPOINTS;

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
            if (this.platform === PRODUCTS.BIGIP) {
                // if we need to relicense after we restart, so store passwords
                cryptoUtil.encryptValue(bigIpPassword, BIG_IP_ENCRYPTION_ID);
                cryptoUtil.encryptValue(bigIqPassword, BIG_IQ_ENCRYPTION_ID);

                this.state.doState.updateResult(taskId, 202, STATUS.STATUS_REVOKING, 'revoking license');
                save.call(this);
            }
        });

        // The framework is supposed to pass in our state, but does not.
        load.call(this)
            .then(() => {
                return doUtil.getCurrentPlatform();
            })
            .then((platform) => {
                logger.info(`Platform: ${platform}`);
                this.platform = platform;

                return handleStartupState.call(this, success, error);
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
        let bigIpOptions;

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

        const validation = this.validator.validate(wrapper);
        this.state.doState.setDeclaration(taskId, declaration);
        this.state.doState.setErrors(taskId, null);

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

            // Determine if this is an internal task (coming back to us from the TCW on BIG-IQ)
            let isFromTcw = false;
            if (this.platform === PRODUCTS.BIGIQ && insensitiveQuery.internal) {
                isFromTcw = true;
            }

            save.call(this)
                .then(() => {
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

                    if (!isFromTcw) {
                        return initialAccountSetup.call(this, wrapper);
                    }

                    return Promise.resolve();
                })
                .then((updatedPassword) => {
                    if (updatedPassword) {
                        wrapper.targetPassphrase = updatedPassword;
                    }

                    // Determine if this is an internal task (coming back to us from the TCW on BIG-IQ)
                    if (this.platform === PRODUCTS.BIGIQ && !isFromTcw) {
                        logger.finest('Passing to TCW');
                        passToTcw.call(this, wrapper, taskId, restOperation)
                            .then((tcwId) => {
                                return pollTcw.call(this, tcwId, taskId, restOperation);
                            })
                            .then(() => {
                                logger.finest('TCW is done');
                                if (!declaration.async) {
                                    logger.fine('Sending response.');
                                    sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                                }
                            })
                            .then(() => {
                                return getAndSaveCurrentConfig.call(
                                    this,
                                    this.bigIps[taskId],
                                    declaration,
                                    taskId
                                );
                            })
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

                        onboard.call(this, declaration, bigIpOptions, taskId)
                            .then((rebootRequired) => {
                                // We store the bigIp object under the original ID so the polling
                                // task knows which state to update. This is only sent by the TCW.
                                if (originalDoId) {
                                    this.bigIps[originalDoId] = this.bigIps[taskId];
                                }

                                if (!declaration.async) {
                                    logger.fine('Sending response.');
                                    sendResponse.call(this, restOperation, ENDPOINTS.TASK, taskId);
                                }

                                if (rebootRequired) {
                                    this.bigIps[taskId].reboot();

                                    // If we're running on BIG-IP, recovering from reboot will be handled
                                    // by the startup code (onStartCompleted). Otherwise, wait
                                    // until the BIG-IP is ready again (after a slight delay to make sure
                                    // the reboot has started).
                                    if (this.platform !== PRODUCTS.BIGIP) {
                                        setTimeout(waitForRebootComplete, 10000, this, taskId);
                                    }
                                }
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

function onboard(declaration, bigIpOptions, taskId) {
    let rebootRequired = false;
    let declarationHandler;

    return doUtil.getBigIp(logger, bigIpOptions)
        .then((bigIp) => {
            this.bigIps[taskId] = bigIp;

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
            return this.bigIps[taskId].rebootRequired();
        })
        .then((needsReboot) => {
            rebootRequired = needsReboot;
            if (!rebootRequired) {
                logger.fine('No reboot required');
                this.state.doState.updateResult(taskId, 200, STATUS.STATUS_OK, 'success');
            } else {
                logger.fine('Reboot required. Rebooting.');
                this.state.doState.updateResult(taskId, 202, STATUS.STATUS_REBOOTING, 'reboot required');
            }
            logger.fine('Getting and saving current configuration');
            return getAndSaveCurrentConfig.call(this, this.bigIps[taskId], declaration, taskId);
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
                taskId,
                deconCode,
                STATUS.STATUS_ROLLING_BACK,
                'invalid config - rolling back',
                err.message
            );
            return save.call(this)
                .then(() => {
                    const rollbackTo = {};
                    Object.assign(rollbackTo, this.state.doState.getTask(taskId).currentConfig);
                    return getAndSaveCurrentConfig.call(this, this.bigIps[taskId], declaration, taskId)
                        .then(() => {
                            return declarationHandler.process(
                                rollbackTo,
                                this.state.doState.getTask(taskId)
                            );
                        })
                        .then(() => {
                            this.state.doState.setStatus(taskId, STATUS.STATUS_ERROR);
                            this.state.doState.setMessage(taskId, 'invalid config - rolled back');
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
                taskId,
                deconCode,
                STATUS.STATUS_ERROR,
                'rollback failed',
                err.message
            );
        })
        .then(() => {
            return Promise.resolve(rebootRequired);
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
        .then((response) => {
            return response.getBody().id;
        });
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

    const retryFunc = () => {
        return this.restRequestSender.sendGet(restOperation)
            .then((response) => {
                const body = response.getBody();
                if (body.status === 'FAILED' || body.status === 'FINISHED') {
                    return Promise.resolve(body);
                }
                return Promise.reject();
            })
            .catch(() => {
                return Promise.reject();
            });
    };

    return cloudUtil.tryUntil(
        this,
        { retryIntervalMs: this.retryInterval || 5000, maxRetries: 120 }, // this.retryInterval for testing
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

    const configManager = new ConfigManager(`${__dirname}/configItems.json`, bigIp);
    return configManager.get(declaration, this.state.doState.getTask(taskId), this.state.doState)
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

function handleStartupState(success, error) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    if (this.platform !== PRODUCTS.BIGIP) {
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
            const declaration = Object.assign({}, this.state.doState.getDeclaration(currentTaskId));
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
                    return onboard.call(this, declaration, {}, currentTaskId);
                })
                .then((rebootRequired) => {
                    if (rebootRequired) {
                        this.bigIps[currentTaskId].reboot();
                    }
                });
        });

        break;
    default:
        success();
    }
}

function initialAccountSetup(wrapper) {
    // Rest framework complains about 'this' because of 'strict', but we use call(this)
    /* jshint validthis: true */

    let promise = Promise.resolve();
    if (needsPasswordReset(wrapper)) {
        promise = initialPasswordSet.call(this, wrapper);
    } else if (needsPasswordSetViaSsh(wrapper)) {
        promise = initialPasswordSetViaSsh.call(this, wrapper);
    }

    return promise
        .then((updatedPassword) => {
            logger.finest('done w/ initial accout setup');
            return Promise.resolve(updatedPassword);
        })
        .catch((err) => {
            logger.warning(`Error during initial account setup: ${err.message}`);
            return Promise.reject(err);
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

            sshUtil.executeCommand(`modify auth user ${wrapper.targetUsername} password ${user.password}`)
                .then(() => {
                    resolve(user.password);
                })
                .catch((err) => {
                    reject(err);
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
    const users = Object.keys(commonDeclaration).filter((key) => {
        return commonDeclaration[key].class === 'User';
    });
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

function waitForRebootComplete(context, taskId) {
    logger.info('Waiting for BIG-IP to reboot to complete onboarding.');
    context.bigIps[taskId].ready()
        .then(() => {
            updateStateAfterReboot.call(context, taskId);
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

    const doState = new State(this.state.doState);
    let responder;
    switch (endpoint) {
    case ENDPOINTS.CONFIG:
        responder = new ConfigResponse(doState);
        break;
    case ENDPOINTS.INFO:
        responder = new InfoResponse();
        break;
    case ENDPOINTS.TASK: {
        responder = new TaskResponse(doState);
        break;
    }
    default:
        logger.warning(`No responder for endpoint: ${endpoint}`);
        throw new Error(`No responder for endpoint: ${endpoint}`);
    }

    restOperation.setContentType('application/json');
    const response = new Response(itemId, responder, restOperation.getUri().query);
    const body = response.getResponse();
    restOperation.setBody(body);

    if (Array.isArray(response)) {
        restOperation.setStatusCode(200);
    } else if (body && body.result && body.result.code) {
        restOperation.setStatusCode(body.result.code);
    } else {
        restOperation.setStatusCode(200);
    }

    restOperation.complete();
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
