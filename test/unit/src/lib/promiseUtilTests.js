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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');

const promiseUtil = require('../../../../src/lib/promiseUtil');

describe('promiseUtil', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('delay', () => {
        it('should resolve after provided time to wait', () => {
            const clock = sinon.useFakeTimers();
            let promiseResolved = false;

            promiseUtil.delay(10000)
                .then(() => {
                    promiseResolved = true;
                });

            return Promise.resolve()
                .then(() => {
                    clock.tick(5000);
                })
                .then(() => {
                    assert.strictEqual(promiseResolved, false, 'Promise delay should not have returned yet (5s)');
                    clock.tick(5000);
                })
                .then(() => {
                    assert.strictEqual(promiseResolved, true, 'Promise delay should have returned (10s)');
                });
        });

        it('should return value if provided', () => {
            const clock = sinon.useFakeTimers();
            let value;

            promiseUtil.delay(10000, 'foo bar')
                .then((val) => {
                    value = val;
                });

            return Promise.resolve()
                .then(() => {
                    clock.tick(10000);
                })
                .then(() => {
                    assert.strictEqual(value, 'foo bar', 'Promise delay should have returned provided value');
                });
        });
    });
});
