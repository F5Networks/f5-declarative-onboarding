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

const assert = require('assert');

const Response = require('../../nodejs/response');

const state = {
    getTask(taskId) {
        return this.tasks[taskId];
    },
    getTaskIds() {
        return Object.keys(this.tasks);
    },
    getCode(taskId) {
        return this.tasks[taskId].result.code;
    },
    getStatus(taskId) {
        return this.tasks[taskId].result.status;
    },
    getMessage(taskId) {
        return this.tasks[taskId].result.message;
    },
    getErrors(taskId) {
        return this.tasks[taskId].result.errors;
    },
    getDeclaration(taskId) {
        return this.tasks[taskId].declaration;
    },
    getCurrentConfig(taskId) {
        return this.tasks[taskId].currentConfig;
    },
    getOriginalConfig(taskId) {
        return this.tasks[taskId].originalConfig;
    },
    getLastUpdate(taskId) {
        return this.tasks[taskId].lastUpdate;
    },
    getOriginalConfigByTaskId(taskId) {
        return this.tasks[taskId].originalConfig;
    },
    tasks: {
        1234: {
            result: {
                code: 200,
                status: 'my status',
                message: 'my message',
                errors: ['error 1', 'error 2'],
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
                errors: ['error 1', 'error 2'],
            },
            currentConfig: {
                foo: 'bar'
            },
            originalConfig: {
                hello: 'world'
            },
            lastUpdate: 'bar'
        }
    }
};

describe('response', () => {
    it('should set success response in result', () => {
        const response = new Response(state, 1234).getResponse();
        assert.strictEqual(response.id, 1234);
        assert.strictEqual(response.result.code, state.tasks[1234].result.code);
        assert.strictEqual(response.result.status, state.tasks[1234].result.status);
        assert.strictEqual(response.result.message, state.tasks[1234].result.message);
        assert.deepEqual(response.result.errors, state.tasks[1234].result.errors);
        assert.strictEqual(response.currentConfig, undefined);
        assert.strictEqual(response.originalConfig, undefined);
    });

    it('should include full response if options say so', () => {
        const response = new Response(state, 1234, { show: 'full' }).getResponse();
        assert.deepEqual(response.currentConfig, state.tasks[1234].currentConfig);
        assert.deepEqual(response.originalConfig, state.tasks[1234].originalConfig);
        assert.deepEqual(response.lastUpdate, state.tasks[1234].lastUpdate);
    });

    it('should return an array of tasks if no task id is set', () => {
        const response = new Response(state).getResponse();
        assert.ok(Array.isArray(response));
        assert.strictEqual(response.length, 2);
        assert.strictEqual(response[0].id, '1234');
        assert.strictEqual(response[1].id, '5678');
    });
});
