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

const Response = require('../../nodejs/response');

describe('response', () => {
    it('should set success response in result', () => {
        const state = {
            code: 200,
            status: 'my status',
            message: 'my message',
            errors: ['error 1', 'error 2'],
            currentConfig: {
                foo: 'bar'
            },
            originalConfig: {
                hello: 'world'
            }
        };
        const response = new Response(state);
        assert.strictEqual(response.result.code, state.code);
        assert.strictEqual(response.result.status, state.status);
        assert.strictEqual(response.result.message, state.message);
        assert.deepEqual(response.result.errors, state.errors);
        assert.strictEqual(response.currentConfig, undefined);
        assert.strictEqual(response.originalConfig, undefined);
    });

    it('should set error response at top level', () => {
        const state = {
            code: 300,
            status: 'my status',
            message: 'my message',
            errors: ['error 1', 'error 2'],
            currentConfig: {
                foo: 'bar'
            },
            originalConfig: {
                hello: 'world'
            }
        };
        const response = new Response(state);
        assert.strictEqual(response.code, state.code);
        assert.strictEqual(response.status, state.status);
        assert.strictEqual(response.message, state.message);
        assert.deepEqual(response.errors, state.errors);
        assert.strictEqual(response.currentConfig, undefined);
        assert.strictEqual(response.originalConfig, undefined);
    });

    it('should include full response if options say so', () => {
        const state = {
            code: 200,
            status: 'my status',
            message: 'my message',
            errors: ['error 1', 'error 2'],
            currentConfig: {
                foo: 'bar'
            },
            originalConfig: {
                hello: 'world'
            }
        };
        const response = new Response(state, { show: 'full' });
        assert.deepEqual(response.currentConfig, state.currentConfig);
        assert.deepEqual(response.originalConfig, state.originalConfig);
    });
});
