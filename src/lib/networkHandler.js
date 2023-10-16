/**
 * Copyright 2023 F5, Inc.
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
const promiseUtil = require('@f5devcentral/atg-shared-utilities').promiseUtils;
const isInSubnet = require('is-in-subnet').isInSubnet;
const doUtil = require('./doUtil');
const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;

/**
 * Handles network parts of a declaration.
 *
 * @class
 */
class NetworkHandler {
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
        this.logger.fine('Processing network declaration.');
        this.logger.fine('Checking Trunks.');

        const status = { warnings: [] };
        return Promise.resolve()
            .then(() => {
                this.logger.fine('Checking trunk');
                return handleTrunk.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking VLANs');
                return handleVlan.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking RouteDomains');
                return handleRouteDomain.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking DNS_Resolvers');
                return handleDnsResolver.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Tunnels');
                return handleTunnel.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Firewall Address Lists');
                return handleFirewallAddressList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Firewall Port Lists');
                return handleFirewallPortList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Firewall Policies');
                return handleFirewallPolicy.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Net Address Lists');
                return handleNetAddressList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Net Port Lists');
                return handleNetPortList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking ManagementIpFirewall.');
                return handleManagementIpFirewall.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking SelfIps');
                return handleSelfIp.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking Routes');
                return handleRoute.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.fine('Checking DagGlobals');
                return handleDagGlobals.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking Enable Routing Module');
                return handleEnableRouting.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking RoutingAsPath');
                return handleRoutingAsPath.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking RoutingAccessList');
                return handleRoutingAccessList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking RoutingPrefixList');
                return handleRoutingPrefixList.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking RouteMap');
                return handleRouteMap.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Checking RoutingBGP');
                return handleRoutingBGP.call(this);
            })
            .then((result) => {
                updateStatus(status, result);
                this.logger.info('Done processing network declaration.');
                return Promise.resolve(status);
            })
            .catch((err) => {
                this.logger.severe(`Error processing network declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function updateStatus(status, result) {
    if (result && result.warnings) {
        status.warnings = status.warnings.concat(result.warnings);
    }
}

function handleVlan() {
    return new Promise((resolve, reject) => {
        const promises = [];
        doUtil.forEach(this.declaration, 'VLAN', (tenant, vlan) => {
            if (vlan && vlan.name) {
                const vlanInterfaces = vlan && Array.isArray(vlan.interfaces) ? vlan.interfaces.slice() : [];
                const interfaces = [];
                vlanInterfaces.forEach((anInterface) => {
                    // Use the tagged property if it is there, otherwise, set tagged if the vlan has a tag
                    let tagged;
                    if (typeof anInterface.tagged === 'undefined') {
                        tagged = !!vlan.tag;
                    } else {
                        tagged = anInterface.tagged;
                    }

                    interfaces.push(
                        {
                            tagged,
                            name: anInterface.name
                        }
                    );
                });

                const vlanBody = {
                    interfaces,
                    name: vlan.name,
                    partition: tenant,
                    autoLasthop: vlan.autoLasthop,
                    cmpHash: vlan.cmpHash,
                    failsafe: vlan.failsafe,
                    failsafeAction: vlan.failsafeAction,
                    failsafeTimeout: vlan.failsafeTimeout
                };

                if (vlan.mtu) {
                    vlanBody.mtu = vlan.mtu;
                }

                if (vlan.tag) {
                    vlanBody.tag = vlan.tag;
                }

                promises.push(
                    this.bigIp.createOrModify(PATHS.VLAN, vlanBody, null, cloudUtil.MEDIUM_RETRY)
                );
            }
        });

        Promise.all(promises)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                this.logger.severe(`Error creating vlans: ${err.message}`);
                reject(err);
            });
    });
}

function handleFirewallAddressList() {
    const promises = [];

    doUtil.forEach(this.declaration, 'FirewallAddressList', (tenant, firewallAddressList) => {
        if (firewallAddressList && firewallAddressList.name) {
            const body = {
                name: firewallAddressList.name,
                description: firewallAddressList.description
            };

            if (firewallAddressList.addresses) {
                body.addresses = firewallAddressList.addresses || [];
            }
            if (firewallAddressList.fqdns) {
                body.fqdns = firewallAddressList.fqdns || [];
            }
            if (firewallAddressList.geo) {
                body.geo = firewallAddressList.geo || [];
            }

            promises.push(this.bigIp.createOrModify(PATHS.FirewallAddressList, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Firewall Address List: ${err.message}`);
            throw err;
        });
}

function handleFirewallPolicy() {
    const promises = [];

    doUtil.forEach(this.declaration, 'FirewallPolicy', (tenant, firewallPolicy) => {
        if (firewallPolicy && firewallPolicy.name) {
            const body = {
                name: firewallPolicy.name,
                description: firewallPolicy.description,
                rules: formatRulesRequest(firewallPolicy.rules)
            };

            promises.push(this.bigIp.createOrModify(PATHS.FirewallPolicy, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Firewall Policies: ${err.message}`);
            throw err;
        });
}

function handleManagementIpFirewall() {
    const mgmtIpFirewall = this.declaration.Common.ManagementIpFirewall;

    if (!mgmtIpFirewall) {
        return Promise.resolve();
    }

    const body = {
        description: mgmtIpFirewall.description,
        rules: formatRulesRequest(mgmtIpFirewall.rules)
    };

    body.rules.forEach((rule) => {
        delete rule.source.vlans;
    });

    return this.bigIp.modify(PATHS.ManagementIpFirewall, body)
        .catch((err) => {
            this.logger.severe(`Error creating Management IP Firewall: ${err.message}`);
            throw err;
        });
}

function handleFirewallPortList() {
    const promises = [];

    doUtil.forEach(this.declaration, 'FirewallPortList', (tenant, firewallPortList) => {
        if (firewallPortList && firewallPortList.name) {
            const body = {
                name: firewallPortList.name,
                description: firewallPortList.description
            };

            if (firewallPortList.ports) {
                body.ports = firewallPortList.ports.map((port) => port.toString());
            }

            promises.push(this.bigIp.createOrModify(PATHS.FirewallPortList, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Firewall Port List: ${err.message}`);
            throw err;
        });
}

function handleNetAddressList() {
    const promises = [];

    doUtil.forEach(this.declaration, 'NetAddressList', (tenant, netAddressList) => {
        if (netAddressList && netAddressList.name) {
            const body = {
                name: netAddressList.name,
                description: netAddressList.description
            };

            if (netAddressList.addresses) {
                body.addresses = netAddressList.addresses || [];
            }

            promises.push(this.bigIp.createOrModify(PATHS.NetAddressList, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Net Address List: ${err.message}`);
            throw err;
        });
}

function handleNetPortList() {
    const promises = [];

    doUtil.forEach(this.declaration, 'NetPortList', (tenant, netPortList) => {
        if (netPortList && netPortList.name) {
            const body = {
                name: netPortList.name,
                description: netPortList.description
            };

            if (netPortList.ports) {
                body.ports = netPortList.ports.map((port) => port.toString());
            }

            promises.push(this.bigIp.createOrModify(PATHS.NetPortList, body, null, cloudUtil.MEDIUM_RETRY));
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Net Port List: ${err.message}`);
            throw err;
        });
}

function handleSelfIp() {
    const nonFloatingBodies = [];
    const floatingBodies = [];
    let selfIpsToRecreate = [];
    let routesToRecreate = [];
    let configSyncIpToRecreate;

    // In case of creating SelfIP in non default routedomain, we'd ignore
    // "ioctl failed: No such device" error and continue retrying.
    const selfIpRetry = cloudUtil.MEDIUM_RETRY;
    selfIpRetry.continueOnErrorMessage = 'ioctl failed: No such device';

    return Promise.resolve()
        .then(() => this.bigIp.list('/tm/sys/provision'))
        .then((provisioning) => {
            const provisionedModules = (provisioning || [])
                .filter((module) => module.level !== 'none')
                .map((module) => module.name);

            doUtil.forEach(this.declaration, 'SelfIp', (tenant, selfIp) => {
                if (selfIp && selfIp.name) {
                    let vlan;

                    /*
                     * If AFM is not provisioned, BIG-IP will error when defaulting the firewall
                     * policy to "none". We fix this case by leaving it as undefined. But if a
                     * user specifies a policy, we want the BIG-IP to error and notify the user
                     * that they need AFM provisioned to use this property.
                     */
                    const normalizeFWPolicy = (key) => {
                        if (selfIp[key]) {
                            return `/${tenant}/${selfIp[key]}`;
                        }
                        return provisionedModules.indexOf('afm') > -1 ? 'none' : undefined;
                    };

                    // If the vlan does not start with '/', assume it is in this tenant
                    if (selfIp.vlan.startsWith('/')) {
                        vlan = selfIp.vlan;
                    } else {
                        vlan = `/${tenant}/${selfIp.vlan}`;
                    }

                    const selfIpBody = {
                        vlan,
                        name: selfIp.name,
                        partition: tenant,
                        address: selfIp.address,
                        trafficGroup: selfIp.trafficGroup,
                        allowService: selfIp.allowService,
                        fwEnforcedPolicy: normalizeFWPolicy('fwEnforcedPolicy'),
                        fwStagedPolicy: normalizeFWPolicy('fwStagedPolicy')
                    };

                    if (selfIpBody.trafficGroup
                        && !selfIpBody.trafficGroup.endsWith('traffic-group-local-only')) {
                        floatingBodies.push(selfIpBody);
                    } else {
                        nonFloatingBodies.push(selfIpBody);
                    }
                }
            });

            // We can't modify a self IP - we need to delete it and re-add it.
            // We have to delete floating self IPs before non-floating self IPs
            return deleteExistingSelfIps.call(this, floatingBodies);
        })
        .then((deletedObjects) => {
            if (deletedObjects) {
                selfIpsToRecreate = deletedObjects.deletedFloatingSelfIps.slice();
                routesToRecreate = deletedObjects.deletedRoutes.slice();
                configSyncIpToRecreate = deletedObjects.deletedConfigSyncIp;
            }
            return deleteExistingSelfIps.call(this, nonFloatingBodies);
        })
        .then((deletedObjects) => {
            selfIpsToRecreate = selfIpsToRecreate.concat(deletedObjects.deletedFloatingSelfIps);
            routesToRecreate = routesToRecreate.concat(deletedObjects.deletedRoutes);
            configSyncIpToRecreate = configSyncIpToRecreate || deletedObjects.deletedConfigSyncIp;

            // We have to create non floating self IPs before floating self IPs
            const createPromises = [];
            nonFloatingBodies.forEach((selfIpBody) => {
                createPromises.push(
                    this.bigIp.create(PATHS.SelfIp, selfIpBody, null, selfIpRetry)
                );
            });

            return Promise.all(createPromises);
        })
        .then(() => {
            const createPromises = [];
            floatingBodies.forEach((selfIpBody) => {
                createPromises.push(
                    this.bigIp.create(PATHS.SelfIp, selfIpBody, null, selfIpRetry)
                );
            });
            return Promise.all(createPromises);
        })
        .then(() => {
            const createPromises = [];
            selfIpsToRecreate.forEach((selfIp) => {
                const selfIpBody = {
                    name: selfIp.name,
                    partition: selfIp.partition,
                    vlan: selfIp.vlan,
                    address: selfIp.address,
                    trafficGroup: selfIp.trafficGroup,
                    allowService: selfIp.allowService,
                    fwEnforcedPolicy: selfIp.fwEnforcedPolicy,
                    fwStagedPolicy: selfIp.fwStagedPolicy
                };
                createPromises.push(
                    this.bigIp.create(PATHS.SelfIp, selfIpBody, null, selfIpRetry)
                );
            });
            return Promise.all(createPromises);
        })
        .then(() => {
            if (!configSyncIpToRecreate) {
                return Promise.resolve();
            }
            return this.bigIp.cluster.configSyncIp(configSyncIpToRecreate, cloudUtil.SHORT_RETRY);
        })
        .then(() => {
            const createPromises = [];
            routesToRecreate.forEach((route) => {
                const routeBody = {
                    name: route.name,
                    partition: route.partition,
                    gw: route.gw,
                    network: route.network,
                    mtu: route.mtu
                };
                createPromises.push(
                    this.bigIp.create(PATHS.Route, routeBody, null, cloudUtil.MEDIUM_RETRY)
                );
            });
            return Promise.all(createPromises);
        })
        .then(() => {
            let status;
            if (this.declaration.Common.SelfIp) {
                status = {
                    warnings: ["The default value for 'allowService' on a 'SelfIp' changed from 'default' to 'none' in f5-declarative-onboarding version 1.36.0."]
                };
            }
            return status;
        })
        .catch((err) => {
            this.logger.severe(`Error creating self IPs: ${err.message}`);
            throw err;
        });
}

function handleRoute() {
    if (!this.declaration.Common.Route) {
        return Promise.resolve();
    }

    return Promise.resolve()
        .then(() => {
            let createLocalOnly = false;

            // Must check if the declaration requires LOCAL_ONLY before creating different routes
            doUtil.forEach(this.declaration, 'Route', (tenant, route) => {
                if (!createLocalOnly) {
                    createLocalOnly = route.localOnly;
                }
            });

            if (createLocalOnly) {
                return this.bigIp.createFolder('LOCAL_ONLY', { subPath: '/' });
            }
            return Promise.resolve();
        })
        .then(() => {
            const commands = [];
            const deleteCommands = [];
            doUtil.forEach(this.declaration, 'Route', (tenant, route) => {
                if (route && route.name) {
                    const mask = route.network.includes(':') ? 128 : 32;
                    route.network = route.network !== 'default' && route.network !== 'default-inet6'
                        && !route.network.includes('/') ? `${route.network}/${mask}` : route.network;

                    let targetPartition = tenant;
                    if (route.localOnly) {
                        targetPartition = 'LOCAL_ONLY';
                    }

                    // Need to do a delete if the network property is updated
                    let deleteRoute = false;
                    if (this.state.currentConfig.Common.Route
                        && this.state.currentConfig.Common.Route[route.name]
                        && this.state.currentConfig.Common.Route[route.name].network !== route.network) {
                        deleteCommands.push({
                            method: 'delete',
                            path: `${PATHS.Route}/~${targetPartition}~${route.name}`
                        });
                        deleteRoute = true;
                    }

                    const routeBody = {
                        name: route.name,
                        partition: targetPartition,
                        network: route.network,
                        mtu: route.mtu
                    };

                    if (route.tmInterface) {
                        if (route.tmInterface.startsWith('/')) {
                            routeBody.interface = route.tmInterface;
                        } else {
                            routeBody.interface = `/${tenant}/${route.tmInterface}`;
                        }
                    } else {
                        routeBody.gw = route.gw;
                    }

                    if (this.state.currentConfig.Common.Route) {
                        if (Object.keys(this.state.currentConfig.Common.Route)
                            .find((routeName) => routeName === route.name) && !deleteRoute) {
                            commands.push({
                                method: 'delete',
                                path: `${PATHS.Route}/~${targetPartition}~${route.name}`
                            });
                        }
                    }

                    commands.push({
                        method: 'create',
                        path: PATHS.Route,
                        body: routeBody
                    });
                }
            });

            let promise = Promise.resolve();
            if (deleteCommands.length > 0) {
                promise = promise.then(() => this.bigIp.transaction(deleteCommands));
            }

            return promise
                .then(() => this.bigIp.transaction(commands))
                .catch((err) => {
                    this.logger.severe(`Error creating routes: ${err.message}`);
                    throw err;
                });
        });
}

function handleDnsResolver() {
    const promises = [];
    doUtil.forEach(this.declaration, 'DNS_Resolver', (tenant, resolver) => {
        if (resolver && resolver.name) {
            const resolverBody = {
                name: resolver.name,
                partition: tenant,
                answerDefaultZones: resolver.answerDefaultZones,
                cacheSize: resolver.cacheSize,
                forwardZones: resolver.forwardZones,
                randomizeQueryNameCase: resolver.randomizeQueryNameCase,
                routeDomain: resolver.routeDomain,
                useIpv4: resolver.useIpv4,
                useIpv6: resolver.useIpv6,
                useTcp: resolver.useTcp,
                useUdp: resolver.useUdp
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.DNS_Resolver, resolverBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating DNS_Resolvers: ${err.message}`);
            throw err;
        });
}

function handleTrunk() {
    const promises = [];
    doUtil.forEach(this.declaration, 'Trunk', (tenant, trunk) => {
        if (trunk && trunk.name) {
            const trunkBody = {
                name: trunk.name,
                distributionHash: trunk.distributionHash,
                interfaces: trunk.interfaces,
                lacp: trunk.lacp,
                lacpMode: trunk.lacpMode,
                lacpTimeout: trunk.lacpTimeout,
                linkSelectPolicy: trunk.linkSelectPolicy,
                qinqEthertype: trunk.qinqEthertype,
                stp: trunk.stp
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.Trunk, trunkBody, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating Trunks: ${err.message}`);
            throw err;
        });
}
function handleRouteDomain() {
    const commands = [];
    let rd0Body;

    doUtil.forEach(this.declaration, 'RouteDomain', (tenant, routeDomain) => {
        if (routeDomain && routeDomain.name) {
            const routeDomainBody = {
                name: routeDomain.name,
                partition: tenant,
                id: routeDomain.id,
                parent: routeDomain.parent,
                connectionLimit: routeDomain.connectionLimit,
                bwcPolicy: routeDomain.bwcPolicy,
                flowEvictionPolicy: routeDomain.flowEvictionPolicy,
                fwEnforcedPolicy: routeDomain.fwEnforcedPolicy,
                fwStagedPolicy: routeDomain.fwStagedPolicy,
                ipIntelligencePolicy: routeDomain.ipIntelligencePolicy,
                securityNatPolicy: routeDomain.securityNatPolicy,
                servicePolicy: routeDomain.servicePolicy,
                strict: routeDomain.strict,
                routingProtocol: routeDomain.routingProtocol,
                vlans: routeDomain.vlans
            };

            let method = 'create';
            if (this.state.currentConfig.Common.RouteDomain
                && this.state.currentConfig.Common.RouteDomain[routeDomain.name]) {
                method = 'modify';
            }

            if (routeDomain.name !== '0') {
                commands.push({
                    method,
                    path: method === 'create' ? PATHS.RouteDomain : `${PATHS.RouteDomain}/~${tenant}~${routeDomain.name}`,
                    body: routeDomainBody
                });
            } else {
                // In the case of route domain 0, it needs run outside of a transaction to avoid known vlan-transaction
                // error. To avoid the VLAN "removal" error in TMOS, route domain 0 needs to retain all the VLANs it
                // had previously so we delete the desired VLANS. The following transaction handles configuring VLANs.
                delete routeDomainBody.vlans;
                rd0Body = routeDomainBody;
            }
        }
    });

    return Promise.resolve()
        .then(() => {
            if (typeof rd0Body === 'undefined') {
                return Promise.resolve();
            }
            return this.bigIp.createOrModify(PATHS.RouteDomain, rd0Body);
        })
        .then(() => (commands.length === 0 ? Promise.resolve() : this.bigIp.transaction(commands)))
        .catch((err) => {
            this.logger.severe(`Error creating RouteDomains: ${err.message}`);
            throw err;
        });
}

function handleDagGlobals() {
    if (this.declaration.Common && this.declaration.Common.DagGlobals) {
        const body = {
            dagIpv6PrefixLen: this.declaration.Common.DagGlobals.dagIpv6PrefixLen,
            icmpHash: this.declaration.Common.DagGlobals.icmpHash,
            roundRobinMode: this.declaration.Common.DagGlobals.roundRobinMode
        };
        this.bigIp.modify(PATHS.DagGlobals, body);
    }
    return Promise.resolve();
}

function handleTunnel() {
    const deleteTunnels = [];
    const deleteVxlans = [];
    const vxlanPromises = [];
    const trafficControlPromises = [];
    const promises = [];

    doUtil.forEach(this.declaration, 'Tunnel', (tenant, tunnel) => {
        if (tunnel && tunnel.name && tunnel.profile) {
            // if the tunnel has a vxlan profile we need to update that profile appropriately.
            // must do this step first so the following profile step handles changes properly
            if (tunnel.profile === 'vxlan') {
                const vxlanBody = {
                    name: `${tunnel.name}_vxlan`,
                    description: tunnel.description,
                    partition: tenant,
                    defaultsFrom: tunnel.defaultsFrom,
                    encapsulationType: tunnel.encapsulationType,
                    floodingType: tunnel.floodingType,
                    port: tunnel.port
                };

                tunnel.profile = `${tunnel.name}_vxlan`;

                vxlanPromises.push(() => this.bigIp.createOrModify(
                    PATHS.VXLAN, vxlanBody, null, cloudUtil.MEDIUM_RETRY
                ));

                // MCP will silently change the acceptIpOptions on the backend to true, if a
                // vxlan tunnel is created. This code modifies the option to the user preference.
                let acceptIpOptions = this.state.currentConfig.Common.TrafficControl.acceptIpOptions;
                if (this.declaration.Common && this.declaration.Common.TrafficControl) {
                    // If this is set, there was a diff and we should use the desired value
                    acceptIpOptions = this.declaration.Common.TrafficControl.acceptIpOptions;
                }
                trafficControlPromises.push(() => {
                    const trafficControlObj = {
                        acceptIpOptions
                    };
                    return Promise.resolve()
                        .then(() => this.bigIp.modify(PATHS.TrafficControl, trafficControlObj))
                        .catch((err) => {
                            const errorTrafficControl = `Error modifying traffic control settings after updating the vxlan tunnel: ${err.message}`;
                            this.logger.severe(errorTrafficControl);
                            err.message = errorTrafficControl;
                            return Promise.reject(err);
                        });
                });
            }

            const tunnelBody = {
                name: tunnel.name,
                description: tunnel.description,
                partition: tenant,
                autoLasthop: tunnel.autoLasthop,
                mtu: tunnel.mtu,
                profile: `/Common/${tunnel.profile}`,
                tos: tunnel.tos,
                usePmtu: tunnel.usePmtu,
                localAddress: tunnel.localAddress,
                remoteAddress: tunnel.remoteAddress,
                secondaryAddress: tunnel.secondaryAddress,
                key: tunnel.key,
                mode: tunnel.mode,
                transparent: tunnel.transparent,
                trafficGroup: tunnel.trafficGroup
            };

            // if we are changing the profile or trafficGroup, we first have to delete the tunnel
            if (this.state.currentConfig[tenant].Tunnel
                && this.state.currentConfig[tenant].Tunnel[tunnel.name]) {
                if (tunnel.profile !== this.state.currentConfig[tenant].Tunnel[tunnel.name].profile
                    || tunnel.trafficGroup !== this.state.currentConfig[tenant].Tunnel[tunnel.name].trafficGroup) {
                    deleteTunnels.push(() => this.bigIp.delete(
                        `${PATHS.Tunnel}/${tunnel.name}`
                    ));
                    if (this.state.currentConfig[tenant].Tunnel[tunnel.name].profile === 'vxlan') {
                        // Delete the vxlan profile if the profile changed from vxlan
                        deleteVxlans.push(() => this.bigIp.delete(
                            `${PATHS.VXLAN}/${tunnel.name}_vxlan`
                        ));
                    }
                }
            }

            promises.push(() => this.bigIp.createOrModify(
                PATHS.Tunnel, tunnelBody, null, cloudUtil.MEDIUM_RETRY
            ));
        }
    });

    return promiseUtil.parallel(deleteTunnels)
        .then(() => promiseUtil.parallel(deleteVxlans))
        .then(() => promiseUtil.parallel(vxlanPromises))
        .then(() => promiseUtil.parallel(promises))
        // Traffic Control must be set after all the tunnel work is complete
        .then(() => promiseUtil.parallel(trafficControlPromises))
        .catch((err) => {
            this.logger.severe(`Error creating Tunnels: ${err.message}`);
            throw err;
        });
}

function handleEnableRouting() {
    const promises = [];
    let enabledRouting = false;
    ['RoutingBGP', 'RouteMap', 'RoutingAsPath', 'RoutingAccessList', 'RoutingPrefixList'].forEach((routingModuleClass) => {
        doUtil.forEach(this.declaration, routingModuleClass, () => {
            if (!enabledRouting) {
                // Enable routing module on the BIG-IP
                enabledRouting = true;
                promises.push(
                    this.bigIp.modify('/tm/sys/db/tmrouted.tmos.routing', { value: 'enable' }, null, cloudUtil.SHORT_RETRY)
                );
            }
        });
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error enabling routing module: ${err.message}`);
            throw err;
        });
}

function handleRoutingAsPath() {
    const promises = [];
    doUtil.forEach(this.declaration, 'RoutingAsPath', (tenant, routing) => {
        if (routing && Object.keys(routing).length !== 0) {
            const entries = {};

            if (routing.entries) {
                routing.entries.forEach((entry) => {
                    entries[entry.name] = {
                        action: 'permit',
                        regex: entry.regex
                    };
                });
            }

            const body = {
                name: routing.name,
                partition: tenant,
                entries
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.RoutingAsPath, body, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating RoutingAsPath: ${err.message}`);
            throw err;
        });
}

function handleRoutingAccessList() {
    const promises = [];
    doUtil.forEach(this.declaration, 'RoutingAccessList', (tenant, list) => {
        if (list && Object.keys(list).length !== 0) {
            const entries = {};

            (list.entries || []).forEach((entry) => {
                entries[entry.name] = {
                    action: entry.action,
                    destination: entry.destination,
                    exactMatch: entry.exactMatch,
                    source: entry.source
                };
            });

            const body = {
                name: list.name,
                partition: tenant,
                description: list.description,
                entries
            };

            promises.push(
                this.bigIp.createOrModify(PATHS.RoutingAccessList, body, null, cloudUtil.MEDIUM_RETRY)
            );
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating RoutingAccessList: ${err.message}`);
            throw err;
        });
}

function handleRoutingPrefixList() {
    if (!this.declaration.Common.RoutingPrefixList) {
        return Promise.resolve();
    }

    const promises = [];
    doUtil.forEach(this.declaration, 'RoutingPrefixList', (partition, list) => {
        const transaction = [];
        if (list && Object.keys(list).length !== 0) {
            const entries = {};

            if (list.entries) {
                list.entries.forEach((entry) => {
                    entries[entry.name] = {
                        action: entry.action,
                        prefix: entry.prefix,
                        prefixLenRange: entry.prefixLenRange
                    };
                });
            }

            const body = {
                name: list.name,
                partition,
                routeDomain: list.routeDomain,
                entries
            };

            const bodyNoEntries = JSON.parse(JSON.stringify(body));
            delete bodyNoEntries.entries;

            const bodyNoRouteDomain = JSON.parse(JSON.stringify(body));
            delete bodyNoRouteDomain.routeDomain;

            // routeDomain is read-only and in some cases if another object refers to the RoutingPrefixList they
            // both must have the same routeDomain. Modifying routeDomain in a delete-create transaction somehow gets
            // around this but for some reason the entries property is buggy in this transaction. Leaving entries out of
            // the delete-create transaction followed up by a modify that leaves out the routeDomain seems to work.
            const currentRouteDomain = doUtil.getDeepValue(this.state.currentConfig.Common, `RoutingPrefixList.${body.name}.routeDomain`);
            if (currentRouteDomain && currentRouteDomain !== body.routeDomain) {
                transaction.push({
                    method: 'delete',
                    path: `${PATHS.RoutingPrefixList}/~${partition}~${list.name}`
                });
                transaction.push({
                    method: 'create',
                    path: PATHS.RoutingPrefixList,
                    body: bodyNoEntries
                });
                promises.push(promiseUtil.series([
                    () => this.bigIp.transaction(transaction),
                    () => this.bigIp.createOrModify(
                        PATHS.RoutingPrefixList, bodyNoRouteDomain, null, cloudUtil.MEDIUM_RETRY
                    )
                ]));
            } else {
                promises.push(
                    this.bigIp.createOrModify(PATHS.RoutingPrefixList, body, null, cloudUtil.MEDIUM_RETRY)
                );
            }
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating RoutingPrefixList: ${err.message}`);
            throw err;
        });
}

function handleRouteMap() {
    if (!this.declaration.Common.RouteMap) {
        return Promise.resolve();
    }

    const promises = [];
    doUtil.forEach(this.declaration, 'RouteMap', (partition, map) => {
        const transaction = [];
        if (map && Object.keys(map).length !== 0) {
            const entries = {};
            if (map.entries) {
                map.entries.forEach((entry) => {
                    entries[entry.name] = {
                        action: entry.action,
                        match: entry.match
                    };
                });
            }

            const body = {
                name: map.name,
                partition,
                entries,
                routeDomain: map.routeDomain
            };

            const bodyNoEntries = JSON.parse(JSON.stringify(body));
            delete bodyNoEntries.entries;

            const bodyNoRouteDomain = JSON.parse(JSON.stringify(body));
            delete bodyNoRouteDomain.routeDomain;

            // routeDomain is read-only. Modifying routeDomain in a delete-create transaction somehow gets around this
            // but for some reason the entries property is buggy in this transaction. Leaving entries out of the
            // delete-create transaction followed up by a modify that leaves out the routeDomain seems to work.
            const currentRouteDomain = doUtil.getDeepValue(this.state.currentConfig.Common, `RouteMap.${body.name}.routeDomain`);
            if (currentRouteDomain && currentRouteDomain !== body.routeDomain) {
                transaction.push({
                    method: 'delete',
                    path: `${PATHS.RouteMap}/~${partition}~${map.name}`
                });
                transaction.push({
                    method: 'create',
                    path: PATHS.RouteMap,
                    body: bodyNoEntries
                });
                promises.push(promiseUtil.series([
                    () => this.bigIp.transaction(transaction),
                    () => this.bigIp.createOrModify(PATHS.RouteMap, bodyNoRouteDomain, null, cloudUtil.MEDIUM_RETRY)
                ]));
            } else {
                promises.push(
                    this.bigIp.createOrModify(PATHS.RouteMap, body, null, cloudUtil.NO_RETRY)
                );
            }
        }
    });

    return Promise.all(promises)
        .catch((err) => {
            this.logger.severe(`Error creating RouteMap: ${err.message}`);
            throw err;
        });
}

function handleRoutingBGP() {
    if (!this.declaration.Common.RoutingBGP) {
        return Promise.resolve();
    }

    let promises = [];
    return Promise.resolve()
        .then(() => {
            if (this.state.currentConfig.Common.RoutingBGP) {
                Object.keys(this.state.currentConfig.Common.RoutingBGP || []).forEach((name) => {
                    const declBgp = this.declaration.Common.RoutingBGP[name];
                    if (declBgp) {
                        // BIGIP has a bug where a peerGroup with any members cannot be set to 'none' or overwritten.
                        // Get around by preemptively deleting any matches found in current config that are to be
                        // modified.
                        const curBgp = this.state.currentConfig.Common.RoutingBGP[name];
                        if ((curBgp.peerGroups && curBgp.peerGroups.length > 0)
                            || (curBgp.localAs !== declBgp.localAs)) {
                            this.logger.info('Pre-deleting RoutingBGP');
                            promises.push(
                                this.bigIp.delete(`${PATHS.RoutingBGP}/~Common~${name}`, null, null, cloudUtil.NO_RETRY)
                            );
                        }
                    } else {
                        // Process deletes here instead of in deleteHandler.  Can only have 1 RoutingBGP.
                        // If renamed the delete handler is too late.  The new RoutingBGP will already be created.
                        promises.push(
                            this.bigIp.delete(`${PATHS.RoutingBGP}/~Common~${name}`, null, null, cloudUtil.NO_RETRY)
                        );
                    }
                });
            }

            return Promise.all(promises)
                .catch((err) => {
                    this.logger.severe(`Error deleting existing RoutingBGP: ${err.message}`);
                    throw err;
                });
        })
        .then(() => {
            promises = [];
            doUtil.forEach(this.declaration, 'RoutingBGP', (tenant, bgp) => {
                if (bgp && Object.keys(bgp).length !== 0) {
                    const addressFamilies = [];

                    if (bgp.addressFamily) {
                        bgp.addressFamily.forEach((family) => {
                            const familyBody = {};
                            familyBody.name = family.name;
                            familyBody.redistribute = [];
                            if (family.redistribute) {
                                family.redistribute.forEach((r) => {
                                    const entry = {};
                                    entry.name = r.routingProtocol;
                                    entry.routeMap = r.routeMap;
                                    familyBody.redistribute.push(entry);
                                });
                            }
                            addressFamilies.push(familyBody);
                        });
                    }

                    const peerGroup = [];
                    if (bgp.peerGroups) {
                        bgp.peerGroups.forEach((peer) => {
                            const peerBody = {};
                            peerBody.name = peer.name;
                            if (peer.addressFamily) {
                                const peerAddressFamilies = [];
                                peer.addressFamily.forEach((af) => {
                                    const entry = {};
                                    entry.name = af.name;
                                    const routeMap = {};
                                    if (af.routeMap) {
                                        routeMap.in = af.routeMap.in;
                                        routeMap.out = af.routeMap.out;
                                    }
                                    entry.routeMap = routeMap;
                                    entry.softReconfigurationInbound = af.softReconfigurationInbound;
                                    peerAddressFamilies.push(entry);
                                });
                                peerBody.addressFamily = peerAddressFamilies;
                            }
                            peerBody.remoteAs = peer.remoteAs;
                            peerGroup.push(peerBody);
                        });
                    }

                    const neighbor = [];
                    if (bgp.neighbors) {
                        bgp.neighbors.forEach((n) => {
                            const neighborBody = {};
                            neighborBody.name = n.name;
                            neighborBody.ebgpMultihop = n.ebgpMultihop;
                            neighborBody.peerGroup = n.peerGroup;
                            neighbor.push(neighborBody);
                        });
                    }

                    const body = {
                        name: bgp.name,
                        partition: tenant,
                        addressFamily: addressFamilies,
                        gracefulRestart: bgp.gracefulRestart ? {
                            gracefulReset: bgp.gracefulRestart.gracefulReset,
                            restartTime: bgp.gracefulRestart.restartTime,
                            stalepathTime: bgp.gracefulRestart.stalepathTime
                        } : undefined,
                        keepAlive: bgp.keepAlive,
                        holdTime: bgp.holdTime,
                        localAs: bgp.localAs,
                        neighbor,
                        peerGroup,
                        routeDomain: bgp.routeDomain,
                        routerId: bgp.routerId
                    };

                    promises.push(
                        this.bigIp.createOrModify(PATHS.RoutingBGP, body, null, cloudUtil.MEDIUM_RETRY)
                    );
                }
            });

            return Promise.all(promises)
                .catch((err) => {
                    this.logger.severe(`Error creating RoutingBGP: ${err.message}`);
                    throw err;
                });
        });
}

/**
 * Deletes selfIps if they exist.
 *
 * Also deletes:
 *     + Floating SelfIps that are in the same subnet as the SelfIp as TMOS
 *       will not allow a non-floating SelfIp to be deleted if it would leave a
 *       floating SelfIp route unreachable.
 *       A list of deleted SelfIps will be returned to the caller.
 *     + Routes that are in the same subnet as the SelfIp as TMOS
 *       will not allow a SelfIp to be deleted if it would leave a route unreachable.
 *       A list of deleted Routes will be returned to the caller.
 *
 * @param {Object[]} selfIpBodies - SelfIps to delete if they exist
 *
 * @returns {Promise} A promise which is resolved with the list of SelfIps and Routes that
 *                    were deleted to enable deleting the SeflIps
 *
 *      {
 *          deletedFloatingSelfIps: [],
 *          deletedRouted: []
 *          deletedConfigSyncIp: '' | undefined
 *      }
 */
function deleteExistingSelfIps(selfIpBodies) {
    const existsPromises = [];
    const existingSelfIps = [];
    const deletedFloatingSelfIps = [];
    const deletedRoutes = [];
    let matchingSelfIps;
    let deletedConfigSyncIp;

    if (!selfIpBodies || !Array.isArray(selfIpBodies)) {
        return Promise.resolve({ deletedRoutes, deletedFloatingSelfIps });
    }

    selfIpBodies.forEach((selfIpBody) => {
        existsPromises.push(exists.call(this, PATHS.SelfIp, selfIpBody.partition, selfIpBody.name));
    });
    return Promise.all(existsPromises)
        .then((results) => {
            const existsResults = results && Array.isArray(results) ? results.slice() : [];
            existsResults.forEach((result, index) => {
                if (result) {
                    existingSelfIps.push(selfIpBodies[index]);
                }
            });
            return findMatchingRoutes.call(this, existingSelfIps);
        })
        .then((results) => {
            const matchingRoutes = results && Array.isArray(results) ? results.slice() : [];
            const routeDeletePromises = [];
            matchingRoutes.forEach((matchingRoute) => {
                routeDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.Route}/~${matchingRoute.partition}~${matchingRoute.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );
                deletedRoutes.push(matchingRoute);
            });
            return Promise.all(routeDeletePromises);
        })
        .then(() => findMatchingFloatingSelfIps.call(this, existingSelfIps))
        .then((results) => {
            matchingSelfIps = results && Array.isArray(results) ? results.slice() : [];
            return findMatchingConfigSyncIp.call(this, existingSelfIps.concat(matchingSelfIps));
        })
        .then((matchingConfigSyncIp) => {
            deletedConfigSyncIp = matchingConfigSyncIp;
            if (!matchingConfigSyncIp) {
                return Promise.resolve();
            }
            // The config sync IP matches one of the self IPs that will be deleted. We need to
            // delete the config sync IP before deleting the matching self IP
            return this.bigIp.cluster.configSyncIp('none', cloudUtil.SHORT_RETRY);
        })
        .then(() => {
            const selfIpDeletePromises = [];

            matchingSelfIps.forEach((selfIp) => {
                selfIpDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.SelfIp}/~${selfIp.partition}~${selfIp.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );

                // Keep track of any floating self IPs we are deleting because they are on the
                // same subnet as a non-floating self ip (but not if we were going to delete it
                // anyway)
                let alreadyDeleting = false;
                selfIpBodies.forEach((selfIpWereDeletingAlready) => {
                    if (selfIpWereDeletingAlready.address === selfIp.address
                        && selfIpWereDeletingAlready.trafficGroup === selfIp.trafficGroup) {
                        alreadyDeleting = true;
                    }
                });
                if (!alreadyDeleting) {
                    deletedFloatingSelfIps.push(selfIp);
                }
            });

            return Promise.all(selfIpDeletePromises);
        })
        .then(() => {
            const selfIpDeletePromises = [];
            existingSelfIps.forEach((selfIpBody) => {
                selfIpDeletePromises.push(
                    this.bigIp.delete(
                        `${PATHS.SelfIp}/~${selfIpBody.partition}~${selfIpBody.name}`,
                        null,
                        null,
                        cloudUtil.MEDIUM_RETRY
                    )
                );
            });

            return Promise.all(selfIpDeletePromises);
        })
        .then(() => Promise.resolve(
            { deletedRoutes, deletedFloatingSelfIps, deletedConfigSyncIp }
        ))
        .catch((err) => {
            this.logger.severe(`Error deleting SelfIp: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Finds the self IP address that we are about to delete that matches the config sync IP
 *
 * @param {Object[]} selfIpsToDelete - Self IPs we are going to delete
 * @returns {string|undefined} - config sync IP that matched
 */
function findMatchingConfigSyncIp(selfIpsToDelete) {
    const addDefaultRoute = (ip) => (ip.indexOf('%') < 0 ? `${ip}%0` : ip);

    return this.bigIp.deviceInfo()
        .then((deviceInfo) => this.bigIp.list(
            `/tm/cm/device/~Common~${deviceInfo.hostname}`,
            null,
            cloudUtil.SHORT_RETRY
        ))
        .then((device) => {
            let matchingConfigSyncIp;
            if (device && device.configsyncIp !== 'none') {
                const configSyncIp = addDefaultRoute(device.configsyncIp);
                const foundMatch = selfIpsToDelete.some((selfIp) => {
                    const selfIpAddress = addDefaultRoute(doUtil.stripCidr(selfIp.address));
                    return selfIpAddress === configSyncIp;
                });
                if (foundMatch) matchingConfigSyncIp = device.configsyncIp;
            }
            return matchingConfigSyncIp;
        });
}

/**
 * Finds all floating self IPs that are in the same subnet as the self ips we are about to delete
 *
 * @param {Object[]} selfIpsToDelete - Self IPs we are going to delete
 */
function findMatchingFloatingSelfIps(selfIpsToDelete) {
    const matchingSelfIps = [];

    if (selfIpsToDelete.length === 0) {
        return Promise.resolve(matchingSelfIps);
    }

    return this.bigIp.list(PATHS.SelfIp, null, cloudUtil.SHORT_RETRY)
        .then((selfIps) => {
            const existingSelfIps = selfIps && Array.isArray(selfIps) ? selfIps.slice() : [];

            existingSelfIps.forEach((existingSelfIp) => {
                if (!existingSelfIp.trafficGroup.endsWith('traffic-group-local-only')) {
                    selfIpsToDelete.forEach((selfIp) => {
                        if (selfIp.trafficGroup.endsWith('traffic-group-local-only')) {
                            if (isInSubnet(doUtil.stripCidr(existingSelfIp.address), selfIp.address)) {
                                if (matchingSelfIps.findIndex(elementMatches, existingSelfIp) === -1) {
                                    matchingSelfIps.push(existingSelfIp);
                                }
                            }
                        }
                    });
                }
            });

            return Promise.resolve(matchingSelfIps);
        })
        .catch((err) => {
            this.logger.severe(`Error finding matching floating self ips: ${err.message}`);
            return Promise.reject(err);
        });
}

/**
 * Finds all routes that are in the same subnet as the self ips we are about to delete
 *
 * @param {Object[]} selfIpsToDelete - Self IPs we are going to delete
 */
function findMatchingRoutes(selfIpsToDelete) {
    const matchingRoutes = [];

    if (selfIpsToDelete.length === 0) {
        return Promise.resolve(matchingRoutes);
    }

    return this.bigIp.list(PATHS.Route, null, cloudUtil.SHORT_RETRY)
        .then((routes) => {
            const existingRoutes = routes && Array.isArray(routes) ? routes.slice() : [];

            existingRoutes.forEach((route) => {
                selfIpsToDelete.forEach((selfIp) => {
                    if (route.gw && isInSubnet(route.gw, selfIp.address)) {
                        if (matchingRoutes.findIndex(elementMatches, route) === -1) {
                            matchingRoutes.push(route);
                        }
                    }
                });
            });

            return Promise.resolve(matchingRoutes);
        })
        .catch((err) => {
            this.logger.severe(`Error finding matching routes: ${err.message}`);
            return Promise.reject(err);
        });
}

function exists(path, partition, name) {
    return new Promise((resolve, reject) => {
        const partitionPath = `~${partition}~`;

        this.bigIp.list(`${path}/${partitionPath}${name}`, null, cloudUtil.SHORT_RETRY)
            .then(() => {
                resolve(true);
            })
            .catch((err) => {
                if (err.code === 404) {
                    resolve(false);
                } else {
                    reject(err);
                }
            });
    });
}

function elementMatches(element) {
    return this.name === element.name;
}

/**
 * Converts an array of firewall rules, provided by the
 * network.schema.json#/definitions/firewallRule definition, to an array
 * of rules formatted for an iControl REST request body.
 *
 * @param {Object[]} rules - The rules to be included in the request body.
 * @returns {Object[]} - The rules formatted for a request body.
 */
function formatRulesRequest(rules) {
    return rules.map((rule, index, array) => ({
        name: rule.name,
        description: rule.description,
        action: rule.action,
        ipProtocol: rule.ipProtocol,
        log: rule.log,
        placeAfter: index === 0 ? 'first' : array[index - 1].name,
        source: {
            addressLists: rule.source.addressLists || [],
            portLists: rule.source.portLists || [],
            vlans: rule.source.vlans || []
        },
        destination: {
            addressLists: rule.destination.addressLists || [],
            portLists: rule.destination.portLists || []
        }
    }));
}

module.exports = NetworkHandler;
