.. _pointers:

JSON Pointers
-------------
BIG-IP Declarative Onboarding allows you to use JSON pointers in your declarations to reference other objects.  A BIG-IP Declarative Onboarding pointer can identify each node in a declaration. RFC6901 JSON Pointers and RFC Draft Relative JSON Pointers are the basis for BIG-IP Declarative Onboarding pointers, but support special relative references which are meaningful only within BIG-IP Declarative Onboarding declarations.

BIG-IP Declarative Onboarding often uses BIG-IP Declarative Onboarding pointers to refer to objects/properties in declarations. These are analogous to filesystem pathnames so they should be familiar.

An "absolute" BIG-IP Declarative Onboarding pointer identifying some property in a declaration named item looks like (for example) /T/P/item.

It begins with / (slash) to indicate that it starts from the root of the declaration (which is a JSON object having class=Device). The next token (tokens are the words between the slashes, "T" in the example) is the name of some property in the root object. Most often "T" will be the name of the BIG-IP partition/tenant **/Common**. The exception is when you are using the **DO** class as a wrapper for deploying BIG-IP Declarative Onboarding in a container and using the Credentials pointer.  In this case, the pointer would start with /declaration/Credentials. When using this pointer in the main part of the declaration (the Device class), you would not need /declaration, and would only use /Credentials.

The next token ("P" in the example) is the name of some property of the object named "T". Most often "P" will be the name of the BIG-IP Declarative Onboarding property, such as failoverGroup. The final token of the pointer names the property of interest ("item" in the example).

A BIG-IP Declarative Onboarding pointer may have more or fewer than three tokens. You can identify JSON array elements by numbers (because they do not have names); for example, the pointer /Common/failoverGroup/members/0 would refer to the failoverGroup property of the first object in the members array property.


To see which properties can use JSON pointers, see the  |schema| and look for properties that accept the JSON Pointer which are identified with ``{ "format": "json-pointer" }``.

This section contains examples of how to use these pointers in your declarations.


Credentials
~~~~~~~~~~~
In BIG-IP Declarative Onboarding 1.2.0 and later, you can use the **Credentials** pointer to set credentials (or an array of credentials) to use later in your declaration.

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

You can see a full example of Credentials in action in :ref:`example3`.

Referencing other objects in a declaration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
You can also reference other objects you define in a declaration, as shown in :ref:`clustering`.

For example, you have the following lines in your declaration.

.. code-block:: shell

    "external-self": {
            "class": "SelfIp",
            "address": "192.0.2.4/24",
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



.. |schema| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/tree/main/schema" target="_blank">BIG-IP Declarative Onboarding Schema files on Github</a>
