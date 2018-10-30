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

/**
 * Constants used across two or more files
 *
 * @module
 */
module.exports = {
    KEYS_TO_MASK: ['password', 'newPassword', 'oldPassword', 'passphrase'],
    PATHS: {
        DNS: '/tm/sys/dns',
        NTP: '/tm/sys/ntp',
        Route: '/tm/net/route',
        SelfIp: '/tm/net/self',
        VLAN: '/tm/net/vlan'
    },
    STATUS: {
        STATUS_OK: 'OK',
        STATUS_ERROR: 'ERROR',
        STATUS_ROLLING_BACK: 'ROLLING_BACK',
        STATUS_RUNNING: 'RUNNING',
        STATUS_REBOOTING: 'REBOOTING'
    }
};
