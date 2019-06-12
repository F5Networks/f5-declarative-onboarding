.. _container: 

Using Declarative Onboarding in a Docker Container
--------------------------------------------------
F5 Networks has created a Docker Container (currently Community Supported) with Declarative Onboarding installed (1.2.0).  You can use this container to create new BIG-IP systems.  This can be extremely useful for automating BIG-IP configurations.   

.. IMPORTANT:: Note this solution is currently Community Supported and in the F5Devcentral organization on Docker Hub.  Once it is fully supported by F5, it will move to **f5networks** on Docker Hub.

Prerequisites
~~~~~~~~~~~~~
1. You must have Docker installed (https://www.docker.com/get-started/) and running.
2. You must have a target BIG-IP system running version v13.1 or later to use Declarative Onboarding.
3. If running Docker on Microsoft Windows, you must make sure the drive in which you are working (for example, your C: drive) is shared in the Docker settings.
4. Once your container is running, you must use the **target** parameters in your Declarative Onboarding declaration as described on this page.


.. _test-container: 

Downloading and starting the Declarative Onboarding Docker container
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
The first task is to download (pull) the Docker image from Docker Hub.  If you plan on adding base authentication, see :ref:`base` for guidance on the directory structure for pulling the image.

1. Download the F5 Declarative Onboarding Docker image using the following command syntax: ``docker pull f5devcentral/f5-do-container:<tag name>``.  The <tag name> is optional and allows you to include a specific tag using :<tagname> after f5-Declarative Onboarding-container.  If you do not include a tag, it downloads the latest version (:latest). |br| Once the download is complete, you should see a status message stating the image was downloaded.

2. Run Declarative Onboarding container using the command: ``docker run --name do_container --rm -d -p 8443:443 -p 8080:80 f5devcentral/f5-do-container:latest``.  **--name do_container** is optional and can be changed to any name you want, it's just an easy way to identify this container.

3. To test the Docker image is functional, you can use one of the following options (the following examples use **localhost**, you can use an IP address in place of localhost if your client and container are on different devices):

   - From your RESTful client, use **GET** to send ``https://localhost:8443/mgmt/shared/declarative-onboarding/example``  

   - Run the following cURL command: ``curl -k https://localhost:8443/mgmt/shared/declarative-onboarding/example``  


The system returns an example Declarative Onboarding declaration.

|

Sending a declaration to a BIG-IP using the Docker container
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
To send a declaration to a BIG-IP system you use the new *target* parameters in the Declarative Onboarding class (see the example below).  These parameters specify the BIG-IP system where you want to send the configuration, and the user account with permission to access that BIG-IP system.

Again, the following examples use **localhost**, you can use an IP address in place of localhost if your client and container are on different devices.

To send a declaration with the container using a RESTful client, use ``https://localhost:8443/mgmt/shared/declarative-onboarding``, and then POST a declaration.

To send a declaration with the container using cURL, use ``curl -sku admin:admin -H "Content-Type: application/json" -X POST https://localhost:8443/mgmt/shared/declarative-onboarding`` and then include the declaration.



Example declaration snippet using a RESTful client
``````````````````````````````````````````````````
To send a declaration from the container with a RESTful client like Postman, use the targetHost, targetUsername, and targetPassphrase parameters as shown in the following example (using values from your configuration).  In this example, your declaration would continue after the last (schemaVersion) line.  

Additionally, see :doc:`json-pointers` for information on using JSON/Declarative Onboarding pointers in your declaration.

.. code-block:: shell
   :emphasize-lines: 3-7

   {

        "class": "DO",
        "targetHost": "192.0.2.76",
        "targetPort": 8443,
        "targetUsername": "admin",
        "targetPassphrase": "myAdminPassword",
        "declaration": {
            "class": "Device",
            "schemaVersion": "1.0.0",
            ...
        }
   }
        
   



**Container-specific parameters**

+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options              | Required? |  Description/Notes                                                                                                                                                                                                                                                                                                                     |
+====================+======================+===========+========================================================================================================================================================================================================================================================================================================================================+
| targetHost         | string               | YES       |  IP address or host name of the target BIG-IP system to which you want to send the configuration.                                                                                                                                                                                                                                      |
+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetPort         | integer              | NO        |  TCP port number of management service on targetHost.  If you do not specify a targetPort, Declarative Onboarding uses a default of 0, meaning it will auto-discover the target port.                                                                                                                                                  |
+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetTokens       | object               | NO        |  One or more HTTP headers (each a property, like ‘X-F5-Auth-Token’: ‘MF6APSRUYKTMSDBEOOEWLCNSO2’) you want to send with queries to the targetHost management service as authentication/authorization tokens                                                                                                                            |
+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetUsername     | string               | YES       |  Username of the principal authorized to modify configuration of targetHost (may not include the character ':').  NOTE:  This is generally not required to configure 'localhost' because client authentication and authorization precede invocation of DO.  It is also not required for any targetHost if you populate targetTokens.   |
+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetPassphrase   | string               | YES       |  Passphrase for targetUsername account.  This is generally not required to configure 'localhost' and is not required when you populate targetTokens.                                                                                                                                                                                   |
+--------------------+----------------------+-----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

|

Example declaration snippet using cURL
``````````````````````````````````````
To send a declaration from the container with cURL, use the same parameters as described in the preceding table.  The rest of your declaration would continue after the last (schemaVersion) line.

.. code-block:: shell

    curl -sku admin:admin -H "Content-Type: application/json" -X POST https://localhost:8443/mgmt/shared/declarative-onboarding -d ‘{
        "class": "DO",
        "targetHost": "192.0.2.76",
        "targetUsername": "admin",
        "targetPassphrase": "admin",
        "declaration": {
            "class": "Device",
            "schemaVersion": "1.0.0",
    …}’


.. _base:

Adding Basic Authentication
~~~~~~~~~~~~~~~~~~~~~~~~~~~
To enable Basic authentication, which allows you to protect your container running Declarative Onboarding, you can :guilabel:`COPY` or :guilabel:`MOUNT` the authentication configuration and user password files to your container using the following instructions. 

**Notes and requirements for adding Basic authentication**

- You should be at least somewhat familiar with the Docker command line.
- You should have knowledge of Apache .htpasswd for adding Basic authentication.  See https://httpd.apache.org/docs/2.4/howto/auth.html.
- While we include commands for Microsoft Windows in this section, getting paths and directories set up in Windows can be tricky, so we recommend using a Linux-based system to add Basic authentication.
- In our example, we are using a hashed value for the password *admin*.  We strongly recommend you use a different password. Use a htpasswd generator (such as http://www.htaccesstools.com/htpasswd-generator/) to generate a value for a stronger password.

| 


1. Choose a local directory that will be mounted as a volume for the container to handle authentication. From that directory, pull the Declarative Onboarding image from Docker hub (see :ref:`test-container`)
2. Inside that root directory, create a new directory named **basic-auth**. You will create two sub-directories in this directory.  If you want to use different names for your directories, you must modify the command to use the appropriate directories when you run the container.
     
   #. Inside the basic-auth directory you created, create a directory named **auth** directory.
   #. In the **auth** directory, create a file named **basic.conf** with the following content::

       AuthType basic  
       AuthName "private area" 
       AuthUserFile /etc/www/pass/.htpasswd-users  
       Require valid-user

   #. In the **basic-auth** directory, create another directory named **pass**.
   #. In the **auth** directory, create a file named **.htpasswd-users** your user name and a hashed password. Again, this example uses *admin* for the password, use http://www.htaccesstools.com/htpasswd-generator/ to generate a hash for a stronger password.::

		admin:$apr1$DTbcp1qi$vJ2AXcB.Ma8zznKJLEXKv.  

3. Run Declarative Onboarding container at the root directory.  This maps the two directories you created to two directories inside the container for Apache.

   - If you are using a Linux-based system, use the following command: ``docker run -d -p 8443:443 -p 8080:80 -v `pwd`/basic-auth/auth/:/usr/local/apache2/conf/auth/ -v `pwd`/basic-auth/pass/:/etc/www/pass/ f5devcentral/f5-do-container``
   
   - If you are using Windows, use the following command: ``docker run -d -p 8443:443 -p 8080:80 -v %cd%/basic-auth/auth/:/usr/local/apache2/conf/auth/ -v %cd%/basic-auth/pass/:/etc/www/pass/ f5devcentral/f5-do-container``


4. Open your RESTful API client such as Postman, and log with the basic Auth you just configured, in our example, using **admin** for the username and password. 

5. Test your docker container to get info from BIG-IP using step 3 of :ref:`test-container`.
	


.. _container-ex: 

Full declaration using the Declarative Onboarding container
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
This example uses a simple example declaration using the container.

.. literalinclude:: ../examples/viaASG.json
   :language: json












.. |br| raw:: html
   
   <br />