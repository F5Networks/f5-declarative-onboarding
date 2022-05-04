.. _validate:

Validating a declaration
------------------------
In this section, we show you how to validate a Declarative Onboarding declaration against the schema using Microsoft |vsc|. Using this type of validation is useful when composing a declaration manually, or to check the accuracy of a declaration before deployment.

For more information on editing JSON with Visual Studio Code, see this |json|.


To validate a declaration
~~~~~~~~~~~~~~~~~~~~~~~~~
Use the following procedure to validate a declaration.

1.  Download and install |vsc|.
2.  Go to the |schema| directory of the Declarative Onboarding repo on GitHub.

    - Click either **latest** or the specific Declarative Onboarding version you are using.
    - Click the **do.schema.json** file and then click the **Raw** tab.
    - Copy the URL of the raw schema file.

3. Open Visual Studio Code, and use **File > New File** start a new JSON file. In our example, we name our file **myDeclaration.json**.  You must save the file in order for Visual Studio Code to recognize it as a JSON file.
4. At the top of your schema file, type the following code:

    .. code-block:: json

        {
            "$schema": "",

5. Paste the GitHub raw URL you copied (if you downloaded the schema file, use the path to the file on your device) between the quotes.  When you are finished with this step, your code should look like the following (you may have a different directory than **latest**):

    .. code-block:: json

        {
            "$schema": "https://raw.githubusercontent.com/F5Networks/f5-declarative-onboarding/master/src/schema/latest/do.schema.json",




6. Begin to type your declaration (if validating an existing declaration, see step 7)

   - As you begin to type the :ref:`properties of your declaration<composing>`, the validation process suggests valid options.

   .. image:: /images/validate-1.png


   |

   - It also suggests valid options for a property in the declaration:

   .. image:: /images/validate-1a.png


   |

   - You can also hover on a red wavy line (for JSON syntax errors), or a green wavy line (schema validation errors) to see the problem. In the following example, the end of the line has both red and green wavy lines, so both errors display.

   .. image:: /images/validate-2a.png


7. You can also validate an existing declaration by pasting only the **$schema** line between the opening bracket of the file and the first property of the declaration.

   - In this example, the validator discovers a typo of the word *Tenant*.

   .. image:: /images/validate-3.png

   |


   - For a full declaration, it is often easier to view the Problems (View > Problems). In this example, the validator discovers a number of issues. You can click individual problems to go directly to the line with the issue.

   .. image:: /images/validate-4.png





.. |vsc| raw:: html

   <a href="https://code.visualstudio.com/" target="_blank">Visual Studio Code</a>

.. |json| raw:: html

   <a href="https://code.visualstudio.com/docs/languages/json" target="_blank">Microsoft document</a>

.. |schema| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/tree/master/src/schema" target="_blank">schema</a>
