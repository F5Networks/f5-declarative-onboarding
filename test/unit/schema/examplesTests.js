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

const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const doUtil = require('../../../src/lib/doUtil');
const Validator = require('../../../src/lib/validator');

const validator = new Validator();

describe('examples', () => {
    const files = fs.readdirSync(`${__dirname}/../../../examples`)
        .filter((file) => file.endsWith('.json')); // This removes files like .swp from being tested

    beforeEach(() => {
        sinon.stub(doUtil, 'getCurrentPlatform').callsFake(() => Promise.resolve('BIG-IP'));
    });

    afterEach(() => {
        sinon.restore();
    });

    files.forEach((file) => {
        it(`should validate ${file}`, () => {
            let declaration = JSON.parse(fs.readFileSync(`${__dirname}/../../../examples/${file}`));
            // wrap the declaration if we need to
            if (declaration.class !== 'DO') {
                declaration = {
                    declaration,
                    class: 'DO'
                };
            }
            return validator.validate(declaration)
                .then((validation) => {
                    assert.ok(validation.isValid, JSON.stringify(validation.errors, null, 4));
                });
        });
    });
});
