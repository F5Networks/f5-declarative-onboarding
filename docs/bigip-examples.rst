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

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the Analytics profile is available in Declarative Onboarding v1.5.0 and later.

4: Creating an Analytics profile to enable AVR data streaming
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we are licensing a new BIG-IP, provisioning AVR, and creating an Analytics profile (you must have AVR provisioned to create an Analytics profile).  This allows you to stream AVR data for consumption by F5 Telemetry Steaming or similar applications.

.. literalinclude:: ../examples/avrStreamingSupport.json
   :language: json
   :emphasize-lines: 17, 19-29 


:ref:`Back to top<bigipexamples>`

.. _keys:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **keys** property of the User class is available in DO v1.5.0 and later. 

5: Adding public SSH keys to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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

.. _rd:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   The **routeDomain** class is available in DO v1.6.0 and later. 

6: Adding Route Domains to a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we show how to use a Route Domain in a declaration.  A route domain is a configuration object that isolates network traffic for a particular application on the network.  For more information on Route Domains, see |rddoc|.

In the following declaration, we include a VLAN to show how to reference a VLAN that is being created.  The SelfIp and the Route both show using the RouteDomain with **%100**, which is the **id** of the RouteDomain. 



.. literalinclude:: ../examples/routeDomains.json
   :language: json
   :emphasize-lines: 27-45 


:ref:`Back to top<bigipexamples>`

.. |br| raw:: html

   <br />

.. |rddoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-tmos-routing-administration-14-1-0/09.html" target="_blank">Route Domain documentation</a>
