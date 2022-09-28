.. _auth-examples:

Authentication Examples
-----------------------
This section contains example declarations concerning authentication.

.. _keys:

Adding public SSH keys to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we are adding public SSH keys to the root user and a guestUser. This can provide a higher level of security and easier automation.

**Important notes about using the keys property**

- Only the root user's primary key (noted by the ``Host Processor Superuser``), in authorized_keys will be preserved. All other keys configured prior to running this declaration, WILL BE DELETED.
- If the **keys** field is left empty it will default to an empty array. This means leaving it empty will clear the authorized_keys file, except for the root's master key.
- For non-root users, the path to the authorized_keys is **/home/{username}/.ssh/authorized_keys**.
- For root, the path is **/root/.ssh/authorized_keys**.
- BIG-IP DO will set the non-root user's .ssh directory permissions to 700, with the authorized_keys permissions set to 600.

.. literalinclude:: ../../examples/publicKeys.json
   :language: json
   :emphasize-lines: 13-16, 27-30


:ref:`Back to top<auth-examples>`

|

.. _authmethods:

Configuring BIG-IP authentication methods
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to configure RADIUS, LDAP, and TACACS authentication in a BIG-IP Declarative Onboarding declaration using the **Authentication** class. The authentication class can (but does not have to) contain multiple authentication method subclasses, but only one can be enabled at a time using the **enableSourceType** property (which matches the BIG-IP UI behavior).

This example declaration contains all three authentication methods with the **enableSourceType** property set to **radius**. It also includes the SSL options for LDAP introduced in BIG-IP DO 1.13.

For more information on options and BIG-IP DO usage, see |auth| and the subsequent entries in the Schema Reference.

.. NOTE:: We updated this example for the following: |br| - BIG-IP DO 1.17 includes a CA certificate for LDAP using the new **sslCaCert** property. |br| - BIG-IP DO 1.21 includes the ability to enable or disable LDAP referral chasing using the new **referrals** Boolean (BIG-IP 15.1 and later only). |br| See |authldap| in the Schema Reference for BIG-IP DO information and BIG-IP DO usage. |br| **IMPORTANT**: If you attempt to use the example declaration on a previous version that does not include one of these features, it will fail.  You can remove the lines highlighted in yellow for previous versions of BIG-IP DO.

In the following declaration snippet we show only the classes related to authentication.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

.. literalinclude:: ../../examples/authMethods.json
   :language: json
   :emphasize-lines: 46, 56-60

:ref:`Back to top<auth-examples>`

|

.. _remoterole:

Configuring Remote Roles for authentication
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to configure a remote role for authentication using the **RemoteAuthRole** class. See |loref| in the Schema reference for a description of each of the parameters for this class.

**Important**: The BIG-IP only allows one role per user for each partition/tenant.  Because some remote servers allow multiple user roles, the BIG-IP uses the **lineOrder** parameter to choose one of the conflicting roles for the user at login time. In these cases, the system chooses the role with the lowest line-order number.  See |lineorder| in the BIG-IP documentation for more information and examples.

In the following declaration snippet we show only the classes related to remote auth roles.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

.. literalinclude:: ../../examples/remoteRoles.json
   :language: json

:ref:`Back to top<auth-examples>`

|

.. _sshex:

Configuring SSHD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure SSHD (SSH daemon) settings in a BIG-IP Declarative Onboarding declaration. For usage and options, see |sshd| in the Schema Reference.

In the following declaration, we show only the SSHD class.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration. 

**New in BIG-IP DO 1.15** |br|
BIG-IP Declarative Onboarding v1.15 and later includes the ability to set the source IP addresses that are allowed to log into the system, using the new **allow** property. You can allow all addresses by using the **all** value, or disallow all addresses using the **none** value; otherwise, you can specify an array of IP address as shown in the updated example.

.. IMPORTANT:: If you attempt to use the following declaration on a version prior to 1.15, it will fail.  To use the example on a previous version, delete the **allow** property and IP addresses (the hightlighted lines)

.. literalinclude:: ../../examples/sshd.json
   :language: json
   :emphasize-lines: 10-14

:ref:`Back to top<auth-examples>`

|

.. _example18:

Updating the TLS/SSL Device Certificate in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example declaration shows how you can create/upload a device certificate in a BIG-IP Declarative Onboarding declaration. The BIG-IP system uses the device certificate to authenticate access to the Configuration utility and to accommodate device-to-device communication processes, such as configuration synchronization. 

For more information and how this process works manually, see the KB article |certdoc|.

A couple of things to note when including certificates and keys in a declaration:

- BIG-IP BIG-IP DO always writes to **/config/httpd/conf/ssl.crt/server.crt** and **ssl.key/server.key**
- If the device certificate is updated (that is, if the certificate in the declaration does not match the certificate in those directories), BIG-IP DO reboots the BIG-IP device in order to include the updated certificate
- BIG-IP DO makes backups of the certificates and keys in those directories before overwriting the existing certificate and key
- Like other settings in BIG-IP DO, if a subsequent declaration is posted without the certificate, BIG-IP DO will restore the certificate that was there when it first ran.

See |certclass| in the schema reference for more information and usage.

.. literalinclude:: ../../examples/deviceCertificate.json
   :language: json

:ref:`Back to top<auth-examples>`

|

.. _rolevar:

Using variables in some remote role properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can use variable expressions for some of the properties in the RemoteAuthRole class (see :ref:`remoterole` for the example without variables). This allows you to reference variables that you defined in your AAA system in a BIG-IP Declarative Onboarding declaration.

There are two important notes for using this feature:

- When you use variables, they MUST start with **%**. 
- You can currently use variables with the **console**, **role**, and **userPartition** properties. 

See |loref| in the schema reference for more information and usage for RemoteAuthRole.

.. literalinclude:: ../../examples/remoteRoleVariableFields.json
   :language: json

:ref:`Back to top<auth-examples>`

|

.. _passwordPolicy:

Configuring a BIG-IP password policy
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the **PasswordPolicy** class is available in BIG-IP DO v1.33 and later.


This example shows how you can use the **PasswordPolicy** class introduced in BIG-IP DO 1.33. This class allows you to set a variety of parameters to define a password policy.

See |pp| in the schema reference for specific details on each of the parameters in the PasswordPolicy class, as well as DO usage.

.. literalinclude:: ../../examples/passwordPolicy.json
   :language: json

:ref:`Back to top<auth-examples>`



.. |certclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#devicecertificate" target="_blank">DeviceCertificate</a>

.. |certdoc| raw:: html

   <a href="https://support.f5.com/csp/article/K6353" target="_blank">Updating a self-signed SSL device certificate on a BIG-IP system</a>

.. |sshd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#sshd" target="_blank">SSHD</a>

.. |lineorder| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-systems-user-account-administration-14-0-0/05.html#GUID-E70CB2E7-A003-486A-9A3E-2C401B4DAC78" target="_blank">Line Order</a>

.. |loref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#remoteauthrole" target="_blank">RemoteAuthRole Class</a>

.. |auth| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#authentication" target="_blank">Authentication</a>

.. |br| raw:: html
   
   <br />

.. |authldap| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#authentication-ldap" target="_blank">Authentication_ldap</a>

.. |pp| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#passwordpolicy" target="_blank">PasswordPolicy</a>



