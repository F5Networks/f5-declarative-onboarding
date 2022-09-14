.. _basic-examples:

Basic examples
--------------
This section contains general BIG-IP Declarative Onboarding example declarations.


.. _example1:

Standalone declaration
^^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a standalone BIG-IP system. See :ref:`Composing a Declaration<composing>` for specific details on this example.

.. literalinclude:: ../../examples/onboard.json
   :language: json


:ref:`Back to top<basic-examples>`

|

.. _example2:

Clustered declaration
^^^^^^^^^^^^^^^^^^^^^
The following is an example declaration that onboards a clustered BIG-IP system.  See :ref:`Clustering<clustering>` for specific details on this example.

.. literalinclude:: ../../examples/onboardFailover.json
   :language: json

:ref:`Back to top<basic-examples>`

|

.. _example3:

Using JSON Pointers
^^^^^^^^^^^^^^^^^^^
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :ref:`JSON Pointers<pointers>`.

.. literalinclude:: ../../examples/licenseViaBigIqReachableASG.json
   :language: json


:ref:`Back to top<basic-examples>`

|

.. _example4:

User class
^^^^^^^^^^
The following is an example of the :ref:`User Class<user-class>`.  The User class creates (or modifies) the users and their associated roles and access control. For more information, see |userclass| in the Schema Reference.

In the following declaration, we show only the User class.  You can use this class as a part of a larger BIG-IP Declarative Onboarding declaration. 

.. literalinclude:: ../../examples/user.json
   :language: json


:ref:`Back to top<basic-examples>`

.. |userclass| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#user" target="_blank">User Class</a>