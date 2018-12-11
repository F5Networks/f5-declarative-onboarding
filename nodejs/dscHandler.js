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

const logger = new Logger(module);

/**
 * Handles DSC parts of a declaration.
 *
 * @class
 */
class DscHandler {
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
        logger.fine('Proessing DSC declaration.');
        logger.fine('Checking ConfigSync.');
        return handleConfigSync.call(this)
            .then(() => {
                logger.fine('Checking FailoverUnicast.');
                return handleFailoverUnicast.call(this);
            })
            .then(() => {
                logger.fine('Checking DeviceTrust.');
                return handleDeviceTrust.call(this);
            })
            .then(() => {
                logger.fine('Checking DeviceGroup.');
                return handleDeviceGroup.call(this);
            })
            .catch((err) => {
                logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

/**
 * Handles creating the config sync IP
 */
function handleConfigSync() {
    if (this.declaration.Common.ConfigSync) {
        let configsyncIp = this.declaration.Common.ConfigSync.configsyncIp || '';

        // address may have been a json pointer to something with a CIDR
        // so strip that off
        const slashIndex = configsyncIp.indexOf('/');
        if (slashIndex !== -1) {
            configsyncIp = configsyncIp.substring(0, slashIndex);
        }

        return this.bigIp.cluster.configSyncIp(
            configsyncIp,
            cloudUtil.SHORT_RETRY
        );
    }
    return Promise.resolve();
}

/**
 * Handles setting the network failover unicast address
 */
function handleFailoverUnicast() {
    if (this.declaration.Common.FailoverUnicast) {
        const port = this.declaration.Common.FailoverUnicast.port;
        let unicastAddress = this.declaration.Common.FailoverUnicast.address || '';

        // address may have been a json pointer to something with a CIDR
        // so strip that off
        const slashIndex = unicastAddress.indexOf('/');
        if (slashIndex !== -1) {
            unicastAddress = unicastAddress.substring(0, slashIndex);
        }

        return this.bigIp.deviceInfo()
            .then((deviceInfo) => {
                return this.bigIp.modify(
                    `/tm/cm/device/~Common~${deviceInfo.hostname}`,
                    {
                        unicastAddress: [
                            {
                                port,
                                ip: unicastAddress,
                            }
                        ]
                    }
                );
            })
            .catch((err) => {
                logger.severe(`Error setting failover unicast address: ${err.message}`);
                return Promise.reject(err);
            });
    }
    return Promise.resolve();
}

/**
 * Handles setting up the device trust.
 */
function handleDeviceTrust() {
    if (this.declaration.Common.DeviceTrust) {
        const deviceTrust = this.declaration.Common.DeviceTrust;

        return this.bigIp.deviceInfo()
            .then((deviceInfo) => {
                // If we are not the remote, check to see if we need to request to be added
                if (deviceInfo.hostname !== deviceTrust.remoteHost) {
                    return doUtil.getBigIp(
                        logger,
                        {
                            host: deviceTrust.remoteHost,
                            user: deviceTrust.remoteUsername,
                            password: deviceTrust.remotePassword
                        }
                    )
                        .then((remoteBigIp) => {
                            return remoteBigIp.cluster.addToTrust(
                                deviceInfo.hostname,
                                deviceInfo.managementAddress,
                                deviceTrust.localUsername,
                                deviceTrust.localPassword
                            );
                        })
                        .then(() => {
                            return this.bigIp.cluster.syncComplete();
                        })
                        .catch((err) => {
                            logger.severe(`Could not add to remote trust: ${err.message}`);
                            return Promise.reject(err);
                        });
                }
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error adding to trust: ${err.message}`);
                return Promise.reject(err);
            });
    }
    return Promise.resolve();
}

/**
 * Handles creating or joinging the device group.
 */
function handleDeviceGroup() {
    if (this.declaration.Common.DeviceGroup) {
        const deviceGroupName = Object.keys(this.declaration.Common.DeviceGroup)[0];
        const deviceGroup = this.declaration.Common.DeviceGroup[deviceGroupName];

        return this.bigIp.deviceInfo()
            .then((deviceInfo) => {
                const hostname = deviceInfo.hostname;
                // If we are the owner, create the group
                if (hostname === deviceGroup.owner) {
                    return createDeviceGroup.call(this, deviceGroupName, deviceGroup);
                }

                return joinDeviceGroup.call(this, deviceGroupName, deviceGroup, hostname);
            })
            .catch((err) => {
                logger.severe(`Error creating/joining device group: ${err.message}`);
                return Promise.reject(err);
            });
    }

    return Promise.resolve();
}

/**
 * Creates a device group and syncs to it.
 *
 * @param {String} deviceGroupName - Name of the device gruop to create
 * @param {Object} deviceGroup - Device group from the declaration
 *
 * @returns {Promise} A promise which is resolved when the operation is complete
 *                    or rejected if an error occurs.
 */
function createDeviceGroup(deviceGroupName, deviceGroup) {
    let needsSync = false;

    // Get the device group members that are currently trusted
    return this.bigIp.cluster.areInTrustGroup(deviceGroup.members || [])
        .then((devices) => {
            // If we're adding something besides ourselves do
            // an initial sync after createion
            if (devices.length > 0) {
                needsSync = true;
            }

            return this.bigIp.cluster.createDeviceGroup(
                deviceGroupName,
                deviceGroup.type,
                devices,
                {
                    autoSync: deviceGroup.autoSync,
                    saveOnAutoSync: deviceGroup.saveOnAutoSync,
                    networkFailover: deviceGroup.networkFailover,
                    fullLoadOnSync: deviceGroup.fullLoadOnSync,
                    asmSync: deviceGroup.asmSync
                }
            );
        })
        .then(() => {
            if (needsSync) {
                // We are the owner, so sync to the group
                return this.bigIp.cluster.sync('to-group', deviceGroupName);
            }
            return Promise.resolve();
        })
        .then(() => {
            return this.bigIp.cluster.syncComplete();
        })
        .catch((err) => {
            logger.severe(`Error creating device group: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Joins and existing device group and syncs from it
 *
 * Expects that the device group exists prior to calling
 *
 * @param {String} deviceGroupName - Name of the device gruop to create
 * @param {Object} deviceGroup - Device group from the declaration
 * @param {Object} hostnamne - Hostname to add
 *
 * @returns {Promise} A promise which is resolved when the operation is complete
 *                    or rejected if an error occurs.
 */
function joinDeviceGroup(deviceGroupName, deviceGroup, hostname) {
    // Wait till we have the device group. Once addToTrust is finished
    // and the owning device creates the group, we should have it but maybe
    // we are coming up before the owner, so wait.
    return waitForDeviceGroup.call(this, deviceGroupName)
        .then(() => {
            return this.bigIp.cluster.addToDeviceGroup(hostname, deviceGroupName);
        })
        .then(() => {
            // If we have the owning device info, tell it to sync to the group
            if (this.declaration.Common.DeviceTrust) {
                const deviceTrust = this.declaration.Common.DeviceTrust;
                return doUtil.getBigIp(
                    logger,
                    {
                        host: deviceTrust.remoteHost,
                        user: deviceTrust.remoteUsername,
                        password: deviceTrust.remotePassword
                    }
                )
                    .then((remoteBigIp) => {
                        return remoteBigIp.cluster.sync('to-group', deviceGroupName);
                    })
                    .catch((err) => {
                        logger.severe(`Error doing remote sync: ${err.message}`);
                        return Promise.reject(err);
                    });
            }
            return Promise.resolve();
        })
        .catch((err) => {
            logger.severe(`Error joining device group: ${err.message}`);
            return Promise.reject(err);
        });
}

function waitForDeviceGroup(deviceGroupName) {
    function checkDeviceGroup() {
        return new Promise((resolve, reject) => {
            this.bigIp.cluster.hasDeviceGroup(deviceGroupName)
                .then((hasDeviceGroup) => {
                    if (hasDeviceGroup) {
                        resolve();
                    } else {
                        reject(new Error(`Device group ${deviceGroupName} does not exist on this device.`));
                    }
                });
        });
    }

    return cloudUtil.tryUntil(this, cloudUtil.DEFAULT_RETRY, checkDeviceGroup);
}

module.exports = DscHandler;
