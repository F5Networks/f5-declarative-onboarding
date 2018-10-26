Components
----------

Declarative Onboarding Declaration
~~~~~~~~~~~~~~~

An AS3 declaration describes the desired initial configuration of an Application
Delivery Controller (ADC) such as F5 BIG-IP in tenant- and application-oriented
terms. 

AS3 JSON Schema
~~~~~~~~~~~~~~~

The |json| schema validates the declaration, and then produces a BIG-IP
configuration.  The JSON Schema document prescribes the syntax of an Declarative Onboarding
declaration. The declaration schema controls which
objects may appear in a declaration, what name they may or must use, what
properties they may have, which of those you must supply in the declaration, and
which Declarative Onboarding may fill with default values. The schema also specifies the ranges of
values certain properties may take.  

AS3 contains two modules: a |rest| worker and an audit engine.  The REST worker
provides a |crud| interface for creating and modifying the declaration document.
The audit engine is responsible for aligning BIG-IP configuration with the
declaration document.

Declaration > Schema > Validation > Configuration 

.. image:: /images/AS3-data-flow.png

.. |json| raw:: html

   <a href="https://www.json.org/" target="_blank">JSON</a>

.. |rest| raw:: html

   <a href="https://en.wikipedia.org/wiki/Representational_state_transfer" target="_blank">REST</a>

.. |crud| raw:: html

   <a href="https://en.wikipedia.org/wiki/Create,_read,_update_and_delete" target="_blank">CRUD</a>
