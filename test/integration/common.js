/* Copyright 2016-2018 F5 Networks, Inc.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   Util Library for Declarative Onboarding Testing
   Author: @fonsecayarochewsky
*/

'use strict';

const fs = require('fs');
const qs = require('querystring');
const request = require('request');
const util = require('util');
const constants = require('./constants.js');
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
        return new Promise((resolve, reject) => {
            let timer;
            let trialsCopy = trials;
            const intervalFunction = function () {
                if (trialsCopy === 0) {
                    clearInterval(timer);
                    reject(new Error('number of trials exhausted'));
                }
                targetFunction.apply(this)
                    .then((response) => {
                        clearInterval(timer);
                        resolve(response);
                    })
                    .catch((error) => {
                        trialsCopy -= 1;
                        if (checkError) {
                            let willReject = true;
                            acceptErrors.forEach((err) => {
                                if (err === parseInt(error.message, 10) || err === error.message) {
                                    willReject = false;
                                }
                            });
                            if (willReject) {
                                // non-trivial error, we reject
                                reject(new Error(`error is unrecoverable : ${error.message}`));
                                clearInterval(timer);
                            }
                        }
                    });
            };
            timer = setInterval(intervalFunction, timeInterval);
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
    testRequest(body, url, auth, expectedCode, method, interval) {
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
        return module.exports.tryOften(func, 10, (interval || 60) * 1000, [constants.HTTP_UNAVAILABLE], true);
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
    testGetStatus(trials, timeInterval, ipAddress, auth, expectedCode, queryObj) {
        const func = function () {
            return new Promise((resolve, reject) => {
                const query = qs.encode(Object.assign(queryObj || {}, { show: 'full' }));
                const options = module.exports.buildBody(`${module.exports.hostname(ipAddress,
                    constants.PORT)}${constants.DO_API}?${query}`, null, auth, 'GET');
                module.exports.sendRequest(options)
                    .then((response) => {
                        logger.debug(`current status: ${response.response.statusCode}, waiting for ${expectedCode}`);
                        if (response.response.statusCode === expectedCode) {
                            resolve(JSON.parse(response.body));
                        } else {
                            reject(new Error(response.response.statusCode));
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        };
        return module.exports.tryOften(func, trials, timeInterval,
            [constants.HTTP_ACCEPTED, constants.HTTP_UNAVAILABLE, constants.HTTP_NOTFOUND], true);
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
