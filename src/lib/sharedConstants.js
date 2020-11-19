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
    MASK_REGEX: new RegExp('pass(word|phrase)|secret|privateKey', 'i'),
    ENDPOINT_MAX_TIMEOUT: 60000,
    ENDPOINTS: {
        CONFIG: 'config',
        INFO: 'info',
        INSPECT: 'inspect',
        TASK: 'task'
    },
    PATHS: {
        AuthPartition: '/tm/auth/partition',
        DNS: '/tm/sys/dns',
        NTP: '/tm/sys/ntp',
        Route: '/tm/net/route',
        SelfIp: '/tm/net/self',
        VLAN: '/tm/net/vlan',
        Trunk: '/tm/net/trunk',
        DNS_Resolver: '/tm/net/dns-resolver',
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
        CLI: '/tm/cli/global-settings',
        DagGlobals: '/tm/net/dag-globals',
        TrafficControl: '/tm/ltm/global-settings/traffic-control',
        TrafficGroup: '/tm/cm/traffic-group',
        HTTPD: '/tm/sys/httpd',
        SSHD: '/tm/sys/sshd',
        SoftwareUpdate: '/tm/sys/software/update',
        Tunnel: '/tm/net/tunnels/tunnel',
        RoutingAsPath: '/tm/net/routing/as-path',
        Uploads: '/shared/file-transfer/uploads',
        SSLCert: '/tm/sys/file/ssl-cert',
        SSLKey: '/tm/sys/file/ssl-key',
        UnixRm: '/tm/util/unix-rm',
        GSLBGeneral: '/tm/gtm/global-settings/general'
    },
    STATUS: {
        STATUS_OK: 'OK',
        STATUS_ERROR: 'ERROR',
        STATUS_ROLLING_BACK: 'ROLLING_BACK',
        STATUS_RUNNING: 'RUNNING',
        STATUS_REBOOTING: 'REBOOTING',
        STATUS_REVOKING: 'REVOKING',
        STATUS_REBOOTING_AND_RESUMING: 'REBOOTING_AND_RESUMING'
    },
    EVENTS: {
        LICENSE_WILL_BE_REVOKED: 'DO_LICENSE_WILL_BE_REVOKED',
        READY_FOR_REVOKE: 'DO_READY_FOR_REVOKE',
        REBOOT_NOW: 'DO_REBOOT_NOW',
        TRACE_CONFIG: 'TRACE_CONFIG',
        TRACE_DIFF: 'TRACE_DIFF'
    },
    NAMELESS_CLASSES: [
        'DbVariables',
        'DNS',
        'NTP',
        'License',
        'Provision',
        'ConfigSync',
        'FailoverUnicast',
        'FailoverMulticast',
        'DeviceTrust',
        'Analytics',
        'Authentication',
        'RemoteAuthRoles',
        'SnmpAgent',
        'SnmpTrapEvents',
        'DagGlobals',
        'System',
        'TrafficControl',
        'HTTPD',
        'SSHD',
        'Disk',
        'MirrorIp',
        'GSLBGlobals'
    ],
    AUTH: {
        SUBCLASSES_NAME: 'system-auth'
    },
    RADIUS: {
        SERVER_PREFIX: 'system_auth_name',
        PRIMARY_SERVER: 'system_auth_name1',
        SECONDARY_SERVER: 'system_auth_name2'
    },
    LDAP: {
        CA_CERT: 'do_ldapCaCert.crt',
        CLIENT_CERT: 'do_ldapClientCert.crt',
        CLIENT_KEY: 'do_ldapClientCert.key'
    }
};
