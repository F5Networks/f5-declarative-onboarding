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

const AjvValidator = require('./ajvValidator');
const BigIqSettingsValidator = require('./bigIqSettingsValidator');
const LicensePoolValidator = require('./licensePoolValidator');

class Validator {
    constructor() {
        this.validators = [
            new AjvValidator(),
            new BigIqSettingsValidator(),
            new LicensePoolValidator()
        ];
    }

    validate(data) {
        // We want to run the validators serially so that we can control which errors
        // show up first. Namely, we want JSON validation errors first.
        const runInSerial = this.validators.reduce((promiseChain, currentValidator) => {
            return promiseChain.then((results) => {
                return currentValidator.validate(data).then((currentResult) => {
                    results.push(currentResult);
                    return results;
                });
            });
        }, Promise.resolve([]));

        return runInSerial
            .then((results) => {
                const firstError = results.find((currentResult) => {
                    return !currentResult.isValid;
                });

                return firstError || {
                    isValid: true,
                    errors: null
                };
            });
    }
}

module.exports = Validator;
