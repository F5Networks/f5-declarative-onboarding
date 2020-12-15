.. _gslb-examples:

GSLB Examples
-------------------
This section contains examples for GSLB (Global Server Load Balancing), which requires the BIG-IP DNS (formerly GTM) module to be licensed and provisioned.


.. _globalgslb:

Configuring global GSLB settings in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring global GSLB settings in a declaration is available in DO v1.17 and later. 

In this example, we show how you can configure global GSLB settings in DO 1.17 and later using the **GSLBGlobals** class. This class uses the **GSLBGlobals_general** properties (synchronizationEnabled synchronizationGroupName, synchronizationTimeout, and synchronizationTimeTolerance) to configure GSLB global settings on the BIG-IP. 

For more details on the properties and DO usage, see |gslbglobal| and |gslbgen| in the Schema Reference.  

For information on BIG-IP DNS, see the |dns| for your BIG-IP version.

This example only includes the GSLBGlobals class, which can be used as a part of a larger DO declaration.

.. literalinclude:: ../../examples/gslbGlobals.json
   :language: json

|

.. _gslbdc:

Configuring a GSLB Data Center in a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring GSLB Data Centers in a declaration is available in DO v1.18 and later. 

In this example, we show how you can configure a GSLB Data Center in DO 1.18 and later using the **GSLBDataCenter** class. This allows you to configure GSLB Data Center properties in a Declarative Onboarding declaration.


For details on the available properties and DO usage, see |gslbdata| in the Schema Reference.  

For information on BIG-IP DNS, see the |dns| for your BIG-IP version.

This example only includes the GSLBDataCenter class, which can be used as a part of a larger DO declaration.

.. literalinclude:: ../../examples/gslbDataCenter.json
   :language: json

|

.. |dns| raw:: html

   <a href="https://support.f5.com/csp/knowledge-center/software/BIG-IP?module=BIG-IP%20GTM" target="_blank">DNS/GTM knowledge center</a>

.. |gslbglobal| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#gslbglobals" target="_blank">GSLBGlobals</a>

.. |gslbgen| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#gslbglobals-general" target="_blank">GSLBGlobals_general</a>

.. |gslbdata| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#gslbdatacenter" target="_blank">GSLBDataCenter</a>
