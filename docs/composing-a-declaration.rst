.. _composing:  


Composing a Declarative Onboarding Declaration
----------------------------------------------

The most important part of using Declarative Onboarding is creating a declaration that includes the BIG-IP objects you want the system to configure.    See :ref:`examples` and :ref:`schema-reference` for sample declarations and further information.

To submit an Declarative Onboarding declaration, use a specialized RESTful API client such as Postman or a universal client such as cURL.

To transmit the declaration, you POST the declaration to the URI ``<BIG-IP IP address>/mgmt/shared/declarative-onboarding``.


In this section, we break down an example declaration and describe its parts. 



Sample declaration
~~~~~~~~~~~~~~~~~~

In this declaration, we 

In the following declaration, we include 

We break down the components in the following sections.

.. literalinclude:: examples/example_01.json
   :language: json
   :linenos:


|

Components of the declaration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
The following sections break down the example into parts so you can understand how to compose a declaration. The tables below the examples contains descriptions and options for the parameters included in the example only.  

If there is a default value, it is shown in bold in the Options column.  

.. NOTE:: Declarative Onboarding contains many more options, see :ref:`schema-reference` for details.

.. _base-comps:

Base components
```````````````
The first few lines of your declaration are a part of the base components and define top-level options. 

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
| async              | true, **false**                |   No       |  If true, async tells the API to return a 202 HTTP status before processing is complete. User must then poll for status using GET. |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| label              | string                         |   No       |  Optional friendly label for this declaration.                                                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


.. _common-class:

Common class
````````````
The next lines of the declaration set the partition (tenant) on the BIG-IP in which all other objects are placed.  This **must** be Common.  All of the other parameters in Declarative Onboarding are under this Common class. 

While not strictly required, you must include Common and the tenant class to set any other parameters in Declarative Onboarding; therefore the required column is set to Yes for the Tenant class.

.. NOTE:: For the rest of the classes on this page, the required column applies only if you are using this class.

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
The next lines of the declaration set the licencing options if you are using an F5 Bring Your Own License (BYOL). If your BIG-IP system already has a license (for example, you are using a pay-as-you-go (PAYG) license), you do not need this class. Contact your F5 sales representative if you require a license.

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


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | License                        |   Yes      | Indicates that this property contains licensing information.                                                                       |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | regKey                         |   Yes      | Indicates the type of license. Currently Declarative Onboarding only supports regKey (an F5 registration key)                      |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| reKey              | string                         |   Yes      | The valid F5 registration key to license this BIG-IP                                                                               |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

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
| nameServers        | string                         |   No       | The nameServers property contains the IP address(es) of name servers to use for DNS, and can be either IPv4 or IPv6 addresses.     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| search             | string                         |   No       | The search domain(s) you want to use for DNS. This must be in hostname format.                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

.. _ntp-class:

NTP class
`````````
The next lines of the declaration set the NTP (network time protocol) options on the BIG-IP system. 

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
| servers            | string                         |   No       | The servers property contain the IP address(es) or host name(s) of the NTP servers you want the BIG-IP to use. IP addresses can be either IPv4 or IPv6 addresses.  |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| timezone           | string                         |   No       |  The timezone you want to set on the BIG-IP system.                                                                                                                |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.


.. _user-class:

User class
``````````
The next lines of the declaration create (or modify) the users and their associated roles and access control. 

If you are modifying the root password, you must supply the existing root password (**default** on a new BIG-IP). All other user accounts, including admin, do not have this requirement.


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
    "anotherUser": {
        "class": "User",
        "userType": "regular",
        "password": "foobar",
        "partitionAccess": {
            "Common": {
                "role": "guest"
            }
        }
    },
        
|


+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                                    | Required*? |  Description/Notes                                                                                                                                                                 |
+====================+============================================================================================================================================+============+====================================================================================================================================================================================+
| class              | User                                                                                                                                       | Yes        | Indicates that this property contains user information.                                                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| userType           | root, regular (any non-root user)                                                                                                          | No         | The type of user you want to add. Use **regular** for any non-root user                                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| oldPassword        | string                                                                                                                                     | Yes (root) | The existing root password.  By default on a new BIG-IP, the root password is **default**. For root user only.                                                                     |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| newPassword        | string                                                                                                                                     | Yes (root) | The new root password.  For root user only.                                                                                                                                        |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| password           | string                                                                                                                                     | Yes        | The password you want to set for the user.                                                                                                                                         |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| partitionAccess    | object (must contain a partition and role)                                                                                                 | No         |  PartitionAccess allows you to restrict non-root users to a partition (tenant) and role on the BIG-IP. The first line under partitionAccess must contain the name of the partition.|
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| role               | admin, auditor, guest, manager, operator, user-manager, application-editor, certificate-manager, irule-manager, no-access, resource-admin  | Yes        | The BIG-IP user role you want to assign to the user.  See |user| for information on specific user roles.  Required if you are using partitionAccess.                               |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| shell              | **tmsh**, bash                                                                                                                             | Yes        | The shell you want the user to be able to use. The default is tmsh.                                                                                                                |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.


.. _provision-class:

Provision class
```````````````
The next lines of the declaration set the NTP (network time protocol) options on the BIG-IP system. 

The name *myProvisioning* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 46


    "myProvisioning": {
            "class": "Provision",
            "ltm": "nominal"
            "gtm": "minimal"
    },
    
        
|


+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                             | Required*? |  Description/Notes                                                                                                                                                 |
+====================+=====================================================================================================================================+============+====================================================================================================================================================================+
| class              | Provision                                                                                                                           |   Yes      | Indicates that this property contains provisioning information.                                                                                                    |
+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| <module>:<level>   | Modules: class, afm, am, apm, asm, avr, dos, fps, gtm, ilx, lc, ltm, pem, swg, urldb  |br| Level: dedicated, nominal, minimum, none |   Yes      | The servers property contain the IP address(es) or host name(s) of the NTP servers you want the BIG-IP to use. IP addresses can be either IPv4 or IPv6 addresses.  |
+--------------------+-------------------------------------------------------------------------------------------------------------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

.. _vlan-class:

VLAN class
``````````
The next lines of the declaration configure VLANs on the BIG-IP system. 

The name *myProvisioning* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object however you'd like, but it must have a name.


.. code-block:: javascript
   :linenos:
   :lineno-start: 46

    "myVlan": {
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


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | VLAN                           |   Yes      |  Indicates that this property contains VLAN configuration.                                                                         |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| tag                | integer                        |   No       |  Tag for the VLAN.  Must be a minumum of 1 and a maximum of 4094.                                                                  |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| mtu                | integer                        |   No       |  The maximum transmission unit (mtu) for the VLAN. Must be a minimum of 576 and a maximum of 9198                                  |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| interfaces         | string                         |   Yes      |  Interfaces for the VLAN.                                                                                                          |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| name               | string                         |   Yes      |  The name for the interace, such as 1.1 or 1.2.                                                                                    |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| tagged             | true, false                    |   No       |  Specifies whether or not the interface is tagged. Default is true if a VLAN tag is provided, otherwise false.                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.



        "mySelfIp": {
            "class": "SelfIp",
            "address": "1.2.3.4/24",
            "vlan": "myVlan",
            "allowService": "all",
            "floating": true
        },
        "myRoute": {
            "class": "Route",
            "gw": "10.1.20.1",
            "network": "default",
            "mtu": 0
        }
    }
}
    
       


See :doc:`examples` to see the default values Declarative Onboarding uses behind the scenes, and the Reference section for a list of all possible parameters you can use in your declarations.
 

.. |user| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0.html" target="_blank">User Role documentation</a>


.. |br| raw:: html
   
   <br />
