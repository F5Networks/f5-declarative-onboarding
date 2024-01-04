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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');

function fetchValue(fetch, logger) {
    if (typeof fetch.data !== 'object') {
        return Promise.resolve();
    }

    if (fetch.data.base64) {
        fetch.parentData[fetch.pptyName] = Buffer
            .from(fetch.data.base64, 'base64').toString().trim();
        return Promise.resolve();
    }

    if (fetch.data.url) {
        let contentType;

        switch (fetch.schema) {
        case 'pki-cert':
            contentType = 'application/x-pem-file,'
                + 'application/pkix-cert;q=0.7,'
                + 'application/pkcs-mime;q=0.7,'
                + 'application/x-x509-ca-cert;q=0.7,'
                + 'application/x-pkcs7-certificates;q=0.5,'
                + 'application/x-pkcs12;q=0.3,'
                + 'text/plain;q=0.2,'
                + 'application/octet-stream;q=0.2';
            break;
        case 'pki-key':
            contentType = 'application/x-pem-file,'
                + 'application/pkcs8;q=0.5,'
                + 'application/x-pkcs12;q=0.3,'
                + 'text/plain;q=0.2,'
                + 'application/octet-stream;q=0.2';
            break;
        default:
            return Promise.reject(new Error(`unimplemented schema=${fetch.schema} in fetchValue()`));
        }

        const options = {
            headers: {
                Accept: contentType
            }
        };

        return Promise.resolve()
            .then(() => cloudUtil.getDataFromUrl(fetch.data.url, options))
            .then((result) => {
                switch (fetch.schema) {
                case 'pki-cert':
                case 'pki-key':
                    if (typeof result !== 'string') {
                        result = result.toString();
                    }
                    break;
                default:
                    return Promise.reject(new Error(`unimplemented schema=${fetch.schema} in fetchValue()`));
                }

                fetch.parentData[fetch.pptyName] = result;
                return Promise.resolve();
            })
            .catch((err) => {
                err.message = `unable to fetch value. ${err.message}`;
                logger.severe(err.message);
                throw err;
            });
    }

    return Promise.resolve();
}

function handleFetches(fetches, taskId) {
    const logger = new Logger(module, taskId);
    return Promise.all(fetches.map((fetch) => fetchValue(fetch, logger)));
}

module.exports = {
    handleFetches
};
