.. _composing:  


Composing a Declarative Onboarding Declaration
----------------------------------------------

The most important part of using Declarative Onboarding is creating a declaration that includes the BIG-IP objects you want the system to configure.    See :ref:`examples` and :ref:`schema-reference` for sample declarations and further information.

To submit an Declarative Onboarding declaration, use a specialized RESTful API client such as Postman or a universal client such as cURL.

To transmit the declaration, you POST the declaration to the URI ``<BIG-IP IP address>/mgmt/shared/declarative-onboarding``.


In this section, we break down an example declaration and describe its parts. 

.. TIP:: For a complete list of options in a declaration, see :ref:`schema-reference`.  

If you want to try this sample declaration now, jump to :doc:`quick-start`.

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
        "label": "my BIG-IP declaration for declarative onboarding",
        "Common": {
            "class": "Tenant",
            "hostname": "bigip.example.com",
        
        
|

+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                      | Description/Notes                                                                                                     |
+====================+==============================================+=======================================================================================================================+
| schemaVersion      | string for version number                    | Version of Declarative Onboarding schema this declaration uses.                                                       |
+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+
| class              | Device                                       | Indicates this JSON document is a Device declaration                                                                  |
+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+
| label              | string                                       | Optional friendly label for this declaration                                                                          |
+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+
| class              | Tenant                                       | Specifies the class for Common is a tenant. The name must be Common as in line 5 (RIGHT?)                             |
+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+
| hostname           | string                                       | Hostname you want to set for this BIG-IP device                                                                       |
+--------------------+----------------------------------------------+-----------------------------------------------------------------------------------------------------------------------+

.. _system-comps:

System components
`````````````````
The next section of the declaration is a part of the Common tenant, and contains system-level objects such as license information.

.. code-block:: javascript
   :linenos:
   :lineno-start: 8

    
    "myLicense": {
        "class": "License",
        "licenseType": "regKey",
        "regKey": "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEE"
    },
    "myProvisioning": {
            "class": "Provision",
            "ltm": "nominal"
            "gtm": "minimal"
    },
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
    "myNtp": {
        "class": "NTP",
        "servers": [
            "0.pool.ntp.org",
            "1.pool.ntp.org"
        ],
        "timezone": "UTC"
    },
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

+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                                    | Description/Notes                                                                                                                                                                          |
+====================+============================================================================================================================================+============================================================================================================================================================================================+
| class              | License                                                                                                                                    | Indicates that this property contains licensing information                                                                                                                                |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| licenseType        | regKey, licensePool                                                                                                                        | Indicates the type of license. You can use an F5 registration key, or the name of a license pool on a BIG-IQ from which a license should be obtained                                       |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| regKey             | string                                                                                                                                     | The valid F5 registration key to license this BIG-IP                                                                                                                                       |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| class              | Provision                                                                                                                                  | Hostname you want to set for this BIG-IP device                                                                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| <module>:<level>   | Modules: class, afm, am, apm, asm, avr, dos, fps, gtm, ilx, lc, ltm, pem, swg, urldb  |br| Level: dedicated, nominal, minimum, none        | Individually list the modules you want to provision on this BIG-IP and the level of licensing for each module. Your BIG-IP must have enough memory and space for the modules you provision |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| class              | DNS                                                                                                                                        | The DNS class contains the DNS settings for the BIG-IP system                                                                                                                              |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| nameServers        | string                                                                                                                                     | NameServers contain the IP address(es) of name servers to use for DNS, and can be either IPv4 or IPv6 addresses                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| class              | NTP                                                                                                                                        | The NTP class contains the network time protocol settings for the BIG-IP system                                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| servers            | string                                                                                                                                     | servers contain the IP address(es) or host name(s) of the NTP servers to use.  IP addresses can be either IPv4 or IPv6 addresses.                                                          |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| timezone           | string                                                                                                                                     | The timezone you want to set for the BIG-IP system                                                                                                                                         |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| class              | User                                                                                                                                       | The NTP class contains the network time protocol settings for the BIG-IP system                                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| userType           | root, regular (any non-root user)                                                                                                          | The type of user you want to add. Use **regular** for any non-root user                                                                                                                    |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| oldPassword        | string (for root user only)                                                                                                                | The existing root password.  By default on a new BIG-IP, the root password is **default**                                                                                                  |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| password           | string                                                                                                                                     | The password you want to set for the user                                                                                                                                                  |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| shell              | tmsh, bash                                                                                                                                 | The shell you want the user to be able to use. The default is tmsh.                                                                                                                        |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| partitionAccess    | object (this object must contain a partition and user role)                                                                                | PartitionAccess allows you to restrict non-root users to a partition (tenant) and role on the BIG-IP. The first line under partitionAccess must contain the name of the partition          |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| role               | admin, auditor, guest, manager, operator, user-manager, application-editor, certificate-manager, irule-manager, no-access, resource-admin  | The BIG-IP user role you want to assign to the user.  See |user| for information on specific user roles.                                                                                   |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


See :doc:`examples` to see the default values Declarative Onboarding uses behind the scenes, and the Reference section for a list of all possible parameters you can use in your declarations.
 

.. |user| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0.html" target="_blank">User Role documentation</a>


.. |br| raw:: html
   
   <br />
