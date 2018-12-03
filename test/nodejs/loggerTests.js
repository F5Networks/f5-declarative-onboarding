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
const Logger = require('../../nodejs/logger');

const logger = new Logger(module);

const loggedMessages = {
    silly: [],
    verbose: [],
    debug: [],
    warning: [],
    info: [],
    error: [],
    finest: [],
    finer: [],
    fine: [],
    warn: [],
    severe: []
};

const loggerMock = {
    silly(message) { loggedMessages.silly.push(message); },
    verbose(message) { loggedMessages.verbose.push(message); },
    debug(message) { loggedMessages.debug.push(message); },
    warning(message) { loggedMessages.warning.push(message); },
    info(message) { loggedMessages.info.push(message); },
    error(message) { loggedMessages.error.push(message); },
    finest(message) { loggedMessages.finest.push(message); },
    finer(message) { loggedMessages.finer.push(message); },
    fine(message) { loggedMessages.fine.push(message); },
    warn(message) { loggedMessages.warn.push(message); },
    severe(message) { loggedMessages.severe.push(message); }
};

logger.logger = loggerMock;

describe('logger', () => {
    beforeEach(() => {
        Object.keys(loggedMessages).forEach((level) => {
            loggedMessages[level].length = 0;
        });
    });

    it('should log at the appropriate level', () => {
        Object.keys(loggedMessages).forEach((level) => {
            logger[level](`this is a ${level} message`);
        });

        // these levels have something else mapped to them, so there are 2 messages each
        ['warning', 'finest', 'finer', 'fine', 'severe'].forEach((level) => {
            assert.strictEqual(loggedMessages[level].length, 2);
        });

        // info does not have a mapping
        assert.strictEqual(loggedMessages.info.length, 1);
        assert.notStrictEqual(loggedMessages.info[0].indexOf('this is a info message'), -1);
    });

    it('should log extra args', () => {
        logger.info('part 1', 'part 2', 'part 3');
        assert.notStrictEqual(loggedMessages.info[0].indexOf('part 1 part 2 part 3'), -1);
    });

    it('should mask passwords', () => {
        const myPassword = 'foofoo';
        logger.info({ password: myPassword });
        assert.strictEqual(loggedMessages.info[0].indexOf(myPassword), -1);
        assert.notStrictEqual(loggedMessages.info[0].indexOf('password:', -1));
        assert.notStrictEqual(loggedMessages.info[0].indexOf('********', -1));
    });
});
