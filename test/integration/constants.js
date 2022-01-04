/**
 * Copyright 2022 F5 Networks, Inc.
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

/**
 * Useful constants shared
*/

'use strict';

module.exports = Object.freeze({
    HTTP_SUCCESS: 200,
    HTTP_ACCEPTED: 202,
    HTTP_BAD_REQUEST: 400,
    HTTP_UNAUTHORIZED: 401,
    HTTP_NOTFOUND: 404,
    HTTP_UNPROCESSABLE: 422,
    HTTP_UNAVAILABLE: 503,
    ICONTROL_API: '/mgmt',
    PORT: 443,
    DO_API: '/mgmt/shared/declarative-onboarding'
});
