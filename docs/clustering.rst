.. _clustering:  


Composing a Declarative Onboarding declaration for a cluster of BIG-IPs
=======================================================================

Declarative Onboarding can also create a clustered configuration (Device Service Cluster) between two or more BIG-IP systems. You must install Declarative Onboarding and submit a declaration on each device in the cluster, and all BIG-IP devices must be on the same BIG-IP version.  You specify one BIG-IP system as the 'owner' and the other BIG-IPs as 'members' (see :ref:`devicegroup`).  

BIG-IP clustering is well-documented in the product documentation; for detailed information about clustering on the BIG-IP system, see |cluster|.

.. TIP:: You can use GET to the URI ``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` to track whether a declaration is successful or get information on why it failed.

Additionally, see :doc:`json-pointers` for information on using JSON/Declarative Onboarding pointers in your declaration.


Declaration classes for a cluster of BIG-IPs
--------------------------------------------

In this example, we include the classes that are specific to clustering.  For a complete declaration, you could add the classes shown in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.  For the full clustering example declaration, see :ref:`example2`.

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
The first class specific to clustering is the configsync class. This class contains the properties responsible for propagating BIG-IP configuration changes, including device trust information, to all devices in a device group. For more information on configsync on the BIG-IP, see |cs|.  Because this example assumes we are using this class together with the  standalone declaration, we can use a JSON pointer to the self IP address we defined. 

.. code-block:: javascript
   :linenos:


    "configsync": {
        "class": "ConfigSync",
        "configsyncIp": "/Common/external-self/address"
    },
        
        
        
        
|

+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required*?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+=============+=============================================================================================================================================================+
| class              | ConfigSync                                  |   Yes       |  Indicates that this property contains config sync IP configuration                                                                                         |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| configuresyncIp    | string (IPv4/IPv6 address or JSON pointer)  |   Yes       |  This is the IP address on the local device that other devices in the device group will use to synchronize their configuration objects to the local device. |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _failover-uni-class:


Failover Unicast class
```````````````````````
The next class specific to clustering is the failover unicast class. The unicast self IP address you specify is the main address that other devices in the device group use to communicate continually with the local device to assess the health of that device. 
For more information on failover on the BIG-IP, see |failover|.  Because this example assumes we are using this class together with the standalone declaration, we can use a JSON pointer to the self IP address we defined in that declaration. 

.. code-block:: javascript
   :linenos:


    "failoverAddress": {
        "class": "FailoverUnicast",
        "address": "/Common/external-self/address"
    },   
        
        
        
|

+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required*?  |  Description/Notes                                                                                                                                          |
+====================+=============================================+=============+=============================================================================================================================================================+
| class              | FailoverUnicast                             |   Yes       |  Indicates that this property contains failover unicast address configuration.                                                                              |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| address            | string (IPv4/IPv6 address or JSON pointer)  |   Yes       |  This is the local IP address the system uses to listen on for failover heartbeats.                                                                         |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.



.. _devicegroup:


Device Group class
``````````````````
The next class specific to clustering is the device group class. A device group is a collection of BIG-IP devices that trust each other and can synchronize (and fail over if you choose sync-failover), their BIG-IP configuration data.
For more information on Device Groups on the BIG-IP, see |group|.  In this example, for the *owner* parameter, we are using a JSON pointer. The value in the example means that the first object in the *members* array. 

.. NOTE:: The DeviceTrust and DeviceGroup sections in both declarations should be identical. For DeviceTrust, if the remoteHost matches the management IP or one of the self IPs of the host on which it is running, that DeviceTrust section is ignored. If it does not match, then the device processing the declaration will send a request to the remote host to be added to trust. There is similar logic regarding the DeviceGroup owner. The owning device just creates the group, the other device requests to be added to the group.

**Important**: You cannot use *autoSync* and *fullLoadOnSync* together. 

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

+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required*?  |  Description/Notes                                                                                                                                                                                                                                |
+====================+=============================================+=============+===================================================================================================================================================================================================================================================+
| class              | DeviceGroup                                 |   Yes       |  Indicates that this property contains Device Group configuration.                                                                                                                                                                                |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| type               | sync-failover, sync-only                    |   Yes       |  Specifies the type of device group. With sync-failover, devices synchronize their configuration data and fail over to one another when a device becomes unavailable. With sync-only, devices only synchronize their configuration.               |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| members            | array of strings                            |   No        |  Members to add to the device group if they are already in the trust domain.                                                                                                                                                                      |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| owner              | string (hostname or JSON pointer)           |   No        |  Specifies the owning device. The configuration will be pushed from this device. A device group will only be created if the current device is the owner and the device group does not exist.                                                      |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoSync           | true, **false**                             |   No        |  Specifies whether the Device Group should synchronize automatically.   **Important**: You cannot use *autoSync* and *fullLoadOnSync* together.                                                                                                   |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| saveOnAutoSync     | true, **false**                             |   No        |  Specifies whether the Device Group should save the configuration when it auto synchronizes.                                                                                                                                                      |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| networkFailover    | true, **false**                             |   No        |  Specifies whether the Device Group supports network failover.                                                                                                                                                                                    |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| fullLoadOnSync     | true, **false**                             |   No        |  Specifies whether the system synchronizes the entire set of BIG-IP configuration data whenever a config sync operation. **Important**: You cannot use *autoSync* and *fullLoadOnSync* together.                                                  |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| asmSync            | true, **false**                             |   No        |  Specifies whether or not the device group should sync ASM properties                                                                                                                                                                             |
+--------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _devicetrust:


Device Trust class
``````````````````
The final class specific to clustering is the device trust class. Device trust establishes trust relationships between BIG-IP devices on the network, through mutual certificate-based authentication. For more information on Device Trust on the BIG-IP, see |trust|. 

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

+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                                                                                                |
+====================+=============================================+============+===================================================================================================================================================================================================================================+
| class              | DeviceTrust                                 |   Yes      |  Indicates that this property contains Device Trust configuration.                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| localUsername      | string                                      |   Yes      |  The username for the local device.                                                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| localPassword      | string                                      |   No       |  The password for the local device.                                                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remoteHost         | string (IPv4/IPv6, hostname, JSON pointer)  |   No       |  The remote hostname or IP address. If the remoteHost is the current device, this has no affect. Otherwise, the current device will request the remote host to add the current device to its trust domain and synchronize to it.  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remoteUsername     | string                                      |   No       | The username for the remote device                                                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| remotePassword     | string                                      |   No       |  The password for the remote device.                                                                                                                                                                                              |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. |cs| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/5.html" target="_blank">Configsync documentation</a>

.. |cluster| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>  


.. |group| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/4.html" target="_blank">Device Group documentation</a>

.. |trust| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/3.html" target="_blank">Device Trust documentation</a>



