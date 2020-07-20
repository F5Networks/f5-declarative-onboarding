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

.. NOTE:: The DeviceTrust and DeviceGroup sections in both declarations should be identical. For DeviceTrust, if the remoteHost matches the management IP or one of the self IPs of the host on which it is running, that DeviceTrust section is ignored. If it does not match, then the device processing the declaration will send a request to the remote host to be added to trust. There is similar logic regarding the DeviceGroup owner. The owning device just creates the group, the other device requests to be added to the group.

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
    "trafGroup": {
        "class": "TrafficGroup",
        "autoFailbackEnabled": false,
        "autoFailbackTime": 50,
        "failoverMethod": "ha-order",
        "haLoadFactor": 1,
        "haOrder": [
            "do.example.com"
        ]
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

.. NOTE::  As of DO 1.7.0, **none** is a valid value for configsyncIP.

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
| configsyncIp       | string (IPv4/IPv6 address or JSON pointer)  |   Yes       |  This is the IP address on the local device that other devices in the device group will use to synchronize their configuration objects to the local device. |
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

**Important**: You cannot use *autoSync* and *fullLoadOnSync* together. 

.. NOTE::  In Declarative Onboarding v1.11.0 and later, the member and owner parameters can be IP addresses.  See :ref:`Example 17<example17>` for an example declaration.



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

+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter        | Options                                     | Required*?  |  Description/Notes                                                                                                                                                                                                                                |
+==================+=============================================+=============+===================================================================================================================================================================================================================================================+
| class            | DeviceGroup                                 |   Yes       |  Indicates that this property contains Device Group configuration.                                                                                                                                                                                |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| type             | sync-failover, sync-only                    |   Yes       |  Specifies the type of device group. With sync-failover, devices synchronize their configuration data and fail over to one another when a device becomes unavailable. With sync-only, devices only synchronize their configuration.               |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| members          | array of strings                            |   No        |  Members to add to the device group if they are already in the trust domain. In 1.10 and earlier, must be a hostname; in 1.11 and later, can be hostname or IP address.                                                                           |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| owner            | string (hostname, IP address, JSON pointer) |   Yes       |  Specifies the owning device. The configuration will be pushed from this device. A device group will only be created if the current device is the owner and the device group does not exist.  In DO 1.11+ only, can be IP address                 |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoSync         | true, **false**                             |   No        |  Specifies whether the Device Group should synchronize automatically.   **Important**: You cannot use *autoSync* and *fullLoadOnSync* together.                                                                                                   |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| saveOnAutoSync   | true, **false**                             |   No        |  Specifies whether the Device Group should save the configuration when it auto synchronizes.                                                                                                                                                      |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| networkFailover  | true, **false**                             |   No        |  Specifies whether the Device Group supports network failover.                                                                                                                                                                                    |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| fullLoadOnSync   | true, **false**                             |   No        |  Specifies whether the system synchronizes the entire set of BIG-IP configuration data whenever a config sync operation. **Important**: You cannot use *autoSync* and *fullLoadOnSync* together.                                                  |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| asmSync          | true, **false**                             |   No        |  Specifies whether or not the device group should sync ASM properties                                                                                                                                                                             |
+------------------+---------------------------------------------+-------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _trafficgroup:


Traffic Group class
```````````````````
The next class specific to clustering is the traffic group class. A traffic group is a collection of related configuration objects (such as a virtual IP address and a self IP address) that run on a BIG-IP and process a particular type of application traffic. When a BIG-IP becomes unavailable, a traffic group can float to another device in a device group to ensure that application traffic continues to be processed with little to no interruption in service. 

For detailed information about Traffic Groups and clustering on the BIG-IP, see |tgdoc|.  See :ref:`Traffic Groups<example25>` for an example declaration.

.. IMPORTANT:: The HA Score failover method is not currently supported. DO uses the HA Order failover method. |br| |br| Because DO uses HA Order for failover, the declaration must include a hostname, located inside of a deviceGroup. In the example, the declaration defines a Device Group with a host name.  


.. code-block:: javascript
   :linenos:
  
    "trafGroup": {
        "class": "TrafficGroup",
        "autoFailbackEnabled": false,
        "autoFailbackTime": 50,
        "failoverMethod": "ha-order",
        "haLoadFactor": 1,
        "haOrder": [
            "do.example.com"
        ]
    },


|

+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter           | Options           | Required*?  |  Description/Notes                                                                                                                                                                                                                                                                                                             |
+=====================+===================+=============+================================================================================================================================================================================================================================================================================================================================+
| class               | TrafficGroup      |   Yes       |  Indicates that this property contains Traffic Group configuration.                                                                                                                                                                                                                                                            |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoFailbackEnabled | true, **false**   |   No        |  Specifies whether the traffic group fails back to the default device.                                                                                                                                                                                                                                                         |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoFailbackTime    | integer           |   No        |  Specifies the time required to fail back.                                                                                                                                                                                                                                                                                     |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| failoverMethod      | ha-order          |   No        |  Specifies the method to failover the traffic-group to another device. Currently only ha-order is supported, where a list of devices and their respective HA load is used to decide the next one to take over if the current devices fails.                                                                                    |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| haLoadFactor        | integer           |   No        |  Specifies a number for this traffic group that represents the load this traffic group presents to the system relative to other traffic groups. This allows the failover daemon to load balance the active traffic groups amongst the devices.                                                                                 |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| haOrder             | array             |   No        |  List of devices that specifies the order in which the devices will become active for the traffic group when a failure occurs. May contain from zero up to the number of devices in the failover device group. If autoFailbackEnabled is set to true, this list must contain at least one entry for the auto failback device.  |
+---------------------+-------------------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

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

.. |tgdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-device-service-clustering-administration-14-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |br| raw:: html

   <br />