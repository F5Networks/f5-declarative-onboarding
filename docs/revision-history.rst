.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Doc Rev
        - Description
        - Date
             
      * - 3.3
        - Updated the documentation for Declarative Onboarding v1.16.0.  This release contains the following changes: |br| * Added support for connection and persistence mirroring using the new MirrorIp class, `GitHub Issue 112 <https://github.com/F5Networks/f5-declarative-onboarding/issues/112>`_  (see :ref:`example29`) |br| * Added an example showing how to add an advisory banner in a declaration (see :ref:`example30`) |br| * Added an example declaration for increasing the memory for restjavad (see :ref:`example31` and :ref:`restjavad`) |br| * Updated the note for vCMP systems on the :doc:`prereqs` page stating that creating vCMP guests with a DO declaration is not supported |br| * Added a note on the :doc:`do-container` and :ref:`Warnings<warnings>` pages stating that F5 is archiving the community-supported DO in a container solution |br| * Updated the note in :doc:`prereqs` to include BIG-IP 13.1.3.x as incompatible with Declarative Onboarding |br| |br| Issues Resolved: |br| * Retry license install if DO receives a connection reset |br| * Target VLAN errors from the inspect endpoint |br| * Fix minor schema issues: No type for minPathMtu and use const for Tunnel class |br| * Route creation order can be incorrect (`GitHub Issue 147 <https://github.com/F5Networks/f5-declarative-onboarding/issues/147>`_) 
        - 10-13-20

      * - 3.2
        - Updated the documentation for Declarative Onboarding v1.15.0.  This release contains the following changes: |br| * Added support for allowed source IP addresses for SSHD  (see the updated :ref:`SSHD example<sshex>`) |br| * Added support for the **tenant** property in the License class allowing an optional description of the license (see the *No Route* examples in :doc:`big-iq-licensing` and `bigiq-examples`) |br| * Added support for multiple failover unicast addresses (see :ref:`example26`) |br| * Added support for traces in DO responses (see :ref:`example27`) |br| * Added support for creating routes in the LOCAL_ONLY partition (see :ref:`example28`) |br| * Added more information about the Webhook property in :ref:`base-comps`, and an example of the request sent to the webhook |br| * Updated the support notice for the community-supported :ref:`DO Container<container>` to remove mention of the container being fully supported in the future  |br| * Added a troubleshooting entry for a restjavad issue (see :ref:`restjavad`) |br| * Added support for BIG-IP 16.0  |br| |br| Issues Resolved: |br| * Improve schema for use with BIG-IQ 7.1
        - 09-01-20

      * - 3.1
        - Updated the documentation for Declarative Onboarding v1.14.0.  This release contains the following changes: |br| * Added support for VLAN Failsafe (see :ref:`VLAN Failsafe<example22>`) |br| * Added support for creating DNS Resolvers (see :ref:`DNS Resolver<example23>`) |br| * Added support for creating a TCP Forward Network Tunnel (see :ref:`Tunnel<example24>`) |br| * Added support for Traffic Groups (see :ref:`trafficgroup` and :ref:`Traffic Groups<example25>`) |br| |br| Issues Resolved: |br| * Bad class values do not fail schema validation |br| * MAC_Masquerade fails to roll back properly
        - 07-21-20

      * - 3.0
        - Updated the documentation for Declarative Onboarding v1.13.0.  This release contains the following changes: |br| * Added support for SSL in LDAP configurations (see the :ref:`authmethods`) |br| * Added support for the userAgent property in the new Controls class (see :ref:`example19`) |br| * Added support for disabling the update auto-check in a declaration - `GitHub Issue 107 <https://github.com/F5Networks/f5-declarative-onboarding/issues/107>`_ (see :ref:`systemex`) |br| * Added support for Audit Logging - `GitHub Issue 120 <https://github.com/F5Networks/f5-declarative-onboarding/issues/120>`_  (see :ref:`example20`) |br| * Added support for Mac Masquerade - `GitHub Issue 96 <https://github.com/F5Networks/f5-declarative-onboarding/issues/96>`_  (see :ref:`example21`) |br| |br| Issues Resolved: |br| * Cannot create a device group with AFM provisioned  (`GitHub Issue 138 <https://github.com/F5Networks/f5-declarative-onboarding/issues/138>`_)  |br| * Problems with latest Azure image  |br| * charset not allowed in Content-Type header (`GitHub Issue 79 <https://github.com/F5Networks/f5-declarative-onboarding/issues/79>`_)
        - 06-02-20

      * - 2.9
        - Updated the documentation for Declarative Onboarding v1.12.0.  This release contains the following changes: |br| * Added support for updating/uploading Device certificates (see :ref:`example18`)  |br| |br| Issues Resolved: |br| * Provisioning fails if module does not exist on box (`GitHub Issue 91 <https://github.com/F5Networks/f5-declarative-onboarding/issues/91>`_) |br| * Call webhook after declaration requiring reboot |br| * Fix allowed schema versions (also fixed in patch release 1.11.1) |br| * Schema is incompatible with golang regexp (`GitHub Issue 132 <https://github.com/F5Networks/f5-declarative-onboarding/issues/132>`_) |br| * Added missing roles for RemoteAuthRole.role enum (`GitHub Issue 81 <https://github.com/F5Networks/f5-declarative-onboarding/issues/81>`_) |br| * Avoid deleting dos-global-dg device group (`GitHub Issue 103 <https://github.com/F5Networks/f5-declarative-onboarding/issues/103>`_) 
        - 04-21-20

      * - 2.8
        - Updated the documentation for Declarative Onboarding v1.11.0.  This release contains the following changes: |br| * Added support for provisioning SSL Orchestrator (SSLO), see :ref:`provision-class`  |br| * Added support for using IP addresses for Device Group members and owner (see :ref:`devicegroup` and :ref:`example17`) |br| |br| Issues Resolved: |br| * Route Configuration can conflict with DHCP (`GitHub issue 100 <https://github.com/F5Networks/f5-declarative-onboarding/issues/100>`_) |br| * Setting ConfigSync does not handle device name / hostname mismatch (`GitHub Issue 104 <https://github.com/F5Networks/f5-declarative-onboarding/issues/104>`_) |br| * Attempting to modify ConfigSync on non-existing device - device not resolving properly (`GitHub Issue 113 <https://github.com/F5Networks/f5-declarative-onboarding/issues/113>`_) |br| * Requiring a reboot causes task to never complete |br| * Relicensing BIG-IP can be interrupted by service restart
        - 03-10-20

      * - 2.7
        - Updated the documentation for Declarative Onboarding v1.10.0.  This release contains the following changes: |br| * Added the :ref:`system-class` to the Composing a Standalone declaration page |br| * Added support for disabling autoPhonehome in the System class (see :ref:`system-class`)  |br| * Added support for provisioning CGNAT in TMOS version 15.0 and later (see :ref:`provision-class`)  |br| |br| Issues Resolved: |br| * On BIG-IP 14 and later, revoke license from BIG-IQ did not work |br| *  DO now makes sure config is saved before issuing revoke command |br| * Fixed issue when existing Radius servers were present and none were the primary
        - 01-28-20
      
      * - 2.6
        - Updated the documentation for Declarative Onboarding v1.9.0.  This release contains the following changes: |br| * Added a new query parameter for GET requests for HTTP status codes (see :ref:`getquery`)  |br| * Added a link to the AskF5 article for DO and BIG-IQ compatibility |br| |br| Issues Resolved: |br| * DO was unable to set hostname in AWS environment (`K45728203 <https://support.f5.com/csp/article/K45728203>`_) |br| * Changes to the network property for ManagementRoute and Route would not actually update the config (`Issue 75 <https://github.com/F5Networks/f5-declarative-onboarding/issues/75>`_) |br| * The /example endpoint was not working.
        - 12-03-19

      * - 2.5
        - Updated the documentation for Declarative Onboarding v1.8.0.  This release contains the following changes: |br| * Added support for SSHD (see the :ref:`SSHD example<sshex>`) |br| * Added support for HTTPD (see the :ref:`HTTPD example<httpdex>`) |br| * Added a System class which includes cliInactivityTimeout, consoleInactivityTimeout, and hostname (see :ref:`System example<systemex>`) |br| * Added a note about DO collecting non-identifiable usage data (see :ref:`notestips`) |br| * Added a troubleshooting entry and other notes about DO performing hostname resolution, and failing if the hostname resolution fails (see :ref:`Troubleshooting<hostnameres>`) |br| * Added a troubleshooting entry and other notes about the **/dist** directory going away on GitHub, and the DO RPM being available as a release Asset (see :ref:`Troubleshooting<nodist>`) |br| |br| Issues Resolved: |br| * DO was unable to use management network for SnmpTrapDestination |br| * DO creates incomplete RADIUS authentication configuration |br| * DO was unable to remove Radius System Auth configuration |br| * DO does not remove secondary Radius server when it is absent in declaration
        - 10-22-19

      * - 2.4
        - Updated the documentation for Declarative Onboarding v1.7.0. This release contains the following changes: |br| * Added the /inspect endpoint for GET requests to retrieve the current device configuration as a DO declaration (see :ref:`inspect-endpoint`) |br| * Added support for LDAP, RADIUS, and TACACS authentication in a declaration (see the :ref:`Auth method example<authmethods>`) |br| * Added support for Remote Roles in authentication (see the :ref:`Remote Roles example<remoterole>`) |br| * Added support for configuring SNMP (see the :ref:`SNMP example<snmp>`) |br| * Added support for configuring global Traffic Control properties (see :ref:`Traffic Control example<trafcontrol>`) |br| * Added support for configuring syslog destinations (see :ref:`syslog destination example<syslogdest>`) |br| * Added support for using cmp-hash in the VLAN class (see :ref:`cmp-hash example<cmphash>`) |br| * Added support for DAG Globals (see :ref:`DAG Globals example<dag>`) |br| * Added support for the Trunk class (see the |trunkref| in the schema reference) |br| * Added a Schema Reference Appendix  |br| * Added a note to :ref:`devicegroup` stating as of DO 1.7.0, **owner** is required. |br| * Improved masking of nested secrets |br| * Improved handling of route domains |br| |br| Issues Resolved: |br| * The values of schemaCurrent and schemaMinium do not always return correct values |br| * Management Route class does not work |br| * DO sets task status to ERROR right away while it is still rolling back |br| * DO unable to create new VLAN(s) when no Route Domain(s) specified in declaration. Now DO will add new VLAN(s) to Route Domain with ID 0 unless otherwise specified. |br| * Device Group **owner** is now required |br| * configsyncIp now allows **none** as valid value |br| * When targetSshKey is used DO now tries bash shell to modify targetUsername password if tmsh shell fails |br| * DO now handles the automatic update of the root password when the admin password changes on BIG-IP version 14.0+. 
        - 09-10-19

      * - 2.3
        - This documentation only update contains the following changes: |br| * Added a troubleshooting page with an entry about reposting a declaration with new VLANs, Self IPs, and/or Route Domain (see :ref:`trouble`) |br| * Updated the Route Domain example per GitHub issue |54| (see :ref:`routedomain-class`).
        - 08-01-19
      
      * - 2.2
        - Updated the documentation for Declarative Onboarding v1.6.0. This release contains the following changes: |br| * Added support for creating route domains in a declaration (see :ref:`routedomain-class`) |br| * Added support for specifying a management route (see :ref:`mgmtroute-class`) |br| * Added a note to the **tag** row of the :ref:`vlan-class` table stating if you set the tag in DO, the VLAN defaults the **tagged** parameter to **true**. |br| * Added support for specifying a **webhook** URL for response information (see :ref:`base-comps` for usage). |br| |br| Issues Resolved: |br| * Updated :doc:`big-iq-licensing` and the example declarations to change references to ELA/subscription licensing to *utility* licensing. |br| *  Removed targetSshKey when filling in targetPassphrase. |br| 
        - 07-30-19

      * - 2.1
        - Updated the documentation for Declarative Onboarding v1.5.0. This release contains the following changes: |br| * Support for creating an Analytics profile (see :ref:`Creating an Analytics profile <avrstream>`). |br| * Added support for using Authorized Keys in declarations (see :ref:`Keys example <keys>`). |br| * Added a new page for :doc:`clustering-managing-devices` |br| * Added a note to the :doc:`prereqs` stating that due to changes in TMOS v13.1.1.5, the Declarative Onboarding Extension is not compatible with that specific TMOS version. |br| * Added the |schemalink| from previous releases to the GitHub repository |br| * Updated :doc:`validate` to clarify the schema URL to use |br| * Updated the documentation theme and indexes. |br| |br| Issues Resolved: |br| * Declarative Onboarding now disables DHCP for DNS/NTP if DO is configuring them (see the note in :ref:`dns-class` and :ref:`ntp-class`) |br| * License keys no longer appear in the log |br| * Radius server secrets no longer appears in the log |br| * LicensePool now respects custom management access port of the BIG-IP that is being licensed |br| * When a 400 is received from restjavad, DO now tries relicensing |br| * Fixed an issue in which initial clustering failure would prevent clustering from working on subsequent attempts due to using the wrong device name.
        - 06-18-19
      
      * - 2.0
        - Documentation only update: Added the :ref:`Declarative Onboarding Overview video<video>` to the home page.  
        - 05-24-19

      * - 1.9
        - Released Declarative Onboarding v1.4.1. This maintenance release contains no changes for Declarative Onboarding from 1.4.0 but does include a new version of the Docker Container.  
        - 05-21-19
      
      * - 1.8
        - Updated the documentation for Declarative Onboarding v1.4.0. This release contains the following changes: |br| * Using the Declarative Onboarding Container now allows you to send declarations to multiple BIG-IPs without waiting for previous declarations to finish onboarding. |br| * **taskId** is now returned from POST onboard requests (see :ref:`Note in POST documentation <postnote>`) |br| * New **/task** endpoint to retrieve status by task (see :ref:`Note in GET documentation <getnote>`) 
        - 05-08-19
      
      * - 1.7
        - Released Declarative Onboarding v1.3.1. This maintenance release contains only fixes for the following GitHub issues: |br| * `Issue 7: Does not remove SelfIP and VLAN <https://github.com/F5Networks/f5-declarative-onboarding/issues/7>`_ |br| * `Issue 17: BIG-IP requesting reboot after declaration <https://github.com/F5Networks/f5-declarative-onboarding/issues/17>`_ |br| * `Issue 18: wrong GW IP in declaration leads to DO problems <https://github.com/F5Networks/f5-declarative-onboarding/issues/18>`_ |br| * `Issue 21: DO declaration with multiple modules requires manual reboot and re-post <https://github.com/F5Networks/f5-declarative-onboarding/issues/21>`_ |br| * `Issue 32: DOv1.3.0 to create multiple VLANs / self IP need to run twice on v14.1 <https://github.com/F5Networks/f5-declarative-onboarding/issues/32>`_
        - 05-07-19
      
      * - 1.6
        - Updated the documentation for Declarative Onboarding v1.3.0. This release contains the following changes: |br| * Added support for revoking a license from a BIG-IP with BIG-IQ, as well as relicensing and overwriting a license (see :ref:`Revoking a license using BIG-IQ<revoke-main>`). |br| * Added instructions for validating a declaration using Microsoft Visual Studio Code (see :doc:`validate`). |br| * Added support for modifying a Self IP address.  |br| |br| Issues Resolved: |br| * Corrected an issue in which all Self IPs would be updated if there was a change to any of them. |br| * Corrected an issue in which clustering was not working if ASM was provisioned.
        - 02-27-19
      
      * - 1.5
        - This documentation update release updated the style of this document.
        - 01-28-19
      
      * - 1.4
        - Updated the documentation for Declarative Onboarding v1.2.0. This release contains the following changes: |br| * Added support for using Declarative Onboarding in a container (see :doc:`do-container`). |br| * Added a new section on using JSON Pointers in Declarative Onboarding declarations (see :doc:`json-pointers`). |br| * Added a note and link about the Declarative Onboarding Postman Collection available on GitHub (see :doc:`prereqs`). |br| * Added notes about the BIG-IP v14.0 and later Secure Password Policy (see :ref:`14andlater` for details). |br| * Added new example declarations to :ref:`examples`. |br| |br| Issues Resolved: |br| * Corrected an issue which would reject a CIDR of 1x on a Self IP address. |br| * Corrected an issue in which DB vars were not rolled back in the event of an error.
        - 01-16-19
      
      * - 1.3
        - Updated the provisioning examples to use a value of **minimum** and not **minimal**.
        - 01-08-19
      
      * - 1.2
        - Updated the documentation for Declarative Onboarding v1.1.0. This version is fully supported by F5 Networks, and has moved to the F5Networks GitHub repository.  Additionally, this release contains the following changes: |br| * Added support for using a BIG-IQ to license the BIG-IP (see :doc:`big-iq-licensing`). |br| * Added support for using arbitrary database variables (see :ref:`DB variable class<dbvars-class>`). |br| * Added support for assigning users to All Partitions (see :ref:`User Class<user-class>` for usage). |br| * Added the option of not allowing Shell access when creating a user (see :ref:`User Class<user-class>` for usage).  |br| * Improved reporting for schema validation errors. |br| * Declarations now apply defaults from the schema. |br| |br| Issues Resolved: |br| * Corrected a clustering race condition when onboarding 2 devices at the same time. |br| * Fixed an issue that was improperly deleting objects which just had a property change. |br| * Declarations now dis-allow sync-failover device group with both autoSync and fullLoadOnSync. |br| * Declarative Onboarding now ensures that non-floating self IPs are created before floating self IPs. |br| * Declarative Onboarding now handles missing content-type header. |br| * Fixed an issue where device name was not being set if hostname already matched declaration.

        - 12-19-18
      
      * - 1.1
        - Updated the example declarations to change *allowService* from **all** to **default**, changed the tagging for VLANs to **false**, updated the Self IP section to include a trafficGroup and removed the floating parameter as it does not apply to Self IP. |br| Added a tip to :doc:`composing-a-declaration` and :doc:`clustering` stating you can use GET to track the status of a declaration.
        - 11-13-18
      
      * - 1.0
        - Documentation for the initial release of F5 Declarative Onboarding
        - 11-13-18



.. |br| raw:: html
 
   <br />

.. |schemalink| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/tree/master/schema" target="_blank">schema files</a>

.. |54| raw:: html

   <a href="<a href="https://github.com/F5Networks/f5-declarative-onboarding/issues/54" target="_blank">#54</a>

.. |trunkref| raw:: html
  
   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trunk" target="_blank">Trunk Class</a>



 
