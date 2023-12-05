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

const Logger = require('./logger');
const PATHS = require('./sharedConstants').PATHS;
const ADVANCED_SETTINGS_IDS = require('./sharedConstants').WAF_ADVANCED_SETTINGS;
const doUtil = require('./doUtil');

/**
 * Handles security parts of a declaration.
 *
 * @class
 */
class SecurityHandler {
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
        this.logger.fine('Processing security declaration.');

        return Promise.resolve()
            .then(() => {
                this.logger.fine('Checking SecurityAnalytics');
                return handleSecurityAnalytics.call(this);
            })
            .then(() => {
                this.logger.fine('Checking SecurityWaf');
                return handleSecurityWaf.call(this);
            })
            .catch((err) => {
                this.logger.severe(`Error processing security declaration: ${err.message}`);
                return Promise.reject(err);
            });
    }
}

function handleSecurityAnalytics() {
    if (this.declaration.Common.SecurityAnalytics) {
        return this.bigIp.modify(
            PATHS.SecurityAnalytics,
            this.declaration.Common.SecurityAnalytics
        );
    }
    return Promise.resolve();
}

function handleSecurityWaf() {
    if (this.declaration.Common.SecurityWaf) {
        const promises = [];
        const virusProtection = this.declaration.Common.SecurityWaf.antiVirusProtection;
        const advancedSettings = this.declaration.Common.SecurityWaf.advancedSettings;

        if (virusProtection) {
            promises.push(this.bigIp.modify(PATHS.AntiVirusProtection, virusProtection));
        }

        if (advancedSettings) {
            const cliCommand = '/usr/share/ts/bin/add_del_internal';
            const originalAdvancedSettings = doUtil.getDeepValue(this.state.originalConfig, 'Common.SecurityWaf.advancedSettings') || {};
            const currentAdvancedSettings = doUtil.getDeepValue(this.state.currentConfig, 'Common.SecurityWaf.advancedSettings') || {};

            Object.keys(advancedSettings).forEach((setting) => {
                if (ADVANCED_SETTINGS_IDS[setting] === 'USER_DEFINED') {
                    promises.push(doUtil.executeBashCommandIControl(this.bigIp, `${cliCommand} add ${setting} ${advancedSettings[setting].value}`));
                } else {
                    const id = ADVANCED_SETTINGS_IDS[setting];
                    promises.push(this.bigIp.modify(`${PATHS.WafAdvancedSettings}/${id}`, advancedSettings[setting]));
                }
            });

            // Check for user defined items that have been deleted from the declaration and were not in originalConfig
            Object.keys(ADVANCED_SETTINGS_IDS).forEach((setting) => {
                if (ADVANCED_SETTINGS_IDS[setting] === 'USER_DEFINED') {
                    if (currentAdvancedSettings[setting]
                        && !(advancedSettings[setting] && originalAdvancedSettings[setting])) {
                        promises.push(doUtil.executeBashCommandIControl(this.bigIp, `${cliCommand} del ${setting}`));
                    }
                }
            });
        }

        if (promises.length > 0) {
            return Promise.all(promises)
                .then(() => doUtil.restartService(this.bigIp, 'asm', { taskId: this.state.id }));
        }
    }
    return Promise.resolve();
}

module.exports = SecurityHandler;
