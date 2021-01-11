.. _networkexamples:

Network Objects
---------------
The following are example declarations that contain networking objects.


.. _rdomain:

Adding Route Domains to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the **parent** property in the **routeDomain** class is available in DO v1.17.0 and later.

In this example, we show how to use a Route Domain in a declaration.  A route domain is a configuration object that isolates network traffic for a particular application on the network.  For more information on Route Domains, see |rddoc|.

In the following declaration, we include a VLAN to show how to reference a VLAN that is being created.  The SelfIp and the Route both show using the RouteDomain with **%100**, which is the **id** of the RouteDomain.

**New in DO 1.17** |br|
Declarative Onboarding 1.17 added support for specifying a parent route domain.  This is the route domain the system searches when it cannot find a route in the configured domain.

.. IMPORTANT:: The following declaration has been updated to include the **parent** property introduced in DO 1.17. If you attempt to use this declaration on a prior version, it will fail unless you remove the **parent** property.


.. literalinclude:: ../../examples/routeDomains.json
   :language: json
   :emphasize-lines: 21, 25, 28-46, 50


:ref:`Back to top<networkexamples>`

|

.. _dag:

Setting the DAG IPv6 prefix length
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **DagGlobals** class is available in DO v1.7.0 and later.

In this example, we show how to use the DagGlobals class to set or modify the DAG global IPv6 prefix length.  DAG Globals contain the global disaggregation settings; see the |dagdoc| documentation for more information.

In the following declaration snippet, we show only the DagGlobals class.  You can use this class as a part of a larger Declarative Onboarding declaration.



.. literalinclude:: ../../examples/dagGlobals.json
   :language: json


:ref:`Back to top<networkexamples>`

.. _trafcontrol:

Configuring Traffic Control properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring all LTM global traffic control properties is available in DO v1.7.0 and later.

In this example, we show how you can configure BIG-IP LTM global traffic control settings (ltm global-settings traffic-control) using a Declarative Onboarding declaration. For descriptions and usage details on these properties, see |tcref| in the Schema Reference.

In the following declaration snippet we show only the classes related to Traffic Control.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../../examples/trafficControl.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _cmphash:

Using the CMP Hash property in a VLAN
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The VLAN property **cmp-hash** is available in DO v1.7.0 and later.

Starting in 1.7.0, you have the option of using the **cmp-hash** property on a VLAN.  The CMP Hash setting allows all connections from a client system to use the same set of TMMs, improving system performance. For more information, see |cmpdocs| in the BIG-IP documentation.  You can also see |cmpref| in the Schema Reference for usage options.

In the following declaration snippet we show only the VLAN class with cmp-hash using Source Address as the traffic disaggregation method.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../../examples/vlanCmpHash.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example21:

Configuring MAC Masquerading on Traffic Groups 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for MAC Masquerade on Traffic Groups is available in DO v1.13 and later

In this example, we show how you can configure MAC Masquerading on Traffic Groups.  This is a part of the new **MAC_Masquerade** class.  

For detailed information about Mac Masquerade on the BIG-IP, see |mmkb|.

See |macm| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../../examples/macMasquerade.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example22:

Configuring VLAN Failsafe 
^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for VLAN Failsafe is available in DO v1.14 and later

In this example, we show how you can configure VLAN Failsafe settings in a Declarative Onboarding declaration.  This is a part of the |cmpref|, and includes the new properties **failsafeEnabled**, **failsafeAction**, and **failsafeTimeout**.

For detailed information about VLAN Failsafe on the BIG-IP, see |vlanfs|.

See |cmpref| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../../examples/vlanFailsafe.json
   :language: json


:ref:`Back to top<networkexamples>`

|

.. _example23:

Configuring a DNS Resolver 
^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for DNS Resolvers is available in DO v1.14 and later

In this example, we show how you create a DNS Resolver in a Declarative Onboarding declaration using the |dnsresolver| class introduced in DO 1.14. The DNS Resolver is the internal DNS resolver the BIG-IP system uses to fetch the internal proxy response. 

See |dnsresolver| in the Schema Reference for DO usage and options. 

For detailed information about the DNS Resolver, see |dnsdoc| on AskF5.


.. literalinclude:: ../../examples/dnsResolver.json
   :language: json

|

.. _example24:

Configuring a TCP Forward Tunnel 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for TCP Forward Tunnels is available in DO v1.14 and later

In this example, we show how you create a TCP Forward Network Tunnel in a Declarative Onboarding declaration using the |tunnel| class introduced in DO 1.14. 

Currently, **tcp_forward** is the only profile (**tunnelType**) Declarative Onboarding supports.  The tcp_forward profile specifies a tunnel used for forward proxy connections.

See |tunnel| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../../examples/tcpForwardTunnel.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example25:

Configuring Traffic Groups 
^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for Traffic Groups is available in DO v1.14 and later

This example shows how to create Traffic Groups using Declarative Onboarding 1.14 and later. A traffic group is a group of configuration objects on a BIG-IP which is able to float to another device in a device group in case of failure.  For more information, see :ref:`trafficgroup` on the Clustering page, and |tgdoc|.

See |tg| in the Schema Reference for DO usage and options.  

.. IMPORTANT:: The HA Score failover method is not currently supported. DO uses the HA Order failover method. |br| |br| Because DO uses HA Order for failover, the declaration must include a hostname, located inside of a deviceGroup. In the following example, the declaration defines a Device Group with a host name.  See :ref:`devicegroup` for information on Device Groups.


.. literalinclude:: ../../examples/trafficGroups.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example26:

Configuring routing prefix lists 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for routing prefix lists is available in DO v1.18 and later

This example shows how you can create network routing prefix lists using Declarative Onboarding 1.18 and later. These prefix lists are a part of a larger BGP configuration, and enable you to specify allow and deny actions for each prefix address.

See |prefix| and |prefixentry| in the Schema Reference for DO usage and options.  

The following example contains multiple prefix lists, but no other DO configuration.  You can use this class as a part of a larger Declarative Onboarding declaration.


.. literalinclude:: ../../examples/routingPrefixList.json
   :language: json

:ref:`Back to top<networkexamples>`


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

.. |mmkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13502" target="_blank">K13502: Configuring MAC masquerade</a>

.. |vlanfs| raw:: html

   <a href="https://support.f5.com/csp/article/K13297" target="_blank">K13297: Overview of VLAN failsafe</a>

.. |dnsresolver| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#dns-resolver" target="_blank">DNS_Resolver</a>


.. |dnsdoc| raw:: html

   <a href="https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20DNS" target="_blank">BIG-IP DNS documentation</a>

.. |tunnel| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#tunnel" target="_blank">Tunnel</a>

.. |tg| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trafficgroup" target="_blank">TrafficGroup</a>

.. |tgdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-device-service-clustering-administration-14-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |hagroup| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-maintain-high-availability-through-resource-monitoring-13-0-0/1.html" target="_blank">BIG-IP documentation</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>

.. |unicast| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#failoverunicast" target="_blank">FailoverUnicast</a>

.. |route| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#route" target="_blank">Route</a>

.. |mirrorkb| raw:: html

   <a href="https://support.f5.com/csp/article/K84303332" target="_blank">Overview of connection and persistence mirroring</a>

.. |mirrorref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mirrorip" target="_blank">MirrorIp</a>

.. |prefix| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingprefixlist" target="_blank">RoutingPrefixList</a>

.. |prefixentry| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingprefixlist-entries" target="_blank">RoutingPrefixList-Entries</a>



