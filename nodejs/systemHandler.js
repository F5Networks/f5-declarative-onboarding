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
    constructor(declaration, bigIp) {
        this.declaration = declaration || {};
        this.bigIp = bigIp;
    }

    process() {
        let promise;

        logger.info('Processing system declaration');

        if (this.declaration.NTP) {
            const ntpContainer = Object.keys(this.declaration.NTP)[0];
            const ntp = this.declaration.NTP[ntpContainer];
            promise = this.bigIp.modify(
                '/tm/sys/ntp',
                {
                    servers: ntp.servers,
                    timezone: ntp.timezone
                }
            );
        } else {
            promise = Promise.resolve();
        }

        return promise
            .then(() => {
                if (this.declaration.DNS) {
                    const dnsContainer = Object.keys(this.declaration.DNS)[0];
                    const dns = this.declaration.DNS[dnsContainer];
                    return this.bigIp.modify(
                        '/tm/sys/dns',
                        {
                            'name-servers': dns.nameServers,
                            search: dns.search
                        }
                    );
                }
                return Promise.resolve();
            })
            .then(() => {
                if (this.declaration.hostname) {
                    return this.bigIp.onboard.hostname(this.declaration.hostname);
                }
                return Promise.resolve();
            })
            .then(() => {
                if (this.declaration.User) {
                    const users = Object.keys(this.declaration.User);
                    const promises = [];
                    users.forEach((username) => {
                        const user = this.declaration.User[username];
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
            })
            .then(() => {
                if (this.declaration.License) {
                    const licenseContainer = Object.keys(this.declaration.License)[0];
                    const license = this.declaration.License[licenseContainer];
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
            })
            .catch((err) => {
                logger.severe(`Error processing system declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

module.exports = SystemHandler;
