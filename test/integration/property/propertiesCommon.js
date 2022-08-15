/**
 * Copyright 2022 F5 Networks, Inc.
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

const fs = require('fs');
const assert = require('assert');
const parseUrl = require('url').parse;

const promiseUtil = require('@f5devcentral/atg-shared-utilities').promiseUtils;
const cloudUtil = require('@f5devcentral/f5-cloud-libs').util;

const schema = require('../../../src/schema/latest/base.schema.json');
const common = require('../common');
const constants = require('../constants');
const propertyMap = require('../../../src/lib/configItems.json');
const PATHS = require('../../../src/lib/sharedConstants').PATHS;

const consoleOptions = {
    declarations: false, // display the declarations that are created
    expectedActual: false, // display expected and actual values
    mcpError: false, // display errors from receiving MCP objects
    postRequest: false, // display the declaration we are about to POST
    postResult: false // display the result from the POST
};

let BIGIP_VERSION = '0.0.0';
let PROVISIONED_MODULES = [];

const DEFAULT_OPTIONS = {
    findAll: false,
    bigipItems: [],
    extraItems: [],
    tenantName: 'Common',
    dryRun: process.env.DRY_RUN,
    skipIdempotentCheck: false,
    maxPathLength: 195,
    maxNameLength: 48,
    getMcpObject: {},
    getMcpValueDelay: 0,
    maxMcpRetries: 0 // -1 will poll mcp indefinitely, until success or timeout
};

let bigIpAuth;
let bigIpUrl;
let testInfo;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function getAuth() {
    return bigIpAuth;
}

function sendRequest(options, retryOptions) {
    return common.sendRequest(options, retryOptions || { trials: 3, timeInterval: 500 })
        .then((response) => {
            let body;
            try {
                body = JSON.parse(response.body);
            } catch (err) {
                body = response.body;
            }
            return Object.assign(response.response, { body });
        });
}

function getTestInfo(currentTest) {
    const testName = `${currentTest.parent.title}.${currentTest.title}`.replace('/', '');
    const testDir = `test/logs/${testName}`;
    return {
        testName,
        testDir
    };
}

function toCamelCase(string) {
    return string.replace(/-[a-z]/g, (x) => x[1].toUpperCase());
}

function getIndexOrLast(array, index) {
    if (index >= array.length) {
        return array[array.length - 1];
    }
    return array[index];
}

function getInputValue(property, index) {
    if (typeof property.inputValue === 'undefined') {
        return undefined;
    }
    const value = getIndexOrLast(property.inputValue, index);

    if (typeof value === 'object') {
        return JSON.parse(JSON.stringify(value));
    }

    return value;
}

function setDeepValue(source, path, value) {
    const pathComponents = path.split('.');

    if (!source) {
        return;
    }

    if (pathComponents.length === 1) {
        source[pathComponents[0]] = value;
        return;
    }

    const nextSource = source[pathComponents[0]];
    const nextPath = pathComponents.slice(1).join('.');
    setDeepValue(nextSource, nextPath, value);
}

function getExpectedValue(property, index) {
    if (!property.expectedValue) {
        throw new Error(`The property ${property.name} has no expectedValue field`);
    }
    return getIndexOrLast(property.expectedValue, index);
}

function createDeclarations(targetClass, properties, options) {
    const declarations = [];

    const count = properties
        .map((p) => ((p.inputValue) ? p.inputValue.length : p.expectedValue.length))
        .reduce((result, current) => Math.max(result, current), 0);

    for (let i = 0; i < count; i += 1) {
        const declaration = {
            class: 'Device',
            schemaVersion: schema.properties.schemaVersion.enum[0],
            async: true
        };

        declaration.controls = {
            class: 'Controls',
            trace: true,
            logLevel: 'debug',
            traceResponse: true
        };

        const itemDeclaration = { class: targetClass };
        properties.forEach((property) => {
            const inputValue = getInputValue(property, i);
            if (typeof inputValue !== 'undefined') {
                setDeepValue(itemDeclaration, property.name, inputValue);
            }
        });

        const itemName = getItemName(options);
        const itemContainer = options.innerContainer ? { [options.innerContainer]: itemDeclaration } : itemDeclaration;
        declaration[options.tenantName] = {
            class: 'Tenant',
            [itemName]: itemContainer
        };

        const tenant = declaration[options.tenantName];

        properties.forEach((property) => {
            if (property.referenceObjects) {
                Object.keys(property.referenceObjects).forEach((key) => {
                    tenant[key] = property.referenceObjects[key];
                });
            }
        });

        options.extraItems.forEach((item, index) => {
            declaration[options.tenantName][`extraItem${index}`] = item;
        });

        declarations.push(declaration);
    }

    if (consoleOptions.declarations) {
        console.log(`${JSON.stringify(declarations, null, 2)}`);
    }
    return declarations;
}

function _waitForCompleteStatus(id) {
    const url = `${bigIpUrl}${constants.DO_API}/task/${id}`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'GET');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((response) => {
            // If result still has a code of 202, the request is still processing
            // If there is no result, services may be restarting, so continue waiting
            const result = response.body.result;
            if (!result || result.code === 202) {
                return promiseUtil.delay(1000).then(() => _waitForCompleteStatus(id));
            }
            return response.body;
        });
}

/**
 * Processes a declaration and response as a single declaration. Generally speaking this is the
 *   function you will want to develop tests with. Unless you know the specific reason you need
 *   another function to post declarations.
 *
 * @param {object} declaration - JSON declaration to be submitted
 * @param {object} [logInfo] - Info on needed to log declarations and results. If present, logs are written.
 * @param {number} [logInfo.declarationIndex] - The declaration index we are processing
 * @param {string} [queryParams] - The query parameters to be added to the request path
 * @param {string} [path] - The path to post to
 */
function postDeclaration(declaration, logInfo, queryParams, path) {
    const queryString = (typeof queryParams === 'undefined') ? '' : queryParams;

    let promise = Promise.resolve();

    if (logInfo) {
        promise = promise.then(() => new Promise((resolve, reject) => {
            const fileName = `${testInfo.testDir}/${testInfo.testName}.${logInfo.declarationIndex}.json`;
            const declBody = JSON.stringify(declaration, null, 4);
            fs.writeFile(fileName, declBody, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        }));
    }

    return promise
        .then(() => sendDeclaration(declaration, queryString, path))
        .then((response) => {
            if (declaration.async === true) {
                return _waitForCompleteStatus(response.body.id);
            }
            return Promise.resolve(response.body);
        })
        .then((result) => {
            if (logInfo) {
                const fileName = `${testInfo.testDir}/${testInfo.testName}.${logInfo.declarationIndex}.response.json`;
                const responseBody = JSON.stringify(result, null, 4);
                fs.writeFileSync(fileName, responseBody);
            }
            return result;
        })
        .catch((error) => {
            error.message = `Unable to POST declaration: ${error}`;
            throw error;
        });
}

/**
 * Submits the declaration and the query params to the target BIG-IP and returns the response
 *
 * @param {object} declaration - JSON declaration to be submitted
 * @param {string} queryParams - The query parameters to be added to the request path
 * @param {string} path - The endpoint the declaration is sent to
 * @param {object} headerObject - An object containing customer headers
 */
function sendDeclaration(declaration, queryString, path, headerObject) {
    path = path || `${bigIpUrl}${constants.DO_API}`;

    const url = `${path}${queryString}`;
    const reqOpts = common.buildBody(url, declaration, getAuth(), 'POST');
    Object.assign(reqOpts.headers, headerObject);

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 });
}

function postDeclarationToFail(declaration) {
    const url = `${bigIpUrl}${constants.DO_API}`;
    const reqOpts = common.buildBody(url, declaration, getAuth(), 'POST');
    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((response) => {
            if (response.statusCode !== 200) {
                throw new Error(
                    `Received expected failing response ${response.statusCode} status code while posting declaration`
                );
            }
            return response.body;
        })
        .catch((error) => {
            error.message = `Unable to POST declaration: ${error}`;
            return error;
        });
}

function createTransaction() {
    const url = `${bigIpUrl}${constants.ICONTROL_API}/tm/transaction`;
    const reqOpts = common.buildBody(url, {}, getAuth(), 'POST');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        // Transaction response does not always mean that it's ready.
        // Wait a couple seconds to avoid race condition.
        .then((response) => promiseUtil.delay(2000).then(() => response.body.transId))
        .catch((error) => {
            error.message = `Unable to POST transaction: ${error}`;
            throw error;
        });
}

function commitTransaction(transId) {
    const url = `${bigIpUrl}${constants.ICONTROL_API}/tm/transaction/${transId}`;
    const reqOpts = common.buildBody(url, { state: 'VALIDATING' }, getAuth(), 'PATCH');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .catch((error) => {
            error.message = `Unable to PATCH transaction: ${error}`;
            throw error;
        })
        .then((response) => {
            if (response.body.state === 'COMPLETED') {
                return Promise.resolve();
            }
            return waitForCompleteTransaction(transId);
        });
}

function waitForCompleteTransaction(transId) {
    const url = `${bigIpUrl}${constants.ICONTROL_API}/tm/transaction/${transId}`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'GET');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((response) => {
            if (response.body.state === 'VALIDATING') {
                return promiseUtil.delay(1000).then(() => waitForCompleteTransaction(transId));
            }
            if (response.body.state === 'COMPLETED') {
                return Promise.resolve();
            }

            return Promise.reject(new Error(`Unexpected state (${response.body.state})`));
        })
        .catch((error) => {
            if (error.message.indexOf('TimeoutException') > -1) {
                return promiseUtil.delay(1000).then(() => waitForCompleteTransaction(transId));
            }
            error.message = `Unable to complete transaction: ${error}`;
            throw error;
        });
}

function postBigipItems(items, useTransaction) {
    let transId;

    if (items.length === 0) {
        return Promise.resolve();
    }

    return (useTransaction ? createTransaction().then((id) => { transId = id; }) : Promise.resolve())
        .then(() => promiseUtil.series(
            items.map((item) => () => {
                const url = `${bigIpUrl}${constants.ICONTROL_API}${item.endpoint}`;
                const reqOpts = common.buildBody(url, item.data, getAuth(), 'POST');

                Object.assign(reqOpts.headers, item.headers);

                if (typeof transId !== 'undefined') {
                    reqOpts.headers['X-F5-REST-Coordination-Id'] = transId;
                }

                return sendRequest(reqOpts, { trials: 5, timeInterval: 1000 })
                    .then((response) => {
                        if (response.statusCode !== 200) {
                            throw new Error(JSON.stringify(response.body));
                        }
                    })
                    .catch((error) => {
                        if (error.message.includes('"code":409')) {
                            return;
                        }
                        error.message = `Unable to POST BigIP Items: ${error}`;
                        throw error;
                    });
            })
        ))
        .then(() => (typeof transId !== 'undefined' ? commitTransaction(transId) : Promise.resolve()))
        // Reset DO's original config state to match machine's new state.
        // This keeps DO from removing new Big-IP items
        .then(() => common.deleteOriginalConfig(`${bigIpUrl}${constants.DO_API}`, getAuth()));
}

/**
 * Sets the target device back to its original config state.
 */
function deleteDeclaration() {
    const declaration = {
        schemaVersion: '1.0.0',
        class: 'Device',
        async: true,
        controls: {
            trace: true,
            traceResponse: true,
            logLevel: 'debug'
        },
        Common: {
            class: 'Tenant'
        }
    };

    return sendDeclaration(declaration, '', `${bigIpUrl}${constants.DO_API}`)
        .then((response) => _waitForCompleteStatus(response.body.id))
        .catch((error) => {
            error.message = `Unable to DELETE declaration: ${error}`;
            throw error;
        });
}

function deleteBigipItems(items) {
    return promiseUtil.series(items
        .filter((item) => !item.skipDelete)
        .map((item) => () => {
            if (item.endpoint.indexOf('file-transfer/uploads') > -1) {
                return Promise.resolve();
            }

            const url = `${bigIpUrl}${constants.ICONTROL_API}${item.endpoint}`
                + `/${encodeURIComponent(item.data.name.replace(/\//g, '~'))}`;
            const reqOpts = common.buildBody(url, null, getAuth(), 'DELETE');

            return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
                .then((response) => response.body)
                .catch((error) => {
                    // Console intentionally left so delete will hit all items
                    error.message = `Unable to DELETE BigIP Items: ${error}`;
                    console.error(error);
                });
        }))
        // Reset DO's original config state to match machine's new state.
        // This keeps DO from re-adding the deleted Big-IP items
        .then(() => common.deleteOriginalConfig(`${bigIpUrl}${constants.DO_API}`, getAuth()));
}

function resolveMcpReferences(mcpObject) {
    function resolveFromItem(path, prop) {
        const reqOpts = common.buildBody(`${bigIpUrl}${path}`, null, getAuth(), 'GET');

        return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
            .then((result) => {
                let value = result.body;
                if (mcpObject[prop].isSubcollection) {
                    value = result.body.items || [];
                }

                if (Array.isArray(value)) {
                    return Promise.all(value.map((v) => resolveMcpReferences(v)));
                }

                return resolveMcpReferences(value);
            });
    }

    const resolvedObject = JSON.parse(JSON.stringify(mcpObject));
    const referenceProperties = Object.keys(mcpObject).filter((n) => n.endsWith('Reference'));
    const promises = referenceProperties.map((prop) => {
        // Treat everything as an array until it matters again
        const isArray = Array.isArray(mcpObject[prop]);
        const mcpProps = (isArray) ? mcpObject[prop] : [mcpObject[prop]];

        const requests = mcpProps
            .map((p) => parseUrl(p.link).pathname)
            .map((path) => resolveFromItem(path, prop)
                .catch((error) => {
                    error.message = `Unable to resolve reference for ${path}: ${error.message}`;
                    throw error;
                }));

        return Promise.all(requests)
            .then((results) => {
                const value = (isArray) ? results : results[0];
                resolvedObject[prop.replace('Reference', '')] = value;
            });
    });

    return Promise.all(promises).then(() => resolvedObject);
}

function getMcpObject(targetClass, inputOptions) {
    const options = JSON.parse(JSON.stringify(inputOptions));
    const pathPrefix = getPathPrefix(options);
    const itemName = getItemName(options);
    options.getMcpObject.itemName = options.getMcpObject.itemName || itemName;
    const path = `${pathPrefix}${options.getMcpObject.itemName}`;

    const className = options.getMcpObject.className ? options.getMcpObject.className : targetClass;

    const classPath = PATHS[className];
    if (!classPath) {
        throw new Error(`Class ${className} not found in sharedConstants.PATHS`);
    }

    const url = `${bigIpUrl}${constants.ICONTROL_API}${classPath}`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'GET');

    return sendRequest(reqOpts, { trials: 5, timeInterval: 1000 })
        .then((response) => {
            if (options.getMcpObject && (options.getMcpObject.itemKind || options.getMcpObject.refItemKind)) {
                let results = [];
                if (response.body.items) {
                    results = response.body.items.filter((i) => i.kind === options.getMcpObject.itemKind
                        && (i.name === options.getMcpObject.itemName || options.getMcpObject.skipNameCheck));
                } else if (options.getMcpObject.refItemKind
                    && response.body.kind === options.getMcpObject.refItemKind) {
                    results = results.concat(response.body);
                }

                return results;
            }

            if (isNameless(classPath, targetClass)) {
                return [response.body];
            }

            if (!response.body.items) {
                return [];
            }

            return response.body.items.filter((i) => i.fullPath.startsWith(path));
        })
        .catch((err) => {
            if (consoleOptions.mcpError) {
                console.log(`Error while getting mcp object: ${err}`);
            }
            return undefined;
        })
        .then((results) => {
            const mcpObjects = results
                .reduce((result, current) => result.concat(current), [])
                .filter((i) => i);

            if (mcpObjects.length === 0) {
                const found = JSON.stringify(results, null, 2);
                throw new Error(`Unable to find ${path} on BIG-IP. Found: ${found}`);
            }

            return (options.findAll) ? mcpObjects : mcpObjects[0];
        });
}

function getPropertyFromPath(path, targetClass) {
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    return propertyMap.find((item) => (item.path || '').slice(1) === path && targetClass === item.schemaClass);
}

function getPropertyFromKind(kind, targetClass) {
    const pathComponents = kind.split(':');
    let subMap = null;

    while (!subMap) {
        const path = pathComponents.join('/');
        if (path === '') {
            throw new Error(`Unable to find an entry in configItems.json for ${kind}`);
        }
        subMap = getPropertyFromPath(path, targetClass);
        pathComponents.pop();
    }

    return subMap.properties;
}

function isNameless(path, targetClass) {
    const property = getPropertyFromPath(path, targetClass) || {};
    return property.nameless;
}

function isObjectAsArray(value) {
    if (!Array.isArray(value)) {
        return false;
    }
    if (value.length !== 1) {
        return false;
    }
    if (value[0].name !== 'undefined') {
        return false;
    }
    return true;
}

function extractMcpValue(mcpObject, mcpProperties, property, targetClass) {
    const declPath = property.name.split('.');
    let mcpValue = mcpObject;
    let kind = mcpObject.kind.replace(/:[^:]*$/, '');
    let entry = null;

    while (declPath.length > 0) {
        const name = declPath.shift();
        if (!Number.isNaN(parseInt(name, 10))) {
            entry = {};
            mcpValue = mcpValue[parseInt(name, 10)];
        } else {
            const propMap = getPropertyFromKind(kind, targetClass);
            entry = propMap.find((p) => p.id === name || p.newId === name);
            if (!entry) {
                throw new Error(`No entry with id or newId of ${name}`);
            }
            kind = `${kind}:${entry.id}`;
            const propName = toCamelCase(entry.id);
            mcpValue = mcpValue[propName];
        }
        if (isObjectAsArray(mcpValue)) {
            mcpValue = mcpValue[0];
        }

        if (typeof mcpValue === 'undefined') {
            break;
        }
    }

    const minVersion = entry.minVersion || '0.0.0.0';
    mcpProperties[property.name] = mcpValue;

    if (cloudUtil.versionCompare(BIGIP_VERSION, minVersion) < 0) {
        assert.strictEqual(
            mcpProperties[property.name],
            undefined,
            `Found value for ${property.name}, but it is marked as unsupported on ${BIGIP_VERSION}`
        );
        mcpProperties._skip = mcpProperties._skip || [];
        mcpProperties._skip.push(property.name);
    }
}

function getMcpValue(targetClass, properties, index, options) {
    return getMcpObject(targetClass, options)
        .then(resolveMcpReferences)
        .then((result) => {
            const mcpProperties = {};

            const extractPromises = properties
                .filter((p) => !p.skipAssert)
                .map((property) => {
                    if (property.extractFunction) {
                        const expected = getExpectedValue(property, index);
                        return Promise.resolve(property.extractFunction(result, expected))
                            .then((extracted) => { mcpProperties[property.name] = extracted; });
                    }
                    return Promise.resolve(extractMcpValue(result, mcpProperties, property, targetClass));
                });

            return Promise.all(extractPromises)
                .then(() => mcpProperties);
        })
        .catch((error) => {
            error.message = `Unable to get MCP values for ${targetClass}: ${error.message}`;
            throw error;
        });
}

function checkMcpValue(result, properties, index) {
    properties
        .filter((p) => !p.skipAssert && (!result._skip || !result._skip.includes(p.name)))
        .forEach((property) => {
            const value = getExpectedValue(property, index);
            // This print can be very helpful for debugging the expect vs receive vals
            if (consoleOptions.expectedActual) {
                console.log(`\t${property.name} => [ expected: ${value} ] [ actual: ${result[property.name]} ]`);
            }
            if (typeof value === 'number') {
                assert.equal(result[property.name],
                    value,
                    `${property.name}  value of ${result[property.name]} does not match expected value ${value}`);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                Object.entries(value).forEach(([key, deepValue]) => {
                    assert.deepStrictEqual(
                        result[property.name][key],
                        deepValue,
                        `${property.name}.${key}  value of ${JSON.stringify(result[property.name][key], null, 4)} does not match expected value ${JSON.stringify(value[key], null, 4)}`
                    );
                });
            } else {
                assert.deepStrictEqual(
                    (typeof result[property.name] === 'undefined') ? 'undefined' : result[property.name],
                    (typeof value === 'undefined') ? 'undefined' : value,
                    `${property.name}  value of ${JSON.stringify(result[property.name])} does not match expected value ${value}`
                );
            }
        });
    return Promise.resolve();
}

function configurePromiseForFail(declaration) {
    return Promise.resolve()
        .then(() => postDeclarationToFail(declaration))
        .then((result) => {
            const message = (result.result !== undefined)
                ? result.result.message
                : result.message;
            assert.notStrictEqual(message, 'success', 'declaration failed as expected');
        });
}

function configurePromiseForSuccess(declaration, partition, targetClass, properties, index, fullOptions) {
    return Promise.resolve()
        .then(() => {
            if (consoleOptions.postRequest) {
                console.log(`\nPosting declaration:\n ${JSON.stringify(declaration, null, 2)}`);
            }
        })
        .then(() => {
            const logInfo = {
                declarationIndex: index
            };

            if (index === 0) {
                // Device could be busy from failure in previous test
                // Retry on 503 for 2 and a half minutes on first post.
                const options = {
                    delay: 10000,
                    retries: (2.5 * 60 * 1000) / 10000
                };
                return promiseUtil.retryPromise((decl, info) => postDeclaration(decl, info)
                    .then((result) => {
                        if (result.result.code === 503) {
                            throw new Error('Target is busy');
                        }
                        return result;
                    }), options, [declaration, logInfo]);
            }

            return postDeclaration(declaration, logInfo);
        })
        .then((result) => {
            if (consoleOptions.postResult) {
                console.log(`\nGot result:\n ${JSON.stringify(result, null, 2)}`);
            }

            if (!result.result) {
                const resultString = JSON.stringify(result, null, 2);
                throw new Error(`Unable to find results: ${resultString}`);
            }

            assert.strictEqual(
                result.result.message,
                'success',
                `declaration did not apply successfully: result: ${JSON.stringify(result.result)}`
            );
        })
        .then(() => getPreFetchFunctions(properties, index))
        .then(() => promiseUtil.delay(fullOptions.getMcpValueDelay))
        .then(() => {
            const assertMcp = () => getMcpValue(targetClass, properties, index, fullOptions)
                .then((result) => checkMcpValue(result, properties, index));
            const options = {
                delay: 1000,
                retries: fullOptions.maxMcpRetries
            };
            return promiseUtil.retryPromise(assertMcp, options, []);
        })
        .then(() => {
            if (fullOptions.skipIdempotentCheck) {
                return Promise.resolve();
            }

            return Promise.resolve()
                .then(() => postDeclaration(declaration))
                .then((result) => {
                    const diff = result.traces.diff;
                    if (!diff) {
                        const resultString = JSON.stringify(result, null, 2);
                        throw new Error(`Unable to find diff in results: ${resultString}`);
                    }

                    assert.deepStrictEqual(diff, [], `declaration ${index} is not idempotent`);
                });
        });
}

function assertClass(targetClass, properties, options) {
    const fullOptions = Object.assign({}, DEFAULT_OPTIONS, options);
    fullOptions.tenantName = fullOptions.tenantName || `TEST_${targetClass}`;
    fullOptions.checkForFail = fullOptions.checkForFail || false;
    fullOptions.useTransaction = fullOptions.useTransaction || false;
    const testDeclarations = createDeclarations(targetClass, properties, fullOptions);
    const partition = fullOptions.tenantName;
    let promise = Promise.resolve();

    if (!fullOptions.dryRun) {
        promise = promise.then(() => postBigipItems(fullOptions.bigipItems, fullOptions.useTransaction));
    }

    testDeclarations.forEach((declaration, index) => {
        if (fullOptions.dryRun) {
            promise = promise.then(() => new Promise((resolve, reject) => {
                const fileName = `${testInfo.testDir}/${testInfo.testName}.${index}.json`;
                const declBody = JSON.stringify(declaration, null, 4);
                fs.writeFile(fileName, declBody, {}, (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            }));
            return;
        }

        if (fullOptions.checkForFail) {
            promise = promise
                .then(() => configurePromiseForFail(declaration, partition));
        } else {
            promise = promise
                .then(() => configurePromiseForSuccess(
                    declaration,
                    partition,
                    targetClass,
                    properties,
                    index,
                    fullOptions
                ));
        }
    });

    function cleanUp(error) {
        if (testDeclarations.length === 0) {
            if (error) {
                if (!error.stack) {
                    error = new Error(error);
                }
                return Promise.reject(error);
            }
            return Promise.resolve();
        }

        if (fullOptions.dryRun) {
            return Promise.resolve();
        }

        return deleteDeclaration()
            .then((result) => {
                if (error) {
                    throw error;
                }

                if (!fullOptions.checkForFail) {
                    const message = (result.result) ? result.result.message : 'Unable to find result message'
                        + `\n${JSON.stringify(result.result, null, 2)}`;
                    assert.strictEqual(message, 'success', `declaration did not delete successfully: ${message}`);
                }
            })
            .catch((newError) => {
                if (error) throw error;
                throw newError;
            });
    }

    function cleanUpBigipItems(error) {
        if (DEFAULT_OPTIONS.dryRun) {
            return Promise.resolve();
        }
        return deleteBigipItems(fullOptions.bigipItems.reverse())
            .then(() => { if (error) throw error; })
            .catch((newError) => {
                if (error) throw error;
                throw newError;
            });
    }

    return promise
        .then(cleanUp, cleanUp)
        .then(cleanUpBigipItems, cleanUpBigipItems);
}

function getBigIpVersionAsync() {
    if (DEFAULT_OPTIONS.dryRun) {
        return Promise.resolve('100.0.0.0');
    }

    const url = `${bigIpUrl}${constants.ICONTROL_API}/tm/sys/version`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'GET');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((result) => {
            const entry = result.body.entries[Object.keys(result.body.entries)[0]];
            return entry.nestedStats.entries.Version.description;
        })
        .catch((error) => {
            error.message = `Unable to get BIG-IP version: ${error.message}`;
            throw error;
        });
}

function getProvisionedModulesAsync() {
    if (DEFAULT_OPTIONS.dryRun) {
        return Promise.resolve(['afm', 'asm', 'gtm', 'pem', 'ltm', 'avr']);
    }

    const url = `${bigIpUrl}${constants.ICONTROL_API}/tm/sys/provision`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'GET');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((response) => {
            const body = response.body;
            if (!body.items) {
                throw new Error(`Could not find provisioned modules:\n${JSON.stringify(body, null, 2)}`);
            }

            return body.items
                .filter((m) => m.level !== 'none')
                .map((m) => m.name);
        })
        .catch((error) => {
            error.message = `Unable to get BIG-IP module list: ${error.message}`;
            throw error;
        });
}

function mkdirPromise(path) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, (error) => {
            if (error && error.code !== 'EEXIST') reject(error);
            else resolve();
        });
    });
}

before(function setup() {
    this.timeout(180000);
    return Promise.resolve()
        .then(() => {
            const bigIpAddress = process.env.DO_HOST;
            const bigIpPort = process.env.DO_PORT || constants.PORT;
            bigIpAuth = { username: process.env.DO_USERNAME, password: process.env.DO_PASSWORD };
            bigIpUrl = common.hostname(bigIpAddress, bigIpPort);
        })
        .then(() => getProvisionedModulesAsync())
        .then((modules) => { PROVISIONED_MODULES = modules; })
        .then(getBigIpVersionAsync)
        .then((version) => { BIGIP_VERSION = version; })
        .then(() => {
            if (DEFAULT_OPTIONS.dryRun) {
                return Promise.resolve();
            }

            return deleteDeclaration()
                .catch((error) => {
                    error.message = `Unable to clear target's state: ${error.message}`;
                    throw error;
                });
        })
        .then(() => mkdirPromise('test/logs'));
});

function getAuthToken() {
    // Auth tokens appear to be less reliable than basic auth before 13.1
    if (cloudUtil.versionCompare(BIGIP_VERSION, '13.1.0') < 0) {
        return Promise.resolve();
    }

    const url = `${bigIpUrl}${constants.ICONTROL_API}/shared/authn/login`;
    const body = Object.assign({}, getAuth(), { loginProviderName: 'tmos' });
    const reqOpts = common.buildBody(url, body, null, 'POST');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 })
        .then((r) => r.body.token.token)
        .then((t) => extendAuthTokenTimeout(t));
}

function extendAuthTokenTimeout(token) {
    const url = `${bigIpUrl}${constants.ICONTROL_API}/shared/authz/tokens/${token}`;
    const reqOpts = common.buildBody(url, { timeout: 30000 }, getAuth(), 'PATCH');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 }).then(() => token);
}

function removeToken(token) {
    const url = `${bigIpUrl}${constants.ICONTROL_API}/shared/authz/tokens/${token}`;
    const reqOpts = common.buildBody(url, null, getAuth(), 'DELETE');

    return sendRequest(reqOpts, { trials: 3, timeInterval: 500 });
}

beforeEach(function setupBeforeEach() {
    this.timeout(300000);
    testInfo = getTestInfo(this.currentTest);
    return mkdirPromise(testInfo.testDir)
        .then(() => {
            if (!DEFAULT_OPTIONS.dryRun) {
                return Promise.resolve()
                    .then(() => getAuthToken())
                    .then((token) => { DEFAULT_OPTIONS.token = token; })
                    .then(() => common.deleteOriginalConfig(`${bigIpUrl}${constants.DO_API}`, getAuth()))
                    .catch((error) => {
                        error.message = `Error during test setup: ${error.message}`;
                        throw error;
                    });
            }
            return Promise.resolve();
        });
});

afterEach(function teardownAfterEach() {
    this.timeout(300000);
    const token = DEFAULT_OPTIONS.token;
    let promise = Promise.resolve();
    if (token) {
        promise = promise.then(() => removeToken(token));
    }

    return promise;
});

function getProvisionedModules() {
    return PROVISIONED_MODULES;
}

function getBigIpVersion() {
    return BIGIP_VERSION;
}

function getPathPrefix(options) {
    let pathPrefix = `/${options.tenantName}/`;
    if (options.mcpPath !== undefined) {
        pathPrefix = options.mcpPath;
    }
    return pathPrefix;
}

function getItemName(options) {
    const pathPrefix = getPathPrefix(options);

    let itemName = 'test_item-foo.';
    let counter = pathPrefix.length + itemName.length;

    const maxPathLength = options.maxPathLength || DEFAULT_OPTIONS.maxPathLength;
    const maxNameLength = options.maxNameLength || DEFAULT_OPTIONS.maxNameLength;

    while (counter < maxPathLength && itemName.length < maxNameLength) {
        itemName += counter % 10;
        counter += 1;
    }

    return itemName;
}

function getPreFetchFunctions(properties, index) {
    const preFetchPromises = properties
        .filter((prop) => prop.preFetchFunction)
        .map((prop) => Promise.resolve(prop.preFetchFunction(index)));

    return Promise.all(preFetchPromises);
}

module.exports = {
    assertClass,
    getProvisionedModules,
    getBigIpVersion,
    getItemName,
    getMcpObject,
    postDeclaration
};
