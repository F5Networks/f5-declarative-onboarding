HTTP Methods
------------
This section contains the current HTTP methods available with Declarative Onboarding.

POST
~~~~
To send your declaration, use the POST method to the URI
``https://<BIG-IP>/mgmt/shared/declarative-onboarding`` and put your declaration in the
body of the post.  If successful, you see a success message, and the system
echoes your declaration back to you.  

.. NOTE:: If you are using a single NIC BIG-IP system, you must include port 8443 after your IP address in your POST: **https://<BIG-IP>:8443/mgmt/shared/declarative-onboarding**

The first time you POST a Declarative Onboarding declaration, the system records the configuration that exists prior to processing the declaration.  If you POST subsequent declarations to the same BIG-IP system, and leave out some of the properties you initially used, the system restores the original properties for those items.

GET
~~~
You can use the GET method to retrieve the declaration you previously sent to
Declarative Onboarding. Use the GET method to the URI
``https://<BIG-IP>/mgmt/shared/declarative-onboarding``.  Only declarations you create
in Declarative Onboarding return, GET does not return anything that was not created by Declarative Onboarding.
You can also use ``https://<BIG-IP>/mgmt/shared/declarative-onboarding?show=full`` to retrieve the original and current configuration.

.. NOTE:: If you are using a single NIC BIG-IP system, you must include port 8443 after your IP address in your GET: **https://<BIG-IP>:8443/mgmt/shared/declarative-onboarding**


.. |br| raw:: html
   
   <br />

