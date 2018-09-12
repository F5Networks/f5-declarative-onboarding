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
const SystemHandler = require('./systemHandler');
const NetworkHandler = require('./networkHandler');
const logger = require('./logger');

class DeclarationHandler {
    constructor(declaration) {
        this.declaration = declaration;
    }

    process() {
        const bigIp = new BigIp({ logger });
        return bigIp.init('localhost', 'admin', 'admin', { port: '8443' })
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
