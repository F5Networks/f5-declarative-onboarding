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
const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const Logger = require('./logger');

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
        return initializeBigIp(
            bigIp,
            optionalArgs.host || 'localhost',
            optionalArgs.port,
            optionalArgs.user || 'admin',
            optionalArgs.authToken || optionalArgs.password || 'admin',
            {
                passwordIsToken: !!optionalArgs.authToken
            }
        );
    }
};

function initializeBigIp(bigIp, host, port, user, password, options) {
    let portPromise;
    if (port) {
        portPromise = Promise.resolve(port);
    } else {
        portPromise = getPort();
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
}

/**
 * Gets the port for the management address when running on a BIG-IP
 */
function getPort(host) {
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
}
