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

const fs = require('fs');

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const promiseUtil = require('@f5devcentral/atg-shared-utilities').promiseUtils;

const doUtil = require('./doUtil');
const cryptoUtil = require('./cryptoUtil');
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const EVENTS = require('./sharedConstants').EVENTS;

const ORIGINAL_FILE_POSTFIX = 'DO.orig';

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
     * @param {EventEmitter} - DO event emitter.
     * @param {State} - The doState.
     */
    constructor(declaration, bigIp, eventEmitter, state) {
        this.declaration = declaration;
        this.bigIp = bigIp;
        this.eventEmitter = eventEmitter;
        this.state = state;
        this.logger = new Logger(module, (state || {}).id);
        this.rebootRequired = false;
        this.rollbackInfo = {
            systemHandler: {}
        };
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs. Promise is resolved with
     *                    post-processing directives. See {@link DeclarationHandler}
     *                    for details.
     */
    process() {
        this.logger.fine('Processing system declaration.');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }
        return Promise.resolve()
            .then(() => {
                this.logger.fine('Getting Device-Info.');
                return this.bigIp.deviceInfo()
                    .then((info) => {
                        this.bigIpVersion = info.version;
                        return Promise.resolve();
                    });
            })
            .then(() => {
                this.logger.fine('Checking db variables.');
                return handleDbVars.call(this);
            })
            .then(() => {
                this.logger.fine('Checking DHCP options.');
                return handleDhcpOptions.call(this);
            })
            .then(() => {
                this.logger.fine('Checking management DHCP setting.');
                return handleManagementDhcp.call(this);
            })
            .then((updatedMgmtDhcpSetting) => {
                this.logger.fine('Checking ManagementIp. Hold on to your hats.');
                return handleManagementIp.call(this, updatedMgmtDhcpSetting);
            })
            .then(() => {
                this.logger.fine('Checking ManagementRoute.');
                return handleManagementRoute.call(this);
            })
            .then(() => {
                this.logger.fine('Checking DNS.');
                return handleDNS.call(this);
            })
            .then(() => {
                this.logger.fine('Checking NTP.');
                return handleNTP.call(this);
            })
            .then(() => {
                this.logger.fine('Checking DeviceCertificate.');
                return handleDeviceCertificate.call(this);
            })
            .then(() => {
                this.logger.fine('Checking System.');
                return handleSystem.call(this);
            })
            .then(() => {
                this.logger.fine('Checking Users.');
                return handleUser.call(this);
            })
            .then(() => {
                this.logger.fine('Checking License.');
                return handleLicense.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SNMP.');
                return handleSnmp.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SNMP Users.');
                return handleSnmpUsers.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SNMP Communities.');
                return handleSnmpCommunities.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SNMP Trap Destinations.');
                return handleSnmpTrapDestinations.call(this);
            })
            .then(() => {
                this.logger.fine('Checking Syslog.');
                return handleSyslog.call(this);
            })
            .then(() => {
                this.logger.fine('Checking Traffic Control');
                return handleTrafficControl.call(this);
            })
            .then(() => {
                this.logger.fine('Checking HTTPD');
                return handleHTTPD.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SSHD');
                return handleSSHD.call(this);
            })
            .then(() => {
                this.logger.fine('Checking Disk');
                return handleDisk.call(this);
            })
            .then(() => {
                this.logger.fine('Done processing system declaration.');
                return Promise.resolve({
                    rebootRequired: this.rebootRequired,
                    rollbackInfo: this.rollbackInfo
                });
            })
            .catch((err) => {
                this.logger.severe(`Error processing system declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleDbVars() {
    if (this.declaration.Common.DbVariables) {
        return this.bigIp.onboard.setDbVars(this.declaration.Common.DbVariables);
    }
    return Promise.resolve();
}

function handleDhcpOptions() {
    const dhcpOptionsToDisable = [];
    const common = this.declaration.Common;

    if (common.NTP) {
        dhcpOptionsToDisable.push('ntp-servers');
    }
    if (common.DNS && common.DNS.nameServers) {
        dhcpOptionsToDisable.push('domain-name-servers');
    }
    if (common.DNS && common.DNS.search) {
        // dhclient calls search 'domain-name'
        dhcpOptionsToDisable.push('domain-name');
    }
    if ((common.System && common.System.hostname) || common.hostname) {
        dhcpOptionsToDisable.push('host-name');
    }

    return disableDhcpOptions.call(this, dhcpOptionsToDisable);
}

function handleManagementDhcp() {
    const currentMgmtDhcpSetting = this.state.currentConfig.Common.System.preserveOrigDhcpRoutes ? 'enabled' : 'disabled';

    // DO currently only handles one management ip. If it is a dual-stack setting, leave it alone.
    if (currentMgmtDhcpSetting === 'dhcpv4' || currentMgmtDhcpSetting === 'dhcpv6') {
        return Promise.resolve(currentMgmtDhcpSetting);
    }

    let desiredMgmtIpDhcpSetting;
    let deisredMgmtRouteDhcpSetting;
    let desiredMgmtDhcpSetting;

    if (this.declaration.Common.System && this.declaration.Common.System.mgmtDhcp) {
        desiredMgmtDhcpSetting = this.declaration.Common.System.mgmtDhcp;
        return this.bigIp.modify(
            PATHS.SysGlobalSettings,
            {
                mgmtDhcp: desiredMgmtDhcpSetting
            }
        )
            .then(() => Promise.resolve(desiredMgmtDhcpSetting));
    }

    return Promise.resolve()
        .then(() => getDesiredMgmtIpDhcpSetting.call(this, currentMgmtDhcpSetting))
        .then((desiredSetting) => {
            desiredMgmtIpDhcpSetting = desiredSetting;
        })
        .then(() => getDesiredMgmtRouteDhcpSetting.call(this, currentMgmtDhcpSetting))
        .then((desiredSetting) => {
            deisredMgmtRouteDhcpSetting = desiredSetting;
        })
        .then(() => {
            // If ManagementRoute and ManagementIp disagree, favor disabled as that is safer.
            // Enabling can modify the ManagementIp.
            desiredMgmtDhcpSetting = desiredMgmtIpDhcpSetting === deisredMgmtRouteDhcpSetting ? desiredMgmtIpDhcpSetting : 'disabled';

            if (desiredMgmtDhcpSetting && desiredMgmtDhcpSetting !== currentMgmtDhcpSetting) {
                return this.bigIp.modify(
                    PATHS.SysGlobalSettings,
                    {
                        mgmtDhcp: desiredMgmtDhcpSetting
                    }
                );
            }
            return Promise.resolve();
        })
        .then(() => Promise.resolve(desiredMgmtDhcpSetting || currentMgmtDhcpSetting));
}

function getDesiredMgmtIpDhcpSetting(currentMgmtDhcpSetting) {
    let desiredMgmtDhcp = currentMgmtDhcpSetting;

    if (this.declaration.Common.ManagementIp) {
        // If there are two entries, the one w/ a name property is the new one. The other entry
        // is the old management-ip and should be empty because to ajv it looks like a delete
        const names = Object.keys(this.declaration.Common.ManagementIp);
        const newName = names.find((name) => this.declaration.Common.ManagementIp[name].name);
        if (newName) {
            const mgmtIpInfo = this.declaration.Common.ManagementIp[newName];
            // Determining the mgmt-dhcp setting is tricky. Maybe this is a rollback.
            // As there is no metadata on a management-ip, it is hard to know whether we are
            // rolling back to a management-ip that was static or dynamic. We use the description field
            // to make our best guess. DO defaults the description to something else,
            // so as long as a user didn't put 'configured-by-dhcp' in their own description
            // this should work.
            if (mgmtIpInfo.description) {
                desiredMgmtDhcp = mgmtIpInfo.description.indexOf('configured-by-dhcp') === -1 ? 'disabled' : 'enabled';
            }
        }
    }
    return Promise.resolve(desiredMgmtDhcp);
}

function getDesiredMgmtRouteDhcpSetting(currentMgmtDhcpSetting) {
    let desiredMgmtDhcp = currentMgmtDhcpSetting;

    if (this.declaration.Common.ManagementRoute) {
        // Check to see if we have any entries with name properties
        const names = Object.keys(this.declaration.Common.ManagementRoute);
        const hasRoutes = names.some((name) => typeof this.declaration.Common.ManagementRoute[name].name !== 'undefined');

        if (hasRoutes) {
            const preserveOrigDhcpRoutes = doUtil.getDeepValue(this.declaration.Common, 'InternalUse.System');
            if (typeof preserveOrigDhcpRoutes !== 'undefined') {
                desiredMgmtDhcp = this.declaration.Common.InternalUse.System.preserveOrigDhcpRoutes ? 'enabled' : 'disabled';
            } else {
                desiredMgmtDhcp = 'disabled';
            }
        }
    }
    return Promise.resolve(desiredMgmtDhcp);
}

function handleNTP() {
    if (this.declaration.Common.NTP) {
        const ntp = this.declaration.Common.NTP;
        const promises = (ntp.servers || []).map((server) => doUtil.checkDnsResolution(this.bigIp, server));

        return Promise.all(promises)
            .then(() => this.bigIp.replace(
                PATHS.NTP,
                {
                    servers: ntp.servers,
                    timezone: ntp.timezone
                }
            ));
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

function handleDeviceCertificate() {
    const certificateFullPath = '/config/httpd/conf/ssl.crt/server.crt';
    const keyFullPath = '/config/httpd/conf/ssl.key/server.key';
    const storeOriginalPromise = storeOriginalCertAndKey.call(this, certificateFullPath, keyFullPath);

    if (this.declaration.Common.DeviceCertificate) {
        const certificateName = Object.keys(this.declaration.Common.DeviceCertificate)[0];
        const decryptScript = fs.readFileSync(`${__dirname}/../scripts/decryptConfValue`, 'utf8').toString();
        const writePromises = [];
        let certificatePromise = Promise.resolve();
        let keyPromise = Promise.resolve();
        let newCertificate;
        let newKey;
        let originalCertificate;
        let originalKey;

        // This is too much of a special case for the configManager to get the current state.
        // We need to read server.crt and server.key and compare them to what is in the declaration

        if (certificateName) {
            const certificateDeclaration = this.declaration.Common.DeviceCertificate[certificateName];
            if (certificateDeclaration.certificate) {
                if (certificateDeclaration.certificate.base64) {
                    newCertificate = Buffer.from(
                        certificateDeclaration.certificate.base64,
                        'base64'
                    ).toString().trim();
                }
                if (newCertificate) {
                    let needsWrite = false;
                    certificatePromise = certificatePromise
                        .then(() => doUtil.executeBashCommandIControl(
                            this.bigIp,
                            `cat ${certificateFullPath}`
                        ))
                        .then((data) => {
                            originalCertificate = data.trim();
                            if (newCertificate !== originalCertificate) {
                                needsWrite = true;
                                // Make a copy of the current file in case we need to rollback
                                return storeDeviceCertRollbackInfo.call(this, certificateFullPath);
                            }
                            return Promise.resolve();
                        })
                        .then(() => {
                            if (needsWrite) {
                                writePromises.push(doUtil.executeBashCommandIControl(
                                    this.bigIp,
                                    `echo '${newCertificate}' > ${certificateFullPath}`,
                                    cloudUtil.NO_RETRY,
                                    { silent: true } // keeping it out of the logs just because it's a lot of data
                                ));
                            }
                        });
                }
            }

            if (certificateDeclaration.privateKey) {
                if (certificateDeclaration.privateKey.base64) {
                    newKey = Buffer.from(
                        certificateDeclaration.privateKey.base64,
                        'base64'
                    ).toString().trim();
                }
                if (newKey) {
                    let needsWrite = false;
                    keyPromise = keyPromise
                        .then(() => doUtil.executeBashCommandIControl(
                            this.bigIp,
                            `cat ${keyFullPath}`,
                            null,
                            { silent: true } // keeping it out of the logs because this is the private key
                        ))
                        .then((data) => {
                            originalKey = data.trim();
                            if (newKey !== originalKey) {
                                needsWrite = true;
                                // Make a copy of the current file in case we need to rollback
                                return storeDeviceCertRollbackInfo.call(this, `${keyFullPath}`);
                            }
                            return Promise.resolve();
                        })
                        .then(() => {
                            if (needsWrite) {
                                writePromises.push(
                                    cryptoUtil.encryptValue(newKey, this.bigIp, this.state.id)
                                        .then((results) => doUtil.executeBashCommandIControl(
                                            this.bigIp,
                                            `/usr/bin/php -r '${decryptScript}' '${results}' ${keyFullPath}`
                                        ))
                                );
                            }
                        });
                }
            }

            return Promise.resolve()
                .then(() => storeOriginalPromise)
                .then(() => certificatePromise)
                .then(() => keyPromise)
                .then(() => Promise.all(writePromises))
                .then(() => {
                    if (writePromises.length > 0) {
                        // Really all we need to do is restart httpd but I can't find a way to do that
                        // succesfully. Anything through iControl REST fails on the second restart.
                        this.rebootRequired = true;
                    }
                });
        }
    }
    return storeOriginalPromise
        .then(() => restoreCertAndKey.call(this, certificateFullPath, keyFullPath));
}

function handleSystem() {
    const promises = [];
    const common = this.declaration.Common;
    if (!common) {
        return Promise.resolve();
    }

    const system = common.System;

    const deviceNames = doUtil.getDeepValue(common.InternalUse, 'deviceNames');
    if (deviceNames && Object.keys(deviceNames).length !== 0) {
        // There is some diff in the hostname, so grab what the user put in, or, if that
        // is missing, set both hostname and device name to the current global setting
        if (system && system.hostname) {
            promises.push(this.bigIp.onboard.hostname(system.hostname));
        } else {
            promises.push(this.bigIp.list(PATHS.SysGlobalSettings)
                .then((globalSettings) => {
                    if (globalSettings && globalSettings.hostname) {
                        this.bigIp.onboard.hostname(globalSettings.hostname);
                    }
                }));
        }
    }

    if (system) {
        if (typeof system.consoleInactivityTimeout !== 'undefined') {
            promises.push(this.bigIp.modify(PATHS.SysGlobalSettings,
                { consoleInactivityTimeout: system.consoleInactivityTimeout }));
        }
        if (typeof system.idleTimeout !== 'undefined') {
            promises.push(this.bigIp.modify(PATHS.CLI, { idleTimeout: system.idleTimeout / 60 }));
        }
        if (typeof system.autoPhonehome !== 'undefined') {
            const autoPhonehome = system.autoPhonehome;
            promises.push(this.bigIp.modify(PATHS.SoftwareUpdate, { autoPhonehome }));
        }
        if (typeof system.autoCheck !== 'undefined') {
            const autoCheck = system.autoCheck;
            promises.push(this.bigIp.modify(PATHS.SoftwareUpdate, { autoCheck }));
        }
        if (typeof system.audit !== 'undefined') {
            const audit = system.audit;
            promises.push(this.bigIp.modify(PATHS.CLI, { audit }));
        }
        if (typeof system.mcpAuditLog !== 'undefined') {
            const value = system.mcpAuditLog;
            promises.push(this.bigIp.modify('/tm/sys/db/config.auditing', { value }));
        }
        if (typeof system.guiAudit !== 'undefined'
            && cloudUtil.versionCompare(this.bigIpVersion, '14.0') >= 0) {
            const guiAudit = system.guiAudit;
            promises.push(this.bigIp.modify(PATHS.SysGlobalSettings, { guiAudit }));
        }

        const guiSecuritySettings = {};
        if (typeof system.guiSecurityBanner !== 'undefined') {
            guiSecuritySettings.guiSecurityBanner = system.guiSecurityBanner;
        }
        if (typeof system.guiSecurityBannerText !== 'undefined') {
            guiSecuritySettings.guiSecurityBannerText = system.guiSecurityBannerText;
        }
        if (Object.keys(guiSecuritySettings).length !== 0) {
            promises.push(this.bigIp.modify(PATHS.SysGlobalSettings, guiSecuritySettings));
        }
    }

    return Promise.all(promises);
}

function handleUser() {
    if (this.declaration.Common.User) {
        const promises = [];
        const userNames = Object.keys(this.declaration.Common.User);
        userNames.forEach((username) => {
            const user = this.declaration.Common.User[username];
            if (user.userType === 'root' && username === 'root') {
                promises.push(
                    this.bigIp.onboard.password(
                        'root',
                        user.newPassword,
                        user.oldPassword
                    )
                        .then(() => {
                            // If no keys are provided, skip setting the authorization keys
                            if (!user.keys) {
                                return Promise.resolve();
                            }

                            const sshPath = '/root/.ssh';
                            const catCmd = `cat ${sshPath}/authorized_keys`;
                            return doUtil.executeBashCommandIControl(this.bigIp, catCmd)
                                .then((origAuthKey) => {
                                    const masterKeys = origAuthKey
                                        .split('\n')
                                        .filter((key) => key.endsWith(' Host Processor Superuser'));
                                    if (masterKeys !== '') {
                                        user.keys.unshift(masterKeys);
                                    }
                                    // The initial space is intentional, it is a bash shortcut
                                    // It prevents the command from being saved in bash_history
                                    const echoKeys = [
                                        ` echo '${user.keys.join('\n')}' > `,
                                        `${sshPath}/authorized_keys`
                                    ].join('');
                                    return doUtil.executeBashCommandIControl(this.bigIp, echoKeys);
                                });
                        })
                );
            } else if (user.userType === 'regular') {
                promises.push(
                    createOrUpdateUser.call(this, username, user)
                        .then(() => {
                            // If no keys are provided, skip setting the authorization keys
                            if (!user.keys) {
                                return Promise.resolve();
                            }

                            const sshPath = `/home/${username}/.ssh`;
                            // The initial space is intentional, it is a bash shortcut
                            // It prevents the command from being saved in bash_history
                            const makeSshDir = ` mkdir -p ${sshPath}`;
                            const echoKeys = [
                                `echo '${user.keys.join('\n')}' > `,
                                `${sshPath}/authorized_keys`
                            ].join('');
                            const chownUser = `chown -R "${username}":webusers ${sshPath}`;
                            const chmodUser = `chmod -R 700 ${sshPath}`;
                            const chmodKeys = `chmod 600 ${sshPath}/authorized_keys`;
                            const bashCmd = [
                                makeSshDir, echoKeys, chownUser, chmodUser, chmodKeys
                            ].join('; ');
                            return doUtil.executeBashCommandIControl(this.bigIp, bashCmd);
                        })
                );
            } else {
                this.logger.warning(`${username} has userType root. Only the root user can have userType root.`);
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
        .then(() => this.bigIp.active())
        .catch((err) => {
            const errorLicensing = `Error licensing: ${err.message}`;
            this.logger.severe(errorLicensing);
            err.message = errorLicensing;
            return Promise.reject(err);
        });
}

function handleLicensePool(license) {
    // If we're using the reachable API, we need a bigIp object
    // that has the right credentials and host IP
    let getBigIp;
    let bigIp;
    let currentPlatform;

    let promise = Promise.resolve();
    if (license.bigIqHost) {
        promise = promise.then(() => doUtil.checkDnsResolution(this.bigIp, license.bigIqHost));
    }

    return promise
        .then(() => doUtil.getCurrentPlatform(this.state.id))
        .then((platform) => {
            currentPlatform = platform;

            // We occasionally get an incorrect management IP from device info, so retry this whole thing
            function getMyBigIp() {
                return this.bigIp.deviceInfo()
                    .then((deviceInfo) => doUtil.getBigIp(
                        this.logger,
                        {
                            host: deviceInfo.managementAddress,
                            port: this.bigIp.port,
                            user: license.bigIpUsername,
                            password: license.bigIpPassword,
                            retryOptions: cloudUtil.MEDIUM_RETRY
                        }
                    ))
                    .then((resolvedBigIp) => resolvedBigIp)
                    .catch((err) => {
                        this.logger.severe(`Error getting big ip for reachable API: ${err.message}`);
                        throw err;
                    });
            }

            // If we're running on BIG-IP, get the real address info (since it might be 'localhost'
            // which won't work). Otherwise, assume we can already reach the BIG-IP through
            // it's current address and port (since that is what we've been using to get this far)
            if (currentPlatform === PRODUCTS.BIGIP && license.reachable) {
                getBigIp = cloudUtil.tryUntil(this, cloudUtil.SHORT_RETRY, getMyBigIp);
            } else {
                getBigIp = Promise.resolve(this.bigIp);
            }

            return getBigIp;
        })
        .then((resolvedBigIp) => {
            bigIp = resolvedBigIp;
            let possiblyRevoke = Promise.resolve();

            if (license.revokeFrom) {
                let licenseInfo;
                let licensePoolName;

                if (typeof license.revokeFrom === 'string') {
                    licenseInfo = license;
                    licensePoolName = license.revokeFrom;
                } else {
                    licenseInfo = license.revokeFrom;
                    licensePoolName = license.revokeFrom.licensePool;
                }

                const options = {
                    licensePoolName,
                    bigIqHost: licenseInfo.bigIqHost,
                    bigIqUser: licenseInfo.bigIqUsername,
                    bigIqPassword: licenseInfo.bigIqPassword,
                    bigIqPasswordUri: licenseInfo.bigIqPasswordUri
                };

                // If our license is about to be revoked, let everyone know
                if (licenseInfo.reachable) {
                    this.logger.debug('Waiting for revoke ready');
                    possiblyRevoke = possiblyRevoke.then(() => waitForRevokeReady.call(this));
                    process.nextTick(() => {
                        this.eventEmitter.emit(
                            EVENTS.LICENSE_WILL_BE_REVOKED,
                            this.state.id,
                            licenseInfo.bigIpPassword,
                            licenseInfo.bigIqPassword
                        );
                    });
                }

                possiblyRevoke = possiblyRevoke
                    .then(() => bigIp.onboard.revokeLicenseViaBigIq(
                        options.bigIqHost || 'localhost',
                        options.bigIqUser,
                        options.bigIqPassword || options.bigIqPasswordUri,
                        options.licensePoolName,
                        {
                            bigIqMgmtPort: getBigIqManagementPort.call(this, currentPlatform, licenseInfo),
                            passwordIsUri: !!options.bigIqPasswordUri,
                            authProvider: license.bigIqAuthProvider,
                            noUnreachable: !!license.reachable,
                            chargebackTag: license.chargebackTag
                        }
                    ))
                    .then(() => {
                        // If our license is revoked, wait for restart
                        if (licenseInfo.reachable) {
                            return promiseUtil.delay(120000);
                        }
                        return Promise.resolve();
                    });
            } else {
                possiblyRevoke = Promise.resolve();
            }

            return possiblyRevoke;
        })
        .then(() => {
            if (license.licensePool) {
                let bigIpMgmtAddress;

                // If we're running on BIG-IQ or a container, we know our host info
                // is correct and reachable, so use it, otherwise, let licensing code figure it out
                if (currentPlatform !== PRODUCTS.BIGIP) {
                    bigIpMgmtAddress = bigIp.host;
                }

                return bigIp.onboard.licenseViaBigIq(
                    license.bigIqHost || 'localhost',
                    license.bigIqUsername,
                    license.bigIqPassword || license.bigIqPasswordUri,
                    license.licensePool,
                    license.hypervisor,
                    {
                        bigIpMgmtAddress,
                        bigIqMgmtPort: getBigIqManagementPort.call(this, currentPlatform, license),
                        passwordIsUri: !!license.bigIqPasswordUri,
                        authProvider: license.bigIqAuthProvider,
                        skuKeyword1: license.skuKeyword1,
                        skuKeyword2: license.skuKeyword2,
                        unitOfMeasure: license.unitOfMeasure,
                        noUnreachable: !!license.reachable,
                        chargebackTag: license.chargebackTag,
                        overwrite: !!license.overwrite,
                        autoApiType: true,
                        tenant: license.tenant
                    }
                );
            }

            return Promise.resolve();
        })
        .then(() => {
            // Don't try to check for active state if we only revoked
            // An unlicensed device will return OFFLINE status
            if (typeof license.licensePool === 'undefined') {
                return Promise.resolve();
            }
            return this.bigIp.active();
        })
        .catch((err) => Promise.reject(err));
}

function handleManagementIp(mgmtDhcp) {
    if (this.declaration.Common.ManagementIp) {
        // If there are two entries, the one w/ a name property is the new one. The other entry
        // is the old management-ip and should be empty because to ajv it looks like a delete
        const names = Object.keys(this.declaration.Common.ManagementIp);
        const newName = names.find((name) => this.declaration.Common.ManagementIp[name].name);
        if (newName) {
            const mgmtIpInfo = this.declaration.Common.ManagementIp[newName];
            const address = mgmtIpInfo.name;
            return Promise.resolve()
                .then(() => {
                    // If we are only changing the mask and on localhost, delete the managementIp first.
                    // This allows for just changing the mask - otherwise, MCP complains that the address
                    // already exists. But if we're not on localhost, we can't pre-delete as we won't be
                    // able to send the next request, so error on that.
                    const currentAddress = getCurrentManagementAddress(
                        this.state.currentConfig.Common.ManagementIp
                    );
                    if (mgmtDhcp === 'disabled' && isMaskChangeOnly(currentAddress, address)) {
                        if (this.bigIp.host === 'localhost') {
                            return this.bigIp.delete(`${PATHS.ManagementIp}/${currentAddress.replace('/', '~')}`);
                        }
                        return Promise.reject(new Error('Changing just the management IP mask is not supported unless running locally on a BIG-IP'));
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    const currentAddress = getCurrentManagementAddress(
                        this.state.currentConfig.Common.ManagementIp
                    );
                    const currentDescription = getCurrentManagementDescription(
                        this.state.currentConfig.Common.ManagementIp,
                        currentAddress
                    );
                    // In case of ManagementIP in declaration is the same as one in current state,
                    // don't create and proceed.
                    if (mgmtDhcp === 'disabled' && currentAddress !== address) {
                        return this.bigIp.create(
                            PATHS.ManagementIp,
                            {
                                name: address,
                                description: mgmtIpInfo.description
                            }
                        );
                    }
                    // If it is just a description change...
                    if (mgmtDhcp === 'disabled'
                        && mgmtIpInfo.description
                        && currentDescription !== mgmtIpInfo.description) {
                        return this.bigIp.modify(
                            `${PATHS.ManagementIp}/${address.replace('/', '~')}`,
                            {
                                description: mgmtIpInfo.description
                            }
                        );
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    if (this.bigIp.host !== 'localhost') {
                        return this.bigIp.setHost(address.split('/')[0]);
                    }
                    return Promise.resolve();
                });
        }
    }
    return Promise.resolve();
}

function handleManagementRoute() {
    if (this.declaration.Common.ManagementRoute) {
        let promises = [];
        return Promise.resolve()
            .then(() => {
                Object.keys(this.state.currentConfig.Common.ManagementRoute || []).forEach((name) => {
                    let promise = Promise.resolve();
                    const declManagementRoute = this.declaration.Common.ManagementRoute[name]
                        && this.declaration.Common.ManagementRoute[name].name;
                    const isRename = Object.keys(this.declaration.Common.ManagementRoute)
                        .find((key) => this.declaration.Common.ManagementRoute[key].name !== name
                            && this.declaration.Common.ManagementRoute[key].network === this.state
                                .currentConfig.Common.ManagementRoute[name].network);

                    if (!declManagementRoute && isRename) {
                        promise = promise.then(() => this.bigIp.delete(
                            `${PATHS.ManagementRoute}/~Common~${name}`,
                            null,
                            null,
                            cloudUtil.NO_RETRY
                        ));
                    }
                    promises.push(promise);
                });

                return Promise.all(promises)
                    .catch((err) => {
                        this.logger.severe(`Error deleting existing ManagementRoute: ${err.message}`);
                        throw err;
                    });
            })
            .then(() => doUtil.getCurrentPlatform(this.state.id))
            .then((platform) => {
                promises = [];
                doUtil.forEach(this.declaration, 'ManagementRoute', (tenant, managementRoute) => {
                    let promise = Promise.resolve();
                    if (managementRoute && managementRoute.name) {
                        const mask = managementRoute.network.includes(':') ? 128 : 32;
                        managementRoute.network = managementRoute.network !== 'default'
                            && managementRoute.network !== 'default-inet6' && !managementRoute.network.includes('/')
                            ? `${managementRoute.network}/${mask}` : managementRoute.network;
                        // Need to do a delete if the network property is updated
                        if (this.state.currentConfig.Common.ManagementRoute
                            && this.state.currentConfig.Common.ManagementRoute[managementRoute.name]
                            && this.state.currentConfig.Common.ManagementRoute[managementRoute.name]
                                .network !== managementRoute.network) {
                            if (platform !== 'BIG-IP') {
                                throw new Error('Cannot update network property when running remotely');
                            }
                            promise = promise.then(() => this.bigIp.delete(
                                `${PATHS.ManagementRoute}/~Common~${managementRoute.name.replace(/\//g, '~')}`,
                                null,
                                null,
                                cloudUtil.NO_RETRY
                            ));
                        }

                        const routeBody = {
                            name: managementRoute.name,
                            description: managementRoute.description,
                            partition: tenant,
                            gateway: managementRoute.gateway,
                            network: managementRoute.network,
                            mtu: managementRoute.mtu,
                            type: managementRoute.type
                        };

                        promise = promise.then(() => this.bigIp.createOrModify(
                            PATHS.ManagementRoute, routeBody, null, cloudUtil.MEDIUM_RETRY
                        ));
                    }

                    promises.push(promise);
                });

                return Promise.all(promises)
                    .catch((err) => {
                        this.logger.severe(`Error creating management routes: ${err.message}`);
                        throw err;
                    });
            });
    }
    return Promise.resolve();
}

function handleSnmp() {
    let promise = Promise.resolve();

    const agent = this.declaration.Common.SnmpAgent;
    const trapEvents = this.declaration.Common.SnmpTrapEvents;

    if (agent) {
        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpAgent,
            {
                sysContact: agent.sysContact,
                sysLocation: agent.sysLocation,
                allowedAddresses: agent.allowedAddresses,
                snmpv1: agent.snmpv1,
                snmpv2c: agent.snmpv2c
            }
        ));
    }

    if (trapEvents) {
        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpTrapEvents,
            {
                agentTrap: trapEvents.agentTrap,
                authTrap: trapEvents.authTrap,
                bigipTraps: trapEvents.bigipTraps
            }
        ));
    }

    return promise;
}

function handleSnmpUsers() {
    let promise = Promise.resolve();

    doUtil.forEach(this.declaration, 'SnmpUser', (tenant, snmpUser) => {
        if (snmpUser && snmpUser.name) {
            const user = JSON.parse(JSON.stringify(snmpUser));

            if (user.authPassword) {
                user.securityLevel = user.privacyPassword ? 'auth-privacy' : 'auth-no-privacy';
            } else {
                user.securityLevel = 'no-auth-no-privacy';
            }

            // 'none' is only a valid option for 14.0+
            if (cloudUtil.versionCompare(this.bigIpVersion, '14.0') >= 0) {
                user.authPassword = user.authPassword || 'none';
                user.privacyPassword = user.privacyPassword || 'none';
            }

            promise = promise.then(() => this.bigIp.createOrModify(
                PATHS.SnmpUser,
                user
            ));
        }
    });

    return promise;
}

function handleSnmpCommunities() {
    let promise = Promise.resolve();

    doUtil.forEach(this.declaration, 'SnmpCommunity', (tenant, snmpCommunity) => {
        if (snmpCommunity && snmpCommunity.name) {
            const community = JSON.parse(JSON.stringify(snmpCommunity));

            promise = promise.then(() => this.bigIp.createOrModify(
                PATHS.SnmpCommunity,
                community
            ));
        }
    });

    return promise;
}

function handleSnmpTrapDestinations() {
    let promise = Promise.resolve();

    doUtil.forEach(this.declaration, 'SnmpTrapDestination', (tenant, snmpTrapDestination) => {
        if (snmpTrapDestination && snmpTrapDestination.name) {
            const destination = JSON.parse(JSON.stringify(snmpTrapDestination));
            destination.securityLevel = 'no-auth-no-privacy';

            if (destination.authPassword) {
                destination.securityLevel = 'auth-no-privacy';
            }

            if (destination.privacyPassword) {
                destination.securityLevel = 'auth-privacy';
            }

            if (destination.network !== 'mgmt') {
                destination.network = (destination.network === 'management') ? 'mgmt' : 'other';
            }

            // 'none' is only a valid option for 14.0+
            if (cloudUtil.versionCompare(this.bigIpVersion, '14.0') >= 0) {
                destination.authPassword = destination.authPassword || 'none';
                destination.privacyPassword = destination.privacyPassword || 'none';
            }

            promise = promise.then(() => this.bigIp.createOrModify(
                PATHS.SnmpTrapDestination,
                destination
            ));
        }
    });

    return promise;
}

function handleSyslog() {
    if (!this.declaration.Common || !this.declaration.Common.SyslogRemoteServer) {
        return Promise.resolve();
    }

    const remoteServers = Object.keys(this.declaration.Common.SyslogRemoteServer).map(
        (logName) => this.declaration.Common.SyslogRemoteServer[logName]
    );

    if (remoteServers.length === 0) {
        return Promise.resolve();
    }

    const syslog = {
        name: 'syslogRemoteServer',
        remoteServers
    };

    return this.bigIp.modify(PATHS.Syslog, syslog);
}

function handleTrafficControl() {
    if (!this.declaration.Common || !this.declaration.Common.TrafficControl) {
        return Promise.resolve();
    }

    const trafficCtrl = this.declaration.Common.TrafficControl;

    const trafficControlObj = {
        acceptIpOptions: trafficCtrl.acceptIpOptions,
        acceptIpSourceRoute: trafficCtrl.acceptIpSourceRoute,
        allowIpSourceRoute: trafficCtrl.allowIpSourceRoute,
        continueMatching: trafficCtrl.continueMatching,
        maxIcmpRate: trafficCtrl.maxIcmpRate,
        portFindLinear: trafficCtrl.portFindLinear,
        portFindRandom: trafficCtrl.portFindRandom,
        maxRejectRate: trafficCtrl.maxRejectRate,
        maxRejectRateTimeout: trafficCtrl.maxRejectRateTimeout,
        minPathMtu: trafficCtrl.minPathMtu,
        pathMtuDiscovery: trafficCtrl.pathMtuDiscovery,
        portFindThresholdWarning: trafficCtrl.portFindThresholdWarning,
        portFindThresholdTrigger: trafficCtrl.portFindThresholdTrigger,
        portFindThresholdTimeout: trafficCtrl.portFindThresholdTimeout,
        rejectUnmatched: trafficCtrl.rejectUnmatched
    };

    return this.bigIp.modify(PATHS.TrafficControl, trafficControlObj)
        .catch((err) => {
            const errorTrafficControl = `Error modifying traffic control settings: ${err.message}`;
            this.logger.severe(errorTrafficControl);
            err.message = errorTrafficControl;
            return Promise.reject(err);
        });
}

function handleHTTPD() {
    if (this.declaration.Common && this.declaration.Common.HTTPD) {
        const httpd = this.declaration.Common.HTTPD;
        // allow defaults to 'All' on BIGIP but can be either 'all' or 'All'.  For consistency with other schema enums
        // and BIGIP's default let's always use 'all' with the user and 'All' with BIGIP.
        if (Array.isArray(httpd.allow)) {
            httpd.allow = httpd.allow.map((item) => (item === 'all' ? 'All' : item));
        } else if (httpd.allow === 'all') {
            // This should already be an array by the time it gets here, but let's
            // just make sure
            httpd.allow = ['All'];
        }

        let cipherString = '';
        if (httpd.sslCiphersuite) {
            cipherString = httpd.sslCiphersuite.join(':');
        }
        return this.bigIp.modify(
            PATHS.HTTPD,
            {
                allow: httpd.allow,
                authPamIdleTimeout: httpd.authPamIdleTimeout,
                maxClients: httpd.maxClients,
                sslCiphersuite: cipherString,
                sslProtocol: httpd.sslProtocol

            }
        ).catch((err) => {
            const errorHTTPD = `Error modifying HTTPD settings: ${err.message}`;
            this.logger.severe(errorHTTPD);
            err.message = errorHTTPD;
            return Promise.reject(err);
        });
    }
    return Promise.resolve();
}

function handleSSHD() {
    if (!this.declaration.Common || !this.declaration.Common.SSHD) {
        return Promise.resolve();
    }

    const sshd = this.declaration.Common.SSHD;
    let includeString = '';

    if (sshd.ciphers) {
        includeString = includeString.concat(`Ciphers ${sshd.ciphers.join(',')}\n`);
    }
    if (sshd.kexAlgorithms) {
        includeString = includeString.concat(`KexAlgorithms ${sshd.kexAlgorithms.join(',')}\n`);
    }
    if (sshd.loginGraceTime) {
        includeString = includeString.concat(`LoginGraceTime ${sshd.loginGraceTime}\n`);
    }
    if (sshd.MACS) {
        includeString = includeString.concat(`MACs ${sshd.MACS.join(',')}\n`);
    }
    if (sshd.maxAuthTries) {
        includeString = includeString.concat(`MaxAuthTries ${sshd.maxAuthTries}\n`);
    }
    if (sshd.maxStartups) {
        includeString = includeString.concat(`MaxStartups ${sshd.maxStartups}\n`);
    }
    if (sshd.protocol) {
        includeString = includeString.concat(`Protocol ${sshd.protocol}\n`);
    }

    // capitalize for consistency with HTTPD.allow; if array, capitalization is left to user
    sshd.allow = sshd.allow === 'all' ? ['All'] : sshd.allow;

    const sshdObj = {
        allow: sshd.allow,
        banner: sshd.bannerText ? 'enabled' : 'disabled',
        bannerText: sshd.bannerText,
        include: includeString,
        inactivityTimeout: sshd.inactivityTimeout
    };

    return this.bigIp.modify(PATHS.SSHD, sshdObj)
        .catch((err) => {
            const errorSSHD = `Error modifying SSHD settings: ${err.message}`;
            this.logger.severe(errorSSHD);
            err.message = errorSSHD;
            return Promise.reject(err);
        });
}

function handleDisk() {
    if (!this.declaration.Common || !this.declaration.Common.Disk) {
        return Promise.resolve();
    }

    let promise = Promise.resolve();

    Object.keys(this.declaration.Common.Disk).forEach((directory) => {
        if (this.state.currentConfig.Common.Disk
            && this.state.currentConfig.Common.Disk[directory]
            && this.declaration.Common.Disk[directory] <= this.state.currentConfig.Common.Disk[directory]) {
            throw new Error('Disk size must be larger than current size.');
        }

        if (directory === 'applicationData') {
            promise = promise.then(doUtil.executeBashCommandIControl(this.bigIp,
                `tmsh modify /sys disk directory /appdata new-size ${this.declaration.Common.Disk[directory]}`));
        }
    });

    return promise.then(() => this.bigIp.save())
        .then(() => {
            this.eventEmitter.emit(
                EVENTS.REBOOT_NOW,
                this.state.id
            );
            return doUtil.waitForReboot(this.bigIp, this.state.id);
        })
        .catch((err) => {
            const errorDisk = `Error modifying Disk: ${err.message}`;
            this.logger.severe(errorDisk);
            err.message = errorDisk;
            return Promise.reject(err);
        });
}

function createOrUpdateUser(username, data) {
    let userEndpoint = PATHS.User;
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
            this.logger.severe(`Error creating/updating user: ${err.message}`);
            return Promise.reject(err);
        });
}

function disableDhcpOptions(optionsToDisable) {
    let requiresDhcpRestart = false;

    return this.bigIp.list(
        PATHS.ManagementDHCPConfig
    )
        .then((dhcpOptions) => {
            if (!dhcpOptions || !dhcpOptions.requestOptions) {
                return Promise.resolve();
            }

            const currentOptions = dhcpOptions.requestOptions;
            const newOptions = currentOptions.filter((option) => optionsToDisable.indexOf(option) === -1);

            if (currentOptions.length === newOptions.length) {
                return Promise.resolve();
            }

            requiresDhcpRestart = true;
            return this.bigIp.modify(
                PATHS.ManagementDHCPConfig,
                {
                    requestOptions: newOptions
                }
            );
        })
        .then(() => {
            if (requiresDhcpRestart) {
                return restartDhcp.call(this);
            }
            return Promise.resolve();
        });
}

function getBigIqManagementPort(currentPlatform, license) {
    let bigIqMgmtPort;
    // If we're on BIG-IQ and we're going to license from this device
    // set up for no auth via port 8100
    if (currentPlatform === PRODUCTS.BIGIQ
        && (!license.bigIqHost || license.bigIqHost === 'localhost')) {
        bigIqMgmtPort = 8100;
    }
    return bigIqMgmtPort;
}

function restartDhcp() {
    // If DHCP is disabled on the device do NOT attempt to restart it
    return this.bigIp.list(PATHS.SysGlobalSettings)
        .then((globalSettings) => globalSettings && globalSettings.mgmtDhcp === 'enabled')
        .then((canRestartDhcp) => {
            if (canRestartDhcp) {
                return doUtil.restartService(this.bigIp, 'dhclient', { taskId: this.state.id });
            }
            return Promise.resolve();
        });
}

/**
 * If copies of the original device cert and key do not exist, create them.
 * This is needed so we can restore them in the case that a declaration
 * is posted w/o cert and key and we need to restore the original.
 *
 * @param {String} certFullPath - Full path to device certificate
 * @param {String} keyFullPath - Full path to device key
 */
function storeOriginalCertAndKey(certFullPath, keyFullPath) {
    const originalCertPath = `${certFullPath}.${ORIGINAL_FILE_POSTFIX}`;
    const originalKeyPath = `${keyFullPath}.${ORIGINAL_FILE_POSTFIX}`;
    return doUtil.executeBashCommandIControl(
        this.bigIp,
        `ls ${originalCertPath}`
    )
        .then((result) => {
            if (result.indexOf('No such file or directory') > -1) {
                return doUtil.executeBashCommandIControl(
                    this.bigIp,
                    `cp ${certFullPath} ${certFullPath}.${ORIGINAL_FILE_POSTFIX}`
                );
            }
            return Promise.resolve();
        })
        .then(() => doUtil.executeBashCommandIControl(
            this.bigIp,
            `ls ${originalKeyPath}`
        ))
        .then((result) => {
            if (result.indexOf('No such file or directory') > -1) {
                return doUtil.executeBashCommandIControl(
                    this.bigIp,
                    `cp ${keyFullPath} ${keyFullPath}.${ORIGINAL_FILE_POSTFIX}`
                );
            }
            return Promise.resolve();
        });
}

function restoreCertAndKey(certFullPath, keyFullPath) {
    if (this.state
        && this.state.rollbackInfo
        && this.state.rollbackInfo.systemHandler
        && this.state.rollbackInfo.systemHandler.deviceCertificate) {
        return rollbackCertAndKey.call(this);
    }
    return restoreOriginalCertAndKey.call(this, certFullPath, keyFullPath);
}

function rollbackCertAndKey() {
    const files = this.state.rollbackInfo.systemHandler.deviceCertificate.files;
    const copyPromises = files.reduce((acc, curr) => {
        acc.push(copyFiles.call(this, curr.from, curr.to));
        return acc;
    }, []);
    return Promise.all(copyPromises)
        .then(() => {
            if (copyPromises.length > 0) {
                this.rebootRequired = true;
            }
        });
}

/**
 * Restores the original device cert and key if they are different
 * from the current cert and key
 *
 * @param {String} certFullPath - Full path to device certificate
 * @param {String} keyFullPath - Full path to device key
 */
function restoreOriginalCertAndKey(certFullPath, keyFullPath) {
    const originalCertPath = `${certFullPath}.${ORIGINAL_FILE_POSTFIX}`;
    const originalKeyPath = `${keyFullPath}.${ORIGINAL_FILE_POSTFIX}`;
    let certWritten = false;
    let keyWritten = false;
    return Promise.resolve()
        .then(() => areFilesDifferent.call(this, originalCertPath, certFullPath))
        .then((different) => {
            if (different) {
                certWritten = true;
                return storeDeviceCertRollbackInfo.call(this, certFullPath);
            }
            return Promise.resolve();
        })
        .then(() => {
            if (certWritten) {
                return copyFiles.call(this, originalCertPath, certFullPath);
            }
            return Promise.resolve(true);
        })
        .then(() => areFilesDifferent.call(this, originalKeyPath, keyFullPath))
        .then((different) => {
            if (different) {
                keyWritten = true;
                return storeDeviceCertRollbackInfo.call(this, keyFullPath);
            }
            return Promise.resolve();
        })
        .then(() => {
            if (keyWritten) {
                return copyFiles.call(this, originalKeyPath, keyFullPath);
            }
            return Promise.resolve();
        })
        .then(() => {
            if (certWritten || keyWritten) {
                // Really all we need to do is restart httpd but I can't find a way to do that
                // succesfully. Anything through iControl REST fails on the second restart.
                this.rebootRequired = true;
            }
        });
}

/**
 * Makes backup of files in case we need to roll them back.
 *
 * @param {String} originalFile - Full path to file we might rollback.
 *
 * @returns {Promise} A promise which resolves with info on what files
 *                    to rollback. Data in resolved promise is
 *     {
 *         from: 'full_path_to_copy_from_during_rollback,
 *         to: 'full_path_to_copy_to_during_rollback
 *     }
 */
function storeDeviceCertRollbackInfo(originalFile) {
    return doUtil.executeBashCommandIControl(
        this.bigIp,
        `cp ${originalFile} ${originalFile}.DO.bak`
    )
        .then(() => {
            if (!this.rollbackInfo.systemHandler.deviceCertificate) {
                this.rollbackInfo.systemHandler.deviceCertificate = {
                    files: []
                };
            }
            this.rollbackInfo.systemHandler.deviceCertificate.files.push({
                from: `${originalFile}.DO.bak`,
                to: `${originalFile}`
            });
        });
}

function waitForRevokeReady() {
    const REVOKE_READY_TIMEOUT = 30000; // 30 seconds
    this.eventEmitter.removeAllListeners(EVENTS.READY_FOR_REVOKE);
    return new Promise((resolve, reject) => {
        const readyTimer = setTimeout(() => {
            reject(new Error('Timed out waiting for revoke ready event'));
        }, REVOKE_READY_TIMEOUT);
        this.eventEmitter.on(EVENTS.READY_FOR_REVOKE, () => {
            this.logger.debug('Ready for revoke');
            clearTimeout(readyTimer);
            resolve();
        });
    });
}

/**
 * Copies file from 'from' to 'to'
 *
 * @param {String} from - Full path of file to copy from
 * @param {String} to - Full path of file to copy to
 *
 * @returns {Promise} A promise which is resolved if successful and rejected otherwise.
 */
function copyFiles(from, to) {
    return doUtil.executeBashCommandIControl(this.bigIp, `cp ${from} ${to}`);
}

/**
 * Compares two files to see if they are different
 *
 * @param {String} fileA - Full path of one file
 * @param {String} fileB - Full path of the other file
 *
 * @returns {Promise} A promise which is resolved with 'true' if files
 *                    are different and false otherwise.
 */
function areFilesDifferent(fileA, fileB) {
    return doUtil.executeBashCommandIControl(this.bigIp, `diff ${fileB} ${fileA}`)
        .then((result) => {
            if (result && result.indexOf('No such file or directory') === -1) {
                return Promise.resolve(true);
            }
            return Promise.resolve(false);
        });
}

function getCurrentManagementAddress(managementIpInfo) {
    return Object.keys(managementIpInfo)[0];
}

function getCurrentManagementDescription(managementIpInfo, address) {
    return managementIpInfo[address].description;
}

function isMaskChangeOnly(oldAddress, newAddress) {
    const oldIp = oldAddress.split('/')[0];
    const oldMask = oldAddress.split('/')[1];
    const newIp = newAddress.split('/')[0];
    const newMask = newAddress.split('/')[1];

    return (oldIp === newIp) && (oldMask !== newMask);
}

module.exports = SystemHandler;
