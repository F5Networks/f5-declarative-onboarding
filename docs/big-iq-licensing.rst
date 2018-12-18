.. _bigiqdec:  


Composing a declaration for licensing BIG-IP with a BIG-IQ
==========================================================
If you have an existing BIG-IQ device with a pool of F5 licenses (BIG-IQ License Manager), you can reference it from your Declarative Onboarding declaration in order to license your BIG-IP device. 

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for BIG-IQ License Manager is available in Declarative Onboarding 1.1.0 and later

To use this feature:

- You must have an existing BIG-IQ device with a pool of BIG-IP VE licenses. 
- The license pool can only be a Registration Key pool, Purchase Pool, or a ELA/subscription pool. See the |bigiq| documentation for more detailed information on License pool types.


Declaration class licensing with BIG-IQ
---------------------------------------

In this declaration snippet, we only include the License class, which is specific to using the BIG-IQ to license your BIG-IP system.  For a complete declaration, you could add the License class to the example in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.  
For the full BIG-IQ Licensing example declaration, see :ref:`example3` and :ref:`example4`.

In the following snippet, we set *reachable* to **true** (reachable means the BIG-IQ has a route to the BIG-IP), therefore we include a BIG-IP username and password. We are also using a subscription pool behind the scenes on BIG-IQ, so use SKU keywords and unit of measure.  If reachable is false, you only specify the hypervisor. And for a RegKey pool, you do not need the SKU keywords or the unit of measure (see the table and :ref:`example4` for usage). 

.. code-block:: javascript
   :linenos:

    "myLicense": {
        "class": "License",
        "licenseType": "licensePool",
        "bigIqHost": "10.0.1.200",
        "bigIqUsername": "admin",
        "bigIqPassword": "myPassword1",
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
The License class contains information about your BIG-IQ device.
              
|

+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                                                                                                |
+====================+=============================================+============+===================================================================================================================================================================================================================================+
| class              | License                                     |   Yes      |  Indicates that this property contains licensing information                                                                                                                                                                      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | licensePool, regKey                         |   Yes      |  You must specify either RegKey or license pool.   **NOTE** The rest of this table is specific to licensePool.  For regKey options, see :doc:`composing-a-declaration`                                                            |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+         
| bigIqHost          | string  (IPv4/IPv6 address or hostname)     |   Yes      |  The IP address or hostname of the BIG-IQ device with the license pool.                                                                                                                                                           |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+                                       
| bigIqUsername      | string                                      |   Yes      |  An admin user on the BIG-IQ you specified in bigIqHost.                                                                                                                                                                          |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPassword      | string                                      |   No       |  The password for your BIG-IQ device.  If you do not want to include your BIG-IQ password in your declaration, use bigIqPasswordUri instead.  **NOTE** Either *bigIqPassword* or *bigIqPasswordUri* is required.                  |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIqPasswordUri   | string (URI)                                |   No       |  While not shown in the example above, you can use this property instead of **bigIqPassword** to specify the URI that will return the password for the username if you do not want to include the password in your declaration.   |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licensePool        | string                                      |   Yes      |  Name of the BIG-IQ license pool on the target BIG-IQ from which to obtain a license.                                                                                                                                             |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword1        | string                                      |   No       |  The skuKeyword1 parameter for subscription licensing (not necessary if using a registration key pool).  See the |bigiq| and subscription licensing documentation for information on SKU keywords.                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword2        | string                                      |   No       |  The skuKeyword2 parameter for subscription licensing (not necessary if using a registration key pool). See the |bigiq| and subscription licensing documentation for information on SKU keywords.                                 |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| unitOfMeasure      | yearly, **monthly**, daily, hourly          |   No       |  The unit of measure used in subscription licensing (not necessary if using a registration key pool). See the |bigiq| and subscription licensing documentation for information on the units of measure.                           |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| reachable          | **true**, false                             |   No       |  Reachable specifies whether or not the BIG-IQ has a route to the BIG-IP device.  If it does have a route (true), you must specify the BIG-IP username and password. If it does not (false) you must specify the hypervisor.      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpUsername      | string                                      |   Yes*     |  If reachable = true, specify an admin user on the BIG-IP                                                                                                                                                                         |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| bigIpPassword      | string                                      |   Yes*     |  If reachable = true, specify the password for the BIG-IP username                                                                                                                                                                |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| hypervisor         | aws, azure, gce, vmware, hyperv, kvm, xen   |   Yes**    |  If reachable = false, specify the hypervisor in which the BIG-IP is running                                                                                                                                                      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* Required if reachable = true only |br|
\** Required by BIG-IQ if reachable = false only


Again, for the full BIG-IQ Licensing example declaration, see :ref:`example3` and :ref:`example4`.

|


.. |bigiq| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-iq-centralized-mgmt/manuals/product/bigiq-central-mgmt-device-5-3-0/3.html" target="_blank">BIG-IQ</a>


.. |br| raw:: html
   
   <br />

