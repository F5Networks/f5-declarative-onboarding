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
const PATHS = require('./sharedConstants').PATHS;
const doUtil = require('./doUtil');

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
        this.logger = new Logger(module, (state || {}).id);
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     *                    or rejected if an error occurs.
     */
    process() {
        this.logger.fine('Processing GSLB declaration.');
        if (!this.declaration.Common) {
            return Promise.resolve();
        }
        return handleGSLBGlobals.call(this)
            .then(() => {
                this.logger.fine('Checking Monitors');
                return handleGSLBMonitor.call(this);
            })
            .then(() => {
                const transactionCommands = [
                    (() => {
                        this.logger.fine('Checking Data Centers');
                        return handleGSLBDataCenter.call(this);
                    })(),
                    (() => {
                        this.logger.fine('Checking Servers');
                        return handleGSLBServer.call(this);
                    })(),
                    (() => {
                        this.logger.fine('Checking Prober Pools');
                        return handleGSLBProberPool.call(this);
                    })()
                ].reduce((array, commands) => array.concat(commands), []);

                if (transactionCommands.length === 0) {
                    return Promise.resolve();
                }

                return this.bigIp.transaction(transactionCommands);
            })
            .catch((err) => {
                this.logger.severe(`Error processing GSLB declaration: ${err.message}`);
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
            synchronization: gslbGeneral.synchronization,
            synchronizationGroupName: gslbGeneral.synchronizationGroupName,
            synchronizationTimeTolerance: gslbGeneral.synchronizationTimeTolerance,
            synchronizationTimeout: gslbGeneral.synchronizationTimeout,
            synchronizeZoneFiles: gslbGeneral.synchronizeZoneFiles
        };
        promises.push(this.bigIp.modify(
            PATHS.GSLBGeneral,
            body
        ));
    }

    return Promise.all(promises);
}

function handleGSLBDataCenter() {
    const commands = [];

    doUtil.forEach(this.declaration, 'GSLBDataCenter', (tenant, dataCenter) => {
        if (dataCenter.name) {
            const body = {
                name: dataCenter.name,
                description: dataCenter.description,
                partition: tenant,
                contact: dataCenter.contact,
                enabled: dataCenter.enabled,
                location: dataCenter.location,
                proberFallback: dataCenter.proberFallback,
                proberPreference: dataCenter.proberPreference
            };

            if (dataCenter.proberPool) {
                body.proberPool = dataCenter.proberPool;
            }

            let method = 'create';
            if (this.state.currentConfig.Common.GSLBDataCenter
                && this.state.currentConfig.Common.GSLBDataCenter[dataCenter.name]) {
                method = 'modify';
            }

            commands.push({
                method,
                path: method === 'create' ? PATHS.GSLBDataCenter : `${PATHS.GSLBDataCenter}/~${tenant}~${dataCenter.name}`,
                body
            });
        }
    });

    return commands;
}

function handleGSLBMonitor() {
    const promises = [];

    doUtil.forEach(this.declaration, 'GSLBMonitor', (tenant, monitor) => {
        if (monitor && monitor.name) {
            const body = {
                name: monitor.name,
                description: monitor.description,
                destination: monitor.destination,
                interval: monitor.interval,
                timeout: monitor.timeout,
                probeTimeout: monitor.probeTimeout,
                ignoreDownResponse: monitor.ignoreDownResponse,
                transparent: monitor.transparent
            };

            if (monitor.monitorType !== 'gateway-icmp') {
                body.reverse = monitor.reverse;
                body.send = monitor.send;
                body.recv = monitor.recv;
            }

            if (monitor.monitorType === 'https') {
                body.cipherlist = monitor.cipherlist;
                body.cert = monitor.cert;
            }

            if (monitor.monitorType === 'gateway-icmp' || monitor.monitorType === 'udp') {
                body.probeInterval = monitor.probeInterval;
                body.probeAttempts = monitor.probeAttempts;
            }

            if (monitor.monitorType === 'udp') {
                body.debug = (monitor.debug);
            }

            const monPath = `${PATHS.GSLBMonitor}/${monitor.monitorType}`;
            promises.push(this.bigIp.createOrModify(monPath, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Monitors: ${err.message}`);
            throw err;
        });
}

function handleGSLBServer() {
    const commands = [];

    function mapMonitors(server) {
        if (server.monitor && server.monitor.length > 0) {
            // The monitor property is a string with the monitors connected by ands, instead of an array
            return server.monitor.join(' and ');
        }
        return '';
    }

    doUtil.forEach(this.declaration, 'GSLBServer', (tenant, server) => {
        if (server && server.name) {
            const body = {
                name: server.name,
                description: server.description,
                enabled: server.enabled,
                disabled: !server.enabled,
                product: server.product,
                proberPreference: server.proberPreference,
                proberFallback: server.proberFallback,
                proberPool: server.proberPool,
                limitMaxBps: server.limitMaxBps,
                limitMaxBpsStatus: server.limitMaxBpsStatus,
                limitMaxPps: server.limitMaxPps,
                limitMaxPpsStatus: server.limitMaxPpsStatus,
                limitMaxConnections: server.limitMaxConnections,
                limitMaxConnectionsStatus: server.limitMaxConnectionsStatus,
                limitCpuUsage: server.limitCpuUsage,
                limitCpuUsageStatus: server.limitCpuUsageStatus,
                limitMemAvail: server.limitMemAvail,
                limitMemAvailStatus: server.limitMemAvailStatus,
                iqAllowServiceCheck: server.iqAllowServiceCheck,
                iqAllowPath: server.iqAllowPath,
                iqAllowSnmp: server.iqAllowSnmp,
                datacenter: server.datacenter,
                devices: server.devices,
                exposeRouteDomains: server.exposeRouteDomains,
                virtualServerDiscovery: server.virtualServerDiscovery,
                monitor: mapMonitors(server),
                virtualServers: server.virtualServers.map((vs) => ({
                    name: vs.name,
                    description: vs.description,
                    destination: `${vs.address}${vs.address.indexOf(':') > -1 ? '.' : ':'}${vs.port}`,
                    enabled: vs.enabled,
                    disabled: !vs.enabled,
                    translationAddress: vs.translationAddress,
                    translationPort: vs.translationPort,
                    monitor: mapMonitors(vs)
                }))
            };
            body.devices = body.devices.map((device, i) => ({
                name: `${i}`,
                addresses: [{
                    name: device.name,
                    translation: device.translation
                }],
                description: device.description
            }));

            let method = 'create';
            if (this.state.currentConfig.Common.GSLBServer
                && this.state.currentConfig.Common.GSLBServer[server.name]) {
                method = 'modify';
            }

            commands.push({
                method,
                path: method === 'create' ? PATHS.GSLBServer : `${PATHS.GSLBServer}/~${tenant}~${server.name}`,
                body
            });
        }
    });

    return commands;
}

function handleGSLBProberPool() {
    const commands = [];

    doUtil.forEach(this.declaration, 'GSLBProberPool', (tenant, proberPool) => {
        if (proberPool && proberPool.name) {
            const body = {
                name: proberPool.name,
                description: proberPool.description,
                enabled: proberPool.enabled,
                disabled: !proberPool.enabled,
                loadBalancingMode: proberPool.loadBalancingMode
            };

            body.members = proberPool.members.map((member) => ({
                name: member.name,
                description: member.description,
                enabled: member.enabled,
                disabled: !member.enabled,
                order: member.order
            }));

            let method = 'create';
            if (this.state.currentConfig.Common.GSLBProberPool
                && this.state.currentConfig.Common.GSLBProberPool[proberPool.name]) {
                method = 'modify';
            }

            commands.push({
                method,
                path: method === 'create' ? PATHS.GSLBProberPool : `${PATHS.GSLBProberPool}/~${tenant}~${proberPool.name}`,
                body
            });
        }
    });

    return commands;
}

module.exports = GSLBHandler;
