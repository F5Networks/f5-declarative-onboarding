.. _bigiqdec:  


Composing a declaration for licensing BIG-IP with a BIG-IQ
==========================================================

Declarative Onboarding can also create a clustered configuration (Device Service Cluster) between two or more BIG-IP systems. You must install Declarative Onboarding and submit a declaration on each device in the cluster, and all BIG-IP devices must be on the same BIG-IP version.  You specify one BIG-IP system as the 'owner' and the other BIG-IPs as 'members' (see :ref:`devicegroup`).  

BIG-IP clustering is well-documented in the product documentation; for detailed information about clustering on the BIG-IP system, see |cluster|.

.. TIP:: You can use GET to the URI ``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` to track whether a declaration is successful or get information on why it failed.

You must have a pool of BIG-IP VE licenses on your BIG-IQ device. Only Registration Key and ELA/subscription pools are supported. See the |bigiq| for more detailed information on License pool types.


Declaration class licensing with BIG-IQ
---------------------------------------

In this example, we only include the License class which is specific to using the BIG-IQ to licensing your BIG-IP system.  For a complete declaration, you could add this class in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.  
For the full BIG-IQ Licensing example declaration, see :ref:`BIG-IQ with route <example3>` and :ref:`BIG-IQ with no route <example4>`.

In the following declaration snippet, we set *reachable* to **true**, and therefore include a BIG-IP username and password.  If reachable is false, you only specify the hypervisor (see the table and :ref:`BIG-IQ with no route <example4>` for usage). This snippet could be inserted into the :ref:`route-class` in the standalone BIG-IP example.

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




.. _license-pool:

License class
`````````````
The only class specific to clustering is the License class. 
              
|

+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                                                                                                |
+====================+=============================================+============+===================================================================================================================================================================================================================================+
| class              | License                                     |   Yes      |  Indicates that this property contains licensing information                                                                                                                                                                      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | licensePool, RegKey                         |   Yes      |  You must specify either RegKey or license pool.   **NOTE** The rest of this table is specific to licensePool                                                                                                                     |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+         
| bigIqHost          | string  (IPv4/IPv6 address or hostname)     |   Yes      | The IP address or hostname of the BIG-IQ device with the license pool.                                                                                                                                                            |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+                                       
| bigIqUsername      | string                                      |   Yes      |  An admin user on the BIG-IQ you specified in bigIqHost.                                                                                                                                                                          |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPassword      | string                                      |   No       |  The password for your BIG-IQ device.  If you do not want to include your BIG-IQ password in your declaration, use bigIqPasswordUri instead.  **NOTE** Either bigIqPassword or bigIqPasswordUri is required.                      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPasswordUri   | string (URI)                                |   No       |  While not shown in the example above, you can use this property instead of **bigIqPassword** to specify the URI that will return the password for the username if you do not want to include the password in your declaration.   |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licensePool        | string                                      |   Yes      |  Name of the BIG-IQ license pool on the target BIG-IQ from which to obtain a license.                                                                                                                                             |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword1        | string                                      |   No       |  The skuKeyword1 parameter for subscription licensing.                                                                                                                                                                            |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword2        | string                                      |   No       | The username for the remote device                                                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| unitOfMeasure      | yearly, **monthly**, daily, hourly          |   No       | The password for the remote device.                                                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| reachable          | **true**, false                             |   No       | Reachable specifies whether or not the BIG-IQ has a route to the BIG-IP device.  If it does have a route (true), you must specify the BIG-IP username and password. If it does not (false) you must specify the hypervisor.       |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpUsername      | string                                      |   Yes*     | If reachable = true, an admin user on the BIG-IP                                                                                                                                                                                  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpPassword      | string                                      |   Yes*     | If reachable = true, the password for the BIG-IP username                                                                                                                                                                         |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| hypervisor         | aws, azure, gce, vmware, hyperv, kvm, xen   |   Yes**    | If reachable = false, the hypervisor in which the BIG-IP is running                                                                                                                                                               |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

 \* Required if reachable = true only
 \** Required by BIG-IQ if reachable = false only


.. |bigiq| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-iq-centralized-mgmt/manuals/product/bigiq-central-mgmt-device-5-3-0/3.html" target="_blank">BIG-IQ documentation</a>

.. |cluster| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>  


