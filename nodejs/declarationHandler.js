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
const DeclarationParser = require('./declarationParser');
const Logger = require('./logger');
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');
const TenantHandler = require('./tenantHandler');

const logger = new Logger(module);

/**
 * Main processing for a parsed declaration.
 *
 * @class
 */
class DeclarationHandler {
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
        logger.fine('Processing declaration.');
        const declarationParser = new DeclarationParser(this.declaration);
        const declarationInfo = declarationParser.parse();

        return cloudUtil.runTmshCommand('list sys httpd ssl-port')
            .then((response) => {
                const regex = /(\s+ssl-port\s+)(\S+)\s+/;
                const port = regex.exec(response)[2];
                return this.bigIp.init(
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
                return this.bigIp.modify('/tm/sys/global-settings', { guiSetup: 'disabled' });
            })
            .then(() => {
                return new TenantHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                return new SystemHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                return new NetworkHandler(declarationInfo, this.bigIp).process();
            })
            .then(() => {
                logger.info('Done processing declartion.');
                return Promise.resolve();
            })
            .catch((err) => {
                logger.severe(`Error processing declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

module.exports = DeclarationHandler;
