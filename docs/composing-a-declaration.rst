.. _composing:  


Composing a Declarative Onboarding Declaration
----------------------------------------------

The most important part of using Declarative Onboarding is creating a declaration that includes the BIG-IP objects you want the system to configure.    See :ref:`examples` and :ref:`schema-reference` for sample declarations and further information.

To submit an Declarative Onboarding declaration, use a specialized RESTful API client such as Postman or a universal client such as cURL.

To transmit the declaration, you POST the declaration to the URI ``<BIG-IP IP address>/mgmt/shared/appsvcs/declare``.


Once you submit a declaration, if you want to view it from the BIG-IP Configuration utility, you must select the partition from the **Partition** list in the upper-right portion of the screen.  The partition name is the name you give the tenant in the declaration.

In this section, we break down an example declaration and describe its parts. 

.. TIP:: For a complete list of options in a declaration, see :ref:`schema-reference`.  

If you want to try this sample declaration now, jump to :doc:`quick-start`.

Sample declaration
~~~~~~~~~~~~~~~~~~

In this scenario, 

In the following declaration, we include 

This is our example declaration.  We break down the components in the following sections.

.. literalinclude:: examples/example_01.json
   :language: json
   :linenos:


|

Components of the declaration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
The following sections break down the example into parts so you can understand how to compose a declaration. The tables below the examples contains descriptions and options for the parameters included in the example only.  

.. NOTE:: Declarative Onboarding contains many more options, see :ref:`schema-reference` for details.

.. _Declarative Onboardingclass-ref:

Device Class
````````````
The first few lines of your declaration are a part of the Declarative Onboarding class and define top-level options.  You can create a declaration without using the Declarative Onboarding class (called a ADC declaration), however in that case the action or persist parameters are no longer available.

.. code-block:: javascript
   :linenos:


    {
        "class": "Declarative Onboarding",
        "action": "deploy",
        "persist": true,



|
|

+--------------------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                                      | Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+====================+==============================================+======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================+
| class              |                                              | The class must always be Declarative Onboarding, do not change this value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+--------------------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| action             | deploy, dry-run, redeploy, retrieve, remove  | The action *deploy* deploys the declaration onto the target device (this is the default and used if you didn't specify an action). *dry-run* does everything deploy does, except attempt to change the configuration of the target device (useful for debugging declarations). *redeploy* redeploys one of the declarations stored in the target device's declaration history without making you GET it then POST it. *retrieve* returns the latest declaration (same as using GET). *remove* deletes the configuration created by the declaration (same as using DELETE). For localhost we recommend using GET and DELETE rather than the retrieve or remove actions.                                                               |
+--------------------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| persist            | true, false                                  | This value determines when the system saves the configuration to disk.  When set to true, Declarative Onboarding saves the BIG-IP configuration to disk after change.  When set to false, the system does not save the configuration.  This can be useful when you are experimenting or testing Declarative Onboarding, and may not want the system to save the configuration to disk after each change.                                                                                                                                                                                                                                                                                                                             |
+--------------------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+




See :doc:`examples` to see the default values Declarative Onboarding uses behind the scenes, and the Reference section for a list of all possible parameters you can use in your declarations.
 