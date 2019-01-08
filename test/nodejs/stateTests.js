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

const State = require('../../nodejs/state');

describe('state', () => {
    it('should create a new state from an exsiting state', () => {
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
        assert.deepEqual(state, existingState);
    });

    it('should set the result properties', () => {
        const state = new State();
        const code = 1;
        const message = 'foo';
        const status = 'bar';
        const errors = ['my', 'list', 'of', 'errors'];

        state.code = code;
        state.message = message;
        state.status = status;
        state.errors = errors;

        assert.strictEqual(state.code, code);
        assert.strictEqual(state.message, message);
        assert.strictEqual(state.status, status);
        assert.deepEqual(state.errors, errors);
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
        state.declaration = declaration;
        assert.deepEqual(state.declaration, declaration);
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
        state.declaration = declaration;
        assert.strictEqual(state.declaration.foo.bar.hello, declaration.foo.bar.hello);
        assert.strictEqual(state.declaration.foo.bar.password, undefined);
        assert.notStrictEqual(declaration.foo.bar.password, undefined);
        assert.strictEqual(state.declaration.fooArray[0].okie, declaration.fooArray[0].okie);
        assert.strictEqual(state.declaration.fooArray[0].password, undefined);
        assert.notStrictEqual(declaration.fooArray[0].password, undefined);
    });

    it('should update results', () => {
        const state = new State();
        const code = 1;
        const message = 'foo';
        const status = 'bar';
        const errors = ['my', 'list', 'of', 'errors'];

        state.updateResult(code, status, message, errors);

        assert.strictEqual(state.code, code);
        assert.strictEqual(state.message, message);
        assert.strictEqual(state.status, status);
        assert.deepEqual(state.errors, errors);
    });
});
