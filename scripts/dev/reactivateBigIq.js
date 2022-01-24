/**
 * Copyright 2022 F5 Networks, Inc.
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

/* eslint-disable no-console */

/**
 * This script re-activates both the system license and the pool licenses on a BIG-IQ.
 * It relies on the following environment variables
 *
 *     BIG_IQ_HOST: IP of BIG-IQ
 *     BIG_IQ_USERNAME: Admin user name on BIG-IQ
 *     BIG_IQ_PASSWORD: Password for user
 *     BIG_IQ_BASE_REG_KEY: System license reg key
 *     BIG_IQ_ADD_ON_KEY: System license add-on key
 *     BIG_IQ_LICENSE_POOLS: Whitespace separated list of pool UUIDs
 */

const promiseUtil = require('@f5devcentral/atg-shared-utilities').promiseUtils;
const requestUtil = require('@f5devcentral/atg-shared-utilities').requestUtils;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

function getAuthToken() {
    const reqOpts = {
        method: 'POST',
        host: process.env.BIG_IQ_HOST,
        auth: `${process.env.BIG_IQ_USERNAME}:${process.env.BIG_IQ_PASSWORD}`,
        path: '/mgmt/shared/authn/login'
    };
    const body = {
        username: process.env.BIG_IQ_USERNAME,
        password: process.env.BIG_IQ_PASSWORD
    };
    return requestUtil.send(reqOpts, body)
        .then((response) => response.token.token);
}

function sendRequestToBigIq(reqOpts, body) {
    reqOpts.host = process.env.BIG_IQ_HOST;
    if (typeof reqOpts.headers === 'undefined') {
        reqOpts.headers = {};
    }
    return Promise.resolve()
        .then(() => {
            if (!reqOpts.auth) {
                return getAuthToken()
                    .then((authToken) => {
                        Object.assign(reqOpts.headers, { 'X-F5-Auth-Token': authToken });
                    });
            }
            return Promise.resolve();
        })
        .then(() => requestUtil.send(reqOpts, body));
}

function reactivateSystemLicense() {
    console.log('Re-activating system license');
    return Promise.resolve()
        .then(() => {
            const reqOpts = {
                method: 'POST',
                path: '/mgmt/tm/shared/licensing/activation'
            };
            const body = {
                baseRegKey: process.env.BIG_IQ_BASE_REG_KEY,
                addOnKeys: [
                    process.env.BIG_IQ_ADD_ON_KEY
                ],
                activationMethod: 'AUTOMATIC',
                licenseType: 'New'
            };
            return sendRequestToBigIq(reqOpts, body);
        })
        .then((response) => {
            if (response.status !== 'LICENSING_ACTIVATION_IN_PROGRESS') {
                return Promise.reject(new Error(`current status: ${response.status}, expecting LICENSING_ACTIVATION_IN_PROGRESS`));
            }
            return Promise.resolve();
        })
        .then(() => {
            const checkStatus = () => {
                const reqOpts = {
                    method: 'GET',
                    path: '/mgmt/tm/shared/licensing/activation'
                };
                return sendRequestToBigIq(reqOpts)
                    .then((response) => {
                        if (response.status !== 'LICENSING_COMPLETE') {
                            return Promise.reject(new Error(`current status: ${response.status}, expecting LICENSING_COMPLETE`));
                        }
                        const licenseText = response.licenseText;
                        return Promise.resolve(licenseText);
                    });
            };
            const retryOpts = {
                retries: 120,
                delay: 1000
            };
            return promiseUtil.retryPromise(checkStatus, retryOpts);
        })
        .catch((err) => {
            console.log(`Error re-activating system license: ${err.message}`);
            throw err;
        });
}

function registerSystemLicense(licenseText) {
    console.log('Registering system license');
    return Promise.resolve()
        .then(() => {
            const reqOpts = {
                method: 'PUT',
                path: '/mgmt/tm/shared/licensing/registration'
            };
            const body = {
                licenseText
            };
            return sendRequestToBigIq(reqOpts, body);
        })
        .catch((err) => {
            console.log(`Error registering system license: ${err.message}`);
            throw err;
        });
}

function reactivatePoolLicenses() {
    const licensePools = process.env.BIG_IQ_LICENSE_POOLS.split(/\s/);
    console.log(`Re-activating pools ${licensePools.join(' ')}`);
    const poolPromises = licensePools.map((licensePool) => {
        const reqOpts = {
            method: 'PATCH',
            path: `/mgmt/cm/device/licensing/pool/utility/licenses/${licensePool}`
        };
        const body = {
            status: 'ACTIVATING_AUTOMATIC'
        };

        return sendRequestToBigIq(reqOpts, body)
            .then((response) => {
                if (response.status !== 'ACTIVATING_AUTOMATIC') {
                    return Promise.reject(new Error(`current status: ${response.status}, expecting ACTIVATING_AUTOMATIC`));
                }
                return Promise.resolve();
            })
            .then(() => {
                let counter = 0;
                const checkStatus = () => {
                    const checkReqOpts = {
                        method: 'GET',
                        path: `/mgmt/cm/device/licensing/pool/utility/licenses/${licensePool}`
                    };
                    return sendRequestToBigIq(checkReqOpts)
                        .then((response) => {
                            if (counter % 10 === 0 || response.status === 'READY') {
                                console.log(`${licensePool} status: ${response.status}`);
                            }
                            counter += 1;
                            if (response.status !== 'READY') {
                                return Promise.reject(new Error(`current status: ${response.status}, expecting READY`));
                            }
                            return Promise.resolve();
                        });
                };
                const retryOpts = {
                    retries: 500,
                    delay: 1000
                };
                return promiseUtil.retryPromise(checkStatus, retryOpts);
            })
            .catch((err) => {
                console.log(`Error re-activating pool licenses: ${err.message}`);
                throw err;
            });
    });
    return Promise.all(poolPromises);
}

function main() {
    return Promise.resolve()
        .then(() => reactivateSystemLicense())
        .then((licenseText) => registerSystemLicense(licenseText))
        .then(() => reactivatePoolLicenses())
        .then(() => console.log('done'))
        .catch(() => {
            console.log('error during processing');
            process.exit(-1);
        });
}

main();
