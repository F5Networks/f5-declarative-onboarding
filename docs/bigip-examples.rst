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

.. _keys:


5: Adding public SSH keys to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **keys** property of the User class is available in DO v1.5.0 and later. 

In this example, we are adding public SSH keys to the root user and a guestUser. This can provide a higher level of security and easier automation.

**Important notes about using the keys property**

- Only the root user's master key (noted by the ``Host Processor Superuser``), in authorized_keys will be preserved. All other keys configured prior to running this declaration, WILL BE DELETED.
- If the **keys** field is left empty it will default to an empty array. This means leaving it empty will clear the authorized_keys file, except for the root's master key.  
- For non-root users, the path to the authorized_keys is **/home/{username}/.ssh/authorized_keys**.
- For root, the path is **/root/.ssh/authorized_keys**.
- DO will set the non-root user's .ssh directory permissions to 700, with the authorized_keys permissions set to 600.

.. literalinclude:: ../examples/publicKeys.json
   :language: json
   :emphasize-lines: 13-16, 27-30 


:ref:`Back to top<bigipexamples>`

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


.. _dag:

7: Setting the DAG IPv6 prefix length
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **DagGlobals** class is available in DO v1.7.0 and later. 

In this example, we show how to use the DagGlobals class to set or modify the DAG global IPv6 prefix length.  DAG Globals contain the global disaggregation settings; see the |dagdocs| documentation for more information. 

In the following declaration snippet, we show only the DagGlobals class.  You can use this class as a part of a larger Declarative Onboarding declaration. 



.. literalinclude:: ../examples/dagGlobals.json
   :language: json



:ref:`Back to top<bigipexamples>`

.. _sshex:

8: Configuring SSHD settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring SSHD settings is available in DO v1.8.0 and later. 

In this example, we show how you can configure SSHD settings in a Declarative Onboarding declaration. For usage and options, see |sshd| in the Schema Reference.

In the following declaration, we show only the SSHD class.  You can use this class as a part of a larger Declarative Onboarding declaration. 


.. literalinclude:: ../examples/sshd.json
   :language: json



:ref:`Back to top<bigipexamples>`

.. |br| raw:: html

   <br />

.. |rddoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/09.html" target="_blank">Route Domain documentation</a>

.. |dagdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-service-provider-generic-message-administration-13-1-0/5.html" target="_blank">Disaggregation DAG modes</a>

.. |sshd| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#sshd" target="_blank">SSHD</a>

