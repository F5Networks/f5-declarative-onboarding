.. _iqexamples:

BIG-IQ example declarations
---------------------------

See :doc:`big-iq-licensing` for detailed information about composing declarations with BIG-IQ.




.. _bigiq1:

1: Licensing with BIG-IQ: Regkey Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP. In this example, our existing BIG-IQ license pool is a RegKey pool that contains BIG-IP VE RegKeys. Because the BIG-IP VE is reachable (has a route to the BIG-IQ), we also specify the BIG-IP user name and password.

.. NOTE:: Currently, to use a RegKey pool the BIG-IP must be reachable from the BIG-IQ.

The entire *License* class is unique to using BIG-IQ for licensing, so the items specific to RegKey pools are highlighted.

.. literalinclude:: ../examples/licenseViaBigIqRegKeyPool.json
   :language: json
   :emphasize-lines: 15-17

:ref:`Back to top<iqexamples>`

| 

.. _bigiq2:

2: Licensing with BIG-IQ: Utility Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, our BIG-IQ license pool is a utility (subscription) pool. Utility pools contain licenses for BIG-IP services you grant for a specific unit of measure (hourly, daily, monthly, or yearly).  

Utility pools include a additional parameters: **skuKeyword1** and **skuKeyword2**, and **unitOfMeasure** (see :ref:`license-pool` for details). 

We've highlighted the lines that are specific to this utility and Route example (reachable=true).  

.. literalinclude:: ../examples/licenseViaBigIqUtilityReachable.json
   :language: json
   :emphasize-lines: 16-21

:ref:`Back to top<iqexamples>`

| 

.. _bigiq3:

3: Licensing with BIG-IQ: Utility Pool - No Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is another example of using a BIG-IQ to license your BIG-IP systems with a utility pool. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP. 

Because there is not a route to the BIG-IP, you must also specify the applicable hypervisor, as this is required by BIG-IQ and Declarative Onboarding cannot guess the value for this (see :ref:`license-pool` for hypervisor options).

In this example, we've highlighted the lines that are specific to this utility and No Route example (reachable=false).  See :doc:`big-iq-licensing` for specific details on this example.

.. literalinclude:: ../examples/licenseViaBigIqUtilityUnreachable.json
   :language: json
   :emphasize-lines: 16-20

:ref:`Back to top<iqexamples>`

| 

.. _bigiq4:

4: Licensing with BIG-IQ: Purchased Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, our BIG-IQ license pool is a Purchased pool. A Purchased pool is a prepaid pool of a specific number of concurrent license grants for a single BIG-IP service, such as LTM. 

Because the BIG-IP VE is reachable (has a route to the BIG-IQ), we also specify the BIG-IP user name and password.

.. literalinclude:: ../examples/licenseViaBigIqPurchasedPoolReachable.json
   :language: json
   :emphasize-lines: 16-18

:ref:`Back to top<iqexamples>`

| 

.. _bigiq5:

5: Licensing with BIG-IQ: Purchased Pool - No Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example also uses a Purchased pool, but without a route to the BIG-IP.

Because there is no route to the BIG-IP, you must also specify the applicable hypervisor, as this is required by BIG-IQ and Declarative Onboarding cannot guess the value for this (see :ref:`license-pool` for hypervisor options).

.. literalinclude:: ../examples/licenseViaBigIqPurchasedPoolUnreachable.json
   :language: json
   :emphasize-lines: 16-17

:ref:`Back to top<iqexamples>`

| 



.. _revoke:


6: Revoking a BIG-IP license from BIG-IQ without relicensing
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

The following is an example of using BIG-IQ to revoke a license from an unreachable BIG-IP VE using **revokeFrom** and specifying the license pool. In this example, we are only revoking the license, and not relicensing the BIG-IP VE.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/revokeViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14


:ref:`Back to top<iqexamples>`

| 

.. _relicense:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license is available in Declarative Onboarding v1.3.0 and later.

7: Revoking and relicensing a BIG-IP (with route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license and then relicense a reachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. The line with the new licensing pool and the revoke line are highlighted.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqReachable.json
   :language: json
   :emphasize-lines: 14-15


:ref:`Back to top<iqexamples>`

| 

.. _relicense-un:


8: Revoking and relicensing a BIG-IP (no route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

The following is an example of using BIG-IQ to revoke a license and then relicense an unreachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. Additionally, because the BIG-IP device does not have a route to the BIG-IQ (unreachable), you must use **overwrite = true** to let the BIG-IP VE know the system is overwriting the license. You must also specify the applicable hypervisor, as this is required by BIG-IQ and Declarative Onboarding cannot guess the value for this (see :ref:`license-pool` for options).

We have highlighted the new licensing pool, the revoke line, the hypervisor, and the overwrite line.    See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14-15, 20-21

:ref:`Back to top<iqexamples>`

| 

.. _relicense-new:


9: Revoking and relicensing a BIG-IP (no route) from a different BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Revoking a license and relicensing is available in Declarative Onboarding v1.3.0 and later.

This example is similar to example 9, however in this case, we are using a different BIG-IQ device to revoke and relicense the BIG-IP VE from an unreachable BIG-IP VE. In this case, we specify additional information in the *revokeFrom* property to reference the BIG-IQ that initially licensed the BIG-IP VE.  Again, specifying the appropriate hypervisor is required. See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../examples/reLicenseViaNewBigIqUnreachable.json
   :language: json
   :emphasize-lines: 15-21, 26-27 


:ref:`Back to top<iqexamples>`


.. |br| raw:: html

   <br />

