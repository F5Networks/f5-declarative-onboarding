.. _misc-examples:

Miscellaneous Examples
----------------------
The following are example declarations for BIG-IP, with some general examples that could also be used with BIG-IQ and the container.



.. _httpdex:

Configuring HTTPD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure HTTPD (HTTP daemon) settings in a Declarative Onboarding declaration. For usage and options, see |httpd| in the Schema Reference.

.. NOTE:: If you use the BIG-IP Configuration utility, we recommend you exit the utility before changes are made to the system using the HTTPD component. Making changes to the system using this component causes a restart of the httpd daemon, and restarting the httpd daemon requires a restart of the Configuration utility.

In the following declaration, we show only the HTTPD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 


.. literalinclude:: ../../examples/httpd.json
   :language: json

:ref:`Back to top<misc-examples>`

|

.. _systemex:

Configuring System settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure some System settings in a Declarative Onboarding declaration. This enables you to set auto-timeout values for serial console (CLI) and TMSH interactive mode sessions, as well as set a hostname, if you have not set one in the Common class. 

.. IMPORTANT:: If you set a hostname in the Common class, you cannot use the hostname property in the System class; they are mutually exclusive.

For usage and options, see |sysclass| in the Schema Reference.

DO 1.13 introduced the ability to disable the automatic update check feature.  The autoCheck property controls whether the BIG-IP checks for and recommends software updates.  See |k15000| for more information. 

In the following declaration, we show only the System class (including autoCheck introduced in 1.13).  You can use this class as a part of a larger Declarative Onboarding declaration. 

**Important**: If you try to use this declaration with a DO version prior to 1.13, it will fail.  Either upgrade to 1.13, or remove the autoCheck line.


.. literalinclude:: ../../examples/system.json
   :language: json

:ref:`Back to top<misc-examples>`

|

.. _example19:

Using the userAgent Controls property 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **userAgent** is available in DO v1.13 and later

In this example, we show how you can use the **userAgent** property in the new **Controls** class. The userAgent property allows you to set a unique identifier in usage data.

This declaration includes the Controls class with userAgent set to **BIG-IQ/7.1 Configured by API**.  

See |controls| in the Schema Reference for more information.


.. literalinclude:: ../../examples/userAgent.json
   :language: json

:ref:`Back to top<misc-examples>`

|

.. _example27:

Enabling traces in DO responses 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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

.. literalinclude:: ../../examples/debugTrace.json
   :language: json

|

**Example Response** |br|
Here is the response returned by DO from the declaration, showing the trace for the tenant (your output will vary based on the configuration of your device).


.. literalinclude:: trace-response.json
   :language: json


|

.. _example28:

Creating Routes in the LOCAL_ONLY partition 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for creating routes in the LOCAL_ONLY partition is available in DO v1.15 and later

This example shows how to create a route in a special LOCAL_ONLY partition/tenant using the new **localOnly** property in the Route class. When using this feature, if this partition doesn't exist, Delclarative Onboarding creates it. 

This partition is required to configure an Amazon Web Services (AWS) *Across Network* cluster.

See |route| in the Schema Reference for DO usage and options.  

**Important notes:**
 - While DO can create the LOCAL_ONLY partition if it does not exist, it cannot currently delete it, and the partition will remain even if you delete the DO configuration.
 - A Route cannot be directly swapped from one partition to another. If you attempt to swap value of **localOnly**, the declaration will fail. As a workaround, change the network of the Route to another IP and set localOnly to what you want it to be. Submit that using DO. Once that is complete, you can change the network to the desired value. 

.. literalinclude:: ../../examples/localOnlyRoutes.json
   :language: json

:ref:`Back to top<misc-examples>`

|


.. _example30:

Warning users the BIG-IP is under AS3 automation  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can use Delclarative Onboarding to discourage unintended configuration changes to a device that is managed by AS3. This example configures an advisory banner using the **DbVariables** class.

.. literalinclude:: ../../examples/banner.json
   :language: json

:ref:`Back to top<misc-examples>`

|

.. _example31:

Increasing the memory allocated to the restjavad daemon  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example shows how you can use Delclarative Onboarding to increase the amount of memory allocated to restjavad, using the **DbVariables** class.
  
See (see :ref:`restjavad`) for reasons you may want to increase this memory allocation.

.. literalinclude:: ../../examples/restjavad.json
   :language: json

:ref:`Back to top<misc-examples>`




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

   