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

const CLASSES_OF_TRUTH = ['class1', 'class2', 'class4'];
const NAMELESS_CLASSES = ['class1', 'class2'];

const sinon = require('sinon');
const TraceManager = require('../../../src/lib/traceManager');

let DiffHandler;

/* eslint-disable global-require */

describe('diffHandler', () => {
    before(() => {
        DiffHandler = require('../../../src/lib/diffHandler');
    });

    it('should report diffs and deletes for classes of truth', () => {
        const toDeclaration = {
            Common: {
                class1: {
                    myString: 'foo',
                    myObj: {
                        foo: 'bar'
                    },
                    myArray: [1, 2, 3]
                },
                class2: {
                    foo: 'bar'
                }
            }
        };
        const fromDeclaration = {
            Common: {
                class1: {
                    myString: 'bar',
                    myArray: [4]
                },
                class2: {
                    hello: 'world'
                }
            }
        };

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.class1,
                    { myString: 'foo', myObj: { foo: 'bar' }, myArray: [1, 2, 3] });
                assert.deepStrictEqual(diff.toDelete.Common.class2, { hello: {} });
            });
    });

    it('should leave non-classes of truth alone', () => {
        const toDeclaration = {
            Common: {
                class3: {
                    myString: 'foo',
                    myObj: {
                        foo: 'bar'
                    },
                    myArray: [1, 2, 3]
                }
            }
        };
        const fromDeclaration = {
            Common: {
                class3: {
                    myOtherString: 'world',
                    myOtherObj: {
                        hello: 'world'
                    },
                    myOtherArray: [4]
                }
            }
        };

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.class3,
                    { myString: 'foo', myObj: { foo: 'bar' }, myArray: [1, 2, 3] });
                assert.deepStrictEqual(diff.toDelete.Common.class3, undefined);
            });
    });

    it('should report diffs and deletes when deleting all items of a class', () => {
        const toDeclaration = {
            Common: {
                class2: {
                    foo: 'bar'
                }
            }
        };
        const fromDeclaration = {
            Common: {
                class1: {
                    hello: 'world'
                },
                class2: {
                    foo: 'bar'
                },
                class4: {
                    myKey: 'myValue'
                }
            }
        };

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.class1, {});
                assert.deepStrictEqual(diff.toUpdate.Common.class4, {});
                assert.deepStrictEqual(diff.toDelete.Common.class1, {});
                assert.deepStrictEqual(diff.toDelete.Common.class4, {});
                assert.strictEqual(diff.toDelete.Common.class2, undefined);
            });
    });

    it('should only modify the updated object for named classes', () => {
        const toDeclaration = {
            Common: {
                class4: {
                    myUpdatedObject: {
                        myString: 'foo',
                        myObj: {
                            foo: 'bar'
                        },
                        myArray: [1, 2, 3]
                    },
                    myNonUpdatedObject: {
                        myString: 'foo',
                        myObj: {
                            foo: 'bar'
                        },
                        myArray: [1, 2, 3]
                    }
                }
            }
        };
        const fromDeclaration = {
            Common: {
                class4: {
                    myUpdatedObject: {
                        myString: 'bar',
                        myObj: {
                            foo: 'bar'
                        },
                        myArray: [4, 5, 6]
                    },
                    myNonUpdatedObject: {
                        myString: 'foo',
                        myObj: {
                            foo: 'bar'
                        },
                        myArray: [1, 2, 3]
                    }
                }
            }
        };

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.class4.myUpdatedObject,
                    { myString: 'foo', myObj: { foo: 'bar' }, myArray: [1, 2, 3] });
                assert.strictEqual(diff.toUpdate.Common.class4.myNonUpdatedObject, undefined);
            });
    });

    it('should modify all updated objects for a named class', () => {
        const toDeclaration = {
            Common: {
                class1: {
                    myUpdatedObject: {
                        myString: 'foo',
                        myObj: {
                            foo: 'bar'
                        },
                        myArray: [1, 2, 3]
                    },
                    myOtherUpdatedObject: {
                        myString: 'foofoo',
                        myObj: {
                            foo: 'barbar'
                        },
                        myArray: [11, 22, 33]
                    }
                }
            }
        };
        const fromDeclaration = {
            Common: {}
        };

        const diffHandler = new DiffHandler(CLASSES_OF_TRUTH, NAMELESS_CLASSES);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.class1.myUpdatedObject,
                    { myString: 'foo', myObj: { foo: 'bar' }, myArray: [1, 2, 3] });
                assert.deepStrictEqual(diff.toUpdate.Common.class1.myOtherUpdatedObject,
                    { myString: 'foofoo', myObj: { foo: 'barbar' }, myArray: [11, 22, 33] });
            });
    });

    it('should report diffs for non-classes of truth', () => {
        const toDeclaration = {
            Common: {
                DeviceGroup: {
                    ex1: { name: 'ex1' },
                    ex2: { name: 'ex2' }
                }
            }
        };

        const fromDeclaration = { Common: {} };

        const diffHandler = new DiffHandler([], []);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then((diff) => {
                assert.deepStrictEqual(diff.toUpdate.Common.DeviceGroup.ex1.name, 'ex1');
                assert.deepStrictEqual(diff.toUpdate.Common.DeviceGroup.ex2.name, 'ex2');
            });
    });

    it('should remove InternalUse from the diffs', () => {
        const toDeclaration = {
            Common: {
                InternalUse: {
                    nothing: 'here'
                }
            }
        };

        const fromDeclaration = {
            Common: {
                InternalUse: {
                    something: 'there'
                }
            }
        };

        let actualDiffs;
        sinon.stub(TraceManager.prototype, 'traceDiff').callsFake((diffs) => {
            actualDiffs = diffs;
            return Promise.resolve();
        });

        const diffHandler = new DiffHandler(['InternalUse'], []);
        return diffHandler.process(toDeclaration, fromDeclaration, {})
            .then(() => {
                assert.deepStrictEqual(actualDiffs.length, 0);
            });
    });
});
