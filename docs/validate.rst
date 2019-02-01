.. _validate:

Validating a declaration
------------------------
In this section, we show you how to validate a Declarative Onboarding declaration against the schema using Microsoft |vsc|. Using this type of validation is useful when composing a declaration manually, or to check the accuracy of a declaration before deployment.


To validate a declaration
~~~~~~~~~~~~~~~~~~~~~~~~~
Use the following procedure to validate a declaration.

1.  Download and install |vsc|.
2.  Open Visual Studio Code, and use **File > New File** start a new JSON file. In our example, we name our file **myDeclaration.json**.
3.  At the top of your schema file, copy and paste the following lines:
    
    .. code-block:: json

        {
            "$schema": "https://raw.githubusercontent.com/F5Networks/f5-declarative-onboarding/master/schema/base.schema.json",
        

4. As you begin to type the :ref:`properties of your declaration<composing>`, the validation process warns of incorrect syntax with a green wavy line under the word

    .. image:: /images/validate-1.png
     
   It also suggests valid options for a particular location in the declaration:

    .. image:: /images/validate-2.png


5. You can also validate an existing declaration by pasting only the **$schema** line between the opening bracket of the file and the first property of the declaration. In this example, the validator discovers a typo of the word *Tenant*.

    .. image:: /images/validate-3.png


   


.. |vsc| raw:: html

   <a href="https://code.visualstudio.com/" target="_blank">Visual Studio Code</a>




things to note: if you are doing copy paste, have to get rid of starting bracket <test finishing one>