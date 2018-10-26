Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with AS3.

If you are not familiar with the BIG-IP and REST APIs, or want more detailed instructions, continue with :doc:`using-as3`.

#. Download the latest RPM package from |github| in the **dist** directory.
#. Upload and install the RPM package on the using the BIG-IP GUI:

   - :guilabel:`Main tab > iApps > Package Management LX > Import`
   - Select the downloaded file and click :guilabel:`Upload`
   - For complete instructions see :ref:`installgui-ref` or
     :ref:`installcurl-ref`.

#. Be sure to see the known issues on GitHub (https://github.com/F5Networks/f5-appsvcs-extension/issues)  and :doc:`tips-warnings` pages to review any known issues and other important information before you attempt to use AS3.

#. Provide authorization (basic auth) to the BIG-IP system:  

   - If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions.
   - If using cURL, see :ref:`installcurl-ref`.

#. *Optional*: Using a RESTful API client like Postman, POST an open and
   closed bracket (**{}**) to the URI
   ``https://<BIG-IP>/mgmt/shared/appsvcs/selftest`` to ensure AS3 is running
   properly.

#. Copy one of the :ref:`examples` which best matches the configuration you want
   to use.  Alternatively, you can use the simple "Hello World" example below,
   which is a good start if you don't have an example in mind.

#. Paste the declaration into your API client, and modify names and IP addresses
   as applicable.  See :ref:`schema-reference` for additional options you can
   declare.

#. POST to the URI ``https://<BIG-IP>/mgmt/shared/appsvcs/declare``

**Quick Start Example**

.. code-block:: json
   :linenos:

    {
        "class": "AS3",
        "action": "deploy",
        "persist": true,
        "declaration": {
            "class": "ADC",
            "schemaVersion": "3.0.0",
            "id": "urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d",
            "label": "Sample 1",
            "remark": "Simple HTTP Service with Round-Robin Load Balancing",
            "Sample_01": {
                "class": "Tenant",
                "A1": {
                    "class": "Application",
                    "template": "http",
                    "serviceMain": {
                        "class": "Service_HTTP",
                        "virtualAddresses": [
                            "10.0.1.10"
                        ],
                        "pool": "web_pool"
                    },
                    "web_pool": {
                        "class": "Pool",
                        "monitors": [
                            "http"
                        ],
                        "members": [
                            {
                                "servicePort": 80,
                                "serverAddresses": [
                                    "192.0.1.10",
                                    "192.0.1.11"
                                ]
                            }
                        ]
                    }
                }
            }
        }
    }


.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-appsvcs-extension" target="_blank">F5 AS3 site on GitHub</a>