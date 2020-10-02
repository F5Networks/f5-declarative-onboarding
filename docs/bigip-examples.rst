.. _bigipexamples:

BIG-IP and general example declarations
---------------------------------------
The following are example declarations for BIG-IP, with some general examples that could also be used with BIG-IQ and the container.


1: Standalone declaration
^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a standalone BIG-IP system. See :doc:`composing-a-declaration` for specific details on this example.

.. literalinclude:: ../examples/onboard.json
   :language: json


:ref:`Back to top<bigipexamples>`

|


.. _example2:

2: Clustered declaration
^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../examples/onboardFailover.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example6:

3: Using JSON Pointers
^^^^^^^^^^^^^^^^^^^^^^
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../examples/licenseViaBigIqReachableASG.json
   :language: json


:ref:`Back to top<bigipexamples>`

|

.. _avrstream:


4: Creating an Analytics profile to enable AVR data streaming
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the Analytics profile is available in Declarative Onboarding v1.5.0 and later.

In this example, we are licensing a new BIG-IP, provisioning AVR, and creating an Analytics profile (you must have AVR provisioned to create an Analytics profile).  This allows you to stream AVR data for consumption by F5 Telemetry Steaming or similar applications.

.. literalinclude:: ../examples/avrStreamingSupport.json
   :language: json
   :emphasize-lines: 17, 19-29


:ref:`Back to top<bigipexamples>`

|

.. _keys:

5: Adding public SSH keys to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **keys** property of the User class is available in DO v1.5.0 and later.

In this example, we are adding public SSH keys to the root user and a guestUser. This can provide a higher level of security and easier automation.

**Important notes about using the keys property**

- Only the root user's primary key (noted by the ``Host Processor Superuser``), in authorized_keys will be preserved. All other keys configured prior to running this declaration, WILL BE DELETED.
- If the **keys** field is left empty it will default to an empty array. This means leaving it empty will clear the authorized_keys file, except for the root's master key.
- For non-root users, the path to the authorized_keys is **/home/{username}/.ssh/authorized_keys**.
- For root, the path is **/root/.ssh/authorized_keys**.
- DO will set the non-root user's .ssh directory permissions to 700, with the authorized_keys permissions set to 600.

.. literalinclude:: ../examples/publicKeys.json
   :language: json
   :emphasize-lines: 13-16, 27-30


:ref:`Back to top<bigipexamples>`

|

.. _rdomain:

6: Adding Route Domains to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **routeDomain** class is available in DO v1.6.0 and later.

In this example, we show how to use a Route Domain in a declaration.  A route domain is a configuration object that isolates network traffic for a particular application on the network.  For more information on Route Domains, see |rddoc|.

In the following declaration, we include a VLAN to show how to reference a VLAN that is being created.  The SelfIp and the Route both show using the RouteDomain with **%100**, which is the **id** of the RouteDomain.



.. literalinclude:: ../examples/routeDomains.json
   :language: json
   :emphasize-lines: 21, 25, 28-46


:ref:`Back to top<bigipexamples>`

|

.. _dag:

7: Setting the DAG IPv6 prefix length
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **DagGlobals** class is available in DO v1.7.0 and later.

In this example, we show how to use the DagGlobals class to set or modify the DAG global IPv6 prefix length.  DAG Globals contain the global disaggregation settings; see the |dagdoc| documentation for more information.

In the following declaration snippet, we show only the DagGlobals class.  You can use this class as a part of a larger Declarative Onboarding declaration.



.. literalinclude:: ../examples/dagGlobals.json
   :language: json



:ref:`Back to top<bigipexamples>`

|

.. _snmp:

8: Configuring SNMP in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure SNMP in a declaration is available in DO v1.7.0 and later.

In this example, we show how to configure SNMP in a Declarative Onboarding declaration.  You can use DO to configure SNMP agents, users, communities, trap events, and trap destinations.  See the |snmpdoc| in the BIG-IP documentation for specific information.

In the following declaration snippet we show only the classes related to SNMP.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/snmp.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _authmethods:

9: Configuring BIG-IP authentication methods
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to enable SSL for LDAP is available in DO 1.13 and later

In this example, we show how to configure RADIUS, LDAP, and TACACS authentication in a Declarative Onboarding declaration using the **Authentication** class. The authentication class can (but does not have to) contain multiple authentication method subclasses but only one can be enabled at a time using the **enableSourceType** property (which matches the BIG-IP UI behavior).

This example declaration contains all three authentication methods with the **enableSourceType** property set to **radius**. It also includes the SSL options for LDAP introduced in DO 1.13.

For more information on options and DO usage, see |auth| and the subsequent entries in the Schema Reference.

In the following declaration snippet we show only the classes related to authentication.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/authMethods.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _remoterole:

10: Configuring Remote Roles for authentication
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure remote roles for authentication is available in DO v1.7.0 and later.

In this example, we show how to configure a remote role for authentication using the **RemoteAuthRole** class. See |loref| in the Schema reference for a description of each of the parameters for this class.

**Important**: The BIG-IP only allows one role per user for each partition/tenant.  Because some remote servers allow multiple user roles, the BIG-IP uses the **lineOrder** parameter to choose one of the conflicting roles for the user at login time. In these cases, the system chooses the role with the lowest line-order number.  See |lineorder| in the BIG-IP documentation for more information and examples.

In the following declaration snippet we show only the classes related to remote auth roles.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/remoteRoles.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _trafcontrol:

11: Configuring Traffic Control properties
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring all LTM global traffic control properties is available in DO v1.7.0 and later.

In this example, we show how you can configure BIG-IP LTM global traffic control settings (ltm global-settings traffic-control) using a Declarative Onboarding declaration. For descriptions and usage details on these properties, see |tcref| in the Schema Reference.

In the following declaration snippet we show only the classes related to Traffic Control.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/trafficControl.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _syslogdest:

12: Configuring a System Log (syslog) Destination in declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The ability to configure a syslog destination is available in DO v1.7.0 and later.

In this example, we show how to configure a syslog destination using the **SyslogRemoteServer** class.  For information on syslog destinations, see |sldocs| and the |slkb| Knowledge Base article.  Also see |slref| in the Schema reference for usage options.

**Important**: The remote syslog server must be accessible from your BIG-IP system on the default route domain (Domain 0) or management network, and conversely, your BIG-IP system is accessible from the remote syslog server.

In the following declaration snippet we show only the SyslogRemoteServer class.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/syslogDestination.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _cmphash:

13: Using the CMP Hash property in a VLAN
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The VLAN property **cmp-hash** is available in DO v1.7.0 and later.

Starting in 1.7.0, you have the option of using the **cmp-hash** property on a VLAN.  The CMP Hash setting allows all connections from a client system to use the same set of TMMs, improving system performance. For more information, see |cmpdocs| in the BIG-IP documentation.  You can also see |cmpref| in the Schema Reference for usage options.

In the following declaration snippet we show only the VLAN class with cmp-hash using Source Address as the traffic disaggregation method.  You can use this class as a part of a larger Declarative Onboarding declaration.

.. literalinclude:: ../examples/vlanCmpHash.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _sshex:

14: Configuring SSHD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring the allowed source IP addresses for SSHD is available in DO v1.15 and later. 

In this example, we show how you can configure SSHD (SSH daemon) settings in a Declarative Onboarding declaration. For usage and options, see |sshd| in the Schema Reference.

In the following declaration, we show only the SSHD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 

**New in DO 1.15** |br|
Declarative Onboarding v1.15 and later includes the ability to set the source IP addresses that are allowed to log into the system, using the new **allow** property. You can allow all addresses by using the **all** value, or disallow all addresses using the **none** value; otherwise, you can specify an array of IP address as shown in the updated example.

.. IMPORTANT:: If you attempt to use the following declaration on a version prior to 1.15, it will fail.  To use the example on a previous version, delete the **allow** property and IP addresses (the hightlighted lines)

.. literalinclude:: ../examples/sshd.json
   :language: json
   :emphasize-lines: 10-14

:ref:`Back to top<bigipexamples>`

|

.. _httpdex:

15: Configuring HTTPD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring HTTPD settings is available in DO v1.8 and later. 

In this example, we show how you can configure HTTPD (HTTP daemon) settings in a Declarative Onboarding declaration. For usage and options, see |httpd| in the Schema Reference.

.. NOTE:: If you use the BIG-IP Configuration utility, we recommend you exit the utility before changes are made to the system using the HTTPD component. Making changes to the system using this component causes a restart of the httpd daemon, and restarting the httpd daemon requires a restart of the Configuration utility.

In the following declaration, we show only the HTTPD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 


.. literalinclude:: ../examples/httpd.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _systemex:

16: Configuring System settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for disabling the auto-check feature is available in DO v1.13 and later. 

In this example, we show how you can configure some System settings in a Declarative Onboarding declaration. This enables you to set auto-timeout values for serial console (CLI) and TMSH interactive mode sessions, as well as set a hostname, if you have not set one in the Common class. 

.. IMPORTANT:: If you set a hostname in the Common class, you cannot use the hostname property in the System class; they are mutually exclusive.

For usage and options, see |sysclass| in the Schema Reference.

DO 1.13 introduced the ability to disable the automatic update check feature.  The autoCheck property controls whether the BIG-IP checks for and recommends software updates.  See |k15000| for more information. 

In the following declaration, we show only the System class (including autoCheck introduced in 1.13).  You can use this class as a part of a larger Declarative Onboarding declaration. 

**Important**: If you try to use this declaration with a DO version prior to 1.13, it will fail.  Either upgrade to 1.13, or remove the autoCheck line.


.. literalinclude:: ../examples/system.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example17:

17: Clustered declaration with IP addresses for Device Group owner and members
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for using IP addresses for Device Group owners and members is available in DO v1.11 and later. 

The following is an example declaration that onboards a clustered BIG-IP system, but shows how you can use an IP address for the Device Group members and owner.  

See :ref:`devicegroup` for more information.

.. literalinclude:: ../examples/clusterWithIpAddresses.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example18:

18: Updating the TLS/SSL Device Certificate in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for including a TLS/SSL device certificate and key is available in DO v1.12 and later. 

This example declaration shows how you can create/upload a device certificate in a Declarative Onboarding declaration. The BIG-IP system uses the device certificate to authenticate access to the Configuration utility and to accommodate device-to-device communication processes, such as configuration synchronization. 

For more information and how this process works manually, see the KB article |certdoc|.

A couple of things to note when including certificates and keys in a declaration:

- DO always writes to **/config/httpd/conf/ssl.crt/server.crt** and **ssl.key/server.key**
- If the device certificate is updated (that is, if the certificate in the declaration does not match the certificate in those directories), DO reboots the BIG-IP device in order to include the updated certificate
- DO makes backups of the certificates and keys in those directories before overwriting the existing certificate and key
- Like other settings in DO, if a subsequent declaration is posted without the certificate, DO will restore the certificate that was there when it first ran.

See |certclass| in the schema reference for more information and usage.

.. literalinclude:: ../examples/deviceCertificate.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example19:

19: Using the userAgent Controls property 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **userAgent** is available in DO v1.13 and later

In this example, we show how you can use the **userAgent** property in the new **Controls** class. The userAgent property allows you to set a unique identifier in usage data.

This declaration includes the Controls class with userAgent set to **BIG-IQ/7.1 Configured by API**.  

See |controls| in the Schema Reference for more information.


.. literalinclude:: ../examples/userAgent.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example20:

20: Configuring Audit Logging in a declaration  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring audit logging is available in DO v1.13 and later

In this example, we show how you can configure audit logging in the System class of a Declarative Onboarding declaration.  This allows audit logging to start as early as possible.

See |sysclass| in the Schema Reference for DO usage and options. For detailed information about audit logging on the BIG-IP, see the |auditlog|.

.. IMPORTANT:: **guiAuditLog** is only available on TMOS v14.0 and later


.. literalinclude:: ../examples/auditLogging.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example21:

21: Configuring MAC Masquerading on Traffic Groups 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for MAC Masquerade on Traffic Groups is available in DO v1.13 and later

In this example, we show how you can configure MAC Masquerading on Traffic Groups.  This is a part of the new **MAC_Masquerade** class.  

For detailed information about Mac Masquerade on the BIG-IP, see |mmkb|.

See |macm| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../examples/macMasquerade.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example22:

22: Configuring VLAN Failsafe 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for VLAN Failsafe is available in DO v1.14 and later

In this example, we show how you can configure VLAN Failsafe settings in a Declarative Onboarding declaration.  This is a part of the |cmpref|, and includes the new properties **failsafeEnabled**, **failsafeAction**, and **failsafeTimeout**.

For detailed information about VLAN Failsafe on the BIG-IP, see |vlanfs|.

See |cmpref| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../examples/vlanFailsafe.json
   :language: json


:ref:`Back to top<bigipexamples>`

|

.. _example23:

23: Configuring a DNS Resolver 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for DNS Resolvers is available in DO v1.14 and later

In this example, we show how you create a DNS Resolver in a Declarative Onboarding declaration using the |dnsresolver| class introduced in DO 1.14. The DNS Resolver is the internal DNS resolver the BIG-IP system uses to fetch the internal proxy response. 

See |dnsresolver| in the Schema Reference for DO usage and options. 

For detailed information about the DNS Resolver, see |dnsdoc| on AskF5.


.. literalinclude:: ../examples/dnsResolver.json
   :language: json

|

.. _example24:

24: Configuring a TCP Forward Tunnel 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for TCP Forward Tunnels is available in DO v1.14 and later

In this example, we show how you create a TCP Forward Network Tunnel in a Declarative Onboarding declaration using the |tunnel| class introduced in DO 1.14. 

Currently, **tcp_forward** is the only profile (**tunnelType**) Declarative Onboarding supports.  The tcp_forward profile specifies a tunnel used for forward proxy connections.

See |tunnel| in the Schema Reference for DO usage and options. 


.. literalinclude:: ../examples/tcpForwardTunnel.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example25:

25: Configuring Traffic Groups 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for Traffic Groups is available in DO v1.14 and later

This example shows how to create Traffic Groups using Declarative Onboarding 1.14 and later. A traffic group is a group of configuration objects on a BIG-IP which is able to float to another device in a device group in case of failure.  For more information, see :ref:`trafficgroup` on the Clustering page, and |tgdoc|.

See |tg| in the Schema Reference for DO usage and options.  

.. IMPORTANT:: The HA Score failover method is not currently supported. DO uses the HA Order failover method. |br| |br| Because DO uses HA Order for failover, the declaration must include a hostname, located inside of a deviceGroup. In the following example, the declaration defines a Device Group with a host name.  See :ref:`devicegroup` for information on Device Groups.


.. literalinclude:: ../examples/trafficGroups.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example26:

26: Configuring multiple failover unicast addresses 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for multiple failover unicast addresses is available in DO v1.15 and later

This example shows how to specify multiple failover unicast addresses using Declarative Onboarding 1.15 and later. The unicast addresses you specify are the main address that other devices in the device group use to communicate continually with the local device to assess the health of that device. For more information on failover on the BIG-IP, see |failover|. 

For additional information, see :ref:`failover-uni-class` on the Clustering page. See |unicast| in the Schema Reference for DO usage and options.  

To use this feature:

- The failover unicast addresses must be pointing at IP addresses on the BIG-IP system (Self IP addresses)
- Self IPs require a VLAN.  Some systems, such as 1 NIC BIG-IP systems, are not able to have multiple VLANs.  Check the device on which you are deploying a declaration using this feature.

In the following example, the declaration creates a VLAN, that is then used by 2 external Self IP addresses, and then updates the device with two Failover Unicast addresses. 

.. literalinclude:: ../examples/multipleFailoverUnicasts.json
   :language: json

:ref:`Back to top<bigipexamples>`

|

.. _example27:

27: Enabling traces in DO responses 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **trace** and **traceResponse** is available in DO v1.15 and later. 

In this example, we show how you can use the **trace** and **traceResponse** properties to enable more visibility into what DO is configuring.  These properties are included in the |controls| class.

.. WARNING:: Trace files may contain sensitive configuration data.

When **trace** is set to **true** (the default is false), DO creates a detailed trace of the configuration process for subsequent analysis. This information is written to files in the **/tmp** directory where DO is running. |br|
The files are:

- /tmp/DO_current.json
- /tmp/DO_desired.json
- /tmp/DO_diff.json


When **traceResponse** is set to **true** (the default is false), the response (or response to a subsequent GET request in the case of asynchronous requests) contains the same information that would be found in the trace files.

This example shows both the declaration and the response from DO.  

.. literalinclude:: ../examples/debugTrace.json
   :language: json

|

**Example Response** |br|
Here is the response returned by DO from the declaration, showing the trace for the tenant (your output will vary based on the configuration of your device).

.. code-block:: json

   {
      "id": "e34cd96e-a1dc-4432-9efa-ff687e09117f",
      "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/e34cd96e-a1dc-4432-9efa-ff687e09117f",
      "result": {
         "class": "Result",
         "code": 200,
         "status": "OK",
         "message": "success"
      },
      "declaration": {
         "schemaVersion": "1.15.0",
         "class": "Device",
         "async": true,
         "webhook": "https://example.com/myHook",
         "label": "my BIG-IP declaration for declarative onboarding",
         "controls": {
               "trace": true,
               "traceResponse": true
         },
         "Common": {
               "class": "Tenant",
               "mySystem": {
                  "class": "System",
                  "hostname": "bigip.example.com",
                  "cliInactivityTimeout": 1200,
                  "consoleInactivityTimeout": 1200,
                  "autoPhonehome": false
               }
         }
      },
      "traces": {
         "desired": {
               "Common": {
                  "System": {
                     "hostname": "bigip.example.com",
                     "cliInactivityTimeout": 1200,
                     "consoleInactivityTimeout": 1200,
                     "autoPhonehome": false
                  },
                  "DNS": {
                     "nameServers": [
                           "172.27.1.1"
                     ],
                     "search": [
                           "localhost"
                     ]
                  },
                  "NTP": {
                     "timezone": "America/Los_Angeles"
                  },
                  "Provision": {
                     "afm": "none",
                     "am": "none",
                     "apm": "none",
                     "asm": "none",
                     "avr": "none",
                     "cgnat": "none",
                     "dos": "none",
                     "fps": "none",
                     "gtm": "none",
                     "ilx": "none",
                     "lc": "none",
                     "ltm": "nominal",
                     "pem": "none",
                     "sslo": "none",
                     "swg": "none",
                     "urldb": "none"
                  },
                  "VLAN": {},
                  "DNS_Resolver": {
                     "f5-aws-dns": {
                           "name": "f5-aws-dns",
                           "answerDefaultZones": false,
                           "cacheSize": 5767168,
                           "randomizeQueryNameCase": true,
                           "routeDomain": "0",
                           "useIpv4": true,
                           "useIpv6": true,
                           "useTcp": true,
                           "useUdp": true,
                           "forwardZones": [
                              {
                                 "name": "amazonaws.com",
                                 "nameservers": [
                                       {
                                          "name": "8.8.8.8:53"
                                       }
                                 ]
                              },
                              {
                                 "name": "idservice.net",
                                 "nameservers": [
                                       {
                                          "name": "8.8.8.8:53"
                                       }
                                 ]
                              }
                           ]
                     }
                  },
                  "Trunk": {},
                  "SelfIp": {},
                  "Route": {},
                  "ConfigSync": {
                     "configsyncIp": "none"
                  },
                  "FailoverUnicast": {
                     "unicastAddress": "none"
                  },
                  "ManagementRoute": {
                     "default": {
                           "name": "default",
                           "mtu": 0,
                           "network": "default",
                           "gw": "10.145.127.254"
                     }
                  },
                  "RouteDomain": {
                     "0": {
                           "name": "0",
                           "connectionLimit": 0,
                           "id": 0,
                           "strict": true,
                           "vlans": [
                              "/Common/http-tunnel",
                              "/Common/socks-tunnel",
                              "/Common/external",
                              "/Common/internal"
                           ]
                     }
                  },
                  "Authentication": {
                     "fallback": false,
                     "enabledSourceType": "local",
                     "remoteUsersDefaults": {
                           "role": "no-access",
                           "partitionAccess": "all",
                           "terminalAccess": "disabled"
                     }
                  },
                  "RemoteAuthRole": {},
                  "SnmpAgent": {
                     "contact": "Customer Name <admin@customer.com>",
                     "location": "Network Closet 1",
                     "allowList": [
                           "127.0.0.0/8"
                     ]
                  },
                  "SnmpTrapEvents": {
                     "device": true,
                     "authentication": false,
                     "agentStartStop": true
                  },
                  "SnmpUser": {},
                  "SnmpCommunity": {
                     "comm-public": {
                           "name": "public",
                           "access": "ro",
                           "ipv6": false,
                           "source": "default"
                     }
                  },
                  "SnmpTrapDestination": {},
                  "DagGlobals": {
                     "icmpHash": "icmp",
                     "roundRobinMode": "global",
                     "ipv6PrefixLength": 128
                  },
                  "TrafficControl": {
                     "acceptIpOptions": false,
                     "acceptIpSourceRoute": false,
                     "allowIpSourceRoute": false,
                     "continueMatching": false,
                     "maxIcmpRate": 100,
                     "maxRejectRate": 250,
                     "maxRejectRateTimeout": 30,
                     "minPathMtu": 296,
                     "pathMtuDiscovery": true,
                     "portFindThresholdTimeout": 30,
                     "portFindThresholdTrigger": 8,
                     "portFindThresholdWarning": true,
                     "rejectUnmatched": true,
                     "maxPortFindLinear": 16,
                     "maxPortFindRandom": 16
                  },
                  "HTTPD": {
                     "allow": [
                           "All"
                     ],
                     "authPamIdleTimeout": 1200,
                     "maxClients": 10,
                     "sslCiphersuite": [
                           "ECDHE-RSA-AES128-GCM-SHA256",
                           "ECDHE-RSA-AES256-GCM-SHA384",
                           "ECDHE-RSA-AES128-SHA",
                           "ECDHE-RSA-AES256-SHA",
                           "ECDHE-RSA-AES128-SHA256",
                           "ECDHE-RSA-AES256-SHA384",
                           "ECDHE-ECDSA-AES128-GCM-SHA256",
                           "ECDHE-ECDSA-AES256-GCM-SHA384",
                           "ECDHE-ECDSA-AES128-SHA",
                           "ECDHE-ECDSA-AES256-SHA",
                           "ECDHE-ECDSA-AES128-SHA256",
                           "ECDHE-ECDSA-AES256-SHA384",
                           "AES128-GCM-SHA256",
                           "AES256-GCM-SHA384",
                           "AES128-SHA",
                           "AES256-SHA",
                           "AES128-SHA256",
                           "AES256-SHA256"
                     ],
                     "sslProtocol": "all -SSLv2 -SSLv3 -TLSv1"
                  },
                  "SSHD": {
                     "inactivityTimeout": 0
                  },
                  "Tunnel": {
                     "http-tunnel": {
                           "name": "http-tunnel",
                           "mtu": 0,
                           "usePmtu": true,
                           "autoLastHop": "default",
                           "tunnelType": "tcp-forward",
                           "typeOfService": "preserve"
                     },
                     "socks-tunnel": {
                           "name": "socks-tunnel",
                           "mtu": 0,
                           "usePmtu": true,
                           "autoLastHop": "default",
                           "tunnelType": "tcp-forward",
                           "typeOfService": "preserve"
                     }
                  },
                  "TrafficGroup": {
                     "traffic-group-1": {
                           "name": "traffic-group-1",
                           "autoFailbackEnabled": "false",
                           "autoFailbackTime": 60,
                           "failoverMethod": "ha-order",
                           "haLoadFactor": 1
                     },
                     "traffic-group-local-only": {
                           "name": "traffic-group-local-only",
                           "autoFailbackEnabled": "false",
                           "autoFailbackTime": 60,
                           "failoverMethod": "ha-order",
                           "haLoadFactor": 1
                     }
                  }
               },
               "parsed": true
         },
         "current": {
               "parsed": true,
               "Common": {
                  "System": {
                     "consoleInactivityTimeout": 1200,
                     "hostname": "bigip.example.com",
                     "guiAuditLog": false,
                     "cliInactivityTimeout": 1200,
                     "tmshAuditLog": true,
                     "autoCheck": true,
                     "autoPhonehome": false
                  },
                  "Provision": {
                     "afm": "none",
                     "am": "none",
                     "apm": "none",
                     "asm": "none",
                     "avr": "none",
                     "cgnat": "none",
                     "dos": "none",
                     "fps": "none",
                     "gtm": "none",
                     "ilx": "none",
                     "lc": "none",
                     "ltm": "nominal",
                     "pem": "none",
                     "sslo": "none",
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
                           "localhost"
                     ]
                  },
                  "DNS_Resolver": {
                     "f5-aws-dns": {
                           "name": "f5-aws-dns",
                           "answerDefaultZones": false,
                           "cacheSize": 5767168,
                           "randomizeQueryNameCase": true,
                           "routeDomain": "0",
                           "useIpv4": true,
                           "useIpv6": true,
                           "useTcp": true,
                           "useUdp": true,
                           "forwardZones": [
                              {
                                 "name": "amazonaws.com",
                                 "nameservers": [
                                       {
                                          "name": "8.8.8.8:53"
                                       }
                                 ]
                              },
                              {
                                 "name": "idservice.net",
                                 "nameservers": [
                                       {
                                          "name": "8.8.8.8:53"
                                       }
                                 ]
                              }
                           ]
                     }
                  },
                  "Trunk": {},
                  "VLAN": {
                     "external": {
                           "name": "external",
                           "cmpHash": "default",
                           "failsafeAction": "failover-restart-tm",
                           "failsafeTimeout": 90,
                           "mtu": 1500,
                           "tag": 4094,
                           "failsafeEnabled": false,
                           "interfaces": [
                              {
                                 "name": "1.1",
                                 "tagged": false
                              }
                           ]
                     },
                     "internal": {
                           "name": "internal",
                           "cmpHash": "default",
                           "failsafeAction": "failover-restart-tm",
                           "failsafeTimeout": 90,
                           "mtu": 1500,
                           "tag": 4093,
                           "failsafeEnabled": false,
                           "interfaces": [
                              {
                                 "name": "1.2",
                                 "tagged": false
                              }
                           ]
                     }
                  },
                  "SelfIp": {
                     "external-self": {
                           "name": "external-self",
                           "address": "10.20.0.100/24",
                           "trafficGroup": "traffic-group-local-only",
                           "vlan": "external",
                           "allowService": "none"
                     },
                     "internal-self": {
                           "name": "internal-self",
                           "address": "10.10.0.100/24",
                           "trafficGroup": "traffic-group-local-only",
                           "vlan": "internal",
                           "allowService": "default"
                     }
                  },
                  "Route": {},
                  "ConfigSync": {
                     "configsyncIp": "none"
                  },
                  "FailoverUnicast": {
                     "addressPorts": "none"
                  },
                  "TrafficGroup": {
                     "traffic-group-1": {
                           "name": "traffic-group-1",
                           "autoFailbackEnabled": "false",
                           "autoFailbackTime": 60,
                           "failoverMethod": "ha-order",
                           "haLoadFactor": 1
                     },
                     "traffic-group-local-only": {
                           "name": "traffic-group-local-only",
                           "autoFailbackEnabled": "false",
                           "autoFailbackTime": 60,
                           "failoverMethod": "ha-order",
                           "haLoadFactor": 1
                     }
                  },
                  "MAC_Masquerade": {
                     "traffic-group-1": {
                           "mac": "none",
                           "trafficGroup": "traffic-group-1"
                     },
                     "traffic-group-local-only": {
                           "mac": "none",
                           "trafficGroup": "traffic-group-local-only"
                     }
                  },
                  "ManagementRoute": {
                     "default": {
                           "name": "default",
                           "mtu": 0,
                           "network": "default",
                           "gw": "10.145.127.254"
                     }
                  },
                  "SyslogRemoteServer": {},
                  "Authentication": {
                     "fallback": false,
                     "enabledSourceType": "local",
                     "remoteUsersDefaults": {
                           "role": "no-access",
                           "partitionAccess": "all",
                           "terminalAccess": "disabled"
                     }
                  },
                  "RouteDomain": {
                     "0": {
                           "name": "0",
                           "connectionLimit": 0,
                           "id": 0,
                           "strict": true,
                           "vlans": [
                              "/Common/http-tunnel",
                              "/Common/socks-tunnel",
                              "/Common/external",
                              "/Common/internal"
                           ]
                     }
                  },
                  "RemoteAuthRole": {},
                  "SnmpTrapEvents": {
                     "device": true,
                     "authentication": false,
                     "agentStartStop": true
                  },
                  "SnmpTrapDestination": {},
                  "SnmpAgent": {
                     "contact": "Customer Name <admin@customer.com>",
                     "location": "Network Closet 1",
                     "allowList": [
                           "127.0.0.0/8"
                     ]
                  },
                  "SnmpUser": {},
                  "SnmpCommunity": {
                     "comm-public": {
                           "name": "public",
                           "access": "ro",
                           "ipv6": false,
                           "source": "default"
                     }
                  },
                  "DagGlobals": {
                     "icmpHash": "icmp",
                     "roundRobinMode": "global",
                     "ipv6PrefixLength": 128
                  },
                  "HTTPD": {
                     "allow": [
                           "All"
                     ],
                     "authPamIdleTimeout": 1200,
                     "maxClients": 10,
                     "sslCiphersuite": [
                           "ECDHE-RSA-AES128-GCM-SHA256",
                           "ECDHE-RSA-AES256-GCM-SHA384",
                           "ECDHE-RSA-AES128-SHA",
                           "ECDHE-RSA-AES256-SHA",
                           "ECDHE-RSA-AES128-SHA256",
                           "ECDHE-RSA-AES256-SHA384",
                           "ECDHE-ECDSA-AES128-GCM-SHA256",
                           "ECDHE-ECDSA-AES256-GCM-SHA384",
                           "ECDHE-ECDSA-AES128-SHA",
                           "ECDHE-ECDSA-AES256-SHA",
                           "ECDHE-ECDSA-AES128-SHA256",
                           "ECDHE-ECDSA-AES256-SHA384",
                           "AES128-GCM-SHA256",
                           "AES256-GCM-SHA384",
                           "AES128-SHA",
                           "AES256-SHA",
                           "AES128-SHA256",
                           "AES256-SHA256"
                     ],
                     "sslProtocol": "all -SSLv2 -SSLv3 -TLSv1"
                  },
                  "TrafficControl": {
                     "acceptIpOptions": false,
                     "acceptIpSourceRoute": false,
                     "allowIpSourceRoute": false,
                     "continueMatching": false,
                     "maxIcmpRate": 100,
                     "maxRejectRate": 250,
                     "maxRejectRateTimeout": 30,
                     "minPathMtu": 296,
                     "pathMtuDiscovery": true,
                     "portFindThresholdTimeout": 30,
                     "portFindThresholdTrigger": 8,
                     "portFindThresholdWarning": true,
                     "rejectUnmatched": true,
                     "maxPortFindLinear": 16,
                     "maxPortFindRandom": 16
                  },
                  "SSHD": {
                     "allow": [
                           "ALL"
                     ],
                     "inactivityTimeout": 0
                  },
                  "Tunnel": {
                     "http-tunnel": {
                           "name": "http-tunnel",
                           "mtu": 0,
                           "usePmtu": true,
                           "autoLastHop": "default",
                           "tunnelType": "tcp-forward",
                           "typeOfService": "preserve"
                     },
                     "socks-tunnel": {
                           "name": "socks-tunnel",
                           "mtu": 0,
                           "usePmtu": true,
                           "autoLastHop": "default",
                           "tunnelType": "tcp-forward",
                           "typeOfService": "preserve"
                     }
                  },
                  "Disk": {
                     "applicationData": 26128384
                  }
               }
         },
         "diff": [
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "System",
                     "guiAuditLog"
                  ],
                  "lhs": false
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "System",
                     "tmshAuditLog"
                  ],
                  "lhs": true
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "System",
                     "autoCheck"
                  ],
                  "lhs": true
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "VLAN",
                     "external"
                  ],
                  "lhs": {
                     "name": "external",
                     "cmpHash": "default",
                     "failsafeAction": "failover-restart-tm",
                     "failsafeTimeout": 90,
                     "mtu": 1500,
                     "tag": 4094,
                     "failsafeEnabled": false,
                     "interfaces": [
                           {
                              "name": "1.1",
                              "tagged": false
                           }
                     ]
                  }
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "VLAN",
                     "internal"
                  ],
                  "lhs": {
                     "name": "internal",
                     "cmpHash": "default",
                     "failsafeAction": "failover-restart-tm",
                     "failsafeTimeout": 90,
                     "mtu": 1500,
                     "tag": 4093,
                     "failsafeEnabled": false,
                     "interfaces": [
                           {
                              "name": "1.2",
                              "tagged": false
                           }
                     ]
                  }
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "SelfIp",
                     "external-self"
                  ],
                  "lhs": {
                     "name": "external-self",
                     "address": "10.20.0.100/24",
                     "trafficGroup": "traffic-group-local-only",
                     "vlan": "external",
                     "allowService": "none"
                  }
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "SelfIp",
                     "internal-self"
                  ],
                  "lhs": {
                     "name": "internal-self",
                     "address": "10.10.0.100/24",
                     "trafficGroup": "traffic-group-local-only",
                     "vlan": "internal",
                     "allowService": "default"
                  }
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "FailoverUnicast",
                     "addressPorts"
                  ],
                  "lhs": "none"
               },
               {
                  "kind": "N",
                  "path": [
                     "Common",
                     "FailoverUnicast",
                     "unicastAddress"
                  ],
                  "rhs": "none"
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "SSHD",
                     "allow"
                  ],
                  "lhs": [
                     "ALL"
                  ]
               },
               {
                  "kind": "D",
                  "path": [
                     "Common",
                     "Disk"
                  ],
                  "lhs": {
                     "applicationData": 26128384
                  }
               }
         ]
      },
      "lastUpdate": "2020-08-24T16:44:41.140Z"
   }
   

:ref:`Back to top<bigipexamples>`

|

.. _example28:

28: Creating Routes in the LOCAL_ONLY partition 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for creating routes in the LOCAL_ONLY partition is available in DO v1.15 and later

This example shows how to create a route in a special LOCAL_ONLY partition/tenant using the new **localOnly** property in the Route class. When using this feature, if this partition doesn't exist, Delclarative Onboarding creates it. 

This partition is required to configure an Amazon Web Services (AWS) *Across Network* cluster.

See |route| in the Schema Reference for DO usage and options.  

**Important notes:**
 - While DO can create the LOCAL_ONLY partition if it does not exist, it cannot currently delete it, and the partition will remain even if you delete the DO configuration.
 - A Route cannot be directly swapped from one partition to another. If you attempt to swap value of **localOnly**, the declaration will fail. As a workaround, change the network of the Route to another IP and set localOnly to what you want it to be. Submit that using DO. Once that is complete, you can change the network to the desired value. 

.. literalinclude:: ../examples/localOnlyRoutes.json
   :language: json

:ref:`Back to top<bigipexamples>`


.. _example29:

29: Configuring connection and persistence mirroring  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for connection and persistence mirroring is available in DO v1.16 and later

This example shows how you can include connection and persistence mirroring information in a Declarative Onboarding declaration. 

The connection and persistence mirroring feature allows you to configure BIG-IP systems in a high availability (HA) configuration to duplicate connection and persistence information to peer members of the BIG-IP device group. This feature provides higher reliability but may affect system performance.   For more information, see the |mirrorkb| article on AskF5.

See |mirrorref| in the Schema Reference for DO usage and options.  

.. literalinclude:: ../examples/mirrorIp.json
   :language: json

:ref:`Back to top<bigipexamples>`






.. |br| raw:: html

   <br />

.. |rddoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/09.html" target="_blank">Route Domain documentation</a>

.. |dagdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-service-provider-generic-message-administration-13-1-0/5.html" target="_blank">Disaggregation DAG modes</a>

.. |snmpdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/monitoring-big-ip-system-traffic-with-snmp.html" target="_blank">Monitoring BIG-IP System Traffic with SNMP</a>

.. |tcref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trafficcontrol" target="_blank">TrafficControl Class</a>

.. |loref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#remoteauthrole" target="_blank">RemoteAuthRole Class</a>


.. |rolesdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-systems-user-account-administration-14-0-0/05.html" target="_blank">Remote User Account Management</a>

.. |lineorder| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-systems-user-account-administration-14-0-0/05.html#GUID-E70CB2E7-A003-486A-9A3E-2C401B4DAC78" target="_blank">Line Order</a>

.. |sldocs| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/about-logging.html" target="_blank">External Monitoring</a>

.. |slkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13080" target="_blank">Configuring remote logging</a>

.. |slref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#syslogremoteserver" target="_blank">SyslogRemoteServer Class</a>

.. |cmpdocs| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/tmos-routing-administration-13-0-0/4.html#GUID-8D469425-EFAC-48D6-80F3-1EF6C2EE6196" target="_blank">Additional VLAN Configuration Options</a>

.. |cmpref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#vlan" target="_blank">VLAN Class</a>

.. |trunkdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/tmos-routing-administration-12-1-1/3.html" target="_blank">Trunk documentation</a>

.. |trunkref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trunk" target="_blank">Trunk class</a>

.. |sshd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#sshd" target="_blank">SSHD</a>

.. |httpd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#httpd" target="_blank">HTTPD</a>

.. |sysclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system" target="_blank">System</a>

.. |certclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#devicecertificate" target="_blank">DeviceCertificate</a>

.. |certdoc| raw:: html

   <a href="https://support.f5.com/csp/article/K6353" target="_blank">Updating a self-signed SSL device certificate on a BIG-IP system</a>

.. |controls| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#device-controls" target="_blank">Device_Controls</a>

.. |auth| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#authentication" target="_blank">Authentication</a>

.. |k15000| raw:: html

   <a href="https://support.f5.com/csp/article/K15000" target="_blank">K15000</a>

.. |auditlog| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0/6.html" target="_blank">Audit Logging documentation</a>

.. |macm| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mac-masquerade" target="_blank">Mac_Masquerade</a>

.. |mmkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13502" target="_blank">K13502: Configuring MAC masquerade</a>

.. |vlanfs| raw:: html

   <a href="https://support.f5.com/csp/article/K13297" target="_blank">K13297: Overview of VLAN failsafe</a>

.. |dnsresolver| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#dns-resolver" target="_blank">DNS_Resolver</a>


.. |dnsdoc| raw:: html

   <a href="https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20DNS" target="_blank">BIG-IP DNS documentation</a>

.. |tunnel| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#tunnel" target="_blank">Tunnel</a>

.. |tg| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#trafficgroup" target="_blank">TrafficGroup</a>

.. |tgdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-device-service-clustering-administration-14-1-0.html" target="_blank">BIG-IP Device Service Clustering: Administration</a>

.. |hagroup| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-maintain-high-availability-through-resource-monitoring-13-0-0/1.html" target="_blank">BIG-IP documentation</a>

.. |failover| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-system-device-service-clustering-administration-13-1-0/6.html" target="_blank">Failover documentation</a>

.. |unicast| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#failoverunicast" target="_blank">FailoverUnicast</a>

.. |route| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#route" target="_blank">Route</a>

.. |mirrorkb| raw:: html

   <a href="https://support.f5.com/csp/article/K84303332" target="_blank">Overview of connection and persistence mirroring</a>

.. |mirrorref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#mirrorip" target="_blank">MirrorIp</a>

   