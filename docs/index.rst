F5 Declarative Onboarding Documentation
=======================================

Welcome to the F5 Declarative Onboarding documentation.

F5 Declarative onboarding uses a |declare| model to initially configure a BIG-IP device with all of the required settings to get up and running.  This includes system settings such as licensing and provisioning, network settings such as VLANs and Self IPs, and clustering settings if you are using more than one BIG-IP system.  If you want to use a declarative model to configure applications and services on a BIG-IP device that already has these initial settings, see the |as3| documentation.

A declarative model means you provide a JSON declaration rather than a set of imperative commands. The declaration represents the configuration which Declarative Onboarding is responsible for creating on a BIG-IP system.  You send a declaration file using a single Rest API call.

.. NOTE:: The DO RPM, Postman collection, and checksum files can be found on the |release|, as **Assets**. |br| For information on supported versions of DO, see |supportmd|

You can use Microsoft Visual Studio Code to validate your declarations, see :doc:`validate` for information.

This guide contains information on downloading, installing, and using F5 Declarative Onboarding.

.. NOTE:: To see what's new in Declarative Onboarding, see the the :ref:`revision-history`.

.. _video:

You can also see our Declarative Onboarding overview video:

|vid|

To provide feedback on this documentation, you can file a GitHub Issue or email us at solutionsfeedback@f5.com.


Use the following links, the navigation on the left, and/or the Next and Previous buttons to explore the documentation.

.. toctree::
   :maxdepth: 1
   :includehidden:
   :glob:

   prereqs
   faq
   components
   using-do
   troubleshooting
   examples
   revision-history
   schema-reference


.. |declare| raw:: html

   <a href="https://f5.com/about-us/blog/articles/in-container-land-declarative-configuration-is-king-27226" target="_blank">declarative</a>

.. |br| raw:: html

   <br />

.. |as3| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/" target="_blank">Application Services 3 (AS3)</a>

.. |vid| raw:: html

   <iframe width="560" height="315" src="https://www.youtube.com/embed/zNlLVZA6Aic" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">GitHub Release</a>

.. |supportmd| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/blob/master/SUPPORT.md" target="_blank">Support information on GitHub</a>


