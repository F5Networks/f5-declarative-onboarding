/**
 * Copyright 2023 F5 Networks, Inc.
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
const Validator = require('../../../src/lib/bigIqSettingsValidator');

const validator = new Validator();

describe('bigIqSettingsValidator', () => {
    describe('valid', () => {
        it('should validate declarations with no bigIqSettings', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
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

        it('should validate declarations with valid bigIqSettings', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true
                },
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
    });

    describe('clusterName', () => {
        it('should validate declarations with deviceGroup and clusterName', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true,
                    clusterName: 'foo'
                },
                declaration: {
                    Common: {
                        myDeviceGroup: {
                            class: 'DeviceGroup'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should invalidate declarations with deviceGroup but no clusterName', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true
                },
                declaration: {
                    Common: {
                        myDeviceGroup: {
                            class: 'DeviceGroup'
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

    describe('accessModuleProperties', () => {
        it('should validate declarations with apm and accessModuleProperties', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true,
                    accessModuleProperties: {
                        foo: 'bar'
                    }
                },
                declaration: {
                    Common: {
                        myProvisioning: {
                            class: 'Provision',
                            apm: 'nominal'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate declarations with apm none and no accessModuleProperties', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true
                },
                declaration: {
                    Common: {
                        myProvisioning: {
                            class: 'Provision',
                            apm: 'none'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should validate declarations with no apm and no accessModuleProperties', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true
                },
                declaration: {
                    Common: {
                        myProvisioning: {
                            class: 'Provision'
                        }
                    }
                }
            };
            return validator.validate(wrapper)
                .then((validation) => {
                    assert.ok(validation.isValid);
                });
        });

        it('should invalidate declarations with apm but no accessModuleProperties', () => {
            const wrapper = {
                targetHost: '1.2.3.4',
                bigIqSettings: {
                    snapshotWorkingConfig: true
                },
                declaration: {
                    Common: {
                        myProvisioning: {
                            class: 'Provision',
                            apm: 'nominal'
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
});
