# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Declarative Onboarding [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/revision-history.html).

## 1.18.0
### Added
- AUTOTOOL-2002: GSLB Data Center
- AUTOTOOL-1654: Routing Prefix List
- AUTOTOOL-2058: ([GitHub Issue 179](https://github.com/F5Networks/f5-declarative-onboarding/issues/179)): Add support for specifying BIG-IQ auth provider for licensing.
- AUTOTOOL-1882: Log version on startup
### Fixed
- AUTOTOOL-1799: ([GitHub Issue 149](https://github.com/F5Networks/f5-declarative-onboarding/issues/149)): Can only create one DeviceGroup
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
