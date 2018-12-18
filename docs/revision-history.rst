.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Revision
        - Description
        - Date
             
      * - 1.2
        - - Updated the documentation for Declarative Onboarding v1.1.0. This version is fully supported by F5 Networks, and has moved from the F5devcentral repository to F5Networks.  Additionally, this release contains the following changes: |br| * Added support for using a BIG-IQ to license the BIG-IP (see :doc:`big-iq-licensing`). |br| * Added support for using arbitrary database variables (see :ref:`DB variable class<dbvars-class>`). |br| * Added support for assigning users to All Partitions (see :ref:`User Class<user-class` for usage). |br| * Added the option of not allowing Shell access when creating a user (see :ref:`User Class<user-class` for usage).  |br| * Improved reporting for schema validation errors. |br| * Declarations now apply defaults from the schema. |br| |br| Issues Resolved: |br| * Corrected a clustering race condition when onboarding 2 devices at the same time. |br| * Fixed an issue that was improperly deleting objects which just had a property change. |br| * Declarations now dis-allow sync-failover device group with both autoSync and fullLoadOnSync. |br| * Declarative Onboarding now ensures that non-floating self IPs are created before floating self IPs. |br| Declarative Onboarding now handles missing content-type header. |br| * Fixed an issue where device name was not being set if hostname already matched declaration.

        - 11-13-18
      
      * - 1.1
        - Updated the example declarations to change *allowService* from **all** to **default**, changed the tagging for VLANs to **false**, updated the Self IP section to include a trafficGroup and removed the floating parameter as it does not apply to Self IP. |br| Added a tip to :doc:`composing-a-declaration` and :doc:`clustering` stating you can use GET to track the status of a declaration.
        - 11-13-18
      
      * - 1.0
        - Documentation for the initial release of F5 Declarative Onboarding
        - 11-13-18



.. |br| raw:: html
   
   <br />


 
