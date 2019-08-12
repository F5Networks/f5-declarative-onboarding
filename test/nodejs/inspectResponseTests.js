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
const querystring = require('querystring');
const sinon = require('sinon');

const InspectHandler = require('../../nodejs/inspectHandler');
const InspectResponse = require('../../nodejs/inspectResponse');


describe('inspectResponse', () => {
    let inspectResponse;
    let expectedResponse;
    let expectedCode;
    let expectedMessage;
    let expectedErrMessage;

    before(() => {
        /* eslint-disable-next-line func-names */
        sinon.stub(InspectHandler.prototype, 'process').callsFake(function () {
            return new Promise((resolve) => {
                this.code = expectedCode;
                this.message = expectedMessage;
                if (expectedErrMessage) {
                    this.errors.push(expectedErrMessage);
                }
                resolve(expectedResponse);
            });
        });
    });

    beforeEach(() => {
        inspectResponse = new InspectResponse();
        expectedResponse = {};
        expectedCode = undefined;
        expectedMessage = undefined;
        expectedErrMessage = undefined;
    });

    after(() => {
        sinon.restore();
    });

    it('should return the proper selfLink', () => {
        assert.strictEqual(
            inspectResponse.getSelfLink(),
            'https://localhost/mgmt/shared/declarative-onboarding/inspect'
        );
    });

    it('should return the proper selfLink with query params', () => {
        const queryParams = { test: 'test' };
        inspectResponse.queryParams = queryParams;
        assert.strictEqual(
            inspectResponse.getSelfLink(),
            `https://localhost/mgmt/shared/declarative-onboarding/inspect?${querystring.stringify(queryParams)}`
        );
    });

    it('exists should return true', () => {
        assert.strictEqual(inspectResponse.exists(), true);
    });

    it('should return ID 0', () => {
        assert.deepStrictEqual(inspectResponse.getIds(), [0]);
    });

    it('should return the a code of 200', () => {
        expectedCode = 200;
        return inspectResponse.getData()
            .then(() => {
                assert.strictEqual(inspectResponse.getCode(), expectedCode);
            });
    });

    it('should return a status of OK', () => inspectResponse.getData()
        .then(() => {
            assert.strictEqual(inspectResponse.getStatus(), 'OK');
        }));

    it('should return a status of ERROR', () => {
        expectedCode = 400;
        return inspectResponse.getData()
            .then(() => {
                assert.strictEqual(inspectResponse.getStatus(), 'ERROR');
            });
    });

    it('should return empty message when status is OK', () => inspectResponse.getData()
        .then(() => {
            assert.strictEqual(inspectResponse.getStatus(), 'OK');
            assert.strictEqual(inspectResponse.getMessage(), '');
        }));

    it('should return "failed" message when status is ERROR', () => {
        expectedCode = 400;
        return inspectResponse.getData()
            .then(() => {
                assert.strictEqual(inspectResponse.getStatus(), 'ERROR');
                assert.strictEqual(inspectResponse.getMessage(), 'failed');
            });
    });

    it('should return custom message despite on status', () => {
        expectedMessage = 'expectedMessage';
        return inspectResponse.getData()
            .then(() => {
                assert.strictEqual(inspectResponse.getMessage(), expectedMessage);
            });
    });

    it('should return no errors when status is OK', () => inspectResponse.getData()
        .then(() => {
            assert.strictEqual(inspectResponse.getStatus(), 'OK');
            assert.deepStrictEqual(inspectResponse.getErrors(), []);
        }));

    it('should return error message despite on status', () => {
        expectedErrMessage = 'expectedErrMessage';
        return inspectResponse.getData()
            .then(() => {
                assert.deepStrictEqual(inspectResponse.getErrors(), [expectedErrMessage]);
            });
    });

    it('should return custom response data', () => {
        expectedResponse = { data: 'data' };
        return inspectResponse.getData()
            .then((response) => {
                assert.deepStrictEqual(response, expectedResponse);
            });
    });
});
