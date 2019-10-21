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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const doUtil = require('./doUtil');
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const EVENTS = require('./sharedConstants').EVENTS;

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
     * @param {EventEmitter} - DO event emitter.
     * @param {State} - The doState.
     */
    constructor(declaration, bigIp, eventEmitter, state) {
        this.declaration = declaration;
        this.bigIp = bigIp;
        this.eventEmitter = eventEmitter;
        this.state = state;
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

        logger.fine('Checking db variables.');
        return handleDbVars.call(this)
            .then(() => {
                logger.fine('Checking DNS.');
                return handleDNS.call(this);
            })
            .then(() => {
                logger.fine('Checking NTP.');
                return handleNTP.call(this);
            })
            .then(() => {
                logger.fine('Checking ManagementRoute.');
                return handleManagementRoute.call(this);
            })
            .then(() => {
                logger.fine('Checking System.');
                return handleSystem.call(this);
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
                logger.fine('Checking SNMP.');
                return handleSnmp.call(this);
            })
            .then(() => {
                logger.fine('Checking Syslog.');
                return handleSyslog.call(this);
            })
            .then(() => {
                logger.fine('Checking Traffic Control');
                return handleTrafficControl.call(this);
            })
            .then(() => {
                logger.fine('Checking HTTPD');
                return handleHTTPD.call(this);
            })
            .then(() => {
                logger.fine('Checking SSHD');
                return handleSSHD.call(this);
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

function handleDbVars() {
    if (this.declaration.Common.DbVariables) {
        return this.bigIp.onboard.setDbVars(this.declaration.Common.DbVariables);
    }
    return Promise.resolve();
}

function handleNTP() {
    if (this.declaration.Common.NTP) {
        const ntp = this.declaration.Common.NTP;
        const promises = (ntp.servers || []).map(server => doUtil.checkDnsResolution(server));

        return Promise.all(promises)
            .then(() => disableDhcpOptions.call(this, ['ntp-servers']))
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
        const dhcpOptionsToDisable = [];

        if (dns.nameServers) {
            dhcpOptionsToDisable.push('domain-name-servers');
        }
        if (dns.search) {
            // dhclient calls search 'domain-name'
            dhcpOptionsToDisable.push('domain-name');
        }

        return disableDhcpOptions.call(this, dhcpOptionsToDisable)
            .then(() => this.bigIp.replace(
                PATHS.DNS,
                {
                    'name-servers': dns.nameServers,
                    search: dns.search || []
                }
            ));
    }
    return Promise.resolve();
}

function handleSystem() {
    const promises = [];
    const common = this.declaration.Common;
    if (!common) {
        return Promise.resolve();
    }

    // Handle both 'hostname' and 'System.hostname'
    const system = common.System;
    let hostname;
    if (system && system.hostname) {
        hostname = system.hostname;
        delete system.hostname;
    } else if (common.hostname) {
        hostname = common.hostname;
    }
    if (hostname) {
        promises.push(this.bigIp.onboard.hostname(hostname));
    }

    if (system) {
        if (typeof system.consoleInactivityTimeout !== 'undefined') {
            promises.push(this.bigIp.modify(PATHS.System,
                { consoleInactivityTimeout: system.consoleInactivityTimeout }));
        }
        if (typeof system.cliInactivityTimeout !== 'undefined') {
            promises.push(this.bigIp.modify(PATHS.CLI, { idleTimeout: system.cliInactivityTimeout / 60 }));
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
                            const sshPath = '/root/.ssh';
                            const catCmd = `cat ${sshPath}/authorized_keys`;
                            return doUtil.executeBashCommandRemote(this.bigIp, catCmd)
                                .then((origAuthKey) => {
                                    const masterKeys = origAuthKey
                                        .split('\n')
                                        .filter(key => key.endsWith(' Host Processor Superuser'));
                                    if (masterKeys !== '') {
                                        user.keys.unshift(masterKeys);
                                    }
                                    // The initial space is intentional, it is a bash shortcut
                                    // It prevents the command from being saved in bash_history
                                    const echoKeys = [
                                        ` echo '${user.keys.join('\n')}' > `,
                                        `${sshPath}/authorized_keys`
                                    ].join('');
                                    return doUtil.executeBashCommandRemote(this.bigIp, echoKeys);
                                });
                        })
                );
            } else if (user.userType === 'regular') {
                promises.push(
                    createOrUpdateUser.call(this, username, user)
                        .then(() => {
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
                            doUtil.executeBashCommandRemote(this.bigIp, bashCmd);
                        })
                );
            } else {
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
        .then(() => this.bigIp.active())
        .catch((err) => {
            const errorLicensing = `Error licensing: ${err.message}`;
            logger.severe(errorLicensing);
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
        promise = promise.then(() => doUtil.checkDnsResolution(license.bigIqHost));
    }

    return promise
        .then(() => doUtil.getCurrentPlatform())
        .then((platform) => {
            currentPlatform = platform;

            // If we're running on BIG-IP, get the real address info (since it might be 'localhost'
            // which won't work). Otherwise, assume we can already reach the BIG-IP through
            // it's current address and port (since that is what we've been using to get this far)
            if (currentPlatform === PRODUCTS.BIGIP && license.reachable) {
                getBigIp = new Promise((resolve, reject) => {
                    this.bigIp.deviceInfo()
                        .then(deviceInfo => doUtil.getBigIp(
                            logger,
                            {
                                host: deviceInfo.managementAddress,
                                port: this.bigIp.port,
                                user: license.bigIpUsername,
                                password: license.bigIpPassword
                            }
                        ))
                        .then((resolvedBigIp) => {
                            resolve(resolvedBigIp);
                        })
                        .catch((err) => {
                            logger.severe(`Error getting big ip for reachable API: ${err.message}`);
                            reject(err);
                        });
                });
            } else {
                getBigIp = Promise.resolve(this.bigIp);
            }

            return getBigIp;
        })
        .then((resolvedBigIp) => {
            bigIp = resolvedBigIp;
            let possiblyRevoke;

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
                    this.eventEmitter.emit(
                        EVENTS.DO_LICENSE_REVOKED,
                        this.state.id,
                        licenseInfo.bigIpPassword,
                        licenseInfo.bigIqPassword
                    );
                }

                possiblyRevoke = bigIp.onboard.revokeLicenseViaBigIq(
                    options.bigIqHost || 'localhost',
                    options.bigIqUser,
                    options.bigIqPassword || options.bigIqPasswordUri,
                    options.licensePoolName,
                    {
                        bigIqMgmtPort: getBigIqManagementPort.call(this, currentPlatform, licenseInfo),
                        passwordIsUri: !!options.bigIqPasswordUri,
                        noUnreachable: !!license.reachable
                    }
                );
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
                        skuKeyword1: license.skuKeyword1,
                        skuKeyword2: license.skuKeyword2,
                        unitOfMeasure: license.unitOfMeasure,
                        noUnreachable: !!license.reachable,
                        overwrite: !!license.overwrite,
                        autoApiType: true
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
        .catch(err => Promise.reject(err));
}

function handleManagementRoute() {
    const promises = [];
    doUtil.forEach(this.declaration, 'ManagementRoute', (tenant, managementRoute) => {
        if (managementRoute && managementRoute.name) {
            const routeBody = {
                name: managementRoute.name,
                partition: tenant,
                gateway: managementRoute.gw,
                network: managementRoute.network,
                mtu: managementRoute.mtu
            };

            if (managementRoute.type) {
                routeBody.type = managementRoute.type;
            }

            promises.push(
                this.bigIp.createOrModify(PATHS.ManagementRoute, routeBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating management routes: ${err.message}`);
            throw err;
        });
}

function handleSnmp() {
    let promise = Promise.resolve();

    const agent = this.declaration.Common.SnmpAgent;
    const users = this.declaration.Common.SnmpUser;
    const communities = this.declaration.Common.SnmpCommunity;
    const trapEvents = this.declaration.Common.SnmpTrapEvents;
    const trapDestinations = this.declaration.Common.SnmpTrapDestination;

    if (agent) {
        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpAgent,
            {
                sysContact: agent.contact || '',
                sysLocation: agent.location || '',
                allowedAddresses: agent.allowList || []
            }
        ));
    }

    if (trapEvents) {
        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpTrapEvents,
            {
                agentTrap: trapEvents.agentStartStop ? 'enabled' : 'disabled',
                authTrap: trapEvents.authentication ? 'enabled' : 'disabled',
                bigipTraps: trapEvents.device ? 'enabled' : 'disabled'
            }
        ));
    }

    if (users) {
        const transformedUsers = JSON.parse(JSON.stringify(users));
        Object.keys(transformedUsers).forEach((username) => {
            const user = transformedUsers[username];
            user.username = user.name;
            user.oidSubset = user.oid;
            delete user.oid;

            user.authProtocol = 'none';
            if (user.authentication) {
                user.authPassword = user.authentication.password;
                user.authProtocol = user.authentication.protocol;
                delete user.authentication;
            }

            user.privacyProtocol = 'none';
            if (user.privacy) {
                user.privacyPassword = user.privacy.password;
                user.privacyProtocol = user.privacy.protocol;
                delete user.privacy;
            }
        });

        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpUser,
            { users: transformedUsers }
        ));
    }

    if (communities) {
        const transformedComms = JSON.parse(JSON.stringify(communities));
        Object.keys(transformedComms).forEach((communityName) => {
            const community = transformedComms[communityName];
            community.communityName = community.name;
            community.oidSubset = community.oid;
            community.ipv6 = community.ipv6 ? 'enabled' : 'disabled';
            delete community.oid;
        });

        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpCommunity,
            { communities: transformedComms }
        ));
    }

    if (trapDestinations) {
        const transformedDestinations = JSON.parse(JSON.stringify(trapDestinations));
        Object.keys(transformedDestinations).forEach((destinationName) => {
            const destination = transformedDestinations[destinationName];
            destination.host = destination.destination;
            delete destination.destination;

            if (destination.authentication) {
                destination.authPassword = destination.authentication.password;
                destination.authProtocol = destination.authentication.protocol;
                destination.securityLevel = 'auth-no-privacy';
                delete destination.authentication;
            }

            if (destination.privacy) {
                destination.privacyPassword = destination.privacy.password;
                destination.privacyProtocol = destination.privacy.protocol;
                destination.securityLevel = 'auth-privacy';
                delete destination.privacy;
            }
            if (destination.network !== 'mgmt') {
                destination.network = (destination.network === 'management') ? 'mgmt' : 'other';
            }
        });

        promise = promise.then(() => this.bigIp.modify(
            PATHS.SnmpCommunity,
            { traps: transformedDestinations }
        ));
    }

    return promise;
}

function handleSyslog() {
    if (!this.declaration.Common || !this.declaration.Common.SyslogRemoteServer) {
        return Promise.resolve();
    }

    const remoteServers = Object.keys(this.declaration.Common.SyslogRemoteServer).map(
        logName => this.declaration.Common.SyslogRemoteServer[logName]
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
        acceptIpOptions: trafficCtrl.acceptIpOptions ? 'enabled' : 'disabled',
        acceptIpSourceRoute: trafficCtrl.acceptIpSourceRoute ? 'enabled' : 'disabled',
        allowIpSourceRoute: trafficCtrl.allowIpSourceRoute ? 'enabled' : 'disabled',
        continueMatching: trafficCtrl.continueMatching ? 'enabled' : 'disabled',
        maxIcmpRate: trafficCtrl.maxIcmpRate,
        portFindLinear: trafficCtrl.maxPortFindLinear,
        portFindRandom: trafficCtrl.maxPortFindRandom,
        maxRejectRate: trafficCtrl.maxRejectRate,
        maxRejectRateTimeout: trafficCtrl.maxRejectRateTimeout,
        minPathMtu: trafficCtrl.minPathMtu,
        pathMtuDiscovery: trafficCtrl.pathMtuDiscovery ? 'enabled' : 'disabled',
        portFindThresholdWarning: trafficCtrl.portFindThresholdWarning ? 'enabled' : 'disabled',
        portFindThresholdTrigger: trafficCtrl.portFindThresholdTrigger,
        portFindThresholdTimeout: trafficCtrl.portFindThresholdTimeout,
        rejectUnmatched: trafficCtrl.rejectUnmatched ? 'enabled' : 'disabled'
    };

    return this.bigIp.modify(PATHS.TrafficControl, trafficControlObj)
        .catch((err) => {
            const errorTrafficControl = `Error modifying traffic control settings: ${err.message}`;
            logger.severe(errorTrafficControl);
            err.message = errorTrafficControl;
            return Promise.reject(err);
        });
}

function handleHTTPD() {
    if (this.declaration.Common && this.declaration.Common.HTTPD
        && Object.keys(this.declaration.Common.HTTPD).length > 0) {
        const httpd = this.declaration.Common.HTTPD;
        // allow defaults to 'All' on BIGIP but can be either 'all' or 'All'.  For consistency with other schema enums
        // and BIGIP's default let's always use 'all' with the user and 'All' with BIGIP.
        if (Array.isArray(httpd.allow)) {
            httpd.allow = httpd.allow.map(item => (item === 'all' ? 'All' : item));
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
            logger.severe(errorHTTPD);
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

    const sshdObj = {
        banner: sshd.banner ? 'enabled' : 'disabled',
        bannerText: sshd.banner,
        include: includeString,
        inactivityTimeout: sshd.inactivityTimeout
    };

    return this.bigIp.modify(PATHS.SSHD, sshdObj)
        .catch((err) => {
            const errorSSHD = `Error modifying SSHD settings: ${err.message}`;
            logger.severe(errorSSHD);
            err.message = errorSSHD;
            return Promise.reject(err);
        });
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
            logger.severe(`Error creating/updating user: ${err.message}`);
            return Promise.reject(err);
        });
}

function disableDhcpOptions(optionsToDisable) {
    let requiresDhcpRestart;

    return this.bigIp.list(
        '/tm/sys/management-dhcp/sys-mgmt-dhcp-config'
    )
        .then((dhcpOptions) => {
            if (!dhcpOptions || !dhcpOptions.requestOptions) {
                return Promise.resolve();
            }

            const currentOptions = dhcpOptions.requestOptions;
            const newOptions = currentOptions.filter(option => optionsToDisable.indexOf(option) === -1);

            if (currentOptions.length === newOptions.length) {
                return Promise.resolve();
            }

            requiresDhcpRestart = true;
            return this.bigIp.modify(
                '/tm/sys/management-dhcp/sys-mgmt-dhcp-config',
                {
                    requestOptions: newOptions
                }
            );
        })
        .then(() => this.bigIp.list('/tm/sys/global-settings'))
        .then((globalSettings) => {
            // If DHCP is disabled on the device do NOT attempt to restart it
            if (globalSettings && globalSettings.mgmtDhcp === 'disabled') {
                requiresDhcpRestart = false;
            }
        })
        .then(() => {
            if (!requiresDhcpRestart) {
                return Promise.resolve();
            }
            return restartDhcp.call(this);
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
    return this.bigIp.create(
        '/tm/sys/service',
        {
            command: 'restart',
            name: 'dhclient'
        }
    )
        .then(() => {
            function isDhcpRunning() {
                return this.bigIp.list('/tm/sys/service/dhclient/stats', undefined, cloudUtil.NO_RETRY)
                    .then((dhcpStats) => {
                        if (dhcpStats.apiRawValues
                            && dhcpStats.apiRawValues.apiAnonymous
                            && dhcpStats.apiRawValues.apiAnonymous.indexOf('running') !== -1) {
                            return Promise.resolve();
                        }

                        let message;
                        if (dhcpStats.apiRawValues && dhcpStats.apiRawValues.apiAnonymous) {
                            message = `dhclient status is ${dhcpStats.apiRawValues.apiAnonymous}`;
                        } else {
                            message = 'Unable to read dhclient status';
                        }
                        return Promise.reject(new Error(message));
                    });
            }

            return cloudUtil.tryUntil(this, cloudUtil.MEDIUM_RETRY, isDhcpRunning);
        });
}

module.exports = SystemHandler;
