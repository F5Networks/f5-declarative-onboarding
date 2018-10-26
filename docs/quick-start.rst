Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with AS3.

If you are not familiar with the BIG-IP and REST APIs, or want more detailed instructions, continue with :doc:`using-as3`.

#. Download the latest RPM package from |github| in the **dist** directory.
#. Upload and install the RPM package on the using the BIG-IP GUI:

   - :guilabel:`Main tab > iApps > Package Management LX > Import`
   - Select the downloaded file and click :guilabel:`Upload`
   - For complete instructions see :ref:`installgui-ref` or
     :ref:`installcurl-ref`.

#. Be sure to see :doc:`prereqs` and the known issues on GitHub (https://github.com/F5Networks/f5-declarative-onboarding/issues) to review any known issues and other important information before you attempt to use AS3.

#. Provide authorization (basic auth) to the BIG-IP system:  

   - If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions.
   - If using cURL, see :ref:`installcurl-ref`.


#. Copy one of the :ref:`examples` which best matches the configuration you want
   to use.  Alternatively, you can use the simple "Hello World" example below,
   which is a good start if you don't have an example in mind.

#. Paste the declaration into your API client, and modify names and IP addresses
   as applicable.  See :ref:`schema-reference` for additional options you can
   declare.

#. POST to the URI ``https://<BIG-IP>/mgmt/shared/appsvcs/declare``

**Quick Start Example**

.. literalinclude:: examples/example_01.json
   :language: json


.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding" target="_blank">F5 Declarative Onboarding site on GitHub</a>