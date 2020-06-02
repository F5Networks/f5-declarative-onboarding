.. _bigipexamples:

BIG-IP and general example declarations
---------------------------------------
The following are example declarations for BIG-IP, with some general examples that could also be used with BIG-IQ and the container.


1: Standalone declaration
^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a standalone BIG-IP system. See :doc:`composing-a-declaration` for specific details on this example.

.. literalinclude:: ../examples/onboard.json
   :language: json


:ref:`Back to top<bigipexamples>`

|


.. _example2:

2: Clustered declaration
^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../examples/onboardFailover.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example6:

3: Using JSON Pointers
^^^^^^^^^^^^^^^^^^^^^^
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../examples/licenseViaBigIqReachableASG.json
   :language: json


:ref:`Back to top<bigipexamples>`

|

.. _avrstream:


4: Creating an Analytics profile to enable AVR data streaming
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the Analytics profile is available in Declarative Onboarding v1.5.0 and later.

In this example, we are licensing a new BIG-IP, provisioning AVR, and creating an Analytics profile (you must have AVR provisioned to create an Analytics profile).  This allows you to stream AVR data for consumption by F5 Telemetry Steaming or similar applications.

.. literalinclude:: ../examples/avrStreamingSupport.json
   :language: json
   :emphasize-lines: 17, 19-29


:ref:`Back to top<bigipexamples>`

|

.. _keys:

5: Adding public SSH keys to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **keys** property of the User class is available in DO v1.5.0 and later.

In this example, we are adding public SSH keys to the root user and a guestUser. This can provide a higher level of security and easier automation.

**Important notes about using the keys property**

- Only the root user's master key (noted by the ``Host Processor Superuser``), in authorized_keys will be preserved. All other keys configured prior to running this declaration, WILL BE DELETED.
- If the **keys** field is left empty it will default to an empty array. This means leaving it empty will clear the authorized_keys file, except for the root's master key.
- For non-root users, the path to the authorized_keys is **/home/{username}/.ssh/authorized_keys**.
- For root, the path is **/root/.ssh/authorized_keys**.
- DO will set the non-root user's .ssh directory permissions to 700, with the authorized_keys permissions set to 600.

.. literalinclude:: ../examples/publicKeys.json
   :language: json
   :emphasize-lines: 13-16, 27-30


:ref:`Back to top<bigipexamples>`

|

.. _rdomain:

6: Adding Route Domains to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **routeDomain** class is available in DO v1.6.0 and later.

In this example, we show how to use a Route Domain in a declaration.  A route domain is a configuration object that isolates network traffic for a particular application on the network.  For more information on Route Domains, see |rddoc|.

In the following declaration, we include a VLAN to show how to reference a VLAN that is being created.  The SelfIp and the Route both show using the RouteDomain with **%100**, which is the **id** of the RouteDomain.



.. literalinclude:: ../examples/routeDomains.json
   :language: json
   :emphasize-lines: 21, 25, 28-46


:ref:`Back to top<bigipexamples>`

|

.. _dag:

7: Setting the DAG IPv6 prefix length
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **DagGlobals** class is available in DO v1.7.0 and later.

In this example, we show how to use the DagGlobals class to set or modify the DAG global IPv6 prefix length.  DAG Globals contain the global disaggregation settings; see the |dagdoc| documentation for more information.

In the following declaration snippet, we show only the DagGlobals class.  You can use this class as a part of a larger Declarative Onboarding declaration.



.. literalinclude:: ../examples/dagGlobals.json
   :language: json



:ref:`Back to top<bigipexamples>`

|

.. _snmp:

8: Configuring SNMP in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure SNMP in a declaration is available in DO v1.7.0 and later.

In this example, we show how to configure SNMP in a Declarative Onboarding declaration.  You can use DO to configure SNMP agents, users, communities, trap events, and trap destinations.  See the |snmpdoc| in the BIG-IP documentation for specific information.

In the following declaration snippet we show only the classes related to SNMP.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/snmp.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _authmethods:

9: Configuring BIG-IP authentication methods
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to enable SSL for LDAP is available in DO 1.13 and later

In this example, we show how to configure RADIUS, LDAP, and TACACS authentication in a Declarative Onboarding declaration using the **Authentication** class. The authentication class can (but does not have to) contain multiple authentication method subclasses but only one can be enabled at a time using the **enableSourceType** property (which matches the BIG-IP UI behavior).

This example declaration contains all three authentication methods with the **enableSourceType** property set to **radius**. It also includes the SSL options for LDAP introduced in DO 1.13.

For more information on options and DO usage, see |auth| and the subsequent entries in the Schema Reference.

In the following declaration snippet we show only the classes related to authentication.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/authMethods.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _remoterole:

10: Configuring Remote Roles for authentication
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure remote roles for authentication is available in DO v1.7.0 and later.

In this example, we show how to configure a remote role for authentication using the **RemoteAuthRole** class. See |loref| in the Schema reference for a description of each of the parameters for this class.

**Important**: The BIG-IP only allows one role per user for each partition/tenant.  Because some remote servers allow multiple user roles, the BIG-IP uses the **lineOrder** parameter to choose one of the conflicting roles for the user at login time. In these cases, the system chooses the role with the lowest line-order number.  See |lineorder| in the BIG-IP documentation for more information and examples.

In the following declaration snippet we show only the classes related to remote auth roles.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/remoteRoles.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _trafcontrol:

11: Configuring Traffic Control properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring all LTM global traffic control properties is available in DO v1.7.0 and later.

In this example, we show how you can configure BIG-IP LTM global traffic control settings (ltm global-settings traffic-control) using a Declarative Onboarding declaration. For descriptions and usage details on these properties, see |tcref| in the Schema Reference.

In the following declaration snippet we show only the classes related to Traffic Control.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/trafficControl.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _syslogdest:

12: Configuring a System Log (syslog) Destination in declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure a syslog destination is available in DO v1.7.0 and later.

In this example, we show how to configure a syslog destination using the **SyslogRemoteServer** class.  For information on syslog destinations, see |sldocs| and the |slkb| Knowledge Base article.  Also see |slref| in the Schema reference for usage options.

**Important**: The remote syslog server must be accessible from your BIG-IP system on the default route domain (Domain 0) or management network, and conversely, your BIG-IP system is accessible from the remote syslog server.

In the following declaration snippet we show only the SyslogRemoteServer class.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/syslogDestination.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _cmphash:

13: Using the CMP Hash property in a VLAN
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The VLAN property **cmp-hash** is available in DO v1.7.0 and later.

Starting in 1.7.0, you have the option of using the **cmp-hash** property on a VLAN.  The CMP Hash setting allows all connections from a client system to use the same set of TMMs, improving system performance. For more information, see |cmpdocs| in the BIG-IP documentation.  You can also see |cmpref| in the Schema Reference for usage options.

In the following declaration snippet we show only the VLAN class with cmp-hash using Source Address as the traffic disaggregation method.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/vlanCmpHash.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _sshex:

14: Configuring SSHD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring SSHD settings is available in DO v1.8.0 and later. 

In this example, we show how you can configure SSHD (SSH daemon) settings in a Declarative Onboarding declaration. For usage and options, see |sshd| in the Schema Reference.

In the following declaration, we show only the SSHD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 


.. literalinclude:: ../examples/sshd.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _httpdex:

15: Configuring HTTPD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring HTTPD settings is available in DO v1.8 and later. 

In this example, we show how you can configure HTTPD (HTTP daemon) settings in a Declarative Onboarding declaration. For usage and options, see |httpd| in the Schema Reference.

.. NOTE:: If you use the BIG-IP Configuration utility, we recommend you exit the utility before changes are made to the system using the HTTPD component. Making changes to the system using this component causes a restart of the httpd daemon, and restarting the httpd daemon requires a restart of the Configuration utility.

In the following declaration, we show only the HTTPD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 


.. literalinclude:: ../examples/httpd.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _systemex:

16: Configuring System settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for disabling the auto-check feature is available in DO v1.13 and later. 

In this example, we show how you can configure some System settings in a Declarative Onboarding declaration. This enables you to set auto-timeout values for serial console (CLI) and TMSH interactive mode sessions, as well as set a hostname, if you have not set one in the Common class. 

.. IMPORTANT:: If you set a hostname in the Common class, you cannot use the hostname property in the System class; they are mutually exclusive.

For usage and options, see |sysclass| in the Schema Reference.

DO 1.13 introduced the ability to disable the automatic update check feature.  The autoCheck property controls whether the BIG-IP checks for and recommends software updates.  See |k15000| for more information. 

In the following declaration, we show only the System class (including autoCheck introduced in 1.13).  You can use this class as a part of a larger Declarative Onboarding declaration. 

**Important**: If you try to use this declaration with a DO version prior to 1.13, it will fail.  Either upgrade to 1.13, or remove the autoCheck line.


.. literalinclude:: ../examples/system.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example17:

17: Clustered declaration with IP addresses for Device Group owner and members
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for using IP addresses for Device Group owners and members is available in DO v1.11 and later. 

The following is an example declaration that onboards a clustered BIG-IP system, but shows how you can use an IP address for the Device Group members and owner.  

See :ref:`devicegroup` for more information.

.. literalinclude:: ../examples/clusterWithIpAddresses.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example18:

18: Updating the TLS/SSL Device Certificate in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for including a TLS/SSL device certificate and key is available in DO v1.12 and later. 

This example declaration shows how you can create/upload a device certificate in a Declarative Onboarding declaration. The BIG-IP system uses the device certificate to authenticate access to the Configuration utility and to accommodate device-to-device communication processes, such as configuration synchronization. 

For more information and how this process works manually, see the KB article |certdoc|.

A couple of things to note when including certificates and keys in a declaration:

- DO always writes to **/config/httpd/conf/ssl.crt/server.crt** and **ssl.key/server.key**
- If the device certificate is updated (that is, if the certificate in the declaration does not match the certificate in those directories), DO reboots the BIG-IP device in order to include the updated certificate
- DO makes backups of the certificates and keys in those directories before overwriting the existing certificate and key
- Like other settings in DO, if a subsequent declaration is posted without the certificate, DO will restore the certificate that was there when it first ran.

See |certclass| in the schema reference for more information and usage.

.. literalinclude:: ../examples/deviceCertificate.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example19:

19: Using the userAgent Controls property 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **userAgent** is available in DO v1.13 and later

In this example, we show how you can use the **userAgent** property in the new **Controls** class. The userAgent property allows you to set a unique identifier in usage data.

This declaration includes the Controls class with userAgent set to **BIG-IQ/7.1 Configured by API**.  

See |controls| in the Schema Reference for more information.


.. literalinclude:: ../examples/userAgent.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example20:

20: Configuring Audit Logging in a declaration  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring audit logging is available in DO v1.13 and later

In this example, we show how you can configure audit logging in the System class of a Declarative Onboarding declaration.  This allows audit logging to start as early as possible.

See |sysclass| in the Schema Reference for DO usage and options. For detailed information about audit logging on the BIG-IP, see the |auditlog|.

.. IMPORTANT:: **guiAuditLog** is only available on TMOS v14.0 and later


.. literalinclude:: ../examples/auditLogging.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example21:

21: Configuring MAC Masquerading on Traffic Groups 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support mac masquerade on Traffic Groups is available in DO v1.13 and later

In this example, we show how you can configure MAC Masquerading on Traffic Groups.  This is a part of the new **MAC_Masquerade** and **MAC_Masquerade_Source** classes.  

For detailed information about Mac Masquerade on the BIG-IP, see |mmkb|.

See |macm| and |macms| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../examples/macMasquerade.json
   :language: json

:ref:`Back to top<bigipexamples>`


.. |br| raw:: html

   <br />

.. |rddoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/09.html" target="_blank">Route Domain documentation</a>

.. |dagdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-service-provider-generic-message-administration-13-1-0/5.html" target="_blank">Disaggregation DAG modes</a>

.. |snmpdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/monitoring-big-ip-system-traffic-with-snmp.html" target="_blank">Monitoring BIG-IP System Traffic with SNMP</a>

.. |tcref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trafficcontrol" target="_blank">TrafficControl Class</a>

.. |loref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#remoteauthrole" target="_blank">RemoteAuthRole Class</a>


.. |rolesdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-systems-user-account-administration-14-0-0/05.html" target="_blank">Remote User Account Management</a>

.. |lineorder| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-systems-user-account-administration-14-0-0/05.html#GUID-E70CB2E7-A003-486A-9A3E-2C401B4DAC78" target="_blank">Line Order</a>

.. |sldocs| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/about-logging.html" target="_blank">External Monitoring</a>

.. |slkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13080" target="_blank">Configuring remote logging</a>

.. |slref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#syslogremoteserver" target="_blank">SyslogRemoteServer Class</a>

.. |cmpdocs| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/tmos-routing-administration-13-0-0/4.html#GUID-8D469425-EFAC-48D6-80F3-1EF6C2EE6196" target="_blank">Additional VLAN Configuration Options</a>

.. |cmpref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#vlan" target="_blank">VLAN Class</a>

.. |trunkdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/tmos-routing-administration-12-1-1/3.html" target="_blank">Trunk documentation</a>

.. |trunkref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trunk" target="_blank">Trunk class</a>

.. |sshd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#sshd" target="_blank">SSHD</a>

.. |httpd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#httpd" target="_blank">HTTPD</a>

.. |sysclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system" target="_blank">System</a>

.. |certclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#devicecertificate" target="_blank">DeviceCertificate</a>

.. |certdoc| raw:: html

   <a href="https://support.f5.com/csp/article/K6353" target="_blank">Updating a self-signed SSL device certificate on a BIG-IP system</a>

.. |controls| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#device-controls" target="_blank">Device_Controls</a>

.. |auth| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#authentication" target="_blank">Authentication</a>

.. |k15000| raw:: html

   <a href="https://support.f5.com/csp/article/K15000" target="_blank">K15000</a>

.. |auditlog| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0/6.html" target="_blank">Audit Logging documentation</a>

.. |macm| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mac-masquerade" target="_blank">Mac_Masquerade</a>

.. |macms| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mac-masquerade-source" target="_blank">Mac_Masquerade_Source</a>

.. |mmkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13502" target="_blank">K13502: Configuring MAC masquerade</a>
