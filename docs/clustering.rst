.. _clustering:  


Composing a Declarative Onboarding declaration for a cluster of BIG-IPs
=======================================================================

Declarative Onboarding can also create a clustered configuration (Device Service Cluster) between two or more BIG-IP systems. You must install Declarative Onboarding and submit a declaration on each device in the cluster, and all BIG-IP devices must be on the same BIG-IP version.  For detailed information about clustering on the BIG-IP system, see |cluster|.


Sample declaration for a cluster of BIG-IPs
-------------------------------------------

In this example, we are only including the classes that are specific to clustering.  For a complete declaration, you could add the classes shown in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more. 

For some of the clustering components, like ConfigSync and failoverAddress, you can use JSON pointers to reference objects/properties in declarations.

The following declaration snippet could continue after the :ref:`route-class` in the standalone BIG-IP example.

.. code-block:: javascript
   :linenos:

    "configsync": {
        "class": "ConfigSync",
        "configsyncIp": "/Common/external-self/address"
    },
    "failoverAddress": {
        "class": "FailoverUnicast",
        "address": "/Common/external-self/address"
    },
    "failoverGroup": {
        "class": "DeviceGroup",
        "type": "sync-failover",
        "members": ["bigip1.example.com", "bigip2.example.com"],
        "owner": "/Common/failoverGroup/members/0",
        "autoSync": true,
        "saveOnAutoSync": false,
        "networkFailover": true,
        "fullLoadOnSync": false,
        "asmSync": false
    },
    "trust": {
        "class": "DeviceTrust",
        "localUsername": "admin",
        "localPassword": "pass1word",
        "remoteHost": "/Common/failoverGroup/members/0",
        "remoteUsername": "admin",
        "remotePassword": "pass2word"
    }


Components of the declaration
-----------------------------
The following sections break down the example into parts so you can understand the options and how to compose a declaration. The tables below the examples contains descriptions and options for the parameters included in the example only.  

If there is a default value, it is shown in bold in the Options column.  

Use the index in the left pane if you want to go directly to a particular section.

.. _sync-class:

Configsync class
````````````````
The first class specific to clustering is the configsync class. This class contains the properties responsible for propagating BIG-IP configuration changes, including device trust information, to all devices in a device group. For more information on configsync on the BIG-IP, see |cs|.  Because this example assumes we are inserting this class after the end of the standalone declaration, we can use a JSON pointer to the self IP address we defined. 

.. code-block:: javascript
   :linenos:


    "configsync": {
        "class": "ConfigSync",
        "configsyncIp": "/Common/external-self/address"
    },
        
        
        
        
|

+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+============+=============================================================================================================================================================+
| class              | ConfigSync                                  |   Yes      |  Indicates that this property contains config sync IP configuration                                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| configuresyncIp    | string (IPv4/IPv6 address or JSON pointer)  |   Yes      |  This is the IP address on the local device that other devices in the device group will use to synchronize their configuration objects to the local device. |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _failover-uni-class:


Failover Unicast class
```````````````````````


.. code-block:: javascript
   :linenos:


    "failoverAddress": {
        "class": "FailoverUnicast",
        "address": "/Common/external-self/address"
    },   
        
        
        
|

+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+============+=============================================================================================================================================================+
| class              | FailoverUnicast                             |   Yes      |  Indicates that this property contains failover unicast address configuration.                                                                              |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| address            | string (IPv4/IPv6 address or JSON pointer)  |   Yes      |  This is the local IP address the system uses to listen on for failover heartbeats.                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| port               | integer                                     |   No       |  If you used an IP address for address, you can optionally specify a port.                                                                                  |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.



.. _failover-uni-class:


Failover Unicast class
```````````````````````


.. code-block:: javascript
   :linenos:
  
    "failoverGroup": {
        "class": "DeviceGroup",
        "type": "sync-failover",
        "members": ["bigip1.example.com", "bigip2.example.com"],
        "owner": "/Common/failoverGroup/members/0",
        "autoSync": true,
        "saveOnAutoSync": false,
        "networkFailover": true,
        "fullLoadOnSync": false,
        "asmSync": false
    },


|

+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+============+=============================================================================================================================================================+
| class              | DeviceGroup                                 |   Yes      |  Indicates that this property contains Device Group configuration.                                                                                          |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| type               | sync-failover, sync-only                    |   Yes      |  This is the local IP address the system uses to listen on for failover heartbeats.                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| members            | string                                      |   No       |  Members to add to the device group if they are already in the trust domain.                                                                                |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| owners             | string                                      |   No       |  Specifies the owning device. The configuration will be pushed from this device. If this is present, a device group will only be created if the current device is the owner. If not present, a device group will be created if it does not exist.                                                                              |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoSync           | true, **false**                             |   No       |  Specifies whether the Device Group should synchronize automatically.                                                                                       |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| saveOnAutoSync     | true, **false**                             |   No       |  Specifies whether the Device Group should save the configuration when it auto synchronizes.                                                                |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| networkFailover    | true, **false**                             |   No       |  Specifies whether the Device Group supports network failover.                                                                                              |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| fullLoadOnSync     | true, **false**                             |   No       |  Specifies whether the system synchronizes the entire set of BIG-IP configuration data whenever a config sync operation                                     |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| asmSync            | true, **false**                             |   No       |  Specifies whether or not the device group should sync ASM properties                                                                                       |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _devicegroup-class:


Device Group class
``````````````````


.. code-block:: javascript
   :linenos:
  
    "trust": {
        "class": "DeviceTrust",
        "localUsername": "admin",
        "localPassword": "pass1word",
        "remoteHost": "/Common/failoverGroup/members/0",
        "remoteUsername": "admin",
        "remotePassword": "pass2word"
    }

|

+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+============+=============================================================================================================================================================+
| class              | DeviceTrust                                 |   Yes      |  Indicates that this property contains Device Trust configuration.                                                                                          |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| localUsername      | string                                      |   Yes      |  The username for the local device.                                                                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| localPassword      | string                                      |   No       |  The password for the local device.                                                                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remoteHost         | string (IPv4/IPv6, hostname, JSON pointer)  |   No       |  The remote hostname or IP address.                                                                                                                         |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remoteUsername     | string                                      |   No       |  The username for the remote device.				                                                                                                          |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remotePassword     | string                                      |   No       |  The password for the remote device.                                                                                                                        |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. |cs| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/5.html" target="_blank">Configsync documentation</a>

.. |cluster| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>
