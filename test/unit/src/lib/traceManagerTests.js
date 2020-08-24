/**
 * Copyright 2020 F5 Networks, Inc.
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
const fs = require('fs');
const sinon = require('sinon');
const EventEmitter = require('events');

const TraceManager = require('../../../../src/lib/traceManager');
const EVENTS = require('../../../../src/lib/sharedConstants').EVENTS;

let fileNames;
let contents;
let responseCurrentConfig;
let responseDesiredConfig;
let responseDiff;

describe('traceManager', () => {
    const currentConfig = {
        current: {
            config: {
                object: {}
            }
        }
    };
    const desiredConfig = {
        desired: {
            config: {
                object: {}
            }
        }
    };
    const diff = {
        this: {
            is: {
                a: 'diff'
            }
        }
    };
    const eventEmitter = new EventEmitter();
    eventEmitter.on(EVENTS.TRACE_CONFIG, (taskId, current, desired) => {
        responseCurrentConfig = JSON.parse(JSON.stringify(current));
        responseDesiredConfig = JSON.parse(JSON.stringify(desired));
    });
    eventEmitter.on(EVENTS.TRACE_DIFF, (taskId, diffs) => {
        responseDiff = JSON.parse(JSON.stringify(diffs));
    });

    beforeEach(() => {
        fileNames = [];
        contents = [];
        responseCurrentConfig = undefined;
        responseDesiredConfig = undefined;
        responseDiff = undefined;

        sinon.stub(fs, 'writeFile').callsFake((name, data, cb) => {
            fileNames.push(name);
            contents.push(JSON.parse(data));
            cb();
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    after(() => {
        eventEmitter.removeAllListeners(EVENTS.TRACE_CONFIG);
        eventEmitter.removeAllListeners(EVENTS.TRACE_DIFF);
    });

    describe('config files', () => {
        it('should write config files if told to', () => {
            const controls = {
                trace: true
            };

            const traceManager = new TraceManager({ controls });
            return traceManager.traceConfigs(currentConfig, desiredConfig)
                .then(() => {
                    assert.strictEqual(fileNames[0], '/tmp/DO_current.json');
                    assert.deepEqual(contents[0], currentConfig);
                    assert.strictEqual(fileNames[1], '/tmp/DO_desired.json');
                    assert.deepEqual(contents[1], desiredConfig);
                });
        });

        it('should not write config files if not told to', () => {
            const controls = {};

            const traceManager = new TraceManager({ controls });
            return traceManager.traceConfigs(currentConfig, desiredConfig)
                .then(() => {
                    assert.strictEqual(fileNames.length, 0);
                    assert.deepEqual(contents.length, 0);
                });
        });

        it('should mask sensitive data', () => {
            const controls = {
                trace: true
            };
            const sensitiveCurrent = {
                password: 'abcd'
            };
            const sensitiveDesired = {
                password: '1234'
            };

            const traceManager = new TraceManager({ controls });
            return traceManager.traceConfigs(sensitiveCurrent, sensitiveDesired)
                .then(() => {
                    assert.deepEqual(contents[0].password, undefined);
                    assert.deepEqual(contents[1].password, undefined);
                });
        });
    });

    describe('config response', () => {
        it('should respond with config files if told to', () => {
            const controls = {
                traceResponse: true
            };

            const traceManager = new TraceManager({ controls }, eventEmitter, {});
            return traceManager.traceConfigs(currentConfig, desiredConfig)
                .then(() => {
                    assert.deepEqual(responseCurrentConfig, currentConfig);
                    assert.deepEqual(responseDesiredConfig, desiredConfig);
                });
        });

        it('should not respond with config files if not told to', () => {
            const controls = {};

            const traceManager = new TraceManager({ controls });
            return traceManager.traceConfigs(currentConfig, desiredConfig)
                .then(() => {
                    assert.deepEqual(responseCurrentConfig, undefined);
                    assert.deepEqual(responseDesiredConfig, undefined);
                });
        });

        it('should mask sensitive data', () => {
            const controls = {
                traceResponse: true
            };
            const sensitiveCurrent = {
                password: 'abcd'
            };
            const sensitiveDesired = {
                password: '1234'
            };

            const traceManager = new TraceManager({ controls }, eventEmitter, {});
            return traceManager.traceConfigs(sensitiveCurrent, sensitiveDesired)
                .then(() => {
                    assert.deepEqual(responseCurrentConfig.password, undefined);
                    assert.deepEqual(responseDesiredConfig.password, undefined);
                });
        });
    });

    describe('diff files', () => {
        it('should write diff file if told to', () => {
            const controls = {
                trace: true
            };

            const traceManager = new TraceManager({ controls });
            return traceManager.traceDiff(diff)
                .then(() => {
                    assert.strictEqual(fileNames[0], '/tmp/DO_diff.json');
                    assert.deepEqual(contents[0], diff);
                });
        });

        it('should not write diff file if not told to', () => {
            const controls = {};

            const traceManager = new TraceManager({ controls });
            return traceManager.traceDiff(diff)
                .then(() => {
                    assert.strictEqual(fileNames.length, 0);
                    assert.deepEqual(contents.length, 0);
                });
        });
    });

    describe('diff response', () => {
        it('should respond with diff files if told to', () => {
            const controls = {
                traceResponse: true
            };

            const traceManager = new TraceManager({ controls }, eventEmitter, {});
            return traceManager.traceDiff(diff)
                .then(() => {
                    assert.deepEqual(responseDiff, diff);
                });
        });

        it('should not respond with diff files if not told to', () => {
            const controls = {};

            const traceManager = new TraceManager({ controls });
            return traceManager.traceDiff(diff)
                .then(() => {
                    assert.deepEqual(responseDiff, undefined);
                });
        });
    });
});
