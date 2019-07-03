.. _iqexamples:

BIG-IQ example declarations
---------------------------



.. _example3:

1: Licensing with BIG-IQ: Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP.  In this example, our BIG-IQ license pool is a subscription pool, so we include skuKeyword1 and 2, and unitOfMeasure.
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this Route example (reachable=true) and to a subscription pools.  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :emphasize-lines: 16-21

:ref:`Back to top<iqexamples>`

| 

.. _example4:

2: Licensing with BIG-IQ: Utility License - No Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is another example of using a BIG-IQ to license your BIG-IP systems. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP. 
In this example, the entire *License* class is unique to using BIG-IQ for licensing, and we've highlighted the lines that are specific to this No Route example (reachable=false).  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/licenseViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 19-20

:ref:`Back to top<iqexamples>`

| 


.. _revoke:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

3: Revoking a BIG-IP license from BIG-IQ without relicensing
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license from an unreachable BIG-IP VE using **revokeFrom** and specifying the license pool. In this example, we are only revoking the license, and not relicensing the BIG-IP VE.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/revokeViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14


:ref:`Back to top<iqexamples>`

| 

.. _relicense:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

4: Revoking and relicensing a BIG-IP (with route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license and then relicense a reachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. The line with the new licensing pool and the revoke line are highlighted.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :emphasize-lines: 14-15


:ref:`Back to top<iqexamples>`

| 

.. _relicense-un:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

5: Revoking and relicensing a BIG-IP (no route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license and then relicense an unreachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. Additionally, because the BIG-IP device does not have a route to the BIG-IQ (unreachable), you must use **overwrite = true** to let the BIG-IP VE know the system is overwriting the license. You must also specify the applicable hypervisor, as this is required by BIG-IQ and Declarative Onboarding cannot guess the value for this (see :ref:`license-pool` for options).

We have highlighted the new licensing pool, the revoke line, the hypervisor, and the overwrite line.    See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14-15, 20-21

:ref:`Back to top<iqexamples>`

| 

.. _relicense-new:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

6: Revoking and relicensing a BIG-IP (no route) from a different BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example is similar to example 9, however in this case, we are using a different BIG-IQ device to revoke and relicense the BIG-IP VE from an unreachable BIG-IP VE. In this case, we specify additional information in the *revokeFrom* property to reference the BIG-IQ that initially licensed the BIG-IP VE.  Again, specifying the appropriate hypervisor is required. See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaNewBigIqUnreachable.json
   :language: json
   :emphasize-lines: 15-21, 26-27 


:ref:`Back to top<iqexamples>`


.. |br| raw:: html

   <br />

