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

const nock = require('nock');
const sinon = require('sinon');
const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const fetch = require('../../../src/lib/fetchHandler');

describe('fetch', () => {
    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    describe('handleFetches', () => {
        it('should resolve if fetch.data is not an object', () => {
            const fetches = [
                {
                    data: ''
                }
            ];
            return fetch.handleFetches(fetches, 'taskId')
                .then(() => {
                    assert.deepStrictEqual(
                        fetches[0],
                        {
                            data: ''
                        }
                    );
                });
        });

        it('should handle base64 case', () => {
            const fetches = [
                {
                    schema: 'pki-cert',
                    data: {
                        base64: 'ZjVmYWtlY2VydA=='
                    },
                    dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                    parentData: {
                        certificate: {
                            base64: 'ZjVmYWtlY2VydA=='
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
                                                base64: 'ZjVmYWtlY2VydA=='
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            return fetch.handleFetches(fetches, 'taskId')
                .then(() => {
                    assert.deepStrictEqual(
                        fetches[0].parentData,
                        {
                            certificate: 'f5fakecert'
                        }
                    );
                });
        });

        it('should handle pki-cert url fetches', () => {
            const fetches = [
                {
                    schema: 'pki-cert',
                    data: {
                        url: 'https://test.example.com/theCert'
                    },
                    dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                    parentData: {
                        certificate: {
                            url: 'https://test.example.com/theCert'
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
                                                url: 'https://test.example.com/theCert'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            nock('https://test.example.com')
                .get('/theCert')
                .reply(200, 'f5fakecert');

            return fetch.handleFetches(fetches, 'taskId')
                .then(() => {
                    assert.deepStrictEqual(
                        fetches[0].parentData,
                        {
                            certificate: 'f5fakecert'
                        }
                    );
                });
        });

        it('should handle pki-cert file url fetches', () => {
            const fetches = [
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
            ];

            sinon.stub(fs, 'readFile').yields(null, 'f5fakecert');

            return fetch.handleFetches(fetches, 'taskId')
                .then(() => {
                    assert.deepStrictEqual(
                        fetches[0].parentData,
                        {
                            certificate: 'f5fakecert'
                        }
                    );
                });
        });

        it('should handle pki-key url fetches', () => {
            const fetches = [
                {
                    schema: 'pki-key',
                    data: {
                        url: 'https://test.example.com/theKey'
                    },
                    dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                    parentData: {
                        privateKey: {
                            url: 'https://test.example.com/theKey'
                        }
                    },
                    pptyName: 'privateKey',
                    rootData: {
                        class: 'DO',
                        declaration: {
                            class: 'Device',
                            Common: {
                                class: 'Tenant',
                                auth: {
                                    class: 'Authentication',
                                    ldap: {
                                        sslClientCert: {
                                            privateKey: {
                                                url: 'https://test.example.com/theKey'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            nock('https://test.example.com')
                .get('/theKey')
                .reply(200, 'f5fakekey');

            return fetch.handleFetches(fetches, 'taskId')
                .then(() => {
                    assert.deepStrictEqual(
                        fetches[0].parentData,
                        {
                            privateKey: 'f5fakekey'
                        }
                    );
                });
        });

        it('should reject with error when there is an invalid f5fetch schema with url', () => {
            const fetches = [
                {
                    schema: 'invalid',
                    data: {
                        url: 'https://test.example.com/theKey'
                    }
                }
            ];
            return assert.isRejected(fetch.handleFetches(fetches, 'taskId'), 'unimplemented schema=invalid in fetchValue()');
        });

        it('should reject with error when unable to fetch value from url', () => {
            const fetches = [
                {
                    schema: 'pki-cert',
                    data: {
                        url: 'https://test.example.com/theCert'
                    },
                    dataPath: '.declaration.Common[\'myAuth\'].ldap.sslCaCert.certificate',
                    parentData: {
                        certificate: {
                            url: 'https://test.example.com/theCert'
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
                                                url: 'https://test.example.com/theCert'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            nock('https://test.example.com')
                .get('/theCert')
                .reply(404, 'Not found');

            return assert.isRejected(
                fetch.handleFetches(fetches, 'taskId'),
                'unable to fetch value. https://test.example.com/theCert returned with status code 404'
            );
        });
    });
});
