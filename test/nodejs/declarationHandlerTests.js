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

const assert = require('assert');
const DeclarationParser = require('../../nodejs/declarationParser');
const DiffHandler = require('../../nodejs/diffHandler');
const SystemHandler = require('../../nodejs/systemHandler');
const NetworkHandler = require('../../nodejs/networkHandler');
const DscHandler = require('../../nodejs/dscHandler');
const DeleteHandler = require('../../nodejs/deleteHandler');
const DeclarationHandler = require('../../nodejs/declarationHandler');

let parsedDeclarations;
let declarationWithDefaults;

DeclarationParser.prototype.parse = function parse() {
    parsedDeclarations.push(this.declaration);
    return {
        parsedDeclaration: {
            Common: {}
        }
    };
};

DiffHandler.prototype.process = (declaration) => {
    declarationWithDefaults = declaration;
    return Promise.resolve(
        {
            toUpdate: {},
            toDelete: {}
        }
    );
};
SystemHandler.prototype.process = () => {
    return Promise.resolve();
};
NetworkHandler.prototype.process = () => {
    return Promise.resolve();
};
DscHandler.prototype.process = () => {
    return Promise.resolve();
};
DeleteHandler.prototype.process = () => {
    return Promise.resolve();
};

const bigIpMock = {
    modify() {
        return Promise.resolve();
    }
};

describe('declarationHandler', () => {
    beforeEach(() => {
        parsedDeclarations = [];
        declarationWithDefaults = {};
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should parse declarations if not parsed', () => {
        return new Promise((resolve, reject) => {
            const newDeclaration = {
                name: 'new'
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(parsedDeclarations.length, 2);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should not parse declarations if parsed', () => {
        return new Promise((resolve, reject) => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(parsedDeclarations.length, 1);
                    assert.strictEqual(parsedDeclarations[0].name, 'current');
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should apply defaults for missing items', () => {
        return new Promise((resolve, reject) => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {
                        hostname: 'my.bigip.com',
                        DNS: {
                            foo: 'bar'
                        },
                        NTP: ['one', 'two']
                    }
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.process(newDeclaration, state)
                .then(() => {
                    assert.strictEqual(
                        declarationWithDefaults.Common.hostname, state.originalConfig.Common.hostname
                    );
                    assert.deepEqual(
                        declarationWithDefaults.Common.DNS, state.originalConfig.Common.DNS
                    );
                    assert.deepEqual(
                        declarationWithDefaults.Common.NTP, state.originalConfig.Common.NTP
                    );
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });

    it('should report processing errors', () => {
        const errorMessage = 'this is a processing error';
        SystemHandler.prototype.process = () => {
            return Promise.reject(new Error(errorMessage));
        };

        return new Promise((resolve, reject) => {
            const newDeclaration = {
                name: 'new',
                parsed: true,
                Common: {}
            };
            const state = {
                currentConfig: {
                    name: 'current'
                },
                originalConfig: {
                    Common: {}
                }
            };

            const declarationHandler = new DeclarationHandler(bigIpMock);
            declarationHandler.process(newDeclaration, state)
                .then(() => {
                    reject(new Error('processing error should have been caught'));
                })
                .catch((err) => {
                    assert.strictEqual(err.message, errorMessage);
                    resolve();
                });
        });
    });
});
