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

/**
 * Constants used across two or more files
 *
 * @module
 */
module.exports = {
    BASE_URL: 'https://localhost/mgmt/shared/declarative-onboarding',
    MASK_REGEX: /pass(word|phrase)\b|secret|privateKey/i,
    ENDPOINT_MAX_TIMEOUT: 60000,
    ENDPOINTS: {
        CONFIG: 'config',
        INFO: 'info',
        INSPECT: 'inspect',
        TASK: 'task'
    },
    PATHS: {
        Analytics: '/tm/analytics/global-settings',
        AntiVirusProtection: '/tm/asm/virus-detection-server',
        AuthLdap: '/tm/auth/ldap',
        AuthPartition: '/tm/auth/partition',
        AuthRadius: '/tm/auth/radius',
        AuthRadiusServer: '/tm/auth/radius-server',
        AuthRemoteUser: '/tm/auth/remote-user',
        AuthRemoteRole: '/tm/auth/remote-role/role-info',
        AuthSource: '/tm/auth/source',
        AuthTacacs: '/tm/auth/tacacs',
        CLI: '/tm/cli/global-settings',
        DagGlobals: '/tm/net/dag-globals',
        DeviceGroup: '/tm/cm/device-group',
        DNS: '/tm/sys/dns',
        DNS_Resolver: '/tm/net/dns-resolver',
        FirewallPolicy: '/tm/security/firewall/policy',
        FirewallAddressList: '/tm/security/firewall/address-list',
        FirewallPortList: '/tm/security/firewall/port-list',
        GSLBDataCenter: '/tm/gtm/datacenter',
        GSLBGeneral: '/tm/gtm/global-settings/general',
        GSLBMonitor: '/tm/gtm/monitor',
        GSLBProberPool: '/tm/gtm/prober-pool',
        GSLBServer: '/tm/gtm/server',
        HTTPD: '/tm/sys/httpd',
        LicenseRegistration: '/tm/shared/licensing/registration',
        ManagementDHCPConfig: '/tm/sys/management-dhcp/sys-mgmt-dhcp-config',
        ManagementIp: '/tm/sys/management-ip',
        ManagementIpFirewall: '/tm/security/firewall/management-ip-rules',
        NetAddressList: '/tm/net/address-list',
        NetPortList: '/tm/net/port-list',
        ManagementRoute: '/tm/sys/management-route',
        PasswordPolicy: '/tm/auth/password-policy',
        NTP: '/tm/sys/ntp',
        Route: '/tm/net/route',
        RouteDomain: '/tm/net/route-domain',
        RouteMap: '/tm/net/routing/route-map',
        RoutingAccessList: '/tm/net/routing/access-list',
        RoutingAsPath: '/tm/net/routing/as-path',
        RoutingBGP: '/tm/net/routing/bgp',
        RoutingPrefixList: '/tm/net/routing/prefix-list',
        SecurityAnalytics: '/tm/security/analytics/settings',
        SelfIp: '/tm/net/self',
        SnmpAgent: '/tm/sys/snmp',
        SnmpCommunity: '/tm/sys/snmp/communities',
        SnmpTrapDestination: '/tm/sys/snmp/traps',
        SnmpTrapEvents: '/tm/sys/snmp',
        SnmpUser: '/tm/sys/snmp/users',
        SoftwareUpdate: '/tm/sys/software/update',
        SSHD: '/tm/sys/sshd',
        SSLCert: '/tm/sys/file/ssl-cert',
        SSLKey: '/tm/sys/file/ssl-key',
        SysGlobalSettings: '/tm/sys/global-settings',
        Syslog: '/tm/sys/syslog',
        TrafficControl: '/tm/ltm/global-settings/traffic-control',
        TrafficGroup: '/tm/cm/traffic-group',
        Trunk: '/tm/net/trunk',
        Tunnel: '/tm/net/tunnels/tunnel',
        UnixRm: '/tm/util/unix-rm',
        Uploads: '/shared/file-transfer/uploads',
        User: '/tm/auth/user',
        VLAN: '/tm/net/vlan',
        VXLAN: '/tm/net/tunnels/vxlan',
        WafAdvancedSettings: '/tm/asm/advanced-settings'
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
    },
    WAF_ADVANCED_SETTINGS: {
        allow_all_cookies_at_entry_point: 'OSEAbgBE9OsgvUSxORliXw',
        bypass_upon_asm_down: 'hKQW-1omECNHugcHQIcgAQ',
        bypass_upon_load: 'S7hzR_qTwol9Kkz9Lhjygg',
        cookie_expiration_time_out: 'Bo68NqP9roUE8Vv2NO-29Q',
        cookie_httponly_attr: 'yWZ5eGK1ntnYaTxblMNyww',
        cookie_max_age: '1XJcDTbBxqP0GtOcdQzF0g',
        cookie_renewal_time_stamp: 'Y2xm8sicyUqvtYW7XdazLQ',
        ecard_max_http_req_uri_len: '3Rteo2zkBA9z8nzwsCgrvQ',
        ecard_regexp_email: 'Xd48JLria9Xn13bh9hs5bA',
        ecard_regexp_decimal: 'pKEKBwZiy7KE4hcSP218sQ',
        ecard_regexp_phone: 'B6n-QlJdEAmu35GYHCjcaQ',
        icap_uri: 'G0OtDDhrirtc3DAvVIL3qA',
        LogSignatures: 'DL-dTgOI8EkErPNb89CqHQ',
        long_request_buffer_size: 'UGv8BV7NbLZZP4hgvBkk7g',
        long_request_mem_percentage: 'EmVXcGrEQcyx4D85aPY0tw',
        max_filtered_html_length: 'egIwkT5XGat_3phe_TYVxw',
        max_json_policy_size: '4NRiSGFR-qvXsN8VM7oKiw',
        max_login_request_body_buffer_size: 'KHYdzmoL_l6luO6k9Sy3Vg',
        max_raw_request_len: 'AG4WUXljvu9lM6AH8dAKXg',
        max_slow_transactions: 'E6ZRTf9B4t2VBqr7VyTx5w',
        MaxFtpSessions: 'y-ZbMLuoa2aN7qp2lBYq4Q',
        MaximumCryptographicOperations: 'xwVHrYB2wHTWW16ap_I4uA',
        MaxSmtpSessions: '-UfFoGnprUbAdfuYE3l44w',
        MaxViolationEntries: 'pF09Tjd_uNrk215bSVrdbg',
        policy_history_max_total_size: 'vO3CxwQgcbycM7iTqbnl9w',
        policy_history_min_retained_versions: 'eF-vzrQl2fwoXWA1U1o0IQ',
        ProtocolIndication: 'qUrdG89jw8HflvMKJfOkQA',
        PRXRateLimit: '4ZznWiwDgH79_TZoIjkRxw',
        request_buffer_size: 'QOvKhWpQAb2i4vlockHsYw',
        reporting_search_timeout: 'bBCPejaHht0_tgcJYQl7Qg',
        ResponseBufferSize: 'mxmQIHLzWRzL5DzQaae3Lw',
        restart_upon_config_update_error: 'h4cPIefSai5czHbH8649MA',
        RWLightThreads: '5kx5oMhJWU1JXr6jagAlkg',
        RWThreads: '9ZPR5pHmVfc5t-FfruOC-w',
        sa_login_expiration_timeout: 'NLl9aGiOQKNfx1ZWWQvdOg',
        send_content_events: 'JCJCtCv20xiFU8Xf7D5Epg',
        single_page_application: 'GqhjvcKleDusK8-xl1lC4w',
        slow_transaction_timeout: '1j5NC6SxNqHgHd4KCkFERQ',
        total_umu_max_size: '_nYculxq-fBhRqH2GVBfXw',
        total_xml_memory: 'O6z_jDkjBalpmAiwURU9HQ',
        virus_header_name: 'BBDs36E0u0ZR0GtxrD0yEA',
        WhiteHatIP1: 'Wa3cDp35bC9aXWWoXLr9bg',
        WhiteHatIP2: 'JGsWl_Fa6RT2KFZUFEHENA',
        WhiteHatIP3: 'oHZc1VsaSuoWTQGFtnr6Sg',
        WhiteHatIP4: 'e17lg9g7L_1aXWM_RJvwUg'
    }
};
