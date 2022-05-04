# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Declarative Onboarding [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/revision-history.html).

## 1.30.0
### Added
- AUTOTOOL-3011: Can now validate with either 'Device' or 'DO' class using do.schema.json

### Fixed
- AUTOTOOL-3156: Declaration can fail while waiting for unprovisioned service to run

### Changed
### Removed

## 1.29.0
### Added
### Fixed
- AUTOTOOL-3040: SelfIp with RouteDomain cannot reach directly connected network
- AUTOTOOL-3051: Licensing can fail if restnoded restarts during processing.
- AUTOTOOL-2845: ([GitHub Issue 276](https://github.com/F5Networks/f5-declarative-onboarding/issues/276)): SelfIp allowService property does not accept a mix of service:port and default
- AUTOTOOL-2881: ([GitHub Issue 282](https://github.com/F5Networks/f5-declarative-onboarding/issues/282)): Security level is not automatically set in SnmpUser class.

### Changed
### Removed

## 1.28.0
### Added
- AUTOTOOL-2871: Allow user to explicitly specify the mgmt-dhcp setting
- AUTOTOOL-2970: routeDomain property to RoutingBGP and RouteMap

### Fixed
- AUTOTOOL-2612: ([GitHub Issue 248](https://github.com/F5Networks/f5-declarative-onboarding/issues/248)): Licensing in GCP multi-NIC fails (Upgrade to f5-cloud-libs 4.26.7)
- AUTOTOOL-2941: ([GitHub Issue 285](https://github.com/F5Networks/f5-declarative-onboarding/issues/285)): URL is incorrect in schema files

### Changed
### Removed

## 1.27.1
### Added
### Fixed
### Changed
- Promoted to LTS

### Removed

## 1.27.0
### Added

### Fixed
- AUTOTOOL-2846: ([GitHub Issue 277](https://github.com/F5Networks/f5-declarative-onboarding/issues/277)): Items containing '.' or '-' characters in their names are not passing schema validation
- AUTOTOOL-2930: DNS_Resolver is not idempotent
- AUTOTOOL-2931: Tunnel is not idempotent
- AUTOTOOL-2939: Can't update just the description of ManagementIp
- AUTOTOOL-3006: Can't remove all items of a class

### Changed
- AUTOTOOL-1898: Several idempotentcy issues are resolved. This required adding defaults for several items in the System class.

### Removed

## 1.26.0
### Added

### Fixed
- AUTOTOOL-2764: ([GitHub Issue 263](https://github.com/F5Networks/f5-declarative-onboarding/issues/263)): RouteDomain example references objects that do not exist
- AUTOTOOL-2677: ([GitHub Issue 254](https://github.com/F5Networks/f5-declarative-onboarding/issues/254)): Declaration fails when Management IP already exists
- AUTOTOOL-2773: ([GitHub Issue 267](https://github.com/F5Networks/f5-declarative-onboarding/issues/267)): DO fails when a route with a '/' in the name is added manually between DO runs.
- AUTOTOOL-2805: ([GitHub Issue 269](https://github.com/F5Networks/f5-declarative-onboarding/issues/269)): Adding a Management Route Resets Management IP to DHCP.
- AUTOTOOL-2759: ([GitHub Issue 178](https://github.com/F5Networks/f5-declarative-onboarding/issues/178)): Unsupported httpd ciphersuite
- AUTOTOOL-1797: ([GitHub Issue 135](https://github.com/F5Networks/f5-declarative-onboarding/issues/135)): Unable to modify SelfIp referenced by ConfigSync
- AUTOTOOL-2775: GSLBDataCenter does not support remark
- AUTOTOOL-2857: When GTM is enabled, DO returns the error 'Monitor /Common/http is read only' on the second POST even when GSLB is not in the declaration.

### Changed
### Removed

## 1.25.0
### Added
- AUTOTOOL-2750: VXLAN Tunnel Profile support

### Fixed
- AUTOTOOL-2721: SnmpTrapDestination, SnmpUser, and SnmpCommunity objects cannot be removed once created
- AUTOTOOL-2688: ([GitHub Issue 255](https://github.com/F5Networks/f5-declarative-onboarding/issues/255)): Firewall policies managed by AS3 are not ignored
- AUTOTOOL-2766: ([GitHub Issue 264](https://github.com/F5Networks/f5-declarative-onboarding/issues/264)): Unable to use remote auth user on BIG-IQ to deploy DO declaration
- AUTOTOOL-2768: ([GitHub Issue 265](https://github.com/F5Networks/f5-declarative-onboarding/issues/265)): DO fails when there is pre-existing route configuration with an interface type
- AUTOTOOL-2761: ([GitHub Issue 261](https://github.com/F5Networks/f5-declarative-onboarding/issues/261)): DO always enables dhcp on mgmt interface after post declaration
- AUTOTOOL-2823: ([GitHub Issue 274](https://github.com/F5Networks/f5-declarative-onboarding/issues/274)): Unable to specify gw and target in Route class
- AUTOTOOL-2780: ([GitHub Issue 268](https://github.com/F5Networks/f5-declarative-onboarding/issues/268)): DO 1.24.0 doesn't honor Remote Role Groups "remoteAccess": true setting. Previously working on 1.21.1
- AUTOTOOL-2882: Unable to POST declaration with single RADIUS server

### Changed
- AUTOTOOL-2544: Use a default of "UTC" for the timezone property of the NTP class

### Removed

## 1.24.0
### Added
- AUTOTOOL-1156: ([GitHub Issue 98](https://github.com/F5Networks/f5-declarative-onboarding/issues/98), [GitHub Issue 206](https://github.com/F5Networks/f5-declarative-onboarding/issues/206)): GRE and Geneve Tunnel Support
- AUTOTOOL-2668: ([GitHub Issue 236](https://github.com/F5Networks/f5-declarative-onboarding/issues/236)): Added ebgpMultihop to RoutingBGP class
- AUTOTOOL-2675: ([GitHub Issue 241](https://github.com/F5Networks/f5-declarative-onboarding/issues/241)): Add chargeBackTag to License class
- AUTOTOOL-2676: ([GitHub Issue 218](https://github.com/F5Networks/f5-declarative-onboarding/issues/218)): Support for configuring management-ip-rules with ManagementIpFirewall class
- AUTOTOOL-705: SnmpTrapDestination default values for version, port, and network
- AUTOTOOL-2259: RoutingAccessList (net routing access-list)

### Fixed
- AUTOTOOL-2692: FirewallPolicy incorrectly allows VLANs to be included in the destination schema object

### Changed
- AUTOTOOL-2528: Truth values in currentConfig response now map to MCP values rather than booleans
- Update f5-cloud-libs to 4.26.3
  - Add failOnErrorMessages and failOnErrorCodes which are arrays of strings/regexes and integers, respectively. That prevent the retry logic from running. Effectively allowing for an early exit of specific failures.
  - Add option to provision BIG-IP modules using a transaction
  - Fix race condition between createOrModify and MCPD where MCPD first reports an object exists but it has already been deleted.
- AUTOTOOL-2680: Use Transactions for provisioning

### Removed

## 1.23.0
### Added
- AUTOTOOL-2473: ([GitHub Issue 224](https://github.com/F5Networks/f5-declarative-onboarding/issues/224)): Support management IP configuration
- AUTOTOOL-2491: ([GitHub Issue 226](https://github.com/F5Networks/f5-declarative-onboarding/issues/226)): Preserve DHCP routes
- AUTOTOOL-2495: ([GitHub Issue 230](https://github.com/F5Networks/f5-declarative-onboarding/issues/230)): Dry-run support

### Fixed
- AUTOTOOL-2471: ([GitHub Issue 225](https://github.com/F5Networks/f5-declarative-onboarding/issues/225)): Ability to create type interface routes
- AUTOTOOL-2524: ([GitHub Issue 237](https://github.com/F5Networks/f5-declarative-onboarding/issues/237)): RoutingPrefixList prefixLengthRange does not support strings
- AUTOTOOL-2595: Fix FailoverUnicast unicastAddresses.map is not a function
- AUTOTOOL-2616: ([GitHub Issue 249](https://github.com/F5Networks/f5-declarative-onboarding/issues/249)): RoutingBGP 'toUpperCase' undefined error

### Changed
- AUTOTOOL-1157: ([GitHub Issue 101](https://github.com/F5Networks/f5-declarative-onboarding/issues/101)): Preserve user authorization keys if no keys were provided in declaration

### Removed

## 1.22.0
### Added
- AUTOTOOL-2509: ([GitHub Issue 220](https://github.com/F5Networks/f5-declarative-onboarding/issues/220)): autoLastHop property to "VLAN" class

### Fixed
- AUTOTOOL-2476: ([GitHub Issue 227](https://github.com/F5Networks/f5-declarative-onboarding/issues/227)): DO might reboot BIGIP system when same configurations/declaration posted
- AUTOTOOL-2415: ([GitHub Issue 216](https://github.com/F5Networks/f5-declarative-onboarding/issues/216)): Match the accepted "hypervisor" list on DO with what is accepted by BIG-IQ
- AUTOTOOL-2502: ([GitHub Issue 233](https://github.com/F5Networks/f5-declarative-onboarding/issues/233)): DeviceGroup does not work with IPv6
- AUTOTOOL-2497: ([GitHub Issue 234](https://github.com/F5Networks/f5-declarative-onboarding/issues/234)): Race condition when creating self-ip on non-default route-domain
- AUTOTOOL-2571: Failover Unicast "cannot read property indexOf of undefined"

### Changed
- AUTOTOOL-531: Properties in the 'traces', 'currentConfig', and 'originalConfig' sections of the response to a request now match what is sent to iControl REST rather than what is in the declaration
- AUTOTOOL-2532: ([GitHub Issue 242](https://github.com/F5Networks/f5-declarative-onboarding/issues/242)): Pull MAC address from management interface instead of the host device MAC address.

### Removed

## 1.21.1
### Added
### Fixed
### Changed
- Promoted to LTS

### Removed

## 1.21.0
### Added
- AUTOTOOL-2433: ([GitHub Issue 221](https://github.com/F5Networks/f5-declarative-onboarding/issues/221)): Configure LDAP referrals

### Fixed
- AUTOTOOL-2074: ([GitHub Issue 190](https://github.com/F5Networks/f5-declarative-onboarding/issues/190)): Invalid config after upgrading DO from 1.15.0
- AUTOTOOL-2041: ([GitHub Issue 125](https://github.com/F5Networks/f5-declarative-onboarding/issues/125)): Declaration containing NTP servers by dns name failing in certain cases
- AUTOTOOL-2224: ([GitHub Issue 201](https://github.com/F5Networks/f5-declarative-onboarding/issues/201)): Pre-DO GTM Server preventing DO declaration from running
- AUTOTOOL-2448: ([GitHub Issue 177](https://github.com/F5Networks/f5-declarative-onboarding/issues/177)): Disk class causes errors on declaration update

### Changed
- AUTOTOOL-2506: Use +nocookie option with dig commands

### Removed

## 1.20.0
### Added
- AUTOTOOL-1991: Added RoutingBGP
- AUTOTOOL-2350: Added FirewallPolicy
- AUTOTOOL-2351: ([GitHub Issue 203](https://github.com/F5Networks/f5-declarative-onboarding/issues/203)): Added FirewallAddressList and FirewallPortList

### Fixed
- AUTOTOOL-2242: ([GitHub Issue 204](https://github.com/F5Networks/f5-declarative-onboarding/issues/204)): Cannot read property 'applicationData' of undefined
- AUTOTOOL-2080: Task status change after restnoded process restarted
- AUTOTOOL-2215: ([GitHub Issue 198](https://github.com/F5Networks/f5-declarative-onboarding/issues/198)): Allow DeviceGroup owner to be an IPv6 address without having to use a json-pointer.
- Improve schema compatibility with BIG-IQ UI

### Changed
### Removed

## 1.19.0
### Added
- AUTOTOOL-1990: Route Map
- AUTOTOOL-2175: Add support for HTTP GSLB monitor
- AUTOTOOL-2176: GSLB Prober Pool
- AUTOTOOL-2173: Add support for virtual servers in GSLB server
- AUTOTOOL-2180: GSLB Monitors (Remaining)

### Fixed
### Changed
- AUTOTOOL-1238: ([GitHub Issue 118](https://github.com/F5Networks/f5-declarative-onboarding/issues/118)): Improve behavior when tenant is missing

### Removed

## 1.18.0
### Added
- AUTOTOOL-2002: GSLB Data Center
- AUTOTOOL-2001: GSLB Server
- AUTOTOOL-1654: Routing Prefix List
- AUTOTOOL-2058: ([GitHub Issue 179](https://github.com/F5Networks/f5-declarative-onboarding/issues/179)): Add support for specifying BIG-IQ auth provider for licensing.
- AUTOTOOL-1882: Log version on startup

### Fixed
- AUTOTOOL-1799: ([GitHub Issue 149](https://github.com/F5Networks/f5-declarative-onboarding/issues/149)): Can only create one DeviceGroup
- AUTOTOOL-2139: GSLB schema defaults are not applied in some cases

### Changed
### Removed

## 1.17.0
### Added
- AUTOTOOL-1373: ([GitHub Issue 128](https://github.com/F5Networks/f5-declarative-onboarding/issues/128)): Support Failover Multicast on the BIG-IPs default device.
- AUTOTOOL-1923: ([GitHub Issue 164](https://github.com/F5Networks/f5-declarative-onboarding/issues/164)): Rudimentary DeviceCertificate validation
- AUTOTOOL-1943: ([GitHub Issue 156](https://github.com/F5Networks/f5-declarative-onboarding/issues/156)): Allow variable expressions in some RemoteAuthRole fields
- AUTOTOOL-1532: ([GitHub Issue 143](https://github.com/F5Networks/f5-declarative-onboarding/issues/143)): Parent property to RouteDomain
- AUTOTOOL-2003: Configure global GSLB settings

### Fixed
- AUTOTOOL-1942: RemoteAuthRole remoteAccess property logic is backwards
- AUTOTOOL-1955: ([GitHub Issue 177](https://github.com/F5Networks/f5-declarative-onboarding/issues/177)): Disk size must be larger than current size
- AUTOTOOL-1798: ([GitHub Issue 140](https://github.com/F5Networks/f5-declarative-onboarding/issues/140)): Unable to specify route domain in route gw address

### Changed
- AUTOTOOL-1924: ([GitHub Issue 163](https://github.com/F5Networks/f5-declarative-onboarding/issues/163)): Accept 'all' as a single word for HTTPD allow value

### Removed

## 1.16.0
### Added
- AUTOTOOL-1652: Add support for routing as-path
- AUTOTOOL-1374: ([GitHub Issue 112](https://github.com/F5Networks/f5-declarative-onboarding/issues/112)): Add support for MirrorIp class
- AUTOTOOL-1577: Add support for LDAPS certificate settings

### Fixed
- AUTOTOOL-1990: Retry license install if we get a connection reset
- Target VLAN errors from the inspect endpoint
- AUTOTOOL-1899: Fix minor schema issues. No type for minPathMtu and use const for Tunnel class
- AUTOTOOL-1845: ([GitHub Issue 147](https://github.com/F5Networks/f5-declarative-onboarding/issues/147)): Route creation order can be incorrect

### Changed
### Removed

## 1.15.0
### Added
- AUTOTOOL-530: Add Trace files for debug printing
- AUTOTOOL-1307: ([GitHub Issue 111](https://github.com/F5Networks/f5-declarative-onboarding/issues/111)): Add support for SSHD allowed source IP's
- AUTOTOOL-1635: ([GitHub Issue 72](https://github.com/F5Networks/f5-declarative-onboarding/issues/72)): Support tenant property when licensing
- AUTOTOOL-1675: ([GitHub Issue 152](https://github.com/F5Networks/f5-declarative-onboarding/issues/152)): Add support for creating and configuring multiple failover unicasts
- AUTOTOOL-1206: Add experimental support for resizing appdata
- AUTOTOOL-1749: ([GitHub Issue 141](https://github.com/F5Networks/f5-declarative-onboarding/issues/141)): Add support for creating routes on the LOCAL_ONLY partition.

### Fixed
- Improve schema for use with BIG-IQ 7.1

### Changed
### Removed

## 1.14.0
### Added
- AUTOTOOL-126: Add support for DNS Resolver
- AUTOTOOL-1610: Add support for VLAN failsafe settings
- AUTOTOOL-1358: ([GitHub Issue 123](https://github.com/F5Networks/f5-declarative-onboarding/issues/123)): TCP Forward Tunnel Support
- AUTOTOOL-1609: Add support for creating and configuring traffic groups

### Fixed
- AUTOTOOL-1091: Bad class values do not fail schema validation
- AUTOTOOL-1659: MAC_Masquerade fails to roll back properly

### Changed
- AUTOTOOL-1521: Update npm packages

### Removed

## 1.13.0
### Added
- AUTOTOOL-1380: ([GitHub Issue 126](https://github.com/F5Networks/f5-declarative-onboarding/issues/126)): Add fields to partially support SSL for LDAP auth.  Additional fields for this GitHub issue TBD.
- AUTOTOOL-1437: Add userAgent to a controls object
- AUTOTOOL-1445: Add authentication type to DO TEEM telemetry
- AUTOTOOL-1236: ([GitHub Issue 107](https://github.com/F5Networks/f5-declarative-onboarding/issues/107)): Add support for System autoCheck setting
- AUTOTOOL-1248: ([GitHub Issue 120](https://github.com/F5Networks/f5-declarative-onboarding/issues/120)): Add support for System tmshAuditLog and guiAuditLog
- AUTOTOOL-1322: ([GitHub Issue 96](https://github.com/F5Networks/f5-declarative-onboarding/issues/96)): Support generated MAC Masquerade on Traffic Groups according to https://support.f5.com/csp/article/K3523.

### Fixed
- AUTOTOOL-1491 ([GitHub Issue 138](https://github.com/F5Networks/f5-declarative-onboarding/issues/138)): Cannot create a device group with AFM provisioned
- AUTOTOOL-1469: Problems with latest Azure image
- AUTOTOOL-901 ([GitHub Issue 79](https://github.com/F5Networks/f5-declarative-onboarding/issues/79)): charset not allowed in Content-Type header

### Changed
- Update @f5devcentral/f5-teem package dependency to 1.4.6

### Removed

## 1.12.0
### Added
- AUTOTOOL-152: Ability to upload device certificate

### Fixed
- AUTOTOOL-1094 ([GitHub Issue 91](https://github.com/F5Networks/f5-declarative-onboarding/issues/91)): Provisioning fails if module does not exist on box
- AUTOTOOL-1170: Call webhook after declaration requiring reboot
- AUTOTOOL-1388: Fix allowed schema versions
- AUTOTOOL-1440 ([GitHub Issue 132](https://github.com/F5Networks/f5-declarative-onboarding/issues/132)): Schema is incompatible with golang regexp
- AUTOTOOL-902 ([GitHub Issue 81](https://github.com/F5Networks/f5-declarative-onboarding/issues/81)): Added missing roles for RemoteAuthRole.role enum
- [GitHub Issue 103](https://github.com/F5Networks/f5-declarative-onboarding/issues/103): Avoid deleting dos-global-dg device group

### Changed
- AUTOTOOL-1014: Update to f5-teem 1.4.2

### Removed

## 1.11.1
### Added
### Fixed
- AUTOTOOL-1388: Fix allowed schema versions

### Changed
### Removed

## 1.11.0
### Added
- AUTOTOOL-1223: Allow provisioning SSLO module

### Fixed
- AUTOTOOL-1139 ([GitHub Issue 100](https://github.com/F5Networks/f5-declarative-onboarding/issues/100)): Route Configuration can conflict with DHCP
- AUTOTOOL-1125 ([GitHub Issue 104](https://github.com/F5Networks/f5-declarative-onboarding/issues/104)): Setting ConfigSync does not handle device name / hostname mismatch and ([GitHub Issue 113](https://github.com/F5Networks/f5-declarative-onboarding/issues/113)): Attempting to modify ConfigSync on non-existing device - device not resolving properly
- AUTOTOOL-1166: Requiring a reboot causes task to never complete
- AUTOTOOL-1235: Relicensing BIG-IP can be interrupted by service restart

### Changed
- AUTOTOOL-1124: Allow IP addresses for configuring cluster members

### Removed

## 1.10.0
### Added
- AUTOTOOL-993: Add support for System autoPhonehome setting
- AUTOTOOL-916: Add support for provisioning CGNAT on BIG-IP v15.0+

### Fixed
- AUTOTOOL-343: On BIG-IP 14+, revoke license from BIG-IQ does not work
    - Make sure config is saved before issuing revoke command
    - Fix issue when existing radius servers are present and none are the primary

### Changed
- AUTOTOOL-903: Integration test improvements: Run integration tests against BIG-IP 13.1, 14.0 and 14.1 instances

### Removed

## 1.9.0
### Added
- AUTOTOOL-910: Add query parameter {statusCodes: 'experimental'} to enable new status codes as implemented in AUTOTOOL-727

### Fixed
- AUTOTOOL-807: Fix bug in which DO was unable to set hostname in AWS environment (K45728203)
- AUTOTOOL-806: Fix bug in which changes to the network property for ManagementRoute and Route would not actually update the config [Issue 75](https://github.com/F5Networks/f5-declarative-onboarding/issues/75)
- AUTOTOOL-904: Fix /example endpoint

### Changed
- AUTOTOOL-727: Changed HTTP status for GET requests to be 200 unless something goes wrong with the actual request. The results of the request will contain the status. (This change could break compatibility with previous versions)
- AUTOTOOL-855: Updated packages
- AUTOTOOL-945: Integration test improvements: Debug logs are now written to test/logs. Retry when getting current assignments from BIG-IQ.

### Removed

## 1.8.0
### Added
- Add support for SSHD class [Issue 50](https://github.com/F5Networks/f5-declarative-onboarding/issues/50)
- Add support for HTTPD class [Issue 50](https://github.com/F5Networks/f5-declarative-onboarding/issues/50)
- AUTOTOOL-708: Add support for cliInactivityTimeout, consoleInactivityTimeout, and hostname in System class
- AUTOTOOL-747: Add Declarative Onboarding analytics reporting to F5

### Fixed
- Fix bug in which DO was unable to use management network for SnmpTrapDestination
- Fix bug in which DO creates incomplete RADIUS authentication configuration
- Fix bug in which DO was unable to remove Radius System Auth configuration
- Fix bug in which DO doesn't remove secondary Radius server when it is absent in declaration

### Changed
### Removed

## 1.7.0
### Added
- Add /inspect endpoint to determine existing configuration of device
- Add support for Authentication class
- Add support for Authentication - Radius
- Add support for Authentication - TACACS
- Add support for Remote Role Groups
- Add support for Authentication - LDAP
- Add support for SNMP Agent and Traps
- Add support for Syslog RemoteServers
- Add schema reference documentation
- Add support for DAG Globals
- Add support for cmp-hash for VLAN [Issue 1](https://github.com/F5Networks/f5-declarative-onboarding/issues/1)
- Add support for Traffic Control
- Add support for Trunk class

### Fixed
- Resolve [Issue 53](https://github.com/F5Networks/f5-declarative-onboarding/issues/53)
- Resolve [Issue 60](https://github.com/F5Networks/f5-declarative-onboarding/issues/60)
- Resolve [Issue 67](https://github.com/F5Networks/f5-declarative-onboarding/issues/67)
- Fix bug in which DO sets task status to ERROR right away while it is still rolling back
- Fix bug in which DO was unable to create new VLAN(s) when no Route Domain(s) specified in declaration. Now DO will add new VLAN(s) to Route Domain with ID 0 unless otherwise specified.

### Changed
- Allow 'none' as valid value for configsyncIp (ConfigSync class)
- Handle the automatic update of root password when admin password changes on 14.0 and later
- DeviceGroup.owner is now required
- When targetSshKey is used try bash shell to modify targetUsername password if tmsh shell fails.
- Improve masking of nested secrets
- Improve Route Domains handling

### Removed

## 1.6.1
### Added
### Fixed
### Changed
- Upgrade f5-cloud-libs to improve licensing from BIG-IQ reg key pools

### Removed

## 1.6.0
### Added
- Add support for Management Route
- Add support for Route Domains [Issue 10](https://github.com/F5Networks/f5-declarative-onboarding/issues/10)

### Fixed
- Resolve [Issue 36](https://github.com/F5Networks/f5-declarative-onboarding/issues/36)
- Resolve [Issue 43](https://github.com/F5Networks/f5-declarative-onboarding/issues/43)
- Resolve [Issue 28](https://github.com/F5Networks/f5-declarative-onboarding/issues/28)

### Changed
### Removed

## 1.5.1
### Added
### Fixed
### Changed
- When running on BIG-IQ, poll TCW longer to match the TCW timeout

### Removed

## 1.5.0
### Added
- Add legacy schemas to /schema for validation.
- Add Authorized Keys capability to user declarations.
- Allow setting global analytics settings.
- Resolve [Issue 35](https://github.com/F5Networks/f5-declarative-onboarding/issues/35)

### Fixed
- Resolve [Issue 14](https://github.com/F5Networks/f5-declarative-onboarding/issues/14)
- Resolve [Issue 26](https://github.com/F5Networks/f5-declarative-onboarding/issues/26)
- Resolve [Issue 40](https://github.com/F5Networks/f5-declarative-onboarding/issues/40)
- Fix bug in which credentials could appear in declaration results when revoking a license.
- Fix issue in which initial clustering failure would prevent clustering from working on subsequent attempts due to using the wrong device name (resolved in f5-cloud-libs).
- LicensePool now respects custom management access port of BIG-IP that is being licensed.

### Changed
- Disable DHCP for DNS/NTP if DO will be configuring them.
- RADIUS server secret will no longer appear in the log.
- When a 400 is received from restjavad, DO will now retry licensing.

### Removed
- License keys will no longer appear in the log.

## 1.4.1
### Added
### Fixed
- Fix vulnerability CVE-2019-5021 in DO container

### Changed
### Removed

## 1.4.0
### Added
- Allow for onboarding multiple devices at once.
    - taskId is now returned from POST onboard requests
    - New /task API to retrieve status by task
- Initial port to run on BIG-IQ for use in onboarding BIG-IP from BIG-IQ

### Fixed
### Changed
### Removed

## 1.3.1
### Added
### Fixed
- Resolve [Issue 7](https://github.com/F5Networks/f5-declarative-onboarding/issues/7)
- Resolve [Issue 17](https://github.com/F5Networks/f5-declarative-onboarding/issues/17)
- Resolve [Issue 18](https://github.com/F5Networks/f5-declarative-onboarding/issues/18)
- Resolve [Issue 21](https://github.com/F5Networks/f5-declarative-onboarding/issues/21)
- Resolve [Issue 32](https://github.com/F5Networks/f5-declarative-onboarding/issues/32)

### Changed
### Removed

## 1.3.0
### Added
- Add 'overwrite' option when licensing via BIG-IQ
- Allow for licenses to be revoked when licensed via BIG-IQ
- Allow modification of a SelfIp address

### Fixed
- Fix bug in which all self ips would be updated if there was a change to any of them
- Fix bug in which clustering was not working if ASM was provisioned

### Changed
- Allow $schema property for use in local validation of declaration

### Removed

## 1.2.0
### Added
- Support for remote provisioning via ASG.

### Fixed
- Fix bug which rejected CIDR of 1x on SelfIp.
- Fix bug in which DB vars are not rolled back in the event of an error

### Changed
### Removed

## 1.1.0
### Added
- Support licensing via BIG-IQ utility, purchased, and reg key pools.
- Allow setting global db variables.

### Fixed
- Fix clustering race condition when onboarding 2 devices at the same time.
- Fix bug which was improperly deleting objects which just had a property change.
- Fix issue where device name was not being set if hostname already matched declaration.
- Ensure that non-floating self IPs are created before floating self IPs.

### Changed
- Allow partition access 'all-partitions' when creating regular users.
- Allow shell of 'none' when creating regular users.
- Better reporting of schema validation errors.
- Apply defaults from the schema.
- Dis-allow sync-failover device group with both autoSync and fullLoadOnSync.
- Handle missing content-type header.

### Removed

## 1.0.0
### Added
- Initial release of DO, which supports
    - DNS
    - NTP
    - License with reg key
    - User creation/modification
    - VLANs
    - Self IPs
    - Routes
    - DSC

### Fixed
### Changed
### Removed
