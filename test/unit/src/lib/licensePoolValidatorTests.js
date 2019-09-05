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
const sinon = require('sinon');
const doUtil = require('../../../../src/lib/doUtil');
const Validator = require('../../../../src/lib/licensePoolValidator');

const validator = new Validator();

let doUtilMock;

describe('licensePoolValidator', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('general', () => {
        it('should validate declarations with no license', () => {
            const wrapper = {
                declaration: {
                    Common: {
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate declarations with no license pool', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'regKey'
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

    describe('onBigIp', () => {
        beforeEach(() => {
            doUtilMock = sinon.stub(doUtil, 'getCurrentPlatform').callsFake(() => Promise.resolve('BIG-IP'));
        });

        it('should validate declarations with valid licenseSettings', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqHost: '1.2.3.4',
                            bigIqUsername: 'myUser',
                            bigIqPassword: 'myPassword'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should invalidate declarations with no bigIqHost', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqUsername: 'myUser',
                            bigIqPassword: 'myPassword'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.strictEqual(validation.isValid, false);
                });
        });

        it('should invalidate declarations with bigIqHost === localhost', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqHost: 'localhost',
                            bigIqUsername: 'myUser',
                            bigIqPassword: 'myPassword'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.strictEqual(validation.isValid, false);
                });
        });

        it('should invalidate declarations with no bigIqUsername', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqHost: '1.2.3.4',
                            bigIqPassword: 'myPassword'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.strictEqual(validation.isValid, false);
                });
        });

        it('should invalidate declarations with no bigIqPassword', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqHost: '1.2.3.4',
                            bigIqUsername: 'myUser'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.strictEqual(validation.isValid, false);
                });
        });
    });

    describe('onBigIq', () => {
        beforeEach(() => {
            doUtilMock = sinon.stub(doUtil, 'getCurrentPlatform').callsFake(() => Promise.resolve('BIG-IQ'));
        });

        it('should validate declarations with valid licenseSettings', () => {
            doUtilMock.restore();
            sinon.stub(doUtil, 'getCurrentPlatform').callsFake(() => Promise.resolve('BIG-IQ'));

            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate declarations with bigIqHost === localhost with no password', () => {
            const wrapper = {
                declaration: {
                    Common: {
                        myLicense: {
                            class: 'License',
                            licenseType: 'licensePool',
                            bigIqHost: 'localhost',
                            bigIqUsername: 'myUser'
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
});
