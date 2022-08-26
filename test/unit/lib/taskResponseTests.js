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

const assert = require('assert');

const TaskResponse = require('../../../src/lib/taskResponse');
const state = require('./stateMock');

let taskResponse;

describe('taskResponse', () => {
    beforeEach(() => {
        state.tasks = {
            1234: {
                result: {
                    code: 200,
                    status: 'my status 1234',
                    message: 'my message 1234',
                    errors: ['error 1', 'error 2'],
                    warnings: ['this is a warning', 'you have been warned']
                },
                declaration: {
                    hello: 'declaration for 1234'
                },
                currentConfig: {
                    foo: 'config for 1234'
                },
                originalConfig: {
                    hello: 'original config for 1234'
                },
                traceCurrent: {
                    current: 'config for 1234'
                },
                traceDesired: {
                    desired: 'config for 1234'
                },
                traceDiff: {
                    diff: 'for 1234'
                },
                lastUpdate: 'last update 1234'
            },
            5678: {
                result: {
                    code: 400,
                    status: 'my status 5678',
                    message: 'my message 5678',
                    errors: ['error 3', 'error 4']
                },
                declaration: {
                    hello: 'declaration for 1234'
                },
                currentConfig: {
                    foo: 'config for 5678'
                },
                originalConfig: {
                    hello: 'original config for 5678'
                },
                traceCurrent: {
                    current: 'config for 5678'
                },
                traceDesired: {
                    desired: 'config for 5678'
                },
                traceDiff: {
                    diff: 'for 5678'
                },
                lastUpdate: 'last update 5678'
            }
        };
        taskResponse = new TaskResponse(state, 'GET');
    });

    it('should return the proper selfLink', () => {
        assert.strictEqual(
            taskResponse.getSelfLink(1234),
            'https://localhost/mgmt/shared/declarative-onboarding/task/1234'
        );
    });

    it('should return true if task exists', () => {
        assert.strictEqual(taskResponse.exists(1234), true);
    });

    it('should return false if task does not exist', () => {
        assert.strictEqual(taskResponse.exists(9999), false);
    });

    it('should return all task ids', () => {
        const taskIds = Object.keys(state.tasks);
        const retrievedIds = taskResponse.getIds();
        assert.strictEqual(retrievedIds.length, 2);
        taskIds.forEach((taskId) => {
            assert.notStrictEqual(retrievedIds.indexOf(taskId), -1);
        });
    });

    it('should return the proper code for a task', () => {
        assert.strictEqual(taskResponse.getCode(1234), 200);
    });

    it('should return the proper status for a task', () => {
        assert.strictEqual(taskResponse.getStatus(1234), 'my status 1234');
    });

    it('should return the proper message for a task', () => {
        assert.strictEqual(taskResponse.getMessage(1234), 'my message 1234');
    });

    it('should return the proper errors for a task', () => {
        assert.deepEqual(taskResponse.getErrors(1234), ['error 1', 'error 2']);
    });

    it('should return the proper warnings for a task', () => {
        assert.deepEqual(taskResponse.getWarnings(1234), ['this is a warning', 'you have been warned']);
    });

    it('should return the proper data for a task', () => {
        assert.deepEqual(taskResponse.getData(1234), {
            declaration: {
                hello: 'declaration for 1234'
            },
            traces: {
                current: { current: 'config for 1234' },
                desired: { desired: 'config for 1234' },
                diff: { diff: 'for 1234' }
            },
            httpStatus: 200
        });
    });

    it('should return the proper data for a task with show = full', () => {
        assert.deepEqual(
            taskResponse.getData(1234, { show: 'full' }),
            {
                originalConfig: { hello: 'original config for 1234' },
                currentConfig: { foo: 'config for 1234' },
                declaration: { hello: 'declaration for 1234' },
                lastUpdate: 'last update 1234',
                traces: {
                    current: { current: 'config for 1234' },
                    desired: { desired: 'config for 1234' },
                    diff: { diff: 'for 1234' }
                },
                httpStatus: 200
            }
        );
    });

    it('should return httpStatus of 404 when it does not exist', () => {
        assert.deepEqual(
            taskResponse.getData(123),
            {
                httpStatus: 404
            }
        );
    });
});
