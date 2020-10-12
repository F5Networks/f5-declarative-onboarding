
.. _prereqs:

Prerequisites and Requirements
------------------------------

The following are prerequisites for using F5 Declarative Onboarding:

- Domain name resolution is used anywhere the declaration accepts a hostname. DO makes sure that any hostnames are resolvable and fails if they are not.  The exception is deviceGroup.members, which do not require hostname resolution as they have been added to the trust.

- You must have an existing BIG-IP device with a management IP address.  

- The BIG-IP must be running version 13.1.0 or later.  
   .. IMPORTANT:: Due to changes in TMOS v13.1.1.5 and v13.1.3.x, the Declarative Onboarding (DO) Extension is not compatible with these specific TMOS versions. Versions other than 13.1.1.5 and 13.1.3.x are compatible. 

- You must have an existing user account with the Administrator role. If you are using 13.1.x, the BIG-IP contains an admin user by default. If you are using 14.x, you **must** reset the admin password before installing Declarative Onboarding. See :ref:`14andlater` for instructions.  

- While Declarative onboarding is supported on F5 vCMP systems, network stitching to vCMP Guests or Hosts is not supported. Furthermore, creating vCMP guests with a DO declaration is not supported.

- If you are using an F5 BYOL license, you must have a valid F5 Networks License Registration Key to include in your declaration.  If you do not have one, contact your F5 sales representative. If you do not use a valid F5 license key, your declaration will fail.  This is not a requirement if you are using a BIG-IP with pay-as-you-go licensing. 

- If you are using a single NIC BIG-IP system, you must include port 8443 after the IP address of the BIG-IP in your POST and GET requests, such as ``https://<BIG-IP>:8443/mgmt/shared/declarative-onboarding``

- You should be familiar with the F5 BIG-IP and F5 terminology.  The settings and features Declarative Onboarding uses are well-documented in the product documentation. For general information and documentation on the BIG-IP system, see the `F5 Knowledge Center <https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20LTM&version=13.1.0>`_.  

.. _notestips:

Notes and tips
~~~~~~~~~~~~~~

- Beginning with DO 1.8.0, the DO RPM, Postman collection, and checksum files will no longer be located in the **/dist** directory in the Declarative Onboarding repository on GitHub.  These files can be found on the |release|, as **Assets**.

- Declarative Onboarding gathers non-identifiable usage data for the purposes of improving the product as outlined in the end user license agreement for BIG-IP. To opt out of data collection, disable BIG-IP system's phone home feature as described in |phone|

- With the release of Declarative Onboarding 1.2.0, the GitHub repository includes a |github| with all of the example declarations. For information on importing this collection and using Postman collections, see the |postman|.  

- The first time you POST a Declarative Onboarding declaration, the system records the configuration that exists prior to processing the declaration. Declarative Onboarding is meant to initially configure a BIG-IP device. However, if you POST subsequent declarations to the same BIG-IP system, and leave out some of the properties you initially used, the system restores the original properties for those items.  **Important**: No matter what you send in a subsequent declaration, Declarative Onboarding will never unlicense a BIG-IP device, it will never delete a user, and it never break the device trust once it has been established.

- You can use GET to retrieve a sample declaration.  Use GET to ``https://<BIG-IP>/mgmt/shared/declarative-onboarding/example``

- When you POST a declaration, while the system is processing the declaration, the HTTP connection can be broken, especially when provisioning modules.  You can use the property **"async": "true",** in your declaration, and then use GET to poll for status.

- If you POST a declaration that modifies the password for the admin account, even if the declaration returns an error, the password can be changed.  Therefore you may need to update the admin password in the client you are using to send the declaration.

- After using Declarative Onboarding, if you want to use a declarative model to configure applications and services on a BIG-IP device, see the |as3| documentation.



.. |br| raw:: html
   
   <br />

.. |as3| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/" target="_blank">Application Services 3 (AS3)</a>

.. |14| raw:: html

   <a href=https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html" target="_blank">BIG-IP System: Secure Password Policy</a>

.. |reset| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html#unique_208231698" target="_blank">Resetting passwords in v14</a>

.. |postman| raw:: html

   <a href="https://learning.getpostman.com/docs/postman/collections/intro_to_collections/" target="_blank">Postman documentation</a>


.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/blob/master/dist/do.examples.collection.json" target="_blank">Declarative Onboarding Postman collection</a>

.. |phone| raw:: html

   <a href="https://support.f5.com/csp/article/K15000#phone" target="_blank">K15000</a>

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">GitHub Release</a>