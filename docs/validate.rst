.. _validate:

Validating a declaration
------------------------
In this section, we show you how to validate a Declarative Onboarding declaration against the schema using Microsoft |vsc|. Using this type of validation is useful when composing a declaration manually, or to check the accuracy of a declaration before deployment.


To validate a declaration
~~~~~~~~~~~~~~~~~~~~~~~~~
Use the following procedure to validate a declaration.

1.  Download and install |vsc|.
2.  Open Visual Studio Code, and use **File > New File** start a new JSON file. We name our file **myDeclaration.json**.
3.  At the top of your schema file, copy and paste the following lines:
    
    .. code-block:: json

        {
            "$schema": "https://raw.githubusercontent.com/F5Networks/f5-declarative-onboarding/master/schema/base.schema.json",
        

4. After you have the first line 



.. |vsc| raw:: html

   <a href="https://code.visualstudio.com/" target="_blank">Visual Studio Code</a>
