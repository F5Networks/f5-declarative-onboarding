/**
 * Copyright 2024 F5, Inc.
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
const sinon = require('sinon');
const fs = require('fs');

const doUtil = require('../../../src/lib/doUtil');
const InfoResponse = require('../../../src/lib/infoResponse');

const PACKAGE_VERSION = require('../../../package.json').version;
const SCHEMA_VERSIONS = require('../../../src/schema/latest/base.schema.json').properties.schemaVersion.enum;

describe('infoResponse', () => {
    let infoResponse;

    beforeEach(() => {
        infoResponse = new InfoResponse();
    });

    before(() => {
        sinon.stub(fs, 'readFileSync').returns(PACKAGE_VERSION);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return the proper selfLink', () => {
        assert.strictEqual(
            infoResponse.getSelfLink(1234),
            'https://localhost/mgmt/shared/declarative-onboarding/info'
        );
    });

    it('exists should return true', () => {
        assert.strictEqual(infoResponse.exists(), true);
    });

    it('should return the a code of 200', () => {
        assert.strictEqual(infoResponse.getCode(1234), 200);
    });

    it('should return a status of OK', () => {
        assert.strictEqual(infoResponse.getStatus(1234), 'OK');
    });

    it('should return and empty message', () => {
        assert.strictEqual(infoResponse.getMessage(1234), '');
    });

    it('should return empty errors', () => {
        assert.deepEqual(infoResponse.getErrors(1234), []);
    });

    ['', 'one more time'].forEach((titleItem) => {
        it(`should return the proper data ${titleItem}`, () => {
            const schemaVersionMax = SCHEMA_VERSIONS[0];
            const schemaVersionMin = SCHEMA_VERSIONS[SCHEMA_VERSIONS.length - 1];

            const getDoVersionSpy = sinon.stub(doUtil, 'getDoVersion').returns({ VERSION: '1.2.3', RELEASE: '4' });

            const info = infoResponse.getData('123-abc');
            assert.strictEqual(typeof info.version, 'string');
            assert.strictEqual(typeof info.release, 'string');
            assert.strictEqual(typeof info.schemaCurrent, 'string');
            assert.strictEqual(typeof info.schemaMinimum, 'string');
            assert.strictEqual(info.version, '1.2.3', 'Version number should match version number from doUtil.getDoVersion');
            assert.strictEqual(info.release, '4', 'Release number should match release number from doUtil.getDoVersion');
            assert.strictEqual(info.schemaCurrent, schemaVersionMax, 'Currrent schema version should match version from base.schema.json');
            assert.strictEqual(info.schemaMinimum, schemaVersionMin, 'Minimal schema version should match version from base.schema.json');
            assert.strictEqual(getDoVersionSpy.args[0][0], '123-abc', 'ID should be passed to getDoVersion');
        });
    });
});
