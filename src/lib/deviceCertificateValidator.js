/**
 * Copyright 2024 F5, Inc.
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

class DeviceCertificateValidator {
    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const deviceCertificateWrapper = doUtil.getClassObjects(data.declaration, 'DeviceCertificate');
        if (!deviceCertificateWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        const deviceCertificate = deviceCertificateWrapper[Object.keys(deviceCertificateWrapper)[0]];

        let isValid = true;
        const errors = [];

        function addError(propertyName) {
            isValid = false;
            errors.push(`DeviceCertificate base64 decoded ${propertyName} property is missing BEGIN and/or END delimiters`);
        }

        const certificate = Buffer.from(
            deviceCertificate.certificate.base64,
            'base64'
        ).toString();

        if (!certificate.includes('BEGIN') || !certificate.includes('END')) {
            addError('certificate');
        }

        if (deviceCertificate.privateKey) {
            const key = Buffer.from(
                deviceCertificate.privateKey.base64,
                'base64'
            ).toString();

            if (!key.includes('BEGIN') || !key.includes('END')) {
                addError('privateKey');
            }
        }

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = DeviceCertificateValidator;
