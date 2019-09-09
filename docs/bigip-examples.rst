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

.. _authmethods:

9: Configuring BIG-IP authentication methods
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure RADIUS, LDAP, and TACACS authentication in a declaration is available in DO v1.7.0 and later. 

In this example, we show how to configure RADIUS, LDAP, and TACACS authentication in a Declarative Onboarding declaration using the **Authentication** class. The authentication class can (but does not have to) contain multiple authentication method subclasses but only one can be enabled at a time using the **enableSourceType** property (which matches the BIG-IP UI behavior).

This example declaration contains all three authentication methods with the **enableSourceType** property set to **radius**.    

In the following declaration snippet we show only the classes related to authentication.  You can use this class as a part of a larger Declarative Onboarding declaration. 

.. literalinclude:: ../examples/authMethods.json
   :language: json

:ref:`Back to top<bigipexamples>`

.. _remoterole:

10: Configuring Remote Roles for LDAP authentication
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure remote roles for LDAP authentication is available in DO v1.7.0 and later. 

In this example, we show how to configure a remote role for LDAP authentication using the **RemoteRole** class. See |loref| in the Schema reference for a description of each of the parameters for this class.

**Important**: The BIG-IP only allows one role per user for each partition/tenant.  Because some remote servers allow multiple user roles, the BIG-IP uses the **lineOrder** parameter to choose one of the conflicting roles for the user at login time. In these cases, the system chooses the role with the lowest line-order number.  See |lineorder| in the BIG-IP documentation for more information and examples.

In the following declaration snippet we show only the classes related to remote roles.  You can use this class as a part of a larger Declarative Onboarding declaration. 

.. literalinclude:: ../examples/remoteRoles.json
   :language: json

:ref:`Back to top<bigipexamples>`

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


