# Release Notes

## Version 1.3.0
+ Allow $schema property for use in local validation of declaration
+ Allow for licenses to be revoked when licensed via BIG-IQ
+ Add 'overwrite' option when licensing via BIG-IQ
+ Fix bug in which all self ips would be updated if there was a change to any of them

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
