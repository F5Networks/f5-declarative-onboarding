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

const State = require('../../../../src/lib/state');

describe('state', () => {
    it('should create a new state from an exsiting state', () => {
        const existingState = {
            originalConfig: {
                ABCD: {
                    this: {
                        id: {
                            my: 'state'
                        }
                    }
                }
            },
            tasks: {
                1234: {
                    result: {
                        foo: 'bar'
                    },
                    internalDeclaration: {
                        hello: 'world'
                    },
                    currentConfig: {
                        DNS: '1234'
                    },
                    originalConfig: {
                        NTP: '5678'
                    }
                }
            },
            mostRecentTask: 1234
        };

        const state = new State(existingState);
        assert.deepEqual(state,
            {
                originalConfig: {
                    ABCD: {
                        this: {
                            id: {
                                my: 'state'
                            }
                        }
                    }
                },
                tasks: {
                    1234: {
                        result: {
                            foo: 'bar'
                        },
                        internalDeclaration: {
                            hello: 'world'
                        },
                        currentConfig: {
                            DNS: '1234'
                        },
                        originalConfig: {
                            NTP: '5678'
                        }
                    }
                },
                mostRecentTask: 1234
            });
    });

    it('should delete old tasks when new tasks are added', () => {
        const now = new Date();
        const tooOld = now - (7 * 1000 * 3600 * 24) - 1;
        const notTooOld = now - (7 * 1000 * 3600 * 24) + 100; // account for time to get to deletion code
        const existingState = {
            tasks: {
                1234: {
                    lastUpdate: tooOld
                },
                5678: {
                    lastUpdate: notTooOld
                }
            }
        };
        const state = new State(existingState);
        assert.ok(state.tasks['1234']);
        assert.ok(state.tasks['5678']);

        state.addTask();

        assert.strictEqual(Object.keys(state.tasks).length, 2);
        assert.strictEqual(state.tasks['1234'], undefined);
        assert.ok(state.tasks['5678']);
    });

    it('should upgrade a state from an older version', () => {
        const existingState = {
            result: {
                foo: 'bar'
            },
            internalDeclaration: {
                hello: 'world'
            },
            currentConfig: {
                DNS: '1234'
            },
            originalConfig: {
                NTP: '5678'
            }
        };

        const state = new State(existingState);
        assert.ok(state.tasks);
        assert.ok(state.mostRecentTask);
        const mostRecentTask = state.mostRecentTask;
        existingState.id = mostRecentTask;
        assert.ok(state.tasks[mostRecentTask].lastUpdate);
        delete state.tasks[mostRecentTask].lastUpdate;

        // The task gets a new id
        const id = state.tasks[mostRecentTask].id;
        assert.deepEqual(state.tasks[mostRecentTask],
            {
                id,
                result: {
                    foo: 'bar'
                },
                internalDeclaration: {
                    hello: 'world'
                },
                currentConfig: {
                    DNS: '1234'
                },
                originalConfig: {
                    NTP: '5678'
                }
            });
    });

    it('should set the result properties', () => {
        const state = new State();
        const code = 1;
        const message = 'foo';
        const status = 'bar';
        const errors = ['my', 'list', 'of', 'errors'];

        const taskId = state.addTask();

        state.setCode(taskId, code);
        state.setMessage(taskId, message);
        state.setStatus(taskId, status);
        state.setErrors(taskId, errors);

        assert.strictEqual(state.getCode(taskId), 1);
        assert.strictEqual(state.getMessage(taskId), 'foo');
        assert.strictEqual(state.getStatus(taskId), 'bar');
        assert.deepEqual(state.getErrors(taskId), ['my', 'list', 'of', 'errors']);
    });

    it('should set internalDeclaration', () => {
        const state = new State();
        const declaration = {
            foo: {
                bar: {
                    hello: 'world'
                }
            }
        };

        const taskId = state.addTask();

        state.setDeclaration(taskId, declaration);
        assert.deepEqual(state.getDeclaration(taskId),
            {
                foo: {
                    bar: {
                        hello: 'world'
                    }
                }
            });
    });

    it('should set the current config', () => {
        const state = new State();
        const currentConfig = {
            foo: {
                bar: {
                    hello: 'world'
                }
            }
        };

        const taskId = state.addTask();
        state.setCurrentConfig(taskId, currentConfig);
        assert.deepEqual(state.getCurrentConfig(taskId),
            {
                foo: {
                    bar: {
                        hello: 'world'
                    }
                }
            });
    });

    it('should get the original config by task id', () => {
        const state = new State();
        const originalConfig = {
            foo: {
                bar: {
                    hello: 'world'
                }
            }
        };

        const taskId = state.addTask();
        state.tasks[taskId].originalConfig = originalConfig;
        assert.deepEqual(state.getOriginalConfigByTaskId(taskId),
            {
                foo: {
                    bar: {
                        hello: 'world'
                    }
                }
            });
    });

    it('should set the original config by config id', () => {
        const state = new State();
        const originalConfig = {
            foo: {
                bar: {
                    hello: 'world'
                }
            }
        };

        state.setOriginalConfigByConfigId('1234', originalConfig);
        assert.deepEqual(state.getOriginalConfigByConfigId('1234'),
            {
                foo: {
                    bar: {
                        hello: 'world'
                    }
                }
            });
    });

    it('should delete original config by config id', () => {
        const state = new State();
        const originalConfig = {
            foo: {
                bar: {
                    hello: 'world'
                }
            }
        };

        state.setOriginalConfigByConfigId('1234', originalConfig);
        state.deleteOriginalConfigByConfigId('1234', originalConfig);
        assert.deepEqual(state.getOriginalConfigByConfigId('1234'), undefined);
    });

    it('should mask passwords', () => {
        const state = new State();
        const declaration = {
            foo: {
                bar: {
                    hello: 'world',
                    password: '1234'
                }
            },
            fooArray: [
                {
                    okie: 'dokie',
                    password: '5678'
                }
            ]
        };

        const taskId = state.addTask();

        state.setDeclaration(taskId, declaration);
        const internalDeclaration = state.getDeclaration(taskId);

        assert.strictEqual(internalDeclaration.foo.bar.hello, 'world');
        assert.strictEqual(internalDeclaration.foo.bar.password, undefined);
        assert.strictEqual(internalDeclaration.fooArray[0].okie, 'dokie');
        assert.strictEqual(internalDeclaration.fooArray[0].password, undefined);

        // make sure we are not altering the passed in data
        assert.notStrictEqual(declaration.fooArray[0].password, undefined);
        assert.notStrictEqual(declaration.foo.bar.password, undefined);
    });

    it('should update results', () => {
        const state = new State();
        const code = 1;
        const message = 'foo';
        const status = 'bar';
        const errors = ['my', 'list', 'of', 'errors'];

        const taskId = state.addTask();
        state.updateResult(taskId, code, status, message, errors);

        assert.strictEqual(state.getCode(taskId), 1);
        assert.strictEqual(state.getMessage(taskId), 'foo');
        assert.strictEqual(state.getStatus(taskId), 'bar');
        assert.deepEqual(state.getErrors(taskId), ['my', 'list', 'of', 'errors']);
    });

    it('should retrieve task by id', () => {
        const state = new State();
        const message = 'foo';

        const taskId = state.addTask();
        state.setMessage(taskId, message);

        const task = state.getTask(taskId);
        assert.strictEqual(task.result.message, 'foo');
    });
});
