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
const response = require('../../nodejs/response');

describe('response tests', () => {
    it('should format basic response', () => {
        const body = {
            status: {
                code: 200,
                message: 'OK'
            },
            foo: {
                hello: 'world',
                bar: {
                    one: 1
                }
            }
        };

        const formatted = response.getResponseBody(body);
        assert.deepEqual(formatted.declaration.foo, body.foo);
    });

    it('should delete passwords', () => {
        const body = {
            status: {
                code: 200,
                message: 'OK'
            },
            foo: {
                password: 'world',
                bar: {
                    one: 1,
                    password: 2
                }
            }
        };

        const formatted = response.getResponseBody(body);
        assert.strictEqual(formatted.declaration.foo.password, undefined);
        assert.strictEqual(formatted.declaration.foo.bar.password, undefined);
    });
});
