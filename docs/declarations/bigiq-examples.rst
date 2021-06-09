.. _iqexamples:

BIG-IQ example declarations
---------------------------

The following are example declarations for licensing with BIG-IQ.  See :ref:`Composing a declaration for licensing BIG-IP with a BIG-IQ<bigiqdec>` for detailed information about composing declarations with BIG-IQ.

See the |bigiq| documentation for more detailed information on License pool types.  See |compat| for information on BIG-IQ and Declarative Onboarding compatibility

.. NOTE:: In DO 1.17, we updated the example declarations so the BIG-IP password in the License class matches the one set in the User class, as required by DO. 


.. _bigiq1:

Licensing with BIG-IQ: Regkey Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using a BIG-IQ to license your BIG-IP systems, where the BIG-IQ has an existing route to the BIG-IP. In this example, our existing BIG-IQ license pool is a RegKey pool that contains BIG-IP VE RegKeys. Because the BIG-IP VE is reachable (has a route to the BIG-IQ), we also specify the BIG-IP user name and password.

.. NOTE:: Currently, to use a RegKey pool the BIG-IP must be reachable from the BIG-IQ.

The entire *License* class is unique to using BIG-IQ for licensing, so the items specific to RegKey pools are highlighted.

.. literalinclude:: ../../examples/licenseViaBigIqRegKeyPool.json
   :language: json
   :emphasize-lines: 15-17

:ref:`Back to top<iqexamples>`

| 

.. _bigiq2:

Licensing with BIG-IQ: Utility Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, our BIG-IQ license pool is a utility (subscription) pool. Utility pools contain licenses for BIG-IP services you grant for a specific unit of measure (hourly, daily, monthly, or yearly).  

Utility pools include a additional parameters: **skuKeyword1** and **skuKeyword2**, and **unitOfMeasure** (see :ref:`license-pool` for details). 

We've highlighted the lines that are specific to this utility and Route example (reachable=true).  

.. literalinclude:: ../../examples/licenseViaBigIqUtilityReachable.json
   :language: json
   :emphasize-lines: 16-21

:ref:`Back to top<iqexamples>`

| 

.. _bigiq3:

Licensing with BIG-IQ: Utility Pool - No Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is another example of using a BIG-IQ to license your BIG-IP systems with a utility pool. However, in this case the BIG-IQ does **not** have an existing route to the BIG-IP. 

For unreachable devices (with no route to BIG-IP), BIG-IP credentials are not required. Instead, you must explicitly indicate the platform on which the device runs (the **hypervisor** field) as Declarative Onboarding cannot automatically detect the value at this time. This is required for the BIG-IQ license activation API request (see :ref:`license-pool` for hypervisor options).  

**New in DO 1.15** |br| 
DO 1.15 adds the **tenant** property to the License class. This property allows you to specify an optional description for the license. This feature is useful in autoscale solutions managed by a BIG-IQ. The DO tenant property is prepended to the BIG-IQ tenant property. The BIG-IQ tenant property is *management address,hostname* by default, so when using the DO property, it becomes *DO-tenant-property,management-address,hostname*.  This feature is only supported when **reachable** is **false**.

.. IMPORTANT:: The following declaration has been updated to include the new Tenant property introduced in DO 1.15.  If you attempt to use it on a version prior to 1.15, it will fail. To use the example on a previous version, delete the **tenant** property at the bottom of the **License** class.

In this example, we've highlighted the lines that are specific to this utility and No Route example (reachable=false).  See :ref:`Composing a declaration for licensing BIG-IP with a BIG-IQ<bigiqdec>` for specific details on this example.

.. literalinclude:: ../../examples/licenseViaBigIqUtilityUnreachable.json
   :language: json
   :emphasize-lines: 16-20

:ref:`Back to top<iqexamples>`

| 

.. _bigiq4:

Licensing with BIG-IQ: Purchased Pool - Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, our BIG-IQ license pool is a Purchased pool. A Purchased pool is a prepaid pool of a specific number of concurrent license grants for a single BIG-IP service, such as LTM. 

Because the BIG-IP VE is reachable (has a route to the BIG-IQ), we also specify the BIG-IP user name and password.

.. literalinclude:: ../../examples/licenseViaBigIqPurchasedPoolReachable.json
   :language: json
   :emphasize-lines: 16-18

:ref:`Back to top<iqexamples>`

| 

.. _bigiq5:

Licensing with BIG-IQ: Purchased Pool - No Route to BIG-IP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
This example also uses a Purchased pool, but without a route to the BIG-IP.

For unreachable devices (with no route to BIG-IP), BIG-IP credentials are not required. Instead, you must explicitly indicate the platform on which the device runs (the **hypervisor** field) as Declarative Onboarding cannot automatically detect the value at this time. This is required for the BIG-IQ license activation API request (see :ref:`license-pool` for hypervisor options). 

**New in DO 1.15** |br| 
DO 1.15 adds the **tenant** property to the License class. This property allows you to specify an optional description for the license. This feature is useful in autoscale solutions managed by a BIG-IQ. The DO tenant property is prepended to the BIG-IQ tenant property. The BIG-IQ tenant property is *management address,hostname* by default, so when using the DO property, it becomes *DO-tenant-property,management-address,hostname*.  This feature is only supported when **reachable** is **false**.

.. IMPORTANT:: The following declaration has been updated to include the new Tenant property introduced in DO 1.15.  If you attempt to use it on a version prior to 1.15, it will fail. To use the example on a previous version, delete the **tenant** property at the bottom of the **License** class.

.. literalinclude:: ../../examples/licenseViaBigIqPurchasedPoolUnreachable.json
   :language: json
   :emphasize-lines: 16-17

:ref:`Back to top<iqexamples>`

| 



.. _revoke:


Revoking a BIG-IP license from BIG-IQ without relicensing
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license from an unreachable BIG-IP VE using **revokeFrom** and specifying the license pool. In this example, we are only revoking the license, and not relicensing the BIG-IP VE.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../../examples/revokeViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14


:ref:`Back to top<iqexamples>`

| 

.. _relicense:


Revoking and relicensing a BIG-IP (with route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is an example of using BIG-IQ to revoke a license and then relicense a reachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. The line with the new licensing pool and the revoke line are highlighted.  See See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../../examples/reLicenseViaBigIqReachable.json
   :language: json
   :emphasize-lines: 14-15


:ref:`Back to top<iqexamples>`

| 

.. _relicense-un:


Revoking and relicensing a BIG-IP (no route) from BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The following is an example of using BIG-IQ to revoke a license and then relicense an unreachable BIG-IP VE. In this example, we are both revoking the initial license and relicensing the BIG-IP VE from a different license pool on the BIG-IQ. Additionally, because the BIG-IP device does not have a route to the BIG-IQ (unreachable), you must use **overwrite = true** to let the BIG-IP VE know the system is overwriting the license. 

For unreachable devices (with no route to BIG-IP), BIG-IP credentials are not required. Instead, you must explicitly indicate the platform on which the device runs (the **hypervisor** field) as Declarative Onboarding cannot automatically detect the value at this time. This is required for the BIG-IQ license activation API request (see :ref:`license-pool` for hypervisor options). 

**New in DO 1.15** |br| 
DO 1.15 adds the **tenant** property to the License class. This property allows you to specify an optional description for the license. This feature is useful in autoscale solutions managed by a BIG-IQ. The DO tenant property is prepended to the BIG-IQ tenant property. The BIG-IQ tenant property is *management address,hostname* by default, so when using the DO property, it becomes *DO-tenant-property,management-address,hostname*.  This feature is only supported when **reachable** is **false**.

.. IMPORTANT:: The following declaration has been updated to include the new Tenant property introduced in DO 1.15.  If you attempt to use it on a version prior to 1.15, it will fail. To use the example on a previous version, delete the **tenant** property at the bottom of the **License** class.

We have highlighted the new licensing pool, the revoke line, the hypervisor, and the overwrite line.    See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

.. literalinclude:: ../../examples/reLicenseViaBigIqUnreachable.json
   :language: json
   :emphasize-lines: 14-15, 20-21

:ref:`Back to top<iqexamples>`

| 

.. _relicense-new:


Revoking and relicensing a BIG-IP (no route) from a different BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This example is similar to example 9, however in this case, we are using a different BIG-IQ device to revoke and relicense the BIG-IP VE from an unreachable BIG-IP VE. In this case, we specify additional information in the *revokeFrom* property to reference the BIG-IQ that initially licensed the BIG-IP VE.  Again, specifying the appropriate hypervisor is required. See :ref:`Revoking a license using BIG-IQ<revoke-main>` for specific details on this example.

**New in DO 1.15** |br| 
DO 1.15 adds the **tenant** property to the License class. This property allows you to specify an optional description for the license. This feature is useful in autoscale solutions managed by a BIG-IQ. The DO tenant property is prepended to the BIG-IQ tenant property. The BIG-IQ tenant property is *management address,hostname* by default, so when using the DO property, it becomes *DO-tenant-property,management-address,hostname*.  This feature is only supported when **reachable** is **false**.

.. IMPORTANT:: The following declaration has been updated to include the new Tenant property introduced in DO 1.15.  If you attempt to use it on a version prior to 1.15, it will fail. To use the example on a previous version, delete the **tenant** property at the bottom of the **License** class.

.. literalinclude:: ../../examples/reLicenseViaNewBigIqUnreachable.json
   :language: json
   :emphasize-lines: 15-21, 26-27 


:ref:`Back to top<iqexamples>`

|

.. _bigiqdo1:

Onboarding a BIG-IP in AWS via BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In this example, we onboard a BIG-IP VE in AWS using the DO endpoint on the BIG-IQ device.  This example uses both targetHost to specify the BIG-IP information, and bigIqSettings.  

See :ref:`do-bigiq-table` for information on the bigIqSettings parameters.  These parameters are highlighted in the following declaration.

See the BIG-IQ API documentation for similar examples for |bigiqazure| and |bigiqvmware|.

.. literalinclude:: ../../examples/onboardViaBigIqAws.json
   :language: json
   :emphasize-lines: 49-59


:ref:`Back to top<iqexamples>`

|

.. _bigiqauth:

Using an external authentication provider for BIG-IQ licensing
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the **bigiqAuthProvider** property is available in DO v1.18 and later.  You must have the authentication provider defined on the BIG-IQ before submitting the declaration.

In this example, we show how you can reference an external auth provider for BIG-IQ license calls using the **bigiqAuthProvider** property introduced in DO 1.18. The default is to use TMOS as the authentication provider. For more information on BIG-IQ authentication tokens, see |tokendoc| in the BIG-IQ API reference.

To use this property in your declaration, you must have an existing authentication provider defined on your BIG-IQ.  For information on configuring authentication providers, see the BIG-IQ documentation (for example, the |authdoc| chapter gives information on configuring an LDAP authentication provider in BIG-IQ 7.0).


.. literalinclude:: ../../examples/licenseViaBigIqPoolAuthProvider.json
   :language: json
   :emphasize-lines: 15


:ref:`Back to top<iqexamples>`

|

.. _bigiqhex:

Onboarding a BIG-IP in Alibaba via BIG-IQ
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for specifying Alibaba hypervisor is available in DO v1.21 and later.  

In this example, we show how to specify the Alibaba hypervisor in a Declarative Onboarding declaration via BIG-IQ (no route). BIG-IQ itself uses the hex value **0x01000013** for Alibaba to work around a known issue. DO v1.21 adds the ability to specify this hex value in the **hypervisor** property when licensing using a BIG-IQ pool.


.. literalinclude:: ../../examples/licenseViaBigIqPoolUnreachableHEXHypervisor.json
   :language: json
   :emphasize-lines: 18


:ref:`Back to top<iqexamples>`





.. |br| raw:: html

   <br />

.. |bigiq| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-iq-centralized-mgmt/manuals/product/big-iq-centralized-management-device-6-1-0/04.html" target="_blank">BIG-IQ</a>

.. |compat| raw:: html

   <a href="https://support.f5.com/csp/article/K54909607" target="_blank">K54909607</a>


.. |bigiqazure| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/v7.0.0/ApiReferences/bigiq_public_api_ref/r_do_onboarding.html#post-to-onboard-a-big-ip-ve-in-azure" target="_blank">Microsoft Azure</a>

.. |bigiqvmware| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/v7.0.0/ApiReferences/bigiq_public_api_ref/r_do_onboarding.html#post-to-onboard-a-big-ip-ve-in-vmware-cloud-environment" target="_blank">VMware Cloud</a>

.. |tokendoc| raw:: html

   <a href="https://clouddocs.f5.com/products/big-iq/mgmt-api/v7.1.0/ApiReferences/bigiq_public_api_ref/r_auth_login.html" target="_blank">Auth Token by Login</a>

.. |authdoc| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigiq-7-0-0/authentication-roles-and-user-management/ldap-user-authentication.html" target="_blank">LDAP User Authentication</a>


