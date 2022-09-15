.. _do-bigiq:

Using BIG-IP DO on BIG-IQ
=========================
You can use the BIG-IP Declarative Onboarding endpoint on the BIG-IQ v7.0 and later to configure your BIG-IP devices.  After you onboard the BIG-IPs using BIG-IP Declarative Onboarding, you can manage them from the BIG-IQ system, including using |as3|.

See |kb| for information on BIG-IQ Centralized Management compatibility with F5 BIG-IP Declarative Onboarding.

See the |bigiqdo| for information on BIG-IP DO and BIG-IQ.

Verifying BIG-IP DO is installed on the BIG-IQ
----------------------------------------------
You can ensure BIG-IP DO is installed on the BIG-IQ device using the following methods:

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

Sending a BIG-IP DO declaration to BIG-IQ
-----------------------------------------
The request to send a BIG-IP Declarative Onboarding declaration to BIG-IQ is the same as the request for BIG-IP, just the IP address is different: |br|
``https://(IP address of BIQ-IP)/mgmt/shared/declarative-onboarding/info`` 


The JSON in the body of the POST request can include the parameters in the |bigiqapi| in the BIG-IQ API documentation. 

See :ref:`bigiqdo1` an example declaration for using BIG-IP DO on BIG-IQ.




.. |kb| raw:: html

   <a href="https://support.f5.com/csp/article/K54909607" target="_blank">K54909607</a>

.. |as3| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/userguide/big-iq.html" target="_blank">AS3 on BIG-IQ</a>

.. |br| raw:: html
   
   <br />

.. |bigiqdo| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/v7.0.0/ApiReferences/bigiq_public_api_ref/r_do_onboarding.html" target="_blank">BIG-IQ API documentation</a>

.. |bigiqapi| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/latest/ApiReferences/bigiq_public_api_ref/r_do_onboarding.html#post-mgmt-shared-declarative-onboarding" target="_blank">BIG-IP DO/BIG-IQ parameter table</a>


