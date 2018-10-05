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

const Logger = require('./logger');

const logger = new Logger(module);

class SystemHandler {
    constructor(declarationInfo, bigIp) {
        this.declaration = declarationInfo.parsedDeclaration;
        this.bigIp = bigIp;
    }

    process() {
        logger.fine('Processing system components');
        logger.fine('Checking NTP');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }

        return handleNTP.call(this)
            .then(() => {
                logger.fine('Checking DNS');
                return handleDNS.call(this);
            })
            .then(() => {
                logger.fine('Checking hostname');
                return handleHostname.call(this);
            })
            .then(() => {
                logger.fine('Checking Users');
                return handleUser.call(this);
            })
            .then(() => {
                logger.fine('Checking License');
                return handleLicense.call(this);
            })
            .then(() => {
                logger.fine('Done processing system declaration');
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
        const ntpContainer = Object.keys(this.declaration.Common.NTP)[0];
        const ntp = this.declaration.Common.NTP[ntpContainer];
        return this.bigIp.modify(
            '/tm/sys/ntp',
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
        const dnsContainer = Object.keys(this.declaration.Common.DNS)[0];
        const dns = this.declaration.Common.DNS[dnsContainer];
        return this.bigIp.modify(
            '/tm/sys/dns',
            {
                'name-servers': dns.nameServers,
                search: dns.search
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
                // TODO: parse partitions
                if (!user.partitionAccess || !user.partitionAccess.Common) {
                    user.partitionAccess = {
                        Common: {}
                    };
                }
                promises.push(this.bigIp.onboard.updateUser(
                    username,
                    user.password,
                    user.partitionAccess.Common.role, // TODO: parse partitions
                    user.shell
                ));
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
        const licenseContainer = Object.keys(this.declaration.Common.License)[0];
        const license = this.declaration.Common.License[licenseContainer];
        if (license.regKey || license.addOnKeys) {
            return this.bigIp.onboard.license(
                {
                    registrationKey: license.regKey,
                    addOnKeys: license.addOnKeys,
                    overwrite: license.overwrite
                }
            );
        }
    }
    return Promise.resolve();
}

module.exports = SystemHandler;
