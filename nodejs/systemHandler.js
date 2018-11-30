/**
 * Copyright 2018 F5 Networks, Inc.
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
const doUtil = require('./doUtil');
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;

const logger = new Logger(module);

/**
 * Handles system parts of a declaration.
 *
 * @class
 */
class SystemHandler {
    /**
     * Constructor
     *
     * @param {Object} declaration - Parsed declaration.
     * @param {Object} bigIp - BigIp object.
     */
    constructor(declaration, bigIp) {
        this.declaration = declaration;
        this.bigIp = bigIp;
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        logger.fine('Processing system declaration.');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }

        logger.fine('Checking NTP.');
        return handleNTP.call(this)
            .then(() => {
                logger.fine('Checking DNS.');
                return handleDNS.call(this);
            })
            .then(() => {
                logger.fine('Checking hostname.');
                return handleHostname.call(this);
            })
            .then(() => {
                logger.fine('Checking Users.');
                return handleUser.call(this);
            })
            .then(() => {
                logger.fine('Checking License.');
                return handleLicense.call(this);
            })
            .then(() => {
                logger.info('Checking Provision.');
                return handleProvision.call(this);
            })
            .then(() => {
                logger.fine('Done processing system declaration.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing system declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleNTP() {
    if (this.declaration.Common.NTP) {
        const ntp = this.declaration.Common.NTP;
        return this.bigIp.replace(
            PATHS.NTP,
            {
                servers: ntp.servers,
                timezone: ntp.timezone
            }
        );
    }
    return Promise.resolve();
}

function handleDNS() {
    if (this.declaration.Common.DNS) {
        const dns = this.declaration.Common.DNS;
        return this.bigIp.replace(
            PATHS.DNS,
            {
                'name-servers': dns.nameServers,
                search: dns.search || []
            }
        );
    }
    return Promise.resolve();
}

function handleHostname() {
    if (this.declaration.Common.hostname) {
        return this.bigIp.onboard.hostname(this.declaration.Common.hostname);
    }
    return Promise.resolve();
}

function handleUser() {
    if (this.declaration.Common.User) {
        const promises = [];
        const userNames = Object.keys(this.declaration.Common.User);
        userNames.forEach((username) => {
            const user = this.declaration.Common.User[username];
            if (user.userType === 'root' && username === 'root') {
                promises.push(this.bigIp.onboard.password(
                    'root',
                    user.newPassword,
                    user.oldPassword
                ));
            } else if (user.userType === 'regular') {
                promises.push(createOrUpdateUser.call(this, username, user));
            } else {
                // eslint-disable-next-line max-len
                logger.warning(`${username} has userType root. Only the root user can have userType root.`);
            }
        });

        return Promise.all(promises);
    }
    return Promise.resolve();
}

function handleLicense() {
    if (this.declaration.Common.License) {
        const license = this.declaration.Common.License;
        if (license.regKey || license.addOnKeys) {
            return handleRegKey.call(this, license);
        }
        return handleLicensePool.call(this, license);
    }
    return Promise.resolve();
}

function handleRegKey(license) {
    return this.bigIp.onboard.license(
        {
            registrationKey: license.regKey,
            addOnKeys: license.addOnKeys,
            overwrite: license.overwrite
        }
    )
        .then(() => {
            return this.bigIp.active();
        })
        .catch((err) => {
            logger.severe(`Error licensing: ${err}`);
            return Promise.reject(err);
        });
}

function handleLicensePool(license) {
    // If we're using the reachable API, we need a bigIp object
    // that has the right credentials and host IP
    let getBigIp;
    if (license.reachable) {
        getBigIp = new Promise((resolve, reject) => {
            this.bigIp.deviceInfo()
                .then((deviceInfo) => {
                    return doUtil.getBigIp(
                        logger,
                        {
                            host: deviceInfo.managementAddress,
                            user: license.bigIpUsername,
                            password: license.bigIpPassword
                        }
                    );
                })
                .then((bigIp) => {
                    resolve(bigIp);
                })
                .catch((err) => {
                    logger.severe(`Error getting big ip for reachable API: ${err}`);
                    reject(err);
                });
        });
    } else {
        getBigIp = Promise.resolve(this.bigIp);
    }

    return getBigIp
        .then((bigIp) => {
            return bigIp.onboard.licenseViaBigIq(
                license.bigIqHost,
                license.bigIqUsername,
                license.bigIqPassword || license.bigIqPasswordUri,
                license.licensePool,
                license.hypervisor,
                {
                    passwordIsUri: !!license.bigIqPasswordUri,
                    skuKeyword1: license.skuKeyword1,
                    skuKeyword2: license.skuKeyword2,
                    unitOfMeasure: license.unitOfMeasure,
                    noUnreachable: !!license.reachable
                }
            );
        })
        .then(() => {
            return this.bigIp.active();
        });
}

function handleProvision() {
    if (this.declaration.Common.Provision) {
        const provision = this.declaration.Common.Provision;
        return this.bigIp.onboard.provision(provision)
            .then((results) => {
                // If we provisioned something make sure we are active for a while.
                // BIG-IP has a way of reporting active after provisioning, but then
                // flipping to not active. We love you BIG-IP!
                if (results.length > 0) {
                    const activeRequests = [];
                    for (let i = 0; i < 10; i++) {
                        activeRequests.push(
                            {
                                promise: this.bigIp.active
                            }
                        );
                    }
                    return cloudUtil.callInSerial(this.bigIp, activeRequests, 100);
                }
                return Promise.resolve();
            });
    }
    return Promise.resolve();
}

function createOrUpdateUser(username, data) {
    let userEndpoint = '/tm/auth/user';
    if (this.bigIp.isBigIq()) {
        userEndpoint = '/shared/authz/users';
    }

    const body = {
        name: username
    };

    if (data.password) {
        body.password = data.password;
    }

    if (data.shell) {
        body.shell = data.shell;
    }

    if (data.partitionAccess) {
        body['partition-access'] = [];
        Object.keys(data.partitionAccess).forEach((partition) => {
            body['partition-access'].push(
                {
                    name: partition,
                    role: data.partitionAccess[partition].role
                }
            );
        });
    }

    return this.bigIp.createOrModify(userEndpoint, body)
        .then(() => {
            // If we're setting the password for our user, we need to
            // re-initialize the bigIp core
            if (username === this.bigIp.user) {
                return this.bigIp.init(
                    this.bigIp.host,
                    this.bigIp.user,
                    data.password,
                    { port: this.bigIp.port }
                );
            }
            return Promise.resolve();
        })
        .catch((err) => {
            logger.severs(`Error creating/updating user: ${err}`);
            return Promise.reject(err);
        });
}

module.exports = SystemHandler;
