.. _networkexamples:

Network Objects
---------------
The following are example declarations that contain networking objects.


.. _rdomain:

Adding Route Domains to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the **parent** property in the **routeDomain** class is available in BIG-IP DO v1.17.0 and later.

In this example, we show how to use a Route Domain in a declaration.  A route domain is a configuration object that isolates network traffic for a particular application on the network.  For more information on Route Domains, see |rddoc|.

In the following declaration, we include a VLAN to show how to reference a VLAN that is being created.  The SelfIp and the Route both show using the RouteDomain with **%100**, which is the **id** of the RouteDomain.

**New in BIG-IP DO 1.17** |br|
BIG-IP Declarative Onboarding 1.17 added support for specifying a parent route domain.  This is the route domain the system searches when it cannot find a route in the configured domain.

.. IMPORTANT:: The following declaration has been updated to include the **parent** property introduced in BIG-IP DO 1.17. If you attempt to use this declaration on a prior version, it will fail unless you remove the **parent** property.


.. literalinclude:: ../../examples/routeDomains.json
   :language: json
   :emphasize-lines: 21, 25, 28-46, 50


:ref:`Back to top<networkexamples>`

|

.. _dag:

Setting the DAG IPv6 prefix length
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to use the DagGlobals class to set or modify the DAG global IPv6 prefix length.  DAG Globals contain the global disaggregation settings; see the |dagdoc| documentation for more information.

In the following declaration snippet, we show only the DagGlobals class.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.



.. literalinclude:: ../../examples/dagGlobals.json
   :language: json


:ref:`Back to top<networkexamples>`

.. _trafcontrol:

Configuring Traffic Control properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure BIG-IP LTM global traffic control settings (ltm global-settings traffic-control) using a BIG-IP Declarative Onboarding declaration. For descriptions and usage details on these properties, see |tcref| in the Schema Reference.

In the following declaration snippet we show only the classes related to Traffic Control.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

.. literalinclude:: ../../examples/trafficControl.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _cmphash:

Using the CMP Hash property in a VLAN
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Starting in 1.7.0, you have the option of using the **cmp-hash** property on a VLAN.  The CMP Hash setting allows all connections from a client system to use the same set of TMMs, improving system performance. For more information, see |cmpdocs| in the BIG-IP documentation.  You can also see |cmpref| in the Schema Reference for usage options.

In the following declaration snippet we show only the VLAN class with cmp-hash using Source Address as the traffic disaggregation method.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

.. literalinclude:: ../../examples/vlanCmpHash.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example21:

Configuring MAC Masquerading on Traffic Groups
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure MAC Masquerading on Traffic Groups.  This is a part of the new **MAC_Masquerade** class.

For detailed information about Mac Masquerade on the BIG-IP, see |mmkb|.

See |macm| in the Schema Reference for BIG-IP DO usage and options.


.. literalinclude:: ../../examples/macMasquerade.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example22:

Configuring VLAN Failsafe
^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure VLAN Failsafe settings in a BIG-IP Declarative Onboarding declaration.  This is a part of the |cmpref|, and includes the new properties **failsafeEnabled**, **failsafeAction**, and **failsafeTimeout**.

For detailed information about VLAN Failsafe on the BIG-IP, see |vlanfs|.

See |cmpref| in the Schema Reference for BIG-IP DO usage and options.


.. literalinclude:: ../../examples/vlanFailsafe.json
   :language: json


:ref:`Back to top<networkexamples>`

|

.. _example23:

Configuring a DNS Resolver
^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you create a DNS Resolver in a BIG-IP Declarative Onboarding declaration using the |dnsresolver| class introduced in BIG-IP DO 1.14. The DNS Resolver is the internal DNS resolver the BIG-IP system uses to fetch the internal proxy response.

See |dnsresolver| in the Schema Reference for BIG-IP DO usage and options.

For detailed information about the DNS Resolver, see |dnsdoc| on AskF5.


.. literalinclude:: ../../examples/dnsResolver.json
   :language: json

|

.. _example24:

Configuring a TCP Forward Tunnel
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for tunnel types **gre** and **geneve** is  available in BIG-IP DO v1.24 and later

In this example, we show how you create a TCP Forward Network Tunnel in a BIG-IP Declarative Onboarding declaration using the |tunnel| class.

BIG-IP Declarative Onboarding 1.24 adds two tunnel types: **gre** and **geneve**.  In previous versions, **tcp_forward**, for forward proxy connections, was the only supported type of tunnel.  

See |tunnel| in the Schema Reference for BIG-IP DO usage and options.  The following example only shows the **tcp_forward** tunnel type.

.. literalinclude:: ../../examples/tcpForwardTunnel.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example25:

Configuring Traffic Groups
^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how to create Traffic Groups using BIG-IP Declarative Onboarding 1.14 and later. A traffic group is a group of configuration objects on a BIG-IP which is able to float to another device in a device group in case of failure.  For more information, see :ref:`trafficgroup` on the Clustering page, and |tgdoc|.

See |tg| in the Schema Reference for BIG-IP DO usage and options.

.. IMPORTANT:: The HA Score failover method is not currently supported. BIG-IP DO uses the HA Order failover method. |br| |br| Because BIG-IP DO uses HA Order for failover, the declaration must include a hostname, located inside of a deviceGroup. In the following example, the declaration defines a Device Group with a host name.  See :ref:`devicegroup` for information on Device Groups.


.. literalinclude:: ../../examples/trafficGroups.json
   :language: json

:ref:`Back to top<networkexamples>`

|

.. _example26:

Configuring routing prefix lists
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can create network routing prefix lists using BIG-IP Declarative Onboarding 1.18 and later. These prefix lists are a part of a larger BGP configuration, and enable you to specify allow and deny actions for each prefix address.

See |prefix| and |prefixentry| in the Schema Reference for BIG-IP DO usage and options.

**New in BIG-IP DO 1.23** |br|
BIG-IP DO 1.23 introduced the ability to use strings for the **prefixLengthRange** range property. Previous versions would only accept integers. |br|
**Important** If you try to use the following example on versions prior to 1.23, it will fail. If using a previous version, replace the values in the highlighted lines with integers.


The following example contains multiple prefix lists, but no other BIG-IP DO configuration.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.


.. literalinclude:: ../../examples/routingPrefixList.json
   :language: json
   :emphasize-lines: 15, 21, 32, 38

:ref:`Back to top<networkexamples>`


|

.. _bgprouting:

Configuring BGP Routing in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for BGP routing is available in BIG-IP DO v1.20 and later.  BGP Routing is an experimental (Early Access) feature on the BIG-IP. |br| Support for the **ebgpMultihop** property is available in BIG-IP DO 1.24 and later.
   
This example shows how you can configure Border Gateway Protocol (BGP) routing in a BIG-IP Declarative Onboarding declaration.

For an excellent overview of BGP, see the F5 Lightboard lesson |bgpvid|.

.. IMPORTANT:: BGP Routing is an experimental (Early Access) feature on the BIG-IP system.

The BGP routing configuration uses the following BIG-IP Declarative Onboarding classes (some of the classes were introduced in previous versions of BIG-IP Declarative Onboarding, but the main **RoutingBGP** class, which is required to use BGP routing, was introduced in BIG-IP DO 1.20). The links go to the Schema Reference for descriptions and BIG-IP DO usage.

- |routingbgp|
- |routingaspath|
- |prefix|
- |routemap|
- |accesslist| (added in BIG-IP DO 1.24, not included in this example)

The **RoutingBGP** class contains a number of properties used in the following example, so be sure to see |routingbgp| for descriptions and options.

**New in BIG-IP DO 1.24** |br|
BIG-IP Declarative Onboarding 1.24 introduced the **ebgpMultihop** property for BGP neighbors. This property allows you to specify between 1 and 255 external BGP members that are not on directly connected networks (the default is **1**). See |ebgp| in the Schema Reference for more information.

**New in BIG-IP DO 1.28** |br|
BIG-IP Declarative Onboarding 1.28 adds support for specifying route domains in |routingbgp| and |routemap|.

.. IMPORTANT:: If you try to use the following example with a version prior to 1.28, it will fail.  For previous versions, remove the lines in yellow.  You can leave the **ebgpMultihop** lines if using a BIG-IP DO version between 1.24 and 1.27.


.. literalinclude:: ../../examples/bgp.json
   :language: json
   :emphasize-lines: 85, 103, 133, 138, 158

|

.. _firewallpolicy:

Configuring a Firewall policy in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for Firewall policies is available in BIG-IP DO v1.20 and later. You must have BIG-IP AFM licensed.

This example shows how you can configure a firewall policy in a declaration. BIG-IP Network Firewall policies combine one or more rules and apply them as a combined policy to one context, such as a self IP as shown.

The AFM features we use in this declaration are well-documented in the |afmdocs|.

You must have BIG-IP AFM provisioned as shown in the example.

See |fwp|, |fwal|, |fwpl|, and associated classes in the Schema Reference for descriptions and BIG-IP DO usage.

.. NOTE:: The **firewallAddressList** class supports using FQDNs, however, FQDNs require a DNS Resolver on the BIG-IP which is not yet configurable using BIG-IP DO.  If you want to use FQDNs, you must manually configure a DNS Resolver before submitting the declaration. See |dnsresolverdocs| for manual configuration information.

.. literalinclude:: ../../examples/firewallPolicy.json
   :language: json

|

.. _alhvlan:

Configuring Auto Last Hop on VLANs
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can configure Auto Last Hop on VLANs in a BIG-IP Declarative Onboarding declaration.  Auto Last Hop allows the system to send return traffic to the MAC address that transmitted the request, even if the routing table points to a different network or interface. As a result, the system can send return traffic to clients even when there is no matching route.

There are three possible values for the **autoLastHop** property: **enabled**, **disabled**, and **default**, which inherits the value from the global settings.

For detailed information on Auto Last Hop, see |alh| on AskF5.

See |cmpref| for description and BIG-IP DO usage.


.. literalinclude:: ../../examples/vlanAutoLastHop.json
    :language: json


|

.. _manip:

Specifying a static management IP address in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can specify a management IP address in a BIG-IP Declarative Onboarding declaration using the **ManagementIp** class introduced in BIG-IP DO 1.23. The ability to set a static management IP address is useful in scenarios such as updating the BIG-IP after a NIC swap in the Google Cloud Platform.

When using **ManagementIp**, you must keep in mind the following:

- You must also update the ManagementRoute for the new management IP.  See |mr|.
- If running remotely (on BIG-IQ), the remote device must be able to route to the new management IP.
- When polling for BIG-IP DO status, use the new management IP.
- If you are *only* changing the mask, BIG-IP DO must delete the existing management IP address. This means it will only work when BIG-IP DO is running on the device being configured (not from BIG-IQ). This is a system limitation not a BIG-IP DO limitation.
- No response is returned if running in synchronous mode. Always use asynchronous mode when changing the management IP address (see |bc|).
- To handle rollback to a dynamically configured IP, do not set the remark for the ManagementIp to 'configured-by-dhcp'. The default value is fine.

See |mip| for BIG-IP DO usage.


.. literalinclude:: ../../examples/managementIp.json
    :language: json

|

.. _dhcpresv:

Preserving DHCP routes when adding new management routes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how BIG-IP DO can preserve DHCP Management routes when you are adding new management routes in a BIG-IP DO declaration using 1.23 or later. By default, management routes are assigned by DHCP. In previous versions of BIG-IP DO, when you specified a new management route, BIG-IP DO would remove the route assigned by DHCP.  

This feature provides the ability to preserve those DHCP routes using the new **preserveOrigDhcpRoutes** property set to **true** in the |sysclass| class.

.. IMPORTANT:: If you do not configure BIG-IP DO to preserve management routes (the default) but specify management routes in the declaration, BIG-IP DO disables DHCP for management routes. If you configure BIG-IP DO to preserve management routes, DHCP for management routes remains enabled. 

See |sysclass| for more information and BIG-IP DO usage.


.. literalinclude:: ../../examples/preserveOrigDhcpRoutes.json
    :language: json

|

.. _manipfwr:

Configuring firewall rules on the management interface
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

    Support for configuring firewall rules on the management interface is available in BIG-IP DO 1.24 and later. |br| If using BIG-IP 13.1, you must have the AFM module licensed and provisioned

This example shows how you can configure firewall rules on the management interface in a BIG-IP DO declaration. If you are deploying on BIG-IP 13.1-13.x, you must have the AFM module licensed and provisioned. BIG-IP versions 14.1 and later do not have this requirement.

This feature uses the new |manfw| class, which includes the |manfwr| settings.

For more detail on Firewall rules and manual configuration instructions, see |fwkb| on AskF5.

For more information and BIG-IP DO usage on individual properties, see |manfw| and |manfwr|.

.. literalinclude:: ../../examples/managementIpFirewall.json
    :language: json


|

.. _routes:

Configuring routes and managementRoutes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
These examples show how you can create routes and management routes in BIG-IP Declarative Onboarding declarations. BIG-IP DO has supported these objects, however an issue existed in BIG-IP DO prior to v1.23 that would not allow a type of **interface** on Management routes.

See |route| and |manroute| in the Schema Reference for BIG-IP DO usage and options.

The following examples contain route configuration, but no other BIG-IP DO configuration.  You can use these classes as a part of a larger BIG-IP Declarative Onboarding declaration.


.. literalinclude:: ../../examples/routeInterface.json
   :language: json

|

.. literalinclude:: ../../examples/managementRouteInterface.json
   :language: json

|

.. _routeal:

Configuring routing access lists
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can create network routing access lists using BIG-IP Declarative Onboarding 1.24 and later. These access lists are a part of a larger BGP configuration, and enable you to specify allow and deny actions for source and destination addresses (or ranges).

See |accesslist| and |accessentry| in the Schema Reference for BIG-IP DO usage and options.

The following example contains multiple access lists, but no other BIG-IP DO configuration.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.


.. literalinclude:: ../../examples/routingAccessList.json
   :language: json

|

.. _vxlan:

Configuring VXLAN tunnels
^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can create VXLAN tunnels using BIG-IP Declarative Onboarding 1.25 and later. 

Virtual eXtended LAN (VXLAN) is a network virtualization scheme that overlays Layer 2 over Layer 3. VLXAN uses Layer 3 multicast to support the transmission of multicast and broadcast traffic in the virtual network, while decoupling the virtualized network from the physical infrastructure. See |vxlant| for more information and manual configuration.

See |tunnel| in the Schema Reference for BIG-IP DO usage and options.

The following example contains a VXLAN tunnel, but no other BIG-IP DO configuration.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.


.. literalinclude:: ../../examples/vxlanTunnel.json
   :language: json

|

.. _mandhcp:

Enabling management DHCP in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

    Support for enabling management DHCP is available in BIG-IP DO 1.28 and later.

This example shows how you can explicitly enable or disable DHCP for management IP addresses and routes in the |sysclass| class using the new **mgmtDhcpEnabled** property in BIG-IP DO 1.28 and later.  

This property is associated with the **preserveOrigDhcpRoutes** property, which provides the ability to preserve those DHCP routes (see the :ref:`Preserve DHCP routes<dhcpresv>` example on this page).

.. IMPORTANT:: When you use both **mgmtDhcpEnabled** and **preserveOrigDhcpRoutes**, the values MUST match.

See |sysclass| for more information and BIG-IP DO usage.


.. literalinclude:: ../../examples/mgmtDhcpEnabled.json
    :language: json

|


    

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

.. |bgpvid| raw:: html

   <a href="https://www.youtube.com/watch?v=_Z29ZzKeZHc" target="_blank">BGP overview</a>

.. |routingbgp| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingbgp" target="_blank">RoutingBGP</a>

.. |routingaspath| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingaspath" target="_blank">RoutingAsPath</a>

.. |routemap| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routemap" target="_blank">RouteMap</a>

.. |afmdocs| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip-afm/manuals/product/network-firewall-policies-implementations-13-1-0.html" target="_blank">AFM documentation</a>

.. |fwp| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#firewallpolicy" target="_blank">FirewallPolicy</a>


.. |fwal| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#firewalladdresslist" target="_blank">FirewallAddressList</a>

.. |fwpl| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#firewallportlist" target="_blank">FirewallPortList</a>

.. |dnsresolverdocs| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip-afm/manuals/product/network-firewall-policies-implementations-13-1-0/3.html#GUID-933268A4-7800-405C-868F-FEA4ECEF8FBB" target="_blank">Network Firewall documentation</a>

.. |alh| raw:: html

   <a href="https://support.f5.com/csp/article/K13876" target="_blank">Overview of the Auto Last Hop setting</a>

.. |mr| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/composing-a-declaration.html#management-route-class" target="_blank">Management Route class</a>

.. |bc| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/composing-a-declaration.html#base-components" target="_blank">Base Components</a>

.. |mip| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#managementip" target="_blank">ManagementIp</a>

.. |ebgp| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingbgp-neighbors" target="_blank">RoutingBGP_neighbors</a>

.. |manfwr| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#managementipfirewall-rules" target="_blank">ManagementIpFirewall_rules</a>

.. |manfw| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#managementipfirewall" target="_blank">ManagementIpFirewall</a>

.. |fwkb| raw:: html

   <a href="https://support.f5.com/csp/article/K46122561" target="_blank">Restrict access to the BIG-IP management interface using network firewall rules</a>

.. |accesslist| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingaccesslist" target="_blank">RoutingAccessList</a>

.. |accessentry| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routingaccesslist-entries" target="_blank">RoutingAccessList-Entries</a>

.. |manroute| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#managementroute" target="_blank">ManagementRoute</a>

.. |vxlant| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-tmos-tunneling-and-ipsec-14-1-0/configuring-network-virtualization-tunnels.html" target="_blank">Configuring Network Virtualization Tunnels</a>
