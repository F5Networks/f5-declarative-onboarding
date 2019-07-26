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
const sinon = require('sinon');
const PATHS = require('../../nodejs/sharedConstants').PATHS;
const AUTH = require('../../nodejs/sharedConstants').AUTH;
const RADIUS = require('../../nodejs/sharedConstants').RADIUS;

const AuthHandler = require('../../nodejs/authHandler');

describe('authHandler', () => {
    let bigIpMock;
    let pathsSent;
    let dataSent;

    beforeEach(() => {
        pathsSent = [];
        dataSent = [];
        bigIpMock = {
            list() {
                return Promise.resolve();
            },
            replace() {
                return Promise.resolve();
            },
            createOrModify(path, data) {
                pathsSent.push(path);
                dataSent.push(data);
                return Promise.resolve();
            },
            modify() {
                return Promise.resolve();
            }
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('radius', () => {
        it('should be able to process a radius declaration', () => {
            const declaration = {
                Common: {
                    Authentication: {
                        enabledSourceType: 'radius',
                        fallback: true,
                        radius: {
                            serviceType: 'callback-login',
                            servers: {
                                primary: {
                                    server: '1.2.3.4',
                                    port: 1811,
                                    secret: 'something'
                                },
                                secondary: {
                                    server: 'my.second.server',
                                    port: 1822,
                                    secret: 'somethingElse'
                                }
                            }
                        }
                    }
                }
            };
            const authHandler = new AuthHandler(declaration, bigIpMock);
            return authHandler.process()
                .then(() => {
                    const primary = Object.assign({}, declaration.Common.Authentication.radius.servers.primary);
                    primary.name = RADIUS.PRIMARY_SERVER;
                    primary.partition = 'Common';
                    assert.strictEqual(pathsSent[0], PATHS.AuthRadiusServer);
                    assert.deepEqual(dataSent[0], primary);

                    const secondary = Object.assign({}, declaration.Common.Authentication.radius.servers.secondary);
                    secondary.name = RADIUS.SECONDARY_SERVER;
                    secondary.partition = 'Common';
                    assert.strictEqual(pathsSent[1], PATHS.AuthRadiusServer);
                    assert.deepEqual(dataSent[1], secondary);

                    assert.strictEqual(pathsSent[2], PATHS.AuthRadius);
                    assert.deepEqual(dataSent[2], {
                        name: AUTH.SUBCLASSES_NAME,
                        serviceType: declaration.Common.Authentication.radius.serviceType,
                        partition: 'Common'
                    });
                });
        });
    });
});
