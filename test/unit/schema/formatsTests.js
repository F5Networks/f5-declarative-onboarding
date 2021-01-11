/**
 * Copyright 2021 F5 Networks, Inc.
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
const formats = require('../../../src/schema/latest/formats.js');

describe('formats', () => {
    describe('f5ip', () => {
        describe('ipv4', () => {
            it('should validate standalone address', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4'), true);
            });

            it('should invalidate invalid address', () => {
                assert.strictEqual(formats.f5ip('256.2.3.4'), false);
            });

            it('should validate addresses with valid prefixes', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4/32'), true, 'prefix 32 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/24'), true, 'prefix 24 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/16'), true, 'prefix 16 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/8'), true, 'prefix 8 should be valid');
                assert.strictEqual(formats.f5ip('1.2.3.4/0'), true, 'prefix 0 should be valid');
            });

            it('should invalidate addresses with invalid prefixes', () => {
                assert.strictEqual(formats.f5ip('1.2.3.4/40'), false, 'prefix 40 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/33'), false, 'prefix 33 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/321'), false, 'prefix 321 should be invalid');
                assert.strictEqual(formats.f5ip('1.2.3.4/200'), false, 'prefix 200 should be invalid');
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

            it('should validate address with valid prefix and route domain', () => {
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

            it('should validate addresses with valid prefixes', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/119'),
                    true,
                    'prefix 119 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/128'),
                    true,
                    'prefix 128 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/99'),
                    true,
                    'prefix 99 should be valid'
                );
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/9'),
                    true,
                    'prefix 9 should be valid'
                );
            });

            it('should invalidate addresses with invalid prefixes', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313/130'),
                    false,
                    'prefix 130 should be invalid'
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

            it('should validate address with valid prefix and route domain', () => {
                assert.strictEqual(
                    formats.f5ip('1200:0000:AB00:1234:0000:2552:7777:1313%1/32'),
                    true
                );
            });
        });
    });

    describe('ipWithOptionalPrefix', () => {
        describe('IPv4optionalPrefixNoRouteDomainRex', () => {
            function testValid(expression, errorMessage) {
                assert.strictEqual(
                    formats.IPv4optionalPrefixNoRouteDomainRex.exec(expression)[0],
                    expression,
                    errorMessage || 'should be valid'
                );
                assert.strictEqual(
                    formats.ipWithOptionalPrefix(expression),
                    true,
                    errorMessage || 'should be valid'
                );
            }

            function testInvalid(expression, errorMessage) {
                assert.strictEqual(
                    formats.IPv4optionalPrefixNoRouteDomainRex.exec(expression),
                    null,
                    errorMessage
                );
                assert.strictEqual(
                    formats.ipWithOptionalPrefix(expression),
                    false,
                    errorMessage
                );
            }

            it('should validate standalone address', () => {
                testValid('1.2.3.4');
            });

            it('should invalidate invalid address', () => {
                testInvalid('256.2.3.4', 'address must be valid');
            });

            it('should validate addresses with valid prefixes', () => {
                testValid('1.2.3.4/32', 'prefix 32 should be valid');
                testValid('1.2.3.4/24', 'prefix 24 should be valid');
                testValid('1.2.3.4/16', 'prefix 16 should be valid');
                testValid('1.2.3.4/8', 'prefix 8 should be valid');
                testValid('1.2.3.4/0', 'prefix 0 should be valid');
            });

            it('should invalidate addresses with invalid prefix', () => {
                testInvalid('1.2.3.4/40', 'prefix 40 should be invalid');
                testInvalid('1.2.3.4/33', 'prefix 33 should be invalid');
                testInvalid('1.2.3.4/321', 'prefix 321 should be invalid');
                testInvalid('1.2.3.4/200', 'prefix 200 should be invalid');
            });

            it('should invalidate addresses with route domain', () => {
                testInvalid('1.2.3.4%0', 'should not specify a route domain');
                testInvalid('1.2.3.4%65535', 'should not specify a route domain');
            });

            it('should invalidate address with prefix and route domain', () => {
                testInvalid('1.2.3.4%1/24', 'should not specify a route domain');
            });
        });

        describe('IPv6optionalPrefixNoRouteDomainRex', () => {
            function testValid(expression, errorMessage) {
                let lowerCaseExpression;
                if (typeof expression === 'string') {
                    lowerCaseExpression = expression.toLowerCase();
                }
                assert.strictEqual(
                    formats.IPv6optionalPrefixNoRouteDomainRex.exec(lowerCaseExpression)[0],
                    lowerCaseExpression,
                    errorMessage || 'should be valid'
                );
                assert.strictEqual(
                    formats.ipWithOptionalPrefix(expression),
                    true,
                    errorMessage || 'should be valid'
                );
            }

            function testInvalid(expression, errorMessage) {
                let lowerCaseExpression;
                if (typeof expression === 'string') {
                    lowerCaseExpression = expression.toLowerCase();
                }
                assert.strictEqual(
                    formats.IPv6optionalPrefixNoRouteDomainRex.exec(lowerCaseExpression),
                    null,
                    errorMessage
                );
                assert.strictEqual(
                    formats.ipWithOptionalPrefix(expression),
                    false,
                    errorMessage
                );
            }

            it('should validate standalone address', () => {
                testValid('1200:0000:AB00:1234:0000:2552:7777:1313');
            });

            it('should invalidate invalid address', () => {
                testInvalid('X:0000:AB00:1234:0000:2552:7777:1313');
            });

            it('should validate double colon addresses', () => { // revisit
                testValid('::');
                testValid('::/0');
                testValid('::/128');
                testValid('1111:2222:3333:4444:5555:6666:7777:8888');
                testValid('1111:2222:3333:4444:5555:6666:7777:8888/128');
                testValid('::2222:3333:4444:5555:6666:7777:8888');
                testValid('::2222:3333:4444:5555:6666:7777:8888/128');
                testValid('1111::3333:4444:5555:6666:7777:8888');
                testValid('1111::3333:4444:5555:6666:7777:8888/128');
                testValid('1111:2222:3333::6666:7777:8888');
                testValid('1111:2222:3333::6666:7777:8888/128');
                testValid('1111:2222:3333:4444:5555:6666::8888');
                testValid('1111:2222:3333:4444:5555:6666::8888/128');
                testValid('1111:2222:3333:4444:5555:6666:7777::');
                testValid('1111:2222:3333:4444:5555:6666:7777::/128');
            });

            it('should validate addresses with valid prefixes', () => {
                testValid('1200:0000:AB00:1234:0000:2552:7777:1313/119', 'prefix 119 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/128', 'prefix 128 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/99', 'prefix 99 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/9', 'prefix 9 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/0', 'prefix 0 should be valid');
            });

            it('should invalidate addresses with invalid prefixes', () => {
                testInvalid('1200:0000:AB00:1234:0000:2552:7777:1313/129', 'prefix 129 should be invalid');
            });

            it('should invalidate addresses with route domain', () => {
                testInvalid('1200:0000:ab00:1234:0000:2552:7777:1313%0');
                testInvalid('1200:0000:ab00:1234:0000:2552:7777:1313%65535');
            });

            it('should invalidate address with prefix and route domain', () => {
                testInvalid('1200:0000:AB00:1234:0000:2552:7777:1313%1/32');
            });
        });
    });

    describe('ipWithRequiredPrefix', () => {
        describe('IPv4requiredPrefixNoRouteDomainRex', () => {
            function testValid(expression, errorMessage) {
                assert.strictEqual(
                    formats.IPv4requiredPrefixNoRouteDomainRex.exec(expression)[0],
                    expression,
                    errorMessage || 'should be valid'
                );
                assert.strictEqual(
                    formats.ipWithRequiredPrefix(expression),
                    true,
                    errorMessage || 'should be valid'
                );
            }

            function testInvalid(expression, errorMessage) {
                assert.strictEqual(
                    formats.IPv4requiredPrefixNoRouteDomainRex.exec(expression),
                    null,
                    errorMessage
                );
                assert.strictEqual(
                    formats.ipWithRequiredPrefix(expression),
                    false,
                    errorMessage
                );
            }

            it('should validate address with prefix', () => {
                testValid('10.10.0.0/24');
            });

            it('should invalidate invalid address with prefix', () => {
                testInvalid('256.2.3.4/24', 'address must be valid');
            });

            it('should invalidate address without prefix', () => {
                testInvalid('10.10.0.0', 'prefix must be present');
            });

            it('should validate addresses with valid prefixes', () => {
                testValid('1.2.3.4/32', 'prefix 32 should be valid');
                testValid('1.2.3.4/24', 'prefix 24 should be valid');
                testValid('1.2.3.4/16', 'prefix 16 should be valid');
                testValid('1.2.3.4/8', 'prefix 8 should be valid');
                testValid('1.2.3.4/0', 'prefix 0 should be valid');
            });

            it('should invalidate addresses with invalid prefixes', () => {
                testInvalid('1.2.3.4/40', 'prefix 40 should be invalid');
                testInvalid('1.2.3.4/33', 'prefix 33 should be invalid');
                testInvalid('1.2.3.4/321', 'prefix 321 should be invalid');
                testInvalid('1.2.3.4/200', 'prefix 200 should be invalid');
            });

            it('should invalidate addresses with route domain', () => {
                testInvalid('1.2.3.4%0', 'should not specify a route domain');
                testInvalid('1.2.3.4%65535', 'should not specify a route domain');
            });

            it('should invalidate address with prefix and route domain', () => {
                testInvalid('1.2.3.4%1/24', 'should not specify a route domain');
            });
        });

        describe('IPv6requiredPrefixNoRouteDomainRex', () => {
            function testValid(expression, errorMessage) {
                let lowerCaseExpression;
                if (typeof expression === 'string') {
                    lowerCaseExpression = expression.toLowerCase();
                }
                assert.strictEqual(
                    formats.IPv6requiredPrefixNoRouteDomainRex.exec(lowerCaseExpression)[0],
                    lowerCaseExpression,
                    errorMessage || 'should be valid'
                );
                assert.strictEqual(
                    formats.ipWithRequiredPrefix(expression),
                    true,
                    errorMessage || 'should be valid'
                );
            }

            function testInvalid(expression, errorMessage) {
                let lowerCaseExpression;
                if (typeof expression === 'string') {
                    lowerCaseExpression = expression.toLowerCase();
                }
                assert.strictEqual(
                    formats.IPv6requiredPrefixNoRouteDomainRex.exec(lowerCaseExpression),
                    null,
                    errorMessage
                );
                assert.strictEqual(
                    formats.ipWithRequiredPrefix(expression),
                    false,
                    errorMessage
                );
            }

            it('should validate address with prefix', () => {
                testValid('1200:0000:AB00:1234:0000:2552:7777:1313/32');
            });

            it('should invalidate invalid address', () => {
                testInvalid('X:0000:AB00:1234:0000:2552:7777:1313/32');
            });

            it('should validate double colon addresses with prefix', () => {
                assert.strictEqual(formats.ipWithRequiredPrefix('::/24'), true);
                testValid('::/0');
                testValid('::/128');
                testValid('::2222:3333:4444:5555:6666:7777:8888/128');
                testValid('1111::3333:4444:5555:6666:7777:8888/128');
                testValid('1111:2222:3333::6666:7777:8888/128');
                testValid('1111:2222:3333:4444:5555:6666::8888/128');
                testValid('1111:2222:3333:4444:5555:6666:7777::/128');
            });

            it('should invalidate double colon addresses missing prefix', () => {
                testInvalid('::');
                testInvalid('::2222:3333:4444:5555:6666:7777:8888');
                testInvalid('1111::3333:4444:5555:6666:7777:8888');
                testInvalid('1111:2222:3333::6666:7777:8888');
                testInvalid('1111:2222:3333:4444:5555:6666::8888');
                testInvalid('1111:2222:3333:4444:5555:6666:7777::');
            });

            it('should validate addresses with valid prefixes', () => {
                testValid('1200:0000:AB00:1234:0000:2552:7777:1313/119', 'prefix 119 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/128', 'prefix 128 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/99', 'prefix 99 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/9', 'prefix 9 should be valid');
                testValid('1200:0000:ab00:1234:0000:2552:7777:1313/0', 'prefix 0 should be valid');
            });

            it('should invalidate addresses with invalid prefix', () => {
                testInvalid('1200:0000:AB00:1234:0000:2552:7777:1313/129', 'prefix 129 should be invalid');
            });

            it('should invalidate addresses with route domain', () => {
                testInvalid('1200:0000:ab00:1234:0000:2552:7777:1313%0');
                testInvalid('1200:0000:ab00:1234:0000:2552:7777:1313%65535');
            });

            it('should invalidate address with prefix and route domain', () => {
                testInvalid('1200:0000:AB00:1234:0000:2552:7777:1313%1/32');
            });
        });
    });
});
