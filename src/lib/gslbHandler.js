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

const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const doUtil = require('./doUtil');

const logger = new Logger(module);

/**
 * Handles GSLB parts of a declaration.
 *
 * @class
 */
class GSLBHandler {
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
        logger.fine('Processing GSLB declaration.');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }
        return handleGSLBGlobals.call(this)
            .then(() => {
                logger.fine('Checking Data Centers');
                return handleGSLBDataCenter.call(this);
            })
            .then(() => {
                logger.fine('Checking Servers');
                return handleGSLBServer.call(this);
            })
            .catch((err) => {
                logger.severe(`Error processing GSLB declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleGSLBGlobals() {
    const gslbGlobals = this.declaration.Common.GSLBGlobals;
    const promises = [];

    if (!gslbGlobals) {
        return Promise.resolve();
    }

    if (gslbGlobals.general) {
        const gslbGeneral = gslbGlobals.general;
        const body = {
            synchronization: gslbGeneral.synchronizationEnabled ? 'yes' : 'no',
            synchronizationGroupName: gslbGeneral.synchronizationGroupName,
            synchronizationTimeTolerance: gslbGeneral.synchronizationTimeTolerance,
            synchronizationTimeout: gslbGeneral.synchronizationTimeout
        };
        promises.push(this.bigIp.modify(
            PATHS.GSLBGeneral,
            body
        ));
    }

    return Promise.all(promises);
}

function handleGSLBDataCenter() {
    const promises = [];

    doUtil.forEach(this.declaration, 'GSLBDataCenter', (tenant, dataCenter) => {
        if (dataCenter.name) {
            const body = {
                name: dataCenter.name,
                partition: tenant,
                contact: dataCenter.contact,
                enabled: dataCenter.enabled,
                location: dataCenter.location,
                proberFallback: dataCenter.proberFallback,
                proberPreference: dataCenter.proberPreferred
            };

            if (dataCenter.proberPool) {
                body.proberPool = dataCenter.proberPool;
            }

            promises.push(
                this.bigIp.createOrModify(PATHS.GSLBDataCenter, body, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating Data Centers: ${err.message}`);
            throw err;
        });
}

function handleGSLBServer() {
    const promises = [];

    doUtil.forEach(this.declaration, 'GSLBServer', (tenant, server) => {
        if (server && server.name) {
            const body = {
                name: server.name,
                description: server.remark || 'none',
                enabled: server.enabled,
                disabled: !server.enabled,
                product: server.serverType,
                proberPreference: server.proberPreferred,
                proberFallback: server.proberFallback,
                limitMaxBps: server.bpsLimit,
                limitMaxBpsStatus: server.bpsLimitEnabled ? 'enabled' : 'disabled',
                limitMaxPps: server.ppsLimit,
                limitMaxPpsStatus: server.ppsLimitEnabled ? 'enabled' : 'disabled',
                limitMaxConnections: server.connectionsLimit,
                limitMaxConnectionsStatus: server.connectionsLimitEnabled ? 'enabled' : 'disabled',
                limitCpuUsage: server.cpuUsageLimit,
                limitCpuUsageStatus: server.cpuUsageLimitEnabled ? 'enabled' : 'disabled',
                limitMemAvail: server.memoryLimit,
                limitMemAvailStatus: server.memoryLimitEnabled ? 'enabled' : 'disabled',
                iqAllowServiceCheck: server.serviceCheckProbeEnabled ? 'yes' : 'no',
                iqAllowPath: server.pathProbeEnabled ? 'yes' : 'no',
                iqAllowSnmp: server.snmpProbeEnabled ? 'yes' : 'no',
                datacenter: server.dataCenter,
                devices: server.devices,
                exposeRouteDomains: server.exposeRouteDomainsEnabled ? 'yes' : 'no',
                virtualServerDiscovery: server.virtualServerDiscoveryMode
            };

            body.devices.forEach((device) => {
                device.description = device.remark || 'none';
                delete device.remark;
            });

            promises.push(
                this.bigIp.createOrModify(PATHS.GSLBServer, body, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            logger.severe(`Error creating Servers: ${err.message}`);
            throw err;
        });
}

module.exports = GSLBHandler;
