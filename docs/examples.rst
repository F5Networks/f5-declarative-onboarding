.. _examples:

Example declarations
====================

The following examples show you some Declarative Onboarding declarations.  





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

.. literalinclude:: examples/example_02.json
   :language: json

:ref:`Back to top<examples>`

.. _example3:

Example 3: Licensing with BIG-IQ declaration - Route
----------------------------------------------------
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP.  In this example, our BIG-IQ license pool is a subscription pool, so we include skuKeyword1 and 2, and unitOfMeasure.
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this Route example (reachable=true) and to a subscription pools.  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: examples/example_03.json
   :language: json
   :linenos:
   :emphasize-lines: 14-19

:ref:`Back to top<examples>`

.. _example4:

Example 4: Licensing with BIG-IQ declaration - No Route
-------------------------------------------------------
The following is another example of using a BIG-IQ to license your BIG-IP systems. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP.  Also, this example is using a RegKey pool on the BIG-IQ device, so skuKeyword1 and 2, and unitOfMeasure are not needed.
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this No Route example (reachable=false).  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: examples/example_04.json
   :language: json
   :linenos:
   :emphasize-lines: 14-15

:ref:`Back to top<examples>`

.. |br| raw:: html

   <br />
