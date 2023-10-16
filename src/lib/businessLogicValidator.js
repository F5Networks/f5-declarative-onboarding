/**
 * Copyright 2023 F5, Inc.
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

class BusinessLogicValidator {
    validate(data) {
        let isValid = true;
        const errors = [];

        if (!data || !data.declaration) {
            return Promise.resolve({ isValid });
        }

        // no System class
        const sysWrapper = doUtil.getClassObjects(data.declaration, 'System');
        if (!sysWrapper) {
            return Promise.resolve({ isValid });
        }

        const sysClassKey = Object.keys(sysWrapper).find((key) => sysWrapper[key].class === 'System');
        if (sysClassKey && typeof sysWrapper[sysClassKey].mgmtDhcpEnabled !== 'undefined'
            && typeof sysWrapper[sysClassKey].preserveOrigDhcpRoutes !== 'undefined'
            && sysWrapper[sysClassKey].mgmtDhcpEnabled !== sysWrapper[sysClassKey].preserveOrigDhcpRoutes) {
            isValid = false;
            errors.push('the values of mgmtDhcpEnabled and preserveOrigDhcpRoutes must match');
        }

        // hostname is in Common and System is present but not default value ('bigip1')
        const common = data.declaration.Common;
        if (common.hostname && sysClassKey && sysWrapper[sysClassKey].hostname
            && sysWrapper[sysClassKey].hostname !== 'bigip1') {
            isValid = false;
            errors.push('multiple hostnames in declaration');
        }

        return Promise.resolve({
            isValid,
            errors
        });
    }
}

module.exports = BusinessLogicValidator;
