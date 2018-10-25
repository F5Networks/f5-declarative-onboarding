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
        - This revision contains only documentation changes:  |br| * Updated the documentation theme, which includes a stationary table of contents on the left, and other minor improvements. |br| * Reorganized the example declarations into their own section of the documentation, and broke them up into logical groups. |br| * Added a new example declaration, :ref:`Virtual server listening on multiple ports on the same address <multiport>`. |br| * Added an example of updating a declaration using PATCH.  See :ref:`patch-add` |br| * Added a new :ref:`FAQ entry <upgrade-ref>` about what to do if you upgrade your BIG-IP system. |br| * Linked the new video showing how to compose a declaration that references existing objects on the BIG-IP: https://www.youtube.com/watch?v=b55noytozMU.
        - 10-19-18
      
      * - 2.0  
        - Updated the documentation for AS3 v3.5.0.  This release contains the following changes: |br| * Added a Community Supported version of AS3 in a Container on Docker Hub (see :ref:`AS3 in a Container<container>`) |br| * Added support for Generic Services (see :ref:`Using the Service_Generic class<genex>` and :doc:`schema-reference` for usage). |br| * Added support for the FIX Profile for Service_TCP and Service_L4, which includes the ability to configure Sender Tag Mapping and Log Publishers (see :ref:`Using a FIX profile and data groups in a declaration <fixex>` for details). |br| * Added support for internal, external, and existing Data Groups (see :doc:`schema-reference` and :ref:`the FIX example<fixex>` for usage). |br| * Added support for spanning in Serivce_Address (see :doc:`schema-reference` for usage).  |br| * The AS3 schema is now published on GitHub (https://github.com/F5Networks/f5-appsvcs-extension/tree/master/schema) |br| |br| Issues Resolved: |br| * Pointing to a Service_Address in a declaration can fail . |br| * Incorrect validation of declarations wrapped in an AS3 Request object.  |br| * Multiple conditions or actions in an Endpoint Policy Rule can cause AS3 to lock up.  |br| * Errors when processing a declaration can cause AS3 to lock up.  |br| * HTTP Profile Compression issues (Extra “glob” characters included in content-type and Cannot update uri and content-type include/exclude values). |br| * Declaration updates that remove a property can silently fail.   |br| * Enforcement_Listener declarations cannot reference Service_Generic declarations.   |br| * Service_Address and Pool members can have naming conflicts.  |br| * Persist update not idempotent due to prop with regex value. |br| * Success on second POST with Diameter Endpoint Profile. |br| * Cannot update certificate properties.
        - 10-02-18
      
      * - 1.9  
        - Added a new :ref:`FAQ entry<servmain-ref>` about naming application services and helping clarify the *serviceMain* naming convention.
        - 09-12-18
      
      * - 1.8  
        - Updated the documentation for AS3 v3.4.0.  This release contains the following changes: |br| * Added the ability to use Service Discovery for Azure, and remote Service Discovery for AWS, Google, and Azure. Remote service discovery allows your BIG-IP to reside anywhere, not just in a particular cloud (see the :ref:`Service Discovery page <service-discovery>` for details). |br| * Added support for auto-population of FQDN pool members (see :ref:`Using an FQDN pool to identify pool members <fqdnexample>` for details). |br| * Added support for BIG-IP Policy Enforcement Manager (PEM) (see :ref:`Using BIG-IP PEM in a declaration<pemex>` and :doc:`schema-reference` for usage). |br| * Added Firewall (Carrier Grade) NAT support (see :ref:`Using Firewall Carrier Grade NAT features in a declaration<cgnatex>` and :doc:`schema-reference` for usage). |br| * Added for using BIG-IP DNS features (see :ref:`Using BIG-IP DNS features in a declaration<dnsex>` and :doc:`schema-reference` for usage). |br| * Added an example with one tenant and three applications to help clarify the **serviceMain** naming requirement (see :ref:`One tenant with three applications<servicemainex>`. |br| |br| Issues Resolved: |br| * Corrected an issue where upgrading from AS3 v3.2.0 could cause an error message about creating an existing pool. |br| * Corrected an issue where TCL strings in declarations were not properly escaped.  |br| * Corrected an issue where FQDN pool members were not auto-populating correctly.
        - 09-05-18
      
      * - 1.7  
        - Updated the documentation for AS3 v3.3.0.  This release contains the following changes: |br| * Added the ability to use F5 Service Discovery for AWS and Google Cloud (see the :ref:`Service Discovery page <service-discovery>` for details). |br| * Added support for Firewall rules, Firewall policies which contain lists of firewall rules, and logging (see :ref:`Using Firewall Rules, Policies, and Logging <firewallex>` for details). |br| * Added support for HTTP profile enforcement properties; AS3 now supports all current BIG-IP HTTP profile properties (see :doc:`schema-reference` for usage). |br| * Added support for URL routing policies (see :doc:`schema-reference` for usage). |br| * Added an example declaration that includes all current AS3 properties (see :ref:`all-properties`). |br| * Added support for referencing SSL certificates and keys that exist in the Common partition (see :ref:`the SSL certificate example<sslexample>`). 
        - 08-06-18
      
      * - 1.6  
        - Updated the documentation for AS3 v3.2.0.  This release contains the following changes: |br| * Added the ability to import a WAF (ASM) Policy (see :ref:`the WAF import example <asmex>` for details). |br| * Added the ability to allow or deny client traffic from specific VLANs (see :ref:`the VLAN example <vlanex>` for details). |br| * Added the ability to configure Local Traffic Policies that route to a pool based on URI (see :ref:`the Local Traffic Policy example <policyex>` for details). |br| * Added the *Pool_Member* parameter **adminState**, which allows you to disable individual pool members (see :doc:`schema-reference` for usage). |br| * Added Explicit Proxy features to the HTTP profile (see :doc:`schema-reference` for usage). |br| * Added SHA256 hash to the distribution for verification (see :ref:`hash-ref` for details). |br| * Transaction lock enabled to protect against multiple simultaneous declarations posted to AS3. |br| * Replaced the Known Issues list with a link to |hub|. |br| * Added documentation for :ref:`token-ref` |br| |br| Issues Resolved: |br| * Restart no longer required on TMOS 12.1 after upgrading AS3. |br| * APM Sandbox error no longer occurs when deleting a tenant.  |br| * The GET method no longer has issues with duplicate query string tenant values.
        - 07-06-18
            
      * - 1.5  
        - Removed references to the location of the schema files on GitHub from the **Understanding the JSON schema** page of the reference guide. 
        - 06-20-18
      
      * - 1.4  
        - Updated the documentation for AS3 v3.1.0.  This release contains the following changes: |br| * Added support for BIG-IP (TMOS) v12.1.x |br| * Added support for the PATCH method, following `RFC 6902 <https://tools.ietf.org/html/rfc6902>`_. |br| * Added the ability to disable ARP and ping on any service.  Added the Service_Address class to enable this feature. |br| * Added HSTS (HTTP Strict Transport Security) properties to the HTTP_Profile class. |br| * GET /mgmt/shared/appsvsc/info returns the current version of AS3, and is the standard method for determining if you properly installed AS3. |br| |br| Issues Resolved: |br| * Corrected user-defined ICMP monitors to use BIG-IP *gateway-icmp* instead of *icmp*. |br| * Inserted a delay to avoid a race condition that caused the error "localhost is not a BIG-IP" on startup.  |br| * Stabilized the configuration of nodes in /Common/Shared. |br| * Stabilized the configuration of ciphered passphrases.
        - 06-04-18
      
      * - 1.3  
        - Embedded the Using AS3 video on the home page. |br| Changed Virtual Server class to Service class in :ref:`composing` and clarified guidance. |br| Reformatted Known Issues section |br| Corrected the path to the selftest directory on the BIG-IP in :ref:`self-test`.
        - 05-22-18
      
      * - 1.2  
        - Added link to the Using AS3 video (https://youtu.be/NJjcUUtjnJU).
        - 05-17-18
      
      * - 1.1
        - Clarified documentation on declaration history (`GitHub Issue #6 <https://github.com/F5Networks/f5-appsvcs-extension/issues/6>`_) |br| Corrected DELETE query parameter example (`GitHub Issue #5 <https://github.com/F5Networks/f5-appsvcs-extension/issues/5>`_) |br| Added Example 4 to :ref:`examples`. |br| Added Document Revision History
        - 05-03-18
      
      * - 1.0
        - Initial release of AS3 documentation
        - 04-30-18

    

Pool_Member parameter adminState. By default, the adminState is enable, but you can use disable to disallow new connections but allow existing connections to drain, or offline to force immediate termination of all connections.


.. |br| raw:: html
   
   <br />

.. |hub| raw:: html

   <a href="https://github.com/F5Networks/f5-appsvcs-extension/issues" target="_blank">GitHub Issues</a>
