/**
 * Copyright 2019 F5 Networks, Inc.
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

const InfoResponse = require('../../nodejs/infoResponse');

let infoResponse;

describe('infoResponse', () => {
    beforeEach(() => {
        infoResponse = new InfoResponse();
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

    it('should return the proper data', () => {
        const info = infoResponse.getData();
        assert.strictEqual(typeof info.version, 'string');
        assert.strictEqual(typeof info.release, 'string');
        assert.strictEqual(typeof info.schemaCurrent, 'string');
        assert.strictEqual(typeof info.schemaMinimum, 'string');
    });
});
