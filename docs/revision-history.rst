.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Revision
        - Description
        - Date
             
      * - 2.1
        - Updated the documentation for Declarative Onboarding v1.5.0. This release contains the following changes: |br| * Support for creating an Analytics profile (see :ref:`Creating an Analytics profile <avrstream>`). |br| * Added support for using Authorized Keys in declarations (see :ref:`Keys example <keys>`). |br| * Added a note to the :doc:`prereqs` stating that due to changes in TMOS v13.1.1.5, the Declarative Onboarding Extension is not compatible with that specific TMOS version. |br| * Added the |schemalink| from previous releases to the GitHub repository |br| |br| Issues Resolved: |br| * Declarative Onboarding now disables DHCP for DNS/NTP if DO is configuring them (see the note in :ref:`dns-class` and :ref:`ntp-class`) |br| * License keys no longer appear in the log |br| * Radius server secrets no longer appears in the log |br| * LicensePool now respects custom management access port of the BIG-IP that is being licensed |br| * When a 400 is received from restjavad, DO now tries relicensing |br| *  **remote.schema.json** now has a **bigIqSettings** object. These values are passed to BIG-IQ as options it needs for managing a BIG-IP. |br| * BIG-IQ credentials not required in licensePool object when licensing from the BIG-IQ on which DO is running |br| * When running on BIG-IQ, use the BIG-IP public management address for licensing.
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



 
