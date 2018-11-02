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

const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

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
     * @param {Logger} callingLogger - {@link Logger} object from caller.
     * @param {Object} [options] - Optional parameters.
     * @param {String} [options.host] - IP or hostname of BIG-IP. Default localhost.
     * @param {String} [options.user] - User for iControl REST commands. Default admin.
     * @param {String} [options.password] - Password for iControl REST user. Default admin.
     */
    getBigIp(callingLogger, options) {
        const optionalArgs = {};
        Object.assign(optionalArgs, options);
        const bigIp = new BigIp({ logger: callingLogger });
        return initializeBigIp(
            bigIp,
            optionalArgs.host || 'localhost',
            optionalArgs.user || 'admin',
            optionalArgs.password || 'admin'
        );
    }
};

function initializeBigIp(bigIp, host, user, password) {
    return cloudUtil.runTmshCommand('list sys httpd ssl-port')
        .then((response) => {
            const regex = /(\s+ssl-port\s+)(\S+)\s+/;
            const port = regex.exec(response)[2];
            return bigIp.init(
                host,
                user,
                password,
                {
                    port,
                    product: 'BIG-IP'
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
