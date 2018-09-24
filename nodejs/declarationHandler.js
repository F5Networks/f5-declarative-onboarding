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

const logger = require('f5-logger').getInstance(); // eslint-disable-line import/no-unresolved
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;
const BigIp = require('@f5devcentral/f5-cloud-libs').bigIp;
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');

class DeclarationHandler {
    constructor(declaration) {
        this.declaration = declaration;
        logger.silly = logger.finest;
        logger.verbose = logger.finer;
        logger.debug = logger.fine;
        logger.error = logger.severe;
    }

    process() {
        const bigIp = new BigIp({ logger });
        return cloudUtil.runTmshCommand('list sys httpd ssl-port')
            .then((response) => {
                const regex = /(\s+ssl-port\s+)(\S+)\s+/;
                const port = regex.exec(response)[2];
                return bigIp.init(
                    'localhost',
                    'admin',
                    'admin',
                    {
                        port,
                        product: 'BIG-IP'
                    }
                );
            })
            .then(() => {
                return bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
            })
            .then(() => {
                return new SystemHandler(this.declaration.system, bigIp).process();
            })
            .then(() => {
                return new NetworkHandler(this.declaration.network, bigIp).process();
            })
            .catch((err) => {
                return Promise.reject(err);
            });
    }
}

module.exports = DeclarationHandler;
