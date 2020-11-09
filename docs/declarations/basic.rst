.. _basic-examples:

HTTP Services
-------------
This section contains relatively simple examples of declarations that create HTTP and/or HTTP services.  

Use the index on the right to locate specific examples.

.. _example1:

Standalone declaration
^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a standalone BIG-IP system. See :doc:`composing-a-declaration` for specific details on this example.

.. literalinclude:: ../../examples/onboard.json
   :language: json


:ref:`Back to top<basic-examples>`

|

.. _example2:

Clustered declaration
^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../../examples/onboardFailover.json
   :language: json

:ref:`Back to top<basic-examples>`

|

.. _example3:

Using JSON Pointers
^^^^^^^^^^^^^^^^^^^
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../../examples/licenseViaBigIqReachableASG.json
   :language: json


:ref:`Back to top<basic-examples>`