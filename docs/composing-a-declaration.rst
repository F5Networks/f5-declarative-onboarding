.. _composing:  


Composing a Declarative Onboarding declaration for a standalone BIG-IP
======================================================================

The most important part of using Declarative Onboarding is creating a declaration that includes the BIG-IP objects you want the system to configure.    

To submit an Declarative Onboarding declaration, use a specialized RESTful API client such as Postman or a universal client such as cURL.

To transmit the declaration, you POST the declaration to the URI ``<BIG-IP IP address>/mgmt/shared/declarative-onboarding``.  If you are using a single NIC BIG-IP, include port 8443: ``<BIG-IP IP address>:8443/mgmt/shared/declarative-onboarding``

.. TIP:: You can use GET to the URI ``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` to track whether a declaration is successful or get information on why it failed.

In this section, we first show the sample declaration, and then we break it down and describe its parts. If you are unfamiliar with any of the BIG-IP terminology, see the `F5 Knowledge Center <https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20LTM&version=13.1.0>`_.

Additionally, see :doc:`json-pointers` for information on using JSON/Declarative Onboarding pointers in your declaration.

To see how to use BIG-IQ to license your BIG-IP VEs, see :doc:`big-iq-licensing`.  

.. IMPORTANT:: Domain name resolution is used anywhere the declaration accepts a hostname. DO makes sure that any hostnames are resolvable and fails if they are not. The exception is deviceGroup.members, which do not require hostname resolution as they have been added to the trust)



Sample declaration for a standalone BIG-IP
------------------------------------------

In this section, we show an example of a standalone (non-clustered) declaration which configures some common system and networking components on the BIG-IP system.  To see an example of the parts of a declaration that onboards a cluster of BIG-IPs, see :doc:`clustering`. 

.. TIP:: There may be additional properties available in some of the classes.  Be sure to see the :doc:`schema-reference` and :doc:`examples` for detailed information on each class and their associated properties. 

This example is the entire declaration.  The following sections break down each class of this example declaration. 


.. literalinclude:: ../examples/onboard.json
   :language: json
   :linenos:


|

Components of the declaration
-----------------------------
In this section, we break down the example into each class so you can understand the options when composing your declaration. The tables below the examples contain descriptions and options for the parameters included in the example only.  

If there is a default value, it is shown in bold in the Options column.  

.. TIP:: There may be additional properties available in some of the classes.  Be sure to see the :doc:`schema-reference` and :doc:`examples` for detailed information on each class and their associated properties. 

Use the index in the left pane if you want to go directly to a particular class.

.. _base-comps:

Base components
```````````````
The first few lines of your declaration are a part of the base components and define top-level options. When you POST a declaration, depending on the complexity of your declaration and the modules you are provisioning, it may take some time before the system returns a success message.  You can use the property **"async": "true",** in your declaration, and then use GET to poll for status.

For more information, see |deviceclass| in the Schema Reference.

.. code-block:: javascript
   :linenos:


    {
        "schemaVersion": "1.0.0",
        "class": "Device",
        "async": true,
        "webhook": "https://example.com/myHook",
        "label": "my BIG-IP declaration for declarative onboarding",
        
        
        
        
|

+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required?  |  Description/Notes                                                                                                                                                                                                                                                                   |
+====================+================================+============+======================================================================================================================================================================================================================================================================================+
| schemaVersion      | string for version number      |   Yes      |  Version of Declarative Onboarding schema this declaration uses.                                                                                                                                                                                                                     |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| class              | Device                         |   Yes      |  Indicates this JSON document is a Device declaration.                                                                                                                                                                                                                               |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| async              | true, **false**                |   No       |  If true, async tells the API to return a 202 HTTP status before processing is complete. You can then poll for status using GET.                                                                                                                                                     |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| webhook            | string (URL)                   |   No       |  DO v1.6.0 and later. You can optionally specify the URL for a webhook. Once the declaration is finished processing, DO POSTs the response message to the specified endpoint. This feature works both on declarations that require and do not require a reboot to finish processing. |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| label              | string                         |   No       |  Optional friendly label for this declaration.                                                                                                                                                                                                                                       |
+--------------------+--------------------------------+------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

|

**Example of the request sent to the webhook**

.. code-block:: shell

    POST / HTTP/1.1
    Content-Type: application/json

    {
        "id": "a54b479c-9233-4ac3-b7bd-42f9e6d6e8e7",
        "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/a54b479c-9233-4ac3-b7bd-42f9e6d6e8e7",
        "result": {
            "class": "Result",
            "code": 200,
            "status": "OK",
            "message": "success"
        },
        "declaration": {
            "schemaVersion": "1.0.0",
            "class": "Device",
            "webhook": "https://example.com/myHook",
            "async": false,
            "Common": {
                "class": "Tenant",
                "hostname": "bigip.example.com"
            }
        }
    }


|

.. _common-class:

Common class
````````````
The next lines of the declaration set the partition (tenant) on the BIG-IP in which all other objects are placed.  This **must** be Common.  All of the other parameters in Declarative Onboarding are under this Common class. 

While not strictly required, you must include Common and the tenant class to set any other parameters in Declarative Onboarding; therefore the required column is set to Yes for the Tenant class.

For more information, see |devicecommon| in the Schema Reference.

.. IMPORTANT:: If you set a hostname in the Common class, you cannot use the hostname property in the System class (introduced in DO 1.8.0). We recommend using the :ref:`system-class` for hostname (and have updated this example to move hostname to System).  

.. NOTE:: For the rest of the classes on this page, the required column in the tables applies only if you are using the class in the heading.  None of the classes are required.

.. code-block:: javascript
   :linenos:
   :lineno-start: 7


    "Common": {
        "class": "Tenant",
    
        
|


+--------------------+--------------------------------+------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                                                        |
+====================+================================+============+===========================================================================================================================================================================+
| class              | Tenant                         |   Yes      |  Specifies the class for Common is a tenant. The name must be **Common** as in line 6.                                                                                    |
+--------------------+--------------------------------+------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| hostname           | string                         |   No       |  Hostname you want to set for this BIG-IP device (if you did NOT set hostname in the System class). Hostname is not included in this example because it is set in System. |
+--------------------+--------------------------------+------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

|

.. _system-class:

System class
````````````
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **autoCheck** property is available in DO 1.13 and later. The **autoPhonehome** property is available in DO v1.10.0 and later.

The next lines of the declaration set the system-level options. This includes inactivity timeouts for CLI and Console sessions, and the ability to disable the phonehome property (see the table for details) in DO 1.10.0 and later. 

For more information, see |systemclass| in the Schema Reference. Also see :ref:`The System Class example<systemex>` for an example declaration.

.. IMPORTANT:: If you set a hostname in the Common class, you cannot use the hostname property in the System class. We recommend using the System class for hostname

The name *mySystem* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object anything, but it must have a name.

This snippet includes the **autoCheck** property which is not in the full declaration at the top of this page.

.. code-block:: javascript
   :linenos:
   :lineno-start: 9


    "mySystem": {
        "class": "System",
        "hostname": "bigip.example.com",
        "cliInactivityTimeout": 1200,
        "consoleInactivityTimeout": 1200,
        "autoCheck": false,
        "autoPhonehome": true
    }, 
    
|


+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                | Options         | Required*? |  Description/Notes                                                                                                                                                                                                                |
+==========================+=================+============+===================================================================================================================================================================================================================================+
| class                    | System          |   Yes      | Indicates that this property contains system information.                                                                                                                                                                         |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| cliInactivityTimeout     | integer         |   No       | Specifies automatic logout for idle users in TMSH interactive mode. A setting other than 0 automatically logs a user out after a specified number of seconds (multiples of 60). The default value 0 means that no timeout is set. |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| consoleInactivityTimeout | integer         |   No       | Specifies automatic logout for idle serial console sessions (command line sessions) in seconds. The default value 0 means that no timeout is set.                                                                                 |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| hostname                 | string          |   No       | Hostname (if you did NOT set hostname in the Common class) you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                                                                            |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoCheck                | **true**, false |   No       | Enables the BIG-IP system to check for and recommend software updates.  See |k15000| for more information.                                                                                                                        |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| autoPhonehome            | **true**, false |   No       | Enables the BIG-IP system to send non-confidential, high-level device information to F5 in order to help determine product usage to optimize product development. Choose False to disable sending this information to F5.         |
+--------------------------+-----------------+------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

|

.. _license-class:

License class
`````````````
The next lines of the declaration set the licensing options if you are using an F5 Bring Your Own License (BYOL). If your BIG-IP system already has a license (for example, you are using a pay-as-you-go (PAYG) license), you do not need this class. Contact your F5 sales representative if you require a license.

For more information and a full list of properties, see |licenseclass| in the Schema Reference.

The name *myLicense* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object anything, but it must have a name.

Declarative Onboarding 1.24 introduced the optional **chargebackTag** property, the value of which is a text string that can be used as a charge back tag, making it easier to track license costs.



.. code-block:: javascript
   :linenos:
   :lineno-start: 16


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
| chargebackTag      | string                         |   No       |  An optional string that can be used as a charge back tag (not shown in the example)                                                                              |
+--------------------+--------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+

\* The required column applies only if you are using this class.

|

.. _dns-class:

DNS class
`````````
The next lines of the declaration set the DNS options on the BIG-IP system. For more information, see |dnsclass| in the Schema Reference.

The name *myDNS* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object anything, but it must have a name.

.. IMPORTANT:: If you are configuring DNS in your declaration, Declarative Onboarding disables DHCP for DNS.


.. code-block:: javascript
   :linenos:
   :lineno-start: 21


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

|

.. _ntp-class:

NTP class
`````````
The next lines of the declaration set the NTP (network time protocol) options on the BIG-IP. For more information, see |ntpclass| in the Schema Reference.

The name *myNTP* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object anything, but it must have a name.

.. IMPORTANT:: If you are configuring NTP in your declaration, Declarative Onboarding disables DHCP for NTP.

For instructions on how to get a current list of timezones on the BIG-IP, see https://support.f5.com/csp/article/K9098.  To quickly view a static list that 


.. code-block:: javascript
   :linenos:
   :lineno-start: 31


    "myNtp": {
        "class": "NTP",
        "servers": [
            "0.pool.ntp.org",
            "1.pool.ntp.org",
            "2.pool.ntp.org"
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

|

.. _user-class:

User class
``````````
The next lines of the declaration create (or modify) the users and their associated roles and access control. For more information, see |userclass| in the Schema Reference.

If you are modifying the root password, you must supply the existing root password (**default** on a new BIG-IP). All other user accounts, including admin, do not have this requirement. As mentioned in the :ref:`prereqs`, if you are using BIG-IP v14.0 or later, the root password may be the same as your admin password you reset before installing Declarative Onboarding. 

.. IMPORTANT:: The following examples include passwords that may not be valid for BIG-IP v14.0 and later.  See |pass| for specific requirements.

The **keys** property is not included in the example at the top of this page, so the line numbers for this section will not line up with that example.




.. code-block:: javascript
   :linenos:
   :lineno-start: 40


    "root": {
        "class": "User",
        "userType": "root",
        "oldPassword": "default",
        "newPassword": "myNewPass1word",
        "keys": [
            "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwHJLJY+/U/ioAAAADAQABAAACAQCwHJLJY+z0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+1hx9wlSogXN6Co5zrtqlN8/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLz9/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== test2",
            "ssh-rsa AAAAB3NzaC1yc2EAu2Gr14xRiVLnG8KxNp2fO1/U/ioAz0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLzu2Gr14xRiVLnG8KxNp2fO19/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== test"
        ]

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
        },
        "keys": [
            "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCwHJLJY+/U/ioAAAADAQABAAACAQCwHJLJY+z0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+1hx9wlSogXN6Co5zrtqlN8/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLz9/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== test2",
            "ssh-rsa AAAAB3NzaC1yc2EAu2Gr14xRiVLnG8KxNp2fO1/U/ioAz0Rb85in7Ean6JS2J9dzo1nSssm7ZyQvGgc1e7EVtztbVpHThsvw92+/mvlQkRRQ+sp2To8PcSMeEVI+TqBOg6BWbwwNQLzu2Gr14xRiVLnG8KxNp2fO19/eUJq2o4vBfSpsn7GSDIf6C3F9EahRPGCR/z0kw5GZob3Q== test"
        ]
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
| newPassword        | string  (root only)                                                                                                                        | Yes (root) | The new root password.  For root user only.  See |pass| for requirements for BIG-IP 14.0 and later.                                                                                                                                             |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| password           | string  (non-root only)                                                                                                                    | Yes        | The password you want to set for the non-root user.   See |pass| for requirements for BIG-IP 14.0 and later.                                                                                                                                    |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| partitionAccess    | object (must contain a partition and role)                                                                                                 | No         | PartitionAccess allows you to restrict non-root users to a partition (only Common in v1.0.0, Common or All Partitions in v1.1.0 and later) and role on the BIG-IP. The first line under partitionAccess must contain the name of the partition. |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| role               | admin, auditor, guest, manager, operator, user-manager, application-editor, certificate-manager, irule-manager, no-access, resource-admin  | Yes        | The BIG-IP user role you want to assign to the user.  See |user| for information on specific user roles.  Required if you are using partitionAccess.                                                                                            |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| shell              | **tmsh**, bash, none   (non-root only)                                                                                                     | No         | The shell you want the user to be able to use. The default is tmsh. In Declarative Onboarding 1.1.0 and later, you can use **none** when creating non-root users.                                                                               |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| keys               | array of strings                                                                                                                           | No         | DO 1.5.0+ only: An array of public keys for the user. The authorized_keys file will be overwritten with this value (note default of []). If the user is root, the primary key will be preserved.  See :ref:`Keys example <keys>`                |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------+------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
 

\* The required column applies only if you are using this class.

|


.. _provision-class:

Provision class
```````````````
The next lines of the declaration set the provisioning options on the BIG-IP.  For information on the available modules, see |f5|, and for information on provisioning levels, see |prov|. By default, the BIG-IP has the Local Traffic Manager (ltm) provisioned as nominal. For more information, see |provisionclass| in the Schema Reference.

The name *myProvisioning* we use in this example is arbitrary; it is not used anywhere in the BIG-IP configuration. You can name this object anything, but it must have a name.

.. NOTE:: Provisioning CGNAT is currently only available in TMOS versions 15.0 and later. |br|  Provisioning SSL Orchestrator (SSLO) is available in DO 1.11 and later.



.. code-block:: javascript
   :linenos:
   :lineno-start: 73


    "myProvisioning": {
            "class": "Provision",
            "ltm": "nominal",
            "gtm": "minimum"
    },
    
        
|


+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                                                                                            | Required*? |  Description/Notes                                                                                                                                                                                               |
+====================+====================================================================================================================================================================+============+==================================================================================================================================================================================================================+
| class              | Provision                                                                                                                                                          |   Yes      | Indicates that this property contains provisioning information.                                                                                                                                                  |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| <module>:<level>   | Modules: class, afm, am, apm, asm, avr, dos, fps, gtm, ilx, lc, ltm, pem, swg, urldb, cgnat (v15+), sslo (DO 1.11+)  |br| Level: dedicated, nominal, minimum, none |   Yes      | Individually list the modules you want to provision on this BIG-IP and the level of licensing for each module. Your BIG-IP must have enough memory and space for the modules you provision.                      |
+--------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

|

.. _vlan-class:

VLAN class
``````````
The next lines of the declaration configure VLANs on the BIG-IP system. In this case, the name you give the VLAN class is used for the name of the VLAN on the BIG-IP. For more information, see |vlanclass| in the Schema Reference.

**New in DO 1.7.0 and later**
Declarative Onboarding v1.7.0 and later includes the **cmp-hash** property, which is not included in this example declaration.  For information on this property, see the table below the example, and :ref:`CMP Hash example<cmphash>`.



.. code-block:: javascript
   :linenos:
   :lineno-start: 78

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


+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                                                                                                                                                               |
+====================+================================+============+==================================================================================================================================================================================================================================================================================+
| class              | VLAN                           |   Yes      |  Indicates that this property contains VLAN configuration.                                                                                                                                                                                                                       |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| tag                | integer                        |   No       |  Tag for the VLAN.  Must be a minimum of 1 and a maximum of 4094. If set, the VLAN defaults the **tagged** parameter to **true**.                                                                                                                                                |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| mtu                | integer                        |   No       |  The maximum transmission unit (mtu) for the VLAN. Must be a minimum of 576 and a maximum of 9198.                                                                                                                                                                               |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| interfaces         | string                         |   Yes      |  Interfaces for the VLAN.                                                                                                                                                                                                                                                        |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| name               | string                         |   Yes      |  The name for the interface, such as 1.1 or 1.2.                                                                                                                                                                                                                                 |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| tagged             | true, false                    |   No       |  Specifies whether or not the interface is tagged. Default is true if a VLAN tag is provided, otherwise false.                                                                                                                                                                   |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| cmp-hash           | default, dst-ip, src-ip        |   No       |  This optional setting allows all connections from a client system to use the same set of TMMs, improving system performance. You can choose source or destination IP, or default which specifies that the default CMP hash uses L4 ports. See :ref:`CMP Hash example<cmphash>`. |
+--------------------+--------------------------------+------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

|

.. _selfip-class:

Self IP class
`````````````
The next lines of the declaration configure self IP address(es) on the BIG-IP system. In this case, the name you give the Self IP class is used for the name of the Self IP on the BIG-IP.  

.. IMPORTANT:: Beginning with DO 1.35.0, the default value for **allowService** on a self IP address will be changing from **default** to **none** Until then, DO will present a warning in the response whenever DO receives a declaration that creates or modifies a self IP. This change will help DO be more secure.

For more information, see |ntpclass| in the Schema Reference.


.. code-block:: javascript
   :linenos:
   :lineno-start: 90

    "external-self": {
        "class": "SelfIp",
        "address": "1.2.3.4/24",
        "vlan": "external",
        "allowService": "none",
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
| allowService       | all, none, **default**, or array of <service:port>       |   No       |  Specifies which services (ports) to allow on the self IP. For the external-self, we use none.                                     |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| trafficGroup       | **traffic-group-local-only**, traffic-group-1            |   No       |  Traffic group for the Self IP.                                                                                                    |
+--------------------+----------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

|

.. _route-class:

Route class
```````````
The next lines of the declaration configure routes on the BIG-IP system.   In this case, the name you give the Route class is used for the name of the route on the BIG-IP. For more information, see |routeclass| in the Schema Reference.

In this example, we use the name **default**, which sets the default route on the BIG-IP system.  If you want to create a different route, simply use a unique name (something other than default).


.. code-block:: javascript
   :linenos:
   :lineno-start: 116

        "default": {
            "class": "Route",
            "gw": "10.10.0.1",
            "network": "default",
            "mtu": 1500
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

|

.. _mgmtroute-class:

Management Route class
``````````````````````
The next lines of the declaration configure the management route on the BIG-IP system. For specific information on management routes, see |mgmtroutes| in the BIG-IP Routing Administration guide.

For more information, see |mgmtrouteclass| in the Schema Reference.



.. code-block:: bash
   :linenos:
   :lineno-start: 122

        "managementRoute": {
            "class": "ManagementRoute",
            "gw": "1.2.3.4",
            "network": "4.3.2.1",
            "mtu": 1000,
            "type": "interface"
        },


+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                                                                   | Required*? |  Description/Notes                                                                                                                 |
+====================+===========================================================================================+============+====================================================================================================================================+
| class              | managementRoute                                                                           |   Yes      |  Indicates that this property contains management route configuration.                                                             |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| gw                 | string (IPv4 or IPv6 address)                                                             |   Yes      |  Gateway for the route.                                                                                                            |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| network            | string (IPv4/IPv6 address, optional %RD and/or /masklen), **default**, or default-inet6   |   No       |  IP address/netmask for route.  The default network is **default**.                                                                |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| mtu                | integer                                                                                   |   No       |  The maximum transmission unit (mtu) for the VLAN. Must be a minimum of 0 and a maximum of 9198.                                   |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| type               | string (interface, blackhole)                                                             |   No       | Type of the management route                                                                                                       |
+--------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

|

.. _routedomain-class:

Route Domain class
``````````````````
The next lines of the declaration configure route domains on the BIG-IP system.  For specific information on Route Domains, see the |rddocs|. For more information on Route Domains in DO, see |routedomainclass| in the Schema Reference.

With Route Domains, the **id** is required, and you use the id as an identifier in other parts of the declaration.  You can see a specific example of this in :ref:`Route Domain example<rdomain>`.


.. code-block:: javascript
   :linenos:
   :lineno-start: 128

        "myRouteDomain": {
            "class": "RouteDomain",
            "id": 100,
            "bandWidthControllerPolicy": "bwcPol",
            "connectionLimit": 5432991,
            "flowEvictionPolicy": "default-eviction-policy",
            "ipIntelligencePolicy": "ip-intelligence",
            "enforcedFirewallPolicy": "enforcedPolicy",
            "stagedFirewallPolicy": "stagedPolicy",
            "securityNatPolicy": "securityPolicy",
            "servicePolicy": "servicePolicy",
            "strict": false,
            "routingProtocols": [
                "RIP"
            ],
            "vlans": [
                "newVlan"
            ]
        },


+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                 | Options                                                                                   | Required*? |  Description/Notes                                                                                                                 |
+===========================+===========================================================================================+============+====================================================================================================================================+
| class                     | RouteDomain                                                                               |   Yes      |  Indicates that this property contains route domain configuration.                                                                 |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| id                        | integer                                                                                   |   Yes      |  Specifies a unique numeric identifier for the route domain.                                                                       |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| bandWidthControllerPolicy | string                                                                                    |   No       |  Specifies the bandwidth controller policy for the route domain                                                                    |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| connectionLimit           | integer (min/default: 0, max 4294967295)                                                  |   No       |  The connection limit for the route domain                                                                                         |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| flowEvictionPolicy        | string                                                                                    |   No       |  Specifies a flow eviction policy for the route domain to use                                                                      |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| ipIntelligencePolicy      | string                                                                                    |   No       |  Specifies an IP intelligence policy for the route domain to use                                                                   |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| enforcedFirewallPolicy    | string                                                                                    |   No       |  Specifies an enforced firewall policy on the route domain                                                                         |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| stagedFirewallPolicy      | string                                                                                    |   No       |  Specifies a staged firewall policy on the route domain                                                                            |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| securityNatPolicy         | string                                                                                    |   No       |  Specifies the security NAT policy for the route domain                                                                            |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| servicePolicy             | string                                                                                    |   No       |  Specifies the service policy for the route domain                                                                                 |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| strict                    | boolean (**true**)                                                                        |   No       |  Determines whether a connection can span route domains                                                                            |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| routingProtocols          | array of strings (BFD, BGP, IS-IS, OSPFv2, OSPFv3, PIM, RIP, RIPng)                       |   No       |  Specifies routing protocols for the system to use in the route domain                                                             |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| vlan                      | array of strings                                                                          |   No       | Specifies VLANS for the system to use in the route domain                                                                          |
+---------------------------+-------------------------------------------------------------------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


\* The required column applies only if you are using this class.

|

.. _dbvars-class:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for database variables is available in Declarative Onboarding 1.1.0 and later.


DB Variable class
`````````````````
The next lines of the declaration enable the ability to set arbitrary database variables in a declaration. You simply supply a name and a value for the database variable you want to use. For more information, see |dbvarclass| in the Schema Reference.

|


.. code-block:: javascript
   :linenos:
   :lineno-start: 147

                "dbvars": {
                    "class": "DbVariables",
                    "ui.advisory.enabled": true,
                    "ui.advisory.color": "green",
                    "ui.advisory.text": "/Common/hostname"
                }
            }
        }

       

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

.. |pass| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html" target="_blank">BIG-IP Secure Password Policy</a>

.. |mgmtroutes| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/01.html#GUID-665E1732-EC90-447D-A871-DEC9903F372F" target="_blank">BIG-IP Management Routes</a>



.. |rddocs| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/09.html" target="_blank">Route Domain documentation</a>


.. |systemclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system" target="_blank">System Class</a>

.. |licenseclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#license" target="_blank">License Class</a>

.. |ntpclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#ntp" target="_blank">NTP Class</a>

.. |dnsclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#dns" target="_blank">DNS Class</a>

.. |userclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#user" target="_blank">User Class</a>

.. |provisionclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#provision" target="_blank">Provision Class</a>

.. |vlanclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#vlan" target="_blank">VLAN Class</a>

.. |selfipclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#selfip" target="_blank">Self IP Class</a>

.. |routeclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#route" target="_blank">Route Class</a>

.. |mgmtrouteclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#managementroute" target="_blank">Management Route Class</a>

.. |routedomainclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#routedonain" target="_blank">Route Domain Class</a>

.. |dbvarclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#dbvariables" target="_blank">DB Variables Class</a>

.. |deviceclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#device" target="_blank">Device Class</a>

.. |devicecommon| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#device-common" target="_blank">Device Common Class</a>


.. |k15000| raw:: html

   <a href="https://support.f5.com/csp/article/K15000" target="_blank">K15000</a>