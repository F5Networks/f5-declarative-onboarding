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
const formats = require('../../src/schema/latest/formats.js');

describe('formats', () => {
    describe('f5ip', () => {
        describe('ipv4', () => {
            it('should validate standalone address', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4'), true);
            });

            it('should invalidate invalid address', () => {
                assert.strictEqual(formats.f5ip('256.2.3.4'), false);
            });

            it('should validate addresses with valid CIDRs', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4/32'), true, 'CIDR 32 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/24'), true, 'CIDR 24 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/16'), true, 'CIDR 16 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/8'), true, 'CIDR 8 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/0'), true, 'CIDR 0 should be valid');
            });

            it('should invalidate addresses with invalid CIDRs', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4/40'), false, 'CIDR 40 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/33'), false, 'CIDR 33 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/321'), false, 'CIDR 321 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/200'), false, 'CIDR 200 should be invalid');
            });

            it('should validate addresses with valid route domain', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4%0'), true, 'route domain 0 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4%65535'), true, 'route domain 65535 should be valid');
            });

            it('should invalidate addresses with invlaid route domain', () => {
                assert.strictEqual(
                    formats.f5ip('1.2.3.4%65536'), false, 'route domain 65536 should be invalid'
                );
            });

            it('should validate address with valid CIDR and route domain', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4%1/24'), true);
            });
        });

        describe('ipv6', () => {
            it('should validate standalone address', () => {
                assert.strictEqual(formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313'), true);
            });

            it('should invalidate invalid address', () => {
                assert.strictEqual(formats.f5ip('X:0000:AB00:1234:0000:2552:7777:1313'), false);
            });

            it('should validate addresses with valid CIDRs', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/119'),
                    true,
                    'CIDR 119 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/128'),
                    true,
                    'CIDR 128 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/99'),
                    true,
                    'CIDR 99 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/9'),
                    true,
                    'CIDR 9 should be valid'
                );
            });

            it('should invalidate addresses with invalid CIDRs', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/130'),
                    false,
                    'CIDR 130 should be invalid'
                );
            });

            it('should validate addresses with valid route domain', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313%0'),
                    true,
                    'route domain 0 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313%65535'),
                    true,
                    'route domain 65536 should be valid'
                );
            });

            it('should invalidate addresses with invalid route domain', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313%65536'),
                    false,
                    'route domain 65536 should be invalid'
                );
            });

            it('should validate address with valid CIDR and route domain', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313%1/32'),
                    true
                );
            });
        });
    });
});
