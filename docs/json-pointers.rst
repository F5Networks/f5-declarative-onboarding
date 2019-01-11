
JSON Pointers
-------------
Declarative Onboarding allows you to use JSON pointers in your declarations to reference other objects.  This section contains examples of how to use these pointers in your declarations.

Credentials
~~~~~~~~~~~
In Declarative Onboarding 1.2.0 and later, you can use the **Credentials** pointer to set credentials (or an array of credentials) to use later in your declaration.  

For example, you could set the credentials for a BIG-IP device using the following example.  This creates a numbered array which starts at 0. 

.. code-block:: shell

    "Credentials": [
        {
            "username": "bigIpAdmin",
            "password": "aStrongPass1word"
        },
        {
            "username": "admin",
            "password": "StronGer2passWord"
        }
    ],
        
And then call the credentials later in the declaration, for example

.. code-block:: shell

    "bigIpUsername": "/Credentials/0/username",
    "bigIpPassword": "/Credentials/0/password",

You can see a full example of Credentials in action in :ref:`example6`.

Referencing other objects in a declaration
------------------------------------------
You can also reference other objects you define in a declaration, as shown in :ref:`clustering`.  (are there limits or certain properties that can be pointers?)

For example, you have the following lines in your declaration.

.. code-block:: shell

    "external-self": {
            "class": "SelfIp",
            "address": "1.2.3.4/24",
            "vlan": "external",
            "allowService": "default",
            "trafficGroup": "traffic-group-1"
        },

In the same declaration, you can reference an object from external-self. In this case, you must use the tenant/partition name on the BIG-IP, which is /Common.  For example:

.. code-block:: shell

    "configsync": {
        "class": "ConfigSync",
        "configsyncIp": "/Common/external-self/address"
    },
    "failoverAddress": {
        "class": "FailoverUnicast",
        "address": "/Common/external-self/address"
    }


For the full clustering example declaration which includes multiple JSON pointers, see :ref:`example2`.