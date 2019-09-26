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
    MASK_REGEX: new RegExp('pass(word|phrase)|secret', 'i'),
    ENDPOINT_MAX_TIMEOUT: 60000,
    ENDPOINTS: {
        CONFIG: 'config',
        INFO: 'info',
        INSPECT: 'inspect',
        TASK: 'task'
    },
    PATHS: {
        DNS: '/tm/sys/dns',
        NTP: '/tm/sys/ntp',
        Route: '/tm/net/route',
        SelfIp: '/tm/net/self',
        VLAN: '/tm/net/vlan',
        Trunk: '/tm/net/trunk',
        DeviceGroup: '/tm/cm/device-group',
        Analytics: '/tm/analytics/global-settings',
        ManagementRoute: '/tm/sys/management-route',
        RouteDomain: '/tm/net/route-domain',
        AuthRadius: '/tm/auth/radius',
        AuthRadiusServer: '/tm/auth/radius-server',
        AuthSource: '/tm/auth/source',
        AuthTacacs: '/tm/auth/tacacs',
        AuthRemoteUser: '/tm/auth/remote-user',
        AuthRemoteRole: '/tm/auth/remote-role/role-info',
        AuthLdap: '/tm/auth/ldap',
        SnmpAgent: '/tm/sys/snmp',
        SnmpTrapEvents: '/tm/sys/snmp',
        SnmpUser: '/tm/sys/snmp',
        SnmpCommunity: '/tm/sys/snmp',
        SnmpTrapDestination: '/tm/sys/snmp',
        Syslog: '/tm/sys/syslog',
        System: '/tm/sys/global-settings',
        DagGlobals: '/tm/net/dag-globals',
        TrafficControl: '/tm/ltm/global-settings/traffic-control',
        SSHD: '/tm/sys/sshd'
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
        'Analytics',
        'Authentication',
        'RemoteAuthRoles',
        'SnmpAgent',
        'SnmpTrapEvents',
        'DagGlobals',
        'System',
        'TrafficControl',
        'SSHD'
    ],
    AUTH: {
        SUBCLASSES_NAME: 'system-auth'
    },
    RADIUS: {
        SERVER_PREFIX: 'system_auth_name',
        PRIMARY_SERVER: 'system_auth_name1',
        SECONDARY_SERVER: 'system_auth_name2'
    }
};
