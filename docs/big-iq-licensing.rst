.. _clustering:  


Composing a declaration for licensing BIG-IP with a BIG-IQ
==========================================================

Declarative Onboarding can also create a clustered configuration (Device Service Cluster) between two or more BIG-IP systems. You must install Declarative Onboarding and submit a declaration on each device in the cluster, and all BIG-IP devices must be on the same BIG-IP version.  You specify one BIG-IP system as the 'owner' and the other BIG-IPs as 'members' (see :ref:`devicegroup`).  

BIG-IP clustering is well-documented in the product documentation; for detailed information about clustering on the BIG-IP system, see |cluster|.

.. TIP:: You can use GET to the URI ``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` to track whether a declaration is successful or get information on why it failed.

You must have a pool of BIG-IP VE licenses on your BIG-IQ device. Only Registration Key and ELA/subscription pools are supported. See the |bigiq| for more detailed information on License pool types.


Declaration class licensing with BIG-IQ
---------------------------------------

In this example, we only include the License class which is specific to using the BIG-IQ to licensing your BIG-IP system.  For a complete declaration, you could add this class in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.  For the full BIG-IQ Licensing example declaration, see :ref:`example3` and :ref:`example4`.

In the following declaration snippet, we set *reachable* to **true**, and therefore include a BIG-IP username and password.  If reachable is false, you only specify the hypervisor (see the table and and :ref:`example4` for usage). This snippet could be inserted into the :ref:`route-class` in the standalone BIG-IP example.

.. code-block:: javascript
   :linenos:

    "myLicense": {
        "class": "License",
        "licenseType": "licensePool",
        "bigIqHost": "10.0.1.200",
        "bigIqUsername": "admin",
        "bigIqPassword": "foofoo",
        "licensePool": "myPool",
        "skuKeyword1": "key1",
        "skuKeyword2": "key2",
        "unitOfMeasure": "hourly",
        "reachable": true,
        "bigIpUsername": "admin",
        "bigIpPassword": "barbar"
    },




.. _license-class:

License class
````````````````
The only class specific to clustering is the License class. This class contains the properties responsible for propagating BIG-IP configuration changes, including device trust information, to all devices in a device group. For more information on configsync on the BIG-IP, see |cs|.  Because this example assumes we are using this class together with the  standalone declaration, we can use a JSON pointer to the self IP address we defined. 
       
<<JOE, CHANGE EXAMPLE 4 TO BE REGKEY>> ADD REGKEY TO THIS TABLE>>        
|

+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required*? |  Description/Notes                                                                                                                                          |
+====================+=============================================+=============+=============================================================================================================================================================+
| class              | License                                     |   Yes      |  Indicates that this property contains licensing information                                                                                        |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | licensePool, RegKey  |   Yes      |  This is the IP address on the local device that other devices in the device group will use to synchronize their configuration objects to the local device. |
+--------------------+---------------------------------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------+                                                              |
| bigIqUsername      | string                                      |   Yes      | The username for the local device.                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPassword      | string                                      |   No       |  The password for your BIG-IQ device.  If you do not want to include your BIG-IQ password in your declaration, use bigIpPassword instead.                                                                                         |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPasswordUri   | string                                      |   No       |  While not shown in the example above, you can use this property instead of **bigIqPassword** to specify the location where your BIG-IQ password can be retrieved if you do not want to include the password in your declaration. |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licensePool        | string                                      |   No       |  The password for the local device.                                                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword1        | string (IPv4/IPv6, hostname, JSON pointer)  |   No       |  The remote hostname or IP address. If the remoteHost is the current device, this has no affect. Otherwise, the current device will request the remote host to add the current device to its trust domain and synchronize to it.  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword2        | string                                      |   No       | The username for the remote device                                                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| unitOfMeasure      | string                                      |   No       |  The password for the remote device.                                                                                                                                                                                              |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| reachable          | **true**, false                             |   No       |  The remote hostname or IP address. If the remoteHost is the current device, this has no affect. Otherwise, the current device will request the remote host to add the current device to its trust domain and synchronize to it.  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpUsername      | string (IPv4/IPv6, hostname, JSON pointer)  |   No       |  The remote hostname or IP address. If the remoteHost is the current device, this has no affect. Otherwise, the current device will request the remote host to add the current device to its trust domain and synchronize to it.  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpPassword      | string                                      |   No       | The username for the remote device                                                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.


.. |bigiq| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-iq-centralized-mgmt/manuals/product/bigiq-central-mgmt-device-5-3-0/3.html" target="_blank">BIG-IQ documentation</a>

.. |cluster| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>  


