# Release Notes

## Version 1.5.0
+ Resolve [Issue 14](https://github.com/F5Networks/f5-declarative-onboarding/issues/14)
+ Resolve [Issue 26](https://github.com/F5Networks/f5-declarative-onboarding/issues/26)
+ Resolve [Issue 26](https://github.com/F5Networks/f5-declarative-onboarding/issues/40)
+ Updates for running on BIG-IQ.
    + remote.schema.json now has a bigIqSettings object. These values are passed to BIG-IQ as options it needs for managing a BIG-IP.
    + BIG-IQ credentials not required in licensePool object when licensing from the BIG-IQ on which DO is running.
    + When running on BIG-IQ, use the BIG-IP public management address for licensing.
+ Fix bug in which credentials could appear in declaration results when revoking a license.
+ Disable DHCP for DNS/NTP if DO will be configuring them.
+ Allow setting global analytics settings.
+ License keys wil no longer appear in the log.
+ RADIUS server secret will no longer appear in the log.
+ LicensePool now respects custom management access port of BIG-IP that is being licensed.
+ When a 400 is received from restjavad, DO will now retry licensing.

## Version 1.4.1
+ Fix vulnerability CVE-2019-5021 in DO container

## Version 1.4.0
+ Allow for onboarding multiple devices at once.
    + taskId is now returned from POST onboard requests
    + New /task API to retrieve status by task
+ Initial port to run on BIG-IQ for use in onboarding BIG-IP from BIG-IQ

## Version 1.3.1
+ Resolve [Issue 7](https://github.com/F5Networks/f5-declarative-onboarding/issues/7)
+ Resolve [Issue 17](https://github.com/F5Networks/f5-declarative-onboarding/issues/17)
+ Resolve [Issue 18](https://github.com/F5Networks/f5-declarative-onboarding/issues/18)
+ Resolve [Issue 21](https://github.com/F5Networks/f5-declarative-onboarding/issues/21)
+ Resolve [Issue 32](https://github.com/F5Networks/f5-declarative-onboarding/issues/32)

## Version 1.3.0
+ Allow $schema property for use in local validation of declaration
+ Allow for licenses to be revoked when licensed via BIG-IQ
+ Allow modification of a SelfIp address
+ Add 'overwrite' option when licensing via BIG-IQ
+ Fix bug in which all self ips would be updated if there was a change to any of them
+ Fix bug in which clustering was not working if ASM was provisioned

## Version 1.2.0
+ Support for remote provisioning via ASG.
+ Fix bug which rejected CIDR of 1x on SelfIp.
+ Fix bug in which DB vars are not rolled back in the event of an error

## Version 1.1.0
+ Support licensing via BIG-IQ utility, purchased, and reg key pools.
+ Allow setting global db variables.
+ Allow partition access 'all-partitions' when creating regular users.
+ Allow shell of 'none' when creating regular users.
+ Better reporting of schema validation errors.
+ Fix clustering race condition when onboarding 2 devices at the same time.
+ Fix bug which was improperly deleting objects which just had a property change.
+ Apply defaults from the schema.
+ Dis-allow sync-failover device group with both autoSync and fullLoadOnSync.
+ Ensure that non-floating self IPs are created before floating self IPs.
+ Handle missing content-type header.
+ Fix issue where device name was not being set if hostname already matched declaration.

## Version 1.0.0
+ Supports
    + DNS
    + NTP
    + License with reg key
    + User creation/modification
    + VLANs
    + Self IPs
    + Routes
    + DSC
