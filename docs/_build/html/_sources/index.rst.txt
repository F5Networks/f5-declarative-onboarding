F5 Declarative Onboarding Documentation
=======================================

Welcome to the F5 Declarative Onboarding documentation. To provide feedback on this documentation, you can file a GitHub Issue, or email us at solutionsfeedback@f5.com.

Introduction
------------

F5 Declarative onboarding uses a declarative model to initially configure a BIG-IP device with all of the required settings. A declarative model means you provide a JSON declaration rather than a set of imperative
commands. The declaration represents the configuration which Declarative Onboarding is responsible for creating on a BIG-IP system. 

F5 Declarative Onboarding uses a |declare| model, meaning you send a
declaration file using a single Rest API call. This section gives an overview of
the major components of Declarative Onboarding, with references to more information later in this
document.  See :ref:`revision-history` for information on document changes.


This guide contains information on downloading, installing, and using F5 Declarative Onboarding.

Use the following links, the navigation on the left, and/or the Next and Previous buttons to explore the documentation.

.. toctree::
   :maxdepth: 2
   :includehidden:
   :glob:

   prereqs
   components
   quick-start
   using-do
   examples
   schema-reference
   revision-history

.. |declare| raw:: html

   <a href="https://f5.com/about-us/blog/articles/in-container-land-declarative-configuration-is-king-27226" target="_blank">declarative</a>

.. |br| raw:: html

   <br />
