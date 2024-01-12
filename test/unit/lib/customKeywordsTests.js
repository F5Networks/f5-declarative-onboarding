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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const customKeywords = require('../../../src/lib/customKeywords').keywords;

describe('customKeywords', () => {
    describe('f5fetch', () => {
        const f5fetch = customKeywords.find((keyword) => keyword.name === 'f5fetch').definition;
        let that;

        beforeEach(() => {
            that = {
                fetches: []
            };
        });

        it('should process fetch', () => {
            const data = {
                schema: 'pki-cert',
                data: {
                    url: 'file:/theCert'
                },
                dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                parentData: {
                    certificate: {
                        url: 'file:/theCert'
                    }
                },
                pptyName: 'certificate',
                rootData: {
                    class: 'DO',
                    declaration: {
                        class: 'Device',
                        Common: {
                            class: 'Tenant',
                            auth: {
                                class: 'Authentication',
                                ldap: {
                                    sslCaCert: {
                                        certificate: {
                                            url: 'file:/theCert'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            const results = f5fetch(that).validate(
                data.schema, data.data, null, data.dataPath, data.parentData, data.pptyName, data.rootData
            );
            assert.strictEqual(results, true);
            assert.deepStrictEqual(
                that.fetches,
                [
                    {
                        schema: 'pki-cert',
                        data: {
                            url: 'file:/theCert'
                        },
                        dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                        parentData: {
                            certificate: {
                                url: 'file:/theCert'
                            }
                        },
                        pptyName: 'certificate',
                        rootData: {
                            class: 'DO',
                            declaration: {
                                class: 'Device',
                                Common: {
                                    class: 'Tenant',
                                    auth: {
                                        class: 'Authentication',
                                        ldap: {
                                            sslCaCert: {
                                                certificate: {
                                                    url: 'file:/theCert'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            );
        });
    });
});
