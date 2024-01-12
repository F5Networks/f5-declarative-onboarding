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

const doUtil = require('./doUtil');

class UserValidator {
    validate(data) {
        if (!data || !data.declaration) {
            return Promise.resolve({
                isValid: true
            });
        }

        const userWrapper = doUtil.getClassObjects(data.declaration, 'User');
        if (!userWrapper) {
            return Promise.resolve({
                isValid: true
            });
        }

        let isValid = true;
        const errors = [];

        Object.keys(userWrapper).forEach((user) => {
            if (user === 'root' && userWrapper[user].userType === 'regular') {
                isValid = false;
                errors.push('root must have userType root');
            }
            if (user !== 'root') {
                if (userWrapper[user].userType === 'root') {
                    isValid = false;
                    errors.push(`${user} must have userType regular`);
                }

                if (user.length > 31) {
                    isValid = false;
                    errors.push(`${user} is too long. User names must be less than 32 characters`);
                }
            }
        });

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = UserValidator;
