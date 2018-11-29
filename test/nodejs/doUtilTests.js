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
const cloudUtilMock = require('@f5devcentral/f5-cloud-libs').util;
const BigIpMock = require('@f5devcentral/f5-cloud-libs').bigIp;

const doUtil = require('../../nodejs/doUtil');

describe('doUtil tests', () => {
    const port = '1234';
    let bigIpInitOptions;

    before(() => {
        BigIpMock.prototype.init = (host, user, password, options) => {
            bigIpInitOptions = options;
            return Promise.resolve();
        };

        cloudUtilMock.runTmshCommand = () => {
            return Promise.resolve(`sys httpd { ssl-port ${port} }`);
        };
    });

    describe('getBigIp', () => {
        it('should get a BIG-IP with the correct management port', () => {
            return new Promise((resolve, reject) => {
                doUtil.getBigIp()
                    .then(() => {
                        assert.strictEqual(bigIpInitOptions.port, port);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        });

        it('should raise initialization errors', () => {
            const initErr = new Error('my init error');
            BigIpMock.prototype.init = (host, user, password, options) => {
                bigIpInitOptions = options;
                return Promise.reject(initErr);
            };

            return new Promise((resolve, reject) => {
                doUtil.getBigIp()
                    .then(() => {
                        reject(new Error('should have raised initialization error'));
                    })
                    .catch((err) => {
                        assert.strictEqual(err.message, initErr.message);
                        resolve();
                    });
            });
        });
    });
});
