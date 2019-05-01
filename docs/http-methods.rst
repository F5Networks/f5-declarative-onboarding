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

|

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The following two new GET APIs are available in Declarative Onboarding v1.4 and later.

Declarative Onboarding v1.4 introduces two new options for the GET method:

- ``/shared/declarative-onboarding/task`` with optional ``/<taskId>``  
  If you do not specify a taskId, DO returns an array of all tasks. If you use the taskId, DO returns the specific task.  The response looks like that for the POST response.

- ``/shared/declarative-onboarding/config/<machineId>``  
  Returns the original configuration of the specified device (identified by device machineId), or all devices if no machineId is given.   
  
Example response from sending GET to /shared/declarative-onboarding/config:

.. code-block:: json

    {
        "id": "565916cc-f143-46b1-be25-56cb764ff635",
        "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/config/565916cc-f143-46b1-be25-56cb764ff635",
        "result": {
            "class": "Result",
            "code": 200,
            "status": "OK",
            "message": "",
            "errors": []
        },
        "parsed": true,
        "Common": {
            "hostname": "localhost.example.com",
            "Provision": {
                "afm": "none",
                "am": "none",
                "apm": "none",
                "asm": "none",
                "avr": "none",
                "dos": "none",
                "fps": "none",
                "gtm": "none",
                "ilx": "none",
                "lc": "none",
                "ltm": "nominal",
                "pem": "none",
                "swg": "none",
                "urldb": "none"
            },
            "NTP": {
                "timezone": "America/Los_Angeles"
            },
            "DNS": {
                "nameServers": [
                    "172.27.1.1"
                ],
                "search": [
                    "pdsea.f5net.com"
                ]
            },
            "VLAN": {},
            "SelfIp": {},
            "Route": {},
            "ConfigSync": {
                "configsyncIp": "none"
            }
        }
    }


.. |br| raw:: html
   
   <br />

