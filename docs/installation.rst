.. _installation:

Downloading and installing the Declarative Onboarding package
-------------------------------------------------------------
The Declarative Onboarding package is an RPM file you download, and then upload to the BIG-IP system using the iControl/iApp LX framework. Remember that your BIG-IP must have a management IP address and an **admin** user.

Downloading the RPM file
~~~~~~~~~~~~~~~~~~~~~~~~
The first task is to download the latest RPM file.  Go to the |github|, and download the latest (highest numbered) RPM file.

Uploading and installing the Declarative Onboarding RPM file on the BIG-IP
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
After you download the RPM, you must upload and then install it on your BIG-IP system.  In this section, we show how to upload the RPM using :ref:`cURL<uploadcurl>` or :ref:`SCP<uploadscp>`.  Use only one of the following procedures.

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

Uploading Declarative Onboarding using cURL from the Linux shell
`````````````````````````````````````````````````````````````````

If you want to use cURL to install Declarative Onboarding, use the following command syntax.  First, set the file name and the BIG-IP credentials, making sure you use the appropriate RPM build number (1 in the following example), and BIG-IP credentials.  

If you are using a single NIC BIG-IP system, you must include port 8443 after the IP address of the BIG-IP (so the last line in the following would be: IP=IP address of the BIG-IP:8443)

.. code-block:: shell

    FN=f5-declarative-onboarding-1.0.0-1.noarch.rpm

    CREDS=admin:admin

    IP=IP address of BIG-IP

|

Copy the following commands to upload the package. Note you must be in the same directory where you downloaded the RPM package. If you uploaded the RPM by another method, you can skip these commands.

.. code-block:: shell

    LEN=$(wc -c $FN | cut -f 1 -d ' ')

    curl -kvu $CREDS https://$IP/mgmt/shared/file-transfer/uploads/$FN -H 'Content-Type: application/octet-stream' -H "Content-Range: 0-$((LEN - 1))/$LEN" -H "Content-Length: $LEN" -H 'Connection: keep-alive' --data-binary @$FN

|

.. _installcurl-ref:

Installing Declarative Onboarding using cURL from the Linux shell
`````````````````````````````````````````````````````````````````
No matter which method you used to upload the RPM onto the BIG-IP, you must use the following cURL commands Copy the following commands to install the package.

If you used SCP to upload the package, first set the BIG-IP IP address and credentials as described in :ref:`uploadcurl`.

.. code-block:: shell

    DATA="{\"operation\":\"INSTALL\",\"packageFilePath\":\"/var/config/rest/downloads/$FN\"}"


    curl -kvu $CREDS "https://$IP/mgmt/shared/iapp/package-management-tasks" -H "Origin: https://$IP" -H 'Content-Type: application/json;charset=UTF-8' --data $DATA

|

Updating Declarative Onboarding
```````````````````````````````
When F5 releases a new version of Declarative Onboarding, use the same procedure you used to initially install the RPM.  


.. NOTE:: Installing or uninstalling Declarative Onboarding does not affect the BIG-IP configuration created by Declarative Onboarding.


Reverting to a previous version
```````````````````````````````
If for any reason you want to revert to a previous version of Declarative Onboarding, you must first remove the version on your BIG-IP system (:guilabel:`iApps > Package Management LX > f5-declarative-onboarding > Uninstall`).  After you uninstall, you can import the RPM for the version of Declarative Onboarding you want to use.


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

   <a href="https://github.com/f5devcentral/f5-declarative-onboarding/tree/master/dist" target="_blank">F5 Declarative Onboarding site on GitHub</a>