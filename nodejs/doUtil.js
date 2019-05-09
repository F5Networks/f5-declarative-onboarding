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

const net = require('net');
const exec = require('child_process').exec;
const dns = require('dns');
const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const httpUtil = require('@f5devcentral/f5-cloud-libs').httpUtil;
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;
const Logger = require('./logger');
const ipF5 = require('../schema/formats').f5ip;

const logger = new Logger(module);

/**
 * @module
 */
module.exports = {
    /**
     * The @f5devcentral/f5-cloud-libs/BigIp object
     * @external BigIp
     */

    /**
     * Gets and initializes a [BigIp]{@link external:BigIp} object
     *
     * @param {Logger}  callingLogger - {@link Logger} object from caller.
     * @param {Object}  [options] - Optional parameters.
     * @param {String}  [options.host] - IP or hostname of BIG-IP. Default localhost.
     * @param {Number}  [options.port] - Port for management address on host.
     * @param {String}  [options.user] - User for iControl REST commands. Default admin.
     * @param {String}  [options.password] - Password for iControl REST user. Default admin.
     * @param {Boolean} [options.authToken] - Use this auth token instead of a password.
     */
    getBigIp(callingLogger, options) {
        const optionalArgs = {};
        Object.assign(optionalArgs, options);
        const bigIp = new BigIp({ logger: callingLogger });
        return this.initializeBigIp(
            bigIp,
            optionalArgs.host || 'localhost',
            optionalArgs.port,
            optionalArgs.user || 'admin',
            optionalArgs.authToken || optionalArgs.password || 'admin',
            {
                passwordIsToken: !!optionalArgs.authToken
            }
        );
    },

    initializeBigIp(bigIp, host, port, user, password, options) {
        let portPromise;
        if (port) {
            portPromise = Promise.resolve(port);
        } else {
            portPromise = this.getPort(host);
        }
        return portPromise
            .then((managmentPort) => {
                return bigIp.init(
                    host,
                    user,
                    password,
                    {
                        port: managmentPort,
                        product: 'BIG-IP',
                        passwordIsToken: options.passwordIsToken
                    }
                );
            })
            .then(() => {
                return Promise.resolve(bigIp);
            })
            .catch((err) => {
                logger.severe(`Error initializing BigIp: ${err.message}`);
                return Promise.reject(err);
            });
    },

    /**
     * Gets the port for the management address when running on a BIG-IP
     */
    getPort(host) {
        const ports = [8443, 443];

        function tryPort(index, resolve, reject) {
            if (index < ports.length) {
                const port = ports[index];
                const socket = net.createConnection({ host, port });
                socket.on('connect', () => {
                    socket.end();
                    resolve(port);
                });
                socket.on('error', () => {
                    socket.destroy();
                    tryPort(index + 1, resolve, reject);
                });
            } else {
                reject(new Error('Could not determine device port'));
            }
        }

        return new Promise((resolve, reject) => {
            tryPort(0, resolve, reject);
        });
    },

    /**
     * Determines the platform on which we are currently running
     *
     * @returns {Promise} A promise which is resolved with the platform.
     */
    getCurrentPlatform() {
        return new Promise((resolve, reject) => {
            httpUtil.get('http://localhost:8100/shared/identified-devices/config/device-info')
                .then((deviceInfo) => {
                    let platform = 'CONTAINER';
                    if (deviceInfo && deviceInfo.slots) {
                        const activeSlot = deviceInfo.slots.find((slot) => {
                            return slot.isActive && slot.product;
                        });

                        if (activeSlot) {
                            platform = activeSlot.product;
                        }
                    }
                    logger.info(`Platform: ${platform}`);
                    resolve(platform);
                })
                .catch((err) => {
                    logger.warning(`Error detecting current platform: ${err.message}`);
                    reject(err);
                });
        });
    },

    /**
     * Determines if a reboot is required.
     *
     * @param {BigOp} bigIp - BigIp object
     *
     * @returns {Promise} - A promise which resolves true or false based on whehter or not
     *                      the BigIp requires a reboot.
     */
    rebootRequired(bigIp) {
        return this.getCurrentPlatform()
            .then((platform) => {
                let promise;
                if (platform === PRODUCTS.BIGIP) {
                    // If we are running on  a BIG-IP, run a local tmsh command
                    promise = this.executeBashCommandLocal('cat /var/prompt/ps1');
                } else {
                    // Otherwise, use a remote command
                    promise = this.executeBashCommandRemote(bigIp, 'cat /var/prompt/ps1');
                }

                return promise;
            })
            .then((ps1Prompt) => {
                if (ps1Prompt.trim() === 'REBOOT REQUIRED') {
                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            })
            .then((promptSaysRebootRequired) => {
                // Double check the db var. If either the prompt or the db var says
                // reboot required, then reboot is required.
                if (!promptSaysRebootRequired) {
                    return bigIp.list('/tm/sys/db/provision.action', null, cloudUtil.NO_RETRY)
                        .then((response) => {
                            return Promise.resolve(response.value === 'reboot');
                        });
                }
                return Promise.resolve(true);
            })
            .then((rebootRequired) => {
                return Promise.resolve(rebootRequired);
            });
    },

    /**
     * Return a promise to execute a bash command on a BIG-IP using
     * child-process.exec.
     *
     * @param {string} command - bash command to execute
     * @returns {Promise} - A promise which resolves to a string containing the command output
     */
    executeBashCommandLocal(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout) => {
                if (error !== null) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    },

    /**
     * Returns a promise to execute a bash command on a BIG-IP remotely.
     *
     * @param {string} command - bash command to execute
     *
     * @returns {Promise} - resolves to a string containing the command output
     */
    executeBashCommandRemote(bigIp, command) {
        const commandBody = {
            command: 'run',
            utilCmdArgs: `-c "${command}"`
        };

        return bigIp.create(
            '/tm/util/bash',
            commandBody,
            null,
            cloudUtil.SHORT_RETRY
        )
            .then((result) => {
                return result.commandResult;
            });
    },

    /**
     * Fills in values that are referenced by json-pointers.
     *
     * @param {Object} declaration - The declaration containing potentially referenced values
     * @param {Object} container - Object of keys/values to dereference
     */
    dereference(declaration, container) {
        const dereferenced = {};
        Object.assign(dereferenced, container);

        Object.keys(dereferenced).forEach((key) => {
            if (typeof dereferenced[key] === 'string' && dereferenced[key].startsWith('/')) {
                const value = this.dereferencePointer(declaration, dereferenced[key]);

                if (typeof value === 'string') {
                    dereferenced[key] = value;
                }
            }
        });

        return dereferenced;
    },

    /**
     * Dereferences a JSON pointer in an object
     *
     * @param {Object} declaration - Object containing pointer
     * @param {String} pointer - The pointer to some other value in the object
     */
    dereferencePointer(declaration, pointer) {
        if (!pointer.startsWith('/')) {
            return pointer;
        }

        let value = declaration;
        const keys = pointer.split('/');
        keys.forEach((key) => {
            if (key && value) {
                value = value[key];
            }
        });

        return value;
    },

    /**
     * Removes the CIDR from an IP address
     *
     * @param {String} address - IP address with CIDR.
     *
     * @returns {String} - The IP address without the CIDR.
     */
    stripCidr(address) {
        let stripped = address;
        const slashIndex = address.indexOf('/');
        if (slashIndex !== -1) {
            stripped = address.substring(0, slashIndex);
        }
        return stripped;
    },

    /**
     * Checks if hostname exists
     * @param {String} address - URL address
     * @returns {boolean} found - Returns if the hostname was found
     */
    checkDnsResolution(address) {
        return new Promise((resolve, reject) => {
            if (ipF5(address)) {
                resolve(true);
                return;
            }
            try {
                dns.lookup(address, (error) => {
                    if (error) {
                        error.message = `Unable to resolve host ${address}: ${error.message}`;
                        reject(error);
                        return;
                    }
                    resolve(true);
                });
            } catch (error) {
                // if DNS.resolve errors it throws an exception instead of rejecting
                error.message = `Unable to resolve host ${address}: ${error.message}`;
                reject(error);
            }
        });
    }
};
