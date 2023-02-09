F5 BIG-IP Declarative Onboarding Documentation
==============================================

Welcome to the F5 BIG-IP Declarative Onboarding documentation.

This is the documentation for the **latest** version of BIG-IP Declarative Onboarding, if you want to see the documentation for a long term support (LTS) version, use the version selector on the top left (for details, see |supportmd|). 

BIG-IP Declarative onboarding (BIG-IP DO) uses a |declare| model to initially configure a BIG-IP device with all of the required settings to get up and running.  This includes system settings such as licensing and provisioning, network settings such as VLANs and Self IPs, and clustering settings if you are using more than one BIG-IP system.  If you want to use a declarative model to configure applications and services on a BIG-IP device that already has these initial settings, see the |as3| documentation.

A declarative model means you provide a JSON declaration rather than a set of imperative commands. The declaration represents the configuration which BIG-IP Declarative Onboarding is responsible for creating on a BIG-IP system.  You send a declaration file using a single Rest API call.

.. IMPORTANT:: Beginning with DO 1.36.0, the default value for **allowService** on a self IP address will be changing from **default** to **none** Until then, DO will present a warning in the response whenever DO receives a declaration that creates or modifies a self IP.

The DO RPM, Postman collection, and checksum files can be found on the |release|, as **Assets**. 

You can use Microsoft Visual Studio Code to validate your declarations, see :doc:`validate` for information.

This guide contains information on downloading, installing, and using F5 BIG-IP Declarative Onboarding.


.. NOTE:: To see what's new in BIG-IP Declarative Onboarding, see the the :ref:`revision-history`.

.. _video:

You can also see our BIG-IP Declarative Onboarding overview video:

|vid|

To provide feedback on this documentation, you can file a GitHub Issue or email us at solutionsfeedback@f5.com.

.. toctree::
   :maxdepth: 1
   :hidden:
   :glob:

   prereqs
   faq
   installation
   using-do
   troubleshooting
   examples
   apidocs
   schema-reference
   revision-history



.. |declare| raw:: html

   <a href="https://f5.com/about-us/blog/articles/in-container-land-declarative-configuration-is-king-27226" target="_blank">declarative</a>

.. |br| raw:: html

   <br />

.. |as3| raw:: htmlq

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/" target="_blank">Application Services 3 (AS3)</a>

.. |vid| raw:: html

   <iframe width="560" height="315" src="https://www.youtube.com/embed/zNlLVZA6Aic" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/releases" target="_blank">GitHub Release</a>

.. |supportmd| raw:: html

   <a href="https://github.com/F5Networks/f5-declarative-onboarding/blob/master/SUPPORT.md" target="_blank">Support information on GitHub</a>