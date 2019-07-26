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

const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const RADIUS = require('./sharedConstants').RADIUS;
const AUTH = require('./sharedConstants').AUTH;

const logger = new Logger(module);

/**
 * Handles system parts of a declaration.
 *
 * @class
 */
class AuthHandler {
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
        logger.fine('Processing authentication declaration.');
        const auth = (this.declaration.Common || {}).Authentication;

        if (!auth) {
            return Promise.resolve();
        }

        return handleRadius.call(this)
            .then(() => handleSource.call(this));
    }
}

function handleRadius() {
    const radius = this.declaration.Common.Authentication.radius;

    if (!radius || !radius.servers) {
        return Promise.resolve();
    }
    const serverProms = [];

    const primary = radius.servers.primary;
    primary.name = RADIUS.PRIMARY_SERVER;
    primary.partition = 'Common';
    serverProms.push(this.bigIp.createOrModify(PATHS.AuthRadiusServer, primary));

    if (radius.servers.secondary) {
        const secondary = radius.servers.secondary;
        secondary.name = RADIUS.SECONDARY_SERVER;
        secondary.partition = 'Common';
        serverProms.push(this.bigIp.createOrModify(PATHS.AuthRadiusServer, secondary));
    }
    const opts = { silent: true };
    return Promise.all(serverProms)
        .then(() => this.bigIp.createOrModify(
            PATHS.AuthRadius,
            {
                name: AUTH.SUBCLASSES_NAME,
                serviceType: radius.serviceType,
                partition: 'Common'
            },
            undefined, undefined, opts
        ))
        .catch((err) => {
            logger.severe(`Error configuring remote RADIUS auth: ${err.message}`);
            return Promise.reject(err);
        });
}

function handleSource() {
    const auth = this.declaration.Common.Authentication;

    return this.bigIp.modify(
        PATHS.AuthSource,
        {
            type: auth.enabledSourceType,
            fallback: auth.fallback
        }
    );
}

module.exports = AuthHandler;
