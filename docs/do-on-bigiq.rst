.. _do-bigiq:

Using DO on BIG-IQ
==================
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   DO is available in BIG-IQ v7.0 and later

You can use the Declarative Onboarding endpoint on the BIG-IQ v7.0 and later to configure your BIG-IP devices.  After you onboard the BIG-IPs using Declarative Onboarding, you can manage them from the BIG-IQ system, including using |as3|.

See |kb| for information on BIG-IQ Centralized Management compatibility with F5 Declarative Onboarding.

See the |bigiqdo| for information on DO and BIG-IQ.

Verifying DO is installed on the BIG-IQ
---------------------------------------
You can ensure DO is installed on the BIG-IQ device using the following methods:

- From your RESTful client, after entering your credentials, use **GET** to send |br| ``https://(IP address of BIG-IQ)/mgmt/shared/declarative-onboarding/info``  

- Run the following cURL command: |br| ``curl -sku $CREDS https://(IP address of BIG-IQ)/mgmt/shared/declarative-onboarding/info``  

In either case, you should see something similar to the following returned:

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
            "version": "1.5.1",
            "release": "1",
            "schemaCurrent": "1.5.0",
            "schemaMinimum": "1.0.0"
        }
    ]


You can also GET to send ``https://(IP address of BIG-IQ)/mgmt/shared/declarative-onboarding/example`` to retrieve an example declaration.


.. _do-bigiq-table:

Sending a DO declaration to BIG-IQ
----------------------------------
The request to send a Declarative Onboarding declaration to BIG-IQ is the same as the request for BIG-IP, just the IP address is different: |br|
``https://(IP address of BIQ-IP)/mgmt/shared/declarative-onboarding/info`` 


The JSON in the body of the POST request can includes the following parameters. See :ref:`bigiqdo1` an example declaration for using DO on BIG-IQ.

.. list-table::
   :widths: 20 20 20 40
   :header-rows: 1

   * - Name
     - Type
     - Required
     - Description
   * - class
     - string
     - True 
     - "DO"
   * - bigIqSettings
     - object
     - True 
     - Settings for the BIG-IQ performing onboarding
   * -      *accessModuleProperties*
     - string
     - Yes if an APM module is being imported 
     - Additional access module properties provided for the import.  
   * -      *clusterName*
     - string
     - True if the BIG-IP is to be managed as part of a cluster 
     - Cluster display name of the BIG-IP Device Service Clustering (DSC) group. `clusterName` must be the same for all the BIG-IPs in a DSC group.   	 
   * -      *conflictPolicy*
     - string
     - True if `failImportOnConflict` is false. 
     - Conflict policy for the onboarding. Possible values: “NONE”, “USE_BIGIP”, “USE_BIGIQ”, “KEEP_VERSION”
   * -      *deployWhenDscChangesPending*
     - string
     - boolean 
     - Deploy when there are pending DSC changes on BIG-IP.
   * -      *deviceConflictPolicy*
     - string
     - False 
     - Conflict policy for device-specific objects. For Access, a device-specific import can accept “USE_BIGIP” for all device-specific objects. Default is the same value as `conflictPolicy`. Possible values: “NONE”, “USE_BIGIP”, “USE_BIGIQ”, “KEEP_VERSION”
   * -      *failImportOnConflict*
     - boolean
     - False 
     - True specifies to fail import task if there are conflicts. This can true if you want to resolve the conflicts manually. Default is false.   	 	 
   * -      *snapshotWorkingConfig*
     - boolean
     - False 
     - True specifies a snapshot of the working configuration for current BIG-IPs before the import. Default is false.  	 
   * -      *statsConfig*
     - object
     - False 
     - Stats configuration details for the BIG-IP   	 
   * -           *enabled*
     - boolean
     - True `statsConfig` if is defined 
     - True enables collecting statistics for the BIG-IP 	 
   * -           *zone*
     - string
     - False 
     - User-defined names that associate BIG-IPs with one or more data collection device (DCD) systems to provide optimal routing for statistics traffic. This value can be “default”.
   * -      *useBigiqSync*
     - boolean
     - False 
     - True to use BIG-IQ to push changes to cluster BIG-IPs instead of using the BIG-IP cluster sync to synchronize configuration. 	 
   * -      *versionedConflictPolicy*
     - string
     - False 
     - Conflict policy for version-specific objects. For Access, a device-specific import can accept “USE_BIGIP” for all device-specific objects. Default is the same value as `conflictPolicy`.  Possible values: “NONE”, “USE_BIGIP”, “USE_BIGIQ”, “KEEP_VERSION”
   * - declaration
     - object
     - True 
     - The Declarative Onboarding declaration that you want to transmit. The DO declaration includes the BIG-IP objects you want the system to configure. 
   * -      *async*
     - boolean
     - True 
     - The `async` field must be true to use DO on BIG-IQ.
   * -      *Common*
     - object
     - True 
     - Sections of the DO declaration.
   * -           *admin*
     - object
     - True 
     - The `admin` section of `Common` in the DO declaration is required if making an AWS initial declaration using the `targetSshKey`.		 
   * - targetHost
     - string
     - True 
     - IP address of the onboarding BIG-IP. Required for the initial or subsequent onboardings of a BIG-IP.  	 
   * - targetPassphrase
     - string
     - True 
     - Admin password of the onboarding BIG-IP. Required for the initial or subsequent onboarding of a BIG-IP in Azure or VMware environment. You must specify a `targetUsername` or `targetSshKey` when using an Azure or VMware environment. Not required for onboarding BIG-IP VEs in AWS cloud, if you have specified `targetSshKey`.
   * - targetSshKey
     - object
     - False 
     - Required for initial onboarding of a new BIG-IP VE in an AWS cloud. Use `targetPassphrase` for any subsequent onboarding of the same BIG-IP VE on AWS. `targetSshKey` is not used in Azure and VMware environments, those environments alway use `targetUsername` and `targetPassphrase`. 
   * -      *path*
     - string
     - False 
     - Path to ssh key.	 	 
   * - targetUsername
     - string
     - True 
     - Admin user name of the onboarding BIG-IP. Required for the initial or subsequent onboardings of a BIG-IP.


.. |kb| raw:: html

   <a href="https://support.f5.com/csp/article/K54909607" target="_blank">K54909607</a>

.. |as3| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/userguide/big-iq.html" target="_blank">AS3 on BIG-IQ</a>

.. |br| raw:: html
   
   <br />

.. |bigiqdo| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/v7.0.0/ApiReferences/bigiq_public_api_ref/r_do_onboarding.html" target="_blank">BIG-IQ API documentation</a>




