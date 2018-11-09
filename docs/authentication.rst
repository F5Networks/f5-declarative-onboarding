Authentication and Authorization
--------------------------------

Authorization to invoke Declarative Onboarding includes authorization to GET declarations stored in
Declarative Onboarding.

Declarative Onboarding does not require its own credentials, however you you must have administrator credentials for the BIG-IP that is running Declarative Onboarding.

Because Declarative Onboarding is an iControl LX extension, you can authenticate by including one of the following **header** values in your HTTP requests.

Basic Auth
~~~~~~~~~~

To use Basic authentication, add a new request header:  ``Authorization: Basic {Base64encoded value of username:password}``. 
(If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions, which automatically adds the encoded header.)

.. _token-ref:

Token Auth
~~~~~~~~~~

To use Token Authentication, add a new request header:  ``X-F5-Auth-Token: {tokenValue}``


If you need to create a new token, use the following syntax:

.. code-block:: bash

   
        POST /mgmt/shared/authn/login 
        Host: {{bigip_host}}
        Authorization: Basic {Base64encoded value of username:password}
        Content-Type: application/json
        {
            "username":"{userWithCorrectPerms}",
            "password":"{userPassword}",
            "loginProviderName":"tmos"
        }


By default, the token has an expiration time of 1200 seconds.  To extend this time, use the following syntax:

.. code-block:: bash

   
        PATCH /mgmt/shared/authz/tokens/{{bigip_auth_token}}
        Host: {{bigip_host}}
        Content-Type: application/json
        X-F5-Auth-Token: {{bigip_auth_token}}
        {
            "timeout":"36000" //this is the maximum
        }



