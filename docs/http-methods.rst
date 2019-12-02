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

.. _postnote:

**NOTE**: When using Declarative Onboarding 1.4.0 and later, the response to a POST includes additional fields that help handle onboarding multiple BIG-IP devices using the Container without waiting for previous declarations to finish onboarding.  These fields are **id** and **selfLink**.  For example, a POST using 1.4.0 returns the following:

.. code-block:: bash
   :emphasize-lines: 2-3

    {
        "id": "d1f131b6-9e93-49a5-9fed-a068d34e274a",
        "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/d1f131b6-9e93-49a5-9fed-a068d34e274a",
        "result": {
            "class": "Result",
            "code": 202,
            "status": "RUNNING",
            "message": "processing"
        },
        "declaration": {…
        }
    }




GET
~~~
You can use the GET method to retrieve the status of declarations you previously sent to Declarative Onboarding. Use the GET method to the URI
``https://<BIG-IP>/mgmt/shared/declarative-onboarding``.  Only declarations you create
in Declarative Onboarding return, GET does not return anything that was not created by Declarative Onboarding.

.. NOTE:: If you are using a single NIC BIG-IP system, you must include port 8443 after your IP address in your GET: **https://<BIG-IP>:8443/mgmt/shared/declarative-onboarding**

.. _getquery:

GET query parameters
^^^^^^^^^^^^^^^^^^^^

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   **statusCodes** is available in DO v1.9.0 and later. 

You can use the following optional URL query parameters with a GET request.  

The statusCodes parameter is only available in DO 1.9.0 and later.  

+-------------------------+----------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Query Parameter         | Options              | Description/Notes                                                                                                                                                                                                                                                                                                                                                                 |
+=========================+======================+===================================================================================================================================================================================================================================================================================================================================================================================+
| show                    | full                 | Using **?show=full** retrieves the original and current configuration.                                                                                                                                                                                                                                                                                                            |
+-------------------------+----------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| statusCodes             | legacy, experimental | In DO 1.9.0+, using statusCodes determines how DO returns HTTP status codes. **Legacy** is the default, the GET response would return any errors as the HTTP status, but the GET request itself would not error. With **experimental**, a GET request returns a 200 status code unless there is an actual issue with the request. The results of the request contain the status.  |
+-------------------------+----------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Examples**

-	``https://MGMT_IP/mgmt/shared/declarative-onboarding?show=full`` |br| DO returns the original and current configuration.
-	``https://MGMT_IP/mgmt/shared/declarative-onboarding?statusCodes=legacy``  |br| If there is an error, the GET response would return that error as the HTTP status, but the GET request itself would not error.
-	``https://MGMT_IP/mgmt/shared/declarative-onboarding?statusCodes=experimental``  |br| Returns a 200 HTTP status code unless there is an issue with the request.  The results contain the status. 

|

.. _getnote:

Additional endpoints for GET
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Declarative Onboarding v1.4 introduced two new endpoints for the GET method

- ``/shared/declarative-onboarding/task`` with optional ``/<taskId>``  
  If you do not specify a taskId, DO returns an array of all tasks. If you use the taskId, DO returns the specific task.  The response looks like that for the POST response.

  For example, sending a GET to the **/task** endpoint looks like the following when the task is in progress:

.. code-block:: bash
   :emphasize-lines: 7-9

    [
        {
            "id": "da2dea41-878d-4221-9c5b-599ac75def9c",
            "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/da2dea41-878d-4221-9c5b-599ac75def9c",
            "result": {
                "class": "Result",
                "code": 202,
                "status": "RUNNING",
                "message": "processing"
            },
            "declaration": {
                ....
            }
        }
    ]


When the task has completed, you see the code, status and message change:

.. code-block:: bash
   :emphasize-lines: 7-9

    [
        {
            "id": "da2dea41-878d-4221-9c5b-599ac75def9c",
            "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/da2dea41-878d-4221-9c5b-599ac75def9c",
            "result": {
                "class": "Result",
                "code": 200,
                "status": "OK",
                "message": "success"
            },
            "declaration": {
                ....
            }
        }
    ]

|

- ``/shared/declarative-onboarding/config/<machineId>``  
  Returns the original configuration of the specified device (identified by device machineId), or all devices if no machineId is given.  This endpoint is for informational/debugging purposes only, and is not something you need in the day-to-day use of Declarative Onboarding.
  
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
                    "example.com"
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

|

.. _inspect-endpoint:

Using GET with the /inspect endpoint
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **/inspect** endpoint for GET is available in DO v1.7.0 and later. 

In DO version 1.7.0 and later, you can use a GET request to the /inspect endpoint to retrieve the current BIG-IP configuration. This information can be used for modifying the DO declaration before the first POST.  The response returns the classes that DO is aware of and their current state, in the format of a DO declaration.

The full endpoint is **https://MGMT_IP/mgmt/shared/declarative-onboarding/inspect**

You can use the following optional URL query parameters with a GET request to the /inspect endpoint:

+-------------------------+--------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Query Parameter         | Options      | Description/Notes                                                                                                                                                                                       |
+=========================+==============+=========================================================================================================================================================================================================+
| targetHost              | IP or string | targetHost allows you to specify the IP address or domain name of the host from which you want to retrieve the current configuration. If you do not use this parameter, localhost is used.              |
+-------------------------+--------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetPort              | integer      | The port for the targetHost (min=0, max=65535).  The default value is either 443 or 8443; if no targetPort value is provided, DO tries to establish a connection to the host using one of these ports). |
+-------------------------+--------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetUsername          | string       |  The username for the targetHost.  The default is **admin**                                                                                                                                             |
+-------------------------+--------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| targetPassword          | string       |  The password for the targetHost.  The default is **admin**                                                                                                                                             |
+-------------------------+--------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Examples**

-	``https://MGMT_IP/mgmt/shared/declarative-onboarding/inspect`` |br| DO will try to fetch configuration from localhost (allowed only when running on BIG-IP).
-	``https://MGMT_IP/mgmt/shared/declarative-onboarding/inspect?targetHost=X.X.X.X``  |br| DO will try to fetch configuration from host X.X.X.X, port 443 or 8443, username === admin and password === admin 
-	``https://MGMT_IP/mgmt/shared/declarative-onboarding/inspect?targetHost=X.X.X.X&targetPort=443&targetUsername=ZZZ&targetPassword=AAA``  |br| DO will try to fetch configuration from host X.X.X.X, port 443, username === ZZZ and password === AAA 


Example response from a GET request to the /inspect endpoint:

.. code-block:: json
   
   [
        {
            "id": 0,
            "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/inspect",
            "result": {
                "class": "Result",
                "code": 200,
                "status": "OK",
                "message": "",
                "errors": []
            },
            "declaration": {
                "class": "DO",
                "declaration": {
                    "class": "Device",
                    "schemaVersion": "1.7.0",
                    "Common": {
                        "class": "Tenant",
                        "hostname": "localhost.localhostdomain",
                        "currentProvision": {
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
                            "urldb": "none",
                            "class": "Provision"
                        },
                        "currentNTP": {
                            "timezone": "America/Los_Angeles",
                            "class": "NTP"
                        },
                        "currentDNS": {
                            "nameServers": [
                                "192.0.2.14"
                            ],
                            "search": [
                                "localhost"
                            ],
                            "class": "DNS"
                        }
                    }
                }
            }
        }
    ]


| 

**Possible error codes when using the /inspect endpoint**

.. list-table::
      :widths: 15 25 90
      :header-rows: 1

      * - Code
        - Message
        - explanation

      * - 408
        - Request Timeout
        - DO unable to return declaration after 60sec.

      * - 412
        - Precondition failed
        - DO unable to verify declaration produced by Inspect Handler (/inspect).

      * - 400
        - Bad Request
        - Query or query parameters are invalid.

      * - 403
        - Forbidden
        - DO should be executed on BIG-IP or the user should specify target* parameter(s).

      * - 409
        - Conflict
        - DO cannot provide valid declaration because some of the objects share the same name (for instance VLAN and SelfIp can share **internal** name). Response stills contain declaration which contains INVALID items (suffixed with INVALID_X). See the following example.


Example of the response for error 409

.. code-block:: json
   
   [
        {
            "id": 0,
            "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/inspect",
            "code": 408,
            "status": "ERROR",
            "message": "Conflict",
            "errors": [
                "Declaration contains INVALID items (suffixed with INVALID_X)"
            ],
            "result": {
                "class": "Result",
                "code": 408,
                "status": "ERROR",
                "message": "Conflict",
                "errors": [
                    "Declaration contains INVALID items (suffixed with INVALID_X)"
                ]
            },
            "declaration": {
                "class": "DO",
                "declaration": {
                    "class": "Device",
                    "schemaVersion": "1.7.0",
                    "Common": {
                        "class": "Tenant",
                        "hostname": "at-13-1-4.localhost",
                        "internal_INVALID_1": {
                            "mtu": 1500,
                            "tag": 4092,
                            "cmpHash": "default",
                            "interfaces": [
                                {
                                    "name": "1.3",
                                    "tagged": false
                                }
                            ],
                            "class": "VLAN"
                        },
                        "internal_INVALID_2": {
                            "trafficGroup": "traffic-group-local-only",
                            "vlan": "internal",
                            "address": "10.0.50.3/24",
                            "allowService": "none",
                            "class": "SelfIp"
                    }
                    }
                }
            }
        }
    ]


|



.. |br| raw:: html
   
   <br />

