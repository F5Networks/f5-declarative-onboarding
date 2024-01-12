/**
 * Copyright 2024 F5, Inc.
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

const Response = require('../../../src/lib/response');
const state = require('./stateMock');

class Responder {
    constructor(aState) {
        this.state = aState;
    }

    // can't be a class method because the caller does not know the class type
    /* eslint-disable class-methods-use-this */
    getSelfLink(id) {
        return `https://foo.com/task/${id}`;
    }
    /* eslint-enable class-methods-use-this */

    exists(id) {
        return !!this.state.getTask(id);
    }

    getIds() {
        return this.state.getTaskIds();
    }

    getCode(id) {
        return this.state.getCode(id);
    }

    getStatus(id) {
        return this.state.getStatus(id);
    }

    getMessage(id) {
        return this.state.getMessage(id);
    }

    getErrors(id) {
        return this.state.getErrors(id);
    }

    getWarnings(id) {
        return this.state.getWarnings(id);
    }

    getData(id, options) {
        const data = {
            declaration: this.state.getDeclaration(id)
        };

        if (options && options.show === 'full') {
            data.currentConfig = this.state.getCurrentConfig(id);
            data.originalConfig = this.state.getOriginalConfigByTaskId(id);
            data.lastUpdate = this.state.getLastUpdate(id);
        }
        return data;
    }
}

let responder;

describe('response', () => {
    beforeEach(() => {
        state.tasks = {
            1234: {
                result: {
                    code: 200,
                    status: 'my status',
                    message: 'my message',
                    errors: ['error 1234 1', 'error 1234 2'],
                    warnings: ['warning 1234 1', 'warning 1234 2']
                },
                currentConfig: {
                    foo: 'bar'
                },
                originalConfig: {
                    hello: 'world'
                },
                lastUpdate: 'foo'
            },
            5678: {
                result: {
                    code: 200,
                    status: 'my status',
                    message: 'my message',
                    errors: ['error 5678 1', 'error 5678 2'],
                    warnings: []
                },
                currentConfig: {
                    foo: 'bar'
                },
                originalConfig: {
                    hello: 'world'
                },
                lastUpdate: 'bar'
            }
        };
        responder = new Responder(state);
    });

    it('should set success response in result',
        () => new Response(1234, responder).getResponse()
            .then((response) => {
                assert.strictEqual(response.id, 1234);
                assert.strictEqual(response.result.code, 200);
                assert.strictEqual(response.result.status, 'my status');
                assert.strictEqual(response.result.message, 'my message');
                assert.deepEqual(response.result.errors, ['error 1234 1', 'error 1234 2']);
                assert.deepEqual(response.result.warnings, ['warning 1234 1', 'warning 1234 2']);
                assert.strictEqual(response.currentConfig, undefined);
                assert.strictEqual(response.originalConfig, undefined);
            }));

    it('should include full response if options say so',
        () => new Response(1234, responder, { show: 'full' }).getResponse()
            .then((response) => {
                assert.deepEqual(response.currentConfig, { foo: 'bar' });
                assert.deepEqual(response.originalConfig, { hello: 'world' });
                assert.deepEqual(response.lastUpdate, 'foo');
            }));

    it('should return an array of tasks if no task id is set',
        () => new Response(null, responder).getResponse()
            .then((response) => {
                assert.ok(Array.isArray(response));
                assert.strictEqual(response.length, 2);
                assert.strictEqual(response[0].id, '1234');
                assert.strictEqual(response[1].id, '5678');
            }));

    it('should 404 when task does not exist',
        () => new Response(123, responder).getResponse()
            .then((response) => {
                assert.strictEqual(response.result.code, 404);
                assert.strictEqual(response.httpStatus, 404);
                assert.strictEqual(response.result.message, 'item does not exist');
                assert.deepEqual(response.result.errors, ['item does not exist']);
            }));
});
