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

/* eslint-disable prefer-spread */

const PRODUCTS = require('@f5devcentral/f5-cloud-libs').sharedConstants.PRODUCTS;

const AjvValidator = require('./ajvValidator');
const configItems = require('./configItems.json');
const ConfigManager = require('./configManager');
const doUtil = require('./doUtil');
const Logger = require('./logger');
const State = require('./state');

const LOCALHOST_ADDRS = ['localhost', '127.0.0.1'];
const PROCESS_MAX_TIMEOUT = require('./sharedConstants').ENDPOINT_MAX_TIMEOUT;
const SCHEMA_VERSION = require('../schema/latest/base.schema.json').properties.schemaVersion.enum[0];
const STATUS = require('./sharedConstants').STATUS;

const NAMELESS_CLASSES = ConfigManager.getNamelessClasses(configItems);

/**
 * Handles inspecting device's configuration
 *
 * @class
 */
class InspectHandler {
    /**
     * Constructor
     *
     * @param {Object} queryParams - query params
     * @param {String} [taskId] - The id of the task
     */
    constructor(queryParams, taskId) {
        this.processTimeout = PROCESS_MAX_TIMEOUT;
        this.queryParams = queryParams || {};
        this.errors = [];
        this.taskId = taskId;
        this.logger = new Logger(module, taskId);
    }

    /**
     * Get status code
     *
     * @returns {Integer}
     */
    getCode() {
        let code = this.code;
        if (typeof code === 'undefined') {
            code = this.errors.length ? 500 : 200;
        }
        return code;
    }

    /**
     * Get status string
     *
     * @returns {String}
     */
    getStatus() {
        return this.getCode() >= 300 ? STATUS.STATUS_ERROR : STATUS.STATUS_OK;
    }

    /**
     * Get status message
     *
     * @returns {String}
     */
    getMessage() {
        let message = this.message;
        if (typeof message === 'undefined') {
            message = this.getCode() >= 300 ? 'failed' : '';
        }
        return message;
    }

    /**
     * Get error messages
     *
     * @returns {Array.<String>}
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Starts processing.
     *
     * @returns {Promise} A promise which is resolved when processing is complete
     */
    process() {
        this.logger.fine('Processing Inspect request.');
        return new Promise((resolve) => {
            // set timeout in case if request exceeded timeout (e.g. device not available)
            // if timeout exceeded then response will be empty object
            const timeoutID = setTimeout(() => {
                const errMsg = `Unable to complete request within specified timeout (${this.processTimeout / 1000}s.)`;
                this.logger.severe(`Error processing Inspect request: ${errMsg}`);

                this.code = 408;
                this.message = 'Request Timeout';
                this.errors.push(errMsg);
                resolve({});
            }, this.processTimeout);

            processRequest.call(this)
                .then((result) => {
                    clearTimeout(timeoutID);
                    resolve(result);
                })
                .catch((err) => {
                    // Unexpected error, response will be empty object
                    clearTimeout(timeoutID);
                    this.logger.severe(`Error processing Inspect request: ${err.message}`);
                    this.errors.push(err.message);
                    resolve({});
                });
        });
    }
}

/**
 * Check if targetHost is localhost
 *
 * @param {String} targetHost
 *
 * @returns {Boolean}
 */
function isTargetLoopback(targetHost) {
    return typeof targetHost === 'undefined' || LOCALHOST_ADDRS.indexOf(targetHost) !== -1;
}

/**
 * Process request
 *
 * @returns {Promise} resolved with DO declaration when request processing succeed
 */
function processRequest() {
    let targetDevice;
    return validateRequest.call(this)
        .then((targetDeviceFromRequest) => {
            targetDevice = targetDeviceFromRequest;
            // check platform if no targetHost specified or targetHost is localhost
            if (isTargetLoopback(targetDevice.host)) {
                return validatePlatform.call(this);
            }
            return Promise.resolve();
        })
        .then(() => {
            if (targetDevice.user) {
                return Promise.resolve(targetDevice.user);
            }
            return doUtil.getPrimaryAdminUser();
        })
        .then((user) => {
            targetDevice.user = user;
            return fetchCurrentConfiguration.call(this, targetDevice);
        })
        .then((currentConfig) => {
            try {
                return Promise.resolve(makeDeclarationFromConfig.call(this, currentConfig));
            } catch (err) {
                return Promise.reject(err);
            }
        })
        .then((declaration) => validateDeclaration.call(this, declaration))
        .then((declaration) => Promise.resolve({ declaration }));
}

/**
 * Validate declaration
 *
 * @param {Object} - declaration
 *
 * @returns {Promise} resolved when validation complete
 */
function validateDeclaration(declaration) {
    const ajvValidator = new AjvValidator();
    // copy declaration to avoid modifications by validator
    return ajvValidator.validate(JSON.parse(JSON.stringify(declaration)))
        .then((validationResult) => {
            if (!validationResult.isValid) {
                this.code = 412;
                this.message = 'Precondition failed';
                this.errors.push('Unable to verify declaration from existing state.');
                this.errors.push.apply(this.errors, validationResult.errors);
            }
            return Promise.resolve(declaration);
        });
}

/**
 * Validate request. Result can be empty object when no target* params specified in query
 *
 * @returns {Promise} resolved with target info if provided via request
 */
function validateRequest() {
    // values are query parameters, should be replaced with real values
    const target = {
        host: 'targetHost',
        port: 'targetPort',
        user: 'targetUsername',
        password: 'targetPassword'
    };
    const errors = [];

    Object.keys(target).forEach((key) => {
        const param = target[key];
        const value = this.queryParams[param];
        // all params are expected to be non-empty string
        if (typeof value === 'string' && value) {
            target[key] = value;
        } else {
            if (typeof value !== 'undefined') {
                errors.push(`Invalid value for parameter '${param}'.`);
            }
            delete target[key];
        }
    });
    if (target.port) {
        target.port = parseInt(target.port, 10);
        if (!(target.port >= 0 && target.port <= 65535)) {
            errors.push('"targetPort" should be in range (0, 65535).');
        }
    }
    // fail if no host provided but any other key specified
    if (!target.host && Object.keys(target).length) {
        errors.push('"targetHost" should be specified.');
    } else if (target.host) {
        // just make loopback verification easier
        target.host = target.host.toLowerCase();
    }
    if (errors.length) {
        this.code = 400;
        this.message = 'Bad Request';
        const err = new Error(errors.join(' '));
        return Promise.reject(err);
    }
    return Promise.resolve(target);
}

/**
 * Validate platform
 *
 * @returns {Promise} resolved when platform is BIG-IP
 */
function validatePlatform() {
    return doUtil.getCurrentPlatform(this.taskId)
        .then((platform) => {
            if (platform !== PRODUCTS.BIGIP) {
                this.code = 403;
                this.message = 'Forbidden';
                return Promise.reject(new Error('Should be executed on BIG-IP or should specify "target*" parameters.'));
            }
            return Promise.resolve();
        });
}

/**
 * Fetch current configuration from device
 *
 * @param {Object} [targetDevice] - target device information
 * @param {String} [targetDevice.host] - target host address
 * @param {String} [targetDevice.port] - target host port
 * @param {String} [targetDevice.user] - target host username
 * @param {String} [targetDevice.password] - target host password
 *
 * @returns {Promise} resolved with current configuration object
 */
function fetchCurrentConfiguration(targetDevice) {
    // use empty State objects to avoid modifications to existing state
    const state = { id: this.taskId };
    const doState = new State();

    return doUtil.getBigIp(this.logger, targetDevice)
        .then((bigIp) => {
            const configManager = new ConfigManager(`${__dirname}/configItems.json`, bigIp, state);
            const configOptions = {
                translateToNewId: true
            };
            return configManager.get({}, doState, configOptions);
        })
        .then(() => {
            const originalConfig = state.originalConfig || {};
            delete originalConfig.parsed;
            return Promise.resolve(originalConfig);
        });
}

/**
 * Maps things like 'enabled/disabled' to true/false
 *
 * @param {Object} configObject  - config object (SelfIp, VLAN, etc.)
 * @param {Object} property      - property to map
 * @param {String} [property.id] - property name
 * @param {any} [property.truth] - value to compare
 *
 * @returns {Boolean} whether or not the property value represents truth
 */
function mapTruth(configObject, property) {
    if (!configObject[property.id]) {
        return false;
    }
    return configObject[property.id] === property.truth;
}

/**
 * Process item property
 *
 * @param {Object} property                            - property object
 * @param {String} [property.id]                       - property name
 * @param {Boolean} [property.remove]                  - remove property
 * @param {any | Array.<any>} [property.removeIfValue] - remove property if value matches
 * @param {any} [property.truth]                       - map property's value to true/false
 * @param {Object} configObject                        - config object (SelfIp, VLAN, etc.)
 */
function processItemProperty(property, configObject) {
    if ('removeIfValue' in property) {
        const value = configObject[property.id];
        const rmValue = property.removeIfValue;
        const exists = Array.isArray(rmValue) ? rmValue.indexOf(value) !== -1 : value === rmValue;
        if (exists) {
            delete configObject[property.id];
        }
    }
    if ('truth' in property) {
        configObject[property.id] = mapTruth(configObject, property);
    }
    if ('remove' in property) {
        delete configObject[property.id];
    }
    if ('replaceIfValue' in property) {
        if (Array.isArray(configObject[property.id])) {
            configObject[property.id] = configObject[property.id]
                .map((item) => (item === property.replaceIfValue ? property.newValue : item));
        } else if (configObject[property.id] === property.replaceIfValue) {
            configObject[property.id] = property.newValue;
        }
    }
}

/**
 * Custom Functions for configObject processing.
 * Should be run as last part of configObject processing.
 *
 * @param {String} configKey
 * @param {Object} configObject
 * @param {Object} options
 * @param {Object} options.configItem
 * @param {Object} options.declItem
 * @param {Object} options.customFunc
 *
 * @returns {Object | undefined} configObject or undefined if object
 *                               should be removed from declaration.
 */
const customFunctions = {
    // ManagementIp
    remapManagementIp: (configKey, configObject) => {
        configKey = 'currentManagementIp';
        return [configKey, configObject];
    },
    // DNS_Resolver item
    remapNameservers: (configKey, configObject) => {
        if (configObject.forwardZones) {
            configObject.forwardZones.forEach((zone) => {
                zone.nameservers = zone.nameservers.map((nameserver) => nameserver.name);
            });
        }
        return [configKey, configObject];
    },
    // FailoverUnicast item
    formatFailoverUnicast: (configKey, configObject) => {
        if (configObject.addressPorts === 'none') {
            return [configKey, undefined];
        }

        return [configKey, configObject];
    },
    // Authentication item
    removeIncompleteAuthMethods: (configKey, configObject) => {
        const radius = configObject.radius;
        const ldap = configObject.ldap;
        const tacacs = configObject.tacacs;

        // if no servers defined then remove auth configs
        if (radius && !(radius.servers && radius.servers.primary)) {
            delete configObject.radius;
        }
        if (ldap && !ldap.servers) {
            delete configObject.ldap;
        }
        if (tacacs && !tacacs.servers) {
            delete configObject.tacacs;
        }
        return [configKey, configObject];
    },
    // LDAP item
    removeLdapCertAndKey: (configKey, configObject) => {
        if (configObject.ldap) {
            delete configObject.ldap.sslCaCert;
            delete configObject.ldap.sslClientCert;
            delete configObject.ldap.sslClientKey;
        }
        return [configKey, configObject];
    },
    // RouteDomain item
    renameDefaultRouteDomain: (configKey, configObject) => {
        if (typeof configObject.id !== 'undefined' && configObject.id.toString() === '0') {
            configKey = 'rd0';
        }
        return [configKey, configObject];
    },
    // GSLB Prober Pool item
    formatGSLBProberPool: (configKey, configObject) => {
        // Order is determined automatically by array order in the schema and the property is not needed
        configObject.members.forEach((member) => {
            delete member.order;
        });
        return [configKey, configObject];
    },
    // SecurityAnalytics
    remapStaleRules: (configKey, configObject) => {
        configObject.collectStaleRulesEnabled = configObject.collectStaleRulesEnabled.collect;
        return [configKey, configObject];
    },
    // SecurityWaf
    convertAdvancedSettings: (configKey, configObject) => {
        if (configObject.advancedSettings) {
            configObject.advancedSettings = Object.keys(configObject.advancedSettings).map((setting) => (
                { name: setting, value: configObject.advancedSettings[setting].value }
            ));
        }
        return [configKey, configObject];
    },
    // Some items with schemaMerge are skipped in the general handling but
    // should be processed by processItem anyway
    remapItemWithSchemaMerge: (configKey, configObject) => [configKey, configObject]
};

/**
 * Process item
 *
 * @param {Object} configItem           - config item
 * @param {Object} declItem             - declaration item
 * @param {Array} [declItem.properties] - declaration properties to process
 * @param {String} configKey            - config object's name
 * @param {Object} configObject         - config object (SelfIp, VLAN, etc.)
 *
 * @returns {[String, any]} tuple with config object's name config and object's value
 *  transformed to its declaration representation
 */
function processItem(configItem, declItem, configKey, configObject) {
    // just return original data if not object
    if (typeof configObject === 'object') {
        // copy original data
        configObject = JSON.parse(JSON.stringify(configObject));
        configObject.class = configItem.schemaClass;

        // most declaration objects has no 'name' property, but some may have
        // an override
        const hasNameOverride = configItem.properties.find((property) => property.newId === 'name');
        if (hasNameOverride === undefined) {
            delete configObject.name;
        }

        // process properties if needed
        if (declItem.properties) {
            declItem.properties.forEach((property) => {
                processItemProperty(property, configObject);
            });
        }
    }
    let ret = [configKey, configObject];
    if (declItem.customFunctions) {
        declItem.customFunctions.forEach((customFunc) => {
            ret = customFunctions[customFunc.id](
                ret[0], ret[1], { configItem, declItem, customFunc }
            );
        });
    }
    return ret;
}

/**
 * Process config item
 *
 * @param {Object} configItem                          - config item
 * @param {Object | Boolean} [configItem.declaration]  - declaration options. Can be object with options
 *                                                          or boolean (true/false to enable/disable)
 * @param {Boolean} [configItem.declaration.enable]    - enable/disable transformation to declaration
 * @param {String} [configItem.declaration.name]       - config object name (when object has not 'class' property)
 * @param {String} [configItem.declaration.targetName] - target name for config object (useful for nameless objects
 *                                                          like 'hostname'). If omitten then 'class' property with
 *                                                          prefix 'current' will be used
 * @param {Array} [configItem.declaration.properties]  - declaration properties to process
 * @param {Object} tenantConfig                        - tenant config (contains all objects - SelfIPs, VLANs and etc.)
 * @param {Function(String, Object)} callback          - callback to call when config object processed
 */
function processConfigItem(configItem, tenantConfig, callback) {
    let declItem = typeof configItem.declaration !== 'undefined' ? configItem.declaration : {};
    // item excluded from declaration or is part of another item (ignore items with schemaMerge for now)
    if (declItem === false
        || (!declItem.customFunctions && typeof configItem.schemaMerge !== 'undefined')) {
        return;
    }
    // deep copy if object or create new
    declItem = typeof declItem === 'undefined' ? {} : JSON.parse(JSON.stringify(declItem));
    const configName = declItem.name || configItem.schemaClass;
    const item = tenantConfig[configName];
    // early return if no object exists with such name
    if (typeof item === 'undefined') {
        return;
    }
    if (NAMELESS_CLASSES.indexOf(configName) > -1 || !(typeof item === 'object' || Array.isArray(item))) {
        const itemKey = declItem.name || `current${configItem.schemaClass}`;
        callback.apply(null, processItem(configItem, declItem, itemKey, item));
    } else {
        Object.keys(item).forEach((itemKey) => {
            callback.apply(null, processItem(configItem, declItem, itemKey, item[itemKey]));
        });
    }
}

/**
 * Convert Config to Declaration
 *
 * @param {Object} config - config object
 *
 * @returns {Object} declaration made from provided config
 */
function makeDeclarationFromConfig(config) {
    let hasDuplicates = false;
    const result = {
        class: 'Device',
        schemaVersion: SCHEMA_VERSION
    };
    delete config.version;
    // expect "tenant" name on the top of the object
    Object.keys(config).forEach((tenant) => {
        const tenantDeclaration = {
            class: 'Tenant'
        };
        const tenantConfig = config[tenant];
        const duplicates = {};

        configItems.forEach((configItem) => {
            if (!configItem.path) {
                return;
            }
            processConfigItem(configItem, tenantConfig, (declKey, declObj) => {
                // undefined means that item should be removed from declaration
                if (typeof declObj === 'undefined') {
                    return;
                }
                let targetKey = declKey;
                // check for duplicates - objects share same name (usually SelfIPs, VLANs, Routes)
                if (declKey in tenantDeclaration) {
                    hasDuplicates = true;
                    // object with such name exists in declaration already
                    // mark it as duplicate name
                    duplicates[declKey] = 1;
                    // create new name and assign new name to existing object
                    targetKey = `${declKey}_INVALID_${duplicates[declKey]}`;
                    tenantDeclaration[targetKey] = tenantDeclaration[declKey];
                    // remove old entry
                    delete tenantDeclaration[declKey];
                }
                if (declKey in duplicates) {
                    // assign new name in case if object previosly marked as duplicate
                    duplicates[declKey] += 1;
                    targetKey = `${declKey}_INVALID_${duplicates[declKey]}`;
                }
                tenantDeclaration[targetKey] = declObj;
            });
        });
        result[tenant] = tenantDeclaration;
    });

    if (hasDuplicates) {
        this.code = 409;
        this.message = 'Conflict';
        this.errors.push('Declaration contains INVALID items (suffixed with INVALID_X)');
    }
    // return result in any case
    return {
        class: 'DO',
        declaration: result
    };
}

module.exports = InspectHandler;
