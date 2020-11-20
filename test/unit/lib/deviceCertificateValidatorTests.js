/**
 * Copyright 2020 F5 Networks, Inc.
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
const Validator = require('../../../src/lib/deviceCertificateValidator');

const validator = new Validator();

describe('deviceCertificateValidator', () => {
    const goodCert = Buffer.from('-----BEGIN CERTIFICATE-----\ncertificate data\n-----END CERTIFICATE-----').toString('base64');

    describe('valid', () => {
        it('should validate valid certificate and valid privateKey', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: goodCert
                            },
                            privateKey: {
                                base64: Buffer.from('-----BEGIN RSA PRIVATE KEY-----\nkey data\n-----END RSA PRIVATE KEY-----').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate valid certificate without privateKey', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: goodCert
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });
    });

    describe('invalid', () => {
        it('should invalidate certificate with missing BEGIN delimiter', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: Buffer.from('certificate data\n-----END CERTIFICATE-----').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors.length, 1);
                    assert.strictEqual(validation.errors[0], 'DeviceCertificate base64 decoded certificate property is missing BEGIN and/or END delimiters');
                });
        });

        it('should invalidate certificate with missing END delimiter', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: Buffer.from('-----BEGIN CERTIFICATE-----\ncertificate data').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors.length, 1);
                    assert.strictEqual(validation.errors[0], 'DeviceCertificate base64 decoded certificate property is missing BEGIN and/or END delimiters');
                });
        });

        it('should invalidate privateKey with missing BEGIN delimiter', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: goodCert
                            },
                            privateKey: {
                                base64: Buffer.from('key data\n-----END RSA PRIVATE KEY-----').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors.length, 1);
                    assert.strictEqual(validation.errors[0], 'DeviceCertificate base64 decoded privateKey property is missing BEGIN and/or END delimiters');
                });
        });

        it('should invalidate privateKey with missing END delimiter', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: goodCert
                            },
                            privateKey: {
                                base64: Buffer.from('-----BEGIN RSA PRIVATE KEY-----\nkey data').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors.length, 1);
                    assert.strictEqual(validation.errors[0], 'DeviceCertificate base64 decoded privateKey property is missing BEGIN and/or END delimiters');
                });
        });

        it('should invalidate certificate and privateKey with all delimiters missing', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        deviceCertificate: {
                            class: 'DeviceCertificate',
                            certificate: {
                                base64: Buffer.from('certificate data').toString('base64')
                            },
                            privateKey: {
                                base64: Buffer.from('key data').toString('base64')
                            }
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(!validation.isValid);
                    assert.strictEqual(validation.errors.length, 2);
                    assert.strictEqual(validation.errors[0], 'DeviceCertificate base64 decoded certificate property is missing BEGIN and/or END delimiters');
                    assert.strictEqual(validation.errors[1], 'DeviceCertificate base64 decoded privateKey property is missing BEGIN and/or END delimiters');
                });
        });
    });
});
