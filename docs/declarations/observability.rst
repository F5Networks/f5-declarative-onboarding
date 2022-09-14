.. _observe-examples:

Observability Examples
-----------------------
This section contains examples concerning observability (such as logging).

.. _avrstream:


Creating an Analytics profile to enable AVR data streaming
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we are licensing a new BIG-IP, provisioning AVR, and creating an Analytics profile (you must have AVR provisioned to create an Analytics profile).  This allows you to stream AVR data for consumption by F5 Telemetry Steaming or similar applications.

.. literalinclude:: ../../examples/avrStreamingSupport.json
   :language: json
   :emphasize-lines: 17, 19-29


:ref:`Back to top<observe-examples>`

|

.. _snmp:

Configuring SNMP in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to configure SNMP in a BIG-IP Declarative Onboarding declaration.  You can use BIG-IP DO to configure SNMP agents, users, communities, trap events, and trap destinations.  See the |snmpdoc| in the BIG-IP documentation for specific information.

BIG-IP DO 1.32 and later add the ability to enable or disable **snmpd** daemon support of snmpV1 and snmpV2c queries using the **snmpV1** and **snmpV2c** properties in the SNMP class. Using a value of **true** (default) enables support, **false** disables support.

In the following declaration snippet we show only the classes related to SNMP.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

**Important**: If you try to use this declaration with a BIG-IP DO version prior to 1.32, it will fail.  Either upgrade BIG-IP DO to 1.32, or remove the snmpV1 and snmpV2c lines (highlighted in yellow).

.. literalinclude:: ../../examples/snmp.json
   :language: json
   :emphasize-lines: 19, 20


:ref:`Back to top<observe-examples>`

|

.. _syslogdest:

Configuring a System Log (syslog) Destination in declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to configure a syslog destination using the **SyslogRemoteServer** class.  For information on syslog destinations, see |sldocs| and the |slkb| Knowledge Base article.  Also see |slref| in the Schema reference for usage options.

**Important**: The remote syslog server must be accessible from your BIG-IP system on the default route domain (Domain 0) or management network, and conversely, your BIG-IP system is accessible from the remote syslog server.

In the following declaration snippet we show only the SyslogRemoteServer class.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration.

.. literalinclude:: ../../examples/syslogDestination.json
   :language: json

:ref:`Back to top<observe-examples>`

|

.. _example20:

Configuring Audit Logging in a declaration  
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how you can configure audit logging in the System class of a BIG-IP Declarative Onboarding declaration.  This allows audit logging to start as early as possible.

See |sysclass| in the Schema Reference for BIG-IP DO usage and options. For detailed information about audit logging on the BIG-IP, see the |auditlog|.

.. IMPORTANT:: **guiAuditLog** is only available on TMOS v14.0 and later


.. literalinclude:: ../../examples/auditLogging.json
   :language: json

:ref:`Back to top<observe-examples>`


.. |snmpdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/monitoring-big-ip-system-traffic-with-snmp.html" target="_blank">Monitoring BIG-IP System Traffic with SNMP</a>

.. |auditlog| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-user-account-administration-13-1-0/6.html" target="_blank">Audit Logging documentation</a>

.. |sysclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system" target="_blank">System</a>

.. |slkb| raw:: html

   <a href="https://support.f5.com/csp/article/K13080" target="_blank">Configuring remote logging</a>

.. |slref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#syslogremoteserver" target="_blank">SyslogRemoteServer Class</a>

.. |sldocs| raw:: html

    <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/about-logging.html" target="_blank">External Monitoring</a>