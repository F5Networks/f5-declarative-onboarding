.. _clustering:  


Composing a Declarative Onboarding declaration for a cluster of BIG-IPs
=======================================================================

Declarative Onboarding can also onboard a cluster (two or more) of BIG-IP systems.  (more description here)

For some of the clustering components, like ConfigSync and failoverAddress, you can use JSON pointers to reference objects/properties in declarations.  


Sample declaration for a cluster of BIG-IPs
-------------------------------------------

In this example, we are only including the classes that are specific to clustering.  For a complete declaration, you could add the classes shown in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more. 

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

.. _sync-comps:

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


Failover Unicast class
```````````````````````
The first class specific to clustering is the configsync class. This class contains the properties responsible for propagating BIG-IP configuration changes, including device trust information, to all devices in a device group. For more information on configsync on the BIG-IP, see |cs|.  Because this example assumes we are inserting this class after the end of the standalone declaration, we can use a JSON pointer to the self IP address we defined. 

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
| address            | string (IPv4/IPv6 address or JSON pointer)  |   Yes      |  |
+--------------------+---------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.







.. |cs| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/5.html" target="_blank">Configsync documentation</a>
