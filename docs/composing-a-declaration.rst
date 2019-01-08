.. _composing:  


Composing a Declarative Onboarding declaration for a standalone BIG-IP
======================================================================

The most important part of using Declarative Onboarding is creating a declaration that includes the BIG-IP objects you want the system to configure.    

To submit an Declarative Onboarding declaration, use a specialized RESTful API client such as Postman or a universal client such as cURL.

To transmit the declaration, you POST the declaration to the URI ``<BIG-IP IP address>/mgmt/shared/declarative-onboarding``.  If you are using a single NIC BIG-IP, include port 8443: ``<BIG-IP IP address>:8443/mgmt/shared/declarative-onboarding``

.. TIP:: You can use GET to the URI ``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` to track whether a declaration is successful or get information on why it failed.

In this section, we first show the sample declaration, and then we break it down and describe its parts. If you are unfamiliar with any of the BIG-IP terminology, see the `F5 Knowledge Center <https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20LTM&version=13.1.0>`_.



Sample declaration for a standalone BIG-IP
------------------------------------------

In this section, we show an example of a standalone (non-clustered) declaration which configures some common system and networking components on the BIG-IP system.  To see an example of the parts of a declaration that onboards a cluster of BIG-IPs, see :doc:`clustering`. To see how to use BIG-IQ to license your BIG-IP VEs, see :doc:`big-iq-licensing`.

This example is the entire declaration.  The following sections break down each class of this example declaration. 


.. literalinclude:: examples/example_01.json
   :language: json
   :linenos:


|

Components of the declaration
-----------------------------
In this section, we break down the example into each class so you can understand the options when composing your declaration. The tables below the examples contain descriptions and options for the parameters included in the example only.  

If there is a default value, it is shown in bold in the Options column.  

Use the index in the left pane if you want to go directly to a particular class.

.. _base-comps:

Base components
```````````````
The first few lines of your declaration are a part of the base components and define top-level options. When you POST a declaration, depending on the complexity of your declaration and the modules you are provisioning, it may take some time before the system returns a success message.  You can use the property **"async": "true",** in your declaration, and then use GET to poll for status.

.. code-block:: javascript
   :linenos:


    {
        "schemaVersion": "1.0.0",
        "class": "Device",
        "async": "true",
        "label": "my BIG-IP declaration for declarative onboarding",
        
        
        
        
|

+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required?  |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| schemaVersion      | string for version number      |   Yes      |  Version of Declarative Onboarding schema this declaration uses.                                                                   |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| class              | Device                         |   Yes      |  Indicates this JSON document is a Device declaration.                                                                             |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| async              | true, **false**                |   No       |  If true, async tells the API to return a 202 HTTP status before processing is complete. You can then poll for status using GET.   |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| label              | string                         |   No       |  Optional friendly label for this declaration.                                                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


.. _common-class:

Common class
````````````
The next lines of the declaration set the partition (tenant) on the BIG-IP in which all other objects are placed.  This **must** be Common.  All of the other parameters in Declarative Onboarding are under this Common class. 

While not strictly required, you must include Common and the tenant class to set any other parameters in Declarative Onboarding; therefore the required column is set to Yes for the Tenant class.

.. NOTE:: For the rest of the classes on this page, the required column in the tables applies only if you are using the class in the heading.  None of the classes are required.

.. code-block:: javascript
   :linenos:
   :lineno-start: 6


    "Common": {
        "class": "Tenant",
        "hostname": "bigip.example.com",
    
        
|


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | Tenant                         |   Yes      |  Specifies the class for Common is a tenant. The name must be **Common** as in line 6.                                             |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| hostname           | string                         |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _license-class:

License class
`````````````
The next lines of the declaration set the licensing options if you are using an F5 Bring Your Own License (BYOL). If your BIG-IP system already has a license (for example, you are using a pay-as-you-go (PAYG) license), you do not need this class. Contact your F5 sales representative if you require a license.

The name *myLicense* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 9


    "myLicense": {
        "class": "License",
        "licenseType": "regKey",
        "regKey": "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEE"
    },
        
|


+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                                                |
+====================+================================+============+===================================================================================================================================================================+
| class              | License                        |   Yes      | Indicates that this property contains licensing information.                                                                                                      |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | regKey, licensePool            |   Yes      | Indicates the type of license. This page only contains regKey (an F5 registration key) information.  See :ref:`bigiqdec` for information on BIG-IQ License Pools. |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| reKey              | string                         |   Yes      | The valid F5 registration key to license this BIG-IP                                                                                                              |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| addOnKeys          | array of strings               |   No       |  Any Add On keys for licensing this BIG-IP (not shown in the example)                                                                                             |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| overwrite          | true, **false**                |   No       |  Whether or not to overwrite the license if the device is already licensed (not shown in the example)                                                             |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _dns-class:

DNS class
`````````
The next lines of the declaration set the DNS options on the BIG-IP system. 

The name *myDNS* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 14


    "myDns": {
        "class": "DNS",
        "nameServers": [
            "8.8.8.8",
            "2001:4860:4860::8844"
        ],
        "search": [
            "f5.com"
        ]
    },
        
|


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | DNS                            |   Yes      | Indicates that this property contains DNS information.                                                                             |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| nameServers        | array of strings               |   No       | The nameServers property contains the IP address(es) of name servers to use for DNS, and can be either IPv4 or IPv6 addresses.     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| search             | array of strings               |   No       | The search domain(s) you want to use for DNS. This must be in hostname format.                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

.. _ntp-class:

NTP class
`````````
The next lines of the declaration set the NTP (network time protocol) options on the BIG-IP. 

The name *myNTP* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 24


    "myNtp": {
        "class": "NTP",
        "servers": [
            "0.pool.ntp.org",
            "1.pool.ntp.org"
        ],
        "timezone": "UTC"
    },
        
|


+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                                                 |
+====================+================================+============+====================================================================================================================================================================+
| class              | NTP                            |   Yes      | Indicates that this property contains NTP information.                                                                                                             |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| servers            | array of strings               |   No       | The servers property contain the IP address(es) or host name(s) of the NTP servers you want the BIG-IP to use. IP addresses can be either IPv4 or IPv6 addresses.  |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| timezone           | string                         |   No       |  The timezone you want to set on the BIG-IP system.                                                                                                                |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _user-class:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The options **all-partitions** for partitionAccess and **none** for shell access are available in Declarative Onboarding 1.1.0 and later.

User class
``````````
The next lines of the declaration create (or modify) the users and their associated roles and access control. 

If you are modifying the root password, you must supply the existing root password (**default** on a new BIG-IP). All other user accounts, including admin, do not have this requirement. As mentioned in the :ref:`prereqs`, if you are using BIG-IP v14.0 or later, the root password may be the same as your admin password you reset before installing Declarative Onboarding. 


.. code-block:: javascript
   :linenos:
   :lineno-start: 32


    "root": {
        "class": "User",
        "userType": "root",
        "oldPassword": "default",
        "newPassword": "myNewPass1word"
    },
    "admin": {
        "class": "User",
        "userType": "regular",
        "password": "asdfjkl",
        "shell": "bash"
    },
    "guestUser": {
        "class": "User",
        "userType": "regular",
        "password": "guestNewPass1",
        "partitionAccess": {
            "Common": {
                "role": "guest"
            }
        }
    },
    "anotherUser": {
        "class": "User",
        "userType": "regular",
        "password": "myPass1word",
        "shell": "none",
        "partitionAccess": {
            "all-partitions": {
                "role": "guest"
            }
        }
    },
        
|


+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                                    | Required*? |  Description/Notes                                                                                                                                                                                                                              |
+====================+============================================================================================================================================+============+=================================================================================================================================================================================================================================================+
| class              | User                                                                                                                                       | Yes        | Indicates that this property contains user information.                                                                                                                                                                                         |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| userType           | root, regular (any non-root user)                                                                                                          | Yes        | The type of user you want to add. Use **regular** for any non-root user                                                                                                                                                                         |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| oldPassword        | string  (root only)                                                                                                                        | Yes (root) | The existing root password.  By default on a new BIG-IP, the root password is **default**. For root user only.                                                                                                                                  |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| newPassword        | string  (root only)                                                                                                                        | Yes (root) | The new root password.  For root user only.                                                                                                                                                                                                     |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| password           | string  (non-root only)                                                                                                                    | Yes        | The password you want to set for the non-root user.                                                                                                                                                                                             |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| partitionAccess    | object (must contain a partition and role)                                                                                                 | No         | PartitionAccess allows you to restrict non-root users to a partition (only Common in v1.0.0, Common or All Partitions in v1.1.0 and later) and role on the BIG-IP. The first line under partitionAccess must contain the name of the partition. |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| role               | admin, auditor, guest, manager, operator, user-manager, application-editor, certificate-manager, irule-manager, no-access, resource-admin  | Yes        | The BIG-IP user role you want to assign to the user.  See |user| for information on specific user roles.  Required if you are using partitionAccess.                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| shell              | **tmsh**, bash, none   (non-root only)                                                                                                     | No         | The shell you want the user to be able to use. The default is tmsh. In Declarative Onboarding 1.1.0 and later, you can use **none** when creating non-root users.                                                                               |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
 

\* The required column applies only if you are using this class.


.. _provision-class:

Provision class
```````````````
The next lines of the declaration set the provisioning options on the BIG-IP.  For information on the available modules, see |f5|, and for information on provisioning levels, see |prov|. By default, the BIG-IP has the Local Traffic Manager (ltm) provisioned as nominal.

The name *myProvisioning* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 65


    "myProvisioning": {
            "class": "Provision",
            "ltm": "nominal",
            "gtm": "minimum"
    },
    
        
|


+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                             | Required*? |  Description/Notes                                                                                                                                                                                               |
+====================+=====================================================================================================================================+============+==================================================================================================================================================================================================================+
| class              | Provision                                                                                                                           |   Yes      | Indicates that this property contains provisioning information.                                                                                                                                                  |
+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| <module>:<level>   | Modules: class, afm, am, apm, asm, avr, dos, fps, gtm, ilx, lc, ltm, pem, swg, urldb  |br| Level: dedicated, nominal, minimum, none |   Yes      | Individually list the modules you want to provision on this BIG-IP and the level of licensing for each module. Your BIG-IP must have enough memory and space for the modules you provision.                      |
+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

.. _vlan-class:

VLAN class
``````````
The next lines of the declaration configure VLANs on the BIG-IP system. In this case, the name you give the VLAN class is used for the name of the VLAN on the BIG-IP.



.. code-block:: javascript
   :linenos:
   :lineno-start: 70

    "external": {
        "class": "VLAN",
        "tag": 1234,
        "mtu": 1500,
        "interfaces": [
            {
                "name": "1.1",
                "tagged": true
            }
        ]
    },
    "internal": {
        "class": "VLAN",
        "tag": 4093,
        "mtu": 1500,
        "interfaces": [
            {
                "name": "1.2",
                "tagged": true
            }
        ]
    },


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | VLAN                           |   Yes      |  Indicates that this property contains VLAN configuration.                                                                         |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| tag                | integer                        |   No       |  Tag for the VLAN.  Must be a minimum of 1 and a maximum of 4094.                                                                  |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| mtu                | integer                        |   No       |  The maximum transmission unit (mtu) for the VLAN. Must be a minimum of 576 and a maximum of 9198                                  |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| interfaces         | string                         |   Yes      |  Interfaces for the VLAN.                                                                                                          |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| name               | string                         |   Yes      |  The name for the interface, such as 1.1 or 1.2.                                                                                   |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| tagged             | true, false                    |   No       |  Specifies whether or not the interface is tagged. Default is true if a VLAN tag is provided, otherwise false.                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

.. _selfip-class:

Self IP class
`````````````
The next lines of the declaration configure self IP address(es) on the BIG-IP system. In this case, the name you give the Self IP class is used for the name of the Self IP on the BIG-IP.


.. code-block:: javascript
   :linenos:
   :lineno-start: 92

    "external-self": {
        "class": "SelfIp",
        "address": "1.2.3.4/24",
        "vlan": "external",
        "allowService": "default",
        "trafficGroup": "traffic-group-local-only"
    },
    "internal-self": {
        "class": "SelfIp",
        "address": "10.10.0.100/24",
        "vlan": "internal",
        "allowService": "default",
        "trafficGroup": "traffic-group-local-only"
    },


+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                  | Required*? |  Description/Notes                                                                                                                 |
+====================+==========================================================+============+====================================================================================================================================+
| class              | SelfIp                                                   |   Yes      |  Indicates that this property contains self IP configuration.                                                                      |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| address            | string (IPv4/IPv6 address, optional %RD and/or /masklen) |   Yes      |  IP address you want to use for the self IP address. You can optionally include a route domain and/or a mask length.               |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| vlan               | string                                                   |   Yes      |  The VLAN to which the self IP should be associated. This field should match any VLANs you are including in this declaration.      |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| allowService       | all, none, **default**, or array of <service:port>       |   No       |  Specifies which services (ports) to allow on the self IP.                                                                         |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| trafficGroup       | **traffic-group-local-only**, traffic-group-1            |   No       |  Traffic group for the Self IP.                                                                                                    |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.


.. _route-class:

Route class
```````````
The next lines of the declaration configure routes on the BIG-IP system.   In this case, the name you give the Route class is used for the name of the route on the BIG-IP.


.. code-block:: javascript
   :linenos:
   :lineno-start: 106

        "myRoute": {
                "class": "Route",
                "gw": "1.2.3.254",
                "network": "default",
                "mtu": 0
            }
        }
    },


+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                   | Required*? |  Description/Notes                                                                                                                 |
+====================+===========================================================================================+============+====================================================================================================================================+
| class              | Route                                                                                     |   Yes      |  Indicates that this property contains route configuration.                                                                        |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| gw                 | string (IPv4 or IPv6 address)                                                             |   Yes      |  Gateway for the route.                                                                                                            |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| network            | string (IPv4/IPv6 address, optional %RD and/or /masklen), **default**, or default-inet6   |   No       |  IP address/netmask for route.  The default network is **default**.                                                                |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| mtu                | integer                                                                                   |   No       |  The maximum transmission unit (mtu) for the VLAN. Must be a minimum of 0 and a maximum of 9198.                                   |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+



\* The required column applies only if you are using this class.


.. _dbvars-class:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for database variables is available in Declarative Onboarding 1.1.0 and later.


DB Variable class
`````````````````
The next lines of the declaration enable the ability to set arbitrary database variables in a declaration. You simply supply a name and a value for the database variable you want to use.

|


.. code-block:: javascript
   :linenos:
   :lineno-start: 112

        "dbvars": {
            "class": "DbVariables",
            "ui.advisory.enabled": true,
            "ui.advisory.color": "green",
            "ui.advisory.text": "/Common/hostname"
        },

       

+----------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter            | Options                                                                                   | Required*? |  Description/Notes                                                                                                                 |
+======================+===========================================================================================+============+====================================================================================================================================+
| class                | DbVariables                                                                               |   Yes      |  Indicates that this property contains global db variable configuration.                                                           |
+----------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| propertyNames        | string                                                                                    |   Yes      |  The name of the db variable.                                                                                                      |
+----------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| additionalProperties | string                                                                                    |   Yes      |  The value to set for the db variable.                                                                                             |
+----------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.
 

.. |user| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0.html" target="_blank">User Role documentation</a>


.. |br| raw:: html
   
   <br />

.. |prov| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-essentials-13-1-0/7.html" target="_blank">Provisioning Levels</a>




.. |f5| raw:: html

   <a href="https://www.f5.com/products" target="_blank">F5 product modules</a>
