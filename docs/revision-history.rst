.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Release
        - Description
        - Date

      * - 1.40
        - Updated the documentation for Declarative Onboarding v1.40.0.  This release contains the following changes: |br| * Added support for configuring BIG-IP ASM options in a declaration (see :ref:`AS3 options <asmdo>`), `GitHub Issue 656 <https://github.com/F5Networks/f5-appsvcs-extension/issues/656>`_ |br| * Support for configuring username and password prompts (see :ref:`Configuring username and password prompts<unpw>`) |br| * Added support for the route-domain attribute for prefix-lists |br| |br| Issues Resolved: |br| * Fix documentation output in the Schema Reference for the |system|.
        - 9-12-23

      * - 1.39.1
        - Released BIG-IP Declarative Onboarding 1.39.1 as a LTS (Long Term Support) version. See the BIG-IP Declarative Onboarding |supportmd| for information about the BIG-IP Declarative Onboarding support policy.
        - 9-12-23

      * - 1.39
        - Updated the documentation for Declarative Onboarding v1.39.0.  This release contains the following issues resolved: |br| * Failure to configure BIG-IP when built-in admin account is disabled |br| * DeviceCertificate hangs on BIG-IQ with no error response to user |br| * Empty object defaults can cause upgrade failures |br| * Renamed the primary branch in the GitHub repository for DO **main**
        - 7-24-23

      * - 1.38
        - Updated the documentation for Declarative Onboarding v1.38.0.  This release contains the following changes: |br| * Added support for revoking a license on a BIG-IP, allowing revoking and relicensing in a declaration (see :ref:`Revoke and relicense <relic>`) |br| * Added support for referencing a URL in the **sslCaCert** property of LDAP authentication (see :ref:`Referencing a URL in the sslCaCert property<ldap-ssl>`) |br| |br| Issues Resolved: |br| * Added missing protocol values for **SnmpUser_authentication** and **SnmpUser_privacy**
        - 5-22-23

      * - 1.37
        - Updated the documentation for Declarative Onboarding v1.37.0.  This release contains the following changes: |br| * Added support for configuring Security analytics in a declaration (see :ref:`Security Analytics <secanalytics>`) |br| * Added a note to the :ref:`License Class <license-class>` section about new behavior when using DO to relicense a BIG-IP device.
        - 3-27-23

      * - 1.36.1
        - Released BIG-IP Declarative Onboarding 1.36.1 as a LTS (Long Term Support) version. See the BIG-IP Declarative Onboarding |supportmd| for information about the BIG-IP Declarative Onboarding support policy.
        - 3-9-23

      * - 1.36
        - Updated the documentation for Declarative Onboarding v1.36.0.  This release contains the following changes: |br| * The default value for **allowService** on a **SelfIp** is now **none** (see :ref:`Troubleshooting<selfipchange>`) |br| * Updated VXLAN tunnel creation to respect TrafficControl acceptIpOptions values (see the note in :ref:`VXLAN tunnels<vxlan>`) 
        - 2-9-23

      * - 1.35
        - Updated the documentation for Declarative Onboarding v1.35.0.  This release contains the following changes: |br| * Added the **forceInitialPasswordChange** property for the User class (see the updated :ref:`User class example<example4>`) |br| |br| Issues Resolved: |br| * Restarting mcpd may wait for services that are not required, `GitHub Issue 322 <https://github.com/F5Networks/f5-declarative-onboarding/issues/322>`_ |br| * Configuring TACACS can skip reporting errors |br| * Issues when there are no Firewall Policies to be processed |br| * Improve handling on route-domains, by fixing error: "tryuntil error: ioctl failed: No such device", `GitHub Issue 323 <https://github.com/F5Networks/f5-declarative-onboarding/issues/323>`_
        - 1-12-23

      * - 1.34
        - Updated the documentation for Declarative Onboarding v1.34.0.  This release contains the following changes: |br| * Added KexAlgorithms for SSHD (see |sshd| in the Schema Reference) |br| * The task ID is now included in the DO log output (see the note in :ref:`Note and Tips<notestips>` )
        - 11-15-22

      * - 1.33
        - Updated the documentation for Declarative Onboarding v1.33.0.  This release contains the following changes: |br| * Added a Password Policy class (see :ref:`Password Policy <passwordPolicy>`) |br| * Added a note to self IP stating the default behavior will change in DO 1.35 (see :ref:`Self IP class<selfip-class>`)  |br| |br| Issues Resolved: |br| * DO issues a warning in the API response when a Self Ip is modified that the default for **allowService** will change to **none** in DO version 1.35.0 |br| Declarations with deviceCertificate via BIG-IQ fail, `GitHub Issue 297 <https://github.com/F5Networks/f5-declarative-onboarding/issues/297>`_
        - 10-4-22

      * - 1.32
        - Updated the documentation for BIG-IP Declarative Onboarding v1.30.0.  This release contains the following changes: |br| * Added support for a GUI security banner in the System class (see the updated :ref:`System example<system>`), `GitHub Issue 316 <https://github.com/F5Networks/f5-declarative-onboarding/issues/316>`_ |br| * Added the ability to enable or disable **snmpd** daemon support of snmpV1 and snmpV2c queries (see the updated :ref:`SNMP example<snmp>`), `GitHub Issue 316 <https://github.com/F5Networks/f5-declarative-onboarding/issues/316>`_ |br| * DNS_Resolver_forwardZones/name now accept "." as an FQDN, `GitHub Issue 280 <https://github.com/F5Networks/f5-declarative-onboarding/issues/280>`_ |br| |br| Issues Resolved: |br| * RemoteAuthRole console property misconfigured when set to disabled, `GitHub Issue 314 <https://github.com/F5Networks/f5-declarative-onboarding/issues/314>`_ |br| * Fail quicker on bad targetPassphrase value, `GitHub Issue 308 <https://github.com/F5Networks/f5-declarative-onboarding/issues/308>`_ |br| * Fail quicker on bad targetPassphrase value, `GitHub Issue 308 <https://github.com/F5Networks/f5-declarative-onboarding/issues/308>`_ |br| * GSLBGlobals not processed, `GitHub Issue 311 <https://github.com/F5Networks/f5-declarative-onboarding/issues/311>`_ |br| * ManagementRoute Inconsistency, `GitHub Issue 315 <https://github.com/F5Networks/f5-declarative-onboarding/issues/315>`_
        - 8-23-22

      * - 1.31
        - Updated the documentation for BIG-IP Declarative Onboarding v1.31.0.  This release contains the following Issues Resolved: |br| * Improve exception handling when running on BIG-IQ |br| * BIG-IP DO 1.29.0 unable to find /mgmt/tm/sys/provision, `GitHub Issue 306 <https://github.com/F5Networks/f5-declarative-onboarding/issues/306>`_  
        - 7-15-22

      * - 1.30
        - Updated the documentation for BIG-IP Declarative Onboarding v1.30.0.  This release contains the following changes: |br| * Added support for validating declarations with either Device or BIG-IP DO class using do.schema.json (see :ref:`Validating a declaration<validate>`) |br| |br| Issues Resolved: |br| * Declaration can fail while waiting for unprovisioned service to run |br| * Management firewall policy does not work without AFM module, `GitHub Issue 279 <https://github.com/F5Networks/f5-declarative-onboarding/issues/279>`_ |br| * BIG-IP DO unable to change hostname correctly in Google Cloud, `GitHub Issue 292 <https://github.com/F5Networks/f5-declarative-onboarding/issues/292>`_
        - 5-31-22

      * - 1.29
        - Updated the documentation for BIG-IP Declarative Onboarding v1.29.0.  This release contains the following issues resolved: |br| * SelfIp with RouteDomain cannot reach directly connected network |br| *  Licensing can fail if restnoded restarts during processing |br| * SelfIp allowService property does not accept a mix of service:port and default, `GitHub Issue 276 <https://github.com/F5Networks/f5-declarative-onboarding/issues/276>`_ |br| *  Security level is not automatically set in the SnmpUser class, `GitHub Issue 282 <https://github.com/F5Networks/f5-declarative-onboarding/issues/282>`_ |br| * Management firewall policy does not work without AFM module, `GitHub Issue 279 <https://github.com/F5Networks/f5-declarative-onboarding/issues/279>`_
        - 4-19-22

      * - 1.28
        - Updated the documentation for BIG-IP Declarative Onboarding v1.28.0.  This release contains the following changes: |br| * Added support for explicitly enabling management DHCP (see :ref:`Management DHCP <mandhcp>`) |br| * Added support for specifying route domains in the RoutingBGP and RouteMap classes (see the updated :ref:`BGP example<bgprouting>`) |br| |br| Issues Resolved: |br| *  Licensing in GCP multi-NIC fails (Upgrade to f5-cloud-libs 4.26.7), `GitHub Issue 248 <https://github.com/F5Networks/f5-declarative-onboarding/issues/248>`_ |br| * URL is incorrect in schema files, `GitHub Issue 285 <https://github.com/F5Networks/f5-declarative-onboarding/issues/285>`_
        - 3-8-22

      * - 1.27.1
        - Released BIG-IP Declarative Onboarding 1.27.1 as a LTS (Long Term Support) version. See the BIG-IP Declarative Onboarding |supportmd| for information about the BIG-IP Declarative Onboarding support policy.
        - 3-8-22

      * - 1.27
        - Updated the documentation for BIG-IP Declarative Onboarding v1.27.0.  This release contains the following resolved issues: |br| *  Items containing '.' or '-' characters in their names are not passing schema validation, `GitHub Issue 277 <https://github.com/F5Networks/f5-declarative-onboarding/issues/277>`_ |br| * DNS_Resolver is not idempotent |br| * Tunnel is not idempotent |br| * Cannot update only the description of ManagementIp |br| |br| Issues Resolved: |br| * Several idempotentcy issues are resolved, which required adding defaults for several items in the |system|
        - 1-25-22

      * - 1.26
        - Updated the documentation for BIG-IP Declarative Onboarding v1.26.0.  This release contains the following changes: |br| * Added the **remark** field to GSLBDataCenter |br| * Added a new FAQ entry for HTTPD ciphersuite values (see :ref:`HTTPD Ciphersuite<cipher>`) |br| |br| Issues Resolved: |br| * Declaration fails when Management IP already exists, `GitHub Issue 254 <https://github.com/F5Networks/f5-declarative-onboarding/issues/254>`_ |br| * BIG-IP DO fails when a route with a '/' in the name is added manually between BIG-IP DO runs, `GitHub Issue 267 <https://github.com/F5Networks/f5-declarative-onboarding/issues/267>`_ |br| * Adding a Management Route Resets Management IP to DHCP, `GitHub Issue 269 <https://github.com/F5Networks/f5-declarative-onboarding/issues/269>`_ |br| * Unsupported httpd ciphersuite, `GitHub Issue 178 <https://github.com/F5Networks/f5-declarative-onboarding/issues/178>`_ |br| * Unable to modify SelfIp referenced by ConfigSync, `GitHub Issue 135 <https://github.com/F5Networks/f5-declarative-onboarding/issues/135>`_ |br| * When GTM is enabled, BIG-IP DO returns the error 'Monitor /Common/http is read only' on the second POST even when GSLB is not in the declaration.
        - 12-14-21

      * - 1.25
        - Updated the documentation for BIG-IP Declarative Onboarding v1.25.0.  This release contains the following changes: |br| * Added support for VXLAN tunnels (see :ref:`VXLAN tunnels<vxlan>`)  |br| * The **timezone** property of the NTP class now uses **UTC** as the default |br| |br| Issues Resolved: |br| * SnmpTrapDestination, SnmpUser, and SnmpCommunity objects cannot be removed once created |br| * Firewall policies managed by AS3 are not ignored, `GitHub Issue 255 <https://github.com/F5Networks/f5-declarative-onboarding/issues/255>`_ |br| * Unable to use remote auth user on BIG-IQ to deploy BIG-IP DO declaration, `GitHub Issue 264 <https://github.com/F5Networks/f5-declarative-onboarding/issues/264>`_ |br| * BIG-IP DO fails when there is pre-existing route configuration with an interface type, `GitHub Issue 265 <https://github.com/F5Networks/f5-declarative-onboarding/issues/265>`_ |br| * BIG-IP DO always enables DHCP on the management interface after POSTing a declaration, `GitHub Issue 261 <https://github.com/F5Networks/f5-declarative-onboarding/issues/261>`_ |br| * Unable to specify gw and target in Route class, `GitHub Issue 274 <https://github.com/F5Networks/f5-declarative-onboarding/issues/274>`_ |br| * BIG-IP DO 1.24.0 doesn't honor Remote Role Groups "remoteAccess": true setting. Was previously working on 1.21.1, `GitHub Issue 268 <https://github.com/F5Networks/f5-declarative-onboarding/issues/268>`_ |br| * RouteDomain example references objects that do not exist, `GitHub Issue 263 <https://github.com/F5Networks/f5-declarative-onboarding/issues/263>`_
        - 11-2-21

      * - 1.24
        - Updated the documentation for BIG-IP Declarative Onboarding v1.24.0.  This release contains the following changes: |br| * Added support for the **ebgpMultihop** property for BGP neighbors (see the updated :ref:`BGP example<bgprouting>`) |br| * Added support for **gre** and **geneve** tunnel types (see :ref:`Tunnels<example24>`) |br| * Added the optional **chargebackTag** to the BIG-IQ utility examples, and to the :ref:`License class<license-class>` section (see :ref:`BIG-IQ utility route<bigiq2>` and :ref:`BIG-IQ utility no route<bigiq3>`) |br| * Added support for firewall rules on the management interface (see :ref:`Firewall rules<manipfwr>`) |br| * Added support for network routing access lists (see :ref:`Access Lists<routeal>`) |br| * Added example declarations for Routes and Management Routes (see :ref:`Routes<routes>`) |br| * Added default values for version, port, and network for **SnmpTrapDestination** |br| |br| Issues Resolved: |br| * FirewallPolicy incorrectly allows VLANs to be included in the destination schema object
        - 9-21-21

      * - 1.23
        - Updated the documentation for BIG-IP Declarative Onboarding v1.23.0.  This release contains the following changes: |br| * Added support for specifying a static management IP address (see :ref:`Static management IP<manip>`) |br| * Added support for preserving DHCP management routes (see :ref:`Preserve DHCP routes<dhcpresv>`) |br| * Added support for the **dryRun** Controls property to test the declaration without deploying it (see :ref:`dryRun<example32>`) |br| * BIG-IP DO now preserves user authorization keys if no keys were provided in declaration, `GitHub Issue 101 <https://github.com/F5Networks/f5-declarative-onboarding/issues/101>`_ |br| |br| Issues Resolved: |br| * Ability to create routes with the Type of Interface, `GitHub Issue 225 <https://github.com/F5Networks/f5-declarative-onboarding/issues/225>`_ |br| * RoutingPrefixList prefixLengthRange does not support strings, `GitHub Issue 237 <https://github.com/F5Networks/f5-declarative-onboarding/issues/237>`_ (see the updated :ref:`Routing Prefix lists<example26>`) |br| * Fix FailoverUnicast unicastAddresses.map is not a function |br| * RoutingBGP 'toUpperCase' undefined error, `GitHub Issue 249 <https://github.com/F5Networks/f5-declarative-onboarding/issues/249>`_
        - 8-9-21

      * - 1.22
        - Updated the documentation for BIG-IP Declarative Onboarding v1.22.0.  This release contains the following changes: |br| * Added support for Auto Last Hop on VLANs (see :ref:`Auto Last Hop<alhvlan>`) |br| * Properties in the 'traces', 'currentConfig', and 'originalConfig' sections of the response to a request now match what is sent to iControl REST rather than what is in the declaration |br| |br| Issues Resolved: |br| * BIG-IP DO might reboot the BIG-IP system when the same configurations/declaration posted, `GitHub Issue 227 <https://github.com/F5Networks/f5-declarative-onboarding/issues/227>`_ |br| * Match the accepted **hypervisor** list on BIG-IP DO with what is accepted by BIG-IQ, `GitHub Issue 216 <https://github.com/F5Networks/f5-declarative-onboarding/issues/216>`_ |br| * DeviceGroup does not work with IPv6, `GitHub Issue 233 <https://github.com/F5Networks/f5-declarative-onboarding/issues/233>`_ |br| * Race condition when creating self-ip on non-default route-domain, `GitHub Issue 234 <https://github.com/F5Networks/f5-declarative-onboarding/issues/234>`_ |br| * Failover Unicast "cannot read property indexOf of undefined"
        - 6-28-21

      * - 1.21.1
        - Released BIG-IP Declarative Onboarding 1.21.1 as a LTS (Long Term Support) version. See the BIG-IP Declarative Onboarding |supportmd| for information about the BIG-IP Declarative Onboarding support policy.
        - 6-23-21

      * - 1.21
        - Updated the documentation for BIG-IP Declarative Onboarding v1.21.0.  This release contains the following changes: |br| * Modified this revision history so the Release column aligns with the BIG-IP DO release |br| * Added support for enabling or disabling LDAP referral chasing (see :ref:`Authentication Methods<authmethods>`) |br| * Dig commands now use +nocookie option to improve compatibility with BIG-IQ 8.0 |br| |br| Issues Resolved: |br| * Invalid config after upgrading BIG-IP DO from 1.15.0, `GitHub Issue 190 <https://github.com/F5Networks/f5-declarative-onboarding/issues/190>`_ |br| * Declaration containing NTP servers by dns name failing in certain cases, `GitHub Issue 125 <https://github.com/F5Networks/f5-declarative-onboarding/issues/125>`_ |br| * Pre-DO GTM Server preventing BIG-IP DO declaration from running, `GitHub Issue 201 <https://github.com/F5Networks/f5-declarative-onboarding/issues/201>`_ |br| * Disk class causes errors on declaration update, `GitHub Issue 177 <https://github.com/F5Networks/f5-declarative-onboarding/issues/177>`_
        - 5-18-21

      * - 1.20
        - Updated the documentation for BIG-IP Declarative Onboarding v1.20.0.  This release contains the following changes: |br| * Added support for BGP Routing (see :ref:`BGP routing<bgprouting>`) |br| * Added support for Firewall Policies in a declaration, including Firewall Address and Port lists (`GitHub Issue 198 <https://github.com/F5Networks/f5-declarative-onboarding/issues/198>`_). See :ref:`Firewall Policy<firewallpolicy>` |br| |br| Issues Resolved: |br| * Cannot read property 'applicationData' of undefined, `GitHub Issue 204 <https://github.com/F5Networks/f5-declarative-onboarding/issues/204>`_ |br| * Task status change after restnoded process restarted |br| * Allow DeviceGroup owner to be an IPv6 address without having to use a json-pointer, `Issue 198 <https://github.com/F5Networks/f5-declarative-onboarding/issues/198>`_ |br| * Improve schema compatibility with BIG-IQ UI
        - 4-6-21

      * - 1.19
        - Updated the documentation for BIG-IP Declarative Onboarding v1.19.0.  This release contains the following changes: |br| * Added support for GSLB health monitors (see :ref:`GSLB Monitors<gslbmonitors>`) |br| * Added support for GSLB Prober pools (see :ref:`Prober pools<prober>`) |br| * Added support for GSLB virtual servers (see the updated :ref:`GSLB Server<gslbserver>` example) |br| |br| Issues Resolved: |br| * Improve behavior when tenant is missing, `GitHub Issue 118 <https://github.com/F5Networks/f5-declarative-onboarding/issues/118>`_
        - 2-23-21

      * - 1.18
        - Updated the documentation for BIG-IP Declarative Onboarding v1.18.0.  This release contains the following changes: |br| * Added support for GSLB Data Centers in a declaration (see :ref:`GSLB Data Center<gslbdc>`) |br| * Added support for GSLB Servers in a declaration (see :ref:`GSLB Server<gslbserver>`) |br| * Added support for routing prefix lists (see :ref:`Prefix list example<example26>`) |br| * Added support for using an external auth provider for BIG-IQ licensing (see :ref:`External Auth Provider<bigiqauth>`) |br| * The version of BIG-IP DO is now displayed in the logs on startup |br| |br| Issues Resolved: |br| * Can only create one DeviceGroup, `GitHub Issue 149 <https://github.com/F5Networks/f5-declarative-onboarding/issues/149>`_ |br| * GSLB schema defaults are not applied in some cases
        - 1-12-21

      * - 1.17
        - Updated the documentation for BIG-IP Declarative Onboarding v1.17.0.  This release contains the following changes: |br| * Added support for Failover Multicast (see :ref:`Failover Multicast<multicast>`) |br| * Updated the :ref:`Auth Methods<authmethods>` example declaration to include the new sslCaCert property (see :ref:`Auth Methods<authmethods>`) |br| * Added support for configuring Global GSLB settings (see :ref:`Global GSLB settings<globalgslb>`) |br| * Added support for using variables in some RemoteAuthRole properties (see the :ref:`Remote Auth role variable example<rolevar>`) |br| * Added support for a parent Route Domain (see the updated :ref:`Route Domain<rdomain>` example) |br| * BIG-IP DO now accepts **all** as a single word for HTTPD allow value, `GitHub Issue 163 <https://github.com/F5Networks/f5-declarative-onboarding/issues/163>`_ |br| * Removed the BIG-IP DO in a container page as that community supported solution has been deprecated |br| * Updated the BIG-IQ examples to change the bigIpPassword to match the password being set in the User Class (for example, see :ref:`Licensing with BIG-IQ<bigiq1>`) |br| * Added more categories for example declarations (see :doc:`examples`) |br| * Added a note to :doc:`examples` stating all BIG-IP examples will work on BIG-IQ when adding the BIG-IQ section to the declaration |br| * Added notes to the :doc:`do-on-bigiq` page stating **dry-run** is not supported on BIG-IQ, and GET requests are supported |br| |br| Issues Resolved: |br| * RemoteAuthRole remoteAccess property logic is backwards |br| * Disk size must be larger than current size |br| * Unable to specify route domain in route gw address, `GitHub Issue 140 <https://github.com/F5Networks/f5-declarative-onboarding/issues/140>`_
        - 11-20-20

      * - 1.16
        - Updated the documentation for BIG-IP Declarative Onboarding v1.16.0.  This release contains the following changes: |br| * Added support for connection and persistence mirroring using the new MirrorIp class, `GitHub Issue 112 <https://github.com/F5Networks/f5-declarative-onboarding/issues/112>`_  (see :ref:`example29`) |br| * Added an example showing how to add an advisory banner in a declaration (see :ref:`example30`) |br| * Added an example declaration for increasing the memory for restjavad (see :ref:`example31` and :ref:`restjavad`) |br| * Updated the note for vCMP systems on the :doc:`prereqs` page stating that creating vCMP guests with a BIG-IP DO declaration is not supported |br| * Added a note on the :doc:`do-container` and :ref:`Warnings<warnings>` pages stating that F5 is archiving the community-supported BIG-IP DO in a container solution |br| * Updated the note in :doc:`prereqs` to include BIG-IP 13.1.3.x as incompatible with BIG-IP Declarative Onboarding |br| |br| Issues Resolved: |br| * Retry license install if BIG-IP DO receives a connection reset |br| * Target VLAN errors from the inspect endpoint |br| * Fix minor schema issues: No type for minPathMtu and use const for Tunnel class |br| * Route creation order can be incorrect (`GitHub Issue 147 <https://github.com/F5Networks/f5-declarative-onboarding/issues/147>`_)
        - 10-13-20

      * - 1.15
        - Updated the documentation for BIG-IP Declarative Onboarding v1.15.0.  This release contains the following changes: |br| * Added support for allowed source IP addresses for SSHD  (see the updated :ref:`SSHD example<sshex>`) |br| * Added support for the **tenant** property in the License class allowing an optional description of the license (see the *No Route* examples in :doc:`big-iq-licensing` and `bigiq-examples`) |br| * Added support for multiple failover unicast addresses (see :ref:`founi`) |br| * Added support for traces in BIG-IP DO responses (see :ref:`example27`) |br| * Added support for creating routes in the LOCAL_ONLY partition (see :ref:`example28`) |br| * Added more information about the Webhook property in :ref:`base-comps`, and an example of the request sent to the webhook |br| * Updated the support notice for the community-supported :ref:`BIG-IP DO Container<container>` to remove mention of the container being fully supported in the future  |br| * Added a troubleshooting entry for a restjavad issue (see :ref:`restjavad`) |br| * Added support for BIG-IP 16.0  |br| |br| Issues Resolved: |br| * Improve schema for use with BIG-IQ 7.1
        - 09-01-20

      * - 1.14
        - Updated the documentation for BIG-IP Declarative Onboarding v1.14.0.  This release contains the following changes: |br| * Added support for VLAN Failsafe (see :ref:`VLAN Failsafe<example22>`) |br| * Added support for creating DNS Resolvers (see :ref:`DNS Resolver<example23>`) |br| * Added support for creating a TCP Forward Network Tunnel (see :ref:`Tunnel<example24>`) |br| * Added support for Traffic Groups (see :ref:`trafficgroup` and :ref:`Traffic Groups<example25>`) |br| |br| Issues Resolved: |br| * Bad class values do not fail schema validation |br| * MAC_Masquerade fails to roll back properly
        - 07-21-20

      * - 1.13
        - Updated the documentation for BIG-IP Declarative Onboarding v1.13.0.  This release contains the following changes: |br| * Added support for SSL in LDAP configurations (see the :ref:`authmethods`) |br| * Added support for the userAgent property in the new Controls class (see :ref:`example19`) |br| * Added support for disabling the update auto-check in a declaration - `GitHub Issue 107 <https://github.com/F5Networks/f5-declarative-onboarding/issues/107>`_ (see :ref:`systemex`) |br| * Added support for Audit Logging - `GitHub Issue 120 <https://github.com/F5Networks/f5-declarative-onboarding/issues/120>`_  (see :ref:`example20`) |br| * Added support for Mac Masquerade - `GitHub Issue 96 <https://github.com/F5Networks/f5-declarative-onboarding/issues/96>`_  (see :ref:`example21`) |br| |br| Issues Resolved: |br| * Cannot create a device group with AFM provisioned  (`GitHub Issue 138 <https://github.com/F5Networks/f5-declarative-onboarding/issues/138>`_)  |br| * Problems with latest Azure image  |br| * charset not allowed in Content-Type header (`GitHub Issue 79 <https://github.com/F5Networks/f5-declarative-onboarding/issues/79>`_)
        - 06-02-20

      * - 1.12
        - Updated the documentation for BIG-IP Declarative Onboarding v1.12.0.  This release contains the following changes: |br| * Added support for updating/uploading Device certificates (see :ref:`example18`)  |br| |br| Issues Resolved: |br| * Provisioning fails if module does not exist on box (`GitHub Issue 91 <https://github.com/F5Networks/f5-declarative-onboarding/issues/91>`_) |br| * Call webhook after declaration requiring reboot |br| * Fix allowed schema versions (also fixed in patch release 1.11.1) |br| * Schema is incompatible with golang regexp (`GitHub Issue 132 <https://github.com/F5Networks/f5-declarative-onboarding/issues/132>`_) |br| * Added missing roles for RemoteAuthRole.role enum (`GitHub Issue 81 <https://github.com/F5Networks/f5-declarative-onboarding/issues/81>`_) |br| * Avoid deleting dos-global-dg device group (`GitHub Issue 103 <https://github.com/F5Networks/f5-declarative-onboarding/issues/103>`_)
        - 04-21-20

      * - 1.11
        - Updated the documentation for BIG-IP Declarative Onboarding v1.11.0.  This release contains the following changes: |br| * Added support for provisioning SSL Orchestrator (SSLO), see :ref:`provision-class`  |br| * Added support for using IP addresses for Device Group members and owner (see :ref:`devicegroup` and :ref:`example17`) |br| |br| Issues Resolved: |br| * Route Configuration can conflict with DHCP (`GitHub issue 100 <https://github.com/F5Networks/f5-declarative-onboarding/issues/100>`_) |br| * Setting ConfigSync does not handle device name / hostname mismatch (`GitHub Issue 104 <https://github.com/F5Networks/f5-declarative-onboarding/issues/104>`_) |br| * Attempting to modify ConfigSync on non-existing device - device not resolving properly (`GitHub Issue 113 <https://github.com/F5Networks/f5-declarative-onboarding/issues/113>`_) |br| * Requiring a reboot causes task to never complete |br| * Relicensing BIG-IP can be interrupted by service restart
        - 03-10-20

      * - 1.10
        - Updated the documentation for BIG-IP Declarative Onboarding v1.10.0.  This release contains the following changes: |br| * Added the :ref:`system-class` to the Composing a Standalone declaration page |br| * Added support for disabling autoPhonehome in the System class (see :ref:`system-class`)  |br| * Added support for provisioning CGNAT in TMOS version 15.0 and later (see :ref:`provision-class`)  |br| |br| Issues Resolved: |br| * On BIG-IP 14 and later, revoke license from BIG-IQ did not work |br| *  BIG-IP DO now makes sure config is saved before issuing revoke command |br| * Fixed issue when existing Radius servers were present and none were the primary
        - 01-28-20

      * - 1.9
        - Updated the documentation for BIG-IP Declarative Onboarding v1.9.0.  This release contains the following changes: |br| * Added a new query parameter for GET requests for HTTP status codes (see :ref:`getquery`)  |br| * Added a link to the AskF5 article for BIG-IP DO and BIG-IQ compatibility |br| |br| Issues Resolved: |br| * BIG-IP DO was unable to set hostname in AWS environment (`K45728203 <https://support.f5.com/csp/article/K45728203>`_) |br| * Changes to the network property for ManagementRoute and Route would not actually update the config (`Issue 75 <https://github.com/F5Networks/f5-declarative-onboarding/issues/75>`_) |br| * The /example endpoint was not working.
        - 12-03-19

      * - 1.8
        - Updated the documentation for BIG-IP Declarative Onboarding v1.8.0.  This release contains the following changes: |br| * Added support for SSHD (see the :ref:`SSHD example<sshex>`) |br| * Added support for HTTPD (see the :ref:`HTTPD example<httpdex>`) |br| * Added a System class which includes cliInactivityTimeout, consoleInactivityTimeout, and hostname (see :ref:`System example<systemex>`) |br| * Added a note about BIG-IP DO collecting non-identifiable usage data (see :ref:`notestips`) |br| * Added a troubleshooting entry and other notes about BIG-IP DO performing hostname resolution, and failing if the hostname resolution fails (see :ref:`Troubleshooting<hostnameres>`) |br| * Added a troubleshooting entry and other notes about the **/dist** directory going away on GitHub, and the BIG-IP DO RPM being available as a release Asset (see :ref:`Troubleshooting<nodist>`) |br| |br| Issues Resolved: |br| * BIG-IP DO was unable to use management network for SnmpTrapDestination |br| * BIG-IP DO creates incomplete RADIUS authentication configuration |br| * BIG-IP DO was unable to remove Radius System Auth configuration |br| * BIG-IP DO does not remove secondary Radius server when it is absent in declaration
        - 10-22-19

      * - 1.7
        - Updated the documentation for BIG-IP Declarative Onboarding v1.7.0. This release contains the following changes: |br| * Added the /inspect endpoint for GET requests to retrieve the current device configuration as a BIG-IP DO declaration (see :ref:`inspect-endpoint`) |br| * Added support for LDAP, RADIUS, and TACACS authentication in a declaration (see the :ref:`Auth method example<authmethods>`) |br| * Added support for Remote Roles in authentication (see the :ref:`Remote Roles example<remoterole>`) |br| * Added support for configuring SNMP (see the :ref:`SNMP example<snmp>`) |br| * Added support for configuring global Traffic Control properties (see :ref:`Traffic Control example<trafcontrol>`) |br| * Added support for configuring syslog destinations (see :ref:`syslog destination example<syslogdest>`) |br| * Added support for using cmp-hash in the VLAN class (see :ref:`cmp-hash example<cmphash>`) |br| * Added support for DAG Globals (see :ref:`DAG Globals example<dag>`) |br| * Added support for the Trunk class (see the |trunkref| in the schema reference) |br| * Added a Schema Reference Appendix  |br| * Added a note to :ref:`devicegroup` stating as of BIG-IP DO 1.7.0, **owner** is required. |br| * Improved masking of nested secrets |br| * Improved handling of route domains |br| |br| Issues Resolved: |br| * The values of schemaCurrent and schemaMinium do not always return correct values |br| * Management Route class does not work |br| * BIG-IP DO sets task status to ERROR right away while it is still rolling back |br| * BIG-IP DO unable to create new VLAN(s) when no Route Domain(s) specified in declaration. Now BIG-IP DO will add new VLAN(s) to Route Domain with ID 0 unless otherwise specified. |br| * Device Group **owner** is now required |br| * configsyncIp now allows **none** as valid value |br| * When targetSshKey is used BIG-IP DO now tries bash shell to modify targetUsername password if tmsh shell fails |br| * BIG-IP DO now handles the automatic update of the root password when the admin password changes on BIG-IP version 14.0+.
        - 09-10-19

      * - Unreleased
        - This documentation only update contains the following changes: |br| * Added a troubleshooting page with an entry about reposting a declaration with new VLANs, Self IPs, and/or Route Domain (see :ref:`trouble`) |br| * Updated the Route Domain example per GitHub issue |54| (see :ref:`routedomain-class`).
        - 08-01-19

      * - 1.6
        - Updated the documentation for BIG-IP Declarative Onboarding v1.6.0. This release contains the following changes: |br| * Added support for creating route domains in a declaration (see :ref:`routedomain-class`) |br| * Added support for specifying a management route (see :ref:`mgmtroute-class`) |br| * Added a note to the **tag** row of the :ref:`vlan-class` table stating if you set the tag in BIG-IP DO, the VLAN defaults the **tagged** parameter to **true**. |br| * Added support for specifying a **webhook** URL for response information (see :ref:`base-comps` for usage). |br| |br| Issues Resolved: |br| * Updated :doc:`big-iq-licensing` and the example declarations to change references to ELA/subscription licensing to *utility* licensing. |br| *  Removed targetSshKey when filling in targetPassphrase. |br|
        - 07-30-19

      * - 1.5
        - Updated the documentation for BIG-IP Declarative Onboarding v1.5.0. This release contains the following changes: |br| * Support for creating an Analytics profile (see :ref:`Creating an Analytics profile <avrstream>`). |br| * Added support for using Authorized Keys in declarations (see :ref:`Keys example <keys>`). |br| * Added a new page for :doc:`clustering-managing-devices` |br| * Added a note to the :doc:`prereqs` stating that due to changes in TMOS v13.1.1.5, the BIG-IP Declarative Onboarding Extension is not compatible with that specific TMOS version. |br| * Added the |schemalink| from previous releases to the GitHub repository |br| * Updated :doc:`validate` to clarify the schema URL to use |br| * Updated the documentation theme and indexes. |br| |br| Issues Resolved: |br| * BIG-IP Declarative Onboarding now disables DHCP for DNS/NTP if BIG-IP DO is configuring them (see the note in :ref:`dns-class` and :ref:`ntp-class`) |br| * License keys no longer appear in the log |br| * Radius server secrets no longer appears in the log |br| * LicensePool now respects custom management access port of the BIG-IP that is being licensed |br| * When a 400 is received from restjavad, BIG-IP DO now tries relicensing |br| * Fixed an issue in which initial clustering failure would prevent clustering from working on subsequent attempts due to using the wrong device name.
        - 06-18-19

      * - Unreleased
        - Documentation only update: Added the :ref:`BIG-IP Declarative Onboarding Overview video<video>` to the home page.
        - 05-24-19

      * - 1.4.1
        - Released BIG-IP Declarative Onboarding v1.4.1. This maintenance release contains no changes for BIG-IP Declarative Onboarding from 1.4.0 but does include a new version of the Docker Container.
        - 05-21-19

      * - 1.4
        - Updated the documentation for BIG-IP Declarative Onboarding v1.4.0. This release contains the following changes: |br| * Using the BIG-IP Declarative Onboarding Container now allows you to send declarations to multiple BIG-IPs without waiting for previous declarations to finish onboarding. |br| * **taskId** is now returned from POST onboard requests (see :ref:`Note in POST documentation <postnote>`) |br| * New **/task** endpoint to retrieve status by task (see :ref:`Note in GET documentation <getnote>`)
        - 05-08-19

      * - 1.3.1
        - Released BIG-IP Declarative Onboarding v1.3.1. This maintenance release contains only fixes for the following GitHub issues: |br| * `Issue 7: Does not remove SelfIP and VLAN <https://github.com/F5Networks/f5-declarative-onboarding/issues/7>`_ |br| * `Issue 17: BIG-IP requesting reboot after declaration <https://github.com/F5Networks/f5-declarative-onboarding/issues/17>`_ |br| * `Issue 18: wrong GW IP in declaration leads to BIG-IP DO problems <https://github.com/F5Networks/f5-declarative-onboarding/issues/18>`_ |br| * `Issue 21: BIG-IP DO declaration with multiple modules requires manual reboot and re-post <https://github.com/F5Networks/f5-declarative-onboarding/issues/21>`_ |br| * `Issue 32: BIG-IP DOv1.3.0 to create multiple VLANs / self IP need to run twice on v14.1 <https://github.com/F5Networks/f5-declarative-onboarding/issues/32>`_
        - 05-07-19

      * - 1.3
        - Updated the documentation for BIG-IP Declarative Onboarding v1.3.0. This release contains the following changes: |br| * Added support for revoking a license from a BIG-IP with BIG-IQ, as well as relicensing and overwriting a license (see :ref:`Revoking a license using BIG-IQ<revoke-main>`). |br| * Added instructions for validating a declaration using Microsoft Visual Studio Code (see :doc:`validate`). |br| * Added support for modifying a Self IP address.  |br| |br| Issues Resolved: |br| * Corrected an issue in which all Self IPs would be updated if there was a change to any of them. |br| * Corrected an issue in which clustering was not working if ASM was provisioned.
        - 02-27-19

      * - Unreleased
        - This documentation update release updated the style of this document.
        - 01-28-19

      * - 1.2
        - Updated the documentation for BIG-IP Declarative Onboarding v1.2.0. This release contains the following changes: |br| * Added support for using BIG-IP Declarative Onboarding in a container (see :doc:`do-container`). |br| * Added a new section on using JSON Pointers in BIG-IP Declarative Onboarding declarations (see :doc:`json-pointers`). |br| * Added a note and link about the BIG-IP Declarative Onboarding Postman Collection available on GitHub (see :doc:`prereqs`). |br| * Added notes about the BIG-IP v14.0 and later Secure Password Policy (see :ref:`14andlater` for details). |br| * Added new example declarations to :doc:`examples`. |br| |br| Issues Resolved: |br| * Corrected an issue which would reject a CIDR of 1x on a Self IP address. |br| * Corrected an issue in which DB vars were not rolled back in the event of an error.
        - 01-16-19

      * - Unreleased
        - Updated the provisioning examples to use a value of **minimum** and not **minimal**.
        - 01-08-19

      * - 1.1
        - Updated the documentation for BIG-IP Declarative Onboarding v1.1.0. This version is fully supported by F5 Networks, and has moved to the F5Networks GitHub repository.  Additionally, this release contains the following changes: |br| * Added support for using a BIG-IQ to license the BIG-IP (see :doc:`big-iq-licensing`). |br| * Added support for using arbitrary database variables (see :ref:`DB variable class<dbvars-class>`). |br| * Added support for assigning users to All Partitions (see :ref:`User Class<user-class>` for usage). |br| * Added the option of not allowing Shell access when creating a user (see :ref:`User Class<user-class>` for usage).  |br| * Improved reporting for schema validation errors. |br| * Declarations now apply defaults from the schema. |br| |br| Issues Resolved: |br| * Corrected a clustering race condition when onboarding 2 devices at the same time. |br| * Fixed an issue that was improperly deleting objects which just had a property change. |br| * Declarations now dis-allow sync-failover device group with both autoSync and fullLoadOnSync. |br| * BIG-IP Declarative Onboarding now ensures that non-floating self IPs are created before floating self IPs. |br| * BIG-IP Declarative Onboarding now handles missing content-type header. |br| * Fixed an issue where device name was not being set if hostname already matched declaration.
        - 12-19-18

      * - Unreleased
        - Updated the example declarations to change *allowService* from **all** to **default**, changed the tagging for VLANs to **false**, updated the Self IP section to include a trafficGroup and removed the floating parameter as it does not apply to Self IP. |br| Added a tip to :doc:`composing-a-declaration` and :doc:`clustering` stating you can use GET to track the status of a declaration.
        - 11-13-18

      * - 1.0
        - Documentation for the initial release of F5 BIG-IP Declarative Onboarding
        - 11-13-18



.. |br| raw:: html

   <br />

.. |schemalink| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/tree/master/schema" target="_blank">schema files</a>

.. |54| raw:: html

   <a href="<a href="https://github.com/F5Networks/f5-declarative-onboarding/issues/54" target="_blank">#54</a>

.. |trunkref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trunk" target="_blank">Trunk Class</a>

.. |supportmd| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/blob/master/SUPPORT.md" target="_blank">Support page on GitHub</a>

.. |system| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system" target="_blank">System Class</a>

.. |sshd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#sshd" target="_blank">SSHD</a>
