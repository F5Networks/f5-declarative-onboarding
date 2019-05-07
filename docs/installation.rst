.. _installation:

Downloading and installing the Declarative Onboarding package
-------------------------------------------------------------
The Declarative Onboarding package is an RPM file you download, and then upload to the BIG-IP system using the iControl/iApp LX framework. Remember that your BIG-IP must have a management IP address and an **admin** user.

Downloading the RPM file
~~~~~~~~~~~~~~~~~~~~~~~~
The first task is to download the latest RPM file.  Go to the |github|, and download the latest (highest numbered) RPM file.

.. TIP:: Once you have downloaded the RPM, we recommend :ref:`hash-ref`.


Uploading and installing the Declarative Onboarding RPM file on the BIG-IP
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
After you download the RPM, you must upload and then install it on your BIG-IP system.  In this section, we show how to upload the RPM using :ref:`cURL<uploadcurl>` or :ref:`SCP<uploadscp>`.  Use only one of the following procedures.

.. _14andlater:

If using BIG-IP 14.0 or later
`````````````````````````````
If you are using BIG-IP 14.0 or later, the |14| is enforced. As mentioned in the Prerequisites, you must change your **admin** password before attempting to upload or install Declarative Onboarding.  

- To change your admin password using the Configuration utility, simply go to the BIG-IP Configuration utility ``https://(IP address of BIG-IP)`` and login using **admin** as the Username and Password. You are forced to change your password.  

- To change your admin password using the CLI, SSH into the BIG-IP.  Log on as **root** with the password of **default**.  You are forced to change your root password.  After changing your root password, you receive a message saying the admin password was also changed but marked as expired.  Type the following command to change the admin password: **tmsh modify auth user admin prompt-for-password**, and then type a new admin password. 

.. _uploadscp:

Uploading Declarative Onboarding using SCP
``````````````````````````````````````````

You can use SCP to upload the RPM file to the BIG-IP system.  Note that even if you use SCP to upload the RPM file,  you still have to use cURL command to install the package.

#. Open your SCP client, and use the management IP address of your BIG-IP system.
#. Use the **root** account to authenticate to the BIG-IP.  The initial root password is **default**.  We strongly recommend you change this password after you install Declarative Onboarding (you can change this password using a Declarative Onboarding declaration as shown in :doc:`examples`).  If using 14.0 or later, you may be forced to change the password.
#. Upload the RPM file to the directory **/var/config/rest/downloads**.
#. Continue with :ref:`installcurl-ref`

|

.. _uploadcurl:

Uploading Declarative Onboarding using cURL
```````````````````````````````````````````

If you want to use cURL to install Declarative Onboarding, use the following command syntax.  First, set the file name and the BIG-IP credentials, making sure you use the appropriate RPM and build number, and BIG-IP credentials.  

If you are using a single NIC BIG-IP system, you must include port 8443 after the IP address of the BIG-IP (so the last line in the following would be: IP=IP address of the BIG-IP:8443)

.. code-block:: shell

    FN=f5-declarative-onboarding-1.0.0-1.noarch.rpm

    CREDS=admin:admin

    IP=IP address of BIG-IP

|

Copy the following commands to upload the package (if using Mac, use the second code box for the first command). Note you must be in the same directory where you downloaded the RPM package. If you uploaded the RPM by another method, you can skip these commands.

.. code-block:: shell

    LEN=$(wc -c $FN | cut -f 1 -d ' ')

    curl -kvu $CREDS https://$IP/mgmt/shared/file-transfer/uploads/$FN -H 'Content-Type: application/octet-stream' -H "Content-Range: 0-$((LEN - 1))/$LEN" -H "Content-Length: $LEN" -H 'Connection: keep-alive' --data-binary @$FN

|

If you are using a Mac, for the first command, use 

.. code-block:: shell

    LEN=$(wc -c $FN | cut -f 2 -d ' ') 


.. _installcurl-ref:

Installing Declarative Onboarding using cURL from the Linux shell
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
No matter which method you used to upload the RPM onto the BIG-IP, you must use the following cURL commands. Copy the following commands to install the package.

If you used SCP to upload the package, first set the BIG-IP IP address and credentials as described in :ref:`uploadcurl`.

.. code-block:: shell

    DATA="{\"operation\":\"INSTALL\",\"packageFilePath\":\"/var/config/rest/downloads/$FN\"}"


    curl -kvu $CREDS "https://$IP/mgmt/shared/iapp/package-management-tasks" -H "Origin: https://$IP" -H 'Content-Type: application/json;charset=UTF-8' --data $DATA


For information on how you can view the status of installation, see |status|.

|

Checking for a successful installation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
After you have uploaded and installed Declarative Onboarding, you can test for a successful installation by using the following methods:

- From your RESTful client, after entering your credentials, use **GET** to send ``https://(IP address of BIG-IP)/mgmt/shared/declarative-onboarding/info``  

- Run the following cURL command: ``curl -sku $CREDS https://(IP address of BIG-IP)/mgmt/shared/declarative-onboarding/info``  

In either case, if installation was successful, you should see something similar to the following returned:

.. code-block:: json

   [
    {
        "id": 0,
        "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/info",
        "result": {
            "class": "Result",
            "code": 200,
            "status": "OK",
            "message": "",
            "errors": []
        },
        "version": "1.4.0",
        "release": "beta.7",
        "schemaCurrent": "1.3.0",
        "schemaMinimum": "1.0.0"
    }
]


You can also GET to send ``https://(IP address of BIG-IP)/mgmt/shared/declarative-onboarding/example`` to retrieve an example declaration.


Updating Declarative Onboarding
```````````````````````````````
When F5 releases a new version of Declarative Onboarding, use the same procedure you used to initially install the RPM.  


.. NOTE:: Installing or uninstalling Declarative Onboarding does not affect the BIG-IP configuration created by Declarative Onboarding.


Reverting to a previous version
```````````````````````````````
If for any reason you want to revert to a previous version of Declarative Onboarding, you must first remove the version on your BIG-IP system (:guilabel:`iApps > Package Management LX > f5-declarative-onboarding > Uninstall`).  After you uninstall, you can import the RPM for the version of Declarative Onboarding you want to use.


Viewing the Declarative Onboarding package in the BIG-IP Configuration utility
``````````````````````````````````````````````````````````````````````````````
If you are using BIG-IP v13.x and want to see the Declarative Onboarding package in the BIG-IP Configuration utility (GUI), from the BIG-IP CLI, you must type the following command:  ``touch /var/config/rest/iapps/enable``.  You only need to run this command once (per BIG-IP system). This is not necessary with 14.0 and later.

After running that command, you can log into the Configuration utility, and then click **iApps > Package Management LX** and you see the Declarative Onboarding package.  If you already had the Configuration utility open, you may need to refresh the page.

|

.. _hash-ref:

Verifying the integrity of the RPM package
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
F5 Networks provides a checksum for each of our Declarative Onboarding releases so you can confirm the integrity of the RPM package.

You can get a checksum for a particular template by running one of the following commands, depending on your operating system:

Linux: ``sha256sum <path_to_template>``

Windows using CertUtil: ``CertUtil –hashfile <path_to_template> SHA256``

You can compare the checksum produced by that command against the **.sha256** file in the **dist** directory.


.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/tree/master/dist" target="_blank">F5 Declarative Onboarding site on GitHub</a>  

.. |status| raw:: html

   <a href="https://clouddocs.f5.com/products/iapp/iapp-lx/tmos-14_0/icontrollx_pacakges/working_with_icontrollx_packages.html" target="_blank">Working with iControl LX packages</a>


.. |14| raw:: html

   <a href=https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html" target="_blank">BIG-IP Secure Password Policy</a>

.. |reset| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html#unique_208231698" target="_blank">Resetting passwords in v14</a>
