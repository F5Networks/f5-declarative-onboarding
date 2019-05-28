/**
 * Copyright 2019 F5 Networks, Inc.
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

const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const doUtil = require('./doUtil');

class LicensePoolValidator {
    /* eslint-disable class-methods-use-this, max-len */
    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const licenseWrapper = doUtil.getClassObjects(data.declaration, 'License');
        if (!licenseWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        const license = licenseWrapper[Object.keys(licenseWrapper)[0]];
        if (!license || license.licenseType !== 'licensePool') {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        return doUtil.getCurrentPlatform()
            .then((currentPlatform) => {
                if (currentPlatform !== PRODUCTS.BIGIQ) {
                    if (!license.bigIqHost
                        || !license.bigIqUsername
                        || !(license.bigIqPassword || license.bigIqPasswordUri)) {
                        // If not on BIG-IQ, host, user and password info are required
                        isValid = false;
                        errors.push("If not running on BIG-IQ, licensePool info requires 'bigIqHost', 'bigIqUsername', and either 'bigIqPassword' or 'bigIqPasswordUri'");
                    } else if (license.bigIqHost === 'localhost') {
                        isValid = false;
                        errors.push("If not running on BIG-IQ, 'bigIqHost' cannot be 'localhost'");
                    }
                }

                return Promise.resolve({
                    isValid,
                    errors
                });
            });
    }
}

module.exports = LicensePoolValidator;
