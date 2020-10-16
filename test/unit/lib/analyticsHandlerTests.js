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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const AnalyticsHandler = require('../../../src/lib/analyticsHandler');

describe('analyticsHandler', () => {
    it('should handle declaration with no Common', () => {
        const handler = new AnalyticsHandler({});
        return assert.isFulfilled(handler.process());
    });

    it('should handle declaration with no Common.Analytics', () => {
        const declaration = {
            Common: {}
        };
        const handler = new AnalyticsHandler(declaration);
        return assert.isFulfilled(handler.process());
    });

    function makeAssertTranslate(key, expectKey) {
        return function assertTranslate(value, expectValue) {
            const declaration = {
                Common: { Analytics: {} }
            };
            declaration.Common.Analytics[key] = value;

            const bigip = {
                replace: (path, data) => {
                    assert.strictEqual(path, '/tm/analytics/global-settings');
                    assert.deepStrictEqual(data[expectKey], expectValue);
                    return Promise.resolve();
                }
            };

            const handler = new AnalyticsHandler(declaration, bigip);
            return assert.isFulfilled(handler.process());
        };
    }

    it('should translate debugEnabled', () => {
        const assertTranslate = makeAssertTranslate('debugEnabled', 'avrd-debug-mode');
        return Promise.resolve()
            .then(() => assertTranslate(true, 'enabled'))
            .then(() => assertTranslate(false, 'disabled'));
    });

    it('should translate interval', () => {
        const assertTranslate = makeAssertTranslate('interval', 'avrd-interval');
        return assertTranslate(60, 60);
    });

    it('should translate offboxProtocol', () => {
        const assertTranslate = makeAssertTranslate('offboxProtocol', 'offbox-protocol');
        return Promise.resolve()
            .then(() => assertTranslate('tcp', 'tcp'))
            .then(() => assertTranslate(undefined, 'none'));
    });

    it('should translate offboxTcpAddresses', () => {
        const assertTranslate = makeAssertTranslate('offboxTcpAddresses', 'offbox-tcp-addresses');
        return Promise.resolve()
            .then(() => assertTranslate(['192.0.2.0'], ['192.0.2.0']))
            .then(() => assertTranslate(undefined, []))
            .then(() => assertTranslate([], []));
    });

    it('should translate offboxTcpPort', () => {
        const assertTranslate = makeAssertTranslate('offboxTcpPort', 'offbox-tcp-port');
        return Promise.resolve()
            .then(() => assertTranslate(80, 80))
            .then(() => assertTranslate(0, 0))
            .then(() => assertTranslate(undefined, 0));
    });

    it('should translate offboxEnabled', () => {
        const assertTranslate = makeAssertTranslate('offboxEnabled', 'use-offbox');
        return Promise.resolve()
            .then(() => assertTranslate(true, 'enabled'))
            .then(() => assertTranslate(false, 'disabled'));
    });

    it('should translate sourceId', () => {
        const assertTranslate = makeAssertTranslate('sourceId', 'source-id');
        return Promise.resolve()
            .then(() => assertTranslate(undefined, 'none'))
            .then(() => assertTranslate('sourceId', 'sourceId'));
    });

    it('should translate tenantId', () => {
        const assertTranslate = makeAssertTranslate('tenantId', 'tenant-id');
        return Promise.resolve()
            .then(() => assertTranslate(undefined, 'default'))
            .then(() => assertTranslate('tenantId', 'tenantId'));
    });
});
