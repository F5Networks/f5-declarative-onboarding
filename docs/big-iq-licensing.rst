.. _bigiqdec:  


Composing a declaration for licensing BIG-IP with a BIG-IQ
==========================================================
If you have an existing BIG-IQ device with a pool of F5 licenses (BIG-IQ License Manager), you can reference it from your Declarative Onboarding declaration in order to license your BIG-IP device. 

To use this feature:

- You must have an existing BIG-IQ device with a pool of BIG-IP VE licenses. 
- The license pool can only be a Registration Key pool, Purchased Pool, or a Utility (subscription/ELA) pool. See the |bigiq| documentation for more detailed information on License pool types.
- In the BIG-IQ UI, you must include a targetUsername and targetPassphrase.  BIG-IQ is able to pass a target token through the API, but the BIG-IQ **must** also have the target username and passphrase in the body so the BIG-IQ can discover and import the BIG-IP device after the onboarding process.

Additionally, see :doc:`json-pointers` for information on using JSON/Declarative Onboarding pointers in your declaration.

See :doc:`bigiq-examples` for additional example declarations.

.. NOTE:: See |compat| for information on BIG-IQ and Declarative Onboarding compatibility.


Declaration class licensing with BIG-IQ
---------------------------------------

In this declaration snippet, we only include the License class, which is specific to using the BIG-IQ to license your BIG-IP system.  For a complete declaration, you could add the License class to the example in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.  
For the full BIG-IQ Licensing example declaration, see :ref:`bigiq1` and :ref:`bigiq2`.

In the following snippet, we set *reachable* to **true** (reachable means the BIG-IQ has a route to the BIG-IP), therefore we include a BIG-IP username and password. We are also using a utility pool behind the scenes on BIG-IQ, so use SKU keywords and unit of measure.  If reachable is false, you only specify the hypervisor (see the :doc:`bigiq-examples` for example declarations). And for a RegKey pool, you do not need the SKU keywords or the unit of measure (see the table and :ref:`bigiq2` for usage). 

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
The License class contains information about your BIG-IQ device.  For BIG-IQ, the licenseType parameter must be **licensePool**.
              
|

+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                     | Required?  |  Description/Notes                                                                                                                                                                                                                |
+====================+=============================================+============+===================================================================================================================================================================================================================================+
| class              | License                                     |   Yes      |  Indicates that this property contains licensing information                                                                                                                                                                      |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | licensePool                                 |   Yes      |  For BIG-IQ, you must specify **licensePool**.  (For BIG-IP, you can use *regKey* for licenseType, see :ref:`license-class`).                                                                                                     |
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
| skuKeyword1        | string                                      |   No       |  The skuKeyword1 parameter for utility licensing (not necessary if using a registration key pool).  See the |bigiq| and utility licensing documentation for information on SKU keywords.                                          |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| skuKeyword2        | string                                      |   No       |  The skuKeyword2 parameter for utility licensing (not necessary if using a registration key pool). See the |bigiq| and utility licensing documentation for information on SKU keywords.                                           |
+--------------------+---------------------------------------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| unitOfMeasure      | yearly, **monthly**, daily, hourly          |   No       |  The unit of measure used in utility licensing (not necessary if using a registration key pool). See the |bigiq| and utility licensing documentation for information on the units of measure.                                     |
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


Again, for the full BIG-IQ Licensing example declaration, see :ref:`bigiq1` and :ref:`bigiq2`.

See :doc:`bigiq-examples` for additional example declarations.

|

.. _revoke-main:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to revoke a license using Declarative Onboarding is available in version 1.3.0 and later.

Revoking a license from a BIG-IP with BIG-IQ
============================================

If you are using Declarative Onboarding 1.3.0 or later, you can use a declaration to revoke a license from a BIG-IP VE that was issued from a BIG-IQ license pool, and optionally relicense the BIG-IP VE with a new license.

.. IMPORTANT:: If the BIG-IP is not reachable from the BIG-IQ ("reachable": false), you must use **overwrite** if you want to relicense a BIG-IP VE (as the BIG-IP will not know the license was revoked). 

To revoke a license, use the **revokeFrom** property in the License class as described in this section.


Revoking a license without relicensing
--------------------------------------
If you want to revoke a license from a BIG-IP and not supply a new license, you simply add the **revokeFrom** property with name of the license pool to the license class.  For example ``"revokeFrom": "myPool"``.

So the entire license class might look like the following:

.. code-block:: javascript
   :emphasize-lines: 7

   "myLicense": {
            "class": "License",
            "licenseType": "licensePool",
            "bigIqHost": "10.0.1.200",
            "bigIqUsername": "admin",
            "bigIqPassword": "foofoo",
            "revokeFrom": "myPool",
            "reachable": false
        },

This revokes the license from the BIG-IP VE, and leaves it in an unlicensed state.

Revoking a license and relicensing a BIG-IP from a different license pool
-------------------------------------------------------------------------
If you want to revoke a license from a BIG-IP and give the BIG-IP a new license from a *different license pool*, you add the revokeFrom property with some additional information, depending on whether your BIG-IP VEs are reachable or not.  There is one additional example if you are relicensing a BIG-IP VE using a **new** BIG-IQ device.

Relicensing a BIG-IP (with route)
`````````````````````````````````
If you want to relicense a BIG-IP VE that is reachable from the BIG-IQ device, in your *reachable* declaration you simply add the **revokeFrom** property with name of the license pool you want to revoke the license from (for example ``"revokeFrom": "myPool"``). In the licensePool property, use the new license pool from which you want to give the BIG-IP a license.


So the entire license class might look like the following:

.. code-block:: javascript
   :emphasize-lines: 7-8

   "myLicense": {
        "class": "License",
        "licenseType": "licensePool",
        "bigIqHost": "10.0.1.200",
        "bigIqUsername": "admin",
        "bigIqPassword": "foofoo",
        "licensePool": "myOtherPool",
        "revokeFrom": "myPool",
        "skuKeyword1": "key1",
        "skuKeyword2": "key2",
        "unitOfMeasure": "hourly",
        "reachable": true,
        "bigIpUsername": "admin",
        "bigIpPassword": "barbar"
    },

This revokes the license from the BIG-IP VE from the **myPool** license pool and relicenses it using the **myOtherPool** license pool.


Relicensing a BIG-IP (no route)
```````````````````````````````
If you want to relicense a BIG-IP VE that is **unreachable** from the BIG-IQ device, in your *unreachable* declaration you must also use the **overwrite** property (``"overwrite": true``) in addition to the **revokeFrom** property with name of the license pool you want to revoke the license from (for example ``"revokeFrom": "myPool"``). In the licensePool property, use the new license pool from which you want to give the BIG-IP a license.


So the entire license class might look like the following:

.. code-block:: javascript
   :emphasize-lines: 6-7, 14

    "myLicense": {
            "class": "License",
            "licenseType": "licensePool",
            "bigIqHost": "10.0.1.200",
            "bigIqUsername": "admin",
            "bigIqPassword": "foofoo",
            "licensePool": "myOtherPool",
            "revokeFrom": "myPool",
            "skuKeyword1": "key1",
            "skuKeyword2": "key2",
            "unitOfMeasure": "hourly",
            "reachable": false,
            "hypervisor": "vmware",
            "overwrite": true
        },

This revokes the license from the BIG-IP VE from the **myPool** license pool and relicenses it using the **myOtherPool** license pool (while telling the BIG-IP VE to overwrite the existing license).


Relicensing a BIG-IP (no route) using a different BIG-IQ device
```````````````````````````````````````````````````````````````
This section shows how to relicense a BIG-IP VE that is **unreachable**, AND you are using a different BIG-IQ device than the one you used to initially license the BIG-IP device. In this case, you also use the **revokeFrom** property, but you supply information about the BIG-IQ device you used to license the BIG-IP.  You must also use the **overwrite** property (``"overwrite": true``) in addition to the **revokeFrom** property. 

For example, to revoke a license issued from the BIG-IQ at 10.0.2.200 and re-license with a license from the BIG-IQ at 10.0.1.200, the entire license class might look like the following:

.. code-block:: javascript
   :emphasize-lines: 8-14, 20

    "myLicense": {
            "class": "License",
            "licenseType": "licensePool",
            "bigIqHost": "10.0.1.200",
            "bigIqUsername": "admin",
            "bigIqPassword": "foofoo",
            "licensePool": "myPool",
            "revokeFrom": {
                "bigIqHost": "10.0.2.200",
                "bigIqUsername": "admin",
                "bigIqPassword": "barbar",
                "licensePool": "myPool",
                "reachable": false
            },
            "skuKeyword1": "key1",
            "skuKeyword2": "key2",
            "unitOfMeasure": "hourly",
            "reachable": false,
            "hypervisor": "vmware",
            "overwrite": true
        },

This revokes the license from the BIG-IP VE from the **myPool** license pool from the initial BIG-IQ device, and relicenses it using the **myPool** license pool on the new BIG-IQ device on which you are composing this declaration (while telling the BIG-IP VE to overwrite the existing license).


.. |bigiq| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-iq-centralized-mgmt/manuals/product/big-iq-centralized-management-device-6-1-0/04.html" target="_blank">BIG-IQ</a>


.. |br| raw:: html
   
   <br />

.. |compat| raw:: html

   <a href="https://support.f5.com/csp/article/K54909607" target="_blank">K54909607</a>
