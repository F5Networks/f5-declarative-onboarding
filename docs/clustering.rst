.. _clustering:  


Composing a Declarative Onboarding declaration for a cluster of BIG-IPs
-----------------------------------------------------------------------

Declarative Onboarding can also onboard a cluster (two or more) of BIG-IP systems.  (more description here)


In this example, we are only including the classes that are specific to clustering.  For a complete declaration, you could add the classes shown in :doc:`composing-a-declaration` to configure DNS, NTP, VLANs, Routes and more.

The following declaration snippet could continue after the :ref:`route-class` in the standalone BIG-IP example.

.. code-block:: javascript
   :linenos:

    "configsync": {
                "class": "ConfigSync",
                "configsyncIp": "/Common/external-self/address"
            },
            "failoverAddress": {
                "class": "FailoverUnicast",
                "address": "/Common/external-self/address"
            },
            "failoverGroup": {
                "class": "DeviceGroup",
                "type": "sync-failover",
                "members": ["bigip1.example.com", "bigip2.example.com"],
                "owner": "/Common/failoverGroup/members/0",
                "autoSync": true,
                "saveOnAutoSync": false,
                "networkFailover": true,
                "fullLoadOnSync": false,
                "asmSync": false
            },
            "trust": {
                "class": "DeviceTrust",
                "localUsername": "admin",
                "localPassword": "pass1word",
                "remoteHost": "/Common/failoverGroup/members/0",
                "remoteUsername": "admin",
                "remotePassword": "pass2word"
            }
        }
    }