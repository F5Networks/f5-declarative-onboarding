/**
 * Copyright 2021 F5 Networks, Inc.
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

/* eslint-disable max-len */
const IPv4rex = /^(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))(%(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{3}|[1-9]\d{2}|[1-9]?\d))?(\x2f(3[012]|[12]?\d))?$/;

const IPv6rex = /^(::(([0-9a-f]{1,4}:){0,5}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,4}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}:[0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,3}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){2}::(([0-9a-f]{1,4}:){0,2}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}::(([0-9a-f]{1,4}:)?((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){4}::((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){5}::([0-9a-f]{1,4})?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){0,6}::)|(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4})(%(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{3}|[1-9]\d{2}|[1-9]?\d))?(\x2f(12[0-8]|1[01]\d|[1-9]?\d))?$/;

const IPv4rexWithoutRouteDomain = /^(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))?(\x2f(3[012]|[12]?\d))?$/;

const IPv6rexWithoutRouteDomain = /^(::(([0-9a-f]{1,4}:){0,5}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,4}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}:[0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,3}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){2}::(([0-9a-f]{1,4}:){0,2}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}::(([0-9a-f]{1,4}:)?((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){4}::((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){5}::([0-9a-f]{1,4})?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){0,6}::)|(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4})(\x2f(12[0-8]|1[01]\d|[1-9]?\d))?$/;

/* eslint-enable max-len */

module.exports = {
    f5ip: (address) => {
        const lowerAddress = address.toLowerCase();
        return (!lowerAddress.length
                || ((lowerAddress.length > 1)
                && (lowerAddress.match(/[^0-9a-f:.%\x2f]/) === null)
                && (IPv4rex.test(lowerAddress) || IPv6rex.test(lowerAddress))));
    },
    ipWithCidr: (address) => {
        const lowerAddress = address.toLowerCase();
        return (!lowerAddress.length
            || ((lowerAddress.length > 1)
            && (lowerAddress.match(/[^0-9a-f:.%\x2f]/) === null)
            && (IPv4rexWithoutRouteDomain.test(lowerAddress) || IPv6rexWithoutRouteDomain.test(lowerAddress))));
    }
};
