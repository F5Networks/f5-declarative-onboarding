.. _examples:

Example declarations
====================

The following examples show you some Declarative Onboarding declarations.  

.. IMPORTANT:: The following examples include passwords that may not be valid for BIG-IP v14.0 and later.  See |pass| for specific requirements.





Example 1: Standalone declaration
---------------------------------
The following is an example declaration that onboards a standalone BIG-IP system. See :doc:`composing-a-declaration` for specific details on this example.

.. literalinclude:: examples/example_01.json
   :language: json
   

:ref:`Back to top<examples>`

.. _example2:

Example 2: Clustered declaration
--------------------------------
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../examples/onboardFailover.json
   :language: json

:ref:`Back to top<examples>`

.. _example3:

Example 3: Licensing with BIG-IQ declaration - Route
----------------------------------------------------
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP.  In this example, our BIG-IQ license pool is a subscription pool, so we include skuKeyword1 and 2, and unitOfMeasure.
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this Route example (reachable=true) and to a subscription pools.  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :linenos:
   :emphasize-lines: 16-21

:ref:`Back to top<examples>`

.. _example4:

Example 4: Licensing with BIG-IQ declaration - No Route
-------------------------------------------------------
The following is another example of using a BIG-IQ to license your BIG-IP systems. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP. 
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this No Route example (reachable=false).  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/licenseViaBigIqUnreachable.json
   :language: json
   :linenos:
   :emphasize-lines: 19-20

:ref:`Back to top<examples>`

Example 5: Using Declarative Onboarding in a container
------------------------------------------------------
The following is an example of a declaration for use in a container.  It contains the **DO** class, which contains information about the target BIG-IP device.  See :doc:`do-container` for information about the container and the DO class. 

The items specific to the DO class are highlighted. 

.. literalinclude:: ../examples/viaASG.json
   :language: json
   :linenos:
   :emphasize-lines: 2-6

:ref:`Back to top<examples>`

.. _example6:

Example 6: Using JSON Pointers
------------------------------
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../examples/licenseViaBigIqReachableASG.json
   :language: json
   :linenos:


:ref:`Back to top<examples>`

Example 7: 
------------------------------
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :linenos:


:ref:`Back to top<examples>`

.. |br| raw:: html

   <br />

.. |pass| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html" target="_blank">BIG-IP Secure Password Policy</a>

