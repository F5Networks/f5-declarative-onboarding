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
    BASE_URL: 'https://localhost/mgmt/shared/declarative-onboarding',
    MASK_REGEX: new RegExp('pass(word|phrase)', 'i'),
    ENDPOINTS: {
        CONFIG: 'config',
        INFO: 'info',
        TASK: 'task'
    },
    PATHS: {
        DNS: '/tm/sys/dns',
        NTP: '/tm/sys/ntp',
        Route: '/tm/net/route',
        SelfIp: '/tm/net/self',
        VLAN: '/tm/net/vlan',
        DeviceGroup: '/tm/cm/device-group',
        Analytics: '/tm/analytics/global-settings'
    },
    STATUS: {
        STATUS_OK: 'OK',
        STATUS_ERROR: 'ERROR',
        STATUS_ROLLING_BACK: 'ROLLING_BACK',
        STATUS_RUNNING: 'RUNNING',
        STATUS_REBOOTING: 'REBOOTING',
        STATUS_REVOKING: 'REVOKING'
    },
    EVENTS: {
        DO_LICENSE_REVOKED: 'DO_LICENSE_REVOKED'
    },
    NAMELESS_CLASSES: [
        'DbVariables',
        'DNS',
        'NTP',
        'License',
        'Provision',
        'ConfigSync',
        'FailoverUnicast',
        'DeviceTrust',
        'Analytics'
    ]
};
