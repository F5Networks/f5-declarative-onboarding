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

| 


.. _example2:

Example 2: Clustered declaration
--------------------------------
The following is an example declaration that onboards a clustered BIG-IP system.  See :doc:`clustering` for specific details on this example.

.. literalinclude:: ../examples/onboardFailover.json
   :language: json

:ref:`Back to top<examples>`

| 


.. _example3:

Example 3: Licensing with BIG-IQ: Route to BIG-IP
-------------------------------------------------
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP.  In this example, our BIG-IQ license pool is a subscription pool, so we include skuKeyword1 and 2, and unitOfMeasure.
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this Route example (reachable=true) and to a subscription pools.  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :linenos:
   :emphasize-lines: 16-21

:ref:`Back to top<examples>`

| 

.. _example4:

Example 4: Licensing with BIG-IQ: No Route to BIG-IP
----------------------------------------------------
The following is another example of using a BIG-IQ to license your BIG-IP systems. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP. 
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this No Route example (reachable=false).  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/licenseViaBigIqUnreachable.json
   :language: json
   :linenos:
   :emphasize-lines: 19-20

:ref:`Back to top<examples>`

| 


Example 5: Using Declarative Onboarding in a container
------------------------------------------------------
The following is an example of a declaration for use in a container.  It contains the **DO** class, which contains information about the target BIG-IP device.  See :doc:`do-container` for information about the container and the DO class. 

The items specific to the DO class are highlighted. 

.. literalinclude:: ../examples/viaASG.json
   :language: json
   :linenos:
   :emphasize-lines: 2-6

:ref:`Back to top<examples>`

| 

.. _example6:

Example 6: Using JSON Pointers
------------------------------
The following is another example using a declaration for use in a container, but in this case, it also contains a number of examples of using JSON pointers in a declaration.  For more information on JSON pointers, see :doc:`json-pointers`.

.. literalinclude:: ../examples/licenseViaBigIqReachableASG.json
   :language: json
   :linenos:


:ref:`Back to top<examples>`

| 

.. _revoke:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

Example 7: Revoking a BIG-IP license from BIG-IQ without relicensing
--------------------------------------------------------------------
The following is an example of using BIG-IQ to revoke a license from an unreachable BIG-IP VE using **revokeFrom** and specifying the license pool. In this example, we are only revoking the license, and not relicensing the BIG-IP VE.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/revokeViaBigIqUnreachable.json
   :language: json
   :linenos:
   :emphasize-lines: 14


:ref:`Back to top<examples>`

| 

.. _relicense:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

Example 8: Revoking and relicensing a BIG-IP (with route) from BIG-IQ
---------------------------------------------------------------------
The following is an example of using BIG-IQ to revoke a license and then relicense a reachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. The line with the new licensing pool and the revoke line are highlighted.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :linenos:
   :emphasize-lines: 14-15


:ref:`Back to top<examples>`

| 

.. _relicense-un:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

Example 9: Revoking and relicensing a BIG-IP (no route) from BIG-IQ
-------------------------------------------------------------------
The following is an example of using BIG-IQ to revoke a license and then relicense an unreachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. Additionally, because the BIG-IP device does not have a route to the BIG-IQ (unreachable), you must use **overwrite = true** to let the BIG-IP VE know the system is overwriting the license. The line with the new licensing pool, the revoke line, and the overwrite line are highlighted.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqUnreachable.json
   :language: json
   :linenos:
   :emphasize-lines: 14-15, 21

:ref:`Back to top<examples>`

| 

.. _relicense-new:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

Example 10: Revoking and relicensing a BIG-IP (no route) from a different BIG-IQ
--------------------------------------------------------------------------------
This example is similar to example 9, however in this case, we are using a different BIG-IQ device to revoke and relicense the BIG-IP VE from an unreachable BIG-IP VE. In this case, we specify additional information in the *revokeFrom* property to reference the BIG-IQ that initially licensed the BIG-IP VE.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaNewBigIqUnreachable.json
   :language: json
   :linenos:
   :emphasize-lines: 15-21, 27 


:ref:`Back to top<examples>`

.. |br| raw:: html

   <br />

.. |pass| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-system-secure-password-policy-14-0-0/01.html" target="_blank">BIG-IP Secure Password Policy</a>

