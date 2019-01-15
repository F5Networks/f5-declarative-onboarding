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
const util = require('util');
const request = require('request');

// async wrapper for fs.readFile
module.exports.readFile = function readFile(filename) {
    return util.promisify(fs.readFile)(filename, 'utf-8');
};

// async wrapper for fs.writeFile
module.exports.writeFile = function writeFile(filename, data) {
    return util.promisify(fs.writeFile)(filename, data);
};

// async wrapper for fs.appendFile
module.exports.appendFile = function appendFile(filename, data) {
    return util.promisify(fs.appendFile)(filename, data);
};

/**
 * requestPromise - async/await wrapper for request
 * @options {Object} - options for request
 * Returns a Promise with response/error
*/
module.exports.requestPromise = function requestPromise(options) {
    return util.promisify(request)(options);
};

/**
 * tryOften - tries a function that is a Promise for a definite amount of times, spacing the trials out
 *            by the defined interval, until runs out of trials, rejects and rejectOnError is set, or resolves
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
module.exports.tryOften = function tryOften(targetFunction, trials, timeInterval, acceptErrors, checkError) {
    return new Promise((resolve, reject) => {
        let timer;
        const intervalFunction = function () {
            if (trials === 0) {
                clearInterval(timer);
                reject(new Error('number of trials exhausted'));
            }
            targetFunction.apply(this)
                .then((response) => {
                    clearInterval(timer);
                    resolve(response);
                })
                .catch((error) => {
                    if (checkError) {
                        // ok, if none of the acceptable errors match, we will reject
                        let willReject = true;
                        acceptErrors.forEach((err) => {
                            if (err === error.message) {
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
};
