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

const doUtil = require('./doUtil');

class BigIqSettingsValidator {
    validate(data) {
        if (!data.bigIqSettings) {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        const deviceGroup = doUtil.getClassObjects(data.declaration, 'DeviceGroup');
        if (deviceGroup && !data.bigIqSettings.clusterName) {
            isValid = false;
            errors.push("When onboarding from BIG-IQ, 'clusterName' is required if the BIG-IP will be a member of a device group");
        }

        // technically we can have more than one provision object, but there really should just be one
        const provisionObjects = doUtil.getClassObjects(data.declaration, 'Provision');
        if (provisionObjects) {
            const provision = provisionObjects[Object.keys(provisionObjects)[0]];
            if (provision.apm && provision.apm !== 'none') {
                if (!data.bigIqSettings.accessModuleProperties) {
                    isValid = false;
                    errors.push("When onboarding from BIG-IQ, 'accessModuleProperties' is required if the apm module will be provisioned");
                }
            }
        }

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = BigIqSettingsValidator;
