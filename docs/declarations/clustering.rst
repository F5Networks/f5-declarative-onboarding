.. _cluster-examples:

Clustering Examples
-------------------
This section contains relatively simple examples of declarations that create HTTP and/or HTTP services.  

Use the index on the right to locate specific examples.


Clustered declaration
^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../../examples/onboardFailover.json
   :language: json

:ref:`Back to top<cluster-examples>`

|

.. _example17:

Clustered declaration with IP addresses for Device Group owner and members
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for using IP addresses for Device Group owners and members is available in DO v1.11 and later. 

The following is an example declaration that onboards a clustered BIG-IP system, but shows how you can use an IP address for the Device Group members and owner.  

See :ref:`devicegroup` for more information.

.. literalinclude:: ../../examples/clusterWithIpAddresses.json
   :language: json

:ref:`Back to top<cluster-examples>`

|

.. _example26:

Configuring multiple failover unicast addresses 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for multiple failover unicast addresses is available in DO v1.15 and later

This example shows how to specify multiple failover unicast addresses using Declarative Onboarding 1.15 and later. The unicast addresses you specify are the main address that other devices in the device group use to communicate continually with the local device to assess the health of that device. For more information on failover on the BIG-IP, see |failover|. 

For additional information, see :ref:`failover-uni-class` on the Clustering page. See |unicast| in the Schema Reference for DO usage and options.  

To use this feature:

- The failover unicast addresses must be pointing at IP addresses on the BIG-IP system (Self IP addresses)
- Self IPs require a VLAN.  Some systems, such as 1 NIC BIG-IP systems, are not able to have multiple VLANs.  Check the device on which you are deploying a declaration using this feature.

In the following example, the declaration creates a VLAN, that is then used by 2 external Self IP addresses, and then updates the device with two Failover Unicast addresses. 

.. literalinclude:: ../../examples/multipleFailoverUnicasts.json
   :language: json

:ref:`Back to top<cluster-examples>`

|

.. _example29:

Configuring connection and persistence mirroring  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for connection and persistence mirroring is available in DO v1.16 and later

This example shows how you can include connection and persistence mirroring information in a Declarative Onboarding declaration. 

The connection and persistence mirroring feature allows you to configure BIG-IP systems in a high availability (HA) configuration to duplicate connection and persistence information to peer members of the BIG-IP device group. This feature provides higher reliability but may affect system performance.   For more information, see the |mirrorkb| article on AskF5.

See |mirrorref| in the Schema Reference for DO usage and options.  Also see :ref:`mirrorip` on the Clustering page.

.. literalinclude:: ../../examples/mirrorIp.json
   :language: json

:ref:`Back to top<cluster-examples>`

|

.. _multicast:

Configuring Failover Multicast settings  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for Failover Multicast is available in DO v1.17 and later

This example shows how you can configure Failover Multicast settings in a Declarative Onboarding declaration using the **FailoverMulticast** class introduced in DO 1.17.  When you use this class, the system sends multicast messages associated with failover on the interface, address, and port you specify. For more information on Failover options on the BIG-IP, see |multicastdoc| in the product documentation.

When configuring Failover Multicast, all three fields (**interface**, **address**, and **port**) are required. The address cannot have a CIDR.

If you do not specify an available interface name, the system will show an error which includes a list of available interfaces. If you specify a value **none** for the interface, DO disables Failover Multicast on the BIG-IP.

See |multi| in the Schema Reference for DO usage and options.  

.. NOTE:: The following example only includes the FailoverMulticast class, which can be used as a part of a larger declaration.

.. literalinclude:: ../../examples/failoverMulticast.json
   :language: json

:ref:`Back to top<cluster-examples>`


.. |mirrorkb| raw:: html

   <a href="https://support.f5.com/csp/article/K84303332" target="_blank">Overview of connection and persistence mirroring</a>

.. |mirrorref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mirrorip" target="_blank">MirrorIp</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>

.. |unicast| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#failoverunicast" target="_blank">FailoverUnicast</a>

.. |multicastdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-device-service-clustering-administration-14-1-0/managing-failover.html" target="_blank">Managing Failover</a>


.. |multi| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#failovermulticast" target="_blank">FailoverMulticast</a>

