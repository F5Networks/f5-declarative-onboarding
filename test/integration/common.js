/**
 * Copyright 2021 F5 Networks, Inc.
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
const qs = require('querystring');
const request = require('request');
const util = require('util');
const constants = require('./constants');
const logger = require('./logger').getInstance();

module.exports = {

    readFile(filename) {
        return util.promisify(fs.readFile)(filename, 'utf-8');
    },

    writeFile(filename, data) {
        return util.promisify(fs.writeFile)(filename, data);
    },

    appendFile(filename, data) {
        return util.promisify(fs.appendFile)(filename, data);
    },

    /**
     * requestPromise - async/await wrapper for request
     * @options {Object} - options for request
     * Returns a Promise with response/error
    */
    requestPromise(options) {
        return util.promisify(request)(options);
    },


    /**
     * delayPromise- promise based timeout function
     * @time {Integer} - Time in milliseconds to wait
     * @value {Variable} - Optional pass through value
     */
    delayPromise(time, value) {
        return new Promise(((resolve) => {
            setTimeout(() => {
                resolve(value);
            }, time);
        }));
    },

    /**
     * tryOften - tries a function that is a Promise for a definite amount of times, spacing the trials out
     *            by the defined interval, until runs out of trials,
     *            rejects and rejectOnError is set, or resolves
     * @targetFunction {Promise} - Promise to attempt to resolve
     * @trials {Integer} - number of trials available until settlement
     * @timeInterval {Integer} - number of ms until new trial is triggered
     * @acceptErrors {Array} - if we get a reject on the targetFunction with the error message equal to any of
     *                         the errors in acceptErrors, we don't reject, and retry
     * @checkError {Boolean} - determines whether to check for acceptError
     *                         (i.e. is checkError is false, never rejects on error)
     * Returns a Promise which resolves with the targetFunction's result, or rejects with 'out of trials' or
     * targetFunction's error
     * (Inspired by the cloud-libs.util's tryUntil, except without some of the machinery we won't need here
    */
    tryOften(targetFunction, trials, timeInterval, acceptErrors, checkError) {
        return targetFunction.apply(this)
            .catch((error) => {
                if (checkError) {
                    if (!acceptErrors.some(err => (err === parseInt(error.message, 10) || err === error.message))) {
                        // non-trivial error, we reject
                        throw new Error(`error is unrecoverable : ${error.message}`);
                    }
                }
                if (trials === 0) {
                    throw new Error(`number of trials exhasted: ${error.message}`);
                }
                return module.exports.delayPromise(timeInterval)
                    .then(() => module.exports.tryOften(
                        targetFunction, trials - 1, timeInterval, acceptErrors, checkError
                    ));
            });
    },

    /**
     * testRequest - sends a request with the body and credentials to the hostname based on the ip provided,
     *               and tests if response was successful and issued the expected HTTP status code.
     * @body {Object} : request body
     * @url {String} : complete url with ip + endpoint for API call
     * @auth {Object} : authorization dictionary with (username, password) or F5 token
     * @expectedCode {int} : expected HTTP status code for the request
     * @method {String} : HTTP request method (POST, GET)
     * @interval {Number} : Seconds to wait between requests (default 60)
     * Returns Promise which resolves with response body on success or rejects with error
    */
    testRequest(body, url, auth, expectedCode, method, interval, acceptErrors) {
        logger.debug(`${method} ${JSON.stringify(body)} ${url}`);
        const func = function () {
            return new Promise((resolve, reject) => {
                const options = module.exports.buildBody(url, body, auth, method);
                module.exports.sendRequest(options)
                    .then((response) => {
                        logger.debug(`current status: ${response.response.statusCode}, waiting for ${expectedCode}`);
                        if (response.response.statusCode === expectedCode) {
                            resolve(response.body);
                        } else {
                            reject(new Error(response.response.statusCode));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        };
        const acceptableErrors = [constants.HTTP_UNAVAILABLE, constants.HTTP_BAD_REQUEST].concat(acceptErrors || []);
        return module.exports.tryOften(func, 10, (interval || 60) * 1000,
            acceptableErrors, true);
    },

    /**
     * testGetStatus - tries for a DO status response given a time interval and number of tries,
     *                 and if ever successful, returns the response
     * @trials {Integer} - number of allowed trials
     * @timeInterval {Integer} - time in ms to wait before trying again
     * @ipAddress {String} - BIG-IP address for DO call
     * @auth {Object} : authorization dictionary with (username, password) or F5 token
     * @expectedCode {String} - expected HTTP status code for when the API responds; typically HTTP_SUCCESS
     * Returns a Promise with response/error
    */
    testGetStatus(trials, timeInterval, ipAddress, auth, expectedCode, queryObj = {}) {
        const func = function () {
            return new Promise((resolve, reject) => {
                const query = qs.encode(Object.assign(queryObj, { show: 'full' }));
                const options = module.exports.buildBody(`${module.exports.hostname(ipAddress,
                    constants.PORT)}${constants.DO_API}?${query}`, null, auth, 'GET');
                module.exports.sendRequest(options)
                    .then((response) => {
                        const statusCode = response.response.statusCode;

                        let parsedResponse;
                        try {
                            parsedResponse = JSON.parse(response.body);
                        } catch (err) {
                            parsedResponse = response.body;
                        }

                        logger.debug(`current status: ${statusCode}, waiting for ${expectedCode}`);
                        if ([constants.HTTP_SUCCESS, constants.HTTP_ACCEPTED].indexOf(statusCode) < 0) {
                            logger.debug(JSON.stringify(parsedResponse.result, null, 2));
                        }

                        if (statusCode === expectedCode) {
                            // 'experimental' statusCode will always return 200, response.code may differ.
                            if (queryObj.statusCodes === 'experimental' && !parsedResponse.code) {
                                reject(new Error(parsedResponse.result.code));
                            }
                            resolve(parsedResponse);
                        } else {
                            reject(new Error(statusCode));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        };
        return module.exports.tryOften(func, trials, timeInterval, null, false);
    },

    /**
     * deleteOriginalConfig - Deletes DO's original config so that it can be regenerated from
     *                        the current machine state
     * @doUrl {String} - URL to call DO from
     * @auth {Object} - authorization dictionary with (username, password) or F5 token
     * Returns a Promise with response/error
    */
    deleteOriginalConfig(doUrl, auth) {
        const retryErrors = [constants.HTTP_NOTFOUND, constants.HTTP_UNAUTHORIZED];

        return this.testRequest(null, `${doUrl}/config`, auth, constants.HTTP_SUCCESS, 'GET', null,
            retryErrors)
            .then((body) => {
                const promises = JSON.parse(body).map((config) => {
                    logger.debug(`Deleting original config ${config.id}`);
                    return this.sendRequest(
                        this.buildBody(`${doUrl}/config/${config.id}`, null, auth, 'DELETE'),
                        {
                            trials: 5,
                            timeInterval: 1000
                        }
                    );
                });
                return Promise.all(promises);
            });
    },

    /**
     * testOriginalConfig - Tests if original config can be successfully applied by DO. This is
     *                      done by resetting the original config to match the current machine state
     *                      and then sending an empty declaration.
     * @ipAddress {String} - BIG-IP address for DO call
     * @auth {Object} : authorization dictionary with (username, password) or F5 token
     * Returns a Promise with response/error
    */
    testOriginalConfig(ipAddress, auth) {
        const url = `${this.hostname(ipAddress, constants.PORT)}${constants.DO_API}`;
        const retryErrors = [constants.HTTP_NOTFOUND, constants.HTTP_UNAUTHORIZED];

        logger.debug('Testing original config');

        return this.deleteOriginalConfig(url, auth)
            .then(() => {
                const body = {
                    schemaVersion: '1.0.0',
                    class: 'Device',
                    async: true,
                    controls: {
                        trace: true,
                        traceResponse: true
                    },
                    Common: {
                        class: 'Tenant'
                    }
                };
                logger.debug('Generating and applying new original config');
                return this.testRequest(body, url, auth, constants.HTTP_ACCEPTED, 'POST', null,
                    retryErrors);
            })
            .then(() => this.testGetStatus(60, 30 * 1000, ipAddress, auth, constants.HTTP_SUCCESS));
    },

    /**
     * dumpDeclaration - returns declaration status from DO
     * @ipAddress {String} - BIG-IP address for DO call
     * @auth {Object} : authorization dictionary with (username, password) or F5 token
    */
    dumpDeclaration(ipAddress, auth) {
        return new Promise((resolve, reject) => {
            const options = module.exports.buildBody(`${module.exports.hostname(ipAddress,
                constants.PORT)}${constants.DO_API}?show=full`, null, auth, 'GET');
            module.exports.sendRequest(options)
                .then(response => response.body)
                .then(JSON.parse)
                .then((parsedResponse) => {
                    resolve(parsedResponse);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    /**
     * hostname - prepends https and appends port to the ip address
     * @ipAddress {String} : base ip of the hostname
     * @port {String} : port to connect to ip
     * Returns full hostname + port string
    */
    hostname(ipAddress, port) {
        return `https://${ipAddress}:${port}`;
    },

    /**
     * sendRequest - prepares and sends a request with some configuration
     * @options {Object} : configuration options for request
     * @retryOptions {Object} : options for retrying request. see tryOften
     * Returns Promise with response/error
    */
    sendRequest(options, retryOptions) {
        const func = function () {
            return new Promise((resolve, reject) => {
                request(options, (error, response, body) => {
                    if (error) { reject(error); }
                    const responseObj = { response, body };
                    resolve(responseObj);
                });
            });
        };

        if (retryOptions) {
            return module.exports.tryOften(
                func,
                retryOptions.trials,
                retryOptions.timeInterval,
                null,
                false
            );
        }
        return func();
    },

    /**
     * buildAuthenticationString - builds a base64 Basic Auth header
     * @credentials {Object} : username and password dictionary to be encoded
     *                         in the BasicAuth header {username : <user>, password : <pass>}
    */
    buildAuthenticationString(credentials) {
        const username = credentials.username;
        const password = credentials.password;
        return (`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
    },

    /**
     * buildBody - builds a request body to be sent over the network
     * url {String} : complete url + endpoint string for API call
     * @data {Object} : data to be sent on request
     * @auth {Object} : authorization dictionary with (username, password) or F5 token
     * @method {String} : request's method (POST, GET)
     * Returns fully-formatted body Object, or throws error if form of authentication is missing
     * (either username/password or a token)
    */
    buildBody(url, data, auth, method) {
        const options = {
            method,
            url,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (auth && 'token' in auth) {
            options.headers['X-F5-Auth-Token'] = auth.token;
        } else if (auth && 'username' in auth && 'password' in auth) {
            options.headers.Authorization = module.exports.buildAuthenticationString(auth);
        }
        if (data) {
            options.body = JSON.stringify(data);
        }
        return options;
    }
};
